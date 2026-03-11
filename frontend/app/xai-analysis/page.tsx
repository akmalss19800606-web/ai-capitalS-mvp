'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

const SECTORS = [
  { value: 'agriculture', label: 'Сельское хозяйство' },
  { value: 'food_processing', label: 'Пищевая промышленность' },
  { value: 'trade', label: 'Торговля' },
  { value: 'construction', label: 'Строительство' },
  { value: 'manufacturing', label: 'Производство' },
  { value: 'it_services', label: 'IT и технологии' },
  { value: 'transport', label: 'Транспорт и логистика' },
  { value: 'tourism', label: 'Туризм' },
];

interface Factor {
  key: string;
  name: string;
  weight: number;
  importance_pct: number;
  impact: 'positive' | 'negative';
  category: string;
}

interface XAIResult {
  factors: Factor[];
  confidence: {
    score: number;
    level: string;
    level_ru: string;
    positive_factors_weight: number;
    negative_factors_weight: number;
  };
  recommendation: {
    action: string;
    action_code: string;
    explanation: string;
    top_positive_factors: string[];
    top_negative_factors: string[];
  };
  metadata: {
    sector: string;
    investment_amount: number;
    time_horizon_years: number;
  };
}

export default function XAIAnalysisPage() {
  const router = useRouter();
  const [sector, setSector] = useState('trade');
  const [amount, setAmount] = useState('10000');
  const [years, setYears] = useState('3');
  const [result, setResult] = useState<XAIResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest('/xai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sector,
          investment_amount: parseFloat(amount),
          time_horizon_years: parseInt(years),
          language: 'ru',
        }),
      });
      setResult(res);
    } catch {
      alert('Ошибка при анализе');
    } finally {
      setLoading(false);
    }
  };

  const maxWeight = result
    ? Math.max(...result.factors.map(f => Math.abs(f.weight)))
    : 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>
          ← Назад
        </button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Объяснимость AI (XAI)</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Почему AI рекомендует именно это</p>
        </div>
      </div>

      {/* Параметры */}
      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Параметры анализа</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Сектор</span>
            <select value={sector} onChange={e => setSector(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}>
              {SECTORS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Сумма (USD)</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }} />
          </div>
          <div>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Горизонт (лет)</span>
            <input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="30" style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }} />
          </div>
        </div>
        <button onClick={analyze} disabled={loading} style={{ padding: '11px 32px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Анализирую...' : 'Анализировать факторы'}
        </button>
      </div>

      {loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
          <p style={{ color: '#64748b', fontSize: '15px', fontWeight: '500' }}>Анализ факторов...</p>
        </div>
      )}

      {result && !loading && (
        <div>
          {/* Уверенность и рекомендация */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            {/* Gauge уверенности */}
            <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Уровень уверенности</h3>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 12px',
                  background: `conic-gradient(${result.confidence.score >= 65 ? '#22c55e' : result.confidence.score >= 40 ? '#eab308' : '#ef4444'} ${result.confidence.score * 3.6}deg, #f1f5f9 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <div style={{ width: '90px', height: '90px', borderRadius: '50%', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>{Math.round(result.confidence.score)}%</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>{result.confidence.level_ru}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '12px', color: '#64748b' }}>
                  <span>+ {(result.confidence.positive_factors_weight * 100).toFixed(0)}%</span>
                  <span>- {(result.confidence.negative_factors_weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* Рекомендация */}
            <div style={{
              backgroundColor: result.recommendation.action_code === 'invest' ? '#f0fdf4' : result.recommendation.action_code === 'consider' ? '#fffbeb' : '#fef2f2',
              borderRadius: '12px', padding: '24px',
              border: `1px solid ${result.recommendation.action_code === 'invest' ? '#22c55e30' : result.recommendation.action_code === 'consider' ? '#eab30830' : '#ef444430'}`,
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Рекомендация</h3>
              <p style={{
                fontSize: '20px', fontWeight: '700', marginBottom: '12px',
                color: result.recommendation.action_code === 'invest' ? '#16a34a' : result.recommendation.action_code === 'consider' ? '#ca8a04' : '#dc2626',
              }}>
                {result.recommendation.action}
              </p>
              <div style={{ fontSize: '13px', color: '#475569' }}>
                <p style={{ fontWeight: '600', marginBottom: '4px' }}>Позитивные факторы:</p>
                {result.recommendation.top_positive_factors.map((f, i) => (
                  <p key={i} style={{ color: '#16a34a', marginLeft: '8px' }}>+ {f}</p>
                ))}
                <p style={{ fontWeight: '600', marginTop: '8px', marginBottom: '4px' }}>Риски:</p>
                {result.recommendation.top_negative_factors.map((f, i) => (
                  <p key={i} style={{ color: '#dc2626', marginLeft: '8px' }}>- {f}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Горизонтальные полосы факторов */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>Важность факторов</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {result.factors.map(f => (
                <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '200px', fontSize: '13px', color: '#475569', textAlign: 'right', flexShrink: 0 }}>{f.name}</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', position: 'relative', height: '24px' }}>
                    {/* Центральная линия */}
                    <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', backgroundColor: '#e2e8f0' }} />
                    {/* Полоса */}
                    <div style={{
                      position: 'absolute',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: f.impact === 'positive' ? '#22c55e' : '#ef4444',
                      opacity: 0.8,
                      ...(f.impact === 'positive'
                        ? { left: '50%', width: `${(Math.abs(f.weight) / maxWeight) * 45}%` }
                        : { right: '50%', width: `${(Math.abs(f.weight) / maxWeight) * 45}%` }
                      ),
                    }} />
                  </div>
                  <span style={{ width: '60px', fontSize: '12px', color: '#94a3b8', textAlign: 'right', flexShrink: 0 }}>
                    {f.importance_pct}%
                  </span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#ef4444', opacity: 0.8, display: 'inline-block' }} /> Негативный фактор
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: '#22c55e', opacity: 0.8, display: 'inline-block' }} /> Позитивный фактор
              </span>
            </div>
          </div>

          {/* Развёрнутое пояснение */}
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '12px' }}>Почему эта рекомендация?</h3>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
                {result.recommendation.explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
