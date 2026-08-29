// src/lib/socket.js
//
// Single shared socket instance for the whole app. Both MyEvents (client)
// and AdminEventRequests (admin) import getSocket() from here — they'll
// share the same connection if both are mounted, but each listens for
// its own event names/payloads.

import { io } from "socket.io-client";
import { API_BASE } from "../config/api";

// Mirrors API_BASE's own dev/prod split:
//   - dev:  API_BASE is '' → connect to the current origin (localhost:5173),
//           and Vite's dev proxy forwards the /socket.io handshake (incl.
//           the WebSocket upgrade) to the backend on localhost:5000. This
//           needs a matching proxy rule in vite.config.js — see below.
//   - prod: API_BASE is the real backend URL → connect straight to it.
const SOCKET_URL = API_BASE;

let socket = null;

// server.js reads socket.handshake.auth.token and expects one of three
// JWT shapes: { id, role } for client/admin tokens (routes/auth.js) or
// { vendorUserId } for vendor tokens (routes/vendorAuth.js). This app
// stores the active JWT under the single key "celeste_token" regardless
// of which login flow (client/admin/vendor) produced it.
function getStoredToken() {
  return localStorage.getItem("celeste_token") || null;
}

export function getSocket() {
  if (socket) return socket;

  const token = getStoredToken();

  console.log("[socket] connecting to", SOCKET_URL || "(same origin, via Vite proxy)");
  console.log("[socket] auth token present:", Boolean(token));

  socket = io(SOCKET_URL || undefined, {
    withCredentials: true,
    transports: ["websocket", "polling"], // polling as fallback if ws blocked (some ngrok/proxy setups)
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    auth: { token }, // ← server.js reads this via socket.handshake.auth.token
  });

  socket.on("connect", () => {
    console.log("[socket] connected! id =", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("[socket] connect_error:", err.message);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[socket] disconnected:", reason);
  });

  return socket;
}

// Call this on logout so the next login gets a fresh authed connection.
// IMPORTANT: after a login/logout that changes the token, you must call
// disconnectSocket() before the next getSocket() — the module caches
// `socket` in memory, so simply calling getSocket() again after a token
// change will keep returning the OLD connection with the OLD token.
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}