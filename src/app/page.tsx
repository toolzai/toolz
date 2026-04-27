import Scene from "@/components/Scene";
import { Sparkles, Scissors, Image as ImageIcon, Wand2, Paintbrush, MonitorSmartphone, Code2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen w-full overflow-x-hidden flex flex-col items-center justify-center p-6 pb-32 sm:p-12 sm:pb-40">
      {/* 3D Background */}
      <Scene />
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-10">
        <div className="flex items-center">
          <img src="/logo.svg" alt="Toolz Logo" className="h-20 sm:h-32 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300" />
        </div>
        <div className="glass-panel px-4 py-2 rounded-full text-sm text-zinc-600 font-medium">
          Creative Suite
        </div>
      </header>

      {/* Main Grid */}
      <div className="z-10 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 mt-16">
        
        {/* Workspace A: Core Utility */}
        <Link href="/utility-desk" className="glass-panel rounded-3xl p-8 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
            <Scissors size={24} />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-zinc-800">The Utility Desk</h2>
          <p className="text-zinc-500">Smart Crop, Resizer, Format Converter, and Metadata Stripper. The essentials done perfectly.</p>
        </Link>

        {/* Workspace B: Magic Lab */}
        <Link href="/magic-lab" className="glass-panel rounded-3xl p-8 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
            <Wand2 size={24} />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-zinc-800">The Magic Lab</h2>
          <p className="text-zinc-500">AI Upscaler, Background Remover, and Object Eraser. Powered entirely by your browser.</p>
        </Link>

        {/* Workspace C: Aesthetic Playground */}
        <Link href="/glitch-aesthetic" className="glass-panel rounded-3xl p-8 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-pink-500 group-hover:scale-110 transition-transform">
            <Paintbrush size={24} />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-zinc-800">Glitch & Aesthetic</h2>
          <p className="text-zinc-500">CRT filters, VHS distortion, ASCII art, and CSS Box-Shadow generators.</p>
        </Link>

        {/* Workspace D: Creator Toolkit */}
        <Link href="/creator-toolkit" className="glass-panel rounded-3xl p-8 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 cursor-pointer group">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-medium tracking-tight text-zinc-800">Creator Toolkit</h2>
          <p className="text-zinc-500">Moodboard Extractor and the AI Roast Engine. Analyze UI designs or roast setups.</p>
        </Link>

      </div>
    </main>
  );
}
