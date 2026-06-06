import axios from 'axios';

const KEY = 'AIzaSyCKahN7PK-qn8gPG_pDrGyyrIwFOG4HH-Q';

async function testModel(modelName) {
  console.log(`Testing model: ${modelName}...`);
  const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${KEY}`;
  const payload = { contents: [{ parts: [{ text: "Hello" }] }] };
  try {
    const r = await axios.post(url, payload);
    console.log(`🟢 SUCCESS (${modelName}):`, r.data.candidates[0].content.parts[0].text.trim());
    return true;
  } catch (err) {
    console.error(`🔴 FAILED (${modelName}): Status=${err.response?.status}`);
    console.error(`Error details:`, err.response?.data?.error?.message || err.message);
    return false;
  }
}

async function run() {
  await testModel('gemini-1.5-flash');
  console.log('--------------------------------------------------');
  await testModel('gemini-2.0-flash-lite');
  console.log('--------------------------------------------------');
  await testModel('gemini-2.5-flash');
  console.log('--------------------------------------------------');
}

run();
