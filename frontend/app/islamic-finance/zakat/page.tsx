"use client";
import NisabCard from "@/components/islamic/NisabCard";
import ZakatCalculatorForm from "@/components/islamic/ZakatCalculatorForm";
import ZakatHistoryTable from "@/components/islamic/ZakatHistoryTable";
import IslamicFinanceLayout from "@/components/islamic/IslamicFinanceLayout";

export default function ZakatPage() {
  return (
    <IslamicFinanceLayout
      title={"\u0417\u0430\u043a\u044f\u0442"}
      titleIcon={"\uD83D\uDD4C"}
      subtitle={"\u0420\u0430\u0441\u0447\u0451\u0442 \u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0433\u043e \u043e\u0447\u0438\u0449\u0435\u043d\u0438\u044f \u0438\u043c\u0443\u0449\u0435\u0441\u0442\u0432\u0430 \u00b7 AAOIFI"}
      tipText={"\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u0443\u043c\u043c\u0443 \u0430\u043a\u0442\u0438\u0432\u043e\u0432 \u0434\u043b\u044f \u0440\u0430\u0441\u0447\u0451\u0442\u0430 \u0437\u0430\u043a\u044f\u0442\u0430. \u041f\u043e\u0440\u043e\u0433 \u043d\u0438\u0441\u0430\u0431\u0430 \u043e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u0442\u0441\u044f \u0430\u0432\u0442\u043e\u043c\u0430\u0442\u0438\u0447\u0435\u0441\u043a\u0438."}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <NisabCard />
        <ZakatCalculatorForm />
        <ZakatHistoryTable />
      </div>
    </IslamicFinanceLayout>
  );
}
