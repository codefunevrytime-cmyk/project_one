import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Concert', 'Festival', 'Sports', 'Outdoor', 'Expo', 'Cultural', 'Charity', 'Food'];

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '', price: '', tags: '', event_type: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [success, setSuccess] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchImages = async () => {
    try {
      const url = filterType ? `${API}/gallery?event_type=${filterType}` : `${API}/gallery`;
      const res = await fetch(url);
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, [filterType]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', file);
    formData.append('title', form.title);
    formData.append('description', form.description);
    formData.append('event_date', form.event_date);
    formData.append('price', form.price);
    formData.append('tags', form.tags);
    formData.append('event_type', form.event_type);

    try {
      const res = await fetch(`${API}/gallery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Image uploaded successfully!');
        setFile(null);
        setPreview(null);
        setForm({ title: '', description: '', event_date: '', price: '', tags: '', event_type: '' });
        fetchImages();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await fetch(`${API}/gallery/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchImages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Gallery</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Upload and manage recent event photos</p>
      </div>

      {/* Upload Form */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Upload New Image</h3>

        {success && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
            {success}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Royal Wedding 2024"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Event Type</label>
            <select value={form.event_type} onChange={e => setForm({ ...form, event_type: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}>
              <option value="">Select event type</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Event Date</label>
            <input type="date" value={form.event_date} onChange={e => setForm({ ...form, event_date: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Price (₹)</label>
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 50000"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Tags (comma separated, up to 5)</label>
          <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="e.g. Outdoor, Floral, Luxury, Evening, Candid"
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{ padding: '9px 18px', background: '#f7f5f2', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#5a4a36' }}>
              Choose File
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            {preview && <img src={preview} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e0d5' }} />}
            {file && <span style={{ fontSize: 12, color: '#9e8e7a' }}>{file.name}</span>}
          </div>
        </div>

        <button onClick={handleUpload} disabled={!file || uploading}
          style={{ padding: '10px 24px', background: '#1a1008', color: '#ffa01e', border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500, cursor: !file || uploading ? 'not-allowed' : 'pointer', opacity: !file || uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      {/* Filter by event type */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterType('')} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e8e0d5', background: filterType === '' ? '#1a1008' : '#f7f5f2', color: filterType === '' ? '#ffa01e' : '#5a4a36', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
          All
        </button>
        {EVENT_TYPES.map(t => (
          <button key={t} onClick={() => setFilterType(t)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e8e0d5', background: filterType === t ? '#1a1008' : '#f7f5f2', color: filterType === t ? '#ffa01e' : '#5a4a36', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Image Grid */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>
          {filterType ? `${filterType} Events` : 'All Images'} ({images.length})
        </h3>

        {loading ? (
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p>
        ) : images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
            <p style={{ color: '#9e8e7a', fontSize: 13 }}>No images found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {images.map(img => (
              <div key={img.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', overflow: 'hidden' }}>
                <div style={{ position: 'relative' }}>
                  <img src={img.image_url} alt={img.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                  {img.event_type && (
                    <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: 'rgba(26,16,8,0.7)', color: '#ffa01e', fontWeight: 500 }}>
                      {img.event_type}
                    </span>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#371616', marginBottom: 4 }}>{img.title || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: '#9e8e7a', marginBottom: 8 }}>{img.event_date ? new Date(img.event_date).toLocaleDateString() : 'No date'}</div>
                  {img.price > 0 && (
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#ffa01e', marginBottom: 8 }}>₹{Number(img.price).toLocaleString('en-IN')}</div>
                  )}
                  {img.tags && img.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {img.tags.slice(0, 3).map((t, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0e8d8', color: '#8a5a00', border: '1px solid #e8d0a0' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  <button onClick={() => handleDelete(img.id)} style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}