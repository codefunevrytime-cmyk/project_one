// Drop this file into:  celeste-app/src/components/BookmarkToast.jsx

export default function BookmarkToast({ toast }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: `translateX(-50%) translateY(${toast.visible ? "0" : "60px"})`,
        opacity: toast.visible ? 1 : 0,
        background: "#1a1612",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: 8,
        fontSize: "0.84rem",
        fontFamily: "inherit",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 8,
        whiteSpace: "nowrap",
        pointerEvents: "none",
        transition: "opacity 0.3s, transform 0.35s cubic-bezier(.34,1.56,.64,1)",
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={toast.message === "Bookmark added" ? "#fff" : "none"}
        stroke="#fff"
        strokeWidth="1.8"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {toast.message}
    </div>
  );
}
