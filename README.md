# 🚌 ZygoBus – Online Bus Ticket Booking Platform

A modern, full-stack bus ticket booking platform built with vanilla HTML/CSS/JavaScript and a Node.js backend.

## ✨ Features

- 🔍 **Bus Search** – Search buses between 30+ Indian cities with date selection
- 💺 **Seat Selection** – Interactive seat map with available, booked, and ladies seats
- 🎫 **Online Booking** – Full passenger details form with fare summary & coupon codes
- 👤 **User Auth** – Register/Login with JWT authentication (bcrypt password hashing)
- 📋 **My Bookings** – View, filter, and cancel your bookings
- 🏷️ **Offers Page** – Promo codes and discount deals
- ❓ **Help Center** – FAQ and support contact
- 🌙 **Dark Mode UI** – Premium glassmorphism design with smooth animations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | SQLite (better-sqlite3) |
| Auth | JWT + bcryptjs |
| Fonts | Google Fonts (Inter, Outfit) |
| Icons | Font Awesome 6 |

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run

```bash
# Clone the repo
git clone https://github.com/braintubein-sketch/zygobus.git
cd zygobus

# Install server dependencies
cd server
npm install

# Start the backend server
node server.js
```

Then open your browser at **http://localhost:3001**

## 📁 Project Structure

```
zygobus/
├── index.html              # Homepage
├── css/
│   ├── style.css           # Main stylesheet
│   ├── auth.css            # Auth pages styles
│   └── search.css          # Search results styles
├── js/
│   ├── main.js             # Homepage logic
│   └── search.js           # Bus search & seat selection
├── pages/
│   ├── login.html
│   ├── register.html
│   ├── search-results.html
│   ├── booking.html
│   ├── my-bookings.html
│   ├── offers.html
│   └── help.html
├── assets/
│   └── images/
├── server/
│   ├── server.js           # Express + SQLite backend
│   └── package.json
└── .gitignore
```

## 🎟️ Coupon Codes

| Code | Discount |
|------|---------|
| `ZYGO200` | ₹200 off |
| `WKND15` | 15% off (weekend) |
| `STUDENT20` | 20% off |
| `NIGHT50` | ₹50 off |
| `SUMMER25` | 25% off (max ₹300) |
| `REFER100` | ₹100 off |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/bookings` | Get user's bookings |
| POST | `/api/bookings` | Create booking |
| PUT | `/api/bookings/:ref/cancel` | Cancel booking |
| GET | `/api/health` | Health check |

## 📄 License

MIT License — feel free to use and modify.

---

Made with ❤️ in India 🇮🇳
