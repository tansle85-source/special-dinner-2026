import mysql from 'mysql2/promise';

const hosts = ['localhost', 'srv2098.hstgr.io'];
const credentials = [
  {
    host: 'localhost',
    user: 'u394663060_app_user',
    password: 'Sltan851212',
    database: 'u394663060_dinner_v2'
  },
  {
    host: 'srv2098.hstgr.io',
    user: 'u394663060_app_user',
    password: 'Sltan851212',
    database: 'u394663060_dinner_v2'
  },
  {
    host: 'srv2098.hstgr.io',
    user: 'u394663060_companydinner',
    password: 'Sltan851212',
    database: 'u394663060_companydinner'
  }
];

async function test() {
  for (const cred of credentials) {
    console.log(`Testing connection to ${cred.user}@${cred.host}/${cred.database}...`);
    try {
      const conn = await mysql.createConnection({
        host: cred.host,
        user: cred.user,
        password: cred.password,
        database: cred.database,
        port: 3306,
        connectTimeout: 5000
      });
      console.log(`🟢 SUCCESS: Connected to ${cred.host}!`);
      const [rows] = await conn.query('SHOW TABLES');
      console.log('Tables:', rows.map(r => Object.values(r)[0]).join(', '));
      await conn.end();
    } catch (err) {
      console.error(`🔴 FAILED: ${err.message}`);
    }
    console.log('--------------------------------------------------');
  }
}

test();
