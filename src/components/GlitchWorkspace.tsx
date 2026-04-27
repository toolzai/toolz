"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Monitor, Tv, TerminalSquare, BoxSelect, X, RefreshCw, Menu, Upload } from "lucide-react";
import clsx from "clsx";

import CRTFilter from "./tools/CRTFilter";
import VHSDistortion from "./tools/VHSDistortion";
import ASCIIArt from "./tools/ASCIIArt";
import BoxShadowGen from "./tools/BoxShadowGen";

export type GlitchToolType = "crt" | "vhs" | "ascii" | "box-shadow" | null;

export default function GlitchWorkspace() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<GlitchToolType>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Box-shadow doesn't need an image
  const needsImage = activeTool !== "box-shadow";

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    if (!activeTool || activeTool === "box-shadow") setActiveTool("crt");
  }, [activeTool]);

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".bmp"] },
    noClick: !!(imagePreview) || activeTool === "box-shadow",
    noKeyboard: true,
  });

  const handleReset = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleToolChange = (tool: GlitchToolType) => {
    setActiveTool(tool);
  };

  const showDropzone = needsImage && !imagePreview;
  const showTool = activeTool === "box-shadow" || (imageFile && imagePreview && activeTool);

  return (
    <div {...getRootProps()} className="w-full flex flex-col md:flex-row gap-6 h-[700px]">
      <input {...getInputProps()} />

      {/* Main Area */}
      <div className="flex-1 min-w-0 glass-panel rounded-3xl p-6 relative flex flex-col">
        {/* Reset button */}
        {imagePreview && needsImage && (
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="absolute top-6 right-6 w-8 h-8 bg-white/50 hover:bg-white rounded-full flex items-center justify-center text-zinc-500 transition-colors z-10"
          >
            <X size={16} />
          </button>
        )}

        <div className="flex-1 w-full relative flex items-center justify-center bg-zinc-50/50 rounded-2xl overflow-hidden">
          {/* Dropzone prompt */}
          {showDropzone && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center text-pink-400">
                <Upload size={32} />
              </div>
              <div>
                <p className="text-lg font-semibold text-zinc-700">Drop an image here</p>
                <p className="text-sm text-zinc-400 mt-1">or click to browse • PNG, JPG, WebP</p>
              </div>
            </div>
          )}

          {/* Box Shadow doesn't need an image */}
          {activeTool === "box-shadow" && <BoxShadowGen />}

          {/* Image-based tools */}
          {imageFile && imagePreview && (
            <>
              {activeTool === "crt" && <CRTFilter file={imageFile} previewUrl={imagePreview} />}
              {activeTool === "vhs" && <VHSDistortion file={imageFile} previewUrl={imagePreview} />}
              {activeTool === "ascii" && <ASCIIArt file={imageFile} previewUrl={imagePreview} />}
            </>
          )}

          {/* Tool not selected but image loaded */}
          {imageFile && imagePreview && !activeTool && (
            <div className="flex flex-col items-center gap-3 text-center">
              <p className="text-lg font-semibold text-zinc-700">Image loaded!</p>
              <p className="text-sm text-zinc-400">Select a tool from the sidebar →</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Tools Sidebar */}
      <div
        className={clsx(
          "glass-panel rounded-3xl flex flex-col gap-4 transition-all duration-300 ease-in-out relative",
          isSidebarExpanded ? "w-full md:w-80 p-6" : "w-full md:w-[88px] p-4 items-center"
        )}
      >
        <div className={clsx("flex items-center justify-between w-full mb-2", !isSidebarExpanded && "justify-center")}>
          {isSidebarExpanded && <h3 className="text-lg font-medium text-zinc-800">Glitch Tools</h3>}
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
            icon={<Monitor size={18} />}
            label="CRT Filter"
            active={activeTool === "crt"}
            onClick={() => handleToolChange("crt")}
            isExpanded={isSidebarExpanded}
          />
          <ToolButton
            icon={<Tv size={18} />}
            label="VHS Distortion"
            active={activeTool === "vhs"}
            onClick={() => handleToolChange("vhs")}
            isExpanded={isSidebarExpanded}
          />
          <ToolButton
            icon={<TerminalSquare size={18} />}
            label="ASCII Art"
            active={activeTool === "ascii"}
            onClick={() => handleToolChange("ascii")}
            isExpanded={isSidebarExpanded}
          />

          <div className="h-px bg-zinc-100 my-1" />

          <ToolButton
            icon={<BoxSelect size={18} />}
            label="Box Shadow"
            active={activeTool === "box-shadow"}
            onClick={() => handleToolChange("box-shadow")}
            isExpanded={isSidebarExpanded}
            badge="CSS"
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
          ? "bg-pink-50 text-pink-700 shadow-sm border border-pink-200/60"
          : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-800"
      )}
    >
      {icon}
      {isExpanded && (
        <span className="flex-1">{label}</span>
      )}
      {isExpanded && badge && (
        <span className="text-[9px] font-bold uppercase bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-md">{badge}</span>
      )}
      {!isExpanded && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-800 text-white text-xs font-medium rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-all duration-200 translate-x-2 group-hover:translate-x-0 shadow-xl z-50">
          {label}
        </div>
      )}
    </button>
  );
}
