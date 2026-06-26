import { useVendorAuth } from '../context/VendorAuthContext';

export default function VendorPending() {
  const { vendorUser, signOut } = useVendorAuth();
  const isRejected = vendorUser?.status === 'rejected';

  return (
    <div style={{
      minHeight: '100vh', background: '#080c14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif", padding: 24,
      backgroundImage: `linear-gradient(rgba(56,100,200,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56,100,200,0.05) 1px, transparent 1px)`,
      backgroundSize: '48px 48px',
    }}>
      <div style={{
        maxWidth: 480, width: '100%', textAlign: 'center',
        background: 'rgba(10,15,28,0.85)', backdropFilter: 'blur(20px)',
        border: `1px solid ${isRejected ? 'rgba(220,60,60,0.2)' : 'rgba(56,100,220,0.15)'}`,
        borderRadius: 20, padding: '52px 44px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 28px',
          background: isRejected ? 'rgba(220,60,60,0.1)' : 'rgba(56,100,220,0.1)',
          border: `1px solid ${isRejected ? 'rgba(220,60,60,0.25)' : 'rgba(56,100,220,0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isRejected ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff6060" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4c8aff" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 7v5l3 3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, color: '#e8eef8', marginBottom: 12 }}>
          {isRejected ? 'Application not approved' : 'Application under review'}
        </div>

        <div style={{ fontSize: 14, color: 'rgba(160,180,220,0.5)', lineHeight: 1.75, marginBottom: 36, fontWeight: 300 }}>
          {isRejected
            ? 'Your vendor application was not approved at this time. Please contact us at hello@lumiere-studio.com for more information.'
            : `Hi ${vendorUser?.name?.split(' ')[0] || 'there'}, your application is being reviewed by our team. We typically respond within 24 hours.`
          }
        </div>

        {!isRejected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36 }}>
            {[
              ['Application submitted', true],
              ['Under review by team', 'active'],
              ['Profile setup & go live', false],
            ].map(([label, done]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: done === true ? 'rgba(76,138,255,0.2)' : done === 'active' ? 'rgba(76,138,255,0.15)' : 'rgba(56,100,220,0.06)',
                  border: `1px solid ${done === true ? 'rgba(76,138,255,0.5)' : done === 'active' ? 'rgba(76,138,255,0.3)' : 'rgba(56,100,220,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {done === true && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#4c8aff" strokeWidth="1.8">
                      <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {done === 'active' && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4c8aff', animation: 'pulse 1.4s infinite' }} />
                  )}
                </div>
                <span style={{ fontSize: 13, color: done === false ? 'rgba(160,180,220,0.25)' : '#e8eef8' }}>{label}</span>
              </div>
            ))}
          </div>
        )}

        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>

        <button
          onClick={signOut}
          style={{
            background: 'rgba(56,100,220,0.1)', border: '1px solid rgba(56,100,220,0.2)',
            borderRadius: 9, padding: '10px 28px', color: 'rgba(160,180,220,0.6)',
            fontSize: 13, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
