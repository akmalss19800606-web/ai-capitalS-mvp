'use client';
/**
 * UI-003: Onboarding Wizard — 5-step setup for first-time users.
 * Steps: 1. Role  2. Profile  3. Portfolio  4. Data Sources  5. Dashboard Template
 * Triggers on first login (onboarding not completed).
 * Can be skipped. Data saved via /api/v1/onboarding/step/{n}.
 */
import { useState, useEffect } from 'react';
import {
  semantic, colors, radius, spacing, transitions, typography,
} from '@/lib/design-tokens';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { title: 'Выбор роли', icon: '👤' },
  { title: 'Профиль', icon: '📝' },
  { title: 'Портфель', icon: '💼' },
  { title: 'Данные', icon: '📊' },
  { title: 'Дашборд', icon: '🏠' },
];

function api(path: string, body?: Record<string, unknown>) {
  const token = localStorage.getItem('token');
  return fetch(`/api/v1/onboarding${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }).then(r => r.json());
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [role, setRole] = useState('analyst');
  // Step 2
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  // Step 3
  const [portfolioName, setPortfolioName] = useState('Мой первый портфель');
  const [currency, setCurrency] = useState('UZS');
  const [portfolioType, setPortfolioType] = useState('mixed');
  // Step 4
  const [enableCbu, setEnableCbu] = useState(true);
  const [enableUzse, setEnableUzse] = useState(true);
  const [enableGroq, setEnableGroq] = useState(true);
  const [enableGemini, setEnableGemini] = useState(true);
  // Step 5
  const [template, setTemplate] = useState('analyst');

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        await api('/step/1', { role });
      } else if (step === 2) {
        await api('/step/2', { full_name: fullName, organization });
      } else if (step === 3) {
        await api('/step/3', {
          portfolio_name: portfolioName,
          currency,
          portfolio_type: portfolioType,
        });
      } else if (step === 4) {
        await api('/step/4', {
          enable_cbu: enableCbu,
          enable_uzse: enableUzse,
          enable_ai_groq: enableGroq,
          enable_ai_gemini: enableGemini,
        });
      } else if (step === 5) {
        await api('/step/5', { dashboard_template: template });
        onComplete();
        return;
      }
      setStep(s => s + 1);
    } catch {
      /* continue anyway */
      setStep(s => Math.min(s + 1, 5));
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try { await api('/skip', {}); } catch { /* ok */ }
    onComplete();
  };

  const roles = [
    { id: 'analyst', label: 'Аналитик', desc: 'Анализ рынков, оценка активов, DCF' },
    { id: 'portfolio_manager', label: 'Портфельный менеджер', desc: 'Управление портфелями и решениями' },
    { id: 'committee_member', label: 'Инвестком', desc: 'Утверждение решений, риск-контроль' },
    { id: 'admin', label: 'Администратор', desc: 'Управление пользователями и системой' },
  ];

  const templates = [
    { id: 'analyst', label: 'Аналитик', desc: 'Графики, DCF, скоринг' },
    { id: 'executive', label: 'Руководитель', desc: 'KPI, тренды, хитмапа рисков' },
    { id: 'committee', label: 'Инвестком', desc: 'Pipeline решений, стресс-тесты' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Мастер настройки"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        backgroundColor: 'var(--bg-card)', borderRadius: '16px',
        border: '1px solid var(--border)',
        width: '100%', maxWidth: '540px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>
        {/* Progress bar */}
        <div style={{
          display: 'flex', gap: '4px', padding: '16px 24px 0',
        }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{
              flex: 1, height: '4px', borderRadius: '2px',
              backgroundColor: i < step ? 'var(--accent)' : 'var(--color-neutral-200)',
              transition: 'background-color 0.3s',
            }} />
          ))}
        </div>

        {/* Header */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '4px' }}>
            Шаг {step} из 5
          </div>
          <h2 style={{
            fontSize: '20px', fontWeight: 700,
            color: 'var(--text-primary)', margin: 0,
          }}>
            {STEPS[step - 1]?.icon} {STEPS[step - 1]?.title}
          </h2>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', minHeight: '240px' }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Выберите вашу роль для персонализации интерфейса:
              </p>
              {roles.map(r => (
                <button key={r.id} onClick={() => setRole(r.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px', borderRadius: '10px', textAlign: 'left',
                    border: `2px solid ${role === r.id ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: role === r.id ? 'var(--color-primary-50)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: `2px solid ${role === r.id ? 'var(--accent)' : 'var(--color-neutral-300)'}`,
                    backgroundColor: role === r.id ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{r.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  ФИО
                </label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Иван Петров"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--color-neutral-0)',
                    color: 'var(--text-primary)', fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Организация
                </label>
                <input value={organization} onChange={e => setOrganization(e.target.value)}
                  placeholder="Название компании"
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--color-neutral-0)',
                    color: 'var(--text-primary)', fontSize: '14px',
                  }}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Название портфеля
                </label>
                <input value={portfolioName} onChange={e => setPortfolioName(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '8px',
                    border: '1px solid var(--border)', backgroundColor: 'var(--color-neutral-0)',
                    color: 'var(--text-primary)', fontSize: '14px',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Валюта</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border)', backgroundColor: 'var(--color-neutral-0)',
                      color: 'var(--text-primary)', fontSize: '14px',
                    }}
                  >
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Тип</label>
                  <select value={portfolioType} onChange={e => setPortfolioType(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: '8px',
                      border: '1px solid var(--border)', backgroundColor: 'var(--color-neutral-0)',
                      color: 'var(--text-primary)', fontSize: '14px',
                    }}
                  >
                    <option value="mixed">Смешанный</option>
                    <option value="equity">Акции</option>
                    <option value="debt">Облигации</option>
                    <option value="real_estate">Недвижимость</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Выберите источники данных для подключения:
              </p>
              {[
                { label: 'ЦБ Узбекистана (cbu.uz)', desc: 'Курсы валют в реальном времени', checked: enableCbu, onChange: setEnableCbu },
                { label: 'Биржа UZSE', desc: 'Котировки и торги', checked: enableUzse, onChange: setEnableUzse },
                { label: 'Groq AI', desc: 'LLM-аналитика (Llama 3.1)', checked: enableGroq, onChange: setEnableGroq },
                { label: 'Google Gemini', desc: 'AI-инсайты (Gemini 2.0)', checked: enableGemini, onChange: setEnableGemini },
              ].map((s, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px',
                  border: `1px solid ${s.checked ? 'var(--accent)' : 'var(--border)'}`,
                  backgroundColor: s.checked ? 'var(--color-primary-50)' : 'transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  <input type="checkbox" checked={s.checked}
                    onChange={e => s.onChange(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{s.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Выберите стартовый шаблон дашборда:
              </p>
              {templates.map(t => (
                <button key={t.id} onClick={() => setTemplate(t.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '16px', borderRadius: '10px', textAlign: 'left',
                    border: `2px solid ${template === t.id ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: template === t.id ? 'var(--color-primary-50)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    border: `2px solid ${template === t.id ? 'var(--accent)' : 'var(--color-neutral-300)'}`,
                    backgroundColor: template === t.id ? 'var(--accent)' : 'transparent',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={handleSkip}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: 'transparent', color: 'var(--text-muted)',
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Пропустить
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)}
                style={{
                  padding: '8px 20px', borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent', color: 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                }}
              >
                Назад
              </button>
            )}
            <button onClick={handleNext} disabled={loading}
              style={{
                padding: '8px 24px', borderRadius: '8px', border: 'none',
                backgroundColor: 'var(--accent)', color: '#fff',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? '...' : step === 5 ? 'Завершить' : 'Далее'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
