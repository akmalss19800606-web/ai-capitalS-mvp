'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function XaiAnalysisRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/calculator?tab=xai'); }, [router]);
  return null;
}
