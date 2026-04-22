// ============================================================
// ZYGOBUS – Local Dev Server (SQLite + Real-Time Data)
// Express + better-sqlite3 + bcryptjs + jsonwebtoken
// Port: 3001
// ============================================================

const express  = require('express');
const cors     = require('cors');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path     = require('path');

const app  = express();
const PORT = 3001;
const JWT_SECRET = 'zygobus-super-secret-key-2026';

app.use(cors());
app.use(express.json());

const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// ── Database ────────────────────────────────────────────────
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

  CREATE TABLE IF NOT EXISTS buses (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    operator   TEXT    NOT NULL,
    busType    TEXT    NOT NULL,
    totalSeats INTEGER DEFAULT 40,
    amenities  TEXT    DEFAULT '[]',
    rating     REAL    DEFAULT 4.0,
    ratingCount INTEGER DEFAULT 200
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    busId      INTEGER NOT NULL,
    fromCity   TEXT    NOT NULL,
    toCity     TEXT    NOT NULL,
    departure  TEXT    NOT NULL,
    arrival    TEXT    NOT NULL,
    duration   TEXT    NOT NULL,
    baseFare   INTEGER NOT NULL,
    FOREIGN KEY (busId) REFERENCES buses(id)
  );

  CREATE TABLE IF NOT EXISTS bookedSeats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    scheduleId  INTEGER NOT NULL,
    travelDate  TEXT    NOT NULL,
    seatNumber  TEXT    NOT NULL,
    bookingRef  TEXT,
    UNIQUE(scheduleId, travelDate, seatNumber)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    userId           INTEGER NOT NULL,
    bookingRef       TEXT    UNIQUE NOT NULL,
    scheduleId       INTEGER,
    fromCity         TEXT    NOT NULL,
    toCity           TEXT    NOT NULL,
    travelDate       TEXT    NOT NULL,
    operator         TEXT    NOT NULL,
    departure        TEXT,
    arrival          TEXT,
    duration         TEXT,
    busType          TEXT,
    seats            INTEGER NOT NULL DEFAULT 1,
    seatIds          TEXT,
    totalFare        INTEGER NOT NULL,
    status           TEXT    DEFAULT 'confirmed',
    passengerName    TEXT,
    passengerEmail   TEXT,
    passengerMobile  TEXT,
    createdAt        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

// ── Seed Bus Data ───────────────────────────────────────────
function seedData() {
  const busCount = db.prepare('SELECT COUNT(*) as c FROM buses').get().c;
  if (busCount > 0) return; // Already seeded

  const buses = [
    { operator: 'VRL Travels',         busType: 'Volvo AC Sleeper',    totalSeats: 40, amenities: '["wifi","charging","water","blanket"]',         rating: 4.5, ratingCount: 3240 },
    { operator: 'Orange Travels',      busType: 'AC Sleeper',          totalSeats: 36, amenities: '["wifi","charging","water","blanket"]',         rating: 4.6, ratingCount: 2870 },
    { operator: 'Patel Travels',       busType: 'Volvo Multi-Axle',    totalSeats: 44, amenities: '["wifi","charging","water","blanket","entertainment"]', rating: 4.7, ratingCount: 4120 },
    { operator: 'SRS Travels',         busType: 'AC Seater',           totalSeats: 45, amenities: '["charging","water"]',                          rating: 4.2, ratingCount: 1890 },
    { operator: 'Chartered Bus',       busType: 'AC Seater',           totalSeats: 40, amenities: '["charging","water","wifi"]',                   rating: 4.3, ratingCount: 2100 },
    { operator: 'IntraBus',            busType: 'AC Sleeper',          totalSeats: 36, amenities: '["charging","water","blanket"]',                rating: 4.1, ratingCount: 1560 },
    { operator: 'KSRTC Express',       busType: 'Non-AC Seater',       totalSeats: 50, amenities: '["water"]',                                     rating: 3.8, ratingCount: 980  },
    { operator: 'Greenline Travels',   busType: 'Non-AC Sleeper',      totalSeats: 36, amenities: '["water"]',                                     rating: 3.6, ratingCount: 670  },
    { operator: 'Kallada Tours',       busType: 'AC Sleeper',          totalSeats: 40, amenities: '["wifi","charging","water","blanket"]',         rating: 4.4, ratingCount: 2340 },
    { operator: 'Paulo Travels',       busType: 'Volvo AC Sleeper',    totalSeats: 36, amenities: '["wifi","charging","water","blanket"]',         rating: 4.5, ratingCount: 3100 },
    { operator: 'Sugama Tourist',      busType: 'AC Seater',           totalSeats: 45, amenities: '["charging","water"]',                          rating: 4.0, ratingCount: 1200 },
    { operator: 'National Travels',    busType: 'AC Sleeper',          totalSeats: 40, amenities: '["charging","water","blanket"]',                rating: 4.2, ratingCount: 1780 },
  ];

  const insertBus = db.prepare(
    'INSERT INTO buses (operator, busType, totalSeats, amenities, rating, ratingCount) VALUES (?,?,?,?,?,?)'
  );
  buses.forEach(b => insertBus.run(b.operator, b.busType, b.totalSeats, b.amenities, b.rating, b.ratingCount));

  // Route pairs with realistic schedules
  const routes = [
    { from: 'Bangalore', to: 'Hyderabad',    schedules: [
      { dep: '22:00', arr: '06:30', dur: '8h 30m', fare: 650 },
      { dep: '20:30', arr: '04:45', dur: '8h 15m', fare: 750 },
      { dep: '06:00', arr: '14:00', dur: '8h 00m', fare: 480 },
      { dep: '14:00', arr: '22:30', dur: '8h 30m', fare: 520 },
      { dep: '23:30', arr: '08:00', dur: '8h 30m', fare: 420 },
    ]},
    { from: 'Hyderabad', to: 'Bangalore',    schedules: [
      { dep: '21:30', arr: '06:00', dur: '8h 30m', fare: 650 },
      { dep: '07:00', arr: '15:30', dur: '8h 30m', fare: 480 },
      { dep: '22:00', arr: '06:30', dur: '8h 30m', fare: 720 },
    ]},
    { from: 'Mumbai', to: 'Pune',            schedules: [
      { dep: '06:00', arr: '09:30', dur: '3h 30m', fare: 350 },
      { dep: '08:30', arr: '12:00', dur: '3h 30m', fare: 380 },
      { dep: '12:00', arr: '15:30', dur: '3h 30m', fare: 300 },
      { dep: '17:00', arr: '20:30', dur: '3h 30m', fare: 320 },
      { dep: '21:00', arr: '00:30', dur: '3h 30m', fare: 280 },
    ]},
    { from: 'Pune', to: 'Mumbai',            schedules: [
      { dep: '06:30', arr: '10:00', dur: '3h 30m', fare: 350 },
      { dep: '14:00', arr: '17:30', dur: '3h 30m', fare: 300 },
      { dep: '20:00', arr: '23:30', dur: '3h 30m', fare: 280 },
    ]},
    { from: 'Chennai', to: 'Bangalore',      schedules: [
      { dep: '22:00', arr: '05:30', dur: '7h 30m', fare: 580 },
      { dep: '07:00', arr: '13:30', dur: '6h 30m', fare: 480 },
      { dep: '14:30', arr: '21:00', dur: '6h 30m', fare: 520 },
      { dep: '23:00', arr: '06:30', dur: '7h 30m', fare: 420 },
    ]},
    { from: 'Bangalore', to: 'Chennai',      schedules: [
      { dep: '21:30', arr: '05:00', dur: '7h 30m', fare: 580 },
      { dep: '07:30', arr: '14:00', dur: '6h 30m', fare: 500 },
      { dep: '15:00', arr: '22:00', dur: '7h 00m', fare: 540 },
    ]},
    { from: 'Delhi', to: 'Agra',             schedules: [
      { dep: '06:00', arr: '10:30', dur: '4h 30m', fare: 450 },
      { dep: '09:00', arr: '13:30', dur: '4h 30m', fare: 480 },
      { dep: '14:00', arr: '18:30', dur: '4h 30m', fare: 420 },
    ]},
    { from: 'Agra', to: 'Delhi',             schedules: [
      { dep: '07:00', arr: '11:30', dur: '4h 30m', fare: 450 },
      { dep: '15:00', arr: '19:30', dur: '4h 30m', fare: 420 },
    ]},
    { from: 'Hyderabad', to: 'Vijayawada',   schedules: [
      { dep: '06:00', arr: '11:00', dur: '5h 00m', fare: 380 },
      { dep: '10:00', arr: '15:00', dur: '5h 00m', fare: 420 },
      { dep: '22:00', arr: '03:00', dur: '5h 00m', fare: 350 },
    ]},
    { from: 'Vijayawada', to: 'Hyderabad',   schedules: [
      { dep: '07:00', arr: '12:00', dur: '5h 00m', fare: 380 },
      { dep: '22:00', arr: '03:00', dur: '5h 00m', fare: 350 },
    ]},
    { from: 'Kochi', to: 'Coimbatore',       schedules: [
      { dep: '07:00', arr: '11:30', dur: '4h 30m', fare: 320 },
      { dep: '14:00', arr: '18:30', dur: '4h 30m', fare: 300 },
      { dep: '22:00', arr: '02:30', dur: '4h 30m', fare: 280 },
    ]},
    { from: 'Coimbatore', to: 'Kochi',       schedules: [
      { dep: '08:00', arr: '12:30', dur: '4h 30m', fare: 320 },
      { dep: '21:00', arr: '01:30', dur: '4h 30m', fare: 280 },
    ]},
    { from: 'Jaipur', to: 'Delhi',           schedules: [
      { dep: '06:00', arr: '11:30', dur: '5h 30m', fare: 520 },
      { dep: '14:00', arr: '19:30', dur: '5h 30m', fare: 480 },
      { dep: '22:00', arr: '03:30', dur: '5h 30m', fare: 450 },
    ]},
    { from: 'Delhi', to: 'Jaipur',           schedules: [
      { dep: '07:00', arr: '12:30', dur: '5h 30m', fare: 520 },
      { dep: '22:00', arr: '03:30', dur: '5h 30m', fare: 450 },
    ]},
    { from: 'Bangalore', to: 'Goa',          schedules: [
      { dep: '21:00', arr: '06:00', dur: '9h 00m', fare: 780 },
      { dep: '22:30', arr: '07:30', dur: '9h 00m', fare: 850 },
    ]},
    { from: 'Goa', to: 'Bangalore',          schedules: [
      { dep: '20:00', arr: '05:00', dur: '9h 00m', fare: 780 },
      { dep: '22:00', arr: '07:00', dur: '9h 00m', fare: 850 },
    ]},
    { from: 'Mumbai', to: 'Goa',             schedules: [
      { dep: '21:00', arr: '08:00', dur: '11h 00m', fare: 950 },
      { dep: '22:00', arr: '09:00', dur: '11h 00m', fare: 1050 },
    ]},
    { from: 'Chennai', to: 'Madurai',        schedules: [
      { dep: '22:00', arr: '05:30', dur: '7h 30m', fare: 450 },
      { dep: '07:00', arr: '14:30', dur: '7h 30m', fare: 480 },
    ]},
    { from: 'Madurai', to: 'Chennai',        schedules: [
      { dep: '22:00', arr: '05:30', dur: '7h 30m', fare: 450 },
      { dep: '06:00', arr: '13:30', dur: '7h 30m', fare: 480 },
    ]},
    { from: 'Bangalore', to: 'Mysore',       schedules: [
      { dep: '06:00', arr: '08:30', dur: '2h 30m', fare: 220 },
      { dep: '09:00', arr: '11:30', dur: '2h 30m', fare: 250 },
      { dep: '14:00', arr: '16:30', dur: '2h 30m', fare: 220 },
      { dep: '18:00', arr: '20:30', dur: '2h 30m', fare: 200 },
    ]},
    { from: 'Mysore', to: 'Bangalore',       schedules: [
      { dep: '07:00', arr: '09:30', dur: '2h 30m', fare: 220 },
      { dep: '13:00', arr: '15:30', dur: '2h 30m', fare: 220 },
      { dep: '17:00', arr: '19:30', dur: '2h 30m', fare: 200 },
    ]},
    { from: 'Hyderabad', to: 'Bangalore',    schedules: [] }, // reverse already defined above
    { from: 'Pune', to: 'Goa',              schedules: [
      { dep: '20:00', arr: '06:00', dur: '10h 00m', fare: 750 },
      { dep: '22:00', arr: '08:00', dur: '10h 00m', fare: 800 },
    ]},
  ];

  const busIds = db.prepare('SELECT id FROM buses ORDER BY id').all().map(r => r.id);
  const insertSched = db.prepare(
    'INSERT INTO schedules (busId, fromCity, toCity, departure, arrival, duration, baseFare) VALUES (?,?,?,?,?,?,?)'
  );
  let busIdx = 0;
  routes.forEach(route => {
    if (!route.schedules.length) return;
    route.schedules.forEach(s => {
      const busId = busIds[busIdx % busIds.length];
      insertSched.run(busId, route.from, route.to, s.dep, s.arr, s.dur, s.fare);
      busIdx++;
    });
  });

  console.log('  🌱  Database seeded with real bus & route data!');
}

seedData();

// ── Auth Middleware ─────────────────────────────────────────
function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try {
    req.user = jwt.verify(h.split(' ')[1], JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function genRef() { return 'ZYG' + Date.now().toString().slice(-8); }

// ============================================================
// AUTH ROUTES
// ============================================================

app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, mobile, password } = req.body;
  if (!firstName || !lastName || !email || !mobile || !password)
    return res.status(400).json({ error: 'All fields are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare(
      'INSERT INTO users (firstName, lastName, email, mobile, password) VALUES (?, ?, ?, ?, ?)'
    ).run(firstName, lastName, email, mobile, hash);
    const user = { id: result.lastInsertRowid, firstName, lastName, email, mobile };
    const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
    console.log(`[REGISTER] ${email}`);
    return res.status(201).json({ token, user });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(400).json({ error: 'Email is already registered' });
    return res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ id: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  const safeUser = { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, mobile: user.mobile };
  console.log(`[LOGIN] ${email}`);
  return res.json({ token, user: safeUser });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id,firstName,lastName,email,mobile,createdAt FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// ============================================================
// BUS SEARCH (REAL-TIME)
// ============================================================

// GET /api/search?from=X&to=Y&date=Z
app.get('/api/search', (req, res) => {
  const { from, to, date } = req.query;
  if (!from || !to || !date) return res.status(400).json({ error: 'from, to, and date are required' });

  const schedules = db.prepare(`
    SELECT s.id, s.departure, s.arrival, s.duration, s.baseFare,
           b.operator, b.busType, b.totalSeats, b.amenities, b.rating, b.ratingCount
    FROM schedules s
    JOIN buses b ON s.busId = b.id
    WHERE LOWER(s.fromCity) = LOWER(?) AND LOWER(s.toCity) = LOWER(?)
    ORDER BY s.departure ASC
  `).all(from.trim(), to.trim());

  if (!schedules.length) return res.json([]);

  // For each schedule, count booked seats for this date
  const getBooked = db.prepare(
    'SELECT COUNT(*) as count FROM bookedSeats WHERE scheduleId=? AND travelDate=?'
  );

  const result = schedules.map(s => {
    const booked = getBooked.get(s.id, date).count;
    const seatsLeft = s.totalSeats - booked;
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
      seatsLeft: Math.max(0, seatsLeft),
    };
  });

  return res.json(result);
});

// GET /api/seats?scheduleId=X&date=Y
app.get('/api/seats', (req, res) => {
  const { scheduleId, date } = req.query;
  if (!scheduleId || !date) return res.status(400).json({ error: 'scheduleId and date required' });

  const schedule = db.prepare('SELECT s.*, b.totalSeats FROM schedules s JOIN buses b ON s.busId=b.id WHERE s.id=?').get(scheduleId);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

  const bookedSeats = db.prepare(
    'SELECT seatNumber FROM bookedSeats WHERE scheduleId=? AND travelDate=?'
  ).all(scheduleId, date).map(r => r.seatNumber);

  return res.json({ totalSeats: schedule.totalSeats, bookedSeats });
});

// ============================================================
// BOOKING ROUTES
// ============================================================

app.get('/api/bookings', authMiddleware, (req, res) => {
  const bookings = db.prepare('SELECT * FROM bookings WHERE userId=? ORDER BY createdAt DESC').all(req.user.id);
  return res.json(bookings);
});

app.post('/api/bookings', authMiddleware, (req, res) => {
  const {
    scheduleId, fromCity, toCity, travelDate, operator,
    departure, arrival, duration, busType,
    seats, seatIds, totalFare,
    passengerName, passengerEmail, passengerMobile
  } = req.body;

  if (!fromCity || !toCity || !travelDate || !operator || !totalFare)
    return res.status(400).json({ error: 'Missing required booking fields' });

  const bookingRef = genRef();

  // Save booking
  db.prepare(`
    INSERT INTO bookings
      (userId,bookingRef,scheduleId,fromCity,toCity,travelDate,operator,
       departure,arrival,duration,busType,seats,seatIds,totalFare,
       passengerName,passengerEmail,passengerMobile)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    req.user.id, bookingRef, scheduleId || null, fromCity, toCity, travelDate, operator,
    departure || '', arrival || '', duration || '', busType || '',
    seats || 1, seatIds || '', totalFare,
    passengerName || '', passengerEmail || '', passengerMobile || ''
  );

  // Mark seats as booked in real-time seat map
  if (scheduleId && seatIds) {
    const insertSeat = db.prepare(
      'INSERT OR IGNORE INTO bookedSeats (scheduleId, travelDate, seatNumber, bookingRef) VALUES (?,?,?,?)'
    );
    const seatList = seatIds.split(',').map(s => s.trim()).filter(Boolean);
    seatList.forEach(seat => insertSeat.run(scheduleId, travelDate, seat, bookingRef));
  }

  console.log(`[BOOKING] ${bookingRef} | ${fromCity} → ${toCity} | User #${req.user.id}`);
  return res.status(201).json({ bookingRef, status: 'confirmed' });
});

app.get('/api/bookings/:ref', authMiddleware, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE bookingRef=? AND userId=?').get(req.params.ref, req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  return res.json(booking);
});

app.put('/api/bookings/:ref/cancel', authMiddleware, (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE bookingRef=? AND userId=?').get(req.params.ref, req.user.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });
  if (booking.status === 'completed') return res.status(400).json({ error: 'Completed bookings cannot be cancelled' });

  db.prepare("UPDATE bookings SET status='cancelled' WHERE bookingRef=? AND userId=?")
    .run(req.params.ref, req.user.id);

  // Release seats
  if (booking.scheduleId && booking.seatIds) {
    const seatList = booking.seatIds.split(',').map(s => s.trim()).filter(Boolean);
    const delSeat = db.prepare('DELETE FROM bookedSeats WHERE scheduleId=? AND travelDate=? AND seatNumber=?');
    seatList.forEach(seat => delSeat.run(booking.scheduleId, booking.travelDate, seat));
  }

  console.log(`[CANCEL] ${req.params.ref} – seats released`);
  return res.json({ message: 'Booking cancelled. Refund in 3–5 business days.' });
});

// Health
app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', service: 'ZygoBus API (SQLite)', time: new Date().toISOString() })
);

app.use('/api/*', (req, res) => res.status(404).json({ error: 'Not found' }));
app.get('*', (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log('');
  console.log('  ✅  ZygoBus Real-Time Server is running!');
  console.log(`  🚌  http://localhost:${PORT}`);
  console.log(`  🗄️   SQLite with live seat tracking`);
  console.log('');
});
