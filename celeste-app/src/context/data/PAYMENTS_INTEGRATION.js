// ============================================================
//  PAYMENT SYSTEM — ROUTER INTEGRATION GUIDE
//  Drop these routes into your existing React Router setup
// ============================================================

// ── 1. ADD THESE ROUTES to your App.jsx / router config ──────

import PaymentsEmpty    from "./pages/PaymentsEmpty";
import PaymentCheckout  from "./pages/PaymentCheckout";
import PaymentsHistory  from "./pages/PaymentsHistory";

// Inside your <Routes>:
//
//  <Route path="/payments"           element={<PaymentsGate />} />
//  <Route path="/payments/checkout"  element={<PaymentCheckout />} />
//  <Route path="/payments/success"   element={<PaymentsHistory />} />
//
// PaymentsGate decides which page to show:

import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export function PaymentsGate() {
  const navigate = useNavigate();

  // Replace this with your real auth/data check
  // e.g. const { events } = useUserEvents();
  const userHasEvents = checkUserHasPayments(); // your DB call

  if (!userHasEvents) return <PaymentsEmpty />;
  return <PaymentsHistory />;
}

function checkUserHasPayments() {
  // Replace with: fetch('/api/user/payments').then(r => r.json())
  // Return true if user has any events/transactions
  return false; // default: show empty state
}


// ── 2. AFTER "CREATE EVENT" — redirect to checkout ────────────
//
// In your booking submission handler (where you currently
// navigate to the "Booking submitted!" page), ALSO push to:
//
//   navigate("/payments/checkout", {
//     state: {
//       event: {
//         id:       bookingId,          // from DB response
//         name:     formData.eventName,
//         type:     formData.eventType,
//         venue:    formData.venue,
//         guests:   formData.guestCount,
//         vendors:  formData.vendors.length,
//         date:     formData.eventDate,
//         time:     formData.eventTime,
//         breakdown: [
//           { label: "Catering service", sub: "Base package",   amount: cateringCost },
//           { label: "Florist",          sub: "Arrangements",   amount: floristCost  },
//           { label: "Per-head catering",sub: `${guests}×₹180`, amount: perHeadTotal },
//           { label: "Contingency (12%)",sub: "On subtotal",    amount: contingency  },
//         ],
//         gst: 0.18,
//       }
//     }
//   });
//
// The checkout page reads this from location.state automatically.


// ── 3. AFTER PAYMENT — redirect to history with success banner ─
//
// In PaymentCheckout.jsx's handlePay(), after your Razorpay
// callback succeeds, navigate like this:
//
//   navigate("/payments/success", {
//     state: {
//       fromSuccess: true,
//       event,
//       advance,
//       balance,
//       method,
//     }
//   });
//
// PaymentsHistory detects `fromSuccess` and shows the banner.


// ── 4. PROFILE DROPDOWN — "Payments" link ─────────────────────
//
// Your existing profile dropdown has a "Payments" menu item.
// Change its onClick to:
//
//   navigate("/payments")
//
// If user has no events → PaymentsEmpty (no transactions msg)
// If user has events    → PaymentsHistory (full history)


// ── 5. FILE STRUCTURE ─────────────────────────────────────────
//
//  src/
//  ├── pages/
//  │   ├── PaymentsEmpty.jsx      ← empty state (no events)
//  │   ├── PaymentCheckout.jsx    ← checkout (after create event)
//  │   └── PaymentsHistory.jsx    ← history + success banner
//  └── App.jsx                    ← add routes here


// ── 6. QUICK DATA FLOW SUMMARY ────────────────────────────────
//
//  Create Event form
//       ↓ submit
//  POST /api/events  →  DB saves event
//       ↓
//  navigate("/payments/checkout", { state: { event } })
//       ↓ user pays
//  Razorpay webhook → POST /api/payments/confirm
//       ↓
//  navigate("/payments/success", { state: { fromSuccess: true, ... } })
//       ↓
//  PaymentsHistory page with success banner shown
//
//  Profile → Payments
//       ↓
//  GET /api/user/payments
//    → empty?  PaymentsEmpty
//    → has data? PaymentsHistory (no banner)
