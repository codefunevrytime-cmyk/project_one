// celeste-app/src/components/ClientMessaging.jsx
// Floating chat button + slide-up chat panel for clients on vendor profile pages

import { useState, useEffect, useRef } from 'react';

const API = 'http://localhost:5000/api';

const S = {
  // Floating button
  fab: {
    position: 'fixed',
    bottom: 28,
    right: 28,
    zIndex: 1200,
    width: 56,
    height: 56,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(245,158,11,0.45)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  // Main panel
  panel: {
    position: 'fixed',
    bottom: 96,
    right: 28,
    zIndex: 1200,
    width: 380,
    maxHeight: '70vh',
    background: '#1C160A',
    border: '1px solid rgba(245,158,11,0.18)',
    borderRadius: 16,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    overflow: 'hidden',
    fontFamily: "'DM Sans', sans-serif",
  },
  panelHeader: {
    padding: '14px 18px',
    borderBottom: '1px solid rgba(245,158,11,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#231C0E',
  },
  vendorAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(245,158,11,0.2)',
    border: '1px solid rgba(245,158,11,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 700,
    color: '#F59E0B',
    fontFamily: "'Cormorant Garamond', serif",
    flexShrink: 0,
  },
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: '#141009',
    minHeight: 200,
    maxHeight: 360,
  },
  inputArea: {
    borderTop: '1px solid rgba(245,158,11,0.12)',
    padding: '12px 14px',
    background: '#1C160A',
  },
};

function Bubble({ msg }) {
  const isClient = msg.sender_type === 'client';
  const isAdmin  = msg.sender_type === 'admin';
  const time = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', justifyContent: isClient ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '78%',
        padding: '9px 13px',
        borderRadius: isClient ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isClient
          ? 'linear-gradient(135deg, #D97706, #B45309)'
          : isAdmin
            ? 'rgba(99,102,241,0.2)'
            : 'rgba(255,255,255,0.07)',
        border: isAdmin ? '1px solid rgba(99,102,241,0.3)' : 'none',
        color: isClient ? '#FDF9F0' : '#E8DCC8',
        fontSize: 13,
        lineHeight: 1.55,
      }}>
        {!isClient && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: isAdmin ? 'rgba(167,139,250,0.8)' : 'rgba(245,158,11,0.7)', marginBottom: 4 }}>
            {isAdmin ? '🛡 Admin' : msg.sender_name}
          </div>
        )}
        <div>{msg.message}</div>
        <div style={{ fontSize: 10, color: isClient ? 'rgba(253,249,240,0.55)' : 'rgba(232,220,200,0.4)',
          marginTop: 4, textAlign: isClient ? 'right' : 'left' }}>{time}</div>
      </div>
    </div>
  );
}

export default function ClientMessaging({ vendor, user, adminMode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'chat'
  const [convId, setConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    message: '',
  });
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const pollRef  = useRef(null);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll when chat open
  useEffect(() => {
    if (step === 'chat' && convId && open) {
      const poll = () => fetchMessages(true);
      pollRef.current = setInterval(poll, 4000);
      return () => clearInterval(pollRef.current);
    }
  }, [step, convId, open]);

  // On open — check localStorage for existing conv
  useEffect(() => {
    if (open && vendor?.id) {
      const stored = localStorage.getItem(`conv_${vendor.id}`);
      if (stored) {
        const { id, email } = JSON.parse(stored);
        setConvId(id);
        setStep('chat');
        fetchMessages(false, id, email);
      }
    }
  }, [open, vendor?.id]);

  const fetchMessages = async (silent = false, overrideId = null, overrideEmail = null) => {
    const id    = overrideId    || convId;
    const email = overrideEmail || form.email || '';
    if (!id) return;
    try {
      const res  = await fetch(`${API}/messages/client/${id}?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        const newUnread = data.messages.filter(m => m.sender_type !== 'client' && !m.is_read).length;
        if (!open) setUnread(newUnread);
      }
    } catch { /* silent */ }
  };

  const handleStart = async () => {
    if (!form.name.trim() || !form.message.trim()) {
      setError('Your name and first message are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res  = await fetch(`${API}/messages/start`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          client_name:  form.name,
          client_email: form.email || null,
          client_phone: form.phone || null,
          vendor_id:    vendor.id,
          subject:      `Enquiry from ${form.name}`,
          message:      form.message,
        }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        setConvId(data.conversation_id);
        localStorage.setItem(`conv_${vendor.id}`, JSON.stringify({ id: data.conversation_id, email: form.email }));
        setStep('chat');
        fetchMessages(false, data.conversation_id, form.email);
      } else {
        setError(data.error || 'Could not start conversation.');
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
      await fetch(`${API}/messages/client/${convId}`, {
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

  if (!vendor?.id) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        style={{ ...S.fab, transform: open ? 'scale(0.92)' : 'scale(1)' }}
        title={open ? 'Close chat' : `Chat with ${vendor.name}`}
        aria-label="Open chat"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {unread > 0 && !open && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: '#ef4444', color: '#fff',
            fontSize: 10, fontWeight: 700,
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #1a1612',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={S.panel}>
          {/* Header */}
          <div style={S.panelHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={S.vendorAvatar}>{vendor.name?.[0] || 'V'}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#F0E6D0' }}>{vendor.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(245,158,11,0.6)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Usually replies within a few hours
                </div>
              </div>
            </div>
            {step === 'chat' && (
              <button
                onClick={() => { setStep('form'); setConvId(null); localStorage.removeItem(`conv_${vendor.id}`); setMessages([]); }}
                style={{ background: 'none', border: 'none', color: 'rgba(245,158,11,0.45)', cursor: 'pointer', fontSize: 11 }}
              >
                New chat
              </button>
            )}
          </div>

          {/* Form step */}
          {step === 'form' && (
            <div style={{ padding: 16, background: '#141009', overflowY: 'auto' }}>
              <p style={{ fontSize: 13, color: 'rgba(232,220,200,0.55)', marginBottom: 16, lineHeight: 1.6 }}>
                Send a message to <strong style={{ color: '#F0E6D0' }}>{vendor.name}</strong>. They'll reply here.
              </p>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f87171', marginBottom: 12 }}>
                  {error}
                </div>
              )}

              {[
                { key: 'name',    label: 'Your name *',    placeholder: 'Full name',            type: 'text'  },
                { key: 'email',   label: 'Email',          placeholder: 'To receive replies',    type: 'email' },
                { key: 'phone',   label: 'Phone',          placeholder: '+91 ...',               type: 'tel'   },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 10 }}>
                  <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,158,11,0.55)', marginBottom: 5 }}>
                    {f.label}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: '#E8DCC8',
                      fontFamily: "'DM Sans', sans-serif", outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(245,158,11,0.55)', marginBottom: 5 }}>
                  Your message *
                </label>
                <textarea
                  placeholder={`Hi ${vendor.name}, I'd like to enquire about...`}
                  value={form.message}
                  onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                  rows={4}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, color: '#E8DCC8',
                    fontFamily: "'DM Sans', sans-serif", outline: 'none',
                    resize: 'none', boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                onClick={handleStart}
                disabled={sending}
                style={{
                  width: '100%', padding: '11px',
                  background: 'linear-gradient(135deg, #D97706, #B45309)',
                  border: 'none', borderRadius: 9, color: '#FDF9F0',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: sending ? 0.7 : 1,
                }}
              >
                {sending ? 'Starting chat…' : 'Start Conversation →'}
              </button>
            </div>
          )}

          {/* Chat step */}
          {step === 'chat' && (
            <>
              <div style={S.messagesArea}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(232,220,200,0.3)', fontSize: 13, padding: '40px 20px' }}>
                    Your conversation will appear here
                  </div>
                ) : (
                  messages.map(m => <Bubble key={m.id} msg={m} />)
                )}
                <div ref={bottomRef} />
              </div>

              <div style={S.inputArea}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }}}
                    placeholder="Type a message… (Enter to send)"
                    rows={2}
                    style={{
                      flex: 1, background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8,
                      padding: '9px 12px', fontSize: 13, color: '#E8DCC8',
                      fontFamily: "'DM Sans', sans-serif", outline: 'none',
                      resize: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={handleReply}
                    disabled={sending || !reply.trim()}
                    style={{
                      width: 40, height: 40, alignSelf: 'flex-end',
                      background: 'linear-gradient(135deg, #D97706, #B45309)',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: !reply.trim() || sending ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
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
