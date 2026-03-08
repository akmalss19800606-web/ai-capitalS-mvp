const API_URL = '/api/v1';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  // If 401 and we have a refresh token, try to refresh
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

  // ─── Фаза 1, Сессия 2: Версионирование и аудит ────────────────────────────
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

  // ─── Фаза 1, Сессия 2: Граф связей ────────────────────────────────────────
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
