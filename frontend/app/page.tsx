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
      setNewName(''); setNewDesc('');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    await portfolios.delete(id);
    setPortfolioList(portfolioList.filter(p => p.id !== id));
  };

  const handleLogout = () => { localStorage.removeItem('token'); router.push('/login'); };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400">AI Capital Management</h1>
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg">Выйти</button>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Создать портфель</h2>
          <div className="flex gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Название портфеля" className="flex-1 bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Описание (опционально)" className="flex-1 bg-gray-800 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleCreate} disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg disabled:opacity-50">
              {loading ? '...' : 'Создать'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolioList.map(p => (
            <div key={p.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-blue-500 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-blue-300">{p.name}</h3>
                <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
              </div>
              <p className="text-gray-400 text-sm mb-3">{p.description || 'Нет описания'}</p>
              <div className="flex justify-between items-center">
                <span className="text-green-400 font-bold">{p.total_value}</span>
                <button onClick={() => router.push('/portfolio/' + p.id)}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-1 rounded-lg text-sm">Открыть</button>
              </div>
            </div>
          ))}
          {portfolioList.length === 0 && (
            <div className="col-span-2 text-center text-gray-500 py-12">Портфелей пока нет. Создайте первый!</div>
          )}
        </div>
      </div>
    </div>
  );
}
