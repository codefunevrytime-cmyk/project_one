import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Shown when a guest tries to bookmark, or tries to message a vendor —
// only logged-in users can do either. Same modal, copy varies by `reason`
// so each flow explains itself without duplicating the dialog.
const COPY = {
  bookmark: {
    icon: (
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    ),
    title: "Save your favorites",
    text: "Log in or create a free account to bookmark vendors and events and pick up right where you left off.",
  },
  message: {
    icon: (
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    ),
    title: "Sign in to message vendors",
    text: "Log in or create a free account to start a conversation with vendors and get replies to your enquiries.",
  },
};

export default function LoginPromptModal({ open, onClose, reason = "bookmark" }) {
  const navigate = useNavigate();
  const copy = COPY[reason] || COPY.bookmark;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (path) => { onClose(); navigate(path); };

  return (
    <div
      className="modal-backdrop open"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="login-prompt" role="dialog" aria-modal="true" aria-labelledby="login-prompt-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          x
        </button>

        <div className="login-prompt-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {copy.icon}
          </svg>
        </div>

        <h2 id="login-prompt-title" className="login-prompt-title">{copy.title}</h2>
        <p className="login-prompt-text">{copy.text}</p>

        <div className="login-prompt-actions">
          <button type="button" className="login-prompt-btn primary" onClick={() => go("/login")}>
            Log in
          </button>
          <button type="button" className="login-prompt-btn ghost" onClick={() => go("/signup")}>
            Create account
          </button>
        </div>

        <button type="button" className="login-prompt-dismiss" onClick={onClose}>
          Maybe later
        </button>
      </div>
    </div>
  );
}