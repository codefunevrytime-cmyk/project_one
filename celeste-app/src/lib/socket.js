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
//           the WebSocket upgrade) to the backend on localhost:5000.
//   - prod: API_BASE is the real backend URL → connect straight to it.
const SOCKET_URL = API_BASE;

let socket = null;
let currentToken = null;
// Token the current connection actually handshook with, so we can detect
// a login/logout that happened after the socket was created.
let connectedWithToken = null;

// server.js reads socket.handshake.auth.token and expects one of three
// JWT shapes: { id, role } for client/admin tokens (routes/auth.js) or
// { vendorUserId } for vendor tokens (routes/vendorAuth.js). This app
// keeps the active JWT in AuthContext memory, so socket.js receives it
// through this setter regardless of which login flow produced it.
export function setSocketToken(token) {
  currentToken = token || null;
}

function getStoredToken() {
  return currentToken;
}

export function getSocket() {
  const token = getStoredToken();

  // A socket exists but was authed with a different (or no) token —
  // tear it down so the caller gets a correctly authed connection.
  if (socket && connectedWithToken !== token) {
    console.warn(
      "[socket] token changed since connect — reconnecting with new auth"
    );
    socket.disconnect();
    socket = null;
  }

  if (socket) return socket;

  console.log(
    "[socket] connecting to",
    SOCKET_URL || "(same origin, via Vite proxy)"
  );
  console.log("[socket] auth token present:", Boolean(token));

  socket = io(SOCKET_URL || undefined, {
    withCredentials: true,
    transports: ["websocket", "polling"], // polling as fallback if ws blocked (some ngrok/proxy setups)
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
    // Callback form: re-read from localStorage on every connect AND every
    // reconnect, so the handshake never carries a stale/null token.
    auth: (cb) => {
      const fresh = getStoredToken();
      connectedWithToken = fresh;
      console.log("[socket] handshake auth token present:", Boolean(fresh));
      cb({ token: fresh });
    },
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

// Call after a successful login so the connection is re-established with
// the new JWT. Safe to call even if no socket exists yet.
export function reauthSocket() {
  disconnectSocket();
  return getSocket();
}

// Call this on logout so the next login gets a fresh authed connection.
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectedWithToken = null;
  }
}