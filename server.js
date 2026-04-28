const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { query, pool } = require('./config/db');

const app = express();

const publicPath = fs.existsSync(path.join(__dirname, 'public')) 
    ? path.join(__dirname, 'public') 
    : path.join(__dirname, '..', 'public_html');

console.log(`[Config] Serving static files from: ${publicPath}`);


app.use('/uploads', express.static(path.join(publicPath, 'uploads')));


// Multer Configuration for Best Dress Nominations
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(publicPath, 'uploads', 'nominations');

        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const genModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });


app.use(compression()); // Enable Gzip for 700+ users
const PORT = process.env.PORT || 3000;
const TOTAL_TABLES = 60;
const SEATS_PER_TABLE = 11;

// Performance Cache for /api/data
let apiDataCache = null;
let apiDataCacheTime = 0;
const CACHE_DURATION = 2000; // 2 seconds jitter-protection for 600+ users
let pendingDataRequest = null; // Request coalescing for high concurrency

function clearApiCache() {
    apiDataCache = null;
    apiDataCacheTime = 0;
    pendingDataRequest = null;
}

app.use(cors());
app.use(express.json());
app.use(express.static(publicPath, {
    setHeaders: (res, path) => {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}));

// Run auto-migration and initialization
async function initDB() {
    console.log("[DB] Starting database initialization...");
    try {
        // 0. Auto-migrations
        try {
            const [columns] = await pool.execute(`SHOW COLUMNS FROM admins`);
            const columnExists = columns.some(c => c.Field === 'permissions');
            if (!columnExists) {
                console.log(`[DB] Running auto-migration: Adding permissions to admins...`);
                await pool.execute(`ALTER TABLE admins ADD COLUMN permissions TEXT NULL`);
            }
        } catch (err) {
            console.warn(`[DB] Migration warning (admins):`, err.message);
        }

        // 1. Core Tables
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS employees (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                dept VARCHAR(100),
                diet VARCHAR(50),
                checked_in BOOLEAN DEFAULT FALSE
            )
        `);

        // Migration for door_gift_claimed
        try {
            const [columns] = await pool.execute(`SHOW COLUMNS FROM employees`);
            const columnExists = columns.some(c => c.Field === 'door_gift_claimed');
            if (!columnExists) {
                console.log(`[DB] Running auto-migration: Adding door_gift_claimed to employees...`);
                await pool.execute(`ALTER TABLE employees ADD COLUMN door_gift_claimed BOOLEAN DEFAULT FALSE`);
            }
        } catch (err) {
            console.warn(`[DB] Migration warning (employees):`, err.message);
        }

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS seats (
                tableIdx INT NOT NULL,
                seatIdx INT NOT NULL,
                assignedEmpId VARCHAR(50) NULL,
                checkedIn BOOLEAN DEFAULT FALSE,
                pax_name VARCHAR(255) NULL,
                diet VARCHAR(50) NULL,
                PRIMARY KEY (tableIdx, seatIdx),
                FOREIGN KEY (assignedEmpId) REFERENCES employees(id) ON DELETE SET NULL
            )
        `);

        // Migration for diet in seats
        try {
            const [columns] = await pool.execute(`SHOW COLUMNS FROM seats`);
            const columnExists = columns.some(c => c.Field === 'diet');
            if (!columnExists) {
                console.log(`[DB] Running auto-migration: Adding diet to seats...`);
                await pool.execute(`ALTER TABLE seats ADD COLUMN diet VARCHAR(50) NULL AFTER pax_name`);
            }
        } catch (err) {
            console.warn(`[DB] Migration warning (seats diet):`, err.message);
        }

        // Migration for pax_name in seats
        try {
            const [columns] = await pool.execute(`SHOW COLUMNS FROM seats`);
            const columnExists = columns.some(c => c.Field === 'pax_name');
            if (!columnExists) {
                console.log(`[DB] Running auto-migration: Adding pax_name to seats...`);
                await pool.execute(`ALTER TABLE seats ADD COLUMN pax_name VARCHAR(255) NULL AFTER assignedEmpId`);
            }
        } catch (err) {
            console.warn(`[DB] Migration warning (seats):`, err.message);
        }

        // Optimization: Performance indexes for high concurrency (v1.5.69)
        try {
            await pool.execute(`ALTER TABLE employees ADD INDEX idx_emp_name (name)`);
            console.log("[DB] Index idx_emp_name created.");
        } catch (e) { /* already exists */ }
        try {
            await pool.execute(`ALTER TABLE seats ADD INDEX idx_seat_empid (assignedEmpId)`);
            console.log("[DB] Index idx_seat_empid created.");
        } catch (e) { /* already exists */ }



        await pool.execute(`
            CREATE TABLE IF NOT EXISTS admins (
                username VARCHAR(100) PRIMARY KEY,
                password VARCHAR(255) NOT NULL,
                full_name VARCHAR(255),
                role VARCHAR(100),
                permissions TEXT NULL
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS tables_status (
                tableIdx INT PRIMARY KEY,
                status VARCHAR(20) NOT NULL DEFAULT 'Online'
            )
        `);

        // Migration: Resource Locks (Distributed Concurrency v1.5.62)
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS resource_locks (
                lockKey VARCHAR(100) PRIMARY KEY,
                empId VARCHAR(50),
                sessionId VARCHAR(255),
                expiresAt BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log("[DB] Optimization: Cleaning up stale memory locks...");
        await pool.execute(`DELETE FROM resource_locks WHERE expiresAt < ?`, [Date.now()]);

        // Migration: Session ID (v1.7.10 (LEGACY-FIX) (LEGACY-FIX) (LEGACY-FIX))
        try {
            await pool.execute('ALTER TABLE resource_locks ADD COLUMN sessionId VARCHAR(255)');
        } catch (e) { /* column likely exists */ }

        // Migration: Door Gift (Distributed Tracking v1.5.62)
        try {
            await pool.execute('ALTER TABLE employees ADD COLUMN door_gift_claimed BOOLEAN DEFAULT FALSE');
        } catch (e) {
            // column likely exists
        }

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS app_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        
        // 1.5.70: Prize Inventory & Lucky Draw Persistence
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS prizes (
                id VARCHAR(100) PRIMARY KEY,
                session INT DEFAULT 1,
                name VARCHAR(255) NOT NULL,
                quantity INT DEFAULT 1,
                prize_rank VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS lucky_draw_winners (
                id INT AUTO_INCREMENT PRIMARY KEY,
                prizeId VARCHAR(100) NOT NULL,
                empId VARCHAR(50) NOT NULL,
                is_claimed BOOLEAN DEFAULT FALSE,
                drawn_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                claimed_at TIMESTAMP NULL,
                FOREIGN KEY (prizeId) REFERENCES prizes(id) ON DELETE CASCADE,
                FOREIGN KEY (empId) REFERENCES employees(id) ON DELETE CASCADE
            )
        `);

        // 2. Voting & Feedback Tables
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS best_dress_nominations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category ENUM('male', 'female') NOT NULL,
                nominee_name VARCHAR(255) NOT NULL,
                nominee_emp_id VARCHAR(50) NOT NULL,
                submitter_device_id VARCHAR(255) NOT NULL,
                photo_path VARCHAR(500) NOT NULL,
                ai_score INT DEFAULT 0,
                ai_reasoning TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS voting_candidates (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(50) NOT NULL, -- 'performance', 'best_dress_male', 'best_dress_female'
                name VARCHAR(255) NOT NULL,
                department VARCHAR(255),
                photo_path VARCHAR(500),
                is_open BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS votes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                candidateId INT NOT NULL,
                empId VARCHAR(50) NOT NULL,
                category VARCHAR(50) NOT NULL,
                score INT DEFAULT 0,
                voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_vote (empId, category),
                FOREIGN KEY (candidateId) REFERENCES voting_candidates(id) ON DELETE CASCADE
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS feedback_questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question_text TEXT NOT NULL,
                question_type ENUM('rating', 'text', 'choice') NOT NULL DEFAULT 'rating',
                options TEXT,
                sort_order INT DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.execute(`
            CREATE TABLE IF NOT EXISTS feedback_responses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                questionId INT NOT NULL,
                empId VARCHAR(255) NOT NULL,
                response_value TEXT,
                submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY (questionId, empId),
                FOREIGN KEY (questionId) REFERENCES feedback_questions(id) ON DELETE CASCADE
            )
        `);



        // Ensure all tables support emojis (utf8mb4) before inserting data
        try {
            await pool.execute('SET FOREIGN_KEY_CHECKS=0');
            const tablesToConvert = [
                'employees', 'seats', 'admins',
                'tables_status', 'app_settings', 'best_dress_nominations', 'voting_candidates', 'votes', 'feedback_questions', 'feedback_responses'
            ];
            for (const tbl of tablesToConvert) {
                await pool.execute(`ALTER TABLE ${tbl} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            }
            await pool.execute('SET FOREIGN_KEY_CHECKS=1');
            console.log("[DB] Converted all tables to utf8mb4 to support emojis.");
        } catch (err) {
            console.warn("[DB] Warning: Could not convert tables to utf8mb4:", err.message);
            // Re-enable foreign key checks if it fails during the loop
            try { await pool.execute('SET FOREIGN_KEY_CHECKS=1'); } catch (e) {}
        }

        // 3. Default Data Initialization
        // Default Admin
        await pool.execute('INSERT IGNORE INTO admins (username, password, full_name, role) VALUES (?, ?, ?, ?)', 
            ['admin', 'password123', 'System Administrator', 'Super Admin']);

        // Default Prizes auto-initialization removed as requested to prevent dummy prizes from respawning.

        // Default Table Status (60 tables)
        const [tableRows] = await pool.execute('SELECT COUNT(*) as cnt FROM tables_status');
        if (tableRows[0].cnt < TOTAL_TABLES) {
            console.log(`[DB] Scaling tables_status to ${TOTAL_TABLES}...`);
            for (let i = 0; i < TOTAL_TABLES; i++) {
                await pool.execute('INSERT IGNORE INTO tables_status (tableIdx, status) VALUES (?, ?)', [i, 'Online']);
            }
        }

        // Default Settings
        const defaultSettings = [
            ['feature_seating', 'on'],
            ['feature_checkin', 'on'],
            ['event_timer', '2026-06-12T19:00:00']
        ];
        for (const [key, val] of defaultSettings) {
            await pool.execute('INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
        }





        console.log("[DB] Database initialization complete.");
    } catch (err) {
        console.error("[DB] Initialization error:", err);
        throw err; // Re-throw to prevent server startup on failure
    }
}

// Log all requests for diagnostics
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Status: ${res.statusCode} - Host: ${req.headers.host}`);
    });
    next();
});



const staticOptions = {
    maxAge: '0',
    etag: true
};
app.use('/IFX', express.static(publicPath, staticOptions));

app.use(express.static(publicPath, staticOptions));

// ===================== API ROUTER =====================
const apiRouter = express.Router();

let tableLocks = {}; // { tableIdx: { empId, expiresAt } }
let profileLocks = {}; // { empId: { deviceId, expiresAt } }

// SSE Client Registry
let clients = [];
function broadcast(type, data) {
    const payload = JSON.stringify({ type, data, ts: Date.now() });
    clients.forEach(c => c.res.write(`data: ${payload}\n\n`));
}

// Stale Lock Cleanup Task (Runs every 30 seconds)
setInterval(async () => {
    const now = Date.now();
    try {
        // 1. Find expired locks
        const [expired] = await pool.execute('SELECT lockKey FROM resource_locks WHERE expiresAt < ?', [now]);
        
        if (expired.length > 0) {
            console.log(`[DB] Auto-releasing ${expired.length} expired locks...`);
            
            // 2. Delete them
            await pool.execute('DELETE FROM resource_locks WHERE expiresAt < ?', [now]);
            
            // 3. Broadcast each release
            expired.forEach(lock => {
                let tIdx = undefined;
                let sIdx = undefined;
                
                if (lock.lockKey.includes('-')) {
                    const parts = lock.lockKey.split('-');
                    tIdx = parseInt(parts[0]);
                    sIdx = parseInt(parts[1]);
                } else {
                    tIdx = parseInt(lock.lockKey);
                }
                
                if (!isNaN(tIdx)) {
                    broadcast('lock_update', { tableIdx: tIdx, seatIdx: sIdx, lock: null });
                }
            });
            
            clearApiCache();
        }
    } catch (err) {
        console.error('[DB] Background lock cleanup failed:', err.message);
    }
}, 30000);

// SSE Endpoint for Live Updates
// --- PUBLIC EVENT APIs ---
apiRouter.get('/employees/search', async (req, res) => {
    try {
        const queryStr = (req.query.q || req.query.query || '').trim();
        if (!queryStr || queryStr.length < 1) return res.json([]);
        
        const [rows] = await pool.execute(
            `SELECT id, name, dept 
             FROM employees 
             WHERE name LIKE ? OR id LIKE ? 
             ORDER BY 
               CASE 
                 WHEN name = ? THEN 1 
                 WHEN name LIKE ? THEN 2 
                 WHEN id = ? THEN 3
                 ELSE 4 
               END, 
               name ASC 
             LIMIT 10`,
            [`%${queryStr}%`, `%${queryStr}%`, queryStr, `${queryStr}%`, queryStr]
        );
        res.json(rows);
    } catch (err) {
        console.error('Employee search err:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

apiRouter.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);

    // Keep connection alive with heartbeat
    const keepAlive = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => {
        clearInterval(keepAlive);
        clients = clients.filter(c => c.id !== clientId);
    });
});

// Diagnostic check
apiRouter.get('/diag/status', async (req, res) => {
    try {
        const [empCount] = await pool.execute('SELECT COUNT(*) as cnt FROM employees');
        res.json({
            status: 'ok',
            "version": "1.5.69",
            database: {
                connected: true,
                employees: empCount[0].cnt
            },
            timestamp: new Date()
        });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Health check
apiRouter.get('/health', async (req, res) => {
    try {
        await query('SELECT 1');
        res.json({ status: 'ok', message: 'Ready', timestamp: new Date() });
    } catch (err) {
        res.status(500).json({ status: 'error', error: err.message });
    }
});

// Initial data load
apiRouter.get('/data', async (req, res) => {
    const now = Date.now();
    // 1. Return cached response if valid (Lag prevention for 600+ users)
    if (apiDataCache && (now - apiDataCacheTime < CACHE_DURATION)) {
        return res.json(apiDataCache);
    }
    
    // 2. Request Coalescing: If a fetch is already in flight, wait for it
    if (pendingDataRequest) {
        try {
            const data = await pendingDataRequest;
            return res.json(data);
        } catch (err) {
            // If the pending request failed, we try again anyway below
        }
    }

    // 3. Start a new fetch cycle
    pendingDataRequest = (async () => {
        const fetchNow = Date.now();
    
    // Auto-cleanup expired locks in DB during fetch cycle
    await pool.execute(`DELETE FROM resource_locks WHERE expiresAt < ?`, [now]).catch(e => console.warn("[DB] Lock cleanup failed:", e.message));

    try {
        const rawEmployees = await query(`
            SELECT e.*, s.checkedIn as seatCheckedIn
            FROM employees e
            LEFT JOIN seats s ON s.assignedEmpId = e.id
        `);
        const employees = rawEmployees.map(e => {
            const emp = { ...e };
            emp.checked_in = (emp.checked_in === 1 || emp.seatCheckedIn === 1) ? 1 : 0;
            emp.door_gift_claimed = emp.door_gift_claimed === 1 ? 1 : 0;
            delete emp.seatCheckedIn;
            return emp;
        });

        // Optimization: Use Maps for O(1) lookup to handle 600+ users efficiently
        const empMap = new Map();
        employees.forEach(e => empMap.set(e.id, e));



        const seats = await query('SELECT * FROM seats WHERE assignedEmpId IS NOT NULL OR (pax_name IS NOT NULL AND pax_name != "")');
        const admins = await query('SELECT username, full_name, role, permissions FROM admins');
        const tablesStatus = await query('SELECT * FROM tables_status');

        // Fetch Distributed Locks (v1.5.62)
        const [lockRows] = await pool.execute('SELECT * FROM resource_locks WHERE expiresAt > ?', [now]);
        const dbTableLocks = {};
        const dbProfileLocks = {};
        const dbPaxLocks = {};

        lockRows.forEach(l => {
            if (l.lockKey.startsWith('pax-')) {
                dbPaxLocks[l.lockKey.replace('pax-', '')] = { lockerId: l.empId, expiresAt: l.expiresAt };
            } else if (l.lockKey.startsWith('profile-')) {
                dbProfileLocks[l.lockKey.replace('profile-', '')] = { deviceId: l.empId, expiresAt: l.expiresAt };

            } else if (l.lockKey.includes('-') || !isNaN(l.lockKey)) {
                // This handles 'tableIdx' or 'tableIdx-seatIdx'
                dbTableLocks[l.lockKey] = { empId: l.empId, expiresAt: l.expiresAt };
                console.log(`[Data] Categorized "${l.lockKey}" as Table Lock for ${l.empId}`);
            } else {
                // Fallback
                dbProfileLocks[l.lockKey] = { empId: l.empId, expiresAt: l.expiresAt };
            }
        });




        // Fetch summary metrics for dashboard (Gracefully handle if tables missing)


        let settingsMap = {
            feature_seating: 'on',
            feature_checkin: 'on',
            feature_seat_mode: 'on',
            feature_table_mode: 'on',
            event_timer: '2026-06-30T19:00'
        };
        try {
            const settings = await query('SELECT * FROM app_settings');
            settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);
        } catch (err) {
            console.warn('app_settings table not found or error fetching, using defaults:', err.message);
        }

        const tables = Array.from({ length: TOTAL_TABLES }, () => Array(SEATS_PER_TABLE).fill(null));

        for (const seat of seats) {
            const emp = empMap.get(seat.assignedEmpId);
            if (tables[seat.tableIdx] !== undefined) {
                tables[seat.tableIdx][seat.seatIdx] = {
                    empId: emp ? emp.id : (seat.assignedEmpId || null),
                    paxName: seat.pax_name || (emp ? emp.name : null),
                    name: emp ? emp.name : (seat.pax_name || null),
                    email: emp ? emp.email : null,
                    dept: emp ? emp.dept : null,
                    diet: (seat.diet || (emp ? emp.diet : null) || "").trim(),
                    checked_in: (emp && emp.checked_in === 1) || seat.checkedIn === 1
                };
            }
        }



        // Clean up expired locks in the result set
        for (const tidx in dbTableLocks) {
            if (dbTableLocks[tidx].expiresAt < now) {
                delete dbTableLocks[tidx];
            }
        }
        for (const eid in dbProfileLocks) {
            if (dbProfileLocks[eid].expiresAt < now) {
                delete dbProfileLocks[eid];
            }
        }


        const prizes = await query('SELECT * FROM prizes ORDER BY session ASC, CAST(prize_rank AS UNSIGNED) DESC');
        const winners = await query(`
            SELECT w.*, e.name as winnerName, e.dept as winnerDept, p.name as prizeName, p.prize_rank as prizeRank, p.session as session
            FROM lucky_draw_winners w
            JOIN employees e ON w.empId = e.id
            JOIN prizes p ON w.prizeId = p.id
            ORDER BY w.drawn_at DESC
        `);

        const responseData = { 
            employees, 
            admins, 
            tablesStatus, 
            settings: settingsMap, 
            tables, 
            tableLocks: dbTableLocks, 
            profileLocks: dbProfileLocks,
            paxLocks: dbPaxLocks,
            prizes,
            winners
        };
        
        // Update Cache
        apiDataCache = responseData;
        apiDataCacheTime = Date.now();
        return responseData;
    } catch (innerErr) {
        console.error('[DB] Load Error:', innerErr);
        throw innerErr;
    }
    })();

    try {
        const finalData = await pendingDataRequest;
        pendingDataRequest = null; // Clear pending promise
        res.json(finalData);
    } catch (err) {
        pendingDataRequest = null;
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Settings
apiRouter.get('/settings', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM app_settings');
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        res.json(settings);
    } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

apiRouter.post('/settings/update', async (req, res) => {
    clearApiCache();
    const { key, value } = req.body;
    console.log(`[API] Settings update requested: ${key} = ${value}`);
    try {
        await query('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?', [key, value, value]);
        const settingsRows = await query('SELECT * FROM app_settings');
        const updatedSettings = {};
        settingsRows.forEach(r => updatedSettings[r.setting_key] = r.setting_value);
        broadcast('settings_updated', { settings: updatedSettings });
        console.log(`[API] Settings updated successfully: ${key}`);
        res.json({ message: 'Setting updated' });
    } catch (err) { 
        console.error(`[API] Settings update error [${key}]:`, err.message);
        res.status(500).json({ error: 'Server error: ' + err.message }); 
    }
});

// Reservations





// [REMOVED REDUNDANT SEAT/MOVE]

// Check-in
apiRouter.post('/seat/checkin', async (req, res) => {
    clearApiCache();
    const { empId, undo } = req.body;
    try {
        if (typeof empId === 'string' && empId.startsWith('GUEST-')) {
            // Handle guest check-in via virtual ID: GUEST-TableNum-SeatNum
            const parts = empId.split('-');
            const tableIdx = parseInt(parts[1]) - 1;
            const seatIdx = parseInt(parts[2]) - 1;
            
            await query('UPDATE seats SET checkedIn = ? WHERE tableIdx = ? AND seatIdx = ?', [undo ? 0 : 1, tableIdx, seatIdx]);
        } else {
            // Standard employee check-in
            await query('UPDATE employees SET checked_in = ? WHERE id = ?', [undo ? 0 : 1, empId]);
            await query('UPDATE seats SET checkedIn = ? WHERE assignedEmpId = ?', [undo ? 0 : 1, empId]);
        }
        res.json({ success: true });
        
        // Trigger global data refresh via SSE (v1.5.62)
        broadcast('seating_update', { action: 'door_gift_claimed', empId });
    } catch (err) { 
        console.error('[Checkin] Error:', err);
        res.status(500).json({ error: err.message }); 
    }
});

apiRouter.post('/door-gift/claim', async (req, res) => {
    clearApiCache();
    const { empId, pin, undo = false } = req.body;
    try {

        // 2. Fetch Employee & Strict Check-in Rule (v1.5.32)
        const [emp] = await pool.execute('SELECT checked_in, name FROM employees WHERE id = ?', [empId]);
        if (!emp || emp.length === 0) return res.status(404).json({ error: 'Employee not found.' });

        if (!undo && !emp[0].checked_in) {
            return res.status(403).json({ error: `Please check in ${emp[0].name} first before claiming the door gift.` });
        }

        // 3. Update Claim Status
        await query('UPDATE employees SET door_gift_claimed = ? WHERE id = ?', [undo ? 0 : 1, empId]);
        res.json({ success: true, message: undo ? 'Claim revoked.' : 'Gift claimed successfully!' });
        
        // 4. Global Sync via SSE
        broadcast('seating_update', { action: 'door_gift_claimed', empId });
    } catch (err) { 
        console.error('[DoorGift] Error:', err);
        res.status(500).json({ error: err.message }); 
    }
});

/**
 * @api {post} /api/checkin/combined Combined Check-in & Door Gift Claim
 * @version 1.5.70
 * @description Fast-track entry: marks employee as checked-in AND door gift as claimed in one go.
 * No PIN required for this combined flow as requested.
 */
apiRouter.post('/checkin/combined', async (req, res) => {
    clearApiCache();
    const { empId } = req.body;
    
    if (!empId) return res.status(400).json({ error: 'Employee ID is required.' });

    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        let empName = 'Employee';

        if (typeof empId === 'string' && empId.startsWith('GUEST-')) {
            // Handle Guest Scan: GUEST-TableNum-SeatNum
            const parts = empId.split('-');
            const tableIdx = parseInt(parts[1]) - 1;
            const seatIdx = parseInt(parts[2]) - 1;
            
            // Mark seat as checked in
            const [updateSeat] = await conn.execute('UPDATE seats SET checkedIn = 1 WHERE tableIdx = ? AND seatIdx = ?', [tableIdx, seatIdx]);
            if (updateSeat.affectedRows === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'Invalid guest QR code or seat not found.' });
            }
            empName = `Guest at Table ${tableIdx + 1} Seat ${seatIdx + 1}`;
        } else {
            // Handle Standard Employee Scan
            const [emp] = await conn.execute('SELECT name FROM employees WHERE id = ?', [empId]);
            if (!emp || emp.length === 0) {
                await conn.rollback();
                return res.status(404).json({ error: 'Employee not found in database.' });
            }
            empName = emp[0].name;

            // 1. Update Employee Table (Attendance + Gift)
            await conn.execute('UPDATE employees SET checked_in = 1, door_gift_claimed = 1 WHERE id = ?', [empId]);
            
            // 2. Update Seats Table (Attendance)
            await conn.execute('UPDATE seats SET checkedIn = 1 WHERE assignedEmpId = ?', [empId]);
        }

        await conn.commit();
        
        // Broadcast both updates to all connected clients
        broadcast('seating_update', { action: 'combined_checkin', empId, name: empName });
        
        res.json({ 
            success: true, 
            message: `Successfully checked in ${empName} and marked door gift as claimed.`,
            name: empName
        });
    } catch (err) { 
        if (conn) await conn.rollback();
        console.error('[CombinedCheckin] Error:', err);
        res.status(500).json({ error: 'Failed to process combined check-in: ' + err.message }); 
    } finally {
        if (conn) conn.release();
    }
});


// [REMOVED REDUNDANT DOOR-GIFT/REVOKE]





// Employees
apiRouter.post('/employee/add', async (req, res) => {
    const { id, name, email, dept, diet } = req.body;
    try { await query('INSERT INTO employees (id, name, email, dept, diet) VALUES (?, ?, ?, ?, ?)', [id, name, email, dept, diet]); res.json({ success: true }); }
    catch (err) { if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Employee ID already exists.' }); res.status(500).json({ error: err.message }); }
});

apiRouter.post('/employee/update', async (req, res) => {
    clearApiCache();
    const { originalId, id, name, email, dept, diet } = req.body;
    try {
        await query('UPDATE employees SET id = ?, name = ?, email = ?, dept = ?, diet = ? WHERE id = ?', [id, name, email, dept, diet, originalId]);
        if (originalId !== id) await query('UPDATE seats SET assignedEmpId = ? WHERE assignedEmpId = ?', [id, originalId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/employee/delete', async (req, res) => {
    clearApiCache();
    const { id } = req.body;
    try {
        await query('UPDATE seats SET assignedEmpId = NULL, checkedIn = 0 WHERE assignedEmpId = ?', [id]);
        await query('DELETE FROM employees WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/employee/import', async (req, res) => {
    clearApiCache();
    const { employees } = req.body;
    let conn;
    try {
        conn = await pool.getConnection(); await conn.beginTransaction();
        let imported = 0;
        for (const emp of employees) { await conn.execute('INSERT IGNORE INTO employees (id, name, email, dept, diet) VALUES (?, ?, ?, ?, ?)', [emp.id, emp.name, emp.email, emp.dept, emp.diet]); imported++; }
        await conn.commit(); res.json({ success: true, imported });
    } catch (err) { if (conn) await conn.rollback(); console.error('Import error:', err); res.status(500).json({ error: 'Internal error.' }); }
    finally { if (conn) conn.release(); }
});

// Admins
apiRouter.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const rows = await query('SELECT username, full_name, role, permissions FROM admins WHERE username = ? AND password = ?', [username, password]);
        if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials.' });
        res.json({ 
            success: true, 
            username: rows[0].username, 
            fullName: rows[0].full_name, 
            role: rows[0].role,
            permissions: rows[0].permissions // Will be JSON string or null
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/add', async (req, res) => {
    const { username, password, fullName, role, permissions } = req.body; // permissions as JSON string
    try { 
        await query('INSERT INTO admins (username, password, full_name, role, permissions) VALUES (?, ?, ?, ?, ?)', [username, password, fullName, role, permissions]); 
        res.json({ success: true }); 
    }
    catch (err) { if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Admin username already exists.' }); res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/update', async (req, res) => {
    const { originalUsername, username, fullName, role, password, permissions } = req.body;
    try {
        if (password) {
            await query('UPDATE admins SET username = ?, full_name = ?, role = ?, password = ?, permissions = ? WHERE username = ?', [username, fullName, role, password, permissions, originalUsername]);
        } else {
            await query('UPDATE admins SET username = ?, full_name = ?, role = ?, permissions = ? WHERE username = ?', [username, fullName, role, permissions, originalUsername]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/delete', async (req, res) => {
    const { username } = req.body;
    try {
        const count = await query('SELECT COUNT(*) as cnt FROM admins');
        if (count[0].cnt <= 1) return res.status(400).json({ error: 'Cannot delete the last admin account.' });
        await query('DELETE FROM admins WHERE username = ?', [username]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CLOUD LOCKING SYSTEM (v1.5.62) ---
apiRouter.post('/table/lock', async (req, res) => {
    clearApiCache();
    const { tableIdx, seatIdx, empId } = req.body;
    const now = Date.now();
    const lockKey = (seatIdx !== undefined && seatIdx !== -1 && seatIdx !== null) ? `${tableIdx}-${seatIdx}` : `${tableIdx}`;
    
    // Convert to numbers for consistent broadcast
    const tIdx = parseInt(tableIdx);
    const sIdx = seatIdx !== undefined ? parseInt(seatIdx) : undefined;

    try {
        // 0. Check if table is Offline (Status: Reservation)
        const [statusRows] = await pool.execute('SELECT status FROM tables_status WHERE tableIdx = ?', [tIdx]);
        const isAdminRequest = req.body.isAdmin === true;
        if (!isAdminRequest && statusRows.length > 0 && statusRows[0].status === 'Reservation') {
            return res.status(403).json({ error: 'This table is currently reserved for offline booking.' });
        }

        // 1. Check if resource is already locked by someone else in DB
        const [existing] = await pool.execute('SELECT * FROM resource_locks WHERE lockKey = ? AND expiresAt > ?', [lockKey, now]);
        const { sessionId } = req.body;

        if (existing.length > 0) {
            const lock = existing[0];
            if (lock.empId !== empId) {
                return res.status(409).json({ error: 'This resource is currently being booked by another user.' });
            } else if (sessionId && lock.sessionId && lock.sessionId !== sessionId) {
                // If it's the SAME user but a DIFFERENT session (tab), block it.
                return res.status(409).json({ error: 'You have another booking session active in a different tab.' });
            }
        }

        // 1b. Check if CURRENT USER already has a seat or another lock (v1.5.92)
        if (!isAdminRequest) {
            const [seatCheck] = await pool.execute('SELECT tableIdx FROM seats WHERE assignedEmpId = ?', [empId]);
            if (seatCheck.length > 0) {
                return res.status(409).json({ error: 'You have already reserved a seat at Table ' + (seatCheck[0].tableIdx + 1) });
            }

            const [otherLocks] = await pool.execute(
                'SELECT lockKey, sessionId FROM resource_locks WHERE empId = ? AND lockKey != ? AND expiresAt > ? AND lockKey NOT LIKE "profile-%" AND lockKey NOT LIKE "pax-%"', 
                [empId, lockKey, now]
            );
            if (otherLocks.length > 0) {
                // Block if the user has an active lock in ANY other session
                if (sessionId && otherLocks.some(l => l.sessionId && l.sessionId !== sessionId)) {
                    return res.status(409).json({ error: 'You have another booking session active. Please complete or cancel it first.' });
                }
            }

        }



        // 2. Cross-check table vs seat locks
        if (seatIdx !== undefined) {
            const [tableCheck] = await pool.execute('SELECT * FROM resource_locks WHERE lockKey = ? AND expiresAt > ?', [`${tableIdx}`, now]);
            if (tableCheck.length > 0 && tableCheck[0].empId !== empId) {
                return res.status(409).json({ error: 'The entire table is currently being locked by another user.' });
            }
        } else {
            // Whole table lock: check if any seat is locked
            for (let i = 0; i < 11; i++) {
                const sKey = `${tableIdx}-${i}`;
                const [seatCheck] = await pool.execute('SELECT * FROM resource_locks WHERE lockKey = ? AND expiresAt > ?', [sKey, now]);
                if (seatCheck.length > 0 && seatCheck[0].empId !== empId) {
                    return res.status(409).json({ error: `Seat ${i + 1} at this table is currently being booked.` });
                }
            }
        }

        // 3. Persist Lock in DB (5 minute ttl as requested)
        const expiresAt = now + (5 * 60 * 1000);
        await pool.execute(
            'INSERT INTO resource_locks (lockKey, empId, sessionId, expiresAt) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE empId = ?, sessionId = ?, expiresAt = ?',
            [lockKey, empId, sessionId || null, expiresAt, empId, sessionId || null, expiresAt]
        );

        broadcast('lock_update', { tableIdx, seatIdx, lock: { empId, expiresAt } });
        res.json({ success: true, expiresAt });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/table/unlock', async (req, res) => {
    clearApiCache();
        const { tableIdx, seatIdx, empId, sessionId } = req.body;
        
        try {
            // ALWAYS clear by empId if provided (v1.7.10 (LEGACY-FIX) (LEGACY-FIX) - Global Cleanup)
            if (empId) {
                if (sessionId) {
                    // Specific cleanup: only clear locks for THIS tab
                    await pool.execute('DELETE FROM resource_locks WHERE empId = ? AND sessionId = ? AND lockKey NOT LIKE "profile-%"', [empId, sessionId]);
                } else {
                    // Global cleanup: clear ALL locks for this user (e.g. on logout)
                    await pool.execute('DELETE FROM resource_locks WHERE empId = ? AND lockKey NOT LIKE "profile-%"', [empId]);
                }
            }

        if (tableIdx !== undefined) {
            const lockKey = (seatIdx !== undefined && seatIdx !== -1 && seatIdx !== null) ? `${tableIdx}-${seatIdx}` : `${tableIdx}`;
            await pool.execute('DELETE FROM resource_locks WHERE lockKey = ?', [lockKey]);
            broadcast('lock_update', { tableIdx: parseInt(tableIdx), seatIdx: (seatIdx !== undefined ? parseInt(seatIdx) : undefined), lock: null });
        } else {
            // If no specific table, broadcast a generic lock refresh to all clients
            broadcast('lock_update', { action: 'refresh_all' });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


apiRouter.post('/profile/lock', async (req, res) => {
    clearApiCache();
    const { empId, sessionId } = req.body;
    const now = Date.now();
    const lockHandle = `profile-${empId}`;
    const expiresAt = now + (5 * 60 * 1000);
    
    try {
        const [existing] = await pool.execute('SELECT * FROM resource_locks WHERE lockKey = ? AND expiresAt > ?', [lockHandle, now]);
        // Note: l.sessionId stores the session identifier for profiles
        if (existing.length > 0 && existing[0].sessionId !== sessionId) {
            return res.status(409).json({ error: 'This profile is currently being used in another tab or device.' });
        }

        await pool.execute(
            'INSERT INTO resource_locks (lockKey, sessionId, expiresAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE sessionId = ?, expiresAt = ?',
            [lockHandle, sessionId, expiresAt, sessionId, expiresAt]
        );

        broadcast('profile_lock_update', { empId, lock: { sessionId, expiresAt } });
        res.json({ success: true, expiresAt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/profile/unlock', async (req, res) => {
    clearApiCache();
    const { empId, sessionId } = req.body;
    const lockHandle = `profile-${empId}`;
    try {
        await pool.execute('DELETE FROM resource_locks WHERE lockKey = ? AND sessionId = ?', [lockHandle, sessionId]);
        broadcast('profile_lock_update', { empId, lock: null });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PAX (Employee) Booking Locks (v1.5.92)
apiRouter.post('/pax/lock', async (req, res) => {
    clearApiCache();
    const { empId, lockerId } = req.body; // lockerId is the empId of the person booking
    const now = Date.now();
    const lockHandle = `pax-${empId}`;
    const expiresAt = now + (10 * 60 * 1000); // Match 10 min reservation timer
    
    try {
        // 1. Check if employee is ALREADY seated (v1.7.10 (LEGACY-FIX) (LEGACY-FIX) (LEGACY-FIX))
        const [seated] = await pool.execute('SELECT tableIdx FROM seats WHERE assignedEmpId = ?', [empId]);
        if (seated.length > 0) {
            return res.status(409).json({ error: 'This employee is already reserved at Table ' + (seated[0].tableIdx + 1) });
        }

        // 2. Check if already locked by another user
        const [existing] = await pool.execute('SELECT * FROM resource_locks WHERE lockKey = ? AND expiresAt > ?', [lockHandle, now]);
        if (existing.length > 0 && existing[0].empId !== lockerId) {
            return res.status(409).json({ error: 'This employee is already being selected by another user.' });
        }

        await pool.execute(
            'INSERT INTO resource_locks (lockKey, empId, expiresAt) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE empId = ?, expiresAt = ?',
            [lockHandle, lockerId, expiresAt, lockerId, expiresAt]
        );

        broadcast('pax_lock_update', { empId, lock: { lockerId, expiresAt } });
        res.json({ success: true, expiresAt });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/pax/unlock', async (req, res) => {
    clearApiCache();
    const { empId } = req.body;
    const lockHandle = `pax-${empId}`;
    try {
        await pool.execute('DELETE FROM resource_locks WHERE lockKey = ?', [lockHandle]);
        broadcast('pax_lock_update', { empId, lock: null });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/table/toggle-status', async (req, res) => {
    let { tableIdx, status } = req.body;
    tableIdx = parseInt(tableIdx);
    try {
        await query('INSERT INTO tables_status (tableIdx, status) VALUES (?, ?) ON DUPLICATE KEY UPDATE status = ?', [tableIdx, status, status]);
        broadcast('seating_update', { action: 'table_status', tableIdx, status });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/table/cancel', async (req, res) => {
    clearApiCache();
    const { tableIdx, empId } = req.body;
    try {
        // Only the booker or an admin should be able to cancel
        // For simplicity, we check if the empId is assigned to any seat in this table
        const seats = await query('SELECT * FROM seats WHERE tableIdx = ? AND assignedEmpId = ?', [tableIdx, empId]);
        if (seats.length === 0) {
            return res.status(403).json({ error: 'You do not have a reservation at this table.' });
        }

        // Clear all seats at this table
        await query('DELETE FROM seats WHERE tableIdx = ?', [tableIdx]);
        // Success
        delete tableLocks[tableIdx];
        broadcast('seating_update', { action: 'table_cancel', tableIdx });
        broadcast('lock_update', { tableIdx, lock: null });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/table/reserve', async (req, res) => {
    clearApiCache();
    const { tableIdx, primaryEmpId, paxNames, paxEmpIds, paxDiets } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        console.log(`[ReserveTable] Started for tableIdx=${tableIdx}, primaryEmpId=${primaryEmpId}`);

        // 0. Check Table Status (Respect Offline/Reservation mode)
        const [statusRows] = await conn.execute('SELECT status FROM tables_status WHERE tableIdx = ?', [tableIdx]);
        const isAdminRequest = req.body.isAdmin === true;
        if (!isAdminRequest && statusRows.length > 0 && statusRows[0].status === 'Reservation') {
            await conn.rollback();
            return res.status(403).json({ error: 'This table is currently set to reservation mode.' });
        }

        // 1. Check if table is already taken
        const [existing] = await conn.execute('SELECT assignedEmpId FROM seats WHERE tableIdx = ? AND assignedEmpId IS NOT NULL', [tableIdx]);
        if (existing.length > 0) {
            await conn.rollback();
            return res.status(409).json({ error: 'This table is already reserved.' });
        }

        // 2. Check if primary employee already has a seat
        // 1. Validate that EVERY employee in the list is not already seated (v1.5.95)
        const allEmpIds = paxEmpIds.filter(id => id !== null);
        if (allEmpIds.length > 0) {
            // Use placeholders for the IN clause
            const placeholders = allEmpIds.map(() => '?').join(',');
            const [alreadySeated] = await conn.execute(
                `SELECT s.assignedEmpId, s.tableIdx, e.name 
                 FROM seats s
                 JOIN employees e ON s.assignedEmpId = e.id
                 WHERE s.assignedEmpId IN (${placeholders})`,
                allEmpIds
            );

            if (alreadySeated.length > 0) {
                await conn.rollback();
                const conflict = alreadySeated[0];
                return res.status(409).json({ 
                    error: `Double booking detected: "${conflict.name}" (${conflict.assignedEmpId}) is already seated at Table ${conflict.tableIdx + 1}.` 
                });
            }
        }


        // 3. Batch reserve all 11 seats
        for (let i = 0; i < 11; i++) {
            const paxName = paxNames[i] || `Employee ${i + 1}`;
            const empIdForSeat = paxEmpIds ? (paxEmpIds[i] || null) : (i === 0 ? primaryEmpId : null);
            const dietForSeat = paxDiets ? (paxDiets[i] || 'Normal') : 'Normal';
            
            await conn.execute(
                `INSERT INTO seats (tableIdx, seatIdx, assignedEmpId, pax_name, diet, checkedIn) 
                 VALUES (?, ?, ?, ?, ?, 0) 
                 ON DUPLICATE KEY UPDATE assignedEmpId = ?, pax_name = ?, diet = ?, checkedIn = 0`,
                [tableIdx, i, empIdForSeat, paxName, dietForSeat, empIdForSeat, paxName, dietForSeat]
            );
        }

        console.log(`[ReserveTable] Successfully updated 11 seats (Strict Mode) for tableIdx=${tableIdx}. Committing...`);
        await conn.commit();
        
        // Clear both the table-level lock and ALL individual seat locks for this table
        await pool.execute('DELETE FROM resource_locks WHERE lockKey = ? OR lockKey LIKE ?', [String(tableIdx), `${tableIdx}-%`]);
        
        broadcast('lock_update', { tableIdx, lock: null });
        broadcast('seating_update', { action: 'table_reserve', tableIdx, primaryEmpId });
        res.json({ success: true });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('[ReserveTable] CRITICAL FAILURE:', err);
        res.status(500).json({ error: `Table reservation failed: ${err.message}` });
    } finally {
        if (conn) conn.release();
    }
});

apiRouter.post('/admin/table/assign', async (req, res) => {
    const { tableIdx, paxData } = req.body; 
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Validation: Check if any of these employees are already seated elsewhere
        const allEmpIds = paxData.map(p => p.empId).filter(id => id !== null);
        if (allEmpIds.length > 0) {
            const placeholders = allEmpIds.map(() => '?').join(',');
            const [alreadySeated] = await conn.execute(
                `SELECT s.assignedEmpId, s.tableIdx, e.name 
                 FROM seats s
                 JOIN employees e ON s.assignedEmpId = e.id
                 WHERE s.assignedEmpId IN (${placeholders}) AND s.tableIdx != ?`,
                [...allEmpIds, tableIdx]
            );

            if (alreadySeated.length > 0) {
                await conn.rollback();
                const conflict = alreadySeated[0];
                return res.status(409).json({ 
                    error: `Double booking detected: "${conflict.name}" (${conflict.assignedEmpId}) is already seated at Table ${conflict.tableIdx + 1}.` 
                });
            }
        }

        for (let pax of paxData) {
            // If both name and empId are empty, we might want to unassign (handled by nulls)
            const finalName = pax.name || null;
            const finalEmpId = pax.empId || null;
            
            await conn.execute(
                `INSERT INTO seats (tableIdx, seatIdx, assignedEmpId, pax_name) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE assignedEmpId = ?, pax_name = ?`,
                [tableIdx, pax.seatIdx, finalEmpId, finalName, finalEmpId, finalName]
            );
        }

        await conn.commit();
        broadcast('seating_update', { action: 'admin_batch_assign', tableIdx });
        res.json({ success: true });
    } catch (err) {
        if (conn) await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (conn) conn.release();
    }
});

apiRouter.post('/seat/reserve', async (req, res) => {
    clearApiCache();
    const { tableIdx, seatIdx, empId, paxName } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // 0. Check Table Status
        const [statusRows] = await conn.execute('SELECT status FROM tables_status WHERE tableIdx = ?', [tableIdx]);
        const isAdminRequest = req.body.isAdmin === true;
        if (!isAdminRequest && statusRows.length > 0 && statusRows[0].status === 'Reservation') {
            await conn.rollback();
            return res.status(403).json({ error: 'This table is currently set to reservation mode.' });
        }

        // 1. Check if seat is already taken
        const [existing] = await conn.execute('SELECT assignedEmpId FROM seats WHERE tableIdx = ? AND seatIdx = ? AND assignedEmpId IS NOT NULL', [tableIdx, seatIdx]);
        if (existing.length > 0) {
            await conn.rollback();
            return res.status(409).json({ error: 'This seat is already reserved.' });
        }

        // 2. Check if employee already has a seat
        // 1. Validate that the employee is not already seated (v1.5.95)
        const [empCheck] = await conn.execute('SELECT tableIdx, s.pax_name FROM seats s WHERE assignedEmpId = ?', [empId]);
        if (empCheck.length > 0) {
            await conn.rollback();
            return res.status(409).json({ error: `Double booking: ${empCheck[0].pax_name} is already seated at Table ${empCheck[0].tableIdx + 1}.` });
        }


        // 3. Reserve the seat
        await conn.execute(
            `INSERT INTO seats (tableIdx, seatIdx, assignedEmpId, pax_name, diet, checkedIn) 
             VALUES (?, ?, ?, ?, ?, 0) 
             ON DUPLICATE KEY UPDATE assignedEmpId = ?, pax_name = ?, diet = ?, checkedIn = 0`,
            [tableIdx, seatIdx, empId, paxName, req.body.diet || null, empId, paxName, req.body.diet || null]
        );

        await conn.commit();
        const lockKey = `${tableIdx}-${seatIdx}`;
        
        // Clear the specific seat lock from Database
        await pool.execute('DELETE FROM resource_locks WHERE lockKey = ?', [lockKey]);


        broadcast('lock_update', { tableIdx, seatIdx, lock: null });
        broadcast('seating_update', { action: 'seat_reserve', tableIdx, seatIdx, empId, diet: req.body.diet });
        res.json({ success: true });
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('Seat reservation error:', err);
        res.status(500).json({ error: 'Failed to reserve seat.' });
    } finally {
        if (conn) conn.release();
    }
});

// Cancel/Release own seat (For Employees)
apiRouter.post('/seat/cancel-own', async (req, res) => {
    clearApiCache();
    const { tableIdx, seatIdx, empId } = req.body;
    try {
        const [existing] = await pool.execute('SELECT * FROM seats WHERE tableIdx = ? AND seatIdx = ? AND assignedEmpId = ?', [tableIdx, seatIdx, empId]);
        if (existing.length === 0) return res.status(403).json({ error: 'Not your seat.' });

        await query('DELETE FROM seats WHERE tableIdx = ? AND seatIdx = ?', [tableIdx, seatIdx]);
        const lockKey = `${tableIdx}-${seatIdx}`;
        await pool.execute('DELETE FROM resource_locks WHERE lockKey = ? OR lockKey = ?', [lockKey, String(tableIdx)]);
        
        broadcast('seating_update', { action: 'seat_remove', tableIdx: parseInt(tableIdx), seatIdx: parseInt(seatIdx) });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Move an employee's seat (For Admins)
apiRouter.post('/seat/move', async (req, res) => {
    clearApiCache();
    const { empId, newTableIdx, newSeatIdx, isAdmin } = req.body;
    let conn;
    try {
        conn = await pool.getConnection();
        await conn.beginTransaction();

        // Check if destination is taken
        const [existing] = await conn.execute('SELECT assignedEmpId FROM seats WHERE tableIdx = ? AND seatIdx = ? AND assignedEmpId IS NOT NULL', [newTableIdx, newSeatIdx]);
        if (existing.length > 0) {
             await conn.rollback();
             return res.status(409).json({ error: 'Destination seat is already taken.' });
        }
        
        const [empCheck] = await conn.execute('SELECT name, diet FROM employees WHERE id = ?', [empId]);
        if(empCheck.length === 0) {
             await conn.rollback();
             return res.status(404).json({ error: 'Employee not found.' });
        }

        // Delete old seat
        await conn.execute('DELETE FROM seats WHERE assignedEmpId = ?', [empId]);
        
        // Insert new seat
        await conn.execute(
            `INSERT INTO seats (tableIdx, seatIdx, assignedEmpId, pax_name, diet, checkedIn) 
             VALUES (?, ?, ?, ?, ?, 0)`,
            [newTableIdx, newSeatIdx, empId, empCheck[0].name, empCheck[0].diet || null]
        );
        
        // Clear global lock for simplicity
        await pool.execute('DELETE FROM resource_locks WHERE empId = ?', [empId]);
        
        await conn.commit();
        broadcast('seating_update', { action: 'seat_move', tableIdx: newTableIdx, seatIdx: newSeatIdx, empId });
        res.json({ success: true });
    } catch(err) {
        if(conn) await conn.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if(conn) conn.release();
    }
});

// Unassign a specific seat (used by Admins)
apiRouter.post('/seat/remove', async (req, res) => {
    clearApiCache();
    const { tableIdx, seatIdx } = req.body;
    try {
        // DELETE ensures both assignedEmpId AND pax_name are cleared
        await query('DELETE FROM seats WHERE tableIdx = ? AND seatIdx = ?', [tableIdx, seatIdx]);
        
        // Also clear any lingering locks for this specific seat or table
        const lockKey = `${tableIdx}-${seatIdx}`;
        await pool.execute('DELETE FROM resource_locks WHERE lockKey = ? OR lockKey = ?', [lockKey, String(tableIdx)]);
        
        broadcast('seating_update', { action: 'seat_remove', tableIdx: parseInt(tableIdx), seatIdx: parseInt(seatIdx) });
        res.json({ success: true });
    } catch (err) {
        console.error('Seat removal error:', err);
        res.status(500).json({ error: 'Failed to unassign seat.' });
    }
});
// Door gift claim revocation (Admin)
apiRouter.post('/door-gift/revoke', async (req, res) => {
    const { empId, pin } = req.body;
    try {
        const [settings] = await pool.execute('SELECT setting_value FROM settings WHERE setting_key = "admin_pin"');
        const correctPin = settings[0]?.setting_value || '1234';
        if (pin !== correctPin) return res.status(401).json({ error: 'Invalid PIN.' });
        await query('UPDATE employees SET door_gift_claimed = 0 WHERE id = ?', [empId]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Feedback
apiRouter.post('/feedback/submit', async (req, res) => {
    const { empId, satisfaction, expectations, attend_again, food_tasty, favorite_experience, comments } = req.body;
    try {
        await query(`INSERT INTO feedback (empId, satisfaction, expectations, attend_again, food_tasty, favorite_experience, comments) VALUES (?, ?, ?, ?, ?, ?, ?)`, [empId, satisfaction, expectations, attend_again, food_tasty, favorite_experience, comments]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/feedback/export', async (req, res) => {
    try {
        const rows = await query('SELECT * FROM feedback ORDER BY created_at DESC');
        let csv = 'ID,Employee ID,Satisfaction,Expectations,Attend Again,Food Tasty,Favorite Experience,Comments,Created At\n';
        rows.forEach(r => {
            csv += `${r.id},${r.empId},${r.satisfaction},${r.expectations},${r.attend_again},${r.food_tasty},"${(r.favorite_experience || '').replace(/"/g, '""')}","${(r.comments || '').replace(/"/g, '""')}",${r.created_at}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=event_feedback_2026.csv');
        res.send(csv);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Lucky Draw
apiRouter.post('/luckydraw/roll', async (req, res) => {
    clearApiCache();
    const { session, count = 1 } = req.body;
    let conn;
    try {
        conn = await pool.getConnection(); await conn.beginTransaction();
        const winners = [];
        for (let i = 0; i < count; i++) {
            const [prizes] = await conn.execute(`SELECT p.id, p.name, p.prize_rank FROM prizes p WHERE p.session = ? AND (SELECT COUNT(*) FROM lucky_draw_winners w WHERE w.prizeId = p.id) < p.quantity ORDER BY CAST(p.prize_rank AS UNSIGNED) DESC, p.prize_rank DESC LIMIT 1`, [session]);
            if (prizes.length === 0) break;
            const activePrize = prizes[0];
            let querySql = `SELECT e.id as assignedEmpId FROM employees e LEFT JOIN seats s ON s.assignedEmpId = e.id WHERE (e.checked_in = 1 OR s.checkedIn = 1) AND e.id NOT IN (SELECT empId FROM lucky_draw_winners)`;
            let queryParams = [];
            if (winners.length > 0) { querySql += ` AND e.id NOT IN (?)`; queryParams.push(winners.map(w => w.winner.id)); }
            const [eligible] = await conn.query(querySql, queryParams);
            if (eligible.length === 0) break;
            const winnerEmpId = eligible[Math.floor(Math.random() * eligible.length)].assignedEmpId;
            const drawTime = new Date();
            await conn.execute('INSERT INTO lucky_draw_winners (prizeId, empId, is_claimed, drawn_at) VALUES (?, ?, 0, ?)', [activePrize.id, winnerEmpId, drawTime]);
            const [empRows] = await conn.execute('SELECT * FROM employees WHERE id = ?', [winnerEmpId]);
            winners.push({ winner: empRows[0], prizeId: activePrize.id, prizeName: activePrize.name, prizeRank: activePrize.prize_rank, drawn_at: drawTime });
        }
        await conn.commit();
        broadcast('luckydraw_update', { winners });
        res.json({ success: true, winners });
    } catch (err) { if (conn) await conn.rollback(); res.status(500).json({ error: err.message }); } finally { if (conn) conn.release(); }
});

apiRouter.post('/luckydraw/claim', async (req, res) => {
    clearApiCache();
    const { prizeId, empId, isClaimed } = req.body;
    try {
        await query('UPDATE lucky_draw_winners SET is_claimed = ?, claimed_at = ? WHERE prizeId = ? AND empId = ?', [isClaimed ? 1 : 0, isClaimed ? new Date() : null, prizeId, empId]);
        broadcast('luckydraw_update', { action: 'claim', prizeId, empId, isClaimed });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/luckydraw/reset', async (req, res) => {
    clearApiCache();
    try { await query('DELETE FROM lucky_draw_winners'); broadcast('luckydraw_update', { action: 'reset_all' }); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/luckydraw/reset-session', async (req, res) => {
    const { session } = req.body;
    try {
        await query(`DELETE FROM lucky_draw_winners WHERE prizeId IN (SELECT id FROM prizes WHERE session = ?)`, [session]);
        broadcast('luckydraw_update', { action: 'reset_session', session });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/luckydraw/revoke', async (req, res) => {
    const { prizeId, empId } = req.body;
    try {
        await query('DELETE FROM lucky_draw_winners WHERE prizeId = ? AND empId = ?', [prizeId, empId]);
        clearApiCache();
        broadcast('luckydraw_update', { action: 'revoke', prizeId, empId });
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/prize/add', async (req, res) => {
    const { id, session, name, quantity, prize_rank } = req.body;
    try { await query('INSERT INTO prizes (id, session, name, quantity, prize_rank) VALUES (?, ?, ?, ?, ?)', [id, session, name, quantity, prize_rank]); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/prize/update', async (req, res) => {
    const { id, session, name, quantity, prize_rank } = req.body;
    try {
        await pool.execute('UPDATE prizes SET session = ?, name = ?, quantity = ?, prize_rank = ? WHERE id = ?', [session, name, quantity, prize_rank, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/prize/delete', async (req, res) => {
    clearApiCache();
    const { id } = req.body;
    try { await query('DELETE FROM prizes WHERE id = ?', [id]); res.json({ success: true }); }
    catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/prize/import', async (req, res) => {
    clearApiCache();
    const { prizes } = req.body;
    let conn;
    try {
        conn = await pool.getConnection(); await conn.beginTransaction();
        for (const p of prizes) { await conn.execute('INSERT IGNORE INTO prizes (id, session, name, quantity, prize_rank) VALUES (?, ?, ?, ?, ?)', [p.id, p.session, p.name, p.quantity, p.prize_rank]); }
        await conn.commit(); res.json({ success: true });
    } catch (err) { if (conn) await conn.rollback(); res.status(500).json({ error: err.message }); }
    finally { if (conn) conn.release(); }
});

// --- Voting & Nomination Endpoints ---

apiRouter.post('/nominations/submit', upload.single('photo'), async (req, res) => {
    try {
        const { category, nominee_name, nominee_emp_id, submitter_device_id } = req.body;
        if (!req.file) return res.status(400).json({ error: 'Photo is required' });
        
        const photo_path = `/uploads/nominations/${req.file.filename}`;
        
        await pool.execute(
            'INSERT INTO best_dress_nominations (category, nominee_name, nominee_emp_id, submitter_device_id, photo_path) VALUES (?, ?, ?, ?, ?)',
            [category, nominee_name, nominee_emp_id, submitter_device_id, photo_path]
        );
        
        res.json({ success: true, photo_path });
    } catch (err) {
        console.error('Nomination submit error:', err);
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/nominations/list', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT b.*, e.dept 
            FROM best_dress_nominations b 
            LEFT JOIN employees e ON b.nominee_emp_id = e.id 
            ORDER BY b.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/nominations/ai-rank', async (req, res) => {
    try {
        const [unranked] = await pool.execute('SELECT * FROM best_dress_nominations WHERE ai_score = 0 LIMIT 5');
        if (unranked.length === 0) return res.json({ success: true, message: 'All nominations ranked.' });

        let processed = 0;
        for (const nom of unranked) {
            try {
                const imgPath = path.join(__dirname, 'public', nom.photo_path);
                if (!fs.existsSync(imgPath)) continue;

                const imgData = fs.readFileSync(imgPath);
                const imagePart = {
                    inlineData: {
                        data: imgData.toString("base64"),
                        mimeType: "image/jpeg",
                    },
                };

                const prompt = "You are an AI Fashion Judge for a company dinner. Evaluate this outfit. Give a score from 1-100 and a 1-sentence reasoning. Return ONLY JSON like {\"score\": 85, \"reasoning\": \"Great use of accessories.\"}";
                
                const result = await genModel.generateContent([prompt, imagePart]);
                const responseText = result.response.text();
                const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
                
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    await pool.execute('UPDATE best_dress_nominations SET ai_score = ?, ai_reasoning = ? WHERE id = ?', [parsed.score, parsed.reasoning, nom.id]);
                    processed++;
                }
            } catch (aiErr) {
                console.error('AI Processing error for ID', nom.id, aiErr);
            }
        }
        res.json({ success: true, message: `Processed ${processed} nominations.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/admin/nominations/promote', async (req, res) => {
    try {
        // Promote Top 3 Males and Top 3 Females
        const [males] = await pool.execute('SELECT * FROM best_dress_nominations WHERE category = ? ORDER BY ai_score DESC LIMIT 3', ['male']);
        const [females] = await pool.execute('SELECT * FROM best_dress_nominations WHERE category = ? ORDER BY ai_score DESC LIMIT 3', ['female']);
        
        for (const m of males) {
            await pool.execute('INSERT IGNORE INTO voting_candidates (category, name, department, photo_path) VALUES (?, ?, ?, ?)', 
                ['best_dress_male', m.nominee_name, m.nominee_emp_id, m.photo_path]);
        }
        for (const f of females) {
            await pool.execute('INSERT IGNORE INTO voting_candidates (category, name, department, photo_path) VALUES (?, ?, ?, ?)', 
                ['best_dress_female', f.nominee_name, f.nominee_emp_id, f.photo_path]);
        }
        res.json({ success: true, promoted: males.length + females.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/voting/candidates', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM voting_candidates');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.post('/voting/vote', async (req, res) => {
    const { empId, candidateId, category, score } = req.body;
    try {
        await pool.execute('INSERT INTO votes (candidateId, empId, category, score) VALUES (?, ?, ?, ?)', 
            [candidateId, empId, category, score || 0]);
        res.json({ success: true });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'You have already voted in this category.' });
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/voting/results', async (req, res) => {
    try {
        const [candidates] = await pool.execute('SELECT * FROM voting_candidates');
        const [votes] = await pool.execute('SELECT candidateId, COUNT(*) as vote_count, SUM(score) as total_score FROM votes GROUP BY candidateId');
        
        const results = candidates.map(c => {
            const v = votes.find(vote => vote.candidateId === c.id) || { vote_count: 0, total_score: 0 };
            return { ...c, vote_count: v.vote_count, total_score: v.total_score };
        });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/admin/export/voting', async (req, res) => {
    try {
        const [votes] = await pool.execute(`
            SELECT v.category, vc.name as candidate_name, v.empId, v.score, v.voted_at 
            FROM votes v 
            JOIN voting_candidates vc ON v.candidateId = vc.id
        `);
        let csv = 'Category,Candidate,Voter ID,Score,Time\n';
        votes.forEach(v => {
            csv += `${v.category},"${v.candidate_name}",${v.empId},${v.score},${v.voted_at}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=voting_results.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

apiRouter.get('/feedback/questions', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM feedback_questions WHERE is_active = 1 ORDER BY sort_order ASC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/feedback/submit', async (req, res) => {
    const { empId, responses } = req.body;
    try {
        for (const r of responses) {
            await pool.execute('INSERT INTO feedback_responses (questionId, empId, response_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE response_value = ?', 
                [r.questionId, empId, r.value, r.value]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/admin/feedback/results', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT r.*, q.question_text, q.question_type 
            FROM feedback_responses r 
            JOIN feedback_questions q ON r.questionId = q.id
        `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/admin/export/feedback_dynamic', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT r.empId, q.question_text, r.response_value, r.submitted_at 
            FROM feedback_responses r 
            JOIN feedback_questions q ON r.questionId = q.id
            ORDER BY r.empId, q.sort_order
        `);
        let csv = 'Employee ID,Question,Response,Time\n';
        rows.forEach(r => {
            csv += `"${r.empId}","${r.question_text}","${r.response_value}",${r.submitted_at}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=feedback_results.csv');
        res.send(csv);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/feedback/questions/add', async (req, res) => {
    const { question_text, question_type, options, sort_order } = req.body;
    try {
        await pool.execute('INSERT INTO feedback_questions (question_text, question_type, options, sort_order) VALUES (?, ?, ?, ?)', 
            [question_text, question_type, options, sort_order]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/admin/feedback/questions/delete', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.execute('DELETE FROM feedback_questions WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MODERN DASHBOARD API HANDLERS ---

apiRouter.get('/employees', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM employees');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/prizes', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM prizes ORDER BY CAST(prize_rank AS UNSIGNED) DESC, prize_rank DESC');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/performance/results', async (req, res) => {
    try {
        // Mocking/Stubbing for now to match frontend expectation
        const [rows] = await pool.execute('SELECT * FROM performance_participants');
        res.json(rows.map(r => ({ ...r, guest_portion: 0, manual_score: 0, total: 0, vote_count: 0 })));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/performance/criteria', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM performance_criteria');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/performance/participants', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM performance_participants');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/performance/status', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT setting_value FROM app_settings WHERE setting_key = "performance_voting_status"');
        res.json({ voting_status: rows[0]?.setting_value || 'CLOSED' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/best-dress/status', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT setting_value FROM app_settings WHERE setting_key = "best_dress_status"');
        res.json({ best_dress_status: rows[0]?.setting_value || 'CLOSED' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/best-dress/nominees', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM voting_candidates');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.get('/best-dress/submissions', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM best_dress_nominations');
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LUCKY DRAW ALIASES FOR MODERN DASHBOARD ---
apiRouter.post('/draw', async (req, res) => {
    // Alias to /luckydraw/roll
    const { prizeId } = req.body;
    try {
        const [prizes] = await pool.execute('SELECT * FROM prizes WHERE id = ?', [prizeId]);
        if (prizes.length === 0) return res.status(404).json({ error: 'Prize not found' });
        const p = prizes[0];
        const [eligible] = await pool.execute('SELECT id FROM employees WHERE checked_in = 1 AND won_prize IS NULL');
        if (eligible.length === 0) return res.status(404).json({ error: 'No eligible winners' });
        const winnerId = eligible[Math.floor(Math.random() * eligible.length)].id;
        await pool.execute('UPDATE employees SET won_prize = ? WHERE id = ?', [p.name, winnerId]);
        const [winner] = await pool.execute('SELECT * FROM employees WHERE id = ?', [winnerId]);
        res.json({ winner: winner[0], prize: p });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/draw/publish', async (req, res) => {
    res.json({ success: true }); // Mocked for now
});

apiRouter.post('/draw/session-reset', async (req, res) => {
    const { session } = req.body;
    try {
        await pool.execute('UPDATE employees SET won_prize = NULL WHERE won_prize IN (SELECT name FROM prizes WHERE session = ?)', [session]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/best-dress/status', async (req, res) => {
    const { status } = req.body;
    try {
        await pool.execute('INSERT INTO app_settings (setting_key, setting_value) VALUES ("best_dress_status", ?) ON DUPLICATE KEY UPDATE setting_value = ?', ["best_dress_status", status, status]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.post('/best-dress/ai-rank', async (req, res) => {
    // Already implemented as /nominations/ai-rank, but we'll add an alias or direct implementation here
    // Redirecting to existing logic for consistency
    return res.redirect(307, '/api/nominations/ai-rank');
});

apiRouter.post('/best-dress/nominees', async (req, res) => {
    const { name } = req.body;
    try {
        await pool.execute('INSERT INTO voting_candidates (name, category) VALUES (?, "manual")', [name]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/best-dress/nominees/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM voting_candidates WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

apiRouter.delete('/best-dress/submissions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.execute('DELETE FROM best_dress_nominations WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});



// Mount the router on /api, /IFX/api, and /luckydraw/api

app.use('/IFX/api', apiRouter);
app.use('/api', apiRouter);
app.use('/luckydraw/api', apiRouter);
app.use('/bestdress/api', apiRouter);

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        version: 'v1.7.17 (API-RESTORE)',
        publicPath,
        dirname: __dirname,
        cwd: process.cwd()
    });
});




// Serve static files for /luckydraw subdirectory
app.use('/luckydraw', express.static(publicPath));
app.use('/bestdress', express.static(publicPath));




// Fallback: serve index.html for all non-API routes (SPA support)
app.get('/IFX/*', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); res.sendFile(path.join(publicPath, 'index.html'));

});

app.get('/luckydraw/*', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); res.sendFile(path.join(publicPath, 'index.html'));

});
app.get('/bestdress/*', (req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); res.sendFile(path.join(publicPath, 'index.html'));

});

app.get('/*', (req, res) => {
    // Prevent SPA fallback for API routes (v1.7.16 - Fix for Blank Dashboard)
    if (req.path.startsWith('/api/') || req.path.startsWith('/IFX/api/') || req.path.startsWith('/luckydraw/api/') || req.path.startsWith('/bestdress/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); res.sendFile(path.join(publicPath, 'index.html'));

});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    console.error('Unhandled request error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Initialize DB then start server
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Company Dinner App server running on port ${PORT}`);
    });
}).catch(err => {
    console.error("FAILED TO START SERVER: Database initialization failed.");
    console.error(err);
    process.exit(1);
});

// Prevent process from crashing on unhandled errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});
