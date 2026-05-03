const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

// Fix 1: Change model from gemini-1.5-flash to gemini-2.0-flash-lite
c = c.replace("const GEMINI_MODEL = 'gemini-1.5-flash';", "const GEMINI_MODEL = 'gemini-2.0-flash-lite';");

// Fix 2: Change v1 to v1beta in the URL (gemini-2.0-flash-lite is on v1beta)
c = c.replace(/googleapis\.com\/v1\/models\//g, 'googleapis.com/v1beta/models/');

fs.writeFileSync('server.js', c);

// Verify
const modelLine = c.match(/const GEMINI_MODEL = .+/)[0];
const urlLine = c.match(/googleapis\.com\/.+?models\//g);
console.log('Model:', modelLine);
console.log('URL endpoint:', [...new Set(urlLine)]);
