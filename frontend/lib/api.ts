const API_URL = '/api/v1';

function setCookie(n: string, v: string, days: number = 7) {
  document.cookie = n + '=' + encodeURIComponent(v) + '; path=/; expires=' + new Date(Date.now() + days * 864e5).toUTCString() + '; SameSite=Lax';
}
function removeCookie(n: string) {
  document.cookie = n + '=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          localStorage.setItem('token', data.access_token);
          setCookie('access_token', data.access_token);
          if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
          headers['Authorization'] = `Bearer ${data.access_token}`;
          const retryRes = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
          if (!retryRes.ok) throw new Error(await retryRes.text());
          if (retryRes.status === 204) return null;
          return retryRes.json();
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        removeCookie('access_token');
        window.location.href = '/login';
      }
    }
  }

  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

export const auth = {
  register: (data: { email: string; password: string; full_name?: string }) =>
    apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    setCookie('access_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  },
  mfaVerify: (mfaTempToken: string, code: string) =>
    apiRequest('/auth/mfa-verify', {
      method: 'POST',
      body: JSON.stringify({ mfa_temp_token: mfaTempToken, code }),
    }),
  me: () => apiRequest('/auth/me'),
  ssoProviders: () => apiRequest('/auth/sso/providers'),
  createSsoProvider: (data: unknown) =>
    apiRequest('/auth/sso/providers', { method: 'POST', body: JSON.stringify(data) }),
  deleteSsoProvider: (id: number) =>
    apiRequest(`/auth/sso/providers/${id}`, { method: 'DELETE' }),
};

export const portfolios = {
  list: () => apiRequest('/portfolios'),
  get: (id: number) => apiRequest(`/portfolios/${id}`),
  create: (data: { name: string; description?: string; total_value?: number }) =>
    apiRequest('/portfolios', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; description?: string; total_value?: number }) =>
    apiRequest(`/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/portfolios/${id}`, { method: 'DELETE' }),
};

export const decisions = {
  list: (params?: {
    status?: string;
    decision_type?: string;
    priority?: string;
    category?: string;
    portfolio_id?: number;
    search?: string;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    per_page?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/decisions${query ? '?' + query : ''}`);
  },
  get: (id: number) => apiRequest(`/decisions/${id}`),
  create: (data: unknown) => apiRequest('/decisions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) => apiRequest(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    apiRequest(`/decisions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: number) => apiRequest(`/decisions/${id}`, { method: 'DELETE' }),
  stats: () => apiRequest('/decisions/stats'),

  // Фаза 1, Сессия 2: Версионирование и аудит
  history: (id: number, page?: number) =>
    apiRequest(`/decisions/${id}/history${page ? '?page=' + page : ''}`),
  diff: (id: number, versionA: number, versionB: number) =>
    apiRequest(`/decisions/${id}/diff/${versionA}/${versionB}`),
  rollback: (id: number, versionNumber: number, reason?: string) =>
    apiRequest(`/decisions/${id}/rollback/${versionNumber}`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || null }),
    }),
  audit: (id: number, page?: number) =>
    apiRequest(`/decisions/${id}/audit${page ? '?page=' + page : ''}`),

  // Фаза 1, Сессия 2: Граф связей
  relationships: (id: number) =>
    apiRequest(`/decisions/${id}/relationships`),
  addRelationship: (id: number, data: { to_decision_id: number; relationship_type: string; description?: string }) =>
    apiRequest(`/decisions/${id}/relationships`, { method: 'POST', body: JSON.stringify(data) }),
  removeRelationship: (id: number, relId: number) =>
    apiRequest(`/decisions/${id}/relationships/${relId}`, { method: 'DELETE' }),
  graph: (id: number, depth?: number) =>
    apiRequest(`/decisions/${id}/graph${depth ? '?depth=' + depth : ''}`),
  impact: (id: number) =>
    apiRequest(`/decisions/${id}/impact`),
};

export const auditGlobal = {
  events: (params?: { entity_type?: string; action?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/audit/events${query ? '?' + query : ''}`);
  },
};

export const dashboard = {
  summary: () => apiRequest('/dashboard/summary'),
};

export const market = {
  getPrice: (symbol: string) => apiRequest(`/ai/market/${symbol}`),
  getOverview: (symbols: string[]) =>
    apiRequest('/ai/market/overview', { method: 'POST', body: JSON.stringify({ symbols }) }),
};

export const ai = {
  recommend: (data: {
    asset_name: string;
    asset_symbol: string;
    current_price: number;
    portfolio_id: number;
  }) => apiRequest('/ai/recommend', { method: 'POST', body: JSON.stringify(data) }),
};

// Фаза 1, Сессия 3: Workflow Engine
export const workflows = {
  listDefinitions: (isActive?: boolean) => {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    return apiRequest(`/workflows/definitions${params}`);
  },
  getDefinition: (id: number) => apiRequest(`/workflows/definitions/${id}`),
  createDefinition: (data: unknown) =>
    apiRequest('/workflows/definitions', { method: 'POST', body: JSON.stringify(data) }),
  updateDefinition: (id: number, data: unknown) =>
    apiRequest(`/workflows/definitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDefinition: (id: number) =>
    apiRequest(`/workflows/definitions/${id}`, { method: 'DELETE' }),
  listInstances: (params?: { status?: string; decision_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/workflows/instances${query ? '?' + query : ''}`);
  },
  launchInstance: (data: { definition_id: number; decision_id: number }) =>
    apiRequest('/workflows/instances', { method: 'POST', body: JSON.stringify(data) }),
  getInstance: (id: number) => apiRequest(`/workflows/instances/${id}`),
  cancelInstance: (id: number) =>
    apiRequest(`/workflows/instances/${id}/cancel`, { method: 'POST' }),
  stepAction: (stepId: number, data: { action: string; comment?: string }) =>
    apiRequest(`/workflows/steps/${stepId}/action`, { method: 'POST', body: JSON.stringify(data) }),
  myTasks: () => apiRequest('/workflows/my-tasks'),
};

// ─── Фаза 1, Сессия 4: OLAP / ETL / Analytics ──────────────────────────────

export const etl = {
  run: () => apiRequest('/etl/run', { method: 'POST' }),
  status: () => apiRequest('/etl/status'),
  refreshViews: () => apiRequest('/etl/refresh-views', { method: 'POST' }),
};

export const olap = {
  overview: () => apiRequest('/analytics/olap/overview'),
  timeSeries: (granularity?: string) =>
    apiRequest(`/analytics/olap/time-series${granularity ? '?granularity=' + granularity : ''}`),
  breakdown: (dimension: string) =>
    apiRequest(`/analytics/olap/breakdown?dimension=${dimension}`),
  portfolioTrend: () => apiRequest('/analytics/olap/portfolio-trend'),
  events: () => apiRequest('/analytics/olap/events'),
};

// ─── Фаза 2, Сессия 1: AI-аналитика (Monte Carlo, SHAP, Efficient Frontier) ─

export const aiAnalytics = {
  // Monte Carlo
  runMonteCarlo: (data: {
    decision_id: number;
    initial_investment: number;
    time_horizon_months?: number;
    num_iterations?: number;
  }) => apiRequest('/analytics/monte-carlo', { method: 'POST', body: JSON.stringify(data) }),
  getMonteCarlo: (id: number) => apiRequest(`/analytics/monte-carlo/${id}`),
  listMonteCarlo: (decisionId?: number) =>
    apiRequest(`/analytics/monte-carlo${decisionId ? '?decision_id=' + decisionId : ''}`),

  // SHAP
  runShap: (data: {
    decision_id?: number;
    portfolio_id?: number;
    analysis_type?: string;
  }) => apiRequest('/analytics/shap', { method: 'POST', body: JSON.stringify(data) }),
  getShap: (id: number) => apiRequest(`/analytics/shap/${id}`),
  listShap: (params?: { decision_id?: number; portfolio_id?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiRequest(`/analytics/shap${query ? '?' + query : ''}`);
  },

  // Efficient Frontier
  runFrontier: (data: {
    portfolio_id: number;
    risk_free_rate?: number;
    optimization_target?: string;
    num_frontier_points?: number;
  }) => apiRequest('/analytics/frontier', { method: 'POST', body: JSON.stringify(data) }),
  getFrontier: (id: number) => apiRequest(`/analytics/frontier/${id}`),
  listFrontier: (portfolioId?: number) =>
    apiRequest(`/analytics/frontier${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),

  // Stress Testing (Phase 2, Session 2)
  getStressScenarios: () => apiRequest('/analytics/stress-scenarios'),
  runStressTest: (data: {
    portfolio_id: number;
    scenario: string;
    severity?: number;
    custom_shocks?: Array<{ factor: string; shock_pct: number; description?: string }>;
  }) => apiRequest('/analytics/stress-test', { method: 'POST', body: JSON.stringify(data) }),
  getStressTest: (id: number) => apiRequest(`/analytics/stress-test/${id}`),
  listStressTests: (portfolioId?: number) =>
    apiRequest(`/analytics/stress-test${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),

  // Retrospective Analysis (Phase 2, Session 2)
  runRetrospective: (data: {
    analysis_type: string;
    decision_id?: number;
    portfolio_id?: number;
    forecast_return: number;
    actual_return: number;
  }) => apiRequest('/analytics/retrospective', { method: 'POST', body: JSON.stringify(data) }),
  getRetrospective: (id: number) => apiRequest(`/analytics/retrospective/${id}`),
  listRetrospectives: (params?: { decision_id?: number; portfolio_id?: number }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/analytics/retrospective${q ? '?' + q : ''}`);
  },
};

// ─── Фаза 2, Сессия 3: Due Diligence Scoring ───────────────────────────────

export const ddScoring = {
  run: (data: {
    decision_id?: number;
    company_name: string;
    industry?: string;
    geography?: string;
    revenue_mln?: number;
    profit_margin_pct?: number;
    debt_to_equity?: number;
    years_in_business?: number;
    employee_count?: number;
  }) => apiRequest('/dd/scoring', { method: 'POST', body: JSON.stringify(data) }),

  get: (id: number) => apiRequest(`/dd/scoring/${id}`),

  list: (decisionId?: number) =>
    apiRequest(`/dd/scoring${decisionId ? '?decision_id=' + decisionId : ''}`),

  updateChecklist: (id: number, data: { item_id: string; status: string; note?: string }) =>
    apiRequest(`/dd/scoring/${id}/checklist`, { method: 'PATCH', body: JSON.stringify(data) }),

  benchmarkTemplates: () => apiRequest('/dd/benchmarks/templates'),
};

// ─── Фаза 2, Сессия 4: Отчёты и генератор ──────────────────────────────────

export const reports = {
  listTemplates: () => apiRequest('/reports/templates'),

  generate: (data: {
    template_key: string;
    title?: string;
    portfolio_id?: number;
    decision_id?: number;
    selected_sections?: string[];
    selected_metrics?: string[];
    period_label?: string;
  }) => apiRequest('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),

  listHistory: (params?: { template_key?: string; portfolio_id?: number }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/reports/history${q ? '?' + q : ''}`);
  },

  get: (id: number) => apiRequest(`/reports/history/${id}`),

  delete: (id: number) => apiRequest(`/reports/history/${id}`, { method: 'DELETE' }),

  portfolioSummary: (portfolioId: number) =>
    apiRequest(`/reports/portfolio-summary?portfolio_id=${portfolioId}`, { method: 'POST' }),

  decisionMemo: (decisionId: number) =>
    apiRequest(`/reports/decision-memo?decision_id=${decisionId}`, { method: 'POST' }),
};

// ─── Фаза 3, Сессия 1: Расширенные визуализации (VIS-CHART-001) ────────────

export const charts = {
  waterfall: (portfolioId?: number) =>
    apiRequest(`/charts/waterfall${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),

  tornado: (portfolioId?: number) =>
    apiRequest(`/charts/tornado${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),

  bubble: (portfolioId?: number) =>
    apiRequest(`/charts/bubble${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),

  heatmap: (portfolioId?: number) =>
    apiRequest(`/charts/heatmap${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),
};

// ─── Фаза 3, Сессия 2: Конструктор дашбордов (VIS-DASH-001) ────────────────

export const dashboardBuilder = {
  // Каталог типов виджетов
  widgetTypes: () => apiRequest('/dashboards/widget-types'),

  // CRUD дашбордов
  list: () => apiRequest('/dashboards'),
  get: (id: number) => apiRequest(`/dashboards/${id}`),
  create: (data: unknown) =>
    apiRequest('/dashboards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) =>
    apiRequest(`/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiRequest(`/dashboards/${id}`, { method: 'DELETE' }),

  // Виджеты
  addWidget: (dashboardId: number, data: unknown) =>
    apiRequest(`/dashboards/${dashboardId}/widgets`, { method: 'POST', body: JSON.stringify(data) }),
  updateWidget: (widgetId: number, data: unknown) =>
    apiRequest(`/dashboards/widgets/${widgetId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWidget: (widgetId: number) =>
    apiRequest(`/dashboards/widgets/${widgetId}`, { method: 'DELETE' }),

  // Layout (drag-and-drop)
  updateLayout: (dashboardId: number, layout: unknown[]) =>
    apiRequest(`/dashboards/${dashboardId}/layout`, { method: 'PUT', body: JSON.stringify(layout) }),

  // Данные для виджетов (VIS-DASH-001.1 кросс-фильтрация, 001.2 drill-down)
  widgetData: (widgetType: string, params?: {
    metric?: string;
    portfolio_id?: number;
    drill_into?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/dashboards/widget-data/${widgetType}${q ? '?' + q : ''}`);
  },
};

// ─── Фаза 3, Сессия 3: MFA (COLLAB-AUTH-001.1) ─────────────────────────────

export const mfa = {
  status: () => apiRequest('/auth/mfa/status'),
  setup: () =>
    apiRequest('/auth/mfa/setup', { method: 'POST' }),
  confirm: (code: string) =>
    apiRequest('/auth/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  disable: (code: string) =>
    apiRequest('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
};

// ─── Фаза 3, Сессия 3: Управление сессиями (COLLAB-AUTH-001.4) ─────────────

export const sessions = {
  list: () => apiRequest('/auth/sessions'),
  forceLogout: (sessionId: number) =>
    apiRequest(`/auth/sessions/${sessionId}/logout`, { method: 'POST' }),
  logoutAll: () =>
    apiRequest('/auth/sessions/logout-all', { method: 'POST' }),
};

// ─── Фаза 3, Сессия 4: Совместная работа (COLLAB-TEAM-001) ─────────────────

export const collaboration = {
  // Threaded discussions (001.1, 001.2)
  listThreads: (decisionId: number) =>
    apiRequest(`/decisions/${decisionId}/threads`),
  createComment: (decisionId: number, data: {
    body: string;
    parent_id?: number;
    mentions?: number[];
  }) => apiRequest(`/decisions/${decisionId}/threads`, { method: 'POST', body: JSON.stringify(data) }),
  updateComment: (decisionId: number, commentId: number, data: {
    body?: string;
    is_resolved?: boolean;
  }) => apiRequest(`/decisions/${decisionId}/threads/${commentId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComment: (decisionId: number, commentId: number) =>
    apiRequest(`/decisions/${decisionId}/threads/${commentId}`, { method: 'DELETE' }),

  // Task management (001.3)
  listTasks: (decisionId: number, params?: {
    status?: string;
    assignee_id?: number;
    task_type?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/decisions/${decisionId}/tasks${q ? '?' + q : ''}`);
  },
  createTask: (decisionId: number, data: {
    title: string;
    description?: string;
    task_type?: string;
    priority?: string;
    assignee_id?: number;
    due_date?: string;
  }) => apiRequest(`/decisions/${decisionId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (taskId: number, data: {
    title?: string;
    description?: string;
    status?: string;
    priority?: string;
    assignee_id?: number;
    due_date?: string;
  }) => apiRequest(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (taskId: number) =>
    apiRequest(`/tasks/${taskId}`, { method: 'DELETE' }),
  myTasks: (status?: string) =>
    apiRequest(`/tasks/my${status ? '?status=' + status : ''}`),
};

// ─── Фаза 3, Сессия 4: Уведомления (COLLAB-TEAM-001.5) ─────────────────────

export const notifications = {
  list: (params?: { unread_only?: boolean; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/notifications${q ? '?' + q : ''}`);
  },
  markRead: (notificationIds: number[]) =>
    apiRequest('/notifications/read', { method: 'POST', body: JSON.stringify({ notification_ids: notificationIds }) }),
  markAllRead: () =>
    apiRequest('/notifications/read-all', { method: 'POST' }),
  delete: (id: number) =>
    apiRequest(`/notifications/${id}`, { method: 'DELETE' }),
};

// ─── Фаза 3, Сессия 4: Персонализация (VIS-PERS-001) ───────────────────────

export const preferences = {
  get: () => apiRequest('/preferences'),
  update: (data: {
    view_mode?: string;
    theme?: string;
    accent_color?: string;
    font_size?: string;
    pinned_nav_items?: string[];
    default_dashboard_id?: number;
    email_notifications?: boolean;
    in_app_notifications?: boolean;
    language?: string;
  }) => apiRequest('/preferences', { method: 'PUT', body: JSON.stringify(data) }),
  roleViews: () => apiRequest('/preferences/roles'),
  roleConfig: () => apiRequest('/preferences/role-config'),
};

// ─── Фаза 4, Сессия 1: Универсальный импорт/экспорт (EXCH-IO-001) ────────

export const dataExchange = {
  // Импорт
  uploadImport: async (file: File, targetEntity: string = 'decisions') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_entity', targetEntity);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/exchange/import/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  saveMapping: (jobId: number, mappings: Array<{
    source_field: string;
    target_field: string;
    transform_rule?: string;
    default_value?: string;
    is_required?: boolean;
  }>) => apiRequest(`/exchange/import/${jobId}/mapping`, {
    method: 'POST',
    body: JSON.stringify({ mappings }),
  }),

  executeImport: async (jobId: number, file: File) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/exchange/import/${jobId}/execute`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  listImports: (status?: string) =>
    apiRequest(`/exchange/import${status ? '?status=' + status : ''}`),

  getImport: (id: number) => apiRequest(`/exchange/import/${id}`),

  deleteImport: (id: number) =>
    apiRequest(`/exchange/import/${id}`, { method: 'DELETE' }),

  targetFields: (entity: string) =>
    apiRequest(`/exchange/import/target-fields/${entity}`),

  // Экспорт
  createExport: (data: {
    export_format: string;
    target_entity: string;
    filters?: Record<string, any>;
  }) => apiRequest('/exchange/export', { method: 'POST', body: JSON.stringify(data) }),

  listExports: () => apiRequest('/exchange/export'),

  getExport: (id: number) => apiRequest(`/exchange/export/${id}`),

  deleteExport: (id: number) =>
    apiRequest(`/exchange/export/${id}`, { method: 'DELETE' }),
};

// ─── Фаза 3, Сессия 3: Контроль доступа ABAC (COLLAB-ACCESS-001) ───────────

export const accessControl = {
  // ABAC-политики
  listPolicies: (resourceType?: string) =>
    apiRequest(`/access/policies${resourceType ? '?resource_type=' + resourceType : ''}`),
  createPolicy: (data: {
    name: string;
    resource_type: string;
    action: string;
    conditions?: Record<string, unknown>;
    effect?: string;
    priority?: number;
    description?: string;
  }) => apiRequest('/access/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id: number, data: unknown) =>
    apiRequest(`/access/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolicy: (id: number) =>
    apiRequest(`/access/policies/${id}`, { method: 'DELETE' }),
  checkAccess: (data: { resource_type: string; action: string; resource_attrs?: Record<string, unknown> }) =>
    apiRequest('/access/check', { method: 'POST', body: JSON.stringify(data) }),

  // Кастомные роли
  listRoles: () => apiRequest('/access/roles'),
  createRole: (data: { name: string; permissions: unknown; description?: string }) =>
    apiRequest('/access/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: number, data: unknown) =>
    apiRequest(`/access/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: number) =>
    apiRequest(`/access/roles/${id}`, { method: 'DELETE' }),
  seedRoles: () =>
    apiRequest('/access/roles/seed', { method: 'POST' }),

  // Доступ к решениям
  listDecisionAccess: (decisionId: number) =>
    apiRequest(`/access/decisions/${decisionId}/access`),
  grantDecisionAccess: (decisionId: number, data: {
    user_id: number;
    access_level?: string;
    can_view_financials?: boolean;
  }) => apiRequest(`/access/decisions/${decisionId}/grant`, { method: 'POST', body: JSON.stringify(data) }),
  revokeDecisionAccess: (decisionId: number, userId: number) =>
    apiRequest(`/access/decisions/${decisionId}/revoke/${userId}`, { method: 'DELETE' }),
};

// ─── Фаза 4, Сессия 2: API Gateway + Webhooks (EXCH-GW-001) ─────────────

export const apiGateway = {
  // API Keys (EXCH-GW-001.5)
  createApiKey: (data: {
    name: string;
    scopes?: string[];
    rate_limit?: number;
    expires_days?: number;
  }) => apiRequest('/gateway/api-keys', { method: 'POST', body: JSON.stringify(data) }),

  listApiKeys: () => apiRequest('/gateway/api-keys'),

  updateApiKey: (id: number, data: {
    name?: string;
    scopes?: string[];
    is_active?: boolean;
    rate_limit?: number;
  }) => apiRequest(`/gateway/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteApiKey: (id: number) =>
    apiRequest(`/gateway/api-keys/${id}`, { method: 'DELETE' }),

  // Webhooks (EXCH-GW-001.3)
  listWebhooks: () => apiRequest('/gateway/webhooks'),

  getAvailableEvents: () => apiRequest('/gateway/webhooks/events'),

  createWebhook: (data: {
    name: string;
    url: string;
    events: string[];
    secret?: string;
    headers?: Record<string, string>;
    retry_count?: number;
  }) => apiRequest('/gateway/webhooks', { method: 'POST', body: JSON.stringify(data) }),

  updateWebhook: (id: number, data: {
    name?: string;
    url?: string;
    secret?: string;
    events?: string[];
    is_active?: boolean;
    headers?: Record<string, string>;
    retry_count?: number;
  }) => apiRequest(`/gateway/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteWebhook: (id: number) =>
    apiRequest(`/gateway/webhooks/${id}`, { method: 'DELETE' }),

  testWebhook: (id: number) =>
    apiRequest(`/gateway/webhooks/${id}/test`, { method: 'POST' }),

  getWebhookDeliveries: (id: number, limit?: number) =>
    apiRequest(`/gateway/webhooks/${id}/deliveries${limit ? '?limit=' + limit : ''}`),

  // Usage Monitoring (EXCH-GW-001.4)
  getUsageSummary: () => apiRequest('/gateway/usage/summary'),

  getUsageLogs: (limit?: number) =>
    apiRequest(`/gateway/usage/logs${limit ? '?limit=' + limit : ''}`),
};

// ─── Фаза 4, Сессия 3: Адаптеры внешних систем (EXCH-ADAPT-001) ───────

export const marketAdapters = {
  // Sources (EXCH-ADAPT-001.1)
  createSource: (data: { name: string; provider: string; api_key?: string; config?: Record<string, unknown>; sync_interval_minutes?: number }) =>
    apiRequest('/adapters/sources', { method: 'POST', body: JSON.stringify(data) }),
  listSources: () => apiRequest('/adapters/sources'),
  updateSource: (id: number, data: unknown) =>
    apiRequest(`/adapters/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSource: (id: number) =>
    apiRequest(`/adapters/sources/${id}`, { method: 'DELETE' }),

  // Market Data
  getQuote: (symbol: string, sourceId?: number) =>
    apiRequest(`/adapters/market/quote/${symbol}${sourceId ? '?source_id=' + sourceId : ''}`),
  getMacro: (indicator: string, sourceId?: number, country?: string) =>
    apiRequest(`/adapters/market/macro/${indicator}?${sourceId ? 'source_id=' + sourceId + '&' : ''}country=${country || 'US'}`),
  getCache: (sourceId: number, dataType?: string) =>
    apiRequest(`/adapters/market/cache/${sourceId}${dataType ? '?data_type=' + dataType : ''}`),

  // ETL (EXCH-ADAPT-001.2)
  runEtl: (sourceId: number) =>
    apiRequest(`/adapters/etl/run/${sourceId}`, { method: 'POST' }),
  runEtlAll: () => apiRequest('/adapters/etl/run-all', { method: 'POST' }),
  getEtlStatus: () => apiRequest('/adapters/etl/status'),
  cleanupCache: () => apiRequest('/adapters/etl/cleanup', { method: 'POST' }),

  // CRM Contacts (EXCH-ADAPT-001.3)
  createContact: (data: unknown) =>
    apiRequest('/adapters/crm/contacts', { method: 'POST', body: JSON.stringify(data) }),
  listContacts: (type?: string, search?: string) =>
    apiRequest(`/adapters/crm/contacts?${type ? 'contact_type=' + type + '&' : ''}${search ? 'search=' + search : ''}`),
  updateContact: (id: number, data: unknown) =>
    apiRequest(`/adapters/crm/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id: number) =>
    apiRequest(`/adapters/crm/contacts/${id}`, { method: 'DELETE' }),

  // CRM Deals
  createDeal: (data: unknown) =>
    apiRequest('/adapters/crm/deals', { method: 'POST', body: JSON.stringify(data) }),
  listDeals: (stage?: string) =>
    apiRequest(`/adapters/crm/deals${stage ? '?stage=' + stage : ''}`),
  updateDeal: (id: number, data: unknown) =>
    apiRequest(`/adapters/crm/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeal: (id: number) =>
    apiRequest(`/adapters/crm/deals/${id}`, { method: 'DELETE' }),
  getPipelineSummary: () => apiRequest('/adapters/crm/pipeline'),

  // DMS (EXCH-ADAPT-001.4)
  createDocument: (data: unknown) =>
    apiRequest('/adapters/dms/documents', { method: 'POST', body: JSON.stringify(data) }),
  listDocuments: (category?: string, search?: string) =>
    apiRequest(`/adapters/dms/documents?${category ? 'category=' + category + '&' : ''}${search ? 'search=' + search : ''}`),
  updateDocument: (id: number, data: unknown) =>
    apiRequest(`/adapters/dms/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: number) =>
    apiRequest(`/adapters/dms/documents/${id}`, { method: 'DELETE' }),
  addDocVersion: (id: number, data: unknown) =>
    apiRequest(`/adapters/dms/documents/${id}/versions`, { method: 'POST', body: JSON.stringify(data) }),
  listDocVersions: (id: number) =>
    apiRequest(`/adapters/dms/documents/${id}/versions`),
  searchDocuments: (data: { query: string; category?: string }) =>
    apiRequest('/adapters/dms/search', { method: 'POST', body: JSON.stringify(data) }),
  getDmsStats: () => apiRequest('/adapters/dms/stats'),

  // Comparable (EXCH-ADAPT-001.5)
  createComparable: (data: unknown) =>
    apiRequest('/adapters/comparable', { method: 'POST', body: JSON.stringify(data) }),
  listComparables: (sector?: string) =>
    apiRequest(`/adapters/comparable${sector ? '?sector=' + sector : ''}`),
  updateComparable: (id: number, data: unknown) =>
    apiRequest(`/adapters/comparable/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComparable: (id: number) =>
    apiRequest(`/adapters/comparable/${id}`, { method: 'DELETE' }),
  getAnalysis: (sector?: string) =>
    apiRequest(`/adapters/comparable/analysis${sector ? '?sector=' + sector : ''}`),
  getSectors: () => apiRequest('/adapters/comparable/sectors'),
};

// ─── Фаза 4, Сессия 4: Архитектурные принципы (9.2–9.4) ────────────────

export const architecturalPrinciples = {
  // Event Sourcing (9.2.2)
  recordEvent: (data: {
    aggregate_type: string;
    aggregate_id: number;
    event_type: string;
    event_data?: Record<string, unknown>;
    previous_state?: Record<string, unknown>;
    new_state?: Record<string, unknown>;
    correlation_id?: string;
    causation_id?: string;
    metadata?: Record<string, unknown>;
  }) => apiRequest('/arch/events', { method: 'POST', body: JSON.stringify(data) }),

  getEventsTimeline: (params?: {
    aggregate_type?: string;
    event_type?: string;
    correlation_id?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/arch/events${q ? '?' + q : ''}`);
  },

  getEventStats: () => apiRequest('/arch/events/stats'),

  getAggregateEvents: (aggregateType: string, aggregateId: number, limit?: number) =>
    apiRequest(`/arch/events/${aggregateType}/${aggregateId}${limit ? '?limit=' + limit : ''}`),

  getAggregateState: (aggregateType: string, aggregateId: number) =>
    apiRequest(`/arch/events/${aggregateType}/${aggregateId}/state`),

  // HITL + Объяснимость (9.2.1, 9.2.3)
  createHitlReview: (data: {
    ai_output_type: string;
    ai_output_id?: number;
    ai_output_summary?: string;
    ai_confidence?: number;
    explanation_text?: string;
    explanation_factors?: Array<{ factor: string; weight: number; direction: string }>;
  }) => apiRequest('/arch/hitl/reviews', { method: 'POST', body: JSON.stringify(data) }),

  listHitlReviews: (params?: { status?: string; ai_output_type?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/arch/hitl/reviews${q ? '?' + q : ''}`);
  },

  actOnReview: (id: number, data: { status: string; comment?: string }) =>
    apiRequest(`/arch/hitl/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  getHitlStats: () => apiRequest('/arch/hitl/stats'),

  getDisclaimers: (appliesTo?: string) =>
    apiRequest(`/arch/hitl/disclaimers${appliesTo ? '?applies_to=' + appliesTo : ''}`),

  // Воспроизводимость (9.2.4)
  createSnapshot: (data: {
    analysis_type: string;
    analysis_id?: number;
    input_data: unknown;
    parameters: unknown;
    result_data: unknown;
    engine_version?: string;
    notes?: string;
  }) => apiRequest('/arch/snapshots', { method: 'POST', body: JSON.stringify(data) }),

  listSnapshots: (analysisType?: string, limit?: number) => {
    const sp = new URLSearchParams();
    if (analysisType) sp.append('analysis_type', analysisType);
    if (limit) sp.append('limit', String(limit));
    const q = sp.toString();
    return apiRequest(`/arch/snapshots${q ? '?' + q : ''}`);
  },

  getSnapshot: (id: number) => apiRequest(`/arch/snapshots/${id}`),

  reproduceSnapshot: (id: number) =>
    apiRequest(`/arch/snapshots/${id}/reproduce`, { method: 'POST' }),

  getSnapshotStats: () => apiRequest('/arch/snapshots/stats'),

  // Event Bus (9.3.1, 9.3.3)
  publishMessage: (data: {
    channel: string;
    event_type: string;
    payload?: Record<string, unknown>;
    producer?: string;
  }) => apiRequest('/arch/bus/publish', { method: 'POST', body: JSON.stringify(data) }),

  consumeMessages: (data: { channel: string; consumer: string; max_messages?: number }) =>
    apiRequest('/arch/bus/consume', { method: 'POST', body: JSON.stringify(data) }),

  getBusChannels: () => apiRequest('/arch/bus/channels'),

  getChannelMessages: (channel: string, status?: string, limit?: number) => {
    const sp = new URLSearchParams();
    if (status) sp.append('status', status);
    if (limit) sp.append('limit', String(limit));
    const q = sp.toString();
    return apiRequest(`/arch/bus/messages/${channel}${q ? '?' + q : ''}`);
  },

  getDeadLetterQueue: (limit?: number) =>
    apiRequest(`/arch/bus/dead-letter${limit ? '?limit=' + limit : ''}`),

  retryDeadLetter: (id: number) =>
    apiRequest(`/arch/bus/dead-letter/${id}/retry`, { method: 'POST' }),

  markMessageFailed: (id: number, errorMessage?: string) =>
    apiRequest(`/arch/bus/messages/${id}/fail${errorMessage ? '?error_message=' + encodeURIComponent(errorMessage) : ''}`, { method: 'POST' }),

  getBusStats: () => apiRequest('/arch/bus/stats'),

  // Ограничения системы (9.4)
  createConstraint: (data: {
    constraint_key: string;
    title: string;
    description: string;
    category?: string;
    severity?: string;
    display_in_ui?: boolean;
    display_in_reports?: boolean;
  }) => apiRequest('/arch/constraints', { method: 'POST', body: JSON.stringify(data) }),

  listConstraints: (category?: string, activeOnly?: boolean) => {
    const sp = new URLSearchParams();
    if (category) sp.append('category', category);
    if (activeOnly !== undefined) sp.append('active_only', String(activeOnly));
    const q = sp.toString();
    return apiRequest(`/arch/constraints${q ? '?' + q : ''}`);
  },

  updateConstraint: (id: number, data: {
    title?: string;
    description?: string;
    category?: string;
    severity?: string;
    is_active?: boolean;
    display_in_ui?: boolean;
    display_in_reports?: boolean;
  }) => apiRequest(`/arch/constraints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteConstraint: (id: number) =>
    apiRequest(`/arch/constraints/${id}`, { method: 'DELETE' }),

  seedConstraints: () =>
    apiRequest('/arch/constraints/seed', { method: 'POST' }),

  getConstraintsForUi: () => apiRequest('/arch/constraints/ui'),

  getConstraintsForReports: () => apiRequest('/arch/constraints/reports'),
};

// ─── Этап 2, Сессия 2.1: Макроэкономические данные (MACRO-DATA-001) ─────────

export const macroData = {
  // Категории показателей
  categories: () => apiRequest('/macro/categories'),

  // Показатели по категории
  indicators: (params?: {
    category?: string;
    year_from?: number;
    year_to?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/macro/indicators${q ? '?' + q : ''}`);
  },

  // Временной ряд одного показателя
  indicator: (code: string) => apiRequest(`/macro/indicator/${code}`),

  // Сводка для дашборда
  dashboard: () => apiRequest('/macro/dashboard'),

  // Синхронизация данных
  sync: () => apiRequest('/macro/sync', { method: 'POST' }),

  // История курса валюты
  currencyHistory: (params?: {
    code?: string;
    days?: number;
    date_from?: string;
    date_to?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/macro/currency-history${q ? '?' + q : ''}`);
  },

  // Загрузить историю курсов с cbu.uz
  syncCurrencyHistory: (code: string = 'USD', days: number = 90) =>
    apiRequest(`/macro/currency-history/sync?code=${code}&days=${days}`, { method: 'POST' }),
};

// ─── Этап 2, Сессия 2.2: Биржа UZSE + ИПЦ ─────────────────────────────────

export const stockExchange = {
  // Сводка по рынку
  overview: () => apiRequest('/stock'),

  // Список эмитентов
  issuers: (params?: { sector?: string; market?: string }) => {
    const sp = new URLSearchParams();
    if (params?.sector) sp.append('sector', params.sector);
    if (params?.market) sp.append('market', params.market);
    const q = sp.toString();
    return apiRequest(`/stock/issuers${q ? '?' + q : ''}`);
  },

  // Список сделок
  trades: (params?: { trade_date?: string; issuer_code?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.trade_date) sp.append('trade_date', params.trade_date);
    if (params?.issuer_code) sp.append('issuer_code', params.issuer_code);
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString();
    return apiRequest(`/stock/trades${q ? '?' + q : ''}`);
  },

  // Дневные сводки
  dailySummary: (params?: { trade_date?: string; issuer_code?: string }) => {
    const sp = new URLSearchParams();
    if (params?.trade_date) sp.append('trade_date', params.trade_date);
    if (params?.issuer_code) sp.append('issuer_code', params.issuer_code);
    const q = sp.toString();
    return apiRequest(`/stock/daily-summary${q ? '?' + q : ''}`);
  },

  // Синхронизация с UZSE
  sync: () => apiRequest('/stock/sync', { method: 'POST' }),

  // Инициализация каталога эмитентов
  initCatalog: () => apiRequest('/stock/init-catalog', { method: 'POST' }),
};

// ─── ИПЦ / Инфляция (stat.uz SDMX) ────────────────────────────────────────

export const cpiData = {
  // Сводка ИПЦ
  overview: () => apiRequest('/cpi'),

  // Временной ряд
  timeSeries: (params?: { indicator_code?: string; comparison_type?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.indicator_code) sp.append('indicator_code', params.indicator_code);
    if (params?.comparison_type) sp.append('comparison_type', params.comparison_type);
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString();
    return apiRequest(`/cpi/time-series${q ? '?' + q : ''}`);
  },

  // Список доступных наборов
  datasets: () => apiRequest('/cpi/datasets'),

  // Записи с фильтрацией
  records: (params?: {
    indicator_code?: string;
    comparison_type?: string;
    period_from?: string;
    period_to?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/cpi/records${q ? '?' + q : ''}`);
  },

  // Синхронизация одного набора
  sync: (datasetKey: string = 'cpi_monthly') =>
    apiRequest(`/cpi/sync?dataset_key=${datasetKey}`, { method: 'POST' }),

  // Синхронизация всех наборов
  syncAll: () => apiRequest('/cpi/sync-all', { method: 'POST' }),
};

// ─── Этап 2, Сессия 2.3: Поиск компаний по ИНН ────────────────────────────

export const companyLookup = {
  // Поиск компании (ИНН или название)
  search: (query: string, searchOnline: boolean = true) =>
    apiRequest(`/companies/search?q=${encodeURIComponent(query)}`),
      
  // Список компаний из кэша
  list: (params?: { search?: string; status?: string; region?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/companies/list${q ? '?' + q : ''}`);
  },

  // Профиль по ИНН
  get: (inn: string) => apiRequest(`/companies/${inn}`),

  // Инициализация каталога
  init: () => apiRequest('/companies/init', { method: 'POST' }),
};

// ─── Этап 2, Сессия 2.4: Объединённый дашборд с реальными данными ──────────

export const dashboardRealData = {
  // Полная сводка: валюты, биржа, ИПЦ, компании, макро
  get: () => apiRequest('/dashboard/realdata'),
};

// ─── Этап 3, Сессия 3.1: AI Gateway — оркестрация ИИ-провайдеров ───────────

export const aiGateway = {
  // Отправить запрос к AI (с автоматическим fallback)
  chat: (data: {
    messages: { role: string; content: string }[];
    provider?: string;
    specialization?: string;
    temperature?: number;
    max_tokens?: number;
    system_prompt?: string;
    use_cache?: boolean;
  }) => apiRequest('/ai-gateway/chat', { method: 'POST', body: JSON.stringify(data) }),

  // Список провайдеров со статусами
  providers: () => apiRequest('/ai-gateway/providers'),

  // Проверка здоровья провайдеров
  health: () => apiRequest('/ai-gateway/health'),

  // Статистика использования
  stats: () => apiRequest('/ai-gateway/stats'),
};

// ─── Фаза 4: Бизнес-кейсы (PORT-001) ────────────────────────────────────────

export const businessCases = {
  list: (category?: string) =>
    apiRequest(`/business-cases${category ? '?category=' + category : ''}`),
  categories: () => apiRequest('/business-cases/categories'),
  get: (caseId: string) => apiRequest(`/business-cases/${caseId}`),
  validate: () => apiRequest('/business-cases/validate', { method: 'POST' }),
};

// ─── Фаза 4: Монте-Карло v2 (PORT-002) ──────────────────────────────────────

export const monteCarloV2 = {
  run: (data: {
    investment_amount: number;
    sector: string;
    time_horizon_years?: number;
    num_simulations?: number;
  }) => apiRequest('/analytics/monte-carlo-v2', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Фаза 4: AI Explainability (AI-001) ─────────────────────────────────────

export const xai = {
  analyze: (data: {
    decision_id?: number;
    portfolio_id?: number;
    analysis_type?: string;
  }) => apiRequest('/xai/analyze', { method: 'POST', body: JSON.stringify(data) }),
  history: (params?: { decision_id?: number; portfolio_id?: number }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/xai/history${q ? '?' + q : ''}`);
  },
};

// ─── Фаза 4: AI Orchestration (AI-002, AI-003, AI-004) ──────────────────────

export const aiOrchestrator = {
  route: (data: {
    query: string;
    request_type?: string;
    prefer_provider?: string;
  }) => apiRequest('/ai-orchestrator/route', { method: 'POST', body: JSON.stringify(data) }),
  synthesize: (data: {
    query: string;
    providers?: string[];
  }) => apiRequest('/ai-orchestrator/synthesize', { method: 'POST', body: JSON.stringify(data) }),
  providerHealth: () => apiRequest('/ai-provider-health/status'),
  providerStats: () => apiRequest('/ai-provider-health/stats'),
};

// ─── Фаза 5: Demo Seed Data (DEMO-001) ─────────────────────────────────────

export const demo = {
    seed: () => apiRequest('/demo/seed', { method: 'POST' }),
};

  // --- DD Documents (DD-002) -----------------------------------------------

export const ddDocuments = {
  upload: async (file: File, docType: string = 'auto') => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_URL}/dd-documents/upload?doc_type=${docType}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getAnalysis: (docId: string) => apiRequest(`/dd-documents/analysis/${docId}`),
  templates: () => apiRequest('/dd-documents/templates'),
};

// --- Investment Calculator Pro (CALC-002) ------------------------------------

export const calculatorPro = {
  dcf: (data: Record<string, unknown>) =>
    apiRequest('/calculator/dcf', { method: 'POST', body: JSON.stringify(data) }),
  full: (data: Record<string, unknown>) =>
    apiRequest('/calculator/full', { method: 'POST', body: JSON.stringify(data) }),
  wacc: (data: Record<string, unknown>) =>
    apiRequest('/calculator/wacc', { method: 'POST', body: JSON.stringify(data) }),
  irr: (data: Record<string, unknown>) =>
    apiRequest('/calculator/irr', { method: 'POST', body: JSON.stringify(data) }),
  npv: (data: Record<string, unknown>) =>
    apiRequest('/calculator/npv', { method: 'POST', body: JSON.stringify(data) }),
  payback: (data: Record<string, unknown>) =>
    apiRequest('/calculator/payback', { method: 'POST', body: JSON.stringify(data) }),
  monteCarlo: (data: Record<string, unknown>) =>
    apiRequest('/calculator/monte-carlo', { method: 'POST', body: JSON.stringify(data) }),
  sensitivity: (data: Record<string, unknown>) =>
    apiRequest('/calculator/sensitivity', { method: 'POST', body: JSON.stringify(data) }),
  benchmarks: (data: Record<string, unknown>) =>
    apiRequest('/calculator/benchmarks', { method: 'POST', body: JSON.stringify(data) }),
  compare: (data: Record<string, unknown>) =>
    apiRequest('/calculator/compare', { method: 'POST', body: JSON.stringify(data) }),
};
