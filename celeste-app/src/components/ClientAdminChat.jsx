// celeste-app/src/components/ClientAdminChat.jsx
// Floating chat button for clients to talk directly to admin
// Place this in any client-facing page: Gallery, ExplorePage, HomePage, etc.
// Usage: <ClientAdminChat user={user} pageContext="Wedding Photography" />

import { useState, useEffect, useRef } from 'react';

import { API_URL } from '../config/api';

const API = API_URL;
const STORAGE_KEY = 'lumiere_admin_conv';

const QUICK_QUESTIONS = [
  'What packages do you offer?',
  'How do I book an event?',
  'What is the pricing?',
  'Can I customize my event?',
];

function Bubble({ msg }) {
  const isClient = msg.sender_type === 'client';
  const time = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
      {!isClient && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', marginRight: 8, alignSelf: 'flex-end',
        }}>
          L
        </div>
      )}
      <div style={{
        maxWidth: '75%',
        padding: '9px 13px',
        borderRadius: isClient ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        background: isClient
          ? 'linear-gradient(135deg, #4B49AC, #7978E9)'
          : '#f4f4f8',
        color: isClient ? '#fff' : '#2d2d6b',
        fontSize: 13,
        lineHeight: 1.55,
        boxShadow: isClient
          ? '0 4px 12px rgba(75,73,172,0.25)'
          : '0 2px 6px rgba(0,0,0,0.06)',
      }}>
        <div>{msg.message}</div>
        <div style={{
          fontSize: 10, marginTop: 4,
          color: isClient ? 'rgba(255,255,255,0.6)' : '#b0b0cc',
          textAlign: isClient ? 'right' : 'left',
        }}>{time}</div>
      </div>
    </div>
  );
}

export default function ClientAdminChat({ user, pageContext = '' }) {
  const [open,    setOpen]    = useState(false);
  const [step,    setStep]    = useState('form'); // 'form' | 'chat'
  const [convId,  setConvId]  = useState(null);
  const [messages, setMessages] = useState([]);
  const [unread,  setUnread]  = useState(0);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');
  const [form, setForm] = useState({
    name:    user?.name  || '',
    email:   user?.email || '',
    phone:   '',
    message: pageContext ? `Hi! I'm interested in ${pageContext}.` : '',
  });
  const [reply, setReply] = useState('');
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  // Restore existing conversation
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { id, email } = JSON.parse(stored);
        setConvId(id);
        setStep('chat');
        fetchMessages(false, id, email);
      } catch { localStorage.removeItem(STORAGE_KEY); }
    }
  }, []);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages when open
  useEffect(() => {
    clearInterval(pollRef.current);
    if (step === 'chat' && convId && open) {
      pollRef.current = setInterval(() => fetchMessages(true), 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [step, convId, open]);

  const fetchMessages = async (silent = false, overrideId = null, overrideEmail = null) => {
    const id    = overrideId    || convId;
    const email = overrideEmail || form.email || '';
    if (!id) return;
    try {
      const res  = await fetch(`${API}/messages/admin-chat/${id}?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        if (!open) {
          const newUnread = data.messages.filter(m => m.sender_type === 'admin' && !m.is_read).length;
          setUnread(newUnread);
        }
      }
    } catch { /* silent */ }
  };

  const handleStart = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      setError('Please enter your name and a message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res  = await fetch(`${API}/messages/admin-chat/start`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_name:  form.name,
          client_email: form.email  || null,
          client_phone: form.phone  || null,
          subject:      `Enquiry from ${form.name}${pageContext ? ` — ${pageContext}` : ''}`,
          message:      form.message,
        }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        setConvId(data.conversation_id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: data.conversation_id, email: form.email }));
        setStep('chat');
        fetchMessages(false, data.conversation_id, form.email);
      } else {
        setError(data.error || 'Could not start chat.');
      }
    } catch {
      setError('Server error. Please try again.');
    }
    setSending(false);
  };

  const handleReply = async () => {
    if (!reply.trim() || !convId) return;
    setSending(true);
    try {
      await fetch(`${API}/messages/admin-chat/${convId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ client_name: form.name || 'Client', message: reply }),
      });
      setReply('');
      fetchMessages();
    } catch { /* silent */ }
    setSending(false);
  };

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) setUnread(0);
  };

  const resetChat = () => {
    localStorage.removeItem(STORAGE_KEY);
    setConvId(null);
    setMessages([]);
    setStep('form');
    setForm({ name: user?.name || '', email: user?.email || '', phone: '', message: '' });
  };

  return (
    <>
      {/* ── Floating button ── */}
      <button
        onClick={handleOpen}
        title="Chat with us"
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 1200,
          width: 56, height: 56, borderRadius: '50%',
          background: open ? '#4B49AC' : 'linear-gradient(135deg, #4B49AC, #7978E9)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 28px rgba(75,73,172,0.45)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        )}
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#fc424a', color: '#fff',
            fontSize: 10, fontWeight: 700,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #fff',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 96, right: 28, zIndex: 1200,
          width: 360, maxHeight: '72vh',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 20px 60px rgba(75,73,172,0.2), 0 4px 16px rgba(0,0,0,0.08)',
          border: '1px solid #e8e8f0',
          display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif",
          overflow: 'hidden',
          animation: 'chatSlideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          <style>{`
            @keyframes chatSlideUp {
              from { opacity: 0; transform: translateY(20px) scale(0.96); }
              to   { opacity: 1; transform: translateY(0)    scale(1);    }
            }
          `}</style>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 700, color: '#fff',
                border: '2px solid rgba(255,255,255,0.3)',
              }}>L</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Lumière Support</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d25b', display: 'inline-block' }} />
                  We reply within a few hours
                </div>
              </div>
            </div>
            {step === 'chat' && (
              <button onClick={resetChat} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 6, color: '#fff', fontSize: 11, cursor: 'pointer', padding: '4px 10px',
                fontFamily: 'inherit',
              }}>
                New chat
              </button>
            )}
          </div>

          {/* Form step */}
          {step === 'form' && (
            <div style={{ padding: 18, overflowY: 'auto', flex: 1 }}>
              {/* Welcome message */}
              <div style={{
                background: '#f4f4f8', borderRadius: 12, padding: '12px 14px', marginBottom: 16,
                fontSize: 13, color: '#2d2d6b', lineHeight: 1.6,
              }}>
                👋 Hi there! How can we help you today? Tell us what you're looking for and we'll get back to you shortly.
              </div>

              {/* Quick questions */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: '#b0b0cc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  Quick questions
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => setForm(f => ({ ...f, message: q }))}
                      style={{
                        padding: '5px 11px', borderRadius: 20,
                        border: '1px solid #e8e8f0', background: '#f4f4f8',
                        color: '#4B49AC', fontSize: 11, cursor: 'pointer',
                        fontFamily: 'inherit', transition: 'all 0.12s',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#b91c1c', marginBottom: 12 }}>
                  {error}
                </div>
              )}

              {[
                { key: 'name',  label: 'Your name *',  placeholder: 'Full name',           type: 'text'  },
                { key: 'email', label: 'Email',         placeholder: 'To receive replies',  type: 'email' },
                { key: 'phone', label: 'Phone',         placeholder: '+91 ...',             type: 'tel'   },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 11, color: '#b0b0cc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{
                      width: '100%', padding: '9px 12px',
                      border: '1.5px solid #e8e8f0', borderRadius: 8,
                      fontSize: 13, color: '#2d2d6b',
                      fontFamily: 'inherit', outline: 'none',
                      boxSizing: 'border-box', transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#7978E9'}
                    onBlur={e => e.target.style.borderColor = '#e8e8f0'}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#b0b0cc', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
                  Message *
                </label>
                <textarea
                  placeholder="Tell us about your event or question…"
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={3}
                  style={{
                    width: '100%', padding: '9px 12px',
                    border: '1.5px solid #e8e8f0', borderRadius: 8,
                    fontSize: 13, color: '#2d2d6b',
                    fontFamily: 'inherit', outline: 'none',
                    resize: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#7978E9'}
                  onBlur={e => e.target.style.borderColor = '#e8e8f0'}
                />
              </div>

              <button
                onClick={handleStart}
                disabled={sending}
                style={{
                  width: '100%', padding: '11px',
                  background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
                  border: 'none', borderRadius: 9,
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(75,73,172,0.35)',
                  opacity: sending ? 0.7 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                {sending ? 'Starting chat…' : 'Send Message →'}
              </button>
            </div>
          )}

          {/* Chat step */}
          {step === 'chat' && (
            <>
              <div style={{
                flex: 1, overflowY: 'auto', padding: '14px 16px',
                background: '#fafafa', minHeight: 200, maxHeight: 360,
              }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#b0b0cc', fontSize: 13, padding: '40px 20px' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>✉️</div>
                    Your message has been sent! We'll reply shortly.
                  </div>
                ) : (
                  messages.map(m => <Bubble key={m.id} msg={m} />)
                )}
                <div ref={bottomRef} />
              </div>

              <div style={{ padding: '12px 14px', borderTop: '1px solid #e8e8f0', background: '#fff' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                    placeholder="Type a message… (Enter to send)"
                    rows={2}
                    style={{
                      flex: 1, padding: '9px 12px',
                      border: '1.5px solid #e8e8f0', borderRadius: 8,
                      fontSize: 13, color: '#2d2d6b',
                      fontFamily: 'inherit', outline: 'none',
                      resize: 'none', boxSizing: 'border-box',
                      transition: 'border-color 0.15s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#7978E9'}
                    onBlur={e => e.target.style.borderColor = '#e8e8f0'}
                  />
                  <button
                    onClick={handleReply}
                    disabled={!reply.trim() || sending}
                    style={{
                      width: 40, height: 40, flexShrink: 0,
                      background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: !reply.trim() || sending ? 0.45 : 1,
                      boxShadow: '0 4px 12px rgba(75,73,172,0.3)',
                      alignSelf: 'flex-end',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
