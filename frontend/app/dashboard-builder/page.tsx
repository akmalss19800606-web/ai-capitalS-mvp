'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend, PieChart, Pie,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { dashboardBuilder, portfolios } from '@/lib/api';

// ─── Color Palette ─────────────────────────────────────────────────────────
const C = {
  bg: '#f8fafc', text: '#1e293b', textMuted: '#64748b', textLight: '#94a3b8',
  primary: '#3b82f6', primaryLight: '#eff6ff', success: '#22c55e', successLight: '#f0fdf4',
  error: '#ef4444', errorLight: '#fef2f2', warning: '#f59e0b', warningLight: '#fffbeb',
  info: '#6366f1', infoLight: '#eef2ff', border: '#e2e8f0', white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6', '#f97316'];

const card: React.CSSProperties = { backgroundColor: C.white, borderRadius: '12px', boxShadow: C.cardShadow, padding: '20px' };
const btnPrimary: React.CSSProperties = { backgroundColor: C.primary, color: C.white, borderRadius: '8px', border: 'none', cursor: 'pointer', padding: '9px 18px', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'background 0.15s' };
const btnSecondary: React.CSSProperties = { ...btnPrimary, backgroundColor: C.white, color: C.text, border: `1px solid ${C.border}` };
const selectStyle: React.CSSProperties = { padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', color: C.text, backgroundColor: C.white, outline: 'none', cursor: 'pointer' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: '8px', fontSize: '13px', color: C.text, backgroundColor: C.white, outline: 'none', width: '100%' };

// ─── SVG Icons ──────────────────────────────────────────────────────────────
const IconPlus = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const IconTrash = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5-3h4a1 1 0 0 1 1 1v1H9V4a1 1 0 0 1 1-1z" /></svg>);
const IconSave = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>);
const IconMove = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" /></svg>);
const IconDrill = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>);
const IconBack = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>);
const IconSpinner = () => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2.5" strokeLinecap="round"><path d="M12 2 a10 10 0 0 1 10 10" opacity="1" /><path d="M22 12 a10 10 0 0 1-10 10" opacity="0.4" /><path d="M12 22 a10 10 0 0 1-10-10" opacity="0.2" /><path d="M2 12 a10 10 0 0 1 10-10" opacity="0.1" /><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" /></svg>);

// ─── Widget type labels ─────────────────────────────────────────────────────
const WIDGET_LABELS: Record<string, string> = {
  kpi: 'KPI', bar_chart: 'Столбчатая', pie_chart: 'Круговая',
  line_chart: 'Линейный', table: 'Таблица', waterfall: 'Waterfall', heatmap: 'Heatmap',
};
const METRIC_LABELS: Record<string, string> = {
  total_value: 'Общая стоимость', decision_count: 'Количество решений',
  portfolio_count: 'Количество портфелей', avg_value: 'Средняя стоимость',
  high_risk_count: 'Высокий риск', by_status: 'По статусу', by_category: 'По категории',
  by_priority: 'По приоритету', by_type: 'По типу', by_geography: 'По географии',
  decisions_over_time: 'Решения по времени', value_over_time: 'Стоимость по времени',
  recent_decisions: 'Последние решения', top_decisions: 'Топ решения',
  portfolio_breakdown: 'Разбивка портфеля', value_by_category: 'По категории',
  category_status_matrix: 'Категория × Статус',
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardBuilderPage() {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [activeDashboard, setActiveDashboard] = useState<any>(null);
  const [widgetTypes, setWidgetTypes] = useState<any[]>([]);
  const [portfolioList, setPortfolioList] = useState<any[]>([]);
  const [globalPortfolioId, setGlobalPortfolioId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showCreateDashboard, setShowCreateDashboard] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [dragWidgetId, setDragWidgetId] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    Promise.all([
      dashboardBuilder.list().catch(() => []),
      dashboardBuilder.widgetTypes().catch(() => []),
      portfolios.list().catch(() => []),
    ]).then(([dbs, wts, pls]) => {
      setDashboards(Array.isArray(dbs) ? dbs : []);
      setWidgetTypes(Array.isArray(wts) ? wts : []);
      const pl = Array.isArray(pls) ? pls : pls?.items || [];
      setPortfolioList(pl);
      setLoading(false);
    });
  }, []);

  const loadDashboard = useCallback(async (id: number) => {
    try {
      const d = await dashboardBuilder.get(id);
      setActiveDashboard(d);
    } catch { /* ignore */ }
  }, []);

  const handleCreateDashboard = async () => {
    const name = newDashboardName.trim() || 'Новый дашборд';
    try {
      const d = await dashboardBuilder.create({
        name,
        widgets: [
          { widget_type: 'kpi', title: 'Общая стоимость', width: 3, height: 2, pos_x: 0, pos_y: 0, config: { metric: 'total_value' } },
          { widget_type: 'kpi', title: 'Решений', width: 3, height: 2, pos_x: 3, pos_y: 0, config: { metric: 'decision_count' } },
          { widget_type: 'kpi', title: 'Портфелей', width: 3, height: 2, pos_x: 6, pos_y: 0, config: { metric: 'portfolio_count' } },
          { widget_type: 'kpi', title: 'Высокий риск', width: 3, height: 2, pos_x: 9, pos_y: 0, config: { metric: 'high_risk_count' } },
          { widget_type: 'bar_chart', title: 'По статусу', width: 6, height: 4, pos_x: 0, pos_y: 2, config: { metric: 'by_status' } },
          { widget_type: 'pie_chart', title: 'По категории', width: 6, height: 4, pos_x: 6, pos_y: 2, config: { metric: 'by_category' } },
        ],
      });
      setDashboards(prev => [d, ...prev]);
      setActiveDashboard(d);
      setShowCreateDashboard(false);
      setNewDashboardName('');
    } catch { /* ignore */ }
  };

  const handleDeleteDashboard = async (id: number) => {
    try {
      await dashboardBuilder.delete(id);
      setDashboards(prev => prev.filter(d => d.id !== id));
      if (activeDashboard?.id === id) setActiveDashboard(null);
    } catch { /* ignore */ }
  };

  const handleAddWidget = async (widgetType: string, metric: string, title: string) => {
    if (!activeDashboard) return;
    try {
      const wt = widgetTypes.find((w: Record<string, unknown>) => w.type === widgetType);
      const widget = await dashboardBuilder.addWidget(activeDashboard.id, {
        widget_type: widgetType,
        title,
        width: wt?.default_w || 6,
        height: wt?.default_h || 4,
        pos_x: 0,
        pos_y: (activeDashboard.widgets?.length || 0) * 4,
        config: { metric },
      });
      setActiveDashboard((prev: unknown) => ({
        ...prev,
        widgets: [...(prev.widgets || []), widget],
      }));
      setShowAddWidget(false);
    } catch { /* ignore */ }
  };

  const handleDeleteWidget = async (widgetId: number) => {
    try {
      await dashboardBuilder.deleteWidget(widgetId);
      setActiveDashboard((prev: unknown) => ({
        ...prev,
        widgets: prev.widgets.filter((w: Record<string, unknown>) => w.id !== widgetId),
      }));
    } catch { /* ignore */ }
  };

  const handleMoveWidget = async (widgetId: number, direction: 'up' | 'down') => {
    if (!activeDashboard) return;
    const widgets = [...(activeDashboard.widgets || [])];
    const idx = widgets.findIndex((w: unknown) => w.id === widgetId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= widgets.length) return;
    [widgets[idx], widgets[swapIdx]] = [widgets[swapIdx], widgets[idx]];
    // Update positions
    const layout = widgets.map((w: Record<string, unknown>, i: number) => ({
      id: w.id, pos_x: w.pos_x, pos_y: i * (w.height || 4), width: w.width, height: w.height,
    }));
    try {
      await dashboardBuilder.updateLayout(activeDashboard.id, layout);
      setActiveDashboard((prev: unknown) => ({ ...prev, widgets }));
    } catch { /* ignore */ }
  };

  const handleResizeWidget = async (widgetId: number, newWidth: number) => {
    try {
      await dashboardBuilder.updateWidget(widgetId, { width: newWidth });
      setActiveDashboard((prev: unknown) => ({
        ...prev,
        widgets: prev.widgets.map((w: Record<string, unknown>) => w.id === widgetId ? { ...w, width: newWidth } : w),
      }));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <IconSpinner />
      </div>
    );
  }

  // ─── Dashboard list view ───────────────────────────────────────────────
  if (!activeDashboard) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: C.text, margin: 0 }}>Конструктор дашбордов</h1>
            <p style={{ fontSize: '14px', color: C.textMuted, marginTop: '4px' }}>VIS-DASH-001 — создание, настройка и управление дашбордами</p>
          </div>
          <button style={btnPrimary} onClick={() => setShowCreateDashboard(true)}>
            <IconPlus /> Создать дашборд
          </button>
        </div>

        {/* Create dialog */}
        {showCreateDashboard && (
          <div style={{ ...card, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              style={inputStyle}
              placeholder="Название дашборда..."
              value={newDashboardName}
              onChange={e => setNewDashboardName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateDashboard()}
              autoFocus
            />
            <button style={btnPrimary} onClick={handleCreateDashboard}>Создать</button>
            <button style={btnSecondary} onClick={() => setShowCreateDashboard(false)}>Отмена</button>
          </div>
        )}

        {/* Dashboard cards */}
        {dashboards.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '16px', color: C.textMuted, marginBottom: '12px' }}>Нет сохранённых дашбордов</p>
            <p style={{ fontSize: '13px', color: C.textLight }}>Создайте первый дашборд с помощью кнопки выше</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {dashboards.map((db: Record<string, unknown>) => (
              <div key={db.id} style={{ ...card, cursor: 'pointer', transition: 'box-shadow 0.15s', border: `1px solid ${C.border}` }}
                onClick={() => loadDashboard(db.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, color: C.text, margin: 0 }}>{db.name}</h3>
                    {db.description && <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>{db.description}</p>}
                  </div>
                  <button style={{ ...btnSecondary, padding: '6px 10px', color: C.error, borderColor: '#fecaca' }}
                    onClick={e => { e.stopPropagation(); handleDeleteDashboard(db.id); }}>
                    <IconTrash />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '12px', color: C.textLight }}>
                  {db.is_shared && <span style={{ color: C.primary }}>Общий</span>}
                  {db.is_default && <span style={{ color: C.success }}>По умолчанию</span>}
                  <span>{db.created_at?.slice(0, 10)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Active dashboard view ─────────────────────────────────────────────
  const widgets = activeDashboard.widgets || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div className="flex items-center gap-3">
          <button style={btnSecondary} onClick={() => setActiveDashboard(null)}>
            <IconBack /> Назад
          </button>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: C.text, margin: 0 }}>{activeDashboard.name}</h1>
            <p style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>{widgets.length} виджетов</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={globalPortfolioId ?? ''} onChange={e => setGlobalPortfolioId(e.target.value ? Number(e.target.value) : undefined)} style={selectStyle}>
            <option value="">Все портфели</option>
            {portfolioList.map((p: Record<string, unknown>) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button style={btnPrimary} onClick={() => setShowAddWidget(true)}>
            <IconPlus /> Виджет
          </button>
        </div>
      </div>

      {/* Add widget panel */}
      {showAddWidget && (
        <AddWidgetPanel
          widgetTypes={widgetTypes}
          onAdd={handleAddWidget}
          onClose={() => setShowAddWidget(false)}
        />
      )}

      {/* Widget grid */}
      {widgets.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '15px', color: C.textMuted }}>Добавьте виджеты на дашборд</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px', alignItems: 'start' }}>
          {widgets.map((w: Record<string, unknown>, idx: number) => (
            <div key={w.id} style={{ gridColumn: `span ${Math.min(w.width || 6, 12)}` }}>
              <WidgetCard
                widget={w}
                portfolioId={globalPortfolioId}
                onDelete={() => handleDeleteWidget(w.id)}
                onMoveUp={() => handleMoveWidget(w.id, 'up')}
                onMoveDown={() => handleMoveWidget(w.id, 'down')}
                onResize={(newW: number) => handleResizeWidget(w.id, newW)}
                isFirst={idx === 0}
                isLast={idx === widgets.length - 1}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// ADD WIDGET PANEL
// ═══════════════════════════════════════════════════════════════════════════

function AddWidgetPanel({ widgetTypes, onAdd, onClose }: { widgetTypes: unknown[]; onAdd: (type: string, metric: string, title: string) => void; onClose: () => void }) {
  const [selectedType, setSelectedType] = useState('kpi');
  const [selectedMetric, setSelectedMetric] = useState('total_value');
  const [title, setTitle] = useState('');

  const currentType = widgetTypes.find((w: Record<string, unknown>) => w.type === selectedType);
  const metrics = currentType?.metrics || [];

  useEffect(() => {
    if (metrics.length > 0 && !metrics.includes(selectedMetric)) {
      setSelectedMetric(metrics[0]);
    }
    if (!title) {
      setTitle(METRIC_LABELS[selectedMetric] || selectedMetric);
    }
  }, [selectedType]);

  useEffect(() => {
    setTitle(METRIC_LABELS[selectedMetric] || selectedMetric);
  }, [selectedMetric]);

  return (
    <div style={{ ...card, marginBottom: '16px', border: `2px solid ${C.primary}` }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: C.text, marginBottom: '14px' }}>Добавить виджет</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: '10px', alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Тип</label>
          <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={selectStyle}>
            {widgetTypes.map((wt: Record<string, unknown>) => <option key={wt.type} value={wt.type}>{wt.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Метрика</label>
          <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)} style={selectStyle}>
            {metrics.map((m: string) => <option key={m} value={m}>{METRIC_LABELS[m] || m}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.textMuted, marginBottom: '4px', textTransform: 'uppercase' }}>Заголовок</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <button style={btnPrimary} onClick={() => onAdd(selectedType, selectedMetric, title)}>Добавить</button>
        <button style={btnSecondary} onClick={onClose}>Отмена</button>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// WIDGET CARD — universal renderer with drill-down
// ═══════════════════════════════════════════════════════════════════════════

function WidgetCard({ widget, portfolioId, onDelete, onMoveUp, onMoveDown, onResize, isFirst, isLast }: {
  widget: unknown; portfolioId?: number; onDelete: () => void;
  onMoveUp: () => void; onMoveDown: () => void;
  onResize: (w: number) => void; isFirst: boolean; isLast: boolean;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drillKey, setDrillKey] = useState<string | null>(null);

  const widgetConfig = widget.config || {};
  const metric = widgetConfig.metric || 'total_value';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: unknown= { metric };
      if (portfolioId) params.portfolio_id = portfolioId;
      if (drillKey) params.drill_into = drillKey;
      const d = await dashboardBuilder.widgetData(widget.widget_type, params);
      setData(d);
    } catch { setData(null); }
    setLoading(false);
  }, [widget.widget_type, metric, portfolioId, drillKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDrill = (key: string) => setDrillKey(key);
  const handleDrillBack = () => setDrillKey(null);

  const widthOptions = [3, 4, 6, 8, 12];

  return (
    <div style={{ ...card, position: 'relative', border: `1px solid ${C.border}` }}>
      {/* Widget header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div className="flex items-center gap-2">
          {drillKey && (
            <button onClick={handleDrillBack} style={{ ...btnSecondary, padding: '4px 8px', fontSize: '11px' }}>
              <IconBack /> Назад
            </button>
          )}
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: C.text, margin: 0 }}>
            {widget.title}
            {drillKey && <span style={{ color: C.primary, fontWeight: 400 }}> → {drillKey}</span>}
          </h4>
          <span style={{ fontSize: '10px', color: C.textLight, backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
            {WIDGET_LABELS[widget.widget_type] || widget.widget_type}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <select value={widget.width || 6} onChange={e => onResize(Number(e.target.value))}
            style={{ ...selectStyle, padding: '3px 6px', fontSize: '11px', width: '50px' }}
            title="Ширина (из 12)">
            {widthOptions.map(w => <option key={w} value={w}>{w}</option>)}
          </select>
          {!isFirst && (
            <button onClick={onMoveUp} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, padding: '2px' }} title="Вверх">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
            </button>
          )}
          {!isLast && (
            <button onClick={onMoveDown} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textLight, padding: '2px' }} title="Вниз">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
            </button>
          )}
          <button onClick={onDelete} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.error, padding: '2px' }} title="Удалить">
            <IconTrash />
          </button>
        </div>
      </div>

      {/* Widget content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '30px' }}><IconSpinner /></div>
      ) : !data ? (
        <p style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px' }}>Нет данных</p>
      ) : (
        <WidgetContent type={widget.widget_type} data={data} metric={metric} onDrill={handleDrill} drillKey={drillKey} />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// WIDGET CONTENT RENDERER
// ═══════════════════════════════════════════════════════════════════════════

function WidgetContent({ type, data, metric, onDrill, drillKey }: {
  type: string; data: unknown; metric: string;
  onDrill: (key: string) => void; drillKey: string | null;
}) {
  // ── KPI ──
  if (type === 'kpi') {
    const trend = data.trend || 0;
    const trendColor = trend > 0 ? C.success : trend < 0 ? C.error : C.textMuted;
    return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '28px', fontWeight: 700, color: C.text }}>{data.value?.toLocaleString('ru-RU')}</div>
        <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '4px' }}>{data.label} ({data.unit})</div>
        <div style={{ fontSize: '12px', color: trendColor, marginTop: '6px' }}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend)}%
        </div>
      </div>
    );
  }

  // ── Drill-down detail view ──
  if (data.drill && data.items) {
    return (
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: C.textMuted, fontWeight: 600 }}>Название</th>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: C.textMuted, fontWeight: 600 }}>Статус</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: C.textMuted, fontWeight: 600 }}>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: Record<string, unknown>, i: number) => (
              <tr key={item.id || i} style={{ borderBottom: `1px solid #f1f5f9` }}>
                <td style={{ padding: '6px 8px', color: C.text }}>{item.title}</td>
                <td style={{ padding: '6px 8px', color: C.textMuted }}>{item.status}</td>
                <td style={{ padding: '6px 8px', color: C.text, textAlign: 'right', fontWeight: 600 }}>{item.value?.toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: '11px', color: C.textLight, textAlign: 'center', marginTop: '8px' }}>Всего: {data.total}</p>
      </div>
    );
  }

  // ── Bar Chart ──
  if (type === 'bar_chart' && data.items) {
    return (
      <div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data.items} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} cursor="pointer"
              onClick={(entry: unknown) => !drillKey && onDrill(entry.name)}>
              {data.items.map((_: Record<string, unknown>, i: number) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {!drillKey && (
          <p style={{ fontSize: '10px', color: C.textLight, textAlign: 'center', marginTop: '4px' }}>
            <IconDrill /> Нажмите на столбец для детализации (drill-down)
          </p>
        )}
      </div>
    );
  }

  // ── Pie Chart ──
  if (type === 'pie_chart' && data.items) {
    return (
      <div>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data.items} dataKey="count" nameKey="name" cx="50%" cy="50%"
              outerRadius={80} innerRadius={40} paddingAngle={2} cursor="pointer"
              onClick={(entry: unknown) => !drillKey && onDrill(entry.name)}>
              {data.items.map((_: Record<string, unknown>, i: number) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
        {!drillKey && (
          <p style={{ fontSize: '10px', color: C.textLight, textAlign: 'center', marginTop: '4px' }}>
            <IconDrill /> Нажмите на сегмент для детализации
          </p>
        )}
      </div>
    );
  }

  // ── Line Chart ──
  if (type === 'line_chart' && data.items) {
    const dk = data.data_key || 'count';
    return (
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.items} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.textMuted }} />
          <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
          <Line type="monotone" dataKey={dk} stroke={C.primary} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  // ── Table ──
  if (type === 'table' && data.items) {
    return (
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              <th style={{ textAlign: 'left', padding: '8px', color: C.textMuted, fontWeight: 600 }}>Название</th>
              <th style={{ textAlign: 'left', padding: '8px', color: C.textMuted, fontWeight: 600 }}>Статус</th>
              <th style={{ textAlign: 'left', padding: '8px', color: C.textMuted, fontWeight: 600 }}>Категория</th>
              <th style={{ textAlign: 'right', padding: '8px', color: C.textMuted, fontWeight: 600 }}>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item: Record<string, unknown>, i: number) => (
              <tr key={item.id || i} style={{ borderBottom: `1px solid #f1f5f9` }}>
                <td style={{ padding: '8px', color: C.text, fontWeight: 500 }}>{item.title}</td>
                <td style={{ padding: '8px', color: C.textMuted }}>{item.status}</td>
                <td style={{ padding: '8px', color: C.textMuted }}>{item.category}</td>
                <td style={{ padding: '8px', color: C.text, textAlign: 'right', fontWeight: 600 }}>{item.value?.toLocaleString('ru-RU')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // ── Waterfall ──
  if (type === 'waterfall' && data.items) {
    const chartData = data.items.map((item: Record<string, unknown>, idx: number) => {
      const prev = idx > 0 ? data.items[idx - 1].cumulative : 0;
      const invisible = item.type === 'total' ? 0 : Math.min(prev, item.cumulative);
      return { name: item.name, invisible: Math.max(invisible, 0), value: Math.abs(item.value), type: item.type };
    });
    const getColor = (t: string) => t === 'total' ? '#6366f1' : t === 'increase' ? '#22c55e' : '#ef4444';
    return (
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} angle={-20} textAnchor="end" height={50} />
          <YAxis tick={{ fontSize: 11, fill: C.textMuted }} />
          <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
          <Bar dataKey="invisible" stackId="s" fill="transparent" />
          <Bar dataKey="value" stackId="s" radius={[3, 3, 0, 0]}>
            {chartData.map((e: Record<string, unknown>, i: number) => <Cell key={i} fill={getColor(e.type)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  // ── Heatmap ──
  if (type === 'heatmap' && data.cells) {
    const rows: string[] = data.rows || [];
    const cols: string[] = data.cols || [];
    const values = data.cells.map((c: Record<string, unknown>) => c.value);
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 1);
    const getHC = (v: number) => {
      if (maxV === minV) return '#93c5fd';
      const r = (v - minV) / (maxV - minV);
      if (r < 0.25) return '#dbeafe'; if (r < 0.5) return '#93c5fd';
      if (r < 0.75) return '#3b82f6'; return '#1e40af';
    };
    const getTC = (v: number) => { const r = maxV === minV ? 0 : (v - minV) / (maxV - minV); return r > 0.5 ? '#fff' : '#1e293b'; };
    const getCell = (row: string, col: string) => data.cells.find((c: Record<string, unknown>) => c.row === row && c.col === col);
    return (
      <div className="overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '2px', fontSize: '11px' }}>
          <thead>
            <tr>
              <th style={{ padding: '6px', textAlign: 'left', color: C.textMuted, fontWeight: 600 }}></th>
              {cols.map(c => <th key={c} style={{ padding: '6px', textAlign: 'center', color: C.textMuted, fontWeight: 600 }}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row}>
                <td style={{ padding: '6px', fontWeight: 600, color: C.text, whiteSpace: 'nowrap' }}>{row}</td>
                {cols.map(col => {
                  const cl = getCell(row, col);
                  const v = cl?.value || 0;
                  return (
                    <td key={col} style={{ padding: '8px', textAlign: 'center', backgroundColor: getHC(v), color: getTC(v), borderRadius: '4px', fontWeight: 600 }}
                      title={`${row} × ${col}: ${v} (${cl?.count || 0} шт.)`}>
                      {v.toFixed(0)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Fallback
  return <pre style={{ fontSize: '11px', color: C.textMuted, overflow: 'auto', maxHeight: '200px' }}>{JSON.stringify(data, null, 2)}</pre>;
}
