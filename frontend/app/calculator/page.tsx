'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const industries = [
  "Оптовая торговля мукой",
  "Розничная торговля продовольствием",
  "Строительство и недвижимость",
  "Сельское хозяйство",
  "Производство",
  "IT и технологии",
  "Транспорт и логистика",
  "Туризм",
];

// Фолбэк-значения (используются если API недоступен)
const FALLBACK_UZS_RATE = 12700;
const FALLBACK_BANK_RATE = 0.23; // Ставка рефинансирования ЦБ РУз
const FALLBACK_INFLATION = 0.10;

export default function CalculatorPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('10000');
  const [years, setYears] = useState('3');
  const [industry, setIndustry] = useState('Оптовая торговля мукой');
  const [result, setResult] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  // Динамические ставки из API
  const [uzsRate, setUzsRate] = useState(FALLBACK_UZS_RATE);
  const [bankRate, setBankRate] = useState(FALLBACK_BANK_RATE);
  const [inflation, setInflation] = useState(FALLBACK_INFLATION);
  const [ratesLoading, setRatesLoading] = useState(true);

  // Информация об источниках данных
  const [rateDate, setRateDate] = useState('');
  const [inflationInfo, setInflationInfo] = useState('');
  const [bankRateInfo, setBankRateInfo] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  // Загрузка актуальных ставок при монтировании компонента
  useEffect(() => {
    const fetchRates = async () => {
      setRatesLoading(true);

      // Параллельная загрузка всех ставок
      const [ratesResult, cpiResult, macroResult] = await Promise.allSettled([
        apiRequest('/rates?codes=USD'),
        apiRequest('/cpi/current'),
        apiRequest('/macro/summary'),
      ]);

      // Курс USD/UZS
      if (ratesResult.status === 'fulfilled' && ratesResult.value) {
        try {
          const data = ratesResult.value;
          const rates = data.rates || data;
          if (Array.isArray(rates) && rates.length > 0) {
            const usdRate = rates.find((r: unknown) => r.code === 'USD');
            if (usdRate) {
              const ratePerUnit = usdRate.rate / (usdRate.nominal || 1);
              setUzsRate(ratePerUnit);
              if (usdRate.rate_date) {
                setRateDate(usdRate.rate_date);
              }
            }
          }
        } catch {
          // Используем фолбэк
        }
      }

      // ИПЦ / инфляция
      if (cpiResult.status === 'fulfilled' && cpiResult.value) {
        try {
          const data = cpiResult.value;
          const cpiValue = data.value ?? data.inflation ?? data.cpi;
          if (cpiValue != null) {
            const parsed = parseFloat(cpiValue);
            if (!isNaN(parsed) && parsed > 0) {
              // Если > 1, считаем проценты (10.5), иначе доля (0.105)
              const inflRate = parsed > 1 ? parsed / 100 : parsed;
              setInflation(inflRate);
              const pct = parsed > 1 ? parsed : parsed * 100;
              const year = data.year || data.period_date?.substring(0, 4) || '';
              if (year) {
                setInflationInfo(`Инфляция ${year}: ${pct.toFixed(1)}%`);
              }
            }
          }
        } catch {
          // Используем фолбэк
        }
      }

      // Ставка рефинансирования из макроданных
      if (macroResult.status === 'fulfilled' && macroResult.value) {
        try {
          const data = macroResult.value;
          // Ищем ставку рефинансирования в массиве индикаторов или напрямую
          let refinValue: number | null = null;
          let refinDate = '';

          if (data.refinancing_rate != null) {
            refinValue = parseFloat(data.refinancing_rate);
          } else if (Array.isArray(data.indicators || data)) {
            const indicators = data.indicators || data;
            const refinItem = indicators.find((i: unknown) =>
              i.indicator_code?.includes('refinancing') ||
              i.indicator_name?.toLowerCase().includes('рефинанс') ||
              i.indicator_name?.toLowerCase().includes('ставка')
            );
            if (refinItem?.value != null) {
              refinValue = parseFloat(refinItem.value);
              refinDate = refinItem.period_date || '';
            }
          }

          if (refinValue != null && !isNaN(refinValue) && refinValue > 0) {
            setBankRate(refinValue > 1 ? refinValue / 100 : refinValue);
            if (refinDate) {
              setBankRateInfo(`Ставка ЦБ на ${refinDate}`);
            }
          }
        } catch {
          // Используем фолбэк
        }
      }

      setRatesLoading(false);
    };

    fetchRates();
  }, []);

  const calculate = async () => {
    const inv = parseFloat(amount);
    const yrs = parseInt(years);
    if (!inv || !yrs) return;
    setLoading(true);
    setResult(null);

    const bankReturn = inv * Math.pow(1 + bankRate, yrs);
    const inflationLoss = inv * Math.pow(1 + inflation, yrs);

    try {
      const res = await apiRequest('/ai/market-analysis', {
        method: 'POST',
        body: JSON.stringify({
          query: `Investment of $${inv} in ${industry} in Uzbekistan for ${yrs} years. Calculate ROI, breakeven, risks. Compare with bank deposit ${Math.round(bankRate * 100)}% and inflation ${Math.round(inflation * 100)}%. Answer in Russian.`,
          language: 'ru'
        })
      });

      const roi = industry.includes('IT') ? 0.35 : industry.includes('недвижим') ? 0.28 : industry.includes('мук') ? 0.25 : 0.22;
      const investReturn = inv * Math.pow(1 + roi, yrs);

      const chartData = Array.from({ length: yrs }, (_, i) => ({
        year: `Год ${i + 1}`,
        'Ваша инвестиция': Math.round(inv * Math.pow(1 + roi, i + 1)),
        'Банковский депозит': Math.round(inv * Math.pow(1 + bankRate, i + 1)),
        'Инфляция': Math.round(inv * Math.pow(1 + inflation, i + 1)),
      }));

      setResult({
        investReturn: Math.round(investReturn),
        bankReturn: Math.round(bankReturn),
        inflationImpact: Math.round(inflationLoss),
        roi: Math.round(roi * 100),
        profit: Math.round(investReturn - inv),
        profitUZS: Math.round((investReturn - inv) * uzsRate),
        chartData,
        aiAnalysis: res.analysis,
      });
    } catch (e) {
      alert('Ошибка расчёта');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '15px', fontWeight: '600' as const, backgroundColor: '#f8fafc', color: '#1e293b' };
  const labelStyle = { fontSize: '12px', color: '#64748b', fontWeight: '500' as const, display: 'block' as const, marginBottom: '6px' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>Back</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Investment Calculator</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>ROI, breakeven и сравнение с депозитом</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Параметры</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <span style={labelStyle}>Сумма (USD)</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Срок (лет)</span>
            <input type="number" value={years} onChange={e => setYears(e.target.value)} min="1" max="10" style={inputStyle} />
          </div>
          <div>
            <span style={labelStyle}>Отрасль</span>
            <select value={industry} onChange={e => setIndustry(e.target.value)} style={{ ...inputStyle, fontWeight: 'normal' }}>
              {industries.map((ind, i) => <option key={i} value={ind}>{ind}</option>)}
            </select>
          </div>
        </div>

        {/* Актуальные ставки */}
        <div style={{ display: 'flex', gap: '16px', padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '8px', marginBottom: ratesLoading ? '16px' : '8px', flexWrap: 'wrap' }}>
          {ratesLoading ? (
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Загрузка актуальных ставок...</span>
          ) : (
            <>
              <span style={{ fontSize: '12px', color: '#64748b' }}>🏦 Ставка банков УЗ: <b>{Math.round(bankRate * 100)}%</b></span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>📈 Инфляция: <b>{(inflation * 100).toFixed(1)}%</b></span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>💱 1 USD = <b>{Math.round(uzsRate).toLocaleString('ru-RU')} сум</b></span>
            </>
          )}
        </div>

        {/* Источники данных */}
        {!ratesLoading && (rateDate || inflationInfo || bankRateInfo) && (
          <div style={{ display: 'flex', gap: '12px', padding: '4px 16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {rateDate && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>Курс ЦБ на {rateDate}</span>
            )}
            {inflationInfo && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{inflationInfo}</span>
            )}
            {bankRateInfo && (
              <span style={{ fontSize: '11px', color: '#94a3b8' }}>{bankRateInfo}</span>
            )}
          </div>
        )}

        <button onClick={calculate} disabled={loading || ratesLoading} style={{ padding: '11px 32px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: loading || ratesLoading ? 0.7 : 1 }}>
          {loading ? 'Рассчитываю...' : 'Рассчитать'}
        </button>
      </div>

      {loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🧮</div>
          <p style={{ color: '#1e293b', fontSize: '15px', fontWeight: '600' }}>AI рассчитывает инвестицию...</p>
        </div>
      )}

      {result && !loading && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Ваша инвестиция вернёт', value: `$${result.investReturn.toLocaleString()}`, sub: `+$${result.profit.toLocaleString()} прибыль`, color: '#22c55e', bg: '#f0fdf4' },
              { label: 'Банковский депозит', value: `$${result.bankReturn.toLocaleString()}`, sub: `Ставка ${Math.round(bankRate * 100)}% годовых`, color: '#3b82f6', bg: '#eff6ff' },
              { label: 'Потери от инфляции', value: `$${result.inflationImpact.toLocaleString()}`, sub: 'Реальная стоимость', color: '#ef4444', bg: '#fef2f2' },
              { label: 'Прибыль в сумах', value: `${result.profitUZS.toLocaleString()}`, sub: `ROI: ${result.roi}% годовых`, color: '#8b5cf6', bg: '#f5f3ff' },
            ].map((card, i) => (
              <div key={i} style={{ backgroundColor: card.bg, borderRadius: '12px', padding: '20px', border: `1px solid ${card.color}30` }}>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{card.label}</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: card.color }}>{card.value}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{card.sub}</p>
              </div>
            ))}
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>Сравнение за {years} лет</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={result.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Ваша инвестиция" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Банковский депозит" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Инфляция" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '20px' }}>🤖</span>
              <div>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>AI анализ</p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Powered by Groq LLaMA</p>
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{result.aiAnalysis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
