'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="h-64 flex flex-col items-center justify-center">
      {icon && (
        <div className="text-gray-400 text-5xl mb-4">{icon}</div>
      )}
      <h3 className="text-lg font-bold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 text-center max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-5 py-2 bg-[var(--color-primary-600)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
