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
      {/* Vignette Banner */}
      <Script id="moneytag-vignette" strategy="afterInteractive">
        {`(function(s){s.dataset.zone='10695996',s.src='https://n6wxm.com/vignette.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
      </Script>

      {/* Push Notifications */}
      <Script 
        src="https://5gvci.com/act/files/tag.min.js?z=11061750" 
        strategy="afterInteractive"
        data-cfasync="false" 
        async 
      />

      {/* In-Page Push */}
      <Script id="moneytag-inpage-push" strategy="afterInteractive">
        {`(function(s){s.dataset.zone='11061963',s.src='https://nap5k.com/tag.min.js'})([document.documentElement, document.body].filter(Boolean).pop().appendChild(document.createElement('script')))`}
      </Script>
    </>
  );}
