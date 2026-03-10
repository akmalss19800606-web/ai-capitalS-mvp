'use client';
import { useState, useEffect } from 'react';
import { useLocale, setStoredLocale, getStoredLocale } from '@/lib/i18n';
import { auth, preferences as prefsApi } from '@/lib/api';

/* ─── Toggle switch ─── */
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      width: '44px', height: '24px', borderRadius: '12px',
      border: 'none', cursor: 'pointer', position: 'relative',
      backgroundColor: on ? '#3b82f6' : '#d1d5db',
      transition: 'background-color 0.2s',
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        backgroundColor: '#ffffff', position: 'absolute',
        top: '3px', left: on ? '23px' : '3px',
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  );
}

/* ─── Select dropdown styled ─── */
function SelectField({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        padding: '8px 12px', borderRadius: '8px',
        border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
        fontSize: '13px', color: '#1e293b', outline: 'none',
        cursor: 'pointer', fontFamily: 'Inter, sans-serif',
        minWidth: '160px',
      }}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ─── Settings row ─── */
function SettingsRow({
  label, description, children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{ flex: 1, marginRight: '16px' }}>
        <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>
          {label}
        </div>
        {description && (
          <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
            {description}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─── Main Settings Page ─── */
export default function SettingsPage() {
  const { t } = useLocale();
  const s = t.settings;

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'notifications' | 'system'>('profile');

  /* ─── Profile state ─── */
  const [profile, setProfile] = useState({ full_name: '', email: '', role: 'user' });
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ─── Appearance state ─── */
  const [lang, setLang] = useState(getStoredLocale());
  const [currency, setCurrency] = useState('UZS');
  const [timezone, setTimezone] = useState('Asia/Tashkent');
  const [dateFormat, setDateFormat] = useState('DD.MM.YYYY');
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('normal');

  /* ─── Notification state ─── */
  const [emailNotif, setEmailNotif] = useState(true);
  const [inAppNotif, setInAppNotif] = useState(true);
  const [decisionNotif, setDecisionNotif] = useState(true);
  const [workflowNotif, setWorkflowNotif] = useState(true);

  /* ─── System state ─── */
  const [cacheCleared, setCacheCleared] = useState(false);

  /* Load profile on mount */
  useEffect(() => {
    auth.me().then(data => {
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          email: data.email || '',
          role: data.role || 'user',
        });
      }
      setProfileLoading(false);
    }).catch(() => setProfileLoading(false));

    /* Load preferences */
    prefsApi.get().then(data => {
      if (data) {
        if (data.language) { setLang(data.language); setStoredLocale(data.language as unknown); }
        if (data.theme) setTheme(data.theme);
        if (data.font_size) setFontSize(data.font_size);
        if (data.email_notifications !== undefined) setEmailNotif(data.email_notifications);
        if (data.in_app_notifications !== undefined) setInAppNotif(data.in_app_notifications);
      }
    }).catch(() => {});
  }, []);

  const handleLangChange = (newLang: string) => {
    setLang(newLang);
    setStoredLocale(newLang as unknown);
    prefsApi.update({ language: newLang }).catch(() => {});
  };

  const handleSaveProfile = () => {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSaveNotifications = () => {
    prefsApi.update({
      email_notifications: emailNotif,
      in_app_notifications: inAppNotif,
    }).catch(() => {});
  };

  const handleClearCache = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai_capital_cache');
    }
    setCacheCleared(true);
    setTimeout(() => setCacheCleared(false), 3000);
  };

  /* ─── Tab definitions ─── */
  const tabs: Array<{ key: typeof activeTab; label: string; icon: React.ReactNode }> = [
    {
      key: 'profile', label: s.tabs.profile,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      key: 'appearance', label: s.tabs.appearance,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2" /><path d="M12 21v2" />
          <path d="M4.22 4.22l1.42 1.42" /><path d="M18.36 18.36l1.42 1.42" />
          <path d="M1 12h2" /><path d="M21 12h2" />
          <path d="M4.22 19.78l1.42-1.42" /><path d="M18.36 5.64l1.42-1.42" />
        </svg>
      ),
    },
    {
      key: 'notifications', label: s.tabs.notifications,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
    {
      key: 'system', label: s.tabs.system,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
    },
  ];

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff', borderRadius: '12px',
    border: '1px solid #e5e7eb', padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '1px solid #e2e8f0', backgroundColor: '#f8fafc',
    fontSize: '14px', outline: 'none', color: '#1e293b',
    fontFamily: 'Inter, sans-serif',
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '24px' }}>
        {s.pageTitle}
      </h1>

      {/* ─── Tab bar ─── */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '24px',
        padding: '4px', backgroundColor: '#f3f4f6', borderRadius: '12px',
        flexWrap: 'wrap',
      }}>
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              backgroundColor: activeTab === tab.key ? '#ffffff' : 'transparent',
              color: activeTab === tab.key ? '#111827' : '#6b7280',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s',
              fontFamily: 'Inter, sans-serif',
            }}>
            <span style={{ display: 'flex', alignItems: 'center', color: activeTab === tab.key ? '#3b82f6' : '#9ca3af' }}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Profile tab ─── */}
      {activeTab === 'profile' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '20px' }}>
            {s.profile.title}
          </h2>
          {profileLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#9ca3af' }}>{t.loading}</div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  {s.profile.fullName}
                </label>
                <input value={profile.full_name}
                  onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  {s.profile.email}
                </label>
                <input value={profile.email} readOnly
                  style={{ ...inputStyle, backgroundColor: '#f1f5f9', color: '#6b7280', cursor: 'not-allowed' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                  {s.profile.role}
                </label>
                <div style={{
                  padding: '8px 14px', borderRadius: '8px', backgroundColor: '#eff6ff',
                  fontSize: '13px', color: '#2563eb', fontWeight: 500, display: 'inline-block',
                }}>
                  {profile.role === 'admin' ? 'Administrator' : profile.role === 'manager' ? 'Manager' : 'User'}
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #f3f4f6', margin: '0 -28px', padding: '0 28px' }} />

              {/* Change password section */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '16px' }}>
                  {s.profile.changePassword}
                </h3>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    {s.profile.currentPassword}
                  </label>
                  <input type="password" placeholder="••••••••" style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      {s.profile.newPassword}
                    </label>
                    <input type="password" placeholder="••••••••" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      {s.profile.confirmPassword}
                    </label>
                    <input type="password" placeholder="••••••••" style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={handleSaveProfile}
                  style={{
                    padding: '10px 24px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(59,130,246,0.2)',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  {t.save}
                </button>
                {profileSaved && (
                  <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 500 }}>
                    {s.profile.saved}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Appearance tab ─── */}
      {activeTab === 'appearance' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            {s.appearance.title}
          </h2>

          <SettingsRow label={s.appearance.language}>
            <SelectField value={lang} onChange={handleLangChange} options={[
              { value: 'ru', label: 'Русский' },
              { value: 'uz', label: 'O\'zbek' },
              { value: 'en', label: 'English' },
            ]} />
          </SettingsRow>

          <SettingsRow label={s.appearance.currency}>
            <SelectField value={currency} onChange={setCurrency} options={[
              { value: 'UZS', label: 'UZS — Сум' },
              { value: 'USD', label: 'USD — Доллар' },
              { value: 'EUR', label: 'EUR — Евро' },
              { value: 'RUB', label: 'RUB — Рубль' },
            ]} />
          </SettingsRow>

          <SettingsRow label={s.appearance.timezone}>
            <SelectField value={timezone} onChange={setTimezone} options={[
              { value: 'Asia/Tashkent', label: 'UTC+5 Ташкент' },
              { value: 'Europe/Moscow', label: 'UTC+3 Москва' },
              { value: 'Europe/London', label: 'UTC+0 Лондон' },
              { value: 'America/New_York', label: 'UTC-5 Нью-Йорк' },
            ]} />
          </SettingsRow>

          <SettingsRow label={s.appearance.dateFormat}>
            <SelectField value={dateFormat} onChange={setDateFormat} options={[
              { value: 'DD.MM.YYYY', label: 'ДД.ММ.ГГГГ' },
              { value: 'MM/DD/YYYY', label: 'ММ/ДД/ГГГГ' },
              { value: 'YYYY-MM-DD', label: 'ГГГГ-ММ-ДД' },
            ]} />
          </SettingsRow>

          <SettingsRow label={s.appearance.theme}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([
                { value: 'light', label: s.appearance.themeLight },
                { value: 'dark', label: s.appearance.themeDark },
                { value: 'system', label: s.appearance.themeSystem },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px',
                    border: theme === opt.value ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    backgroundColor: theme === opt.value ? '#eff6ff' : '#fff',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    color: theme === opt.value ? '#2563eb' : '#6b7280',
                    transition: 'all 0.15s',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label={s.appearance.fontSize}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([
                { value: 'small', label: s.appearance.fontSmall },
                { value: 'normal', label: s.appearance.fontNormal },
                { value: 'large', label: s.appearance.fontLarge },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => setFontSize(opt.value)}
                  style={{
                    padding: '6px 14px', borderRadius: '8px',
                    border: fontSize === opt.value ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    backgroundColor: fontSize === opt.value ? '#eff6ff' : '#fff',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    color: fontSize === opt.value ? '#2563eb' : '#6b7280',
                    transition: 'all 0.15s',
                    fontFamily: 'Inter, sans-serif',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </SettingsRow>
        </div>
      )}

      {/* ─── Notifications tab ─── */}
      {activeTab === 'notifications' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            {s.notifications.title}
          </h2>

          <SettingsRow label={s.notifications.emailNotif} description={s.notifications.emailDesc}>
            <Toggle on={emailNotif} onToggle={() => { setEmailNotif(!emailNotif); handleSaveNotifications(); }} />
          </SettingsRow>
          <SettingsRow label={s.notifications.inAppNotif} description={s.notifications.inAppDesc}>
            <Toggle on={inAppNotif} onToggle={() => { setInAppNotif(!inAppNotif); handleSaveNotifications(); }} />
          </SettingsRow>
          <SettingsRow label={s.notifications.decisionUpdates} description={s.notifications.decisionDesc}>
            <Toggle on={decisionNotif} onToggle={() => setDecisionNotif(!decisionNotif)} />
          </SettingsRow>
          <SettingsRow label={s.notifications.workflowNotif} description={s.notifications.workflowDesc}>
            <Toggle on={workflowNotif} onToggle={() => setWorkflowNotif(!workflowNotif)} />
          </SettingsRow>
        </div>
      )}

      {/* ─── System tab ─── */}
      {activeTab === 'system' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            {s.system.title}
          </h2>

          <SettingsRow label={s.system.version}>
            <span style={{
              padding: '4px 12px', borderRadius: '6px', backgroundColor: '#f0fdf4',
              fontSize: '13px', fontWeight: 600, color: '#15803d',
            }}>
              v3.0.0-beta
            </span>
          </SettingsRow>

          <SettingsRow label={s.system.apiUrl}>
            <code style={{
              fontSize: '12px', color: '#6b7280', backgroundColor: '#f3f4f6',
              padding: '4px 10px', borderRadius: '6px',
            }}>
              /api/v1
            </code>
          </SettingsRow>

          <SettingsRow label={s.system.dbStatus}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e',
              }} />
              <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
                {s.system.dbConnected}
              </span>
            </div>
          </SettingsRow>

          <SettingsRow label={s.system.clearCache}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {cacheCleared && (
                <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 500 }}>
                  {s.system.cacheCleared}
                </span>
              )}
              <button onClick={handleClearCache}
                style={{
                  padding: '6px 16px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', backgroundColor: '#fff',
                  fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  color: '#374151', transition: 'all 0.15s',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#fff')}
              >
                {s.system.clearCache}
              </button>
            </div>
          </SettingsRow>
        </div>
      )}
    </div>
  );
}
