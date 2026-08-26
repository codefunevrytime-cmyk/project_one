// In dev, use a relative path so requests go through Vite's proxy
// (no second ngrok tunnel needed). In production, use the real API URL.
export const API_BASE = import.meta.env.PROD 
  ? (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  : '';

export const API_URL = `${API_BASE}/api`;

// Uploaded images (gallery photos, reference images etc.) also live on
// the backend, served at /uploads. Same pattern as API_BASE — relative
// in dev (goes through Vite proxy), real backend URL in production.
export const UPLOADS_URL = `${API_BASE}/uploads`;