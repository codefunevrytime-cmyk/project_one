// ── Particles ──
(function initParticles() {
  const colors = ['#ffa01e','#ffcc70','#ff6b35','#fff0d0','#e8c87a','#ffdd90'];
  const container = document.getElementById('particles');
  if (!container) return;
  function makeParticle() {
    const el = document.createElement('div');
    el.className = 'p';
    const size = Math.random() * 7 + 2;
    const x = Math.random() * 58;
    const dur = Math.random() * 7 + 6;
    const delay = Math.random() * 9;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const br = Math.random() > 0.4 ? '50%' : (Math.random() > 0.5 ? '3px' : '0');
    el.style.cssText = `width:${size}px;height:${size}px;left:${x}%;bottom:-10px;background:${color};border-radius:${br};animation-duration:${dur}s;animation-delay:${delay}s;`;
    container.appendChild(el);
    setTimeout(() => el.remove(), (dur + delay) * 1000 + 200);
  }
  for (let i = 0; i < 26; i++) makeParticle();
  setInterval(makeParticle, 650);
})();

// ── Stats counter ──
(function initStats() {
  function countUp(el, target, suffix, ms) {
    let v = 0;
    const step = target / (ms / 16);
    const t = setInterval(() => {
      v = Math.min(v + step, target);
      el.textContent = Math.floor(v) + suffix;
      if (v >= target) clearInterval(t);
    }, 16);
  }
  setTimeout(() => {
    const c1 = document.getElementById('c1');
    const c2 = document.getElementById('c2');
    const c3 = document.getElementById('c3');
    if (c1) countUp(c1, 1200, '+', 1400);
    if (c2) countUp(c2, 840, '+', 1200);
    if (c3) countUp(c3, 32, '', 900);
  }, 600);
})();

// ── Toast ──
function showToast(msg, type = 'success') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3800);
}

// ── Eye toggle ──
const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
const eyeClosed = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>`;

function toggleEye(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  const isText = inp.type === 'text';
  inp.type = isText ? 'password' : 'text';
  btn.querySelector('svg').innerHTML = isText ? eyeOpen : eyeClosed;
  btn.classList.toggle('visible', !isText);
}

// ── Field helpers ──
function setErr(inputId, errId, msg) {
  const inp = document.getElementById(inputId);
  const err = errId ? document.getElementById(errId) : null;
  if (msg) {
    inp.classList.add('err'); inp.classList.remove('ok');
    if (err) err.textContent = msg;
    return true;
  } else {
    inp.classList.remove('err'); inp.classList.add('ok');
    if (err) err.textContent = '';
    return false;
  }
}

function clearField(inputId, errId) {
  const inp = document.getElementById(inputId);
  inp.classList.remove('err', 'ok');
  if (errId) { const err = document.getElementById(errId); if (err) err.textContent = ''; }
}

function shakeInput(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

// ── Validation helpers ──
function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()); }
function isValidPhone(v) { return /^[\+]?[\d\s\-\(\)]{8,15}$/.test(v.trim()); }

// ── Password strength ──
function checkStrength(val, segIds, labelId) {
  const segs = segIds.map(id => document.getElementById(id));
  const label = document.getElementById(labelId);
  segs.forEach(s => { s.className = 'strength-seg'; });
  if (!val) { if (label) label.textContent = ''; return 0; }

  let score = 0;
  const hints = [];
  if (val.length >= 8) score++; else hints.push('8+ characters');
  if (/[A-Z]/.test(val)) score++; else hints.push('uppercase letter');
  if (/[0-9]/.test(val)) score++; else hints.push('a number');
  if (/[^A-Za-z0-9]/.test(val)) score++; else hints.push('special character');

  const levels = ['weak','fair','good','strong'];
  const labels = [
    `Weak — needs: ${hints.slice(0,2).join(', ')}`,
    `Fair — add ${hints[0] || 'more variety'}`,
    'Good — almost there!',
    'Strong password ✓'
  ];
  const lColors = ['#e05252','#f0a030','#60c060','#20a060'];

  for (let i = 0; i < score; i++) {
    segs[i].classList.add(levels[score-1]);
    segs[i].classList.add('lit');
  }
  if (label) {
    label.textContent = labels[score-1] || '';
    label.style.color = lColors[score-1] || '';
  }
  return score;
}

// ── API call helper ──
async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ── Apply server-side errors to fields ──
function applyServerErrors(errors) {
  errors.forEach(e => {
    const path = e.path;
    const fieldMap = {
      email: ['email-input', 'email-err'],
      password: ['pw-input', 'pw-err'],
      confirmPassword: ['pw2-input', 'pw2-err'],
      firstName: ['fname-input', 'fname-err'],
      lastName: ['lname-input', 'lname-err'],
      phone: ['phone-input', 'phone-err'],
    };
    if (fieldMap[path]) {
      setErr(fieldMap[path][0], fieldMap[path][1], e.msg);
      shakeInput(fieldMap[path][0]);
    }
  });
}
