'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

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
  principle_ru: string
  allowed_for: string
  prohibited_elements: string[]
  aaoifi_standard_code: string
  ifsb_standard_code: string
  use_cases_ru: string[]
  risks_ru: string[]
  typical_tenure: string
}

export default function IslamicProductPage() {
  const params = useParams()
  const router = useRouter()
  const [product, setProduct] = useState<IslamicProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { setError('Требуется авторизация'); setLoading(false); return }
    fetch('/api/v1/islamic/products/'+params.slug, {
      headers: { Authorization: 'Bearer '+token }
    })
      .then(r => { if (!r.ok) throw new Error('Продукт не найден'); return r.json() })
      .then(data => { setProduct(data); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [params.slug])

  if (loading) return <div className="p-6 text-gray-400 text-sm">Загрузка...</div>
  if (error) return <div className="p-6 text-red-500 text-sm">{error}</div>
  if (!product) return <div className="p-6 text-gray-400 text-sm">Продукт не найден</div>

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => router.back()} className="text-sm text-blue-600 hover:underline flex items-center gap-1">← Назад</button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{product.name_ru}</h1>
          <p className="text-xl text-gray-400 mt-1">{product.name_ar} · {product.transliteration}</p>
        </div>
        <span className={'text-sm px-3 py-1 rounded-full font-medium '+(CATEGORY_COLORS[product.category] || 'bg-gray-100 text-gray-600')}>
          {CATEGORY_LABELS[product.category] || product.category}
        </span>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-gray-800">📋 Описание</h2>
        <p className="text-sm text-gray-600">{product.description_ru}</p>
      </div>
      {product.principle_ru && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-green-800">⚖️ Принцип работы</h2>
          <p className="text-sm text-green-700">{product.principle_ru}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {product.use_cases_ru?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">✅ Сферы применения</h2>
            <ul className="space-y-1">
              {product.use_cases_ru.map((u, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  {u}
                </li>
              ))}
            </ul>
          </div>
        )}
        {product.risks_ru?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">⚠️ Риски</h2>
            <ul className="space-y-1">
              {product.risks_ru.map((r, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {product.typical_tenure && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Срок</p>
            <p className="font-semibold text-gray-800">⏱ {product.typical_tenure}</p>
          </div>
        )}
        {product.aaoifi_standard_code && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">AAOIFI</p>
            <p className="font-semibold text-gray-800">{product.aaoifi_standard_code}</p>
          </div>
        )}
        {product.prohibited_elements?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Запрещено</p>
            <p className="font-semibold text-gray-800 text-sm">{product.prohibited_elements.join(', ')}</p>
          </div>
        )}
      </div>
    </div>
  )
}