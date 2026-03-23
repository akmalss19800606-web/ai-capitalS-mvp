"use client";
import { useEffect, useState } from "react";
import { islamicApi } from "./api";
import { C } from "./IslamicFinanceLayout";

export default function IslamicModeSwitcher() {
  const [mode, setMode] = useState<"individual" | "professional">("individual");

  useEffect(() => {
    const saved = localStorage.getItem("islamic_mode") as "individual" | "professional";
    if (saved) setMode(saved);
  }, []);

  const toggle = async (newMode: "individual" | "professional") => {
    setMode(newMode);
    localStorage.setItem("islamic_mode", newMode);
    try {
      await islamicApi.updateProfile({ mode: newMode, default_currency: "UZS", language: "ru" });
    } catch {}
  };

  return (
    <div style={{
      display: "inline-flex", borderRadius: 8, border: `1px solid ${C.border}`,
      background: C.card, overflow: "hidden", fontSize: 13, fontWeight: 500,
    }}>
      {(["individual", "professional"] as const).map((m) => (
        <button
          key={m}
          onClick={() => toggle(m)}
          style={{
            padding: "8px 16px", border: "none", cursor: "pointer",
            transition: "all 0.2s",
            background: mode === m ? C.primary : "transparent",
            color: mode === m ? "#fff" : C.muted,
          }}
        >
          {m === "individual" ? "👤 Физлицо" : "🏢 Профессионал"}
        </button>
      ))}
    </div>
  );
}
