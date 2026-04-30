import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────
   ROYAL CELESTE THEME
   Deep navy + warm gold accents — elegant & dark
───────────────────────────────────────────── */
const T = {
  bg:           "#080d1a",
  bgCard:       "#0c1428",
  border:       "rgba(180,150,80,0.18)",
  borderHover:  "rgba(180,150,80,0.45)",
  gold:         "#c9a84c",
  goldLight:    "#e4c87a",
  goldSoft:     "rgba(201,168,76,0.10)",
  goldGlow:     "0 0 32px rgba(201,168,76,0.12)",
  gradText:     "linear-gradient(135deg, #e4c87a 0%, #c9a84c 60%, #a07830 100%)",
  textPrimary:  "#f0e8d8",
  textSecondary:"#8a9ab8",
  textTertiary: "#4a5a72",
  divider:      "rgba(180,150,80,0.15)",
};

function RoyalCard({ style, children }) {
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      style={{ ...style, transition: "border-color 0.25s, box-shadow 0.25s, transform 0.25s" }}
      onMouseEnter={() => {
        if (ref.current) {
          ref.current.style.borderColor = T.borderHover;
          ref.current.style.boxShadow   = T.goldGlow;
          ref.current.style.transform   = "translateY(-2px)";
        }
      }}
      onMouseLeave={() => {
        if (ref.current) {
          ref.current.style.borderColor = T.border;
          ref.current.style.boxShadow   = "none";
          ref.current.style.transform   = "translateY(0)";
        }
      }}
    >
      {children}
    </div>
  );
}

function Counter({ target }) {
  const [val, setVal] = useState(0);
  const num = parseInt(target);
  const suffix = target.replace(/[0-9]/g, "");
  useEffect(() => {
    let cur = 0;
    const step = Math.max(1, Math.ceil(num / 40));
    const timer = setInterval(() => {
      cur += step;
      if (cur >= num) { setVal(num); clearInterval(timer); }
      else setVal(cur);
    }, 30);
    return () => clearInterval(timer);
  }, [num]);
  return <>{val}{suffix}</>;
}

function Label({ children }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 400,
      textTransform: "uppercase", letterSpacing: "0.22em",
      color: T.gold, marginBottom: "0.65rem",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {children}
    </div>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: `1px solid ${T.divider}`, margin: "2.5rem 0" }} />;
}

function GoldButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: 12, padding: "10px 28px",
        borderRadius: 8,
        border: `1px solid ${T.gold}`,
        background: T.goldSoft,
        color: T.goldLight,
        cursor: "pointer",
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        fontFamily: "'DM Sans', sans-serif",
        transition: "background 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(201,168,76,0.22)";
        e.currentTarget.style.boxShadow  = "0 0 20px rgba(201,168,76,0.25)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.goldSoft;
        e.currentTarget.style.boxShadow  = "none";
      }}
    >
      {children}
    </button>
  );
}

const sH2 = {
  fontSize: 22, fontWeight: 500,
  color: "#f0e8d8", marginBottom: "0.8rem",
  letterSpacing: "-0.01em",
  fontFamily: "'Cormorant Garamond', Georgia, serif",
};

const sP = {
  fontSize: 15, color: "#8a9ab8",
  lineHeight: 1.85, fontStyle: "italic",
  fontFamily: "'Cormorant Garamond', Georgia, serif",
};

const gridCards = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12, marginTop: "1.2rem",
};

export default function AboutUsContent() {
  return (
    <div style={{
      fontFamily: "'Cormorant Garamond', Georgia, serif",
      color: T.textPrimary,
      background: "transparent",
      maxWidth: 900,
      margin: "0 auto",
      padding: "0 1.5rem 4rem",
    }}>

      {/* HERO */}
      <div style={{
        textAlign: "center",
        padding: "4rem 1rem 3rem",
        position: "relative",
        borderBottom: `1px solid ${T.divider}`,
        marginBottom: "3rem",
      }}>
        <div style={{
          position: "absolute", top: 0, left: "50%",
          transform: "translateX(-50%)",
          width: 500, height: 260,
          background: "radial-gradient(ellipse, rgba(201,168,76,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          display: "inline-block",
          fontSize: 10, letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: T.gold, marginBottom: "1rem",
          fontFamily: "'DM Sans', sans-serif",
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: "0.4rem",
        }}>
          About Us
        </div>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 500,
          background: T.gradText,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          marginBottom: "1.2rem",
          lineHeight: 1.2,
        }}>
          We Bring Your Events to Life
        </h1>
        <p style={{ ...sP, maxWidth: 520, margin: "0 auto" }}>
          From intimate gatherings to grand celebrations, we handle every detail
          so you can enjoy every moment.
        </p>
      </div>

      {/* OUR STORY */}
      <div style={{ marginBottom: "3rem" }}>
        <Label>Our Story</Label>
        <h2 style={sH2}>Who We Are</h2>
        <p style={sP}>
          Founded with a passion for creating unforgettable experiences, our team
          has been crafting exceptional events since 2018. We believe every occasion
          deserves careful thought, creative energy, and flawless execution — whether
          it's a wedding, corporate conference, birthday, or product launch.
        </p>
      </div>

      {/* STATS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 12, marginBottom: "1rem",
      }}>
        {[
          { num: "500+", lbl: "Events Planned" },
          { num: "98%",  lbl: "Client Satisfaction" },
          { num: "7+",   lbl: "Years Experience" },
          { num: "50+",  lbl: "Vendor Partners" },
        ].map((s) => (
          <RoyalCard key={s.lbl} style={{
            background: T.bgCard,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: "1.4rem 0.75rem",
            textAlign: "center",
          }}>
            <div style={{
              fontSize: 28, fontWeight: 600,
              background: T.gradText,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              <Counter target={s.num} />
            </div>
            <div style={{
              fontSize: 11, color: T.textTertiary,
              marginTop: 5, letterSpacing: "0.07em",
              textTransform: "uppercase",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {s.lbl}
            </div>
          </RoyalCard>
        ))}
      </div>

      <Divider />

      {/* SERVICES */}
      <div style={{ marginBottom: "3rem" }}>
        <Label>What We Offer</Label>
        <h2 style={sH2}>Our Services</h2>
        <div style={gridCards}>
          {[
            { icon: "🎊", title: "Full Event Planning",  desc: "End-to-end management from concept to cleanup." },
            { icon: "📋", title: "Vendor Coordination",  desc: "We liaise with caterers, decorators, AV teams, and more." },
            { icon: "📅", title: "Day-of Management",    desc: "On-site team ensures everything runs on schedule." },
            { icon: "💡", title: "Theme & Design",       desc: "Creative concepts tailored to your vision and style." },
          ].map((c) => (
            <RoyalCard key={c.title} style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: "1.3rem 1.4rem",
            }}>
              <div style={{ fontSize: 20, marginBottom: 10 }}>{c.icon}</div>
              <h3 style={{
                fontSize: 14, fontWeight: 500,
                color: T.textPrimary, marginBottom: 6,
              }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>{c.desc}</p>
            </RoyalCard>
          ))}
        </div>
      </div>

      <Divider />

      {/* VALUES */}
      <div style={{ marginBottom: "3rem" }}>
        <Label>Our Values</Label>
        <h2 style={sH2}>What Drives Us</h2>
        <div style={{ ...gridCards, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
          {[
            { title: "Attention to Detail",  desc: "No element is too small. Every touchpoint is considered." },
            { title: "Client-First Mindset", desc: "Your vision leads the way. We listen before we plan." },
            { title: "Reliability",          desc: "We commit to deadlines and deliver without excuses." },
          ].map((c) => (
            <RoyalCard key={c.title} style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderTop: `2px solid ${T.gold}55`,
              borderRadius: 14,
              padding: "1.3rem 1.4rem",
            }}>
              <div style={{
                width: 28, height: 2,
                background: T.gradText,
                borderRadius: 2, marginBottom: 12,
              }} />
              <h3 style={{
                fontSize: 14, fontWeight: 500,
                color: T.goldLight, marginBottom: 6,
              }}>{c.title}</h3>
              <p style={{ fontSize: 13, color: T.textSecondary, lineHeight: 1.7 }}>{c.desc}</p>
            </RoyalCard>
          ))}
        </div>
      </div>

      <Divider />

      {/* TEAM */}
      <div style={{ marginBottom: "3rem" }}>
        <Label>The Team</Label>
        <h2 style={sH2}>Meet the People Behind Your Event</h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12, marginTop: "1.2rem",
        }}>
          {[
            { i: "SA", name: "Sophia Arora",  role: "Founder & Lead Planner", bg: "#1a1535", fg: "#c4b5fd" },
            { i: "RK", name: "Rohan Kapoor",  role: "Vendor Relations",        bg: "#0d2420", fg: "#6ee7b7" },
            { i: "PM", name: "Priya Mehta",   role: "Creative Director",        bg: "#271510", fg: "#fca98a" },
            { i: "AJ", name: "Arjun Joshi",   role: "Operations Manager",       bg: "#0c1e35", fg: "#93c5fd" },
          ].map((m) => (
            <RoyalCard key={m.name} style={{
              background: T.bgCard,
              border: `1px solid ${T.border}`,
              borderRadius: 14, padding: "1.3rem 1rem",
              textAlign: "center",
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 600,
                background: m.bg, color: m.fg,
                border: `1px solid ${m.fg}33`,
                margin: "0 auto 12px",
                fontFamily: "'DM Sans', sans-serif",
              }}>{m.i}</div>
              <h3 style={{
                fontSize: 13.5, fontWeight: 500,
                color: T.textPrimary, marginBottom: 3,
              }}>{m.name}</h3>
              <p style={{ fontSize: 12, color: T.textSecondary }}>{m.role}</p>
            </RoyalCard>
          ))}
        </div>
      </div>

      <Divider />

      {/* CTA */}
      <div style={{
        background: "linear-gradient(135deg, #0e1830 0%, #0c1428 100%)",
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: "2.5rem 2rem",
        textAlign: "center",
        boxShadow: T.goldGlow,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* decorative corners */}
        <div style={{ position:"absolute", top:16, left:16, width:36, height:36,
          borderTop:`1px solid ${T.gold}44`, borderLeft:`1px solid ${T.gold}44`, borderRadius:"4px 0 0 0" }} />
        <div style={{ position:"absolute", bottom:16, right:16, width:36, height:36,
          borderBottom:`1px solid ${T.gold}44`, borderRight:`1px solid ${T.gold}44`, borderRadius:"0 0 4px 0" }} />

        <h2 style={{ ...sH2, fontSize: 22, marginBottom: 10,
          background: T.gradText,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          Ready to Start Planning?
        </h2>
        <p style={{ ...sP, marginBottom: "1.5rem" }}>
          Let's turn your next event into an experience people won't forget.
        </p>
        <GoldButton onClick={() => {
          if (typeof sendPrompt === "function")
            sendPrompt("I want to start planning an event. What information do you need from me?");
        }}>
          Get Started ↗
        </GoldButton>
      </div>

    </div>
  );
}
