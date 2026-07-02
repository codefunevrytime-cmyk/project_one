// celeste-app/src/vendor/pages/VendorMessages.jsx
// Vendor-side messaging panel — lists all client conversations, shows threaded chat

import { useState, useEffect, useRef } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('vendor_token');

const S = {
  page: { display: 'flex', height: 'calc(100vh - 64px)', gap: 0, fontFamily: "'DM Sans', sans-serif" },
  sidebar: {
    width: 300, flexShrink: 0,
    borderRight: '1px solid rgba(56,100,220,0.12)',
    display: 'flex', flexDirection: 'column',
    background: 'rgba(10,15,28,0.6)',
    overflowY: 'auto',
  },
  sidebarHeader: {
    padding: '18px 16px 12px',
    borderBottom: '1px solid rgba(56,100,220,0.1)',
    fontSize: 15, fontWeight: 700, color: '#c8d8f8',
  },
  convItem: (active, unread) => ({
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(56,100,220,0.07)',
    background: active ? 'rgba(56,100,220,0.15)' : 'transparent',
    borderLeft: active ? '3px solid #4c8aff' : '3px solid transparent',
    transition: 'background 0.15s',
  }),
  main: {
    flex: 1, display: 'flex', flexDirection: 'column',
    background: '#080c14', minWidth: 0,
  },
  chatHeader: {
    padding: '14px 20px',
    borderBottom: '1px solid rgba(56,100,220,0.1)',
    background: 'rgba(10,15,28,0.8)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  inputRow: {
    padding: '12px 20px',
    borderTop: '1px solid rgba(56,100,220,0.1)',
    background: 'rgba(10,15,28,0.8)',
    display: 'flex', gap: 10, alignItems: 'flex-end',
  },
};

function Bubble({ msg }) {
  const isVendor = msg.sender_type === 'vendor';
  const isAdmin  = msg.sender_type === 'admin';
  const time = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', justifyContent: isVendor ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '72%',
        padding: '10px 14px',
        borderRadius: isVendor ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isVendor
          ? 'linear-gradient(135deg, #2a4aaa, #3a5acc)'
          : isAdmin
            ? 'rgba(99,102,241,0.18)'
            : 'rgba(255,255,255,0.06)',
        border: isAdmin ? '1px solid rgba(99,102,241,0.3)' : 'none',
        color: '#e8eef8',
        fontSize: 13,
        lineHeight: 1.55,
      }}>
        {!isVendor && (
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', marginBottom: 4,
            color: isAdmin ? 'rgba(167,139,250,0.8)' : 'rgba(138,180,248,0.7)',
          }}>
            {isAdmin ? '🛡 Admin' : msg.sender_name || 'Client'}
          </div>
        )}
        <div>{msg.message}</div>
        <div style={{ fontSize: 10, color: 'rgba(160,180,220,0.4)', marginTop: 4, textAlign: isVendor ? 'right' : 'left' }}>
          {time}
        </div>
      </div>
    </div>
  );
}

export default function VendorMessages() {
  const [convs, setConvs]       = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  // Fetch conversation list
  const fetchConvs = async () => {
    try {
      const res  = await fetch(`${API}/messages/vendor`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setConvs(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  // Fetch messages for selected conversation
  const fetchMessages = async (id = selected?.id) => {
    if (!id) return;
    try {
      const res  = await fetch(`${API}/messages/vendor/${id}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchConvs(); }, []);

  // Poll when conversation selected
  useEffect(() => {
    clearInterval(pollRef.current);
    if (selected) {
      fetchMessages(selected.id);
      pollRef.current = setInterval(() => fetchMessages(selected.id), 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [selected?.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await fetch(`${API}/messages/vendor/${selected.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ message: reply }),
      });
      setReply('');
      fetchMessages();
      fetchConvs(); // refresh unread counts
    } catch { /* silent */ }
    setSending(false);
  };

  const selectConv = (c) => {
    setSelected(c);
    setMessages([]);
    // Optimistically clear unread badge
    setConvs(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: '0' } : x));
  };

  const totalUnread = convs.reduce((s, c) => s + Number(c.unread_count || 0), 0);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 }}>
          Messages
          {totalUnread > 0 && (
            <span style={{ marginLeft: 10, fontSize: 14, background: '#4c8aff', color: '#fff', borderRadius: 20, padding: '2px 10px', verticalAlign: 'middle' }}>
              {totalUnread} new
            </span>
          )}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(160,180,220,0.4)' }}>All client conversations — admin can also join any thread</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, height: 'calc(100vh - 220px)', minHeight: 500 }}>

        {/* Conversation list */}
        <div style={{ background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(56,100,220,0.1)', fontSize: 13, fontWeight: 600, color: '#c8d8f8' }}>
            Conversations ({convs.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 24, color: 'rgba(160,180,220,0.3)', fontSize: 13 }}>Loading…</div>
            ) : convs.length === 0 ? (
              <div style={{ padding: 24, color: 'rgba(160,180,220,0.25)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>
                No messages yet.<br/>When clients message you, they'll appear here.
              </div>
            ) : convs.map(c => {
              const unread = Number(c.unread_count || 0);
              const isActive = selected?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectConv(c)}
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(56,100,220,0.07)',
                    borderLeft: `3px solid ${isActive ? '#4c8aff' : 'transparent'}`,
                    background: isActive ? 'rgba(56,100,220,0.15)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(56,100,220,0.07)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#c8d8f8' }}>{c.client_name}</div>
                    {unread > 0 && (
                      <span style={{ background: '#4c8aff', color: '#fff', fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {unread}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(160,180,220,0.45)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message || c.subject}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(160,180,220,0.25)' }}>
                    {new Date(c.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(160,180,220,0.2)', fontSize: 13 }}>
              Select a conversation to start replying
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(56,100,220,0.1)', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(56,100,220,0.2)', border: '1px solid rgba(76,138,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#4c8aff', fontFamily: "'Cormorant Garamond', serif", flexShrink: 0 }}>
                  {selected.client_name?.[0] || 'C'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#c8d8f8' }}>{selected.client_name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(160,180,220,0.4)' }}>
                    {selected.client_email && `${selected.client_email}`}
                    {selected.client_phone && ` · ${selected.client_phone}`}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'rgba(160,180,220,0.2)', fontSize: 13, padding: 40 }}>Loading messages…</div>
                ) : (
                  messages.map(m => <Bubble key={m.id} msg={m} />)
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid rgba(56,100,220,0.1)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                <textarea
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                  placeholder="Reply to client… (Enter to send)"
                  rows={2}
                  style={{
                    flex: 1, background: 'rgba(20,30,60,0.5)',
                    border: '1px solid rgba(56,100,220,0.2)', borderRadius: 10,
                    padding: '10px 13px', fontSize: 13, color: '#e8eef8',
                    fontFamily: "'DM Sans', sans-serif", outline: 'none',
                    resize: 'none', boxSizing: 'border-box',
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  style={{
                    width: 42, height: 42,
                    background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: !reply.trim() || sending ? 0.5 : 1, flexShrink: 0,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8f0ff" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
