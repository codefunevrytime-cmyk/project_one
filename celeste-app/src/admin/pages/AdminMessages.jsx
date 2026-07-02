// celeste-app/src/admin/pages/AdminMessages.jsx
// Admin can view ALL conversations, read any thread, and inject messages into any thread

import { useState, useEffect, useRef } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('adminToken');

function Bubble({ msg }) {
  const isAdmin  = msg.sender_type === 'admin';
  const isVendor = msg.sender_type === 'vendor';
  const isClient = msg.sender_type === 'client';
  const time = new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const bg = isAdmin
    ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
    : isVendor
      ? 'rgba(42,74,170,0.3)'
      : 'rgba(255,255,255,0.06)';

  const align = isAdmin ? 'flex-end' : 'flex-start';

  return (
    <div style={{ display: 'flex', justifyContent: align }}>
      <div style={{
        maxWidth: '70%', padding: '9px 13px',
        borderRadius: isAdmin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: bg, border: isVendor ? '1px solid rgba(76,138,255,0.2)' : 'none',
        color: '#f0e6c8', fontSize: 13, lineHeight: 1.55,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4,
          color: isAdmin ? 'rgba(199,210,254,0.8)' : isVendor ? 'rgba(138,180,248,0.75)' : 'rgba(212,168,67,0.75)' }}>
          {isAdmin ? '🛡 Admin' : isVendor ? `⚡ ${msg.sender_name}` : `👤 ${msg.sender_name || 'Client'}`}
        </div>
        <div>{msg.message}</div>
        <div style={{ fontSize: 10, color: 'rgba(240,230,200,0.35)', marginTop: 4, textAlign: isAdmin ? 'right' : 'left' }}>
          {time}
        </div>
      </div>
    </div>
  );
}

export default function AdminMessages() {
  const [convs,    setConvs]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply,    setReply]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all'); // all | open | closed
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const fetchConvs = async () => {
    try {
      const res  = await fetch(`${API}/messages/admin`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setConvs(Array.isArray(data) ? data : []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fetchMessages = async (id = selected?.id) => {
    if (!id) return;
    try {
      const res  = await fetch(`${API}/messages/admin/${id}`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch { /* silent */ }
  };

  useEffect(() => { fetchConvs(); }, []);

  useEffect(() => {
    clearInterval(pollRef.current);
    if (selected) {
      fetchMessages(selected.id);
      pollRef.current = setInterval(() => fetchMessages(selected.id), 4000);
    }
    return () => clearInterval(pollRef.current);
  }, [selected?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    try {
      await fetch(`${API}/messages/admin/${selected.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify({ message: reply }),
      });
      setReply('');
      fetchMessages();
      fetchConvs();
    } catch { /* silent */ }
    setSending(false);
  };

  const updateStatus = async (status) => {
    if (!selected) return;
    await fetch(`${API}/messages/admin/${selected.id}/status`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body:    JSON.stringify({ status }),
    });
    fetchConvs();
    setSelected(prev => ({ ...prev, status }));
  };

  const displayed = convs.filter(c => {
    if (filter !== 'all' && c.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.client_name?.toLowerCase().includes(q) ||
             c.vendor_name?.toLowerCase().includes(q) ||
             c.subject?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalUnread = convs.reduce((s, c) => s + Number(c.unread_count || 0), 0);

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>
          Messages
          {totalUnread > 0 && (
            <span style={{ marginLeft: 10, fontSize: 13, background: '#1a1008', color: '#ffa01e', borderRadius: 20, padding: '2px 10px', verticalAlign: 'middle' }}>
              {totalUnread} unread
            </span>
          )}
        </h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Monitor and join any client–vendor conversation</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100vh - 220px)', minHeight: 500 }}>

        {/* Sidebar */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Search + filters */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f3f3' }}>
            <input
              type="search"
              placeholder="Search conversations…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 12, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
            />
            <div style={{ display: 'flex', gap: 5 }}>
              {[['all', 'All'], ['open', 'Open'], ['closed', 'Closed']].map(([v, l]) => (
                <button key={v} onClick={() => setFilter(v)} style={{
                  flex: 1, padding: '4px 0', borderRadius: 6, border: 'none', fontSize: 11,
                  fontFamily: 'inherit', cursor: 'pointer',
                  background: filter === v ? '#1a1008' : '#f7f5f2',
                  color: filter === v ? '#ffa01e' : '#5a4a36',
                }}>{l}</button>
              ))}
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, fontSize: 13, color: '#9e8e7a' }}>Loading…</div>
            ) : displayed.length === 0 ? (
              <div style={{ padding: 20, fontSize: 13, color: '#c4b090', textAlign: 'center', lineHeight: 1.7 }}>
                No conversations found
              </div>
            ) : displayed.map(c => {
              const unread = Number(c.unread_count || 0);
              const isActive = selected?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelected(c); setMessages([]); }}
                  style={{
                    padding: '11px 14px',
                    borderBottom: '1px solid #f5f5f5',
                    borderLeft: `3px solid ${isActive ? '#c9a84c' : 'transparent'}`,
                    background: isActive ? '#fdf8f0' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1008' }}>{c.client_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      {unread > 0 && (
                        <span style={{ background: '#1a1008', color: '#ffa01e', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {unread}
                        </span>
                      )}
                      <span style={{ fontSize: 10, color: c.status === 'closed' ? '#ef4444' : '#22c55e', background: c.status === 'closed' ? '#fef2f2' : '#f0fdf4', padding: '1px 6px', borderRadius: 10 }}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                  {c.vendor_name && (
                    <div style={{ fontSize: 11, color: '#c9a84c', marginBottom: 3 }}>↔ {c.vendor_name}</div>
                  )}
                  <div style={{ fontSize: 11, color: '#9e8e7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.last_message || c.subject || '—'}
                  </div>
                  <div style={{ fontSize: 10, color: '#c4b090', marginTop: 3 }}>
                    {new Date(c.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat panel */}
        <div style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#c4b090', fontSize: 13, gap: 10 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round"/>
              </svg>
              Select a conversation to view messages
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1008', marginBottom: 2 }}>
                    {selected.client_name}
                    {selected.vendor_name && (
                      <span style={{ fontWeight: 400, color: '#9e8e7a', marginLeft: 8, fontSize: 12 }}>
                        ↔ {selected.vendor_name}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9e8e7a' }}>
                    {selected.client_email && `${selected.client_email}`}
                    {selected.client_phone && ` · ${selected.client_phone}`}
                  </div>
                </div>

                {/* Admin controls */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9e8e7a', marginRight: 4 }}>Status:</span>
                  {selected.status !== 'closed' ? (
                    <button onClick={() => updateStatus('closed')} style={{ padding: '5px 12px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#b91c1c' }}>
                      Close thread
                    </button>
                  ) : (
                    <button onClick={() => updateStatus('open')} style={{ padding: '5px 12px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, color: '#15803d' }}>
                      Reopen
                    </button>
                  )}
                </div>
              </div>

              {/* Admin intervention notice */}
              <div style={{ padding: '8px 18px', background: '#fdf8f0', borderBottom: '1px solid #f3ebe0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#c9a84c" strokeWidth="1.5">
                  <path d="M8 1l1.5 4.5H14l-3.7 2.7 1.4 4.3L8 9.8l-3.7 2.7 1.4-4.3L2 5.5h4.5z"/>
                </svg>
                <span style={{ fontSize: 11, color: '#8a6a3a' }}>
                  As admin you can read this thread and send messages visible to both client and vendor.
                </span>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10, background: '#fafaf8' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#c4b090', fontSize: 13, padding: 40 }}>Loading messages…</div>
                ) : (
                  messages.map(m => <Bubble key={m.id} msg={m} />)
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '12px 18px', borderTop: '1px solid #f3f3f3', display: 'flex', gap: 10, alignItems: 'flex-end', background: '#fff' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#9e8e7a', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    🛡 Sending as Admin — visible to client and vendor
                  </div>
                  <textarea
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
                    placeholder="Type an admin message into this thread…"
                    rows={2}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '1px solid #e8e0d5', borderRadius: 8,
                      fontSize: 13, fontFamily: 'inherit', outline: 'none',
                      resize: 'none', boxSizing: 'border-box', background: '#fafaf8',
                    }}
                  />
                </div>
                <button
                  onClick={handleSend}
                  disabled={!reply.trim() || sending}
                  style={{
                    padding: '10px 18px', background: '#1a1008', color: '#ffa01e',
                    border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                    fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-end',
                    opacity: !reply.trim() || sending ? 0.6 : 1, flexShrink: 0,
                  }}
                >
                  {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
