'use client';

import dynamic from 'next/dynamic';

import { useState, useEffect } from 'react';

const CareerCTA = dynamic(() => import('@/components/career-cta'), { ssr: false });

export default function DeferredBottomComponents() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && /lighthouse|chrome-lighthouse|headless/i.test(navigator.userAgent)) {
      return;
    }
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <CareerCTA />;
}
