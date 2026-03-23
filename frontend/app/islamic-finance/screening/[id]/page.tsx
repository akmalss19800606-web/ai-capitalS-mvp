"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import IslamicFinanceLayout, { C } from "@/components/islamic/IslamicFinanceLayout";
import { islamicApi, ScreeningResult } from "@/components/islamic/api";
import ShariahGauge from "@/components/islamic/ShariahGauge";
import ShariahRadarChart from "@/components/islamic/ShariahRadarChart";
import ShariahStatusBadge from "@/components/islamic/ShariahStatusBadge";
import BenchmarkBar from "@/components/islamic/BenchmarkBar";

const CRITERIA_LABELS: Record<string, string> = {
  haram_pct: "Доля харам-дохода",
  debt_ratio: "Долговая нагрузка",
  interest_pct: "Процентный доход",
  cash_ratio: "Денежный резерв",
  receivables_ratio: "Дебиторская задолженность",
};

const AAOIFI_THRESHOLDS: Record<string, number> = {
  haram_pct: 5,
  debt_ratio: 33,
  interest_pct: 5,
  cash_ratio: 90,
  receivables_ratio: 49,
};

export default function ScreeningDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.id as string;

  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId) return;
    loadScreeningResult();
  }, [companyId]);

  const loadScreeningResult = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await islamicApi.getScreeningResult(companyId);
      setResult(data);
    } catch (e: any) {
      setError(e.message || "Ошибка загрузки данных скрининга");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "halal") return C.success;
    if (status === "haram") return C.error;
    return C.warning;
  };

  const getCriteriaStatus = (key: string, value: number): "pass" | "fail" | "warn" => {
    const threshold = AAOIFI_THRESHOLDS[key];
    if (!threshold) return "pass";
    if (key === "cash_ratio" || key === "receivables_ratio") {
      if (value <= threshold) return "pass";
      return "fail";
    }
    if (value <= threshold * 0.8) return "pass";
    if (value <= threshold) return "warn";
    return "fail";
  };

  return (
    <IslamicFinanceLayout title="Детальный скрининг компании" titleIcon="🔍">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: "8px 16px",
            background: "transparent",
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            cursor: "pointer",
            color: C.text,
            fontSize: 14,
          }}
        >
          ← Назад
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>
          Результаты скрининга
        </h2>
        {companyId && (
          <span style={{ fontSize: 13, color: C.muted, background: C.bg, padding: "4px 10px", borderRadius: 6 }}>
            ID: {companyId}
          </span>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: 48, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <p>Загрузка результатов скрининга...</p>
        </div>
      )}

      {error && (
        <div style={{
          padding: 16,
          background: C.errorBg,
          border: `1px solid ${C.error}`,
          borderRadius: 10,
          color: C.error,
          marginBottom: 20,
        }}>
          ❌ {error}
          <button
            onClick={loadScreeningResult}
            style={{
              marginLeft: 12,
              padding: "4px 12px",
              background: C.error,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            Повторить
          </button>
        </div>
      )}

      {result && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Header Card */}
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: 24,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 20,
            alignItems: "center",
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text }}>
                {result.company_name || companyId}
              </h3>
              {result.ticker && (
                <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 14 }}>
                  Тикер: <strong style={{ color: C.primary }}>{result.ticker}</strong>
                </p>
              )}
              {result.standard && (
                <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 13 }}>
                  Стандарт: {result.standard}
                </p>
              )}
              {result.checked_at && (
                <p style={{ margin: "4px 0 0", color: C.muted, fontSize: 12 }}>
                  Проверено: {new Date(result.checked_at).toLocaleDateString("ru-RU")}
                </p>
              )}
            </div>
            <div style={{ textAlign: "center" }}>
              <ShariahStatusBadge status={result.status} size="lg" />
              {result.score !== undefined && (
                <div style={{ marginTop: 12 }}>
                  <ShariahGauge score={result.score} size={120} />
                </div>
              )}
            </div>
          </div>

          {/* Criteria Grid */}
          {result.criteria && Object.keys(result.criteria).length > 0 && (
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 24,
            }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>
                📊 Критерии AAOIFI
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
                {Object.entries(result.criteria).map(([key, value]) => {
                  const status = getCriteriaStatus(key, value as number);
                  const threshold = AAOIFI_THRESHOLDS[key];
                  return (
                    <div key={key} style={{
                      background: C.bg,
                      border: `1px solid ${
                        status === "pass" ? C.success :
                        status === "warn" ? C.warning : C.error
                      }`,
                      borderRadius: 10,
                      padding: 14,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                          {CRITERIA_LABELS[key] || key}
                        </span>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: status === "pass" ? C.success : status === "warn" ? C.warning : C.error,
                          background: status === "pass" ? C.successBg : status === "warn" ? C.warningBg : C.errorBg,
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}>
                          {status === "pass" ? "✓ OK" : status === "warn" ? "⚠ Риск" : "✗ Нарушение"}
                        </span>
                      </div>
                      <BenchmarkBar
                        value={value as number}
                        threshold={threshold || 100}
                        label={`${(value as number).toFixed(1)}%`}
                      />
                      {threshold && (
                        <p style={{ margin: "6px 0 0", fontSize: 11, color: C.muted }}>
                          Порог AAOIFI: ≤{threshold}%
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Radar Chart */}
          {result.criteria && Object.keys(result.criteria).length > 0 && (
            <div style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 24,
            }}>
              <h4 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: C.text }}>
                🕸 Радарный анализ соответствия
              </h4>
              <ShariahRadarChart
                data={Object.entries(result.criteria).map(([key, value]) => ({
                  metric: CRITERIA_LABELS[key] || key,
                  value: value as number,
                  threshold: AAOIFI_THRESHOLDS[key] || 100,
                }))}
              />
            </div>
          )}

          {/* Comment */}
          {result.comment && (
            <div style={{
              background: C.infoBg,
              border: `1px solid ${C.primary}`,
              borderRadius: 12,
              padding: 18,
            }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: C.primary }}>💬 Комментарий аналитика</h4>
              <p style={{ margin: 0, color: C.text, fontSize: 14, lineHeight: 1.6 }}>{result.comment}</p>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() => window.print()}
              style={{
                padding: "10px 20px",
                background: C.primary,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🖨 Распечатать отчёт
            </button>
            <button
              onClick={() => router.push("/islamic-finance/screening")}
              style={{
                padding: "10px 20px",
                background: "transparent",
                color: C.primary,
                border: `1px solid ${C.primary}`,
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              🔍 Новый скрининг
            </button>
          </div>
        </div>
      )}
    </IslamicFinanceLayout>
  );
}
