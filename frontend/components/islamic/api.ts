const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// --- Types ---

export interface NisabData {
  nisab_gold_grams: number;
  gold_price_uzs: number;
  nisab_uzs: number;
  exchange_rate_uzs: number;
  nisab_usd: number;
  rate_date: string;
  source: string;
}

export interface ZakatAssetItem {
  category: string;
  amount_uzs: number;
}

export interface ZakatResult {
  calculation_date: string;
  assets_total_uzs: number;
  liabilities_uzs: number;
  net_assets_uzs: number;
  nisab_uzs: number;
  gold_price_uzs: number;
  exchange_rate_uzs: number;
  zakat_due_uzs: number;
  zakat_due_usd: number;
  is_zakat_due: boolean;
  explanation: string;
  record_id?: string;
}

export interface ZakatHistoryItem {
  id: string;
  calculation_date: string;
  zakat_type: string;
  assets_total_uzs: number;
  zakat_due_uzs: number;
  zakat_due_usd: number;
  is_zakat_due: boolean;
  created_at: string;
}

export interface CompanyItem {
  id: string;
  name_ru: string;
  name_en?: string;
  ticker?: string;
  market_type: string;
  sector?: string;
  is_active: boolean;
}

export interface ScreeningResult {
  id: string;
  company_name: string;
  score: number;
  status: "compliant" | "questionable" | "noncompliant" | "pending";
  violations?: Record<string, { value: number; threshold: number; label: string }>;
  standard_applied: string;
  analysis_date: string;
  recommendation: string;
  recommendations?: string[];
  haram_revenue_pct?: number;
  debt_ratio?: number;
  interest_income_pct?: number;
}

export interface GlossaryTerm {
  id: string;
  slug: string;
  term_ru: string;
  term_ar?: string;
  transliteration?: string;
  definition_ru: string;
  category: string;
  standard_ref?: string;
  standard_org?: string;
}

export interface ReferenceItem {
  id: string;
  registry_type: string;
  code: string;
  name_ru: string;
  name_en?: string;
  description_ru?: string;
  topic?: string;
}

export interface IslamicProfile {
  id: string;
  user_id: string;
  mode: "individual" | "professional";
  default_currency: string;
  language: string;
  jurisdiction: string;
}

export interface PurificationRequest {
  portfolio_id?: number;
  position_name: string;
  haram_pct: number;
  dividend_amount: number;
  method: string;
  notes?: string;
}

export interface PurificationResult {
  id: number;
  portfolio_id?: number;
  position_name: string;
  haram_pct: number;
  dividend_amount: number;
  purification_amount: number;
  method: string;
  notes?: string;
  created_at: string;
}

// --- API calls ---

export const islamicApi = {
  getNisab: () => get<NisabData>("/api/v1/islamic/zakat/nisab"),
  calculateZakat: (data: { zakat_type: string; assets: Record<string, string> | ZakatAssetItem[]; liabilities?: string | number; liabilities_uzs?: number; mode?: string }) =>
    post<ZakatResult>("/api/v1/islamic/zakat/calculate", data),
  getZakatHistory: () => get<ZakatHistoryItem[]>("/api/v1/islamic/zakat/history"),

  getCompanies: (search?: string, market_type?: string) => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (market_type) params.set("market_type", market_type);
    return get<CompanyItem[]>(`/api/v1/islamic/screening/companies?${params}`);
  },
  screenCompany: (data: { company_name?: string; company_id?: string; haram_revenue_pct?: number; debt_ratio?: number; interest_income_pct?: number; mode?: string }) =>
    post<ScreeningResult>("/api/v1/islamic/screening/screen", data),
  getScreeningResults: () => get<ScreeningResult[]>("/api/v1/islamic/screening/results"),

  calculatePurification: (data: PurificationRequest) =>
    post<PurificationResult>("/api/v1/islamic-finance/purification", data),
  getPurificationHistory: () => get<PurificationResult[]>("/api/v1/islamic-finance/purification"),

  getGlossary: (category?: string, search?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search) params.set("search", search);
    return get<GlossaryTerm[]>(`/api/v1/islamic/glossary?${params}`);
  },
  getGlossaryTerm: (slug: string) => get<GlossaryTerm>(`/api/v1/islamic/glossary/${slug}`),
  getStandards: (org?: string) => {
    const params = org ? `?org=${org}` : "";
    return get<ReferenceItem[]>(`/api/v1/islamic/references/standards${params}`);
  },
  getProfile: () => get<IslamicProfile>("/api/v1/islamic/profile"),
  updateProfile: (data: { mode: string; default_currency: string; language: string }) =>
    put<IslamicProfile>("/api/v1/islamic/profile", data),
};
