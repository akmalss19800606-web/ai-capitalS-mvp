'use client';
import React from 'react';

// Color Palette (shared with DD page) - Task 1.1
const C = {
  bg: '#f8f8fc',
  card: '#ffffff',
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
  success: '#22c55e',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  error: '#ef4444',
  errorBg: '#fef2f2',
  badgeBg: '#f1f5f9',
} as const;

// Task 1.2 - Interface
export interface CompanyProfileCardProps {
  data: {
    name?: string;
    inn?: string;
    oked?: string;
    industry?: string;
    founded_year?: string | number;
    address?: string;
    region?: string;
    director?: string;
    authorized_capital?: string | number;
    status?: string;
    employee_count?: string | number;
    legal_form?: string;
    phone?: string;
    email?: string | null;
  } | null;
  onClose?: () => void;
}

// Task 1.4 - renderStatus
function renderStatus(status?: string) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('действ') || s.includes('active')) {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: C.successBg, color: C.success, fontSize: 12, fontWeight: 600 }}>
        {status}
      </span>
    );
  }
  if (s.includes('ликвид') || s.includes('liquidat')) {
    return (
      <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: C.errorBg, color: C.error, fontSize: 12, fontWeight: 600 }}>
        {status}
      </span>
    );
  }
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: C.badgeBg, color: C.muted, fontSize: 12, fontWeight: 600 }}>
      {status}
    </span>
  );
}

// Task 1.5 - Styles
const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: 12,
  padding: '10px 20px',
  alignItems: 'center',
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const valueStyle: React.CSSProperties = {
  fontSize: 14,
  color: C.text,
  fontWeight: 500,
};

// Task 1.6 - External links
const externalLinks = [
  { label: 'Налоговая', url: 'https://soliq.uz' },
  { label: 'Гос. услуги my.gov.uz', url: 'https://my.gov.uz/ru/service/77' },
  { label: 'Госзакупки', url: 'https://zakupki.uz' },
  { label: 'ЦБ Реестр', url: 'https://csbar.uz' },
  { label: 'Суды', url: 'https://sud.uz' },
  { label: 'ТИАЦ', url: 'https://www.tiac.uz' },
];

// Task 1.7 - Main component
export default function CompanyProfileCard({ data, onClose }: CompanyProfileCardProps) {
  if (!data) return null;

  // Task 1.3 - rows
  const rows = [
    { label: 'Название', value: data.name },
    { label: 'ИНН', value: data.inn },
    { label: 'ОПФ', value: data.legal_form },
    { label: 'ОКЭД', value: data.oked ?? data.industry },
    { label: 'Директор', value: data.director },
    { label: 'Год основания', value: data.founded_year },
    { label: 'Адрес', value: data.address },
    { label: 'Регион', value: data.region },
    { label: 'Уставной капитал', value: data.authorized_capital },
    { label: 'Сотрудников', value: data.employee_count },
    { label: 'Телефон', value: data.phone },
    { label: 'Email', value: data.email },
  ].filter(row => row.value !== undefined && row.value !== null && row.value !== '');

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{'Профиль компании'}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{'Данные из реестра'}</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}>
            {'\u00d7'}
          </button>
        )}
      </div>

      {/* Data rows with alternating background */}
      {rows.map((row, i) => (
        <div key={i} style={{ ...rowStyle, backgroundColor: i % 2 === 0 ? C.card : C.bg }}>
          <span style={labelStyle}>{row.label}</span>
          <span style={valueStyle}>{row.value}</span>
        </div>
      ))}

      {/* Status row */}
      {data.status && (
        <div style={{ ...rowStyle, backgroundColor: rows.length % 2 === 0 ? C.card : C.bg }}>
          <span style={labelStyle}>{'Статус'}</span>
          <span>{renderStatus(data.status)}</span>
        </div>
      )}

      {/* External links - Task 1.6 */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, backgroundColor: C.bg }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 10 }}>
          {'Внешние источники'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
          {externalLinks.map((link, i) => (
            <a
              key={i}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 12,
                color: C.primary,
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: 6,
                backgroundColor: C.primaryLight,
                border: '1px solid #bfdbfe',
                display: 'inline-block',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#dbeafe'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = C.primaryLight; }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
