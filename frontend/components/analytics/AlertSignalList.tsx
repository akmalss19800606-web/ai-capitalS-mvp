'use client';

import React from 'react';
import { AlertSignalCard, type AlertSignal, type AlertSeverity } from './AlertSignalCard';

interface KpiData {
  current_ratio?: number | null;
  debt_to_equity?: number | null;
  profit_margin?: number | null;
  asset_turnover?: number | null;
  roe?: number | null;
}

function generateAlerts(kpiData: KpiData): AlertSignal[] {
  const alerts: AlertSignal[] = [];
  let id = 0;

  const add = (severity: AlertSeverity, title: string, description: string, metric?: string, recommendation?: string) => {
    alerts.push({ id: String(++id), severity, title, description, metric, recommendation });
  };

  const cr = kpiData.current_ratio;
  if (cr != null) {
    if (cr < 1.0) {
      add('critical', 'Критическая ликвидность',
        'Коэффициент текущей ликвидности ниже 1.0 — краткосрочные обязательства превышают оборотные активы.',
        `current_ratio = ${cr.toFixed(2)}`,
        'Рассмотрите реструктуризацию краткосрочного долга или увеличение оборотного капитала.');
    } else if (cr < 1.5) {
      add('warning', 'Низкая ликвидность',
        'Коэффициент текущей ликвидности ниже нормы 1.5.',
        `current_ratio = ${cr.toFixed(2)}`,
        'Рекомендуется увеличить оборотные активы или снизить краткосрочные обязательства.');
    }
  }

  const de = kpiData.debt_to_equity;
  if (de != null) {
    if (de > 5.0) {
      add('critical', 'Критическая долговая нагрузка',
        'Отношение долга к капиталу превышает 5.0 — компания сильно зависит от заёмных средств.',
        `debt_to_equity = ${de.toFixed(2)}`,
        'Необходимо срочно снизить долговую нагрузку или провести рекапитализацию.');
    } else if (de > 3.0) {
      add('warning', 'Высокая долговая нагрузка',
        'Отношение долга к капиталу превышает 3.0.',
        `debt_to_equity = ${de.toFixed(2)}`,
        'Рассмотрите рефинансирование или погашение части долговых обязательств.');
    }
  }

  const pm = kpiData.profit_margin;
  if (pm != null) {
    if (pm < 0) {
      add('critical', 'Убыточная деятельность',
        'Рентабельность продаж отрицательная — компания работает в убыток.',
        `profit_margin = ${(pm * 100).toFixed(1)}%`,
        'Требуется анализ расходов и пересмотр ценовой политики.');
    } else if (pm < 0.05) {
      add('warning', 'Низкая рентабельность',
        'Рентабельность продаж ниже 5%.',
        `profit_margin = ${(pm * 100).toFixed(1)}%`,
        'Рекомендуется оптимизация расходов для повышения маржинальности.');
    }
  }

  const at = kpiData.asset_turnover;
  if (at != null && at < 0.5) {
    add('info', 'Низкая оборачиваемость активов',
      'Оборачиваемость активов ниже 0.5 — активы используются неэффективно.',
      `asset_turnover = ${at.toFixed(2)}`,
      'Рассмотрите оптимизацию использования активов или реализацию непрофильных.');
  }

  const roe = kpiData.roe;
  if (roe != null && roe < 0.05) {
    add('warning', 'Низкая рентабельность капитала',
      'Рентабельность собственного капитала ниже 5%.',
      `ROE = ${(roe * 100).toFixed(1)}%`,
      'Необходимо повысить эффективность использования собственного капитала.');
  }

  // Sort: critical first, then warning, then info
  const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  return alerts;
}

interface AlertSignalListProps {
  kpiData: KpiData;
}

export function AlertSignalList({ kpiData }: AlertSignalListProps) {
  const alerts = generateAlerts(kpiData);

  if (!alerts.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">🚨 Финансовые сигналы</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map(alert => (
          <AlertSignalCard key={alert.id} alert={alert} />
        ))}
      </div>
    </div>
  );
}
