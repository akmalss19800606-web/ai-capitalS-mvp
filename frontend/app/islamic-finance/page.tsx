'use client'

import { useState } from 'react'

const STATS = [
  { icon: '☪️', label: 'Стандарты', value: '15', sub: 'AAOIFI + IFSB' },
  { icon: '📋', label: 'Терминов', value: '30+', sub: 'Глоссарий' },
  { icon: '🔍', label: 'Скрининг', value: 'SS No.62', sub: 'AAOIFI' },
  { icon: '🕌', label: 'Закят', value: 'Нисаб', sub: 'UZS/USD' },
  { icon: '🌍', label: 'Юрисдикция', value: 'UZ', sub: 'Узбекистан' },
]

const TOOLS = [
  { icon: '🕌', title: 'Закят', desc: 'Расчёт обязательного очищения имущества по нисабу', href: '/islamic-finance/zakat', color: 'text-green-600' },
  { icon: '🔍', title: 'Скрининг', desc: 'Проверка компаний по стандарту AAOIFI SS No. 62', href: '/islamic-finance/screening', color: 'text-blue-600' },
  { icon: '📖', title: 'Глоссарий', desc: '30+ терминов исламских финансов с определениями', href: '/islamic-finance/glossary', color: 'text-purple-600' },
  { icon: '📜', title: 'Стандарты', desc: 'AAOIFI и IFSB — 15 стандартов с описанием', href: '/islamic-finance/references', color: 'text-orange-600' },
]

export default function IslamicFinancePage() {
  const [mode, setMode] = useState('professional')

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">☪️ Исламские финансы</h1>
          <p className="text-gray-500 mt-1 text-sm">Инструменты для расчётов и анализа в соответствии с нормами шариата · Стандарты AAOIFI и IFSB · Узбекистан (UZS)</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          <button onClick={() => setMode('individual')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'individual' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>👤 Физлицо</button>
          <button onClick={() => setMode('professional')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'professional' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>🏢 Профессионал</button>
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
