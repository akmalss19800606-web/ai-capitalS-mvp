'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { portfolios, market, ai, apiRequest } from '@/lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

interface PortfolioAsset {
  symbol: string;
  name: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  change_percent: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

export default function PortfolioDetail() {
  const router = useRouter();
  const params = useParams();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [assets, setAssets] = useState<PortfolioAsset[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [marketData, setMarketData] = useState<unknown>(null);
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [marketLoading, setMarketLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const portfolioId = Number(params.id);

    portfolios.get(portfolioId)
      .then((data: Portfolio) => {
        setPortfolio(data);
        // Загрузить активы портфеля
        loadAssets(portfolioId);
        // Загрузить историю для графика
        loadChartHistory(portfolioId);
      })
      .catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, []);

  const loadAssets = async (portfolioId: number) => {
    setAssetsLoading(true);
    try {
      const data = await apiRequest(`/portfolios/${portfolioId}/assets`);
      if (Array.isArray(data)) {
        setAssets(data);
      }
    } catch (e) {
      // Активы ещё не добавлены — показываем пустой список
      setAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const loadChartHistory = async (portfolioId: number) => {
    try {
      const data = await apiRequest(`/portfolios/${portfolioId}/history`);
      if (Array.isArray(data) && data.length > 0) {
        setChartData(data);
      }
    } catch {
      // Нет истории — график не показываем
      setChartData([]);
    }
  };

  const handleGetMarket = async () => {
    if (!symbol.trim()) return;
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
    if (!portfolio || !symbol.trim()) return;
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

  // Вычисление статистики на основе реальных данных
  const totalValue = portfolio?.total_value || 0;
  const assetCount = assets.length;
  const avgChange = assets.length > 0
    ? (assets.reduce((sum, a) => sum + (a.change_percent || 0), 0) / assets.length)
    : 0;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b' }}>Загрузка...</p>
    </div>
  );

  if (!portfolio) return null;

  const portfolioName = portfolio.name || `Портфель #${portfolio.id}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>Назад</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>{portfolioName}</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>{portfolio.description || 'Инвестиционный портфель'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Общая стоимость</p>
          <p style={{ fontSize: '26px', fontWeight: '700', color: '#1e293b' }}>{totalValue.toLocaleString('ru-RU')} UZS</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Активы</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: '#3b82f6' }}>{assetCount}</p>
        </div>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>Ср. изменение</p>
          <p style={{ fontSize: '22px', fontWeight: '700', color: avgChange >= 0 ? '#22c55e' : '#ef4444' }}>
            {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>Динамика портфеля</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="#eff6ff" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Рыночные данные + AI анализ</h2>

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
            placeholder="Тикер (напр. UZSE:UZMK)"
            aria-label="Тикер"
            style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', width: '220px', backgroundColor: '#f8fafc', color: '#1e293b' }}
          />
          <button
            onClick={handleGetMarket}
            disabled={marketLoading || !symbol.trim()}
            style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: (marketLoading || !symbol.trim()) ? 'not-allowed' : 'pointer', opacity: (marketLoading || !symbol.trim()) ? 0.7 : 1 }}
          >
            {marketLoading ? 'Загрузка...' : 'Получить цену'}
          </button>
          <button
            onClick={handleGetAI}
            disabled={aiLoading || !symbol.trim()}
            style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: (aiLoading || !symbol.trim()) ? 'not-allowed' : 'pointer', opacity: (aiLoading || !symbol.trim()) ? 0.7 : 1 }}
          >
            {aiLoading ? 'Анализ...' : 'AI Рекомендация'}
          </button>
        </div>

        {marketData && (
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Цена</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{marketData.price}</p>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Изменение</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: parseFloat(marketData.change) >= 0 ? '#22c55e' : '#ef4444' }}>{marketData.change}</p>
            </div>
            <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '12px', color: '#94a3b8' }}>Изменение %</p>
              <p style={{ fontSize: '20px', fontWeight: '700', color: marketData.change_percent?.includes('-') ? '#ef4444' : '#22c55e' }}>{marketData.change_percent}</p>
            </div>
            {marketData.volume && (
              <div style={{ padding: '12px 20px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>Объём</p>
                <p style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{parseInt(marketData.volume).toLocaleString('ru-RU')}</p>
              </div>
            )}
          </div>
        )}

        {aiResult && (
          <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: '#f5f3ff', border: '1px solid #ddd6fe' }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#7c3aed', marginBottom: '8px' }}>AI Рекомендация</p>
            <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{aiResult}</p>
          </div>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Активы портфеля</h2>
        {assetsLoading ? (
          <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>Загрузка активов...</p>
        ) : assets.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '20px' }}>
            Активы ещё не добавлены. Используйте раздел «Решения» для добавления активов.
          </p>
        ) : (
          assets.map((asset, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < assets.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '10px', color: '#3b82f6' }}>{asset.symbol}</div>
                <div>
                  <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{asset.symbol}</p>
                  <p style={{ color: '#94a3b8', fontSize: '12px' }}>{asset.name}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>{asset.current_price?.toLocaleString('ru-RU')} UZS</p>
                <p style={{ color: (asset.change_percent || 0) >= 0 ? '#22c55e' : '#ef4444', fontSize: '12px' }}>
                  {(asset.change_percent || 0) >= 0 ? '+' : ''}{(asset.change_percent || 0).toFixed(2)}%
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
