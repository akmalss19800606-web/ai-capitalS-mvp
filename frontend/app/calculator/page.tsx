'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { 
  Calculator, BarChart2, GitCompare, Activity, Dice6,
  TrendingUp, Loader2, Download, RefreshCw, Plus, Trash2,
  ChevronDown, ChevronUp, Info, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus, Briefcase, Brain
} from 'lucide-react'
import { apiRequest } from '@/lib/api'
import { useSearchParams } from 'next/navigation'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'

// ─────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────

interface DCFParams {
  initial_investment: number; currency: string; horizon_years: number
  cash_flow_mode: 'auto' | 'manual'; revenue_year1: number
  revenue_growth_rate: number; operating_margin: number
  discount_rate_mode: 'manual' | 'wacc'; discount_rate: number
  tax_regime: string; sez_code: string; salvage_value: number
}

interface WACCParams {
  equity_weight: number; debt_weight: number; risk_free_rate: number
  beta: number; equity_risk_premium: number; country_risk_premium: number
  size_premium: number; cost_of_debt: number; tax_rate: number
}

// ── Business Case Types ──
interface BusinessCaseForm {
  projectname: string; industry: string; region: string; legalform: string
  projectstage: string; initialinvestmentmln: string; equitysharepct: string
  debtsharepct: string; interestratepct: string; discountratepct: string
  annualrevenuemln: string; annualcostsmln: string; revenuegrowthpct: string
  projectyears: string; taxratepct: string; risklevel: string
  marketcompetition: string; hasstatesupport: boolean; exportsharepct: string
  additionalnotes: string
}
interface BusinessCaseResult {
  status: string; projectname: string; industry: string; region: string
  npvmln: number; irrpct: number | null; profitabilityindex: number
  paybackyears: number | null; discountratepct: number
  initialinvestmentmln: number; projectyears: number
  isviable: boolean; recommendation: string; cashflows: number[]
}

// — XAI Analysis Types (matches backend /xai/analyze response) —
interface XAIFactor {
  key: string; name: string; weight: number; importance_pct: number
  impact: 'positive' | 'negative'; category: string
}
interface XAIConfidence {
  score: number; level: string; level_ru: string
  positive_factors_weight: number; negative_factors_weight: number
}
interface XAIRecommendation {
  action: string; action_code: 'invest' | 'consider' | 'avoid'
  explanation: string; top_positive_factors: string[]; top_negative_factors: string[]
}
interface XAIResult {
  factors: XAIFactor[]; categories: Record<string, { label: string; factors: XAIFactor[] }>
  confidence: XAIConfidence; recommendation: XAIRecommendation
  metadata: { sector: string; investment_amount: number; time_horizon_years: number; analysis_type: string; language: string; num_factors: number }
}

// — Constants: GICS Sectors, Industries, UZ Regions —
const GICS_SECTORS = [
  'Energy', 'Materials', 'Industrials', 'Consumer Discretionary',
  'Consumer Staples', 'Health Care', 'Financials',
  'Information Technology', 'Communication Services',
  'Utilities', 'Real Estate'
]

const INDUSTRIES = [
  'Oil & Gas', 'Mining', 'Construction', 'Manufacturing',
  'Retail', 'Banking', 'Insurance', 'Telecommunications',
  'Agriculture', 'Transport', 'IT Services', 'Pharmaceuticals',
  'Food & Beverage', 'Textiles', 'Tourism', 'Education'
]

const UZ_REGIONS = [
  'Tashkent', 'Tashkent region', 'Samarkand', 'Bukhara',
  'Fergana', 'Andijan', 'Namangan', 'Kashkadarya',
  'Surkhandarya', 'Khorezm', 'Navoi', 'Jizzakh',
  'Syrdarya', 'Karakalpakstan'
]
const DEFAULT_DCF: DCFParams = {
  initial_investment: 100000, currency: 'USD', horizon_years: 5,
  cash_flow_mode: 'auto', revenue_year1: 120000, revenue_growth_rate: 15,
  operating_margin: 20, discount_rate_mode: 'manual', discount_rate: 20,
  tax_regime: 'general', sez_code: '', salvage_value: 0,
}

const DEFAULT_WACC: WACCParams = {
  equity_weight: 0.7, debt_weight: 0.3, risk_free_rate: 4.3,
  beta: 1.0, equity_risk_premium: 5.5, country_risk_premium: 5.5,
  size_premium: 2.5, cost_of_debt: 22.8, tax_rate: 15.0,
}

const TABS = [
  { id: 'dcf', label: 'DCF / ROI', icon: Calculator, desc: 'NPV, IRR, Payback' },
  { id: 'compare', label: 'Сравнение', icon: GitCompare, desc: 'До 5 проектов' },
  { id: 'sensitivity', label: 'Чувствительность', icon: Activity, desc: 'Торнадо, Spider' },
  { id: 'montecarlo', label: 'Monte Carlo', icon: Dice6, desc: 'Вероятностный анализ' },
  { id: 'benchmarks', label: 'Бенчмарки УЗ', icon: BarChart2, desc: 'Альтернативы' },
    { id: 'cases', label: 'Бизнес-кейсы', icon: Briefcase, desc: 'Оценка проектов' },
  { id: 'xai', label: 'Объяснимость AI', icon: Brain, desc: 'XAI-анализ' },
]

// ─────────────────────────────────────────────────────────
// Вспомогательные компоненты
// ─────────────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, trend, color = 'blue' }: any) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-600' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-600' },
    red:     { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-600' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-600' },
    gray:    { bg: 'bg-gray-50',    border: 'border-gray-200',    text: 'text-gray-700',    badge: 'bg-gray-100 text-gray-500' },
  }
  const c = colorMap[color] || colorMap.blue
  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-4`}>
      <div className="text-gray-500 text-xs mb-1 font-medium">{label}</div>
      <div className={`text-xl font-bold ${c.text} flex items-center gap-1`}>
        {value}
        {trend === 'up' && <span className="text-emerald-500 text-sm">▲</span>}
        {trend === 'down' && <span className="text-red-500 text-sm">▼</span>}
        {trend === 'neutral' && <span className="text-gray-400 text-sm">—</span>}
      </div>
      {sub && <div className={`text-xs mt-1 ${c.badge} rounded px-1.5 py-0.5 inline-block`}>{sub}</div>}
    </div>
  )
}

const InputField = ({ label, value, onChange, type = 'number', min, max, step, suffix, hint, required }: any) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 mb-1.5">
      {label} {required && <span className="text-red-600">*</span>}
    </label>
    <div className="relative">
      <input type={type} value={value} min={min} max={max} step={step || 1}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-violet-500 transition-colors pr-12"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">{suffix}</span>}
    </div>
    {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
  </div>
)

function formatMoney(val: number | null | undefined, currency = 'USD'): string {
  if (val === null || val === undefined) return 'N/A'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}${currency === 'USD' ? '$' : ''}${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}${currency === 'USD' ? '$' : ''}${(abs / 1_000).toFixed(1)}K`
  return `${sign}${currency === 'USD' ? '$' : ''}${abs.toFixed(2)}`
}

function npvColor(npv: number): string {
  if (npv > 0) return 'text-emerald-600'
  if (npv < 0) return 'text-red-600'
  return 'text-gray-500'
}

// ─────────────────────────────────────────────────────────
// Главный компонент
// ─────────────────────────────────────────────────────────

function CalculatorProPageInner() {
  const sp = useSearchParams(); const [activeTab, setActiveTab] = useState(sp.get('tab') || 'dcf')
  const [dcfParams, setDcfParams] = useState<DCFParams>(DEFAULT_DCF)
  const [waccParams, setWaccParams] = useState<WACCParams>(DEFAULT_WACC)
  const [showWacc, setShowWacc] = useState(false)
  const [dcfResult, setDcfResult] = useState<any>(null)
  const [dcfLoading, setDcfLoading] = useState(false)
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [taxRates, setTaxRates] = useState<any>(null)
  const [compareProjects, setCompareProjects] = useState<DCFParams[]>([DEFAULT_DCF, DEFAULT_DCF])
  const [compareNames, setCompareNames] = useState(['Проект 1', 'Проект 2'])
  const [compareResult, setCompareResult] = useState<any>(null)
  const [compareLoading, setCompareLoading] = useState(false)
  const [sensitResult, setSensitResult] = useState<any>(null)
  const [sensitLoading, setSensitLoading] = useState(false)
  const [sensitMode, setSensitMode] = useState<'tornado' | 'spider' | 'data_table'>( 'tornado')
  const [mcResult, setMcResult] = useState<any>(null)
  const [mcLoading, setMcLoading] = useState(false)
                                             const [error, setError] = useState<string | null>(null)
  const [nSimulations, setNSimulations] = useState(10000)

  const token = () => typeof window !== 'undefined' ? localStorage.getItem('token') || localStorage.getItem('token') || '' : ''
  const authHeader = () => ({ 'Authorization': `Bearer ${token()}`, 'Content-Type': 'application/json' })

    // Business Cases state
  const [bcForm, setBcForm] = useState<BusinessCaseForm>({ projectname: '', industry: '', region: '', legalform: '', projectstage: '', initialinvestmentmln: '', equitysharepct: '', debtsharepct: '', interestratepct: '', discountratepct: '', annualrevenuemln: '', annualcostsmln: '', revenuegrowthpct: '', projectyears: '', taxratepct: '', risklevel: '', marketcompetition: '', hasstatesupport: false, exportsharepct: '', additionalnotes: '' })
  const [bcResult, setBcResult] = useState<any>(null)
  const [bcLoading, setBcLoading] = useState(false)
  // XAI state
    const [xaiForm, setXaiForm] = useState({ sector: 'general', investment_amount: 10000, time_horizon_years: 3, language: 'ru', analysis_type: 'investment' })
  const [xaiResult, setXaiResult] = useState<any>(null)
  const [xaiLoading, setXaiLoading] = useState(false)
  useEffect(() => {
    const load = async () => {
      const [bmRes, prRes, txRes] = await Promise.all([
        apiRequest('/calculator/benchmarks', { headers: authHeader() }).catch(() => ({})),
        apiRequest('/calculator/presets', { headers: authHeader() }).catch(() => ({})),
        apiRequest('/calculator/tax-rates', { headers: authHeader() }).catch(() => ({})),
      ])
      setBenchmarks(bmRes.benchmarks || [])
      setPresets(prRes.presets || [])
      setTaxRates(txRes)
    }
    load()
  }, [])

  const updateDcf = (field: keyof DCFParams, value: any) =>
    setDcfParams(prev => ({ ...prev, [field]: value }))

  const updateWacc = (field: keyof WACCParams, value: number) => {
    setWaccParams(prev => {
      const upd = { ...prev, [field]: value }
      if (field === 'equity_weight') upd.debt_weight = Math.round((1 - value) * 100) / 100
      if (field === 'debt_weight') upd.equity_weight = Math.round((1 - value) * 100) / 100
      return upd
    })
  }

  const calcDCF = async () => {
    setDcfLoading(true)
        setError(null)
    try {
      const body: any = {
        ...dcfParams,
        ...(dcfParams.discount_rate_mode === 'wacc' ? { wacc_params: waccParams } : {}),
        salvage_value: dcfParams.salvage_value || null,
      }
      const data = await apiRequest('/calculator/dcf', {
        method: 'POST', body: JSON.stringify(body)
      })
      
      if (data.detail) throw new Error(data.detail)
      setDcfResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setDcfLoading(false) }
  }

  const calcCompare = async () => {
    setCompareLoading(true)
    try {
      const data = await apiRequest('/calculator/compare', {
        method: 'POST',
        body: JSON.stringify({ projects: compareProjects, project_names: compareNames })
      })
      
      if (data.detail) throw new Error(data.detail)
      setCompareResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setCompareLoading(false) }
  }

  const calcSensitivity = async () => {
    setSensitLoading(true)
    try {
      const data = await apiRequest('/calculator/sensitivity', {
        method: 'POST',
        body: JSON.stringify({ base_params: dcfParams, mode: sensitMode, variation_range_pct: 20 })
      })
      
      setSensitResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setSensitLoading(false) }
  }

  const calcMonteCarlo = async () => {
    setMcLoading(true)
    try {
      const data = await apiRequest('/calculator/monte-carlo', {
        method: 'POST',
        body: JSON.stringify({ base_params: dcfParams, n_simulations: nSimulations })
      })
      
      if (data.detail) throw new Error(data.detail)
      setMcResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setMcLoading(false) }
  }

  const downloadPdf = (calcId: string) => {
    window.open(`/api/v1/calculator/history/${calcId}/pdf?token=${token()}`, '_blank')
  }

  const applyPreset = (preset: any) => {
    setDcfParams({ ...DEFAULT_DCF, ...preset.prefilled })
  }

    const submitBusinessCase = async () => {
          const required = ['projectname', 'industry', 'region', 'initialinvestmentmln', 'projectyears', 'discountratepct']
    const missing = required.filter(f => !(bcForm as any)[f])
    if (missing.length > 0) { setError('Заполните обязательные поля: ' + missing.join(', ')); return }
        const eq = Number(bcForm.equitysharepct) || 0; const db = Number(bcForm.debtsharepct) || 0
    if (eq && db && Math.abs(eq + db - 100) > 1) { setError('Доля собственного + заёмного капитала должны быть = 100%'); return }
    setBcLoading(true); setError(null)
    try {
      const data = await apiRequest('/business-cases/evaluate', { method: 'POST', body: JSON.stringify(bcForm) })
      if (data.detail) throw new Error(data.detail)
      setBcResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setBcLoading(false) }
  }

  const runXaiAnalysis = async () => {
    setXaiLoading(true); setError(null)
    try {
      const data = await apiRequest('/xai/analyze', { method: 'POST', body: JSON.stringify(xaiForm) })
      if (data.detail) throw new Error(data.detail)
      setXaiResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setXaiLoading(false) }
  }

  // ─────────────────────────────────────────────────────────
  // Рендер
  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Заголовок */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md border-b border-gray-100 -mx-6 px-6 pt-6 pb-4 mb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-600 rounded-xl">
              <Calculator className="w-6 h-6 text-gray-900" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Investment Calculator</h1>
            <span className="px-2 py-0.5 bg-violet-600/20 text-violet-400 text-xs rounded-full font-medium border border-violet-500/30">PRO</span>
          </div>
          <p className="text-gray-500 ml-14">NPV • IRR • MIRR • WACC • Monte Carlo • Анализ чувствительности</p>
        </div>

        {/* Вкладки */}
                <div className="flex gap-1 bg-white/40 border border-gray-200 rounded-2xl p-1.5 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span className="hidden md:inline text-xs opacity-70">{tab.desc}</span>
              </button>
            )
          })}
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* Вкладка 1: DCF / ROI */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'dcf' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Параметры */}
            <div className="lg:col-span-2 space-y-4">

              {/* Пресеты */}
              {presets.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <h3 className="text-gray-900 font-semibold text-sm mb-3">Быстрый старт</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p: any) => (
                      <button key={p.id} onClick={() => applyPreset(p)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs text-left transition-colors border border-gray-200">
                        <div className="font-medium text-gray-900">{p.name_ru}</div>
                        <div className="opacity-70">{p.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-gray-900 font-semibold">Параметры инвестиции</h3>

                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Начальные инвестиции" required value={dcfParams.initial_investment}
                    onChange={(v: number) => updateDcf('initial_investment', v)} />
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1.5">Валюта</label>
                    <select value={dcfParams.currency} onChange={e => updateDcf('currency', e.target.value)}
                      className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-violet-500/60">
                      <option value="USD">USD</option><option value="UZS">UZS</option>
                                          </select>
                     
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Горизонт: <span className="text-violet-400">{dcfParams.horizon_years} лет</span>
                  </label>
                  <input type="range" min={1} max={30} value={dcfParams.horizon_years}
                    onChange={e => updateDcf('horizon_years', Number(e.target.value))}
                    className="w-full accent-violet-500" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1 год</span><span>30 лет</span></div>
                </div>

                <InputField label="Ликвидационная стоимость" value={dcfParams.salvage_value}
                  onChange={(v: number) => updateDcf('salvage_value', v)}
                  hint="Стоимость активов в конце горизонта (0 = не учитывать)" />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-gray-900 font-semibold">Денежные потоки (авто)</h3>

                <InputField label="Выручка год 1" value={dcfParams.revenue_year1}
                  onChange={(v: number) => updateDcf('revenue_year1', v)} />
                <InputField label="Рост выручки (%/год)" value={dcfParams.revenue_growth_rate}
                  onChange={(v: number) => updateDcf('revenue_growth_rate', v)}
                  min={-50} max={200} suffix="%" hint="Темп роста выручки год-к-году" />
                <InputField label="Операционная маржа" value={dcfParams.operating_margin}
                  onChange={(v: number) => updateDcf('operating_margin', v)}
                  min={-100} max={100} suffix="%" hint="(Выручка - Операционные затраты) / Выручка" />
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-gray-900 font-semibold">Ставка дисконтирования</h3>

                <div className="flex gap-2">
                  {[{v:'manual',l:'Вручную'},{v:'wacc',l:'WACC'}].map(opt => (
                    <button key={opt.v} onClick={() => { updateDcf('discount_rate_mode', opt.v); setShowWacc(opt.v==='wacc') }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                        dcfParams.discount_rate_mode === opt.v ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>{opt.l}</button>
                  ))}
                </div>

                {dcfParams.discount_rate_mode === 'manual' && (
                  <InputField label="Ставка дисконтирования" value={dcfParams.discount_rate}
                    onChange={(v: number) => updateDcf('discount_rate', v)}
                    min={1} max={100} suffix="%" hint="Ставка рефинансирования ЦБ: 14% | Средний кредит: 22.8%" />
                )}

                {dcfParams.discount_rate_mode === 'wacc' && (
                  <div className="space-y-3 border border-gray-300 rounded-xl p-3">
                    <h4 className="text-gray-600 text-xs font-semibold uppercase tracking-wide">Параметры WACC</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {[
                        {f:'equity_weight',l:'Доля E',step:0.05,min:0.1,max:0.9},
                        {f:'debt_weight',l:'Доля D',step:0.05,min:0.1,max:0.9},
                        {f:'risk_free_rate',l:'Rf (%)',hint:'US 10Y Treasury'},
                        {f:'beta',l:'Бета',step:0.1,min:0.1,max:3},
                        {f:'equity_risk_premium',l:'ERP (%)'},
                        {f:'country_risk_premium',l:'CRP (%)',hint:'Страновая премия'},
                        {f:'size_premium',l:'SCP (%)',hint:'Премия за размер'},
                        {f:'cost_of_debt',l:'Rd (%)',hint:'Ставка кредита'},
                        {f:'tax_rate',l:'T — КПН (%)'},
                      ].map((item: any) => (
                        <div key={item.f}>
                          <label className="text-xs text-gray-500 block mb-1">{item.l}</label>
                          <input type="number" value={(waccParams as any)[item.f]}
                            step={item.step || 0.1} min={item.min} max={item.max}
                            onChange={e => updateWacc(item.f, Number(e.target.value))}
                            className="w-full bg-white/80 border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 text-xs focus:outline-none"
                          />
                          {item.hint && <p className="text-xs text-gray-400">{item.hint}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-2 text-xs text-violet-300">
                      Re = Rf + β×ERP + CRP + SCP | WACC = E%×Re + D%×Rd×(1-T)
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">Налоговый режим</label>
                  <select value={dcfParams.tax_regime} onChange={e => updateDcf('tax_regime', e.target.value)}
                    className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none">
                    <option value="general">Общий (КПН 15%)</option>
                    <option value="simplified">Упрощённый (4%)</option>
                    <option value="sez">СЭЗ (0%)</option>
                                        </select>
                   
                </div>
              </div>

              <button onClick={calcDCF} disabled={dcfLoading}
                className="w-full py-4 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-violet-500/25 flex items-center justify-center gap-3">
                {dcfLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Calculator className="w-5 h-5" />}
                {dcfLoading ? 'Вычисление...' : 'Рассчитать'}
              </button>
            </div>

            {/* Результаты */}
            <div className="lg:col-span-3">
                          {error && <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-500 text-sm">{error}</div>}
              {!dcfResult && !dcfLoading && (
                <div className="bg-white/40 border border-gray-200 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                  <Calculator className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-gray-500 text-lg">Введите параметры и нажмите «Рассчитать»</h3>
                  <p className="text-gray-400 text-sm mt-2">NPV, IRR, MIRR, Payback Period, PI, ROI</p>
                </div>
              )}

              {dcfLoading && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto mb-4" />
                  <p className="text-gray-500">Вычисление DCF модели...</p>
                </div>
              )}

              {dcfResult && !dcfLoading && (
                <div className="space-y-4">
                  {/* Основные метрики */}
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-gray-900 font-bold text-lg">Результаты DCF</h3>
                      <div className="flex gap-2">
                        <button onClick={() => downloadPdf(dcfResult.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs transition-colors">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                        <button onClick={calcDCF}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs transition-colors">
                          <RefreshCw className="w-3 h-3" /> Пересчитать
                        </button>
                      </div>
                    </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <MetricCard
                label="NPV"
                value={formatMoney(dcfResult.npv, dcfResult.currency)}
                sub={dcfResult.npv >= 0 ? 'Проект добавляет стоимость' : 'Проект разрушает стоимость'}
                color={dcfResult.npv >= 0 ? 'emerald' : 'red'}
                trend={dcfResult.npv >= 0 ? 'up' : 'down'}
              />
              <MetricCard
                label="IRR"
                value={dcfResult.irr ? `${dcfResult.irr.toFixed(2)}%` : 'N/A'}
                sub="Внутр. норма доходности"
                color={dcfResult.irr && dcfResult.irr > dcfResult.discount_rate ? 'emerald' : 'amber'}
              />
              <MetricCard
                label="MIRR"
                value={dcfResult.mirr ? `${dcfResult.mirr.toFixed(2)}%` : 'N/A'}
                sub="Модифицированная IRR"
                color="blue"
              />
              <MetricCard
                label="ROI"
                value={dcfResult.roi_pct ? `${dcfResult.roi_pct.toFixed(1)}%` : 'N/A'}
                sub="Return on Investment"
                color={dcfResult.roi_pct && dcfResult.roi_pct >= 0 ? 'emerald' : 'red'}
                trend={dcfResult.roi_pct && dcfResult.roi_pct >= 0 ? 'up' : 'down'}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricCard
                label="Срок окупаемости"
                value={dcfResult.payback_period ? `${dcfResult.payback_period.toFixed(1)} лет` : 'N/A'}
                color="amber"
              />
              <MetricCard
                label="Диск. окупаемость"
                value={dcfResult.discounted_payback ? `${dcfResult.discounted_payback.toFixed(1)} лет` : 'N/A'}
                color="amber"
              />
              <MetricCard
                label="Индекс прибыльности"
                value={dcfResult.profitability_index ? dcfResult.profitability_index.toFixed(4) : 'N/A'}
                sub={dcfResult.profitability_index >= 1 ? 'PI ≥ 1 (эффективен)' : 'PI < 1 (неэффективен)'}
                color={dcfResult.profitability_index >= 1 ? 'emerald' : 'red'}
              />
            </div>

                    {dcfResult.tax_savings && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-sm text-emerald-600">
                        ✓ Экономия на налогах от СЭЗ: {formatMoney(dcfResult.tax_savings, dcfResult.currency)}
                      </div>
                    )}
                  </div>

                  {/* WACC breakdown */}
                  {dcfResult.wacc_breakdown && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                      <h4 className="text-gray-900 font-semibold mb-3">WACC Breakdown</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white/80 rounded-xl p-3">
                          <div className="text-gray-500 text-xs">WACC</div>
                          <div className="text-violet-400 font-bold text-xl">{dcfResult.wacc_breakdown.wacc?.toFixed(2)}%</div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3">
                          <div className="text-gray-500 text-xs">Re (собств.)</div>
                          <div className="text-gray-900 font-bold text-xl">{dcfResult.wacc_breakdown.cost_of_equity?.toFixed(2)}%</div>
                        </div>
                        <div className="bg-white/80 rounded-xl p-3">
                          <div className="text-gray-500 text-xs">Rd×(1-T)</div>
                          <div className="text-gray-900 font-bold text-xl">{dcfResult.wacc_breakdown.after_tax_cost_of_debt?.toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Таблица по годам */}
                  {dcfResult.yearly_breakdown?.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                      <h4 className="text-gray-900 font-semibold mb-4">Детализация по годам</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-500 text-xs border-b-2 border-gray-200 sticky top-0 z-10 bg-white">
                              {['Год','Выручка','EBIT','Налоги','FCF','Диск. FCF','Нараст. DCF'].map(h => (
                                <th key={h} className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dcfResult.yearly_breakdown.map((yr: any) => (
                              <tr key={yr.year} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                                <td className="py-2 pr-4 text-gray-500">{yr.year}</td>
                                <td className="py-2 pr-4 text-gray-900">{formatMoney(yr.revenue, dcfResult.currency)}</td>
                                <td className="py-2 pr-4">{formatMoney(yr.ebit, dcfResult.currency)}</td>
                                <td className="py-2 pr-4 text-red-600">{formatMoney(yr.taxes, dcfResult.currency)}</td>
                                <td className={`py-2 pr-4 font-medium ${yr.free_cash_flow >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatMoney(yr.free_cash_flow, dcfResult.currency)}
                                </td>
                                <td className={`py-2 pr-4 ${yr.discounted_cf >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {formatMoney(yr.discounted_cf, dcfResult.currency)}
                                </td>
                                <td className={`py-2 pr-4 font-semibold ${yr.cumulative_dcf >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {formatMoney(yr.cumulative_dcf, dcfResult.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Вкладка 2: Сравнение проектов */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-500 text-sm">Добавьте от 2 до 5 проектов для сравнения бок-о-бок</p>
              <button
                onClick={() => {
                  if (compareProjects.length < 5) {
                    setCompareProjects(prev => [...prev, { ...DEFAULT_DCF }])
                    setCompareNames(prev => [...prev, `Проект ${prev.length + 1}`])
                  }
                }}
                disabled={compareProjects.length >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Добавить проект
              </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-${compareProjects.length} gap-4`}>
              {compareProjects.map((proj, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input value={compareNames[idx]}
                      onChange={e => setCompareNames(prev => prev.map((n,i) => i===idx ? e.target.value : n))}
                      className="bg-transparent text-gray-900 font-semibold text-sm w-32 outline-none border-b border-gray-300 focus:border-violet-500"
                    />
                    {idx >= 2 && (
                      <button onClick={() => {
                        setCompareProjects(prev => prev.filter((_,i) => i !== idx))
                        setCompareNames(prev => prev.filter((_,i) => i !== idx))
                      }} className="text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {[
                    {f:'initial_investment',l:'Инвестиции ($)'},
                    {f:'horizon_years',l:'Горизонт (лет)',min:1,max:30},
                    {f:'revenue_year1',l:'Выручка год 1'},
                    {f:'revenue_growth_rate',l:'Рост выручки (%)'},
                    {f:'operating_margin',l:'Маржа (%)'},
                    {f:'discount_rate',l:'Ставка дисконт. (%)'},
                  ].map(item => (
                    <div key={item.f}>
                      <label className="text-xs text-gray-500 block mb-1">{item.l}</label>
                      <input type="number" value={(proj as any)[item.f]} min={item.min} max={item.max}
                        onChange={e => setCompareProjects(prev => prev.map((p,i) => i===idx ? {...p,[item.f]:Number(e.target.value)} : p))}
                        className="w-full bg-white/80 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:border-violet-500/60"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <button onClick={calcCompare} disabled={compareLoading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 disabled:opacity-60 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2">
              {compareLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GitCompare className="w-5 h-5" />}
              Сравнить проекты
            </button>

            {compareResult && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-gray-900 font-bold text-lg">Матрица сравнения</h3>
                    <button onClick={() => { const headers = ['Проект','NPV','IRR','MIRR','Окупаемость','PI','ROI']; const rows = compareResult.projects?.map((p: any) => [p.name, p.npv?.toFixed(0), p.irr ? p.irr.toFixed(2)+'%' : 'N/A', p.mirr ? p.mirr.toFixed(2)+'%' : 'N/A', p.payback_period ? p.payback_period.toFixed(1) : 'N/A', p.profitability_index?.toFixed(3) || 'N/A', p.roi_pct ? p.roi_pct.toFixed(1)+'%' : 'N/A'].join(',')); const csv = headers.join(',') + '\n' + (rows||[]).join('\n'); const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'compare_results.csv'; a.click() }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs transition-colors"><Download className="w-3.5 h-3.5" /> CSV</button>
                  </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b-2 border-gray-200 sticky top-0 z-10 bg-white">
                        {['Проект','NPV','IRR','MIRR','Окупаемость','PI','ROI'].map(h => (
                          <th key={h} className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.projects?.map((p: any, i: number) => (
                        <tr key={i} className={`border-b border-gray-200 hover:bg-violet-50/50 transition-colors ${p.name === compareResult.best_npv ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2 pr-4 font-medium text-gray-900 flex items-center gap-2">
                            {p.name === compareResult.best_npv && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            {p.name}
                          </td>
                          <td className={`py-2 pr-4 font-semibold ${(p.npv||0)>=0?'text-emerald-600':'text-red-600'}`}>{formatMoney(p.npv)}</td>
                          <td className="py-2 pr-4 text-gray-900">{p.irr?`${p.irr.toFixed(2)}%`:'N/A'}</td>
                          <td className="py-2 pr-4 text-gray-900">{p.mirr?`${p.mirr.toFixed(2)}%`:'N/A'}</td>
                          <td className="py-2 pr-4 text-gray-900">{p.payback_period?`${p.payback_period.toFixed(1)}л`:'N/A'}</td>
                          <td className={`py-2 pr-4 ${(p.profitability_index||0)>=1?'text-emerald-600':'text-red-600'}`}>{p.profitability_index?.toFixed(3)||'N/A'}</td>
                          <td className={`py-2 pr-4 ${(p.roi_pct||0)>=0?'text-emerald-600':'text-red-600'}`}>{p.roi_pct?`${p.roi_pct.toFixed(1)}%`:'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                                  {compareResult.projects?.length > 0 && (
                    <div className="mt-4 h-64">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">NPV сравнение</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={compareResult.projects.map((p: any) => ({ name: p.name, NPV: p.npv || 0, IRR: p.irr || 0 }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" className="text-xs" />
                          <YAxis />
                          <Tooltip formatter={(val: any) => formatMoney(val)} />
                          <Legend />
                          <Bar dataKey="NPV" fill="#8b5cf6" radius={[4,4,0,0]}>
                            {compareResult.projects.map((p: any, i: number) => (
                              <Cell key={i} fill={(p.npv || 0) >= 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <MetricCard label="Лучший NPV" value={compareResult.best_npv || 'N/A'} color="emerald" />
                  <MetricCard label="Лучший IRR" value={compareResult.best_irr || 'N/A'} color="blue" />
                  <MetricCard label="Быстрее окупается" value={compareResult.best_payback || 'N/A'} color="violet" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Вкладка 3: Анализ чувствительности */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'sensitivity' && (
          <div className="space-y-5">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="text-gray-900 font-semibold mb-4">Настройки анализа</h3>
              <div className="flex gap-3 mb-4">
                {[{v:'tornado',l:'Торнадо'},{v:'spider',l:'Spider'},{v:'data_table',l:'Таблица 2D'}].map(opt => (
                  <button key={opt.v} onClick={() => setSensitMode(opt.v as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${sensitMode===opt.v?'bg-violet-600 text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <p className="text-gray-500 text-sm">Базовые параметры берутся из вкладки DCF/ROI</p>
              <button onClick={calcSensitivity} disabled={sensitLoading}
                className="mt-3 flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl font-medium transition-all">
                {sensitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Рассчитать
              </button>
            </div>

            {sensitResult?.mode === 'tornado' && sensitResult.tornado && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="text-gray-900 font-bold mb-4">Торнадо-диаграмма</h3>
                <p className="text-gray-500 text-sm mb-4">Базовый NPV: {formatMoney(sensitResult.base_npv)} | Варьируем ±20%</p>
                <div className="space-y-3">
                  {sensitResult.tornado.map((item: any) => {
                    const maxImpact = Math.max(...sensitResult.tornado.map((i: any) => i.impact))
                    const barWidth = (item.impact / maxImpact) * 100
                    const isPositive = item.high_npv > item.low_npv
                    return (
                      <div key={item.variable}>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{item.label}</span>
                          <span>Влияние: {formatMoney(item.impact)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 text-right text-xs text-red-600">{formatMoney(item.low_npv)}</div>
                          <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gray-300" />
                            <div
                                                className={`h-full bg-gradient-to-r ${isPositive ? 'from-emerald-500 to-emerald-400' : 'from-red-500 to-red-400'} rounded transition-all`}
                              style={{
                                left: `${50 - barWidth/2}%`,
                                width: `${barWidth}%`,
                              }}
                            />
                          </div>
                          <div className="w-20 text-xs text-emerald-600">{formatMoney(item.high_npv)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {sensitResult?.mode === 'spider' && sensitResult.spider && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="text-gray-900 font-bold mb-4">Spider Chart (данные)</h3>
                                    {(() => {
                      const variables = [...new Set(sensitResult.spider.map((s: any) => s.variable))]
                      const pcts = [-20, -10, 0, 10, 20]
                      const radarData = variables.map((v: any) => {
                        const row: any = { variable: v }
                        pcts.forEach(p => {
                          const found = sensitResult.spider.find((s: any) => s.variable === v && s.pct_change === p)
                          row[`${p}%`] = found ? found.npv : 0
                        })
                        return row
                      })
                      const colors = ['#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']
                      return (
                        <div className="mb-6 h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={radarData}>
                              <PolarGrid />
                              <PolarAngleAxis dataKey="variable" className="text-xs" />
                              <PolarRadiusAxis />
                              {pcts.map((p, i) => (
                                <Radar key={p} name={`${p}%`} dataKey={`${p}%`} stroke={colors[i]} fill={colors[i]} fillOpacity={p === 0 ? 0.3 : 0.05} strokeWidth={p === 0 ? 2 : 1} />
                              ))}
                              <Legend />
                              <Tooltip formatter={(val: any) => formatMoney(val)} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      )
                    })()}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-500 text-xs border-b-2 border-gray-200 sticky top-0 z-10 bg-white">
                        <th className="text-left py-3 px-4 font-semibold uppercase tracking-wider text-[11px]">Переменная</th>
                        {[-30,-20,-10,0,10,20,30].map(p => <th key={p} className="pb-2 pr-3">{p}%</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...new Set(sensitResult.spider.map((s: any) => s.variable))].map((varName: any) => {
                        const rows = sensitResult.spider.filter((s: any) => s.variable === varName)
                        return (
                          <tr key={varName} className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
                            <td className="py-2 pr-4 text-gray-900">{varName}</td>
                            {[-30,-20,-10,0,10,20,30].map(p => {
                              const row = rows.find((r: any) => r.pct_change === p)
                              return (
                                <td key={p} className={`py-2 pr-3 text-center ${(row?.npv||0) >= sensitResult.base_npv ? 'text-emerald-600' : 'text-red-600'}`}>
                                  {row ? formatMoney(row.npv) : '—'}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Вкладка 4: Monte Carlo */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'montecarlo' && (
          <div className="space-y-5">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <h3 className="text-gray-900 font-semibold mb-4">Параметры симуляции</h3>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    Количество симуляций: <span className="text-violet-400">{nSimulations.toLocaleString()}</span>
                  </label>
                  <input type="range" min={1000} max={50000} step={1000} value={nSimulations}
                    onChange={e => setNSimulations(Number(e.target.value))}
                    className="w-full accent-violet-500" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1,000</span><span>50,000</span></div>
                </div>
                <button onClick={calcMonteCarlo} disabled={mcLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl font-medium transition-all">
                  {mcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dice6 className="w-4 h-4" />}
                  Симуляция
                </button>
              </div>
              <p className="text-gray-400 text-xs mt-2">Случайные вариации: Выручка ±15%, Затраты ±10%, Ставка ±2%, Рост ±5% (Normal)</p>
            </div>

            {mcResult && (
              <div className="space-y-4">
                {/* Ключевые метрики */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="P(NPV>0)"
            value={`${(mcResult.prob_positive*100).toFixed(1)}%`}
            sub={mcResult.prob_positive > 0.6 ? 'Риск приемлем' : 'Высокий риск'}
            color={mcResult.prob_positive > 0.6 ? 'emerald' : 'red'}
            trend={mcResult.prob_positive > 0.6 ? 'up' : 'down'}
          />
          <MetricCard
            label="Ожид. NPV (P50)"
            value={formatMoney(mcResult.p50)}
            sub="Медиана"
            color={mcResult.p50 >= 0 ? 'emerald' : 'red'}
            trend={mcResult.p50 >= 0 ? 'up' : 'down'}
          />
          <MetricCard
            label="VaR 95%"
            value={formatMoney(mcResult.var_95)}
            sub="Риск потерь"
            color="amber"
          />
          <MetricCard
            label="CVaR 95%"
            value={formatMoney(mcResult.cvar_95)}
            sub="Хвост потерь"
            color="red"
          />
        </div>

                {/* Перцентили */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                  <h4 className="text-gray-900 font-semibold mb-4">Распределение NPV ({mcResult.n_simulations.toLocaleString()} симуляций)</h4>
          <div className="grid grid-cols-5 gap-3">
            <MetricCard label="P10 (пессимизм)" value={formatMoney(mcResult.p10)} color="red" />
            <MetricCard label="P25" value={formatMoney(mcResult.p25)} color="amber" />
            <MetricCard label="P50 (медиана)" value={formatMoney(mcResult.p50)} color={mcResult.p50 >= 0 ? 'emerald' : 'red'} />
            <MetricCard label="P75" value={formatMoney(mcResult.p75)} color="blue" />
            <MetricCard label="P90 (оптимизм)" value={formatMoney(mcResult.p90)} color="emerald" />
          </div>
                  {/* Статистика */}
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    {[
                      {l:'Среднее',v:formatMoney(mcResult.mean_npv)},
                      {l:'Стд. отклонение',v:formatMoney(mcResult.std_npv)},
                      {l:'Min / Max',v:`${formatMoney(mcResult.min_npv)} / ${formatMoney(mcResult.max_npv)}`},
                    ].map(s => (
                      <div key={s.l} className="bg-gray-50/40 rounded-lg px-3 py-2">
                        <div className="text-gray-400">{s.l}</div>
                        <div className="text-gray-900 font-medium mt-0.5">{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
                            {mcResult.histogram && mcResult.histogram.length > 0 && (<div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-2xl"><h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">NPV Distribution ({mcResult.n_simulations?.toLocaleString()} runs)</h4><div className="flex items-end gap-px h-16">{mcResult.histogram.map((b: any, i: number) => { const mx = mcResult.histogram.reduce((a: number, x: any) => Math.max(a, x.count), 0); return <div key={i} className={`flex-1 rounded-sm transition-all ${b.lower_bound < 0 ? 'bg-red-300 hover:bg-red-400' : 'bg-emerald-400 hover:bg-emerald-500'}`} style={{height: mx > 0 ? `${Math.round(b.count / mx * 100)}%` : '0%'}} title={`${formatMoney(b.lower_bound)}: ${b.count}`} /> })}</div><div className="flex justify-between text-xs text-gray-400 mt-1"><span>{formatMoney(mcResult.min_npv)}</span><span>NPV</span><span>{formatMoney(mcResult.max_npv)}</span></div></div>)}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Вкладка 5: Бенчмарки Узбекистана */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-5">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">Бенчмарки — Узбекистан 2026</h3>
                  <p className="text-gray-500 text-sm">Источники: ЦБ РУз, Минфин, uzse.uz, банки</p>
                </div>
                {dcfResult?.irr && (
                  <div className="bg-violet-600/20 border border-violet-500/30 rounded-xl px-4 py-2 text-center">
                    <div className="text-gray-500 text-xs">Ваш IRR</div>
                    <div className="text-violet-400 font-bold text-xl">{dcfResult.irr.toFixed(2)}%</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {benchmarks.map((bm: any) => {
                  const isBeaten = dcfResult?.irr && dcfResult.irr > bm.annual_return_pct
                  return (
                    <div key={bm.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      isBeaten ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-gray-50/40 border-gray-200'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isBeaten
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          : <div className={`w-3 h-3 rounded-full shrink-0 ${
                              bm.risk_level === 'minimal' ? 'bg-emerald-400' :
                              bm.risk_level === 'low' ? 'bg-blue-400' :
                              bm.risk_level === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                            }`} />
                        }
                        <div>
                          <div className="text-gray-900 font-medium text-sm">{bm.name_ru}</div>
                          <div className="text-gray-400 text-xs">{bm.notes}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Риск</div>
                          <div className={`text-xs font-medium ${
                            bm.risk_level==='minimal'?'text-emerald-600':bm.risk_level==='low'?'text-blue-600':bm.risk_level==='medium'?'text-amber-600':'text-red-600'
                          }`}>{bm.risk_level}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-gray-500">Ликвидность</div>
                          <div className="text-gray-900 text-xs">{bm.liquidity}</div>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <div className="text-2xl font-bold text-gray-900">{bm.annual_return_pct}%</div>
                          <div className="text-xs text-gray-500">год</div>
                        </div>
                        {dcfResult?.irr && (
                          <div className={`text-sm font-semibold ${isBeaten ? 'text-emerald-600' : 'text-red-600'}`}>
                            {isBeaten
                              ? `+${(dcfResult.irr - bm.annual_return_pct).toFixed(1)}%`
                              : `-${(bm.annual_return_pct - dcfResult.irr).toFixed(1)}%`
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {dcfResult?.irr && (
                <div className="mt-4 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl text-sm text-violet-300">
                  Ваш проект (IRR {dcfResult.irr.toFixed(2)}%) превосходит {benchmarks.filter(b => dcfResult.irr > b.annual_return_pct).length} из {benchmarks.length} альтернатив
                </div>
              )}
              {!dcfResult?.irr && (
                <div className="mt-4 p-3 bg-gray-100/30 rounded-xl text-sm text-gray-500 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Рассчитайте IRR во вкладке DCF/ROI для сравнения с бенчмарками
                </div>
              )}
            </div>

            {/* Налоговые ставки */}
            {taxRates && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                <h3 className="text-gray-900 font-bold mb-4">Налоговые ставки Узбекистана 2026</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {l:'КПН (стандарт)',v:`${taxRates.cit_standard_pct}%`},
                    {l:'НДС',v:`${taxRates.vat_pct}%`},
                    {l:'Упрощённый налог',v:`${taxRates.turnover_tax_simplified_pct}%`},
                    {l:'НДФЛ',v:`${taxRates.personal_income_tax_pct}%`},
                    {l:'Социальный налог',v:`${taxRates.social_tax_pct}%`},
                    {l:'Налог на имущество',v:`${taxRates.property_tax_pct}%`},
                  ].map(t => (
                    <div key={t.l} className="bg-white/80 rounded-xl p-3 flex justify-between items-center">
                      <span className="text-gray-500 text-sm">{t.l}</span>
                      <span className="text-gray-900 font-bold">{t.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {Object.entries(taxRates.sez_exemption || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      СЭЗ ({val.note}): освобождение от КПН на {val.years} лет
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">{taxRates.source}</p>
              </div>
            )}
          </div>
        )}

              {/* ══════════════════════════════════════════════ */}
      {/* Вкладка 6: Бизнес-кейсы */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === 'cases' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h3 className="text-gray-900 font-bold mb-4">Оценка бизнес-кейса</h3>
              {/* Секция 1: Проект */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Проект</h4>
                <div className="space-y-3">
                  <InputField label="Название проекта" type="text" value={bcForm.projectname} onChange={(v: string) => setBcForm(p => ({...p, projectname: v}))} required />
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Отрасль</label><select value={bcForm.industry} onChange={e => setBcForm(p => ({...p, industry: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="">Выберите...</option>{INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Регион</label><select value={bcForm.region} onChange={e => setBcForm(p => ({...p, region: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="">Выберите...</option>{UZ_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Правовая форма</label><select value={bcForm.legalform} onChange={e => setBcForm(p => ({...p, legalform: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="">Выберите...</option>{['ООО','АО','ИП','СП','ГУП'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Стадия проекта</label><select value={bcForm.projectstage} onChange={e => setBcForm(p => ({...p, projectstage: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="">Выберите...</option>{['Идея','Стартап','Рост','Зрелость'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                </div>
              </div>
              {/* Секция 2: Финансы */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Финансы</h4>
                <div className="space-y-3">
                  <InputField label="Нач. инвестиции (млн)" type="text" value={bcForm.initialinvestmentmln} onChange={(v: string) => setBcForm(p => ({...p, initialinvestmentmln: v}))} />
                  <InputField label="Доля собств. капитала (%)" type="text" value={bcForm.equitysharepct} onChange={(v: string) => setBcForm(p => ({...p, equitysharepct: v}))} />
                  <InputField label="Доля заёмного (%)" type="text" value={bcForm.debtsharepct} onChange={(v: string) => setBcForm(p => ({...p, debtsharepct: v}))} />
                  <InputField label="Процент. ставка (%)" type="text" value={bcForm.interestratepct} onChange={(v: string) => setBcForm(p => ({...p, interestratepct: v}))} />
                  <InputField label="Ставка дисконт. (%)" type="text" value={bcForm.discountratepct} onChange={(v: string) => setBcForm(p => ({...p, discountratepct: v}))} />
                  <InputField label="Годовая выручка (млн)" type="text" value={bcForm.annualrevenuemln} onChange={(v: string) => setBcForm(p => ({...p, annualrevenuemln: v}))} />
                  <InputField label="Годовые затраты (млн)" type="text" value={bcForm.annualcostsmln} onChange={(v: string) => setBcForm(p => ({...p, annualcostsmln: v}))} />
                  <InputField label="Рост выручки (%)" type="text" value={bcForm.revenuegrowthpct} onChange={(v: string) => setBcForm(p => ({...p, revenuegrowthpct: v}))} />
                  <InputField label="Срок проекта (лет)" type="text" value={bcForm.projectyears} onChange={(v: string) => setBcForm(p => ({...p, projectyears: v}))} />
                  <InputField label="Ставка налога (%)" type="text" value={bcForm.taxratepct} onChange={(v: string) => setBcForm(p => ({...p, taxratepct: v}))} />
                </div>
              </div>
              {/* Секция 3: Риски */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Риски</h4>
                <div className="space-y-3">
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Уровень риска</label><select value={bcForm.risklevel} onChange={e => setBcForm(p => ({...p, risklevel: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="">Выберите...</option>{['Низкий','Средний','Высокий'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Конкуренция</label><select value={bcForm.marketcompetition} onChange={e => setBcForm(p => ({...p, marketcompetition: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="">Выберите...</option>{['Низкая','Средняя','Высокая'].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={bcForm.hasstatesupport} onChange={e => setBcForm(p => ({...p, hasstatesupport: e.target.checked}))} className="accent-violet-500" /><label className="text-sm text-gray-700">Гос. поддержка</label></div>
                  <InputField label="Доля экспорта (%)" type="text" value={bcForm.exportsharepct} onChange={(v: string) => setBcForm(p => ({...p, exportsharepct: v}))} />
                  <InputField label="Доп. заметки" type="text" value={bcForm.additionalnotes} onChange={(v: string) => setBcForm(p => ({...p, additionalnotes: v}))} />
                </div>
              </div>
              <button onClick={submitBusinessCase} disabled={bcLoading} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
                {bcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />} {bcLoading ? 'Оценка...' : 'Оценить кейс'}
              </button>            </div>
          <div>
            {!bcResult && !bcLoading && <div className="text-center text-gray-400 mt-12">Заполните форму и нажмите «Оценить кейс»</div>}
            {bcLoading && <div className="text-center mt-12"><Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" /></div>}
            {bcResult && !bcLoading && (
              <div className="bg-white border border-gray-200 rounded-2xl p-6">
                <h3 className="text-gray-900 font-bold mb-4">Результат оценки</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                  <MetricCard label="NPV (млн)" value={bcResult.npvmln ? `${bcResult.npvmln.toFixed(2)} млн` : 'N/A'} color={bcResult.npvmln > 0 ? 'emerald' : 'red'} />
                  <MetricCard label="IRR" value={bcResult.irrpct ? `${bcResult.irrpct.toFixed(1)}%` : 'N/A'} />
                  <MetricCard label="PI" value={bcResult.profitabilityindex ? bcResult.profitabilityindex.toFixed(2) : 'N/A'} color={bcResult.profitabilityindex >= 1 ? 'emerald' : 'red'} />
                  <MetricCard label="Окупаемость" value={bcResult.paybackyears ? `${bcResult.paybackyears.toFixed(1)} лет` : 'N/A'} />
                </div>
                {bcResult.recommendation && <div className={`p-4 rounded-xl ${bcResult.isviable ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className="text-sm font-medium text-gray-800">{bcResult.isviable ? '✅' : '❌'} {bcResult.recommendation}</p>
                                      {bcResult.cashflows && bcResult.cashflows.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Денежные потоки по годам</h4>
                        <div className="flex items-end gap-2 h-40">
                          {bcResult.cashflows.map((cf: number, i: number) => {
                            const maxCf = Math.max(...bcResult.cashflows.map((c: number) => Math.abs(c)))
                            const height = maxCf > 0 ? (Math.abs(cf) / maxCf) * 100 : 0
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center">
                                <span className="text-xs text-gray-500 mb-1">{cf >= 0 ? '+' : ''}{cf.toFixed(1)}</span>
                                <div className={`w-full rounded-t ${cf >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} style={{height: `${height}%`}} />
                                <span className="text-xs text-gray-400 mt-1">Г{i}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                </div>}
              </div>
              )}              </div>
        </div>
      )}

              {/* ══════════════════════════════════════════════ */}
      {/* Вкладка 7: Объяснимость AI */}
      {/* ══════════════════════════════════════════════ */}
      {activeTab === 'xai' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
              <h3 className="text-gray-900 font-bold mb-4">XAI Анализ</h3>
                              <div className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Сектор</label><select value={xaiForm.sector} onChange={e => setXaiForm(p => ({...p, sector: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="general">Общий</option><option value="agriculture">Сельское хозяйство</option><option value="food_processing">Пищевая пром.</option><option value="trade">Торговля</option><option value="construction">Строительство</option><option value="manufacturing">Производство</option><option value="it_services">IT услуги</option><option value="transport">Транспорт</option><option value="tourism">Туризм</option></select></div>
                  <InputField label="Сумма инвестиции ($)" value={xaiForm.investment_amount} onChange={(v: number) => setXaiForm(p => ({...p, investment_amount: v}))} min={100} max={10000000} suffix="$" />
                  <InputField label="Горизонт (лет)" value={xaiForm.time_horizon_years} onChange={(v: number) => setXaiForm(p => ({...p, time_horizon_years: v}))} min={1} max={30} suffix="лет" />
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Язык</label><select value={xaiForm.language} onChange={e => setXaiForm(p => ({...p, language: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="ru">Русский</option><option value="en">English</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-600 mb-1">Тип анализа</label><select value={xaiForm.analysis_type} onChange={e => setXaiForm(p => ({...p, analysis_type: e.target.value}))} className="w-full bg-white/80 border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900"><option value="investment">Инвестиционный</option><option value="risk">Риск-анализ</option><option value="sector">Секторный</option></select></div>
                </div>
              <button onClick={runXaiAnalysis} disabled={xaiLoading} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all">
                {xaiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />} {xaiLoading ? 'Анализ...' : 'Запустить XAI'}
              </button>            </div>
          <div>
            {!xaiResult && !xaiLoading && <div className="text-center text-gray-400 mt-12">Выберите модель и запустите анализ</div>}
            {xaiLoading && <div className="text-center mt-12"><Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto" /></div>}
                        {xaiResult && !xaiLoading && (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-6">
                <h3 className="text-gray-900 font-bold mb-4">Результат XAI</h3>
                {/* Recommendation */}
                <div className={`p-4 rounded-xl border ${xaiResult.recommendation?.action_code === 'invest' ? 'bg-emerald-50 border-emerald-200' : xaiResult.recommendation?.action_code === 'avoid' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-bold">{xaiResult.recommendation?.action}</span>
                    <span className="text-sm bg-white/80 px-3 py-1 rounded-full">Уверенность: {xaiResult.confidence?.score}% ({xaiResult.confidence?.level_ru})</span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{xaiResult.recommendation?.explanation}</p>
                </div>
                {/* Factors */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Факторы анализа</h4>
                  {xaiResult.factors?.map((f: any, i: number) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{f.name}</span>
                        <span className={f.impact === 'positive' ? 'text-emerald-600' : 'text-red-600'}>{f.importance_pct}% ({f.impact === 'positive' ? '+' : '-'})</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${f.impact === 'positive' ? 'bg-emerald-500' : 'bg-red-400'}`} style={{width: `${Math.min(f.importance_pct * 2, 100)}%`}} />
                      </div>
                    </div>
                  ))}
                </div>
                {/* Metadata */}
                <div className="text-xs text-gray-400 pt-2 border-t border-gray-200">
                  Сектор: {xaiResult.metadata?.sector} | Сумма: ${xaiResult.metadata?.investment_amount?.toLocaleString()} | Горизонт: {xaiResult.metadata?.time_horizon_years} лет | Факторов: {xaiResult.metadata?.num_factors}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </div>
  )
}

export default function CalculatorProPage() {
  return <Suspense fallback={<div className="text-center py-12">Loading...</div>}><CalculatorProPageInner /></Suspense>
}
