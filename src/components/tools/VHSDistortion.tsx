"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { Slider } from "../ui/Slider";



interface Props {
  file: File;
  previewUrl: string;
}

export default function VHSDistortion({ file, previewUrl }: Props) {
  const [tracking, setTracking] = useState(40);
  const [chromaShift, setChromaShift] = useState(5);
  const [noise, setNoise] = useState(30);
  const [warp, setWarp] = useState(25);
  const [dateStamp, setDateStamp] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      imgRef.current = img;
      render();
    };
  }, [previewUrl]);

  useEffect(() => {
    const obs = new ResizeObserver(() => render());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => { render(); }, [tracking, chromaShift, noise, warp, dateStamp]);

  const render = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!container || !canvas || !img) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, cw, ch);

    // Fit image
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * 0.9;
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    const ix = (cw - iw) / 2;
    const iy = (ch - ih) / 2;

    // Draw base to offscreen canvas for channel separation
    const off = document.createElement("canvas");
    off.width = iw;
    off.height = ih;
    const oCtx = off.getContext("2d")!;
    oCtx.drawImage(img, 0, 0, iw, ih);

    // Chroma/RGB shift
    const shift = chromaShift;
    if (shift > 0) {
      // Red channel shifted left
      ctx.globalCompositeOperation = "screen";
      ctx.filter = "none";

      // Red
      ctx.drawImage(off, ix - shift, iy);
      const redData = ctx.getImageData(ix, iy, iw, ih);
      const rd = redData.data;

      // Reset
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, cw, ch);

      // Blue shifted right
      ctx.drawImage(off, ix + shift, iy);
      const blueData = ctx.getImageData(ix, iy, iw, ih);
      const bd = blueData.data;

      // Center green
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(off, ix, iy);
      const greenData = ctx.getImageData(ix, iy, iw, ih);
      const gd = greenData.data;

      // Combine channels
      for (let i = 0; i < gd.length; i += 4) {
        gd[i] = Math.min(255, rd[i] * 0.8 + gd[i] * 0.2); // R from shifted
        gd[i + 2] = Math.min(255, bd[i + 2] * 0.8 + gd[i + 2] * 0.2); // B from shifted
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, cw, ch);
      ctx.putImageData(greenData, ix, iy);
    } else {
      ctx.drawImage(off, ix, iy);
    }

    // VHS tracking lines
    if (tracking > 0) {
      const lineCount = Math.floor(tracking / 5);
      for (let i = 0; i < lineCount; i++) {
        const y = iy + Math.random() * ih;
        const lineH = 1 + Math.random() * 3;
        const xOff = (Math.random() - 0.5) * tracking * 0.5;
        
        // Shift a horizontal slice
        const sliceData = ctx.getImageData(ix, y, iw, lineH);
        ctx.fillStyle = `rgba(0,0,0,0.3)`;
        ctx.fillRect(ix, y, iw, lineH);
        ctx.putImageData(sliceData, ix + xOff, y);
      }
    }

    // Warp effect (horizontal wave distortion)
    if (warp > 0) {
      const imgData = ctx.getImageData(ix, iy, iw, ih);
      const copy = new Uint8ClampedArray(imgData.data);
      const amp = warp * 0.15;
      const freq = 0.02;
      for (let y = 0; y < ih; y++) {
        const offset = Math.round(Math.sin(y * freq + Date.now() * 0.001) * amp);
        for (let x = 0; x < iw; x++) {
          const srcX = Math.min(iw - 1, Math.max(0, x + offset));
          const dstIdx = (y * iw + x) * 4;
          const srcIdx = (y * iw + srcX) * 4;
          imgData.data[dstIdx] = copy[srcIdx];
          imgData.data[dstIdx + 1] = copy[srcIdx + 1];
          imgData.data[dstIdx + 2] = copy[srcIdx + 2];
        }
      }
      ctx.putImageData(imgData, ix, iy);
    }

    // Static noise
    if (noise > 0) {
      const noiseData = ctx.getImageData(ix, iy, iw, ih);
      const nd = noiseData.data;
      const amount = noise / 100 * 40;
      for (let i = 0; i < nd.length; i += 4) {
        const n = (Math.random() - 0.5) * amount;
        nd[i] += n;
        nd[i + 1] += n;
        nd[i + 2] += n;
      }
      ctx.putImageData(noiseData, ix, iy);
    }

    // VHS horizontal lines overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.015)";
    for (let y = iy; y < iy + ih; y += 2) {
      ctx.fillRect(ix, y, iw, 1);
    }

    // Slight blue/warm tint
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = "rgba(100, 80, 200, 0.06)";
    ctx.fillRect(ix, iy, iw, ih);
    ctx.globalCompositeOperation = "source-over";

    // VHS date stamp
    if (dateStamp) {
      const now = new Date();
      const stamp = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${now.getFullYear()}  ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const fontSize = Math.max(14, iw * 0.03);
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.shadowColor = "rgba(255, 80, 80, 0.5)";
      ctx.shadowBlur = 4;
      ctx.fillText(stamp, ix + iw - fontSize * 8.5, iy + ih - fontSize * 1.2);
      ctx.shadowBlur = 0;

      // REC indicator
      ctx.fillStyle = "#ff3333";
      ctx.beginPath();
      ctx.arc(ix + fontSize * 1.5, iy + fontSize * 1.8, fontSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.fillText("REC", ix + fontSize * 2.2, iy + fontSize * 2.1);
    }
  }, [tracking, chromaShift, noise, warp, dateStamp]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `vhs_${file.name}`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0 relative mb-6 rounded-2xl overflow-hidden border border-zinc-800 bg-black">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      <div className="glass-panel p-5 rounded-3xl border border-zinc-200/60 shadow-sm" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {[
            { label: "Tracking", value: tracking, set: setTracking },
            { label: "Chroma Shift", value: chromaShift, set: setChromaShift, max: 20 },
            { label: "Static Noise", value: noise, set: setNoise },
            { label: "Warp", value: warp, set: setWarp },
          ].map(({ label, value, set, max = 100 }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] font-bold text-zinc-700">{value}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Slider value={value} min={0} max={max} step={1} onChange={(v) => set(v)} activeColor="#db2777" trackColor="#fbcfe8" />
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-1.5 justify-center">
            <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
              <input type="checkbox" checked={dateStamp} onChange={(e) => setDateStamp(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-pink-600 focus:ring-pink-500" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Date Stamp</span>
            </label>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="w-full bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Download size={20} /> Export VHS Image
          </button>
        </div>
      </div>
    </div>
  );
}
