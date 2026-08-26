// celeste-app/src/components/VendorAvailabilityNote.jsx
//
// Client-facing display of a SPECIFIC vendor's own calendar (vendor_id > 0),
// independent from the studio-wide calendar used in CreateEventPage's Step 1
// date picker. Drop this in wherever a client is looking at one particular
// vendor:
//   - CreateEventPage.jsx -> VendorBlock (pass vendorId={vendorData.vendor.id}
//     eventDate={form.event_date})
//   - VendorProfilePage.jsx -> sidebar (pass vendorId={resolvedVendorId})
import { useEffect, useState } from "react";
import { API_URL } from "../config/api";

const API = API_URL;

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function VendorAvailabilityNote({ vendorId, eventDate }) {
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!vendorId) { setLoading(false); return; }
    setLoading(true);
    fetch(`${API}/availability?vendor_id=${vendorId}`)
      .then(r => r.json())
      .then(d => setAvailability(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vendorId]);

  if (!vendorId || loading) return null;

  // ── Case 1: client already picked an event date — tell them directly
  //    whether THIS vendor is free/busy on it. ──────────────────────────
  if (eventDate) {
    const match = availability.find(a => toDateKey(new Date(a.date)) === eventDate);
    if (match?.status === "busy") {
      return (
        <div style={{ fontSize: 12, color: "#eb5757", background: "rgba(235,87,87,0.08)", border: "0.5px solid rgba(235,87,87,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
          ⚠ This vendor has marked themselves busy on your event date{match.note ? ` (${match.note})` : ""}. Consider messaging them or picking another vendor.
        </div>
      );
    }
    if (match?.status === "free") {
      return (
        <div style={{ fontSize: 12, color: "#6fcf97", background: "rgba(111,207,151,0.08)", border: "0.5px solid rgba(111,207,151,0.25)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
          ✓ This vendor has confirmed they're free on your event date.
        </div>
      );
    }
    return (
      <div style={{ fontSize: 12, color: "rgba(200,175,120,0.4)", marginBottom: 10 }}>
        This vendor hasn't marked their availability for your event date yet.
      </div>
    );
  }

  // ── Case 2: no event date yet — just show upcoming busy dates so the
  //    client can plan around them. ─────────────────────────────────────
  const upcomingBusy = availability
    .filter(a => a.status === "busy" && new Date(a.date) >= new Date())
    .slice(0, 6);

  if (upcomingBusy.length === 0) return null;

  return (
    <div style={{ fontSize: 12, color: "rgba(200,175,120,0.55)", marginBottom: 10 }}>
      Busy on: {upcomingBusy.map(a => new Date(a.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })).join(", ")}
    </div>
  );
}