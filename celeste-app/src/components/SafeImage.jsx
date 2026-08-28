// src/components/SafeImage.jsx
//
// Drop-in replacement for a plain <img> tag that always falls back to the
// shared "Lumière Visual Studio / IMAGE UNAVAILABLE" placeholder instead of
// a browser's native broken-image icon. Two failure cases are handled:
//
//   1. Empty/missing src (e.g. `vendor.photo_url || ''`) — falls back to
//      PLACEHOLDER_IMAGE immediately, before the browser ever tries to
//      load anything.
//   2. A real src that fails to load (deleted upload, dead external URL
//      like an expired Unsplash link, network hiccup) — the onError
//      handler swaps the src to PLACEHOLDER_IMAGE, which resolves against
//      server/server.js's /uploads catch-all SVG.
//
// Usage: identical to <img>, just import SafeImage and use it in place of
// the native tag — `<SafeImage src={vendor.cover} alt={vendor.name} />`.
// All other props (className, style, loading, etc.) pass through as-is.

import { PLACEHOLDER_IMAGE } from '../config/api';

export function SafeImage({ src, alt = '', onError, ...rest }) {
  return (
    <img
      src={src || PLACEHOLDER_IMAGE}
      alt={alt}
      onError={(e) => {
        // Guard against an infinite loop if the placeholder itself ever
        // fails to load for some reason.
        if (e.currentTarget.src !== PLACEHOLDER_IMAGE) {
          e.currentTarget.src = PLACEHOLDER_IMAGE;
        }
        onError?.(e);
      }}
      {...rest}
    />
  );
}

export default SafeImage;
