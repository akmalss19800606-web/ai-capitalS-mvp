'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

const quickQueries = [
  "Рынок оптовой торговли мукой в Узбекистане 2024",
  "Инвестиции в хлопковую отрасль Узбекистана",
  "Рынок недвижимости Ташкента — стоит ли инвестировать?",
  "Оптовая торговля фруктами и овощами в Узбекистане",
  "Производство стройматериалов в Узбекистане",
  "Розничная торговля в регионах Узбекистана",
];

export default function MarketUzbekistan() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{query: string, analysis: string}[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const handleAnalyze = async (q?: string) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true);
    setResult('');
    try {
      const res = await apiRequest('/ai/market-analysis', {
        method: 'POST',
        body: JSON.stringify({ query: text, language: 'ru' })
      });
      setResult(res.analysis);
      setHistory(prev => [{ query: text, analysis: res.analysis }, ...prev.slice(0, 4)]);
      if (q) setQuery(q);
    } catch (e) {
      setResult('Ошибка при анализе. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>← Назад</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Анализ рынка Узбекистана</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>AI анализ инвестиционных возможностей в Узбекистане</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Задайте вопрос об инвестиции</h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
            placeholder="Например: стоит ли инвестировать в оптовую торговлю мукой в Узбекистане?"
            style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
          />
          <button onClick={() => handleAnalyze()} disabled={loading || !query.trim()} style={{ padding: '12px 24px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (loading || !query.trim()) ? 0.6 : 1, minWidth: '140px' }}>
            {loading ? 'Анализирую...' : 'Анализировать'}
          </button>
        </div>

        <div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Быстрые запросы:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {quickQueries.map((q, i) => (
              <button key={i} onClick={() => handleAnalyze(q)} disabled={loading} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🤖</div>
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>AI анализирует рынок Узбекистана...</p>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px' }}>Обычно занимает 5-10 секунд</p>
        </div>
      )}

      {result && !loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
            <div>
              <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>AI Инвестиционный анализ</p>
              <p style={{ color: '#94a3b8', fontSize: '12px' }}>Powered by Groq LLaMA</p>
            </div>
          </div>
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{result}</p>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>История запросов</h2>
          {history.slice(1).map((h, i) => (
            <div key={i} style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '8px', cursor: 'pointer' }} onClick={() => { setQuery(h.query); setResult(h.analysis); }}>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>{h.query}</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{h.analysis.substring(0, 100)}...</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}