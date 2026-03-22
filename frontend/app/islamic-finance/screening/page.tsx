"use client";
import { useState } from "react";
import CompanySearchInput from "@/components/islamic/CompanySearchInput";
import ScreeningResultCard from "@/components/islamic/ScreeningResultCard";
import { islamicApi, CompanyItem, ScreeningResult } from "@/components/islamic/api";
import Link from "next/link";

export default function ScreeningPage() {
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [haramPct, setHaramPct] = useState("");
  const [debtRatio, setDebtRatio] = useState("");
  const [interestPct, setInterestPct] = useState("");
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleScreen = async () => {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await islamicApi.screenCompany({
        company_id: selectedCompany?.id,
        company_name: selectedCompany?.name_ru || "Неизвестная компания",
        haram_revenue_pct: haramPct ? Number(haramPct) : undefined,
        debt_ratio: debtRatio ? Number(debtRatio) : undefined,
        interest_income_pct: interestPct ? Number(interestPct) : undefined,
        mode: (typeof window !== "undefined" && localStorage.getItem("islamic_mode")) || "individual",
      });
      setResult(res);
    } catch {
      setError("Ошибка скрининга. Проверьте авторизацию.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/islamic-finance" className="text-emerald-300 text-sm hover:text-white mb-3 inline-block">
            Исламские финансы
          </Link>
          <h1 className="text-2xl font-bold">Шариатский скрининг</h1>
          <p className="text-emerald-200 text-sm mt-1">AAOIFI SS No. 62 · оценка 0–5</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-semibold text-gray-800">Параметры скрининга</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Компания (UzSE / ЦКТСБ)</label>
            <CompanySearchInput onSelect={setSelectedCompany} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Харам-выручка (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="0–5"
                value={haramPct} onChange={e => setHaramPct(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Долговая нагрузка (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="0–33"
                value={debtRatio} onChange={e => setDebtRatio(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Процентный доход (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="0–5"
                value={interestPct} onChange={e => setInterestPct(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button onClick={handleScreen} disabled={loading}
            className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            {loading ? "Анализирую..." : "Провести скрининг"}
          </button>
        </div>

        {result && <ScreeningResultCard result={result} />}
      </div>
    </div>
  );
}
