'use client';

import React from 'react';

interface LoadingCardProps {
  rows?: number;
  height?: string;
}

export function LoadingCard({ rows = 3, height }: LoadingCardProps) {
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6"
      style={height ? { height } : undefined}
    >
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className="bg-gray-200 rounded h-4"
              style={{ width: i === 0 ? '60%' : i === rows - 1 ? '40%' : '80%' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
