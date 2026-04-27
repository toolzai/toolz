import CreatorWorkspace from "@/components/CreatorWorkspace";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreatorToolkit() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center p-6 sm:p-12">
      {/* Header */}
      <header className="w-full max-w-6xl flex justify-between items-center mb-8 z-10">
        <Link 
          href="/" 
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Studio</span>
        </Link>
        <div className="glass-panel px-4 py-2 rounded-full text-sm text-orange-600 font-medium">
          Creator Toolkit
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 w-full max-w-6xl flex flex-col">
        <CreatorWorkspace />
      </div>
    </main>
  );
}
