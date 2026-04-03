'use client';
import React, { useState } from 'react';

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
  border: '#e2e8f0',
  white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

const TABS = ['Обзор', 'Чеклист', 'Бенчмарки', 'Детализация'] as const;
export type DDTab = typeof TABS[number];

// E3-05: KPI bar types
interface DueDiligenceKPI {
  score?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  checklistProgress?: number;
  status?: 'completed' | 'in_progress' | 'not_started';
}

interface DueDiligenceLayoutProps {
  // Header
  title?: string;
  subtitle?: string;
  // Sidebar (left panel)
  sidebar: React.ReactNode;
  // Main content
  children: React.ReactNode;
  // Tabs
  activeTab: DDTab;
  onTabChange: (tab: DDTab) => void;
  // Score header (shown above tabs when result exists)
  scoreHeader?: React.ReactNode;
  // Show tabs and content only when hasResult
  hasResult: boolean;
  // Loading / error / empty states for right panel
  loading?: boolean;
  error?: string | null;
  loadingText?: string;
  emptyText?: string;
  // E3-05: KPI bar props
  kpi?: DueDiligenceKPI;
}

// ─── KPI helpers ───────────────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 70) return C.success;
  if (score >= 40) return C.warning;
  return C.error;
}

function riskLabel(level: string): string {
  switch (level) {
    case 'low': return 'Низкий';
    case 'medium': return 'Средний';
    case 'high': return 'Высокий';
    case 'critical': return 'Критический';
    default: return level;
  }
}

function riskColor(level: string): string {
  switch (level) {
    case 'low': return C.success;
    case 'medium': return C.warning;
    case 'high': return '#ea580c';
    case 'critical': return C.error;
    default: return C.textMuted;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'completed': return 'Анализ завершён';
    case 'in_progress': return 'В процессе';
    case 'not_started': return 'Не начат';
    default: return status;
  }
}

function statusColor(status: string): string {
  switch (status) {
    case 'completed': return C.success;
    case 'in_progress': return C.primary;
    case 'not_started': return C.textLight;
    default: return C.textMuted;
  }
}

// ─── KPI Bar Component ─────────────────────────────────────────────────────
function KPIBar({ kpi }: { kpi: DueDiligenceKPI }) {
  const { score, riskLevel, checklistProgress, status } = kpi;

  const kpiCard: React.CSSProperties = {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 10,
    padding: '14px 16px',
    boxShadow: C.cardShadow,
    textAlign: 'center',
    minWidth: 0,
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    marginBottom: 6,
  };

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
      {/* 1. Общий балл */}
      <div style={kpiCard}>
        <div style={kpiLabel}>Общий балл</div>
        <div style={{
          fontSize: 24,
          fontWeight: 700,
          color: score !== undefined ? scoreColor(score) : C.textLight,
        }}>
          {score !== undefined ? `${Math.round(score)}/100` : '—'}
        </div>
      </div>

      {/* 2. Уровень риска */}
      <div style={kpiCard}>
        <div style={kpiLabel}>Уровень риска</div>
        {riskLevel ? (
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            backgroundColor: riskColor(riskLevel) + '18',
            color: riskColor(riskLevel),
          }}>
            {riskLabel(riskLevel)}
          </span>
        ) : (
          <div style={{ fontSize: 14, color: C.textLight }}>—</div>
        )}
      </div>

      {/* 3. Завершённость чеклиста */}
      <div style={kpiCard}>
        <div style={kpiLabel}>Чеклист</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          {checklistProgress !== undefined ? `${Math.round(checklistProgress)}%` : '—'}
        </div>
        {checklistProgress !== undefined && (
          <div style={{
            width: '100%',
            height: 5,
            backgroundColor: C.border,
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min(100, checklistProgress)}%`,
              height: '100%',
              backgroundColor: checklistProgress >= 80 ? C.success : checklistProgress >= 50 ? C.warning : C.primary,
              borderRadius: 3,
              transition: 'width 0.3s',
            }} />
          </div>
        )}
      </div>

      {/* 4. Статус */}
      <div style={kpiCard}>
        <div style={kpiLabel}>Статус</div>
        {status ? (
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: statusColor(status),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: statusColor(status),
              display: 'inline-block',
              flexShrink: 0,
            }} />
            {statusLabel(status)}
          </div>
        ) : (
          <div style={{ fontSize: 14, color: C.textLight }}>—</div>
        )}
      </div>
    </div>
  );
}

// ─── Main Layout ───────────────────────────────────────────────────────────
export default function DueDiligenceLayout({
  title = 'Комплексная проверка (Due Diligence)',
  subtitle = 'Автоматический скоринг, чеклист проверки и сравнение с отраслевыми бенчмарками',
  sidebar,
  children,
  activeTab,
  onTabChange,
  scoreHeader,
  hasResult,
  loading = false,
  error = null,
  loadingText = 'Вычисление...',
  emptyText = 'Введите параметры и запустите DD-скоринг',
  kpi,
}: DueDiligenceLayoutProps) {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '24px 32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: '6px 0 0' }}>{subtitle}</p>
      </div>

      {/* E3-05: KPI Bar */}
      {kpi && <KPIBar kpi={kpi} />}

      {/* Two-column layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* LEFT PANEL: Sidebar */}
        <div style={{ width: 370, flexShrink: 0 }}>
          {sidebar}
        </div>

        {/* RIGHT PANEL: Results */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: C.errorLight,
              border: `1px solid #fecaca`,
              borderRadius: 10,
              padding: '14px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <span style={{ color: C.error, fontWeight: 700 }}>Ошибка</span>
              <span style={{ fontSize: 13, color: C.text }}>{error}</span>
            </div>
          )}

          {/* Empty state */}
          {!hasResult && !loading && !error && (
            <div style={{
              backgroundColor: C.white,
              borderRadius: 12,
              boxShadow: C.cardShadow,
              padding: '60px 20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: C.textLight }}>{emptyText}</div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div style={{
              backgroundColor: C.white,
              borderRadius: 12,
              boxShadow: C.cardShadow,
              padding: '60px 20px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 14, color: C.textMuted }}>{loadingText}</div>
            </div>
          )}

          {/* Result content */}
          {hasResult && !loading && (
            <>
              {/* Score Header */}
              {scoreHeader}

              {/* Tabs */}
              <div style={{
                display: 'flex',
                gap: 4,
                backgroundColor: C.bg,
                borderRadius: 10,
                padding: 4,
                marginBottom: 20,
                border: `1px solid ${C.border}`,
              }}>
                {TABS.map(tab => (
                  <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    style={{
                      flex: 1,
                      padding: '9px 16px',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 600,
                      transition: 'all 0.15s',
                      backgroundColor: activeTab === tab ? C.primary : 'transparent',
                      color: activeTab === tab ? C.white : C.textMuted,
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {children}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
