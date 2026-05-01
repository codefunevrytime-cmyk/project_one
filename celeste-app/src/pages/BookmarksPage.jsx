import { Link } from 'react-router-dom';
import { useState } from 'react';
import Footer from '../components/Footer';
import { EventCard } from '../components/EventCard';
import { EVENTS } from '../context/data/events';

export default function BookmarksPage({ bookmarks, bookmarkList, onRemove }) {
  const count = bookmarkList?.length || 0;
  const [openId, setOpenId] = useState(null);

  // build full event objects for bookmarked events
  const enrichedList = (bookmarkList || []).map(item => {
    const fullEvent = EVENTS.find(e => e.id === item.id);
    return fullEvent || item;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream, #FBF6EE)' }}>

      {/* hero stays exactly the same as before */}
      <section style={{
        background: 'linear-gradient(135deg, #1a1008 0%, #3a2410 60%, #1a1008 100%)',
        padding: '72px 6% 60px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <span style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#c9a84c', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: 16 }}>
            Saved Boards
          </span>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(2rem, 5vw, 3.6rem)', color: '#faf7f2', fontWeight: 400, lineHeight: 1.15, marginBottom: 16, maxWidth: 620 }}>
            Your curated event inspirations, all in one place.
          </h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 15, color: 'rgba(250,247,242,0.6)', fontWeight: 300, lineHeight: 1.8, maxWidth: 480, marginBottom: 36 }}>
            Bookmark events and photography vendors — they collect here for easy reference.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link to="/explore" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', border: '1.5px solid rgba(201,168,76,0.5)', color: '#c9a84c', textDecoration: 'none', fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'DM Sans, sans-serif', borderRadius: 8 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M10 8H2M5 5L2 8l3 3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back to Explore
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#c9a84c" stroke="#c9a84c" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ color: '#c9a84c', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
                <strong style={{ fontSize: 18, fontFamily: 'Playfair Display, serif' }}>{count}</strong> saved
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* content */}
      <section style={{ padding: '56px 6%', maxWidth: 1300, margin: '0 auto' }}>
        {count === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 16, border: '1px solid rgba(26,16,8,0.08)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="1.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 style={{ fontFamily: 'Playfair Display, serif', fontSize: 24, color: '#1a1008', marginBottom: 10, fontWeight: 400 }}>Nothing saved yet</h3>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 14, color: '#9e8e7a', marginBottom: 28, lineHeight: 1.7 }}>
              Hover any event card or photography vendor and tap the bookmark icon.
            </p>
            <Link to="/explore" style={{ display: 'inline-block', background: '#1a1008', color: '#ffa01e', textDecoration: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
              Explore events
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: '#c9a84c', fontFamily: 'DM Sans, sans-serif', display: 'block', marginBottom: 6 }}>Collection</span>
                <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 26, color: '#1a1008', fontWeight: 400 }}>
                  {count} saved {count === 1 ? 'reference' : 'references'}
                </h2>
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: 13, color: '#9e8e7a', maxWidth: 320, lineHeight: 1.6 }}>
                Bookmark again on any card to remove it from your collection.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
              {enrichedList.map((item) => (
                <EventCard
                  key={item.id}
                  event={item}
                  isBookmarked={true}
                  onBookmarkToggle={() => onRemove(item.id)}
                  allEvents={enrichedList}
                  openId={openId}
                  onOpen={setOpenId}
                  onClose={() => setOpenId(null)}
                />
              ))}
            </div>
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}