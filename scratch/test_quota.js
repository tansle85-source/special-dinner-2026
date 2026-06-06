import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  const GEMINI_MODEL = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const payload = { contents: [{ parts: [{ text: "Hello" }] }] };
  
  console.log("=== STARTING QUOTA TEST ===");
  let successCount = 0;
  
  for (let i = 1; i <= 22; i++) {
    const reqStart = Date.now();
    try {
      const r = await axios.post(url, payload);
      const duration = Date.now() - reqStart;
      console.log(`[Request ${i}] Success: ${r.data.candidates[0].content.parts[0].text.substring(0, 15).replace(/\n/g, ' ')}... (${duration}ms)`);
      successCount++;
    } catch (err) {
      console.error(`[Request ${i}] FAILED: Status=${err.response?.status}, Error=${err.response?.data?.error?.message || err.message}`);
    }
    
    if (i < 22) {
      await sleep(2000); // 2-second delay between requests to stay within 15 RPM
    }
  }
  
  console.log(`=== QUOTA TEST FINISHED: ${successCount} / 22 succeeded ===`);
}

run();
