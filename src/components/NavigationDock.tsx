"use client";

import { Scissors, Wand2, Home, Paintbrush, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavigationDock() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 glass-panel rounded-full px-5 py-3 sm:px-6 flex gap-5 sm:gap-6 items-center z-[100] shadow-2xl border border-white/60">
      
      {/* Dock Item 1: Utility Desk */}
      <Link href="/utility-desk" className={`group relative transition-colors hover:-translate-y-1 transform duration-200 ${isActive("/utility-desk") ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-800"}`}>
        <Scissors size={24} />
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-xl">
          The Utility Desk
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
        </div>
      </Link>

      {/* Dock Item 2: Magic Lab */}
      <Link href="/magic-lab" className={`group relative transition-colors hover:-translate-y-1 transform duration-200 ${isActive("/magic-lab") ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-800"}`}>
        <Wand2 size={24} />
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-xl">
          The Magic Lab
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
        </div>
      </Link>

      {/* Dock Item 3: Home (Center) */}
      <Link href="/" className={`group relative transition-colors hover:-translate-y-1 transform duration-200 ${isActive("/") ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-800"}`}>
        <Home size={24} />
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-xl">
          Home
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
        </div>
      </Link>

      {/* Dock Item 4: Aesthetic Playground */}
      <Link href="/glitch-aesthetic" className={`group relative transition-colors hover:-translate-y-1 transform duration-200 ${isActive("/glitch-aesthetic") ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-800"}`}>
        <Paintbrush size={24} />
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-xl">
          Glitch & Aesthetic
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
        </div>
      </Link>

      {/* Dock Item 5: Creator Toolkit */}
      <Link href="/creator-toolkit" className={`group relative transition-colors hover:-translate-y-1 transform duration-200 ${isActive("/creator-toolkit") ? "text-zinc-800" : "text-zinc-400 hover:text-zinc-800"}`}>
        <Sparkles size={24} />
        <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-y-2 group-hover:translate-y-0 shadow-xl">
          Creator Toolkit
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-zinc-800"></div>
        </div>
      </Link>

    </div>
  );
}
