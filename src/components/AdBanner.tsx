"use client";

import { useEffect, useRef } from "react";

export default function AdBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only inject if the script hasn't been injected yet
    if (bannerRef.current && !bannerRef.current.querySelector('script')) {
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src = "//pl29559555.effectivecpmnetwork.com/46ba7cf6807b09c096a19f0d4e11291f/invoke.js";
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      bannerRef.current.appendChild(script);
    }
  }, []);

  return (
    <div className="w-full flex justify-center items-center py-4 z-10 relative mt-auto">
      <div id="container-46ba7cf6807b09c096a19f0d4e11291f" ref={bannerRef}></div>
    </div>
  );
}
