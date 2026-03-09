'use client';
import { useState } from 'react';
import { useLocale } from '@/lib/i18n';

export default function ContactsPage() {
  const { t } = useLocale();
  const c = t.contacts;

  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate sending (in production → POST /api/v1/contacts)
    await new Promise(r => setTimeout(r, 1200));
    setSending(false);
    setSent(true);
    setForm({ name: '', email: '', subject: '', message: '' });
    setTimeout(() => setSent(false), 5000);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff', borderRadius: '12px',
    border: '1px solid #e5e7eb', padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
    fontSize: '14px', outline: 'none', color: '#1e293b',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#475569', marginBottom: '6px',
  };

  /* Contact info items */
  const infoItems = [
    {
      ...c.info.phone,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
      href: 'tel:+998987390198',
    },
    {
      ...c.info.email,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      ),
      href: 'mailto:atom2014@bk.ru',
    },
    {
      ...c.info.address,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      href: null,
    },
    {
      ...c.info.hours,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
      href: null,
    },
  ];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* ─── Header ─── */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
          {c.title}
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          {c.subtitle}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '24px',
      }}>
        {/* ─── Contact info cards ─── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {infoItems.map((item, i) => {
            const content = (
              <div key={i} style={{
                ...cardStyle, display: 'flex', alignItems: 'center', gap: '14px',
                cursor: item.href ? 'pointer' : 'default',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => {
                  if (item.href) {
                    e.currentTarget.style.borderColor = '#bfdbfe';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(59,130,246,0.08)';
                  }
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
              >
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  backgroundColor: '#eff6ff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, marginBottom: '2px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                    {item.value}
                  </div>
                </div>
              </div>
            );

            if (item.href) {
              return (
                <a key={i} href={item.href} style={{ textDecoration: 'none', color: 'inherit' }}>
                  {content}
                </a>
              );
            }
            return <div key={i}>{content}</div>;
          })}

          {/* ─── Mini map placeholder (Tashkent) ─── */}
          <div style={{
            ...cardStyle, padding: 0, overflow: 'hidden',
            height: '180px', position: 'relative',
          }}>
            <iframe
              src="https://www.openstreetmap.org/export/embed.html?bbox=69.15%2C41.25%2C69.40%2C41.38&layer=mapnik"
              style={{
                width: '100%', height: '100%', border: 'none',
                filter: 'grayscale(30%) contrast(95%)',
              }}
              loading="lazy"
              title="Tashkent map"
            />
          </div>
        </div>

        {/* ─── Contact form ─── */}
        <div style={cardStyle}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
            {c.form.title}
          </h2>

          {sent && (
            <div style={{
              backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
              fontSize: '13px', color: '#15803d',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {c.form.successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{c.form.name}</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={c.form.namePlaceholder} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{c.form.email}</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder={c.form.emailPlaceholder} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>{c.form.subject}</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder={c.form.subjectPlaceholder} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{c.form.message}</label>
              <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder={c.form.messagePlaceholder} required rows={5}
                style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }} />
            </div>
            <button type="submit" disabled={sending}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                opacity: sending ? 0.7 : 1,
                transition: 'opacity 0.15s',
                boxShadow: '0 4px 12px rgba(59,130,246,0.2)',
                fontFamily: 'Inter, sans-serif',
              }}>
              {sending ? c.form.sending : c.form.submit}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
