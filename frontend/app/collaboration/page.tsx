'use client';
import { useState, useEffect, useCallback } from 'react';
import { collaboration, notifications, preferences, decisions as decisionsApi } from '../../lib/api';

/* ─── TYPES ────────────────────────────────────────────────────────────────── */
interface Comment {
  id: number;
  decision_id: number;
  parent_id: number | null;
  author_id: number;
  author_name: string | null;
  body: string;
  mentions: number[] | null;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  children: Comment[];
}
interface Task {
  id: number;
  decision_id: number;
  title: string;
  description: string | null;
  task_type: string;
  status: string;
  priority: string;
  assignee_id: number | null;
  assignee_name: string | null;
  creator_id: number;
  creator_name: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}
interface NotifItem {
  id: number;
  title: string;
  body: string | null;
  notification_type: string;
  entity_type: string | null;
  entity_id: number | null;
  is_read: boolean;
  created_at: string;
}
interface PrefsData {
  view_mode: string;
  theme: string;
  accent_color: string;
  font_size: string;
  email_notifications: boolean;
  in_app_notifications: boolean;
  language: string;
  pinned_nav_items: string[] | null;
}
interface Decision {
  id: number;
  title: string;
}

/* ─── CONSTANTS ────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'threads', label: 'Обсуждения' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'notifications', label: 'Уведомления' },
  { key: 'preferences', label: 'Персонализация' },
];
const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#3b82f6',
  low: '#94a3b8',
};
const STATUS_LABELS: Record<string, string> = {
  open: 'Открыта',
  in_progress: 'В работе',
  done: 'Завершена',
  cancelled: 'Отменена',
};
const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  done: '#22c55e',
  cancelled: '#94a3b8',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  critical: 'Критичный',
};
const TYPE_LABELS: Record<string, string> = {
  action_item: 'Action Item',
  dd_item: 'DD Item',
  follow_up: 'Follow-up',
};
const NOTIF_ICONS: Record<string, string> = {
  mention: '💬',
  task: '📋',
  info: 'ℹ️',
  system: '⚙️',
};
const VIEW_MODE_LABELS: Record<string, string> = {
  analyst: 'Аналитик',
  partner: 'Партнёр',
  manager: 'Портфельный менеджер',
};
const FONT_SIZE_LABELS: Record<string, string> = {
  small: 'Маленький',
  medium: 'Средний',
  large: 'Большой',
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── MAIN PAGE ────────────────────────────────────────────────────────────── */
export default function CollaborationPage() {
  const [tab, setTab] = useState('threads');
  const [decisionsList, setDecisionsList] = useState<Decision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<number | null>(null);
  const [threads, setThreads] = useState<Comment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notifs, setNotifs] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prefs, setPrefs] = useState<PrefsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // forms
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskType, setNewTaskType] = useState('action_item');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [taskFilter, setTaskFilter] = useState('');
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [myTasksList, setMyTasksList] = useState<Task[]>([]);

  // Load decisions list
  useEffect(() => {
    decisionsApi.list({ per_page: 100 }).then((r: any) => {
      setDecisionsList(r.items || r || []);
    }).catch(() => {});
  }, []);

  // Load threads & tasks when decision selected
  useEffect(() => {
    if (!selectedDecision) return;
    loadThreads();
    loadTasks();
  }, [selectedDecision]);

  // Load notifications
  useEffect(() => {
    if (tab === 'notifications') loadNotifs();
  }, [tab]);

  // Load preferences
  useEffect(() => {
    if (tab === 'preferences') loadPrefs();
  }, [tab]);

  const loadThreads = useCallback(async () => {
    if (!selectedDecision) return;
    setLoading(true);
    try {
      const data = await collaboration.listThreads(selectedDecision);
      setThreads(data);
    } catch { setError('Ошибка загрузки обсуждений'); }
    setLoading(false);
  }, [selectedDecision]);

  const loadTasks = useCallback(async () => {
    if (!selectedDecision) return;
    try {
      const params: any = {};
      if (taskFilter) params.status = taskFilter;
      const data = await collaboration.listTasks(selectedDecision, params);
      setTasks(data);
    } catch { setError('Ошибка загрузки задач'); }
  }, [selectedDecision, taskFilter]);

  useEffect(() => { if (selectedDecision) loadTasks(); }, [taskFilter]);

  const loadNotifs = async () => {
    try {
      const data = await notifications.list({ limit: 50 });
      setNotifs(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch {}
  };

  const loadPrefs = async () => {
    try {
      const data = await preferences.get();
      setPrefs(data);
    } catch {}
  };

  const loadMyTasks = async () => {
    try {
      const data = await collaboration.myTasks();
      setMyTasksList(data);
      setShowMyTasks(true);
    } catch {}
  };

  /* ─── HANDLERS ─────────────────────────────────────── */
  const handleCreateComment = async () => {
    if (!selectedDecision || !newComment.trim()) return;
    try {
      await collaboration.createComment(selectedDecision, {
        body: newComment,
        parent_id: replyTo || undefined,
      });
      setNewComment('');
      setReplyTo(null);
      loadThreads();
    } catch { setError('Ошибка создания комментария'); }
  };

  const handleResolve = async (commentId: number, resolved: boolean) => {
    if (!selectedDecision) return;
    try {
      await collaboration.updateComment(selectedDecision, commentId, { is_resolved: resolved });
      loadThreads();
    } catch {}
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!selectedDecision) return;
    try {
      await collaboration.deleteComment(selectedDecision, commentId);
      loadThreads();
    } catch {}
  };

  const handleCreateTask = async () => {
    if (!selectedDecision || !newTaskTitle.trim()) return;
    try {
      await collaboration.createTask(selectedDecision, {
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        task_type: newTaskType,
        priority: newTaskPriority,
      });
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskType('action_item');
      setNewTaskPriority('medium');
      loadTasks();
    } catch { setError('Ошибка создания задачи'); }
  };

  const handleTaskStatusChange = async (taskId: number, status: string) => {
    try {
      await collaboration.updateTask(taskId, { status });
      loadTasks();
    } catch {}
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await collaboration.deleteTask(taskId);
      loadTasks();
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notifications.markAllRead();
      loadNotifs();
    } catch {}
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notifications.markRead([id]);
      loadNotifs();
    } catch {}
  };

  const handleUpdatePref = async (key: string, value: any) => {
    try {
      const data = await preferences.update({ [key]: value });
      setPrefs(data);
    } catch { setError('Ошибка сохранения настроек'); }
  };

  /* ─── STYLES ───────────────────────────────────────── */
  const card: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    marginBottom: '16px',
  };
  const btnPrimary: React.CSSProperties = {
    padding: '8px 20px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  };
  const btnOutline: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: '7px',
    border: '1px solid #e2e8f0',
    background: '#fff',
    color: '#475569',
    fontSize: '12px',
    cursor: 'pointer',
  };
  const input: React.CSSProperties = {
    padding: '9px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
  };
  const badge = (color: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    color: '#fff',
    background: color,
  });
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 22px',
    borderRadius: '8px 8px 0 0',
    border: 'none',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
    background: active ? '#fff' : 'transparent',
    color: active ? '#3b82f6' : '#64748b',
    fontSize: '14px',
    fontWeight: active ? '600' : '400',
    cursor: 'pointer',
  });

  /* ─── RENDER COMMENT TREE ──────────────────────────── */
  const renderComment = (c: Comment, depth = 0) => (
    <div
      key={c.id}
      style={{
        marginLeft: depth * 28,
        padding: '14px 16px',
        borderLeft: depth > 0 ? '2px solid #e2e8f0' : 'none',
        marginBottom: '8px',
        background: c.is_resolved ? '#f0fdf4' : '#f8fafc',
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: '700' }}>
            {(c.author_name || 'U')[0]}
          </div>
          <span style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{c.author_name || 'Пользователь'}</span>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(c.created_at)}</span>
          {c.is_resolved && <span style={badge('#22c55e')}>Решено</span>}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={btnOutline} onClick={() => { setReplyTo(c.id); setNewComment(''); }}>Ответить</button>
          <button style={btnOutline} onClick={() => handleResolve(c.id, !c.is_resolved)}>
            {c.is_resolved ? 'Открыть' : 'Решить'}
          </button>
          <button style={{ ...btnOutline, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDeleteComment(c.id)}>Удалить</button>
        </div>
      </div>
      <p style={{ fontSize: '13px', color: '#334155', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{c.body}</p>
      {(c.children || []).map(ch => renderComment(ch, depth + 1))}
    </div>
  );

  return (
    <div>
      {/* HEADER */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>
          Совместная работа
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Обсуждения, задачи, уведомления и персонализация интерфейса
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div style={{ ...card, background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', marginBottom: '16px' }}>
          {error}
          <button style={{ marginLeft: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }} onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        {TABS.map(t => (
          <button key={t.key} style={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key === 'notifications' && unreadCount > 0 && (
              <span style={{ marginLeft: '6px', background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px' }}>{unreadCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* DECISION SELECTOR (for threads & tasks) */}
      {(tab === 'threads' || tab === 'tasks') && (
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569', whiteSpace: 'nowrap' }}>Решение:</label>
          <select
            value={selectedDecision || ''}
            onChange={e => setSelectedDecision(Number(e.target.value) || null)}
            style={{ ...input, maxWidth: '400px' }}
          >
            <option value="">— Выберите решение —</option>
            {decisionsList.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
          {tab === 'tasks' && (
            <button style={btnOutline} onClick={loadMyTasks}>Мои задачи</button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* THREADS TAB */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'threads' && selectedDecision && (
        <div>
          {/* New comment form */}
          <div style={card}>
            {replyTo && (
              <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6366f1' }}>
                Ответ на комментарий #{replyTo}
                <button style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={() => setReplyTo(null)}>✕</button>
              </div>
            )}
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Напишите комментарий... (используйте @[id] для упоминания)"
              rows={3}
              style={{ ...input, resize: 'vertical', marginBottom: '10px' }}
            />
            <button style={btnPrimary} onClick={handleCreateComment}>Отправить</button>
          </div>
          {loading ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '40px' }}>Загрузка...</p>
          ) : threads.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ fontSize: '14px' }}>Обсуждений пока нет</p>
              <p style={{ fontSize: '12px' }}>Начните обсуждение, написав первый комментарий</p>
            </div>
          ) : (
            threads.map(t => renderComment(t))
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* TASKS TAB */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'tasks' && (
        <div>
          {/* My Tasks Modal */}
          {showMyTasks && (
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1e293b', margin: 0 }}>Мои задачи</h3>
                <button style={btnOutline} onClick={() => setShowMyTasks(false)}>Закрыть</button>
              </div>
              {myTasksList.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px' }}>У вас нет назначенных задач</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {myTasksList.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f8fafc', borderRadius: '8px' }}>
                      <span style={badge(STATUS_COLORS[t.status] || '#94a3b8')}>{STATUS_LABELS[t.status] || t.status}</span>
                      <span style={badge(PRIORITY_COLORS[t.priority] || '#94a3b8')}>{PRIORITY_LABELS[t.priority] || t.priority}</span>
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b', flex: 1 }}>{t.title}</span>
                      {t.due_date && <span style={{ fontSize: '11px', color: '#94a3b8' }}>до {fmtDate(t.due_date)}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedDecision && (
            <>
              {/* Create task form */}
              <div style={card}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#475569', marginBottom: '12px' }}>Новая задача</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <input
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="Название задачи"
                    style={{ ...input, flex: '1 1 300px' }}
                  />
                  <select value={newTaskType} onChange={e => setNewTaskType(e.target.value)} style={{ ...input, maxWidth: '150px' }}>
                    <option value="action_item">Action Item</option>
                    <option value="dd_item">DD Item</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                  <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} style={{ ...input, maxWidth: '140px' }}>
                    <option value="low">Низкий</option>
                    <option value="medium">Средний</option>
                    <option value="high">Высокий</option>
                    <option value="critical">Критичный</option>
                  </select>
                </div>
                <textarea
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder="Описание (опционально)"
                  rows={2}
                  style={{ ...input, resize: 'vertical', marginBottom: '10px' }}
                />
                <button style={btnPrimary} onClick={handleCreateTask}>Создать задачу</button>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {['', 'open', 'in_progress', 'done', 'cancelled'].map(s => (
                  <button
                    key={s}
                    onClick={() => setTaskFilter(s)}
                    style={{
                      ...btnOutline,
                      background: taskFilter === s ? '#3b82f6' : '#fff',
                      color: taskFilter === s ? '#fff' : '#475569',
                      borderColor: taskFilter === s ? '#3b82f6' : '#e2e8f0',
                    }}
                  >
                    {s ? STATUS_LABELS[s] : 'Все'}
                  </button>
                ))}
              </div>

              {/* Task List */}
              {tasks.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>
                  <p style={{ fontSize: '14px' }}>Задач пока нет</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {tasks.map(t => (
                    <div key={t.id} style={{ ...card, padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={badge(PRIORITY_COLORS[t.priority])}>{PRIORITY_LABELS[t.priority]}</span>
                          <span style={{ fontSize: '11px', color: '#6366f1', background: '#eef2ff', padding: '2px 8px', borderRadius: '8px' }}>
                            {TYPE_LABELS[t.task_type] || t.task_type}
                          </span>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{t.title}</span>
                        </div>
                        {t.description && (
                          <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 6px', lineHeight: '1.5' }}>{t.description}</p>
                        )}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Создал: {t.creator_name || '—'}</span>
                          {t.assignee_name && <span>Назначен: {t.assignee_name}</span>}
                          {t.due_date && <span>Срок: {fmtDate(t.due_date)}</span>}
                          <span>{fmtDate(t.created_at)}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <select
                          value={t.status}
                          onChange={e => handleTaskStatusChange(t.id, e.target.value)}
                          style={{ ...input, fontSize: '12px', padding: '5px 8px', color: STATUS_COLORS[t.status] }}
                        >
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <button
                          style={{ ...btnOutline, color: '#ef4444', borderColor: '#fecaca', fontSize: '11px', padding: '4px 10px' }}
                          onClick={() => handleDeleteTask(t.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* NOTIFICATIONS TAB */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'notifications' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Непрочитанных: <strong>{unreadCount}</strong>
            </p>
            {unreadCount > 0 && (
              <button style={btnOutline} onClick={handleMarkAllRead}>Прочитать все</button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', color: '#94a3b8' }}>
              <p style={{ fontSize: '14px' }}>Уведомлений нет</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifs.map(n => (
                <div
                  key={n.id}
                  style={{
                    ...card,
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    background: n.is_read ? '#fff' : '#f0f9ff',
                    borderColor: n.is_read ? '#e2e8f0' : '#bae6fd',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{NOTIF_ICONS[n.notification_type] || 'ℹ️'}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', margin: '0 0 2px' }}>{n.title}</p>
                    {n.body && <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 4px' }}>{n.body}</p>}
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{fmtDate(n.created_at)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {!n.is_read && (
                      <button style={btnOutline} onClick={() => handleMarkRead(n.id)}>Прочитано</button>
                    )}
                    <button
                      style={{ ...btnOutline, color: '#ef4444', borderColor: '#fecaca' }}
                      onClick={async () => {
                        await notifications.delete(n.id);
                        loadNotifs();
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* PREFERENCES TAB */}
      {/* ══════════════════════════════════════════════════ */}
      {tab === 'preferences' && prefs && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* View Mode */}
          <div style={card}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '14px' }}>
              Роль-специфичный вид
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
              Выберите представление, которое соответствует вашей роли
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {Object.entries(VIEW_MODE_LABELS).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => handleUpdatePref('view_mode', k)}
                  style={{
                    ...btnOutline,
                    textAlign: 'left',
                    padding: '12px 16px',
                    background: prefs.view_mode === k ? '#eef2ff' : '#fff',
                    borderColor: prefs.view_mode === k ? '#6366f1' : '#e2e8f0',
                    color: prefs.view_mode === k ? '#4338ca' : '#475569',
                    fontWeight: prefs.view_mode === k ? '600' : '400',
                  }}
                >
                  <span style={{ fontSize: '13px' }}>{v}</span>
                  <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    {k === 'analyst' && 'Детальные данные, все метрики, полный набор фильтров'}
                    {k === 'partner' && 'Executive summary, высокоуровневые KPI'}
                    {k === 'manager' && 'Портфельная аналитика, оптимизация, управление рисками'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div style={card}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '14px' }}>
              Тема и оформление
            </h3>

            {/* Theme toggle */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>Тема</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['light', 'dark'].map(t => (
                  <button
                    key={t}
                    onClick={() => handleUpdatePref('theme', t)}
                    style={{
                      ...btnOutline,
                      flex: 1,
                      background: prefs.theme === t ? (t === 'light' ? '#fefce8' : '#1e293b') : '#fff',
                      color: prefs.theme === t ? (t === 'light' ? '#a16207' : '#e2e8f0') : '#475569',
                      borderColor: prefs.theme === t ? (t === 'light' ? '#fde047' : '#334155') : '#e2e8f0',
                      fontWeight: prefs.theme === t ? '600' : '400',
                    }}
                  >
                    {t === 'light' ? '☀️ Светлая' : '🌙 Тёмная'}
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>Акцентный цвет</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4'].map(c => (
                  <button
                    key={c}
                    onClick={() => handleUpdatePref('accent_color', c)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: c,
                      border: prefs.accent_color === c ? '3px solid #1e293b' : '2px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'transform 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Font size */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px', display: 'block' }}>Размер шрифта</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(FONT_SIZE_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => handleUpdatePref('font_size', k)}
                    style={{
                      ...btnOutline,
                      flex: 1,
                      background: prefs.font_size === k ? '#eef2ff' : '#fff',
                      borderColor: prefs.font_size === k ? '#6366f1' : '#e2e8f0',
                      color: prefs.font_size === k ? '#4338ca' : '#475569',
                      fontWeight: prefs.font_size === k ? '600' : '400',
                      fontSize: k === 'small' ? '11px' : k === 'large' ? '15px' : '13px',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications settings */}
          <div style={card}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '14px' }}>
              Настройки уведомлений
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'in_app_notifications', label: 'In-app уведомления' },
                { key: 'email_notifications', label: 'Email-уведомления' },
              ].map(item => (
                <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>{item.label}</span>
                  <button
                    onClick={() => handleUpdatePref(item.key, !(prefs as any)[item.key])}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      background: (prefs as any)[item.key] ? '#22c55e' : '#e2e8f0',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#fff',
                        position: 'absolute',
                        top: '3px',
                        left: (prefs as any)[item.key] ? '23px' : '3px',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={card}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '14px' }}>
              Текущие настройки
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                ['Режим', VIEW_MODE_LABELS[prefs.view_mode] || prefs.view_mode],
                ['Тема', prefs.theme === 'light' ? 'Светлая' : 'Тёмная'],
                ['Акцент', prefs.accent_color],
                ['Шрифт', FONT_SIZE_LABELS[prefs.font_size] || prefs.font_size],
                ['Язык', prefs.language === 'ru' ? 'Русский' : prefs.language],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{label}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {label === 'Акцент' && <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: value, display: 'inline-block' }} />}
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No decision selected message */}
      {(tab === 'threads' || tab === 'tasks') && !selectedDecision && (
        <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: '60px 20px' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p style={{ fontSize: '14px', margin: '0 0 4px' }}>Выберите решение</p>
          <p style={{ fontSize: '12px' }}>Для просмотра обсуждений и задач выберите решение из списка выше</p>
        </div>
      )}
    </div>
  );
}
