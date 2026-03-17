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
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers, credentials: 'include' });
  if (res.status === 401 && typeof window !== 'undefined') {
    try {
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('token', data.access_token);
        setCookie('access_token', data.access_token);
        headers['Authorization'] = `Bearer ${data.access_token}`;
        const retryRes = await fetch(`${API_URL}${endpoint}`, { ...options, headers, credentials: 'include' });
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
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('token', data.access_token);
      setCookie('access_token', data.access_token);
    }
    return data;
  },
  mfaVerify: (mfaTempToken: string, code: string) =>
    apiRequest('/auth/mfa-verify', { method: 'POST', body: JSON.stringify({ mfa_temp_token: mfaTempToken, code }) }),
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

export const assets = {
  list: (portfolioId: number) => apiRequest(`/portfolios/${portfolioId}/assets`),
  create: (portfolioId: number, data: unknown) =>
    apiRequest(`/portfolios/${portfolioId}/assets`, { method: 'POST', body: JSON.stringify(data) }),
  update: (portfolioId: number, assetId: number, data: unknown) =>
    apiRequest(`/portfolios/${portfolioId}/assets/${assetId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (portfolioId: number, assetId: number) =>
    apiRequest(`/portfolios/${portfolioId}/assets/${assetId}`, { method: 'DELETE' }),
};

export const analytics = {
  portfolio: (id: number) => apiRequest(`/analytics/portfolio/${id}`),
  stress: (id: number) => apiRequest(`/analytics/stress/${id}`),
  ai: (id: number) => apiRequest(`/analytics/ai-recommendation/${id}`),
};

export const marketUz = {
  stocks: () => apiRequest('/market-uz/stocks'),
  bonds: () => apiRequest('/market-uz/bonds'),
  indices: () => apiRequest('/market-uz/indices'),
};

export const dd = {
  searchByInn: (inn: string) => apiRequest(`/companies/search?q=${encodeURIComponent(inn)}`),
  getReport: (inn: string) => apiRequest(`/dd/scoring/${encodeURIComponent(inn)}`),
};

export const organizations = {
  list: () => apiRequest('/organizations'),
  get: (id: number) => apiRequest(`/organizations/${id}`),
  create: (data: unknown) => apiRequest('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) => apiRequest(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/organizations/${id}`, { method: 'DELETE' }),
  members: (id: number) => apiRequest(`/organizations/${id}/members`),
  addMember: (id: number, data: unknown) => apiRequest(`/organizations/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
};

export const market = {
  stocks: () => apiRequest('/market-uz/stocks'),
  bonds: () => apiRequest('/market-uz/bonds'),
  indices: () => apiRequest('/market-uz/indices'),
  overview: () => apiRequest('/market-uz/overview'),
};

export const ai = {
  recommendation: (id: number) => apiRequest(`/analytics/ai-recommendation/${id}`),
  chat: (data: unknown) => apiRequest('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
};

export const dashboard = {
  summary: () => apiRequest('/dashboard/summary'),
  widgets: () => apiRequest('/dashboard/widgets'),
};

export const dashboardBuilder = {
  list: () => apiRequest('/dashboard-builder/layouts'),
  save: (data: unknown) => apiRequest('/dashboard-builder/layouts', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: number) => apiRequest(`/dashboard-builder/layouts/${id}`),
};

export const decisions = {
  list: () => apiRequest('/decisions'),
  get: (id: number) => apiRequest(`/decisions/${id}`),
  create: (data: unknown) => apiRequest('/decisions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) => apiRequest(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/decisions/${id}`, { method: 'DELETE' }),
  vote: (id: number, data: unknown) => apiRequest(`/decisions/${id}/vote`, { method: 'POST', body: JSON.stringify(data) }),
};

export const collaboration = {
  comments: (entityType: string, entityId: number) => apiRequest(`/collaboration/${entityType}/${entityId}/comments`),
  addComment: (entityType: string, entityId: number, data: unknown) =>
    apiRequest(`/collaboration/${entityType}/${entityId}/comments`, { method: 'POST', body: JSON.stringify(data) }),
  deleteComment: (commentId: number) => apiRequest(`/collaboration/comments/${commentId}`, { method: 'DELETE' }),
};

export const notifications = {
  list: () => apiRequest('/notifications'),
  markRead: (id: number) => apiRequest(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => apiRequest('/notifications/read-all', { method: 'PUT' }),
};

export const preferences = {
  get: () => apiRequest('/preferences'),
  update: (data: unknown) => apiRequest('/preferences', { method: 'PUT', body: JSON.stringify(data) }),
};

export const mfa = {
  status: () => apiRequest('/auth/mfa/status'),
  enable: (data: unknown) => apiRequest('/auth/mfa/enable', { method: 'POST', body: JSON.stringify(data) }),
  disable: () => apiRequest('/auth/mfa/disable', { method: 'POST' }),
  setup: () => apiRequest('/auth/mfa/setup', { method: 'POST' }),
};

export const sessions = {
  list: () => apiRequest('/auth/sessions'),
  revoke: (id: number) => apiRequest(`/auth/sessions/${id}`, { method: 'DELETE' }),
  revokeAll: () => apiRequest('/auth/sessions', { method: 'DELETE' }),
};

export const accessControl = {
  roles: () => apiRequest('/access-control/roles'),
  permissions: () => apiRequest('/access-control/permissions'),
  assignRole: (data: unknown) => apiRequest('/access-control/assign', { method: 'POST', body: JSON.stringify(data) }),
};

export const companyLookup = {
  search: (query: string) => apiRequest(`/companies/search?q=${encodeURIComponent(query)}`),
  getByInn: (inn: string) => apiRequest(`/companies/${encodeURIComponent(inn)}`),
    get: (inn: string) => apiRequest(`/companies/${encodeURIComponent(inn)}`),
};

export const ddScoring = {
  score: (inn: string) => apiRequest(`/dd/scoring/${encodeURIComponent(inn)}`),
    run: (data: unknown) => apiRequest('/dd/scoring', { method: 'POST', body: JSON.stringify(data) }),
    updateChecklist: (id: number, data: unknown) => apiRequest(`/dd/scoring/${id}/checklist`, { method: 'PUT', body: JSON.stringify(data) }),
    history: () => apiRequest('/dd/scoring/history'),
};

export const ddDocuments = {
  list: (inn: string) => apiRequest(`/dd/documents/${encodeURIComponent(inn)}`),
  upload: (inn: string, data: unknown) => apiRequest(`/dd/documents/${encodeURIComponent(inn)}`, { method: 'POST', body: JSON.stringify(data) }),
};

export const riskAnalysis = {
  portfolio: (id: number) => apiRequest(`/risk/portfolio/${id}`),
  var: (id: number) => apiRequest(`/risk/var/${id}`),
  stress: (id: number) => apiRequest(`/risk/stress/${id}`),
};

export const reports = {
  list: () => apiRequest('/reports'),
  generate: (data: unknown) => apiRequest('/reports/generate', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: number) => apiRequest(`/reports/${id}`),
  download: (id: number) => apiRequest(`/reports/${id}/download`),
};

export const workflows = {
  list: () => apiRequest('/workflows'),
  get: (id: number) => apiRequest(`/workflows/${id}`),
  create: (data: unknown) => apiRequest('/workflows', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) => apiRequest(`/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/workflows/${id}`, { method: 'DELETE' }),
  execute: (id: number) => apiRequest(`/workflows/${id}/execute`, { method: 'POST' }),
};


export const etl = {
  run: () => apiRequest('/etl/run', { method: 'POST' }),
  status: () => apiRequest('/etl/status'),
  refreshViews: () => apiRequest('/etl/refresh-views', { method: 'POST' }),
};

export const charts = {
waterfall: (portfolioId?: number) => apiRequest(`/charts/waterfall${portfolioId ? `?portfolio_id=${portfolioId}` : ''}`),
  tornado: (portfolioId?: number) => apiRequest(`/charts/tornado${portfolioId ? `?portfolio_id=${portfolioId}` : ''}`),
  bubble: (portfolioId?: number) => apiRequest(`/charts/bubble${portfolioId ? `?portfolio_id=${portfolioId}` : ''}`),
  heatmap: (portfolioId?: number) => apiRequest(`/charts/heatmap${portfolioId ? `?portfolio_id=${portfolioId}` : ''}`),
};
export const olap = {
  overview: () => apiRequest('/analytics/olap/overview'),
  breakdown: (dimension: string) => apiRequest(`/analytics/olap/breakdown?dimension=${encodeURIComponent(dimension)}`),
  timeSeries: (granularity: string) => apiRequest(`/analytics/olap/time-series?granularity=${encodeURIComponent(granularity)}`),
  drillDown: (dimension: string, value: string, subDimension: string) => apiRequest(`/analytics/olap/drill-down?dimension=${encodeURIComponent(dimension)}&value=${encodeURIComponent(value)}&sub_dimension=${encodeURIComponent(subDimension)}`),
  crossTab: (rowDim: string, colDim: string) => apiRequest(`/analytics/olap/cross-tab?row_dim=${encodeURIComponent(rowDim)}&col_dim=${encodeURIComponent(colDim)}`),
  kpi: () => apiRequest('/analytics/olap/kpi'),
  compare: (dimension: string, items: string) => apiRequest(`/analytics/olap/compare?dimension=${encodeURIComponent(dimension)}&items=${encodeURIComponent(items)}`),
  heatmap: (xDim: string, yDim: string) => apiRequest(`/analytics/olap/heatmap?x_dim=${encodeURIComponent(xDim)}&y_dim=${encodeURIComponent(yDim)}`),
  etlBalance: (orgId?: number) => apiRequest(`/analytics/olap/etl-balance${orgId ? `?org_id=${orgId}` : ''}`, { method: 'POST' }),
  cacheStats: () => apiRequest('/analytics/olap/cache/stats'),
  cacheClear: () => apiRequest('/analytics/olap/cache/clear', { method: 'POST' }),
  cacheInvalidate: () => apiRequest('/analytics/olap/cache/invalidate', { method: 'POST' }),
};
export const cpiData = {
  current: () => apiRequest('/cpi-uz/current'),
  historical: () => apiRequest('/cpi-uz/historical'),
  forecast: () => apiRequest('/cpi-uz/forecast'),
};

export const stockExchange = {
  overview: () => apiRequest('/stock-exchange/overview'),
  stocks: () => apiRequest('/stock-exchange/stocks'),
  trades: () => apiRequest('/stock-exchange/trades'),
  orderBook: (ticker: string) => apiRequest(`/stock-exchange/order-book/${encodeURIComponent(ticker)}`),
};

export const calculatorPro = {
  calculate: (data: unknown) => apiRequest('/calculator/calculate', { method: 'POST', body: JSON.stringify(data) }),
  templates: () => apiRequest('/calculator/templates'),
  history: () => apiRequest('/calculator/history'),
};

export const aiAnalytics = {
  insights: (id: number) => apiRequest(`/ai-analytics/insights/${id}`),
  predict: (data: unknown) => apiRequest('/ai-analytics/predict', { method: 'POST', body: JSON.stringify(data) }),
  summary: () => apiRequest('/ai-analytics/summary'),
};

export const aiGateway = {
  chat: (data: unknown) => apiRequest('/ai-gateway/chat', { method: 'POST', body: JSON.stringify(data) }),
  models: () => apiRequest('/ai-gateway/models'),
  history: () => apiRequest('/ai-gateway/history'),
};

export const architecturalPrinciples = {
  list: () => apiRequest('/architecture/principles'),
  get: (id: number) => apiRequest(`/architecture/principles/${id}`),
};

export const dataExchange = {
  formats: () => apiRequest('/data-exchange/formats'),
  export: (data: unknown) => apiRequest('/data-exchange/export', { method: 'POST', body: JSON.stringify(data) }),
  import: (data: unknown) => apiRequest('/data-exchange/import', { method: 'POST', body: JSON.stringify(data) }),
  history: () => apiRequest('/data-exchange/history'),
};

export const demo = {
  seed: () => apiRequest('/demo/seed', { method: 'POST' }),
  reset: () => apiRequest('/demo/reset', { method: 'POST' }),
  status: () => apiRequest('/demo/status'),
};

// === Islamic Finance API ===
export const islamicFinance = {
  screening: {
    run: (data: unknown) =>
      apiRequest('/islamic-finance/screening', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiRequest('/islamic-finance/screening'),
  },
  zakat: {
    calculate: (data: unknown) =>
      apiRequest('/islamic-finance/zakat', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiRequest('/islamic-finance/zakat'),
  },
  purification: {
    calculate: (data: unknown) =>
      apiRequest('/islamic-finance/purification', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiRequest('/islamic-finance/purification'),
  },
  products: {
    create: (data: unknown) =>
      apiRequest('/islamic-finance/products', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiRequest('/islamic-finance/products'),
  },
  posc: {
    create: (data: unknown) =>
      apiRequest('/islamic-finance/posc', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiRequest('/islamic-finance/posc'),
  },
  ssb: {
    createFatwa: (data: unknown) =>
      apiRequest('/islamic-finance/fatwas', { method: 'POST', body: JSON.stringify(data) }),
    listFatwas: () => apiRequest('/islamic-finance/fatwas'),
    listMembers: () => apiRequest('/islamic-finance/ssb-members'),
  },
  glossary: () => apiRequest('/islamic-finance/glossary'),
  haramIndustries: () => apiRequest('/islamic-finance/haram-industries'),
  p2p: {
    create: (data: unknown) =>
      apiRequest('/islamic-finance/p2p', { method: 'POST', body: JSON.stringify(data) }),
    list: () => apiRequest('/islamic-finance/p2p'),
  },
  nisab: () => apiRequest('/islamic-finance/nisab'),
  financialThresholds: () => apiRequest('/islamic-finance/financial-thresholds'),
  shariahIndices: () => apiRequest('/islamic-finance/shariah-indices'),
};
