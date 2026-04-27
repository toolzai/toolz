"use client";

import { useState, useRef, useCallback } from "react";
import { Copy, RotateCcw, Plus, Trash2 } from "lucide-react";
import { Slider } from "../ui/Slider";



interface Shadow {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

function createShadow(overrides?: Partial<Shadow>): Shadow {
  return {
    id: Math.random().toString(36).slice(2, 8),
    x: 0,
    y: 4,
    blur: 12,
    spread: 0,
    color: "#000000",
    opacity: 25,
    inset: false,
    ...overrides,
  };
}

function shadowToCSS(s: Shadow): string {
  const r = parseInt(s.color.slice(1, 3), 16);
  const g = parseInt(s.color.slice(3, 5), 16);
  const b = parseInt(s.color.slice(5, 7), 16);
  const a = s.opacity / 100;
  return `${s.inset ? "inset " : ""}${s.x}px ${s.y}px ${s.blur}px ${s.spread}px rgba(${r}, ${g}, ${b}, ${a})`;
}

const PRESETS: { name: string; shadows: Partial<Shadow>[] }[] = [
  { name: "Soft", shadows: [{ x: 0, y: 4, blur: 16, spread: -4, color: "#000000", opacity: 15 }] },
  { name: "Material", shadows: [{ x: 0, y: 2, blur: 4, spread: -1, color: "#000000", opacity: 10 }, { x: 0, y: 4, blur: 6, spread: -1, color: "#000000", opacity: 10 }] },
  { name: "Elevated", shadows: [{ x: 0, y: 20, blur: 25, spread: -5, color: "#000000", opacity: 15 }, { x: 0, y: 8, blur: 10, spread: -6, color: "#000000", opacity: 10 }] },
  { name: "Hard", shadows: [{ x: 6, y: 6, blur: 0, spread: 0, color: "#000000", opacity: 100 }] },
  { name: "Neon", shadows: [{ x: 0, y: 0, blur: 20, spread: 2, color: "#ff00ff", opacity: 60 }, { x: 0, y: 0, blur: 40, spread: 4, color: "#ff00ff", opacity: 30 }] },
  { name: "Inner", shadows: [{ x: 0, y: 2, blur: 8, spread: 0, color: "#000000", opacity: 20, inset: true }] },
  { name: "Neumorphism", shadows: [{ x: 6, y: 6, blur: 12, spread: 0, color: "#000000", opacity: 10 }, { x: -6, y: -6, blur: 12, spread: 0, color: "#ffffff", opacity: 80 }] },
  { name: "Glass", shadows: [{ x: 0, y: 8, blur: 32, spread: 0, color: "#000000", opacity: 8 }, { x: 0, y: 0, blur: 0, spread: 1, color: "#ffffff", opacity: 10, inset: true }] },
];

export default function BoxShadowGen() {
  const [shadows, setShadows] = useState<Shadow[]>([createShadow()]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [bgColor, setBgColor] = useState("#f4f4f5");
  const [boxColor, setBoxColor] = useState("#ffffff");
  const [borderRadius, setBorderRadius] = useState(16);
  const [copied, setCopied] = useState(false);

  const active = shadows[activeIdx] || shadows[0];
  const cssValue = shadows.map(shadowToCSS).join(",\n    ");
  const fullCSS = `box-shadow: ${cssValue};\nborder-radius: ${borderRadius}px;`;

  const updateShadow = useCallback((field: keyof Shadow, value: number | string | boolean) => {
    setShadows((prev) => prev.map((s, i) => (i === activeIdx ? { ...s, [field]: value } : s)));
  }, [activeIdx]);

  const addShadow = () => {
    const ns = createShadow();
    setShadows((prev) => [...prev, ns]);
    setActiveIdx(shadows.length);
  };

  const removeShadow = (idx: number) => {
    if (shadows.length <= 1) return;
    setShadows((prev) => prev.filter((_, i) => i !== idx));
    if (activeIdx >= shadows.length - 1) setActiveIdx(Math.max(0, shadows.length - 2));
  };

  const applyPreset = (preset: typeof PRESETS[number]) => {
    const newShadows = preset.shadows.map((s) => createShadow(s));
    setShadows(newShadows);
    setActiveIdx(0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden">
      {/* Preview */}
      <div className="flex-1 min-h-0 relative mb-6 rounded-2xl border border-zinc-200/50 flex items-center justify-center overflow-auto" style={{ backgroundColor: bgColor }}>
        <div
          className="w-28 h-28 sm:w-40 sm:h-40 shrink-0 transition-all duration-300"
          style={{
            backgroundColor: boxColor,
            borderRadius: `${borderRadius}px`,
            boxShadow: shadows.map(shadowToCSS).join(", "),
            margin: "120px",
          }}
        />
      </div>

      {/* Controls */}
      <div className="glass-panel p-5 rounded-3xl border border-zinc-200/60 shadow-sm max-h-[340px] overflow-y-auto" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        {/* Presets */}
        <div className="mb-4">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest block mb-2">Presets</span>
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map((p) => (
              <button key={p.name} onClick={(e) => { e.stopPropagation(); applyPreset(p); }}
                className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white/60 border border-zinc-200 text-zinc-500 hover:bg-white hover:text-zinc-700 transition-all">{p.name}</button>
            ))}
          </div>
        </div>

        {/* Shadow layers */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Layers</span>
          <div className="flex gap-1 ml-auto">
            {shadows.map((s, i) => (
              <button key={s.id} onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                className={`w-7 h-7 rounded-lg text-[10px] font-bold border transition-all flex items-center justify-center ${
                  i === activeIdx ? "bg-pink-50 border-pink-300 text-pink-700" : "bg-white/60 border-zinc-200 text-zinc-500"
                }`}>{i + 1}</button>
            ))}
            <button onClick={(e) => { e.stopPropagation(); addShadow(); }} className="w-7 h-7 rounded-lg border border-dashed border-zinc-300 text-zinc-400 hover:text-zinc-600 flex items-center justify-center transition-colors"><Plus size={12} /></button>
          </div>
        </div>

        {/* Active shadow controls */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-3">
          {[
            { label: "Offset X", field: "x" as const, min: -50, max: 50 },
            { label: "Offset Y", field: "y" as const, min: -50, max: 50 },
            { label: "Blur", field: "blur" as const, min: 0, max: 100 },
            { label: "Spread", field: "spread" as const, min: -30, max: 30 },
            { label: "Opacity", field: "opacity" as const, min: 0, max: 100 },
          ].map(({ label, field, min, max }) => (
            <div key={field} className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</span>
                <span className="text-[9px] font-bold text-zinc-700">{active[field]}px</span>
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Slider value={active[field] as number} min={min} max={max} step={1} onChange={(v) => updateShadow(field, v)} activeColor="#db2777" trackColor="#fbcfe8" />
              </div>
            </div>
          ))}

          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">Color</span>
            <div className="flex items-center gap-2">
              <input type="color" value={active.color} onChange={(e) => updateShadow("color", e.target.value)} onClick={(e) => e.stopPropagation()} className="w-8 h-8 rounded-lg border border-zinc-200 cursor-pointer" />
              <label className="flex items-center gap-1.5 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" checked={active.inset} onChange={(e) => updateShadow("inset", e.target.checked)} className="w-3.5 h-3.5 rounded border-zinc-300 text-pink-600 focus:ring-pink-500" />
                <span className="text-[9px] font-semibold text-zinc-500 uppercase">Inset</span>
              </label>
              {shadows.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); removeShadow(activeIdx); }} className="ml-auto text-zinc-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              )}
            </div>
          </div>
        </div>

        {/* Box/BG controls */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-zinc-500 uppercase">Box</span>
            <input type="color" value={boxColor} onChange={(e) => setBoxColor(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded border border-zinc-200 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-zinc-500 uppercase">BG</span>
            <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-6 h-6 rounded border border-zinc-200 cursor-pointer" />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-[9px] font-semibold text-zinc-500 uppercase shrink-0">Radius</span>
            <div className="flex-1" onClick={(e) => e.stopPropagation()}>
              <Slider value={borderRadius} min={0} max={64} step={1} onChange={(v) => setBorderRadius(v)} activeColor="#db2777" trackColor="#fbcfe8" />
            </div>
            <span className="text-[9px] font-bold text-zinc-700 w-8 text-right">{borderRadius}</span>
          </div>
        </div>

        {/* CSS Output */}
        <div className="mt-3 pt-3 border-t border-zinc-100">
          <pre className="text-[10px] font-mono text-zinc-600 bg-zinc-50 p-3 rounded-xl border border-zinc-100 overflow-x-auto select-all whitespace-pre-wrap">{fullCSS}</pre>
          <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="mt-3 w-full bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2">
            <Copy size={18} /> {copied ? "Copied!" : "Copy CSS"}
          </button>
        </div>
      </div>
    </div>
  );
}
