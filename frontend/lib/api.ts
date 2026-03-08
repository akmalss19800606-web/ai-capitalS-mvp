const API_URL = '/api/v1';

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
    if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
    return data;
  },
  me: () => apiRequest('/auth/me'),
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
  create: (data: any) => apiRequest('/decisions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: any) => apiRequest(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
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
  createDefinition: (data: any) =>
    apiRequest('/workflows/definitions', { method: 'POST', body: JSON.stringify(data) }),
  updateDefinition: (id: number, data: any) =>
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
