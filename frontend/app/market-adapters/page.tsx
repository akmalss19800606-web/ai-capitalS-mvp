'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** REF-006: Redirect /market-adapters to /integrations?tab=market */
export default function MarketAdaptersRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/integrations?tab=market'); }, [router]);
  return null;
}
