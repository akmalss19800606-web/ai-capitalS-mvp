'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AnalyticsContextValue {
  // Активная организация
  activeOrgId: string | null;
  activeOrgName: string | null;
  setActiveOrg: (id: string, name: string) => void;

  // Период анализа
  periodFrom: string;   // ISO date
  periodTo: string;     // ISO date
  setPeriod: (from: string, to: string) => void;

  // Активный стандарт
  activeStandard: 'nsbu' | 'ifrs' | 'both';
  setActiveStandard: (standard: 'nsbu' | 'ifrs' | 'both') => void;

  // Состояние загрузки данных
  nsbuReady: boolean;
  ifrsReady: boolean;
  setNsbuReady: (ready: boolean) => void;
  setIfrsReady: (ready: boolean) => void;

  // Сброс всего контекста
  resetContext: () => void;
}

function getDefaultPeriodFrom(): string {
  const now = new Date();
  return `${now.getFullYear()}-01-01`;
}

function getDefaultPeriodTo(): string {
  return new Date().toISOString().slice(0, 10);
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [activeOrgName, setActiveOrgName] = useState<string | null>(null);
  const [periodFrom, setPeriodFrom] = useState(getDefaultPeriodFrom);
  const [periodTo, setPeriodTo] = useState(getDefaultPeriodTo);
  const [activeStandard, setActiveStandard] = useState<'nsbu' | 'ifrs' | 'both'>('nsbu');
  const [nsbuReady, setNsbuReady] = useState(false);
  const [ifrsReady, setIfrsReady] = useState(false);

  const setActiveOrg = useCallback((id: string, name: string) => {
    setActiveOrgId(id);
    setActiveOrgName(name);
  }, []);

  const setPeriod = useCallback((from: string, to: string) => {
    setPeriodFrom(from);
    setPeriodTo(to);
  }, []);

  const resetContext = useCallback(() => {
    setActiveOrgId(null);
    setActiveOrgName(null);
    setPeriodFrom(getDefaultPeriodFrom());
    setPeriodTo(getDefaultPeriodTo());
    setActiveStandard('nsbu');
    setNsbuReady(false);
    setIfrsReady(false);
  }, []);

  return (
    <AnalyticsContext.Provider
      value={{
        activeOrgId,
        activeOrgName,
        setActiveOrg,
        periodFrom,
        periodTo,
        setPeriod,
        activeStandard,
        setActiveStandard,
        nsbuReady,
        ifrsReady,
        setNsbuReady,
        setIfrsReady,
        resetContext,
      }}
    >
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextValue {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error('useAnalytics must be used within <AnalyticsProvider>');
  }
  return ctx;
}

export { AnalyticsContext };
export default AnalyticsContext;
