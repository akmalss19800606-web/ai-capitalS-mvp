/**
 * API клиент для AI Capital Management.
 * Фаза 0: Поддержка httpOnly cookie для refresh-токена.
 * Refresh-токен теперь отправляется автоматически через cookie (credentials: 'include').
 */

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

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',  // Фаза 0: отправлять cookies (для refresh-токена)
  });

  if (res.status === 401 && typeof window !== 'undefined') {
    // Попытка обновить токен через cookie (refresh_token в httpOnly cookie)
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',  // Cookie с refresh_token отправляется автоматически
        body: JSON.stringify({}),
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('token', data.access_token);
        setCookie('access_token', data.access_token);
        headers['Authorization'] = `Bearer ${data.access_token}`;
        const retryRes = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers,
          credentials: 'include',
        });
        if (!retryRes.ok) throw new Error(await retryRes.text());
        if (retryRes.status === 204) return null;
        return retryRes.json();
      }
    } catch {
      localStorage.removeItem('token');
      removeCookie('access_token');
      window.location.href = '/login';
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
      credentials: 'include',  // Получить httpOnly cookie с refresh_token
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    localStorage.setItem('token', data.access_token);
    setCookie('access_token', data.access_token);
    // refresh_token теперь в httpOnly cookie — не сохраняем в localStorage
    return data;
  },
  logout: async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // Игнорируем ошибку — удаляем локальные данные в любом случае
    }
    localStorage.removeItem('token');
    removeCookie('access_token');
    window.location.href = '/login';
  },
  mfaVerify: (mfaTempToken: string, code: string) =>
    apiRequest('/auth/mfa-verify', {
      method: 'POST',
      body: JSON.stringify({ mfa_temp_token: mfaTempToken, code }),
    }),
  me: () => apiRequest('/auth/me'),
  ssoProviders: () => apiRequest('/auth/sso/providers'),
  createSsoProvider: (data: Record<string, unknown>) =>
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
  create: (data: Record<string, unknown>) => apiRequest('/decisions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) => apiRequest(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    apiRequest(`/decisions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delete: (id: number) => apiRequest(`/decisions/${id}`, { method: 'DELETE' }),
  stats: () => apiRequest('/decisions/stats'),
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

export const workflows = {
  listDefinitions: (isActive?: boolean) => {
    const params = isActive !== undefined ? `?is_active=${isActive}` : '';
    return apiRequest(`/workflows/definitions${params}`);
  },
  getDefinition: (id: number) => apiRequest(`/workflows/definitions/${id}`),
  createDefinition: (data: Record<string, unknown>) =>
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

export const aiAnalytics = {
  runMonteCarlo: (data: {
    decision_id: number;
    initial_investment: number;
    time_horizon_months?: number;
    num_iterations?: number;
  }) => apiRequest('/analytics/monte-carlo', { method: 'POST', body: JSON.stringify(data) }),
  getMonteCarlo: (id: number) => apiRequest(`/analytics/monte-carlo/${id}`),
  listMonteCarlo: (decisionId?: number) =>
    apiRequest(`/analytics/monte-carlo${decisionId ? '?decision_id=' + decisionId : ''}`),
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
  runFrontier: (data: {
    portfolio_id: number;
    risk_free_rate?: number;
    optimization_target?: string;
    num_frontier_points?: number;
  }) => apiRequest('/analytics/frontier', { method: 'POST', body: JSON.stringify(data) }),
  getFrontier: (id: number) => apiRequest(`/analytics/frontier/${id}`),
  listFrontier: (portfolioId?: number) =>
    apiRequest(`/analytics/frontier${portfolioId ? '?portfolio_id=' + portfolioId : ''}`),
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

export const dashboardBuilder = {
  widgetTypes: () => apiRequest('/dashboards/widget-types'),
  list: () => apiRequest('/dashboards'),
  get: (id: number) => apiRequest(`/dashboards/${id}`),
  create: (data: Record<string, unknown>) =>
    apiRequest('/dashboards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) =>
    apiRequest(`/dashboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) =>
    apiRequest(`/dashboards/${id}`, { method: 'DELETE' }),
  addWidget: (dashboardId: number, data: unknown) =>
    apiRequest(`/dashboards/${dashboardId}/widgets`, { method: 'POST', body: JSON.stringify(data) }),
  updateWidget: (widgetId: number, data: unknown) =>
    apiRequest(`/dashboards/widgets/${widgetId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWidget: (widgetId: number) =>
    apiRequest(`/dashboards/widgets/${widgetId}`, { method: 'DELETE' }),
  updateLayout: (dashboardId: number, layout: Record<string, unknown>[]) =>
    apiRequest(`/dashboards/${dashboardId}/layout`, { method: 'PUT', body: JSON.stringify(layout) }),
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

export const mfa = {
  status: () => apiRequest('/auth/mfa/status'),
  setup: () =>
    apiRequest('/auth/mfa/setup', { method: 'POST' }),
  confirm: (code: string) =>
    apiRequest('/auth/mfa/confirm', { method: 'POST', body: JSON.stringify({ code }) }),
  disable: (code: string) =>
    apiRequest('/auth/mfa/disable', { method: 'POST', body: JSON.stringify({ code }) }),
};

export const sessions = {
  list: () => apiRequest('/auth/sessions'),
  forceLogout: (sessionId: number) =>
    apiRequest(`/auth/sessions/${sessionId}/logout`, { method: 'POST' }),
  logoutAll: () =>
    apiRequest('/auth/sessions/logout-all', { method: 'POST' }),
};

export const collaboration = {
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
  createTask: (decisionId: number, data: unknown) =>
    apiRequest(`/decisions/${decisionId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (decisionId: number, taskId: number, data: unknown) =>
    apiRequest(`/decisions/${decisionId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (decisionId: number, taskId: number) =>
    apiRequest(`/decisions/${decisionId}/tasks/${taskId}`, { method: 'DELETE' }),
};

export const notifications = {
  list: (params?: { is_read?: boolean }) => {
    const q = params?.is_read !== undefined ? `?is_read=${params.is_read}` : '';
    return apiRequest(`/notifications${q}`);
  },
  markRead: (id: number) =>
    apiRequest(`/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () =>
    apiRequest('/notifications/read-all', { method: 'POST' }),
  unreadCount: () => apiRequest('/notifications/unread-count'),
};

export const preferences = {
  get: () => apiRequest('/preferences'),
  update: (data: Record<string, unknown>) =>
    apiRequest('/preferences', { method: 'PUT', body: JSON.stringify(data) }),
};

export const dataExchange = {
  exportCSV: (entityType: string, params?: unknown) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v as string));
      });
    }
    const q = sp.toString();
    return apiRequest(`/data-exchange/export/${entityType}${q ? '?' + q : ''}`);
  },
  importCSV: (entityType: string, data: unknown) =>
    apiRequest(`/data-exchange/import/${entityType}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  formats: () => apiRequest('/data-exchange/formats'),
};

export const islamicFinance = {
  screen: (data: Record<string, unknown>) =>
    apiRequest('/islamic-finance/screening', { method: 'POST', body: JSON.stringify(data) }),
  getScreening: (id: number) => apiRequest(`/islamic-finance/screening/${id}`),
  listScreenings: () => apiRequest('/islamic-finance/screening'),
  zakatCalc: (data: Record<string, unknown>) =>
    apiRequest('/islamic-finance/zakat/calculate', { method: 'POST', body: JSON.stringify(data) }),
  getZakat: (id: number) => apiRequest(`/islamic-finance/zakat/${id}`),
  listZakat: () => apiRequest('/islamic-finance/zakat'),
  sukukList: () => apiRequest('/islamic-finance/sukuk'),
};

export const portfolioAnalytics = {
  dcf: (portfolioId: number, data: unknown) =>
    apiRequest(`/portfolio-analytics/${portfolioId}/dcf`, { method: 'POST', body: JSON.stringify(data) }),
  npvIrr: (portfolioId: number, data: unknown) =>
    apiRequest(`/portfolio-analytics/${portfolioId}/npv-irr`, { method: 'POST', body: JSON.stringify(data) }),
  whatIf: (portfolioId: number, data: unknown) =>
    apiRequest(`/portfolio-analytics/${portfolioId}/what-if`, { method: 'POST', body: JSON.stringify(data) }),
  monteCarlo: (portfolioId: number, data: unknown) =>
    apiRequest(`/portfolio-analytics/${portfolioId}/monte-carlo`, { method: 'POST', body: JSON.stringify(data) }),
  summary: (portfolioId: number) =>
    apiRequest(`/portfolio-analytics/${portfolioId}/summary`),
};

/* ═══════════════════════════════════════════════════════════════
   Ниже — экспорты модулей, которые используются страницами
   (ранее отсутствовали, что вызывало ошибку сборки frontend)
   ═══════════════════════════════════════════════════════════════ */

export const accessControl = {
  listRoles: () => apiRequest('/access/roles'),
  createRole: (data: { name: string; permissions: string[]; description?: string }) =>
    apiRequest('/access/roles', { method: 'POST', body: JSON.stringify(data) }),
  updateRole: (id: number, data: unknown) =>
    apiRequest(`/access/roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRole: (id: number) =>
    apiRequest(`/access/roles/${id}`, { method: 'DELETE' }),
  seedRoles: () =>
    apiRequest('/access/roles/seed', { method: 'POST' }),
  listPolicies: () => apiRequest('/access/policies'),
  createPolicy: (data: {
    name: string;
    resource: string;
    action: string;
    effect: string;
    conditions?: Record<string, unknown>;
  }) => apiRequest('/access/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id: number, data: unknown) =>
    apiRequest(`/access/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePolicy: (id: number) =>
    apiRequest(`/access/policies/${id}`, { method: 'DELETE' }),
  checkAccess: (data: { resource: string; action: string }) =>
    apiRequest('/access/check', { method: 'POST', body: JSON.stringify(data) }),
  listDecisionAccess: (decisionId: number) =>
    apiRequest(`/access/decisions/${decisionId}/access`),
  grantAccess: (decisionId: number, data: unknown) =>
    apiRequest(`/access/decisions/${decisionId}/grant`, { method: 'POST', body: JSON.stringify(data) }),
  revokeAccess: (decisionId: number, userId: number) =>
    apiRequest(`/access/decisions/${decisionId}/revoke/${userId}`, { method: 'DELETE' }),
};

export const aiGateway = {
  chat: (data: {
    messages: Array<{ role: string; content: string }>;
    provider?: string;
    temperature?: number;
    system_prompt?: string;
    use_cache?: boolean;
  }) => apiRequest('/ai-gateway/ask', { method: 'POST', body: JSON.stringify(data) }),
  providers: () => apiRequest('/ai-gateway/providers'),
  stats: () => apiRequest('/ai-gateway/providers'),
};

export const apiGateway = {
  createApiKey: (data: { name: string; scopes?: string[]; expires_in_days?: number }) =>
    apiRequest('/gateway/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  listApiKeys: () => apiRequest('/gateway/api-keys'),
  updateApiKey: (id: number, data: { is_active?: boolean; scopes?: string[] }) =>
    apiRequest(`/gateway/api-keys/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApiKey: (id: number) =>
    apiRequest(`/gateway/api-keys/${id}`, { method: 'DELETE' }),
  getAvailableEvents: () => apiRequest('/gateway/webhooks/events'),
  createWebhook: (data: { url: string; events: string[]; secret?: string }) =>
    apiRequest('/gateway/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  listWebhooks: () => apiRequest('/gateway/webhooks'),
  updateWebhook: (id: number, data: { url?: string; events?: string[]; is_active?: boolean }) =>
    apiRequest(`/gateway/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWebhook: (id: number) =>
    apiRequest(`/gateway/webhooks/${id}`, { method: 'DELETE' }),
  testWebhook: (id: number) =>
    apiRequest(`/gateway/webhooks/${id}/test`, { method: 'POST' }),
  getWebhookDeliveries: (id: number, limit?: number) =>
    apiRequest(`/gateway/webhooks/${id}/deliveries${limit ? '?limit=' + limit : ''}`),
  getUsageSummary: () => apiRequest('/gateway/usage/summary'),
  getUsageLogs: (limit?: number) =>
    apiRequest(`/gateway/usage/logs${limit ? '?limit=' + limit : ''}`),
};

export const architecturalPrinciples = {
  createEvent: (data: Record<string, unknown>) =>
    apiRequest('/arch/events', { method: 'POST', body: JSON.stringify(data) }),
  getEventsTimeline: (params?: { limit?: number }) => {
    const q = params?.limit ? `?limit=${params.limit}` : '';
    return apiRequest(`/arch/events${q}`);
  },
  getEventStats: () => apiRequest('/arch/events/stats'),
  getAggregateEvents: (type: string, id: string) =>
    apiRequest(`/arch/events/${type}/${id}`),
  getAggregateState: (type: string, id: string) =>
    apiRequest(`/arch/events/${type}/${id}/state`),
  createReview: (data: Record<string, unknown>) =>
    apiRequest('/arch/hitl/reviews', { method: 'POST', body: JSON.stringify(data) }),
  listHitlReviews: (params?: { limit?: number }) => {
    const q = params?.limit ? `?limit=${params.limit}` : '';
    return apiRequest(`/arch/hitl/reviews${q}`);
  },
  actOnReview: (id: number, data: { status: string }) =>
    apiRequest(`/arch/hitl/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getHitlStats: () => apiRequest('/arch/hitl/stats'),
  getDisclaimers: () => apiRequest('/arch/hitl/disclaimers'),
  createSnapshot: (data: Record<string, unknown>) =>
    apiRequest('/arch/snapshots', { method: 'POST', body: JSON.stringify(data) }),
  listSnapshots: (model?: string, limit?: number) => {
    const sp = new URLSearchParams();
    if (model) sp.append('model_name', model);
    if (limit) sp.append('limit', String(limit));
    const q = sp.toString();
    return apiRequest(`/arch/snapshots${q ? '?' + q : ''}`);
  },
  getSnapshotStats: () => apiRequest('/arch/snapshots/stats'),
  getSnapshot: (id: number) => apiRequest(`/arch/snapshots/${id}`),
  reproduceSnapshot: (id: number) =>
    apiRequest(`/arch/snapshots/${id}/reproduce`, { method: 'POST' }),
  publishEvent: (data: Record<string, unknown>) =>
    apiRequest('/arch/bus/publish', { method: 'POST', body: JSON.stringify(data) }),
  consumeEvents: (data: Record<string, unknown>) =>
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
  getBusStats: () => apiRequest('/arch/bus/stats'),
  seedConstraints: () =>
    apiRequest('/arch/constraints/seed', { method: 'POST' }),
  createConstraint: (data: Record<string, unknown>) =>
    apiRequest('/arch/constraints', { method: 'POST', body: JSON.stringify(data) }),
  listConstraints: (category?: string, isActive?: boolean) => {
    const sp = new URLSearchParams();
    if (category) sp.append('category', category);
    if (isActive !== undefined) sp.append('is_active', String(isActive));
    const q = sp.toString();
    return apiRequest(`/arch/constraints${q ? '?' + q : ''}`);
  },
  updateConstraint: (id: number, data: unknown) =>
    apiRequest(`/arch/constraints/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConstraint: (id: number) =>
    apiRequest(`/arch/constraints/${id}`, { method: 'DELETE' }),
  getConstraintsUi: () => apiRequest('/arch/constraints/ui'),
  getConstraintsReports: () => apiRequest('/arch/constraints/reports'),
};

export const companyLookup = {
  search: (query: string) =>
    apiRequest(`/companies/search?q=${encodeURIComponent(query)}`),
  get: (inn: string) => apiRequest(`/companies/${inn}`),
  init: () =>
    apiRequest('/companies/lookup', { method: 'POST', body: JSON.stringify({}) }),
  list: (params?: { search?: string; limit?: number }) => {
    const sp = new URLSearchParams();
    if (params?.search) sp.append('q', params.search);
    if (params?.limit) sp.append('limit', String(params.limit));
    const q = sp.toString();
    return apiRequest(`/companies/search${q ? '?' + q : ''}`);
  },
};

export const cpiData = {
  overview: () => apiRequest('/cpi/current'),
  timeSeries: (params?: {
    indicator_code?: string;
    comparison_type?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) sp.append(k, String(v));
      });
    }
    const q = sp.toString();
    return apiRequest(`/cpi/trend${q ? '?' + q : ''}`);
  },
  datasets: () => apiRequest('/cpi/data'),
  syncAll: () => apiRequest('/cpi/sync', { method: 'POST' }),
};

export const marketAdapters = {
  /* Sources */
  createSource: (data: Record<string, unknown>) =>
    apiRequest('/adapters/sources', { method: 'POST', body: JSON.stringify(data) }),
  listSources: () => apiRequest('/adapters/sources'),
  updateSource: (id: number, data: unknown) =>
    apiRequest(`/adapters/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSource: (id: number) =>
    apiRequest(`/adapters/sources/${id}`, { method: 'DELETE' }),
  /* Market data */
  getQuote: (symbol: string) => apiRequest(`/adapters/market/quote/${symbol}`),
  getMacro: (indicator: string, period?: string, country?: string) => {
    const sp = new URLSearchParams();
    if (period) sp.append('period', period);
    if (country) sp.append('country', country);
    const q = sp.toString();
    return apiRequest(`/adapters/market/macro/${indicator}${q ? '?' + q : ''}`);
  },
  getCache: (sourceId: number) => apiRequest(`/adapters/market/cache/${sourceId}`),
  /* ETL */
  runEtl: (sourceId: number) =>
    apiRequest(`/adapters/etl/run/${sourceId}`, { method: 'POST' }),
  runEtlAll: () =>
    apiRequest('/adapters/etl/run-all', { method: 'POST' }),
  getEtlStatus: () => apiRequest('/adapters/etl/status'),
  cleanupCache: () =>
    apiRequest('/adapters/etl/cleanup', { method: 'POST' }),
  /* CRM */
  createContact: (data: Record<string, unknown>) =>
    apiRequest('/adapters/crm/contacts', { method: 'POST', body: JSON.stringify(data) }),
  listContacts: () => apiRequest('/adapters/crm/contacts'),
  updateContact: (id: number, data: unknown) =>
    apiRequest(`/adapters/crm/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteContact: (id: number) =>
    apiRequest(`/adapters/crm/contacts/${id}`, { method: 'DELETE' }),
  createDeal: (data: Record<string, unknown>) =>
    apiRequest('/adapters/crm/deals', { method: 'POST', body: JSON.stringify(data) }),
  listDeals: () => apiRequest('/adapters/crm/deals'),
  updateDeal: (id: number, data: unknown) =>
    apiRequest(`/adapters/crm/deals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeal: (id: number) =>
    apiRequest(`/adapters/crm/deals/${id}`, { method: 'DELETE' }),
  getPipelineSummary: () => apiRequest('/adapters/crm/pipeline'),
  /* DMS */
  createDocument: (data: Record<string, unknown>) =>
    apiRequest('/adapters/dms/documents', { method: 'POST', body: JSON.stringify(data) }),
  listDocuments: (status?: string, search?: string) => {
    const sp = new URLSearchParams();
    if (status) sp.append('status', status);
    if (search) sp.append('search', search);
    const q = sp.toString();
    return apiRequest(`/adapters/dms/documents${q ? '?' + q : ''}`);
  },
  updateDocument: (id: number, data: unknown) =>
    apiRequest(`/adapters/dms/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: number) =>
    apiRequest(`/adapters/dms/documents/${id}`, { method: 'DELETE' }),
  addDocVersion: (docId: number, data: unknown) =>
    apiRequest(`/adapters/dms/documents/${docId}/versions`, { method: 'POST', body: JSON.stringify(data) }),
  listDocVersions: (docId: number) =>
    apiRequest(`/adapters/dms/documents/${docId}/versions`),
  searchDocuments: (data: { query: string }) =>
    apiRequest('/adapters/dms/search', { method: 'POST', body: JSON.stringify(data) }),
  getDmsStats: () => apiRequest('/adapters/dms/stats'),
  /* Comparable companies */
  createComparable: (data: Record<string, unknown>) =>
    apiRequest('/adapters/comparable', { method: 'POST', body: JSON.stringify(data) }),
  listComparables: (sector?: string) => {
    const q = sector ? `?sector=${encodeURIComponent(sector)}` : '';
    return apiRequest(`/adapters/comparable${q}`);
  },
  updateComparable: (id: number, data: unknown) =>
    apiRequest(`/adapters/comparable/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteComparable: (id: number) =>
    apiRequest(`/adapters/comparable/${id}`, { method: 'DELETE' }),
  getAnalysis: (sector?: string) => {
    const q = sector ? `?sector=${encodeURIComponent(sector)}` : '';
    return apiRequest(`/adapters/comparable/analysis${q}`);
  },
  getSectors: () => apiRequest('/adapters/comparable/sectors'),
};

export const stockExchange = {
  overview: () => apiRequest('/stock-exchange/quotes'),
  issuers: () => apiRequest('/stock-exchange/emitters'),
  trades: (params?: { limit?: number }) => {
    const q = params?.limit ? `?limit=${params.limit}` : '';
    return apiRequest(`/stock-exchange/trades${q}`);
  },
  initCatalog: () =>
    apiRequest('/stock-exchange/sync', { method: 'POST' }),
  sync: () =>
    apiRequest('/stock-exchange/sync', { method: 'POST' }),
};
