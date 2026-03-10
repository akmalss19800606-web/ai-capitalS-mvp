'use client';
import { useEffect, useState } from 'react';
import { mfa, sessions, accessControl, auth } from '@/lib/api';

/* ───────── helpers ───────── */
const CARD: React.CSSProperties = {
  backgroundColor: '#ffffff', borderRadius: '14px',
  border: '1px solid #e2e8f0', padding: '24px', marginBottom: '20px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
const BTN_PRIMARY: React.CSSProperties = {
  padding: '9px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
  fontSize: '13px', fontWeight: 600, color: '#fff', backgroundColor: '#3b82f6',
  transition: 'background 0.15s',
};
const BTN_DANGER: React.CSSProperties = {
  ...BTN_PRIMARY, backgroundColor: '#ef4444',
};
const BTN_OUTLINE: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '10px', border: '1px solid #e2e8f0',
  backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
  color: '#475569', transition: 'all 0.15s',
};
const BADGE = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
  fontSize: '11px', fontWeight: 600, backgroundColor: color + '15',
  color, lineHeight: '1.4',
});
const INPUT: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: '10px',
  border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none',
  backgroundColor: '#f8fafc',
};
const LABEL: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: '#475569', marginBottom: '4px',
};
const TAB_BTN = (active: boolean): React.CSSProperties => ({
  padding: '10px 22px', borderRadius: '10px 10px 0 0',
  border: '1px solid ' + (active ? '#e2e8f0' : 'transparent'),
  borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
  backgroundColor: active ? '#ffffff' : 'transparent',
  cursor: 'pointer', fontSize: '13px', fontWeight: active ? 600 : 500,
  color: active ? '#1e293b' : '#64748b', transition: 'all 0.15s',
});

type Tab = 'mfa' | 'sessions' | 'roles' | 'policies' | 'sso';

export default function SecuritySettingsPage() {
  const [tab, setTab] = useState<Tab>('mfa');

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
          Безопасность и доступ
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b' }}>
          MFA, управление сессиями, SSO-провайдеры, роли и ABAC-политики
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '0', borderBottom: '1px solid #e2e8f0' }}>
        {([
          ['mfa', 'Двухфакторная (MFA)'],
          ['sessions', 'Сессии'],
          ['sso', 'SSO-провайдеры'],
          ['roles', 'Роли'],
          ['policies', 'ABAC-политики'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={TAB_BTN(tab === key)}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: '20px' }}>
        {tab === 'mfa' && <MfaTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'sso' && <SsoTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'policies' && <PoliciesTab />}
      </div>
    </div>
  );
}

/* ═══════════════════ MFA TAB ═══════════════════ */
function MfaTab() {
  const [status, setStatus] = useState<any>(null);
  const [setupData, setSetupData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    try { setStatus(await mfa.status()); } catch { /* ignore */ }
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSetup = async () => {
    setLoading(true); setMsg('');
    try {
      const data = await mfa.setup();
      setSetupData(data);
    } catch (e: unknown) { setMsg('Ошибка: ' + e.message); }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (!code.trim()) return;
    setLoading(true); setMsg('');
    try {
      await mfa.confirm(code.trim());
      setMsg('MFA успешно включено.');
      setSetupData(null); setCode('');
      loadStatus();
    } catch (e: unknown) { setMsg('Неверный код. Попробуйте ещё раз.'); }
    setLoading(false);
  };

  const handleDisable = async () => {
    if (!disableCode.trim()) return;
    setLoading(true); setMsg('');
    try {
      await mfa.disable(disableCode.trim());
      setMsg('MFA отключено.');
      setDisableCode('');
      loadStatus();
    } catch (e: unknown) { setMsg('Неверный код.'); }
    setLoading(false);
  };

  return (
    <div>
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Двухфакторная аутентификация (TOTP)
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Используйте Google Authenticator, Authy или аналогичное приложение
            </p>
          </div>
          {status && (
            <span style={BADGE(status.is_enabled ? '#22c55e' : '#64748b')}>
              {status.is_enabled ? 'Включено' : 'Выключено'}
            </span>
          )}
        </div>

        {status?.is_enabled && (
          <div style={{ padding: '14px', backgroundColor: '#f0fdf4', borderRadius: '10px', marginBottom: '14px' }}>
            <p style={{ fontSize: '12px', color: '#166534', marginBottom: '4px', fontWeight: 600 }}>
              MFA активно
            </p>
            <p style={{ fontSize: '12px', color: '#166534' }}>
              Backup-кодов осталось: {status.backup_codes_remaining}
            </p>
          </div>
        )}

        {!status?.is_enabled && !setupData && (
          <button onClick={handleSetup} disabled={loading} style={BTN_PRIMARY}>
            {loading ? 'Загрузка...' : 'Начать настройку MFA'}
          </button>
        )}

        {setupData && (
          <div>
            <div style={{ padding: '16px', backgroundColor: '#eff6ff', borderRadius: '10px', marginBottom: '14px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e40af', marginBottom: '10px' }}>
                Шаг 1: Отсканируйте QR-код или введите секрет в приложение
              </p>
              {/* QR placeholder — секрет для ручного ввода */}
              <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #dbeafe', marginBottom: '10px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Provisioning URI (для QR):</p>
                <code style={{ fontSize: '11px', wordBreak: 'break-all', color: '#1e40af', lineHeight: '1.5' }}>
                  {setupData.provisioning_uri}
                </code>
              </div>
              <div style={{ backgroundColor: '#fff', padding: '14px', borderRadius: '8px', border: '1px solid #dbeafe' }}>
                <p style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Секрет (для ручного ввода):</p>
                <code style={{ fontSize: '15px', letterSpacing: '2px', fontWeight: 700, color: '#1e293b' }}>
                  {setupData.secret}
                </code>
              </div>
            </div>

            <div style={{ padding: '16px', backgroundColor: '#fefce8', borderRadius: '10px', marginBottom: '14px' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#854d0e', marginBottom: '10px' }}>
                Backup-коды (сохраните в надёжном месте)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {setupData.backup_codes.map((c: string, i: number) => (
                  <code key={i} style={{
                    backgroundColor: '#fff', padding: '6px 10px', borderRadius: '6px',
                    fontSize: '13px', fontWeight: 600, textAlign: 'center',
                    border: '1px solid #fde68a', letterSpacing: '1px',
                  }}>{c}</code>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap' }}>
                Шаг 2: Введите код из приложения:
              </p>
              <input
                value={code} onChange={(e) => setCode(e.target.value)}
                placeholder="000000" maxLength={8}
                style={{ ...INPUT, width: '160px', fontSize: '16px', letterSpacing: '4px', textAlign: 'center' }}
              />
              <button onClick={handleConfirm} disabled={loading || !code.trim()} style={BTN_PRIMARY}>
                Подтвердить
              </button>
            </div>
          </div>
        )}

        {status?.is_enabled && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '10px' }}>
              Отключить MFA
            </p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                value={disableCode} onChange={(e) => setDisableCode(e.target.value)}
                placeholder="Код из приложения" maxLength={8}
                style={{ ...INPUT, width: '200px' }}
              />
              <button onClick={handleDisable} disabled={loading || !disableCode.trim()} style={BTN_DANGER}>
                Отключить
              </button>
            </div>
          </div>
        )}

        {msg && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            backgroundColor: msg.includes('успешно') || msg.includes('отключено') ? '#f0fdf4' : '#fef2f2',
            color: msg.includes('успешно') || msg.includes('отключено') ? '#166534' : '#dc2626',
            fontSize: '13px' }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ SESSIONS TAB ═══════════════════ */
function SessionsTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try { setData(await sessions.list()); } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleLogout = async (id: number) => {
    setLoading(true);
    try { await sessions.forceLogout(id); load(); } catch { /* ignore */ }
    setLoading(false);
  };

  const handleLogoutAll = async () => {
    setLoading(true);
    try { await sessions.logoutAll(); load(); } catch { /* ignore */ }
    setLoading(false);
  };

  const fmtDate = (iso: string) => {
    if (!iso || iso === '—') return '—';
    try { return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <div>
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Активные сессии
            </h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Управляйте входами в систему. Завершите подозрительные сессии.
            </p>
          </div>
          <button onClick={handleLogoutAll} disabled={loading} style={BTN_DANGER}>
            Завершить все
          </button>
        </div>

        {data?.sessions?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.sessions.map((s: Record<string, unknown>) => (
              <div key={s.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{s.device_info}</span>
                    {s.is_current && <span style={BADGE('#3b82f6')}>Текущая</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>IP: {s.ip_address}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Последняя активность: {fmtDate(s.last_activity)}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Создана: {fmtDate(s.created_at)}</span>
                  </div>
                </div>
                {!s.is_current && (
                  <button onClick={() => handleLogout(s.id)} disabled={loading} style={BTN_OUTLINE}>
                    Завершить
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>
            Нет активных сессий
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ SSO TAB ═══════════════════ */
function SsoTab() {
  const [providers, setProviders] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', protocol: 'oidc', client_id: '', client_secret: '', issuer_url: '', metadata_url: '' });

  const load = async () => {
    try { setProviders(await auth.ssoProviders()); } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      await auth.createSsoProvider(form);
      setShowForm(false);
      setForm({ name: '', protocol: 'oidc', client_id: '', client_secret: '', issuer_url: '', metadata_url: '' });
      load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    try { await auth.deleteSsoProvider(id); load(); } catch { /* ignore */ }
  };

  return (
    <div>
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>SSO-провайдеры</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>SAML 2.0 и OpenID Connect</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={BTN_PRIMARY}>
            {showForm ? 'Отмена' : 'Добавить провайдер'}
          </button>
        </div>

        {showForm && (
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div><label style={LABEL}>Название</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={INPUT} placeholder="Azure AD" /></div>
            <div>
              <label style={LABEL}>Протокол</label>
              <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })}
                style={{ ...INPUT, cursor: 'pointer' }}>
                <option value="oidc">OpenID Connect</option>
                <option value="saml">SAML 2.0</option>
              </select>
            </div>
            <div><label style={LABEL}>Client ID</label><input value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} style={INPUT} /></div>
            <div><label style={LABEL}>Client Secret</label><input value={form.client_secret} onChange={e => setForm({ ...form, client_secret: e.target.value })} style={INPUT} type="password" /></div>
            <div><label style={LABEL}>Issuer URL (OIDC)</label><input value={form.issuer_url} onChange={e => setForm({ ...form, issuer_url: e.target.value })} style={INPUT} /></div>
            <div><label style={LABEL}>Metadata URL (SAML)</label><input value={form.metadata_url} onChange={e => setForm({ ...form, metadata_url: e.target.value })} style={INPUT} /></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <button onClick={handleCreate} disabled={!form.name.trim()} style={BTN_PRIMARY}>Сохранить</button>
            </div>
          </div>
        )}

        {providers.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {providers.map((p: Record<string, unknown>) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                  <span style={BADGE(p.protocol === 'oidc' ? '#6366f1' : '#0891b2')}>
                    {p.protocol === 'oidc' ? 'OIDC' : 'SAML'}
                  </span>
                  <span style={BADGE(p.is_active ? '#22c55e' : '#64748b')}>
                    {p.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </div>
                <button onClick={() => handleDelete(p.id)} style={BTN_OUTLINE}>Удалить</button>
              </div>
            ))}
          </div>
        ) : !showForm ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>
            SSO-провайдеры не настроены
          </p>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════ ROLES TAB ═══════════════════ */
function RolesTab() {
  const [roles, setRoles] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', permissions: '{}' });

  const load = async () => {
    try { setRoles(await accessControl.listRoles()); } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleSeed = async () => {
    try { await accessControl.seedRoles(); load(); } catch { /* ignore */ }
  };

  const handleCreate = async () => {
    try {
      let perms = {};
      try { perms = JSON.parse(form.permissions); } catch { return; }
      await accessControl.createRole({ name: form.name, permissions: perms, description: form.description });
      setShowForm(false); setForm({ name: '', description: '', permissions: '{}' }); load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    try { await accessControl.deleteRole(id); load(); } catch { /* ignore */ }
  };

  const MODULES = ['decisions', 'portfolios', 'analytics', 'reports', 'settings', 'users'];
  const ACTIONS = ['read', 'write', 'delete', 'approve'];

  const renderPerms = (perms: unknown) => {
    if (!perms || typeof perms !== 'object') return '—';
    return Object.entries(perms).map(([mod, acts]: [string, any]) => (
      <div key={mod} style={{ display: 'inline-flex', gap: '4px', marginRight: '10px', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#475569' }}>{mod}:</span>
        {(Array.isArray(acts) ? acts : []).map((a: string) => (
          <span key={a} style={{ ...BADGE('#3b82f6'), fontSize: '10px', padding: '1px 6px' }}>{a}</span>
        ))}
      </div>
    ));
  };

  return (
    <div>
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Кастомные роли</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Управление ролями с гранулярными правами</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleSeed} style={BTN_OUTLINE}>Создать системные</button>
            <button onClick={() => setShowForm(!showForm)} style={BTN_PRIMARY}>
              {showForm ? 'Отмена' : 'Новая роль'}
            </button>
          </div>
        </div>

        {showForm && (
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={LABEL}>Название</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={INPUT} /></div>
              <div><label style={LABEL}>Описание</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={INPUT} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={LABEL}>Права (JSON)</label>
              <textarea value={form.permissions} onChange={e => setForm({ ...form, permissions: e.target.value })}
                style={{ ...INPUT, height: '80px', fontFamily: 'monospace', fontSize: '12px' }}
                placeholder='{"decisions": ["read", "write"], "reports": ["read"]}' />
            </div>
            <button onClick={handleCreate} disabled={!form.name.trim()} style={BTN_PRIMARY}>Создать</button>
          </div>
        )}

        {roles.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roles.map((r: Record<string, unknown>) => (
              <div key={r.id} style={{
                padding: '14px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{r.name}</span>
                    {r.is_system && <span style={BADGE('#f59e0b')}>Системная</span>}
                  </div>
                  {!r.is_system && <button onClick={() => handleDelete(r.id)} style={BTN_OUTLINE}>Удалить</button>}
                </div>
                {r.description && <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>{r.description}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>{renderPerms(r.permissions)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>
            Нет кастомных ролей. Нажмите «Создать системные» для инициализации.
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ POLICIES TAB ═══════════════════ */
function PoliciesTab() {
  const [policies, setPolicies] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', resource_type: 'decision', action: 'read',
    conditions: '{}', effect: 'allow', priority: '0', description: '',
  });
  const [checkResult, setCheckResult] = useState<any>(null);
  const [checkForm, setCheckForm] = useState({ resource_type: 'decision', action: 'read' });

  const load = async () => {
    try { setPolicies(await accessControl.listPolicies()); } catch { /* ignore */ }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    try {
      let conds = {};
      try { conds = JSON.parse(form.conditions); } catch { return; }
      await accessControl.createPolicy({
        name: form.name, resource_type: form.resource_type,
        action: form.action, conditions: conds,
        effect: form.effect, priority: parseInt(form.priority) || 0,
        description: form.description,
      });
      setShowForm(false); load();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: number) => {
    try { await accessControl.deletePolicy(id); load(); } catch { /* ignore */ }
  };

  const handleCheck = async () => {
    try {
      const result = await accessControl.checkAccess({
        resource_type: checkForm.resource_type, action: checkForm.action,
      });
      setCheckResult(result);
    } catch { /* ignore */ }
  };

  return (
    <div>
      {/* Check access */}
      <div style={CARD}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
          Проверить доступ
        </h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div>
            <label style={LABEL}>Ресурс</label>
            <select value={checkForm.resource_type} onChange={e => setCheckForm({ ...checkForm, resource_type: e.target.value })}
              style={{ ...INPUT, width: '200px', cursor: 'pointer' }}>
              {['decision', 'portfolio', 'report', 'analytics'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={LABEL}>Действие</label>
            <select value={checkForm.action} onChange={e => setCheckForm({ ...checkForm, action: e.target.value })}
              style={{ ...INPUT, width: '160px', cursor: 'pointer' }}>
              {['read', 'write', 'delete', 'approve'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={handleCheck} style={BTN_PRIMARY}>Проверить</button>
        </div>
        {checkResult && (
          <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            backgroundColor: checkResult.allowed ? '#f0fdf4' : '#fef2f2',
            color: checkResult.allowed ? '#166534' : '#dc2626', fontSize: '13px',
          }}>
            {checkResult.allowed ? 'Доступ разрешён' : 'Доступ запрещён'}
            {checkResult.matched_policy && ` (политика: ${checkResult.matched_policy})`}
            {checkResult.reason && ` — ${checkResult.reason}`}
          </div>
        )}
      </div>

      {/* Policies list */}
      <div style={CARD}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>ABAC-политики</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Контроль доступа на основе атрибутов
            </p>
          </div>
          <button onClick={() => setShowForm(!showForm)} style={BTN_PRIMARY}>
            {showForm ? 'Отмена' : 'Новая политика'}
          </button>
        </div>

        {showForm && (
          <div style={{ padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={LABEL}>Название</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={INPUT} /></div>
              <div>
                <label style={LABEL}>Ресурс</label>
                <select value={form.resource_type} onChange={e => setForm({ ...form, resource_type: e.target.value })}
                  style={{ ...INPUT, cursor: 'pointer' }}>
                  {['decision', 'portfolio', 'report', 'analytics'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={LABEL}>Действие</label>
                <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}
                  style={{ ...INPUT, cursor: 'pointer' }}>
                  {['read', 'write', 'delete', 'approve'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={LABEL}>Эффект</label>
                <select value={form.effect} onChange={e => setForm({ ...form, effect: e.target.value })}
                  style={{ ...INPUT, cursor: 'pointer' }}>
                  <option value="allow">Разрешить (allow)</option>
                  <option value="deny">Запретить (deny)</option>
                </select>
              </div>
              <div><label style={LABEL}>Приоритет</label><input value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={INPUT} type="number" /></div>
              <div><label style={LABEL}>Описание</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={INPUT} /></div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={LABEL}>Условия (JSON)</label>
              <textarea value={form.conditions} onChange={e => setForm({ ...form, conditions: e.target.value })}
                style={{ ...INPUT, height: '60px', fontFamily: 'monospace', fontSize: '12px' }}
                placeholder='{"role_in": ["Admin", "Analyst"]}' />
            </div>
            <button onClick={handleCreate} disabled={!form.name.trim()} style={BTN_PRIMARY}>Создать</button>
          </div>
        )}

        {policies.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {policies.map((p: Record<string, unknown>) => (
              <div key={p.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{p.name}</span>
                    <span style={BADGE(p.effect === 'allow' ? '#22c55e' : '#ef4444')}>
                      {p.effect === 'allow' ? 'Разрешить' : 'Запретить'}
                    </span>
                    <span style={BADGE('#6366f1')}>{p.resource_type}</span>
                    <span style={BADGE('#0891b2')}>{p.action}</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>P:{p.priority}</span>
                  </div>
                  {p.description && <p style={{ fontSize: '11px', color: '#64748b' }}>{p.description}</p>}
                  {p.conditions && Object.keys(p.conditions).length > 0 && (
                    <code style={{ fontSize: '10px', color: '#64748b' }}>{JSON.stringify(p.conditions)}</code>
                  )}
                </div>
                <button onClick={() => handleDelete(p.id)} style={BTN_OUTLINE}>Удалить</button>
              </div>
            ))}
          </div>
        ) : !showForm ? (
          <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', padding: '30px 0' }}>
            Нет ABAC-политик
          </p>
        ) : null}
      </div>
    </div>
  );
}
