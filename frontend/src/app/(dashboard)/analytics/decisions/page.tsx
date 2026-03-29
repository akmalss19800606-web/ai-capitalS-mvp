'use client';
import { useState, useEffect, useCallback } from 'react';

const C = {
  pageBg: '#f8f8fc',
  card: '#ffffff',
  cardBorder: '#e2e8f0',
  darkBg: 'bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900',
};

type DecisionType = 'buy' | 'sell' | 'hold' | 'restructure' | 'hedge';

interface Decision {
  type: DecisionType;
  assetName: string;
  ticker: string;
  quantity: number;
  pricePerUnit: number;
  targetReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  horizon: string;
  geography: string;
  financingMethod: string;
  justification: string;
  tags: string;
}

interface ImpactRow {
  label: string;
  current: string;
  afterNsbu: string;
  afterIfrs: string;
  status: 'ok' | 'warn' | 'bad';
  message?: string;
}

interface HistoryItem {
  id: number;
  decision_type: string;
  asset_name: string;
  ticker: string;
  quantity: number;
  price_per_unit: number;
  created_at: string;
  status: string;
}

const TYPE_CONFIG: Record<DecisionType, { label: string; color: string; icon: string }> = {
  buy: { label: 'Купить', color: 'bg-green-500', icon: '🟢' },
  sell: { label: 'Продать', color: 'bg-red-500', icon: '🔴' },
  hold: { label: 'Удержать', color: 'bg-yellow-500', icon: '🟡' },
  restructure: { label: 'Реструктуризация', color: 'bg-blue-500', icon: '🔵' },
  hedge: { label: 'Хеджировать', color: 'bg-purple-500', icon: '🟣' },
};

function fmtUZS(n: number | null | undefined): string {
  if (n === null || n === undefined) return '---';
  return new Intl.NumberFormat('ru-UZ', { style: 'decimal', maximumFractionDigits: 0 }).format(n) + ' UZS';
}

function ImpactCalculator({ form }: { form: Partial<Decision> }) {
  const [impact, setImpact] = useState<ImpactRow[]>([]);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  const totalAmount = (form.quantity || 0) * (form.pricePerUnit || 0);

  const fetchImpact = useCallback(async () => {
    if (!form.assetName || !form.quantity || !form.pricePerUnit || totalAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/decisions/impact`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            decision_type: form.type,
            amount: totalAmount,
            asset_category: form.assetName,
            financing_method: form.financingMethod || 'equity',
          }),
        }
      );
      if (res.ok) {
        const d = await res.json();
        if (d?.rows) setImpact(d.rows);
      }
    } catch { /* сеть недоступна */ }
    finally { setLoading(false); }
  }, [form.assetName, form.quantity, form.pricePerUnit, form.type, form.financingMethod, totalAmount, token]);

  useEffect(() => { fetchImpact(); }, [fetchImpact]);

  if (!form.assetName || !form.quantity || !form.pricePerUnit) return null;
  if (loading) return <div className="p-4 text-slate-400 text-sm">⏳ Пересчитываем показатели...</div>;
  if (!impact.length) return null;

  return (
    <div className={`${C.darkBg} rounded-2xl p-6 mt-6`}>
      <h4 className="text-white font-semibold mb-4">⚡ Автоматический расчёт Impact</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2 pr-4">Показатель</th>
              <th className="text-right py-2 pr-4">Сейчас</th>
              <th className="text-right py-2 pr-4">После (НСБУ)</th>
              <th className="text-right py-2">После (МСФО)</th>
            </tr>
          </thead>
          <tbody>
            {impact.map((row, i) => (
              <tr key={i} className="border-b border-slate-800">
                <td className="py-2 pr-4 text-slate-300">{row.label}</td>
                <td className="py-2 pr-4 text-right text-slate-400">{row.current}</td>
                <td className={`py-2 pr-4 text-right font-medium ${
                  row.status === 'ok' ? 'text-emerald-400' :
                  row.status === 'warn' ? 'text-yellow-400' : 'text-red-400'
                }`}>{row.afterNsbu}</td>
                <td className={`py-2 text-right font-medium ${
                  row.status === 'ok' ? 'text-emerald-400' :
                  row.status === 'warn' ? 'text-yellow-400' : 'text-red-400'
                }`}>{row.afterIfrs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {impact.filter(r => r.status !== 'ok' && r.message).map((row, i) => (
        <div key={i} className={`mt-3 p-3 rounded-lg text-xs ${
          row.status === 'warn' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-red-900/30 text-red-300'
        }`}>
          {row.status === 'warn' ? '⚠️' : '🚨'} {row.message}
        </div>
      ))}
    </div>
  );
}

export default function DecisionsPage() {
  const [activeType, setActiveType] = useState<DecisionType>('buy');
  const [form, setForm] = useState<Partial<Decision>>({ type: 'buy' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const token = typeof window !== 'undefined'
    ? localStorage.getItem('access_token') || localStorage.getItem('token') : '';

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/decisions?limit=20`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      if (res.ok) {
        const d = await res.json();
        setHistory(Array.isArray(d) ? d : (d.items || []));
      }
    } catch { /* ignore */ }
    finally { setHistLoading(false); }
  }, [token]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  function setField(k: keyof Decision, v: string | number) {
    setForm(f => ({ ...f, [k]: v }));
  }

  function selectType(t: DecisionType) {
    setActiveType(t);
    setForm(f => ({ ...f, type: t }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/decisions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            decision_type: activeType,
            asset_name: form.assetName,
            ticker: form.ticker,
            quantity: form.quantity,
            price_per_unit: form.pricePerUnit,
            target_return: form.targetReturn,
            risk_level: form.riskLevel,
            investment_horizon: form.horizon,
            geography: form.geography,
            financing_method: form.financingMethod,
            justification: form.justification,
            tags: form.tags,
          }),
        }
      );
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await loadHistory();
      } else {
        setSaveError('Ошибка сохранения: ' + res.status);
      }
    } catch {
      setSaveError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  const totalAmount = (form.quantity || 0) * (form.pricePerUnit || 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">⚡ Инвестиционные решения</h2>
        <p className="text-sm text-gray-500">Создайте решение — система автоматически рассчитает влияние на НСБУ и МСФО показатели</p>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="font-semibold text-gray-800 mb-4">🎯 Тип решения</h3>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(TYPE_CONFIG) as DecisionType[]).map(t => {
            const cfg = TYPE_CONFIG[t];
            return (
              <button
                key={t}
                onClick={() => selectType(t)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  activeType === t
                    ? `${cfg.color} text-white border-transparent shadow-lg`
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {cfg.icon} {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h3 className="font-semibold text-gray-800 mb-4">📝 Параметры решения</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Название актива *</label>
            <input type="text" placeholder="Например: Акции UZCARD"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setField('assetName', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Тикер</label>
            <input type="text" placeholder="UZCD"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setField('ticker', e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Количество *</label>
            <input type="number" placeholder="1000"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setField('quantity', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Цена за единицу (UZS) *</label>
            <input type="number" placeholder="50000"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setField('pricePerUnit', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Целевая доходность (%)</label>
            <input type="number" placeholder="15.0"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={e => setField('targetReturn', Number(e.target.value))} />
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Уровень риска</label>
            <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
              onChange={e => setField('riskLevel', e.target.value)}>
              <option value="low">🟢 Низкий</option>
              <option value="medium">🟡 Средний</option>
              <option value="high">🔴 Высокий</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Горизонт инвестиций</label>
            <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
              onChange={e => setField('horizon', e.target.value)}>
              <option value="short">Краткосрочный (до 1 года)</option>
              <option value="medium">Среднесрочный (1-3 года)</option>
              <option value="long">Долгосрочный (3+ лет)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Метод финансирования</label>
            <select className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
              onChange={e => setField('financingMethod', e.target.value)}>
              <option value="equity">Собственный капитал</option>
              <option value="murabaha">Мурабаха (Исламский кредит)</option>
              <option value="musharaka">Мушарака (Партнёрство)</option>
              <option value="debt">Заёмный капитал</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm text-gray-600 block mb-1">Обоснование</label>
            <textarea rows={3} placeholder="Укажите причину решения..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              onChange={e => setField('justification', e.target.value)} />
          </div>
        </div>

        {totalAmount > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700">
              <span className="font-semibold">💰 Общая сумма сделки:</span> {fmtUZS(totalAmount)}
            </p>
          </div>
        )}

        {activeType === 'hedge' && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 mt-4">
            <h4 className="font-semibold text-purple-800 mb-3">🛡️ Параметры хеджирования</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Инструмент хеджирования</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Выберите инструмент</option>
                  <option value="fra">FRA (Соглашение о будущей ставке)</option>
                  <option value="swap">Процентный своп (IRS)</option>
                  <option value="option">Опцион</option>
                  <option value="forward">Форвардный контракт</option>
                  <option value="murabaha_hedge">Мурабаха (исламское хеджирование)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Хеджируемый риск</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">Тип риска</option>
                  <option value="interest_rate">Процентный риск</option>
                  <option value="currency">Валютный риск (USD/UZS)</option>
                  <option value="commodity">Товарный риск</option>
                  <option value="credit">Кредитный риск</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Страйк / Фиксированная ставка (%)</label>
                <input type="number" step="0.01" placeholder="12.5" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Срок хеджирования</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="3m">3 месяца</option>
                  <option value="6m">6 месяцев</option>
                  <option value="1y">1 год</option>
                  <option value="2y">2 года</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <ImpactCalculator form={form} />

        {saveError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{saveError}</div>
        )}
        <div className="flex gap-3 mt-6 flex-wrap">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? '⏳ Сохраняем...' : saved ? '✅ Сохранено!' : '💾 Сохранить решение'}
          </button>
          <button onClick={() => window.location.href = '/analytics/stress-test'}
            className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700">
            🔥 Открыть стресс-тест
          </button>
          <button onClick={() => window.location.href = '/analytics/analytics'}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            📈 Смотреть в аналитике
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">📜 История решений</h3>
          <button onClick={loadHistory}
            className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200">Обновить</button>
        </div>
        {histLoading ? (
          <p className="text-sm text-gray-400">⏳ Загружаем историю...</p>
        ) : history.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-4xl mb-2">📚</p>
            <p className="text-gray-500 text-sm">Решения ещё не создавались</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="text-left py-2 pr-4">Тип</th>
                  <th className="text-left py-2 pr-4">Актив</th>
                  <th className="text-right py-2 pr-4">Кол-во</th>
                  <th className="text-right py-2 pr-4">Цена</th>
                  <th className="text-right py-2">Дата</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, i) => (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.decision_type === 'buy' ? 'bg-green-100 text-green-700' :
                        item.decision_type === 'sell' ? 'bg-red-100 text-red-700' :
                        item.decision_type === 'hold' ? 'bg-yellow-100 text-yellow-700' :
                        item.decision_type === 'hedge' ? 'bg-purple-100 text-purple-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {TYPE_CONFIG[item.decision_type as DecisionType]?.label || item.decision_type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-800">{item.asset_name} {item.ticker && <span className="text-gray-400">({item.ticker})</span>}</td>
                    <td className="py-2 pr-4 text-right">{item.quantity?.toLocaleString('ru-UZ')}</td>
                    <td className="py-2 pr-4 text-right">{fmtUZS(item.price_per_unit)}</td>
                    <td className="py-2 text-right text-gray-400 text-xs">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('ru-RU') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
