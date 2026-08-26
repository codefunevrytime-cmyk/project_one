import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

/* Reset Password Page - Same split-screen layout as LoginPage */
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [toast, setToast] = useState('');
  const particlesRef = useRef(null);

  /* Particle animation effect */
  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const colors = ['#ffa01e', '#ffcc70', '#ff6b35', '#fff0d0', '#e8c87a', '#ffdd90'];
    const interval = setInterval(() => {
      const el = document.createElement('div');
      const size = Math.random() * 7 + 2;
      const x = Math.random() * 58;
      const dur = Math.random() * 7 + 6;
      const delay = Math.random() * 1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText =
        'position:absolute;border-radius:50%;width:' + size + 'px;height:' + size + 'px;left:' + x +
        '%;bottom:-10px;background:' + color + ';animation:floatUp ' + dur + 's linear ' + delay + 's infinite;';
      container.appendChild(el);
      setTimeout(() => el.remove(), (dur + delay) * 1000 + 200);
    }, 650);
    return () => clearInterval(interval);
  }, []);

  /* Stats counter animation */
  useEffect(() => {
    const countUp = (id, target, suffix, ms) => {
      const el = document.getElementById(id);
      if (!el) return;
      let v = 0;
      const step = target / (ms / 16);
      const t = setInterval(() => {
        v = Math.min(v + step, target);
        el.textContent = Math.floor(v) + suffix;
        if (v >= target) clearInterval(t);
      }, 16);
    };
    const timer = setTimeout(() => {
      countUp('c1', 1200, '+', 1400);
      countUp('c2', 840, '+', 1200);
      countUp('c3', 32, '', 900);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async () => {
    if (!token) { setToast('Reset link is invalid or missing a token'); return; }
    if (!pw) { setToast('Password is required'); return; }
    if (pw.length < 8) { setToast('Password must be at least 8 characters'); return; }
    if (pw !== confirmPw) { setToast('Passwords do not match'); return; }

    setLoading(true);
    setToast('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pw }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Something went wrong');
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setToast(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scene-auth">
      <div className="toast" style={{ transform: toast ? 'translateY(0)' : 'translateY(-80px)', opacity: toast ? 1 : 0 }}>{toast}</div>

      {/* Left panel with animations — identical to LoginPage */}
      <div className="left">
        <div className="l-bg"></div>
        <div className="orb orb1"></div>
        <div className="orb orb2"></div>
        <div className="orb orb3"></div>
        <div className="scan-line"></div>
        <div className="particles" ref={particlesRef}></div>
        <div className="l-inner">
          <div className="badge"><div className="badge-dot"></div>Event Planning Studio</div>
          <div className="l-title">Make every<br />moment <em>unforgettable.</em></div>
          <div className="l-sub">Plan, manage, and celebrate every event with elegance.</div>
          <div className="stats">
            <div><div className="stat-num" id="c1">0+</div><div className="stat-lbl">Events Hosted</div></div>
            <div><div className="stat-num" id="c2">0+</div><div className="stat-lbl">Happy Clients</div></div>
            <div><div className="stat-num" id="c3">0</div><div className="stat-lbl">Cities</div></div>
          </div>
        </div>
      </div>

      {/* Right panel with form */}
      <div className="panel-wrap">
        <div className="panel-topbar">
          <Link to="/" className="back-btn">&larr; Home</Link>
          <div className="topbar-logo">
            <div className="topbar-logo-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l1.8 5.5H18l-4.9 3.6 1.8 5.5L10 13l-4.9 3.6 1.8-5.5L2 7.5h6.2L10 2z" fill="#ffa01e" /></svg></div>
            <span className="topbar-logo-name">Celeste</span>
          </div>
        </div>

        {done ? (
          <div className="panel">
            <div className="form-title">Password updated</div>
            <div className="form-sub">Your password has been reset. Redirecting you to sign in...</div>
            <div className="switch-text">
              <Link to="/login">&larr; Back to sign in</Link>
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="form-title">Set a new password</div>
            <div className="form-sub">Choose a new password for your account</div>
            <div className="field">
              <label>New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="has-icon"
                  style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
                />
                <button
                  className="eye-btn"
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>
            <button className="btn-main" onClick={handleSubmit} disabled={loading}>
              <div className="btn-shine"></div>
              {loading ? 'Updating...' : 'Reset password'}
            </button>
            <div className="switch-text">
              <Link to="/login">&larr; Back to sign in</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}