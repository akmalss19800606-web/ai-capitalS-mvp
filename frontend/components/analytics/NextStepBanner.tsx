'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface NextStepBannerProps {
  label: string;
  href: string;
  description?: string;
}

export function NextStepBanner({ label, href, description }: NextStepBannerProps) {
  return (
    <Link
      href={href}
      className="block bg-blue-50 border border-blue-200 rounded-lg p-4 hover:bg-blue-100 hover:border-blue-300 transition-all group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-blue-700">{label}</p>
          {description && (
            <p className="text-sm text-blue-600 mt-0.5">{description}</p>
          )}
        </div>
        <ArrowRight className="w-5 h-5 text-blue-500 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
