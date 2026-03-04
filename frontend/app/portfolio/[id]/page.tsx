'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { market, ai } from '@/lib/api';

export default function PortfolioPage() {
  const router = useRouter();
  const { id } = useParams();
  const [symbol, setSymbol] = useState('');
  const [marketData, setMarketData] = useState<any>(null);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const handleMarketSearch = async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const data = await market.getPrice(symbol.toUpperCase());
      setMarketData(data);
    } catch { setMarketData({ error: 'Символ не найден' }); }
    finally { setLoading(false); }
  };

  const handleAiRecommend = async () => {
    if (!marketData?.price) return;
    setAiLoading(true);
    try {
      const data = await ai.recommend({
        asset_name: symbol,
        asset_symbol: symbol.toUpperCase(),
        current_price: marketData.price,
        portfolio_id: Number(id)
      });
      setRecommendation(data.recommendation);
    } finally { setAiLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/')} className="text-blue-400 hover:text-blue-300">← Назад</button>
          <h1 className="text-2xl font-bold text-blue-400">Анализ рынка</h1>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Поиск актива</h2>
          <div className="flex gap-3">
            <input value={symbol} onChange={e => setSymbol(e.target.value)}
              placeholder="Тикер (AAPL, MSFT...)" onKeyDown={e => e.key === 'Enter' && handleMarketSearch()}
              className="flex-1 bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500 uppercase" />
            <button onClick={handleMarketSearch} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg disabled:opacity-50">
              {loading ? '...' : 'Найти'}
            </button>
          </div>
        </div>
        {marketData && !marketData.error && (
          <div className="bg-gray-900 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-green-400">{marketData.symbol}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Цена</p>
                <p className="text-2xl font-bold">${marketData.price}</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Изменение</p>
                <p className={`text-xl font-bold ${parseFloat(marketData.change) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {marketData.change} ({marketData.change_percent})
                </p>
              </div>
            </div>
            <button onClick={handleAiRecommend} disabled={aiLoading}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-semibold disabled:opacity-50">
              {aiLoading ? 'AI анализирует...' : 'Получить AI рекомендацию'}
            </button>
          </div>
        )}
        {recommendation && (
          <div className="bg-gray-900 border border-purple-500 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3 text-purple-400">AI Рекомендация</h2>
            <p className="text-gray-200 leading-relaxed">{recommendation}</p>
          </div>
        )}
      </div>
    </div>
  );
}
