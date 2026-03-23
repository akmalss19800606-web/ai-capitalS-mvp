"use client";
import { useState } from "react";
import NisabCard from "@/components/islamic/NisabCard";
import ZakatCalculatorForm from "@/components/islamic/ZakatCalculatorForm";
import ZakatResultCard from "@/components/islamic/ZakatResultCard";
import ZakatHistoryTable from "@/components/islamic/ZakatHistoryTable";
import IslamicFinanceLayout from "@/components/islamic/IslamicFinanceLayout";
import { ZakatResult } from "@/components/islamic/api";

export default function ZakatPage() {
  const [result, setResult] = useState<ZakatResult | null>(null);

  return (
    <IslamicFinanceLayout
      title="Закат"
      titleIcon="🕌"
      subtitle="Расчёт заката на основе стандартов AAOIFI и национального нисаба Узбекистана"
      tipText="Введите стоимость активов и обязательств. Калькулятор автоматически определит достигнут ли нисаб и рассчитает 2.5% закат."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <NisabCard />
        <ZakatCalculatorForm onResult={setResult} />
        {result && <ZakatResultCard result={result} />}
        <ZakatHistoryTable />
      </div>
    </IslamicFinanceLayout>
  );
}
