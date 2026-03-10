'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * REF-006: Unified integrations page.
 * Merges /api-gateway and /market-adapters into tabs.
 */

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('api');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'api' || tab === 'market') setActiveTab(tab);
  }, [searchParams]);

  return (
    <div className="p-6">
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>
        Интеграции
      </h1>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        {[
          { key: 'api', label: 'API Gateway' },
          { key: 'market', label: 'Адаптеры данных' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#2563eb' : '#64748b',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>
        {activeTab === 'api' && (
          <p style={{ color: '#64748b' }}>
            Управление API-ключами, вебхуками и мониторинг использования API.
          </p>
        )}
        {activeTab === 'market' && (
          <p style={{ color: '#64748b' }}>
            Настройка источников рыночных данных, CRM и ETL-процессов.
          </p>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="p-6">Загрузка...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
