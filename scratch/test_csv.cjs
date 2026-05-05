const csv = require('csv-parser');
const stream = require('stream');

const testCsv = `Name,Department,Prizes
Mohd Kass,DES DOS IP LAY APT PWR,Sunshine Grocery Voucher (RM40)
Steven Foo,CLM,Sunshine Grocery Voucher (RM40)`;

const results = [];
const s = new stream.Readable();
s.push(testCsv);
s.push(null);

s.pipe(csv())
  .on('data', (row) => {
    const rowKeys = Object.keys(row);
    const cleanKeys = rowKeys.map(k => k.replace(/^\uFEFF/, '').trim());
    const data = {};
    cleanKeys.forEach((key, i) => data[key.toLowerCase()] = (row[rowKeys[i]] || '').trim());

    const nameKey = cleanKeys.find(k => k.toLowerCase().includes('name') || k.toLowerCase().includes('employee'))?.toLowerCase();
    const prizeKey = cleanKeys.find(k => k.toLowerCase().includes('prize') || k.toLowerCase().includes('award') || k.toLowerCase().includes('won'))?.toLowerCase();
    const deptKey = cleanKeys.find(k => k.toLowerCase().includes('dept') || k.toLowerCase().includes('unit') || k.toLowerCase().includes('department'))?.toLowerCase();

    const name = data[nameKey] || data['name'];
    const prize = data[prizeKey] || data['prize'];
    const department = data[deptKey] || data['dept'] || data['department'] || '';
    
    results.push({ name, prize, department });
  })
  .on('end', () => {
    console.log(JSON.stringify(results, null, 2));
  });
