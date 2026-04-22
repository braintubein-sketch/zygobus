// ============================================================
// ZYGOBUS – Vercel Serverless API
// Express + PostgreSQL (Neon) + bcryptjs + JWT
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
}

const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const { Pool }   = require('pg');

const app        = express();
const JWT_SECRET = process.env.JWT_SECRET || 'zygobus-super-secret-key-2026';

app.use(cors({ origin: '*' }));
app.use(express.json());

// Strip channel_binding from Neon URLs (pg client doesn't support it)
const dbUrl = (process.env.DATABASE_URL || '').replace(/&channel_binding=[^&]*/gi, '');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

// ── Init Tables (individual queries for Neon compatibility) ──
let dbReady = false;
async function initDB() {
  if (dbReady) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, "firstName" TEXT NOT NULL, "lastName" TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL, mobile TEXT NOT NULL, password TEXT NOT NULL,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS buses (
      id SERIAL PRIMARY KEY, operator TEXT NOT NULL, "busType" TEXT NOT NULL,
      "totalSeats" INTEGER DEFAULT 40, amenities TEXT DEFAULT '[]',
      rating REAL DEFAULT 4.0, "ratingCount" INTEGER DEFAULT 200
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS schedules (
      id SERIAL PRIMARY KEY, "busId" INTEGER NOT NULL,
      "fromCity" TEXT NOT NULL, "toCity" TEXT NOT NULL,
      departure TEXT NOT NULL, arrival TEXT NOT NULL,
      duration TEXT NOT NULL, "baseFare" INTEGER NOT NULL
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS "bookedSeats" (
      id SERIAL PRIMARY KEY, "scheduleId" INTEGER NOT NULL,
      "travelDate" TEXT NOT NULL, "seatNumber" TEXT NOT NULL,
      "bookingRef" TEXT,
      UNIQUE("scheduleId", "travelDate", "seatNumber")
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY, "userId" INTEGER NOT NULL,
      "bookingRef" TEXT UNIQUE NOT NULL, "scheduleId" INTEGER,
      "fromCity" TEXT NOT NULL, "toCity" TEXT NOT NULL, "travelDate" TEXT NOT NULL,
      operator TEXT NOT NULL, departure TEXT, arrival TEXT, duration TEXT,
      "busType" TEXT, seats INTEGER NOT NULL DEFAULT 1, "seatIds" TEXT,
      "totalFare" INTEGER NOT NULL, status TEXT DEFAULT 'confirmed',
      "passengerName" TEXT, "passengerEmail" TEXT, "passengerMobile" TEXT,
      "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    dbReady = true;
    await seedData();
  } catch (e) {
    console.error('initDB error:', e.message);
    throw e;
  }
}

// ── Seed Data ────────────────────────────────────────────────
async function seedData() {
  const { rows } = await pool.query('SELECT COUNT(*) as c FROM buses');
  if (parseInt(rows[0].c) > 0) return;

  const buses = [
    ['VRL Travels',        'Volvo AC Sleeper',   40, '["wifi","charging","water","blanket"]',                   4.5, 3240],
    ['Orange Travels',     'AC Sleeper',          36, '["wifi","charging","water","blanket"]',                   4.6, 2870],
    ['Patel Travels',      'Volvo Multi-Axle',    44, '["wifi","charging","water","blanket","entertainment"]',   4.7, 4120],
    ['SRS Travels',        'AC Seater',           45, '["charging","water"]',                                    4.2, 1890],
    ['Chartered Bus',      'AC Seater',           40, '["charging","water","wifi"]',                             4.3, 2100],
    ['IntraBus',           'AC Sleeper',          36, '["charging","water","blanket"]',                          4.1, 1560],
    ['KSRTC Express',      'Non-AC Seater',       50, '["water"]',                                               3.8,  980],
    ['Greenline Travels',  'Non-AC Sleeper',      36, '["water"]',                                               3.6,  670],
    ['Kallada Tours',      'AC Sleeper',          40, '["wifi","charging","water","blanket"]',                   4.4, 2340],
    ['Paulo Travels',      'Volvo AC Sleeper',    36, '["wifi","charging","water","blanket"]',                   4.5, 3100],
    ['Sugama Tourist',     'AC Seater',           45, '["charging","water"]',                                    4.0, 1200],
    ['National Travels',   'AC Sleeper',          40, '["charging","water","blanket"]',                          4.2, 1780],
  ];

  for (const b of buses) {
    await pool.query(
      'INSERT INTO buses (operator,"busType","totalSeats",amenities,rating,"ratingCount") VALUES ($1,$2,$3,$4,$5,$6)',
      b
    );
  }

  const routes = [
    ['Bangalore','Hyderabad',   '22:00','06:30','8h 30m', 650],
    ['Bangalore','Hyderabad',   '20:30','04:45','8h 15m', 750],
    ['Bangalore','Hyderabad',   '06:00','14:00','8h 00m', 480],
    ['Bangalore','Hyderabad',   '14:00','22:30','8h 30m', 520],
    ['Hyderabad','Bangalore',   '21:30','06:00','8h 30m', 650],
    ['Hyderabad','Bangalore',   '07:00','15:30','8h 30m', 480],
    ['Mumbai',   'Pune',        '06:00','09:30','3h 30m', 350],
    ['Mumbai',   'Pune',        '12:00','15:30','3h 30m', 300],
    ['Mumbai',   'Pune',        '21:00','00:30','3h 30m', 280],
    ['Pune',     'Mumbai',      '06:30','10:00','3h 30m', 350],
    ['Pune',     'Mumbai',      '20:00','23:30','3h 30m', 280],
    ['Chennai',  'Bangalore',   '22:00','05:30','7h 30m', 580],
    ['Chennai',  'Bangalore',   '07:00','13:30','6h 30m', 480],
    ['Bangalore','Chennai',     '21:30','05:00','7h 30m', 580],
    ['Bangalore','Chennai',     '07:30','14:00','6h 30m', 500],
    ['Delhi',    'Agra',        '06:00','10:30','4h 30m', 450],
    ['Delhi',    'Agra',        '14:00','18:30','4h 30m', 420],
    ['Agra',     'Delhi',       '07:00','11:30','4h 30m', 450],
    ['Hyderabad','Vijayawada',  '06:00','11:00','5h 00m', 380],
    ['Hyderabad','Vijayawada',  '22:00','03:00','5h 00m', 350],
    ['Vijayawada','Hyderabad',  '07:00','12:00','5h 00m', 380],
    ['Kochi',    'Coimbatore',  '07:00','11:30','4h 30m', 320],
    ['Kochi',    'Coimbatore',  '22:00','02:30','4h 30m', 280],
    ['Coimbatore','Kochi',      '08:00','12:30','4h 30m', 320],
    ['Jaipur',   'Delhi',       '06:00','11:30','5h 30m', 520],
    ['Jaipur',   'Delhi',       '22:00','03:30','5h 30m', 450],
    ['Delhi',    'Jaipur',      '07:00','12:30','5h 30m', 520],
    ['Bangalore','Goa',         '21:00','06:00','9h 00m', 780],
    ['Bangalore','Goa',         '22:30','07:30','9h 00m', 850],
    ['Goa',      'Bangalore',   '20:00','05:00','9h 00m', 780],
    ['Mumbai',   'Goa',         '21:00','08:00','11h 00m',950],
    ['Chennai',  'Madurai',     '22:00','05:30','7h 30m', 450],
    ['Madurai',  'Chennai',     '22:00','05:30','7h 30m', 450],
    ['Bangalore','Mysore',      '06:00','08:30','2h 30m', 220],
    ['Bangalore','Mysore',      '14:00','16:30','2h 30m', 220],
    ['Mysore',   'Bangalore',   '07:00','09:30','2h 30m', 220],
    ['Mysore',   'Bangalore',   '17:00','19:30','2h 30m', 200],
    ['Pune',     'Goa',         '20:00','06:00','10h 00m',750],
    ['Pune',     'Goa',         '22:00','08:00','10h 00m',800],
  ];

  const busRows = (await pool.query('SELECT id FROM buses ORDER BY id')).rows;
  for (let i = 0; i < routes.length; i++) {
    const [from, to, dep, arr, dur, fare] = routes[i];
    const busId = busRows[i % busRows.length].id;
    await pool.query(
      'INSERT INTO schedules ("busId","fromCity","toCity",departure,arrival,duration,"baseFare") VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [busId, from, to, dep, arr, dur, fare]
    );
  }
  console.log('Seeded bus/route data');
}

// ── Auth Middleware ──────────────────────────────────────────
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try { req.user = jwt.verify(h.split(' ')[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

function genRef() { return 'ZYG' + Date.now().toString().slice(-8); }

app.use(async (req, res, next) => {
  try { await initDB(); next(); }
  catch (e) { console.error(e); res.status(500).json({ error: 'DB init failed' }); }
});

// ============================================================
// AUTH
// ============================================================

app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;
  if (!firstName || !lastName || !email || !mobile || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users ("firstName","lastName",email,mobile,password) VALUES ($1,$2,$3,$4,$5) RETURNING id,"firstName","lastName",email,mobile',
      [firstName, lastName, email, mobile, hash]
    );
    const user  = rows[0];
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email is already registered' });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid email or password' });
    const token   = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    const safeUser = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, mobile: user.mobile };
    return res.json({ token, user: safeUser });
  } catch (err) { return res.status(500).json({ error: 'Login failed' }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id,"firstName","lastName",email,mobile,"createdAt" FROM users WHERE id=$1', [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  return res.json(rows[0]);
});

// ============================================================
// BUS SEARCH (REAL-TIME)
// ============================================================

app.get('/api/search', async (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date) return res.status(400).json({ error: 'from, to, and date are required' });
  try {
    const { rows: schedules } = await pool.query(`
      SELECT s.id, s.departure, s.arrival, s.duration, s."baseFare",
             b.operator, b."busType", b."totalSeats", b.amenities, b.rating, b."ratingCount"
      FROM schedules s
      JOIN buses b ON s."busId" = b.id
      WHERE LOWER(s."fromCity")=LOWER($1) AND LOWER(s."toCity")=LOWER($2)
      ORDER BY s.departure ASC
    `, [from.trim(), to.trim()]);

    const result = await Promise.all(schedules.map(async s => {
      const { rows: bs } = await pool.query(
        'SELECT COUNT(*) as count FROM "bookedSeats" WHERE "scheduleId"=$1 AND "travelDate"=$2',
        [s.id, date]
      );
      const booked   = parseInt(bs[0].count);
      const seatsLeft = Math.max(0, s.totalSeats - booked);
      return {
        id: s.id,
        operator: s.operator,
        busType: s.busType,
        amenities: JSON.parse(s.amenities || '[]'),
        rating: s.rating,
        ratingCount: s.ratingCount,
        departure: s.departure,
        arrival: s.arrival,
        duration: s.duration,
        price: s.baseFare,
        totalSeats: s.totalSeats,
        seatsLeft,
      };
    }));
    return res.json(result);
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Search failed' }); }
});

app.get('/api/seats', async (req, res) => {
  const { scheduleId, date } = req.query;
  if (!scheduleId || !date) return res.status(400).json({ error: 'scheduleId and date required' });
  try {
    const { rows: sched } = await pool.query(
      'SELECT s.*,b."totalSeats" FROM schedules s JOIN buses b ON s."busId"=b.id WHERE s.id=$1', [scheduleId]
    );
    if (!sched[0]) return res.status(404).json({ error: 'Schedule not found' });
    const { rows: seats } = await pool.query(
      'SELECT "seatNumber" FROM "bookedSeats" WHERE "scheduleId"=$1 AND "travelDate"=$2',
      [scheduleId, date]
    );
    return res.json({ totalSeats: sched[0].totalSeats, bookedSeats: seats.map(r => r.seatNumber) });
  } catch (err) { return res.status(500).json({ error: 'Seat fetch failed' }); }
});

// ============================================================
// BOOKINGS
// ============================================================

app.get('/api/bookings', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE "userId"=$1 ORDER BY "createdAt" DESC', [req.user.id]
  );
  return res.json(rows);
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  const {
    scheduleId, fromCity, toCity, travelDate, operator,
    departure, arrival, duration, busType,
    seats, seatIds, totalFare, passengerName, passengerEmail, passengerMobile
  } = req.body;

  if (!fromCity || !toCity || !travelDate || !operator || !totalFare)
    return res.status(400).json({ error: 'Missing required booking fields' });

  const bookingRef = genRef();
  try {
    await pool.query(`
      INSERT INTO bookings
        ("userId","bookingRef","scheduleId","fromCity","toCity","travelDate",operator,
         departure,arrival,duration,"busType",seats,"seatIds","totalFare",
         "passengerName","passengerEmail","passengerMobile")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [
      req.user.id, bookingRef, scheduleId || null, fromCity, toCity, travelDate, operator,
      departure||'', arrival||'', duration||'', busType||'',
      seats||1, seatIds||'', totalFare,
      passengerName||'', passengerEmail||'', passengerMobile||''
    ]);

    // Mark seats as booked in real-time
    if (scheduleId && seatIds) {
      const seatList = seatIds.split(',').map(s => s.trim()).filter(Boolean);
      for (const seat of seatList) {
        await pool.query(
          'INSERT INTO "bookedSeats" ("scheduleId","travelDate","seatNumber","bookingRef") VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [scheduleId, travelDate, seat, bookingRef]
        );
      }
    }

    console.log(`[BOOKING] ${bookingRef} | ${fromCity}→${toCity}`);
    return res.status(201).json({ bookingRef, status: 'confirmed' });
  } catch (err) { console.error(err); return res.status(500).json({ error: 'Booking failed' }); }
});

app.get('/api/bookings/:ref', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE "bookingRef"=$1 AND "userId"=$2', [req.params.ref, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Booking not found' });
  return res.json(rows[0]);
});

app.put('/api/bookings/:ref/cancel', authMiddleware, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM bookings WHERE "bookingRef"=$1 AND "userId"=$2', [req.params.ref, req.user.id]
  );
  const booking = rows[0];
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });
  if (booking.status === 'completed') return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });

  await pool.query(
    "UPDATE bookings SET status='cancelled' WHERE \"bookingRef\"=$1 AND \"userId\"=$2",
    [req.params.ref, req.user.id]
  );

  // Release seats
  if (booking.scheduleId && booking.seatIds) {
    const seatList = booking.seatIds.split(',').map(s => s.trim()).filter(Boolean);
    for (const seat of seatList) {
      await pool.query(
        'DELETE FROM "bookedSeats" WHERE "scheduleId"=$1 AND "travelDate"=$2 AND "seatNumber"=$3',
        [booking.scheduleId, booking.travelDate, seat]
      );
    }
  }
  return res.json({ message: 'Booking cancelled. Refund in 3–5 business days.' });
});

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'ZygoBus API (Vercel+Neon)', time: new Date().toISOString() })
);

app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
