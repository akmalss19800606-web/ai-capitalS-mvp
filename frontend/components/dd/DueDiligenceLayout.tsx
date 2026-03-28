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
}

export default function DueDiligenceLayout({
  title = 'Due Diligence',
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
}: DueDiligenceLayoutProps) {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: '100vh', padding: '24px 32px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{title}</h1>
        <p style={{ fontSize: 14, color: C.textMuted, margin: '6px 0 0' }}>{subtitle}</p>
      </div>

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
