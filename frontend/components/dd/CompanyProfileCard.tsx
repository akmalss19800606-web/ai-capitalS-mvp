'use client';
import React from 'react';

// Color Palette (shared with DD page)
const C = {
  bg: '#f8fafc',
  text: '#1e293b',
  textMuted: '#64748b',
  textLight: '#94a3b8',
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  success: '#22c55e',
  successLight: '#f0fdf4',
  error: '#ef4444',
  errorLight: '#fef2f2',
  warning: '#f59e0b',
  warningLight: '#fffbeb',
  purple: '#8b5cf6',
  purpleLight: '#f5f3ff',
  cyan: '#06b6d4',
  border: '#e2e8f0',
  white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  muted: '#94a3b8',
} as const;

interface CompanyInfo {
  name: string;
  inn?: string;
  industry?: string;
  geography?: string;
  oked?: string;
  address?: string;
  region?: string;
  employee_count?: number;
  director?: string;
  registration_date?: string;
  status?: string;
  authorized_capital?: number;
  tax_id?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface ExternalLink {
  label: string;
  url: string;
}

interface CompanyProfileCardProps {
  company: CompanyInfo | null;
  loading?: boolean;
}

const card: React.CSSProperties = {
  backgroundColor: C.white,
  borderRadius: '12px',
  boxShadow: C.cardShadow,
  padding: '20px',
};

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.bg}` }}>
      <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
    </div>
  );
}

export default function CompanyProfileCard({ company, loading = false }: CompanyProfileCardProps) {
  if (loading) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 14, color: C.textMuted }}>Загрузка профиля компании...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 14, color: C.textLight }}>Выполните поиск компании для отображения профиля</div>
      </div>
    );
  }

  const statusColor = company.status === 'active' || company.status === 'Действующий'
    ? C.success
    : company.status === 'liquidated' || company.status === 'Ликвидирован'
    ? C.error
    : C.warning;

  const externalLinks: ExternalLink[] = [
    { label: 'Реестр', url: `https://orginfo.uz/search?q=${encodeURIComponent(company.inn || company.name)}` },
    { label: 'Налоговая', url: `https://my.soliq.uz/tax-debts/?tin=${company.inn || ''}` },
    { label: 'Суды', url: `https://public.sud.uz/search?query=${encodeURIComponent(company.name)}` },
  ];

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{company.name}</div>
          {company.inn && (
            <div style={{ fontSize: 12, color: C.textMuted }}>ИНН: {company.inn}</div>
          )}
        </div>
        {company.status && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: statusColor,
            backgroundColor: statusColor === C.success ? C.successLight : statusColor === C.error ? C.errorLight : C.warningLight,
            padding: '3px 10px',
            borderRadius: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>
            {company.status}
          </span>
        )}
      </div>

      {/* Info Rows */}
      <div style={{ marginBottom: 16 }}>
        <InfoRow label="Отрасль" value={company.industry || company.oked} />
        <InfoRow label="География" value={company.geography || company.address || company.region} />
        <InfoRow label="Директор" value={company.director} />
        <InfoRow label="Дата регистрации" value={company.registration_date} />
        <InfoRow label="Уставной капитал" value={company.authorized_capital ? `${company.authorized_capital.toLocaleString()} сум` : undefined} />
        <InfoRow label="Сотрудников" value={company.employee_count} />
        <InfoRow label="Телефон" value={company.phone} />
        <InfoRow label="Email" value={company.email} />
        <InfoRow label="Веб-сайт" value={company.website} />
      </div>

      {/* External Links */}
      <div style={{ padding: '14px 20px', borderTop: `1px solid ${C.border}`, backgroundColor: C.bg }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 10 }}>
          внешние источники
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
