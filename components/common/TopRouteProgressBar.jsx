'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function TopRouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Skip on first initial render (since full app loader handles initial load)
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Trigger fast smooth top bar on page-to-page navigation
    setLoading(true);
    setProgress(30);

    const t1 = setTimeout(() => setProgress(70), 100);
    const t2 = setTimeout(() => setProgress(100), 250);
    const t3 = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [pathname, searchParams]);

  if (!loading && progress === 0) return null;

  return (
    <div className="top-route-progress-bar-container" aria-hidden="true">
      <div
        className="top-route-progress-bar-fill"
        style={{
          width: `${progress}%`,
          opacity: loading ? 1 : 0
        }}
      />
    </div>
  );
}
