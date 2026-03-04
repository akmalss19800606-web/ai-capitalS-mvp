'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolios } from '@/lib/api';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

const tools = [
  { label: '🔍 Due Diligence', path: '/due-diligence', desc: 'Проверка компании', color: '#1e293b', bg: '#f1f5f9' },
  { label: '🇺🇿 Рынок УЗ', path: '/market-uz', desc: 'Анализ рынков', color: '#3b82f6', bg: '#eff6ff' },
  { label: '🧮 Калькулятор', path: '/calculator', desc: 'ROI и сравнение', color: '#22c55e', bg: '#f0fdf4' },
  { label: '📊 Макро УЗ', path: '/macro-uz', desc: 'Курс сума и ЦБ', color: '#8b5cf6', bg: '#f5f3ff' },
  { label: '📄 PDF Отчёт', path: '/report', desc: 'Скачать отчёт', color: '#f59e0b', bg: '#fffbeb' },
];

export default function Dashboard() {
  const router = useRouter();
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    portfolios.list().then(setPortfolioList).catch(() => router.push('/login'));
  }, []);

  const handleCreate = async () => {
    if (!newName) return;
    setLoading(true);
    try {
      const p = await portfolios.create({ name: newName, description: newDesc });
      setPortfolioList([...portfolioList, p]);
      setNewName('');
      setNewDesc('');
    } catch (e) {
      alert('Ошибка создания портфеля');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await portfolios.delete(id);
    setPortfolioList(portfolioList.filter(p => p.id !== id));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#1e293b" }}>Мои портфели</h1>
          <p style={{ color: "#64748b", marginTop: "4px", fontSize: "14px" }}>AI Capital Management · Инвестиционная платформа</p>
        </div>
        <button onClick={handleLogout} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#64748b", fontSize: "14px", cursor: "pointer" }}>Выйти</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {tools.map((tool, i) => (
          <button key={i} onClick={() => router.push(tool.path)} style={{ padding: "14px 12px", borderRadius: "10px", border: `1px solid ${tool.color}30`, backgroundColor: tool.bg, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
            <p style={{ fontSize: "14px", fontWeight: "700", color: tool.color, marginBottom: "2px" }}>{tool.label}</p>
            <p style={{ fontSize: "11px", color: "#64748b" }}>{tool.desc}</p>
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px", marginBottom: "20px", border: "1px solid #e2e8f0" }}>
        <h2 style={{ fontSize: "15px", fontWeight: "600", marginBottom: "14px", color: "#1e293b" }}>Создать новый портфель</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Название портфеля" style={{ flex: 1, minWidth: "180px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc", color: "#1e293b" }} />
          <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Описание (опционально)" style={{ flex: 2, minWidth: "180px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", backgroundColor: "#f8fafc", color: "#1e293b" }} />
          <button onClick={handleCreate} disabled={loading} style={{ padding: "10px 24px", borderRadius: "8px", backgroundColor: "#3b82f6", color: "#ffffff", border: "none", fontSize: "14px", fontWeight: "600", opacity: loading ? 0.7 : 1, cursor: "pointer" }}>
            {loading ? 'Создание...' : 'Создать'}
          </button>
        </div>
      </div>

      {portfolioList.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", backgroundColor: "#fff", borderRadius: "12px", border: "1px dashed #cbd5e1", color: "#94a3b8" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📊</div>
          <p style={{ fontSize: "16px" }}>У вас пока нет портфелей</p>
          <p style={{ fontSize: "14px", marginTop: "4px" }}>Создайте первый портфель выше</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {portfolioList.map(p => (
            <div key={p.id} style={{ backgroundColor: "#ffffff", borderRadius: "12px", padding: "20px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", fontSize: "16px" }}>
                  {p.name ? p.name.charAt(0).toUpperCase() : "P"}
                </div>
                <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "12px", cursor: "pointer" }}>Удалить</button>
              </div>
              <h3 style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>{p.name}</h3>
              <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>{p.description || "Без описания"}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: "12px", color: "#94a3b8" }}>Стоимость</p>
                  <p style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>${(p.total_value || 0).toLocaleString()}</p>
                </div>
                <button onClick={() => router.push(`/portfolio/${p.id}`)} style={{ padding: "8px 16px", borderRadius: "8px", backgroundColor: "#eff6ff", color: "#3b82f6", border: "1px solid #bfdbfe", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}>Открыть →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}