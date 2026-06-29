import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import styles from "./CreateEventPage.module.css";

const API = "http://localhost:5000/api";

export default function VendorSelectionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, bookmarks } = useAuth();
  
  const eventData = location.state?.eventData || {};
  const [vendors, setVendors] = useState([]);
  const [bookmarkedVendors, setBookmarkedVendors] = useState([]);
  const [referenceVendors, setReferenceVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [photographyType, setPhotographyType] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, bookmarked, reference

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    // Filter bookmarked vendors from all vendors
    if (vendors.length > 0) {
      const bookmarked = vendors.filter(v => bookmarks[v.id]);
      setBookmarkedVendors(bookmarked);
    }
  }, [vendors, bookmarks]);

  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API}/vendors`);
      const data = await res.json();
      setVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceVendors = async () => {
    try {
      const referenceEventId = location.state?.eventData?.referenceEventId;
      if (!referenceEventId) {
        setReferenceVendors([]);
        return;
      }
      
      // Fetch vendors associated with this reference event
      // This would need an endpoint to get vendors by event
      // For now, we'll use a placeholder - you may need to create this endpoint
      const res = await fetch(`${API}/events/${referenceEventId}/vendors`);
      const data = await res.json();
      setReferenceVendors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching reference vendors:", err);
      setReferenceVendors([]);
    }
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
  };

  const handleContinue = () => {
    if (!selectedVendor) {
      alert("Please select a vendor to continue");
      return;
    }
    
    // Calculate quoted price with buffer
    const basePrice = selectedVendor.price_per_day || 20000;
    const bufferPrice = Math.round(basePrice * 1.15); // 15% buffer
    
    // Check if this is a reselection for an existing booking
    const reselectBookingId = location.state?.reselectBookingId;
    
    if (reselectBookingId) {
      // Update existing booking with new vendor
      fetch(`${API}/bookings/${reselectBookingId}/reselect-vendor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: selectedVendor.id,
          quoted_price: bufferPrice
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          navigate("/my-events", { state: { vendorReselected: true } });
        } else {
          alert("Failed to update vendor. Please try again.");
        }
      })
      .catch(() => {
        alert("Error updating vendor. Please try again.");
      });
    } else {
      // New event flow
      navigate("/create-event", {
        state: {
          ...location.state,
          selectedVendor: {
            ...selectedVendor,
            quotedPrice: bufferPrice,
            photographyType
          },
          eventData: {
            ...eventData,
            vendor_id: selectedVendor.id,
            quoted_price: bufferPrice
          }
        }
      });
    }
  };

  const photographyTypes = [
    "Traditional Photography",
    "Candid Photography",
    "Drone Photography",
    "Cinematic Videography",
    "Pre-wedding Shoot",
    "Event Coverage"
  ];

  const filteredVendors = filter === "bookmarked" 
    ? bookmarkedVendors 
    : filter === "reference"
    ? referenceVendors
    : vendors;

  if (loading) {
    return (
      <div className={styles.root}>
        <div style={{ padding: "60px 32px", textAlign: "center", color: "rgba(200,175,120,0.4)" }}>
          Loading vendors...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Back
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Choose <em>Vendor</em></h1>
        </div>
      </header>

      <main className={styles.body}>
        {/* Event Summary */}
        <div style={{ background: "rgba(200,175,120,0.04)", border: "0.5px solid rgba(200,175,120,0.1)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(200,175,120,0.4)", marginBottom: 12 }}>
            Event Details
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: "rgba(200,175,120,0.4)", marginBottom: 4 }}>Event Name</div>
              <div style={{ fontSize: 13, color: "#e8dcc8" }}>{eventData.name || "Not specified"}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(200,175,120,0.4)", marginBottom: 4 }}>Date</div>
              <div style={{ fontSize: 13, color: "#e8dcc8" }}>
                {eventData.date ? new Date(eventData.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : "Not specified"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: "rgba(200,175,120,0.4)", marginBottom: 4 }}>Location</div>
              <div style={{ fontSize: 13, color: "#e8dcc8" }}>{eventData.location || "Not specified"}</div>
            </div>
          </div>
        </div>

        {/* Photography Type Selection */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "#e8dcc8", marginBottom: 12 }}>
            Type of Photography Required
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {photographyTypes.map(type => (
              <button
                key={type}
                onClick={() => setPhotographyType(type)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 20,
                  fontSize: 12,
                  border: photographyType === type ? "0.5px solid #c8af78" : "0.5px solid rgba(200,175,120,0.15)",
                  background: photographyType === type ? "rgba(200,175,120,0.12)" : "rgba(200,175,120,0.04)",
                  color: photographyType === type ? "#c8af78" : "rgba(200,175,120,0.6)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              border: filter === "all" ? "0.5px solid #c8af78" : "0.5px solid rgba(200,175,120,0.15)",
              background: filter === "all" ? "rgba(200,175,120,0.12)" : "transparent",
              color: filter === "all" ? "#c8af78" : "rgba(200,175,120,0.6)",
              cursor: "pointer"
            }}
          >
            Browse All Vendors
          </button>
          <button
            onClick={() => setFilter("bookmarked")}
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              border: filter === "bookmarked" ? "0.5px solid #c8af78" : "0.5px solid rgba(200,175,120,0.15)",
              background: filter === "bookmarked" ? "rgba(200,175,120,0.12)" : "transparent",
              color: filter === "bookmarked" ? "#c8af78" : "rgba(200,175,120,0.6)",
              cursor: "pointer"
            }}
          >
            From Bookmarks
          </button>
          {referenceVendors.length > 0 && (
            <button
              onClick={() => setFilter("reference")}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                border: filter === "reference" ? "0.5px solid #c8af78" : "0.5px solid rgba(200,175,120,0.15)",
                background: filter === "reference" ? "rgba(200,175,120,0.12)" : "transparent",
                color: filter === "reference" ? "#c8af78" : "rgba(200,175,120,0.6)",
                cursor: "pointer"
              }}
            >
              From Reference Event
            </button>
          )}
        </div>

        {/* Vendor List */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {filteredVendors.map(vendor => (
            <div
              key={vendor.id}
              onClick={() => handleVendorSelect(vendor)}
              style={{
                background: selectedVendor?.id === vendor.id ? "rgba(200,175,120,0.08)" : "#1e1a14",
                border: selectedVendor?.id === vendor.id ? "0.5px solid #c8af78" : "0.5px solid rgba(200,175,120,0.15)",
                borderRadius: 12,
                padding: 20,
                cursor: "pointer",
                transition: "all 0.2s",
                position: "relative"
              }}
            >
              {selectedVendor?.id === vendor.id && (
                <div style={{ position: "absolute", top: 12, right: 12, color: "#c8af78" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
              )}
              
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(200,175,120,0.1)", overflow: "hidden", flexShrink: 0 }}>
                  {vendor.photo_url ? (
                    <img src={vendor.photo_url} alt={vendor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                      📷
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#e8dcc8", marginBottom: 4 }}>
                    {vendor.name}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(200,175,120,0.5)" }}>
                    {vendor.specialty}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "0.5px solid rgba(200,175,120,0.08)" }}>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(200,175,120,0.4)", marginBottom: 2 }}>Base Price</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#c8af78" }}>
                    ₹{(vendor.price_per_day || 0).toLocaleString('en-IN')}
                    <span style={{ fontSize: 11, color: "rgba(200,175,120,0.4)", fontWeight: 400, marginLeft: 4 }}>/day</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "rgba(200,175,120,0.4)" }}>
                  +15% buffer
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(200,175,120,0.4)" }}>
            No vendors found. Try browsing all vendors instead.
          </div>
        )}

        {/* Continue Button */}
        {selectedVendor && (
          <div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(200,175,120,0.04)", border: "0.5px solid rgba(200,175,120,0.1)", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "rgba(200,175,120,0.6)", marginBottom: 4 }}>Selected Vendor</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: "#e8dcc8" }}>{selectedVendor.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, color: "rgba(200,175,120,0.6)", marginBottom: 4 }}>Estimated Price (with buffer)</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#c8af78" }}>
                  ₹{((selectedVendor.price_per_day || 0) * 1.15).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            <button
              onClick={handleContinue}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "#c8af78",
                color: "#141210",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                transition: "background 0.2s"
              }}
            >
              Continue to Create Event
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
