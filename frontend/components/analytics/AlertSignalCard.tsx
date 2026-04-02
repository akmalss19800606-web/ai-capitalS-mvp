'use client';

import React from 'react';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertSignal {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric?: string;
  recommendation?: string;
}

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; icon: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-red-300', icon: '\u26A0\uFE0F' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-300', icon: '\u26A1' },
  info: { bg: 'bg-blue-50', border: 'border-blue-300', icon: '\u2139\uFE0F' },
};

export function AlertSignalCard({ alert }: { alert: AlertSignal }) {
  const style = SEVERITY_STYLES[alert.severity];

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{style.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900">{alert.title}</p>
          <p className="text-sm text-gray-600 mt-0.5">{alert.description}</p>
          {alert.metric && (
            <span className="inline-block mt-2 px-2 py-0.5 bg-white/60 rounded text-xs font-mono text-gray-700 border border-gray-200">
              {alert.metric}
            </span>
          )}
          {alert.recommendation && (
            <p className="text-xs italic text-gray-500 mt-2">{alert.recommendation}</p>
          )}
        </div>
      </div>
    </div>
  );
}
