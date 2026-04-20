const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME
    });

    try {
        console.log("Checking columns in employees table...");
        const [cols] = await conn.execute('SHOW COLUMNS FROM employees');
        const colNames = cols.map(c => c.Field);

        if (!colNames.includes('is_claimed')) {
            console.log("Adding is_claimed column...");
            await conn.execute('ALTER TABLE employees ADD COLUMN is_claimed BOOLEAN DEFAULT FALSE');
        }
        if (!colNames.includes('claimed_at')) {
            console.log("Adding claimed_at column...");
            await conn.execute('ALTER TABLE employees ADD COLUMN claimed_at DATETIME DEFAULT NULL');
        }
        console.log("Migration complete.");
    } catch (err) {
        console.error("Migration failed:", err.message);
    } finally {
        await conn.end();
    }
}

migrate();
