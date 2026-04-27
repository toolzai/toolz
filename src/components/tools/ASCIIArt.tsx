"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Download } from "lucide-react";
import { Slider } from "../ui/Slider";

const ASCII_RAMPS = {
  standard: " .:-=+*#%@",
  detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  blocks: " ░▒▓█",
  simple: " .oO@",
};

type RampKey = keyof typeof ASCII_RAMPS;



interface Props {
  file: File;
  previewUrl: string;
}

export default function ASCIIArt({ file, previewUrl }: Props) {
  const [width, setWidth] = useState(100);
  const [rampKey, setRampKey] = useState<RampKey>("standard");
  const [inverted, setInverted] = useState(false);
  const [colored, setColored] = useState(false);
  const [asciiText, setAsciiText] = useState("");
  const [colorData, setColorData] = useState<string[][]>([]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      imgRef.current = img;
      generateASCII(img, width, rampKey, inverted);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (imgRef.current) generateASCII(imgRef.current, width, rampKey, inverted);
  }, [width, rampKey, inverted, colored]);

  const generateASCII = useCallback((img: HTMLImageElement, cols: number, ramp: RampKey, invert: boolean) => {
    const canvas = document.createElement("canvas");
    const aspect = 0.55; // Character aspect ratio correction
    const rows = Math.round((cols * img.naturalHeight / img.naturalWidth) * aspect);
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, cols, rows);
    const data = ctx.getImageData(0, 0, cols, rows).data;

    const chars = ASCII_RAMPS[ramp];
    const lines: string[] = [];
    const colors: string[][] = [];

    for (let y = 0; y < rows; y++) {
      let line = "";
      const colorRow: string[] = [];
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const adjusted = invert ? 1 - brightness : brightness;
        const charIdx = Math.min(chars.length - 1, Math.floor(adjusted * chars.length));
        line += chars[charIdx];
        colorRow.push(`rgb(${r},${g},${b})`);
      }
      lines.push(line);
      colors.push(colorRow);
    }

    setAsciiText(lines.join("\n"));
    setColorData(colors);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(asciiText);
  };

  const handleDownload = () => {
    const blob = new Blob([asciiText], { type: "text/plain" });
    const a = document.createElement("a");
    a.download = `ascii_${file.name.replace(/\.[^/.]+$/, "")}.txt`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownloadImage = () => {
    // Render ASCII to canvas for image export
    const lines = asciiText.split("\n");
    if (!lines.length) return;
    const fontSize = 10;
    const charW = fontSize * 0.6;
    const charH = fontSize * 1.2;
    const cw = Math.ceil(lines[0].length * charW) + 20;
    const ch = Math.ceil(lines.length * charH) + 20;
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = inverted ? "#ffffff" : "#0a0a0a";
    ctx.fillRect(0, 0, cw, ch);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = "top";

    for (let y = 0; y < lines.length; y++) {
      for (let x = 0; x < lines[y].length; x++) {
        if (colored && colorData[y] && colorData[y][x]) {
          ctx.fillStyle = colorData[y][x];
        } else {
          ctx.fillStyle = inverted ? "#0a0a0a" : "#00ff41";
        }
        ctx.fillText(lines[y][x], 10 + x * charW, 10 + y * charH);
      }
    }

    const a = document.createElement("a");
    a.download = `ascii_${file.name.replace(/\.[^/.]+$/, "")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden">
      {/* ASCII Preview */}
      <div className="flex-1 min-h-0 relative mb-6 rounded-2xl overflow-auto border border-zinc-200/50" style={{ background: inverted ? "#fff" : "#0a0a0a" }}>
        {colored ? (
          <pre ref={outputRef} className="p-4 text-[8px] sm:text-[10px] leading-[1.1] font-mono whitespace-pre select-all" style={{ lineHeight: "1.1" }}>
            {asciiText.split("\n").map((line, y) => (
              <div key={y}>
                {line.split("").map((ch, x) => (
                  <span key={x} style={{ color: colorData[y]?.[x] || "#fff" }}>{ch}</span>
                ))}
              </div>
            ))}
          </pre>
        ) : (
          <pre ref={outputRef} className="p-4 text-[8px] sm:text-[10px] leading-[1.1] font-mono whitespace-pre select-all" style={{ color: inverted ? "#0a0a0a" : "#00ff41", lineHeight: "1.1" }}>
            {asciiText}
          </pre>
        )}
      </div>

      {/* Controls */}
      <div className="glass-panel p-5 rounded-3xl border border-zinc-200/60 shadow-sm" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Width */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Resolution</span>
              <span className="text-[10px] font-bold text-zinc-700">{width} cols</span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Slider value={width} min={30} max={200} step={5} onChange={(v) => setWidth(v)} activeColor="#db2777" trackColor="#fbcfe8" />
            </div>
          </div>

          {/* Ramp */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Style</span>
            <div className="flex gap-1.5">
              {(Object.keys(ASCII_RAMPS) as RampKey[]).map((k) => (
                <button key={k} onClick={(e) => { e.stopPropagation(); setRampKey(k); }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-all border ${
                    rampKey === k ? "bg-pink-50 border-pink-300 text-pink-700" : "bg-white/60 border-zinc-200 text-zinc-500 hover:bg-white"
                  }`}>{k}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex gap-4 mt-4">
          <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={inverted} onChange={(e) => setInverted(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-pink-600 focus:ring-pink-500" />
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">Inverted</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" checked={colored} onChange={(e) => setColored(e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-pink-600 focus:ring-pink-500" />
            <span className="text-[10px] font-semibold text-zinc-500 uppercase">Color Mode</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-zinc-100">
          <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="flex-1 bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-md flex items-center justify-center gap-2">
            <Copy size={18} /> Copy Text
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDownload(); }} className="bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-5 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
            <Download size={18} /> .txt
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDownloadImage(); }} className="bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-5 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2">
            <Download size={18} /> .png
          </button>
        </div>
      </div>
    </div>
  );
}
