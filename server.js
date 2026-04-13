import express from 'express';
import cors from 'cors';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

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
    await fs.writeJson(DB_FILE, { employees: [] });
  }
};

const getDB = () => fs.readJson(DB_FILE);
const saveDB = (data) => fs.writeJson(DB_FILE, data);

const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => {
      // Normalize keys based on user's image
      const employee = {
        name: data['Name'] || data['name'],
        id: data['Employee ID'] || data['Employee I'] || data['id'],
        email: data['Email'] || data['email'],
        department: data['Department'] || data['department'],
        diet: data['Diet'] || data['diet'],
        checked_in: false
      };
      if (employee.id) results.push(employee);
    })
    .on('end', async () => {
      const db = await getDB();
      db.employees = results; 
      await saveDB(db);
      await fs.remove(req.file.path);
      res.json({ message: 'Success', count: results.length });
    });
});

app.get('/api/employees', async (req, res) => {
  const db = await getDB();
  res.json(db.employees);
});

app.get('/api/employee/:id', async (req, res) => {
  const db = await getDB();
  const employee = db.employees.find(e => e.id === req.params.id);
  if (!employee) return res.status(404).send('Employee not found');
  res.json(employee);
});

app.post('/api/checkin/:id', async (req, res) => {
  const db = await getDB();
  const index = db.employees.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).send('Employee not found');
  
  db.employees[index].checked_in = true;
  db.employees[index].checkin_time = new Date().toISOString();
  await saveDB(db);
  res.json({ message: 'Checked in successfully', employee: db.employees[index] });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/index.html'));
});

app.listen(PORT, async () => {
  await initDB();
  console.log(`Server running on http://localhost:${PORT}`);
});
