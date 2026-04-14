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

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize Database Tables
const initDB = async () => {
  try {
    const connection = await pool.getConnection();
    
    // Create Employees Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        won_prize VARCHAR(255) DEFAULT NULL
      )
    `);

    // Create Prizes Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS prizes (
        id VARCHAR(255) PRIMARY KEY,
        session VARCHAR(255),
        rank_level INT,
        name VARCHAR(255),
        quantity INT
      )
    `);

    connection.release();
    console.log('MySQL Database initialized successfully');
  } catch (err) {
    console.error('Database connection failed. Please check Hostinger Environment Variables.', err.message);
  }
};

const upload = multer({ dest: 'uploads/' });

// Upload Employees (Name, Department)
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const data = {};
      Object.keys(row).forEach(key => data[key.trim()] = row[key].trim());
      const name = data['Name'] || data['name'] || data['Employee name'] || data['Employee Name'];
      const department = data['Department'] || data['department'];
      if (name) results.push([crypto.randomUUID(), name, department, null]);
    })
    .on('end', async () => {
      try {
        if (results.length === 0) throw new Error('No valid data found');
        
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM employees'); // Clear current guests
        await connection.query('INSERT INTO employees (id, name, department, won_prize) VALUES ?', [results]);
        connection.release();
        
        await fs.remove(req.file.path);
        res.json({ message: 'Success', count: results.length });
      } catch (err) {
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
      const data = {};
      Object.keys(row).forEach(key => data[key.trim()] = row[key].trim());
      const prizeName = data['Prize Name'] || data['prize'];
      if (prizeName) {
        results.push([
          crypto.randomUUID(),
          data['Session'] || data['session'] || 'Session 1',
          parseInt(data['Rank'] || data['rank'] || '0'),
          prizeName,
          parseInt(data['Quantity'] || data['quantity'] || '1')
        ]);
      }
    })
    .on('end', async () => {
      try {
        if (results.length === 0) throw new Error('No valid data found');
        
        const connection = await pool.getConnection();
        await connection.query('DELETE FROM prizes'); // Clear current prizes
        await connection.query('INSERT INTO prizes (id, session, rank_level, name, quantity) VALUES ?', [results]);
        connection.release();
        
        await fs.remove(req.file.path);
        res.json({ message: 'Success', count: results.length });
      } catch (err) {
        res.status(500).send(err.message);
      }
    });
});

app.get('/api/employees', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees');
  res.json(rows);
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
