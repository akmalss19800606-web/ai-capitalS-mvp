'use client';

/* ─── Bloomberg-style Footer ─── */
export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{
      backgroundColor: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      padding: '16px 24px',
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
      }}>
        {/* Left: copyright */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '5px',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>
            &copy; {year} AI Capital Management
          </span>
        </div>

        {/* Center: author */}
        <div style={{
          fontSize: '11px', color: '#9ca3af', textAlign: 'center',
          display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span>Автор: Солиев Акмал Идиевич</span>
          <span style={{ color: '#d1d5db' }}>|</span>
          <span>Свидетельство №009932, РАНХиГС</span>
        </div>

        {/* Right: contacts */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          fontSize: '11px', color: '#9ca3af',
        }}>
          <a href="tel:+998987390198" style={{
            color: '#9ca3af', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            +998 98 739 01 98
          </a>
          <a href="mailto:atom2014@bk.ru" style={{
            color: '#9ca3af', textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'color 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            atom2014@bk.ru
          </a>
          <span className="footer-location" style={{
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            г. Ташкент
          </span>
        </div>
      </div>
    </footer>
  );
}
