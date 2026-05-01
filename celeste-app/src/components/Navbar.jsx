import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { featuredEventTypes } from '../context/data/eventsData';
import { useAuth } from '../hooks/useAuth';

// ── Services data ──────────────────────────────────────────────
const SERVICES = [
  {
    col: 'Planning',
    icon: '✦',
    iconBg: '#EEEDFE',
    items: [
      { name: 'Full event planning', desc: 'End-to-end coordination', tag: null },
      { name: 'Partial planning', desc: 'Pick up where you left off', tag: null },
      { name: 'Virtual planning', desc: 'Remote consults & checklists', tag: { label: 'new', type: 'violet' } },
      { name: 'Budget management', desc: 'Track spend, avoid surprises', tag: null },
    ],
  },
  {
    col: 'Experience',
    icon: '♪',
    iconBg: '#E1F5EE',
    items: [
      { name: 'Entertainment booking', desc: 'Live acts, DJs, performers', tag: null },
      { name: 'Custom invitations', desc: 'Digital & printed stationery', tag: null },
      { name: 'Guest experience design', desc: 'Arrivals, gifts, flow', tag: null },
      { name: 'Photography direction', desc: 'Shoot brief & vendor liaison', tag: { label: 'popular', type: 'teal' }, path: '/services/photography' },     
      { name: 'Catering coordination', desc: 'Menu curation & vendor tie-up', tag: null },
    ],
  },
  {
    col: 'Venue & Logistics',
    icon: '◈',
    iconBg: '#FAECE7',
    items: [
      { name: 'Venue scouting', desc: 'Shortlist & site visits', tag: null },
      { name: 'Vendor management', desc: 'Contracts, follow-ups, payments', tag: null },
    ],
  },
];

const FOOTER_CARDS = [
  { title: 'Not sure where to start?', sub: 'Take the 2-min event quiz →', to: '/quiz' },
  { title: 'See past events', sub: 'Real events, real stories →', to: '/portfolio' },
  { title: 'Free budget planner', sub: 'Download the template →', to: '/resources' },
];
// ──────────────────────────────────────────────────────────────

function Chevron({ open }) {
  return (
    <svg
      className="avatar-chevron"
      style={{ transform: open ? 'rotate(180deg)' : '' }}
      viewBox="0 0 16 16"
      fill="none"
      width="14"
      height="14"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SocialLinks() {
  return (
    <div className="nav-socials">
      <a href="#" aria-label="Instagram">
        <svg viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
      <a href="#" aria-label="Facebook">
        <svg viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <a href="#" aria-label="Twitter">
        <svg viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
    </div>
  );
}

export default function Navbar({ bookmarkCount }) {
  const location = useLocation();
  const { user, isLoggedIn,  getInitials, avatarColor, signOut } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExploreOpen, setMobileExploreOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const exploreTimeoutRef = useRef(null);
  const servicesTimeoutRef = useRef(null);
  const navigate = useNavigate();

  const handleTypeClick = (type) => {
    closeAllMenus();
    navigate('/explore', { state: { selectedType: type } });
  };

  const profileRef = useRef(null);
  const exploreRef = useRef(null);
  const servicesRef = useRef(null);

  const isRouteActive = (path) => location.pathname === path;
  const isExploreRoute = location.pathname === '/events' || location.pathname === '/gallery';
  const isServicesRoute = location.pathname === '/services';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
      if (exploreRef.current && !exploreRef.current.contains(event.target)) setExploreOpen(false);
      if (servicesRef.current && !servicesRef.current.contains(event.target)) setServicesOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProfileOpen(false);
        setExploreOpen(false);
        setServicesOpen(false);
        setMobileExploreOpen(false);
        setMobileServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(exploreTimeoutRef.current);
      clearTimeout(servicesTimeoutRef.current);
    };
  }, []);

  const closeAllMenus = () => {
    setMobileOpen(false);
    setMobileExploreOpen(false);
    setMobileServicesOpen(false);
    setProfileOpen(false);
    setExploreOpen(false);
    setServicesOpen(false);
  };

  const avatar = isLoggedIn && user ? avatarColor(user.name || user.email) : { bg: '#ccc', color: '#333' };
  const initials = isLoggedIn && user ? getInitials(user.name || user.email) : '?';

  return (
    <nav>
      <Link to="/" className="nav-logo" onClick={closeAllMenus}>
        Arc<em>.</em>
      </Link>

      <ul className="nav-links">
        <li>
          <Link to="/" className={isRouteActive('/') ? 'active' : ''}>Home</Link>
        </li>

        {/* Explore Events — unchanged */}
        <li
          className="nav-events-wrap"
          ref={exploreRef}
          onMouseEnter={() => { clearTimeout(exploreTimeoutRef.current); setExploreOpen(true); }}
          onMouseLeave={() => { exploreTimeoutRef.current = setTimeout(() => setExploreOpen(false), 300); }}
        >
          <button type="button" className={`nav-link-button${isExploreRoute ? ' active' : ''}`} aria-expanded={exploreOpen}>
            Explore Events
            <Chevron open={exploreOpen} />
          </button>
          <div className={`nav-events-menu${exploreOpen ? ' open' : ''}`}>
            <Link to="/my-events" onClick={closeAllMenus}>My Events</Link>
            {featuredEventTypes.map((type) => (
              <button key={type} type="button" className="nav-type-btn" onClick={() => handleTypeClick(type)}>
                {type}
              </button>
            ))}
          </div>
        </li>

        {/* Services — new */}
        <li
          className="nav-events-wrap nav-services-wrap"
          ref={servicesRef}
          onMouseEnter={() => { clearTimeout(servicesTimeoutRef.current); setServicesOpen(true); }}
          onMouseLeave={() => { servicesTimeoutRef.current = setTimeout(() => setServicesOpen(false), 300); }}
        >
          <button type="button" className={`nav-link-button${isServicesRoute ? ' active' : ''}`} aria-expanded={servicesOpen}>
            Services
            <Chevron open={servicesOpen} />
          </button>

          <div className={`nav-services-menu${servicesOpen ? ' open' : ''}`}>
            <div className="nsm-inner">
              {SERVICES.map((col, ci) => (
                <div key={col.col} className={`nsm-col${ci < SERVICES.length - 1 ? ' nsm-col-border' : ''}`}>
                  <div className="nsm-col-head">
                    <span className="nsm-icon" style={{ background: col.iconBg }}>{col.icon}</span>
                    <span className="nsm-col-label">{col.col}</span>
                  </div>
                  {col.items.map((item) => (
                    <Link key={item.name} to={item.path || '/services'} className="nsm-item" onClick={closeAllMenus}>
                      <span className="nsm-item-name">
                        {item.name}
                        {item.tag && (
                          <span className={`nsm-pill nsm-pill-${item.tag.type}`}>{item.tag.label}</span>
                        )}
                      </span>
                      <span className="nsm-item-desc">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              ))}

              <div className="nsm-footer">
                {FOOTER_CARDS.map((card) => (
                  <Link key={card.title} to={card.to} className="nsm-footer-card" onClick={closeAllMenus}>
                    <div className="nsm-footer-card-t">{card.title}</div>
                    <div className="nsm-footer-card-s">{card.sub}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </li>

        <li>
          <Link to="/about" className={isRouteActive('/about') ? 'active' : ''}>About</Link>
        </li>
        <li>
          <Link to="/contact" className={isRouteActive('/contact') ? 'active' : ''}>Contacts</Link>
        </li>
      </ul>

      <div className="nav-right-desktop">
        <SocialLinks />
        <div className="sep"></div>
        {!isLoggedIn ? (
          <div className="nav-auth">
            <Link to="/signup" className="btn-fill">Sign Up</Link>
            <Link to="/login" className="btn-outline">Log In</Link>
          </div>
        ) : (
          <div className="profile-wrap" ref={profileRef}>
           <button type="button" className="avatar-btn" onClick={() => setProfileOpen((v) => !v)} aria-haspopup="true" aria-expanded={profileOpen}>
  
  <div style={{ position: 'relative' }}>
    <div className="avatar-circle" style={{ background: avatar.bg, color: avatar.color }}>{initials}</div>
    {bookmarkCount > 0 && (
      <span style={{
        position: 'absolute',
        top: -4, right: -4,
        background: '#e53e3e',
        color: '#fff',
        fontSize: 9,
        fontWeight: 700,
        width: 16, height: 16,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1.5px solid #fff',
        zIndex: 10,
      }}>
        {bookmarkCount > 9 ? '9+' : bookmarkCount}
      </span>
    )}
  </div>

  <div className="avatar-info">
    <span className="avatar-name">{user?.name || user?.email}</span>
    <span className="avatar-email">{user?.email || ''}</span>
  </div>
  <Chevron open={profileOpen} />
</button>
            <div className={`celeste-dropdown${profileOpen ? ' cd-open' : ''}`}>
              <div className="cd-header">
                <div className="avatar-circle avatar-circle-lg" style={{ background: avatar.bg, color: avatar.color }}>{initials}</div>
                <div>
                  <div className="cd-name">{user?.name || user?.email}</div>
                  <div className="cd-email">{user?.email || ''}</div>
                </div>
              </div>
              <Link to="/my-events" className="cd-item" onClick={closeAllMenus}>
                <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg></span>
                My Events
              </Link>
              <Link to="/create-events" className="cd-item" onClick={closeAllMenus}>
                <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg></span>
                Create Event
              </Link>
              <Link to="/bookmarks" className="cd-item" onClick={closeAllMenus}>
                <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><path d="M4 2h8a1 1 0 011 1v10l-5-3-5 3V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                Bookmarked
                <span className="nav-count-badge">{bookmarkCount}</span>
              </Link>
              <button type="button" className="cd-item" onClick={() => setProfileOpen(false)}>
                <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="4" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 7h13" stroke="currentColor" strokeWidth="1.3"/></svg></span>
                Payments
              </button>
              <button type="button" className="cd-item" onClick={() => setProfileOpen(false)}>
                <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg></span>
                Settings
              </button>
              <div className="cd-divider"></div>
              <button type="button" className="cd-item cd-danger" onClick={signOut}>
                <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>

      <button type="button" className="hamburger" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
        <span></span><span></span><span></span>
      </button>

      <div className={`mobile-menu${mobileOpen ? ' open' : ''}`}>
        <Link to="/" onClick={closeAllMenus}>Home</Link>

        <button type="button" className="mobile-submenu-trigger" onClick={() => setMobileExploreOpen((v) => !v)}>
          Explore Events <Chevron open={mobileExploreOpen} />
        </button>
        <div className={`mobile-submenu${mobileExploreOpen ? ' open' : ''}`}>
          <Link to="/events" onClick={closeAllMenus}>All Events</Link>
          {featuredEventTypes.map((type) => (
            <button key={type} type="button" className="nav-type-btn" onClick={() => handleTypeClick(type)}>{type}</button>
          ))}
        </div>

        <button type="button" className="mobile-submenu-trigger" onClick={() => setMobileServicesOpen((v) => !v)}>
          Services <Chevron open={mobileServicesOpen} />
        </button>
        <div className={`mobile-submenu${mobileServicesOpen ? ' open' : ''}`}>
          {SERVICES.flatMap((col) =>
            col.items.map((item) => (
              <Link key={item.name} to={item.path || '/services'} onClick={closeAllMenus}>{item.name}</Link>
            ))
          )}
        </div>
        
        <Link to="/about" onClick={closeAllMenus}>About</Link>
        <Link to="/contact" onClick={closeAllMenus}>Contacts</Link>

        {!isLoggedIn ? (
          <>
            <Link to="/signup" onClick={closeAllMenus}>Sign Up</Link>
            <Link to="/login" onClick={closeAllMenus}>Log In</Link>
          </>
        ) : (
          <>
            <Link to="/bookmarks" onClick={closeAllMenus}>Saved Boards ({bookmarkCount})</Link>
            <button type="button" className="cd-item cd-danger" onClick={() => { closeAllMenus(); signOut(); }}>
              <span className="cd-icon"><svg viewBox="0 0 16 16" fill="none"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
