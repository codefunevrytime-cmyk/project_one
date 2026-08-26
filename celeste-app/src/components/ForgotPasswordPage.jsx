import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

/* Forgot Password Page - Same split-screen layout as LoginPage */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (!email) { setToast('Email is required'); return; }
    setLoading(true);
    setToast('');
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Something went wrong');
      setSent(true);
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

        {sent ? (
          <div className="panel">
            <div className="form-title">Check your email</div>
            <div className="form-sub">If that email is registered, we've sent a reset link. It expires in 1 hour.</div>
            <div className="switch-text">
              <Link to="/login">&larr; Back to sign in</Link>
            </div>
          </div>
        ) : (
          <div className="panel">
            <div className="form-title">Reset your password</div>
            <div className="form-sub">Enter your email and we'll send you a reset link</div>
            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="btn-main" onClick={handleSubmit} disabled={loading}>
              <div className="btn-shine"></div>
              {loading ? 'Sending...' : 'Send reset link'}
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