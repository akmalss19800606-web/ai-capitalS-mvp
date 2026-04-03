'use client';
import React from 'react';

// ─── Color Palette ──────────────────────────────────────────────────────────
const C = {
  bg: '#f8f8fc',
  card: '#ffffff',
  primary: '#3b82f6',
  primaryLight: '#eff6ff',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
} as const;

// ─── E3-04: External Sources ────────────────────────────────────────────────
const EXTERNAL_SOURCES = [
  { name: 'Налоговый комитет', description: 'Налоговая задолженность', url: 'https://soliq.uz/check?inn={inn}', icon: '\u{1F3DB}\uFE0F' },
  { name: 'My.gov.uz', description: 'Госреестр юрлиц', url: 'https://my.gov.uz/ru/company/{inn}', icon: '\u{1F3E2}' },
  { name: 'Закупки.уз', description: 'Госзакупки', url: 'https://zakupki.uz/supplier/{inn}', icon: '\u{1F4CB}' },
  { name: 'CSBAR', description: 'Аккредитация', url: 'https://csbar.uz/search?inn={inn}', icon: '\u2705' },
  { name: 'Электронный суд', description: 'Судебные дела', url: 'https://sud.uz/search?inn={inn}', icon: '\u2696\uFE0F' },
  { name: 'TIAC (Арбитраж)', description: 'Арбитражные споры', url: 'https://tiac.uz/search?party={inn}', icon: '\u{1F510}' },
];

export interface ExternalSourcesPanelProps {
  inn?: string;
}

export default function ExternalSourcesPanel({ inn }: ExternalSourcesPanelProps) {
  if (!inn) return null;

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, backgroundColor: C.bg }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Проверить в официальных источниках</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>ИНН: {inn}</div>
      </div>

      {/* 2x3 grid of source cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '16px 20px' }}>
        {EXTERNAL_SOURCES.map((source) => (
          <a
            key={source.name}
            href={source.url.replace('{inn}', inn)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px',
              borderRadius: 8,
              border: `1px solid ${C.border}`,
              backgroundColor: C.card,
              textDecoration: 'none',
              transition: 'background-color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = C.primaryLight;
              (e.currentTarget as HTMLElement).style.borderColor = C.primary;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = C.card;
              (e.currentTarget as HTMLElement).style.borderColor = C.border;
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{source.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{source.name}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{source.description}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
