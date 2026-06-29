import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const API = 'http://localhost:5000/api';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fname, setFname] = useState('');
  const [lname, setLname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [strength, setStrength] = useState(0);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [errors, setErrors] = useState({});
  const particlesRef = useRef(null);

  // OTP state
  const [step, setStep] = useState('form'); // form | verify-email | verify-phone | done
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [enteredEmailOtp, setEnteredEmailOtp] = useState('');
  const [enteredPhoneOtp, setEnteredPhoneOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  useEffect(() => {
    const container = particlesRef.current;
    if (!container) return;
    const colors = ['#ffa01e','#ffcc70','#ff6b35','#fff0d0','#e8c87a','#ffdd90'];
    const interval = setInterval(() => {
      const el = document.createElement('div');
      const size = Math.random() * 7 + 2;
      const x = Math.random() * 58;
      const dur = Math.random() * 7 + 6;
      const delay = Math.random() * 1;
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

  const checkStrength = (val) => {
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    setStrength(score);
  };

  const getStrengthLabel = () => ['Weak', 'Fair', 'Good', 'Strong'][strength - 1] || '';

  const startCountdown = (seconds = 60) => {
    setCountdown(seconds);
    clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Generate a 6-digit OTP (in production this would be server-side)
  const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

  const validate = () => {
    const errs = {};
    if (!fname.trim()) errs.fname = 'First name is required';
    if (!lname.trim()) errs.lname = 'Last name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^(\+91|0)?[6-9]\d{9}$/.test(phone.replace(/\s/g,''))) errs.phone = 'Enter a valid Indian phone number';
    if (!pw) errs.pw = 'Password is required';
    else if (pw.length < 8) errs.pw = 'Password must be at least 8 characters';
    if (!pw2) errs.pw2 = 'Please confirm your password';
    else if (pw !== pw2) errs.pw2 = 'Passwords do not match';
    if (!agreed) errs.agreed = 'You must accept the Terms & Privacy Policy';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendEmailOtp = async () => {
    if (!validate()) return;
    setOtpSending(true);
    const otp = generateOtp();
    setEmailOtp(otp);
    // In production: POST to API to send email OTP
    // For demo: show OTP in toast
    await new Promise(r => setTimeout(r, 800));
    setStep('verify-email');
    setOtpSending(false);
    startCountdown(60);
    setToast(`Demo OTP for email: ${otp}`);
    setTimeout(() => setToast(''), 8000);
  };

  const handleVerifyEmailOtp = () => {
    if (enteredEmailOtp === emailOtp) {
      setEmailVerified(true);
      const otp = generateOtp();
      setPhoneOtp(otp);
      setStep('verify-phone');
      startCountdown(60);
      setToast(`Demo OTP for phone: ${otp}`);
      setTimeout(() => setToast(''), 8000);
    } else {
      setToast('Incorrect OTP. Please try again.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleVerifyPhoneOtp = () => {
    if (enteredPhoneOtp === phoneOtp) {
      setPhoneVerified(true);
      handleSignup();
    } else {
      setToast('Incorrect OTP. Please try again.');
      setTimeout(() => setToast(''), 3000);
    }
  };

  const handleResendEmailOtp = () => {
    const otp = generateOtp();
    setEmailOtp(otp);
    startCountdown(60);
    setToast(`New OTP for email: ${otp}`);
    setTimeout(() => setToast(''), 8000);
  };

  const handleResendPhoneOtp = () => {
    const otp = generateOtp();
    setPhoneOtp(otp);
    startCountdown(60);
    setToast(`New OTP for phone: ${otp}`);
    setTimeout(() => setToast(''), 8000);
  };

  const handleSignup = async () => {
    setLoading(true);
    try {
      await signup(fname, lname, email, pw);
      setToast('Account created!');
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setToast(err.message || 'Signup failed');
      setStep('form');
      setLoading(false);
    }
  };

  const inputStyle = (field) => ({
    borderColor: errors[field] ? '#e05252' : undefined,
    boxShadow: errors[field] ? '0 0 0 3px rgba(224,82,82,0.12)' : undefined,
  });

  // OTP input boxes
  const OtpInput = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '24px 0' }}>
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          type="text"
          maxLength={1}
          value={value[i] || ''}
          onChange={e => {
            const val = e.target.value.replace(/\D/, '');
            const arr = value.split('');
            arr[i] = val;
            onChange(arr.join(''));
            if (val && e.target.nextSibling) e.target.nextSibling.focus();
          }}
          onKeyDown={e => {
            if (e.key === 'Backspace' && !value[i] && e.target.previousSibling) {
              e.target.previousSibling.focus();
            }
          }}
          style={{
            width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
            border: '1.5px solid #e8e0d5', borderRadius: 10, outline: 'none',
            fontFamily: 'DM Sans, sans-serif', color: '#1a1008', background: '#fff',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#ffa01e'; e.target.style.boxShadow = '0 0 0 3px rgba(255,160,30,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = '#e8e0d5'; e.target.style.boxShadow = 'none'; }}
        />
      ))}
    </div>
  );

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
            <div className="topbar-logo-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M10 2l1.8 5.5H18l-4.9 3.6 1.8 5.5L10 13l-4.9 3.6 1.8-5.5L2 7.5h6.2L10 2z" fill="#ffa01e"/>
              </svg>
            </div>
            <span className="topbar-logo-name">Celeste</span>
          </div>
        </div>

        {/* ── STEP: FORM ── */}
        {step === 'form' && (
          <div className="panel">
            <div className="form-title">Join Celeste</div>
            <div className="form-sub">All fields are required to create your account</div>

            <div className="field-row">
              <div className="field">
                <label>First name</label>
                <input type="text" placeholder="Aria" value={fname} style={inputStyle('fname')}
                  onChange={e => { setFname(e.target.value); setErrors(p => ({...p, fname: ''})); }} />
                {errors.fname && <div className="field-err">{errors.fname}</div>}
              </div>
              <div className="field">
                <label>Last name</label>
                <input type="text" placeholder="Sharma" value={lname} style={inputStyle('lname')}
                  onChange={e => { setLname(e.target.value); setErrors(p => ({...p, lname: ''})); }} />
                {errors.lname && <div className="field-err">{errors.lname}</div>}
              </div>
            </div>

            <div className="field">
              <label>Email address</label>
              <input type="email" placeholder="you@example.com" value={email} style={inputStyle('email')}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({...p, email: ''})); }} />
              {errors.email && <div className="field-err">{errors.email}</div>}
            </div>

            <div className="field">
              <label>Phone number <span style={{ color: '#e05252', fontSize: '0.8em' }}>*</span></label>
              <input type="tel" placeholder="+91 98765 43210" value={phone} style={inputStyle('phone')}
                onChange={e => { setPhone(e.target.value); setErrors(p => ({...p, phone: ''})); }} />
              {errors.phone && <div className="field-err">{errors.phone}</div>}
            </div>

            <div className="field">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} placeholder="Min 8 characters" className="has-icon"
                  value={pw} style={{ ...inputStyle('pw'), width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
                  onChange={e => { setPw(e.target.value); checkStrength(e.target.value); setErrors(p => ({...p, pw: ''})); }} />
                <button className="eye-btn" type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {errors.pw && <div className="field-err">{errors.pw}</div>}
              <div className="strength-wrap">
                <div className="strength-bar">
                  {[1,2,3,4].map(n => <div key={n} className={'strength-seg ' + (strength >= n ? 'lit ' + ['weak','fair','good','strong'][strength - 1] : '')} />)}
                </div>
                <div className="strength-label">{pw ? getStrengthLabel() : ''}</div>
              </div>
            </div>

            <div className="field">
              <label>Confirm password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw2 ? 'text' : 'password'} placeholder="Repeat your password" className="has-icon"
                  value={pw2} style={{ ...inputStyle('pw2'), width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
                  onChange={e => { setPw2(e.target.value); setErrors(p => ({...p, pw2: ''})); }} />
                <button className="eye-btn" type="button" onClick={() => setShowPw2(!showPw2)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>
                  {showPw2 ? '🙈' : '👁'}
                </button>
              </div>
              {errors.pw2 && <div className="field-err">{errors.pw2}</div>}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 9, cursor: 'pointer', fontSize: 13, color: errors.agreed ? '#e05252' : '#9e8e7a', lineHeight: 1.5 }}>
                <input type="checkbox" checked={agreed} onChange={e => { setAgreed(e.target.checked); setErrors(p => ({...p, agreed: ''})); }}
                  style={{ marginTop: 2, accentColor: '#ffa01e', flexShrink: 0 }} />
                <span>I agree to the <a href="#" style={{ color: '#ffa01e', textDecoration: 'none' }}>Terms of Service</a> and <a href="#" style={{ color: '#ffa01e', textDecoration: 'none' }}>Privacy Policy</a>. <span style={{ color: '#e05252' }}>*</span></span>
              </label>
              {errors.agreed && <div className="field-err" style={{ marginTop: 4 }}>{errors.agreed}</div>}
            </div>

            <button className="btn-main" onClick={handleSendEmailOtp} disabled={otpSending}>
              <div className="btn-shine"></div>
              {otpSending ? 'Sending OTP…' : 'Verify & Create Account →'}
            </button>

            <div className="or-row"><span>or</span></div>
            <button className="btn-google" type="button">Sign up with Google</button>
            <div className="switch-text">
              Already have an account? <Link to="/login">Sign in →</Link>
            </div>
          </div>
        )}

        {/* ── STEP: VERIFY EMAIL ── */}
        {step === 'verify-email' && (
          <div className="panel" style={{ justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✉️</div>
              <div className="form-title">Verify your email</div>
              <div className="form-sub">We sent a 6-digit code to<br /><strong style={{ color: '#1a1008' }}>{email}</strong></div>
            </div>

            <OtpInput value={enteredEmailOtp} onChange={setEnteredEmailOtp} />

            <button className="btn-main" onClick={handleVerifyEmailOtp} disabled={enteredEmailOtp.length < 6}>
              <div className="btn-shine"></div>
              Verify Email OTP
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#9e8e7a' }}>
              {countdown > 0
                ? <>Resend in <strong style={{ color: '#ffa01e' }}>{countdown}s</strong></>
                : <button onClick={handleResendEmailOtp} style={{ background: 'none', border: 'none', color: '#ffa01e', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500 }}>Resend OTP</button>
              }
            </div>
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <button onClick={() => setStep('form')} style={{ background: 'none', border: 'none', color: '#9e8e7a', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>← Edit details</button>
            </div>

            {/* Demo notice */}
            <div style={{ marginTop: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', textAlign: 'center' }}>
              <strong>Demo mode:</strong> OTP shown in the toast notification above
            </div>
          </div>
        )}

        {/* ── STEP: VERIFY PHONE ── */}
        {step === 'verify-phone' && (
          <div className="panel" style={{ justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#faeeda', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>📱</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 12, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', borderRadius: 20, padding: '3px 10px' }}>✓ Email verified</span>
              </div>
              <div className="form-title">Verify your phone</div>
              <div className="form-sub">We sent a 6-digit code to<br /><strong style={{ color: '#1a1008' }}>{phone}</strong></div>
            </div>

            <OtpInput value={enteredPhoneOtp} onChange={setEnteredPhoneOtp} />

            <button className="btn-main" onClick={handleVerifyPhoneOtp} disabled={enteredPhoneOtp.length < 6 || loading}>
              <div className="btn-shine"></div>
              {loading ? 'Creating account…' : 'Verify & Finish →'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#9e8e7a' }}>
              {countdown > 0
                ? <>Resend in <strong style={{ color: '#ffa01e' }}>{countdown}s</strong></>
                : <button onClick={handleResendPhoneOtp} style={{ background: 'none', border: 'none', color: '#ffa01e', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500 }}>Resend OTP</button>
              }
            </div>

            {/* Demo notice */}
            <div style={{ marginTop: 20, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400e', textAlign: 'center' }}>
              <strong>Demo mode:</strong> OTP shown in the toast notification above
            </div>
          </div>
        )}
      </div>
    </div>
  );
}