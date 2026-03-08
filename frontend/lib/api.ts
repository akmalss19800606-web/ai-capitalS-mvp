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
          // Retry original request
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
  list: () => apiRequest('/portfolios/'),
  get: (id: number) => apiRequest(`/portfolios/${id}`),
  create: (data: { name: string; description?: string; total_value?: number }) =>
    apiRequest('/portfolios/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name?: string; description?: string; total_value?: number }) =>
    apiRequest(`/portfolios/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/portfolios/${id}`, { method: 'DELETE' }),
};

export const decisions = {
  byPortfolio: (portfolioId: number) => apiRequest(`/decisions/portfolio/${portfolioId}`),
  get: (id: number) => apiRequest(`/decisions/${id}`),
  create: (data: any) => apiRequest('/decisions/', { method: 'POST', body: JSON.stringify(data) }),
  updateStatus: (id: number, status: string) =>
    apiRequest(`/decisions/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  update: (id: number, data: any) =>
    apiRequest(`/decisions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/decisions/${id}`, { method: 'DELETE' }),
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
