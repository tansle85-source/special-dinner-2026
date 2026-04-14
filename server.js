import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto'; // For generating unique IDs

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const initDB = async () => {
  if (!await fs.pathExists(DB_FILE)) {
    await fs.writeJson(DB_FILE, { employees: [], prizes: [] });
  } else {
    const db = await getDB();
    if (!db.prizes) db.prizes = [];
    await saveDB(db);
  }
};

const getDB = () => fs.readJson(DB_FILE);
const saveDB = (data) => fs.writeJson(DB_FILE, data);

const upload = multer({ dest: 'uploads/' });

// Upload Employees (Name, Department)
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const data = {};
      Object.keys(row).forEach(key => data[key.trim()] = row[key].trim());
      
      const name = data['Name'] || data['name'] || data['Employee name'] || data['Employee Name'];
      const department = data['Department'] || data['department'];
      
      if (name) {
        results.push({
          id: crypto.randomUUID(),
          name,
          department,
          won_prize: null
        });
      }
    })
    .on('end', async () => {
      const db = await getDB();
      // Only keep existing prizes, replace employees
      db.employees = results; 
      await saveDB(db);
      await fs.remove(req.file.path);
      res.json({ message: 'Success', count: results.length });
    });
});

// Upload Prizes (Rank, Prize Name, Quantity)
app.post('/api/upload-prizes', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (row) => {
      const data = {};
      Object.keys(row).forEach(key => data[key.trim()] = row[key].trim());
      
      if (data['Prize Name'] || data['prize']) {
        results.push({
          id: crypto.randomUUID(),
          rank: parseInt(data['Rank'] || data['rank'] || '0'),
          name: data['Prize Name'] || data['prize'],
          quantity: parseInt(data['Quantity'] || data['quantity'] || '1')
        });
      }
    })
    .on('end', async () => {
      const db = await getDB();
      db.prizes = results; 
      // Reset all employee wins if new prizes uploaded? No, let admin decide to reset.
      await saveDB(db);
      await fs.remove(req.file.path);
      res.json({ message: 'Success', count: results.length });
    });
});

app.get('/api/employees', async (req, res) => {
  const db = await getDB();
  res.json(db.employees);
});

app.get('/api/prizes', async (req, res) => {
  const db = await getDB();
  res.json(db.prizes || []);
});

// Search functionality for frontend
app.get('/api/search', async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);
  
  const db = await getDB();
  const lowerQuery = query.toLowerCase();
  
  const matches = db.employees.filter(e => e.name.toLowerCase().includes(lowerQuery));
  
  // Return just what is needed
  res.json(matches.map(e => ({
    name: e.name,
    department: e.department,
    won_prize: e.won_prize
  })));
});

// Trigger a Draw for a specific prize
app.post('/api/draw', async (req, res) => {
  const { prizeId } = req.body;
  if (!prizeId) return res.status(400).send('Prize ID required');

  const db = await getDB();
  
  const prize = db.prizes.find(p => p.id === prizeId);
  if (!prize) return res.status(404).send('Prize not found');

  const winnersOfThisPrize = db.employees.filter(e => e.won_prize === prize.name);
  if (winnersOfThisPrize.length >= prize.quantity) {
    return res.status(400).json({ error: 'All quantities for this prize have been drawn.' });
  }

  // Find eligible employees (who haven't won anything yet)
  const eligible = db.employees.filter(e => !e.won_prize);
  if (eligible.length === 0) {
    return res.status(400).json({ error: 'No eligible employees left to draw.' });
  }

  // Pick random winner
  const winnerIndex = Math.floor(Math.random() * eligible.length);
  const winner = eligible[winnerIndex];

  // Update DB
  const dbWinnerIndex = db.employees.findIndex(e => e.id === winner.id);
  db.employees[dbWinnerIndex].won_prize = prize.name;
  
  await saveDB(db);

  res.json({ winner: db.employees[dbWinnerIndex], prize });
});

app.post('/api/reset-draw', async (req, res) => {
  const db = await getDB();
  db.employees.forEach(e => e.won_prize = null);
  await saveDB(db);
  res.json({ message: 'Draw reset successfully' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`Server running on http://localhost:${PORT}`);
});
