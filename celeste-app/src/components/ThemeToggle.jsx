import { useTheme } from '../hooks/useTheme';

export default function ThemeToggle({ className = '' }) {
  const { isLight, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      <span className="tt-track">
        <span className="tt-bg tt-bg-day" style={{ opacity: isLight ? 1 : 0 }}>
          <span className="tt-cloud tt-cloud-a" />
          <span className="tt-cloud tt-cloud-b" />
        </span>
        <span className="tt-bg tt-bg-night" style={{ opacity: isLight ? 0 : 1 }}>
          <span className="tt-star tt-star-a" />
          <span className="tt-star tt-star-b" />
          <span className="tt-star tt-star-c" />
        </span>
        <span className={`tt-knob ${isLight ? 'tt-knob-sun' : 'tt-knob-moon'}`} />
      </span>

      <style>{`
        .theme-toggle-btn {
          background: none; border: none; padding: 0; margin: 0;
          cursor: pointer; line-height: 0;
          -webkit-tap-highlight-color: transparent;
        }
        .tt-track {
          position: relative; display: inline-block;
          width: 56px; height: 28px; border-radius: 999px; overflow: hidden;
          box-shadow: inset 0 1px 4px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.18);
        }
        .tt-bg { position: absolute; inset: 0; transition: opacity 0.45s ease; }
        .tt-bg-day   { background: linear-gradient(100deg, #FFCB6B 0%, #7FC6F5 45%, #BEE6FF 100%); }
        .tt-bg-night { background: linear-gradient(100deg, #10121e 0%, #232a45 55%, #343a5e 100%); }
        .tt-cloud { position: absolute; background: rgba(255,255,255,0.85); border-radius: 999px; }
        .tt-cloud-a { width: 14px; height: 6px; right: 6px; top: 8px; }
        .tt-cloud-b { width: 9px; height: 5px; right: 4px; top: 15px; opacity: 0.7; }
        .tt-star {
          position: absolute; width: 2px; height: 2px;
          background: #fff; border-radius: 50%;
          animation: tt-twinkle 1.8s ease-in-out infinite;
        }
        .tt-star-a { left: 8px; top: 7px; animation-delay: 0s; }
        .tt-star-b { left: 14px; top: 16px; animation-delay: 0.5s; }
        .tt-star-c { left: 6px; top: 18px; animation-delay: 1s; }
        @keyframes tt-twinkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        .tt-knob {
          position: absolute; top: 3px; left: 3px;
          width: 22px; height: 22px; border-radius: 50%;
          transition: transform 0.45s cubic-bezier(0.34, 1.3, 0.4, 1), background 0.45s ease, box-shadow 0.45s ease;
          box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          transform: translateX(0);
        }
        .tt-knob-sun {
          background: radial-gradient(circle at 35% 32%, #FFEA9E, #FFB74D 65%, #FF9800);
        }
        .tt-knob-moon {
          transform: translateX(28px);
          background: radial-gradient(circle at 35% 32%, #F7F7F9, #D4D4DA 60%, #B5B5C0);
          box-shadow:
            inset -3px -2px 0 0 rgba(120,120,130,0.35),
            inset 2px 2px 0 0 rgba(255,255,255,0.4),
            0 1px 3px rgba(0,0,0,0.4);
        }
      `}</style>
    </button>
  );
}