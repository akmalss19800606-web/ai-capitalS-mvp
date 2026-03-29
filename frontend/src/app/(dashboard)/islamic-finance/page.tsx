'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const STATS = [
  { icon: '🌙', label: 'Стандарты', value: '15', sub: 'AAOIFI + IFSB' },
  { icon: '📖', label: 'Терминов', value: '30+', sub: 'Глоссарий' },
  { icon: '🔍', label: 'Скрининг', value: 'SS No.62', sub: 'AAOIFI' },
  { icon: '🕌', label: 'Закят', value: 'Нисаб', sub: 'UZS/USD' },
  { icon: '🌍', label: 'Юрисдикция', value: 'UZ', sub: 'Узбекистан' },
]

const TOOLS = [
  { icon: '🕌', title: 'Закят', desc: 'Расчёт обязательного очищения имущества по нисабу', href: '/islamic-finance/zakat', color: 'text-green-600' },
  { icon: '🔍', title: 'Скрининг', desc: 'Проверка компаний по стандарту AAOIFI SS No. 62', href: '/islamic-finance/screening', color: 'text-blue-600' },
  { icon: '📖', title: 'Глоссарий', desc: '30+ терминов исламских финансов с определениями', href: '/islamic-finance/glossary', color: 'text-purple-600' },
  { icon: '📋', title: 'Стандарты', desc: 'AAOIFI и IFSB — 15 стандартов с описанием', href: '/islamic-finance/standards', color: 'text-orange-600' },
]

const CATEGORY_LABELS: Record<string, string> = {
  debt: 'Долговые',
  equity: 'Долевые',
  lease: 'Аренда',
  service: 'Услуги',
  social: 'Социальные',
}

const CATEGORY_COLORS: Record<string, string> = {
  debt: 'bg-blue-100 text-blue-700',
  equity: 'bg-green-100 text-green-700',
  lease: 'bg-orange-100 text-orange-700',
  service: 'bg-purple-100 text-purple-700',
  social: 'bg-pink-100 text-pink-700',
}

interface IslamicProduct {
  id: string
  slug: string
  name_ru: string
  name_ar: string
  transliteration: string
  product_type: string
  category: string
  description_ru: string
  typical_tenure: string
  allowed_for: string
}

export default function IslamicFinancePage() {
  const [mode, setMode] = useState('professional')
  const [products, setProducts] = useState<IslamicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const savedMode = localStorage.getItem('islamic_mode')
    if (savedMode) setMode(savedMode)

    const token = localStorage.getItem('token')
    fetch('/api/v1/islamic/products', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => {
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleModeChange = (newMode: string) => {
    setMode(newMode)
    localStorage.setItem('islamic_mode', newMode)
  }

  const filteredProducts = products.filter(p =>
    mode === 'individual' ? p.allowed_for !== 'professional' : true
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🕌 Исламские финансы</h1>
          <p className="text-gray-500 mt-1 text-sm">Инструменты для расчётов и анализа в соответствии с нормами шариата · Стандарты AAOIFI и IFSB · Узбекистан (UZS)</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button onClick={() => handleModeChange('individual')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'individual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>👤 Физлицо</button>
          <button onClick={() => handleModeChange('professional')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'professional' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>💼 Профессионал</button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center">
            <span className="text-2xl mb-1">{s.icon}</span>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400">{s.sub}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">📦 Исламские финансовые продукты</h2>
        {loading ? (
          <div className="text-sm text-gray-400 py-4 text-center">Загрузка продуктов...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-sm text-gray-400 py-4 text-center">Продукты не найдены</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredProducts.map(p => (
              <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer" onClick={() => router.push('/islamic-finance/products/' + p.slug)}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">{p.name_ru}</p>
                    <p className="text-sm text-gray-400">{p.name_ar} · {p.transliteration}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[p.category] || 'bg-gray-100 text-gray-600'}`}>
                    {CATEGORY_LABELS[p.category] || p.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-2">{p.description_ru}</p>
                {p.typical_tenure && (
                  <p className="text-xs text-gray-400 mt-2">⏱ {p.typical_tenure}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <a key={tool.title} href={tool.href} className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all group">
            <div className="flex items-start gap-4">
              <span className="text-3xl">{tool.icon}</span>
              <div>
                <h3 className={`text-lg font-semibold ${tool.color} group-hover:underline`}>{tool.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{tool.desc}</p>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <span className="text-blue-500 text-xl">ℹ️</span>
        <div>
          <p className="text-sm font-medium text-blue-800">О разделе</p>
          <p className="text-sm text-blue-600 mt-0.5">Все расчёты соответствуют стандартам AAOIFI и IFSB. Данные адаптированы для рынка Узбекистана.</p>
        </div>
      </div>
    </div>
  )
}
