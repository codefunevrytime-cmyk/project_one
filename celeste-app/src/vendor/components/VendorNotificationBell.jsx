// celeste-app/src/vendor/components/VendorNotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';

import { API_URL } from '../../config/api';
import { vendorFetch } from '../../lib/vendorApi';

const API = API_URL;
const POLL_MS = 12000;

const TYPE_META = {
  event_req: { icon: '📅', color: '#4c8aff', label: 'Event Request' },
  message:   { icon: '✉️', color: '#5fcf7a', label: 'Message' },
  review:    { icon: '⭐', color: '#d4a843', label: 'Review' },
  payout:    { icon: '💰', color: '#5fcf7a', label: 'Payout' },
  deposit:   { icon: '🛡', color: '#a78bfa', label: 'Deposit' },
};

// Ledger entry type -> notification copy. Mirrors LEDGER_META in
// VendorDeposit.jsx so the wording matches what the vendor sees once they
// click through to the deposit history.
const DEPOSIT_LEDGER_META = {
  initial_deposit:   { title: 'Initial deposit collected' },
  monthly_shortfall: { title: 'Monthly settlement deducted' },
  topup:             { title: 'Deposit topped up' },
  refund:            { title: 'Deposit refunded' },
  adjustment:        { title: 'Deposit adjustment' },
};

function fmtRupees(paise) {
  return Number(Math.abs(paise || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

async function safeJson(url, opts) {
  try {
    const res = await vendorFetch(url, opts);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

// Deposit endpoint returns a single object ({ ledger: [...] }), not an
// array — separate helper so a missing/failed fetch never throws.
async function safeDepositLedger(url, opts) {
  try {
    const res = await vendorFetch(url, opts);
    const data = await res.json();
    return Array.isArray(data?.ledger) ? data.ledger : [];
  } catch {
    return [];
  }
}

// Payouts endpoint returns { payouts: [...], pending_total, ... }, not a
// bare array — same reasoning as safeDepositLedger above.
async function safePayouts(url, opts) {
  try {
    const res = await vendorFetch(url, opts);
    const data = await res.json();
    return Array.isArray(data?.payouts) ? data.payouts : [];
  } catch {
    return [];
  }
}

const notificationAudio = typeof Audio !== 'undefined'
  ? new Audio('/sounds/mixkit-magic-notification-ring-2344.wav')
  : null;

function playBellSound() {
  if (!notificationAudio) return;
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.volume = 0.55;
    notificationAudio.play().catch(() => {});
  } catch {
    // Ignore playback errors.
  }
}

export default function VendorNotificationBell() {
  const { vendorUser } = useVendorAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [bump, setBump] = useState(0);
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('vnd_notif_read') || '[]')); }
    catch { return new Set(); }
  });
  const prevCountRef = useRef(0);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // Warm up audio on first click so the first real play() isn't blocked
  useEffect(() => {
    const unlock = () => {
      notificationAudio?.play().then(() => {
        notificationAudio.pause();
        notificationAudio.currentTime = 0;
      }).catch(() => {});
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('click', unlock);
    return () => document.removeEventListener('click', unlock);
  }, []);

  const persistRead = (set) => {
    localStorage.setItem('vnd_notif_read', JSON.stringify([...set]));
  };

  const fetchAll = useCallback(async () => {
    const vendorId = vendorUser?.vendor_id;

    const [eventReqs, convos, reviews, payoutData, depositLedger] = await Promise.all([
      safeJson(`${API}/events/vendor/requests`),
      safeJson(`${API}/messages/vendor`),
      vendorId
        ? safeJson(`${API}/reviews?all=true&vendor_id=${vendorId}`)
        : Promise.resolve([]),
      safePayouts(`${API}/vendor-payouts/vendor`),
      vendorId
        ? safeDepositLedger(`${API}/payments/deposit/${vendorId}`)
        : Promise.resolve([]),
    ]);

    const list = [];

    // Pending event requests awaiting this vendor's response
    eventReqs.filter(r => !r.status || r.status === 'pending').forEach(r => {
      list.push({
        id: `event_req_${r.id}`,
        type: 'event_req',
        title: 'New event request',
        desc: `${r.event_name || r.event_type || 'Event'} · ₹${(r.quoted_price || 0).toLocaleString('en-IN')}`,
        time: r.created_at,
        onClick: () => navigate('/vendor/event-requests'),
      });
    });

    // Conversations with unread client messages
    convos.filter(c => Number(c.unread_count) > 0).forEach(c => {
      list.push({
        id: `message_${c.id}`,
        type: 'message',
        title: `${c.unread_count} new message${c.unread_count > 1 ? 's' : ''}`,
        desc: `From ${c.client_name}: "${(c.last_message || '').slice(0, 60)}"`,
        time: c.updated_at,
        onClick: () => navigate('/vendor/messages'),
      });
    });

    // Recent reviews left for this vendor (approved or pending admin approval)
    reviews.slice(0, 15).forEach(r => {
      list.push({
        id: `review_${r.id}`,
        type: 'review',
        title: r.approved ? 'New review received' : 'New review — pending approval',
        desc: `${r.client_name} left a ${r.rating}★ review: "${(r.message || '').slice(0, 60)}${r.message?.length > 60 ? '…' : ''}"`,
        time: r.created_at,
        onClick: () => navigate('/vendor/reviews'),
      });
    });

    // Payouts admin has marked as paid — real money received.
    payoutData.filter(p => p.status === 'paid').forEach(p => {
      list.push({
        id: `payout_${p.id}`,
        type: 'payout',
        title: 'Payout received',
        desc: `₹${(Number(p.amount) / 100).toLocaleString('en-IN')} for ${p.event_name || 'an event'}${p.reference_note ? ` · Ref: ${p.reference_note}` : ''}`,
        time: p.paid_at || p.updated_at || p.created_at,
        onClick: () => navigate('/vendor/earnings'),
      });
    });

    // Security deposit ledger — top-ups, monthly settlement deductions,
    // refunds, initial collection. All represent real money moving in or
    // out of the vendor's deposit balance.
    depositLedger.forEach(row => {
      const meta = DEPOSIT_LEDGER_META[row.type];
      if (!meta) return;
      const amt = Number(row.amount_paise) / 100;
      list.push({
        id: `deposit_${row.id}`,
        type: 'deposit',
        title: meta.title,
        desc: amt === 0
          ? (row.notes || 'No balance change')
          : `${amt > 0 ? '+' : '−'}₹${fmtRupees(row.amount_paise)}${row.month ? ` · ${row.month}` : ''}${row.notes ? ` — ${row.notes}` : ''}`,
        time: row.created_at,
        onClick: () => navigate('/vendor/deposit'),
      });
    });

    list.sort((a, b) => new Date(b.time) - new Date(a.time));
    return list;
  }, [vendorUser, navigate]);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      const list = await fetchAll();
      if (cancelled) return;

      const unreadCount = list.filter(i => !readIds.has(i.id)).length;

      if (unreadCount > prevCountRef.current) {
        const delta = unreadCount - prevCountRef.current;
        setRinging(true);
        setBump(delta);
        playBellSound();
        setTimeout(() => setRinging(false), 900);
        setTimeout(() => setBump(0), 3000);
      }
      prevCountRef.current = unreadCount;
      setItems(list);
    };

    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAll]);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unread = items.filter(i => !readIds.has(i.id));

  const markRead = (id) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistRead(next);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds(prev => {
      const next = new Set(prev);
      items.forEach(i => next.add(i.id));
      persistRead(next);
      return next;
    });
  };

  const handleItemClick = (item) => {
    markRead(item.id);
    setOpen(false);
    if (item.onClick) item.onClick();
  };

  return (
    <div style={{ position: 'relative' }}>
      {bump > 0 && (
        <div style={{
          position: 'absolute', top: -8, right: -6,
          background: '#fc424a', color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(252,66,74,0.4)',
          animation: 'vnbPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1), vnbPopOut 0.3s ease 2.5s forwards',
          zIndex: 20,
        }}>
          +{bump} New
        </div>
      )}

      <button
        ref={bellRef}
        onClick={() => setOpen(v => !v)}
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: open ? 'rgba(56,100,220,0.22)' : 'rgba(56,100,220,0.1)',
          border: '1px solid rgba(56,100,220,0.2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#8ab0ff', position: 'relative',
          transformOrigin: '50% 0%',
          animation: ringing ? 'vnbBellRing 0.7s ease' : 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#fc424a', color: '#fff', fontSize: 9.5, fontWeight: 700,
            minWidth: 16, height: 16, borderRadius: 8, padding: '0 3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #080c14',
          }}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} style={{
          position: 'absolute', top: 46, right: 0, width: 360,
          background: 'rgba(10,15,28,0.98)', backdropFilter: 'blur(20px)',
          borderRadius: 12, border: '1px solid rgba(56,100,220,0.2)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          zIndex: 100, overflow: 'hidden',
          animation: 'vnbDropIn 0.18s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid rgba(56,100,220,0.1)',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#e8eef8' }}>Notifications</span>
            {unread.length > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: '#4c8aff', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(160,180,220,0.35)', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : items.map(item => {
              const meta = TYPE_META[item.type];
              const isUnread = !readIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    width: '100%', display: 'flex', gap: 12, padding: '13px 16px',
                    background: isUnread ? 'rgba(56,100,220,0.08)' : 'transparent',
                    border: 'none', borderBottom: '1px solid rgba(56,100,220,0.06)',
                    cursor: item.onClick ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,100,220,0.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(56,100,220,0.08)' : 'transparent'}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: `${meta.color}18`, border: `1px solid ${meta.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  }}>
                    {meta.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e8eef8' }}>{item.title}</span>
                      {isUnread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4c8aff', flexShrink: 0 }} />}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'rgba(160,180,220,0.55)', lineHeight: 1.45,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {item.desc}
                    </div>
                    <div style={{ fontSize: 10.5, color: 'rgba(160,180,220,0.3)', marginTop: 4 }}>
                      {meta.label} · {timeAgo(item.time)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes vnbBellRing {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(18deg); }
          30% { transform: rotate(-16deg); }
          45% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(4deg); }
          90% { transform: rotate(-2deg); }
        }
        @keyframes vnbPopIn {
          from { opacity: 0; transform: translateY(4px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes vnbPopOut {
          to { opacity: 0; transform: translateY(-6px) scale(0.85); }
        }
        @keyframes vnbDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}