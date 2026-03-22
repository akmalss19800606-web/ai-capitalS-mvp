"use client";
import NisabCard from "@/components/islamic/NisabCard";
import ZakatCalculatorForm from "@/components/islamic/ZakatCalculatorForm";
import ZakatHistoryTable from "@/components/islamic/ZakatHistoryTable";
import Link from "next/link";

export default function ZakatPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-900 text-white px-6 py-8">
        <div className="max-w-3xl mx-auto">
          <Link href="/islamic-finance" className="text-emerald-300 text-sm hover:text-white mb-3 inline-block">← Исламские финансы</Link>
          <h1 className="text-2xl font-bold">🕌 Закят</h1>
          <p className="text-emerald-200 text-sm mt-1">Расчёт обязательного очищения имущества · AAOIFI</p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <NisabCard />
        <ZakatCalculatorForm />
        <ZakatHistoryTable />
      </div>
    </div>
  );
}