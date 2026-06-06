import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env'), override: true });

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  // Test gemini-1.5-flash
  console.log("Testing gemini-1.5-flash via SDK...");
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent('Hello');
    console.log("Success (1.5-flash):", result.response.text());
  } catch (err) {
    console.error("Failed (1.5-flash):", err.message);
    if (err.status) console.error("Status:", err.status);
  }

  // Test gemini-1.5-flash-8b
  console.log("\nTesting gemini-1.5-flash-8b via SDK...");
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' });
    const result = await model.generateContent('Hello');
    console.log("Success (1.5-flash-8b):", result.response.text());
  } catch (err) {
    console.error("Failed (1.5-flash-8b):", err.message);
  }
}

run();
