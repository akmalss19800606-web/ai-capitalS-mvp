"use client";

import { useEffect, useState } from "react";
import { islamicApi } from "@/lib/islamicApi";

interface RecommendationRule {
  id: number;
  rule_id: string;
  investor_profile: string;
  risk_tolerance: string;
  recommended_products: string[];
  allocation_pct: Record<string, number> | null;
  notes: string;
}

export default function RecommendationsPage() {
  const [rules, setRules] = useState<RecommendationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProfile, setFilterProfile] = useState("");
  const [filterRisk, setFilterRisk] = useState("");

  useEffect(() => {
    loadRules();
  }, [filterProfile, filterRisk]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterProfile) params.set("profile", filterProfile);
      if (filterRisk) params.set("risk", filterRisk);
      const res = await islamicApi.get(`/recommendations?${params}`);
      setRules(res.data);
    } catch (e) {
      console.error("Failed to load recommendations", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Product Recommendations
      </h1>

      <div className="flex gap-4 mb-6">
        <select
          className="border rounded px-3 py-2"
          value={filterProfile}
          onChange={(e) => setFilterProfile(e.target.value)}
        >
          <option value="">All Profiles</option>
          <option value="conservative">Conservative</option>
          <option value="moderate">Moderate</option>
          <option value="aggressive">Aggressive</option>
          <option value="institutional">Institutional</option>
        </select>

        <select
          className="border rounded px-3 py-2"
          value={filterRisk}
          onChange={(e) => setFilterRisk(e.target.value)}
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : rules.length === 0 ? (
        <p>No recommendations found.</p>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <div key={rule.id} className="border rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-lg capitalize">
                  {rule.investor_profile.replace(/_/g, " ")}
                </h3>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {rule.risk_tolerance}
                </span>
              </div>
              <div className="mb-2">
                <strong>Recommended:</strong>{" "}
                {rule.recommended_products.join(", ")}
              </div>
              {rule.notes && (
                <p className="text-sm text-gray-600">{rule.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
