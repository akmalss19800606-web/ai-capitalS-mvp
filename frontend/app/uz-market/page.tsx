'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const C = {
  bg: '#f8fafc', card: '#ffffff', primary: '#3b82f6', primaryLight: '#eff6ff',
  success: '#22c55e', successLight: '#f0fdf4', warning: '#f59e0b', warningLight: '#fffbeb',
  error: '#ef4444', errorLight: '#fef2f2', cyan: '#06b6d4', text: '#1e293b', muted: '#64748b',
  border: '#e2e8f0', secondary: '#8b5cf6', secondaryLight: '#f5f3ff',
};

type Sector = { id: string; name: string; gics: string };

async function api(path: string, body?: any) {
  const token = localStorage.getItem('token');
  const opts: any = { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } };
  if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); }
  const r = await fetch(`${API}/uz-market${path}`, opts);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export default function UZMarketPage() {
  const [mode, setMode] = useState<'quick'|'deep'|'compare'>('quick');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSector, setSelectedSector] = useState('');
  const [compareSectors, setCompareSectors] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [provider, setProvider] = useState('groq');
  const [loading, setLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<any>(null);
  const [deepResult, setDeepResult] = useState<any>(null);
  const [compareResult, setCompareResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/sectors').then(setSectors).catch(() => {});
  }, []);

  const runQuickAsk = async () => {
    if (!question.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await api('/quick-ask', { question, sector: selectedSector || undefined, provider });
      setQuickResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const runDeepAnalysis = async () => {
    if (!selectedSector) return;
    setLoading(true); setError('');
    try {
      const res = await api('/deep-analysis', { sector_id: selectedSector, provider });
      setDeepResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const runCompare = async () => {
    if (compareSectors.length < 2) { setError('Выберите минимум 2 отрасли'); return; }
    setLoading(true); setError('');
    try {
      const res = await api('/compare', { sector_ids: compareSectors, provider });
      setCompareResult(res);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const cardStyle = { background: C.card, borderRadius: 12, padding: 24, border: `1px solid ${C.border}`, marginBottom: 16 };
  const btnStyle = (active?: boolean) => ({
    padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
    background: active ? C.primary : C.primaryLight, color: active ? '#fff' : C.primary, transition: 'all .2s'
  });
  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, outline: 'none' };
  const labelStyle = { fontSize: 13, color: C.muted, marginBottom: 4, display: 'block' as const, fontWeight: 500 };

  return (
    <div style={{minHeight: '100vh', background: C.bg, padding: '24px'}}>
      <div style={{maxWidth: 1200, margin: '0 auto'}}>
        <h1 style={{fontSize: 28, fontWeight: 800, color: C.text, margin: '0 0 4px'}}>🇺🇿 Анализ рынка Узбекистана</h1>
        <p style={{color: C.muted, margin: '0 0 24px', fontSize: 14}}>Quick Ask · Deep Analysis · 25 GICS отраслей · AI-пипелайн</p>

        {/* Mode Tabs */}
        <div style={{display: 'flex', gap: 8, marginBottom: 24}}>
          <button onClick={() => setMode('quick')} style={btnStyle(mode === 'quick')}>⚡ Quick Ask</button>
          <button onClick={() => setMode('deep')} style={btnStyle(mode === 'deep')}>📊 Deep Analysis</button>
          <button onClick={() => setMode('compare')} style={btnStyle(mode === 'compare')}>⚖️ Сравнение</button>
        </div>

        {error && <div style={{background: C.errorLight, color: C.error, padding: 12, borderRadius: 8, marginBottom: 16}}>{error}</div>}

        {/* Quick Ask Mode */}
        {mode === 'quick' && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>⚡ Быстрый вопрос</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
              <div>
                <label style={labelStyle}>Отрасль (опционально)</label>
                <select style={inputStyle} value={selectedSector} onChange={e => setSelectedSector(e.target.value)}>
                  <option value="">Все отрасли</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>AI провайдер</label>
                <select style={inputStyle} value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="groq">GROQ (Llama 3.1)</option>
                  <option value="perplexity">Perplexity (Online)</option>
                </select>
              </div>
            </div>
            <div style={{marginBottom: 16}}>
              <label style={labelStyle}>Ваш вопрос</label>
              <textarea style={{...inputStyle, minHeight: 80, resize: 'vertical' as const}} value={question} onChange={e => setQuestion(e.target.value)}
                placeholder="Например: Каковы перспективы текстильной отрасли в Узбекистане?" />
            </div>
            <button onClick={runQuickAsk} disabled={loading} style={btnStyle(true)}>
              {loading ? 'Анализирую...' : 'Спросить AI'}
            </button>
            {quickResult && (
              <div style={{marginTop: 20, padding: 16, background: C.primaryLight, borderRadius: 8}}>
                <div style={{fontSize: 12, color: C.muted, marginBottom: 8}}>
                  Провайдер: {quickResult.provider} | {quickResult.timestamp}
                </div>
                <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.6, color: C.text}}>{quickResult.answer}</div>
              </div>
            )}
          </div>
        )}

        {/* Deep Analysis Mode */}
        {mode === 'deep' && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>📊 Глубокий анализ (12 разделов)</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16}}>
              <div>
                <label style={labelStyle}>Выберите отрасль</label>
                <select style={inputStyle} value={selectedSector} onChange={e => setSelectedSector(e.target.value)}>
                  <option value="">— Выберите —</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.gics})</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>AI провайдер</label>
                <select style={inputStyle} value={provider} onChange={e => setProvider(e.target.value)}>
                  <option value="groq">GROQ</option><option value="perplexity">Perplexity</option>
                </select>
              </div>
            </div>
            <button onClick={runDeepAnalysis} disabled={loading || !selectedSector} style={btnStyle(true)}>
              {loading ? 'Генерирую отчет...' : 'Запустить Deep Analysis'}
            </button>

            {deepResult && deepResult.report && (
              <div style={{marginTop: 20}}>
                {/* Summary */}
                {deepResult.report.summary && (
                  <div style={{padding: 16, background: C.successLight, borderRadius: 8, marginBottom: 16}}>
                    <strong>Сводка:</strong> {deepResult.report.summary}
                  </div>
                )}
                <div style={{display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap'}}>
                  {deepResult.report.risk_score && (
                    <div style={{padding: '8px 16px', borderRadius: 8, background: deepResult.report.risk_score > 6 ? C.errorLight : C.warningLight}}>
                      Риск: <strong>{deepResult.report.risk_score}/10</strong>
                    </div>
                  )}
                  {deepResult.report.investment_rating && (
                    <div style={{padding: '8px 16px', borderRadius: 8, background: C.primaryLight}}>
                      Рейтинг: <strong>{deepResult.report.investment_rating}</strong>
                    </div>
                  )}
                </div>
                {/* 12 Sections */}
                {(deepResult.report.sections || []).map((sec: any, i: number) => (
                  <div key={i} style={{...cardStyle, background: i % 2 === 0 ? C.card : C.primaryLight}}>
                    <h4 style={{margin: '0 0 8px', color: C.primary}}>{i + 1}. {sec.title}</h4>
                    <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.6, color: C.text, fontSize: 14}}>{sec.content}</div>
                    {sec.key_metrics && sec.key_metrics.length > 0 && (
                      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12}}>
                        {sec.key_metrics.map((m: any, j: number) => (
                          <div key={j} style={{padding: '6px 12px', background: C.secondaryLight, borderRadius: 6, fontSize: 12}}>
                            <span style={{color: C.muted}}>{m.label}:</span> <strong>{m.value}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {deepResult.report.raw && !deepResult.report.sections?.length && (
                  <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: 16, background: C.primaryLight, borderRadius: 8}}>{deepResult.report.raw}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Compare Mode */}
        {mode === 'compare' && (
          <div style={cardStyle}>
            <h3 style={{margin: '0 0 16px', color: C.text}}>⚖️ Сравнение отраслей</h3>
            <p style={{color: C.muted, fontSize: 13, marginBottom: 12}}>Выберите минимум 2 отрасли для сравнения:</p>
            <div style={{display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16}}>
              {sectors.map(s => (
                <button key={s.id} onClick={() => {
                  setCompareSectors(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]);
                }} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, border: `1px solid ${C.border}`, cursor: 'pointer',
                  background: compareSectors.includes(s.id) ? C.primary : C.card,
                  color: compareSectors.includes(s.id) ? '#fff' : C.text
                }}>{s.name}</button>
              ))}
            </div>
            <div style={{marginBottom: 12}}>
              <label style={labelStyle}>AI провайдер</label>
              <select style={{...inputStyle, maxWidth: 250}} value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="groq">GROQ</option><option value="perplexity">Perplexity</option>
              </select>
            </div>
            <button onClick={runCompare} disabled={loading || compareSectors.length < 2} style={btnStyle(true)}>
              {loading ? 'Сравниваю...' : `Сравнить (${compareSectors.length})`}
            </button>

            {compareResult && compareResult.comparison && (
              <div style={{marginTop: 20}}>
                {compareResult.comparison.winner && (
                  <div style={{padding: 16, background: C.successLight, borderRadius: 8, marginBottom: 16}}>
                    <strong>🏆 Лучшая отрасль:</strong> {compareResult.comparison.winner}
                    {compareResult.comparison.reasoning && <p style={{margin: '8px 0 0', fontSize: 14}}>{compareResult.comparison.reasoning}</p>}
                  </div>
                )}
                {compareResult.comparison.sectors && (
                  <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse', fontSize: 13}}>
                      <thead><tr style={{background: C.primaryLight}}>
                        {['Отрасль','Рост','Риск','Маржа','Рекомендация'].map(h => (
                          <th key={h} style={{padding: '8px 12px', textAlign: 'left', borderBottom: `2px solid ${C.border}`}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>{compareResult.comparison.sectors.map((s: any, i: number) => (
                        <tr key={i} style={{borderBottom: `1px solid ${C.border}`}}>
                          <td style={{padding: '8px 12px', fontWeight: 600}}>{s.name}</td>
                          <td style={{padding: '8px 12px'}}>{s.growth || 'N/A'}</td>
                          <td style={{padding: '8px 12px'}}>{s.risk || 'N/A'}</td>
                          <td style={{padding: '8px 12px'}}>{s.margin || 'N/A'}</td>
                          <td style={{padding: '8px 12px'}}>{s.recommendation || 'N/A'}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
                {compareResult.comparison.raw && !compareResult.comparison.sectors && (
                  <div style={{whiteSpace: 'pre-wrap', lineHeight: 1.6, padding: 16, background: C.primaryLight, borderRadius: 8}}>{compareResult.comparison.raw}</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Sectors Grid */}
        <div style={cardStyle}>
          <h3 style={{margin: '0 0 16px', color: C.text}}>🏢 25 отраслей Узбекистана (GICS)</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8}}>
            {sectors.map(s => (
              <div key={s.id} onClick={() => { setSelectedSector(s.id); setMode('deep'); }} style={{
                padding: '10px 14px', borderRadius: 8, border: `1px solid ${C.border}`, cursor: 'pointer',
                background: C.card, transition: 'all .2s'
              }}>
                <div style={{fontWeight: 600, fontSize: 13, color: C.text}}>{s.name}</div>
                <div style={{fontSize: 11, color: C.muted}}>{s.gics}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
