// frontend/hooks/useOrganizationBalance.ts
// Хук для получения данных баланса организации во всех модулях

import { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface BalanceSummary {
  org_id: number;
  total_assets: number | null;
  total_liabilities: number | null;
  equity: number | null;
  current_ratio: number | null;
  debt_to_equity: number | null;
  roe: number | null;
  roa: number | null;
  sections: { assets: number; liabilities: number; equity: number };
}

export interface BalanceKPIs {
  current_ratio: number | null;
  quick_ratio: number | null;
  cash_ratio: number | null;
  debt_to_equity: number | null;
  debt_ratio: number | null;
  equity_ratio: number | null;
  roe: number | null;
  roa: number | null;
  asset_turnover: number | null;
  _total_assets: number | null;
  _total_liabilities: number | null;
  _equity: number | null;
  _current_assets: number | null;
  _current_liabilities: number | null;
  _cash: number | null;
}

export function useOrganizationBalance(orgId: number | null) {
  const [summary, setSummary] = useState<BalanceSummary | null>(null);
  const [kpis, setKpis] = useState<BalanceKPIs | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasBalance, setHasBalance] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const [sumRes, kpiRes] = await Promise.all([
        fetch(`${API_BASE}/import/balance/${orgId}/summary`),
        fetch(`${API_BASE}/import/balance/${orgId}/kpis`),
      ]);
      if (sumRes.ok && kpiRes.ok) {
        const sumData = await sumRes.json();
        const kpiData = await kpiRes.json();
        setSummary(sumData);
        setKpis(kpiData.kpis);
        setHasBalance(true);
      } else {
        setHasBalance(false);
      }
    } catch {
      setHasBalance(false);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { fetchBalance(); }, [fetchBalance]);

  return { summary, kpis, loading, hasBalance, refetch: fetchBalance };
}
