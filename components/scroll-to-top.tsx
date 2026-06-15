"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Immediate scroll-to-top
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;

    // Async fallback to handle rendering delays or layout shifts
    const forceScroll = () => {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    const timer = setTimeout(forceScroll, 50);
    const rAF = requestAnimationFrame(forceScroll);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(rAF);
    };
  }, [pathname]);

  return null;
}
