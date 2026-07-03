import { useState, useEffect } from 'react';

import { API_URL } from '../../config/api';

const API = API_URL;
const token = () => localStorage.getItem('adminToken');

const EVENT_TYPES = ['Wedding', 'Birthday', 'Corporate', 'Concert', 'Festival', 'Sports', 'Outdoor', 'Expo', 'Cultural', 'Charity', 'Food'];
const SCALE_OPTIONS = ['Small', 'Medium', 'Large'];
const LANDING_SLOTS = 9; // matches the 3x3 grid on LandingPage.jsx

const inputStyle = {
  width: '100%', padding: '9px 12px', border: '1px solid #e8e0d5',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box', background: '#fff',
};
const labelStyle = {
  fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  color: '#9e8e7a', display: 'block', marginBottom: 6,
};

export default function AdminGallery() {
  const [images, setImages]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', event_date: '',
    price: '', tags: '', event_type: '', venue: '', scale: ''
  });
  const [showOnLanding, setShowOnLanding] = useState(false);
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState(null);
  const [success, setSuccess] = useState('');
  const [filterType, setFilterType] = useState('');
  const [viewMode, setViewMode] = useState('all'); // 'all' | 'landing'

  // Extra images panel
  const [selectedGalleryItem, setSelectedGalleryItem] = useState(null);
  const [extraImages, setExtraImages] = useState([]);
  const [extraFile, setExtraFile] = useState(null);
  const [extraPreview, setExtraPreview] = useState(null);
  const [extraCaption, setExtraCaption] = useState('');
  const [uploadingExtra, setUploadingExtra] = useState(false);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const fetchImages = async () => {
    setLoading(true);
    try {
      const url  = filterType ? `${API}/gallery?event_type=${filterType}` : `${API}/gallery`;
      const res  = await fetch(url);
      const data = await res.json();
      setImages(data);
    } catch {
      // Ignore gallery fetch errors silently.
    }
    setLoading(false);
  };

  useEffect(() => { fetchImages(); }, [filterType]);

  const fetchExtraImages = async (galleryId) => {
    try {
      const res = await fetch(`${API}/gallery/${galleryId}/images`);
      const data = await res.json();
      setExtraImages(Array.isArray(data) ? data : []);
    } catch {
      // Ignore extra-image fetch errors silently.
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('image',       file);
    fd.append('title',       form.title);
    fd.append('description', form.description);
    fd.append('event_date',  form.event_date);
    fd.append('price',       form.price);
    fd.append('tags',        form.tags);
    fd.append('event_type',  form.event_type);
    fd.append('venue',       form.venue);
    fd.append('scale',       form.scale);
    fd.append('show_on_landing', showOnLanding);

    try {
      const res  = await fetch(`${API}/gallery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(showOnLanding ? 'Image uploaded and added to Landing Page!' : 'Image uploaded successfully!');
        setFile(null);
        setPreview(null);
        setForm({ title: '', description: '', event_date: '', price: '', tags: '', event_type: '', venue: '', scale: '' });
        setShowOnLanding(false);
        fetchImages();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      // Ignore upload errors silently.
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
      if (selectedGalleryItem?.id === id) setSelectedGalleryItem(null);
      fetchImages();
    } catch {
      // Ignore delete errors silently.
    }
  };

  // ── Toggle whether an item shows on the public Landing Page ────────────
  const handleToggleLanding = async (id) => {
    try {
      await fetch(`${API}/gallery/${id}/landing`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchImages();
    } catch {
      // Ignore toggle errors silently.
    }
  };

  const openExtraPanel = (img) => {
    setSelectedGalleryItem(img);
    setExtraFile(null);
    setExtraPreview(null);
    setExtraCaption('');
    fetchExtraImages(img.id);
  };

  const handleUploadExtra = async () => {
    if (!extraFile || !selectedGalleryItem) return;
    setUploadingExtra(true);
    const fd = new FormData();
    fd.append('image', extraFile);
    fd.append('caption', extraCaption);
    try {
      const res = await fetch(`${API}/gallery/${selectedGalleryItem.id}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Extra image added!');
        setExtraFile(null);
        setExtraPreview(null);
        setExtraCaption('');
        fetchExtraImages(selectedGalleryItem.id);
        fetchImages();
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch {
      // Ignore extra upload errors silently.
    }
    setUploadingExtra(false);
  };

  const handleDeleteExtra = async (imageId) => {
    if (!window.confirm('Delete this extra image?')) return;
    try {
      await fetch(`${API}/gallery/images/${imageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token()}` },
      });
      fetchExtraImages(selectedGalleryItem.id);
      fetchImages();
    } catch {
      // Ignore extra delete errors silently.
    }
  };

  // Count total images (primary + extras) for a gallery item
  const totalImages = (img) => {
    const extras = img.gallery_images?.length || 0;
    return 1 + extras;
  };

  const landingImages = images.filter(img => img.show_on_landing);
  const displayedImages = viewMode === 'landing' ? landingImages : images;
  const landingFull = landingImages.length >= LANDING_SLOTS;

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', marginBottom: 4 }}>Gallery</h2>
        <p style={{ fontSize: 13, color: '#9e8e7a' }}>Upload and manage event photos with multi-image carousels</p>
      </div>

      {success && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#15803d' }}>
          {success}
        </div>
      )}

      {/* ── Upload Form ── */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 20 }}>Upload New Event Cover Image</h3>

        {/* Row 1: Title + Event Type */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Title</label>
            <input value={form.title} onChange={set('title')} placeholder="e.g. Royal Wedding 2024" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Event Type</label>
            <select value={form.event_type} onChange={set('event_type')} style={inputStyle}>
              <option value="">Select event type</option>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Venue + Scale */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Location / Venue</label>
            <input value={form.venue} onChange={set('venue')} placeholder="e.g. Taj Hotel, Lucknow" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Scale</label>
            <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
              {SCALE_OPTIONS.map(s => (
                <label key={s} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${form.scale === s ? '#c9a84c' : '#e8e0d5'}`,
                  background: form.scale === s ? '#fdf6e3' : '#f7f5f2',
                  color: form.scale === s ? '#8a5a00' : '#5a4a36',
                  fontSize: 13, fontWeight: form.scale === s ? 600 : 400,
                  transition: 'all 0.15s', userSelect: 'none',
                }}>
                  <input type="radio" name="scale" value={s} checked={form.scale === s} onChange={set('scale')} style={{ display: 'none' }} />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Event Date + Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Event Date</label>
            <input type="date" value={form.event_date} onChange={set('event_date')} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Price (₹)</label>
            <input type="number" value={form.price} onChange={set('price')} placeholder="e.g. 50000" style={inputStyle} />
          </div>
        </div>

        {/* Tags */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Tags (comma separated, up to 5)</label>
          <input value={form.tags} onChange={set('tags')} placeholder="e.g. Outdoor, Floral, Luxury, Evening, Candid" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={set('description')} placeholder="Brief description..." rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Show on Landing Page */}
        <div style={{
          marginBottom: 20, padding: '12px 16px', borderRadius: 8,
          background: showOnLanding ? '#fdf6e3' : '#f7f5f2',
          border: `1px solid ${showOnLanding ? '#c9a84c' : '#e8e0d5'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: '#5a4a36' }}>
            <input
              type="checkbox"
              checked={showOnLanding}
              onChange={e => setShowOnLanding(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <span>
              <strong style={{ color: '#1a1008' }}>Show on Landing Page</strong>
              {' '}— replaces one of the placeholder photos in the homepage gallery
            </span>
          </label>
          <span style={{ fontSize: 11, color: landingFull ? '#b91c1c' : '#9e8e7a', flexShrink: 0, marginLeft: 12 }}>
            {landingImages.length}/{LANDING_SLOTS} slots used
          </span>
        </div>

        {/* Image picker */}
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Cover Image</label>
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
          {uploading ? 'Uploading…' : 'Upload Cover Image'}
        </button>
      </div>

      {/* ── Extra Images Panel ── */}
      {selectedGalleryItem && (
        <div style={{ background: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', margin: 0 }}>
                Add More Images — <em style={{ fontStyle: 'normal', color: '#c9a84c' }}>{selectedGalleryItem.title}</em>
              </h3>
              <p style={{ fontSize: 12, color: '#9e8e7a', margin: '4px 0 0' }}>These appear in the carousel after the cover image</p>
            </div>
            <button onClick={() => setSelectedGalleryItem(null)}
              style={{ background: '#fff', border: '1px solid #e8e0d5', borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', color: '#5a4a36' }}>
              Done
            </button>
          </div>

          {/* Existing extra images */}
          {extraImages.length > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
              {extraImages.map(img => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <img src={img.image_url} alt={img.caption || ''} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid #e8e0d5', display: 'block' }} />
                  {img.caption && <div style={{ fontSize: 10, color: '#9e8e7a', textAlign: 'center', marginTop: 2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.caption}</div>}
                  <button onClick={() => handleDeleteExtra(img.id)} style={{
                    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(185,28,28,0.9)', border: 'none', color: '#fff', fontSize: 10,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add extra image */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Caption (optional)</label>
              <input value={extraCaption} onChange={e => setExtraCaption(e.target.value)}
                placeholder="e.g. Ceremony setup" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Image</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ padding: '9px 14px', background: '#fff', border: '1px solid #e8e0d5', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#5a4a36', whiteSpace: 'nowrap' }}>
                  Choose
                  <input type="file" accept="image/*" onChange={e => {
                    const f = e.target.files[0];
                    setExtraFile(f);
                    setExtraPreview(URL.createObjectURL(f));
                  }} style={{ display: 'none' }} />
                </label>
                {extraPreview && <img src={extraPreview} alt="preview" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6 }} />}
              </div>
            </div>
          </div>

          <button onClick={handleUploadExtra} disabled={!extraFile || uploadingExtra} style={{
            marginTop: 12, padding: '8px 20px', background: '#c9a84c', color: '#1a1008',
            border: 'none', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
            cursor: !extraFile || uploadingExtra ? 'not-allowed' : 'pointer',
            opacity: !extraFile || uploadingExtra ? 0.6 : 1,
          }}>
            {uploadingExtra ? 'Adding…' : '+ Add Image to Carousel'}
          </button>
        </div>
      )}

      {/* ── View mode: All Gallery vs Landing Page Selection ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          onClick={() => setViewMode('all')}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13,
            fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
            background: viewMode === 'all' ? '#1a1008' : '#f7f5f2',
            color: viewMode === 'all' ? '#ffa01e' : '#5a4a36',
          }}
        >
          All Gallery ({images.length})
        </button>
        <button
          onClick={() => setViewMode('landing')}
          style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', fontSize: 13,
            fontFamily: 'inherit', cursor: 'pointer', fontWeight: 500,
            background: viewMode === 'landing' ? '#1a1008' : '#f7f5f2',
            color: viewMode === 'landing' ? '#ffa01e' : '#5a4a36',
          }}
        >
          ★ Landing Page ({landingImages.length}/{LANDING_SLOTS})
        </button>
      </div>

      {viewMode === 'landing' && (
        <div style={{ background: '#fdf6e3', border: '1px solid #f0e0b0', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 12, color: '#8a5a00', lineHeight: 1.6 }}>
          These images show on the homepage gallery instead of the placeholder stock photos. There are {LANDING_SLOTS} slots on the homepage —
          as long as fewer than {LANDING_SLOTS} images are marked here, the remaining slots are filled automatically with placeholders. Once you fill all {LANDING_SLOTS},
          the placeholders disappear completely.
        </div>
      )}

      {/* ── Filter pills (only relevant in All Gallery view) ── */}
      {viewMode === 'all' && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['', ...EVENT_TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #e8e0d5', background: filterType === t ? '#1a1008' : '#f7f5f2', color: filterType === t ? '#ffa01e' : '#5a4a36', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t === '' ? 'All' : t}
            </button>
          ))}
        </div>
      )}

      {/* ── Image Grid ── */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 500, color: '#1a1008', marginBottom: 16 }}>
          {viewMode === 'landing'
            ? `Landing Page Images (${landingImages.length})`
            : `${filterType ? `${filterType} Events` : 'All Images'} (${images.length})`}
        </h3>

        {loading ? (
          <p style={{ color: '#9e8e7a', fontSize: 13 }}>Loading…</p>
        ) : displayedImages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: 12, border: '1px solid #e8e0d5' }}>
            <p style={{ color: '#9e8e7a', fontSize: 13 }}>
              {viewMode === 'landing' ? 'No images marked for the landing page yet.' : 'No images found.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {displayedImages.map(img => (
              <div key={img.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${img.show_on_landing ? '#c9a84c' : (selectedGalleryItem?.id === img.id ? '#c9a84c' : '#e8e0d5')}`, overflow: 'hidden' }}>

                {/* Image + badges */}
                <div style={{ position: 'relative' }}>
                  <img src={img.image_url} alt={img.title} style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                  {img.event_type && (
                    <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: 'rgba(26,16,8,0.75)', color: '#ffa01e', fontWeight: 500 }}>
                      {img.event_type}
                    </span>
                  )}
                  {img.scale && (
                    <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: 'rgba(26,16,8,0.75)', color: '#e8c97a', fontWeight: 500 }}>
                      {img.scale}
                    </span>
                  )}
                  {/* Image count badge */}
                  {totalImages(img) > 1 && (
                    <span style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: 'rgba(201,168,76,0.9)', color: '#1a1008', fontWeight: 600 }}>
                      {totalImages(img)} photos
                    </span>
                  )}
                  {/* Landing page badge */}
                  {img.show_on_landing && (
                    <span style={{ position: 'absolute', bottom: 10, left: 10, fontSize: 10, padding: '3px 9px', borderRadius: 20, background: '#c9a84c', color: '#1a1008', fontWeight: 700 }}>
                      ★ Landing
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1008', marginBottom: 5 }}>{img.title || 'Untitled'}</div>

                  {/* Venue + Date row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#9e8e7a', marginBottom: 8 }}>
                    {img.venue && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5s4.5-5 4.5-8.5c0-2.5-2-4.5-4.5-4.5z"/>
                          <circle cx="8" cy="6" r="1.5"/>
                        </svg>
                        {img.venue}
                      </span>
                    )}
                    <span>
                      {img.event_date
                        ? new Date(img.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'No date'}
                    </span>
                  </div>

                  {img.price > 0 && (
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#c9a84c', marginBottom: 8 }}>
                      ₹{Number(img.price).toLocaleString('en-IN')}
                    </div>
                  )}

                  {img.tags && img.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                      {img.tags.slice(0, 3).map((t, i) => (
                        <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: '#f0e8d8', color: '#8a5a00', border: '1px solid #e8d0a0' }}>{t}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <button onClick={() => openExtraPanel(img)}
                      style={{ flex: 1, fontSize: 11, color: '#c9a84c', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      + More Photos ({totalImages(img)})
                    </button>
                    <button onClick={() => handleDelete(img.id)}
                      style={{ fontSize: 11, color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      Delete
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleLanding(img.id)}
                    disabled={!img.show_on_landing && landingFull}
                    style={{
                      width: '100%', fontSize: 11, fontFamily: 'inherit', cursor: (!img.show_on_landing && landingFull) ? 'not-allowed' : 'pointer',
                      padding: '6px 10px', borderRadius: 6,
                      background: img.show_on_landing ? '#fdf6e3' : '#f7f5f2',
                      border: `1px solid ${img.show_on_landing ? '#c9a84c' : '#e8e0d5'}`,
                      color: img.show_on_landing ? '#8a5a00' : '#5a4a36',
                      fontWeight: 500,
                      opacity: (!img.show_on_landing && landingFull) ? 0.5 : 1,
                    }}
                    title={!img.show_on_landing && landingFull ? `All ${LANDING_SLOTS} landing slots are full` : ''}
                  >
                    {img.show_on_landing ? '★ Remove from Landing Page' : '☆ Add to Landing Page'}
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