import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('vendor_token');

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 32 },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '20px 22px', marginBottom: 14, cursor: 'pointer', transition: 'border-color 0.2s' },
  chatBubble: { padding: '10px 14px', borderRadius: 10, fontSize: 13, lineHeight: 1.6, maxWidth: '75%', marginBottom: 10 },
  msgInput: { width: '100%', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.2)', borderRadius: 10, padding: '11px 14px', fontSize: 13, color: '#e8eef8', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box', resize: 'none' },
  sendBtn: { padding: '10px 22px', background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)', border: 'none', borderRadius: 9, color: '#e8f0ff', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' },
  reqBtn: { padding: '8px 16px', background: 'rgba(255,160,30,0.12)', border: '1px solid rgba(255,160,30,0.3)', borderRadius: 8, color: '#ffb840', fontSize: 12, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' },
};

export default function VendorEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [reqSuccess, setReqSuccess] = useState(false);

  const fetchEnquiries = () => {
    fetch(`${API}/vendor-auth/enquiries`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setEnquiries(Array.isArray(d) ? d : [])).catch(() => {});
  };

  const fetchMessages = (id) => {
    fetch(`${API}/vendor-auth/enquiries/${id}/messages`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json()).then(d => setMessages(Array.isArray(d) ? d : [])).catch(() => {});
  };

  useEffect(() => { fetchEnquiries(); }, []);
  useEffect(() => { if (selected) fetchMessages(selected.id); }, [selected]);

  const handleSend = async () => {
    if (!reply.trim() || !selected) return;
    setSending(true);
    await fetch(`${API}/vendor-auth/enquiries/${selected.id}/reply`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ message: reply }),
    });
    setReply('');
    fetchMessages(selected.id);
    setSending(false);
  };

  const handleRequestContact = async () => {
    if (!selected) return;
    setRequesting(true);
    await fetch(`${API}/vendor-auth/enquiries/${selected.id}/request-contact`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` },
    });
    setReqSuccess(true);
    setRequesting(false);
  };

  return (
    <div>
      <div style={S.heading}>Enquiries</div>
      <div style={S.sub}>Client messages forwarded to you — contact details are hidden until admin approval</div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '300px 1fr' : '1fr', gap: 20 }}>
        {/* List */}
        <div>
          {enquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(160,180,220,0.25)', fontSize: 13 }}>
              No enquiries yet. Once clients message you they'll appear here.
            </div>
          ) : enquiries.map(enq => (
            <div
              key={enq.id}
              style={{ ...S.card, borderColor: selected?.id === enq.id ? 'rgba(76,138,255,0.4)' : 'rgba(56,100,220,0.14)' }}
              onClick={() => setSelected(enq)}
              onMouseEnter={e => { if (selected?.id !== enq.id) e.currentTarget.style.borderColor = 'rgba(56,100,220,0.3)'; }}
              onMouseLeave={e => { if (selected?.id !== enq.id) e.currentTarget.style.borderColor = 'rgba(56,100,220,0.14)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#c8d8f8' }}>{enq.client_name}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {!enq.replied && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(76,138,255,0.15)', color: '#4c8aff', border: '1px solid rgba(76,138,255,0.25)' }}>NEW</span>}
                  {enq.contact_revealed && <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 20, background: 'rgba(100,200,140,0.12)', color: '#6ed496', border: '1px solid rgba(100,200,140,0.25)' }}>CONTACT</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(160,180,220,0.4)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {enq.message}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(160,180,220,0.25)', marginTop: 8 }}>
                {new Date(enq.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </div>
            </div>
          ))}
        </div>

        {/* Chat panel */}
        {selected && (
          <div style={{ background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, display: 'flex', flexDirection: 'column', height: 600 }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56,100,220,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#c8d8f8' }}>{selected.client_name}</div>
                {selected.contact_revealed ? (
                  <div style={{ fontSize: 12, color: '#6ed496', marginTop: 2 }}>
                    📞 {selected.phone || '—'} · ✉ {selected.email || '—'}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: 'rgba(160,180,220,0.3)', marginTop: 2 }}>Contact details hidden</div>
                )}
              </div>
              {!selected.contact_revealed && (
                <button
                  style={{ ...S.reqBtn, opacity: reqSuccess || requesting ? 0.6 : 1 }}
                  onClick={handleRequestContact}
                  disabled={reqSuccess || requesting}
                >
                  {reqSuccess ? '✓ Request sent' : requesting ? 'Sending…' : '📞 Request contact'}
                </button>
              )}
            </div>

            {/* Original message */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(56,100,220,0.08)', background: 'rgba(20,30,60,0.3)' }}>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.3)', marginBottom: 6 }}>Original enquiry</div>
              <div style={{ fontSize: 13, color: 'rgba(200,220,255,0.6)', lineHeight: 1.65 }}>{selected.message}</div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'rgba(160,180,220,0.2)', fontSize: 12, marginTop: 20 }}>No replies yet — start the conversation</div>
              ) : messages.map(msg => {
                const isVendor = msg.sender_type === 'vendor';
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isVendor ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                    <div style={{
                      ...S.chatBubble,
                      background: isVendor ? 'rgba(42,74,170,0.25)' : 'rgba(30,45,80,0.5)',
                      border: `1px solid ${isVendor ? 'rgba(76,138,255,0.2)' : 'rgba(56,100,220,0.1)'}`,
                      color: isVendor ? '#c8d8f8' : 'rgba(180,200,240,0.65)',
                    }}>
                      <div style={{ fontSize: 10, color: 'rgba(160,180,220,0.3)', marginBottom: 4 }}>
                        {isVendor ? 'You' : msg.sender_type === 'admin' ? 'Admin' : 'Client'} · {new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply box */}
            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(56,100,220,0.1)', display: 'flex', gap: 10 }}>
              <textarea
                style={S.msgInput}
                rows={2}
                placeholder="Type your reply…"
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <button style={{ ...S.sendBtn, opacity: !reply.trim() || sending ? 0.6 : 1, alignSelf: 'flex-end', flexShrink: 0 }} onClick={handleSend} disabled={!reply.trim() || sending}>
                {sending ? '…' : 'Send'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
