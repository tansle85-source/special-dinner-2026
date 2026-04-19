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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Health Check for 503 Monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    version: '1.4.7', 
    db: pool ? 'connected' : 'disconnected',
    time: new Date().toISOString() 
  });
});

// Ensure upload directory exists - Wrapped in try/catch to prevent 503 startup crashes
try {
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('Warning: Could not create uploads directory:', err.message);
}

// Use relative path for Multer destination - more compatible with some proxy setups
const upload = multer({ dest: 'uploads/' });

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
    queueLimit: 0
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
        won_prize VARCHAR(255) DEFAULT NULL
      )
    `);

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
    await connection.query(`CREATE TABLE IF NOT EXISTS performance_participants (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, department VARCHAR(255))`);
    await connection.query(`CREATE TABLE IF NOT EXISTS performance_scores (id INT AUTO_INCREMENT PRIMARY KEY, participant_id VARCHAR(255), score_1 INT, score_2 INT, score_3 INT)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS best_dress_votes (id VARCHAR(255) PRIMARY KEY, nominee_name VARCHAR(255) NOT NULL, vote_count INT DEFAULT 0)`);
    await connection.query(`CREATE TABLE IF NOT EXISTS feedback (id INT AUTO_INCREMENT PRIMARY KEY, comment TEXT, rating INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);

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
    const id = crypto.randomUUID();
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
    const id = crypto.randomUUID();
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
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO performance_participants (id, name, department) VALUES (?, ?, ?)', [id, req.body.name, req.body.department]);
  res.json({ id });
});

app.delete('/api/performance/participants/:id', async (req, res) => {
  await pool.query('DELETE FROM performance_participants WHERE id = ?', [req.params.id]);
  res.json({ message: 'Deleted' });
});

app.post('/api/performance/rate', async (req, res) => {
  const { participant_id, score_1, score_2, score_3 } = req.body;
  await pool.query('INSERT INTO performance_scores (participant_id, score_1, score_2, score_3) VALUES (?, ?, ?, ?)', 
    [participant_id, score_1, score_2, score_3]);
  res.json({ success: true });
});

app.get('/api/performance/results', async (req, res) => {
  const [rows] = await pool.query(`
    SELECT p.name, p.department, 
    AVG(s.score_1) as s1, AVG(s.score_2) as s2, AVG(s.score_3) as s3,
    (AVG(s.score_1) + AVG(s.score_2) + AVG(s.score_3)) / 3 as total
    FROM performance_participants p
    LEFT JOIN performance_scores s ON p.id = s.participant_id
    GROUP BY p.id
    ORDER BY total DESC
  `);
  res.json(rows);
});

// --- FEEDBACK & BEST DRESS ---
app.post('/api/feedback', async (req, res) => {
  await pool.query('INSERT INTO feedback (comment, rating) VALUES (?, ?)', [req.body.comment, req.body.rating]);
  res.json({ success: true });
});

app.get('/api/feedback', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
  res.json(rows);
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
      
      if (results.length === 0) console.log("RAW EMPLOYEE HEADERS:", cleanKeys);

      const data = {};
      cleanKeys.forEach((key, i) => data[key.toLowerCase()] = row[rowKeys[i]].trim());
      
      // Permissive find: Look for any column containing 'name' or 'dept/unit'
      const nameKey = cleanKeys.find(k => k.toLowerCase().includes('name'))?.toLowerCase();
      const deptKey = cleanKeys.find(k => k.toLowerCase().includes('dept') || k.toLowerCase().includes('unit'))?.toLowerCase();

      const name = data[nameKey] || data['name'];
      const department = data[deptKey] || data['department'] || '';
      
      if (name) results.push([crypto.randomUUID(), name, department, null]);
    })
    .on('end', async () => {
      try {
        if (results.length === 0) throw new Error('No valid employee names found. Please check your CSV headers (e.g., Name, Department).');
        
        console.log(`Attempting to upload ${results.length} employees...`);
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM employees'); 
        await connection.query('INSERT INTO employees (id, name, department, won_prize) VALUES ?', [results]);
        connection.release();
        
        await fs.remove(req.file.path);
        console.log('Employee upload success');
        res.json({ message: 'Success', count: results.length });
      } catch (err) {
        console.error('Employee upload error:', err.message);
        res.status(500).send(err.message);
      }
    });
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
      
      if (results.length === 0) console.log("RAW PRIZE HEADERS:", cleanKeys);

      const data = {};
      cleanKeys.forEach((key, i) => data[key.toLowerCase()] = row[rowKeys[i]].trim());
      
      // Permissive search for prize fields
      const prizeNameKey = cleanKeys.find(k => k.toLowerCase().includes('prize') || k.toLowerCase().includes('item'))?.toLowerCase();
      const sessKey = cleanKeys.find(k => k.toLowerCase().includes('sess') || k.toLowerCase().includes('stage'))?.toLowerCase();
      const rankKey = cleanKeys.find(k => k.toLowerCase().includes('rank') || k.toLowerCase().includes('order'))?.toLowerCase();
      const qtyKey = cleanKeys.find(k => k.toLowerCase().includes('qty') || k.toLowerCase().includes('count') || k.toLowerCase().includes('quantity'))?.toLowerCase();

      const prizeName = data[prizeNameKey];
      if (prizeName) {
        results.push([
          crypto.randomUUID(),
          data[sessKey] || 'Session 1',
          parseInt(data[rankKey] || '0'),
          prizeName,
          parseInt(data[qtyKey] || '1')
        ]);
      }
    })
    .on('end', async () => {
      try {
        if (results.length === 0) throw new Error('No valid prizes found. Please check your CSV headers (e.g., Session, Prize Name, Quantity, Rank).');
        
        console.log(`Attempting to upload ${results.length} prizes...`);
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM prizes'); 
        await connection.query('INSERT INTO prizes (id, session, rank_level, name, quantity) VALUES ?', [results]);
        connection.release();
        
        await fs.remove(req.file.path);
        console.log('Prize upload success');
        res.json({ message: 'Success', count: results.length });
      } catch (err) {
        console.error('Prize upload error:', err.message);
        res.status(500).send(err.message);
      }
    });
});

app.get('/api/employees', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees');
  res.json(rows);
});

app.get('/api/eligible-employees', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT name FROM employees WHERE won_prize IS NULL');
    res.json(rows.map(r => r.name));
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/prizes', async (req, res) => {
  const [rows] = await pool.query('SELECT id, session, rank_level as rank, name, quantity FROM prizes ORDER BY rank_level ASC');
  res.json(rows);
});

app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);
  const [rows] = await pool.query('SELECT name, department, won_prize FROM employees WHERE name LIKE ?', [`%${query}%`]);
  res.json(rows);
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

app.post('/api/reset-draw', async (req, res) => {
  await pool.query('UPDATE employees SET won_prize = NULL');
  res.json({ message: 'Success' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, () => {
  initDB();
  console.log(`Server running on port ${PORT}`);
});
