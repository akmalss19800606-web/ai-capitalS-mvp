"use client";
import { useState, useRef, useEffect } from "react";
import { GlossaryTerm } from "./api";
import StandardRefBadge from "./StandardRefBadge";
import { C } from "./IslamicFinanceLayout";

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
    <span ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setOpen((v) => !v)}
        style={{
          cursor: "pointer", borderBottom: "1px dashed",
          borderColor: C.primary, color: C.primary,
          transition: "color 0.15s",
        }}
      >
        {children}
      </span>
      {open && (
        <div style={{
          position: "absolute", zIndex: 50, left: 0, top: "100%",
          marginTop: 8, width: 288, borderRadius: 16,
          border: `1px solid ${C.border}`, background: C.card,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)", padding: 16,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{term.term_ru}</p>
              <p style={{ fontSize: 16, color: C.primary, fontFamily: "serif" }}>{term.term_arabic}</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: C.muted }}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 8 }}>{term.definition}</p>
          {term.aaoifi_ref && <StandardRefBadge standard={term.aaoifi_ref} />}
        </div>
      )}
    </span>
  );
}
