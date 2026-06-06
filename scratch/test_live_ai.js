import axios from 'axios';

async function testLiveAI() {
  console.log("=== Testing Live Gemini API on eventjor.com ===");
  try {
    const res = await axios.post('https://eventjor.com/api/test-ai');
    console.log("Success:", res.data);
  } catch (err) {
    console.error("Failed:", err.message);
    if (err.response) {
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);
    }
  }
}

testLiveAI();
