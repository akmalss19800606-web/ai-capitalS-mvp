'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useLocale, setStoredLocale, getStoredLocale } from '@/lib/i18n';
import Image from 'next/image';

/* --- Animated dots background (SVG-based, lightweight) --- */
function BackgroundPattern() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #0f172a 100%)',
      }} />
      {/* Grid pattern */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05 }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Floating circles */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '15%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)',
        filter: 'blur(50px)',
      }} />
      <div style={{
        position: 'absolute', top: '60%', left: '50%',
        width: '250px', height: '250px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)',
        filter: 'blur(35px)',
      }} />
    </div>
  );
}

/* --- Logo component using /logo.svg --- */
function Logo({ size = 48 }: { size?: number }) {
  return (
    <img
      src="/logo.svg"
      alt="AI Capital Management"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    />
  );
}

/* --- Language Switcher (compact) --- */
function LangSwitcher() {
  const [current, setCurrent] = useState(getStoredLocale());
  const langs: Array<{ code: 'ru' | 'uz' | 'en'; label: string }> = [
    { code: 'ru', label: 'RU' },
    { code: 'uz', label: 'UZ' },
    { code: 'en', label: 'EN' },
  ];
  return (
    <div style={{ display: 'flex', gap: '4px', padding: '3px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.08)' }}>
      {langs.map(l => (
        <button key={l.code} onClick={() => { setStoredLocale(l.code); setCurrent(l.code); }}
          style={{
            padding: '4px 10px', borderRadius: '6px', border: 'none',
            fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            backgroundColor: current === l.code ? 'rgba(255,255,255,0.15)' : 'transparent',
            color: current === l.code ? '#ffffff' : 'rgba(255,255,255,0.5)',
            transition: 'all 0.15s',
          }}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

/* --- Feature bullet --- */
function FeatureBullet({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        backgroundColor: 'rgba(59,130,246,0.15)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
        {text}
      </span>
    </div>
  );
}

/* --- Main Login Page --- */
export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /* MFA step */
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await auth.register({ email, password, full_name: fullName });
      }
      const data = await auth.login(email, password);
      if (data.mfa_required) {
        setMfaRequired(true);
        setMfaTempToken(data.mfa_temp_token);
        setLoading(false);
        return;
      }
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      router.push('/');
    } catch {
      setError(isRegister ? t.login.errorRegister : t.login.errorLogin);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await auth.mfaVerify(mfaTempToken, mfaCode.trim());
      localStorage.setItem('token', data.access_token);
      if (data.refresh_token) localStorage.setItem('refresh_token', data.refresh_token);
      router.push('/');
    } catch {
      setError(t.login.mfaError);
    } finally {
      setLoading(false);
    }
  };

  /* --- Styles --- */
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: '10px',
    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
    fontSize: '14px', outline: 'none', color: '#1e293b',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'Inter, sans-serif',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#475569', marginBottom: '6px',
  };
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.15s',
    boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
    fontFamily: 'Inter, sans-serif',
  };
  const errStyle: React.CSSProperties = {
    backgroundColor: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#dc2626',
  };

  /* --- MFA screen --- */
  if (mfaRequired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', position: 'relative' }}>
        <BackgroundPattern />
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 1, padding: '24px',
        }}>
          <div style={{ width: '100%', maxWidth: '400px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <Logo size={56} />
              <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '16px' }}>
                {t.login.mfaTitle}
              </h1>
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginTop: '6px' }}>
                {t.login.mfaSubtitle}
              </p>
            </div>
            <div style={{
              backgroundColor: '#fff', borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: '32px',
            }}>
              <form onSubmit={handleMfaSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={labelStyle}>{t.login.mfaLabel}</label>
                  <input value={mfaCode} onChange={e => setMfaCode(e.target.value)}
                    placeholder="000000" maxLength={8} autoFocus
                    style={{ ...inputStyle, fontSize: '22px', letterSpacing: '6px', textAlign: 'center' }} />
                </div>
                {error && <div style={{ ...errStyle, marginBottom: '16px' }}>{error}</div>}
                <button type="submit" disabled={loading || !mfaCode.trim()}
                  style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
                  {loading ? t.login.mfaChecking : t.login.mfaSubmit}
                </button>
              </form>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button onClick={() => { setMfaRequired(false); setMfaCode(''); setError(''); }}
                  style={{
                    background: 'none', border: 'none', color: '#3b82f6',
                    fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                  }}>
                  {t.login.mfaBack}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* --- Main login/register --- */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', position: 'relative' }}>
      <BackgroundPattern />
      {/* --- Left: Branding hero panel --- */}
      <div className="login-hero" style={{
        flex: 1, position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px',
      }}>
        <div style={{ position: 'absolute', top: '24px', left: '24px' }}>
          <LangSwitcher />
        </div>
        <div style={{ maxWidth: '480px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
            <Logo size={52} />
            <div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
                AI Capital
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                Management
              </div>
            </div>
          </div>
          <h1 style={{
            fontSize: '36px', fontWeight: 800, color: '#ffffff',
            lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-0.02em',
          }}>
            {t.login.heroTagline}
          </h1>
          <p style={{
            fontSize: '15px', color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.6, marginBottom: '36px',
          }}>
            {t.login.subtitle}
          </p>
          <div style={{ marginBottom: '40px' }}>
            {t.login.heroFeatures.map((feat: string, i: number) => (
              <FeatureBullet key={i} text={feat} />
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
            {t.login.trustedBy}
          </p>
        </div>
      </div>
      {/* --- Right: Form panel --- */}
      <div style={{
        width: '480px', minWidth: '380px', position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '40px', backgroundColor: '#ffffff',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
      }}>
        <div className="login-mobile-lang" style={{
          position: 'absolute', top: '16px', right: '16px', display: 'none',
        }}>
          <LangSwitcher />
        </div>
        <div className="login-mobile-logo" style={{
          display: 'none', textAlign: 'center', marginBottom: '24px',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <Logo size={40} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#111827' }}>AI Capital</div>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>Management</div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: '360px', width: '100%', margin: '0 auto' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '6px' }}>
            {isRegister ? t.login.signUp : t.login.signIn}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
            {t.login.subtitle}
          </p>
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="mb-4">
                <label style={labelStyle}>{t.login.fullName}</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder={t.login.fullNamePlaceholder} style={inputStyle} />
              </div>
            )}
            <div className="mb-4">
              <label style={labelStyle}>{t.login.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>{t.login.password}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={t.login.passwordPlaceholder} required
                  style={{ ...inputStyle, paddingRight: '42px' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                    display: 'flex', alignItems: 'center', padding: '2px',
                  }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            {error && <div style={{ ...errStyle, marginBottom: '16px' }}>{error}</div>}
            <button type="submit" disabled={loading}
              style={{ ...btnPrimary, opacity: loading ? 0.7 : 1 }}>
              {loading ? t.login.loadingText : isRegister ? t.login.submitRegister : t.login.submitLogin}
            </button>
          </form>
          <div style={{
            marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #f1f5f9',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              {isRegister ? t.login.hasAccount : t.login.noAccount}
              <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
                style={{
                  background: 'none', border: 'none', color: '#3b82f6',
                  fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                }}>
                {isRegister ? t.login.submitLogin : t.login.submitRegister}
              </button>
            </p>
          </div>
        </div>
        <p style={{
          textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '40px',
        }}>
          {t.patent(new Date().getFullYear())}
        </p>
      </div>
      {/* --- Responsive CSS --- */}
      <style>{`
        .login-hero { display: flex; }
        .login-mobile-logo { display: none !important; }
        .login-mobile-lang { display: none !important; }
        @media (max-width: 900px) {
          .login-hero { display: none !important; }
          .login-mobile-logo { display: block !important; }
          .login-mobile-lang { display: block !important; }
          div[style*="width: 480px"] {
            width: 100% !important;
            min-width: unset !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}
