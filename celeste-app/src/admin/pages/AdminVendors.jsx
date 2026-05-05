import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vendors');

  // Add vendor form
  const [vendorForm, setVendorForm] = useState({ name: '', specialty: '', contact: '', service_id: '', price_per_day: '' });
  const [vendorPhoto, setVendorPhoto] = useState(null);

  // Portfolio upload form
  const [portfolioFile, setPortfolioFile] = useState(null);
  const [portfolioCaption, setPortfolioCaption] = useState('');
  const [portfolioTags, setPortfolioTags] = useState('');
  const [portfolioPreview, setPortfolioPreview] = useState(null);

  // Tag form
  const [newTag, setNewTag] = useState('');
  const [tagType, setTagType] = useState('specialty');

  const [success, setSuccess] = useState('');

  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API}/vendors`);
      const data = await res.json();
      setVendors(data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const fetchPortfolio = async (vendorId) => {
    try {
      const res = await fetch(`${API}/vendors/${vendorId}/portfolio`);
      const data = await res.json();
      setPortfolio(data);
    } catch (err) { console.error(err); }
  };

  const fetchTags = async (vendorId) => {
    try {
      const res = await fetch(`${API}/vendors/${vendorId}/tags`);
      const data = await res.json();
      setTags(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchVendors(); }, []);

  const selectVendor = (vendor) => {
    setSelectedVendor(vendor);
    setActiveTab('portfolio');
    fetchPortfolio(vendor.id);
    fetchTags(vendor.id);
  };

  const handleAddVendor = async () => {
  const formData = new FormData();
  formData.append('name', vendorForm.name);
  formData.append('specialty', vendorForm.specialty);
  formData.append('contact', vendorForm.contact);
  formData.append('service_id', vendorForm.service_id);
  formData.append('price_per_day', vendorForm.price_per_day);
  if (vendorPhoto) formData.append('photo', vendorPhoto);

  await fetch(`${API}/vendors`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: formData,
  });
  setVendorForm({ name: '', specialty: '', contact: '', service_id: '', price_per_day: '' });
  setVendorPhoto(null);
  showSuccess('Vendor added!');
  setActiveTab('vendors'); // ← switch to vendors tab
  setTimeout(() => fetchVendors(), 500); // ← delay
};

  const handleToggle = async (id) => {
    await fetch(`${API}/vendors/${id}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchVendors();
  };

  const handlePortfolioUpload = async () => {
    if (!portfolioFile || !selectedVendor) return;
    const formData = new FormData();
    formData.append('image', portfolioFile);
    formData.append('caption', portfolioCaption);
    formData.append('tags', portfolioTags);

    await fetch(`${API}/vendors/${selectedVendor.id}/portfolio`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}` },
      body: formData,
    });
    setPortfolioFile(null);
    setPortfolioCaption('');
    setPortfolioTags('');
    setPortfolioPreview(null);
    showSuccess('Image uploaded!');
    fetchPortfolio(selectedVendor.id);
  };

  const handleDeletePortfolio = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await fetch(`${API}/vendors/portfolio/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchPortfolio(selectedVendor.id);
  };

  const handleAddTag = async () => {
    if (!newTag.trim() || !selectedVendor) return;
    await fetch(`${API}/vendors/${selectedVendor.id}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ tag: newTag, tag_type: tagType }),
    });
    setNewTag('');
    showSuccess('Tag added!');
    fetchTags(selectedVendor.id);
  };

  const handleDeleteTag = async (id) => {
    await fetch(`${API}/vendors/tags/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    fetchTags(selectedVendor.id);
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const specialtyTags = tags.filter(t => t.tag_type === 'specialty');
  const workTags = tags.filter(t => t.tag_type === 'work');

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Vendors</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Manage vendors, their portfolio and tags</p>
      </div>

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
          {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['vendors', 'add', ...(selectedVendor ? ['portfolio', 'tags'] : [])].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', fontSize: 13,
            fontFamily: 'inherit', cursor: 'pointer', textTransform: 'capitalize',
            background: activeTab === tab ? '#1a1008' : '#f7f5f2',
            color: activeTab === tab ? '#ffa01e' : '#5a4a36',
          }}>
            {tab === 'portfolio' ? `${selectedVendor?.name} - Portfolio` : 
             tab === 'tags' ? `${selectedVendor?.name} - Tags` : tab}
          </button>
        ))}
      </div>

      {/* Vendors List */}
      {activeTab === 'vendors' && (
        <div>
          {loading ? <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p> :
            vendors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
                <p style={{ color: '#9e8e7a', fontSize: 13 }}>No vendors yet. Add one first.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {vendors.map(v => (
                  <div key={v.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${v.is_active ? '#e8e0d5' : '#fecaca'}`, overflow: 'hidden' }}>
                    {v.photo_url && <img src={v.photo_url} alt={v.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} />}
                    {!v.photo_url && <div style={{ width: '100%', height: 140, background: '#f7f5f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📷</div>}
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: '#9e8e7a', marginBottom: 4 }}>{v.specialty} · {v.contact}</div>
                      <div style={{ fontSize: 12, color: '#c9a84c', fontWeight: 600, marginBottom: 12 }}>
                        {v.price_per_day ? `₹${Number(v.price_per_day).toLocaleString('en-IN')} / day` : 'No price set'}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => selectVendor(v)} style={{ flex: 1, padding: '6px 10px', background: '#f7f5f2', border: '1px solid #e8e0d5', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: '#1a1008' }}>
                          Manage
                        </button>
                        <button onClick={() => handleToggle(v.id)} style={{ flex: 1, padding: '6px 10px', background: v.is_active ? '#fef2f2' : '#f0fdf4', border: `1px solid ${v.is_active ? '#fecaca' : '#bbf7d0'}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: v.is_active ? '#b91c1c' : '#15803d' }}>
                          {v.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Add Vendor */}
      {activeTab === 'add' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Add New Vendor</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {[['Name', 'name', 'e.g. Golden Hour Studios', 'text'], ['Specialty', 'specialty', 'e.g. Wedding Photography', 'text'], ['Contact', 'contact', 'Phone or email', 'text'], ['Service ID', 'service_id', 'Leave blank if none', 'text'], ['Price per Day (₹)', 'price_per_day', 'e.g. 25000', 'number']].map(([label, key, placeholder, type]) => (
              <div key={key}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>{label}</label>
                <input type={type} value={vendorForm[key]} onChange={e => setVendorForm({ ...vendorForm, [key]: e.target.value })} placeholder={placeholder}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Photo</label>
            <label style={{ padding: '9px 18px', background: '#f7f5f2', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#5a4a36', display: 'inline-block' }}>
              Choose Photo
              <input type="file" accept="image/*" onChange={e => setVendorPhoto(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {vendorPhoto && <span style={{ fontSize: 12, color: '#9e8e7a', marginLeft: 12 }}>{vendorPhoto.name}</span>}
          </div>
          <button onClick={handleAddVendor} disabled={!vendorForm.name}
            style={{ padding: '10px 24px', background: '#1a1008', color: '#ffa01e', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', opacity: !vendorForm.name ? 0.6 : 1 }}>
            Add Vendor
          </button>
        </div>
      )}

      {/* Portfolio */}
      {activeTab === 'portfolio' && selectedVendor && (
        <div>
          {/* Upload */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Upload Work Image</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Caption</label>
                <input value={portfolioCaption} onChange={e => setPortfolioCaption(e.target.value)} placeholder="e.g. Royal Wedding 2024"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Tags (comma separated, max 3)</label>
                <input value={portfolioTags} onChange={e => setPortfolioTags(e.target.value)} placeholder="e.g. Award Winning, Featured, Premium"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ padding: '9px 18px', background: '#f7f5f2', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#5a4a36', display: 'inline-block' }}>
                Choose Image
                <input type="file" accept="image/*" onChange={e => { setPortfolioFile(e.target.files[0]); setPortfolioPreview(URL.createObjectURL(e.target.files[0])); }} style={{ display: 'none' }} />
              </label>
              {portfolioPreview && <img src={portfolioPreview} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, marginLeft: 12, verticalAlign: 'middle' }} />}
            </div>
            <button onClick={handlePortfolioUpload} disabled={!portfolioFile}
              style={{ padding: '10px 24px', background: '#1a1008', color: '#ffa01e', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: 'pointer', opacity: !portfolioFile ? 0.6 : 1 }}>
              Upload
            </button>
          </div>

          {/* Portfolio Grid */}
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Portfolio ({portfolio.length} images)</h3>
          {portfolio.length === 0 ? (
            <p style={{ color: '#9e8e7a', fontSize: 13 }}>No images uploaded yet.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {portfolio.map(img => (
                <div key={img.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', overflow: 'hidden' }}>
                  <img src={img.image_url} alt={img.caption} style={{ width: '100%', height: 160, objectFit: 'cover' }} />
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1008', marginBottom: 6 }}>{img.caption || 'No caption'}</div>
                    {img.tags && img.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                        {img.tags.map((t, i) => (
                          <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c44' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => handleDeletePortfolio(img.id)} style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tags */}
      {activeTab === 'tags' && selectedVendor && (
        <div>
          {/* Add Tag */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Add Tag for {selectedVendor.name}</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Tag Name</label>
                <input value={newTag} onChange={e => setNewTag(e.target.value)} placeholder="e.g. Candid, Award Winning"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Type</label>
                <select value={tagType} onChange={e => setTagType(e.target.value)}
                  style={{ padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                  <option value="specialty">Specialty (Gold — on vendor card)</option>
                  <option value="work">Work (Grey — on image card)</option>
                </select>
              </div>
              <button onClick={handleAddTag} disabled={!newTag.trim()}
                style={{ padding: '9px 20px', background: '#1a1008', color: '#ffa01e', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', opacity: !newTag.trim() ? 0.6 : 1 }}>
                Add
              </button>
            </div>
          </div>

          {/* Specialty Tags */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1a1008', marginBottom: 12 }}>
              Specialty Tags — Gold ({specialtyTags.length}/3)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {specialtyTags.map(t => (
                <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 12px', borderRadius: 20, background: '#c9a84c22', color: '#c9a84c', border: '1px solid #c9a84c66' }}>
                  {t.tag}
                  <button onClick={() => handleDeleteTag(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c9a84c', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {specialtyTags.length === 0 && <p style={{ fontSize: 13, color: '#9e8e7a' }}>No specialty tags yet.</p>}
            </div>
          </div>

          {/* Work Tags */}
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1a1008', marginBottom: 12 }}>
              Work Tags — Grey ({workTags.length}/3)
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {workTags.map(t => (
                <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 12px', borderRadius: 20, background: '#f7f5f2', color: '#5a4a36', border: '1px solid #e8e0d5' }}>
                  {t.tag}
                  <button onClick={() => handleDeleteTag(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4a36', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {workTags.length === 0 && <p style={{ fontSize: 13, color: '#9e8e7a' }}>No work tags yet.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}