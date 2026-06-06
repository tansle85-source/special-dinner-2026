import axios from 'axios';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_URL = 'http://localhost:5000';

async function run() {
  console.log("=== PHOTO EXPORT INTEGRATION TEST ===");
  try {
    // 1. Verify health check
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log("Health Check:", health.data);

    // 2. Trigger Export
    console.log("Triggering export...");
    const start = await axios.post(`${BASE_URL}/api/best-dress/export-start`);
    console.log("Export triggered:", start.data);

    // 3. Poll status
    let completed = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const status = await axios.get(`${BASE_URL}/api/best-dress/export-status`);
      console.log(`Poll #${i+1}: status=${status.data.status}, progress=${status.data.current}/${status.data.total}`);
      
      if (status.data.status === 'completed') {
        completed = true;
        console.log("Export completed! Zip URL:", status.data.zipUrl);
        break;
      }
      if (status.data.status === 'failed') {
        console.error("Export failed on server:", status.data.error);
        break;
      }
    }

    if (completed) {
      // 4. Verify ZIP file exists and is non-empty
      const zipPath = path.join(__dirname, '../uploads/best_dress_photos.zip');
      if (await fs.pathExists(zipPath)) {
        const stats = await fs.stat(zipPath);
        console.log(`SUCCESS: Zip file exists at ${zipPath} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        console.error("ERROR: Zip file was not found at path:", zipPath);
      }

      // 5. Verify extracted folders exist
      const exportDir = path.join(__dirname, '../uploads/best_dress_export');
      const femaleFiles = await fs.readdir(path.join(exportDir, 'Female'));
      const maleFiles = await fs.readdir(path.join(exportDir, 'Male'));
      console.log(`Extracted Female photos: ${femaleFiles.length}`);
      console.log(`Extracted Male photos: ${maleFiles.length}`);
    } else {
      console.error("ERROR: Export did not complete in time.");
    }
  } catch (err) {
    console.error("Test failed:", err.message);
    if (err.response) {
      console.error("Response data:", err.response.data);
    }
  }
}

run();
