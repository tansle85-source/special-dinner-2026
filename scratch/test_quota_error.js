import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

async function run() {
  const GEMINI_MODEL = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const payload = { contents: [{ parts: [{ text: "Hello" }] }] };
  
  const promises = Array.from({ length: 15 }).map(() => axios.post(url, payload).catch(e => e));
  const results = await Promise.all(promises);
  
  const failed = results.find(r => r.response?.status === 429);
  if (failed) {
    console.log("Error status:", failed.response?.status);
    console.log("Error data:", JSON.stringify(failed.response?.data, null, 2));
  } else {
    console.log("No 429 found in the results");
  }
}
run();
