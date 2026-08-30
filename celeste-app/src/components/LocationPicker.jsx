// celeste-app/src/components/LocationPicker.jsx
// Modal with a click-to-drop-pin map for sharing an exact location in chat.
// Uses Leaflet + OpenStreetMap tiles — no API key needed, unlike Google Maps.
//
// REQUIRES two new npm packages in the actual project (not installed here —
// this file is built in isolation, run these in your real repo):
//   npm install leaflet react-leaflet
//
// Reverse geocoding (turning a lat/lng into a readable address label) uses
// OpenStreetMap's free Nominatim API. It has no API key, but does have a
// usage policy: max ~1 request/second, and it asks for a descriptive
// User-Agent or Referer on production traffic. Fine for occasional chat use;
// if this sees heavy volume, self-hosting Nominatim or switching to a paid
// geocoder (Google/Mapbox) would be worth it later.

import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet's default marker icon references image files via a bundler-specific
// path that breaks under most modern bundlers (Vite/webpack5) unless fixed
// manually — this is Leaflet's own documented workaround, not a hack.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Default center: Lucknow (matches the studio's own location elsewhere in
// this codebase — e.g. VendorProfilePage.jsx's default). Only used before
// the user drops a pin or grants geolocation.
const DEFAULT_CENTER = [26.8467, 80.9462];

function ClickToDrop({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

// onConfirm({ lat, lng, label }) — called when the user confirms a pin.
// onClose() — called to dismiss without picking.
export default function LocationPicker({ onConfirm, onClose }) {
  const [picked, setPicked] = useState(null); // { lat, lng }
  const [label, setLabel]   = useState('');
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handlePick = useCallback(async (lat, lng) => {
    setPicked({ lat, lng });
    setLabel('');
    setGeocoding(true);
    const resolved = await reverseGeocode(lat, lng);
    setLabel(resolved || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    setGeocoding(false);
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { handlePick(pos.coords.latitude, pos.coords.longitude); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1400,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480, background: '#fff', borderRadius: 14,
          overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#2d2d6b' }}>Share your location</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#999', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: '10px 18px', fontSize: 12, color: '#888' }}>
          Tap on the map to drop a pin, or use your current location.
        </div>

        <div style={{ height: 320, position: 'relative' }}>
          <MapContainer
            center={picked ? [picked.lat, picked.lng] : DEFAULT_CENTER}
            zoom={picked ? 15 : 12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickToDrop onPick={handlePick} />
            {picked && <Marker position={[picked.lat, picked.lng]} />}
          </MapContainer>
        </div>

        <div style={{ padding: '12px 18px', borderTop: '1px solid #eee' }}>
          <button
            onClick={useMyLocation}
            disabled={locating}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: '1px solid #e8e8f0', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, color: '#4B49AC', cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: 10, opacity: locating ? 0.6 : 1,
            }}
          >
            📍 {locating ? 'Locating…' : 'Use my current location'}
          </button>

          {picked && (
            <div style={{ fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 1.5 }}>
              {geocoding ? 'Finding address…' : label}
            </div>
          )}

          <button
            onClick={() => picked && onConfirm({ lat: picked.lat, lng: picked.lng, label })}
            disabled={!picked || geocoding}
            style={{
              width: '100%', padding: '10px',
              background: 'linear-gradient(135deg, #4B49AC, #7978E9)',
              border: 'none', borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              cursor: 'pointer', opacity: !picked || geocoding ? 0.5 : 1,
            }}
          >
            Send this location
          </button>
        </div>
      </div>
    </div>
  );
}