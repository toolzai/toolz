"use client";

import { useState, useMemo, useEffect } from "react";
import { Download, Check, ArrowRight, TrendingDown, TrendingUp, Minus, Loader2 } from "lucide-react";
import Image from "next/image";

const CATEGORIES = [
  {
    title: "Image Formats",
    formats: [
      { id: "image/jpeg", ext: "jpg", label: "JPEG", name: ".jpg", desc: "Universal, small file size" },
      { id: "image/png", ext: "png", label: "PNG", name: ".png", desc: "Lossless with transparency" },
      { id: "image/webp", ext: "webp", label: "WebP", name: ".webp", desc: "Modern web format, tiny size" },
      { id: "image/avif", ext: "avif", label: "AVIF", name: ".avif", desc: "Next-gen compression" },
      { id: "image/bmp", ext: "bmp", label: "BMP", name: ".bmp", desc: "Uncompressed bitmap" },
      { id: "image/gif", ext: "gif", label: "GIF", name: ".gif", desc: "For static use (no animation)" },
    ]
  },
  {
    title: "Document & Vector",
    formats: [
      { id: "application/pdf", ext: "pdf", label: "PDF", name: ".pdf", desc: "Print-ready document" },
      { id: "image/svg+xml", ext: "svg", label: "SVG", name: ".svg", desc: "Scalable vector container" },
    ]
  },
  {
    title: "Special Formats",
    formats: [
      { id: "image/x-icon", ext: "ico", label: "ICO", name: ".ico", desc: "Favicon / app icon" },
      { id: "image/tiff", ext: "tiff", label: "TIFF", name: ".tiff", desc: "High-quality lossless" },
    ]
  }
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getSourceLabel(file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    jpg: "JPEG", jpeg: "JPEG", png: "PNG", webp: "WebP", avif: "AVIF",
    bmp: "BMP", gif: "GIF", pdf: "PDF", svg: "SVG", ico: "ICO",
    tiff: "TIFF", tif: "TIFF", heic: "HEIC",
  };
  return map[ext] || ext.toUpperCase();
}

export default function FormatConverter({ file, previewUrl }: { file: File, previewUrl: string }) {
  const [targetFormat, setTargetFormat] = useState(CATEGORIES[0].formats[0]);
  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  const sourceLabel = useMemo(() => getSourceLabel(file), [file]);
  const sourceSize = useMemo(() => formatFileSize(file.size), [file]);

  // Estimate output size whenever the target format changes
  useEffect(() => {
    let cancelled = false;
    setEstimating(true);
    setEstimatedSize(null);

    const img = document.createElement('img');
    img.src = previewUrl;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      let w = img.naturalWidth;
      let h = img.naturalHeight;
      if (targetFormat.ext === 'ico') { w = 256; h = 256; }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx || cancelled) return;
      ctx.drawImage(img, 0, 0, w, h);

      // PDF and SVG: build the actual output to measure
      if (targetFormat.ext === 'pdf') {
        try {
          const jsPDF = (await import('jspdf')).jsPDF;
          const orientation = w > h ? 'l' : 'p';
          const doc = new jsPDF(orientation, 'px', [w, h]);
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          doc.addImage(imgData, 'JPEG', 0, 0, w, h);
          const blob = doc.output('blob');
          if (!cancelled) { setEstimatedSize(blob.size); setEstimating(false); }
        } catch { if (!cancelled) { setEstimatedSize(null); setEstimating(false); } }
        return;
      }
      if (targetFormat.ext === 'svg') {
        const imgData = canvas.toDataURL('image/png');
        const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="${imgData}" width="${w}" height="${h}" /></svg>`;
        const blob = new Blob([svgStr], { type: 'image/svg+xml' });
        if (!cancelled) { setEstimatedSize(blob.size); setEstimating(false); }
        return;
      }

      // Standard image formats: use toBlob to get actual size
      canvas.toBlob(
        (blob) => {
          if (!cancelled && blob) { setEstimatedSize(blob.size); setEstimating(false); }
          else if (!cancelled) { setEstimatedSize(null); setEstimating(false); }
        },
        targetFormat.id,
        0.95
      );
    };
    img.onerror = () => { if (!cancelled) { setEstimatedSize(null); setEstimating(false); } };

    return () => { cancelled = true; };
  }, [targetFormat, previewUrl]);

  const handleDownload = async () => {
    const img = document.createElement('img');
    img.src = previewUrl;
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      
      // Special handling for ICO (standard size)
      if (targetFormat.ext === 'ico') {
        width = 256;
        height = 256;
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0, width, height);
      const newName = file.name.substring(0, file.name.lastIndexOf('.')) + '.' + targetFormat.ext;

      // PDF Handling
      if (targetFormat.ext === 'pdf') {
        const jsPDF = (await import('jspdf')).jsPDF;
        const orientation = width > height ? 'l' : 'p';
        const doc = new jsPDF(orientation, 'px', [width, height]);
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, width, height);
        doc.save(newName);
        return;
      }

      // SVG Handling
      if (targetFormat.ext === 'svg') {
        const imgData = canvas.toDataURL('image/png');
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><image href="${imgData}" width="${width}" height="${height}" /></svg>`;
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const link = document.createElement("a");
        link.download = newName;
        link.href = URL.createObjectURL(blob);
        link.click();
        return;
      }

      // Standard Image Formats
      const link = document.createElement("a");
      link.download = newName;
      link.href = canvas.toDataURL(targetFormat.id, 0.95);
      link.click();
    };
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden">
      <div className="flex-1 min-h-[150px] relative mb-6">
        <Image 
          src={previewUrl} 
          alt="Preview" 
          fill 
          className="object-contain"
        />
      </div>

      {/* Conversion Summary Bar */}
      <div className="mb-4 p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/60 flex items-center gap-4">
        {/* Source */}
        <div className="flex flex-col items-center text-center min-w-[80px]">
          <span className="text-xs font-bold text-zinc-800 tracking-wide">{sourceLabel}</span>
          <span className="text-[11px] text-zinc-400 mt-0.5">{sourceSize}</span>
        </div>

        {/* Arrow */}
        <ArrowRight size={18} className="text-zinc-300 shrink-0" />

        {/* Target */}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-xs font-bold text-blue-700 tracking-wide">{targetFormat.label}</span>
          <span className="text-[11px] text-zinc-500 mt-0.5 truncate">{targetFormat.desc}</span>
        </div>

        {/* Estimated Size */}
        <div className="flex flex-col items-end text-right min-w-[90px]">
          {estimating ? (
            <span className="flex items-center gap-1 text-[11px] text-zinc-400">
              <Loader2 size={12} className="animate-spin" /> Estimating…
            </span>
          ) : estimatedSize !== null ? (
            <>
              <span className="text-xs font-bold text-zinc-800">{formatFileSize(estimatedSize)}</span>
              {(() => {
                const diff = ((estimatedSize - file.size) / file.size) * 100;
                if (Math.abs(diff) < 2) return (
                  <span className="flex items-center gap-0.5 text-[11px] text-zinc-400 mt-0.5">
                    <Minus size={10} /> Same size
                  </span>
                );
                if (diff < 0) return (
                  <span className="flex items-center gap-0.5 text-[11px] text-emerald-600 mt-0.5">
                    <TrendingDown size={10} /> {Math.abs(diff).toFixed(0)}% smaller
                  </span>
                );
                return (
                  <span className="flex items-center gap-0.5 text-[11px] text-amber-600 mt-0.5">
                    <TrendingUp size={10} /> {diff.toFixed(0)}% larger
                  </span>
                );
              })()}
            </>
          ) : (
            <span className="text-[11px] text-zinc-400">N/A</span>
          )}
        </div>
      </div>
      
      <div className="glass-panel p-6 rounded-3xl flex flex-col gap-6 max-h-[400px] overflow-y-auto custom-scrollbar">
        {CATEGORIES.map((category) => (
          <div key={category.title} className="flex flex-col gap-3">
            <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">{category.title}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {category.formats.map((fmt) => {
                const isSelected = targetFormat.id === fmt.id;
                return (
                  <button
                    key={fmt.id}
                    onClick={() => setTargetFormat(fmt)}
                    className={`relative p-3 rounded-2xl flex flex-col items-start gap-1 text-left transition-all duration-200 border ${
                      isSelected 
                        ? "bg-blue-50/80 border-blue-200 shadow-sm" 
                        : "bg-white/40 border-zinc-200/50 hover:bg-white/80 hover:border-zinc-300"
                    }`}
                  >
                    <span className={`font-bold text-sm ${isSelected ? "text-blue-700" : "text-zinc-800"}`}>
                      {fmt.name}
                    </span>
                    <span className={`text-xs line-clamp-2 ${isSelected ? "text-blue-600/80" : "text-zinc-500"}`}>
                      {fmt.desc}
                    </span>
                    {isSelected && (
                      <div className="absolute top-3 right-3 text-blue-600">
                        <Check size={16} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button 
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-semibold transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Download size={20} />
          Convert to {targetFormat.label}
        </button>
      </div>
    </div>
  );
}
