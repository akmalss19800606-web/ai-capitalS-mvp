'use client';
import { useEffect, useState } from 'react';
import { apiGateway } from '../../lib/api';

/* ─── Типы ──────────────────────────────────────────────────── */
interface ApiKeyItem {
  id: number;
  name: string;
  key_prefix: string;
  scopes: string[] | null;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  request_count: number;
  rate_limit: number;
  created_at: string;
  full_key?: string;
}

interface WebhookItem {
  id: number;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  headers: Record<string, string> | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

interface DeliveryItem {
  id: number;
  subscription_id: number;
  event_type: string;
  payload: any;
  status_code: number | null;
  response_body: string | null;
  delivery_status: string;
  attempt: number;
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface UsageSummary {
  total_requests: number;
  requests_today: number;
  requests_this_week: number;
  avg_response_time_ms: number;
  error_rate_pct: number;
  top_endpoints: { path: string; count: number }[];
  requests_by_method: Record<string, number>;
  requests_by_hour: { hour: string; count: number }[];
}

interface UsageLogItem {
  id: number;
  user_id: number | null;
  api_key_id: number | null;
  method: string;
  path: string;
  status_code: number;
  response_time_ms: number | null;
  ip_address: string | null;
  created_at: string;
}

/* ─── Палитра ───────────────────────────────────────────────── */
const C = {
  pageBg: '#f8fafc',
  cardBg: '#ffffff',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  blue: '#3b82f6',
  blueSoft: '#eff6ff',
  green: '#22c55e',
  greenSoft: '#f0fdf4',
  red: '#ef4444',
  redSoft: '#fef2f2',
  amber: '#f59e0b',
  amberSoft: '#fffbeb',
  purple: '#8b5cf6',
  purpleSoft: '#f5f3ff',
  indigo: '#6366f1',
  indigoSoft: '#eef2ff',
};

/* ─── SVG-иконки ────────────────────────────────────────────── */
function SvgIcon({ d, size = 16, color = 'currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  webhook: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
  chart: 'M18 20V10M12 20V4M6 20v-6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  copy: 'M20 9h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2zM5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z',
  check: 'M20 6L9 17l-5-5',
  x: 'M18 6L6 18M6 6l12 12',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  zap: 'M13 2L3 14h9l-1 10 10-12h-9l1-10z',
};

/* ─── Утилиты ───────────────────────────────────────────────── */
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: active ? C.greenSoft : C.redSoft,
        color: active ? '#16a34a' : '#dc2626',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: active ? C.green : C.red }} />
      {active ? 'Активен' : 'Отключён'}
    </span>
  );
}

function DeliveryStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    delivered: { bg: C.greenSoft, color: '#16a34a', label: 'Доставлено' },
    pending: { bg: C.amberSoft, color: '#d97706', label: 'Ожидание' },
    failed: { bg: C.redSoft, color: '#dc2626', label: 'Ошибка' },
    retrying: { bg: C.purpleSoft, color: '#7c3aed', label: 'Повтор' },
  };
  const s = map[status] || { bg: C.borderLight, color: C.textSecondary, label: status };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: '600',
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

function MethodBadge({ method }: { method: string }) {
  const map: Record<string, string> = { GET: C.blue, POST: C.green, PUT: C.amber, DELETE: C.red, PATCH: C.purple };
  const color = map[method] || C.textSecondary;
  return (
    <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '700', color, letterSpacing: '0.5px' }}>
      {method}
    </span>
  );
}

/* ─── Стили ──────────────────────────────────────────────────── */
const cardStyle: React.CSSProperties = {
  backgroundColor: C.cardBg,
  borderRadius: '12px',
  border: `1px solid ${C.border}`,
  padding: '20px',
  marginBottom: '16px',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: C.blue,
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '600',
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 12px',
  backgroundColor: 'transparent',
  color: C.textSecondary,
  border: `1px solid ${C.border}`,
  borderRadius: '7px',
  fontSize: '12px',
  cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  ...btnSecondary,
  color: C.red,
  borderColor: '#fecaca',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  fontSize: '13px',
  outline: 'none',
  color: C.textPrimary,
  backgroundColor: '#fff',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '600',
  color: C.textSecondary,
  marginBottom: '4px',
};

const thStyle: React.CSSProperties = {
  padding: '10px 12px',
  textAlign: 'left' as const,
  fontSize: '11px',
  fontWeight: '600',
  color: C.textMuted,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  borderBottom: `1px solid ${C.border}`,
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px',
  fontSize: '13px',
  borderBottom: `1px solid ${C.borderLight}`,
  color: C.textPrimary,
};

/* ─── Модальное окно ────────────────────────────────────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '14px',
          padding: '24px',
          maxWidth: '520px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: C.textPrimary }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textMuted }}>
            <SvgIcon d={ICONS.x} size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ icon, iconColor, iconBg, label, value }: { icon: string; iconColor: string; iconBg: string; label: string; value: string | number }) {
  return (
    <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '14px', marginBottom: 0 }}>
      <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <SvgIcon d={icon} size={20} color={iconColor} />
      </div>
      <div>
        <p style={{ fontSize: '12px', color: C.textMuted, marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '22px', fontWeight: '700', color: C.textPrimary }}>{value}</p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ОСНОВНОЙ КОМПОНЕНТ
   ═══════════════════════════════════════════════════════════════ */
export default function ApiGatewayPage() {
  const [tab, setTab] = useState<'keys' | 'webhooks' | 'usage'>('keys');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* ─── API Keys state ────────────────────────────────────── */
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState('');
  const [newKeyRateLimit, setNewKeyRateLimit] = useState(100);
  const [newKeyExpires, setNewKeyExpires] = useState<number | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  /* ─── Webhooks state ────────────────────────────────────── */
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [showWhModal, setShowWhModal] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whSecret, setWhSecret] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>([]);
  const [whRetry, setWhRetry] = useState(3);
  const [deliveriesFor, setDeliveriesFor] = useState<number | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);

  /* ─── Usage state ───────────────────────────────────────── */
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLogItem[]>([]);

  /* ─── Загрузка данных ───────────────────────────────────── */
  const loadKeys = async () => {
    try { const d = await apiGateway.listApiKeys(); setKeys(d || []); } catch {}
  };
  const loadWebhooks = async () => {
    try {
      const [wh, ev] = await Promise.all([apiGateway.listWebhooks(), apiGateway.getAvailableEvents()]);
      setWebhooks(wh || []);
      setAvailableEvents(ev?.events || []);
    } catch {}
  };
  const loadUsage = async () => {
    try {
      const [sum, logs] = await Promise.all([apiGateway.getUsageSummary(), apiGateway.getUsageLogs(100)]);
      setUsage(sum);
      setUsageLogs(logs || []);
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadKeys(), loadWebhooks(), loadUsage()]).finally(() => setLoading(false));
  }, []);

  /* ─── Создать API-ключ ──────────────────────────────────── */
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setError('');
    try {
      const scopes = newKeyScopes.trim() ? newKeyScopes.split(',').map((s) => s.trim()) : undefined;
      const res = await apiGateway.createApiKey({
        name: newKeyName.trim(),
        scopes,
        rate_limit: newKeyRateLimit,
        expires_days: newKeyExpires || undefined,
      });
      setCreatedKey(res.full_key);
      setNewKeyName('');
      setNewKeyScopes('');
      setNewKeyRateLimit(100);
      setNewKeyExpires(null);
      loadKeys();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Удалить этот API-ключ? Действие необратимо.')) return;
    try { await apiGateway.deleteApiKey(id); loadKeys(); } catch {}
  };

  const handleToggleKey = async (k: ApiKeyItem) => {
    try { await apiGateway.updateApiKey(k.id, { is_active: !k.is_active }); loadKeys(); } catch {}
  };

  const handleCopyKey = () => {
    if (createdKey) { navigator.clipboard.writeText(createdKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
  };

  /* ─── Создать вебхук ────────────────────────────────────── */
  const handleCreateWebhook = async () => {
    if (!whName.trim() || !whUrl.trim() || whEvents.length === 0) return;
    setError('');
    try {
      await apiGateway.createWebhook({
        name: whName.trim(),
        url: whUrl.trim(),
        events: whEvents,
        secret: whSecret.trim() || undefined,
        retry_count: whRetry,
      });
      setShowWhModal(false);
      setWhName('');
      setWhUrl('');
      setWhSecret('');
      setWhEvents([]);
      setWhRetry(3);
      loadWebhooks();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteWebhook = async (id: number) => {
    if (!confirm('Удалить эту подписку?')) return;
    try { await apiGateway.deleteWebhook(id); loadWebhooks(); } catch {}
  };

  const handleToggleWebhook = async (wh: WebhookItem) => {
    try { await apiGateway.updateWebhook(wh.id, { is_active: !wh.is_active }); loadWebhooks(); } catch {}
  };

  const handleTestWebhook = async (id: number) => {
    try { await apiGateway.testWebhook(id); alert('Тестовый пинг отправлен'); } catch (e: any) { alert('Ошибка: ' + e.message); }
  };

  const handleShowDeliveries = async (id: number) => {
    setDeliveriesFor(id);
    try { const d = await apiGateway.getWebhookDeliveries(id, 50); setDeliveries(d || []); } catch {}
  };

  /* ─── Переключатель событий вебхука ─────────────────────── */
  const toggleEvent = (ev: string) => {
    setWhEvents((prev) => prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]);
  };

  /* ─── TAB BUTTONS ───────────────────────────────────────── */
  const tabData = [
    { key: 'keys' as const, label: 'API-Ключи', icon: ICONS.key },
    { key: 'webhooks' as const, label: 'Вебхуки', icon: ICONS.webhook },
    { key: 'usage' as const, label: 'Мониторинг', icon: ICONS.chart },
  ];

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* ── Заголовок ────────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: C.textPrimary, marginBottom: '4px' }}>
          API Gateway
        </h1>
        <p style={{ fontSize: '13px', color: C.textSecondary }}>
          Управление API-ключами, вебхуками и мониторинг использования
        </p>
      </div>

      {/* ── Табы ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', backgroundColor: C.borderLight, padding: '4px', borderRadius: '10px' }}>
        {tabData.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '9px 16px',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: tab === t.key ? '600' : '500',
              backgroundColor: tab === t.key ? '#fff' : 'transparent',
              color: tab === t.key ? C.blue : C.textMuted,
              cursor: 'pointer',
              boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <SvgIcon d={t.icon} size={15} color={tab === t.key ? C.blue : C.textMuted} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', backgroundColor: C.redSoft, color: C.red, borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: C.textMuted }}>Загрузка...</div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════
              TAB: API Keys
              ═══════════════════════════════════════════════════ */}
          {tab === 'keys' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: C.textSecondary }}>{keys.length} ключ(ей)</p>
                <button style={btnPrimary} onClick={() => { setShowKeyModal(true); setCreatedKey(null); }}>
                  <SvgIcon d={ICONS.plus} size={14} color="#fff" />
                  Создать ключ
                </button>
              </div>

              {keys.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '48px', color: C.textMuted }}>
                  <SvgIcon d={ICONS.key} size={40} color={C.textMuted} />
                  <p style={{ marginTop: '12px', fontSize: '14px' }}>Нет API-ключей</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Создайте первый ключ для доступа к API</p>
                </div>
              ) : (
                <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: C.borderLight }}>
                        <th style={thStyle}>Название</th>
                        <th style={thStyle}>Префикс</th>
                        <th style={thStyle}>Лимит</th>
                        <th style={thStyle}>Запросов</th>
                        <th style={thStyle}>Статус</th>
                        <th style={thStyle}>Создан</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keys.map((k) => (
                        <tr key={k.id}>
                          <td style={tdStyle}>
                            <div>
                              <p style={{ fontWeight: '600', fontSize: '13px' }}>{k.name}</p>
                              {k.scopes && k.scopes.length > 0 && (
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                  {k.scopes.map((s) => (
                                    <span key={s} style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '4px', backgroundColor: C.indigoSoft, color: C.indigo, fontWeight: '500' }}>
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', color: C.textMuted }}>{k.key_prefix}...</td>
                          <td style={tdStyle}>{k.rate_limit}/мин</td>
                          <td style={tdStyle}>{k.request_count.toLocaleString()}</td>
                          <td style={tdStyle}><StatusBadge active={k.is_active} /></td>
                          <td style={{ ...tdStyle, fontSize: '12px', color: C.textMuted }}>{fmtDate(k.created_at)}</td>
                          <td style={{ ...tdStyle, textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button style={btnSecondary} onClick={() => handleToggleKey(k)} title={k.is_active ? 'Отключить' : 'Включить'}>
                                <SvgIcon d={k.is_active ? ICONS.x : ICONS.check} size={13} />
                              </button>
                              <button style={btnDanger} onClick={() => handleDeleteKey(k.id)} title="Удалить">
                                <SvgIcon d={ICONS.trash} size={13} color={C.red} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Модалка создания ключа */}
              <Modal open={showKeyModal} onClose={() => { setShowKeyModal(false); setCreatedKey(null); }} title={createdKey ? 'Ключ создан' : 'Новый API-ключ'}>
                {createdKey ? (
                  <div>
                    <div style={{ padding: '12px', backgroundColor: C.amberSoft, borderRadius: '8px', marginBottom: '14px' }}>
                      <p style={{ fontSize: '12px', color: '#92400e', fontWeight: '600', marginBottom: '4px' }}>
                        Внимание: полный ключ показывается только один раз
                      </p>
                      <p style={{ fontSize: '11px', color: '#92400e' }}>Сохраните его в безопасном месте</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input readOnly value={createdKey} style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px', backgroundColor: C.borderLight }} />
                      <button style={btnPrimary} onClick={handleCopyKey}>
                        <SvgIcon d={copiedKey ? ICONS.check : ICONS.copy} size={14} color="#fff" />
                        {copiedKey ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Название</label>
                      <input style={inputStyle} value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="Мой API-ключ" />
                    </div>
                    <div>
                      <label style={labelStyle}>Области доступа (через запятую)</label>
                      <input style={inputStyle} value={newKeyScopes} onChange={(e) => setNewKeyScopes(e.target.value)} placeholder="read:decisions, write:portfolios" />
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Лимит (запросов/мин)</label>
                        <input style={inputStyle} type="number" value={newKeyRateLimit} onChange={(e) => setNewKeyRateLimit(Number(e.target.value))} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Истекает через (дней)</label>
                        <input style={inputStyle} type="number" value={newKeyExpires || ''} onChange={(e) => setNewKeyExpires(e.target.value ? Number(e.target.value) : null)} placeholder="Без срока" />
                      </div>
                    </div>
                    <button style={{ ...btnPrimary, justifyContent: 'center', marginTop: '4px' }} onClick={handleCreateKey}>
                      <SvgIcon d={ICONS.key} size={14} color="#fff" />
                      Создать ключ
                    </button>
                  </div>
                )}
              </Modal>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              TAB: Webhooks
              ═══════════════════════════════════════════════════ */}
          {tab === 'webhooks' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '13px', color: C.textSecondary }}>{webhooks.length} подписок</p>
                <button style={btnPrimary} onClick={() => setShowWhModal(true)}>
                  <SvgIcon d={ICONS.plus} size={14} color="#fff" />
                  Новая подписка
                </button>
              </div>

              {webhooks.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '48px', color: C.textMuted }}>
                  <SvgIcon d={ICONS.webhook} size={40} color={C.textMuted} />
                  <p style={{ marginTop: '12px', fontSize: '14px' }}>Нет подписок на вебхуки</p>
                  <p style={{ fontSize: '12px', marginTop: '4px' }}>Настройте уведомления о событиях системы</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {webhooks.map((wh) => (
                    <div key={wh.id} style={cardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: C.textPrimary }}>{wh.name}</h4>
                            <StatusBadge active={wh.is_active} />
                          </div>
                          <p style={{ fontSize: '12px', fontFamily: 'monospace', color: C.textMuted }}>{wh.url}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button style={btnSecondary} onClick={() => handleTestWebhook(wh.id)} title="Тестовый пинг">
                            <SvgIcon d={ICONS.send} size={13} />
                          </button>
                          <button style={btnSecondary} onClick={() => handleShowDeliveries(wh.id)} title="Журнал доставки">
                            <SvgIcon d={ICONS.eye} size={13} />
                          </button>
                          <button style={btnSecondary} onClick={() => handleToggleWebhook(wh)} title={wh.is_active ? 'Отключить' : 'Включить'}>
                            <SvgIcon d={wh.is_active ? ICONS.x : ICONS.check} size={13} />
                          </button>
                          <button style={btnDanger} onClick={() => handleDeleteWebhook(wh.id)} title="Удалить">
                            <SvgIcon d={ICONS.trash} size={13} color={C.red} />
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {wh.events.map((ev) => (
                          <span key={ev} style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', backgroundColor: C.blueSoft, color: C.blue, fontWeight: '500' }}>
                            {ev}
                          </span>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '18px', marginTop: '10px', fontSize: '11px', color: C.textMuted }}>
                        <span>Повторов: {wh.retry_count}</span>
                        <span>Создан: {fmtDate(wh.created_at)}</span>
                        {wh.secret && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><SvgIcon d={ICONS.shield} size={11} color={C.green} /> HMAC-подпись</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Модалка создания вебхука */}
              <Modal open={showWhModal} onClose={() => setShowWhModal(false)} title="Новая подписка на вебхук">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Название</label>
                    <input style={inputStyle} value={whName} onChange={(e) => setWhName(e.target.value)} placeholder="Уведомления о решениях" />
                  </div>
                  <div>
                    <label style={labelStyle}>URL</label>
                    <input style={inputStyle} value={whUrl} onChange={(e) => setWhUrl(e.target.value)} placeholder="https://example.com/webhook" />
                  </div>
                  <div>
                    <label style={labelStyle}>Секрет (для HMAC-подписи)</label>
                    <input style={inputStyle} value={whSecret} onChange={(e) => setWhSecret(e.target.value)} placeholder="Оставьте пустым для автогенерации" />
                  </div>
                  <div>
                    <label style={labelStyle}>События</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                      {availableEvents.map((ev) => {
                        const selected = whEvents.includes(ev);
                        return (
                          <button
                            key={ev}
                            onClick={() => toggleEvent(ev)}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: '500',
                              borderRadius: '6px',
                              border: `1px solid ${selected ? C.blue : C.border}`,
                              backgroundColor: selected ? C.blueSoft : '#fff',
                              color: selected ? C.blue : C.textSecondary,
                              cursor: 'pointer',
                              transition: 'all 0.12s',
                            }}
                          >
                            {ev}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Количество повторов</label>
                    <input style={{ ...inputStyle, width: '100px' }} type="number" min={0} max={10} value={whRetry} onChange={(e) => setWhRetry(Number(e.target.value))} />
                  </div>
                  <button style={{ ...btnPrimary, justifyContent: 'center', marginTop: '4px' }} onClick={handleCreateWebhook}>
                    <SvgIcon d={ICONS.webhook} size={14} color="#fff" />
                    Создать подписку
                  </button>
                </div>
              </Modal>

              {/* Модалка журнала доставки */}
              <Modal open={deliveriesFor !== null} onClose={() => setDeliveriesFor(null)} title="Журнал доставки">
                {deliveries.length === 0 ? (
                  <p style={{ fontSize: '13px', color: C.textMuted, textAlign: 'center', padding: '20px' }}>Нет записей</p>
                ) : (
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Событие</th>
                          <th style={thStyle}>Статус</th>
                          <th style={thStyle}>HTTP</th>
                          <th style={thStyle}>Попытка</th>
                          <th style={thStyle}>Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deliveries.map((d) => (
                          <tr key={d.id}>
                            <td style={{ ...tdStyle, fontSize: '12px', fontFamily: 'monospace' }}>{d.event_type}</td>
                            <td style={tdStyle}><DeliveryStatusBadge status={d.delivery_status} /></td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px' }}>{d.status_code || '—'}</td>
                            <td style={tdStyle}>{d.attempt}</td>
                            <td style={{ ...tdStyle, fontSize: '11px', color: C.textMuted }}>{fmtDate(d.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Modal>
            </>
          )}

          {/* ═══════════════════════════════════════════════════
              TAB: Usage Monitoring
              ═══════════════════════════════════════════════════ */}
          {tab === 'usage' && (
            <>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                <StatCard icon={ICONS.zap} iconColor={C.blue} iconBg={C.blueSoft} label="Всего запросов" value={usage?.total_requests?.toLocaleString() || '0'} />
                <StatCard icon={ICONS.chart} iconColor={C.green} iconBg={C.greenSoft} label="Сегодня" value={usage?.requests_today?.toLocaleString() || '0'} />
                <StatCard icon={ICONS.refresh} iconColor={C.purple} iconBg={C.purpleSoft} label="За неделю" value={usage?.requests_this_week?.toLocaleString() || '0'} />
                <StatCard icon={ICONS.send} iconColor={C.amber} iconBg={C.amberSoft} label="Ср. время (мс)" value={usage?.avg_response_time_ms?.toFixed(1) || '0'} />
              </div>

              {/* Методы + Ошибки */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div style={cardStyle}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: C.textPrimary, marginBottom: '12px' }}>Запросы по методам</h4>
                  {usage?.requests_by_method && Object.entries(usage.requests_by_method).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {Object.entries(usage.requests_by_method).map(([method, count]) => {
                        const total = Object.values(usage.requests_by_method).reduce((a, b) => a + b, 0);
                        const pct = total > 0 ? (count / total) * 100 : 0;
                        const colorMap: Record<string, string> = { GET: C.blue, POST: C.green, PUT: C.amber, DELETE: C.red };
                        const barColor = colorMap[method] || C.textMuted;
                        return (
                          <div key={method}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                              <MethodBadge method={method} />
                              <span style={{ fontSize: '12px', color: C.textMuted }}>{count}</span>
                            </div>
                            <div style={{ height: '4px', borderRadius: '2px', backgroundColor: C.borderLight }}>
                              <div style={{ height: '100%', borderRadius: '2px', backgroundColor: barColor, width: `${pct}%`, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '12px', color: C.textMuted }}>Нет данных</p>
                  )}
                </div>
                <div style={cardStyle}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: C.textPrimary, marginBottom: '12px' }}>Статистика</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: C.textMuted, marginBottom: '2px' }}>Процент ошибок</p>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <span style={{ fontSize: '24px', fontWeight: '700', color: (usage?.error_rate_pct || 0) > 5 ? C.red : C.green }}>{usage?.error_rate_pct?.toFixed(1) || '0'}%</span>
                        <span style={{ fontSize: '11px', color: C.textMuted }}>{(usage?.error_rate_pct || 0) > 5 ? 'Высокий' : 'Норма'}</span>
                      </div>
                    </div>
                    {usage?.top_endpoints && usage.top_endpoints.length > 0 && (
                      <div>
                        <p style={{ fontSize: '11px', color: C.textMuted, marginBottom: '6px' }}>Топ эндпоинтов</p>
                        {usage.top_endpoints.slice(0, 5).map((ep, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '12px' }}>
                            <span style={{ fontFamily: 'monospace', color: C.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{ep.path}</span>
                            <span style={{ fontWeight: '600', color: C.textPrimary }}>{ep.count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Лог запросов */}
              <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '600', color: C.textPrimary }}>Последние запросы</h4>
                  <button style={btnSecondary} onClick={() => loadUsage()}>
                    <SvgIcon d={ICONS.refresh} size={13} />
                    Обновить
                  </button>
                </div>
                {usageLogs.length === 0 ? (
                  <p style={{ fontSize: '12px', color: C.textMuted, textAlign: 'center', padding: '20px' }}>Нет данных</p>
                ) : (
                  <div style={{ overflow: 'auto', maxHeight: '400px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: C.borderLight }}>
                          <th style={thStyle}>Метод</th>
                          <th style={thStyle}>Путь</th>
                          <th style={thStyle}>Статус</th>
                          <th style={thStyle}>Время (мс)</th>
                          <th style={thStyle}>IP</th>
                          <th style={thStyle}>Дата</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageLogs.map((l) => (
                          <tr key={l.id}>
                            <td style={tdStyle}><MethodBadge method={l.method} /></td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.path}</td>
                            <td style={tdStyle}>
                              <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: l.status_code < 400 ? C.green : l.status_code < 500 ? C.amber : C.red }}>
                                {l.status_code}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, fontSize: '12px', color: C.textMuted }}>{l.response_time_ms?.toFixed(0) || '—'}</td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '11px', color: C.textMuted }}>{l.ip_address || '—'}</td>
                            <td style={{ ...tdStyle, fontSize: '11px', color: C.textMuted }}>{fmtDate(l.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
