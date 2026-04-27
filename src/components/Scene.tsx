"use client";

import { useEffect, useState } from "react";

export default function Scene() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#f8f9fa] pointer-events-none">
      {/* Soft CSS blurred orbs replacing the 3D canvas for zero-lag performance */}
      <div 
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 bg-orange-200" 
        style={{ animation: 'float 20s ease-in-out infinite' }}
      />
      <div 
        className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-multiply filter blur-[100px] opacity-40 bg-yellow-200" 
        style={{ animation: 'float 25s ease-in-out infinite reverse' }}
      />
      <div 
        className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] rounded-full mix-blend-multiply filter blur-[120px] opacity-30 bg-red-100" 
        style={{ animation: 'float 30s ease-in-out infinite 5s' }}
      />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}} />
    </div>
  );
}
