import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
};

async function cleanup() {
  console.log("Connecting to clean up database...");
  const conn = await mysql.createConnection(DB_CONFIG);
  const [res] = await conn.query('DELETE FROM m26_best_dress_submissions WHERE voter_id = "stress-voter-id"');
  console.log(`Deleted ${res.affectedRows} stress test rows.`);
  await conn.end();
}

cleanup().catch(console.error);
