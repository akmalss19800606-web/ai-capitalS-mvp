'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * REF-005: Redirect /portfolio-analytics to /analytics?tab=portfolio
 */
export default function PortfolioAnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/analytics?tab=portfolio');
  }, [router]);
  return null;
}
