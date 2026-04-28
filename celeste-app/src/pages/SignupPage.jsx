import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/* Signup Page - Split-screen with password strength meter */
export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [strength, setStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const particlesRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const colors = ['#ffa01e','#ffcc70','#ff6b35','#fff0d0','#e8c87a','#ffdd90'];
    const interval = setInterval(() => {
      const el = document.createElement('div');
      const size = Math.random() * 7 + 2;
      const x = Math.random() * 58;
      const dur = Math.random() * 7 + 6;
      const delay = Math.random() * 9;
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = 'position:absolute;border-radius:50%;width:'+size+'px;height:'+size+'px;left:'+x+'%;bottom:-10px;background:'+color+';animation:floatUp '+dur+'s linear '+delay+'s infinite;';
      container.appendChild(el);
      setTimeout(() => el.remove(), (dur + delay) * 1000 + 200);
    }, 650);
    return () => clearInterval(interval);
  }, []);

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

  /* Real-time password strength checker */
  const checkStrength = (val) => {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    setStrength(score);
  };

  const getStrengthLabel = () => {
    const labels = ['Weak', 'Fair', 'Good', 'Strong'];
    return labels[strength - 1] || '';
  };

  const handleSignup = async () => {
    if (!fname || !lname || !email || !pw || pw !== pw2) {
      setToast('Please fill all fields and ensure passwords match');
      return;
    }
    setLoading(true);
    try {
      await signup(fname, lname, email, pw);
      setToast('Account created!');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setToast(err.message || 'Signup failed');
      setLoading(false);
    }
  };

  return (
    <div className="scene-auth">
      <div className="toast" style={{ transform: toast ? 'translateY(0)' : 'translateY(-80px)', opacity: toast ? 1 : 0 }}>{toast}</div>
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

      <div className="panel-wrap">
        <div className="panel-topbar">
          <Link to="/login" className="back-btn">&larr; Back</Link>
          <div className="topbar-logo">
            <div className="topbar-logo-icon"><svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2l1.8 5.5H18l-4.9 3.6 1.8 5.5L10 13l-4.9 3.6 1.8-5.5L2 7.5h6.2L10 2z" fill="#ffa01e"/></svg></div>
            <span className="topbar-logo-name">Celeste</span>
          </div>
        </div>
        <div className="panel">
          <div className="form-title">Join Celeste</div>
          <div className="form-sub">Start planning extraordinary events today</div>

          <div className="field-row">
            <div className="field"><label>First name</label><input type="text" placeholder="Aria" value={fname} onChange={(e) => setFname(e.target.value)} /></div>
            <div className="field"><label>Last name</label><input type="text" placeholder="Sharma" value={lname} onChange={(e) => setLname(e.target.value)} /></div>
          </div>
          <div className="field"><label>Email address</label><input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="field">
            <label>Password</label>
            <input type={showPw ? 'text' : 'password'} placeholder="Create a strong password" className="has-icon" value={pw} onChange={(e) => { setPw(e.target.value); checkStrength(e.target.value); }} />
            <button className="eye-btn" type="button" onClick={() => setShowPw(!showPw)}>{showPw ? '🙈' : '👁'}</button>
            <div className="strength-wrap">
              <div className="strength-bar">
                {[1,2,3,4].map((n) => <div key={n} className={'strength-seg ' + (strength >= n ? 'lit ' + ['weak','fair','good','strong'][strength - 1] : '')} />)}
              </div>
              <div className="strength-label">{pw ? getStrengthLabel() : ''}</div>
            </div>
          </div>
          <div className="field">
            <label>Confirm password</label>
            <input type={showPw2 ? 'text' : 'password'} placeholder="Repeat your password" className="has-icon" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <button className="eye-btn" type="button" onClick={() => setShowPw2(!showPw2)}>{showPw2 ? '🙈' : '👁'}</button>
          </div>
          <div className="terms"><input type="checkbox" /><span>I agree to the Terms of Service and Privacy Policy.</span></div>
          <button className="btn-main" onClick={handleSignup} disabled={loading}>
            <div className="btn-shine"></div>
            {loading ? 'Creating account...' : 'Create My Account'}
          </button>
          <div className="or-row"><span>or</span></div>
          <button className="btn-google" type="button">Sign up with Google</button>
          <div className="switch-text">
            Already have an account? <Link to="/login">Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

