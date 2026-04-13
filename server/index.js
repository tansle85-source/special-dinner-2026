const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// Initialize DB
const initDB = async () => {
  if (!await fs.pathExists(DB_FILE)) {
    await fs.writeJson(DB_FILE, { employees: [] });
  }
};

const getDB = () => fs.readJson(DB_FILE);
const saveDB = (data) => fs.writeJson(DB_FILE, data);

// Multer setup for CSV uploads
const upload = multer({ dest: 'uploads/' });

// API Endpoints

// Upload CSV
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push({ ...data, checked_in: false }))
    .on('end', async () => {
      const db = await getDB();
      // Simple merge logic: overwrite if exists or just replace
      db.employees = results; 
      await saveDB(db);
      await fs.remove(req.file.path);
      res.json({ message: 'Success', count: results.length });
    });
});

// Get all employees
app.get('/api/employees', async (req, res) => {
  const db = await getDB();
  res.json(db.employees);
});

// Get employee by ID
app.get('/api/employee/:id', async (req, res) => {
  const db = await getDB();
  const employee = db.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).send('Employee not found');
  res.json(employee);
});

// Check-in employee
app.post('/api/checkin/:id', async (req, res) => {
  const db = await getDB();
  const index = db.employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).send('Employee not found');
  
  db.employees[index].checked_in = true;
  db.employees[index].checkin_time = new Date().toISOString();
  await saveDB(db);
  res.json({ message: 'Checked in successfully', employee: db.employees[index] });
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`Server running on http://localhost:${PORT}`);
});
