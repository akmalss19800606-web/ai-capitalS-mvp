'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { decisions as decisionsApi, portfolios as portfoliosApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Decision {
  id: number;
  asset_name: string;
  asset_symbol: string;
  decision_type: string;
  amount: number;
  price: number;
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

interface DecisionStats {
  total: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  total_value: number;
}

interface Portfolio {
  id: number;
  name: string;
}

interface ListResponse {
  items: Decision[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  review: 'На проверке',
  approved: 'Одобрено',
  in_progress: 'В работе',
  completed: 'Завершено',
  rejected: 'Отклонено',
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
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критический',
};

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: '#f1f5f9', text: '#64748b' },
  medium: { bg: '#eff6ff', text: '#3b82f6' },
  high: { bg: '#fffbeb', text: '#d97706' },
  critical: { bg: '#fff1f2', text: '#ef4444' },
};

const TYPE_LABELS: Record<string, string> = {
  BUY: 'Купить',
  SELL: 'Продать',
  HOLD: 'Держать',
};

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  BUY: { bg: '#f0fdf4', text: '#16a34a' },
  SELL: { bg: '#fff1f2', text: '#ef4444' },
  HOLD: { bg: '#fffbeb', text: '#d97706' },
};

const CATEGORY_LABELS: Record<string, string> = {
  equity: 'Акции',
  debt: 'Долговые',
  real_estate: 'Недвижимость',
  infrastructure: 'Инфраструктура',
  venture: 'Венчур',
  other: 'Другое',
};

const RISK_LEVEL_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

// Status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['review', 'rejected'],
  review: ['approved', 'rejected', 'draft'],
  approved: ['in_progress', 'rejected'],
  in_progress: ['completed', 'rejected'],
  completed: [],
  rejected: ['draft'],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n: number | undefined | null): string {
  if (n == null) return '—';
  return n.toLocaleString('ru-RU');
}

function fmtUsd(n: number | undefined | null): string {
  if (n == null) return '—';
  return '$' + n.toLocaleString('ru-RU');
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Modal backdrop ──────────────────────────────────────────────────────────

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15,23,42,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </div>
  );
}

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: '20px',
        backgroundColor: c.bg,
        color: c.text,
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const c = PRIORITY_COLORS[priority] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: '20px',
        backgroundColor: c.bg,
        color: c.text,
        fontSize: '11px',
        fontWeight: '600',
        whiteSpace: 'nowrap',
      }}
    >
      {PRIORITY_LABELS[priority] || priority}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const c = TYPE_COLORS[type] || { bg: '#f1f5f9', text: '#64748b' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 9px',
        borderRadius: '20px',
        backgroundColor: c.bg,
        color: c.text,
        fontSize: '11px',
        fontWeight: '700',
        whiteSpace: 'nowrap',
      }}
    >
      {TYPE_LABELS[type] || type}
    </span>
  );
}

// ─── Input / Select shared style ─────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '13px',
  color: '#1e293b',
  backgroundColor: '#ffffff',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: '#64748b',
  marginBottom: '6px',
};

// ─── Create/Edit Modal ────────────────────────────────────────────────────────

interface FormData {
  asset_name: string;
  asset_symbol: string;
  decision_type: string;
  amount: string;
  price: string;
  priority: string;
  category: string;
  geography: string;
  target_return: string;
  investment_horizon: string;
  risk_level: string;
  notes: string;
  rationale: string;
  tags: string;
  portfolio_id: string;
}

const emptyForm: FormData = {
  asset_name: '',
  asset_symbol: '',
  decision_type: 'BUY',
  amount: '',
  price: '',
  priority: 'medium',
  category: 'equity',
  geography: '',
  target_return: '',
  investment_horizon: '',
  risk_level: 'medium',
  notes: '',
  rationale: '',
  tags: '',
  portfolio_id: '',
};

function decisionToForm(d: Decision): FormData {
  return {
    asset_name: d.asset_name || '',
    asset_symbol: d.asset_symbol || '',
    decision_type: d.decision_type || 'BUY',
    amount: d.amount != null ? String(d.amount) : '',
    price: d.price != null ? String(d.price) : '',
    priority: d.priority || 'medium',
    category: d.category || 'equity',
    geography: d.geography || '',
    target_return: d.target_return != null ? String(d.target_return) : '',
    investment_horizon: d.investment_horizon || '',
    risk_level: d.risk_level || 'medium',
    notes: d.notes || '',
    rationale: d.rationale || '',
    tags: Array.isArray(d.tags) ? d.tags.join(', ') : '',
    portfolio_id: d.portfolio_id != null ? String(d.portfolio_id) : '',
  };
}

function formToPayload(f: FormData) {
  return {
    asset_name: f.asset_name.trim(),
    asset_symbol: f.asset_symbol.trim().toUpperCase(),
    decision_type: f.decision_type,
    amount: f.amount ? parseFloat(f.amount) : undefined,
    price: f.price ? parseFloat(f.price) : undefined,
    priority: f.priority,
    category: f.category,
    geography: f.geography.trim() || undefined,
    target_return: f.target_return ? parseFloat(f.target_return) : undefined,
    investment_horizon: f.investment_horizon.trim() || undefined,
    risk_level: f.risk_level || undefined,
    notes: f.notes.trim() || undefined,
    rationale: f.rationale.trim() || undefined,
    tags: f.tags
      ? f.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : undefined,
    portfolio_id: f.portfolio_id ? parseInt(f.portfolio_id) : undefined,
  };
}

function DecisionModal({
  decision,
  portfolioList,
  onClose,
  onSaved,
}: {
  decision: Decision | null;
  portfolioList: Portfolio[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!decision;
  const [form, setForm] = useState<FormData>(decision ? decisionToForm(decision) : emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key: keyof FormData, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_name.trim()) {
      setError('Название актива обязательно');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = formToPayload(form);
      if (isEdit && decision) {
        await decisionsApi.update(decision.id, payload);
      } else {
        await decisionsApi.create(payload);
      }
      onSaved();
    } catch (err: unknown) {
      let msg = 'Ошибка сохранения';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.detail || msg;
      } catch {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
            {isEdit ? 'Редактировать решение' : 'Новое инвестиционное решение'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '20px',
              lineHeight: '1',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '16px',
                fontSize: '13px',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          {/* Row 1: asset_name + asset_symbol */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Название актива *</label>
              <input
                style={inputStyle}
                value={form.asset_name}
                onChange={(e) => set('asset_name', e.target.value)}
                placeholder="Например: Apple Inc."
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Тикер</label>
              <input
                style={inputStyle}
                value={form.asset_symbol}
                onChange={(e) => set('asset_symbol', e.target.value)}
                placeholder="AAPL"
              />
            </div>
          </div>

          {/* Row 2: type + priority + category */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Тип решения</label>
              <select style={inputStyle} value={form.decision_type} onChange={(e) => set('decision_type', e.target.value)}>
                <option value="BUY">Купить</option>
                <option value="SELL">Продать</option>
                <option value="HOLD">Держать</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Приоритет</label>
              <select style={inputStyle} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
                <option value="critical">Критический</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Категория</label>
              <select style={inputStyle} value={form.category} onChange={(e) => set('category', e.target.value)}>
                <option value="equity">Акции</option>
                <option value="debt">Долговые</option>
                <option value="real_estate">Недвижимость</option>
                <option value="infrastructure">Инфраструктура</option>
                <option value="venture">Венчур</option>
                <option value="other">Другое</option>
              </select>
            </div>
          </div>

          {/* Row 3: amount + price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Количество</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="any"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label style={labelStyle}>Цена, $</label>
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="any"
                value={form.price}
                onChange={(e) => set('price', e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Row 4: target_return + risk_level + investment_horizon */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Целевая доходность, %</label>
              <input
                style={inputStyle}
                type="number"
                step="any"
                value={form.target_return}
                onChange={(e) => set('target_return', e.target.value)}
                placeholder="15"
              />
            </div>
            <div>
              <label style={labelStyle}>Уровень риска</label>
              <select style={inputStyle} value={form.risk_level} onChange={(e) => set('risk_level', e.target.value)}>
                <option value="">— не задан —</option>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Горизонт инвестиций</label>
              <input
                style={inputStyle}
                value={form.investment_horizon}
                onChange={(e) => set('investment_horizon', e.target.value)}
                placeholder="12 месяцев"
              />
            </div>
          </div>

          {/* Row 5: geography + portfolio_id */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>География</label>
              <input
                style={inputStyle}
                value={form.geography}
                onChange={(e) => set('geography', e.target.value)}
                placeholder="Узбекистан, США..."
              />
            </div>
            <div>
              <label style={labelStyle}>Портфель</label>
              <select style={inputStyle} value={form.portfolio_id} onChange={(e) => set('portfolio_id', e.target.value)}>
                <option value="">— без портфеля —</option>
                {portfolioList.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Теги (через запятую)</label>
            <input
              style={inputStyle}
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="технологии, рост, дивиденды"
            />
          </div>

          {/* Rationale */}
          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>Обоснование решения</label>
            <textarea
              style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }}
              value={form.rationale}
              onChange={(e) => set('rationale', e.target.value)}
              placeholder="Почему это решение принято..."
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Примечания</label>
            <textarea
              style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Дополнительные заметки..."
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '9px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Сохранение...' : isEdit ? 'Сохранить изменения' : 'Создать решение'}
            </button>
          </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}

// ─── Status Change Modal ──────────────────────────────────────────────────────

function StatusModal({
  decision,
  onClose,
  onChanged,
}: {
  decision: Decision;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const available = STATUS_TRANSITIONS[decision.status] || [];

  const handleChange = async (newStatus: string) => {
    setSaving(true);
    setError('');
    try {
      await decisionsApi.updateStatus(decision.id, newStatus);
      onChanged();
    } catch (err: unknown) {
      let msg = 'Ошибка изменения статуса';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.detail || msg;
      } catch {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
            Изменить статус
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: '20px',
              lineHeight: '1',
              padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Current status */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Текущий статус</p>
            <StatusBadge status={decision.status} />
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                fontSize: '13px',
                color: '#ef4444',
              }}
            >
              {error}
            </div>
          )}

          {available.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Дальнейшие переходы для этого статуса недоступны.
            </p>
          ) : (
            <>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '10px' }}>
                Доступные переходы
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {available.map((s) => {
                  const c = STATUS_COLORS[s] || { bg: '#f1f5f9', text: '#64748b' };
                  return (
                    <button
                      key={s}
                      onClick={() => handleChange(s)}
                      disabled={saving}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: `1px solid ${c.bg}`,
                        backgroundColor: c.bg,
                        color: c.text,
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        opacity: saving ? 0.6 : 1,
                        textAlign: 'left',
                      }}
                    >
                      → {STATUS_LABELS[s] || s}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '9px 20px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#64748b',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </ModalBackdrop>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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
        <p style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', lineHeight: '1.3' }}>
          {title}
        </p>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            backgroundColor: `${accent}18`,
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
          fontSize: '24px',
          fontWeight: '700',
          color: '#1e293b',
          lineHeight: '1',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
      {sub && <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '-4px' }}>{sub}</p>}
    </div>
  );
}

// ─── Sortable column header ────────────────────────────────────────────────────

function SortTh({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortOrder: string;
  onSort: (f: string) => void;
}) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: '10px 14px',
        textAlign: 'left',
        fontSize: '11px',
        fontWeight: '600',
        color: active ? '#3b82f6' : '#64748b',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '2px solid #f1f5f9',
        backgroundColor: '#f8fafc',
      }}
    >
      {label}
      {active && (
        <span style={{ marginLeft: '4px', fontSize: '10px' }}>
          {sortOrder === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <tr>
      <td colSpan={9}>
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            color: '#94a3b8',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px', display: 'block' }}
          >
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <p
            style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#64748b',
              marginBottom: '6px',
            }}
          >
            Нет инвестиционных решений
          </p>
          <p style={{ fontSize: '13px', marginBottom: '20px' }}>
            Создайте первое решение, чтобы начать управление инвестициями
          </p>
          <button
            onClick={onNew}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Создать решение
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  pages,
  total,
  perPage,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  perPage: number;
  onPage: (p: number) => void;
}) {
  if (pages <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        borderTop: '1px solid #f1f5f9',
        flexWrap: 'wrap',
        gap: '10px',
      }}
    >
      <p style={{ fontSize: '12px', color: '#64748b' }}>
        Показано {from}–{to} из {total}
      </p>
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: page <= 1 ? '#f8fafc' : '#ffffff',
            color: page <= 1 ? '#cbd5e1' : '#64748b',
            fontSize: '13px',
            cursor: page <= 1 ? 'not-allowed' : 'pointer',
          }}
        >
          ‹
        </button>
        {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
          let p: number;
          if (pages <= 7) {
            p = i + 1;
          } else if (page <= 4) {
            p = i + 1;
            if (i === 6) p = pages;
          } else if (page >= pages - 3) {
            p = pages - 6 + i;
            if (i === 0) p = 1;
          } else {
            const arr = [1, page - 2, page - 1, page, page + 1, page + 2, pages];
            p = arr[i];
          }
          const isActive = p === page;
          return (
            <button
              key={i}
              onClick={() => onPage(p)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: isActive ? 'none' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#3b82f6' : '#ffffff',
                color: isActive ? '#ffffff' : '#64748b',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '400',
                cursor: 'pointer',
                minWidth: '32px',
              }}
            >
              {p}
            </button>
          );
        })}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          style={{
            padding: '5px 10px',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            backgroundColor: page >= pages ? '#f8fafc' : '#ffffff',
            color: page >= pages ? '#cbd5e1' : '#64748b',
            fontSize: '13px',
            cursor: page >= pages ? 'not-allowed' : 'pointer',
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DecisionsPage() {
  const router = useRouter();

  // Data state
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats] = useState<DecisionStats | null>(null);
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPortfolio, setFilterPortfolio] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editDecision, setEditDecision] = useState<Decision | null>(null);
  const [statusDecision, setStatusDecision] = useState<Decision | null>(null);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadPortfolios = useCallback(async () => {
    try {
      const res = await portfoliosApi.list();
      setPortfolioList(Array.isArray(res) ? res : res?.items || []);
    } catch {
      // ignore
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const res = await decisionsApi.stats();
      setStats(res);
    } catch {
      // Stats endpoint might not exist, fall back to computed
    }
  }, []);

  const loadDecisions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = {
        page,
        per_page: perPage,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.decision_type = filterType;
      if (filterPriority) params.priority = filterPriority;
      if (filterCategory) params.category = filterCategory;
      if (filterPortfolio) params.portfolio_id = parseInt(filterPortfolio);
      if (search) params.search = search;

      const res = await decisionsApi.list(params);

      // Handle both paginated and array responses
      if (Array.isArray(res)) {
        setDecisions(res);
        setTotal(res.length);
        setPages(1);
      } else if (res && typeof res === 'object') {
        const items = res.items || res.data || [];
        setDecisions(items);
        setTotal(res.total ?? items.length);
        setPages(res.pages ?? Math.ceil((res.total ?? items.length) / perPage));
      }
    } catch (err: unknown) {
      // Don't redirect on data errors — just show error
      let msg = 'Ошибка загрузки данных';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.detail || msg;
      } catch {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortOrder, filterStatus, filterType, filterPriority, filterCategory, filterPortfolio, search]);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadPortfolios();
    loadStats();
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    loadDecisions();
  }, [loadDecisions]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') {
      setSearchInput('');
      setSearch('');
      setPage(1);
    }
  };

  const handleDelete = async (d: Decision) => {
    if (!confirm(`Удалить решение "${d.asset_name}"?`)) return;
    try {
      await decisionsApi.delete(d.id);
      loadDecisions();
      loadStats();
    } catch (err: unknown) {
      let msg = 'Ошибка удаления';
      try {
        const parsed = JSON.parse(err.message);
        msg = parsed.detail || msg;
      } catch {
        msg = err.message || msg;
      }
      alert(msg);
    }
  };

  const handleSaved = () => {
    setShowCreate(false);
    setEditDecision(null);
    loadDecisions();
    loadStats();
  };

  const handleStatusChanged = () => {
    setStatusDecision(null);
    loadDecisions();
    loadStats();
  };

  const resetFilters = () => {
    setFilterStatus('');
    setFilterType('');
    setFilterPriority('');
    setFilterCategory('');
    setFilterPortfolio('');
    setSearch('');
    setSearchInput('');
    setPage(1);
  };

  // ── Computed stats fallback (from loaded decisions) ────────────────────────

  const statsTotal = stats?.total ?? total;
  const statsReview = stats?.by_status?.review ?? decisions.filter((d) => d.status === 'review').length;
  const statsTotalValue =
    stats?.total_value ??
    decisions.reduce((acc, d) => acc + (d.amount || 0) * (d.price || 0), 0);
  const statsHighPriority =
    stats?.by_priority?.high != null
      ? (stats.by_priority.high || 0) + (stats.by_priority.critical || 0)
      : decisions.filter((d) => d.priority === 'high' || d.priority === 'critical').length;

  const hasFilters =
    filterStatus || filterType || filterPriority || filterCategory || filterPortfolio || search;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1e293b',
              letterSpacing: '-0.02em',
            }}
          >
            Инвестиционные решения
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            Управление инвестиционными решениями · AI Capital Management
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '9px 20px',
            borderRadius: '8px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Новое решение
        </button>
      </div>

      {/* ── Stats bar ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <KpiCard
          title="Всего решений"
          value={loading ? '—' : String(statsTotal)}
          sub="Во всех портфелях"
          accent="#3b82f6"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="13" y2="16" />
            </svg>
          }
        />
        <KpiCard
          title="На рассмотрении"
          value={loading ? '—' : String(statsReview)}
          sub="Статус: На проверке"
          accent="#f59e0b"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <KpiCard
          title="Общая стоимость"
          value={loading ? '—' : '$' + (statsTotalValue >= 1_000_000
            ? (statsTotalValue / 1_000_000).toFixed(1) + 'M'
            : statsTotalValue >= 1_000
            ? (statsTotalValue / 1_000).toFixed(0) + 'K'
            : statsTotalValue.toLocaleString('ru-RU'))}
          sub="Сумма всех позиций"
          accent="#22c55e"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <KpiCard
          title="Высокий приоритет"
          value={loading ? '—' : String(statsHighPriority)}
          sub="Высокий + Критический"
          accent="#ef4444"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.29 3.86-8.25 14.29a2 2 0 0 0 1.71 3h16.5a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* ── Filters ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {/* Status */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            border: `1px solid ${filterStatus ? '#3b82f6' : '#e2e8f0'}`,
            fontSize: '12px',
            color: filterStatus ? '#3b82f6' : '#64748b',
            backgroundColor: filterStatus ? '#eff6ff' : '#ffffff',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="review">На проверке</option>
          <option value="approved">Одобрено</option>
          <option value="in_progress">В работе</option>
          <option value="completed">Завершено</option>
          <option value="rejected">Отклонено</option>
        </select>

        {/* Type */}
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            border: `1px solid ${filterType ? '#3b82f6' : '#e2e8f0'}`,
            fontSize: '12px',
            color: filterType ? '#3b82f6' : '#64748b',
            backgroundColor: filterType ? '#eff6ff' : '#ffffff',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Все типы</option>
          <option value="BUY">Купить</option>
          <option value="SELL">Продать</option>
          <option value="HOLD">Держать</option>
        </select>

        {/* Priority */}
        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            border: `1px solid ${filterPriority ? '#3b82f6' : '#e2e8f0'}`,
            fontSize: '12px',
            color: filterPriority ? '#3b82f6' : '#64748b',
            backgroundColor: filterPriority ? '#eff6ff' : '#ffffff',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Все приоритеты</option>
          <option value="low">Низкий</option>
          <option value="medium">Средний</option>
          <option value="high">Высокий</option>
          <option value="critical">Критический</option>
        </select>

        {/* Category */}
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          style={{
            padding: '7px 10px',
            borderRadius: '8px',
            border: `1px solid ${filterCategory ? '#3b82f6' : '#e2e8f0'}`,
            fontSize: '12px',
            color: filterCategory ? '#3b82f6' : '#64748b',
            backgroundColor: filterCategory ? '#eff6ff' : '#ffffff',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="">Все категории</option>
          <option value="equity">Акции</option>
          <option value="debt">Долговые</option>
          <option value="real_estate">Недвижимость</option>
          <option value="infrastructure">Инфраструктура</option>
          <option value="venture">Венчур</option>
          <option value="other">Другое</option>
        </select>

        {/* Portfolio */}
        {portfolioList.length > 0 && (
          <select
            value={filterPortfolio}
            onChange={(e) => { setFilterPortfolio(e.target.value); setPage(1); }}
            style={{
              padding: '7px 10px',
              borderRadius: '8px',
              border: `1px solid ${filterPortfolio ? '#3b82f6' : '#e2e8f0'}`,
              fontSize: '12px',
              color: filterPortfolio ? '#3b82f6' : '#64748b',
              backgroundColor: filterPortfolio ? '#eff6ff' : '#ffffff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">Все портфели</option>
            {portfolioList.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {/* Search */}
        <div style={{ display: 'flex', gap: '4px', flex: '1 1 200px', minWidth: '160px' }}>
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Поиск по активу..."
            style={{
              flex: 1,
              padding: '7px 11px',
              borderRadius: '8px',
              border: `1px solid ${search ? '#3b82f6' : '#e2e8f0'}`,
              fontSize: '12px',
              color: '#1e293b',
              backgroundColor: search ? '#eff6ff' : '#ffffff',
              outline: 'none',
            }}
          />
          <button
            onClick={handleSearch}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        </div>

        {/* Reset button — only shown when filters active */}
        {hasFilters && (
          <button
            onClick={resetFilters}
            style={{
              padding: '7px 12px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#64748b',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Сбросить
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#ef4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            onClick={loadDecisions}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #fecaca',
              backgroundColor: '#ffffff',
              color: '#ef4444',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Повторить
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Table header with count */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>
            {hasFilters ? `Результаты поиска` : 'Все решения'}
            {!loading && (
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#94a3b8', fontWeight: '400' }}>
                {total} записей
              </span>
            )}
          </p>
          {loading && (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Загрузка...</span>
          )}
        </div>

        {/* Scrollable table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr>
                <SortTh label="Актив" field="asset_name" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortTh label="Тип" field="decision_type" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortTh label="Кол-во" field="amount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortTh label="Цена, $" field="price" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    borderBottom: '2px solid #f1f5f9',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  Стоимость
                </th>
                <SortTh label="Приоритет" field="priority" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortTh label="Статус" field="status" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <SortTh label="Дата" field="created_at" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                <th
                  style={{
                    padding: '10px 14px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#64748b',
                    whiteSpace: 'nowrap',
                    borderBottom: '2px solid #f1f5f9',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px', borderBottom: '1px solid #f8fafc' }}>
                        <div
                          style={{
                            height: '14px',
                            borderRadius: '4px',
                            backgroundColor: '#f1f5f9',
                            width: j === 0 ? '80%' : j === 8 ? '60%' : '60%',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : decisions.length === 0 ? (
                <EmptyState onNew={() => setShowCreate(true)} />
              ) : (
                decisions.map((d, idx) => {
                  const totalValue = (d.amount || 0) * (d.price || 0);
                  const even = idx % 2 === 0;
                  return (
                    <tr
                      key={d.id}
                      style={{
                        backgroundColor: even ? '#ffffff' : '#fafbfc',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f0f7ff';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLTableRowElement).style.backgroundColor = even ? '#ffffff' : '#fafbfc';
                      }}
                    >
                      {/* Asset */}
                      <td style={{ padding: '13px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <div>
                          <p
                            onClick={() => router.push(`/decisions/${d.id}`)}
                            style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: '#3b82f6',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '160px',
                              cursor: 'pointer',
                              textDecoration: 'none',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              textAlign: 'left',
                            }}
                          >
                            {d.asset_name}
                          </p>
                          {d.asset_symbol && (
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                              {d.asset_symbol}
                              {d.category && (
                                <span style={{ marginLeft: '6px', color: '#cbd5e1' }}>
                                  · {CATEGORY_LABELS[d.category] || d.category}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td style={{ padding: '13px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <TypeBadge type={d.decision_type} />
                      </td>

                      {/* Amount */}
                      <td
                        style={{
                          padding: '13px 14px',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: '13px',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmt(d.amount)}
                      </td>

                      {/* Price */}
                      <td
                        style={{
                          padding: '13px 14px',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: '13px',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmtUsd(d.price)}
                      </td>

                      {/* Total value */}
                      <td
                        style={{
                          padding: '13px 14px',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e293b',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {totalValue > 0 ? fmtUsd(totalValue) : '—'}
                      </td>

                      {/* Priority */}
                      <td style={{ padding: '13px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <PriorityBadge priority={d.priority} />
                      </td>

                      {/* Status */}
                      <td style={{ padding: '13px 14px', borderBottom: '1px solid #f8fafc' }}>
                        <StatusBadge status={d.status} />
                      </td>

                      {/* Date */}
                      <td
                        style={{
                          padding: '13px 14px',
                          borderBottom: '1px solid #f8fafc',
                          fontSize: '12px',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {fmtDate(d.created_at)}
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          padding: '13px 14px',
                          borderBottom: '1px solid #f8fafc',
                          textAlign: 'right',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end' }}>
                          {/* Detail page */}
                          <button
                            onClick={() => router.push(`/decisions/${d.id}`)}
                            title="Подробнее"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #c7d2fe',
                              backgroundColor: '#eef2ff',
                              color: '#6366f1',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                            <span style={{ fontSize: '11px' }}>Открыть</span>
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => setEditDecision(d)}
                            title="Редактировать"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#64748b',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span style={{ fontSize: '11px' }}>Изменить</span>
                          </button>

                          {/* Status change */}
                          <button
                            onClick={() => setStatusDecision(d)}
                            title="Изменить статус"
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid #bfdbfe',
                              backgroundColor: '#eff6ff',
                              color: '#3b82f6',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="17 1 21 5 17 9" />
                              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                              <polyline points="7 23 3 19 7 15" />
                              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                            </svg>
                            <span style={{ fontSize: '11px' }}>Статус</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(d)}
                            title="Удалить"
                            style={{
                              padding: '5px 8px',
                              borderRadius: '6px',
                              border: '1px solid #fecaca',
                              backgroundColor: '#fff1f2',
                              color: '#ef4444',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && decisions.length > 0 && (
          <Pagination
            page={page}
            pages={pages}
            total={total}
            perPage={perPage}
            onPage={(p) => setPage(p)}
          />
        )}
      </div>

      {/* ── Modals ── */}
      {(showCreate || editDecision) && (
        <DecisionModal
          decision={editDecision}
          portfolioList={portfolioList}
          onClose={() => { setShowCreate(false); setEditDecision(null); }}
          onSaved={handleSaved}
        />
      )}

      {statusDecision && (
        <StatusModal
          decision={statusDecision}
          onClose={() => setStatusDecision(null)}
          onChanged={handleStatusChanged}
        />
      )}
    </div>
  );
}
