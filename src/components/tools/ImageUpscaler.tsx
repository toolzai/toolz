"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, ZoomIn, Info } from "lucide-react";
import { Slider } from "../ui/Slider";

const MAX_DIMENSION = 16384;
const MAX_PIXELS = 100_000_000;

function getMaxScale(srcW: number, srcH: number): number {
  const byDimension = Math.floor(Math.min(MAX_DIMENSION / srcW, MAX_DIMENSION / srcH));
  const byPixels = Math.floor(Math.sqrt(MAX_PIXELS / (srcW * srcH)));
  return Math.max(1, Math.min(byDimension, byPixels));
}

function upscaleImage(sourceImg: HTMLImageElement, scale: number): HTMLCanvasElement {
  const srcW = sourceImg.naturalWidth;
  const srcH = sourceImg.naturalHeight;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  let current = document.createElement("canvas");
  current.width = srcW;
  current.height = srcH;
  current.getContext("2d")!.drawImage(sourceImg, 0, 0);

  let curW = srcW;
  let curH = srcH;

  if (scale <= 1) {
    const out = document.createElement("canvas");
    out.width = dstW;
    out.height = dstH;
    const ctx = out.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, dstW, dstH);
    return out;
  }

  while (curW * 2 <= dstW && curH * 2 <= dstH) {
    const nextW = curW * 2;
    const nextH = curH * 2;
    const step = document.createElement("canvas");
    step.width = nextW;
    step.height = nextH;
    const ctx = step.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, nextW, nextH);
    current = step;
    curW = nextW;
    curH = nextH;
  }

  if (curW !== dstW || curH !== dstH) {
    const final = document.createElement("canvas");
    final.width = dstW;
    final.height = dstH;
    const ctx = final.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(current, 0, 0, dstW, dstH);
    return final;
  }

  return current;
}

function formatDims(w: number, h: number): string {
  return `${w.toLocaleString()} × ${h.toLocaleString()}`;
}

function formatMegapixels(w: number, h: number): string {
  const mp = (w * h) / 1_000_000;
  return mp >= 1 ? `${mp.toFixed(1)} MP` : `${((w * h) / 1000).toFixed(0)} KP`;
}



export default function ImageUpscaler({ file, previewUrl }: { file: File; previewUrl: string }) {
  const [scale, setScale] = useState(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultDims, setResultDims] = useState<{ w: number; h: number } | null>(null);
  const [originalDims, setOriginalDims] = useState<{ w: number; h: number } | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resultCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const maxScale = originalDims ? getMaxScale(originalDims.w, originalDims.h) : 10;
  const clampedScale = Math.min(scale, maxScale);
  const outputW = originalDims ? Math.round(originalDims.w * clampedScale) : 0;
  const outputH = originalDims ? Math.round(originalDims.h * clampedScale) : 0;

  const presets = [1, 2, 4, 8, 16].filter((p) => p <= maxScale);

  useEffect(() => {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      imgRef.current = img;
      setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
      renderPreview(img);
    };
    setResultUrl(null);
    setResultDims(null);
    resultCanvasRef.current = null;
  }, [previewUrl]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (resultCanvasRef.current) renderResult(resultCanvasRef.current);
      else if (imgRef.current) renderPreview(imgRef.current);
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const renderPreview = (img: HTMLImageElement) => {
    const container = containerRef.current;
    const canvas = displayCanvasRef.current;
    if (!container || !canvas) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, cw, ch);
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
  };

  const renderResult = (rc: HTMLCanvasElement) => {
    const container = containerRef.current;
    const canvas = displayCanvasRef.current;
    if (!container || !canvas) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, cw, ch);
    const s = Math.min(cw / rc.width, ch / rc.height);
    const w = rc.width * s;
    const h = rc.height * s;
    ctx.drawImage(rc, (cw - w) / 2, (ch - h) / 2, w, h);
  };

  const resetResult = () => {
    setResultUrl(null);
    setResultDims(null);
    resultCanvasRef.current = null;
    if (imgRef.current) renderPreview(imgRef.current);
  };

  const handleScaleChange = (v: number) => {
    setScale(Math.min(v, maxScale));
    resetResult();
  };

  const handleUpscale = useCallback(() => {
    if (!imgRef.current || clampedScale <= 1) return;
    setIsProcessing(true);
    requestAnimationFrame(() => {
      setTimeout(() => {
        try {
          const canvas = upscaleImage(imgRef.current!, clampedScale);
          resultCanvasRef.current = canvas;
          setResultDims({ w: canvas.width, h: canvas.height });
          setResultUrl("done");
          renderResult(canvas);
        } catch (e) {
          console.error("Upscale failed:", e);
        }
        setIsProcessing(false);
      }, 50);
    });
  }, [clampedScale]);

  const handleDownload = () => {
    const canvas = resultCanvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `upscaled_${clampedScale}x_${file.name.replace(/\.[^/.]+$/, "")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0 relative mb-6 rounded-2xl overflow-hidden border border-zinc-200/50 bg-zinc-50/50">
        <canvas ref={displayCanvasRef} className="absolute inset-0 w-full h-full" />
        {originalDims && (
          <div className="absolute top-4 left-4 flex gap-2 z-10 flex-wrap">
            <div className="bg-white/80 backdrop-blur-md border border-zinc-200 px-3 py-1.5 rounded-full text-xs font-bold text-zinc-700 shadow-sm">
              {resultDims ? formatDims(resultDims.w, resultDims.h) : formatDims(originalDims.w, originalDims.h)}
            </div>
            {resultDims && (
              <div className="bg-purple-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm">{clampedScale}× Upscaled</div>
            )}
            {!resultDims && clampedScale > 1 && (
              <div className="bg-zinc-800/70 text-white px-3 py-1.5 rounded-full text-xs font-medium shadow-sm">
                → {formatDims(outputW, outputH)} · {formatMegapixels(outputW, outputH)}
              </div>
            )}
          </div>
        )}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-zinc-800">Upscaling to {clampedScale}×...</p>
            <p className="text-xs text-zinc-500 mt-1">{formatDims(outputW, outputH)}</p>
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-3xl border border-zinc-200/60 shadow-sm" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Scale Factor</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-purple-600 tabular-nums leading-none">{clampedScale}</span>
                <span className="text-xs font-bold text-zinc-400">×</span>
              </div>
            </div>
            <Slider value={clampedScale} min={1} max={maxScale} step={1} onChange={(v) => handleScaleChange(v)} activeColor="#9333ea" trackColor="#f3e8ff" />
            <div className="flex justify-between px-0.5">
              <span className="text-[9px] font-medium text-zinc-400">1×</span>
              {maxScale > 4 && <span className="text-[9px] font-medium text-zinc-400">{Math.round(maxScale / 2)}×</span>}
              <span className="text-[9px] font-medium text-zinc-400">{maxScale}× max</span>
            </div>
          </div>

          <div className="flex gap-1.5">
            {presets.map((p) => (
              <button key={p} onClick={(e) => { e.stopPropagation(); handleScaleChange(p); }}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all border ${
                  clampedScale === p ? "bg-purple-50 border-purple-300 text-purple-700 shadow-sm" : "bg-white/60 border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:bg-white hover:text-zinc-700"
                }`}>{p}×</button>
            ))}
          </div>

          {originalDims && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50/50 border border-purple-100 text-purple-700">
              <Info size={14} className="shrink-0" />
              <p className="text-[11px] font-medium">Source: {formatDims(originalDims.w, originalDims.h)} · Max: <strong>{maxScale}×</strong></p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-100">
          <button onClick={(e) => { e.stopPropagation(); handleUpscale(); }} disabled={isProcessing || clampedScale <= 1}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
            {isProcessing ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div> : <ZoomIn size={20} />}
            {isProcessing ? "Upscaling..." : `Upscale ${clampedScale}×`}
          </button>
          {resultUrl && (
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
              <Download size={20} /> Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
