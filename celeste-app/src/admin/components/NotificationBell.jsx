import { useState, useEffect, useRef, useCallback } from 'react';
import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('adminToken');
const POLL_MS = 12000;

const TYPE_META = {
  vendor_app: { icon: '🧑‍💼', color: '#4B49AC', label: 'Vendor Application' },
  review:     { icon: '⭐',   color: '#F5A623', label: 'Review' },
  query:      { icon: '💬',   color: '#00A86B', label: 'Query' },
  message:    { icon: '✉️',   color: '#3B82F6', label: 'Message' },
};

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
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch (parseError) {
      return {
        ok: false,
        status: res.status,
        error: `Invalid JSON response from ${url}`,
        parseError,
        data: null,
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || res.statusText || `HTTP ${res.status}`,
        data,
      };
    }

    return {
      ok: true,
      status: res.status,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      status: null,
      error: err.message || 'Network error',
      data: null,
    };
  }
}

// ── Notification sound: plays the uploaded ringtone file ────────────────
const notificationAudio = typeof Audio !== 'undefined'
  ? new Audio('/sounds/mixkit-magic-notification-ring-2344.wav')
  : null;

function playBellSound() {
  if (!notificationAudio) return;
  try {
    notificationAudio.currentTime = 0;
    notificationAudio.volume = 0.55; // tweak to taste, 0–1
    notificationAudio.play().catch(() => {
      // Blocked by autoplay policy until user interacts — expected on first load.
    });
  } catch {
    // Ignore playback errors.
  }
}

export default function NotificationBell({ onNavigate }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [bump, setBump] = useState(0); // shows "+N New" pop
  const [readIds, setReadIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('adm_notif_read') || '[]')); }
    catch { return new Set(); }
  });
  const readIdsRef = useRef(readIds);
  const prevCountRef = useRef(0);
  const initialLoadRef = useRef(true);
  const panelRef = useRef(null);
  const bellRef = useRef(null);

  // ── Warm up the audio element on first user interaction so the very
  //    first real play() call isn't blocked by the browser's autoplay
  //    policy. ────────────────────────────────────────────────────────
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
    localStorage.setItem('adm_notif_read', JSON.stringify([...set]));
  };

  const fetchAll = useCallback(async () => {
    const currentToken = token();
    if (!currentToken) {
      localStorage.removeItem('adminToken');
      window.location.replace('/admin');
      throw new Error('Unauthorized: missing admin token');
    }

    const headers = { Authorization: `Bearer ${currentToken}` };
    const endpointMap = {
      vendorApps: await safeJson(`${API}/vendor-auth/all`, { headers }),
      reviews: await safeJson(`${API}/reviews?all=true`, { headers }),
      queries: await safeJson(`${API}/queries`, { headers }),
      convos: await safeJson(`${API}/messages/admin`, { headers }),
    };

    for (const [name, result] of Object.entries(endpointMap)) {
      if (!result.ok) {
        const message = `Notifications fetch failed for ${name}: ${result.error || 'unknown error'}`;
        if (result.status === 401 || result.status === 403) {
          localStorage.removeItem('adminToken');
          window.location.replace('/admin');
        }
        throw new Error(message);
      }
    }

    const vendorApps = Array.isArray(endpointMap.vendorApps.data) ? endpointMap.vendorApps.data : [];
    const reviews = Array.isArray(endpointMap.reviews.data) ? endpointMap.reviews.data : [];
    const queries = Array.isArray(endpointMap.queries.data) ? endpointMap.queries.data : [];
    const convos = Array.isArray(endpointMap.convos.data) ? endpointMap.convos.data : [];

    const list = [];

    vendorApps.filter(v => v.status === 'pending').forEach(v => {
      list.push({
        id: `vendor_app_${v.id}`,
        type: 'vendor_app',
        title: 'New vendor application',
        desc: `${v.name} applied to become a vendor`,
        time: v.created_at,
        tab: 'vendor-apps',
      });
    });

    reviews.filter(r => !r.approved).forEach(r => {
      list.push({
        id: `review_${r.id}`,
        type: 'review',
        title: 'New review pending approval',
        desc: `${r.client_name} left a ${r.rating}★ review${r.vendor_name ? ` for ${r.vendor_name}` : ''}`,
        time: r.created_at,
        tab: 'reviews',
      });
    });

    queries.filter(q => !q.replied).forEach(q => {
      list.push({
        id: `query_${q.id}`,
        type: 'query',
        title: 'New client query',
        desc: `${q.client_name}: "${(q.message || '').slice(0, 60)}${q.message?.length > 60 ? '…' : ''}"`,
        time: q.created_at,
        tab: 'queries',
      });
    });

    convos.filter(c => Number(c.unread_count) > 0).forEach(c => {
      list.push({
        id: `message_${c.id}`,
        type: 'message',
        title: `${c.unread_count} new message${c.unread_count > 1 ? 's' : ''}`,
        desc: `From ${c.client_name}${c.vendor_name ? ` ↔ ${c.vendor_name}` : ''}: "${(c.last_message || '').slice(0, 60)}"`,
        time: c.updated_at,
        tab: 'messages',
      });
    });

    list.sort((a, b) => new Date(b.time) - new Date(a.time));
    return list;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const list = await fetchAll();
        if (cancelled) return;

        const unreadCount = list.filter(i => !readIdsRef.current.has(i.id)).length;

        if (!initialLoadRef.current && unreadCount > prevCountRef.current) {
          const delta = unreadCount - prevCountRef.current;
          setRinging(true);
          setBump(delta);
          playBellSound();
          setTimeout(() => setRinging(false), 900);
          setTimeout(() => setBump(0), 3000);
        }

        prevCountRef.current = unreadCount;
        initialLoadRef.current = false;
        setItems(list);
      } catch (err) {
        if (cancelled) return;
        console.error('Notification polling failed:', err);
        setItems([]);
      }
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
      readIdsRef.current = next;
      persistRead(next);
      return next;
    });
  };

  const markAllRead = () => {
    setReadIds(prev => {
      const next = new Set(prev);
      items.forEach(i => next.add(i.id));
      readIdsRef.current = next;
      persistRead(next);
      return next;
    });
  };

  const handleItemClick = (item) => {
    markRead(item.id);
    setOpen(false);
    if (onNavigate) onNavigate(item.tab);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* "+N New" pop */}
      {bump > 0 && (
        <div style={{
          position: 'absolute', top: -8, right: -6,
          background: '#fc424a', color: '#fff', fontSize: 11, fontWeight: 700,
          padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(252,66,74,0.4)',
          animation: 'notifPopIn 0.3s cubic-bezier(0.34,1.56,0.64,1), notifPopOut 0.3s ease 2.5s forwards',
          zIndex: 20,
        }}>
          +{bump} New
        </div>
      )}

      <button
        ref={bellRef}
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Close notifications' : 'Open notifications'}
        style={{
          width: 36, height: 36, borderRadius: 9,
          background: open ? '#e8e8f8' : '#f0f0f7', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#7978E9', position: 'relative',
          transformOrigin: '50% 0%',
          animation: ringing ? 'bellRing 0.7s ease' : 'none',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread.length > 0 && (
          <span style={{
            position: 'absolute', top: -3, right: -3,
            background: '#fc424a', color: '#fff', fontSize: 9.5, fontWeight: 700,
            minWidth: 16, height: 16, borderRadius: 8, padding: '0 3px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} style={{
          position: 'absolute', top: 46, right: 0, width: 360,
          background: '#fff', borderRadius: 12, border: '1px solid #e8e8f0',
          boxShadow: '0 20px 60px rgba(75,73,172,0.2), 0 4px 16px rgba(0,0,0,0.08)',
          zIndex: 100, overflow: 'hidden',
          animation: 'notifDropIn 0.18s ease',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderBottom: '1px solid #f0f0f7',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2d2d6b' }}>Notifications</span>
            {unread.length > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: '#7978E9', fontSize: 12,
                fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#b0b0cc', fontSize: 13 }}>
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
                    background: isUnread ? 'rgba(121,120,233,0.06)' : 'transparent',
                    border: 'none', borderBottom: '1px solid #f5f5fa',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(121,120,233,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = isUnread ? 'rgba(121,120,233,0.06)' : 'transparent'}
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
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#2d2d6b' }}>{item.title}</span>
                      {isUnread && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4c8aff', flexShrink: 0 }} />}
                    </div>
                    <div style={{
                      fontSize: 12, color: '#6c6c9a', lineHeight: 1.45,
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {item.desc}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#b0b0cc', marginTop: 4 }}>
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
        @keyframes bellRing {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(18deg); }
          30% { transform: rotate(-16deg); }
          45% { transform: rotate(12deg); }
          60% { transform: rotate(-8deg); }
          75% { transform: rotate(4deg); }
          90% { transform: rotate(-2deg); }
        }
        @keyframes notifPopIn {
          from { opacity: 0; transform: translateY(4px) scale(0.8); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notifPopOut {
          to { opacity: 0; transform: translateY(-6px) scale(0.85); }
        }
        @keyframes notifDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}