'use client';
import { useState, useEffect, Suspense, lazy } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const ApiGatewayTab = lazy(() => import('./components/ApiGatewayTab'));
const MarketAdaptersTab = lazy(() => import('./components/MarketAdaptersTab'));

type TabId = 'gateway' | 'adapters';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'gateway', label: 'API Gateway', icon: '🔑' },
  { id: 'adapters', label: 'Рыночные адаптеры', icon: '🌐' },
];

function IntegrationsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(tabParam === 'adapters' ? 'adapters' : 'gateway');

  useEffect(() => {
    if (tabParam && ['gateway', 'adapters'].includes(tabParam)) {
      setActiveTab(tabParam as TabId);
    }
  }, [tabParam]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/integrations?tab=${tab}`, { scroll: false });
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>Интеграции</h1>
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#1e293b' : '#64748b',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Загрузка...</div>}>
        {activeTab === 'gateway' && <ApiGatewayTab />}
        {activeTab === 'adapters' && <MarketAdaptersTab />}
      </Suspense>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Загрузка...</div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
