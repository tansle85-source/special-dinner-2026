const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
const count = (c.match(/gemini-1\.5-flash/g) || []).length;
const updated = c.replace(/gemini-1\.5-flash/g, 'gemini-2.0-flash-lite');
fs.writeFileSync('server.js', updated);
console.log('Replaced', count, 'occurrences of gemini-1.5-flash → gemini-2.0-flash-lite');
