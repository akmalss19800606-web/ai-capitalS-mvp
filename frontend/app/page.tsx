'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolios as portfoliosApi, dashboard, decisions as decisionsApi } from '@/lib/api';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

interface Decision {
  id: number;
  asset_name: string;
  asset_symbol: string;
  decision_type: string;
  amount: number;
  price: number;
  status: string;
  portfolio_id: number;
  created_at: string;
}

interface DashboardSummary {
  total_portfolio_value: number;
  active_decisions_count: number;
  total_portfolios: number;
  total_decisions: number;
}

const tools = [
  {
    label: 'Due Diligence',
    path: '/due-diligence',
    desc: 'Проверка компании',
    color: '#1e293b',
    bg: '#f1f5f9',
    border: '#e2e8f0',
    iconPath: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
  },
  {
    label: 'Рынок УЗ',
    path: '/market-uz',
    desc: 'Анализ рынков',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
    iconPath: (
      <>
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </>
    ),
  },
  {
    label: 'Калькулятор ROI',
    path: '/calculator',
    desc: 'ROI и сравнение',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    iconPath: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="8" y1="10" x2="16" y2="10" />
        <line x1="8" y1="14" x2="16" y2="14" />
        <line x1="8" y1="18" x2="12" y2="18" />
      </>
    ),
  },
  {
    label: 'Макро УЗ',
    path: '/macro-uz',
    desc: 'Курс сума и ЦБ',
    color: '#7c3aed',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    iconPath: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
  },
  {
    label: 'PDF Отчёт',
    path: '/report',
    desc: 'Скачать отчёт',
    color: '#d97706',
    bg: '#fffbeb',
    border: '#fde68a',
    iconPath: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </>
    ),
  },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  review: 'На проверке',
  approved: 'Одобрено',
  in_progress: 'В работе',
  completed: 'Завершено',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#64748b' },
  review: { bg: '#fffbeb', text: '#d97706' },
  approved: { bg: '#f0fdf4', text: '#16a34a' },
  in_progress: { bg: '#eff6ff', text: '#3b82f6' },
  completed: { bg: '#f5f3ff', text: '#7c3aed' },
};

const DECISION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  BUY: { label: 'Купить', color: '#16a34a' },
  SELL: { label: 'Продать', color: '#dc2626' },
  HOLD: { label: 'Держать', color: '#d97706' },
};

function KpiCard({
  title,
  value,
  sub,
  accent,
  icon,
}: {
  title: string;
  value: string;
  sub?: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ fontSize: '13px', color: '#64748b', fontWeight: '500', lineHeight: '1.3' }}>
          {title}
        </p>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            backgroundColor: `${accent}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
      <p
        style={{
          fontSize: '26px',
          fontWeight: '700',
          color: '#1e293b',
          lineHeight: '1',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '-4px' }}>{sub}</p>
      )}
    </div>
  );
}

export default function OverviewDashboard() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [recentDecisions, setRecentDecisions] = useState<Decision[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoadingData(true);
    try {
      // Load summary, portfolios, and recent decisions in parallel
      const [pList] = await Promise.all([
        portfoliosApi.list(),
      ]);

      setPortfolioList(pList || []);

      // Try to load dashboard summary
      try {
        const sum = await dashboard.summary();
        setSummary(sum);
      } catch {
        // Fallback: compute from portfolios
        const totalValue = (pList || []).reduce(
          (acc: number, p: Portfolio) => acc + (p.total_value || 0),
          0
        );
        setSummary({
          total_portfolio_value: totalValue,
          active_decisions_count: 0,
          total_portfolios: (pList || []).length,
          total_decisions: 0,
        });
      }

      // Load decisions from all portfolios
      const allDecisions: Decision[] = [];
      for (const p of pList || []) {
        try {
          const dd = await decisionsApi.byPortfolio(p.id);
          if (Array.isArray(dd)) allDecisions.push(...dd);
        } catch {
          // skip failed portfolio decisions
        }
      }
      // Sort by created_at desc and take top 5
      allDecisions.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentDecisions(allDecisions.slice(0, 5));

      // Update summary with real decision counts
      const activeStatuses = ['review', 'approved', 'in_progress'];
      const activeCount = allDecisions.filter((d) => activeStatuses.includes(d.status)).length;
      setSummary((prev) =>
        prev
          ? {
              ...prev,
              active_decisions_count: activeCount,
              total_decisions: allDecisions.length,
            }
          : prev
      );
    } catch {
      router.push('/login');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const p = await portfoliosApi.create({ name: newName.trim(), description: newDesc.trim() });
      setPortfolioList((prev) => [...prev, p]);
      setNewName('');
      setNewDesc('');
      setSummary((prev) =>
        prev ? { ...prev, total_portfolios: prev.total_portfolios + 1 } : prev
      );
    } catch {
      alert('Ошибка создания портфеля');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    if (!confirm('Удалить этот портфель?')) return;
    try {
      await portfoliosApi.delete(id);
      setPortfolioList((prev) => prev.filter((p) => p.id !== id));
      setSummary((prev) =>
        prev ? { ...prev, total_portfolios: Math.max(0, prev.total_portfolios - 1) } : prev
      );
    } catch {
      alert('Ошибка удаления портфеля');
    }
  };

  const formatValue = (v: number) =>
    v >= 1_000_000
      ? `$${(v / 1_000_000).toFixed(1)}M`
      : v >= 1_000
      ? `$${(v / 1_000).toFixed(0)}K`
      : `$${v.toLocaleString()}`;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <h1
          style={{
            fontSize: '22px',
            fontWeight: '700',
            color: '#1e293b',
            letterSpacing: '-0.02em',
          }}
        >
          Главная панель
        </h1>
        <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
          Обзор инвестиционного портфеля · AI Capital Management
        </p>
      </div>

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <KpiCard
          title="Общая стоимость портфеля"
          value={
            loadingData ? '—' : formatValue(summary?.total_portfolio_value ?? 0)
          }
          sub="Суммарная стоимость активов"
          accent="#3b82f6"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          title="Активные решения"
          value={loadingData ? '—' : String(summary?.active_decisions_count ?? 0)}
          sub="На проверке / В работе / Одобрено"
          accent="#f59e0b"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          }
        />
        <KpiCard
          title="Всего портфелей"
          value={loadingData ? '—' : String(summary?.total_portfolios ?? 0)}
          sub="Инвестиционных портфелей"
          accent="#8b5cf6"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z" />
            </svg>
          }
        />
        <KpiCard
          title="Всего решений"
          value={loadingData ? '—' : String(summary?.total_decisions ?? 0)}
          sub="Инвестиционных решений"
          accent="#22c55e"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '24px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#1e293b',
            marginBottom: '14px',
          }}
        >
          Быстрые инструменты
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
          }}
        >
          {tools.map((tool, i) => (
            <button
              key={i}
              onClick={() => router.push(tool.path)}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                border: `1px solid ${tool.border}`,
                backgroundColor: tool.bg,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <div
                style={{
                  color: tool.color,
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {tool.iconPath}
                </svg>
              </div>
              <p
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: tool.color,
                  marginBottom: '2px',
                  lineHeight: '1.2',
                }}
              >
                {tool.label}
              </p>
              <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.3' }}>
                {tool.desc}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout: Portfolios + Recent Decisions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {/* LEFT: My Portfolios */}
        <div>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                Мои портфели
              </p>
              <button
                onClick={() => router.push('/portfolios')}
                style={{
                  fontSize: '12px',
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Все портфели →
              </button>
            </div>

            {/* Create form */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: '#fafbfc',
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                  placeholder="Название портфеля"
                  style={{
                    flex: '1 1 130px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Описание"
                  style={{
                    flex: '2 1 150px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={handleCreatePortfolio}
                  disabled={creating || !newName.trim()}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: creating || !newName.trim() ? 'not-allowed' : 'pointer',
                    opacity: creating || !newName.trim() ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {creating ? '...' : '+ Создать'}
                </button>
              </div>
            </div>

            {/* Portfolio list */}
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {loadingData ? (
                <div
                  style={{
                    padding: '32px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                >
                  Загрузка...
                </div>
              ) : portfolioList.length === 0 ? (
                <div
                  style={{
                    padding: '32px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ margin: '0 auto 10px', display: 'block' }}
                  >
                    <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z" />
                  </svg>
                  <p style={{ fontSize: '13px' }}>Портфелей пока нет</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Создайте первый портфель</p>
                </div>
              ) : (
                portfolioList.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 20px',
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background 0.1s',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '9px',
                        background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.name}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.description || 'Без описания'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p
                        style={{ fontSize: '13px', fontWeight: '700', color: '#1e293b' }}
                      >
                        ${(p.total_value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <button
                        onClick={() => router.push(`/portfolio/${p.id}`)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '6px',
                          backgroundColor: '#eff6ff',
                          color: '#3b82f6',
                          border: '1px solid #bfdbfe',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                        }}
                      >
                        →
                      </button>
                      <button
                        onClick={() => handleDeletePortfolio(p.id)}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#fff5f5',
                          color: '#ef4444',
                          border: '1px solid #fecaca',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Recent Decisions */}
        <div>
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>
                Последние решения
              </p>
              <button
                onClick={() => router.push('/decisions')}
                style={{
                  fontSize: '12px',
                  color: '#3b82f6',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                Все решения →
              </button>
            </div>

            <div style={{ minHeight: '200px' }}>
              {loadingData ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '13px',
                  }}
                >
                  Загрузка...
                </div>
              ) : recentDecisions.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#94a3b8',
                  }}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ margin: '0 auto 10px', display: 'block' }}
                  >
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
                  </svg>
                  <p style={{ fontSize: '13px' }}>Решений пока нет</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>
                    Откройте портфель, чтобы добавить решение
                  </p>
                </div>
              ) : (
                recentDecisions.map((d) => {
                  const typeInfo = DECISION_TYPE_LABELS[d.decision_type] || {
                    label: d.decision_type,
                    color: '#64748b',
                  };
                  const statusInfo = STATUS_COLORS[d.status] || {
                    bg: '#f1f5f9',
                    text: '#64748b',
                  };
                  return (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 20px',
                        borderBottom: '1px solid #f8fafc',
                      }}
                    >
                      {/* Type badge */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: `${typeInfo.color}15`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: typeInfo.color,
                          }}
                        >
                          {typeInfo.label}
                        </span>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <p
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {d.asset_name}{' '}
                          <span style={{ color: '#94a3b8', fontWeight: '400' }}>
                            ({d.asset_symbol})
                          </span>
                        </p>
                        <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          ${(d.price || 0).toLocaleString()} · {d.amount} шт ·{' '}
                          {formatDate(d.created_at)}
                        </p>
                      </div>

                      {/* Status */}
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '20px',
                          backgroundColor: statusInfo.bg,
                          color: statusInfo.text,
                          fontSize: '11px',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {STATUS_LABELS[d.status] || d.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
