'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { portfolios, market, apiRequest } from '@/lib/api';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

export default function ReportPage() {
  const router = useRouter();
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    portfolios.list().then(data => {
      setPortfolioList(data);
      if (data.length > 0) setSelectedId(data[0].id);
    });
  }, []);

  const generatePDF = async () => {
    if (!selectedId) return;
    setGenerating(true);
    const selected = portfolioList.find(p => p.id === selectedId);
    if (!selected) { setGenerating(false); return; }

    try {
      const aiRes = await apiRequest('/ai/market-analysis', {
        method: 'POST',
        body: JSON.stringify({
          query: `Составь профессиональный инвестиционный отчет на русском языке для: Portfolio "${selected.name}", Total Value: $${selected.total_value}. Включи анализ эффективности, оценку рисков и рекомендации. Отвечай ТОЛЬКО на русском языке.`,
          language: 'ru'
        })
      });
      setAiSummary(aiRes.analysis);

      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageW = doc.internal.pageSize.getWidth();
      const margin = 20;

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageW, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Capital Management', margin, 18);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text('Инвестиционный отчет портфеля', margin, 26);
      doc.setFontSize(9);
      doc.text(`Автор: Солиев Акмал Идиевич | Свидетельство No. 009932`, margin, 33);
      doc.text(`Generated: ${new Date().toLocaleDateString('ru-RU')}`, margin, 39);

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Portfolio: ${selected.name}`, margin, 58);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(selected.description || 'Investment Portfolio', margin, 65);

      const cards = [
        { label: 'Стоимость портфеля', value: `$${(selected.total_value || 0).toLocaleString()}`, x: margin },
        { label: 'Годовая доходность', value: '+12.5%', x: margin + 55 },
        { label: 'Уровень риска', value: 'Средний', x: margin + 110 },
      ];

      cards.forEach(card => {
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(card.x, 72, 50, 20, 3, 3, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.text(card.label, card.x + 4, 79);
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(card.value, card.x + 4, 87);
      });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('AI Инвестиционный анализ', margin, 105);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      const lines = doc.splitTextToSize(aiRes.analysis, pageW - margin * 2);
      doc.text(lines.slice(0, 50), margin, 113);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('Макроэкономика Узбекистана', margin, 185);

      const tableData = [
        ['Курс USD/UZS', '12,700 sum', '↑ +0.39%'],
        ['Инфляция', '10.0%', '↓ -0.3%'],
        ['Ставка ЦБ', '13.5%', '→ 0%'],
        ['Рост ВВП', '6.2%', '↑ +0.4%'],
        ['Ставка депозитов', '22%', '→ 0%'],
      ];

      let y = 192;
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y - 5, pageW - margin * 2, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Показатель', margin + 2, y);
      doc.text('Значение', margin + 70, y);
      doc.text('Изменение', margin + 120, y);
      y += 5;

      tableData.forEach((row, i) => {
        if (i % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4, pageW - margin * 2, 7, 'F');
        }
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        doc.text(row[0], margin + 2, y);
        doc.setFont('helvetica', 'bold');
        doc.text(row[1], margin + 70, y);
        doc.setTextColor(row[2].includes('↑') ? 34 : row[2].includes('↓') ? 220 : 100, row[2].includes('↑') ? 197 : row[2].includes('↓') ? 38 : 116, row[2].includes('↑') ? 94 : row[2].includes('↓') ? 38 : 139);
        doc.text(row[2], margin + 120, y);
        y += 7;
      });

      const pageH = doc.internal.pageSize.getHeight();
      doc.setFillColor(248, 250, 252);
      doc.rect(0, pageH - 15, pageW, 15, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('© 2026 AI Capital Management · Author: Soliev Akmal Idievich · Certificate No. 009932', margin, pageH - 7);
      doc.text('Данный отчет носит информационный характер и не является финансовой рекомендацией.', margin, pageH - 3);

      doc.save(`AI_Capital_Report_${selected.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) {
      alert('Ошибка генерации PDF');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 14px', color: '#64748b', cursor: 'pointer', fontSize: '14px' }}>← Назад</button>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1e293b' }}>Отчёт для инвесторов</h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>PDF отчёт с AI анализом, графиками и вашим брендингом</p>
        </div>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Выберите портфель для отчёта</h2>
        {portfolioList.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Нет портфелей. Создайте портфель на главной странице.</p>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {portfolioList.map(p => (
              <div key={p.id} onClick={() => setSelectedId(p.id)} style={{ padding: '12px 20px', borderRadius: '10px', border: `2px solid ${selectedId === p.id ? '#3b82f6' : '#e2e8f0'}`, backgroundColor: selectedId === p.id ? '#eff6ff' : '#f8fafc', cursor: 'pointer', transition: 'all 0.2s' }}>
                <p style={{ fontWeight: '600', color: selectedId === p.id ? '#3b82f6' : '#1e293b', fontSize: '14px' }}>{p.name}</p>
                <p style={{ fontSize: '12px', color: '#94a3b8' }}>${(p.total_value || 0).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        <div style={{ backgroundColor: '#f8fafc', borderRadius: '10px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>Отчёт включает:</p>
          {['AI инвестиционный анализ', 'Макроэкономика Узбекистана', 'Показатели портфеля', 'Рекомендации', 'Брендинг: Солиев Акмал Идиевич · Свидетельство №009932'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>✓</span>
              <span style={{ fontSize: '13px', color: '#475569' }}>{item}</span>
            </div>
          ))}
        </div>

        <button onClick={generatePDF} disabled={generating || !selectedId || portfolioList.length === 0} style={{ padding: '12px 32px', borderRadius: '8px', backgroundColor: '#1e293b', color: '#fff', border: 'none', fontSize: '14px', fontWeight: '600', cursor: 'pointer', opacity: (generating || !selectedId) ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {generating ? '⏳ Генерирую PDF...' : '📄 Скачать PDF отчёт'}
        </button>

        {generating && (
          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: '13px', color: '#3b82f6' }}>🤖 AI анализирует портфель и формирует профессиональный отчёт...</p>
          </div>
        )}

        {aiSummary && !generating && (
          <div style={{ marginTop: '16px', padding: '12px 16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
            <p style={{ fontSize: '13px', color: '#16a34a', fontWeight: '600' }}>✅ PDF успешно создан и скачан!</p>
          </div>
        )}
      </div>
    </div>
  );
}









