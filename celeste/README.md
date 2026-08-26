# Céleste — Event Planning Studio

A polished login/signup system built with **Node.js + Express**.

## 📁 Project Structure

```
celeste/
├── server.js              ← Express app entry point
├── package.json
├── routes/
│   └── auth.js            ← All API routes + session logic
└── public/
    ├── login.html         ← Login page
    ├── signup.html        ← Signup page (no scroll needed)
    ├── dashboard.html     ← Post-login dashboard
    ├── css/
    │   └── lo.css         ← Shared styles
    └── js/
        └── shared.js      ← Shared JS (particles, validation, toast, eye toggle)
```

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the server
npm start

# 3. Open in browser
http://localhost:3000
```

For development with auto-reload:
```bash
npm run dev
```

## ✅ Features

- **Login** — email + password with server-side validation
- **Signup** — all fields fit on screen without scrolling
- **Password visibility toggle** — eye icon on both password fields
- **Confirm password** — live matching check as you type
- **Password strength meter** — 4-segment animated bar with contextual hints
- **Form validation** — client-side (instant) + server-side (authoritative)
- **Shake animation** — invalid fields shake on submit
- **Toast notifications** — success/error slide in from top-right
- **Session management** — express-session with "remember me" support
- **Protected routes** — `/dashboard` requires login
- **Bcrypt** — passwords hashed with 12 salt rounds

## 🗄️ Database

Currently uses an **in-memory Map** for simplicity. To use a real database:

1. Install your driver: `npm install mongoose` (MongoDB) or `pg` (PostgreSQL)
2. Replace the `users` Map in `routes/auth.js` with DB calls
3. Add a `.env` file with your `DATABASE_URL`

## 🔒 Security Notes

- Change `secret` in `server.js` session config to a long random string in production
- Add HTTPS in production (`helmet`, `express-rate-limit` recommended)
- The in-memory store resets on server restart — use a real DB for persistence
