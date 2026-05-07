const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const SECRET = process.env.JWT_SECRET || 'dev-secret-changez-moi';
const TOKEN_EXPIRY = '7d';

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, nom: user.nom, role: user.role },
    SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

// Middleware Express
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expire' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acces reserve aux administrateurs' });
  }
  next();
}

// Créer l'admin par défaut s'il n'existe pas
function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@sial.fr';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!existing) {
    db.prepare('INSERT INTO users (email, password, nom, role) VALUES (?, ?, ?, ?)').run(
      email, hashPassword(password), 'Administrateur', 'admin'
    );
    console.log(`Admin cree : ${email}`);
  }
}

module.exports = { hashPassword, checkPassword, generateToken, verifyToken, authMiddleware, adminOnly, ensureAdmin };
