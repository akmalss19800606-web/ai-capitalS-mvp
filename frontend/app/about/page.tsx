'use client';
import { useLocale } from '@/lib/i18n';

/* ─── Icon helper ─── */
function SvgIcon({ paths, size = 24, color = '#3b82f6' }: { paths: React.ReactNode; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );
}

/* ─── Capability icons ─── */
const capabilityIcons = [
  <SvgIcon key="0" paths={<><path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M10 5h4v2h-4z"/></>} />,
  <SvgIcon key="1" paths={<path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/>} />,
  <SvgIcon key="2" paths={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></>} />,
  <SvgIcon key="3" paths={<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>} />,
  <SvgIcon key="4" paths={<><rect x="2" y="6" width="6" height="6" rx="1"/><rect x="16" y="6" width="6" height="6" rx="1"/><rect x="9" y="14" width="6" height="6" rx="1"/><path d="M8 9h8"/><path d="M12 9v5"/></>} />,
  <SvgIcon key="5" paths={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></>} />,
];

export default function AboutPage() {
  const { t } = useLocale();
  const s = t.about;

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff', borderRadius: '12px',
    border: '1px solid #e5e7eb', padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* ─── Hero ─── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '16px', padding: '48px 40px', marginBottom: '28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative circle */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
        }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff' }}>
            {s.heroTitle}
          </h1>
        </div>
        <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', maxWidth: '640px', lineHeight: 1.6 }}>
          {s.heroSubtitle}
        </p>
      </div>

      {/* ─── Overview ─── */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '12px' }}>
          {s.sections.overview.title}
        </h2>
        <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: 1.7 }}>
          {s.sections.overview.text}
        </p>
      </div>

      {/* ─── Capabilities ─── */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px', paddingLeft: '4px' }}>
          {s.sections.capabilities.title}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: '16px',
        }}>
          {s.sections.capabilities.items.map((item, i) => (
            <div key={i} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: '#eff6ff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {capabilityIcons[i]}
                </div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                  {item.title}
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Technology Stack ─── */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          {s.sections.tech.title}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {s.sections.tech.items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 16px', backgroundColor: '#f8fafc',
              borderRadius: '10px', border: '1px solid #f1f5f9',
            }}>
              <span style={{
                fontSize: '12px', fontWeight: 600, color: '#3b82f6',
                minWidth: '90px',
              }}>
                {item.label}
              </span>
              <span style={{ fontSize: '13px', color: '#4b5563' }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Author ─── */}
      <div style={{
        ...cardStyle, marginBottom: '20px',
        background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
        border: '1px solid #e2e8f0',
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
          {s.sections.author.title}
        </h2>
        <div className="flex items-center gap-4">
          <div style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: '18px', fontWeight: 700, flexShrink: 0,
          }}>
            СА
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
              {s.sections.author.name}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
              {s.sections.author.cert}
            </div>
            <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {s.sections.author.location}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
