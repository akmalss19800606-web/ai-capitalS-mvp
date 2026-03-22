"use client";
import { useEffect, useState } from "react";
import { islamicApi, GlossaryTerm } from "@/components/islamic/api";
import StandardRefBadge from "@/components/islamic/StandardRefBadge";
import Link from "next/link";

export default function GlossaryTermPage({ params }: { params: { slug: string } }) {
  const [term, setTerm] = useState<GlossaryTerm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    islamicApi.getGlossaryTerm(params.slug)
      .then(setTerm)
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin text-4xl">⏳</div></div>;
  if (!term) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">Термин не найден</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <Link href="/islamic-finance/glossary" className="text-emerald-300 text-sm hover:text-white mb-3 inline-block">
            Глоссарий
          </Link>
          <h1 className="text-3xl font-bold">{term.term_ru}</h1>
          {term.term_ar && <p className="text-2xl text-emerald-200 mt-1" dir="rtl">{term.term_ar}</p>}
          {term.transliteration && <p className="text-emerald-300 italic mt-1">{term.transliteration}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Определение</h2>
          <p className="text-gray-700 leading-relaxed">{term.definition_ru}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {term.standard_ref && term.standard_org && (
            <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-2">Стандарт</p>
              <StandardRefBadge code={term.standard_ref} org={term.standard_org} />
            </div>
          )}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-2">Категория</p>
            <span className="rounded-full bg-emerald-50 text-emerald-700 text-sm px-3 py-1 border border-emerald-100">{term.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
