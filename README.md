# 🚌 ZygoBus – Real-Time Bus Ticket Booking Platform

A full-stack bus ticket booking platform with **real-time seat availability**, live booking, and instant seat locking.

🌐 **Live:** https://zygobus.vercel.app

## ✨ Features

- 🔍 **Live Bus Search** – Real buses fetched from DB for any route & date
- 💺 **Real-Time Seat Map** – See live seat availability; seats lock the moment someone books
- 🎫 **Online Booking** – Full passenger form with fare summary & coupon codes
- 👤 **User Auth** – JWT-based register/login with bcrypt password hashing
- 📋 **My Bookings** – View, filter, and cancel bookings (seats are released on cancel)
- 🏷️ **Offers & Coupons** – ZYGO200, WKND15, STUDENT20, NIGHT50, SUMMER25, REFER100
- ❓ **Help Center** – FAQ and support
- 🌙 **Dark Glassmorphism UI** – Premium design with smooth animations

## 🛠️ Tech Stack

| Layer      | Local Dev                  | Production (Vercel)         |
|------------|----------------------------|-----------------------------|
| Frontend   | HTML5, CSS3, Vanilla JS    | Same (static files)         |
| Backend    | Node.js + Express          | Vercel Serverless Functions |
| Database   | SQLite (better-sqlite3)    | Neon PostgreSQL             |
| Auth       | JWT + bcryptjs             | Same                        |

## 🗄️ Real-Time Data Model

```
buses       → operators, bus types, seat count, amenities, rating
schedules   → routes (from→to), departure/arrival times, fares
bookedSeats → live seat locks per schedule + date (updated on every booking/cancel)
bookings    → full booking records per user
users       → registered accounts
```

## 🚀 Local Development

```bash
git clone https://github.com/braintubein-sketch/zygobus.git
cd zygobus

# Install dependencies
cd server && npm install && cd ..
npm install

# Start local server (SQLite, auto-seeds 20+ routes)
cd server && node server.js
```

Open **http://localhost:3001**

## ☁️ Production Deployment (Vercel + Neon)

```bash
# Set environment variables in Vercel dashboard:
DATABASE_URL=postgresql://...   # Neon connection string
JWT_SECRET=your-secret-key

# Push to GitHub → Vercel auto-deploys
git push origin main
```

## 📡 API Endpoints

| Method | Endpoint                      | Description                    |
|--------|-------------------------------|--------------------------------|
| GET    | `/api/search?from=X&to=Y&date=Z` | Live bus search with seat counts |
| GET    | `/api/seats?scheduleId=X&date=Y` | Real-time seat map              |
| POST   | `/api/auth/register`          | Register                       |
| POST   | `/api/auth/login`             | Login                          |
| GET    | `/api/auth/me`                | Current user                   |
| GET    | `/api/bookings`               | User's bookings                |
| POST   | `/api/bookings`               | Create booking + lock seats    |
| PUT    | `/api/bookings/:ref/cancel`   | Cancel + release seats         |
| GET    | `/api/health`                 | Health check                   |

## 🎟️ Coupon Codes

| Code        | Discount               |
|-------------|------------------------|
| `ZYGO200`   | ₹200 off               |
| `WKND15`    | 15% off                |
| `STUDENT20` | 20% off                |
| `NIGHT50`   | ₹50 off                |
| `SUMMER25`  | 25% off (max ₹300)     |
| `REFER100`  | ₹100 off               |

## 🛣️ Available Routes (20+ pre-seeded)

Bangalore ↔ Hyderabad · Mumbai ↔ Pune · Chennai ↔ Bangalore · Delhi ↔ Agra · Hyderabad ↔ Vijayawada · Kochi ↔ Coimbatore · Jaipur ↔ Delhi · Bangalore ↔ Goa · Mumbai → Goa · Chennai ↔ Madurai · Bangalore ↔ Mysore · Pune → Goa

---

Made with ❤️ in India 🇮🇳
