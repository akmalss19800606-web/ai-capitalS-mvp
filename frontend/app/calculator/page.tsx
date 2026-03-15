'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Calculator, BarChart2, GitCompare, Activity, Dice6,
  TrendingUp, Loader2, Download, RefreshCw, Plus, Trash2,
  ChevronDown, ChevronUp, Info, CheckCircle2, AlertCircle,
  ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'

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
]

// ─────────────────────────────────────────────────────────
// Вспомогательные компоненты
// ─────────────────────────────────────────────────────────

const MetricCard = ({ label, value, sub, trend, color = 'blue' }: any) => (
  <div className={`bg-slate-800/60 border border-slate-700/50 rounded-xl p-4`}>
    <div className="text-slate-400 text-xs mb-1">{label}</div>
    <div className={`text-xl font-bold text-white`}>{value}</div>
    {sub && <div className={`text-xs mt-1 text-slate-400`}>{sub}</div>}
  </div>
)

const InputField = ({ label, value, onChange, type = 'number', min, max, step, suffix, hint, required }: any) => (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <div className="relative">
      <input type={type} value={value} min={min} max={max} step={step || 1}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500/60 transition-colors pr-12"
      />
      {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{suffix}</span>}
    </div>
    {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
  </div>
)

function formatMoney(val: number | null | undefined, currency = 'USD'): string {
  if (val === null || val === undefined) return 'N/A'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `\${sign}\${currency === 'USD' ? '$' : ''}\${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `\${sign}\${currency === 'USD' ? '$' : ''}\${(abs / 1_000).toFixed(1)}K`
  return `\${sign}\${currency === 'USD' ? '$' : ''}\${abs.toFixed(2)}`
}

function npvColor(npv: number): string {
  if (npv > 0) return 'text-emerald-400'
  if (npv < 0) return 'text-red-400'
  return 'text-slate-400'
}

// ─────────────────────────────────────────────────────────
// Главный компонент
// ─────────────────────────────────────────────────────────

export default function CalculatorProPage() {
  const [activeTab, setActiveTab] = useState('dcf')
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
  const authHeader = () => ({ 'Authorization': `Bearer \${token()}`, 'Content-Type': 'application/json' })

  useEffect(() => {
    const load = async () => {
      const [bmRes, prRes, txRes] = await Promise.all([
        fetch('/api/v1/calculator/benchmarks', { headers: authHeader() }).then(r => r.json()).catch(() => ({})),
        fetch('/api/v1/calculator/presets').then(r => r.json()).catch(() => ({})),
        fetch('/api/v1/calculator/tax-rates').then(r => r.json()).catch(() => ({})),
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
      const res = await fetch('/api/v1/calculator/dcf', {
        method: 'POST', headers: authHeader(), body: JSON.stringify(body)
      })
      const data = await res.json()
      if (data.detail) throw new Error(data.detail)
      setDcfResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setDcfLoading(false) }
  }

  const calcCompare = async () => {
    setCompareLoading(true)
    try {
      const res = await fetch('/api/v1/calculator/compare', {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ projects: compareProjects, project_names: compareNames })
      })
      const data = await res.json()
      if (data.detail) throw new Error(data.detail)
      setCompareResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setCompareLoading(false) }
  }

  const calcSensitivity = async () => {
    setSensitLoading(true)
    try {
      const res = await fetch('/api/v1/calculator/sensitivity', {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ base_params: dcfParams, mode: sensitMode, variation_range_pct: 20 })
      })
      const data = await res.json()
      setSensitResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setSensitLoading(false) }
  }

  const calcMonteCarlo = async () => {
    setMcLoading(true)
    try {
      const res = await fetch('/api/v1/calculator/monte-carlo', {
        method: 'POST', headers: authHeader(),
        body: JSON.stringify({ base_params: dcfParams, n_simulations: nSimulations })
      })
      const data = await res.json()
      if (data.detail) throw new Error(data.detail)
      setMcResult(data)
    } catch (e: any) { setError('Ошибка: ' + e.message) }
    finally { setMcLoading(false) }
  }

  const downloadPdf = (calcId: string) => {
    window.open(`/api/v1/calculator/history/\${calcId}/pdf?token=\${token()}`, '_blank')
  }

  const applyPreset = (preset: any) => {
    setDcfParams({ ...DEFAULT_DCF, ...preset.prefilled })
  }

  // ─────────────────────────────────────────────────────────
  // Рендер
  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-violet-600 rounded-xl">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Investment Calculator</h1>
            <span className="px-2 py-0.5 bg-violet-600/20 text-violet-400 text-xs rounded-full font-medium border border-violet-500/30">PRO</span>
          </div>
          <p className="text-slate-400 ml-14">NPV • IRR • MIRR • WACC • Monte Carlo • Анализ чувствительности</p>
        </div>

        {/* Вкладки */}
        <div className="flex gap-1 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-1.5 mb-6 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap \${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
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
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                  <h3 className="text-white font-semibold text-sm mb-3">Быстрый старт</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {presets.map((p: any) => (
                      <button key={p.id} onClick={() => applyPreset(p)}
                        className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg text-xs text-left transition-colors border border-slate-600/30">
                        <div className="font-medium text-white">{p.name_ru}</div>
                        <div className="opacity-70">{p.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-semibold">Параметры инвестиции</h3>

                <div className="grid grid-cols-2 gap-3">
                  <InputField label="Начальные инвестиции" required value={dcfParams.initial_investment}
                    onChange={(v: number) => updateDcf('initial_investment', v)} />
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Валюта</label>
                    <select value={dcfParams.currency} onChange={e => updateDcf('currency', e.target.value)}
                      className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/60">
                      <option value="USD">USD</option><option value="UZS">UZS</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Горизонт: <span className="text-violet-400">{dcfParams.horizon_years} лет</span>
                  </label>
                  <input type="range" min={1} max={30} value={dcfParams.horizon_years}
                    onChange={e => updateDcf('horizon_years', Number(e.target.value))}
                    className="w-full accent-violet-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1 год</span><span>30 лет</span></div>
                </div>

                <InputField label="Ликвидационная стоимость" value={dcfParams.salvage_value}
                  onChange={(v: number) => updateDcf('salvage_value', v)}
                  hint="Стоимость активов в конце горизонта (0 = не учитывать)" />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-semibold">Денежные потоки (авто)</h3>

                <InputField label="Выручка год 1" value={dcfParams.revenue_year1}
                  onChange={(v: number) => updateDcf('revenue_year1', v)} />
                <InputField label="Рост выручки (%/год)" value={dcfParams.revenue_growth_rate}
                  onChange={(v: number) => updateDcf('revenue_growth_rate', v)}
                  min={-50} max={200} suffix="%" hint="Темп роста выручки год-к-году" />
                <InputField label="Операционная маржа" value={dcfParams.operating_margin}
                  onChange={(v: number) => updateDcf('operating_margin', v)}
                  min={-100} max={100} suffix="%" hint="(Выручка - Операционные затраты) / Выручка" />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-4">
                <h3 className="text-white font-semibold">Ставка дисконтирования</h3>

                <div className="flex gap-2">
                  {[{v:'manual',l:'Вручную'},{v:'wacc',l:'WACC'}].map(opt => (
                    <button key={opt.v} onClick={() => { updateDcf('discount_rate_mode', opt.v); setShowWacc(opt.v==='wacc') }}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all \${
                        dcfParams.discount_rate_mode === opt.v ? 'bg-violet-600 text-white' : 'bg-slate-700/50 text-slate-400'
                      }`}>{opt.l}</button>
                  ))}
                </div>

                {dcfParams.discount_rate_mode === 'manual' && (
                  <InputField label="Ставка дисконтирования" value={dcfParams.discount_rate}
                    onChange={(v: number) => updateDcf('discount_rate', v)}
                    min={1} max={100} suffix="%" hint="Ставка рефинансирования ЦБ: 14% | Средний кредит: 22.8%" />
                )}

                {dcfParams.discount_rate_mode === 'wacc' && (
                  <div className="space-y-3 border border-slate-600/50 rounded-xl p-3">
                    <h4 className="text-slate-300 text-xs font-semibold uppercase tracking-wide">Параметры WACC</h4>
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
                          <label className="text-xs text-slate-400 block mb-1">{item.l}</label>
                          <input type="number" value={(waccParams as any)[item.f]}
                            step={item.step || 0.1} min={item.min} max={item.max}
                            onChange={e => updateWacc(item.f, Number(e.target.value))}
                            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
                          />
                          {item.hint && <p className="text-xs text-slate-500">{item.hint}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-2 text-xs text-violet-300">
                      Re = Rf + β×ERP + CRP + SCP | WACC = E%×Re + D%×Rd×(1-T)
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Налоговый режим</label>
                  <select value={dcfParams.tax_regime} onChange={e => updateDcf('tax_regime', e.target.value)}
                    className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-2.5 text-white focus:outline-none">
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
                          {error && <div className="mt-3 p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300 text-sm">{error}</div>}
              {!dcfResult && !dcfLoading && (
                <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center">
                  <Calculator className="w-16 h-16 text-slate-600 mb-4" />
                  <h3 className="text-slate-400 text-lg">Введите параметры и нажмите «Рассчитать»</h3>
                  <p className="text-slate-500 text-sm mt-2">NPV, IRR, MIRR, Payback Period, PI, ROI</p>
                </div>
              )}

              {dcfLoading && (
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-12 text-center">
                  <Loader2 className="w-10 h-10 animate-spin text-violet-400 mx-auto mb-4" />
                  <p className="text-slate-400">Вычисление DCF модели...</p>
                </div>
              )}

              {dcfResult && !dcfLoading && (
                <div className="space-y-4">
                  {/* Основные метрики */}
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-white font-bold text-lg">Результаты DCF</h3>
                      <div className="flex gap-2">
                        <button onClick={() => downloadPdf(dcfResult.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 rounded-lg text-xs transition-colors">
                          <Download className="w-3 h-3" /> PDF
                        </button>
                        <button onClick={calcDCF}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 rounded-lg text-xs transition-colors">
                          <RefreshCw className="w-3 h-3" /> Пересчитать
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className={`bg-slate-900/60 rounded-xl p-4 \${dcfResult.npv >= 0 ? 'border border-emerald-500/30' : 'border border-red-500/30'}`}>
                        <div className="text-slate-400 text-xs mb-1">NPV</div>
                        <div className={`text-2xl font-bold \${npvColor(dcfResult.npv)}`}>
                          {formatMoney(dcfResult.npv, dcfResult.currency)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{dcfResult.npv >= 0 ? 'Проект добавляет стоимость' : 'Проект разрушает стоимость'}</div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4">
                        <div className="text-slate-400 text-xs mb-1">IRR</div>
                        <div className="text-2xl font-bold text-white">{dcfResult.irr ? `\${dcfResult.irr.toFixed(2)}%` : 'N/A'}</div>
                        <div className="text-xs text-slate-500 mt-1">Внутренняя норма доходности</div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4">
                        <div className="text-slate-400 text-xs mb-1">MIRR</div>
                        <div className="text-2xl font-bold text-white">{dcfResult.mirr ? `\${dcfResult.mirr.toFixed(2)}%` : 'N/A'}</div>
                        <div className="text-xs text-slate-500 mt-1">Модифицированная IRR</div>
                      </div>
                      <div className="bg-slate-900/60 border border-slate-700/30 rounded-xl p-4">
                        <div className="text-slate-400 text-xs mb-1">ROI</div>
                        <div className={`text-2xl font-bold \${(dcfResult.roi_pct || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {dcfResult.roi_pct ? `\${dcfResult.roi_pct.toFixed(1)}%` : 'N/A'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Return on Investment</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <div className="text-slate-400 text-xs">Срок окупаемости</div>
                        <div className="text-white font-bold mt-1">{dcfResult.payback_period ? `\${dcfResult.payback_period.toFixed(1)} лет` : 'N/A'}</div>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <div className="text-slate-400 text-xs">Диск. окупаемость</div>
                        <div className="text-white font-bold mt-1">{dcfResult.discounted_payback ? `\${dcfResult.discounted_payback.toFixed(1)} лет` : 'N/A'}</div>
                      </div>
                      <div className="bg-slate-900/60 rounded-xl p-3">
                        <div className="text-slate-400 text-xs">Индекс прибыльности</div>
                        <div className={`font-bold mt-1 \${(dcfResult.profitability_index || 0) >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {dcfResult.profitability_index ? dcfResult.profitability_index.toFixed(4) : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {dcfResult.tax_savings && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-300">
                        ✓ Экономия на налогах от СЭЗ: {formatMoney(dcfResult.tax_savings, dcfResult.currency)}
                      </div>
                    )}
                  </div>

                  {/* WACC breakdown */}
                  {dcfResult.wacc_breakdown && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
                      <h4 className="text-white font-semibold mb-3">WACC Breakdown</h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-900/60 rounded-xl p-3">
                          <div className="text-slate-400 text-xs">WACC</div>
                          <div className="text-violet-400 font-bold text-xl">{dcfResult.wacc_breakdown.wacc?.toFixed(2)}%</div>
                        </div>
                        <div className="bg-slate-900/60 rounded-xl p-3">
                          <div className="text-slate-400 text-xs">Re (собств.)</div>
                          <div className="text-white font-bold text-xl">{dcfResult.wacc_breakdown.cost_of_equity?.toFixed(2)}%</div>
                        </div>
                        <div className="bg-slate-900/60 rounded-xl p-3">
                          <div className="text-slate-400 text-xs">Rd×(1-T)</div>
                          <div className="text-white font-bold text-xl">{dcfResult.wacc_breakdown.after_tax_cost_of_debt?.toFixed(2)}%</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Таблица по годам */}
                  {dcfResult.yearly_breakdown?.length > 0 && (
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                      <h4 className="text-white font-semibold mb-4">Детализация по годам</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 text-xs border-b border-slate-700/50">
                              {['Год','Выручка','EBIT','Налоги','FCF','Диск. FCF','Нараст. DCF'].map(h => (
                                <th key={h} className="text-left pb-2 pr-4 whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {dcfResult.yearly_breakdown.map((yr: any) => (
                              <tr key={yr.year} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                                <td className="py-2 pr-4 text-slate-400">{yr.year}</td>
                                <td className="py-2 pr-4 text-white">{formatMoney(yr.revenue, dcfResult.currency)}</td>
                                <td className="py-2 pr-4">{formatMoney(yr.ebit, dcfResult.currency)}</td>
                                <td className="py-2 pr-4 text-red-400">{formatMoney(yr.taxes, dcfResult.currency)}</td>
                                <td className={`py-2 pr-4 font-medium \${yr.free_cash_flow >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {formatMoney(yr.free_cash_flow, dcfResult.currency)}
                                </td>
                                <td className={`py-2 pr-4 \${yr.discounted_cf >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                                  {formatMoney(yr.discounted_cf, dcfResult.currency)}
                                </td>
                                <td className={`py-2 pr-4 font-semibold \${yr.cumulative_dcf >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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
              <p className="text-slate-400 text-sm">Добавьте от 2 до 5 проектов для сравнения бок-о-бок</p>
              <button
                onClick={() => {
                  if (compareProjects.length < 5) {
                    setCompareProjects(prev => [...prev, { ...DEFAULT_DCF }])
                    setCompareNames(prev => [...prev, `Проект \${prev.length + 1}`])
                  }
                }}
                disabled={compareProjects.length >= 5}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" /> Добавить проект
              </button>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-\${compareProjects.length} gap-4`}>
              {compareProjects.map((proj, idx) => (
                <div key={idx} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input value={compareNames[idx]}
                      onChange={e => setCompareNames(prev => prev.map((n,i) => i===idx ? e.target.value : n))}
                      className="bg-transparent text-white font-semibold text-sm w-32 outline-none border-b border-slate-600 focus:border-violet-500"
                    />
                    {idx >= 2 && (
                      <button onClick={() => {
                        setCompareProjects(prev => prev.filter((_,i) => i !== idx))
                        setCompareNames(prev => prev.filter((_,i) => i !== idx))
                      }} className="text-slate-500 hover:text-red-400 transition-colors">
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
                      <label className="text-xs text-slate-400 block mb-1">{item.l}</label>
                      <input type="number" value={(proj as any)[item.f]} min={item.min} max={item.max}
                        onChange={e => setCompareProjects(prev => prev.map((p,i) => i===idx ? {...p,[item.f]:Number(e.target.value)} : p))}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-violet-500/60"
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
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-white font-bold text-lg mb-4">Матрица сравнения</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700/50">
                        {['Проект','NPV','IRR','MIRR','Окупаемость','PI','ROI'].map(h => (
                          <th key={h} className="text-left pb-2 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareResult.projects?.map((p: any, i: number) => (
                        <tr key={i} className={`border-b border-slate-700/30 \${p.name === compareResult.best_npv ? 'bg-emerald-500/5' : ''}`}>
                          <td className="py-2 pr-4 font-medium text-white flex items-center gap-2">
                            {p.name === compareResult.best_npv && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                            {p.name}
                          </td>
                          <td className={`py-2 pr-4 font-semibold \${(p.npv||0)>=0?'text-emerald-400':'text-red-400'}`}>{formatMoney(p.npv)}</td>
                          <td className="py-2 pr-4 text-white">{p.irr?`\${p.irr.toFixed(2)}%`:'N/A'}</td>
                          <td className="py-2 pr-4 text-white">{p.mirr?`\${p.mirr.toFixed(2)}%`:'N/A'}</td>
                          <td className="py-2 pr-4 text-white">{p.payback_period?`\${p.payback_period.toFixed(1)}л`:'N/A'}</td>
                          <td className={`py-2 pr-4 \${(p.profitability_index||0)>=1?'text-emerald-400':'text-red-400'}`}>{p.profitability_index?.toFixed(3)||'N/A'}</td>
                          <td className={`py-2 pr-4 \${(p.roi_pct||0)>=0?'text-emerald-400':'text-red-400'}`}>{p.roi_pct?`\${p.roi_pct.toFixed(1)}%`:'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-3 text-sm">
                  <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30">
                    🏆 Лучший NPV: {compareResult.best_npv}
                  </div>
                  <div className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/30">
                    📈 Лучший IRR: {compareResult.best_irr}
                  </div>
                  <div className="px-3 py-1.5 bg-violet-500/10 text-violet-400 rounded-lg border border-violet-500/30">
                    ⏰ Быстрее окупается: {compareResult.best_payback}
                  </div>
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
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Настройки анализа</h3>
              <div className="flex gap-3 mb-4">
                {[{v:'tornado',l:'Торнадо'},{v:'spider',l:'Spider'},{v:'data_table',l:'Таблица 2D'}].map(opt => (
                  <button key={opt.v} onClick={() => setSensitMode(opt.v as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all \${sensitMode===opt.v?'bg-violet-600 text-white':'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'}`}>
                    {opt.l}
                  </button>
                ))}
              </div>
              <p className="text-slate-400 text-sm">Базовые параметры берутся из вкладки DCF/ROI</p>
              <button onClick={calcSensitivity} disabled={sensitLoading}
                className="mt-3 flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl font-medium transition-all">
                {sensitLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Рассчитать
              </button>
            </div>

            {sensitResult?.mode === 'tornado' && sensitResult.tornado && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4">Торнадо-диаграмма</h3>
                <p className="text-slate-400 text-sm mb-4">Базовый NPV: {formatMoney(sensitResult.base_npv)} | Варьируем ±20%</p>
                <div className="space-y-3">
                  {sensitResult.tornado.map((item: any) => {
                    const maxImpact = Math.max(...sensitResult.tornado.map((i: any) => i.impact))
                    const barWidth = (item.impact / maxImpact) * 100
                    const isPositive = item.high_npv > item.low_npv
                    return (
                      <div key={item.variable}>
                        <div className="flex justify-between text-xs text-slate-400 mb-1">
                          <span>{item.label}</span>
                          <span>Влияние: {formatMoney(item.impact)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-20 text-right text-xs text-red-400">{formatMoney(item.low_npv)}</div>
                          <div className="flex-1 h-6 bg-slate-700/50 rounded-lg overflow-hidden relative">
                            <div className="absolute inset-y-0 left-1/2 w-0.5 bg-slate-500" />
                            <div
                              className="absolute inset-y-0 bg-gradient-to-r from-violet-500 to-blue-500 rounded"
                              style={{
                                left: `\${50 - barWidth/2}%`,
                                width: `\${barWidth}%`,
                              }}
                            />
                          </div>
                          <div className="w-20 text-xs text-emerald-400">{formatMoney(item.high_npv)}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {sensitResult?.mode === 'spider' && sensitResult.spider && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4">Spider Chart (данные)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs border-b border-slate-700/50">
                        <th className="text-left pb-2 pr-4">Переменная</th>
                        {[-30,-20,-10,0,10,20,30].map(p => <th key={p} className="pb-2 pr-3">{p}%</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {[...new Set(sensitResult.spider.map((s: any) => s.variable))].map((varName: any) => {
                        const rows = sensitResult.spider.filter((s: any) => s.variable === varName)
                        return (
                          <tr key={varName} className="border-b border-slate-700/30">
                            <td className="py-2 pr-4 text-white">{varName}</td>
                            {[-30,-20,-10,0,10,20,30].map(p => {
                              const row = rows.find((r: any) => r.pct_change === p)
                              return (
                                <td key={p} className={`py-2 pr-3 text-center \${(row?.npv||0) >= sensitResult.base_npv ? 'text-emerald-400' : 'text-red-400'}`}>
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
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-white font-semibold mb-4">Параметры симуляции</h3>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Количество симуляций: <span className="text-violet-400">{nSimulations.toLocaleString()}</span>
                  </label>
                  <input type="range" min={1000} max={50000} step={1000} value={nSimulations}
                    onChange={e => setNSimulations(Number(e.target.value))}
                    className="w-full accent-violet-500" />
                  <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1,000</span><span>50,000</span></div>
                </div>
                <button onClick={calcMonteCarlo} disabled={mcLoading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-xl font-medium transition-all">
                  {mcLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Dice6 className="w-4 h-4" />}
                  Симуляция
                </button>
              </div>
              <p className="text-slate-500 text-xs mt-2">Случайные вариации: Выручка ±15%, Затраты ±10%, Ставка ±2%, Рост ±5% (Normal)</p>
            </div>

            {mcResult && (
              <div className="space-y-4">
                {/* Ключевые метрики */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    {l:'P(NPV>0)',v:`\${(mcResult.prob_positive*100).toFixed(1)}%`,c:mcResult.prob_positive>0.6?'text-emerald-400':'text-red-400'},
                    {l:'Ожид. NPV (P50)',v:formatMoney(mcResult.p50),c:mcResult.p50>=0?'text-emerald-400':'text-red-400'},
                    {l:'VaR 95%',v:formatMoney(mcResult.var_95),c:'text-amber-400'},
                    {l:'CVaR 95%',v:formatMoney(mcResult.cvar_95),c:'text-red-400'},
                  ].map(m => (
                    <div key={m.l} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
                      <div className="text-slate-400 text-xs mb-1">{m.l}</div>
                      <div className={`text-xl font-bold \${m.c}`}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Перцентили */}
                <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                  <h4 className="text-white font-semibold mb-4">Распределение NPV ({mcResult.n_simulations.toLocaleString()} симуляций)</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      {l:'P10 (пессимизм)',v:mcResult.p10,c:'text-red-400'},
                      {l:'P25',v:mcResult.p25,c:'text-orange-400'},
                      {l:'P50 (медиана)',v:mcResult.p50,c:'text-white'},
                      {l:'P75',v:mcResult.p75,c:'text-blue-400'},
                      {l:'P90 (оптимизм)',v:mcResult.p90,c:'text-emerald-400'},
                    ].map(p => (
                      <div key={p.l} className="text-center bg-slate-900/40 rounded-xl p-3">
                        <div className="text-slate-400 text-xs mb-2">{p.l}</div>
                        <div className={`font-bold text-lg \${p.c}`}>{formatMoney(p.v)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Интерпретация */}
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-300">
                    {mcResult.interpretation}
                  </div>

                  {/* Статистика */}
                  <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                    {[
                      {l:'Среднее',v:formatMoney(mcResult.mean_npv)},
                      {l:'Стд. отклонение',v:formatMoney(mcResult.std_npv)},
                      {l:'Min / Max',v:`\${formatMoney(mcResult.min_npv)} / \${formatMoney(mcResult.max_npv)}`},
                    ].map(s => (
                      <div key={s.l} className="bg-slate-900/40 rounded-lg px-3 py-2">
                        <div className="text-slate-500">{s.l}</div>
                        <div className="text-white font-medium mt-0.5">{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Вкладка 5: Бенчмарки Узбекистана */}
        {/* ══════════════════════════════════════════════ */}
        {activeTab === 'benchmarks' && (
          <div className="space-y-5">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-lg">Бенчмарки — Узбекистан 2026</h3>
                  <p className="text-slate-400 text-sm">Источники: ЦБ РУз, Минфин, uzse.uz, банки</p>
                </div>
                {dcfResult?.irr && (
                  <div className="bg-violet-600/20 border border-violet-500/30 rounded-xl px-4 py-2 text-center">
                    <div className="text-slate-400 text-xs">Ваш IRR</div>
                    <div className="text-violet-400 font-bold text-xl">{dcfResult.irr.toFixed(2)}%</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {benchmarks.map((bm: any) => {
                  const isBeaten = dcfResult?.irr && dcfResult.irr > bm.annual_return_pct
                  return (
                    <div key={bm.name} className={`flex items-center justify-between p-4 rounded-xl border transition-all \${
                      isBeaten ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/40 border-slate-700/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isBeaten
                          ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          : <div className={`w-3 h-3 rounded-full shrink-0 \${
                              bm.risk_level === 'minimal' ? 'bg-emerald-400' :
                              bm.risk_level === 'low' ? 'bg-blue-400' :
                              bm.risk_level === 'medium' ? 'bg-amber-400' : 'bg-red-400'
                            }`} />
                        }
                        <div>
                          <div className="text-white font-medium text-sm">{bm.name_ru}</div>
                          <div className="text-slate-500 text-xs">{bm.notes}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-xs text-slate-400">Риск</div>
                          <div className={`text-xs font-medium \${
                            bm.risk_level==='minimal'?'text-emerald-400':bm.risk_level==='low'?'text-blue-400':bm.risk_level==='medium'?'text-amber-400':'text-red-400'
                          }`}>{bm.risk_level}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-400">Ликвидность</div>
                          <div className="text-white text-xs">{bm.liquidity}</div>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <div className="text-2xl font-bold text-white">{bm.annual_return_pct}%</div>
                          <div className="text-xs text-slate-400">год</div>
                        </div>
                        {dcfResult?.irr && (
                          <div className={`text-sm font-semibold \${isBeaten ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isBeaten
                              ? `+\${(dcfResult.irr - bm.annual_return_pct).toFixed(1)}%`
                              : `-\${(bm.annual_return_pct - dcfResult.irr).toFixed(1)}%`
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
                <div className="mt-4 p-3 bg-slate-700/30 rounded-xl text-sm text-slate-400 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Рассчитайте IRR во вкладке DCF/ROI для сравнения с бенчмарками
                </div>
              )}
            </div>

            {/* Налоговые ставки */}
            {taxRates && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-4">Налоговые ставки Узбекистана 2026</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    {l:'КПН (стандарт)',v:`\${taxRates.cit_standard_pct}%`},
                    {l:'НДС',v:`\${taxRates.vat_pct}%`},
                    {l:'Упрощённый налог',v:`\${taxRates.turnover_tax_simplified_pct}%`},
                    {l:'НДФЛ',v:`\${taxRates.personal_income_tax_pct}%`},
                    {l:'Социальный налог',v:`\${taxRates.social_tax_pct}%`},
                    {l:'Налог на имущество',v:`\${taxRates.property_tax_pct}%`},
                  ].map(t => (
                    <div key={t.l} className="bg-slate-900/60 rounded-xl p-3 flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{t.l}</span>
                      <span className="text-white font-bold">{t.v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1">
                  {Object.entries(taxRates.sez_exemption || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="flex items-center gap-2 text-sm text-emerald-300">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      СЭЗ ({val.note}): освобождение от КПН на {val.years} лет
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-3">{taxRates.source}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
