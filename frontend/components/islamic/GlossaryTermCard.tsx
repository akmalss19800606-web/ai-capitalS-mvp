import { GlossaryTerm } from "./api";
import StandardRefBadge from "./StandardRefBadge";
import Link from "next/link";
import { C } from "./IslamicFinanceLayout";

interface Props { term: GlossaryTerm; compact?: boolean; }

const CATEGORY_LABELS: Record<string, string> = {
  contract: "Контракт", prohibition: "Запрет",
  instrument: "Инструмент", regulatory: "Регуляторика", concept: "Концепция",
};

export default function GlossaryTermCard({ term, compact = false }: Props) {
  return (
    <Link href={`/islamic-finance/glossary/${term.slug}`}>
      <div style={{
        borderRadius: 12, border: `1px solid ${C.border}`, background: C.card,
        padding: 20, cursor: "pointer", transition: "all 0.2s",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div>
            <h3 style={{ fontWeight: 600, color: C.text }}>{term.term_ru}</h3>
            {term.term_ar && (
              <p style={{ fontSize: 15, color: C.muted }} dir="rtl">{term.term_ar}</p>
            )}
            {term.transliteration && (
              <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>{term.transliteration}</p>
            )}
          </div>
          <span style={{
            flexShrink: 0, borderRadius: 999, background: C.infoBg, color: C.primary,
            fontSize: 11, padding: "2px 8px", border: `1px solid ${C.border}`, fontWeight: 500,
          }}>
            {CATEGORY_LABELS[term.category] || term.category}
          </span>
        </div>

        {!compact && (
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", marginTop: 8 }}>
            {term.definition_ru}
          </p>
        )}

        {term.standard_ref && (
          <div style={{ marginTop: 12 }}>
            <StandardRefBadge code={term.standard_ref} org={term.standard_org} />
          </div>
        )}
      </div>
    </Link>
  );
}
