// Shared API configuration
// Use VITE_API_URL environment variable if set, otherwise fallback to localhost
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Full API URL with /api prefix (for endpoints that don't include it)
export const API_URL = `${API_BASE}/api`;
