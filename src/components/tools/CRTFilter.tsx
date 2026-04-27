"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { Slider } from "../ui/Slider";



interface Props {
  file: File;
  previewUrl: string;
}

export default function CRTFilter({ file, previewUrl }: Props) {
  const [scanlineIntensity, setScanlineIntensity] = useState(50);
  const [curvature, setCurvature] = useState(30);
  const [vignette, setVignette] = useState(40);
  const [brightness, setBrightness] = useState(110);
  const [greenTint, setGreenTint] = useState(20);

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

  useEffect(() => { render(); }, [scanlineIntensity, curvature, vignette, brightness, greenTint]);

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

    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, cw, ch);

    // Fit image
    const s = Math.min(cw / img.naturalWidth, ch / img.naturalHeight) * 0.9;
    const iw = img.naturalWidth * s;
    const ih = img.naturalHeight * s;
    const ix = (cw - iw) / 2;
    const iy = (ch - ih) / 2;

    // Draw base image with brightness & green tint
    ctx.save();
    ctx.filter = `brightness(${brightness}%)`;
    ctx.drawImage(img, ix, iy, iw, ih);
    ctx.restore();

    // Green phosphor tint
    if (greenTint > 0) {
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = `rgba(0, 255, 80, ${greenTint / 200})`;
      ctx.fillRect(ix, iy, iw, ih);
      ctx.globalCompositeOperation = "source-over";
    }

    // Scanlines
    if (scanlineIntensity > 0) {
      const lineSpacing = 3;
      const alpha = scanlineIntensity / 100 * 0.6;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      for (let y = iy; y < iy + ih; y += lineSpacing) {
        ctx.fillRect(ix, y, iw, 1);
      }
    }

    // RGB sub-pixel simulation
    const subPixelAlpha = 0.08;
    for (let x = ix; x < ix + iw; x += 3) {
      ctx.fillStyle = `rgba(255, 0, 0, ${subPixelAlpha})`;
      ctx.fillRect(x, iy, 1, ih);
      ctx.fillStyle = `rgba(0, 255, 0, ${subPixelAlpha})`;
      ctx.fillRect(x + 1, iy, 1, ih);
      ctx.fillStyle = `rgba(0, 0, 255, ${subPixelAlpha})`;
      ctx.fillRect(x + 2, iy, 1, ih);
    }

    // Vignette
    if (vignette > 0) {
      const gradient = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(iw, ih) * 0.3, cw / 2, ch / 2, Math.max(iw, ih) * 0.7);
      gradient.addColorStop(0, "rgba(0,0,0,0)");
      gradient.addColorStop(1, `rgba(0,0,0,${vignette / 100 * 0.8})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(ix, iy, iw, ih);
    }

    // CRT curvature overlay (barrel distortion simulation via shadow)
    if (curvature > 0) {
      const c = curvature / 100;
      const inset = c * 8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${c * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(ix + inset, iy + inset, iw - inset * 2, ih - inset * 2, [iw * c * 0.05]);
      ctx.stroke();

      // Edge darkening for curvature effect
      const edgeGrad = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(iw, ih) * 0.4, cw / 2, ch / 2, Math.max(iw, ih) * 0.55);
      edgeGrad.addColorStop(0, "rgba(0,0,0,0)");
      edgeGrad.addColorStop(1, `rgba(0,0,0,${c * 0.4})`);
      ctx.fillStyle = edgeGrad;
      ctx.fillRect(ix, iy, iw, ih);
    }

    // Subtle noise
    const noiseData = ctx.getImageData(ix, iy, iw, ih);
    const nd = noiseData.data;
    for (let i = 0; i < nd.length; i += 4) {
      const noise = (Math.random() - 0.5) * 15;
      nd[i] += noise;
      nd[i + 1] += noise;
      nd[i + 2] += noise;
    }
    ctx.putImageData(noiseData, ix, iy);

    // Glow line (horizontal)
    const glowY = iy + (Date.now() % 4000) / 4000 * ih;
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.fillRect(ix, glowY, iw, 3);
  }, [scanlineIntensity, curvature, vignette, brightness, greenTint]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `crt_${file.name}`;
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
            { label: "Scanlines", value: scanlineIntensity, set: setScanlineIntensity },
            { label: "Curvature", value: curvature, set: setCurvature },
            { label: "Vignette", value: vignette, set: setVignette },
            { label: "Brightness", value: brightness, set: setBrightness, min: 50, max: 200 },
            { label: "Green Tint", value: greenTint, set: setGreenTint },
          ].map(({ label, value, set, min = 0, max = 100 }) => (
            <div key={label} className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
                <span className="text-[10px] font-bold text-zinc-700">{value}{label === "Brightness" ? "%" : ""}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Slider value={value} min={min} max={max} step={1} onChange={(v) => set(v)} activeColor="#db2777" trackColor="#fbcfe8" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-4 border-t border-zinc-100">
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="w-full bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Download size={20} /> Export CRT Image
          </button>
        </div>
      </div>
    </div>
  );
}
