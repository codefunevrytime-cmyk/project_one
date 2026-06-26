import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';

const S = {
  page: {
    minHeight: '100vh', background: '#080c14',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'DM Sans', sans-serif", position: 'relative', overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0, zIndex: 0,
    backgroundImage: `linear-gradient(rgba(56,100,200,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(56,100,200,0.06) 1px, transparent 1px)`,
    backgroundSize: '48px 48px',
  },
  glow: {
    position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
    width: '700px', height: '400px', borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(56,100,220,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative', zIndex: 1,
    width: '100%', maxWidth: 520,
    background: 'rgba(10,15,28,0.85)', backdropFilter: 'blur(20px)',
    border: '1px solid rgba(56,100,220,0.15)', borderRadius: 20,
    padding: '40px 44px', margin: '40px 20px',
    boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
  },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 },
  logoIcon: {
    width: 34, height: 34, borderRadius: 9,
    background: 'linear-gradient(135deg, #2a4aaa, #1a2870)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(76,138,255,0.3)',
  },
  logoText: { fontFamily: "'Cormorant Garamond', serif", fontSize: 19, fontWeight: 400, color: '#e8eef8' },
  logoSub: { fontSize: 10, color: 'rgba(160,180,220,0.4)', letterSpacing: '0.1em' },
  title: { fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#e8eef8', marginBottom: 5 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 28, fontWeight: 300 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.45)', marginBottom: 7 },
  input: {
    width: '100%', background: 'rgba(20,30,60,0.5)',
    border: '1px solid rgba(56,100,220,0.18)', borderRadius: 9,
    padding: '11px 14px', fontSize: 14, color: '#e8eef8',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
  },
  notice: {
    background: 'rgba(56,100,220,0.08)', border: '1px solid rgba(56,100,220,0.2)',
    borderRadius: 10, padding: '12px 16px', marginBottom: 20,
    display: 'flex', gap: 10, alignItems: 'flex-start',
  },
  noticeText: { fontSize: 12, color: 'rgba(160,180,220,0.55)', lineHeight: 1.6 },
  btn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)',
    border: 'none', borderRadius: 10, color: '#e8f0ff',
    fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer', letterSpacing: '0.04em',
    boxShadow: '0 8px 32px rgba(42,74,170,0.4)', marginTop: 4,
  },
  error: {
    background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.3)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8080', marginBottom: 16,
  },
  switchText: { textAlign: 'center', marginTop: 18, fontSize: 13, color: 'rgba(160,180,220,0.35)' },
  switchLink: { color: '#4c8aff', textDecoration: 'none', fontWeight: 500 },
};

const focusIn  = e => { e.target.style.borderColor = 'rgba(76,138,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(76,138,255,0.08)'; };
const focusOut = e => { e.target.style.borderColor = 'rgba(56,100,220,0.18)'; e.target.style.boxShadow = 'none'; };

export default function VendorSignup() {
  const navigate = useNavigate();
  const { signup } = useVendorAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSignup = async () => {
    if (!form.name || !form.email || !form.password) { setError('Name, email and password are required'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true); setError('');
    try {
      await signup(form.name, form.email, form.password, form.phone);
      navigate('/vendor/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.glow} />
      <div style={S.card}>
        <div style={S.logoRow}>
          <div style={S.logoIcon}>
            <svg width="17" height="17" viewBox="0 0 20 20" fill="none">
              <path d="M10 2l1.8 5.5H18l-4.9 3.6 1.8 5.5L10 13l-4.9 3.6 1.8-5.5L2 7.5h6.2L10 2z" fill="#4c8aff"/>
            </svg>
          </div>
          <div>
            <div style={S.logoText}>Lumière</div>
            <div style={S.logoSub}>VENDOR PORTAL</div>
          </div>
        </div>

        <div style={S.title}>Apply as a Vendor</div>
        <div style={S.sub}>Create your account — admin will review and approve</div>

        {error && <div style={S.error}>{error}</div>}

        <div style={S.notice}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="8" cy="8" r="7" stroke="rgba(76,138,255,0.6)" strokeWidth="1.2"/>
            <path d="M8 7v4M8 5.5v.5" stroke="rgba(76,138,255,0.6)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span style={S.noticeText}>
            After signing up your account will be reviewed by our team. You will get full access once approved — usually within 24 hours.
          </span>
        </div>

        <div style={S.row}>
          <div style={S.field}>
            <label style={S.label}>Full name</label>
            <input style={S.input} placeholder="Aryan Mehta" value={form.name} onChange={set('name')} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Phone</label>
            <input style={S.input} placeholder="+91 98765 43210" value={form.phone} onChange={set('phone')} onFocus={focusIn} onBlur={focusOut} />
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Email address</label>
          <input style={S.input} type="email" placeholder="you@studio.com" value={form.email} onChange={set('email')} onFocus={focusIn} onBlur={focusOut} />
        </div>

        <div style={S.row}>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} onFocus={focusIn} onBlur={focusOut} />
          </div>
          <div style={S.field}>
            <label style={S.label}>Confirm password</label>
            <input style={S.input} type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} onFocus={focusIn} onBlur={focusOut} onKeyDown={e => e.key === 'Enter' && handleSignup()} />
          </div>
        </div>

        <button style={{ ...S.btn, opacity: loading ? 0.7 : 1 }} onClick={handleSignup} disabled={loading}>
          {loading ? 'Submitting…' : 'Submit Application'}
        </button>

        <p style={S.switchText}>
          Already have an account? <Link to="/vendor/login" style={S.switchLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}