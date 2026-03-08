'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      setError(isRegister ? 'Ошибка регистрации. Проверьте данные.' : 'Неверный email или пароль.');
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
    } catch (err: any) {
      setError('Неверный код MFA. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  /* styles (inline, no tailwind dep) */
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 50%, #eef2ff 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  };
  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: '420px',
  };
  const logoWrap: React.CSSProperties = {
    textAlign: 'center', marginBottom: '32px',
  };
  const logoBox: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '64px', height: '64px', borderRadius: '16px',
    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
    boxShadow: '0 8px 24px rgba(59,130,246,0.3)', marginBottom: '16px',
  };
  const formBox: React.CSSProperties = {
    backgroundColor: '#ffffff', borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', padding: '32px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: '12px',
    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
    fontSize: '14px', outline: 'none', color: '#1e293b',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px',
  };
  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
    backgroundColor: '#3b82f6', color: '#fff', fontWeight: 600,
    fontSize: '14px', cursor: 'pointer', marginTop: '8px',
    transition: 'background 0.15s',
  };
  const errStyle: React.CSSProperties = {
    backgroundColor: '#fef2f2', border: '1px solid #fecaca',
    borderRadius: '12px', padding: '12px 16px', fontSize: '13px', color: '#dc2626',
  };

  /* MFA input screen */
  if (mfaRequired) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={logoWrap}>
            <div style={logoBox}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>Двухфакторная аутентификация</h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Введите код из приложения-аутентификатора
            </p>
          </div>
          <div style={formBox}>
            <form onSubmit={handleMfaSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Код MFA</label>
                <input
                  value={mfaCode} onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="000000" maxLength={8} autoFocus
                  style={{ ...inputStyle, fontSize: '20px', letterSpacing: '6px', textAlign: 'center' }}
                />
              </div>
              {error && <div style={{ ...errStyle, marginBottom: '12px' }}>{error}</div>}
              <button type="submit" disabled={loading || !mfaCode.trim()} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Проверка...' : 'Подтвердить'}
              </button>
            </form>
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button onClick={() => { setMfaRequired(false); setMfaCode(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                Назад к логину
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={logoWrap}>
          <div style={logoBox}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>AI Capital Management</h1>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Система управления инвестициями</p>
        </div>

        <div style={formBox}>
          <h2 style={{ fontSize: '17px', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
            {isRegister ? 'Создать аккаунт' : 'Войти в систему'}
          </h2>
          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div style={{ marginBottom: '14px' }}>
                <label style={labelStyle}>Полное имя</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Иван Иванович" style={inputStyle} />
              </div>
            )}
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com" required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle} />
            </div>
            {error && <div style={{ ...errStyle, marginBottom: '12px' }}>{error}</div>}
            <button type="submit" disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Загрузка...' : isRegister ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </form>
          <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              {isRegister ? 'Уже есть аккаунт? ' : 'Нет аккаунта? '}
              <button onClick={() => { setIsRegister(!isRegister); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}>
                {isRegister ? 'Войти' : 'Зарегистрироваться'}
              </button>
            </p>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '24px' }}>
          © 2026 Солиев Акмал Идиевич · Патент №009932
        </p>
      </div>
    </div>
  );
}
