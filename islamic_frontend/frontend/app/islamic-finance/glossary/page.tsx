"use client";
import { useEffect, useState } from "react";
import { islamicApi, GlossaryTerm } from "@/components/islamic/api";
import GlossaryTermCard from "@/components/islamic/GlossaryTermCard";
import Link from "next/link";

const CATEGORIES = [
  { key: "", label: "Все" },
  { key: "contract", label: "Контракты" },
  { key: "prohibition", label: "Запреты" },
  { key: "instrument", label: "Инструменты" },
  { key: "regulatory", label: "Регуляторика" },
  { key: "concept", label: "Концепции" },
];

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    islamicApi.getGlossary(category || undefined, search || undefined)
      .then(setTerms)
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Link href="/islamic-finance" className="text-emerald-300 text-sm hover:text-white mb-3 inline-block">
            Исламские финансы
          </Link>
          <h1 className="text-2xl font-bold">Глоссарий</h1>
          <p className="text-emerald-200 text-sm mt-1">Термины исламских финансов на русском и арабском</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="Поиск термина..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={"px-3 py-2 rounded-xl text-xs font-medium border transition-colors " + (
                  category === c.key
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {terms.map(t => <GlossaryTermCard key={t.id} term={t} />)}
            {terms.length === 0 && (
              <p className="col-span-2 text-center text-sm text-gray-400 py-12">Термины не найдены</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
