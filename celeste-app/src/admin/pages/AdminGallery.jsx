import { useState, useEffect } from 'react';

const API = 'http://localhost:5000/api';
const token = () => localStorage.getItem('adminToken');

export default function AdminGallery() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', event_date: '' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [success, setSuccess] = useState('');

  const fetchImages = async () => {
    try {
      const res = await fetch(`${API}/gallery`);
      const data = await res.json();
      setImages(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, []);

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
        setForm({ title: '', description: '', event_date: '' });
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
      {/* Header */}
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
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Royal Wedding 2024"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Event Date</label>
            <input
              type="date"
              value={form.event_date}
              onChange={e => setForm({ ...form, event_date: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the event..."
            rows={2}
            style={{ width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
          />
        </div>

        {/* File picker */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: '#9e8e7a', display: 'block', marginBottom: 6 }}>Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <label style={{
              padding: '9px 18px', background: '#f7f5f2', border: '1px solid #e8e0d5',
              borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#5a4a36',
            }}>
              Choose File
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            {preview && (
              <img src={preview} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e0d5' }} />
            )}
            {file && <span style={{ fontSize: 12, color: '#9e8e7a' }}>{file.name}</span>}
          </div>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            padding: '10px 24px', background: '#1a1008', color: '#ffa01e',
            border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            fontWeight: 500, cursor: !file || uploading ? 'not-allowed' : 'pointer',
            opacity: !file || uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading...' : 'Upload Image'}
        </button>
      </div>

      {/* Image Grid */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>
          Uploaded Images ({images.length})
        </h3>

        {loading ? (
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading...</p>
        ) : images.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
            <p style={{ color: '#9e8e7a', fontSize: 13 }}>No images uploaded yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {images.map(img => (
              <div key={img.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', overflow: 'hidden' }}>
                <img src={img.image_url} alt={img.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#1a1008', marginBottom: 4 }}>{img.title || 'Untitled'}</div>
                  <div style={{ fontSize: 11, color: '#9e8e7a', marginBottom: 12 }}>{img.event_date || 'No date'}</div>
                  <button
                    onClick={() => handleDelete(img.id)}
                    style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
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