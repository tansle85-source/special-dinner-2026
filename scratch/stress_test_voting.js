import axios from 'axios';
import crypto from 'crypto';
import http from 'http';
import https from 'https';

// Retrieve target URL from arguments, default to production if not specified
const TARGET_URL = process.argv[2] || 'https://eventjor.com';
const CONCURRENT_REQUESTS = 750;
const TEST_MODE = process.argv[3] || 'both'; // 'both' | 'perf' | 'bd'

// Configure Keep-Alive agents for high-concurrency connection reuse
const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 1000 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 1000 });

const client = axios.create({
  baseURL: TARGET_URL,
  timeout: 15000,
  httpAgent,
  httpsAgent
});

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function runVotingStressTest() {
  console.log("=================================================");
  console.log("🔥 STARTING VOTING CONCURRENCY STRESS TEST 🔥");
  console.log("Target Server:", TARGET_URL);
  console.log("Concurrent Users/Requests:", CONCURRENT_REQUESTS);
  console.log("Test Mode Selection:", TEST_MODE.toUpperCase());
  console.log("=================================================\n");

  let participantId = null;
  let nomineeId = null;

  // Step 1: Query endpoints to get valid candidates/performers
  console.log("🔍 Fetching performers and nominees to find valid IDs...");
  try {
    const pRes = await client.get('/api/performance/participants');
    if (pRes.data && pRes.data.length > 0) {
      participantId = pRes.data[0].id;
      console.log(`✅ Found Performer: "${pRes.data[0].name}" (ID: ${participantId})`);
    } else {
      console.log("⚠️ No performance participants found in DB.");
    }
  } catch (err) {
    console.log("⚠️ Could not fetch performance participants:", err.message);
  }

  try {
    const nRes = await client.get('/api/best-dress/nominees');
    if (nRes.data && nRes.data.length > 0) {
      nomineeId = nRes.data[0].id;
      console.log(`✅ Found Best Dress nominee: "${nRes.data[0].nominee_name}" (ID: ${nomineeId})`);
    } else {
      console.log("⚠️ No Best Dress nominees found in DB.");
    }
  } catch (err) {
    console.log("⚠️ Could not fetch Best Dress nominees:", err.message);
  }

  // Fallbacks if tables are empty
  if (!participantId) {
    participantId = 'stress-performer-id';
    console.log(`ℹ️ Using fallback Performer ID: ${participantId}`);
  }
  if (!nomineeId) {
    nomineeId = 'stress-nominee-id';
    console.log(`ℹ️ Using fallback Nominee ID: ${nomineeId}`);
  }

  console.log("\n🚀 Commencing stress test...");

  const startTime = Date.now();
  const results = [];

  // Generate requests
  const promises = Array.from({ length: CONCURRENT_REQUESTS }).map(async (_, index) => {
    // Stagger slightly (1ms per request) to prevent local client socket choking
    await sleep(index * 1);
    
    const voterId = 'stress-' + crypto.randomUUID();
    const reqStart = Date.now();

    // Select endpoint based on test mode
    let isPerformanceRate = true;
    if (TEST_MODE === 'bd') {
      isPerformanceRate = false;
    } else if (TEST_MODE === 'both') {
      isPerformanceRate = index % 2 === 0;
    }
    
    try {
      let res;
      if (isPerformanceRate) {
        res = await client.post('/api/performance/rate', {
          participant_id: participantId,
          voter_id: voterId,
          score_1: 5,
          score_2: 4,
          score_3: 5
        });
      } else {
        res = await client.post('/api/best-dress/vote', {
          nominee_id: nomineeId,
          voter_id: voterId
        });
      }
      
      const duration = Date.now() - reqStart;
      return { 
        index, 
        type: isPerformanceRate ? 'Performance Rate' : 'Best Dress Vote', 
        success: true, 
        status: res.status, 
        duration 
      };
    } catch (err) {
      const duration = Date.now() - reqStart;
      return { 
        index, 
        type: isPerformanceRate ? 'Performance Rate' : 'Best Dress Vote', 
        success: false, 
        status: err.response?.status || 'network_error', 
        error: err.response?.data?.error || err.message,
        duration 
      };
    }
  });

  console.log(`⏳ Sending ${CONCURRENT_REQUESTS} concurrent requests... Please wait.`);
  const allResults = await Promise.all(promises);
  const totalDuration = Date.now() - startTime;

  // Compute stats
  const successCount = allResults.filter(r => r.success).length;
  const failureCount = allResults.filter(r => !r.success).length;
  const rates = allResults.filter(r => r.type === 'Performance Rate');
  const votes = allResults.filter(r => r.type === 'Best Dress Vote');
  
  const avgLatency = allResults.reduce((sum, r) => sum + r.duration, 0) / CONCURRENT_REQUESTS;
  const rps = (CONCURRENT_REQUESTS / (totalDuration / 1000)).toFixed(1);

  console.log("\n=================================================");
  console.log("📊 STRESS TEST COMPLETE REPORT 📊");
  console.log("=================================================");
  console.log(`Total Requests Sent: ${CONCURRENT_REQUESTS}`);
  console.log(`Success Count (200): ${successCount}`);
  console.log(`Failure Count:       ${failureCount}`);
  console.log(`Total Time Taken:    ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`Requests Per Second: ${rps} req/sec`);
  console.log(`Average Latency:     ${avgLatency.toFixed(0)}ms`);
  console.log("-------------------------------------------------");
  console.log(`- Performance Rate Success: ${rates.filter(r => r.success).length} / ${rates.length}`);
  console.log(`- Best Dress Vote Success:  ${votes.filter(r => r.success).length} / ${votes.length}`);
  
  if (failureCount > 0) {
    console.log("\n⚠️ Error Breakdown (First 5 errors):");
    allResults.filter(r => !r.success).slice(0, 5).forEach((r, i) => {
      console.log(`  [${i+1}] Request #${r.index} (${r.type}) failed with status ${r.status}: "${r.error}"`);
    });
    console.log("\n💡 TIP: If you get HTTP 403, it means voting status is CLOSED on the server.");
  } else {
    console.log("\n🏆 PERFECT! 100% of requests succeeded without any packet loss or errors.");
  }
  console.log("=================================================\n");
}

runVotingStressTest().catch(console.error);
