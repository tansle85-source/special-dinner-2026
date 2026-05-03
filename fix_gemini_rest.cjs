/**
 * Replaces all GoogleGenerativeAI SDK calls with direct axios REST calls
 * to the Gemini v1 API endpoint where gemini-1.5-flash is supported.
 */
const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// 1. Remove the GoogleGenerativeAI import
c = c.replace("import { GoogleGenerativeAI } from '@google/generative-ai';\n", '');

// 2. Add a Gemini helper right after dotenv import
const helperCode = `
// ── Gemini REST API helper (uses v1 endpoint — stable, not v1beta) ────────────
const GEMINI_MODEL = 'gemini-1.5-flash';
async function geminiText(prompt) {
  const axios = (await import('axios')).default;
  const url = \`https://generativelanguage.googleapis.com/v1/models/\${GEMINI_MODEL}:generateContent?key=\${process.env.GEMINI_API_KEY}\`;
  const r = await axios.post(url, { contents: [{ parts: [{ text: prompt }] }] });
  return r.data.candidates[0].content.parts[0].text.trim();
}
async function geminiVision(b64, mimeType, prompt) {
  const axios = (await import('axios')).default;
  const url = \`https://generativelanguage.googleapis.com/v1/models/\${GEMINI_MODEL}:generateContent?key=\${process.env.GEMINI_API_KEY}\`;
  const r = await axios.post(url, { contents: [{ parts: [
    { inlineData: { mimeType, data: b64 } },
    { text: prompt }
  ]}]});
  return r.data.candidates[0].content.parts[0].text.trim();
}
// ─────────────────────────────────────────────────────────────────────────────
`;
c = c.replace("import dotenv from 'dotenv';\n", "import dotenv from 'dotenv';\n" + helperCode);

// 3. Replace test-ai endpoint body
const oldTestAI = `  try {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent('Say exactly: "Gemini is connected and ready!"');
    res.json({ ok: true, response: result.response.text().trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }`;
const newTestAI = `  try {
    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });
    const text = await geminiText('Say exactly: "Gemini is connected and ready!"');
    res.json({ ok: true, response: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }`;
c = c.replace(oldTestAI, newTestAI);

// 4. Replace ai-rank model setup block
const oldRankSetup = `    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });

    const errors = [];`;
const newRankSetup = `    if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set on server' });

    const errors = [];`;
c = c.replace(oldRankSetup, newRankSetup);

// 5. Replace vision call in ai-rank
const oldVisionCall = `        const result = await model.generateContent([
          { inlineData: { data: b64, mimeType: mime } },
          prompt
        ]);
        const text = result.response.text().trim();`;
const newVisionCall = `        const text = await geminiVision(b64, mime, prompt);`;
c = c.replace(oldVisionCall, newVisionCall);

// 6. Replace feedback ai-analyze model setup
const oldFbSetup = `    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
    const result = await model.generateContent(prompt);
    res.json({ success: true, summary: result.response.text().trim() });`;
const newFbSetup = `    const summary = await geminiText(prompt);
    res.json({ success: true, summary });`;
c = c.replace(oldFbSetup, newFbSetup);

fs.writeFileSync('server.js', c);
console.log('✅ All Gemini SDK calls replaced with direct v1 REST API calls');

// Verify no remaining GoogleGenerativeAI references
const remaining = (c.match(/GoogleGenerativeAI|getGenerativeModel/g) || []);
if (remaining.length > 0) {
  console.log('⚠️  Remaining SDK references:', remaining);
} else {
  console.log('✅ No remaining SDK references — clean migration');
}
