'use client';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, radius, spacing, transitions, typography,
} from '@/lib/design-tokens';

const GICS = [
  { v: 'energy', l: 'Energy / Энергетика', subs: ['Нефть и газ', 'ВИЭ'] },
  { v: 'materials', l: 'Materials / Материалы', subs: ['Химия', 'Металлы', 'Стройматериалы'] },
  { v: 'industrials', l: 'Industrials / Промышленность', subs: ['Машиностроение', 'Логистика', 'Строительство'] },
  { v: 'consumer_disc', l: 'Consumer Discr. / Потребительский', subs: ['Авто', 'Ритейл', 'Туризм'] },
  { v: 'consumer_staples', l: 'Consumer Staples / FMCG', subs: ['Продукты', 'Напитки'] },
  { v: 'healthcare', l: 'Health Care / Здравоохранение', subs: ['Фарма', 'Биотех'] },
  { v: 'financials', l: 'Financials / Финансы', subs: ['Банки', 'Страхование', 'Финтех'] },
  { v: 'it', l: 'IT / Технологии', subs: ['Софт', 'Полупроводники', 'Облако'] },
  { v: 'communication', l: 'Communication / Связь', subs: ['Медиа', 'Телеком'] },
  { v: 'utilities', l: 'Utilities / Коммунальные', subs: ['Электричество', 'Водоснабжение'] },
  { v: 'real_estate', l: 'Real Estate / Недвижимость', subs: ['REIT', 'Девелопмент'] },
];

const inp: React.CSSProperties = {
  width: '100%', padding: `${spacing[2]} ${spacing[3]}`,
  borderRadius: radius.md, border: `1px solid ${semantic.border}`,
  fontSize: typography.fontSize.sm, background: semantic.bgCard,
  color: semantic.textPrimary, outline: 'none',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.semibold,
  color: semantic.textSecondary, marginBottom: spacing[1],
};
const card: React.CSSProperties = {
  background: semantic.bgCard, borderRadius: radius.xl,
  padding: spacing[5], marginBottom: spacing[4],
  border: `1px solid ${semantic.border}`,
};
const h2s: React.CSSProperties = {
  fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold,
  color: semantic.textPrimary, marginBottom: spacing[4],
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: spacing[3] }}>
    <label style={lbl}>{label}</label>
    {children}
  </div>
);

interface Factor {
  key: string; name: string; weight: number;
  importance_pct: number; impact: 'positive' | 'negative'; category: string;
}
interface XAIResult {
  factors: Factor[];
  confidence: {
    score: number; level: string; level_ru: string;
    positive_factors_weight: number; negative_factors_weight: number;
  };
  recommendation: {
    action: string; action_code: string; explanation: string;
    top_positive_factors: string[]; top_negative_factors: string[];
  };
  metadata: { sector: string; investment_amount: number; time_horizon_years: number; };
}

const MACRO_REF = [
  { name: 'ВВП Узбекистан (рост)', value: '5.7%', src: 'World Bank 2025' },
  { name: 'Инфляция (CPI)', value: '10.2%', src: 'ЦБ РУз' },
  { name: 'Ставка рефинансирования', value: '14.0%', src: 'ЦБ РУз' },
  { name: 'USD/UZS', value: '12 850', src: 'Forex' },
  { name: 'EUR/UZS', value: '14 120', src: 'Forex' },
];
const BENCHMARKS = [
  { name: 'S&P 500 (YTD)', value: '+12.4%' },
  { name: 'MSCI EM', value: '+5.8%' },
  { name: 'Gold', value: '+8.1%' },
  { name: 'Индекс ТБРВФБ', value: '+3.2%' },
];
const CRISES = [
  { year: '2008', name: 'Мировой финансовый кризис', impact: 'S&P -38%, EM -53%' },
  { year: '2020', name: 'COVID-19', impact: 'S&P -34%, быстрое восстановление' },
  { year: '2022', name: 'Геополитический кризис', impact: 'EM -20%, Energy +58%' },
];

export default function XAIAnalysisPage() {
  const [sector, setSector] = useState('it');
  const [subSector, setSubSector] = useState('');
  const [amount, setAmount] = useState('50000');
  const [years, setYears] = useState('5');
  const [riskProfile, setRiskProfile] = useState('5');
  const [esgPref, setEsgPref] = useState('balanced');
  const [result, setResult] = useState<XAIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'shap' | 'importance' | 'scenarios' | 'sensitivity'>('shap');

  useEffect(() => {
    if (!localStorage.getItem('token')) window.location.href = '/login';
  }, []);

  const currentSubs = GICS.find(g => g.v === sector)?.subs || [];

  const analyze = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await apiRequest('/xai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          sector, investment_amount: parseFloat(amount),
          time_horizon_years: parseInt(years), language: 'ru',
        }),
      });
      setResult(res);
    } catch (err: any) { setError(err?.message || 'Ошибка'); }
    finally { setLoading(false); }
  };

  const maxW = result ? Math.max(...result.factors.map(f => Math.abs(f.weight))) : 1;
  const base = result ? result.confidence.score : 50;
  const scenarios = result ? [
    { name: 'Оптимистичный', score: Math.min(100, base + 18), color: colors.success[600], desc: 'Позитивные факторы реализуются' },
    { name: 'Базовый', score: base, color: colors.primary[600], desc: 'Текущие условия сохраняются' },
    { name: 'Пессимистичный', score: Math.max(5, base - 22), color: colors.error[600], desc: 'Негативные факторы усиливаются' },
  ] : [];
  const sensitivity = result ? result.factors.slice(0, 5).map(f => ({
    name: f.name,
    m20: +(base + (f.impact === 'positive' ? -f.importance_pct * 0.2 : f.importance_pct * 0.2)).toFixed(1),
    m10: +(base + (f.impact === 'positive' ? -f.importance_pct * 0.1 : f.importance_pct * 0.1)).toFixed(1),
    b: base,
    p10: +(base + (f.impact === 'positive' ? f.importance_pct * 0.1 : -f.importance_pct * 0.1)).toFixed(1),
    p20: +(base + (f.impact === 'positive' ? f.importance_pct * 0.2 : -f.importance_pct * 0.2)).toFixed(1),
  })) : [];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: spacing[4] }}>
      <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[1] }}>
        Объяснимость AI (XAI)
      </h1>
      <p style={{ color: semantic.textSecondary, marginBottom: spacing[6], fontSize: typography.fontSize.sm }}>
        Почему AI рекомендует именно это — SHAP, сценарии, чувствительность
      </p>

      {/* Блок 1: GICS + параметры */}
      <div style={card}>
        <h2 style={h2s}>1. Отраслевая классификация (GICS) и параметры</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing[4] }}>
          <Field label="Сектор (GICS Level 1)">
            <select style={inp} value={sector} onChange={e => { setSector(e.target.value); setSubSector(''); }}>
              {GICS.map(g => <option key={g.v} value={g.v}>{g.l}</option>)}
            </select>
          </Field>
          <Field label="Подотрасль (Level 2)">
            <select style={inp} value={subSector} onChange={e => setSubSector(e.target.value)}>
              <option value="">— Все —</option>
              {currentSubs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Сумма инвестиций (USD)">
            <input style={inp} type="number" min="100" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
          <Field label="Горизонт (лет)">
            <input style={inp} type="number" min="1" max="30" value={years} onChange={e => setYears(e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Блок 2: Профиль инвестора */}
      <div style={card}>
        <h2 style={h2s}>2. Профиль инвестора</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: spacing[4] }}>
          <Field label={`Профиль риска: ${riskProfile}/10`}>
            <input type="range" min="1" max="10" value={riskProfile} onChange={e => setRiskProfile(e.target.value)}
              style={{ width: '100%', accentColor: colors.primary[600] }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
              <span>Консервативный</span><span>Агрессивный</span>
            </div>
          </Field>
          <Field label="ESG-предпочтения">
            <select style={inp} value={esgPref} onChange={e => setEsgPref(e.target.value)}>
              <option value="ignore">Не учитывать</option>
              <option value="balanced">Сбалансированный</option>
              <option value="strict">Строгий ESG</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Блок 3: Макро-индикаторы */}
      <div style={card}>
        <h2 style={h2s}>3. Макроэкономические индикаторы</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: spacing[3] }}>
          {MACRO_REF.map(m => (
            <div key={m.name} style={{ background: semantic.bgPage, borderRadius: radius.lg, padding: spacing[3], textAlign: 'center' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] }}>{m.name}</div>
              <div style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.primary[600] }}>{m.value}</div>
              <div style={{ fontSize: '10px', color: semantic.textMuted }}>{m.src}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка анализа */}
      {error && <div style={{ color: colors.error[600], marginBottom: spacing[3], fontSize: typography.fontSize.sm }}>{error}</div>}
      <button onClick={analyze} disabled={loading} style={{
        padding: `${spacing[3]} ${spacing[6]}`, background: colors.primary[600], color: '#fff',
        border: 'none', borderRadius: radius.lg, fontSize: typography.fontSize.base,
        fontWeight: typography.fontWeight.semibold, cursor: loading ? 'wait' : 'pointer',
        opacity: loading ? 0.7 : 1, marginBottom: spacing[6],
      }}>
        {loading ? 'Анализирую факторы...' : 'Запустить XAI-анализ'}
      </button>

      {/* ══════ РЕЗУЛЬТАТЫ ══════ */}
       {/* Результаты */}
      {result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={card}>
              <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>Уровень уверенности</h3>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 120, height: 120, borderRadius: '50%', margin: '0 auto 12px', background: `conic-gradient(${result.confidence.score >= 65 ? colors.success[500] : result.confidence.score >= 40 ? colors.warning[500] : colors.error[500]} ${result.confidence.score * 3.6}deg, ${semantic.bgPage} 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: semantic.bgCard, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>{Math.round(result.confidence.score)}%</span>
                    <span style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>{result.confidence.level_ru}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ ...card, background: result.recommendation.action_code === 'invest' ? colors.success[50] : result.recommendation.action_code === 'consider' ? colors.warning[50] : colors.error[50] }}>
              <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>Рекомендация</h3>
              <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: result.recommendation.action_code === 'invest' ? colors.success[600] : result.recommendation.action_code === 'consider' ? colors.warning[600] : colors.error[600], marginBottom: spacing[3] }}>{result.recommendation.action}</p>
              <div style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>
                <p style={{ fontWeight: typography.fontWeight.semibold, marginBottom: spacing[1] }}>Позитивные факторы:</p>
                {result.recommendation.top_positive_factors.map((f, i) => (<p key={i} style={{ color: colors.success[600], marginLeft: spacing[2] }}>+ {f}</p>))}
                <p style={{ fontWeight: typography.fontWeight.semibold, marginTop: spacing[2], marginBottom: spacing[1] }}>Риски:</p>
                {result.recommendation.top_negative_factors.map((f, i) => (<p key={i} style={{ color: colors.error[600], marginLeft: spacing[2] }}>- {f}</p>))}
              </div>
            </div>
          </div>

          {/* Блок 5: XAI визуализации - табы */}
          <div style={card}>
            <h2 style={h2s}>5. XAI-визуализации</h2>
            <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[4] }}>
              {(['shap', 'importance', 'scenarios', 'sensitivity'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding: `${spacing[2]} ${spacing[3]}`, borderRadius: radius.md, border: tab === t ? `2px solid ${colors.primary[600]}` : `1px solid ${semantic.border}`, background: tab === t ? colors.primary[50] : semantic.bgCard, color: tab === t ? colors.primary[700] : semantic.textSecondary, fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, cursor: 'pointer' }}>
                  {t === 'shap' ? 'SHAP Waterfall' : t === 'importance' ? 'Feature Importance' : t === 'scenarios' ? 'Сценарии' : 'Чувствительность'}
                </button>
              ))}
            </div>

            {tab === 'shap' && (
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3] }}>SHAP Waterfall Chart — каскадное влияние каждого фактора на итоговую оценку</p>
                {result.factors.map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
                    <span style={{ width: 180, fontSize: typography.fontSize.sm, color: semantic.textSecondary, textAlign: 'right', flexShrink: 0 }}>{f.name}</span>
                    <div style={{ flex: 1, position: 'relative', height: 24 }}>
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: semantic.border }} />
                      <div style={{ position: 'absolute', height: 20, top: 2, borderRadius: radius.sm, background: f.impact === 'positive' ? colors.success[500] : colors.error[500], opacity: 0.8, ...(f.impact === 'positive' ? { left: '50%', width: `${(Math.abs(f.weight) / maxW) * 45}%` } : { right: '50%', width: `${(Math.abs(f.weight) / maxW) * 45}%` }) }} />
                    </div>
                    <span style={{ width: 50, fontSize: typography.fontSize.xs, color: semantic.textMuted, textAlign: 'right' }}>{f.importance_pct}%</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', gap: spacing[4], marginTop: spacing[3], fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}><span style={{ width: 12, height: 12, borderRadius: 2, background: colors.error[500], opacity: 0.8, display: 'inline-block' }} /> Негативный</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: spacing[1] }}><span style={{ width: 12, height: 12, borderRadius: 2, background: colors.success[500], opacity: 0.8, display: 'inline-block' }} /> Позитивный</span>
                </div>
              </div>
            )}

            {tab === 'importance' && (
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3] }}>Feature Importance — какие факторы влияют больше всего</p>
                {result.factors.sort((a, b) => b.importance_pct - a.importance_pct).map(f => (
                  <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: spacing[3], marginBottom: spacing[2] }}>
                    <span style={{ width: 180, fontSize: typography.fontSize.sm, color: semantic.textSecondary, textAlign: 'right', flexShrink: 0 }}>{f.name}</span>
                    <div style={{ flex: 1, background: semantic.bgPage, borderRadius: radius.sm, height: 22, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${f.importance_pct}%`, background: f.impact === 'positive' ? colors.success[500] : colors.error[500], borderRadius: radius.sm, opacity: 0.8 }} />
                    </div>
                    <span style={{ width: 50, fontSize: typography.fontSize.xs, color: semantic.textMuted, textAlign: 'right' }}>{f.importance_pct}%</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'scenarios' && (
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3] }}>Сценарный анализ — 3 сценария развития</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing[4] }}>
                  {scenarios.map(sc => (
                    <div key={sc.name} style={{ background: semantic.bgPage, borderRadius: radius.lg, padding: spacing[4], textAlign: 'center', border: `2px solid ${sc.color}20` }}>
                      <div style={{ fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.semibold, color: sc.color, marginBottom: spacing[2] }}>{sc.name}</div>
                      <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: sc.color, marginBottom: spacing[2] }}>{Math.round(sc.score)}%</div>
                      <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>{sc.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'sensitivity' && (
              <div>
                <p style={{ fontSize: typography.fontSize.sm, color: semantic.textMuted, marginBottom: spacing[3] }}>Sensitivity Analysis — как изменение параметра на ±10-20% влияет на оценку</p>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: typography.fontSize.sm }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${semantic.border}` }}>
                        <th style={{ textAlign: 'left', padding: spacing[2], color: semantic.textSecondary }}>Фактор</th>
                        <th style={{ textAlign: 'center', padding: spacing[2], color: colors.error[600] }}>-20%</th>
                        <th style={{ textAlign: 'center', padding: spacing[2], color: colors.error[400] }}>-10%</th>
                        <th style={{ textAlign: 'center', padding: spacing[2], color: colors.primary[600], fontWeight: typography.fontWeight.bold }}>Базовый</th>
                        <th style={{ textAlign: 'center', padding: spacing[2], color: colors.success[400] }}>+10%</th>
                        <th style={{ textAlign: 'center', padding: spacing[2], color: colors.success[600] }}>+20%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivity.map(s => (
                        <tr key={s.name} style={{ borderBottom: `1px solid ${semantic.border}` }}>
                          <td style={{ padding: spacing[2], color: semantic.textPrimary }}>{s.name}</td>
                          <td style={{ textAlign: 'center', padding: spacing[2], color: colors.error[600] }}>{s.m20}</td>
                          <td style={{ textAlign: 'center', padding: spacing[2], color: colors.error[400] }}>{s.m10}</td>
                          <td style={{ textAlign: 'center', padding: spacing[2], color: colors.primary[600], fontWeight: typography.fontWeight.bold }}>{s.b}</td>
                          <td style={{ textAlign: 'center', padding: spacing[2], color: colors.success[400] }}>{s.p10}</td>
                          <td style={{ textAlign: 'center', padding: spacing[2], color: colors.success[600] }}>{s.p20}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Блок 6: Справочные данные */}
          <div style={card}>
            <h2 style={h2s}>6. Справочные данные</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[4] }}>
              <div>
                <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>Бенчмарки</h3>
                {BENCHMARKS.map(b => (
                  <div key={b.name} style={{ display: 'flex', justifyContent: 'space-between', padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}`, fontSize: typography.fontSize.sm }}>
                    <span style={{ color: semantic.textSecondary }}>{b.name}</span>
                    <span style={{ color: colors.success[600], fontWeight: typography.fontWeight.semibold }}>{b.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[3] }}>Исторические кризисы</h3>
                {CRISES.map(c => (
                  <div key={c.year} style={{ padding: `${spacing[2]} 0`, borderBottom: `1px solid ${semantic.border}`, fontSize: typography.fontSize.sm }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary }}>{c.year} — {c.name}</span>
                    </div>
                      <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted }}>
                      {c.impact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
