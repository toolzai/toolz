"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { ImagePlus, Scissors, Maximize, FileType, Info, X, RefreshCw, Menu } from "lucide-react";
import clsx from "clsx";

// Stub components (we will create these next)
import ImageResizer from "./tools/ImageResizer";
import ShapeCropper from "./tools/ShapeCropper";
import FormatConverter from "./tools/FormatConverter";
import MetadataViewer from "./tools/MetadataViewer";

export type ToolType = "resize" | "crop" | "convert" | "metadata" | null;

export default function ImageWorkspace() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
      setActiveTool("resize"); // Default tool
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp", ".heic"],
    },
    maxFiles: 1,
    noClick: !!imagePreview,
  });

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setActiveTool(null);
  };

  if (!imagePreview || !imageFile) {
    return (
      <div 
        {...getRootProps()} 
        className={clsx(
          "w-full h-[600px] glass-panel rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 border-2 border-dashed",
          isDragActive ? "border-blue-400 bg-blue-50/20" : "border-zinc-200 hover:border-zinc-300"
        )}
      >
        <input {...getInputProps()} />
        <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center mb-6 text-zinc-400">
          <ImagePlus size={32} />
        </div>
        <h3 className="text-2xl font-medium text-zinc-800 mb-2">Drop an image here</h3>
        <p className="text-zinc-500">or click to browse your files</p>
        <div className="mt-8 flex gap-4 text-xs text-zinc-400 font-medium uppercase tracking-wider">
          <span>JPG</span> • <span>PNG</span> • <span>WEBP</span>
        </div>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className="w-full flex flex-col md:flex-row gap-6 h-[700px] transition-all duration-300">
      <input {...getInputProps()} />
      {/* Left: Image Preview & Active Tool Area */}
      <div className="flex-1 min-w-0 glass-panel rounded-3xl p-6 relative flex flex-col transition-all duration-300">
        <button 
          onClick={clearImage}
          className="absolute top-6 right-6 w-8 h-8 bg-white/50 hover:bg-white rounded-full flex items-center justify-center text-zinc-500 transition-colors z-10"
        >
          <X size={16} />
        </button>
        
        <div className="flex-1 w-full relative flex items-center justify-center bg-zinc-50/50 rounded-2xl overflow-hidden">
          {activeTool === "resize" && <ImageResizer file={imageFile} previewUrl={imagePreview} />}
          {activeTool === "crop" && <ShapeCropper file={imageFile} previewUrl={imagePreview} />}
          {activeTool === "convert" && <FormatConverter file={imageFile} previewUrl={imagePreview} />}
          {activeTool === "metadata" && <MetadataViewer file={imageFile} previewUrl={imagePreview} />}
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
          {isSidebarExpanded && <h3 className="text-lg font-medium text-zinc-800">Tools</h3>}
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
            icon={<Maximize size={18} />} 
            label="Resize Image" 
            active={activeTool === "resize"} 
            onClick={() => setActiveTool("resize")} 
            isExpanded={isSidebarExpanded}
          />
          <ToolButton 
            icon={<Scissors size={18} />} 
            label="Shape Crop" 
            active={activeTool === "crop"} 
            onClick={() => setActiveTool("crop")} 
            isExpanded={isSidebarExpanded}
          />
          <ToolButton 
            icon={<FileType size={18} />} 
            label="Format Converter" 
            active={activeTool === "convert"} 
            onClick={() => setActiveTool("convert")} 
            isExpanded={isSidebarExpanded}
          />
          <ToolButton 
            icon={<Info size={18} />} 
            label="Metadata Viewer" 
            active={activeTool === "metadata"} 
            onClick={() => setActiveTool("metadata")} 
            isExpanded={isSidebarExpanded}
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
            <div className={clsx(
              "rounded-full flex items-center justify-center shrink-0",
              isSidebarExpanded ? "w-8 h-8 bg-zinc-100" : "w-10 h-10 bg-white shadow-sm border border-zinc-100"
            )}>
              <RefreshCw size={18} />
            </div>
            {isSidebarExpanded && <span>Change Image</span>}
            
            {/* Tooltip for collapsed state */}
            {!isSidebarExpanded && (
              <div className="absolute right-full mr-4 px-3 py-2 bg-zinc-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity flex items-center shadow-xl">
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-zinc-800"></div>
                Change Image
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, active, onClick, isExpanded }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, isExpanded: boolean }) {
  return (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={clsx(
        "flex items-center transition-all duration-200 font-medium text-sm group relative shrink-0",
        isExpanded ? "w-full gap-3 px-4 py-4 rounded-2xl text-left" : "p-3 rounded-2xl justify-center w-[54px] mx-auto",
        active 
          ? "bg-white shadow-sm text-blue-600 border border-blue-100" 
          : "text-zinc-600 hover:bg-white/60 border border-transparent"
      )}
    >
      <div className={clsx(
        "flex items-center justify-center shrink-0 transition-all",
        isExpanded ? "w-8 h-8 rounded-full" : "w-6 h-6",
        active 
          ? (isExpanded ? "bg-blue-50 text-blue-600" : "text-blue-600") 
          : "text-zinc-500 group-hover:text-zinc-800"
      )}>
        {icon}
      </div>
      
      {isExpanded && <span className="truncate">{label}</span>}

      {/* Tooltip for collapsed state */}
      {!isExpanded && (
        <div className="absolute right-full mr-4 px-3 py-2 bg-zinc-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity flex items-center shadow-xl">
          <div className="absolute -right-1 top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-zinc-800"></div>
          {label}
        </div>
      )}
    </button>
  );
}
