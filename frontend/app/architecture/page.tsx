'use client';
import { useEffect, useState } from 'react';
import { architecturalPrinciples } from '../../lib/api';

/* ═══════════════════════════════════════════════════════
   Фаза 4, Сессия 4 — Архитектурные принципы
   5 вкладок: Event Sourcing, HITL, Снапшоты, Event Bus, Ограничения
   ═══════════════════════════════════════════════════════ */

const TABS = [
  { key: 'events', label: 'Event Sourcing', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
  { key: 'hitl', label: 'HITL', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { key: 'snapshots', label: 'Снапшоты', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' },
  { key: 'bus', label: 'Event Bus', icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' },
  { key: 'constraints', label: 'Ограничения', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
];

function TabIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

// ─── Severity badge ───
function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    info: { bg: '#dbeafe', color: '#1d4ed8' },
    warning: { bg: '#fef3c7', color: '#92400e' },
    critical: { bg: '#fee2e2', color: '#991b1b' },
    error: { bg: '#fee2e2', color: '#991b1b' },
  };
  const c = colors[severity] || colors.info;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '9999px',
      fontSize: '11px', fontWeight: 600, backgroundColor: c.bg, color: c.color,
    }}>
      {severity}
    </span>
  );
}

// ─── Status badge ───
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    approved: { bg: '#dcfce7', color: '#166534' },
    rejected: { bg: '#fee2e2', color: '#991b1b' },
    needs_revision: { bg: '#e0e7ff', color: '#3730a3' },
    published: { bg: '#dbeafe', color: '#1d4ed8' },
    consumed: { bg: '#dcfce7', color: '#166534' },
    failed: { bg: '#fee2e2', color: '#991b1b' },
    dead_letter: { bg: '#fce7f3', color: '#9d174d' },
  };
  const c = colors[status] || { bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '9999px',
      fontSize: '11px', fontWeight: 600, backgroundColor: c.bg, color: c.color,
    }}>
      {status}
    </span>
  );
}

// ─── Stat Card ───
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px',
      border: '1px solid #e2e8f0', flex: '1 1 180px', minWidth: '180px',
    }}>
      <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '28px', fontWeight: 700, color }}>{value}</p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '12px', padding: '24px',
  border: '1px solid #e2e8f0', marginBottom: '20px',
};

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 14px', fontSize: '12px',
  fontWeight: 600, color: '#64748b', borderBottom: '2px solid #e2e8f0',
  backgroundColor: '#f8fafc',
};

const tableCellStyle: React.CSSProperties = {
  padding: '10px 14px', fontSize: '13px', color: '#334155',
  borderBottom: '1px solid #f1f5f9',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
  background: '#fff', color: '#334155', fontSize: '12px', cursor: 'pointer',
};

/* ═══════════════════════════════════════════════════════
   TAB: EVENT SOURCING
   ═══════════════════════════════════════════════════════ */
function EventSourcingTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [ev, st] = await Promise.all([
        architecturalPrinciples.getEventsTimeline({ limit: 50 }),
        architecturalPrinciples.getEventStats(),
      ]);
      setEvents(Array.isArray(ev) ? ev : ev?.events || []);
      setStats(st);
    } catch {}
    setLoading(false);
  }

  const filtered = filterType
    ? events.filter((e: Record<string, unknown>) => e.aggregate_type === filterType)
    : events;

  const aggregateTypes = [...new Set(events.map((e: Record<string, unknown>) => e.aggregate_type))];

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <StatCard label="Всего событий" value={stats.total_events ?? 0} color="#3b82f6" />
          <StatCard label="Типы агрегатов" value={stats.aggregate_types ?? 0} color="#6366f1" />
          <StatCard label="Типы событий" value={stats.event_types ?? 0} color="#8b5cf6" />
          <StatCard label="За последние 24ч" value={stats.last_24h ?? 0} color="#0ea5e9" />
        </div>
      )}

      {/* Filter */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Фильтр по агрегату:</span>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '13px', color: '#334155', backgroundColor: '#fff',
          }}
        >
          <option value="">Все</option>
          {aggregateTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={load} style={btnOutline}>Обновить</button>
      </div>

      {/* Timeline Table */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Хронология событий
        </h3>
        {loading ? (
          <p style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            Событий пока нет. События создаются автоматически при действиях в системе.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>Агрегат</th>
                  <th style={tableHeaderStyle}>ID агрегата</th>
                  <th style={tableHeaderStyle}>Тип события</th>
                  <th style={tableHeaderStyle}>Версия</th>
                  <th style={tableHeaderStyle}>Дата</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ev: Record<string, unknown>) => (
                  <tr key={ev.id}>
                    <td style={tableCellStyle}>{ev.id}</td>
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '6px',
                        backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '12px', fontWeight: 500,
                      }}>{ev.aggregate_type}</span>
                    </td>
                    <td style={tableCellStyle}>{ev.aggregate_id}</td>
                    <td style={tableCellStyle}>{ev.event_type}</td>
                    <td style={tableCellStyle}>v{ev.version}</td>
                    <td style={tableCellStyle}>{new Date(ev.created_at).toLocaleString('ru-RU')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: HITL
   ═══════════════════════════════════════════════════════ */
function HitlTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [disclaimers, setDisclaimers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [rv, st, disc] = await Promise.all([
        architecturalPrinciples.listHitlReviews({ limit: 50 }),
        architecturalPrinciples.getHitlStats(),
        architecturalPrinciples.getDisclaimers(),
      ]);
      setReviews(Array.isArray(rv) ? rv : []);
      setStats(st);
      setDisclaimers(Array.isArray(disc) ? disc : []);
    } catch {}
    setLoading(false);
  }

  async function handleAction(id: number, status: string) {
    try {
      await architecturalPrinciples.actOnReview(id, { status });
      load();
    } catch {}
  }

  const filtered = filterStatus
    ? reviews.filter((r: Record<string, unknown>) => r.status === filterStatus)
    : reviews;

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <StatCard label="Всего ревью" value={stats.total_reviews ?? 0} color="#3b82f6" />
          <StatCard label="Ожидают" value={stats.pending ?? 0} color="#f59e0b" />
          <StatCard label="Одобрено" value={stats.approved ?? 0} color="#22c55e" />
          <StatCard label="Отклонено" value={stats.rejected ?? 0} color="#ef4444" />
        </div>
      )}

      {/* Filter */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px' }}>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Статус:</span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '13px', color: '#334155', backgroundColor: '#fff',
          }}
        >
          <option value="">Все</option>
          <option value="pending">Ожидают</option>
          <option value="approved">Одобрено</option>
          <option value="rejected">Отклонено</option>
          <option value="needs_revision">Доработка</option>
        </select>
        <button onClick={load} style={btnOutline}>Обновить</button>
      </div>

      {/* Reviews Table */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          HITL Ревью AI-результатов
        </h3>
        {loading ? (
          <p style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            Ревью пока нет. Они создаются при генерации AI-рекомендаций и аналитики.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>Тип AI-вывода</th>
                  <th style={tableHeaderStyle}>Уверенность</th>
                  <th style={tableHeaderStyle}>Статус</th>
                  <th style={tableHeaderStyle}>Дата</th>
                  <th style={tableHeaderStyle}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: Record<string, unknown>) => (
                  <tr key={r.id}>
                    <td style={tableCellStyle}>{r.id}</td>
                    <td style={tableCellStyle}>{r.ai_output_type}</td>
                    <td style={tableCellStyle}>
                      {r.ai_confidence != null ? (
                        <span style={{
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: r.ai_confidence >= 0.7 ? '#dcfce7' : r.ai_confidence >= 0.4 ? '#fef3c7' : '#fee2e2',
                          color: r.ai_confidence >= 0.7 ? '#166534' : r.ai_confidence >= 0.4 ? '#92400e' : '#991b1b',
                          fontSize: '12px', fontWeight: 600,
                        }}>
                          {(r.ai_confidence * 100).toFixed(0)}%
                        </span>
                      ) : '—'}
                    </td>
                    <td style={tableCellStyle}><StatusBadge status={r.status} /></td>
                    <td style={tableCellStyle}>{new Date(r.created_at).toLocaleString('ru-RU')}</td>
                    <td style={tableCellStyle}>
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => handleAction(r.id, 'approved')}
                            style={{ ...btnOutline, color: '#16a34a', borderColor: '#bbf7d0' }}
                          >Одобрить</button>
                          <button
                            onClick={() => handleAction(r.id, 'rejected')}
                            style={{ ...btnOutline, color: '#dc2626', borderColor: '#fecaca' }}
                          >Отклонить</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Disclaimers */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          AI Disclaimers
        </h3>
        {disclaimers.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '12px' }}>
            Системные дисклеймеры загружены автоматически
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {disclaimers.map((d: Record<string, unknown>, i: number) => (
              <div key={i} style={{
                padding: '14px 18px', borderRadius: '10px', border: '1px solid #e2e8f0',
                backgroundColor: '#fefce8',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <SeverityBadge severity={d.severity} />
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{d.applies_to}</span>
                </div>
                <p style={{ fontSize: '13px', color: '#334155' }}>{d.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: SNAPSHOTS
   ═══════════════════════════════════════════════════════ */
function SnapshotsTab() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reproducing, setReproducing] = useState<number | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [sn, st] = await Promise.all([
        architecturalPrinciples.listSnapshots(undefined, 50),
        architecturalPrinciples.getSnapshotStats(),
      ]);
      setSnapshots(Array.isArray(sn) ? sn : []);
      setStats(st);
    } catch {}
    setLoading(false);
  }

  async function handleReproduce(id: number) {
    setReproducing(id);
    try {
      const result = await architecturalPrinciples.reproduceSnapshot(id);
      alert(result.is_match ? 'Результат воспроизведён — хеши совпадают.' : 'Хеши не совпадают — результат изменился!');
      load();
    } catch (e: unknown) {
      alert('Ошибка воспроизведения: ' + (e.message || ''));
    }
    setReproducing(null);
  }

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <StatCard label="Всего снапшотов" value={stats.total_snapshots ?? 0} color="#3b82f6" />
          <StatCard label="Воспроизводимых" value={stats.reproducible ?? 0} color="#22c55e" />
          <StatCard label="Типов анализа" value={stats.analysis_types ?? 0} color="#8b5cf6" />
          <StatCard label="Воспроизведений" value={stats.total_reproductions ?? 0} color="#0ea5e9" />
        </div>
      )}

      {/* Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            Снапшоты аналитики
          </h3>
          <button onClick={load} style={btnOutline}>Обновить</button>
        </div>

        {loading ? (
          <p style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>Загрузка...</p>
        ) : snapshots.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            Снапшотов пока нет. Они создаются автоматически при запуске аналитики (Monte Carlo, SHAP и др.).
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>Тип анализа</th>
                  <th style={tableHeaderStyle}>Версия движка</th>
                  <th style={tableHeaderStyle}>Хеш SHA-256</th>
                  <th style={tableHeaderStyle}>Воспр.</th>
                  <th style={tableHeaderStyle}>Дата</th>
                  <th style={tableHeaderStyle}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.map((s: Record<string, unknown>) => (
                  <tr key={s.id}>
                    <td style={tableCellStyle}>{s.id}</td>
                    <td style={tableCellStyle}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '6px',
                        backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '12px', fontWeight: 500,
                      }}>{s.analysis_type}</span>
                    </td>
                    <td style={tableCellStyle}>{s.engine_version || '—'}</td>
                    <td style={tableCellStyle}>
                      <code style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                        {s.result_hash ? s.result_hash.substring(0, 16) + '...' : '—'}
                      </code>
                    </td>
                    <td style={tableCellStyle}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '50%',
                        backgroundColor: s.is_reproducible ? '#dcfce7' : '#fee2e2',
                        color: s.is_reproducible ? '#166534' : '#991b1b',
                        fontSize: '11px', fontWeight: 700,
                      }}>
                        {s.reproduction_count}
                      </span>
                    </td>
                    <td style={tableCellStyle}>{new Date(s.created_at).toLocaleString('ru-RU')}</td>
                    <td style={tableCellStyle}>
                      <button
                        onClick={() => handleReproduce(s.id)}
                        disabled={reproducing === s.id}
                        style={{ ...btnOutline, opacity: reproducing === s.id ? 0.5 : 1 }}
                      >
                        {reproducing === s.id ? 'Проверка...' : 'Воспроизвести'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: EVENT BUS
   ═══════════════════════════════════════════════════════ */
function EventBusTab() {
  const [channels, setChannels] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [dlq, setDlq] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [ch, st, dl] = await Promise.all([
        architecturalPrinciples.getBusChannels(),
        architecturalPrinciples.getBusStats(),
        architecturalPrinciples.getDeadLetterQueue(20),
      ]);
      setChannels(Array.isArray(ch) ? ch : []);
      setStats(st);
      setDlq(Array.isArray(dl) ? dl : []);
    } catch {}
    setLoading(false);
  }

  async function loadChannel(channel: string) {
    setSelectedChannel(channel);
    try {
      const result = await architecturalPrinciples.getChannelMessages(channel, undefined, 30);
      setMessages(result?.messages || []);
    } catch {}
  }

  async function handleRetryDlq(id: number) {
    try {
      await architecturalPrinciples.retryDeadLetter(id);
      load();
    } catch {}
  }

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <StatCard label="Всего сообщений" value={stats.total_messages ?? 0} color="#3b82f6" />
          <StatCard label="Опубликовано" value={stats.published ?? 0} color="#6366f1" />
          <StatCard label="Обработано" value={stats.consumed ?? 0} color="#22c55e" />
          <StatCard label="Dead Letter" value={stats.dead_letter ?? 0} color="#ef4444" />
        </div>
      )}

      {/* Channels */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            Каналы сообщений
          </h3>
          <button onClick={load} style={btnOutline}>Обновить</button>
        </div>

        {loading ? (
          <p style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>Загрузка...</p>
        ) : channels.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            Каналов пока нет. Сообщения публикуются через API автоматически.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {channels.map((ch: Record<string, unknown>) => {
              const name = typeof ch === 'string' ? ch : ch.channel;
              return (
                <button
                  key={name}
                  onClick={() => loadChannel(name)}
                  style={{
                    ...btnOutline,
                    backgroundColor: selectedChannel === name ? '#3b82f6' : '#fff',
                    color: selectedChannel === name ? '#fff' : '#334155',
                    fontWeight: selectedChannel === name ? 600 : 400,
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Channel Messages */}
      {selectedChannel && (
        <div style={cardStyle}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
            Сообщения канала: {selectedChannel}
          </h3>
          {messages.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '12px' }}>Сообщений нет</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>ID</th>
                    <th style={tableHeaderStyle}>Тип</th>
                    <th style={tableHeaderStyle}>Продюсер</th>
                    <th style={tableHeaderStyle}>Статус</th>
                    <th style={tableHeaderStyle}>Попытки</th>
                    <th style={tableHeaderStyle}>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {messages.map((m: Record<string, unknown>) => (
                    <tr key={m.id}>
                      <td style={tableCellStyle}>{m.id}</td>
                      <td style={tableCellStyle}>{m.event_type}</td>
                      <td style={tableCellStyle}>{m.producer || '—'}</td>
                      <td style={tableCellStyle}><StatusBadge status={m.status} /></td>
                      <td style={tableCellStyle}>{m.retry_count}</td>
                      <td style={tableCellStyle}>{new Date(m.published_at).toLocaleString('ru-RU')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dead Letter Queue */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Dead Letter Queue
        </h3>
        {dlq.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center', padding: '12px' }}>DLQ пуста</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={tableHeaderStyle}>ID</th>
                  <th style={tableHeaderStyle}>Канал</th>
                  <th style={tableHeaderStyle}>Тип</th>
                  <th style={tableHeaderStyle}>Ошибка</th>
                  <th style={tableHeaderStyle}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {dlq.map((m: Record<string, unknown>) => (
                  <tr key={m.id}>
                    <td style={tableCellStyle}>{m.id}</td>
                    <td style={tableCellStyle}>{m.channel}</td>
                    <td style={tableCellStyle}>{m.event_type}</td>
                    <td style={tableCellStyle}>
                      <span style={{ fontSize: '12px', color: '#ef4444' }}>
                        {m.error_message || '—'}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      <button onClick={() => handleRetryDlq(m.id)} style={btnOutline}>
                        Повторить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TAB: CONSTRAINTS
   ═══════════════════════════════════════════════════════ */
function ConstraintsTab() {
  const [constraints, setConstraints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await architecturalPrinciples.listConstraints(undefined, true);
      setConstraints(Array.isArray(data) ? data : []);
    } catch {}
    setLoading(false);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const result = await architecturalPrinciples.seedConstraints();
      alert(`Загружено ограничений: ${result?.seeded ?? 0}`);
      load();
    } catch (e: unknown) {
      alert('Ошибка: ' + (e.message || ''));
    }
    setSeeding(false);
  }

  async function handleToggle(id: number, isActive: boolean) {
    try {
      await architecturalPrinciples.updateConstraint(id, { is_active: !isActive });
      load();
    } catch {}
  }

  async function handleDelete(id: number) {
    if (!confirm('Удалить ограничение?')) return;
    try {
      await architecturalPrinciples.deleteConstraint(id);
      load();
    } catch {}
  }

  const categories = [...new Set(constraints.map((c: Record<string, unknown>) => c.category))];
  const filtered = filterCat
    ? constraints.filter((c: Record<string, unknown>) => c.category === filterCat)
    : constraints;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', flexWrap: 'wrap' }}>
        <button onClick={handleSeed} disabled={seeding} style={{
          ...btnPrimary, opacity: seeding ? 0.6 : 1,
        }}>
          {seeding ? 'Загрузка...' : 'Загрузить стандартные (seed)'}
        </button>
        <span style={{ fontSize: '13px', color: '#64748b' }}>Категория:</span>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          style={{
            padding: '6px 12px', borderRadius: '8px', border: '1px solid #e2e8f0',
            fontSize: '13px', color: '#334155', backgroundColor: '#fff',
          }}
        >
          <option value="">Все</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button onClick={load} style={btnOutline}>Обновить</button>
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '16px' }}>
          Системные ограничения и дисклеймеры
        </h3>

        {loading ? (
          <p style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>Загрузка...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            Ограничений нет. Нажмите «Загрузить стандартные», чтобы создать 7 системных ограничений.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((c: Record<string, unknown>) => (
              <div key={c.id} style={{
                padding: '18px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
                backgroundColor: c.is_active ? '#fff' : '#f8fafc',
                opacity: c.is_active ? 1 : 0.65,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {c.title}
                      </span>
                      <SeverityBadge severity={c.severity} />
                      <span style={{
                        padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
                        backgroundColor: '#f1f5f9', color: '#475569',
                      }}>
                        {c.category}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                      {c.description}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                        Ключ: <code style={{ fontFamily: 'monospace' }}>{c.constraint_key}</code>
                      </span>
                      {c.display_in_ui && (
                        <span style={{ fontSize: '11px', color: '#3b82f6' }}>Отображается в UI</span>
                      )}
                      {c.display_in_reports && (
                        <span style={{ fontSize: '11px', color: '#6366f1' }}>Отображается в отчётах</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => handleToggle(c.id, c.is_active)}
                      style={{
                        ...btnOutline,
                        color: c.is_active ? '#f59e0b' : '#22c55e',
                        fontSize: '11px',
                      }}
                    >
                      {c.is_active ? 'Деактивировать' : 'Активировать'}
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{ ...btnOutline, color: '#ef4444', borderColor: '#fecaca', fontSize: '11px' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════ */
export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
          Архитектурные принципы
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b' }}>
          Event Sourcing, Human-in-the-Loop, воспроизводимость аналитики, шина событий и системные ограничения
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '4px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '8px', padding: '10px 16px', borderRadius: '10px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.key ? 600 : 400,
              backgroundColor: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#1e293b' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <TabIcon d={tab.icon} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'events' && <EventSourcingTab />}
      {activeTab === 'hitl' && <HitlTab />}
      {activeTab === 'snapshots' && <SnapshotsTab />}
      {activeTab === 'bus' && <EventBusTab />}
      {activeTab === 'constraints' && <ConstraintsTab />}
    </div>
  );
}
