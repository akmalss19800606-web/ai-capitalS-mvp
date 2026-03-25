'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessCasesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/calculator?tab=cases'); }, [router]);
  return null;
}
