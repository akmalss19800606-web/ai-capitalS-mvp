'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** REF-006: Redirect /api-gateway to /integrations?tab=api */
export default function ApiGatewayRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/integrations?tab=api'); }, [router]);
  return null;
}
