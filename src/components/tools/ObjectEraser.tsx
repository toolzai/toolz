"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Eraser, Undo2, RotateCcw, Minus, Plus } from "lucide-react";
import { Slider } from "../ui/Slider";

// ─── Telea-style Fast Marching Inpainting Engine ───────────────────────────
// Fills from boundary inward, using gradient-weighted interpolation.
// This is the same class of algorithm used by OpenCV's cv2.inpaint().

function teleaInpaint(
  srcCanvas: HTMLCanvasElement,
  maskBool: Uint8Array,
  w: number,
  h: number,
  radius: number = 5
): HTMLCanvasElement {
  const result = document.createElement("canvas");
  result.width = w;
  result.height = h;
  const rCtx = result.getContext("2d")!;
  rCtx.drawImage(srcCanvas, 0, 0);

  const imgData = rCtx.getImageData(0, 0, w, h);
  const px = imgData.data;

  // 1. Compute distance transform via BFS from boundary
  const UNKNOWN = 0, BAND = 1, KNOWN = 2;
  const flag = new Uint8Array(w * h);
  const dist = new Float32Array(w * h);

  // Initialize: everything outside mask is KNOWN, inside is UNKNOWN
  for (let i = 0; i < w * h; i++) {
    if (maskBool[i]) {
      flag[i] = UNKNOWN;
      dist[i] = Infinity;
    } else {
      flag[i] = KNOWN;
      dist[i] = 0;
    }
  }

  // 2. Find initial boundary (BAND) pixels: unknown pixels adjacent to known
  // Use a priority queue (sorted by distance) for fast marching
  type QueueItem = { idx: number; d: number };
  const queue: QueueItem[] = [];

  const dx = [-1, 1, 0, 0, -1, -1, 1, 1];
  const dy = [0, 0, -1, 1, -1, 1, -1, 1];
  const dd = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (flag[idx] !== UNKNOWN) continue;

      // Check if adjacent to a KNOWN pixel
      for (let d = 0; d < 8; d++) {
        const nx = x + dx[d], ny = y + dy[d];
        if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
          const nIdx = ny * w + nx;
          if (flag[nIdx] === KNOWN) {
            flag[idx] = BAND;
            dist[idx] = 1.0;
            queue.push({ idx, d: 1.0 });
            break;
          }
        }
      }
    }
  }

  // Sort queue by distance (ascending) — simple priority queue
  queue.sort((a, b) => a.d - b.d);

  // 3. Fast Marching: process pixels from boundary inward
  while (queue.length > 0) {
    const { idx } = queue.shift()!;
    if (flag[idx] === KNOWN) continue;
    flag[idx] = KNOWN;

    const cx = idx % w;
    const cy = (idx - cx) / w;

    // Interpolate this pixel from nearby KNOWN pixels within radius
    let rSum = 0, gSum = 0, bSum = 0, wSum = 0;

    for (let ky = -radius; ky <= radius; ky++) {
      for (let kx = -radius; kx <= radius; kx++) {
        const nx = cx + kx, ny = cy + ky;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const nIdx = ny * w + nx;
        if (flag[nIdx] !== KNOWN || nIdx === idx) continue;

        const pixelDist = Math.sqrt(kx * kx + ky * ky);
        if (pixelDist > radius) continue;

        // Weight: closer pixels matter more (1/distance²)
        // Pixels that were originally known (dist=0) matter more than recently filled ones
        const distWeight = 1.0 / (1.0 + pixelDist * pixelDist);
        const levelWeight = 1.0 / (1.0 + dist[nIdx]);

        // Gradient-direction weight: prefer pixels in the direction of the gradient
        const gradX = (nx > 0 && nx < w - 1)
          ? (px[(ny * w + nx + 1) * 4] - px[(ny * w + nx - 1) * 4]) / 2
          : 0;
        const gradY = (ny > 0 && ny < h - 1)
          ? (px[((ny + 1) * w + nx) * 4] - px[((ny - 1) * w + nx) * 4]) / 2
          : 0;
        const gradMag = Math.sqrt(gradX * gradX + gradY * gradY) + 0.001;
        const dirX = kx / (pixelDist + 0.001);
        const dirY = ky / (pixelDist + 0.001);
        const gradDot = Math.abs(gradX * dirX + gradY * dirY) / gradMag;
        const dirWeight = 1.0 + gradDot;

        const weight = distWeight * levelWeight * dirWeight;

        const pi = nIdx * 4;
        rSum += px[pi] * weight;
        gSum += px[pi + 1] * weight;
        bSum += px[pi + 2] * weight;
        wSum += weight;
      }
    }

    if (wSum > 0) {
      const pi = idx * 4;
      px[pi] = Math.round(rSum / wSum);
      px[pi + 1] = Math.round(gSum / wSum);
      px[pi + 2] = Math.round(bSum / wSum);
      px[pi + 3] = 255;
    }

    // Add unknown neighbors to the queue
    for (let d = 0; d < 8; d++) {
      const nx = cx + dx[d], ny = cy + dy[d];
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      const nIdx = ny * w + nx;
      if (flag[nIdx] === UNKNOWN) {
        const newDist = dist[idx] + dd[d];
        if (newDist < dist[nIdx]) {
          dist[nIdx] = newDist;
          flag[nIdx] = BAND;
          // Insert sorted (simple insertion for correctness)
          let insertAt = queue.length;
          for (let q = 0; q < queue.length; q++) {
            if (queue[q].d > newDist) { insertAt = q; break; }
          }
          queue.splice(insertAt, 0, { idx: nIdx, d: newDist });
        }
      }
    }
  }

  // 4. Post-process: Gaussian blur only the filled region for smoother blending
  const blurRadius = 2;
  const blurredData = new Uint8ClampedArray(px);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!maskBool[idx]) continue; // Only blur filled pixels

      let r = 0, g = 0, b = 0, wt = 0;
      for (let ky = -blurRadius; ky <= blurRadius; ky++) {
        for (let kx = -blurRadius; kx <= blurRadius; kx++) {
          const nx = Math.min(w - 1, Math.max(0, x + kx));
          const ny = Math.min(h - 1, Math.max(0, y + ky));
          const sigma = blurRadius * 0.6;
          const gw = Math.exp(-(kx * kx + ky * ky) / (2 * sigma * sigma));
          const pi = (ny * w + nx) * 4;
          r += px[pi] * gw; g += px[pi + 1] * gw; b += px[pi + 2] * gw;
          wt += gw;
        }
      }
      const pi = idx * 4;
      blurredData[pi] = r / wt;
      blurredData[pi + 1] = g / wt;
      blurredData[pi + 2] = b / wt;
    }
  }

  // 5. Feather blend at boundary edges for seamless transition
  for (let i = 0; i < w * h; i++) {
    if (maskBool[i]) {
      const pi = i * 4;
      px[pi] = blurredData[pi];
      px[pi + 1] = blurredData[pi + 1];
      px[pi + 2] = blurredData[pi + 2];
    }
  }

  rCtx.putImageData(imgData, 0, 0);
  return result;
}

// ─── Component ─────────────────────────────────────────────────────────────


export default function ObjectEraser({ file, previewUrl }: { file: File; previewUrl: string }) {
  const [brushSize, setBrushSize] = useState(30);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [hasMask, setHasMask] = useState(false);

  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const layoutRef = useRef({ imgX: 0, imgY: 0, imgW: 1, imgH: 1, natW: 1, natH: 1 });
  const historyRef = useRef<ImageData[]>([]);

  // Load image
  useEffect(() => {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      const sCanvas = document.createElement("canvas");
      sCanvas.width = img.naturalWidth;
      sCanvas.height = img.naturalHeight;
      sCanvas.getContext("2d")!.drawImage(img, 0, 0);
      sourceCanvasRef.current = sCanvas;

      const mCanvas = document.createElement("canvas");
      mCanvas.width = img.naturalWidth;
      mCanvas.height = img.naturalHeight;
      maskCanvasRef.current = mCanvas;

      renderDisplay();
    };
    setResultUrl(null);
    setHasMask(false);
    historyRef.current = [];
  }, [previewUrl]);

  useEffect(() => {
    const obs = new ResizeObserver(() => renderDisplay());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const renderDisplay = useCallback(() => {
    const container = containerRef.current;
    const canvas = displayCanvasRef.current;
    const src = sourceCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!container || !canvas || !src) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;

    // Checkerboard bg
    const ts = 10;
    for (let y = 0; y < ch; y += ts) {
      for (let x = 0; x < cw; x += ts) {
        ctx.fillStyle = ((x / ts + y / ts) % 2 === 0) ? "#f4f4f5" : "#fff";
        ctx.fillRect(x, y, ts, ts);
      }
    }

    // Fit image
    const scale = Math.min(cw / src.width, ch / src.height);
    const imgW = src.width * scale;
    const imgH = src.height * scale;
    const imgX = (cw - imgW) / 2;
    const imgY = (ch - imgH) / 2;
    layoutRef.current = { imgX, imgY, imgW, imgH, natW: src.width, natH: src.height };

    ctx.drawImage(src, imgX, imgY, imgW, imgH);

    // Mask overlay
    if (mask) {
      ctx.globalAlpha = 0.45;
      ctx.drawImage(mask, imgX, imgY, imgW, imgH);
      ctx.globalAlpha = 1.0;
    }
  }, []);

  const toImageCoords = (e: React.PointerEvent): { x: number; y: number } | null => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { imgX, imgY, imgW, imgH, natW, natH } = layoutRef.current;
    const ix = ((px - imgX) / imgW) * natW;
    const iy = ((py - imgY) / imgH) * natH;
    if (ix < 0 || iy < 0 || ix >= natW || iy >= natH) return null;
    return { x: ix, y: iy };
  };

  const paintOnMask = (x: number, y: number) => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d")!;
    const { imgW, natW } = layoutRef.current;
    const nb = (brushSize / imgW) * natW;
    ctx.fillStyle = "rgba(255, 40, 80, 1)";
    ctx.beginPath();
    ctx.arc(x, y, nb / 2, 0, Math.PI * 2);
    ctx.fill();
    setHasMask(true);
  };

  const interpolateLine = (x0: number, y0: number, x1: number, y1: number) => {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const { imgW, natW } = layoutRef.current;
    const nb = (brushSize / imgW) * natW;
    const steps = Math.max(1, Math.ceil(dist / (nb * 0.3)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      paintOnMask(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  };

  const saveMaskSnapshot = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    historyRef.current.push(mask.getContext("2d")!.getImageData(0, 0, mask.width, mask.height));
    if (historyRef.current.length > 20) historyRef.current.shift();
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    saveMaskSnapshot();
    isDrawingRef.current = true;
    const c = toImageCoords(e);
    if (c) { paintOnMask(c.x, c.y); lastPosRef.current = c; }
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    renderDisplay();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current) return;
    const c = toImageCoords(e);
    if (c) {
      if (lastPosRef.current) interpolateLine(lastPosRef.current.x, lastPosRef.current.y, c.x, c.y);
      else paintOnMask(c.x, c.y);
      lastPosRef.current = c;
    }
    renderDisplay();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDrawingRef.current = false;
    lastPosRef.current = null;
    if ((e.target as HTMLElement).hasPointerCapture(e.pointerId))
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handleUndo = () => {
    const mask = maskCanvasRef.current;
    if (!mask || !historyRef.current.length) return;
    const prev = historyRef.current.pop()!;
    mask.getContext("2d")!.putImageData(prev, 0, 0);
    let any = false;
    for (let i = 3; i < prev.data.length; i += 4) { if (prev.data[i] > 0) { any = true; break; } }
    setHasMask(any);
    renderDisplay();
  };

  const handleClearMask = () => {
    const mask = maskCanvasRef.current;
    if (!mask) return;
    saveMaskSnapshot();
    mask.getContext("2d")!.clearRect(0, 0, mask.width, mask.height);
    setHasMask(false);
    setResultUrl(null);
    renderDisplay();
  };

  const handleErase = () => {
    const src = sourceCanvasRef.current;
    const mask = maskCanvasRef.current;
    if (!src || !mask) return;
    setIsProcessing(true);

    requestAnimationFrame(() => {
      setTimeout(() => {
        const w = src.width, h = src.height;
        const maskData = mask.getContext("2d")!.getImageData(0, 0, w, h).data;
        const boolMask = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) boolMask[i] = maskData[i * 4 + 3] > 128 ? 1 : 0;

        const resultCanvas = teleaInpaint(src, boolMask, w, h, 8);
        setResultUrl(resultCanvas.toDataURL("image/png"));

        // Update source for chaining
        src.getContext("2d")!.drawImage(resultCanvas, 0, 0);
        mask.getContext("2d")!.clearRect(0, 0, w, h);
        setHasMask(false);
        historyRef.current = [];
        renderDisplay();
        setIsProcessing(false);
      }, 50);
    });
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.download = `erased_${file.name.replace(/\.[^/.]+$/, "")}.png`;
    a.href = resultUrl;
    a.click();
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0 relative mb-6 rounded-2xl overflow-hidden border border-zinc-200/50" style={{ cursor: "crosshair" }}>
        <canvas ref={displayCanvasRef} className="absolute inset-0 w-full h-full touch-none"
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
        />
        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-zinc-800">Erasing objects...</p>
            <p className="text-xs text-zinc-500 mt-1">Running Telea fast-marching inpainting</p>
          </div>
        )}
        {!hasMask && !resultUrl && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/80 backdrop-blur-md border border-zinc-200 px-5 py-3 rounded-2xl shadow-sm text-center">
              <p className="text-sm font-bold text-zinc-800">Paint over objects to remove them</p>
              <p className="text-xs text-zinc-500 mt-1">Drag your cursor to mark unwanted areas</p>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel p-5 rounded-3xl border border-zinc-200/60 shadow-sm" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex flex-col sm:flex-row gap-6">
          <div className="flex flex-col gap-3 flex-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Brush Size</label>
              <span className="text-[11px] font-bold text-zinc-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-zinc-100">{brushSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={(e) => { e.stopPropagation(); setBrushSize(Math.max(5, brushSize - 10)); }} className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"><Minus size={14} /></button>
              <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                <Slider value={brushSize} min={5} max={100} step={1} onChange={(v) => setBrushSize(v)} activeColor="#9333ea" trackColor="#f3e8ff" />
              </div>
              <button onClick={(e) => { e.stopPropagation(); setBrushSize(Math.min(100, brushSize + 10)); }} className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"><Plus size={14} /></button>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Quick Actions</label>
            <div className="flex gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleUndo(); }} className="px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 text-xs font-bold"><Undo2 size={14} /> Undo</button>
              <button onClick={(e) => { e.stopPropagation(); handleClearMask(); }} className="px-4 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1.5 text-xs font-bold"><RotateCcw size={14} /> Clear</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-100">
          <button onClick={(e) => { e.stopPropagation(); handleErase(); }} disabled={!hasMask || isProcessing} className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Eraser size={20} /> {isProcessing ? "Erasing..." : "Erase Selected"}
          </button>
          {resultUrl && (
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
              <Download size={20} /> Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
