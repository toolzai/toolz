"use client";

import { useState } from "react";
import { Info, X } from "lucide-react";

export default function AdInfo() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed top-6 right-6 z-[110]">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-all duration-300 hover:scale-110 shadow-lg border border-zinc-200"
        aria-label="Ad Information"
      >
        {isOpen ? <X size={20} /> : <Info size={20} />}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute top-full mt-3 right-0 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-zinc-200 animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-zinc-600 leading-relaxed">
            <span className="font-semibold text-zinc-800 block mb-1">About Ads</span>
            Any explicit images or banners on this site are advertisements. These ads help keep <span className="font-medium text-zinc-800">Toolz</span> free and active. We appreciate your support!
          </p>
          <p className="text-sm text-zinc-500 mt-2 italic">
            Ads can sometimes have explicit content and we are sorry for that.
          </p>
        </div>
      )}
    </div>
  );
}
