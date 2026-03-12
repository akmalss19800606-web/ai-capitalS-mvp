'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const OKED_SECTORS = [
  { id: 'A', name: 'Сельское хозяйство' }, { id: 'B', name: 'Горнодобывающая промышленность' },
  { id: 'C', name: 'Обрабатывающая промышленность' }, { id: 'D', name: 'Электроэнергетика' },
  { id: 'F', name: 'Строительство' }, { id: 'G', name: 'Торговля' },
  { id: 'H', name: 'Транспорт' }, { id: 'I', name: 'Гостиницы и рестораны' },
  { id: 'J', name: 'IT & Телекоммуникации' }, { id: 'K', name: 'Финансы и страхование' },
  { id: 'L', name: 'Недвижимость' }, { id: 'M', name: 'Профессиональные услуги' },
  { id: 'P', name: 'Образование' }, { id: 'Q', name: 'Здравоохранение' },
  { id: 'R', name: 'Культура и спорт' }, { id: 'S', name: 'Прочие услуги' },
];

const REGIONS = [
  { id: '', name: 'Весь Узбекистан' },
  { id: 'tashkent_city', name: 'г. Ташкент' }, { id: 'tashkent_region', name: 'Ташкентская область' },
  { id: 'andijan', name: 'Андижанская область' }, { id: 'bukhara', name: 'Бухарская область' },
  { id: 'fergana', name: 'Ферганская область' }, { id: 'samarkand', name: 'Самаркандская область' },
  { id: 'navoi', name: 'Навоийская область' }, { id: 'namangan', name: 'Наманганская область' },
  { id: 'kashkadarya', name: 'Кашкадарьинская область' },
  { id: 'surkhandarya', name: 'Сурхандарьинская область' },
  { id: 'karakalpakstan', name: 'Республика Каракалпакстан' },
];

export default function MarketAnalysisPage() {
  const [sectorId, setSectorId] = useState('J');
  const [region, setRegion] = useState('');
  const [investmentSize, setInvestmentSize] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [provider, setProvider] = useState('groq');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const body: any = { sector_id: sectorId, provider };
      if (region) body.region = region;
      if (investmentSize) body.investment_size_usd = parseFloat(investmentSize);
      const res = await fetch(`${API}/api/v1/uz-market/detailed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || 'Ошибка запроса');
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const body: any = { sector_id: sectorId, provider, currency };
      if (region) body.region = region;
      if (investmentSize) body.investment_size_usd = parseFloat(investmentSize);
      const res = await fetch(`${API}/api/v1/uz-market/generate-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data.report || data);
    } catch (err: any) {
      setError(err.message || 'Ошибка генерации отчёта');
    } finally {
      setLoading(false);
    }
  }

  const C = {
    bg: '#f8f8fc', card: '#ffffff', primary: '#3b82f6', border: '#e2e8f0',
    text: '#1e293b', muted: '#64748b', success: '#22c55e', error: '#ef4444',
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: C.text, margin: 0 }}>
            Анализ рынка Узбекистана
          </h1>
          <p style={{ color: C.muted, marginTop: '0.5rem' }}>
            Детальный AI-анализ отрасли по 7 блокам — инвестиционный потенциал, риски, СЭЗ, конкуренция
          </p>
        </div>

        {/* Form */}
        <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

              {/* Sector */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: C.text }}>
                  Отрасль (ОКВЭД) *
                </label>
                <select
                  value={sectorId}
                  onChange={e => setSectorId(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.95rem' }}
                >
                  {OKED_SECTORS.map(s => (
                    <option key={s.id} value={s.id}>{s.id} — {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: C.text }}>
                  Регион
                </label>
                <select
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.95rem' }}
                >
                  {REGIONS.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Investment Size */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: C.text }}>
                  Размер инвестиций (USD)
                </label>
                <input
                  type="number"
                  value={investmentSize}
                  onChange={e => setInvestmentSize(e.target.value)}
                  placeholder="например: 500000"
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.95rem', boxSizing: 'border-box' }}
                />
              </div>

              {/* Currency */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: C.text }}>
                  Валюта
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.95rem' }}
                >
                  <option value="USD">USD</option>
                  <option value="UZS">UZS</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>

              {/* AI Provider */}
              <div>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: 6, color: C.text }}>
                  AI Провайдер
                </label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  style={{ width: '100%', padding: '0.625rem', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '0.95rem' }}
                >
                  <option value="groq">Groq (быстро)</option>
                  <option value="perplexity">Perplexity (глубже)</option>
                </select>
              </div>

            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem', background: C.primary, color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontSize: '1rem',
                }}
              >
                {loading ? 'Анализ...' : 'Детальный анализ'}
              </button>
              <button
                type="button"
                onClick={generateReport}
                disabled={loading}
                style={{
                  padding: '0.75rem 2rem', background: '#10b981', color: '#fff',
                  border: 'none', borderRadius: 8, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1, fontSize: '1rem',
                }}
              >
                Сгенерировать отчёт
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: `1px solid ${C.error}`, borderRadius: 8, padding: '1rem', marginBottom: '1rem', color: C.error }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', color: C.text }}>
              Результат анализа
            </h2>

            {/* Sector info */}
            {result.sector && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
                <div style={{ fontWeight: 700, color: '#0369a1', marginBottom: 4 }}>{result.sector.name_ru || result.sector.id}</div>
                {result.sector.description && <p style={{ color: C.muted, margin: 0, fontSize: '0.9rem' }}>{result.sector.description}</p>}
              </div>
            )}

            {/* Blocks */}
            {result.blocks && Object.entries(result.blocks).map(([key, val]: any) => (
              <div key={key} style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ fontWeight: 600, color: C.text, marginBottom: 6, textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</div>
                <div style={{ color: C.muted, fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {typeof val === 'string' ? val : JSON.stringify(val, null, 2)}
                </div>
              </div>
            ))}

            {/* AI Analysis text */}
            {result.analysis && (
              <div style={{ padding: '1rem', background: '#fafafa', borderRadius: 8, border: `1px solid ${C.border}`, whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: C.text }}>
                {result.analysis}
              </div>
            )}

            {/* Raw JSON toggle */}
            <details style={{ marginTop: '1rem' }}>
              <summary style={{ cursor: 'pointer', color: C.muted, fontSize: '0.85rem' }}>Показать JSON</summary>
              <pre style={{ background: '#1e293b', color: '#e2e8f0', borderRadius: 8, padding: '1rem', overflow: 'auto', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
