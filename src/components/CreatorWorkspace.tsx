"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Palette, Flame, X, RefreshCw, Menu, Upload } from "lucide-react";
import clsx from "clsx";

import MoodboardExtractor from "./tools/MoodboardExtractor";
import RoastEngine from "./tools/RoastEngine";

export type CreatorToolType = "moodboard" | "roast" | null;

export default function CreatorWorkspace() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<CreatorToolType>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    if (!activeTool) setActiveTool("moodboard");
  }, [activeTool]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".bmp"] },
    noClick: !!imagePreview,
    noKeyboard: true,
  });

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  return (
    <div {...getRootProps()} className="w-full flex flex-col md:flex-row gap-6 h-[700px]">
      <input {...getInputProps()} />

      {/* Main Area */}
      <div className="flex-1 min-w-0 glass-panel rounded-3xl p-6 relative flex flex-col">
        {imagePreview && (
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="absolute top-6 right-6 w-8 h-8 bg-white/50 hover:bg-white rounded-full flex items-center justify-center text-zinc-500 transition-colors z-10"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex-1 w-full relative flex items-center justify-center bg-zinc-50/50 rounded-2xl overflow-hidden">
          {!imagePreview && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-400">
                <Upload size={32} />
              </div>
              <div>
                <p className="text-lg font-semibold text-zinc-700">Drop an image here</p>
                <p className="text-sm text-zinc-400 mt-1">Upload a UI design, setup photo, or any image</p>
              </div>
            </div>
          )}

          {imageFile && imagePreview && (
            <>
              {activeTool === "moodboard" && <MoodboardExtractor file={imageFile} previewUrl={imagePreview} />}
              {activeTool === "roast" && <RoastEngine file={imageFile} previewUrl={imagePreview} />}
            </>
          )}

          {imageFile && imagePreview && !activeTool && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-lg font-semibold text-zinc-700">Image loaded!</p>
              <p className="text-sm text-zinc-400">Select a tool from the sidebar →</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div
        className={clsx(
          "glass-panel rounded-3xl flex flex-col gap-4 transition-all duration-300 ease-in-out relative",
          isSidebarExpanded ? "w-full md:w-80 p-6" : "w-full md:w-[88px] p-4 items-center"
        )}
      >
        <div className={clsx("flex items-center justify-between w-full mb-2", !isSidebarExpanded && "justify-center")}>
          {isSidebarExpanded && <h3 className="text-lg font-medium text-zinc-800">Creator Tools</h3>}
          <button
            onClick={(e) => { e.stopPropagation(); setIsSidebarExpanded(!isSidebarExpanded); }}
            className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-white/60 rounded-xl transition-colors"
            title="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <ToolButton
            icon={<Palette size={18} />}
            label="Moodboard Extractor"
            active={activeTool === "moodboard"}
            onClick={() => setActiveTool("moodboard")}
            isExpanded={isSidebarExpanded}
          />
          <ToolButton
            icon={<Flame size={18} />}
            label="AI Roast Engine"
            active={activeTool === "roast"}
            onClick={() => setActiveTool("roast")}
            isExpanded={isSidebarExpanded}
            badge="AI"
          />
        </div>

        <div className={clsx("mt-auto pt-4 border-t border-zinc-100 w-full", !isSidebarExpanded && "flex justify-center")}>
          <button
            onClick={(e) => { e.stopPropagation(); open(); }}
            className={clsx(
              "flex items-center gap-3 rounded-2xl transition-all duration-200 font-medium text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 group relative",
              isSidebarExpanded ? "w-full px-4 py-4 text-left" : "p-3 justify-center"
            )}
          >
            <RefreshCw size={18} className="group-hover:rotate-90 transition-transform duration-300" />
            {isSidebarExpanded && <span>Change Image</span>}
            {!isSidebarExpanded && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-xl">
                Change Image
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
  isExpanded,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isExpanded: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={clsx(
        "flex items-center gap-3 rounded-2xl transition-all duration-200 font-medium text-sm relative group",
        isExpanded ? "w-full px-4 py-4 text-left" : "p-3 justify-center",
        active
          ? "bg-orange-50 text-orange-700 shadow-sm border border-orange-200/60"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
      )}
    >
      {icon}
      {isExpanded && <span className="flex-1">{label}</span>}
      {isExpanded && badge && (
        <span className="text-[9px] font-bold uppercase bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md">{badge}</span>
      )}
      {!isExpanded && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-xl z-50">
          {label}
        </div>
      )}
    </button>
  );
}
