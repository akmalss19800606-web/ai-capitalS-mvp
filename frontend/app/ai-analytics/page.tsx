'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * REF-005: Redirect /ai-analytics to /analytics?tab=ai
 */
export default function AiAnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/analytics?tab=ai');
  }, [router]);
  return null;
}
