"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

export default function GlobalAds() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) return null;

  return (
    <>
      <Script 
        src="https://pl29559557.effectivecpmnetwork.com/3b/14/55/3b145545d30c91f766d28733d8a73c74.js" 
        strategy="lazyOnload" 
      />
      <Script 
        src="https://quge5.com/88/tag.min.js" 
        data-zone="217476" 
        strategy="lazyOnload" 
        data-cfasync="false" 
      />
    </>
  );
}
