'use client';
import { useEffect, useState, useCallback } from 'react';
import { apiRequest } from '@/lib/api';
import {
  colors, semantic, shadows, radius, spacing, transitions,
  typography,
} from '@/lib/design-tokens';

interface BusinessCase {
  id: string;
  name: string;
  category: string;
  category_name: string;
  industry: string;
  description: string;
  initial_investment_mln: number;
  discount_rate: number;
  risk_level: string;
  typical_payback: string;
  region: string;
  years: number;
}

interface ValidationResult {
  id: string;
  name: string;
  category: string;
  status: 'pass' | 'fail' | 'error';
  npv_mln?: number;
  irr?: number;
  payback_years?: number | null;
  profitability_index?: number;
  discount_rate_pct?: number;
  initial_investment_mln?: number;
  error?: string;
}

interface Category {
  category: string;
  name: string;
  count: number;
}

export default function BusinessCasesPage() {
  const [cases, setCases] = useState<BusinessCase[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [validated, setValidated] = useState(false);
  const [summary, setSummary] = useState({ total: 0, passed: 0, failed: 0, pass_rate: 0 });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [casesRes, catsRes] = await Promise.all([
        apiRequest('/business-cases'),
        apiRequest('/business-cases/categories'),
      ]);
      setCases(casesRes.cases || []);
      setCategories(catsRes.categories || []);
    } catch (e) {
      console.error('Ошибка загрузки:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const runValidation = useCallback(async () => {
    setValidating(true);
    try {
      const res = await apiRequest('/business-cases/validate', { method: 'POST' });
      setValidationResults(res.results || []);
      setSummary({ total: res.total, passed: res.passed, failed: res.failed, pass_rate: res.pass_rate });
      setValidated(true);
    } catch (e) {
      console.error('Ошибка валидации:', e);
    } finally {
      setValidating(false);
    }
  }, []);

  const filteredCases = activeCategory
    ? cases.filter(c => c.category === activeCategory)
    : cases;

  const getValidation = (id: string) => validationResults.find(v => v.id === id);

  const riskColor = (level: string) => {
    if (level === 'low') return colors.success[600];
    if (level === 'high') return colors.error[600];
    return colors.warning[600];
  };

  const statusBadge = (status: string) => {
    if (status === 'pass') return { bg: colors.success[100], color: colors.success[700], label: 'Пройден' };
    if (status === 'fail') return { bg: colors.error[100], color: colors.error[700], label: 'Не пройден' };
    return { bg: colors.warning[100], color: colors.warning[700], label: 'Ошибка' };
  };

  if (loading) {
    return (
      <div className="page-content">
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[4] }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-shimmer" style={{ height: 120, borderRadius: radius.lg, background: semantic.bgHover }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ marginBottom: spacing[6] }}>
        <h1 style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: semantic.textPrimary, marginBottom: spacing[1] }}>
          Бизнес-кейсы Узбекистана
        </h1>
        <p style={{ color: semantic.textSecondary, fontSize: typography.fontSize.base }}>
          {cases.length} инвестиционных проектов для валидации аналитического движка
        </p>
      </div>

      {/* Validation summary */}
      {validated && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: spacing[4],
          marginBottom: spacing[6],
        }}>
          {[
            { label: 'Всего кейсов', value: summary.total, color: colors.primary[600] },
            { label: 'Пройдено', value: summary.passed, color: colors.success[600] },
            { label: 'Не пройдено', value: summary.failed, color: colors.error[600] },
            { label: 'Процент успеха', value: `${summary.pass_rate}%`, color: colors.primary[600] },
          ].map((kpi, i) => (
            <div key={i} style={{
              background: semantic.bgCard, borderRadius: radius.lg, padding: spacing[4],
              border: `1px solid ${semantic.border}`, boxShadow: shadows.card,
            }}>
              <div style={{ fontSize: typography.fontSize.xs, color: semantic.textMuted, marginBottom: spacing[1], textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wider }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.bold, color: kpi.color }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: spacing[3], marginBottom: spacing[5], flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={runValidation}
          disabled={validating}
          style={{
            padding: `${spacing[2]} ${spacing[4]}`, borderRadius: radius.md,
            background: validating ? colors.neutral[400] : colors.primary[600],
            color: '#fff', border: 'none', cursor: validating ? 'not-allowed' : 'pointer',
            fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm,
            transition: transitions.color,
          }}
        >
          {validating ? 'Валидация...' : 'Запустить валидацию всех кейсов'}
        </button>
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: spacing[2], marginBottom: spacing[5], flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveCategory(null)}
          style={{
            padding: `${spacing[1]} ${spacing[3]}`, borderRadius: radius.full,
            background: !activeCategory ? colors.primary[600] : semantic.bgCard,
            color: !activeCategory ? '#fff' : semantic.textSecondary,
            border: `1px solid ${!activeCategory ? colors.primary[600] : semantic.border}`,
            cursor: 'pointer', fontSize: typography.fontSize.sm,
            transition: transitions.color,
          }}
        >
          Все ({cases.length})
        </button>
        {categories.map(cat => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(cat.category)}
            style={{
              padding: `${spacing[1]} ${spacing[3]}`, borderRadius: radius.full,
              background: activeCategory === cat.category ? colors.primary[600] : semantic.bgCard,
              color: activeCategory === cat.category ? '#fff' : semantic.textSecondary,
              border: `1px solid ${activeCategory === cat.category ? colors.primary[600] : semantic.border}`,
              cursor: 'pointer', fontSize: typography.fontSize.sm,
              transition: transitions.color,
            }}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Cases grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: spacing[4] }}>
        {filteredCases.map(c => {
          const v = getValidation(c.id);
          return (
            <div key={c.id} style={{
              background: semantic.bgCard, borderRadius: radius.lg, padding: spacing[4],
              border: `1px solid ${semantic.border}`, boxShadow: shadows.card,
              transition: transitions.normal,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                <h3 style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, flex: 1 }}>
                  {c.name}
                </h3>
                <span style={{
                  padding: `2px ${spacing[2]}`, borderRadius: radius.full,
                  fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.medium,
                  backgroundColor: riskColor(c.risk_level) + '18',
                  color: riskColor(c.risk_level),
                  marginLeft: spacing[2], whiteSpace: 'nowrap',
                }}>
                  {c.risk_level === 'low' ? 'Низкий' : c.risk_level === 'high' ? 'Высокий' : 'Средний'}
                </span>
              </div>

              <p style={{ fontSize: typography.fontSize.sm, color: semantic.textSecondary, marginBottom: spacing[3], lineHeight: typography.lineHeight.relaxed }}>
                {c.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing[2], marginBottom: spacing[3] }}>
                <div>
                  <div style={{ fontSize: '10px', color: semantic.textMuted, textTransform: 'uppercase' }}>Инвестиции</div>
                  <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, fontSize: typography.fontSize.sm }}>
                    {c.initial_investment_mln.toLocaleString()} млн UZS
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: semantic.textMuted, textTransform: 'uppercase' }}>Ставка</div>
                  <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, fontSize: typography.fontSize.sm }}>
                    {(c.discount_rate * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: semantic.textMuted, textTransform: 'uppercase' }}>Окупаемость</div>
                  <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, fontSize: typography.fontSize.sm }}>
                    {c.typical_payback}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '10px', color: semantic.textMuted, textTransform: 'uppercase' }}>Регион</div>
                  <div style={{ fontWeight: typography.fontWeight.semibold, color: semantic.textPrimary, fontSize: typography.fontSize.sm }}>
                    {c.region}
                  </div>
                </div>
              </div>

              {v && (
                <div style={{
                  borderTop: `1px solid ${semantic.borderLight}`, paddingTop: spacing[3],
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ display: 'flex', gap: spacing[3] }}>
                    {v.npv_mln !== undefined && (
                      <div>
                        <div style={{ fontSize: '10px', color: semantic.textMuted }}>NPV</div>
                        <div style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: (v.npv_mln ?? 0) >= 0 ? colors.success[600] : colors.error[600] }}>
                          {(v.npv_mln ?? 0).toLocaleString()} млн
                        </div>
                      </div>
                    )}
                    {v.irr !== undefined && v.irr !== null && (
                      <div>
                        <div style={{ fontSize: '10px', color: semantic.textMuted }}>IRR</div>
                        <div style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: semantic.textPrimary }}>
                          {v.irr}%
                        </div>
                      </div>
                    )}
                    {v.profitability_index !== undefined && (
                      <div>
                        <div style={{ fontSize: '10px', color: semantic.textMuted }}>PI</div>
                        <div style={{ fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.sm, color: semantic.textPrimary }}>
                          {v.profitability_index}
                        </div>
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: `2px ${spacing[2]}`, borderRadius: radius.full,
                    fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold,
                    backgroundColor: statusBadge(v.status).bg,
                    color: statusBadge(v.status).color,
                  }}>
                    {statusBadge(v.status).label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredCases.length === 0 && (
        <div style={{ textAlign: 'center', padding: spacing[8], color: semantic.textMuted }}>
          Нет данных
        </div>
      )}
    </div>
  );
}
