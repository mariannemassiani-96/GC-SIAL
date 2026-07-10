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

// Migrations for commandes_globales
try { db.exec("ALTER TABLE commandes_globales ADD COLUMN postes_actifs TEXT DEFAULT '[]'"); } catch {}

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

// ── Stock & MRP (LOT 4) ─────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_ref TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    movement_type TEXT NOT NULL,
    quantity FLOAT NOT NULL,
    lot_number TEXT DEFAULT '',
    location TEXT DEFAULT '',
    commande_ref TEXT DEFAULT '',
    user_nom TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_stock_product ON stock_movements(product_ref);

  CREATE TABLE IF NOT EXISTS stock_levels (
    product_ref TEXT PRIMARY KEY,
    product_name TEXT DEFAULT '',
    category TEXT DEFAULT '',
    current_qty FLOAT DEFAULT 0,
    min_qty FLOAT DEFAULT 0,
    reorder_qty FLOAT DEFAULT 0,
    location TEXT DEFAULT '',
    supplier TEXT DEFAULT '',
    last_movement TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Planning (LOT 5) ───────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS planning_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    commande_ref TEXT NOT NULL,
    poste TEXT NOT NULL,
    date_planifiee TEXT NOT NULL,
    duree_heures FLOAT DEFAULT 0,
    priorite INTEGER DEFAULT 0,
    statut TEXT DEFAULT 'planifie',
    operateur TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_planning_date ON planning_tasks(date_planifiee);
  CREATE INDEX IF NOT EXISTS idx_planning_commande ON planning_tasks(commande_ref);
`);

module.exports = db;
