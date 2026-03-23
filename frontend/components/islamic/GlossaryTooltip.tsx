"use client";
import { useState, useRef, useEffect } from "react";
import { GlossaryTerm } from "./api";
import StandardRefBadge from "./StandardRefBadge";

interface Props {
  term: GlossaryTerm;
  children: React.ReactNode;
}

export default function GlossaryTooltip({ term, children }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <span ref={ref} className="relative inline-block">
      <span
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer border-b border-dashed border-emerald-500 text-emerald-700 hover:text-emerald-900 transition-colors"
      >
        {children}
      </span>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-2 w-72 rounded-2xl border border-gray-100 bg-white shadow-xl p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="font-semibold text-gray-900 text-sm">{term.term_ru}</p>
              {term.term_ar && (
                <p className="text-sm text-gray-400" dir="rtl">{term.term_ar}</p>
              )}
              {term.transliteration && (
                <p className="text-xs text-gray-400 italic">{term.transliteration}</p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0"
            >×</button>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{term.definition_ru}</p>
          {term.standard_ref && (
            <div className="mt-3">
              <StandardRefBadge code={term.standard_ref} org={term.standard_org} />
            </div>
          )}
        </div>
      )}
    </span>
  );
}