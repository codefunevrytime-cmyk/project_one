import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';

const S = {
  page: {
    minHeight: '100vh',
    background: '#080c14',
    display: 'flex',
    fontFamily: "'DM Sans', sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0, zIndex: 0,
    backgroundImage: `
      linear-gradient(rgba(56,100,200,0.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(56,100,200,0.06) 1px, transparent 1px)
    `,
    backgroundSize: '48px 48px',
  },
  glow1: {
    position: 'absolute', top: '-20%', left: '-10%',
    width: '600px', height: '600px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(56,100,220,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  glow2: {
    position: 'absolute', bottom: '-20%', right: '-10%',
    width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(100,60,200,0.1) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  left: {
    flex: 1, display: 'flex', flexDirection: 'column',
    justifyContent: 'center', padding: '60px 80px',
    position: 'relative', zIndex: 1,
  },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(56,100,220,0.12)', border: '1px solid rgba(56,100,220,0.3)',
    borderRadius: 24, padding: '6px 14px', marginBottom: 40, width: 'fit-content',
  },
  badgeDot: {
    width: 7, height: 7, borderRadius: '50%', background: '#4c8aff',
    boxShadow: '0 0 8px #4c8aff',
  },
  badgeText: { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#4c8aff' },
  heading: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 'clamp(2.4rem, 4vw, 4rem)',
    fontWeight: 300, color: '#e8eef8', lineHeight: 1.1,
    marginBottom: 20, letterSpacing: '-0.02em',
  },
  headingEm: { fontStyle: 'italic', color: '#4c8aff' },
  sub: {
    fontSize: 15, color: 'rgba(160,180,220,0.6)',
    lineHeight: 1.75, maxWidth: 380, marginBottom: 56, fontWeight: 300,
  },
  statsRow: { display: 'flex', gap: 40 },
  stat: {},
  statNum: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 34, fontWeight: 300, color: '#e8eef8', lineHeight: 1,
  },
  statLabel: { fontSize: 11, color: 'rgba(160,180,220,0.45)', marginTop: 5, letterSpacing: '0.08em' },
  dividerV: { width: 1, background: 'rgba(56,100,220,0.18)', margin: '0 0' },

  right: {
    width: 480, flexShrink: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '40px 48px',
    position: 'relative', zIndex: 1,
    borderLeft: '1px solid rgba(56,100,220,0.12)',
    background: 'rgba(10,15,28,0.6)', backdropFilter: 'blur(20px)',
  },
  form: { width: '100%' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 },
  logoIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: 'linear-gradient(135deg, #2a4aaa, #1a2870)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid rgba(76,138,255,0.3)',
  },
  logoText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20, fontWeight: 400, color: '#e8eef8', letterSpacing: '-0.01em',
  },
  logoSub: { fontSize: 11, color: 'rgba(160,180,220,0.4)', marginTop: 1, letterSpacing: '0.1em' },
  formTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26, fontWeight: 400, color: '#e8eef8', marginBottom: 6,
  },
  formSub: { fontSize: 13, color: 'rgba(160,180,220,0.45)', marginBottom: 32, fontWeight: 300 },
  field: { marginBottom: 18 },
  label: {
    display: 'block', fontSize: 11, letterSpacing: '0.12em',
    textTransform: 'uppercase', color: 'rgba(160,180,220,0.5)', marginBottom: 8,
  },
  input: {
    width: '100%', background: 'rgba(20,30,60,0.6)',
    border: '1px solid rgba(56,100,220,0.2)', borderRadius: 10,
    padding: '12px 16px', fontSize: 14, color: '#e8eef8',
    fontFamily: "'DM Sans', sans-serif", outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
  },
  btn: {
    width: '100%', padding: '13px',
    background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)',
    border: 'none', borderRadius: 10, color: '#e8f0ff',
    fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer', transition: 'opacity 0.2s, transform 0.15s',
    marginTop: 8, letterSpacing: '0.04em',
    boxShadow: '0 8px 32px rgba(42,74,170,0.4)',
  },
  error: {
    background: 'rgba(220,60,60,0.12)', border: '1px solid rgba(220,60,60,0.3)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ff8080',
    marginBottom: 16,
  },
  switchText: {
    textAlign: 'center', marginTop: 20, fontSize: 13,
    color: 'rgba(160,180,220,0.4)',
  },
  switchLink: { color: '#4c8aff', textDecoration: 'none', fontWeight: 500 },
  mainSiteLink: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginTop: 32, paddingTop: 24,
    borderTop: '1px solid rgba(56,100,220,0.1)',
    fontSize: 12, color: 'rgba(160,180,220,0.3)',
    textDecoration: 'none', transition: 'color 0.2s',
  },
};

export default function VendorLogin() {
  const navigate = useNavigate();
  const { login } = useVendorAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill all fields'); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
      navigate('/vendor/dashboard');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.glow1} />
      <div style={S.glow2} />

      {/* Left panel */}
      <div style={S.left}>
        <div style={S.badge}>
          <span style={S.badgeDot} />
          <span style={S.badgeText}>Vendor Portal</span>
        </div>

        <h1 style={S.heading}>
          Your work,<br />
          <em style={S.headingEm}>your clients.</em>
        </h1>

        <p style={S.sub}>
          Manage your profile, portfolio, pricing and client enquiries — all in one place built for professionals.
        </p>

        <div style={S.statsRow}>
          {[['120+', 'Active Vendors'], ['4.8★', 'Avg Rating'], ['₹2Cr+', 'Bookings Processed']].map(([num, label], i) => (
            <>
              {i > 0 && <div key={`div-${i}`} style={S.dividerV} />}
              <div key={label} style={S.stat}>
                <div style={S.statNum}>{num}</div>
                <div style={S.statLabel}>{label}</div>
              </div>
            </>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div style={S.right}>
        <div style={S.form}>
          <div style={S.logoRow}>
            <div style={S.logoIcon}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 2l1.8 5.5H18l-4.9 3.6 1.8 5.5L10 13l-4.9 3.6 1.8-5.5L2 7.5h6.2L10 2z" fill="#4c8aff"/>
              </svg>
            </div>
            <div>
              <div style={S.logoText}>Lumière</div>
              <div style={S.logoSub}>VENDOR PORTAL</div>
            </div>
          </div>

          <div style={S.formTitle}>Sign in</div>
          <div style={S.formSub}>Access your vendor dashboard</div>

          {error && <div style={S.error}>{error}</div>}

          <div style={S.field}>
            <label style={S.label}>Email address</label>
            <input
              style={S.input}
              type="email"
              placeholder="you@studio.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={e => { e.target.style.borderColor = 'rgba(76,138,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(76,138,255,0.08)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(56,100,220,0.2)'; e.target.style.boxShadow = 'none'; }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div style={S.field}>
            <label style={S.label}>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                style={{ ...S.input, paddingRight: 44 }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={e => { e.target.style.borderColor = 'rgba(76,138,255,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(76,138,255,0.08)'; }}
                onBlur={e => { e.target.style.borderColor = 'rgba(56,100,220,0.2)'; e.target.style.boxShadow = 'none'; }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(160,180,220,0.4)', fontSize: 14 }}
              >
                {showPw ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            style={{ ...S.btn, opacity: loading ? 0.7 : 1 }}
            onClick={handleLogin}
            disabled={loading}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = loading ? '0.7' : '1'; }}
          >
            {loading ? 'Signing in…' : 'Sign in to Portal'}
          </button>

          <p style={S.switchText}>
            New vendor?{' '}
            <Link to="/vendor/signup" style={S.switchLink}>Apply for access →</Link>
          </p>

          <a href="/" target="_blank" rel="noopener noreferrer" style={S.mainSiteLink}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(160,180,220,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(160,180,220,0.3)'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13z"/>
              <path d="M8 1.5c-2 0-3.5 2.9-3.5 6.5s1.5 6.5 3.5 6.5 3.5-2.9 3.5-6.5S10 1.5 8 1.5z"/>
              <path d="M1.5 8h13"/>
            </svg>
            Back to main site
          </a>
        </div>
      </div>
    </div>
  );
}
