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
      const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
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

export const assets = {
  list: (portfolioId: number) => apiRequest(`/portfolios/${portfolioId}/assets`),
  create: (portfolioId: number, data: { ticker: string; name: string; quantity: number; avg_price: number; asset_type?: string }) =>
    apiRequest(`/portfolios/${portfolioId}/assets`, { method: 'POST', body: JSON.stringify(data) }),
  update: (portfolioId: number, assetId: number, data: { quantity?: number; avg_price?: number }) =>
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
  searchByInn: (inn: string) => apiRequest(`/dd/search?inn=${encodeURIComponent(inn)}`),
  getReport: (inn: string) => apiRequest(`/dd/report/${encodeURIComponent(inn)}`),
};

export const organizations = {
  list: () => apiRequest('/organizations'),
  get: (id: number) => apiRequest(`/organizations/${id}`),
  create: (data: unknown) =>
    apiRequest('/organizations', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: unknown) =>
    apiRequest(`/organizations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => apiRequest(`/organizations/${id}`, { method: 'DELETE' }),
  members: (id: number) => apiRequest(`/organizations/${id}/members`),
  addMember: (id: number, data: unknown) =>
    apiRequest(`/organizations/${id}/members`, { method: 'POST', body: JSON.stringify(data) }),
};
