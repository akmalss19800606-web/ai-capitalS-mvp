'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { decisions as decisionsApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Decision {
  id: number;
  asset_name: string;
  asset_symbol: string;
  decision_type: string;
  amount: number;
  price: number;
  total_value?: number;
  priority: string;
  status: string;
  category: string;
  geography?: string;
  target_return?: number;
  investment_horizon?: string;
  risk_level?: string;
  notes?: string;
  rationale?: string;
  tags?: string[];
  portfolio_id?: number;
  created_at: string;
  updated_at?: string;
}

interface Version {
  id: number;
  decision_id: number;
  version_number: number;
  snapshot: Record<string, unknown>;
  change_type: string;
  changed_fields: string[] | null;
  change_reason: string | null;
  changed_by: number;
  created_at: string;
}

interface AuditEvent {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
  user_id: number;
  created_at: string;
}

interface Relationship {
  id: number;
  from_decision_id: number;
  to_decision_id: number;
  relationship_type: string;
  description: string | null;
  related_decision_name: string | null;
  related_decision_symbol: string | null;
  related_decision_status: string | null;
  created_at: string;
}

interface DiffChange {
  field: string;
  old: unknown;
  new: unknown;
}

interface GraphData {
  nodes: { id: number; asset_name: string; asset_symbol: string; status: string; decision_type: string; total_value?: number }[];
  edges: { source: number; target: number; relationship_type: string; description?: string }[];
}

interface ImpactData {
  decision_id: number;
  decision_name: string;
  total_impacted: number;
  total_impacted_value: number;
  impacted_decisions: {
    decision_id: number;
    asset_name: string;
    asset_symbol: string;
    status: string;
    relationship_type: string;
    impact_description: string;
    total_value: number | null;
  }[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик', review: 'На проверке', approved: 'Одобрено',
  in_progress: 'В работе', completed: 'Завершено', rejected: 'Отклонено',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#64748b' },
  review: { bg: '#fffbeb', text: '#d97706' },
  approved: { bg: '#f0fdf4', text: '#16a34a' },
  in_progress: { bg: '#eff6ff', text: '#3b82f6' },
  completed: { bg: '#f5f3ff', text: '#7c3aed' },
  rejected: { bg: '#fff1f2', text: '#ef4444' },
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий', medium: 'Средний', high: 'Высокий', critical: 'Критический',
};

const TYPE_LABELS: Record<string, string> = {
  BUY: 'Купить', SELL: 'Продать', HOLD: 'Держать',
};

const CATEGORY_LABELS: Record<string, string> = {
  equity: 'Акции', debt: 'Долговые', real_estate: 'Недвижимость',
  infrastructure: 'Инфраструктура', venture: 'Венчур', other: 'Другое',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  depends_on: 'Зависит от', conflicts_with: 'Конфликтует с',
  alternative_to: 'Альтернатива', duplicates: 'Дублирует',
  enables: 'Делает возможным', blocks: 'Блокирует',
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  depends_on: '#3b82f6', conflicts_with: '#ef4444',
  alternative_to: '#d97706', duplicates: '#64748b',
  enables: '#16a34a', blocks: '#dc2626',
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  created: 'Создано', updated: 'Обновлено', status_changed: 'Статус изменён',
  rolledback: 'Откат', delete: 'Удалено',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Создание', update: 'Обновление', delete: 'Удаление',
  status_change: 'Смена статуса', rollback: 'Откат',
  relationship_add: 'Связь добавлена', relationship_remove: 'Связь удалена',
};

const FIELD_LABELS: Record<string, string> = {
  asset_name: 'Название', asset_symbol: 'Тикер', decision_type: 'Тип',
  amount: 'Количество', price: 'Цена', total_value: 'Общая стоимость',
  status: 'Статус', priority: 'Приоритет', category: 'Категория',
  geography: 'География', target_return: 'Целевая доходность',
  investment_horizon: 'Горизонт', risk_level: 'Уровень риска',
  notes: 'Заметки', rationale: 'Обоснование', tags: 'Теги',
  updated_at: 'Обновлено',
};

type Tab = 'overview' | 'history' | 'relationships';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return d; }
}

function formatCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' $';
}

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, backgroundColor: bg, color: text }}>
      {label}
    </span>
  );
}

// ─── Icons (SVG) ─────────────────────────────────────────────────────────────

function IconArrowLeft() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>;
}
function IconHistory() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="10" /></svg>;
}
function IconLink() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
}
function IconInfo() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
}
function IconRewind() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 19 2 12 11 5 11 19" /><polygon points="22 19 13 12 22 5 22 19" /></svg>;
}
function IconDiff() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18" /><path d="M18 6l-6-3-6 3" /><path d="M6 18l6 3 6-3" /></svg>;
}
function IconPlus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function IconTrash() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}
function IconImpact() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DecisionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const decisionId = Number(params.id);

  const [decision, setDecision] = useState<Decision | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // History tab state
  const [versions, setVersions] = useState<Version[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [diffResult, setDiffResult] = useState<DiffChange[] | null>(null);
  const [diffVersions, setDiffVersions] = useState<[number, number] | null>(null);
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null);
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Relationships tab state
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relLoading, setRelLoading] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [impactData, setImpactData] = useState<ImpactData | null>(null);
  const [showAddRel, setShowAddRel] = useState(false);
  const [newRelType, setNewRelType] = useState('depends_on');
  const [newRelTargetId, setNewRelTargetId] = useState('');
  const [newRelDesc, setNewRelDesc] = useState('');
  const [allDecisions, setAllDecisions] = useState<Decision[]>([]);

  // ─── Load decision ────────────────────────────────────────────────────────
  const loadDecision = useCallback(async () => {
    try {
      setLoading(true);
      const d = await decisionsApi.get(decisionId);
      setDecision(d);
    } catch (e: unknown) {
      setError('Не удалось загрузить решение');
    } finally {
      setLoading(false);
    }
  }, [decisionId]);

  useEffect(() => { loadDecision(); }, [loadDecision]);

  // ─── Load history ─────────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const [histRes, auditRes] = await Promise.all([
        decisionsApi.history(decisionId),
        decisionsApi.audit(decisionId),
      ]);
      setVersions(histRes.items || []);
      setAuditEvents(auditRes.items || []);
    } catch {
      // Ignore errors for now
    } finally {
      setHistoryLoading(false);
    }
  }, [decisionId]);

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
  }, [activeTab, loadHistory]);

  // ─── Load relationships ───────────────────────────────────────────────────
  const loadRelationships = useCallback(async () => {
    try {
      setRelLoading(true);
      const [relRes, graphRes, impactRes] = await Promise.all([
        decisionsApi.relationships(decisionId),
        decisionsApi.graph(decisionId, 2),
        decisionsApi.impact(decisionId),
      ]);
      setRelationships(relRes.items || []);
      setGraphData(graphRes);
      setImpactData(impactRes);
    } catch {
      // Ignore
    } finally {
      setRelLoading(false);
    }
  }, [decisionId]);

  const loadAllDecisions = useCallback(async () => {
    try {
      const res = await decisionsApi.list({ per_page: 100 });
      setAllDecisions((res.items || []).filter((d: Decision) => d.id !== decisionId));
    } catch {}
  }, [decisionId]);

  useEffect(() => {
    if (activeTab === 'relationships') {
      loadRelationships();
      loadAllDecisions();
    }
  }, [activeTab, loadRelationships, loadAllDecisions]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleDiff = async () => {
    if (selectedVersionA === null || selectedVersionB === null) return;
    try {
      const res = await decisionsApi.diff(decisionId, selectedVersionA, selectedVersionB);
      setDiffResult(res.changes || []);
      setDiffVersions([selectedVersionA, selectedVersionB]);
    } catch { setError('Ошибка сравнения версий'); }
  };

  const handleRollback = async (versionNumber: number) => {
    if (!confirm(`Откатить решение к версии ${versionNumber}? Текущие данные будут заменены.`)) return;
    try {
      setRollbackLoading(true);
      await decisionsApi.rollback(decisionId, versionNumber);
      await loadDecision();
      await loadHistory();
    } catch { setError('Ошибка отката'); }
    finally { setRollbackLoading(false); }
  };

  const handleAddRelationship = async () => {
    const targetId = parseInt(newRelTargetId);
    if (!targetId) return;
    try {
      await decisionsApi.addRelationship(decisionId, {
        to_decision_id: targetId,
        relationship_type: newRelType,
        description: newRelDesc || undefined,
      });
      setShowAddRel(false);
      setNewRelTargetId('');
      setNewRelDesc('');
      await loadRelationships();
    } catch (e: unknown) {
      setError(e.message || 'Ошибка создания связи');
    }
  };

  const handleRemoveRelationship = async (relId: number) => {
    if (!confirm('Удалить эту связь?')) return;
    try {
      await decisionsApi.removeRelationship(decisionId, relId);
      await loadRelationships();
    } catch { setError('Ошибка удаления связи'); }
  };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    padding: '20px', marginBottom: '16px',
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px', border: 'none', cursor: 'pointer',
    fontSize: '13px', fontWeight: active ? 600 : 400,
    color: active ? '#3b82f6' : '#64748b',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
    backgroundColor: 'transparent', display: 'flex', alignItems: 'center', gap: '6px',
    transition: 'all 0.15s',
  });

  const btnPrimary: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    backgroundColor: '#3b82f6', color: '#fff', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
  };

  const btnSecondary: React.CSSProperties = {
    padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
    backgroundColor: '#fff', color: '#475569', fontSize: '12px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
  };

  const btnDanger: React.CSSProperties = {
    ...btnSecondary, color: '#ef4444', borderColor: '#fecaca',
  };

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '13px', width: '100%', outline: 'none',
  };

  const selectStyle: React.CSSProperties = { ...inputStyle };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Загрузка...</div>;
  if (error && !decision) return <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  if (!decision) return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Решение не найдено</div>;

  const sc = STATUS_COLORS[decision.status] || { bg: '#f1f5f9', text: '#64748b' };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '13px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {error}
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px' }}>×</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <button onClick={() => router.push('/decisions')} style={{ ...btnSecondary, padding: '8px 12px' }}>
          <IconArrowLeft /> Назад
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {decision.asset_name}
            </h1>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>({decision.asset_symbol})</span>
            <Badge label={STATUS_LABELS[decision.status] || decision.status} bg={sc.bg} text={sc.text} />
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            ID: {decision.id} · Создано: {formatDate(decision.created_at)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button style={tabBtnStyle(activeTab === 'overview')} onClick={() => setActiveTab('overview')}>
          <IconInfo /> Обзор
        </button>
        <button style={tabBtnStyle(activeTab === 'history')} onClick={() => setActiveTab('history')}>
          <IconHistory /> История и Аудит
        </button>
        <button style={tabBtnStyle(activeTab === 'relationships')} onClick={() => setActiveTab('relationships')}>
          <IconLink /> Связи
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: OVERVIEW
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            {[
              { label: 'Тип', value: TYPE_LABELS[decision.decision_type] || decision.decision_type },
              { label: 'Количество', value: decision.amount?.toLocaleString('ru-RU') },
              { label: 'Цена', value: formatCurrency(decision.price) },
              { label: 'Общая стоимость', value: formatCurrency(decision.total_value) },
            ].map((kpi, i) => (
              <div key={i} style={{ ...cardStyle, textAlign: 'center', padding: '16px' }}>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>Параметры</h3>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <tbody>
                  {[
                    ['Приоритет', PRIORITY_LABELS[decision.priority] || decision.priority || '—'],
                    ['Категория', CATEGORY_LABELS[decision.category] || decision.category || '—'],
                    ['География', decision.geography || '—'],
                    ['Целевая доходность', decision.target_return ? decision.target_return + '%' : '—'],
                    ['Горизонт', decision.investment_horizon || '—'],
                    ['Уровень риска', decision.risk_level || '—'],
                    ['Портфель ID', String(decision.portfolio_id || '—')],
                  ].map(([label, val], i) => (
                    <tr key={i}>
                      <td style={{ padding: '6px 0', color: '#64748b', width: '45%' }}>{label}</td>
                      <td style={{ padding: '6px 0', color: '#1e293b', fontWeight: 500 }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>Дополнительно</h3>
              {decision.notes && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Заметки</div>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{decision.notes}</div>
                </div>
              )}
              {decision.rationale && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Обоснование</div>
                  <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>{decision.rationale}</div>
                </div>
              )}
              {decision.tags && decision.tags.length > 0 && (
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Теги</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {decision.tags.map((t, i) => (
                      <span key={i} style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '11px', backgroundColor: '#eff6ff', color: '#3b82f6' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              {!decision.notes && !decision.rationale && (!decision.tags || decision.tags.length === 0) && (
                <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Нет дополнительной информации</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: HISTORY & AUDIT
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Загрузка истории...</div>
          ) : (
            <>
              {/* Diff tool */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconDiff /> Сравнение версий
                </h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Версия A</label>
                    <select style={selectStyle} value={selectedVersionA ?? ''} onChange={(e) => setSelectedVersionA(e.target.value ? parseInt(e.target.value) : null)}>
                      <option value="">Выберите</option>
                      {versions.map(v => <option key={v.version_number} value={v.version_number}>v{v.version_number} — {CHANGE_TYPE_LABELS[v.change_type] || v.change_type} ({formatDate(v.created_at)})</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Версия B</label>
                    <select style={selectStyle} value={selectedVersionB ?? ''} onChange={(e) => setSelectedVersionB(e.target.value ? parseInt(e.target.value) : null)}>
                      <option value="">Выберите</option>
                      {versions.map(v => <option key={v.version_number} value={v.version_number}>v{v.version_number} — {CHANGE_TYPE_LABELS[v.change_type] || v.change_type} ({formatDate(v.created_at)})</option>)}
                    </select>
                  </div>
                  <button style={btnPrimary} onClick={handleDiff} disabled={selectedVersionA === null || selectedVersionB === null}>
                    <IconDiff /> Сравнить
                  </button>
                </div>
                {/* Diff result */}
                {diffResult && diffVersions && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                      Изменения между v{diffVersions[0]} и v{diffVersions[1]}: {diffResult.length === 0 ? 'нет различий' : `${diffResult.length} различий`}
                    </div>
                    {diffResult.length > 0 && (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Поле</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#ef4444' }}>Было (v{diffVersions[0]})</th>
                            <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#16a34a' }}>Стало (v{diffVersions[1]})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {diffResult.map((ch, i) => (
                            <tr key={i}>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 500, color: '#334155' }}>{FIELD_LABELS[ch.field] || ch.field}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fff1f2', color: '#dc2626' }}>{ch.old === null || ch.old === undefined ? '—' : String(ch.old)}</td>
                              <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f0fdf4', color: '#16a34a' }}>{ch.new === null || ch.new === undefined ? '—' : String(ch.new)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>

              {/* Versions timeline */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconHistory /> Версии ({versions.length})
                </h3>
                {versions.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Нет версий</div>
                ) : (
                  <div>
                    {versions.map((v, idx) => (
                      <div key={v.id} style={{ display: 'flex', gap: '14px', padding: '12px 0', borderBottom: idx < versions.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <div style={{ width: '52px', textAlign: 'center', flexShrink: 0 }}>
                          <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6' }}>v{v.version_number}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                              {CHANGE_TYPE_LABELS[v.change_type] || v.change_type}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>{formatDate(v.created_at)}</span>
                          </div>
                          {v.changed_fields && v.changed_fields.length > 0 && (
                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                              Поля: {v.changed_fields.map(f => FIELD_LABELS[f] || f).join(', ')}
                            </div>
                          )}
                          {v.change_reason && (
                            <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic' }}>
                              Причина: {v.change_reason}
                            </div>
                          )}
                        </div>
                        <div>
                          {v.version_number < versions[0].version_number && (
                            <button style={btnSecondary} onClick={() => handleRollback(v.version_number)} disabled={rollbackLoading}>
                              <IconRewind /> Откат
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit trail */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>Аудиторский след ({auditEvents.length})</h3>
                {auditEvents.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Нет записей</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Время</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Действие</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>Детали</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditEvents.map((e) => (
                        <tr key={e.id}>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{formatDate(e.created_at)}</td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', fontWeight: 500 }}>
                            {ACTION_LABELS[e.action] || e.action}
                          </td>
                          <td style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#64748b', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {e.new_values ? Object.entries(e.new_values).map(([k, v]) => `${FIELD_LABELS[k] || k}: ${v}`).join(', ') : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
           TAB: RELATIONSHIPS
         ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'relationships' && (
        <div>
          {relLoading ? (
            <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Загрузка связей...</div>
          ) : (
            <>
              {/* Impact summary */}
              {impactData && impactData.total_impacted > 0 && (
                <div style={{ ...cardStyle, backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <IconImpact />
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', margin: 0 }}>Анализ влияния</h3>
                  </div>
                  <div style={{ fontSize: '13px', color: '#78350f' }}>
                    Изменение этого решения затронет <b>{impactData.total_impacted}</b> связанных решений
                    на общую сумму <b>{formatCurrency(impactData.total_impacted_value)}</b>
                  </div>
                  {impactData.impacted_decisions.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {impactData.impacted_decisions.map((d, i) => (
                        <span key={i} style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                          {d.asset_name} ({d.asset_symbol}) — {RELATIONSHIP_LABELS[d.relationship_type] || d.relationship_type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Add relationship button + form */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                  Связи ({relationships.length})
                </h3>
                <button style={btnPrimary} onClick={() => setShowAddRel(!showAddRel)}>
                  <IconPlus /> Добавить связь
                </button>
              </div>

              {showAddRel && (
                <div style={{ ...cardStyle, backgroundColor: '#f8fafc', marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '12px' }}>Новая связь</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Тип связи</label>
                      <select style={selectStyle} value={newRelType} onChange={(e) => setNewRelType(e.target.value)}>
                        {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Целевое решение</label>
                      <select style={selectStyle} value={newRelTargetId} onChange={(e) => setNewRelTargetId(e.target.value)}>
                        <option value="">Выберите решение</option>
                        {allDecisions.map(d => (
                          <option key={d.id} value={d.id}>{d.asset_name} ({d.asset_symbol})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Описание (необязательно)</label>
                      <input style={inputStyle} value={newRelDesc} onChange={(e) => setNewRelDesc(e.target.value)} placeholder="Комментарий" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={btnPrimary} onClick={handleAddRelationship}>Создать</button>
                    <button style={btnSecondary} onClick={() => setShowAddRel(false)}>Отмена</button>
                  </div>
                </div>
              )}

              {/* Relationships list */}
              {relationships.length === 0 && !showAddRel ? (
                <div style={{ ...cardStyle, textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                  У этого решения пока нет связей. Нажмите «Добавить связь» для создания.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {relationships.map((rel) => {
                    const relColor = RELATIONSHIP_COLORS[rel.relationship_type] || '#64748b';
                    const relLabel = RELATIONSHIP_LABELS[rel.relationship_type] || rel.relationship_type;
                    const isOutgoing = rel.from_decision_id === decisionId;
                    return (
                      <div key={rel.id} style={{ ...cardStyle, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '0' }}>
                        <div style={{ width: '8px', height: '40px', borderRadius: '4px', backgroundColor: relColor, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                              {rel.related_decision_name || `Решение #${isOutgoing ? rel.to_decision_id : rel.from_decision_id}`}
                            </span>
                            {rel.related_decision_symbol && (
                              <span style={{ fontSize: '12px', color: '#64748b' }}>({rel.related_decision_symbol})</span>
                            )}
                            {rel.related_decision_status && (
                              <Badge
                                label={STATUS_LABELS[rel.related_decision_status] || rel.related_decision_status}
                                bg={STATUS_COLORS[rel.related_decision_status]?.bg || '#f1f5f9'}
                                text={STATUS_COLORS[rel.related_decision_status]?.text || '#64748b'}
                              />
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>
                            <span style={{ color: relColor, fontWeight: 600 }}>{isOutgoing ? '→' : '←'} {relLabel}</span>
                            {rel.description && <span> · {rel.description}</span>}
                            <span> · {formatDate(rel.created_at)}</span>
                          </div>
                        </div>
                        <button style={btnDanger} onClick={() => handleRemoveRelationship(rel.id)} title="Удалить связь">
                          <IconTrash />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mini-graph visualization */}
              {graphData && graphData.nodes.length > 1 && (
                <div style={{ ...cardStyle, marginTop: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '14px' }}>Граф зависимостей</h3>
                  <div style={{ position: 'relative', minHeight: '260px', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '20px', overflow: 'hidden' }}>
                    {/* Simple SVG graph — node positions calculated in a circle layout */}
                    <svg width="100%" height="240" viewBox="0 0 800 240">
                      {(() => {
                        const nodes = graphData.nodes;
                        const cx = 400, cy = 120, r = 90;
                        const positions: Record<number, { x: number; y: number }> = {};
                        nodes.forEach((n, i) => {
                          const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
                          positions[n.id] = {
                            x: cx + r * Math.cos(angle) * (nodes.length > 2 ? 1 : 0.5) * (1 + i * 0.3),
                            y: cy + r * Math.sin(angle) * (nodes.length > 2 ? 1 : 0.5),
                          };
                        });
                        // Center the current decision
                        positions[decisionId] = { x: cx, y: cy };

                        return (
                          <>
                            {/* Edges */}
                            {graphData.edges.map((e, i) => {
                              const from = positions[e.source];
                              const to = positions[e.target];
                              if (!from || !to) return null;
                              const ec = RELATIONSHIP_COLORS[e.relationship_type] || '#94a3b8';
                              return (
                                <g key={'e' + i}>
                                  <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={ec} strokeWidth="2" opacity="0.6" />
                                  <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 6} textAnchor="middle" fontSize="9" fill={ec}>
                                    {RELATIONSHIP_LABELS[e.relationship_type] || e.relationship_type}
                                  </text>
                                </g>
                              );
                            })}
                            {/* Nodes */}
                            {nodes.map((n) => {
                              const pos = positions[n.id];
                              if (!pos) return null;
                              const isCurrent = n.id === decisionId;
                              const nsc = STATUS_COLORS[n.status] || { bg: '#f1f5f9', text: '#64748b' };
                              return (
                                <g key={'n' + n.id} style={{ cursor: isCurrent ? 'default' : 'pointer' }} onClick={() => { if (!isCurrent) router.push(`/decisions/${n.id}`); }}>
                                  <circle cx={pos.x} cy={pos.y} r={isCurrent ? 30 : 22} fill={isCurrent ? '#3b82f6' : '#fff'} stroke={isCurrent ? '#1d4ed8' : nsc.text} strokeWidth={isCurrent ? 3 : 2} />
                                  <text x={pos.x} y={pos.y - 2} textAnchor="middle" fontSize={isCurrent ? '10' : '9'} fontWeight={isCurrent ? '700' : '500'} fill={isCurrent ? '#fff' : '#1e293b'}>
                                    {n.asset_symbol.length > 6 ? n.asset_symbol.slice(0, 6) : n.asset_symbol}
                                  </text>
                                  <text x={pos.x} y={pos.y + 10} textAnchor="middle" fontSize="8" fill={isCurrent ? '#dbeafe' : '#64748b'}>
                                    {STATUS_LABELS[n.status]?.slice(0, 10) || n.status}
                                  </text>
                                </g>
                              );
                            })}
                          </>
                        );
                      })()}
                    </svg>
                    <div style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', marginTop: '8px' }}>
                      Нажмите на узел для перехода к решению
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
