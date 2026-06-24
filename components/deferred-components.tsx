"use client";

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

const PromoModal = dynamic(() => import('@/components/promo-modal'), { ssr: false });
const SRShopSelector = dynamic(() => import('@/components/sr-shop-selector'), { ssr: false });

export default function DeferredComponents() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <PromoModal />
      <SRShopSelector />
    </>
  );
}
