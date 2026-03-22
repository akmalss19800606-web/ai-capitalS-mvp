"use client";
import { useEffect, useState } from "react";
import { islamicApi } from "./api";

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
    <div className="inline-flex rounded-lg border border-emerald-200 bg-white overflow-hidden text-sm font-medium shadow-sm">
      {(["individual", "professional"] as const).map((m) => (
        <button
          key={m}
          onClick={() => toggle(m)}
          className={`px-4 py-2 transition-colors ${
            mode === m
              ? "bg-emerald-600 text-white"
              : "text-gray-600 hover:bg-emerald-50"
          }`}
        >
          {m === "individual" ? "👤 Физлицо" : "🏢 Профессионал"}
        </button>
      ))}
    </div>
  );
}
