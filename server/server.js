// ============================================================
// ZYGOBUS – Node.js Backend Server
// Express + better-sqlite3 + bcryptjs + jsonwebtoken
// Port: 3001
// ============================================================

const express = require('express');
const cors    = require('cors');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const fs      = require('fs');
const Database = require('better-sqlite3');
const path    = require('path');

const app  = express();
const PORT = 3001;
const JWT_SECRET = 'zygobus-super-secret-key-2026';

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve static frontend files ─────────────────────────────
// The frontend lives one level up from the server directory
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// ── Database setup ──────────────────────────────────────────
const db = new Database(path.join(__dirname, 'zygobus.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName  TEXT    NOT NULL,
    lastName   TEXT    NOT NULL,
    email      TEXT    UNIQUE NOT NULL,
    mobile     TEXT    NOT NULL,
    password   TEXT    NOT NULL,
    createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    userId     INTEGER NOT NULL,
    bookingRef TEXT    UNIQUE NOT NULL,
    fromCity   TEXT    NOT NULL,
    toCity     TEXT    NOT NULL,
    travelDate TEXT    NOT NULL,
    operator   TEXT    NOT NULL,
    departure  TEXT,
    arrival    TEXT,
    duration   TEXT,
    busType    TEXT,
    seats      INTEGER NOT NULL DEFAULT 1,
    totalFare  INTEGER NOT NULL,
    status     TEXT    DEFAULT 'confirmed',
    passengerName TEXT,
    passengerEmail TEXT,
    passengerMobile TEXT,
    createdAt  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// ── Auth Middleware ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ── Helper ──────────────────────────────────────────────────
function genRef() {
  return 'ZYG' + Date.now().toString().slice(-8);
}

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;

  if (!firstName || !lastName || !email || !mobile || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const stmt = db.prepare(
      'INSERT INTO users (firstName, lastName, email, mobile, password) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(firstName, lastName, email, mobile, hash);
    const user = { id: result.lastInsertRowid, firstName, lastName, email, mobile };
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[REGISTER] New user: ${email}`);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email is already registered' });
    }
    console.error('[REGISTER ERROR]', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  const safeUser = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, mobile: user.mobile };
  console.log(`[LOGIN] User: ${email}`);
  return res.json({ token, user: safeUser });
});

// GET /api/auth/me  (verify token + return user info)
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, firstName, lastName, email, mobile, createdAt FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// ============================================================
// BOOKING ROUTES
// ============================================================

// GET /api/bookings  – get all bookings for logged-in user
app.get('/api/bookings', authMiddleware, (req, res) => {
  const bookings = db
    .prepare('SELECT * FROM bookings WHERE userId = ? ORDER BY createdAt DESC')
    .all(req.user.id);
  return res.json(bookings);
});

// POST /api/bookings  – create a new booking
app.post('/api/bookings', authMiddleware, (req, res) => {
  const {
    fromCity, toCity, travelDate, operator,
    departure, arrival, duration, busType,
    seats, totalFare,
    passengerName, passengerEmail, passengerMobile
  } = req.body;

  if (!fromCity || !toCity || !travelDate || !operator || !totalFare) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const bookingRef = genRef();
  const stmt = db.prepare(`
    INSERT INTO bookings
      (userId, bookingRef, fromCity, toCity, travelDate, operator,
       departure, arrival, duration, busType, seats, totalFare,
       passengerName, passengerEmail, passengerMobile)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    req.user.id, bookingRef, fromCity, toCity, travelDate, operator,
    departure || '', arrival || '', duration || '', busType || '',
    seats || 1, totalFare,
    passengerName || '', passengerEmail || '', passengerMobile || ''
  );

  console.log(`[BOOKING] ${bookingRef} | ${fromCity} → ${toCity} | User #${req.user.id}`);
  return res.status(201).json({ bookingRef, status: 'confirmed' });
});

// GET /api/bookings/:ref  – get a single booking by reference
app.get('/api/bookings/:ref', authMiddleware, (req, res) => {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE bookingRef = ? AND userId = ?')
    .get(req.params.ref, req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  return res.json(booking);
});

// PUT /api/bookings/:ref/cancel  – cancel a booking
app.put('/api/bookings/:ref/cancel', authMiddleware, (req, res) => {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE bookingRef = ? AND userId = ?')
    .get(req.params.ref, req.user.id);

  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') {
    return res.status(400).json({ error: 'Booking is already cancelled' });
  }
  if (booking.status === 'completed') {
    return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });
  }

  db.prepare('UPDATE bookings SET status = ? WHERE bookingRef = ? AND userId = ?')
    .run('cancelled', req.params.ref, req.user.id);

  console.log(`[CANCEL] ${req.params.ref}`);
  return res.json({ message: 'Booking cancelled successfully. Refund will be processed in 3–5 business days.' });
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/api/health', (req, res) => {
  return res.json({ status: 'ok', service: 'ZygoBus API', time: new Date().toISOString() });
});

// 404 fallback for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  ✅  ZygoBus API is running!');
  console.log(`  🚌  http://localhost:${PORT}/api/health`);
  console.log('');
});
