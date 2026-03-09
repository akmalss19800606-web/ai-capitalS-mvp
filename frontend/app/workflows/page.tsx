'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { workflows, decisions as decisionsApi } from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StepTemplate {
  order: number;
  name: string;
  step_type: string;
  role?: string;
  sla_hours?: number;
  description?: string;
}

interface WorkflowDefinition {
  id: number;
  name: string;
  description?: string;
  trigger_type: string;
  trigger_condition?: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  steps_template: StepTemplate[];
  created_by: number;
  created_at: string;
  updated_at?: string;
}

interface WorkflowStep {
  id: number;
  instance_id: number;
  step_order: number;
  name: string;
  step_type: string;
  status: string;
  assigned_role?: string;
  assigned_to?: number;
  completed_by?: number;
  sla_hours?: number;
  deadline_at?: string;
  comment?: string;
  completed_at?: string;
  created_at: string;
}

interface WorkflowInstance {
  id: number;
  definition_id: number;
  decision_id: number;
  status: string;
  current_step_order: number;
  started_by: number;
  started_at: string;
  completed_at?: string;
  metadata_json?: Record<string, any>;
  steps: WorkflowStep[];
  definition_name?: string;
  decision_name?: string;
}

interface MyTask {
  step_id: number;
  step_name: string;
  step_type: string;
  step_order: number;
  instance_id: number;
  definition_name?: string;
  decision_id: number;
  decision_name?: string;
  decision_symbol?: string;
  sla_hours?: number;
  deadline_at?: string;
  is_overdue: boolean;
  started_at?: string;
}

interface Decision {
  id: number;
  asset_name: string;
  asset_symbol: string;
  status: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  on_review: 'При проверке',
  on_amount_threshold: 'По порогу суммы',
  manual: 'Ручной запуск',
};

const INSTANCE_STATUS_LABELS: Record<string, string> = {
  active: 'Активен',
  completed: 'Завершён',
  rejected: 'Отклонён',
  cancelled: 'Отменён',
  expired: 'Просрочен',
};

const INSTANCE_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#eff6ff', text: '#3b82f6' },
  completed: { bg: '#f0fdf4', text: '#16a34a' },
  rejected: { bg: '#fff1f2', text: '#ef4444' },
  cancelled: { bg: '#f1f5f9', text: '#64748b' },
  expired: { bg: '#fffbeb', text: '#d97706' },
};

const STEP_STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  skipped: 'Пропущен',
  expired: 'Просрочен',
};

const STEP_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  approved: { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  rejected: { bg: '#fff1f2', text: '#ef4444', border: '#fecdd3' },
  skipped: { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' },
  expired: { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
};

const ROLE_LABELS: Record<string, string> = {
  analyst: 'Аналитик',
  ic_member: 'Член IC',
  partner: 'Партнёр',
  manager: 'Менеджер',
  director: 'Директор',
};

const STEP_TYPE_LABELS: Record<string, string> = {
  approval: 'Одобрение',
  notification: 'Уведомление',
  condition: 'Условие',
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const IconWorkflow = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="6" height="6" rx="1" />
    <rect x="16" y="6" width="6" height="6" rx="1" />
    <rect x="9" y="14" width="6" height="6" rx="1" />
    <path d="M8 9h8" />
    <path d="M12 9v5" />
  </svg>
);

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IconClock = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const IconBan = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

const IconEdit = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" />
    <line x1="3" y1="12" x2="3.01" y2="12" />
    <line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const IconKanban = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="5" height="18" rx="1" />
    <rect x="10" y="3" width="5" height="12" rx="1" />
    <rect x="17" y="3" width="5" height="8" rx="1" />
  </svg>
);

const IconTasks = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);


// ─── Main Component ──────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'definitions' | 'instances' | 'tasks'>('tasks');

  // Data
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [myTasks, setMyTasks] = useState<MyTask[]>([]);
  const [allDecisions, setAllDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals
  const [showCreateDef, setShowCreateDef] = useState(false);
  const [showLaunch, setShowLaunch] = useState(false);
  const [showInstanceDetail, setShowInstanceDetail] = useState<WorkflowInstance | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create definition form
  const [defForm, setDefForm] = useState({
    name: '',
    description: '',
    trigger_type: 'manual',
    is_default: false,
    min_amount: '',
    steps: [{ order: 1, name: '', step_type: 'approval', role: 'analyst', sla_hours: 24 }] as Array<{
      order: number; name: string; step_type: string; role: string; sla_hours: number;
    }>,
  });

  // Launch form
  const [launchForm, setLaunchForm] = useState({ definition_id: 0, decision_id: 0 });

  // Instance filter
  const [instanceFilter, setInstanceFilter] = useState('');

  // ─── Data Loading ────────────────────────────────────────────────────────

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [defsRes, instsRes, tasksRes, decisionsRes] = await Promise.all([
        workflows.listDefinitions(),
        workflows.listInstances(),
        workflows.myTasks(),
        decisionsApi.list({ per_page: 100 }),
      ]);
      setDefinitions(defsRes.items || []);
      setInstances(instsRes.items || []);
      setMyTasks(tasksRes.items || []);
      setAllDecisions((decisionsRes.items || []) as Decision[]);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleCreateDefinition = async () => {
    setError('');
    try {
      const trigger_condition = defForm.trigger_type === 'on_amount_threshold' && defForm.min_amount
        ? { min_amount: Number(defForm.min_amount) }
        : undefined;

      await workflows.createDefinition({
        name: defForm.name,
        description: defForm.description || undefined,
        trigger_type: defForm.trigger_type,
        trigger_condition,
        is_default: defForm.is_default,
        steps_template: defForm.steps.map((s, i) => ({
          order: i + 1,
          name: s.name,
          step_type: s.step_type,
          role: s.role || undefined,
          sla_hours: s.sla_hours || undefined,
        })),
      });
      setShowCreateDef(false);
      setDefForm({
        name: '', description: '', trigger_type: 'manual', is_default: false, min_amount: '',
        steps: [{ order: 1, name: '', step_type: 'approval', role: 'analyst', sla_hours: 24 }],
      });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания шаблона');
    }
  };

  const handleDeleteDefinition = async (id: number) => {
    if (!confirm('Удалить шаблон workflow?')) return;
    try {
      await workflows.deleteDefinition(id);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Ошибка удаления');
    }
  };

  const handleLaunchWorkflow = async () => {
    setError('');
    try {
      await workflows.launchInstance({
        definition_id: launchForm.definition_id,
        decision_id: launchForm.decision_id,
      });
      setShowLaunch(false);
      setLaunchForm({ definition_id: 0, decision_id: 0 });
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Ошибка запуска workflow');
    }
  };

  const handleStepAction = async (stepId: number, action: 'approve' | 'reject') => {
    setActionLoading(true);
    setError('');
    try {
      await workflows.stepAction(stepId, { action, comment: actionComment || undefined });
      setActionComment('');
      setShowInstanceDetail(null);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Ошибка выполнения действия');
    }
    setActionLoading(false);
  };

  const handleCancelInstance = async (id: number) => {
    if (!confirm('Отменить процесс согласования?')) return;
    try {
      await workflows.cancelInstance(id);
      setShowInstanceDetail(null);
      await loadAll();
    } catch (err: any) {
      setError(err.message || 'Ошибка отмены');
    }
  };

  const addStep = () => {
    setDefForm(prev => ({
      ...prev,
      steps: [...prev.steps, {
        order: prev.steps.length + 1,
        name: '',
        step_type: 'approval',
        role: 'analyst',
        sla_hours: 24,
      }],
    }));
  };

  const removeStep = (index: number) => {
    if (defForm.steps.length <= 1) return;
    setDefForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const updateStep = (index: number, field: string, value: any) => {
    setDefForm(prev => ({
      ...prev,
      steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s),
    }));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredInstances = instanceFilter
    ? instances.filter(i => i.status === instanceFilter)
    : instances;

  // ─── Styles ──────────────────────────────────────────────────────────────

  const pageStyle: React.CSSProperties = {
    padding: '32px',
    maxWidth: '1440px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginBottom: '24px',
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '4px',
  };

  const tabStyle = (isActive: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    background: isActive ? '#fff' : 'transparent',
    color: isActive ? '#0f172a' : '#64748b',
    fontWeight: isActive ? 600 : 400,
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.2s ease',
  });

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    marginBottom: '16px',
    transition: 'box-shadow 0.2s ease',
  };

  const btnPrimary: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
  };

  const btnSecondary: React.CSSProperties = {
    ...btnPrimary,
    background: '#f1f5f9',
    color: '#334155',
  };

  const btnDanger: React.CSSProperties = {
    ...btnPrimary,
    background: '#fee2e2',
    color: '#dc2626',
    fontWeight: 500,
  };

  const btnSuccess: React.CSSProperties = {
    ...btnPrimary,
    background: '#16a34a',
  };

  const btnReject: React.CSSProperties = {
    ...btnPrimary,
    background: '#ef4444',
  };

  const badgeStyle = (colors: { bg: string; text: string }): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    background: colors.bg,
    color: colors.text,
  });

  const modalOverlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '24px',
  };

  const modalContent: React.CSSProperties = {
    background: '#fff',
    borderRadius: '16px',
    maxWidth: '680px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '32px',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#0f172a',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'auto' as any,
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
  };

  const fieldGroup: React.CSSProperties = {
    marginBottom: '16px',
  };

  // ─── Render: Loading / Error ─────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '16px', fontWeight: 500 }}>Загрузка...</div>
        </div>
      </div>
    );
  }

  // ─── Render: Tab Content ─────────────────────────────────────────────────

  const renderTasks = () => {
    if (myTasks.length === 0) {
      return (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <IconTasks />
          <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500 }}>Нет задач на согласование</div>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>Запустите workflow для решения, чтобы начать</div>
        </div>
      );
    }

    return (
      <div>
        {myTasks.map(task => (
          <div key={task.step_id} style={{
            ...cardStyle,
            borderLeft: task.is_overdue ? '4px solid #ef4444' : '4px solid #3b82f6',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  {task.step_name}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
                  {task.definition_name} — шаг {task.step_order}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                    Решение: {task.decision_name} ({task.decision_symbol})
                  </span>
                  {task.is_overdue && (
                    <span style={badgeStyle({ bg: '#fff1f2', text: '#ef4444' })}>
                      <IconAlert /> Просрочено
                    </span>
                  )}
                  {task.deadline_at && !task.is_overdue && (
                    <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IconClock /> До: {formatDate(task.deadline_at)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  style={btnSuccess}
                  onClick={() => handleStepAction(task.step_id, 'approve')}
                  disabled={actionLoading}
                >
                  <IconCheck /> Одобрить
                </button>
                <button
                  style={btnReject}
                  onClick={() => handleStepAction(task.step_id, 'reject')}
                  disabled={actionLoading}
                >
                  <IconX /> Отклонить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDefinitions = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button style={btnPrimary} onClick={() => setShowCreateDef(true)}>
          <IconPlus /> Создать шаблон
        </button>
      </div>

      {definitions.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <IconWorkflow />
          <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500 }}>Нет шаблонов workflow</div>
          <div style={{ marginTop: '4px', fontSize: '13px' }}>Создайте первый шаблон цепочки согласования</div>
        </div>
      ) : (
        definitions.map(def => (
          <div key={def.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{def.name}</span>
                  {def.is_default && (
                    <span style={badgeStyle({ bg: '#eff6ff', text: '#3b82f6' })}>По умолчанию</span>
                  )}
                  <span style={badgeStyle(def.is_active ? { bg: '#f0fdf4', text: '#16a34a' } : { bg: '#f1f5f9', text: '#64748b' })}>
                    {def.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                {def.description && (
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{def.description}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
                  <span>Триггер: <strong style={{ color: '#334155' }}>{TRIGGER_LABELS[def.trigger_type] || def.trigger_type}</strong></span>
                  <span>Шагов: <strong style={{ color: '#334155' }}>{def.steps_template.length}</strong></span>
                  <span>Создан: {formatDate(def.created_at)}</span>
                </div>
                {/* Steps preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '12px', flexWrap: 'wrap' }}>
                  {def.steps_template.map((s: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        padding: '6px 12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px',
                        color: '#334155',
                        fontWeight: 500,
                      }}>
                        {s.name || `Шаг ${s.order}`}
                        {s.role && <span style={{ color: '#94a3b8', marginLeft: '4px' }}>({ROLE_LABELS[s.role] || s.role})</span>}
                      </div>
                      {i < def.steps_template.length - 1 && (
                        <IconArrowRight />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  style={btnDanger}
                  onClick={() => handleDeleteDefinition(def.id)}
                  title="Удалить"
                >
                  <IconTrash />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderInstances = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['', 'active', 'completed', 'rejected', 'cancelled'].map(s => (
            <button
              key={s}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: instanceFilter === s ? '#0f172a' : '#fff',
                color: instanceFilter === s ? '#fff' : '#64748b',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setInstanceFilter(s)}
            >
              {s ? (INSTANCE_STATUS_LABELS[s] || s) : 'Все'}
            </button>
          ))}
        </div>
        <button style={btnPrimary} onClick={() => setShowLaunch(true)}>
          <IconPlay /> Запустить
        </button>
      </div>

      {filteredInstances.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: '#94a3b8' }}>
          <IconKanban />
          <div style={{ marginTop: '12px', fontSize: '16px', fontWeight: 500 }}>Нет процессов согласования</div>
        </div>
      ) : (
        filteredInstances.map(inst => (
          <div
            key={inst.id}
            style={{ ...cardStyle, cursor: 'pointer' }}
            onClick={() => setShowInstanceDetail(inst)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                    {inst.definition_name || `Workflow #${inst.id}`}
                  </span>
                  <span style={badgeStyle(INSTANCE_STATUS_COLORS[inst.status] || { bg: '#f1f5f9', text: '#64748b' })}>
                    {INSTANCE_STATUS_LABELS[inst.status] || inst.status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: '#64748b' }}>
                  <span>Решение: <strong style={{ color: '#334155' }}>{inst.decision_name || `#${inst.decision_id}`}</strong></span>
                  <span>Шаг: {inst.current_step_order} / {inst.steps.length}</span>
                  <span>Запущен: {formatDate(inst.started_at)}</span>
                </div>
              </div>
            </div>

            {/* Kanban mini-view: step pills */}
            <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
              {inst.steps.map(step => {
                const colors = STEP_STATUS_COLORS[step.status] || STEP_STATUS_COLORS.pending;
                return (
                  <div
                    key={step.id}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.border}`,
                      background: colors.bg,
                      color: colors.text,
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {step.status === 'approved' && <IconCheck />}
                    {step.status === 'rejected' && <IconX />}
                    {step.status === 'pending' && <IconClock />}
                    {step.name}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <IconWorkflow />
          Согласование (Workflow)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnSecondary} onClick={() => router.push('/decisions')}>
            Решения
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: '10px',
          color: '#dc2626',
          fontSize: '14px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <IconAlert />
          {error}
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
            onClick={() => setError('')}
          >
            <IconX />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={tabBarStyle}>
        <button style={tabStyle(activeTab === 'tasks')} onClick={() => setActiveTab('tasks')}>
          <IconTasks />
          Мои задачи
          {myTasks.length > 0 && (
            <span style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 8px',
              fontSize: '11px',
              fontWeight: 700,
              minWidth: '20px',
              textAlign: 'center',
            }}>
              {myTasks.length}
            </span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'instances')} onClick={() => setActiveTab('instances')}>
          <IconKanban />
          Процессы
          {instances.filter(i => i.status === 'active').length > 0 && (
            <span style={{
              background: '#3b82f6',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 8px',
              fontSize: '11px',
              fontWeight: 700,
            }}>
              {instances.filter(i => i.status === 'active').length}
            </span>
          )}
        </button>
        <button style={tabStyle(activeTab === 'definitions')} onClick={() => setActiveTab('definitions')}>
          <IconList />
          Шаблоны
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tasks' && renderTasks()}
      {activeTab === 'instances' && renderInstances()}
      {activeTab === 'definitions' && renderDefinitions()}

      {/* ─── Modal: Create Definition ───────────────────────────────────────── */}
      {showCreateDef && (
        <div style={modalOverlay} onClick={() => setShowCreateDef(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Новый шаблон Workflow
              </h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                onClick={() => setShowCreateDef(false)}
              >
                <IconX />
              </button>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Название</label>
              <input
                style={inputStyle}
                value={defForm.name}
                onChange={e => setDefForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Стандартное согласование"
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Описание</label>
              <input
                style={inputStyle}
                value={defForm.description}
                onChange={e => setDefForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Описание цепочки согласования"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Триггер</label>
                <select
                  style={selectStyle}
                  value={defForm.trigger_type}
                  onChange={e => setDefForm(p => ({ ...p, trigger_type: e.target.value }))}
                >
                  <option value="manual">Ручной запуск</option>
                  <option value="on_review">При проверке решения</option>
                  <option value="on_amount_threshold">По порогу суммы</option>
                </select>
              </div>
              {defForm.trigger_type === 'on_amount_threshold' && (
                <div>
                  <label style={labelStyle}>Минимальная сумма ($)</label>
                  <input
                    style={inputStyle}
                    type="number"
                    value={defForm.min_amount}
                    onChange={e => setDefForm(p => ({ ...p, min_amount: e.target.value }))}
                    placeholder="100000"
                  />
                </div>
              )}
            </div>

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <input
                type="checkbox"
                checked={defForm.is_default}
                onChange={e => setDefForm(p => ({ ...p, is_default: e.target.checked }))}
                style={{ accentColor: '#3b82f6' }}
              />
              Шаблон по умолчанию
            </label>

            {/* Steps */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Шаги согласования</label>
                <button style={{ ...btnSecondary, padding: '6px 14px', fontSize: '13px' }} onClick={addStep}>
                  <IconPlus /> Добавить шаг
                </button>
              </div>

              {defForm.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 120px 120px 80px 32px',
                    gap: '8px',
                    marginBottom: '8px',
                    alignItems: 'center',
                  }}
                >
                  <input
                    style={inputStyle}
                    value={step.name}
                    onChange={e => updateStep(i, 'name', e.target.value)}
                    placeholder={`Шаг ${i + 1}: название`}
                  />
                  <select
                    style={selectStyle}
                    value={step.step_type}
                    onChange={e => updateStep(i, 'step_type', e.target.value)}
                  >
                    <option value="approval">Одобрение</option>
                    <option value="notification">Уведомление</option>
                    <option value="condition">Условие</option>
                  </select>
                  <select
                    style={selectStyle}
                    value={step.role}
                    onChange={e => updateStep(i, 'role', e.target.value)}
                  >
                    <option value="analyst">Аналитик</option>
                    <option value="ic_member">Член IC</option>
                    <option value="partner">Партнёр</option>
                    <option value="manager">Менеджер</option>
                    <option value="director">Директор</option>
                  </select>
                  <input
                    style={inputStyle}
                    type="number"
                    value={step.sla_hours}
                    onChange={e => updateStep(i, 'sla_hours', Number(e.target.value))}
                    placeholder="SLA ч."
                    title="SLA (часы)"
                  />
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: defForm.steps.length > 1 ? 'pointer' : 'not-allowed',
                      color: defForm.steps.length > 1 ? '#ef4444' : '#cbd5e1',
                      padding: '4px',
                    }}
                    onClick={() => removeStep(i)}
                    disabled={defForm.steps.length <= 1}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={btnSecondary} onClick={() => setShowCreateDef(false)}>Отмена</button>
              <button
                style={{ ...btnPrimary, opacity: defForm.name && defForm.steps.every(s => s.name) ? 1 : 0.5 }}
                onClick={handleCreateDefinition}
                disabled={!defForm.name || !defForm.steps.every(s => s.name)}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Launch Workflow ─────────────────────────────────────────── */}
      {showLaunch && (
        <div style={modalOverlay} onClick={() => setShowLaunch(false)}>
          <div style={{ ...modalContent, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Запустить Workflow
              </h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                onClick={() => setShowLaunch(false)}
              >
                <IconX />
              </button>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Шаблон workflow</label>
              <select
                style={selectStyle}
                value={launchForm.definition_id}
                onChange={e => setLaunchForm(p => ({ ...p, definition_id: Number(e.target.value) }))}
              >
                <option value={0}>Выберите шаблон...</option>
                {definitions.filter(d => d.is_active).map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.steps_template.length} шагов)</option>
                ))}
              </select>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Инвестиционное решение</label>
              <select
                style={selectStyle}
                value={launchForm.decision_id}
                onChange={e => setLaunchForm(p => ({ ...p, decision_id: Number(e.target.value) }))}
              >
                <option value={0}>Выберите решение...</option>
                {allDecisions.map(d => (
                  <option key={d.id} value={d.id}>{d.asset_name} ({d.asset_symbol})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button style={btnSecondary} onClick={() => setShowLaunch(false)}>Отмена</button>
              <button
                style={{ ...btnPrimary, opacity: launchForm.definition_id && launchForm.decision_id ? 1 : 0.5 }}
                onClick={handleLaunchWorkflow}
                disabled={!launchForm.definition_id || !launchForm.decision_id}
              >
                <IconPlay /> Запустить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal: Instance Detail (Kanban board) ────────────────────────── */}
      {showInstanceDetail && (
        <div style={modalOverlay} onClick={() => setShowInstanceDetail(null)}>
          <div style={{ ...modalContent, maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                {showInstanceDetail.definition_name || `Workflow #${showInstanceDetail.id}`}
              </h2>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
                onClick={() => setShowInstanceDetail(null)}
              >
                <IconX />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', fontSize: '13px', color: '#64748b' }}>
              <span style={badgeStyle(INSTANCE_STATUS_COLORS[showInstanceDetail.status] || { bg: '#f1f5f9', text: '#64748b' })}>
                {INSTANCE_STATUS_LABELS[showInstanceDetail.status] || showInstanceDetail.status}
              </span>
              <span>Решение: <strong style={{ color: '#334155' }}>{showInstanceDetail.decision_name || `#${showInstanceDetail.decision_id}`}</strong></span>
              <span>Запущен: {formatDate(showInstanceDetail.started_at)}</span>
              {showInstanceDetail.completed_at && (
                <span>Завершён: {formatDate(showInstanceDetail.completed_at)}</span>
              )}
            </div>

            {/* Kanban Board */}
            <div style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              paddingBottom: '12px',
              marginBottom: '20px',
            }}>
              {showInstanceDetail.steps.map((step, idx) => {
                const colors = STEP_STATUS_COLORS[step.status] || STEP_STATUS_COLORS.pending;
                const isCurrentStep = step.step_order === showInstanceDetail!.current_step_order
                  && showInstanceDetail!.status === 'active'
                  && step.status === 'pending';

                return (
                  <div
                    key={step.id}
                    style={{
                      flex: '0 0 200px',
                      border: `2px solid ${isCurrentStep ? '#3b82f6' : colors.border}`,
                      borderRadius: '12px',
                      background: colors.bg,
                      padding: '16px',
                      position: 'relative',
                    }}
                  >
                    {isCurrentStep && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#3b82f6',
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 10px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}>
                        Текущий
                      </div>
                    )}

                    <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', marginBottom: '6px' }}>
                      Шаг {step.step_order}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
                      {step.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
                      {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                    </div>
                    {step.assigned_role && (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Роль: {ROLE_LABELS[step.assigned_role] || step.assigned_role}
                      </div>
                    )}
                    {step.sla_hours && (
                      <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                        <IconClock /> SLA: {step.sla_hours}ч
                      </div>
                    )}

                    <div style={{
                      marginTop: '10px',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.6)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: colors.text,
                      textAlign: 'center',
                    }}>
                      {STEP_STATUS_LABELS[step.status] || step.status}
                    </div>

                    {step.comment && (
                      <div style={{ marginTop: '8px', fontSize: '12px', color: '#475569', fontStyle: 'italic', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '8px' }}>
                        &laquo;{step.comment}&raquo;
                      </div>
                    )}

                    {step.completed_at && (
                      <div style={{ marginTop: '4px', fontSize: '11px', color: '#94a3b8' }}>
                        {formatDate(step.completed_at)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Action area for current step */}
            {showInstanceDetail.status === 'active' && (
              <div style={{
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '10px' }}>
                  Действие по текущему шагу
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Комментарий (необязательно)</label>
                  <input
                    style={inputStyle}
                    value={actionComment}
                    onChange={e => setActionComment(e.target.value)}
                    placeholder="Комментарий к одобрению или отклонению"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(() => {
                    const currentStep = showInstanceDetail.steps.find(
                      s => s.step_order === showInstanceDetail!.current_step_order && s.status === 'pending'
                    );
                    if (!currentStep) return <span style={{ color: '#94a3b8', fontSize: '13px' }}>Нет ожидающих шагов</span>;
                    return (
                      <>
                        <button
                          style={btnSuccess}
                          onClick={() => handleStepAction(currentStep.id, 'approve')}
                          disabled={actionLoading}
                        >
                          <IconCheck /> Одобрить «{currentStep.name}»
                        </button>
                        <button
                          style={btnReject}
                          onClick={() => handleStepAction(currentStep.id, 'reject')}
                          disabled={actionLoading}
                        >
                          <IconX /> Отклонить
                        </button>
                        <button
                          style={{ ...btnSecondary, marginLeft: 'auto' }}
                          onClick={() => handleCancelInstance(showInstanceDetail!.id)}
                        >
                          <IconBan /> Отменить процесс
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
