import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('vendor_token');

const S = {
  heading: { fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 300, color: '#e8eef8', marginBottom: 4 },
  sub: { fontSize: 13, color: 'rgba(160,180,220,0.4)', marginBottom: 32 },
  card: { background: 'rgba(10,15,28,0.8)', border: '1px solid rgba(56,100,220,0.14)', borderRadius: 14, padding: '24px 26px', marginBottom: 20 },
  cardTitle: { fontSize: 13, fontWeight: 600, color: '#c8d8f8', marginBottom: 18 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  imgCard: { borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(56,100,220,0.12)', background: 'rgba(15,22,45,0.6)', position: 'relative' },
  label: { display: 'block', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(160,180,220,0.4)', marginBottom: 7 },
  input: { width: '100%', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.18)', borderRadius: 9, padding: '10px 13px', fontSize: 13, color: '#e8eef8', fontFamily: "'DM Sans', sans-serif", outline: 'none', boxSizing: 'border-box' },
  uploadBtn: { padding: '10px 22px', background: 'linear-gradient(135deg, #2a4aaa, #3a5acc)', border: 'none', borderRadius: 9, color: '#e8f0ff', fontSize: 13, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer', letterSpacing: '0.04em' },
  delBtn: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(220,60,60,0.85)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
};

export default function VendorPortfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [vendorId, setVendorId] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('portfolio');

  const fetchPortfolio = () => {
    fetch(`${API}/vendor-auth/profile`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(data => {
        setPortfolio(data.portfolio || []);
        setVendorId(data.vendor?.id || null);
      }).catch(() => {});
  };

  useEffect(() => { fetchPortfolio(); }, []);

  const handleUpload = async () => {
    if (!file || !vendorId) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image', file);
    fd.append('caption', caption);
    fd.append('tags', tags);
    await fetch(`${API}/vendors/${vendorId}/portfolio`, {
      method: 'POST', headers: { Authorization: `Bearer ${token()}` }, body: fd,
    });
    setFile(null); setPreview(null); setCaption(''); setTags('');
    setSuccess('Photo uploaded!'); setTimeout(() => setSuccess(''), 3000);
    fetchPortfolio();
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this photo?')) return;
    await fetch(`${API}/vendors/portfolio/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
    fetchPortfolio();
  };

  const tabs = ['portfolio', 'albums', 'videos'];

  return (
    <div>
      <div style={S.heading}>Portfolio</div>
      <div style={S.sub}>Showcase your best work — clients see this on your profile</div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid rgba(56,100,220,0.12)', marginBottom: 24 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 20px', background: 'none', border: 'none',
            borderBottom: `2px solid ${activeTab === tab ? '#4c8aff' : 'transparent'}`,
            color: activeTab === tab ? '#4c8aff' : 'rgba(160,180,220,0.4)',
            fontSize: 13, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            textTransform: 'capitalize', fontWeight: activeTab === tab ? 500 : 400,
            marginBottom: -1,
          }}>{tab} {tab === 'portfolio' ? `(${portfolio.length})` : ''}</button>
        ))}
      </div>

      {activeTab === 'portfolio' && (
        <>
          {/* Upload */}
          <div style={S.card}>
            <div style={S.cardTitle}>Upload Photo</div>
            {success && <div style={{ background: 'rgba(40,120,70,0.15)', border: '1px solid rgba(60,180,100,0.25)', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#6ed496', marginBottom: 14 }}>{success}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div><label style={S.label}>Caption</label><input style={S.input} value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Royal Wedding 2024" /></div>
              <div><label style={S.label}>Tags (comma separated, max 3)</label><input style={S.input} value={tags} onChange={e => setTags(e.target.value)} placeholder="Candid, Outdoor, Luxury" /></div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <label style={{ padding: '9px 18px', background: 'rgba(20,30,60,0.5)', border: '1px solid rgba(56,100,220,0.2)', borderRadius: 9, fontSize: 13, color: 'rgba(160,180,220,0.6)', cursor: 'pointer' }}>
                Choose photo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; setFile(f); setPreview(URL.createObjectURL(f)); }} />
              </label>
              {preview && <img src={preview} alt="preview" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(56,100,220,0.2)' }} />}
              <button style={{ ...S.uploadBtn, opacity: !file || uploading ? 0.6 : 1 }} onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>

          {/* Grid */}
          {portfolio.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(160,180,220,0.25)', fontSize: 13 }}>
              No photos uploaded yet. Add your best work above.
            </div>
          ) : (
            <div style={S.grid}>
              {portfolio.map(img => (
                <div key={img.id} style={S.imgCard}>
                  <img src={img.image_url} alt={img.caption || ''} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                  <button style={S.delBtn} onClick={() => handleDelete(img.id)}>✕</button>
                  {img.caption && (
                    <div style={{ padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: '#c8d8f8', fontWeight: 500 }}>{img.caption}</div>
                      {img.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 5 }}>
                          {img.tags.map((t, i) => <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(56,100,220,0.12)', color: 'rgba(120,160,255,0.7)', border: '1px solid rgba(56,100,220,0.2)' }}>{t}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'albums' && (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: 13, color: 'rgba(160,180,220,0.3)' }}>Album management coming soon — organise your photos into wedding albums and themed collections.</div>
        </div>
      )}
      {activeTab === 'videos' && (
        <div style={{ ...S.card, textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: 13, color: 'rgba(160,180,220,0.3)' }}>Video reel upload coming soon — add highlight reels and cinematic films.</div>
        </div>
      )}
    </div>
  );
}
