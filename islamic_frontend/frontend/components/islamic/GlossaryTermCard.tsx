import { GlossaryTerm } from "./api";
import StandardRefBadge from "./StandardRefBadge";
import Link from "next/link";

interface Props { term: GlossaryTerm; compact?: boolean; }

const CATEGORY_LABELS: Record<string, string> = {
  contract: "Контракт", prohibition: "Запрет",
  instrument: "Инструмент", regulatory: "Регуляторика", concept: "Концепция",
};

export default function GlossaryTermCard({ term, compact = false }: Props) {
  return (
    <Link href={`/islamic-finance/glossary/${term.slug}`}>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h3 className="font-semibold text-gray-900">{term.term_ru}</h3>
            {term.term_ar && (
              <p className="text-base text-gray-400" dir="rtl">{term.term_ar}</p>
            )}
            {term.transliteration && (
              <p className="text-xs text-gray-400 italic">{term.transliteration}</p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-700 text-xs px-2 py-0.5 border border-emerald-100">
            {CATEGORY_LABELS[term.category] || term.category}
          </span>
        </div>

        {!compact && (
          <p className="text-sm text-gray-600 line-clamp-2 mt-2">{term.definition_ru}</p>
        )}

        {term.standard_ref && (
          <div className="mt-3">
            <StandardRefBadge code={term.standard_ref} org={term.standard_org} />
          </div>
        )}
      </div>
    </Link>
  );
}
