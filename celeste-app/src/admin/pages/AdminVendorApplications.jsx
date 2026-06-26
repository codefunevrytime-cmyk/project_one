import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

export default function AdminVendorApplications() {
  const [applications, setApplications] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('applications');
  const [msg, setMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const [appRes, crRes] = await Promise.all([
      fetch(`${API}/vendor-auth/all`, { headers: { Authorization: `Bearer ${token()}` } }),
      fetch(`${API}/vendor-auth/contact-requests`, { headers: { Authorization: `Bearer ${token()}` } }),
    ]);
    setApplications(await appRes.json());
    setContactRequests(await crRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const showMsg = m => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const approve = async (id) => {
    await fetch(`${API}/vendor-auth/${id}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
    showMsg('Vendor approved'); load();
  };
  const reject = async (id) => {
    await fetch(`${API}/vendor-auth/${id}/reject`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
    showMsg('Vendor rejected'); load();
  };
  const approveContact = async (id) => {
    await fetch(`${API}/vendor-auth/contact-requests/${id}/approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
    showMsg('Contact revealed to vendor'); load();
  };
  const denyContact = async (id) => {
    await fetch(`${API}/vendor-auth/contact-requests/${id}/deny`, { method: 'PATCH', headers: { Authorization: `Bearer ${token()}` } });
    showMsg('Contact request denied'); load();
  };

  const pending  = applications.filter(a => a.status === 'pending');
  const approved = applications.filter(a => a.status === 'approved');

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Vendor Applications</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Approve vendor signups and manage contact reveal requests</p>
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#15803d' }}>{msg}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['applications', `Applications (${applications.length})`], ['contact', `Contact Requests (${contactRequests.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', background: tab === id ? '#1a1008' : '#f7f5f2', color: tab === id ? '#ffa01e' : '#5a4a36' }}>{label}</button>
        ))}
      </div>

      {loading ? <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading…</p> : tab === 'applications' ? (
        <div>
          {pending.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1008', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pending ({pending.length})</h3>
              {pending.map(a => (
                <div key={a.id} style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1008', marginBottom: 3 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: '#9e8e7a' }}>{a.email}{a.phone ? ` · ${a.phone}` : ''}</div>
                    <div style={{ fontSize: 11, color: '#c9a84c', marginTop: 4 }}>Applied {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(a.id)} style={{ padding: '7px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 12, color: '#15803d', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Approve</button>
                    <button onClick={() => reject(a.id)}  style={{ padding: '7px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>Reject</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {approved.length > 0 && (
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1a1008', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Vendors ({approved.length})</h3>
              {approved.map(a => (
                <div key={a.id} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008' }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: '#9e8e7a' }}>{a.email}</div>
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}>Active</span>
                </div>
              ))}
            </div>
          )}
          {applications.length === 0 && <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}><p style={{ color: '#9e8e7a', fontSize: 13 }}>No vendor applications yet.</p></div>}
        </div>
      ) : (
        <div>
          {contactRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}><p style={{ color: '#9e8e7a', fontSize: 13 }}>No pending contact reveal requests.</p></div>
          ) : contactRequests.map(cr => (
            <div key={cr.id} style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 12, padding: '18px 20px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>
                    <span style={{ color: '#c9a84c' }}>{cr.vendor_name}</span> is requesting contact details for <span style={{ color: '#c9a84c' }}>{cr.client_name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#9e8e7a', marginBottom: 6 }}>"{cr.message?.slice(0, 100)}{cr.message?.length > 100 ? '…' : ''}"</div>
                  <div style={{ fontSize: 11, color: '#c9a84c' }}>{new Date(cr.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 16 }}>
                  <button onClick={() => approveContact(cr.id)} style={{ padding: '7px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, fontSize: 12, color: '#15803d', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>Reveal Contact</button>
                  <button onClick={() => denyContact(cr.id)} style={{ padding: '7px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, fontSize: 12, color: '#b91c1c', cursor: 'pointer', fontFamily: 'inherit' }}>Deny</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
