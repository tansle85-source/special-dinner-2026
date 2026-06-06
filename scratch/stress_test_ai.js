import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import axios from 'axios';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT || '3306')
};

const DUMMY_PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runStressTest() {
  console.log("=== AI RANKING STRESS TEST ===");
  console.log("DB Host:", DB_CONFIG.host);
  console.log("DB Name:", DB_CONFIG.database);
  
  let pool;
  try {
    pool = mysql.createPool(DB_CONFIG);
  } catch (err) {
    console.error("Failed to connect to database:", err.message);
    process.exit(1);
  }

  // 1. Get existing submissions
  let [rows] = await pool.query('SELECT * FROM m26_best_dress_submissions');
  console.log(`Current submissions count in DB: ${rows.length}`);
  
  // Find a template with photo
  let template = rows.find(r => r.photo_data);
  let basePhoto = template ? template.photo_data : DUMMY_PHOTO;

  // 2. Prepare 30 test submissions
  console.log("Preparing 30 test submissions in database...");
  const testSubIds = [];
  const startNum = rows.length;
  
  for (let i = 0; i < 30; i++) {
    const id = crypto.randomUUID();
    const name = `Stress Tester ${startNum + i + 1}`;
    const department = `QA Department`;
    const gender = i % 2 === 0 ? 'Female' : 'Male';
    
    await pool.query(
      'INSERT INTO m26_best_dress_submissions (id, name, department, gender, photo_data, voter_id) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, department, gender, basePhoto, 'stress-voter-id']
    );
    testSubIds.push({ id, name });
  }
  console.log(`Inserted 30 test submissions. IDs collected.`);

  // Verify server is up
  try {
    await axios.get(`${BASE_URL}/api/version`);
  } catch (e) {
    console.error(`\nERROR: Server is not running at ${BASE_URL}.`);
    console.log("Start the server in a separate terminal before running this script.");
    console.log("Cleaning up test submissions...");
    await pool.query('DELETE FROM m26_best_dress_submissions WHERE voter_id = "stress-voter-id"');
    await pool.end();
    process.exit(1);
  }

  // 3. Run Sequential Stress Test (like Frontend loop)
  console.log("\n--- Running Sequential Test (500ms delay between triggers, like frontend UI) ---");
  let sequentialSuccess = 0;
  let sequentialFailure = 0;
  const seqStart = Date.now();
  const seqResults = [];

  for (let i = 0; i < testSubIds.length; i++) {
    const sub = testSubIds[i];
    const reqStart = Date.now();
    console.log(`[Seq] Scoring ${sub.name} (${i+1}/30)...`);
    
    try {
      const res = await axios.post(`${BASE_URL}/api/best-dress/ai-score-single`, {
        id: sub.id,
        criteria: "Elegance and style. Look for premium outfits."
      });
      const duration = Date.now() - reqStart;
      console.log(`[Seq] ${sub.name} Success: Score=${res.data.score} (${duration}ms)`);
      sequentialSuccess++;
      seqResults.push({ name: sub.name, success: true, duration });
    } catch (err) {
      const duration = Date.now() - reqStart;
      console.error(`[Seq] ${sub.name} Failed: ${err.response?.data?.error || err.message} (${duration}ms)`);
      sequentialFailure++;
      seqResults.push({ name: sub.name, success: false, duration, error: err.response?.data?.error || err.message });
    }
    
    if (i < testSubIds.length - 1) {
      await sleep(500); // 500ms delay between requests
    }
  }
  
  const seqTotalTime = Date.now() - seqStart;
  const seqAvgLatency = seqResults.filter(r => r.success).reduce((s, r) => s + r.duration, 0) / (sequentialSuccess || 1);

  console.log(`\nSequential Test Results:`);
  console.log(`- Total Time: ${(seqTotalTime / 1000).toFixed(2)}s`);
  console.log(`- Success: ${sequentialSuccess} / 30`);
  console.log(`- Failure: ${sequentialFailure} / 30`);
  console.log(`- Avg Success Latency: ${seqAvgLatency.toFixed(0)}ms`);

  // Reset scores for concurrent test
  await pool.query('UPDATE m26_best_dress_submissions SET ai_score = NULL, ai_reasoning = NULL WHERE voter_id = "stress-voter-id"');

  // 4. Run Concurrent Stress Test (extreme load - all 30 at once)
  console.log("\n--- Running Concurrent Test (All 30 requests concurrently!) ---");
  const conStart = Date.now();
  
  const conPromises = testSubIds.map(async (sub, index) => {
    // Add small stagger of 100ms just to not freeze local socket pool, but otherwise concurrent
    await sleep(index * 100);
    const reqStart = Date.now();
    try {
      const res = await axios.post(`${BASE_URL}/api/best-dress/ai-score-single`, {
        id: sub.id,
        criteria: "Elegance and style. Look for premium outfits."
      });
      const duration = Date.now() - reqStart;
      return { name: sub.name, success: true, duration };
    } catch (err) {
      const duration = Date.now() - reqStart;
      return { name: sub.name, success: false, duration, error: err.response?.data?.error || err.message };
    }
  });

  const conResults = await Promise.all(conPromises);
  const conTotalTime = Date.now() - conStart;
  
  const concurrentSuccess = conResults.filter(r => r.success).length;
  const concurrentFailure = conResults.filter(r => !r.success).length;
  const conAvgLatency = conResults.filter(r => r.success).reduce((s, r) => s + r.duration, 0) / (concurrentSuccess || 1);

  console.log(`\nConcurrent Test Results:`);
  console.log(`- Total Time: ${(conTotalTime / 1000).toFixed(2)}s`);
  console.log(`- Success: ${concurrentSuccess} / 30`);
  console.log(`- Failure: ${concurrentFailure} / 30`);
  console.log(`- Avg Success Latency: ${conAvgLatency.toFixed(0)}ms`);
  
  if (concurrentFailure > 0) {
    console.log("Failed requests error samples:");
    conResults.filter(r => !r.success).slice(0, 5).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  // 5. Cleanup
  console.log("\nCleaning up stress test submissions from database...");
  await pool.query('DELETE FROM m26_best_dress_submissions WHERE voter_id = "stress-voter-id"');
  console.log("Cleanup complete.");

  await pool.end();
  console.log("\n=== Stress Test Finished ===");
}

runStressTest().catch(console.error);
