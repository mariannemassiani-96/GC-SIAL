require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const db = require('./db');
const { hashPassword, checkPassword, generateToken, authMiddleware, adminOnly, ensureAdmin } = require('./auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'https://atelier-sial.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

ensureAdmin();

// ══════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND actif = 1').get(email);
  if (!user || !checkPassword(password, user.password)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  const token = generateToken(user);
  db.prepare('INSERT INTO activity_log (user_id, action) VALUES (?, ?)').run(user.id, 'login');
  res.json({ token, user: { id: user.id, email: user.email, nom: user.nom, role: user.role, apps_autorisees: JSON.parse(user.apps_autorisees || '[]') } });
});

app.post('/api/auth/login-pin', (req, res) => {
  const { nom, pin } = req.body;
  if (!nom || !pin || pin.length !== 4) return res.status(400).json({ error: 'Prenom et PIN 4 chiffres requis' });
  const users = db.prepare('SELECT * FROM users WHERE actif = 1 AND pin_enabled = 1').all();
  const user = users.find(u => u.nom.toLowerCase().trim() === nom.toLowerCase().trim() && u.pin === pin);
  if (!user) return res.status(401).json({ error: 'Prenom ou PIN incorrect' });
  const token = generateToken(user);
  db.prepare('INSERT INTO activity_log (user_id, action) VALUES (?, ?)').run(user.id, 'login-pin');
  res.json({ token, user: { id: user.id, email: user.email, nom: user.nom, role: user.role, apps_autorisees: JSON.parse(user.apps_autorisees || '[]'), pin_enabled: true } });
});

app.get('/api/auth/pin-users', (req, res) => {
  const users = db.prepare('SELECT nom FROM users WHERE actif = 1 AND pin_enabled = 1').all();
  res.json(users.map(u => u.nom));
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, nom, role, apps_autorisees, pin_enabled FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouve' });
  res.json({ ...user, apps_autorisees: JSON.parse(user.apps_autorisees || '[]'), pin_enabled: !!user.pin_enabled });
});

// ══════════════════════════════════════════════════════════════
// USERS (admin only)
// ══════════════════════════════════════════════════════════════

app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, email, nom, role, apps_autorisees, actif, pin, pin_enabled, created_at FROM users').all();
  res.json(users.map(u => ({ ...u, apps_autorisees: JSON.parse(u.apps_autorisees || '[]'), pin_enabled: !!u.pin_enabled })));
});

app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
  const { email, password, nom, role, apps_autorisees, pin, pin_enabled } = req.body;
  if (!nom) return res.status(400).json({ error: 'Nom requis' });
  const userEmail = email || `${nom.toLowerCase().replace(/\s+/g, '.')}@atelier.local`;
  const userPassword = password || (pin ? pin : '0000');
  try {
    const result = db.prepare('INSERT INTO users (email, password, nom, role, apps_autorisees, pin, pin_enabled) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      userEmail, hashPassword(userPassword), nom, role || 'operateur', JSON.stringify(apps_autorisees || []),
      pin || null, pin_enabled ? 1 : 0
    );
    res.json({ id: result.lastInsertRowid, email: userEmail, nom, role: role || 'operateur' });
  } catch (e) {
    res.status(409).json({ error: 'Utilisateur deja existant' });
  }
});

app.put('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const { nom, role, apps_autorisees, actif, password, pin, pin_enabled } = req.body;
  const updates = [];
  const params = [];
  if (nom !== undefined) { updates.push('nom = ?'); params.push(nom); }
  if (role !== undefined) { updates.push('role = ?'); params.push(role); }
  if (apps_autorisees !== undefined) { updates.push('apps_autorisees = ?'); params.push(JSON.stringify(apps_autorisees)); }
  if (actif !== undefined) { updates.push('actif = ?'); params.push(actif ? 1 : 0); }
  if (password) { updates.push('password = ?'); params.push(hashPassword(password)); }
  if (pin !== undefined) { updates.push('pin = ?'); params.push(pin || null); }
  if (pin_enabled !== undefined) { updates.push('pin_enabled = ?'); params.push(pin_enabled ? 1 : 0); }
  if (updates.length === 0) return res.status(400).json({ error: 'Rien a mettre a jour' });
  params.push(req.params.id);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
// APP DATA (generic CRUD for all apps)
// ══════════════════════════════════════════════════════════════

// GET all docs for an app/collection
app.get('/api/data/:app/:collection', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT doc_id, data, updated_at FROM app_data WHERE app = ? AND collection = ?').all(req.params.app, req.params.collection);
  res.json(rows.map(r => ({ id: r.doc_id, ...JSON.parse(r.data), _updated_at: r.updated_at })));
});

// GET single doc
app.get('/api/data/:app/:collection/:docId', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT data, updated_at FROM app_data WHERE app = ? AND collection = ? AND doc_id = ?').get(req.params.app, req.params.collection, req.params.docId);
  if (!row) return res.status(404).json({ error: 'Document non trouve' });
  res.json({ id: req.params.docId, ...JSON.parse(row.data), _updated_at: row.updated_at });
});

// PUT (create or update) a doc
app.put('/api/data/:app/:collection/:docId', authMiddleware, (req, res) => {
  const data = JSON.stringify(req.body);
  db.prepare(`INSERT INTO app_data (app, collection, doc_id, data, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(app, collection, doc_id) DO UPDATE SET data = ?, updated_by = ?, updated_at = datetime('now')`)
    .run(req.params.app, req.params.collection, req.params.docId, data, req.user.id, data, req.user.id);
  db.prepare('INSERT INTO activity_log (user_id, action, app, detail) VALUES (?, ?, ?, ?)').run(
    req.user.id, 'save', req.params.app, `${req.params.collection}/${req.params.docId}`
  );
  res.json({ ok: true });
});

// DELETE a doc
app.delete('/api/data/:app/:collection/:docId', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM app_data WHERE app = ? AND collection = ? AND doc_id = ?').run(req.params.app, req.params.collection, req.params.docId);
  res.json({ ok: true });
});

// BULK PUT (save entire collection at once — for migration from localStorage)
app.put('/api/data/:app/:collection', authMiddleware, (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Array attendu' });
  const stmt = db.prepare(`INSERT INTO app_data (app, collection, doc_id, data, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(app, collection, doc_id) DO UPDATE SET data = ?, updated_by = ?, updated_at = datetime('now')`);
  const tx = db.transaction(() => {
    for (const item of items) {
      const docId = item.id || item.barcode || Date.now().toString(36);
      const data = JSON.stringify(item);
      stmt.run(req.params.app, req.params.collection, docId, data, req.user.id, data, req.user.id);
    }
  });
  tx();
  res.json({ ok: true, count: items.length });
});

// ══════════════════════════════════════════════════════════════
// COMMANDES GLOBALES
// ══════════════════════════════════════════════════════════════

function supervisorOnly(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'superviseur' && req.user.role !== 'chef_atelier') {
    return res.status(403).json({ error: 'Acces reserve aux superviseurs' });
  }
  next();
}

// GET all
app.get('/api/commandes-globales', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT * FROM commandes_globales ORDER BY date_creation DESC').all();
  res.json(rows.map(r => ({
    ...r,
    reception: JSON.parse(r.reception || '{}'),
    coupe_profiles: JSON.parse(r.coupe_profiles || '{}'),
    vitrage: JSON.parse(r.vitrage || '{}'),
    assemblage: JSON.parse(r.assemblage || '{}'),
    livraison: JSON.parse(r.livraison || '{}'),
  })));
});

// GET one
app.get('/api/commandes-globales/:ref', authMiddleware, (req, res) => {
  const row = db.prepare('SELECT * FROM commandes_globales WHERE ref = ?').get(req.params.ref);
  if (!row) return res.status(404).json({ error: 'Commande non trouvee' });
  res.json({
    ...row,
    reception: JSON.parse(row.reception || '{}'),
    coupe_profiles: JSON.parse(row.coupe_profiles || '{}'),
    vitrage: JSON.parse(row.vitrage || '{}'),
    assemblage: JSON.parse(row.assemblage || '{}'),
    livraison: JSON.parse(row.livraison || '{}'),
  });
});

// PUT (upsert)
app.put('/api/commandes-globales/:ref', authMiddleware, supervisorOnly, (req, res) => {
  const { client, chantier, semaine_fab, semaine_liv, reception, coupe_profiles, vitrage, assemblage, livraison, notes } = req.body;
  db.prepare(`INSERT INTO commandes_globales (ref, client, chantier, semaine_fab, semaine_liv, reception, coupe_profiles, vitrage, assemblage, livraison, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(ref) DO UPDATE SET
      client = COALESCE(?, client),
      chantier = COALESCE(?, chantier),
      semaine_fab = COALESCE(?, semaine_fab),
      semaine_liv = COALESCE(?, semaine_liv),
      reception = COALESCE(?, reception),
      coupe_profiles = COALESCE(?, coupe_profiles),
      vitrage = COALESCE(?, vitrage),
      assemblage = COALESCE(?, assemblage),
      livraison = COALESCE(?, livraison),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
  `).run(
    req.params.ref,
    client || '', chantier || '', semaine_fab || '', semaine_liv || '',
    JSON.stringify(reception || {}), JSON.stringify(coupe_profiles || {}),
    JSON.stringify(vitrage || {}), JSON.stringify(assemblage || {}),
    JSON.stringify(livraison || {}), notes || '',
    client, chantier, semaine_fab, semaine_liv,
    reception ? JSON.stringify(reception) : null,
    coupe_profiles ? JSON.stringify(coupe_profiles) : null,
    vitrage ? JSON.stringify(vitrage) : null,
    assemblage ? JSON.stringify(assemblage) : null,
    livraison ? JSON.stringify(livraison) : null,
    notes
  );
  db.prepare('INSERT INTO activity_log (user_id, action, app, detail) VALUES (?, ?, ?, ?)').run(
    req.user.id, 'upsert', 'commandes_globales', req.params.ref
  );
  res.json({ ok: true });
});

// PATCH a specific module
app.patch('/api/commandes-globales/:ref/:module', authMiddleware, (req, res) => {
  const validModules = ['reception', 'coupe_profiles', 'vitrage', 'assemblage', 'livraison'];
  const mod = req.params.module;
  if (!validModules.includes(mod)) {
    return res.status(400).json({ error: `Module invalide. Valeurs acceptees: ${validModules.join(', ')}` });
  }
  req.params.ref = req.params.ref.trim();
  const existing = db.prepare('SELECT ref FROM commandes_globales WHERE ref = ?').get(req.params.ref);
  if (!existing) {
    // Auto-create the command if it doesn't exist
    db.prepare(`INSERT INTO commandes_globales (ref, ${mod}, updated_at) VALUES (?, ?, datetime('now'))`).run(
      req.params.ref, JSON.stringify(req.body)
    );
  } else {
    db.prepare(`UPDATE commandes_globales SET ${mod} = ?, updated_at = datetime('now') WHERE ref = ?`).run(
      JSON.stringify(req.body), req.params.ref
    );
  }
  db.prepare('INSERT INTO activity_log (user_id, action, app, detail) VALUES (?, ?, ?, ?)').run(
    req.user.id, 'patch_module', 'commandes_globales', `${req.params.ref}/${mod}`
  );
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
// PDF PROFILE IMAGE EXTRACTION
// ══════════════════════════════════════════════════════════════

app.post('/api/extract-profile-images', authMiddleware, upload.single('pdf'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier PDF requis' });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfimg-'));
  const pdfPath = path.join(tmpDir, 'input.pdf');
  try {
    fs.writeFileSync(pdfPath, req.file.buffer);
    execSync(`pdfimages -png "${pdfPath}" "${path.join(tmpDir, 'img')}"`, { timeout: 15000 });
    const files = fs.readdirSync(tmpDir).filter(f => f.endsWith('.png')).sort();
    const images = [];
    for (const f of files) {
      const buf = fs.readFileSync(path.join(tmpDir, f));
      const b64 = buf.toString('base64');
      // Profile section images are ~100x100, bar images are ~1200x52
      // We want both but tag them
      const size = buf.length;
      images.push({ name: f, base64: b64, size, isProfile: size < 2000 && size > 100 });
    }
    res.json({ images, total: images.length });
  } catch (e) {
    res.status(500).json({ error: 'Erreur extraction: ' + e.message });
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  }
});

// ══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════════════════════════════════════

app.get('/api/activity', authMiddleware, adminOnly, (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const rows = db.prepare(`
    SELECT l.*, u.nom as user_nom FROM activity_log l
    LEFT JOIN users u ON l.user_id = u.id
    ORDER BY l.created_at DESC LIMIT ?
  `).all(limit);
  res.json(rows);
});

// ══════════════════════════════════════════════════════════════
// HEALTH
// ══════════════════════════════════════════════════════════════

app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as n FROM users').get().n;
  const dataCount = db.prepare('SELECT COUNT(*) as n FROM app_data').get().n;
  res.json({ status: 'ok', users: userCount, documents: dataCount, uptime: process.uptime() });
});

// ══════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`SIAL API — http://0.0.0.0:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
