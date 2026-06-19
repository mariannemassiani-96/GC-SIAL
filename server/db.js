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

// ── Commandes Globales ───────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS commandes_globales (
    ref TEXT PRIMARY KEY,
    client TEXT DEFAULT '',
    chantier TEXT DEFAULT '',
    date_creation TEXT DEFAULT (datetime('now')),
    semaine_fab TEXT DEFAULT '',
    semaine_liv TEXT DEFAULT '',
    reception TEXT DEFAULT '{}',
    coupe_profiles TEXT DEFAULT '{}',
    vitrage TEXT DEFAULT '{}',
    assemblage TEXT DEFAULT '{}',
    livraison TEXT DEFAULT '{}',
    notes TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migrations
try { db.exec('ALTER TABLE users ADD COLUMN pin TEXT DEFAULT NULL'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN pin_enabled INTEGER DEFAULT 0'); } catch {}

// Production events (time tracking)
db.exec(`
  CREATE TABLE IF NOT EXISTS production_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_ref TEXT NOT NULL,
    poste TEXT NOT NULL,
    user_id INTEGER,
    user_nom TEXT DEFAULT '',
    action TEXT NOT NULL,
    piece_ref TEXT DEFAULT '',
    detail TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_events_commande ON production_events(commande_ref);
  CREATE INDEX IF NOT EXISTS idx_events_poste ON production_events(commande_ref, poste);
  CREATE INDEX IF NOT EXISTS idx_events_user ON production_events(user_id);
`);

// Profile images cache
db.exec(`
  CREATE TABLE IF NOT EXISTS profile_images (
    code TEXT PRIMARY KEY,
    image_base64 TEXT NOT NULL,
    description TEXT DEFAULT '',
    brand TEXT DEFAULT '',
    system TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;
