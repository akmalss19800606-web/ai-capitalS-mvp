'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { riskAnalysis, portfolios } from '@/lib/api';

const C = {
  bg: '#f8fafc', text: '#1e293b', textMuted: '#64748b', textLight: '#94a3b8',
  primary: '#3b82f6', primaryLight: '#eff6ff', success: '#22c55e',
  successLight: '#f0fdf4', error: '#ef4444', errorLight: '#fef2f2',
  warning: '#f59e0b', warningLight: '#fffbeb', purple: '#8b5cf6',
  border: '#e2e8f0', white: '#ffffff',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
} as const;

const card: React.CSSProperties = {
  backgroundColor: C.white, borderRadius: 12, boxShadow: C.cardShadow, padding: 20,
};

function RiskGauge({ score, label, color }: { score: number; label: string; color: string }) {
  const bg = score >= 75 ? C.successLight : score >= 50 ? C.warningLight : C.errorLight;
  const fg = score >= 75 ? C.success : score >= 50 ? C.warning : C.error;
  return (
    <div style={{ ...card, textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>{label}</div>
      <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${fg}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', backgroundColor: bg }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: fg }}>{score.toFixed(0)}</span>
      </div>
      <div style={{ height: 4, borderRadius: 2, backgroundColor: C.border, marginTop: 8 }}>
        <div style={{ height: '100%', width: `${Math.min(score, 100)}%`, backgroundColor: fg, borderRadius: 2 }} />
      </div>
    </div>
  );
}

export default function RiskPage() {
  const [portfolioId, setPortfolioId] = useState<number | undefined>(undefined);
  const [portfolioList, setPortfolioList] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [concentration, setConcentration] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [composite, setComposite] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [scoreForm, setScoreForm] = useState({ asset_name: '', category: 'equity', geography: 'UZ', total_value: 100000 });
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'score'>('overview');

  useEffect(() => {
    portfolios.list().then((res: any) => {
      const items = Array.isArray(res) ? res : (res?.items || []);
      setPortfolioList(items);
    }).catch(() => {});
  }, []);

  const loadRiskData = useCallback(async () => {
    setLoading(true);
    try {
      const [c, p, comp, rec] = await Promise.all([
        riskAnalysis.concentration(portfolioId),
        riskAnalysis.performance(portfolioId),
        riskAnalysis.composite(portfolioId),
        riskAnalysis.recommendations(portfolioId),
      ]);
      setConcentration(c); setPerformance(p); setComposite(comp); setRecommendations(rec);
    } catch (e: any) { console.error(e); }
    setLoading(false);
  }, [portfolioId]);

  useEffect(() => { loadRiskData(); }, [loadRiskData]);

  const handleScoreInvestment = async () => {
    if (!scoreForm.asset_name.trim()) return;
    setScoreLoading(true);
    try {
      const res = await riskAnalysis.scoreInvestment(scoreForm);
      setScoreResult(res);
    } catch (e: any) { alert('Ошибка: ' + e.message); }
    setScoreLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: `1px solid ${C.border}`, borderRadius: 8,
    fontSize: 14, color: C.text, backgroundColor: C.white, outline: 'none', boxSizing: 'border-box',
  };
  const btnPrimary: React.CSSProperties = {
    backgroundColor: C.primary, color: C.white, borderRadius: 8, border: 'none',
    cursor: 'pointer', padding: '10px 20px', fontSize: 14, fontWeight: 600,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600, color: C.textMuted,
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em',
  };

  const riskLevelColor = (lvl: string) => {
    if (lvl === 'low') return C.success;
    if (lvl === 'medium') return C.warning;
    if (lvl === 'high') return '#ea580c';
    return C.error;
  };
  const riskLevelLabel = (lvl: string) => (
    { low: 'Низкий', medium: 'Умеренный', high: 'Высокий', critical: 'Критический' }[lvl] || lvl
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, padding: '24px 16px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 4 }}>🛡️ Анализ рисков</h1>
          <p style={{ fontSize: 14, color: C.textMuted }}>Концентрация, производительность, композитный риск-скор и рекомендации аи</p>
        </div>

        {/* Portfolio Selector + Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={portfolioId ?? ''}
            onChange={e => setPortfolioId(e.target.value ? Number(e.target.value) : undefined)}
            style={{ ...inputStyle, width: 220, flex: 'none' }}
          >
            <option value="">Все портфели</option>
            {portfolioList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {(['overview', 'score'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              backgroundColor: activeTab === tab ? C.primary : C.white,
              color: activeTab === tab ? C.white : C.textMuted,
              boxShadow: C.cardShadow,
            }}>
              {tab === 'overview' ? '📈 Обзор' : '🎯 Оценить актив'}
            </button>
          ))}
          <button onClick={loadRiskData} disabled={loading} style={{ ...btnPrimary, backgroundColor: C.white, color: C.primary, border: `1px solid ${C.border}` }}>
            {loading ? 'Загрузка...' : '↻ Обновить'}
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {loading && <div style={{ padding: 40, textAlign: 'center', color: C.textMuted }}>Загрузка данных рисков...</div>}

            {!loading && composite && (
              <>
                {/* Gauges */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <RiskGauge score={composite.composite_score ?? 0} label="Композитный" color={C.primary} />
                  {concentration && <RiskGauge score={concentration.concentration_score ?? 0} label="Концентрация" color={C.purple} />}
                  {performance && <RiskGauge score={performance.performance_score ?? 0} label="Производительность" color={C.primary} />}
                </div>

                {/* Risk level badge */}
                {composite.risk_level && (
                  <div style={{ ...card, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: riskLevelColor(composite.risk_level), backgroundColor: composite.risk_level === 'low' ? C.successLight : composite.risk_level === 'medium' ? C.warningLight : C.errorLight }}>
                      {riskLevelLabel(composite.risk_level)}
                    </span>
                    <span style={{ color: C.textMuted, fontSize: 13 }}>Уровень риска портфеля</span>
                  </div>
                )}

                {/* Breakdown */}
                {composite.breakdown && (
                  <div style={{ ...card, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Детализация</h3>
                    {Object.entries(composite.breakdown).map(([key, val]: any) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ color: C.textMuted, fontSize: 13 }}>{key}</span>
                        <span style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{typeof val === 'number' ? val.toFixed(1) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {recommendations && (
                  <div style={card}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>💡 Рекомендации AI</h3>
                    {(recommendations.recommendations || []).map((r: any, i: number) => (
                      <div key={i} style={{ padding: '10px 0', borderBottom: i < (recommendations.recommendations?.length || 0) - 1 ? `1px solid ${C.border}` : 'none' }}>
                        <div style={{ fontWeight: 600, color: C.text, fontSize: 14 }}>{r.title || r.action || `Рекомендация ${i + 1}`}</div>
                        {r.description && <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>{r.description}</div>}
                      </div>
                    ))}
                    {recommendations.summary && (
                      <div style={{ marginTop: 12, padding: 12, backgroundColor: C.primaryLight, borderRadius: 8, color: C.primary, fontSize: 13 }}>
                        {recommendations.summary}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Score Investment Tab */}
        {activeTab === 'score' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={card}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>🎯 Оценить инвестицию</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Название актива *</label>
                  <input style={inputStyle} value={scoreForm.asset_name} onChange={e => setScoreForm({ ...scoreForm, asset_name: e.target.value })} placeholder="Напр.: Tesla Inc" />
                </div>
                <div>
                  <label style={labelStyle}>Категория</label>
                  <select style={inputStyle} value={scoreForm.category} onChange={e => setScoreForm({ ...scoreForm, category: e.target.value })}>
                    <option value="equity">Акции</option>
                    <option value="bond">Облигации</option>
                    <option value="real_estate">Недвижимость</option>
                    <option value="business">Бизнес</option>
                    <option value="crypto">Крипто</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>География</label>
                  <select style={inputStyle} value={scoreForm.geography} onChange={e => setScoreForm({ ...scoreForm, geography: e.target.value })}>
                    <option value="UZ">Узбекистан</option>
                    <option value="US">US</option>
                    <option value="EU">EU</option>
                    <option value="APAC">APAC</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Сумма ($)</label>
                  <input style={inputStyle} type="number" value={scoreForm.total_value} onChange={e => setScoreForm({ ...scoreForm, total_value: Number(e.target.value) })} />
                </div>
                <button onClick={handleScoreInvestment} disabled={scoreLoading} style={btnPrimary}>
                  {scoreLoading ? 'Оценка...' : 'Оценить риск'}
                </button>
              </div>
            </div>

            {scoreResult && (
              <div style={card}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 12 }}>Результат оценки</h3>
                <RiskGauge score={scoreResult.risk_score ?? scoreResult.score ?? 0} label="Риск-скор" color={C.primary} />
                {scoreResult.risk_level && (
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: riskLevelColor(scoreResult.risk_level), backgroundColor: scoreResult.risk_level === 'low' ? C.successLight : scoreResult.risk_level === 'medium' ? C.warningLight : C.errorLight }}>
                      {riskLevelLabel(scoreResult.risk_level)}
                    </span>
                  </div>
                )}
                {scoreResult.factors && (
                  <div style={{ marginTop: 16 }}>
                    {Object.entries(scoreResult.factors).map(([k, v]: any) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                        <span style={{ color: C.textMuted }}>{k}</span>
                        <span style={{ fontWeight: 600, color: C.text }}>{typeof v === 'number' ? v.toFixed(1) : String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {scoreResult.recommendation && (
                  <div style={{ marginTop: 12, padding: 12, backgroundColor: C.primaryLight, borderRadius: 8, color: C.primary, fontSize: 13 }}>
                    {scoreResult.recommendation}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
