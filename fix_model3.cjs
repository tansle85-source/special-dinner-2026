const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');
c = c.replace("const GEMINI_MODEL = 'gemini-2.0-flash-lite';", "const GEMINI_MODEL = 'gemini-2.5-flash';");
fs.writeFileSync('server.js', c);
const line = c.match(/const GEMINI_MODEL = .+/)[0];
console.log('✅ Updated:', line);
