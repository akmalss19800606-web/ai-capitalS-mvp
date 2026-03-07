'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

const industries = [
  "Оптовая торговля продовольствием",
  "Строительство и недвижимость",
  "Производство и переработка",
  "Транспорт и логистика",
  "IT и технологии",
  "Сельское хозяйство",
  "Финансы и банкинг",
  "Розничная торговля",
  "Туризм и гостиничный бизнес",
  "Образование",
];

const examples = [
  { company: "Узбекнефтегаз", industry: "Производство и переработка" },
  { company: "Kapitalbank", industry: "Финансы и банкинг" },
  { company: "Оптовый рынок муки Ташкент", industry: "Оптовая торговля продовольствием" },
  { company: "Artel Electronics", industry: "Производство и переработка" },
];

const STATUS_MAP: Record<string, { label: string; bg: string; border: string; text: string; icon: string }> = {
  'НАДЁЖНО':      { label: 'НАДЁЖНО',      bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '✅' },
  'НАДЕЖНО':      { label: 'НАДЁЖНО',      bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '✅' },
  'TRUSTED':      { label: 'НАДЁЖНО',      bg: '#f0fdf4', border: '#86efac', text: '#16a34a', icon: '✅' },
  'ВЫСОКИЙ РИСК': { label: 'ВЫСОКИЙ РИСК', bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: '🚨' },
  'HIGH RISK':    { label: 'ВЫСОКИЙ РИСК', bg: '#fef2f2', border: '#fca5a5', text: '#dc2626', icon: '🚨' },
  'ОСТОРОЖНО':    { label: 'ОСТОРОЖНО',    bg: '#fffbeb', border: '#fcd34d', text: '#d97706', icon: '⚠️' },
  'CAUTION':      { label: 'ОСТОРОЖНО',    bg: '#fffbeb', border: '#fcd34d', text: '#d97706', icon: '⚠️' },
};

const getStatusStyle = (status: string) => {
  return STATUS_MAP[status] || STATUS_MAP['ОСТОРОЖНО'];
};

export default function DueDiligencePage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) router.push('/login');
  }, []);

  const handleCheck = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await apiRequest('/ai/due-diligence', {
        method: 'POST',
        body: JSON.stringify({ company_name: companyName, industry, country: 'Uzbekistan' })
      });
      setResult(res);
    } catch (e) {
      alert('Ошибка анализа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>← Назад</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Due Diligence AI</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Проверка компании или отрасли перед инвестицией</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Введите данные для проверки</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <input
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            placeholder="Название компании или рынка"
            style={{ flex: 2, minWidth: '200px', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
          />
          <select
            value={industry}
            onChange={e => setIndustry(e.target.value)}
            style={{ flex: 1, minWidth: '200px', padding: '11px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', backgroundColor: '#f8fafc', color: '#1e293b' }}
          >
            <option value="">Выберите отрасль</option>
            {industries.map((ind, i) => <option key={i} value={ind}>{ind}</option>)}
          </select>
          <button onClick={handleCheck} disabled={loading || !companyName.trim()} style={{ padding: '11px 24px', borderRadius: '8px', backgroundColor: '#1e293b', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (loading || !companyName.trim()) ? 0.6 : 1, minWidth: '160px' }}>
            {loading ? 'Анализирую...' : 'Проверить'}
          </button>
        </div>
        <div>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Примеры:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {examples.map((ex, i) => (
              <button key={i} onClick={() => { setCompanyName(ex.company); setIndustry(ex.industry); }} style={{ padding: '6px 12px', borderRadius: '20px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', color: '#475569', fontSize: '12px', cursor: 'pointer' }}>
                {ex.company}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '48px', border: '1px solid #e2e8f0', textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>AI проводит Due Diligence...</p>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px' }}>Анализируем финансовую прозрачность, риски и репутацию</p>
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {['Финансы', 'Регуляторы', 'Репутация', 'ESG'].map((s, i) => (
              <span key={i} style={{ padding: '4px 10px', borderRadius: '12px', backgroundColor: '#f1f5f9', fontSize: '11px', color: '#64748b' }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {result && !loading && (
        <div>
          {(() => {
            const sc = getStatusStyle(result.status);
            return (
              <div style={{ backgroundColor: sc.bg, borderRadius: '12px', padding: '20px 24px', border: `1px solid ${sc.border}`, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '36px' }}>{sc.icon}</div>
                <div>
                  <p style={{ fontSize: '13px', color: sc.text, fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Статус проверки</p>
                  <p style={{ fontSize: '24px', fontWeight: '800', color: sc.text }}>{sc.label}</p>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{result.company}{result.industry ? ` · ${result.industry}` : ''}</p>
                </div>
              </div>
            );
          })()}

          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
              <div>
                <p style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>Детальный отчёт Due Diligence</p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Powered by Groq LLaMA · AI Capital Management</p>
              </div>
            </div>
            <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '14px', color: '#1e293b', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>{result.analysis}</p>
            </div>
            <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <p style={{ fontSize: '12px', color: '#3b82f6' }}>⚠️ Данный анализ носит информационный характер и создан на основе AI. Перед принятием инвестиционного решения рекомендуется провести независимую проверку.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
