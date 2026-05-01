import { useState } from 'react';

export default function AdminLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      console.log('Attempting login...');
      const res = await fetch('http://localhost:5000/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      console.log('Response status:', res.status);
      const data = await res.json();
      console.log('Response data:', data);
      if (data.token) {
        onLogin(data.token);
      } else {
        setError(data.error || 'Invalid email or password');
      }
    } catch (err) {
      console.error('Full error:', err);
      setError('Error: ' + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: '#f7f5f2', fontFamily: 'DM Sans, sans-serif'
    }}>
      <div style={{
        background: '#fff', padding: '48px 40px',
        borderRadius: 16, border: '1px solid #e8e0d5',
        width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.08)'
      }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, color: '#1a1008', marginBottom: 6 }}>
            Admin Panel
          </h1>
          <p style={{ fontSize: 13, color: '#9e8e7a' }}>Lumière Visual Studio</p>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            placeholder="admin@lumiere.com"
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            placeholder="••••••••"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: '12px', background: '#1a1008',
            color: '#ffa01e', border: 'none', borderRadius: 10,
            fontSize: 14, fontFamily: 'inherit', fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}