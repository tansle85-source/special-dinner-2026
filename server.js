import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Shared ID Generator for maximum compatibility
const generateId = () => {
  try {
    return crypto.randomUUID();
  } catch (e) {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
};

dotenv.config({ override: true });

// Global Error Handlers to prevent 503 crashes and log reasons
process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Build version endpoint — admin can check this matches the latest deploy
const BUILD_VERSION = '2.0.' + Date.now().toString().slice(-5);
app.get('/api/version', (req, res) => res.json({ version: BUILD_VERSION, built: new Date().toISOString() }));


// Explicit API route for BD photos (bypasses nginx restrictions on /uploads)
app.get('/api/photos/bd/:filename', (req, res) => {
  const safe = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(__dirname, 'uploads', 'bd', safe);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
  res.sendFile(filePath);
});


// Health Check for 503 Monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '1.4.7', 
    db: pool ? 'connected' : 'disconnected',
    time: new Date().toISOString() 
  });
});

// Ensure upload directories exist - Wrapped in try/catch to prevent 503 startup crashes
try {
  const uploadDir = path.join(__dirname, 'uploads');
  const bdDir = path.join(__dirname, 'uploads', 'bd');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(bdDir)) fs.mkdirSync(bdDir, { recursive: true });
  console.log('Upload directories ready:', uploadDir);
} catch (err) {
  console.warn('Warning: Could not create uploads directory:', err.message);
}

// Use relative path for Multer destination - more compatible with some proxy setups
const upload = multer({ dest: 'uploads/' });

// Multer for BD photo uploads
const bdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'bd');
    fs.ensureDirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`)
});
const bdUpload = multer({ storage: bdStorage, limits: { fileSize: 15 * 1024 * 1024 } });

// MySQL Connection Pool (Deferred creation for stability)
let pool;
try {
  const poolConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 // 10s timeout to prevent 504 hangs
  };

  console.log(`Initialising MySQL pool for ${poolConfig.user}@${poolConfig.host}:${poolConfig.port}/${poolConfig.database}...`);
  pool = mysql.createPool(poolConfig);
} catch (err) {
  console.error('FATAL: Failed to create MySQL pool object:', err.message);
}

// Initialize Database Tables
const initDB = async () => {
  if (!pool) return console.error('Aborting initDB: Pool not created.');
  
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to database. Initializing tables...');
    
    // Create Tables...
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        won_prize VARCHAR(255) DEFAULT NULL,
        is_claimed BOOLEAN DEFAULT FALSE,
        claimed_at DATETIME DEFAULT NULL
      )
    `);

    // Migration logic for existing tables
    try {
      const [cols] = await connection.query('SHOW COLUMNS FROM employees');
      if (!cols.some(c => c.Field === 'is_claimed')) {
        console.log("[MIGRATE] Adding is_claimed to employees");
        await connection.query('ALTER TABLE employees ADD COLUMN is_claimed BOOLEAN DEFAULT FALSE');
      }
      if (!cols.some(c => c.Field === 'claimed_at')) {
        await connection.query('ALTER TABLE employees ADD COLUMN claimed_at DATETIME DEFAULT NULL');
      }
    } catch (migErr) { console.warn("Migration warning:", migErr.message); }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id VARCHAR(255) PRIMARY KEY,
        session VARCHAR(255),
        rank_level INT,
        name VARCHAR(255),
        quantity INT
      )
    `);

    // ... [Rest of table creation queries remain original] ...
    await connection.query(`CREATE TABLE IF NOT EXISTS performance_criteria (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL)`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS performance_participants (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        song_name VARCHAR(255),
        manual_score INT DEFAULT 0
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS performance_scores (
        id INT AUTO_INCREMENT PRIMARY KEY,
        participant_id VARCHAR(255),
        score_1 INT,
        score_2 INT,
        score_3 INT,
        voter_id VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS performance_settings (
        id VARCHAR(255) PRIMARY KEY,
        voting_status VARCHAR(50) DEFAULT 'CLOSED',
        best_dress_status VARCHAR(50) DEFAULT 'CLOSED'
      )
    `);

    await connection.query(`CREATE TABLE IF NOT EXISTS best_dress_votes (id VARCHAR(255) PRIMARY KEY, nominee_name VARCHAR(255) NOT NULL, vote_count INT DEFAULT 0, gender VARCHAR(10), department VARCHAR(255), photo_path VARCHAR(500), ai_reasoning TEXT)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS best_dress_submissions (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, department VARCHAR(255), gender VARCHAR(10), photo_path VARCHAR(500), photo_data LONGTEXT, voter_id VARCHAR(255), ai_score FLOAT DEFAULT NULL, ai_reasoning TEXT, submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS best_dress_nominations (id VARCHAR(255) PRIMARY KEY, employee_id VARCHAR(255), nominee_name VARCHAR(255), voter_id VARCHAR(255))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS best_dress_voters (voter_id VARCHAR(255), gender VARCHAR(10), nominee_id VARCHAR(255), PRIMARY KEY (voter_id, gender))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS feedback_settings (
      id VARCHAR(20) PRIMARY KEY,
      status VARCHAR(20) DEFAULT 'CLOSED'
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS feedback_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      question_text TEXT NOT NULL,
      type VARCHAR(20) DEFAULT 'text',
      order_num INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS feedback_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await connection.query(`CREATE TABLE IF NOT EXISTS feedback_answers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      response_id INT,
      question_id INT,
      answer_text TEXT,
      rating INT DEFAULT NULL
    )`);
    // Seed settings row
    await connection.query(`INSERT IGNORE INTO feedback_settings (id, status) VALUES ('global', 'CLOSED')`);


    // Migration: drop unique constraint on voter_id in best_dress_submissions if it exists
    try {
      const [bdCols] = await connection.query('SHOW INDEX FROM best_dress_submissions WHERE Column_name = "voter_id" AND Non_unique = 0');
      if (bdCols.length > 0) {
        const keyName = bdCols[0].Key_name;
        if (keyName !== 'PRIMARY') {
          await connection.query(`ALTER TABLE best_dress_submissions DROP INDEX \`${keyName}\``);
          console.log('[MIGRATE] Dropped unique constraint on best_dress_submissions.voter_id');
        }
      }
    } catch (migErr) { console.warn('[MIGRATE] voter_id constraint check:', migErr.message); }

    // Migration: upgrade best_dress_voters to composite PK (voter_id, gender)
    try {
      const [voterCols] = await connection.query('SHOW COLUMNS FROM best_dress_voters');
      if (!voterCols.some(c => c.Field === 'gender')) {
        await connection.query('DROP TABLE IF EXISTS best_dress_voters');
        await connection.query('CREATE TABLE best_dress_voters (voter_id VARCHAR(255), gender VARCHAR(10), nominee_id VARCHAR(255), PRIMARY KEY (voter_id, gender))');
        console.log('[MIGRATE] Recreated best_dress_voters with composite PK');
      }
    } catch (migErr) { console.warn('[MIGRATE] best_dress_voters migration:', migErr.message); }

    // Migration: add missing columns to best_dress_votes
    try {
      const [bdvCols] = await connection.query('SHOW COLUMNS FROM best_dress_votes');
      if (!bdvCols.some(c => c.Field === 'gender')) {
        await connection.query('ALTER TABLE best_dress_votes ADD COLUMN gender VARCHAR(10) DEFAULT NULL');
      }
      if (!bdvCols.some(c => c.Field === 'department')) {
        await connection.query('ALTER TABLE best_dress_votes ADD COLUMN department VARCHAR(255) DEFAULT NULL');
      }
      if (!bdvCols.some(c => c.Field === 'photo_path')) {
        await connection.query('ALTER TABLE best_dress_votes ADD COLUMN photo_path VARCHAR(500) DEFAULT NULL');
      }
      if (!bdvCols.some(c => c.Field === 'ai_reasoning')) {
        await connection.query('ALTER TABLE best_dress_votes ADD COLUMN ai_reasoning TEXT DEFAULT NULL');
      }
    } catch (migErr) { console.warn('[MIGRATE] best_dress_votes columns migration:', migErr.message); }

    // Migration: add photo_data to best_dress_submissions
    try {
      const [subCols] = await connection.query('SHOW COLUMNS FROM best_dress_submissions');
      if (!subCols.some(c => c.Field === 'photo_data')) {
        await connection.query('ALTER TABLE best_dress_submissions ADD COLUMN photo_data LONGTEXT DEFAULT NULL');
        console.log('[MIGRATE] Added photo_data to best_dress_submissions');
      }
    } catch (migErr) { console.warn('[MIGRATE] photo_data migration:', migErr.message); }

    // Migration Logic: Add song_name and voter_id if missing from existing tables
    try {
      const [pCols] = await connection.query('SHOW COLUMNS FROM performance_participants');
      if (!pCols.some(c => c.Field === 'song_name')) {
        await connection.query('ALTER TABLE performance_participants ADD COLUMN song_name VARCHAR(255)');
      }
      if (!pCols.some(c => c.Field === 'manual_score')) {
        await connection.query('ALTER TABLE performance_participants ADD COLUMN manual_score INT DEFAULT 0');
      }
      const [sCols] = await connection.query('SHOW COLUMNS FROM performance_scores');
      if (!sCols.some(c => c.Field === 'voter_id')) {
        await connection.query('ALTER TABLE performance_scores ADD COLUMN voter_id VARCHAR(255)');
      }
      
      const [settings] = await connection.query('SELECT * FROM performance_settings WHERE id = "global"');
      if (settings.length === 0) {
        await connection.query('INSERT INTO performance_settings (id, voting_status, best_dress_status) VALUES ("global", "CLOSED", "CLOSED")');
      } else {
         const [cols] = await connection.query('SHOW COLUMNS FROM performance_settings');
         if (!cols.some(c => c.Field === 'best_dress_status')) {
           await connection.query('ALTER TABLE performance_settings ADD COLUMN best_dress_status VARCHAR(50) DEFAULT "CLOSED"');
         }
      }
    } catch (migErr) { console.warn("Performance migration warning:", migErr.message); }

    const [criteria] = await connection.query('SELECT * FROM performance_criteria');
    if (criteria.length === 0) {
      await connection.query('INSERT INTO performance_criteria (name) VALUES (?), (?), (?)', ['Vocal/Talent', 'Stage Presence', 'Costume']);
    }

    connection.release();
    console.log('MySQL Database initialized successfully');
  } catch (err) {
    console.error('Database connection or initialization failed:', err.message);
    console.log('Continuing server startup despite DB failure to avoid 503.');
  }
};


// --- PRIZE CRUD ---
app.post('/api/prizes', async (req, res) => {
  const { session, rank, name, quantity } = req.body;
  try {
    const id = generateId();
    await pool.query('INSERT INTO prizes (id, session, rank_level, name, quantity) VALUES (?, ?, ?, ?, ?)', 
      [id, session, rank, name, quantity]);
    res.json({ id, message: 'Prize added' });
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/prizes/:id', async (req, res) => {
  const { id } = req.params;
  const { session, rank, name, quantity } = req.body;
  try {
    await pool.query('UPDATE prizes SET session = ?, rank_level = ?, name = ?, quantity = ? WHERE id = ?', 
      [session, rank, name, quantity, id]);
    res.json({ message: 'Prize updated' });
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/prizes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM prizes WHERE id = ?', [req.params.id]);
    res.json({ message: 'Prize deleted' });
  } catch (err) { res.status(500).send(err.message); }
});

// --- EMPLOYEE CRUD ---
app.post('/api/employees', async (req, res) => {
  const { name, department } = req.body;
  try {
    const id = generateId();
    await pool.query('INSERT INTO employees (id, name, department, won_prize) VALUES (?, ?, ?, NULL)', [id, name, department]);
    res.json({ id, message: 'Employee added' });
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const { name, department, won_prize } = req.body;
  try {
    await pool.query('UPDATE employees SET name = ?, department = ?, won_prize = ? WHERE id = ?', [name, department, won_prize, id]);
    res.json({ message: 'Employee updated' });
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE id = ?', [req.params.id]);
    res.json({ message: 'Employee deleted' });
  } catch (err) { res.status(500).send(err.message); }
});

// --- PERFORMANCE CRUD ---
app.get('/api/performance/criteria', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM performance_criteria');
  res.json(rows);
});

app.put('/api/performance/criteria/:id', async (req, res) => {
  await pool.query('UPDATE performance_criteria SET name = ? WHERE id = ?', [req.body.name, req.params.id]);
  res.json({ message: 'Criteria updated' });
});

app.get('/api/performance/participants', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM performance_participants');
  res.json(rows);
});

app.post('/api/performance/participants', async (req, res) => {
  const id = generateId();
  const { name, department, song_name } = req.body;
  await pool.query('INSERT INTO performance_participants (id, name, department, song_name) VALUES (?, ?, ?, ?)', [id, name, department, song_name]);
  res.json({ id });
});

app.put('/api/performance/participants/:id', async (req, res) => {
  const { name, department, song_name } = req.body;
  await pool.query('UPDATE performance_participants SET name = ?, department = ?, song_name = ? WHERE id = ?', [name, department, song_name, req.params.id]);
  res.json({ message: 'Updated' });
});

app.delete('/api/performance/participants/:id', async (req, res) => {
  await pool.query('DELETE FROM performance_participants WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

app.post('/api/performance/rate', async (req, res) => {
  const { participant_id, score_1, score_2, score_3, voter_id } = req.body;
  try {
    // 1. Check if voting is open
    const [settings] = await pool.query('SELECT voting_status FROM performance_settings WHERE id = "global"');
    if (settings[0]?.voting_status !== 'OPEN') return res.status(403).json({ error: 'Voting is currently closed' });

    // 2. Check if already voted - If so, UPDATE. If not, INSERT.
    const [existing] = await pool.query('SELECT id FROM performance_scores WHERE participant_id = ? AND voter_id = ?', [participant_id, voter_id]);
    
    if (existing.length > 0) {
      await pool.query('UPDATE performance_scores SET score_1 = ?, score_2 = ?, score_3 = ? WHERE participant_id = ? AND voter_id = ?', 
        [score_1, score_2, score_3, participant_id, voter_id]);
    } else {
      await pool.query('INSERT INTO performance_scores (participant_id, score_1, score_2, score_3, voter_id) VALUES (?, ?, ?, ?, ?)', 
        [participant_id, score_1, score_2, score_3, voter_id]);
    }
    res.json({ success: true, updated: existing.length > 0 });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/performance/status', async (req, res) => {
  const [rows] = await pool.query('SELECT voting_status FROM performance_settings WHERE id = "global"');
  res.json(rows[0] || { voting_status: 'CLOSED' });
});

app.post('/api/performance/status', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE performance_settings SET voting_status = ? WHERE id = "global"', [status]);
  res.json({ success: true });
});

app.get('/api/performance/my-ratings/:voterId', async (req, res) => {
  const [rows] = await pool.query('SELECT participant_id, score_1, score_2, score_3 FROM performance_scores WHERE voter_id = ?', [req.params.voterId]);
  const ratings = {};
  rows.forEach(r => {
    ratings[r.participant_id] = [r.score_1, r.score_2, r.score_3];
  });
  res.json(ratings);
});

app.post('/api/performance/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM performance_scores');
    await pool.query('UPDATE performance_participants SET manual_score = 0');
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/performance/results', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.id, p.name, p.department, p.song_name, p.manual_score,
    AVG(s.score_1) as s1, AVG(s.score_2) as s2, AVG(s.score_3) as s3,
    COUNT(s.id) as vote_count
    FROM performance_participants p
    LEFT JOIN performance_scores s ON p.id = s.participant_id
    GROUP BY p.id
  `);

  // Calculate Weighted Totals
  const processed = rows.map(r => {
    // Guest Average (on 1-5 scale)
    const guestAvg = ((Number(r.s1||0) + Number(r.s2||0) + Number(r.s3||0)) / 3);
    // Convert guest avg to points (max 70)
    const guestPortion = (guestAvg / 5) * 70;
    // Manual Score portion (max 30)
    const adminPortion = (Number(r.manual_score || 0) / 100) * 30;
    
    return {
      ...r,
      guest_portion: guestPortion.toFixed(2),
      admin_portion: adminPortion.toFixed(2),
      total: (guestPortion + adminPortion).toFixed(2)
    };
  });

  // Sort by total DESC
  processed.sort((a, b) => b.total - a.total);
  res.json(processed);
});

app.put('/api/performance/participants/:id/manual-score', async (req, res) => {
  const { score } = req.body;
  await pool.query('UPDATE performance_participants SET manual_score = ? WHERE id = ?', [score, req.params.id]);
  res.json({ success: true });
});

// ─── FEEDBACK SYSTEM ─────────────────────────────────────────────────────────

// Status
app.get('/api/feedback/status', async (req, res) => {
  const [rows] = await pool.query('SELECT status FROM feedback_settings WHERE id = "global"');
  res.json({ status: rows[0]?.status || 'CLOSED' });
});
app.put('/api/feedback/status', async (req, res) => {
  await pool.query('UPDATE feedback_settings SET status = ? WHERE id = "global"', [req.body.status]);
  res.json({ success: true });
});

// Questions CRUD
app.get('/api/feedback/questions', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM feedback_questions ORDER BY order_num, id');
  res.json(rows);
});
app.post('/api/feedback/questions', async (req, res) => {
  const { question_text, type } = req.body;
  if (!question_text) return res.status(400).json({ error: 'question_text required' });
  const [r] = await pool.query('INSERT INTO feedback_questions (question_text, type) VALUES (?, ?)', [question_text, type || 'text']);
  res.json({ id: r.insertId });
});
app.put('/api/feedback/questions/:id', async (req, res) => {
  const { question_text, type } = req.body;
  await pool.query('UPDATE feedback_questions SET question_text = ?, type = ? WHERE id = ?', [question_text, type, req.params.id]);
  res.json({ success: true });
});
app.delete('/api/feedback/questions/:id', async (req, res) => {
  await pool.query('DELETE FROM feedback_questions WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// Submit answers (one session per device — session_id from frontend)
app.post('/api/feedback/submit', async (req, res) => {
  const { session_id, answers } = req.body; // answers: [{ question_id, answer_text, rating }]
  if (!answers || !answers.length) return res.status(400).json({ error: 'No answers provided' });
  const [r] = await pool.query('INSERT INTO feedback_responses (session_id) VALUES (?)', [session_id || null]);
  const responseId = r.insertId;
  for (const a of answers) {
    await pool.query(
      'INSERT INTO feedback_answers (response_id, question_id, answer_text, rating) VALUES (?, ?, ?, ?)',
      [responseId, a.question_id, a.answer_text || null, a.rating || null]
    );
  }
  res.json({ success: true });
});

// Admin: all responses grouped by question
app.get('/api/feedback/responses', async (req, res) => {
  const [questions] = await pool.query('SELECT * FROM feedback_questions ORDER BY order_num, id');
  const [answers] = await pool.query(`
    SELECT fa.*, fr.created_at
    FROM feedback_answers fa
    JOIN feedback_responses fr ON fa.response_id = fr.id
    ORDER BY fr.created_at DESC
  `);
  const result = questions.map(q => ({
    ...q,
    answers: answers.filter(a => a.question_id === q.id)
  }));
  res.json({ questions: result, total: (await pool.query('SELECT COUNT(*) AS c FROM feedback_responses'))[0][0].c });
});

// Admin: Export CSV
app.get('/api/feedback/export', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        fr.id AS response_id,
        fr.created_at,
        fq.question_text,
        fq.type AS question_type,
        fa.answer_text,
        fa.rating
      FROM feedback_responses fr
      JOIN feedback_answers fa ON fr.id = fa.response_id
      JOIN feedback_questions fq ON fa.question_id = fq.id
      ORDER BY fr.id DESC, fq.order_num, fq.id
    `);

    let csvContent = "Response ID,Date,Question,Type,Answer/Rating\n";
    rows.forEach(r => {
      const date = new Date(r.created_at).toLocaleString('en-GB');
      const answer = r.question_type === 'rating' ? r.rating : (r.answer_text || '').replace(/"/g, '""');
      csvContent += `${r.response_id},"${date}","${r.question_text}","${r.question_type}","${answer}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=guest_feedback.csv');
    res.send(csvContent);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Admin: clear all responses
app.delete('/api/feedback/responses', async (req, res) => {
  await pool.query('DELETE FROM feedback_answers');
  await pool.query('DELETE FROM feedback_responses');
  res.json({ success: true });
});

// Best Dress Endpoints

// Submit nomination with photo (unlimited per device) — base64 stored in DB
app.post('/api/best-dress/submit', async (req, res) => {
  const { name, department, gender, voter_id, photo_data } = req.body;
  if (!name || !department || !gender || !voter_id) return res.status(400).json({ error: 'Missing fields' });
  const [settings] = await pool.query('SELECT best_dress_status FROM performance_settings WHERE id = "global"');
  if (settings[0]?.best_dress_status !== 'NOMINATING') return res.status(403).json({ error: 'Submissions are not open' });
  try {
    const id = generateId();
    await pool.query(
      'INSERT INTO best_dress_submissions (id, name, department, gender, photo_data, voter_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, department, gender, photo_data || null, voter_id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Count how many times voter already submitted (informational only)
app.get('/api/best-dress/my-submission/:voterId', async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, gender FROM best_dress_submissions WHERE voter_id = ? ORDER BY submitted_at ASC', [req.params.voterId]);
  res.json({ count: rows.length, submissions: rows });
});

// Serve photo by submission ID — checks photo_data first, falls back to photo_path file
app.get('/api/photos/bd/sub/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT photo_data, photo_path FROM best_dress_submissions WHERE id = ?', [req.params.id]);
    if (!rows[0]) return res.status(404).send('Not found');

    const { photo_data, photo_path } = rows[0];

    if (photo_data) {
      const matches = photo_data.match(/^data:(.+);base64,(.+)$/);
      if (!matches) return res.status(400).send('Invalid photo data');
      res.set('Content-Type', matches[1]);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(matches[2], 'base64'));
    }

    if (photo_path) {
      const filePath = path.join(__dirname, 'uploads', 'bd', photo_path);
      if (fs.existsSync(filePath)) {
        res.set('Cache-Control', 'public, max-age=86400');
        return res.sendFile(filePath);
      }
    }

    return res.status(404).send('No photo');
  } catch (err) { res.status(500).send(err.message); }
});

// Serve photo for finalist by vote record ID — checks photo_data first, falls back to photo_path
app.get('/api/photos/bd/vote/:id', async (req, res) => {
  try {
    const [voteRows] = await pool.query('SELECT photo_data, photo_path FROM best_dress_votes WHERE id = ?', [req.params.id]);
    if (!voteRows[0]) return res.status(404).send('Not found');

    const { photo_data, photo_path } = voteRows[0];

    if (photo_data) {
      const matches = photo_data.match(/^data:(.+);base64,(.+)$/);
      if (!matches) return res.status(400).send('Invalid photo data');
      res.set('Content-Type', matches[1]);
      res.set('Cache-Control', 'public, max-age=86400');
      return res.send(Buffer.from(matches[2], 'base64'));
    }

    if (photo_path) {
      const filePath = path.join(__dirname, 'uploads', 'bd', photo_path);
      if (fs.existsSync(filePath)) {
        res.set('Cache-Control', 'public, max-age=86400');
        return res.sendFile(filePath);
      }
    }

    return res.status(404).send('No photo');
  } catch (err) { res.status(500).send(err.message); }
});

// Finalists for announce page — photo served separately via /api/photos/bd/vote/:id
app.get('/api/best-dress/finalists', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, nominee_name, gender, department, ai_score, ai_reasoning, vote_count, (photo_data IS NOT NULL OR photo_path IS NOT NULL) AS has_photo FROM best_dress_votes ORDER BY gender, vote_count DESC'
  );
  res.json(rows);
});

// Admin: list all submissions (exclude photo_data blob — loaded separately via /api/photos/bd/sub/:id)
app.get('/api/best-dress/submissions', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, name, department, gender, photo_path, voter_id, ai_score, ai_reasoning, submitted_at, (photo_data IS NOT NULL OR photo_path IS NOT NULL) AS has_photo FROM best_dress_submissions ORDER BY submitted_at DESC'
  );
  res.json(rows);
});

// Admin: delete a submission
app.delete('/api/best-dress/submissions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM best_dress_submissions WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: edit a submission's name / department / gender
app.put('/api/best-dress/submissions/:id', async (req, res) => {
  const { name, department, gender } = req.body;
  if (!name || !department || !gender) return res.status(400).json({ error: 'Missing fields' });
  try {
    await pool.query(
      'UPDATE best_dress_submissions SET name = ?, department = ?, gender = ? WHERE id = ?',
      [name, department, gender, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: upload / replace photo for a submission — stores base64 in DB (survives redeployment)
app.patch('/api/best-dress/submissions/:id/photo', async (req, res) => {
  const { photo_data } = req.body;
  if (!photo_data) return res.status(400).json({ error: 'No photo_data provided' });
  try {
    await pool.query(
      'UPDATE best_dress_submissions SET photo_data = ?, photo_path = NULL WHERE id = ?',
      [photo_data, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Admin: AI ranking — pick top 3 male + top 3 female and promote to nominees
app.post('/api/best-dress/ai-rank', async (req, res) => {
  try {
    const [subs] = await pool.query('SELECT * FROM best_dress_submissions WHERE photo_data IS NOT NULL');
    if (subs.length === 0) return res.status(400).json({ error: 'No submissions with photos' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Score each submission
    const scored = await Promise.all(subs.map(async (sub) => {
      try {
        if (!sub.photo_data) return { ...sub, ai_score: 50, ai_reasoning: 'No photo provided' };
        // photo_data is a data URL: data:image/jpeg;base64,...
        const matches = sub.photo_data.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return { ...sub, ai_score: 50 };
        const mime = matches[1];
        const b64 = matches[2];
        const prompt = `You are a fashion judge for a company dinner Best Dress competition. Rate this outfit from 0-100 based on elegance, style, colour coordination, and appropriateness for a formal gala dinner. Return ONLY valid JSON: {"score": 85, "reasoning": "brief reason"}`;
        const result = await model.generateContent([
          { inlineData: { data: b64, mimeType: mime } },
          prompt
        ]);
        const text = result.response.text().trim();
        const match = text.match(/\{[\s\S]*\}/);
        const parsed = match ? JSON.parse(match[0]) : { score: 50 };
        await pool.query('UPDATE best_dress_submissions SET ai_score=?, ai_reasoning=? WHERE id=?', [parsed.score, parsed.reasoning || '', sub.id]);
        return { ...sub, ai_score: parsed.score };
      } catch { return { ...sub, ai_score: 50 }; }
    }));

    // Pick top 3 per gender
    const byGender = (g) => scored.filter(s => s.gender === g).sort((a, b) => b.ai_score - a.ai_score).slice(0, 3);
    const finalists = [...byGender('Female'), ...byGender('Male')];

    // Clear existing nominees and insert finalists (with photo_data + ai_reasoning)
    await pool.query('DELETE FROM best_dress_votes');
    await pool.query('DELETE FROM best_dress_voters');
    for (const f of finalists) {
      await pool.query(
        'INSERT INTO best_dress_votes (id, nominee_name, vote_count, gender, department, photo_data, ai_reasoning) VALUES (?, ?, 0, ?, ?, ?, ?)',
        [generateId(), f.name, f.gender, f.department, f.photo_data || null, f.ai_reasoning || '']
      );
    }
    res.json({ success: true, selected: finalists.map(f => ({ name: f.name, gender: f.gender, score: f.ai_score })) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/best-dress/status', async (req, res) => {

  const [rows] = await pool.query('SELECT best_dress_status FROM performance_settings WHERE id = "global"');
  res.json(rows[0] || { best_dress_status: 'CLOSED' });
});

app.post('/api/best-dress/status', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE performance_settings SET best_dress_status = ? WHERE id = "global"', [status]);
  res.json({ success: true });
});

app.get('/api/best-dress/nominees', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM best_dress_votes ORDER BY vote_count DESC');
  res.json(rows);
});

app.post('/api/best-dress/nominees', async (req, res) => {
  const { name } = req.body;
  const id = generateId();
  await pool.query('INSERT INTO best_dress_votes (id, nominee_name, vote_count) VALUES (?, ?, 0)', [id, name]);
  res.json({ id });
});

app.delete('/api/best-dress/nominees/:id', async (req, res) => {
  await pool.query('DELETE FROM best_dress_votes WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.post('/api/best-dress/nominate', async (req, res) => {
  const { employee_id, nominee_name, voter_id } = req.body;
  const [settings] = await pool.query('SELECT best_dress_status FROM performance_settings WHERE id = "global"');
  if (settings[0]?.best_dress_status !== 'NOMINATING') return res.status(403).json({ error: 'Nomination is CLOSED' });
  
  try {
    // 1. Check if already nominated
    const [existing] = await pool.query('SELECT id FROM best_dress_nominations WHERE voter_id = ?', [voter_id]);
    if (existing.length > 0) {
      await pool.query('UPDATE best_dress_nominations SET employee_id = ?, nominee_name = ? WHERE voter_id = ?', [employee_id, nominee_name, voter_id]);
    } else {
      await pool.query('INSERT INTO best_dress_nominations (id, employee_id, nominee_name, voter_id) VALUES (?, ?, ?, ?)', [generateId(), employee_id, nominee_name, voter_id]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/best-dress/my-nomination/:voterId', async (req, res) => {
  const [rows] = await pool.query('SELECT nominee_name, employee_id FROM best_dress_nominations WHERE voter_id = ?', [req.params.voterId]);
  res.json(rows[0] || null);
});

app.get('/api/best-dress/nominations-summary', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT nominee_name, employee_id, COUNT(*) as count 
    FROM best_dress_nominations 
    GROUP BY nominee_name, employee_id 
    ORDER BY count DESC
  `);
  res.json(rows);
});

app.post('/api/best-dress/vote', async (req, res) => {
  const { nominee_id, voter_id } = req.body;
  const [settings] = await pool.query('SELECT best_dress_status FROM performance_settings WHERE id = "global"');
  if (settings[0]?.best_dress_status !== 'VOTING') return res.status(403).json({ error: 'Voting is CLOSED' });

  // Get nominee gender
  const [nomineeRows] = await pool.query('SELECT gender FROM best_dress_votes WHERE id = ?', [nominee_id]);
  if (!nomineeRows.length) return res.status(404).json({ error: 'Nominee not found' });
  const gender = nomineeRows[0].gender;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Check if already voted for this gender
    const [existing] = await connection.query('SELECT nominee_id FROM best_dress_voters WHERE voter_id = ? AND gender = ?', [voter_id, gender]);
    if (existing.length > 0) {
      // Switch vote within same gender category
      const prevId = existing[0].nominee_id;
      await connection.query('UPDATE best_dress_votes SET vote_count = vote_count - 1 WHERE id = ?', [prevId]);
      await connection.query('UPDATE best_dress_voters SET nominee_id = ? WHERE voter_id = ? AND gender = ?', [nominee_id, voter_id, gender]);
    } else {
      await connection.query('INSERT INTO best_dress_voters (voter_id, gender, nominee_id) VALUES (?, ?, ?)', [voter_id, gender, nominee_id]);
    }
    await connection.query('UPDATE best_dress_votes SET vote_count = vote_count + 1 WHERE id = ?', [nominee_id]);
    await connection.commit();
    res.json({ success: true, gender });
  } catch (err) {
    await connection.rollback();
    res.status(500).send(err.message);
  } finally {
    connection.release();
  }
});

// Returns { Female: nominee_id, Male: nominee_id } — 1 vote per gender per device
app.get('/api/best-dress/my-vote/:voterId', async (req, res) => {
  const [rows] = await pool.query('SELECT gender, nominee_id FROM best_dress_voters WHERE voter_id = ?', [req.params.voterId]);
  const result = {};
  rows.forEach(r => { result[r.gender] = r.nominee_id; });
  res.json(result); // e.g. { Female: 'abc', Male: 'xyz' } or {}
});

app.post('/api/best-dress/reset', async (req, res) => {
  try {
    await pool.query('DELETE FROM best_dress_nominations');
    await pool.query('DELETE FROM best_dress_voters');
    await pool.query('DELETE FROM best_dress_votes');
    res.json({ success: true });
  } catch (err) { res.status(500).send(err.message); }
});

// Upload Employees (Name, Department)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const rowKeys = Object.keys(row);
      const cleanKeys = rowKeys.map(k => k.replace(/^\uFEFF/, '').trim());
      const data = {};
      cleanKeys.forEach((key, i) => data[key.toLowerCase()] = row[rowKeys[i]].trim());
      
      const nameKey = cleanKeys.find(k => k.toLowerCase().includes('name'))?.toLowerCase();
      const deptKey = cleanKeys.find(k => k.toLowerCase().includes('dept') || k.toLowerCase().includes('unit'))?.toLowerCase();

      const name = data[nameKey] || data['name'];
      const department = data[deptKey] || data['department'] || '';
      
      if (name) results.push([generateId(), name, department, null]);
    })
    .on('end', async () => {
      let connection;
      try {
        if (results.length === 0) throw new Error('No valid employee names found.');
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        await connection.query('DELETE FROM employees'); 
        await connection.query('INSERT INTO employees (id, name, department, won_prize) VALUES ?', [results]);
        
        await connection.commit();
        await fs.remove(req.file.path);
        res.json({ message: 'Success', count: results.length });
      } catch (err) {
        if (connection) await connection.rollback();
        console.error('Employee upload error:', err.message);
        res.status(500).send(err.message);
      } finally {
        if (connection) connection.release();
      }
    });
});

// Upload Winners CSV (name, prize) — matches by name, sets won_prize
// CSV columns: name, prize  (case-insensitive, partial match allowed)
app.post('/api/upload-winners', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const rows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const rowKeys = Object.keys(row);
      const cleanKeys = rowKeys.map(k => k.replace(/^\uFEFF/, '').trim());
      const data = {};
      cleanKeys.forEach((key, i) => data[key.toLowerCase()] = (row[rowKeys[i]] || '').trim());

      const nameKey = cleanKeys.find(k => k.toLowerCase().includes('name'))?.toLowerCase();
      const prizeKey = cleanKeys.find(k => k.toLowerCase().includes('prize') || k.toLowerCase().includes('award') || k.toLowerCase().includes('won'))?.toLowerCase();

      const name = data[nameKey] || data['name'];
      const prize = data[prizeKey] || data['prize'];
      if (name && prize) rows.push({ name, prize });
    })
    .on('end', async () => {
      try {
        if (rows.length === 0) throw new Error('No valid winner rows found. CSV must have name and prize columns.');
        await fs.remove(req.file.path);

        // Reset all prizes first
        await pool.query('UPDATE employees SET won_prize = NULL');

        let matched = 0, skipped = 0;
        for (const { name, prize } of rows) {
          // Case-insensitive name match
          const [found] = await pool.query(
            'SELECT id FROM employees WHERE LOWER(name) = LOWER(?)', [name.trim()]
          );
          if (found.length > 0) {
            await pool.query('UPDATE employees SET won_prize = ? WHERE id = ?', [prize, found[0].id]);
            matched++;
          } else {
            // Try partial name match
            const [partial] = await pool.query(
              'SELECT id FROM employees WHERE LOWER(name) LIKE ? LIMIT 1', [`%${name.trim().toLowerCase()}%`]
            );
            if (partial.length > 0) {
              await pool.query('UPDATE employees SET won_prize = ? WHERE id = ?', [prize, partial[0].id]);
              matched++;
            } else {
              skipped++;
            }
          }
        }
        res.json({ success: true, matched, skipped, total: rows.length });
      } catch (err) {
        console.error('Winners upload error:', err.message);
        res.status(500).send(err.message);
      }
    })
    .on('error', (err) => res.status(500).send(err.message));
});

// Upload Prizes (Session, Prize Name, Quantity, Rank)
app.post('/api/upload-prizes', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const rowKeys = Object.keys(row);
      const cleanKeys = rowKeys.map(k => k.replace(/^\uFEFF/, '').trim());
      const data = {};
      cleanKeys.forEach((key, i) => data[key.toLowerCase()] = row[rowKeys[i]].trim());
      
      const prizeNameKey = cleanKeys.find(k => k.toLowerCase().includes('prize') || k.toLowerCase().includes('item'))?.toLowerCase();
      const sessKey = cleanKeys.find(k => k.toLowerCase().includes('sess') || k.toLowerCase().includes('stage'))?.toLowerCase();
      const rankKey = cleanKeys.find(k => k.toLowerCase().includes('rank') || k.toLowerCase().includes('order'))?.toLowerCase();
      const qtyKey = cleanKeys.find(k => k.toLowerCase().includes('qty') || k.toLowerCase().includes('count') || k.toLowerCase().includes('quantity'))?.toLowerCase();

      const prizeName = data[prizeNameKey];
      if (prizeName) {
        results.push([
          generateId(),
          data[sessKey] || 'Session 1',
          parseInt(data[rankKey] || '0'),
          prizeName,
          parseInt(data[qtyKey] || '1')
        ]);
      }
    })
    .on('end', async () => {
      let connection;
      try {
        if (results.length === 0) throw new Error('No valid prizes found.');
        
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        await connection.query('DELETE FROM prizes'); 
        await connection.query('INSERT INTO prizes (id, session, rank_level, name, quantity) VALUES ?', [results]);
        
        await connection.commit();
        await fs.remove(req.file.path);
        res.json({ message: 'Success', count: results.length });
      } catch (err) {
        if (connection) await connection.rollback();
        console.error('Prize upload error:', err.message);
        res.status(500).send(err.message);
      } finally {
        if (connection) connection.release();
      }
    });
});

app.get('/api/employees', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees');
  res.json(rows);
});

app.get('/api/eligible-employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, name, department FROM employees WHERE won_prize IS NULL');
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/draw/publish', async (req, res) => {
  const { winnerId, prizeName } = req.body;
  try {
    // Validate winner is still eligible
    const [rows] = await pool.query('SELECT name FROM employees WHERE id = ? AND won_prize IS NULL', [winnerId]);
    if (rows.length === 0) return res.status(400).json({ error: 'Employee ineligible or already won' });
    
    await pool.query('UPDATE employees SET won_prize = ? WHERE id = ?', [prizeName, winnerId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// --- CLAIM API ---
app.post('/api/draw/claim', async (req, res) => {
  const { winnerId } = req.body;
  try {
    const [rows] = await pool.query('SELECT name, won_prize, is_claimed FROM employees WHERE id = ?', [winnerId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Employee not found' });
    
    const emp = rows[0];
    if (!emp.won_prize) return res.status(400).json({ error: 'This employee has not won a prize' });
    if (emp.is_claimed) return res.status(400).json({ error: 'Prize already claimed' });

    await pool.query('UPDATE employees SET is_claimed = TRUE, claimed_at = NOW() WHERE id = ?', [winnerId]);
    res.json({ success: true, name: emp.name, prize: emp.won_prize });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/draw/unclaim', async (req, res) => {
  const { winnerId } = req.body;
  try {
    await pool.query('UPDATE employees SET is_claimed = FALSE, claimed_at = NULL WHERE id = ?', [winnerId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/prizes', async (req, res) => {
  const [rows] = await pool.query('SELECT id, session, rank_level as rank, name, quantity FROM prizes ORDER BY rank_level ASC');
  res.json(rows);
});

app.get('/api/search', async (req, res) => {
  const queryStr = (req.query.q || req.query.query || '').trim();
  if (!queryStr) return res.json([]);
  try {
    const [rows] = await pool.query(
      `SELECT id, name, department, won_prize 
       FROM employees 
       WHERE name LIKE ? OR id LIKE ? 
       ORDER BY 
         CASE 
           WHEN name = ? THEN 1 
           WHEN name LIKE ? THEN 2 
           WHEN id = ? THEN 3
           ELSE 4 
         END, 
         name ASC 
       LIMIT 10`,
      [`%${queryStr}%`, `%${queryStr}%`, queryStr, `${queryStr}%`, queryStr]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/draw', async (req, res) => {
  const { prizeId } = req.body;
  const connection = await pool.getConnection();
  try {
    const [prizeRows] = await connection.query('SELECT * FROM prizes WHERE id = ?', [prizeId]);
    const prize = prizeRows[0];
    if (!prize) return res.status(404).send('Prize not found');

    const [winners] = await connection.query('SELECT * FROM employees WHERE won_prize = ?', [prize.name]);
    if (winners.length >= prize.quantity) return res.status(400).json({ error: 'Quantity limit reached' });

    const [eligible] = await connection.query('SELECT * FROM employees WHERE won_prize IS NULL');
    if (eligible.length === 0) return res.status(400).json({ error: 'No eligible employees' });

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    await connection.query('UPDATE employees SET won_prize = ? WHERE id = ?', [prize.name, winner.id]);
    
    res.json({ winner, prize });
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    connection.release();
  }
});

// 1. Draw Next Prize for a specific session (Ordered by Rank)
app.post('/api/draw/next', async (req, res) => {
  const { session } = req.body;
  const connection = await pool.getConnection();
  try {
    // Find the next available prize in this session (highest rank first)
    const [prizes] = await connection.query(
      'SELECT * FROM prizes WHERE session = ? ORDER BY rank_level DESC', 
      [session]
    );

    let targetPrize = null;
    for (const p of prizes) {
      const [winners] = await connection.query('SELECT COUNT(*) as count FROM employees WHERE won_prize = ?', [p.name]);
      if (winners[0].count < p.quantity) {
        targetPrize = p;
        break;
      }
    }

    if (!targetPrize) return res.status(404).json({ error: 'No more prizes in this session' });

    const [eligible] = await connection.query('SELECT * FROM employees WHERE won_prize IS NULL');
    if (eligible.length === 0) return res.status(400).json({ error: 'No eligible employees' });

    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    await connection.query('UPDATE employees SET won_prize = ? WHERE id = ?', [targetPrize.name, winner.id]);
    
    res.json({ winner, prize: targetPrize });
  } catch (err) {
    res.status(500).send(err.message);
  } finally {
    connection.release();
  }
});

// 2. Draw ALL remaining prizes for a session (High Speed)
app.post('/api/draw/session-all', async (req, res) => {
  const { session } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const [prizes] = await connection.query('SELECT * FROM prizes WHERE session = ?', [session]);
    const winners_added = [];

    for (const prize of prizes) {
      const [existing] = await connection.query('SELECT COUNT(*) as count FROM employees WHERE won_prize = ?', [prize.name]);
      let needed = prize.quantity - existing[0].count;
      
      if (needed <= 0) continue;

      const [eligible] = await connection.query('SELECT * FROM employees WHERE won_prize IS NULL LIMIT ?', [needed]);
      for (const winner of eligible) {
        await connection.query('UPDATE employees SET won_prize = ? WHERE id = ?', [prize.name, winner.id]);
        winners_added.push({ winner: winner.name, prize: prize.name });
      }
    }

    await connection.commit();
    res.json({ success: true, count: winners_added.length, winners: winners_added });
  } catch (err) {
    await connection.rollback();
    res.status(500).send(err.message);
  } finally {
    connection.release();
  }
});

// 3. Reset ONLY current session
app.post('/api/draw/session-reset', async (req, res) => {
  const { session } = req.body;
  try {
    // Get all prize names for this session
    const [prizes] = await pool.query('SELECT name FROM prizes WHERE session = ?', [session]);
    if (prizes.length === 0) return res.json({ message: 'No prizes in session' });

    const prizeNames = prizes.map(p => p.name);
    await pool.query('UPDATE employees SET won_prize = NULL WHERE won_prize IN (?)', [prizeNames]);
    
    res.json({ message: 'Session reset success' });
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// 4. Redraw for a specific prize (No Show handler)
app.post('/api/draw/redraw', async (req, res) => {
  const { winnerId, prizeName } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // 1. Clear the previous winner
    await connection.query('UPDATE employees SET won_prize = NULL WHERE id = ?', [winnerId]);

    // 2. Draw a new winner for the same prize
    const [eligible] = await connection.query('SELECT * FROM employees WHERE won_prize IS NULL');
    if (eligible.length === 0) throw new Error('No eligible employees left');

    const newWinner = eligible[Math.floor(Math.random() * eligible.length)];
    await connection.query('UPDATE employees SET won_prize = ? WHERE id = ?', [prizeName, newWinner.id]);

    await connection.commit();
    res.json({ winner: newWinner });
  } catch (err) {
    await connection.rollback();
    res.status(500).send(err.message);
  } finally {
    connection.release();
  }
});

app.post('/api/reset-draw', async (req, res) => {
  await pool.query('UPDATE employees SET won_prize = NULL');
  res.json({ message: 'Success' });
});

app.get('*', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, 'dist') });
});

app.listen(PORT, () => {
  initDB();
  console.log(`Server running on port ${PORT}`);
});
