'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalyticsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/analytics/portfolios');
  }, [router]);
  return (
    <div className="p-6 text-gray-400 text-sm">⏳ Перенаправляем...</div>
  );
}
