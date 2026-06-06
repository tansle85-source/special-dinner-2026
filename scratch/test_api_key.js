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
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Sending request (attempt ${attempt})...`);
    try {
      const r = await axios.post(url, payload);
      console.log("Success:", r.data.candidates[0].content.parts[0].text);
      return;
    } catch (err) {
      console.error(`Failed (status ${err.response?.status})`);
      const details = err.response?.data?.error?.details;
      const retryInfo = details?.find(d => d['@type']?.includes('RetryInfo'));
      if (retryInfo && retryInfo.retryDelay) {
        const seconds = parseInt(retryInfo.retryDelay.replace('s', '')) || 60;
        console.log(`Waiting for ${seconds} seconds as requested by API...`);
        await new Promise(r => setTimeout(r, (seconds + 2) * 1000));
      } else {
        console.error("No retry info. Error details:", JSON.stringify(err.response?.data, null, 2));
        return;
      }
    }
  }
}

run();
