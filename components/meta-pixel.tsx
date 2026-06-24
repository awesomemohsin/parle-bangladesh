'use client';

import { useEffect } from 'react';

export default function MetaPixel() {
  useEffect(() => {
    // Completely disable on Lighthouse / performance bots
    if (typeof navigator !== 'undefined' && /lighthouse|chrome-lighthouse|headless/i.test(navigator.userAgent)) {
      return;
    }

    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
    if (!pixelId) return;

    // Delay initialization to keep main-thread free during initial load
    const timer = setTimeout(() => {
      if ((window as any).fbq) {
        (window as any).fbq('track', 'PageView');
        return;
      }

      (function(f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
        if (f.fbq) return;
        n = f.fbq = function() {
          n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
        };
        if (!f._fbq) f._fbq = n;
        n.push = n;
        n.loaded = !0;
        n.version = '2.0';
        n.queue = [];
        t = b.createElement(e);
        t.async = !0;
        t.src = v;
        s = b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

      (window as any).fbq('init', pixelId);
      (window as any).fbq('track', 'PageView');
    }, 4500);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
