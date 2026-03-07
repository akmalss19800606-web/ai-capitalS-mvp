'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Decision {
  id: number;
  asset_name: string;
  asset_symbol: string;
  decision_type: string;
  amount: number;
  price: number;
  notes?: string;
  ai_recommendation?: string;
  status: string;
  portfolio_id: number;
  created_at: string;
}

interface Portfolio {
  id: number;
  name: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: '#94a3b8',
  review: '#f59e0b',
  approved: '#22c55e',
  in_progress: '#3b82f6',
  completed: '#8b5cf6',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Черновик',
  review: 'На проверке',
  approved: 'Одобрено',
  in_progress: 'В работе',
  completed: 'Завершено',
};

const DECISION_TYPES: Record<string, string> = {
  BUY: 'Купить',
  SELL: 'Продать',
  HOLD: 'Держать',
};

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DecisionsPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    asset_name: '',
    asset_symbol: '',
    decision_type: 'BUY',
    amount: '',
    price: '',
    notes: '',
    portfolio_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  const fetchAll = async () => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    try {
      const res = await fetch(`${API}/api/v1/portfolios/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pList: Portfolio[] = await res.json();
      setPortfolios(pList);
      const allDecisions: Decision[] = [];
      for (const p of pList) {
        const dr = await fetch(`${API}/api/v1/decisions/portfolio/${p.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (dr.ok) {
          const dd = await dr.json();
          allDecisions.push(...dd);
        }
      }
      setDecisions(allDecisions);
    } catch (e) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!form.asset_name || !form.portfolio_id) {
      setError('Заполните название актива и выберите портфель');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/v1/decisions/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asset_name: form.asset_name,
          asset_symbol: form.asset_symbol || 'UZB',
          decision_type: form.decision_type,
          amount: Number(form.amount) || 1,
          price: Number(form.price) || 0,
          notes: form.notes,
          portfolio_id: Number(form.portfolio_id),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ошибка');
      }
      setForm({ asset_name: '', asset_symbol: '', decision_type: 'BUY', amount: '', price: '', notes: '', portfolio_id: '' });
      setShowForm(false);
      fetchAll();
    } catch (e: any) {
      setError(e.message || 'Ошибка создания решения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить это решение?')) return;
    const token = getToken();
    await fetch(`${API}/api/v1/decisions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchAll();
  };

  const getPortfolioName = (id: number) => {
    const p = portfolios.find(p => p.id === id);
    return p ? p.name : `Портфель #${id}`;
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <p style={{ color: '#64748b', fontSize: '15px' }}>Загрузка...</p>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Инвестиционные решения</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Управление и отслеживание инвестиционных решений</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Новое решение
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}>
          <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>
        </div>
      )}

      {showForm && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Создать инвестиционное решение</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                placeholder="Название актива * (напр: Kapitalbank)"
                value={form.asset_name}
                onChange={e => setForm({ ...form, asset_name: e.target.value })}
                style={{ flex: 2, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
              />
              <input
                placeholder="Тикер (напр: KBANK)"
                value={form.asset_symbol}
                onChange={e => setForm({ ...form, asset_symbol: e.target.value })}
                style={{ flex: 1, minWidth: '120px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
              />
              <select
                value={form.decision_type}
                onChange={e => setForm({ ...form, decision_type: e.target.value })}
                style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
              >
                <option value="BUY">Купить</option>
                <option value="SELL">Продать</option>
                <option value="HOLD">Держать</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                placeholder="Количество (напр: 10)"
                type="number"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                style={{ flex: 1, minWidth: '150px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
              />
              <input
                placeholder="Цена за единицу (сум)"
                type="number"
                value={form.price}
                onChange={e => setForm({ ...form, price: e.target.value })}
                style={{ flex: 1, minWidth: '150px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
              />
              <select
                value={form.portfolio_id}
                onChange={e => setForm({ ...form, portfolio_id: e.target.value })}
                style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: form.portfolio_id ? '#1e293b' : '#94a3b8' }}
              >
                <option value="">— Выберите портфель *</option>
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Обоснование решения (опционально)"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#22c55e', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Сохранение...' : 'Создать решение'}
              </button>
              <button onClick={() => { setShowForm(false); setError(''); }} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {decisions.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '60px', border: '1px dashed #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '8px' }}>Нет решений</p>
          <p style={{ color: '#cbd5e1', fontSize: '14px' }}>Создайте первое инвестиционное решение</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {decisions.map(d => (
            <div key={d.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', backgroundColor: (STATUS_COLORS[d.status] || '#94a3b8') + '20', color: STATUS_COLORS[d.status] || '#94a3b8', fontSize: '12px', fontWeight: '600' }}>
                    {STATUS_LABELS[d.status] || d.status}
                  </span>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', backgroundColor: d.decision_type === 'BUY' ? '#dcfce7' : d.decision_type === 'SELL' ? '#fef2f2' : '#eff6ff', color: d.decision_type === 'BUY' ? '#16a34a' : d.decision_type === 'SELL' ? '#dc2626' : '#3b82f6', fontSize: '12px', fontWeight: '700' }}>
                    {DECISION_TYPES[d.decision_type] || d.decision_type}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>#{d.id} · {getPortfolioName(d.portfolio_id)}</span>
                </div>
                <p style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px', marginBottom: '2px' }}>{d.asset_name} <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '400' }}>({d.asset_symbol})</span></p>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  Кол-во: {d.amount} · Цена: {d.price > 0 ? `${d.price.toLocaleString('ru-RU')} сум` : 
'по договору'}
                </p>
                {d.notes && <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>{d.notes}</p>}
                {d.ai_recommendation && (
                  <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <p style={{ fontSize: '12px', color: '#3b82f6' }}>🤖 AI: {d.ai_recommendation}</p>
                  </div>
                )}
                <p style={{ color: '#cbd5e1', fontSize: '12px', marginTop: '8px' }}>
                  {new Date(d.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <button
                  onClick={() => handleDelete(d.id)}
                  style={{ padding: '5px 12px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', fontSize: '12px', cursor: 'pointer' }}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
