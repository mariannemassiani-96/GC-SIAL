const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/sial.db';
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ───────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nom TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'operateur',
    apps_autorisees TEXT DEFAULT '[]',
    actif INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS app_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    app TEXT NOT NULL,
    collection TEXT NOT NULL,
    doc_id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_by INTEGER REFERENCES users(id),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(app, collection, doc_id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    app TEXT,
    detail TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Migrations idempotentes (ajout de colonnes sur DB existante) ────
const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userCols.includes('pin')) {
  db.exec("ALTER TABLE users ADD COLUMN pin TEXT");
}
if (!userCols.includes('pin_login_enabled')) {
  db.exec("ALTER TABLE users ADD COLUMN pin_login_enabled INTEGER DEFAULT 0");
}

module.exports = db;
