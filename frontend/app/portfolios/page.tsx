'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { portfolios as portfoliosApi } from '@/lib/api';
import { useLocale } from '@/lib/i18n';

interface Portfolio {
  id: number;
  name: string;
  description: string;
  total_value: number;
  created_at: string;
}

export default function PortfoliosPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [portfolioList, setPortfolioList] = useState<Portfolio[]>([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    portfoliosApi
      .list()
      .then((data) => setPortfolioList(data || []))
      .catch((err) => {
        console.error('Portfolio load error:', err);
        /* Do NOT redirect to login on API error — only redirect if no token */
        setPortfolioList([]);
      })
      .finally(() => setInitialLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const p = await portfoliosApi.create({
        name: newName.trim(),
        description: newDesc.trim(),
        total_value: newValue ? Number(newValue) : 0,
      });
      setPortfolioList((prev) => [...prev, p]);
      setNewName('');
      setNewDesc('');
      setNewValue('');
    } catch {
      alert(t.error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.delete + '?')) return;
    try {
      await portfoliosApi.delete(id);
      setPortfolioList((prev) => prev.filter((p) => p.id !== id));
    } catch {
      alert(t.error);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1e293b',
              letterSpacing: '-0.02em',
            }}
          >
            {t.nav.items.portfolios}
          </h1>
          <p style={{ color: '#64748b', marginTop: '4px', fontSize: '13px' }}>
            {t.dashboard.portfoliosSub} · AI Capital Management
          </p>
        </div>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#fff',
            color: '#64748b',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← {t.nav.items.dashboard}
        </button>
      </div>

      {/* Create form */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <p
          style={{
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '14px',
            color: '#1e293b',
          }}
        >
          + {t.nav.items.portfolios}
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="*"
            style={{
              flex: '1 1 180px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
            }}
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="..."
            style={{
              flex: '2 1 180px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
            }}
          />
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="UZS"
            type="number"
            min="0"
            style={{
              flex: '1 1 130px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '13px',
              backgroundColor: '#f8fafc',
              color: '#1e293b',
              outline: 'none',
            }}
          />
          <button
            onClick={handleCreate}
            disabled={loading || !newName.trim()}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: '600',
              opacity: loading || !newName.trim() ? 0.6 : 1,
              cursor: loading || !newName.trim() ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? t.loading : '+ ' + t.save}
          </button>
        </div>
      </div>

      {/* Portfolio grid */}
      {initialLoading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            color: '#94a3b8',
          }}
        >
          <p style={{ fontSize: '14px' }}>{t.loading}</p>
        </div>
      ) : portfolioList.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px dashed #cbd5e1',
            color: '#94a3b8',
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px', display: 'block' }}
          >
            <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z" />
          </svg>
          <p style={{ fontSize: '16px', fontWeight: '500' }}>{t.dashboard.noDecisions}</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
          }}
        >
          {portfolioList.map((p) => (
            <div
              key={p.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '11px',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '17px',
                      flexShrink: 0,
                    }}
                  >
                    {p.name ? p.name.charAt(0).toUpperCase() : 'P'}
                  </div>
                  <div>
                    <h3
                      style={{
                        fontWeight: '600',
                        color: '#1e293b',
                        fontSize: '14px',
                        lineHeight: '1.3',
                      }}
                    >
                      {p.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cbd5e1',
                    fontSize: '16px',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    lineHeight: '1',
                  }}
                  title={t.delete}
                >
                  ×
                </button>
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: '13px',
                  color: '#64748b',
                  lineHeight: '1.4',
                  minHeight: '18px',
                }}
              >
                {p.description || '—'}
              </p>

              {/* Footer */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                    {t.dashboard.portfolioValue}
                  </p>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#1e293b',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {(p.total_value || 0).toLocaleString()} UZS
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/portfolio/${p.id}`)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#3b82f6',
                    border: '1px solid #bfdbfe',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
