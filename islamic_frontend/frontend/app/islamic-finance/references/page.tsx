"use client";
import { useEffect, useState } from "react";
import { islamicApi, ReferenceItem } from "@/components/islamic/api";
import StandardRefBadge from "@/components/islamic/StandardRefBadge";
import Link from "next/link";

const ORG_FILTERS = [
  { key: "", label: "Все" },
  { key: "aaoifi_standard", label: "AAOIFI" },
  { key: "ifsb_standard", label: "IFSB" },
  { key: "local_regulation", label: "Местные" },
];

export default function ReferencesPage() {
  const [items, setItems] = useState<ReferenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState("");

  useEffect(() => {
    setLoading(true);
    islamicApi.getStandards(org || undefined)
      .then(setItems)
      .finally(() => setLoading(false));
  }, [org]);

  const orgLabel = (type: string) =>
    type === "aaoifi_standard" ? "AAOIFI" : type === "ifsb_standard" ? "IFSB" : "Местный";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/islamic-finance" className="text-emerald-300 text-sm hover:text-white mb-3 inline-block">
            Исламские финансы
          </Link>
          <h1 className="text-2xl font-bold">Стандарты AAOIFI и IFSB</h1>
          <p className="text-emerald-200 text-sm mt-1">Нормативная база исламских финансов</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {ORG_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setOrg(f.key)}
              className={"px-4 py-2 rounded-xl text-sm font-medium border transition-colors " + (
                org === f.key
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:border-emerald-200 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StandardRefBadge code={item.code} org={orgLabel(item.registry_type)} />
                      {item.topic && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">{item.topic}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">{item.name_ru}</h3>
                    {item.description_ru && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description_ru}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-12">Стандарты не найдены</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
