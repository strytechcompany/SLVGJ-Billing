const Database = require('better-sqlite3');
const path = require('path');

// Store the database file in the project root
const DB_PATH = path.join(__dirname, '..', 'billing.db');

const db = new Database(DB_PATH, { timeout: 10000 });

// ── Performance & integrity pragmas ────────────────────────────────────
db.pragma('journal_mode = WAL');       // faster concurrent reads
db.pragma('foreign_keys = ON');        // enforce FK constraints

module.exports = db;
