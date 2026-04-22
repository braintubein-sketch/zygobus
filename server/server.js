// ============================================================
// ZYGOBUS – Node.js Backend Server (PostgreSQL / Neon)
// Express + pg + bcryptjs + jsonwebtoken + dotenv
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { Pool } = require('pg');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'zygobus-super-secret-key-2026';

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Serve static frontend files ─────────────────────────────
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// ── PostgreSQL Pool ─────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ── Init Tables ─────────────────────────────────────────────
let dbReady = false;
async function initDB() {
  if (dbReady) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id          SERIAL PRIMARY KEY,
      "firstName" TEXT NOT NULL,
      "lastName"  TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      mobile      TEXT NOT NULL,
      password    TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id               SERIAL PRIMARY KEY,
      "userId"         INTEGER NOT NULL,
      "bookingRef"     TEXT UNIQUE NOT NULL,
      "fromCity"       TEXT NOT NULL,
      "toCity"         TEXT NOT NULL,
      "travelDate"     TEXT NOT NULL,
      operator         TEXT NOT NULL,
      departure        TEXT,
      arrival          TEXT,
      duration         TEXT,
      "busType"        TEXT,
      seats            INTEGER NOT NULL DEFAULT 1,
      "seatIds"        TEXT,
      "totalFare"      INTEGER NOT NULL,
      status           TEXT DEFAULT 'confirmed',
      "passengerName"  TEXT,
      "passengerEmail" TEXT,
      "passengerMobile" TEXT,
      "createdAt"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  dbReady = true;
  console.log('  ✅  Database tables ready (Neon PostgreSQL)');
}

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

function genRef() {
  return 'ZYG' + Date.now().toString().slice(-8);
}

// ── Init DB before requests ─────────────────────────────────
app.use(async (req, res, next) => {
  try { await initDB(); next(); }
  catch (e) { console.error(e); res.status(500).json({ error: 'Database initialization failed' }); }
});

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;

  if (!firstName || !lastName || !email || !mobile || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users ("firstName","lastName",email,mobile,password) VALUES ($1,$2,$3,$4,$5) RETURNING id,"firstName","lastName",email,mobile',
      [firstName, lastName, email, mobile, hash]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[REGISTER] New user: ${email}`);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email is already registered' });
    console.error('[REGISTER ERROR]', err.message);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email and password are required' });

  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    const safeUser = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, mobile: user.mobile };
    console.log(`[LOGIN] User: ${email}`);
    return res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,"firstName","lastName",email,mobile,"createdAt" FROM users WHERE id=$1',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  return res.json(rows[0]);
});

// ============================================================
// BOOKING ROUTES
// ============================================================

// GET /api/bookings
app.get('/api/bookings', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE "userId"=$1 ORDER BY "createdAt" DESC',
    [req.user.id]
  );
  return res.json(rows);
});

// POST /api/bookings
app.post('/api/bookings', authMiddleware, async (req, res) => {
  const {
    fromCity, toCity, travelDate, operator,
    departure, arrival, duration, busType,
    seats, seatIds, totalFare,
    passengerName, passengerEmail, passengerMobile
  } = req.body;

  if (!fromCity || !toCity || !travelDate || !operator || !totalFare)
    return res.status(400).json({ error: 'Missing required booking fields' });

  const bookingRef = genRef();
  try {
    await pool.query(
      `INSERT INTO bookings
        ("userId","bookingRef","fromCity","toCity","travelDate",operator,
         departure,arrival,duration,"busType",seats,"seatIds","totalFare",
         "passengerName","passengerEmail","passengerMobile")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
      [
        req.user.id, bookingRef, fromCity, toCity, travelDate, operator,
        departure || '', arrival || '', duration || '', busType || '',
        seats || 1, seatIds || '', totalFare,
        passengerName || '', passengerEmail || '', passengerMobile || ''
      ]
    );
    console.log(`[BOOKING] ${bookingRef} | ${fromCity} → ${toCity} | User #${req.user.id}`);
    return res.status(201).json({ bookingRef, status: 'confirmed' });
  } catch (err) {
    console.error('[BOOKING ERROR]', err.message);
    return res.status(500).json({ error: 'Booking failed. Please try again.' });
  }
});

// GET /api/bookings/:ref
app.get('/api/bookings/:ref', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE "bookingRef"=$1 AND "userId"=$2',
    [req.params.ref, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
  return res.json(rows[0]);
});

// PUT /api/bookings/:ref/cancel
app.put('/api/bookings/:ref/cancel', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE "bookingRef"=$1 AND "userId"=$2',
    [req.params.ref, req.user.id]
  );
  const booking = rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking is already cancelled' });
  if (booking.status === 'completed') return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });

  await pool.query(
    'UPDATE bookings SET status=$1 WHERE "bookingRef"=$2 AND "userId"=$3',
    ['cancelled', req.params.ref, req.user.id]
  );
  console.log(`[CANCEL] ${req.params.ref}`);
  return res.json({ message: 'Booking cancelled successfully. Refund will be processed in 3–5 business days.' });
});

// ── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'ZygoBus API (local)', db: 'Neon PostgreSQL', time: new Date().toISOString() })
);

// 404 fallback
app.use('/api/*', (req, res) => res.status(404).json({ error: 'API endpoint not found' }));

// ── Serve index.html for all non-API routes ─────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ── Start server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  🚌  ZygoBus is running!');
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  🔗  DB: Neon PostgreSQL (${process.env.DATABASE_URL ? '✅ connected' : '❌ DATABASE_URL missing'})`);
  console.log('');
});
