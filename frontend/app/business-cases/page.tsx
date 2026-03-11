'use client';
import { useState, useEffect } from 'react';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography,
} from '@/lib/design-tokens';

interface EvalResult {
  status: string;
  project_name: string;
  industry: string;
  region: string;
  npv_mln: number;
  irr_pct: number | null;
  profitability_index: number;
  payback_years: number | null;
  discount_rate_pct: number;
  initial_investment_mln: number;
  project_years: number;
  is_viable: boolean;
  recommendation: string;
  cash_flows: number[];
}

const INDUSTRIES = [
  'Сельское хозяйство', 'Пищевая промышленность', 'Торговля',
  'Строительство и недвижимость', 'Промышленность', 'IT и услуги',
  'Транспорт и логистика', 'Туризм и общепит', 'Энергетика',
  'Здравоохранение', 'Образование', 'Финансы', 'Другое',
];

const REGIONS = [
  'Ташкентская область', 'Самаркандская область', 'Ферганская область',
  'Бухарская область', 'Андижанская область', 'Наманганская область',
  'Кашкадарьинская область', 'Сурхандарьинская область',
  'Хорезмская область', 'Навоийская область', 'Джизакская область',
  'Сырдарьинская область', 'Каракалпакстан', 'г. Ташкент',
];

const INITIAL_FORM = {
  project_name: '',
  industry: 'Сельское хозяйство',
  region: 'г. Ташкент',
  legal_form: 'ООО',
  project_stage: 'стартап',
  initial_investment_mln: '',
  equity_share_pct: '60',
  debt_share_pct: '40',
  interest_rate_pct: '20',
  discount_rate_pct: '15',
  annual_revenue_mln: '',
  annual_costs_mln: '',
  revenue_growth_pct: '5',
  project_years: '5',
  tax_rate_pct: '15',
  risk_level: 'средний',
  market_competition: 'средняя',
  has_state_support: false,
  export_share_pct: '0',
  additional_notes: '',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: `${spacing[2]} ${spacing[3]}`,
  borderRadius: radius.md, border: `1px solid ${semantic.border}`,
  fontSize: typography.fontSize.sm, background: semantic.bgCard,
  color: semantic.textPrimary, outline: 'none',
  transition: transitions.color,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: typography.fontSize.sm,
  fontWeight: typography.fontWeight.semibold,
  color: semantic.textSecondary, marginBottom: spacing[1],
};


const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: spacing[3] }}>
    <label style={labelStyle}>{label}</label>
    {children}
  </div>
);

export default function BusinessCasesPage() {
  const [form, setForm] = useState<any>({ ...INITIAL_FORM });
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; }
  }, []);

  const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const body = {
        project_name: form.project_name,
        industry: form.industry,
        region: form.region,
        legal_form: form.legal_form,
        project_stage: form.project_stage,
        initial_investment_mln: parseFloat(form.initial_investment_mln),
        equity_share_pct: parseFloat(form.equity_share_pct),
        debt_share_pct: parseFloat(form.debt_share_pct),
        interest_rate_pct: parseFloat(form.interest_rate_pct),
        discount_rate_pct: parseFloat(form.discount_rate_pct),
        annual_revenue_mln: parseFloat(form.annual_revenue_mln),
        annual_costs_mln: parseFloat(form.annual_costs_mln),
        revenue_growth_pct: parseFloat(form.revenue_growth_pct),
        project_years: parseInt(form.project_years),
        tax_rate_pct: parseFloat(form.tax_rate_pct),
        risk_level: form.risk_level,
        market_competition: form.market_competition,
        has_state_support: form.has_state_support,
        export_share_pct: parseFloat(form.export_share_pct),
        additional_notes: form.additional_notes || null,
      };
      const res = await apiRequest('/business-cases/evaluate', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } });
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Ошибка расчёта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: spacing[4] }}>
      <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[1] }}>
        Оценка инвестиционного проекта
      </h1>
      <p style={{ color: semantic.textSecondary, marginBottom: spacing[6], fontSize: typography.fontSize.sm }}>
        Заполните анкету из 20 вопросов и получите точный расчёт NPV, IRR, PI и срока окупаемости
      </p>

      <form onSubmit={handleSubmit}>
        {/* Секция 1: Основная информация */}
        <div style={{ background: semantic.bgCard, borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[4], border: `1px solid ${semantic.border}` }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[4] }}>
            1. Основная информация
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing[4] }}>
            <Field label="1. Название проекта">
              <input style={inputStyle} required value={form.project_name} onChange={e => set('project_name', e.target.value)} placeholder="Например: Молочная ферма" />
            </Field>
            <Field label="2. Отрасль">
              <select style={inputStyle} value={form.industry} onChange={e => set('industry', e.target.value)}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </Field>
            <Field label="3. Регион">
              <select style={inputStyle} value={form.region} onChange={e => set('region', e.target.value)}>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="4. Организационно-правовая форма">
              <select style={inputStyle} value={form.legal_form} onChange={e => set('legal_form', e.target.value)}>
                {['ООО', 'АО', 'ИП', 'ГУП', 'СП'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="5. Стадия проекта">
              <select style={inputStyle} value={form.project_stage} onChange={e => set('project_stage', e.target.value)}>
                {['идея', 'стартап', 'расширение', 'модернизация'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </div>
        </div>

        {/* Секция 2: Финансовые параметры */}
        <div style={{ background: semantic.bgCard, borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[4], border: `1px solid ${semantic.border}` }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[4] }}>
            2. Финансовые параметры
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing[4] }}>
            <Field label="6. Сумма инвестиций (млн UZS)">
              <input style={inputStyle} type="number" required min="0.1" step="0.1" value={form.initial_investment_mln} onChange={e => set('initial_investment_mln', e.target.value)} placeholder="Напр.: 5000" />
            </Field>
            <Field label="7. Доля собственного капитала (%)">
              <input style={inputStyle} type="number" required min="0" max="100" value={form.equity_share_pct} onChange={e => set('equity_share_pct', e.target.value)} />
            </Field>
            <Field label="8. Доля заёмного капитала (%)">
              <input style={inputStyle} type="number" required min="0" max="100" value={form.debt_share_pct} onChange={e => set('debt_share_pct', e.target.value)} />
            </Field>
            <Field label="9. Процентная ставка по кредиту (%)">
              <input style={inputStyle} type="number" required min="0" step="0.1" value={form.interest_rate_pct} onChange={e => set('interest_rate_pct', e.target.value)} />
            </Field>
            <Field label="10. Ставка дисконтирования (%)">
              <input style={inputStyle} type="number" required min="0.1" step="0.1" value={form.discount_rate_pct} onChange={e => set('discount_rate_pct', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Секция 3: Выручка и затраты */}
        <div style={{ background: semantic.bgCard, borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[4], border: `1px solid ${semantic.border}` }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[4] }}>
            3. Выручка и затраты
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing[4] }}>
            <Field label="11. Ожидаемая годовая выручка (млн UZS)">
              <input style={inputStyle} type="number" required min="0.1" step="0.1" value={form.annual_revenue_mln} onChange={e => set('annual_revenue_mln', e.target.value)} placeholder="Напр.: 3000" />
            </Field>
            <Field label="12. Ежегодные операционные затраты (млн UZS)">
              <input style={inputStyle} type="number" required min="0.1" step="0.1" value={form.annual_costs_mln} onChange={e => set('annual_costs_mln', e.target.value)} placeholder="Напр.: 1500" />
            </Field>
            <Field label="13. Ежегодный рост выручки (%)">
              <input style={inputStyle} type="number" min="0" step="0.1" value={form.revenue_growth_pct} onChange={e => set('revenue_growth_pct', e.target.value)} />
            </Field>
            <Field label="14. Горизонт проекта (лет)">
              <input style={inputStyle} type="number" required min="1" max="30" value={form.project_years} onChange={e => set('project_years', e.target.value)} />
            </Field>
            <Field label="15. Ставка налога на прибыль (%)">
              <input style={inputStyle} type="number" required min="0" max="60" step="0.1" value={form.tax_rate_pct} onChange={e => set('tax_rate_pct', e.target.value)} />
            </Field>
          </div>
        </div>

        {/* Секция 4: Риски и дополнительно */}
        <div style={{ background: semantic.bgCard, borderRadius: radius.xl, padding: spacing[5], marginBottom: spacing[4], border: `1px solid ${semantic.border}` }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[4] }}>
            4. Риски и дополнительно
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: spacing[4] }}>
            <Field label="16. Уровень риска">
              <select style={inputStyle} value={form.risk_level} onChange={e => set('risk_level', e.target.value)}>
                {['низкий', 'средний', 'высокий'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="17. Конкурентная среда">
              <select style={inputStyle} value={form.market_competition} onChange={e => set('market_competition', e.target.value)}>
                {['низкая', 'средняя', 'высокая'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
            <Field label="18. Государственная поддержка">
              <label style={{ display: 'flex', alignItems: 'center', gap: spacing[2], cursor: 'pointer' }}>
                <input type="checkbox" checked={form.has_state_support} onChange={e => set('has_state_support', e.target.checked)} />
                <span style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary }}>Да, есть господдержка</span>
              </label>
            </Field>
            <Field label="19. Доля экспорта в выручке (%)">
              <input style={inputStyle} type="number" min="0" max="100" value={form.export_share_pct} onChange={e => set('export_share_pct', e.target.value)} />
            </Field>
            <Field label="20. Дополнительные сведения">
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' as const }} value={form.additional_notes} onChange={e => set('additional_notes', e.target.value)} placeholder="Опишите особенности проекта..." />
            </Field>
          </div>
        </div>

        {/* Кнопка отправки */}
        {error && <div style={{ color: colors.error[600], marginBottom: spacing[3], fontSize: typography.fontSize.sm }}>{error}</div>}
        <button type="submit" disabled={loading} style={{
          padding: `${spacing[3]} ${spacing[6]}`, background: colors.primary[600], color: '#fff',
          border: 'none', borderRadius: radius.lg, fontSize: typography.fontSize.base,
          fontWeight: typography.fontWeight.semibold, cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1, transition: transitions.color,
        }}>
          {loading ? 'Расчёт...' : 'Рассчитать NPV, IRR, PI'}
        </button>
      </form>

      {/* Блок результатов */}
      {result && (
        <div style={{ marginTop: spacing[6], background: semantic.bgCard, borderRadius: radius.xl, padding: spacing[5], border: `2px solid ${result.is_viable ? colors.success[400] : colors.error[400]}` }}>
          <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[4] }}>
            Результаты оценки: {result.project_name}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing[4], marginBottom: spacing[4] }}>
            <div style={{ background: semantic.bgPage, borderRadius: radius.lg, padding: spacing[4], textAlign: 'center' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] }}>NPV (чистая приведённая стоимость)</div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: result.npv_mln >= 0 ? colors.success[600] : colors.error[600] }}>
                {result.npv_mln.toLocaleString()} млн
              </div>
            </div>
            <div style={{ background: semantic.bgPage, borderRadius: radius.lg, padding: spacing[4], textAlign: 'center' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] }}>IRR (внутренняя норма доходности)</div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: colors.primary[600] }}>
                {result.irr_pct !== null ? `${result.irr_pct}%` : 'N/A'}
              </div>
            </div>
            <div style={{ background: semantic.bgPage, borderRadius: radius.lg, padding: spacing[4], textAlign: 'center' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] }}>PI (индекс рентабельности)</div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: result.profitability_index >= 1 ? colors.success[600] : colors.error[600] }}>
                {result.profitability_index}
              </div>
            </div>
            <div style={{ background: semantic.bgPage, borderRadius: radius.lg, padding: spacing[4], textAlign: 'center' }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1] }}>Срок окупаемости</div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary }}>
                {result.payback_years !== null ? `${result.payback_years} лет` : 'Не окупается'}
              </div>
            </div>
          </div>

          <div style={{ padding: spacing[4], borderRadius: radius.lg, background: result.is_viable ? colors.success[50] : colors.error[50], border: `1px solid ${result.is_viable ? colors.success[200] : colors.error[200]}` }}>
            <div style={{ fontWeight: typography.fontWeight.semibold, color: result.is_viable ? colors.success[700] : colors.error[700], marginBottom: spacing[1] }}>
              {result.is_viable ? '✅ Проект рентабельный' : '❌ Проект не окупается'}
            </div>
            <div style={{ fontSize: typography.fontSize.sm, color: result.is_viable ? colors.success[600] : colors.error[600] }}>
              {result.recommendation}
            </div>
          </div>

          {result.cash_flows && result.cash_flows.length > 0 && (
            <div style={{ marginTop: spacing[4] }}>
              <h3 style={{ fontSize: typography.fontSize.base, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, marginBottom: spacing[2] }}>
                Денежные потоки по годам (млн UZS)
              </h3>
              <div style={{ display: 'flex', gap: spacing[2], flexWrap: 'wrap' as const }}>
                {result.cash_flows.map((cf, i) => (
                  <div key={i} style={{ background: cf >= 0 ? colors.success[50] : colors.error[50], borderRadius: radius.md, padding: `${spacing[1]} ${spacing[3]}`, fontSize: typography.fontSize.sm, color: cf >= 0 ? colors.success[700] : colors.error[700], border: `1px solid ${cf >= 0 ? colors.success[200] : colors.error[200]}` }}>
                    Год {i + 1}: {cf.toLocaleString()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
