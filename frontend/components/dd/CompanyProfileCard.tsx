'use client';
import React from 'react';
import { formatCurrencyUZS } from '@/lib/formatters';

// ─── Color Palette ──────────────────────────────────────────────────────────
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

// ─── E3-01: CompanyProfile interface ────────────────────────────────────────
export interface CompanyProfile {
  inn: string;
  name: string;
  shortName?: string;
  director?: string;
  legalForm?: string;
  authorizedCapital?: number;
  foundedYear?: number;
  okedCode?: string;
  okedName?: string;
  region?: string;
  address?: string;
  licenses?: string[];
  isActive: boolean;
}

// Adapter: maps raw lookup result to CompanyProfile
function toCompanyProfile(data: Record<string, any>): CompanyProfile {
  const yearRaw = data.founded_year ?? data.foundedyear ?? data.foundedYear;
  const capitalRaw = data.authorized_capital ?? data.authorizedcapital ?? data.authorizedCapital;
  const statusRaw = (data.status || '').toLowerCase();
  const isActive = !statusRaw || statusRaw.includes('действ') || statusRaw.includes('active');

  return {
    inn: data.inn || '',
    name: data.name || data.shortName || '',
    shortName: data.shortName ?? data.short_name,
    director: data.director,
    legalForm: data.legal_form ?? data.legalform ?? data.legalForm,
    authorizedCapital: capitalRaw ? Number(capitalRaw) : undefined,
    foundedYear: yearRaw ? Number(yearRaw) : undefined,
    okedCode: data.oked ?? data.okedCode,
    okedName: data.industry ?? data.okedName,
    region: data.region,
    address: data.address,
    licenses: data.licenses,
    isActive,
  };
}

// ─── Props ──────────────────────────────────────────────────────────────────
export interface CompanyProfileCardProps {
  data: Record<string, any> | null;
  onClose?: () => void;
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  padding: '16px 20px',
};

const cellLabel: React.CSSProperties = {
  fontSize: 11,
  color: C.muted,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 4,
};

const cellValue: React.CSSProperties = {
  fontSize: 14,
  color: C.text,
  fontWeight: 500,
};

// ─── Main component (E3-01) ─────────────────────────────────────────────────
export default function CompanyProfileCard({ data, onClose }: CompanyProfileCardProps) {
  if (!data) return null;

  const profile = toCompanyProfile(data);
  const currentYear = new Date().getFullYear();
  const yearsOnMarket = profile.foundedYear ? currentYear - profile.foundedYear : null;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
      {/* Header: name + INN */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{profile.name}</div>
          {profile.inn && (
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              ИНН: {profile.inn}
            </div>
          )}
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: C.muted, lineHeight: 1, padding: '4px 8px', borderRadius: 6 }}>
            {'\u00d7'}
          </button>
        )}
      </div>

      {/* 2x3 grid */}
      <div style={gridStyle}>
        {/* 1. ИНН with green check */}
        <div>
          <div style={cellLabel}>ИНН</div>
          <div style={{ ...cellValue, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 4,
              backgroundColor: C.successBg, border: `1px solid ${C.successBorder}`,
              fontSize: 13, fontWeight: 600, color: C.success,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {profile.inn || '—'}
            </span>
          </div>
        </div>

        {/* 2. Статус */}
        <div>
          <div style={cellLabel}>Статус</div>
          <div style={cellValue}>
            {profile.isActive ? (
              <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: C.successBg, color: C.success, fontSize: 12, fontWeight: 600 }}>
                Действующее
              </span>
            ) : (
              <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: C.errorBg, color: C.error, fontSize: 12, fontWeight: 600 }}>
                Ликвидировано
              </span>
            )}
          </div>
        </div>

        {/* 3. Уставный капитал */}
        <div>
          <div style={cellLabel}>Уставный капитал</div>
          <div style={cellValue}>
            {profile.authorizedCapital != null
              ? formatCurrencyUZS(profile.authorizedCapital, { compact: profile.authorizedCapital >= 1_000_000 })
              : '—'}
          </div>
        </div>

        {/* 4. Год основания + лет на рынке */}
        <div>
          <div style={cellLabel}>Год основания</div>
          <div style={cellValue}>
            {profile.foundedYear
              ? `${profile.foundedYear} г.${yearsOnMarket != null && yearsOnMarket > 0 ? ` (${yearsOnMarket} лет на рынке)` : ''}`
              : '—'}
          </div>
        </div>

        {/* 5. ОКЭД */}
        <div>
          <div style={cellLabel}>ОКЭД</div>
          <div style={cellValue}>
            {profile.okedCode || profile.okedName
              ? `${profile.okedCode ? profile.okedCode + ' — ' : ''}${profile.okedName || ''}`
              : '—'}
          </div>
        </div>

        {/* 6. Директор */}
        <div>
          <div style={cellLabel}>Директор</div>
          <div style={cellValue}>{profile.director || '—'}</div>
        </div>
      </div>

      {/* Extra info if available */}
      {(profile.legalForm || profile.region || profile.address || (profile.licenses && profile.licenses.length > 0)) && (
        <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 13, color: C.muted }}>
          {profile.legalForm && <span>ОПФ: <strong style={{ color: C.text }}>{profile.legalForm}</strong></span>}
          {(profile.region || profile.address) && <span>Адрес: <strong style={{ color: C.text }}>{profile.address || profile.region}</strong></span>}
          {profile.licenses && profile.licenses.length > 0 && (
            <span>Лицензий: <strong style={{ color: C.text }}>{profile.licenses.length}</strong></span>
          )}
        </div>
      )}
    </div>
  );
}
