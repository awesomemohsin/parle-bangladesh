'use client';

import dynamic from 'next/dynamic';

const CareerCTA = dynamic(() => import('@/components/career-cta'), { ssr: false });

export default function DeferredBottomComponents() {
  return <CareerCTA />;
}
