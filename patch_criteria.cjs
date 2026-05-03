const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const searchStr = "Rate this outfit from 0-100 based on elegance, style, colour coordination, and appropriateness for a formal gala dinner.";
const oldLine = `        const prompt = \`You are a fashion judge for a company dinner Best Dress competition. ${searchStr} Return ONLY valid JSON with no markdown: {"score": 85, "reasoning": "brief reason under 20 words"}\`;`;

const newLines = `        const criteria = req.body.criteria || 'Elegance and sophistication. Style and colour coordination. Appropriateness for a formal gala dinner. Overall presentation.';
        const prompt = \`You are a fashion judge for a company dinner Best Dress competition. Rate this outfit from 0-100 based on these criteria:\\n\\n\${criteria}\\n\\nReturn ONLY valid JSON with no markdown: {"score": 85, "reasoning": "brief reason under 20 words"}\`;`;

if (c.includes(oldLine)) {
  fs.writeFileSync('server.js', c.replace(oldLine, newLines));
  console.log('✅ PATCHED: criteria support added to AI rank prompt');
} else {
  console.log('❌ NOT FOUND — checking nearby text...');
  const idx = c.indexOf('fashion judge');
  if (idx > -1) console.log('Found "fashion judge" at char:', idx, '\nContext:', c.substring(idx-10, idx+200));
}
