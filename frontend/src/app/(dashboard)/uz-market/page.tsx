'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, Search, ChevronRight, ChevronLeft, Sparkles, 
  MapPin, Building2, TrendingUp, ShieldCheck, Globe2,
  FileText, Loader2, CheckCircle2, AlertCircle, Download,
  Clock, Zap, ArrowRight, Info
} from 'lucide-react'
import { uzMarketApi } from '@/lib/api'

// ─────────────────────────────────────────────────────────
// Типы
// ─────────────────────────────────────────────────────────

interface MacroData {
  gdp_usd_bln: number; gdp_growth_pct: number; inflation_cpi_pct: number
  refinancing_rate_pct: number; avg_lending_rate_pct: number
  usd_uzs_rate: number; tsmi_index: number; gov_bond_3y_pct: number
}

interface OKEDSection { code: string; name_ru: string; divisions_count: number }
interface OKEDDivision { code: string; name_ru: string }
interface Region { code: string; name_ru: string; grp_share_pct: number; grp_growth_pct: number; grp_per_capita_usd: number }
interface SEZ { code: string; name_ru: string; cit_exemption_years_15m: number; specialization: string }

interface FormData {
  // Блок 1
  oked_section: string; oked_division: string; oked_class: string; activity_description: string
  // Блок 2
  investment_amount: number; investment_currency: 'USD' | 'UZS'
  investment_horizon_years: number; investment_type: string
  project_stage: string; funding_sources: string[]
  // Блок 3
  debt_ratio_pct: number; expected_loan_rate_pct: number
  expected_revenue_year1: number; expected_margin_pct: number
  // Блок 4
  region: string; city_district: string; sez_code: string; industrial_zone: string
  // Блок 5
  target_markets: string[]; expected_market_share_pct: number; competitors_range: string
  // Блок 6
  legal_form: string; tax_regime: string; planned_employees: number
  // Блок 7
  risk_profile: number; import_dependency_pct: number
}

const DEFAULT_FORM: FormData = {
  oked_section: '', oked_division: '', oked_class: '', activity_description: '',
  investment_amount: 50000, investment_currency: 'USD',
  investment_horizon_years: 5, investment_type: 'greenfield',
  project_stage: 'idea', funding_sources: ['own'],
  debt_ratio_pct: 30, expected_loan_rate_pct: 22.8,
  expected_revenue_year1: 0, expected_margin_pct: 15,
  region: 'tashkent_city', city_district: '', sez_code: '', industrial_zone: '',
  target_markets: ['domestic'], expected_market_share_pct: 5, competitors_range: '4-10',
  legal_form: 'ooo', tax_regime: 'general', planned_employees: 10,
  risk_profile: 5, import_dependency_pct: 30,
}

const STEPS = [
  { id: 1, title: 'Отрасль', icon: Building2, desc: 'ОКЭД классификатор' },
  { id: 2, title: 'Инвестиции', icon: TrendingUp, desc: 'Сумма, горизонт, тип' },
  { id: 3, title: 'Финансы', icon: BarChart3, desc: 'Структура капитала' },
  { id: 4, title: 'Локация', icon: MapPin, desc: 'Регион, СЭЗ' },
  { id: 5, title: 'Рынок', icon: Globe2, desc: 'Конкуренты, доля' },
  { id: 6, title: 'Организация', icon: ShieldCheck, desc: 'Форма, налоги' },
  { id: 7, title: 'Риски', icon: AlertCircle, desc: 'Профиль, зависимости' },
]

// ─────────────────────────────────────────────────────────
// Главный компонент
// ─────────────────────────────────────────────────────────

export default function UzMarketPage() {
  const [mode, setMode] = useState<'quick' | 'detailed'>( 'quick')
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(DEFAULT_FORM)
  const [quickQuestion, setQuickQuestion] = useState('')
  const [quickAnswer, setQuickAnswer] = useState('')
  const [quickLoading, setQuickLoading] = useState(false)
  const [macro, setMacro] = useState<MacroData | null>(null)
  const [okedSections, setOkedSections] = useState<OKEDSection[]>([])
  const [okedDivisions, setOkedDivisions] = useState<OKEDDivision[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [sezList, setSezList] = useState<SEZ[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [reportId, setReportId] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [pollTimer, setPollTimer] = useState<any>(null)

  // Загружаем справочники при монтировании
  useEffect(() => {
    const load = async () => {
      try {
        const [macroRes, okedRes, regRes, sezRes, tplRes] = await Promise.all([
          fetch('/api/v1/reference/macro').then(r => r.json()),
          fetch('/api/v1/reference/oked').then(r => r.json()),
          fetch('/api/v1/reference/regions').then(r => r.json()),
          fetch('/api/v1/reference/sez').then(r => r.json()),
          fetch('/api/v1/market-analysis/templates').then(r => r.json()),
        ])
        const ind = macroRes.indicators || []
        const m: any = {}
        ind.forEach((i: any) => { m[i.code] = i.value })
        setMacro({
          gdp_usd_bln: m.gdp, gdp_growth_pct: m.gdp_growth,
          inflation_cpi_pct: m.inflation, refinancing_rate_pct: m.refinancing_rate,
          avg_lending_rate_pct: m.avg_lending_rate, usd_uzs_rate: m.usd_uzs,
          tsmi_index: m.tsmi_index, gov_bond_3y_pct: m.gov_bond_3y,
        })
        setOkedSections(okedRes.sections || [])
        setRegions(regRes.regions || [])
        setSezList(sezRes.zones || [])
        setTemplates(tplRes.templates || [])
      } catch (e) { console.error('Ошибка загрузки справочников', e) }
    }
    load()
  }, [])

  // Загружаем разделы ОКЭД при выборе секции
  useEffect(() => {
    if (!form.oked_section) return
    fetch(\`/api/v1/reference/oked/\${form.oked_section}\`)
      .then(r => r.json())
      .then(data => setOkedDivisions(data.divisions || []))
      .catch(console.error)
  }, [form.oked_section])

  // Поллинг статуса отчёта
  useEffect(() => {
    if (!reportId) return
    const timer = setInterval(async () => {
      try {
        const res = await fetch(\`/api/v1/market-analysis/reports/\${reportId}\`, {
          headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
        })
        const data = await res.json()
        if (data.status === 'ready' || data.status === 'error') {
          setReport(data)
          setGenerating(false)
          clearInterval(timer)
        }
      } catch {}
    }, 2000)
    setPollTimer(timer)
    return () => clearInterval(timer)
  }, [reportId])

  const handleUpdate = (field: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleMultiSelect = (field: keyof FormData, value: string) => {
    const current = form[field] as string[]
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    handleUpdate(field, updated)
  }

  const applyTemplate = (tpl: any) => {
    setForm({ ...DEFAULT_FORM, ...tpl.prefilled })
    setMode('detailed')
    setStep(1)
  }

  const handleQuickAsk = async () => {
    if (!quickQuestion.trim()) return
    setQuickLoading(true); setQuickAnswer('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/v1/market-analysis/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({ question: quickQuestion, provider: 'groq' }),
      })
      const data = await res.json()
      setQuickAnswer(data.answer || data.detail || 'Ошибка получения ответа')
    } catch (e: any) {
      setQuickAnswer('Ошибка: ' + e.message)
    } finally { setQuickLoading(false) }
  }

  const handleGenerate = async () => {
    if (!form.oked_section || !form.oked_division) {
      alert('Выберите секцию и раздел ОКЭД (шаг 1)'); return
    }
    if (!form.investment_amount || form.investment_amount < 1000) {
      alert('Укажите сумму инвестиций (минимум $1,000)'); return
    }
    setGenerating(true); setReport(null); setReportId(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/v1/market-analysis/detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify({
          ...form,
          investment_amount: Number(form.investment_amount),
          expected_revenue_year1: form.expected_revenue_year1 || null,
        }),
      })
      const data = await res.json()
      if (data.report_id) {
        setReportId(data.report_id)
      } else {
        throw new Error(data.detail || 'Ошибка запуска генерации')
      }
    } catch (e: any) {
      setGenerating(false)
      alert('Ошибка: ' + e.message)
    }
  }

  const downloadPdf = (rid: string) => {
    const token = localStorage.getItem('token')
    window.open(\`/api/v1/market-analysis/reports/\${rid}/pdf?token=\${token}\`, '_blank')
  }

  const QUICK_SUGGESTIONS = [
    'Какие отрасли наиболее перспективны для инвестиций в Узбекистане в 2026?',
    'Стоит ли открывать производство строительных материалов в Ташкентской области?',
    'Какие льготы дают СЭЗ для производственного бизнеса в Узбекистане?',
    'Сравните доходность депозита, облигаций и бизнеса в Узбекистане',
    'Как изменился инвестиционный климат Узбекистана в 2025-2026?',
    'Лучшие регионы Узбекистана для открытия IT-компании',
  ]

  // ─────────────────────────────────────────────────────────
  // Рендер
  // ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-600 rounded-xl">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Рынок Узбекистана</h1>
            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded-full font-medium border border-blue-500/30">PRO</span>
          </div>
          <p className="text-slate-400 ml-14">AI-анализ инвестиционных возможностей • Данные ЦБ РУз, stat.uz, invest.gov.uz</p>
        </div>

        {/* Макро тикер */}
        {macro && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 mb-6 overflow-hidden">
            <div className="flex gap-6 text-sm overflow-x-auto">
              {[
                { label: 'ВВП', value: \`$\${macro.gdp_usd_bln} млрд\`, sub: \`+\${macro.gdp_growth_pct}%\` },
                { label: 'Инфляция', value: \`\${macro.inflation_cpi_pct}%\`, sub: 'CPI янв 2026' },
                { label: 'Ставка ЦБ', value: \`\${macro.refinancing_rate_pct}%\`, sub: 'рефин.' },
                { label: 'USD/UZS', value: macro.usd_uzs_rate.toLocaleString(), sub: 'текущий курс' },
                { label: 'Кредит (ср.)', value: \`\${macro.avg_lending_rate_pct}%\`, sub: 'банки' },
                { label: 'Гособл. 3Y', value: \`\${macro.gov_bond_3y_pct}%\`, sub: 'Минфин' },
                { label: 'TSMI', value: macro.tsmi_index.toString(), sub: 'биржа Ташкент' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center min-w-[80px] border-r border-slate-700/40 last:border-0 pr-5">
                  <span className="text-slate-400 text-xs whitespace-nowrap">{item.label}</span>
                  <span className="text-white font-semibold whitespace-nowrap">{item.value}</span>
                  <span className="text-emerald-400 text-xs whitespace-nowrap">{item.sub}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Переключатель режимов */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setMode('quick')}
            className={\`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all \${
              mode === 'quick'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/50'
            }\`}
          >
            <Zap className="w-4 h-4" />
            Быстрый вопрос
          </button>
          <button
            onClick={() => setMode('detailed')}
            className={\`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all \${
              mode === 'detailed'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 border border-slate-700/50'
            }\`}
          >
            <Sparkles className="w-4 h-4" />
            Детальный анализ
            <span className="px-1.5 py-0.5 bg-white/10 rounded text-xs">25 критериев</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════ */}
        {/* Режим Quick Ask */}
        {/* ══════════════════════════════════════════════ */}
        {mode === 'quick' && (
          <div className="space-y-6">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex gap-3">
                <textarea
                  value={quickQuestion}
                  onChange={e => setQuickQuestion(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleQuickAsk() } }}
                  placeholder="Задайте вопрос об инвестициях в Узбекистане..."
                  rows={3}
                  className="flex-1 bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/60 transition-colors"
                />
                <button
                  onClick={handleQuickAsk}
                  disabled={quickLoading || !quickQuestion.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2 self-end"
                >
                  {quickLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Анализ
                </button>
              </div>

              {/* Быстрые запросы */}
              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setQuickQuestion(s)}
                    className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 text-xs rounded-lg border border-slate-600/30 transition-colors"
                  >
                    {s.length > 50 ? s.slice(0, 50) + '…' : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Ответ */}
            {quickLoading && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                <span className="text-slate-400">AI анализирует данные рынка Узбекистана...</span>
              </div>
            )}
            {quickAnswer && !quickLoading && (
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white font-semibold">AI-анализ</h3>
                </div>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{quickAnswer}</p>
                </div>
              </div>
            )}

            {/* Шаблоны */}
            {templates.length > 0 && (
              <div>
                <h3 className="text-white font-semibold mb-3">Шаблоны типовых инвестиций</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((tpl: any) => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className="bg-slate-800/60 border border-slate-700/50 hover:border-blue-500/50 rounded-xl p-4 text-left transition-all group"
                    >
                      <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{tpl.name}</div>
                      <div className="text-slate-400 text-xs mt-1">{tpl.description}</div>
                      <div className="flex items-center gap-1 mt-2 text-blue-400 text-xs">
                        <span>Открыть детальный анализ</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════ */}
        {/* Режим Детальный анализ */}
        {/* ══════════════════════════════════════════════ */}
        {mode === 'detailed' && !generating && !report && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

            {/* Шаги навигации */}
            <div className="lg:col-span-1">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sticky top-6">
                <h3 className="text-white font-semibold mb-4 text-sm">7 блоков анализа</h3>
                <div className="space-y-1">
                  {STEPS.map(s => {
                    const Icon = s.icon
                    const isActive = step === s.id
                    const isDone = step > s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => setStep(s.id)}
                        className={\`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all \${
                          isActive ? 'bg-blue-600 text-white' :
                          isDone ? 'bg-slate-700/50 text-emerald-400' :
                          'text-slate-400 hover:bg-slate-700/30'
                        }\`}
                      >
                        {isDone
                          ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                          : <Icon className="w-4 h-4 shrink-0" />
                        }
                        <div>
                          <div className="text-xs font-medium">{s.id}. {s.title}</div>
                          <div className="text-xs opacity-70">{s.desc}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Форма */}
            <div className="lg:col-span-3">
              <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">

                {/* ── Шаг 1: Отрасль (ОКЭД) ─────────────────── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 1: Отрасль и деятельность</h2>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Секция ОКЭД <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={form.oked_section}
                        onChange={e => { handleUpdate('oked_section', e.target.value); handleUpdate('oked_division', '') }}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60"
                      >
                        <option value="">— Выберите секцию ОКЭД —</option>
                        {okedSections.map(s => (
                          <option key={s.code} value={s.code}>{s.code}. {s.name_ru}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Раздел ОКЭД <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={form.oked_division}
                        onChange={e => handleUpdate('oked_division', e.target.value)}
                        disabled={!form.oked_section}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white disabled:opacity-50 focus:outline-none focus:border-blue-500/60"
                      >
                        <option value="">— Выберите раздел —</option>
                        {okedDivisions.map(d => (
                          <option key={d.code} value={d.code}>{d.code} — {d.name_ru}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Описание деятельности <span className="text-slate-500">(опционально)</span>
                      </label>
                      <textarea
                        value={form.activity_description}
                        onChange={e => handleUpdate('activity_description', e.target.value)}
                        placeholder="Опишите конкретный вид деятельности..."
                        maxLength={500}
                        rows={3}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/60"
                      />
                      <div className="text-xs text-slate-500 mt-1 text-right">{form.activity_description.length}/500</div>
                    </div>
                  </div>
                )}

                {/* ── Шаг 2: Инвестиционные параметры ────────── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 2: Инвестиционные параметры</h2>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Сумма инвестиций <span className="text-red-400">*</span></label>
                        <input type="number" value={form.investment_amount} min={1000}
                          onChange={e => handleUpdate('investment_amount', Number(e.target.value))}
                          className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Валюта</label>
                        <select value={form.investment_currency} onChange={e => handleUpdate('investment_currency', e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60">
                          <option value="USD">USD (доллар)</option>
                          <option value="UZS">UZS (сум)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Горизонт инвестиций: <span className="text-blue-400">{form.investment_horizon_years} лет</span>
                      </label>
                      <input type="range" min={1} max={30} value={form.investment_horizon_years}
                        onChange={e => handleUpdate('investment_horizon_years', Number(e.target.value))}
                        className="w-full accent-blue-500"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1"><span>1 год</span><span>30 лет</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Тип инвестиции</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[{v:'greenfield',l:'Greenfield'},{v:'expansion',l:'Расширение'},{v:'ma',l:'M&A'},{v:'franchise',l:'Франшиза'}].map(opt => (
                            <button key={opt.v} onClick={() => handleUpdate('investment_type', opt.v)}
                              className={\`px-3 py-2 rounded-lg text-xs font-medium transition-all \${form.investment_type === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'}\`}>
                              {opt.l}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Стадия проекта</label>
                        <select value={form.project_stage} onChange={e => handleUpdate('project_stage', e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60">
                          <option value="idea">Идея</option>
                          <option value="business_plan">Бизнес-план</option>
                          <option value="launch">Запуск</option>
                          <option value="operating">Действующий</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Источники финансирования</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          {v:'own',l:'Собственные'},{v:'bank_loan',l:'Банковский кредит'},
                          {v:'leasing',l:'Лизинг'},{v:'investor',l:'Инвестор'},{v:'grant',l:'Грант'}
                        ].map(opt => (
                          <button key={opt.v} onClick={() => handleMultiSelect('funding_sources', opt.v)}
                            className={\`px-4 py-2 rounded-lg text-sm font-medium transition-all \${
                              form.funding_sources.includes(opt.v)
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                            }\`}>
                            {opt.l}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Шаг 3: Финансовая структура ─────────────── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 3: Финансовая структура</h2>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Доля заёмных средств: <span className="text-blue-400">{form.debt_ratio_pct}%</span>
                      </label>
                      <input type="range" min={0} max={90} step={5} value={form.debt_ratio_pct}
                        onChange={e => handleUpdate('debt_ratio_pct', Number(e.target.value))}
                        className="w-full accent-blue-500" />
                      <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0% (собственные)</span><span>90% (заёмные)</span></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Ставка по кредиту (%)</label>
                        <input type="number" value={form.expected_loan_rate_pct} min={5} max={40} step={0.1}
                          onChange={e => handleUpdate('expected_loan_rate_pct', Number(e.target.value))}
                          className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60"
                        />
                        <p className="text-xs text-slate-500 mt-1">Средняя по рынку: 22.8%</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Выручка 1-й год ({form.investment_currency})</label>
                        <input type="number" value={form.expected_revenue_year1} min={0}
                          onChange={e => handleUpdate('expected_revenue_year1', Number(e.target.value))}
                          className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ожидаемая рентабельность: <span className="text-blue-400">{form.expected_margin_pct}%</span>
                      </label>
                      <input type="range" min={-50} max={100} step={1} value={form.expected_margin_pct}
                        onChange={e => handleUpdate('expected_margin_pct', Number(e.target.value))}
                        className="w-full accent-blue-500" />
                      <div className="flex justify-between text-xs text-slate-500 mt-1"><span>-50%</span><span>+100%</span></div>
                    </div>
                  </div>
                )}

                {/* ── Шаг 4: Локация ──────────────────────────── */}
                {step === 4 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 4: Локация и СЭЗ</h2>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Регион Узбекистана</label>
                      <select value={form.region} onChange={e => handleUpdate('region', e.target.value)}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60">
                        {regions.map(r => (
                          <option key={r.code} value={r.code}>
                            {r.name_ru} — ВРП/душу ${r.grp_per_capita_usd.toLocaleString()} (+{r.grp_growth_pct}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Свободная экономическая зона 
                        <span className="ml-2 text-xs text-emerald-400">Льготы КПН 3-10 лет</span>
                      </label>
                      <select value={form.sez_code} onChange={e => { handleUpdate('sez_code', e.target.value); if(e.target.value) handleUpdate('tax_regime','sez') }}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60">
                        <option value="">— Не в СЭЗ —</option>
                        {sezList.map((s: any) => (
                          <option key={s.code} value={s.code}>{s.name_ru} — {s.specialization}</option>
                        ))}
                      </select>
                      {form.sez_code && (
                        <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
                          ✓ Льготы СЭЗ: освобождение от КПН до 10 лет, налога на имущество, таможенных пошлин. Аренда земли до 49 лет (УП-41 от 04.03.2025)
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Шаг 5: Рыночные параметры ───────────────── */}
                {step === 5 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 5: Рыночные параметры</h2>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Целевые рынки</label>
                      <div className="flex gap-3">
                        {[{v:'domestic',l:'Внутренний'},{v:'cis_export',l:'Экспорт СНГ'},{v:'global_export',l:'Дальнее зарубежье'}].map(opt => (
                          <button key={opt.v} onClick={() => handleMultiSelect('target_markets', opt.v)}
                            className={\`px-4 py-2 rounded-lg text-sm font-medium transition-all \${
                              form.target_markets.includes(opt.v) ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                            }\`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Ожидаемая доля рынка: <span className="text-blue-400">{form.expected_market_share_pct}%</span>
                      </label>
                      <input type="range" min={0.1} max={50} step={0.5} value={form.expected_market_share_pct}
                        onChange={e => handleUpdate('expected_market_share_pct', Number(e.target.value))}
                        className="w-full accent-blue-500" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Основные конкуренты</label>
                      <div className="flex gap-3">
                        {[{v:'0-3',l:'0-3'},{v:'4-10',l:'4-10'},{v:'11-50',l:'11-50'},{v:'50+',l:'50+'}].map(opt => (
                          <button key={opt.v} onClick={() => handleUpdate('competitors_range', opt.v)}
                            className={\`px-4 py-2 rounded-lg text-sm font-medium transition-all \${
                              form.competitors_range === opt.v ? 'bg-blue-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                            }\`}>{opt.l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Шаг 6: Организация и налоги ─────────────── */}
                {step === 6 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 6: Организационная форма и налоги</h2>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Организационная форма</label>
                        <select value={form.legal_form} onChange={e => handleUpdate('legal_form', e.target.value)}
                          className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60">
                          <option value="ooo">ООО (Общество с ограниченной ответственностью)</option>
                          <option value="ip">ИП (Индивидуальный предприниматель)</option>
                          <option value="ao">АО (Акционерное общество)</option>
                          <option value="farmer">ИП (Фермерское хозяйство)</option>
                          <option value="family">Семейное предприятие</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Налоговый режим</label>
                        <div className="space-y-2">
                          {[
                            {v:'general',l:'Общий (КПН 15% + НДС 12%)'},
                            {v:'simplified',l:'Упрощённый (оборотный 4%)'},
                            {v:'sez',l:'СЭЗ (льготный)'},
                          ].map(opt => (
                            <label key={opt.v} className={\`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all \${form.tax_regime === opt.v ? 'bg-blue-600/20 border border-blue-500/50' : 'bg-slate-700/30 border border-transparent'}\`}>
                              <input type="radio" value={opt.v} checked={form.tax_regime === opt.v}
                                onChange={() => handleUpdate('tax_regime', opt.v)} className="accent-blue-500" />
                              <span className="text-sm text-slate-300">{opt.l}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Количество сотрудников (план): {form.planned_employees}</label>
                      <input type="number" value={form.planned_employees} min={1} max={10000}
                        onChange={e => handleUpdate('planned_employees', Number(e.target.value))}
                        className="w-full bg-slate-900/60 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/60"
                      />
                    </div>

                    {/* Налоговый калькулятор */}
                    <div className="bg-slate-900/40 rounded-xl p-4">
                      <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-blue-400" />
                        Налоговые ставки 2026
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {[
                          {l:'КПН',v:'15%'},{l:'НДС',v:'12%'},{l:'Упрощённый',v:'4%'},
                          {l:'НДФЛ',v:'12%'},{l:'Соц. налог',v:'12%'},{l:'Налог на имущество',v:'1.5%'},
                        ].map(tax => (
                          <div key={tax.l} className="bg-slate-800/50 rounded-lg px-3 py-2">
                            <div className="text-slate-400">{tax.l}</div>
                            <div className="text-white font-semibold">{tax.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Шаг 7: Риски ──────────────────────────────── */}
                {step === 7 && (
                  <div className="space-y-5">
                    <h2 className="text-xl font-bold text-white mb-6">Блок 7: Риски и дополнительно</h2>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Профиль риска: <span className="text-blue-400">{form.risk_profile}/10</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {form.risk_profile <= 3 ? '(консервативный)' : form.risk_profile <= 6 ? '(умеренный)' : '(агрессивный)'}
                        </span>
                      </label>
                      <input type="range" min={1} max={10} value={form.risk_profile}
                        onChange={e => handleUpdate('risk_profile', Number(e.target.value))}
                        className="w-full accent-blue-500" />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>1 — консервативный</span><span>10 — агрессивный</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Зависимость от импорта сырья: <span className="text-blue-400">{form.import_dependency_pct}%</span>
                      </label>
                      <input type="range" min={0} max={100} value={form.import_dependency_pct}
                        onChange={e => handleUpdate('import_dependency_pct', Number(e.target.value))}
                        className="w-full accent-blue-500" />
                      <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0% (нет)</span><span>100% (полная)</span></div>
                    </div>

                    {/* Сводка */}
                    <div className="mt-6 bg-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                      <h4 className="text-white font-semibold mb-3">Сводка параметров</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {[
                          {l:'ОКЭД',v:\`\${form.oked_section}/\${form.oked_division}\`},
                          {l:'Инвестиции',v:\`\${form.investment_amount.toLocaleString()} \${form.investment_currency}\`},
                          {l:'Горизонт',v:\`\${form.investment_horizon_years} лет\`},
                          {l:'Регион',v:regions.find(r=>r.code===form.region)?.name_ru||form.region},
                          {l:'Налоговый режим',v:form.tax_regime},
                          {l:'Сотрудников',v:String(form.planned_employees)},
                        ].map(item => (
                          <div key={item.l} className="flex justify-between">
                            <span className="text-slate-400">{item.l}:</span>
                            <span className="text-white font-medium">{item.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Навигация по шагам */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
                  <button
                    onClick={() => setStep(prev => Math.max(1, prev - 1))}
                    disabled={step === 1}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-700/50 text-slate-300 rounded-xl disabled:opacity-50 hover:bg-slate-600/50 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" /> Назад
                  </button>

                  <div className="flex gap-1.5">
                    {STEPS.map(s => (
                      <div key={s.id}
                        className={\`w-2 h-2 rounded-full transition-all \${
                          s.id === step ? 'w-6 bg-blue-500' :
                          s.id < step ? 'bg-emerald-500' : 'bg-slate-600'
                        }\`} />
                    ))}
                  </div>

                  {step < 7 ? (
                    <button
                      onClick={() => setStep(prev => Math.min(7, prev + 1))}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors"
                    >
                      Далее <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerate}
                      className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25"
                    >
                      <Sparkles className="w-4 h-4" />
                      Сгенерировать анализ
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Генерация в процессе */}
        {generating && !report && (
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-12 text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping" />
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-slate-700/30 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-white text-xl font-bold mb-2">AI генерирует отчёт...</h3>
            <p className="text-slate-400 mb-4">Анализируем рынок по 25 критериям • 12 разделов отчёта</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Отрасль ОКЭД','Макроданные','Регион','Конкуренты','Регулирование','SWOT','Риски'].map((item, i) => (
                <span key={i} className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs border border-blue-500/30 animate-pulse" style={{animationDelay:`${i*0.2}s`}}>
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Готовый отчёт */}
        {report && report.status === 'ready' && (
          <div className="space-y-4">
            {/* Шапка отчёта */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-2xl font-bold text-white">Инвестиционный анализ готов</h2>
                  </div>
                  <div className="flex gap-4 mt-3">
                    <span className={\`px-4 py-1.5 rounded-full text-sm font-semibold \${
                      report.recommendation === 'invest' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                      report.recommendation === 'avoid' ? 'bg-red-500/20 text-red-400 border border-red-500/40' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }\`}>
                      {report.recommendation === 'invest' ? '✅ INVEST' : report.recommendation === 'avoid' ? '❌ AVOID' : '⏳ HOLD'}
                    </span>
                    <span className="px-4 py-1.5 bg-blue-600/20 text-blue-400 rounded-full text-sm border border-blue-500/30">
                      Уверенность AI: {report.confidence_score?.toFixed(1)}%
                    </span>
                    <span className="px-4 py-1.5 bg-slate-700/50 text-slate-400 rounded-full text-sm">
                      <Clock className="w-3 h-3 inline mr-1" />{report.generation_time_sec?.toFixed(1)}с
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => downloadPdf(report.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 rounded-xl text-sm transition-colors border border-slate-600/50">
                    <Download className="w-4 h-4" /> PDF
                  </button>
                  <button onClick={() => { setReport(null); setReportId(null); setMode('detailed'); setStep(1) }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm transition-colors">
                    <Sparkles className="w-4 h-4" /> Новый анализ
                  </button>
                </div>
              </div>
            </div>

            {/* 12 разделов отчёта */}
            {report.sections?.map((section: any) => (
              <div key={section.number} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
                    {section.number}
                  </span>
                  {section.title}
                </h3>
                <div className="text-slate-300 leading-relaxed whitespace-pre-wrap text-sm">
                  {section.content}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Ошибка */}
        {report && report.status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-white font-semibold">Ошибка генерации</h3>
                <p className="text-red-300 text-sm mt-1">{report.executive_summary}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
