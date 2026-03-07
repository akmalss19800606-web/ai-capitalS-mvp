'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Decision {
  id: number;
  title: string;
  description: string;
  status: string;
  portfolio_id: number;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  Draft: '#94a3b8',
  Review: '#f59e0b',
  Approved: '#22c55e',
  'In Progress': '#3b82f6',
  Completed: '#8b5cf6',
};

const STATUS_LIST = ['Draft', 'Review', 'Approved', 'In Progress', 'Completed'];

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function DecisionsPage() {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', portfolio_id: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('token');

  const fetchDecisions = async () => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    try {
      // Получаем все портфели, потом решения по каждому
      const res = await fetch(`${API}/api/v1/portfolios/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const portfolios = await res.json();
      const allDecisions: Decision[] = [];
      for (const p of portfolios) {
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
      setError('Ошибка загрузки решений');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDecisions(); }, []);

  const handleCreate = async () => {
    if (!form.title || !form.portfolio_id) { setError('Заполните название и ID портфеля'); return; }
    setSaving(true);
    setError('');
    try {
      const token = getToken();
      const res = await fetch(`${API}/api/v1/decisions/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          portfolio_id: Number(form.portfolio_id),
          status: 'Draft',
        }),
      });
      if (!res.ok) throw new Error();
      setForm({ title: '', description: '', portfolio_id: '' });
      setShowForm(false);
      fetchDecisions();
    } catch {
      setError('Ошибка создания решения');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    const token = getToken();
    await fetch(`${API}/api/v1/decisions/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchDecisions();
  };

  const handleDelete = async (id: number) => {
    const token = getToken();
    await fetch(`${API}/api/v1/decisions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchDecisions();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><p style={{ color: '#64748b' }}>Загрузка...</p></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Investment Decisions</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Управление инвестиционными решениями</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
        >
          + Новое решение
        </button>
      </div>

      {error && <div style={{ padding: '10px 16px', borderRadius: '8px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', marginBottom: '16px' }}><p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p></div>}

      {showForm && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Создать решение</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              placeholder="Название решения *"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
            />
            <textarea
              placeholder="Описание (опционально)"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', resize: 'vertical' }}
            />
            <input
              placeholder="ID портфеля *"
              type="number"
              value={form.portfolio_id}
              onChange={e => setForm({ ...form, portfolio_id: e.target.value })}
              style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b', width: '200px' }}
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#22c55e', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Сохранение...' : 'Создать'}
              </button>
              <button onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: '8px', backgroundColor: '#f1f5f9', color: '#64748b', border: 'none', fontSize: '14px', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {decisions.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '60px', border: '1px dashed #e2e8f0', textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: '16px', marginBottom: '8px' }}>Нет решений</p>
          <p style={{ color: '#cbd5e1', fontSize: '14px' }}>Создайте первое инвестиционное решение</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {decisions.map(d => (
            <div key={d.id} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '20px', backgroundColor: STATUS_COLORS[d.status] + '20', color: STATUS_COLORS[d.status], fontSize: '12px', fontWeight: '600' }}>{d.status}</span>
                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>#{d.id} · Portfolio {d.portfolio_id}</span>
                </div>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '15px', marginBottom: '4px' }}>{d.title}</p>
                {d.description && <p style={{ color: '#64748b', fontSize: '13px' }}>{d.description}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                <select
                  value={d.status}
                  onChange={e => handleStatusChange(d.id, e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#1e293b', backgroundColor: '#f8fafc', cursor: 'pointer' }}
                >
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
