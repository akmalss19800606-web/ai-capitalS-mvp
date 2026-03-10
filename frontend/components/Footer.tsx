'use client';
import { useLocale } from '@/lib/i18n';
import {
  colors, semantic, spacing, transitions, typography, radius,
} from '@/lib/design-tokens';

/* ─── Bloomberg-style Footer ─── */
export default function Footer() {
  const year = new Date().getFullYear();
  const { t } = useLocale();

  return (
    <footer role="contentinfo" style={{
      backgroundColor: semantic.bgCard,
      borderTop: `1px solid ${semantic.border}`,
      padding: `${spacing[4]} ${spacing[6]}`,
    }}>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing[3],
      }}>
        {/* Left: copyright + logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing[2],
        }}>
          <img
            src="/logo.png"
            alt="AC"
            width={20}
            height={20}
            style={{ borderRadius: radius.sm, flexShrink: 0 }}
          />
          <span style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
            {t.copyright(year)}
          </span>
        </div>

        {/* Center: author + certificate */}
        <div style={{
          fontSize: typography.fontSize.xs, color: semantic.textMuted, textAlign: 'center',
          display: 'flex', alignItems: 'center', gap: spacing[1], flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          <span>{t.author}</span>
          <span style={{ color: colors.neutral[300] }}>|</span>
          <span>{t.certificate}</span>
        </div>

        {/* Right: contacts */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: spacing[3],
          fontSize: typography.fontSize.xs, color: semantic.textMuted,
        }}>
          <a href="tel:+998987390198" style={{
            color: semantic.textMuted, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: spacing[1],
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = semantic.textSecondary)}
            onMouseLeave={e => (e.currentTarget.style.color = semantic.textMuted)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            +998 98 739 01 98
          </a>
          <a href="mailto:atom2014@bk.ru" style={{
            color: semantic.textMuted, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: spacing[1],
            transition: transitions.color,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = semantic.textSecondary)}
            onMouseLeave={e => (e.currentTarget.style.color = semantic.textMuted)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            atom2014@bk.ru
          </a>
          <span className="footer-location" style={{
            display: 'flex', alignItems: 'center', gap: spacing[1],
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            {t.city}
          </span>
        </div>
      </div>
    </footer>
  );
}
