import { useState, useEffect } from 'react';
import { DEFAULT_VENDOR_SERVICE, VENDOR_SERVICE_CONFIGS, getVendorServiceConfig } from '../../context/data/vendorServiceConfig';

import { API_URL } from '../../config/api';
import './AdminVendors.css';

const API = API_URL;
const token = () => localStorage.getItem('adminToken');

export default function AdminVendors() {
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [serviceFilter, setServiceFilter] = useState('all');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [portfolio, setPortfolio] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vendors');

  // Add vendor form
  const [vendorForm, setVendorForm] = useState({ name: '', specialty: '', contact: '', service_id: String(DEFAULT_VENDOR_SERVICE.serviceId), price_per_day: '' });
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
  const selectedServiceConfig = getVendorServiceConfig(vendorForm.service_id);

  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API}/vendors`);
      const data = await res.json();
      setVendors(data);
    } catch {
      // Ignore vendor fetch errors silently.
    }
    setLoading(false);
  };

  const fetchServices = async () => {
    try {
      const res = await fetch(`${API}/services`);
      const data = await res.json();
      setServices(Array.isArray(data) ? data : []);
    } catch {
      // Ignore service fetch errors silently.
    }
  };

  const fetchPortfolio = async (vendorId) => {
    try {
      const res = await fetch(`${API}/vendors/${vendorId}/portfolio`);
      const data = await res.json();
      setPortfolio(data);
    } catch {
      // Ignore portfolio fetch errors silently.
    }
  };

  const fetchTags = async (vendorId) => {
    try {
      const res = await fetch(`${API}/vendors/${vendorId}/tags`);
      const data = await res.json();
      setTags(data);
    } catch {
      // Ignore tag fetch errors silently.
    }
  };

  useEffect(() => { fetchVendors(); fetchServices(); }, []);

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
  setVendorForm({ name: '', specialty: '', contact: '', service_id: vendorForm.service_id || String(DEFAULT_VENDOR_SERVICE.serviceId), price_per_day: '' });
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
  const vendorServiceLabel = (serviceId) => getVendorServiceConfig(serviceId || DEFAULT_VENDOR_SERVICE.serviceId).title;

  const filteredVendors = serviceFilter === 'all'
    ? vendors
    : vendors.filter(v => String(v.service_id) === String(serviceFilter));

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
      <div className="admin-vendors-tabs">
        {['vendors', 'add', ...(selectedVendor ? ['portfolio', 'tags'] : [])].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`admin-vendors-tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'portfolio' ? `${selectedVendor?.name} - Portfolio` : 
             tab === 'tags' ? `${selectedVendor?.name} - Tags` : tab}
          </button>
        ))}
      </div>

      {/* Vendors List */}
      {activeTab === 'vendors' && (
        <div>
          {/* Service filter buttons — sourced from services table */}
          <div className="admin-vendors-filters">
            <button
              onClick={() => setServiceFilter('all')}
              className={`admin-vendors-filter-btn ${serviceFilter === 'all' ? 'active' : ''}`}
            >
              All Services ({vendors.length})
            </button>
            {services.map(s => {
              const count = vendors.filter(v => String(v.service_id) === String(s.id)).length;
              const isActive = String(serviceFilter) === String(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => setServiceFilter(s.id)}
                  className={`admin-vendors-filter-btn ${isActive ? 'active' : ''}`}
                >
                  {s.name} ({count})
                </button>
              );
            })}
          </div>

          {loading ? <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p> :
            filteredVendors.length === 0 ? (
              <div className="admin-vendors-empty">
                <p className="admin-vendors-empty-text">
                  {vendors.length === 0 ? 'No vendors yet. Add one first.' : 'No vendors found for this service.'}
                </p>
              </div>
            ) : (
              <div className="admin-vendors-grid">
                {filteredVendors.map(v => (
                  <div key={v.id} className={`admin-vendor-card ${!v.is_active ? 'inactive' : ''}`}>
                    <div style={{ position: 'relative' }}>
  {v.photo_url && <img src={v.photo_url} alt={v.name} className="admin-vendor-image" />}
  {!v.photo_url && <div className="admin-vendor-image-placeholder">📷</div>}

  {/* NEW: vendor-controlled active/inactive (online) status badge —
      distinct from the is_active toggle button below, which is the
      admin's own account activation control. */}
  <span className={`admin-vendor-status-badge ${v.is_online === false ? 'inactive' : ''}`}>
    <span className="admin-vendor-status-dot" />
    {v.is_online === false ? 'Inactive' : 'Active'}
  </span>
</div>
                    <div className="admin-vendor-content">
                      <div className="admin-vendor-name">{v.name}</div>
                      <div className="admin-vendor-service">{vendorServiceLabel(v.service_id)}</div>
                      <div className="admin-vendor-specialty">{v.specialty} · {v.contact}</div>
                      <div className="admin-vendor-price">
                        {v.price_per_day ? `₹${Number(v.price_per_day).toLocaleString('en-IN')} / day` : 'No price set'}
                      </div>
                      <div className="admin-vendor-actions">
                        <button onClick={() => selectVendor(v)} className="admin-vendor-btn">
                          Manage
                        </button>
                        <button onClick={() => handleToggle(v.id)} className={`admin-vendor-btn ${v.is_active ? 'deactivate' : 'activate'}`}>
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
          <div className="admin-vendor-form-group">
            <label className="admin-vendor-label">Vendor Service</label>
            <select
              value={vendorForm.service_id}
              onChange={e => setVendorForm({ ...vendorForm, service_id: e.target.value, specialty: '' })}
              className="admin-vendor-select"
            >
              {VENDOR_SERVICE_CONFIGS.map(service => (
                <option key={service.id} value={service.serviceId}>{service.title}</option>
              ))}
            </select>
          </div>
          <div className="admin-vendor-form-grid">
            {[
              ['Name', 'name', selectedServiceConfig.id === 'custom-invitations' ? 'e.g. Ivory Paper Co.' : 'e.g. Golden Hour Studios', 'text'],
              [selectedServiceConfig.admin.specialtyLabel, 'specialty', selectedServiceConfig.admin.specialtyPlaceholder, 'text'],
              ['Contact', 'contact', 'Phone or email', 'text'],
              [selectedServiceConfig.admin.priceLabel, 'price_per_day', selectedServiceConfig.admin.pricePlaceholder, 'number'],
            ].map(([label, key, placeholder, type]) => (
              <div key={key} className="admin-vendor-form-group">
                <label className="admin-vendor-label">{label}</label>
                <input 
                  type={type} 
                  value={vendorForm[key]} 
                  onChange={e => setVendorForm({ ...vendorForm, [key]: e.target.value })} 
                  placeholder={placeholder}
                  className="admin-vendor-input"
                />
              </div>
            ))}
          </div>
          <div className="admin-vendor-form-group">
            <label className="admin-vendor-label">Photo</label>
            <label className="admin-vendor-file-label">
              Choose Photo
              <input type="file" accept="image/*" onChange={e => setVendorPhoto(e.target.files[0])} style={{ display: 'none' }} />
            </label>
            {vendorPhoto && <span style={{ fontSize: 12, color: '#9e8e7a', marginLeft: 12 }}>{vendorPhoto.name}</span>}
          </div>
          <button onClick={handleAddVendor} disabled={!vendorForm.name} className="admin-vendor-submit-btn">
            Add Vendor
          </button>
        </div>
      )}

      {/* Portfolio */}
      {activeTab === 'portfolio' && selectedVendor && (
        <div>
          {/* Upload */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>{getVendorServiceConfig(selectedVendor.service_id).admin.portfolioTitle}</h3>
            <div className="admin-vendor-form-grid">
              <div className="admin-vendor-form-group">
                <label className="admin-vendor-label">Caption</label>
                <input 
                  value={portfolioCaption} 
                  onChange={e => setPortfolioCaption(e.target.value)} 
                  placeholder="e.g. Royal Wedding 2024"
                  className="admin-vendor-input"
                />
              </div>
              <div className="admin-vendor-form-group">
                <label className="admin-vendor-label">Tags (comma separated, max 3)</label>
                <input 
                  value={portfolioTags} 
                  onChange={e => setPortfolioTags(e.target.value)} 
                  placeholder={getVendorServiceConfig(selectedVendor.service_id).admin.tagsPlaceholder}
                  className="admin-vendor-input"
                />
              </div>
            </div>
            <div className="admin-vendor-form-group">
              <label className="admin-vendor-file-label">
                Choose Image
                <input type="file" accept="image/*" onChange={e => { setPortfolioFile(e.target.files[0]); setPortfolioPreview(URL.createObjectURL(e.target.files[0])); }} style={{ display: 'none' }} />
              </label>
              {portfolioPreview && <img src={portfolioPreview} style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, marginLeft: 12, verticalAlign: 'middle' }} />}
            </div>
            <button onClick={handlePortfolioUpload} disabled={!portfolioFile} className="admin-vendor-submit-btn">
              Upload
            </button>
          </div>

          {/* Portfolio Grid */}
          <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>Portfolio ({portfolio.length} images)</h3>
          {portfolio.length === 0 ? (
            <p style={{ color: '#9e8e7a', fontSize: 13 }}>No images uploaded yet.</p>
          ) : (
            <div className="admin-portfolio-grid">
              {portfolio.map(img => (
                <div key={img.id} className="admin-portfolio-card">
                  <img src={img.image_url} alt={img.caption} className="admin-portfolio-image" />
                  <div className="admin-portfolio-content">
                    <div className="admin-portfolio-caption">{img.caption || 'No caption'}</div>
                    {img.tags && img.tags.length > 0 && (
                      <div className="admin-portfolio-tags">
                        {img.tags.map((t, i) => (
                          <span key={i} className="admin-portfolio-tag">{t}</span>
                        ))}
                      </div>
                    )}
                    <button onClick={() => handleDeletePortfolio(img.id)} className="admin-portfolio-delete-btn">
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
            <div className="admin-tags-add-row">
              <div className="admin-vendor-form-group">
                <label className="admin-vendor-label">Tag Name</label>
                <input 
                  value={newTag} 
                  onChange={e => setNewTag(e.target.value)} 
                  placeholder="e.g. Candid, Award Winning"
                  className="admin-vendor-input"
                />
              </div>
              <div className="admin-vendor-form-group">
                <label className="admin-vendor-label">Type</label>
                <select 
                  value={tagType} 
                  onChange={e => setTagType(e.target.value)}
                  className="admin-vendor-select"
                >
                  <option value="specialty">Specialty (Gold — on vendor card)</option>
                  <option value="work">Work (Grey — on image card)</option>
                </select>
              </div>
              <button 
                onClick={handleAddTag} 
                disabled={!newTag.trim()}
                className="admin-vendor-submit-btn"
              >
                Add
              </button>
            </div>
          </div>

          {/* Specialty Tags */}
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 500, color: '#1a1008', marginBottom: 12 }}>
              Specialty Tags — Gold ({specialtyTags.length}/3)
            </h3>
            <div className="admin-tags-list">
              {specialtyTags.map(t => (
                <span key={t.id} className="admin-tag-item">
                  {t.tag}
                  <button onClick={() => handleDeleteTag(t.id)} className="admin-tag-delete-btn">×</button>
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
            <div className="admin-tags-list">
              {workTags.map(t => (
                <span key={t.id} className="admin-tag-item work">
                  {t.tag}
                  <button onClick={() => handleDeleteTag(t.id)} className="admin-tag-delete-btn">×</button>
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