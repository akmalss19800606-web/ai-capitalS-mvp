'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { portfolios, market, ai } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

const chartData = [
  { month: 'Oct', value: 8000 },
  { month: 'Nov', value: 8500 },
  { month: 'Dec', value: 7800 },
  { month: 'Jan', value: 9200 },
  { month: 'Feb', value: 10500 },
  { month: 'Mar', value: 10000 },
];

const statsData = [
  { label: 'Return', value: '+12.5%', color: '#22c55e' },
  { label: 'Assets', value: '6', color: '#3b82f6' },
  { label: 'Risk', value: 'Medium', color: '#f59e0b' },
  { label: 'Dividends', value: '$240', color: '#8b5cf6' },
];

const mockAssets = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: '$263.75', change: '-0.37%', changeColor: '#ef4444' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: '$172.45', change: '+1.24%', changeColor: '#22c55e' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: '$415.20', change: '+0.85%', changeColor: '#22c55e' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: '$198.90', change: '+0.62%', changeColor: '#22c55e' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: '$875.40', change: '+2.15%', changeColor: '#22c55e' },
  { symbol: 'META', name: 'Meta Platforms', price: '$512.30', change: '-0.88%', changeColor: '#ef4444' },
];

export default function PortfolioDetail() {
  const router = useRouter();
  const params = useParams();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('AAPL');
  const [marketData, setMarketData] = useState<any>(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    portfolios.get(Number(params.id))
      .then(setPortfolio)
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, []);

  const handleGetMarket = async () => {
    setMarketLoading(true);
    setErrorMsg('');
    try {
      const data = await market.getPrice(symbol.toUpperCase());
      setMarketData(data);
    } catch (e) {
      setErrorMsg('Ошибка получения рыночных данных. Проверьте тикер.');
    } finally {
      setMarketLoading(false);
    }
  };

  const handleGetAI = async () => {
    if (!portfolio) return;
    setAiLoading(true);
    setAiResult('');
    setErrorMsg('');
    try {
      const currentPrice = marketData?.price || 0;
      const res = await ai.recommend({
        asset_name: symbol.toUpperCase(),
        asset_symbol: symbol.toUpperCase(),
        current_price: currentPrice,
        portfolio_id: portfolio.id,
      });
      setAiResult(res.recommendation || res.analysis || JSON.stringify(res));
    } catch (e) {
      setErrorMsg('Ошибка получения AI рекомендации.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b' }}>Загрузка...</p>
    </div>
  );

  if (!portfolio) return null;

  const portfolioName = portfolio.name || `Портфель #${portfolio.id}`;
  const totalValue = portfolio.total_value || 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>Back</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>{portfolioName}</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{portfolio.description || 'Investment portfolio'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Total Value</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b' }}>${totalValue.toLocaleString()}</p>
        </div>
        {statsData.map((s, i) => (
          <div key={i} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>{s.label}</p>
            <p style={{ fontSize: '22px', fontWeight: '700', color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>Portfolio Dynamics</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
            <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="#eff6ff" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Market Data + AI Analysis</h2>

        {errorMsg && (
          <div style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '12px' }}>
            <p style={{ color: '#dc2626', fontSize: '13px' }}>{errorMsg}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleGetMarket()}
            placeholder="Ticker (e.g. AAPL)"
            aria-label="Ticker (e.g. AAPL)"
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '180px', backgroundColor: '#f8fafc', color: '#1e293b' }}
          />
          <button
            onClick={handleGetMarket}
            disabled={marketLoading}
            style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: marketLoading ? 'not-allowed' : 'pointer', opacity: marketLoading ? 0.7 : 1 }}
          >
            {marketLoading ? 'Loading...' : 'Get Price'}
          </button>
          <button
            onClick={handleGetAI}
            disabled={aiLoading}
            style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: aiLoading ? 'not-allowed' : 'pointer', opacity: aiLoading ? 0.7 : 1 }}
          >
            {aiLoading ? 'Analyzing...' : 'AI Recommend'}
          </button>
        </div>

        {marketData && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Price</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>${marketData.price}</p>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Change</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: parseFloat(marketData.change) >= 0 ? '#22c55e' : '#ef4444' }}>{marketData.change}</p>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Change %</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: marketData.change_percent?.includes('-') ? '#ef4444' : '#22c55e' }}>{marketData.change_percent}</p>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Volume</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{parseInt(marketData.volume).toLocaleString()}</p>
            </div>
          </div>
        )}

        {aiResult && (
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', marginBottom: '8px' }}>AI Recommendation</p>
            <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{aiResult}</p>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Assets</h2>
        {mockAssets.map((asset, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < mockAssets.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '10px', color: '#3b82f6' }}>{asset.symbol}</div>
              <div>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{asset.symbol}</p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>{asset.name}</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{asset.price}</p>
              <p style={{ color: asset.changeColor, fontSize: '12px' }}>{asset.change}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
