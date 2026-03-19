// frontend/components/ImportBalanceModal.tsx
// Узел 1 конвейера: Загрузка и подтверждение импорта бухгалтерского баланса

"use client";
import React, { useState, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface BalanceEntry {
  account_code: string;
  account_name: string;
  section: string;
  account_type: string;
  amount_start: number | null;
  amount_end: number | null;
  currency: string;
  unit: string;
}

interface ParseResult {
  organization: Record<string, string>;
  entries_count: number;
  entries_all: BalanceEntry[];
  warnings: string[];
  summary: {
    total_assets_end: number;
    total_liabilities_end: number;
    equity_end: number;
    entries_count: number;
    warnings_count: number;
  };
}

interface Props {
  orgId: number;
  orgName?: string;
  onSuccess: (kpis: Record<string, number | null>) => void;
  onClose: () => void;
}

export default function ImportBalanceModal({ orgId, orgName, onSuccess, onClose }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "saving" | "done">("upload");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [editedEntries, setEditedEntries] = useState<BalanceEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/import/balance/parse`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ParseResult = await res.json();
      setParseResult(data);
      setEditedEntries(data.entries_all);
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Ошибка при парсинге файла");
    } finally {
      setLoading(false);
    }
  };

  const handleAmountEdit = (idx: number, field: "amount_start" | "amount_end", value: string) => {
    const updated = [...editedEntries];
    updated[idx] = { ...updated[idx], [field]: value === "" ? null : parseFloat(value) };
    setEditedEntries(updated);
  };

  const handleConfirm = async () => {
    setStep("saving");
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/import/balance/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_id: orgId,
          entries: editedEntries,
          period_label: parseResult?.organization?.period_label || "",
          filename,
          unit: parseResult?.organization?.unit || "тыс. сум",
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStep("done");
      onSuccess(data.kpis);
    } catch (err: any) {
      setError(err.message || "Ошибка при сохранении");
      setStep("preview");
    }
  };

  const formatAmount = (v: number | null) =>
    v != null ? v.toLocaleString("ru-RU") : "—";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Импорт баланса (НСБУ Форма №1)</h2>
            {orgName && <p className="text-sm text-gray-500">{orgName}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">

          {/* STEP: Upload */}
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <div className="text-center">
                <p className="text-gray-600 mb-2">Загрузите Excel-файл бухгалтерского баланса</p>
                <p className="text-xs text-gray-400">Поддерживаются: .xlsx, .xls, .csv (НСБУ Форма №1)</p>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {loading ? "Анализирую файл..." : "📄 Выбрать файл"}
              </button>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* STEP: Preview */}
          {step === "preview" && parseResult && (
            <div className="space-y-4">
              {/* Org Info */}
              <div className="bg-blue-50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><span className="text-gray-500">Организация:</span><br /><b>{parseResult.organization.name || "—"}</b></div>
                <div><span className="text-gray-500">Отрасль:</span><br /><b>{parseResult.organization.industry || "—"}</b></div>
                <div><span className="text-gray-500">Период:</span><br /><b>{parseResult.organization.period_label || "—"}</b></div>
                <div><span className="text-gray-500">Ед. изм.:</span><br /><b>{parseResult.organization.unit || "тыс. сум"}</b></div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Итого активы</p>
                  <p className="text-lg font-bold text-green-700">{formatAmount(parseResult.summary.total_assets_end)}</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Обязательства</p>
                  <p className="text-lg font-bold text-orange-700">{formatAmount(parseResult.summary.total_liabilities_end)}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Капитал</p>
                  <p className="text-lg font-bold text-purple-700">{formatAmount(parseResult.summary.equity_end)}</p>
                </div>
              </div>

              {/* Warnings */}
              {parseResult.warnings.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-xs font-medium text-yellow-700 mb-1">⚠️ {parseResult.warnings.length} предупреждений:</p>
                  <ul className="text-xs text-yellow-600 space-y-0.5">
                    {parseResult.warnings.slice(0, 5).map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              )}

              {/* Entries Table */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Найдено строк: <b>{editedEntries.length}</b> — проверьте и при необходимости скорректируйте значения
                </p>
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500">Код</th>
                        <th className="px-3 py-2 text-left text-gray-500">Наименование</th>
                        <th className="px-3 py-2 text-left text-gray-500">Раздел</th>
                        <th className="px-3 py-2 text-right text-gray-500">Нач. периода</th>
                        <th className="px-3 py-2 text-right text-gray-500">Кон. периода</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editedEntries.map((e, idx) => (
                        <tr key={idx} className={`border-t ${e.amount_end == null ? "bg-red-50" : ""}`}>
                          <td className="px-3 py-1.5 font-mono font-bold text-blue-700">{e.account_code}</td>
                          <td className="px-3 py-1.5 text-gray-700 max-w-[200px] truncate">{e.account_name || "—"}</td>
                          <td className="px-3 py-1.5 text-gray-400 text-[11px]">{e.section?.split(".")[0] || "—"}</td>
                          <td className="px-3 py-1.5 text-right">
                            <input
                              type="number"
                              value={e.amount_start ?? ""}
                              onChange={(ev) => handleAmountEdit(idx, "amount_start", ev.target.value)}
                              className="w-24 text-right border rounded px-1 py-0.5 text-xs focus:outline-blue-400"
                              placeholder="—"
                            />
                          </td>
                          <td className="px-3 py-1.5 text-right">
                            <input
                              type="number"
                              value={e.amount_end ?? ""}
                              onChange={(ev) => handleAmountEdit(idx, "amount_end", ev.target.value)}
                              className={`w-24 text-right border rounded px-1 py-0.5 text-xs focus:outline-blue-400 ${e.amount_end == null ? "border-red-400 bg-red-50" : ""}`}
                              placeholder="ввести"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>
          )}

          {/* STEP: Saving */}
          {step === "saving" && (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-600">Сохраняю данные баланса...</p>
            </div>
          )}

          {/* STEP: Done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center h-48 gap-4">
              <div className="text-5xl">✅</div>
              <p className="text-lg font-semibold text-gray-800">Баланс успешно импортирован!</p>
              <p className="text-sm text-gray-500">KPI организации рассчитаны автоматически</p>
              <button onClick={onClose} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-blue-700">
                Перейти к организации →
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === "preview" && (
          <div className="border-t px-6 py-4 flex justify-between items-center">
            <button onClick={() => { setStep("upload"); setParseResult(null); }}
              className="text-gray-500 hover:text-gray-700 text-sm">
              ← Загрузить другой файл
            </button>
            <button
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2.5 rounded-xl font-medium"
            >
              ✅ Подтвердить и сохранить ({editedEntries.length} строк)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
