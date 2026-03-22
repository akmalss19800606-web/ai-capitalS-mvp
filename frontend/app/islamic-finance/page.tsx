"use client";
import Link from "next/link";
import IslamicModeSwitcher from "@/components/islamic/IslamicModeSwitcher";

const SECTIONS = [
  { href: "/islamic-finance/zakat",      icon: "🕌", title: "Закят",       desc: "Расчёт обязательного очищения имущества" },
  { href: "/islamic-finance/screening",  icon: "🔍", title: "Скрининг",    desc: "Проверка компаний по AAOIFI SS No. 62" },
  { href: "/islamic-finance/glossary",   icon: "📖", title: "Глоссарий",   desc: "30+ терминов исламских финансов" },
  { href: "/islamic-finance/references", icon: "📋", title: "Стандарты",   desc: "AAOIFI и IFSB — 15 стандартов" },
];

export default function IslamicFinancePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <p className="text-emerald-300 text-sm font-medium mb-2 uppercase tracking-widest">AI Capital · MVP</p>
          <h1 className="text-3xl font-bold mb-3">Исламские финансы</h1>
          <p className="text-emerald-100 text-sm max-w-xl mb-6">Инструменты для расчётов и анализа в соответствии с нормами шариата. Стандарты AAOIFI и IFSB. Узбекистан (UZS).</p>
          <IslamicModeSwitcher />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map(s => (
            <Link key={s.href} href={s.href}>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h2 className="text-base font-semibold text-gray-900 mb-1">{s.title}</h2>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}