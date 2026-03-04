'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const uzsHistory = [
  { month: 'Сен', rate: 12400 },
  { month: 'Окт', rate: 12500 },
  { month: 'Ноя', rate: 12550 },
  { month: 'Дек', rate: 12600 },
  { month: 'Янв', rate: 12650 },
  { month: 'Фев', rate: 12680 },
  { month: 'Мар', rate: 12700 },
];

const macroData = [
  { label: 'Курс USD/UZS', value: '12,700', change: '+0.39%', color: '#3b82f6', icon: '💱', desc: 'Центральный банк Узбекистана' },
  { label: 'Инфляция', value: '10.0%', change: '-0.3%', color: '#ef4444', icon: '📈', desc: 'Годовой показатель 2024' },
  { label: 'Ставка ЦБ УЗ', value: '13.5%', change: '0%', color: '#8b5cf6', icon: '🏦', desc: 'Учётная ставка ЦБ' },
  { label: 'Рост ВВП', value: '6.2%', change: '+0.4%', color: '#22c55e', icon: '📊', desc: 'Прогноз на 2024 год' },
  { label: 'Депозитная ставка', value: '22%', change: '0%', color: '#f59e0b', icon: '🏛️', desc: 'Средняя по банкам УЗ' },
  { label: 'EUR/UZS', value: '13,850', change: '+0.15%', color: '#06b6d4', icon: '💶', desc: 'Курс евро' },
];

const bankRates = [
  { bank: 'Kapitalbank', deposit: '24%', credit: '28%', rating: '⭐⭐⭐⭐⭐' },
  { bank: 'Hamkorbank', deposit: '22%', credit: '26%', rating: '⭐⭐⭐⭐' },
  { bank: 'Ipoteka Bank', deposit: '20%', credit: '24%', rating: '⭐⭐⭐⭐' },
  { bank: 'Узпромстройбанк', deposit: '19%', credit: '23%', rating: '⭐⭐⭐' },
];

const news = [
  { title: 'ЦБ Узбекистана сохранил ставку на уровне 13.5%', date: 'Март 2026', type: 'neutral' },
  { title: 'ВВП Узбекистана вырос на 6.2% в 2024 году', date: 'Фев 2026', type: 'positive' },
  { title: 'Инфляция снизилась до 10% с 11.4% годом ранее', date: 'Янв 2026', type: 'positive' },
  { title: 'Объём иностранных инвестиций вырос на 18%', date: 'Янв 2026', type: 'positive' },
];

export default function MacroUzPage() {
  const router = useRouter();
  const [lastUpdate] = useState(new Date().toLocaleString('ru-RU'));

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>← Назад</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Макроэкономика Узбекистана</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Ключевые индикаторы для инвестора · Обновлено: {lastUpdate}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {macroData.map((item, i) => (
          <div key={i} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '18px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <span style={{ fontSize: '22px' }}>{item.icon}</span>
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', backgroundColor: item.change.includes('+') ? '#f0fdf4' : item.change === '0%' ? '#f8fafc' : '#fef2f2', color: item.change.includes('+') ? '#16a34a' : item.change === '0%' ? '#64748b' : '#dc2626', fontWeight: '600' }}>{item.change}</span>
            </div>
            <p style={{ fontSize: '22px', fontWeight: '800', color: item.color }}>{item.value}</p>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{item.label}</p>
            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{item.desc}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '20px' }}>Динамика курса USD/UZS</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={uzsHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[12300, 12800]} tickFormatter={v => v.toLocaleString()} />
            <Tooltip formatter={(value: number) => [`${value.toLocaleString()} сум`, 'USD/UZS']} contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Ставки банков Узбекистана</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                {['Банк', 'Депозит', 'Кредит', 'Рейтинг'].map(h => <th key={h} style={{ textAlign: 'left', padding: '8px 0', fontSize: '11px', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {bankRates.map((b, i) => (
                <tr key={i} style={{ borderBottom: i < bankRates.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                  <td style={{ padding: '10px 0', fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{b.bank}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px', color: '#22c55e', fontWeight: '700' }}>{b.deposit}</td>
                  <td style={{ padding: '10px 0', fontSize: '13px', color: '#ef4444', fontWeight: '700' }}>{b.credit}</td>
                  <td style={{ padding: '10px 0', fontSize: '12px' }}>{b.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Новости экономики УЗ</h2>
          {news.map((n, i) => (
            <div key={i} style={{ padding: '10px 0', borderBottom: i < news.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '16px', marginTop: '1px' }}>{n.type === 'positive' ? '📗' : n.type === 'negative' ? '📕' : '📘'}</span>
              <div>
                <p style={{ fontSize: '13px', color: '#1e293b', lineHeight: '1.4', fontWeight: '500' }}>{n.title}</p>
                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>{n.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ backgroundColor: '#eff6ff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #bfdbfe' }}>
        <p style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: '600', marginBottom: '4px' }}>💡 Вывод для инвестора</p>
        <p style={{ fontSize: '13px', color: '#1e40af', lineHeight: '1.6' }}>
          При текущей ставке ЦБ 13.5% и банковских депозитах 22%, инвестиции в реальный сектор должны приносить минимум 25-30% ROI чтобы быть привлекательнее депозита с учётом рисков. Рост ВВП 6.2% и снижение инфляции создают благоприятную среду для долгосрочных инвестиций.
        </p>
      </div>
    </div>
  );
}