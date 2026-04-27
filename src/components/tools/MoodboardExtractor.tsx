"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Copy, Palette, Sun, Moon, Droplets, Sparkles } from "lucide-react";

interface ColorInfo {
  hex: string;
  rgb: [number, number, number];
  count: number;
  percentage: number;
}

interface MoodAnalysis {
  temperature: "warm" | "cool" | "neutral";
  energy: "vibrant" | "muted" | "balanced";
  lightness: "light" | "dark" | "medium";
  mood: string;
  keywords: string[];
  fontSuggestions: string[];
}

// ─── Median-Cut Color Quantization ────────────────────────────────────────

function extractColors(img: HTMLImageElement, numColors: number = 8): ColorInfo[] {
  const canvas = document.createElement("canvas");
  const size = 150; // Downsample for performance
  const aspect = img.naturalWidth / img.naturalHeight;
  canvas.width = Math.round(size * (aspect > 1 ? 1 : aspect));
  canvas.height = Math.round(size * (aspect > 1 ? 1 / aspect : 1));
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Collect all pixels
  const pixels: [number, number, number][] = [];
  for (let i = 0; i < data.length; i += 4) {
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }

  // Median cut
  const buckets = medianCut(pixels, numColors);
  const totalPixels = pixels.length;

  const rawColors = buckets
    .map((bucket) => {
      const avg = bucket.reduce(
        (acc, p) => [acc[0] + p[0], acc[1] + p[1], acc[2] + p[2]],
        [0, 0, 0]
      );
      const r = Math.round(avg[0] / bucket.length);
      const g = Math.round(avg[1] / bucket.length);
      const b = Math.round(avg[2] / bucket.length);
      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
      return {
        hex,
        rgb: [r, g, b] as [number, number, number],
        count: bucket.length,
        percentage: (bucket.length / totalPixels) * 100,
      };
    });

  // Deduplicate
  const colorMap = new Map<string, ColorInfo>();
  rawColors.forEach((c) => {
    if (colorMap.has(c.hex)) {
      const existing = colorMap.get(c.hex)!;
      existing.count += c.count;
      existing.percentage += c.percentage;
    } else {
      colorMap.set(c.hex, { ...c });
    }
  });

  return Array.from(colorMap.values())
    .map((c) => ({ ...c, percentage: Math.max(1, Math.round(c.percentage)) }))
    .sort((a, b) => b.count - a.count);
}

function medianCut(pixels: [number, number, number][], depth: number): [number, number, number][][] {
  if (depth <= 1 || pixels.length === 0) return [pixels];

  // Find the channel with the greatest range
  let maxRange = 0, maxChannel = 0;
  for (let ch = 0; ch < 3; ch++) {
    const values = pixels.map((p) => p[ch]);
    const range = Math.max(...values) - Math.min(...values);
    if (range > maxRange) { maxRange = range; maxChannel = ch; }
  }

  // Sort by that channel and split
  pixels.sort((a, b) => a[maxChannel] - b[maxChannel]);
  const mid = Math.floor(pixels.length / 2);
  return [
    ...medianCut(pixels.slice(0, mid), depth - 1),
    ...medianCut(pixels.slice(mid), depth - 1),
  ];
}

// ─── Mood Analysis ────────────────────────────────────────────────────────

function analyzeMood(colors: ColorInfo[]): MoodAnalysis {
  let totalH = 0, totalS = 0, totalL = 0, totalWeight = 0;

  for (const c of colors) {
    const [h, s, l] = rgbToHsl(c.rgb[0], c.rgb[1], c.rgb[2]);
    const w = c.percentage;
    totalH += h * w;
    totalS += s * w;
    totalL += l * w;
    totalWeight += w;
  }

  const avgH = totalH / totalWeight;
  const avgS = totalS / totalWeight;
  const avgL = totalL / totalWeight;

  const temperature: MoodAnalysis["temperature"] =
    (avgH < 60 || avgH > 300) ? "warm" : avgH < 180 ? "neutral" : "cool";
  const energy: MoodAnalysis["energy"] =
    avgS > 55 ? "vibrant" : avgS < 25 ? "muted" : "balanced";
  const lightness: MoodAnalysis["lightness"] =
    avgL > 65 ? "light" : avgL < 35 ? "dark" : "medium";

  const moodMap: Record<string, string> = {
    "warm-vibrant-light": "Energetic & Playful",
    "warm-vibrant-dark": "Bold & Passionate",
    "warm-vibrant-medium": "Dynamic & Exciting",
    "warm-muted-light": "Soft & Cozy",
    "warm-muted-dark": "Rustic & Earthy",
    "warm-muted-medium": "Vintage & Nostalgic",
    "warm-balanced-light": "Friendly & Approachable",
    "warm-balanced-dark": "Luxurious & Rich",
    "warm-balanced-medium": "Warm & Inviting",
    "cool-vibrant-light": "Fresh & Modern",
    "cool-vibrant-dark": "Electric & Futuristic",
    "cool-vibrant-medium": "Professional & Striking",
    "cool-muted-light": "Calm & Serene",
    "cool-muted-dark": "Mysterious & Deep",
    "cool-muted-medium": "Sophisticated & Quiet",
    "cool-balanced-light": "Clean & Minimal",
    "cool-balanced-dark": "Corporate & Trustworthy",
    "cool-balanced-medium": "Balanced & Reliable",
    "neutral-vibrant-light": "Lively & Creative",
    "neutral-vibrant-dark": "Dramatic & Intense",
    "neutral-vibrant-medium": "Artistic & Expressive",
    "neutral-muted-light": "Airy & Ethereal",
    "neutral-muted-dark": "Moody & Introspective",
    "neutral-muted-medium": "Natural & Organic",
    "neutral-balanced-light": "Open & Spacious",
    "neutral-balanced-dark": "Elegant & Refined",
    "neutral-balanced-medium": "Harmonious & Grounded",
  };

  const key = `${temperature}-${energy}-${lightness}`;
  const mood = moodMap[key] || "Unique & Distinctive";

  const keywordMap: Record<string, string[]> = {
    warm: ["passionate", "energetic", "inviting"],
    cool: ["calm", "professional", "trustworthy"],
    neutral: ["balanced", "natural", "versatile"],
    vibrant: ["bold", "dynamic", "eye-catching"],
    muted: ["subtle", "refined", "understated"],
    balanced: ["harmonious", "stable", "approachable"],
    light: ["airy", "open", "optimistic"],
    dark: ["dramatic", "luxurious", "powerful"],
    medium: ["grounded", "comfortable", "reliable"],
  };
  const keywords = [...(keywordMap[temperature] || []), ...(keywordMap[energy] || []), ...(keywordMap[lightness] || [])];

  const fontMap: Record<string, string[]> = {
    "warm-vibrant": ["Poppins", "Fredoka One", "Pacifico"],
    "warm-muted": ["Merriweather", "Playfair Display", "Lora"],
    "warm-balanced": ["Nunito", "Source Sans Pro", "Open Sans"],
    "cool-vibrant": ["Space Grotesk", "Orbitron", "Rajdhani"],
    "cool-muted": ["Inter", "IBM Plex Sans", "Work Sans"],
    "cool-balanced": ["Roboto", "Montserrat", "Lato"],
    "neutral-vibrant": ["DM Sans", "Outfit", "Manrope"],
    "neutral-muted": ["Crimson Text", "EB Garamond", "Cormorant"],
    "neutral-balanced": ["Inter", "Figtree", "Plus Jakarta Sans"],
  };
  const fontSuggestions = fontMap[`${temperature}-${energy}`] || ["Inter", "Roboto", "Open Sans"];

  return { temperature, energy, lightness, mood, keywords, fontSuggestions };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s * 100, l * 100];
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 128 ? "#000000" : "#ffffff";
}

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
  file: File;
  previewUrl: string;
}

export default function MoodboardExtractor({ file, previewUrl }: Props) {
  const [colors, setColors] = useState<ColorInfo[]>([]);
  const [mood, setMood] = useState<MoodAnalysis | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      const extracted = extractColors(img, 8);
      setColors(extracted);
      setMood(analyzeMood(extracted));
    };
  }, [previewUrl]);

  const copyColor = (hex: string, idx: number) => {
    navigator.clipboard.writeText(hex);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  if (!colors.length || !mood) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-y-auto">
      {/* Source Image + Mood Banner */}
      <div className="flex flex-col sm:flex-row gap-5 mb-6">
        <div className="w-full sm:w-48 h-36 rounded-2xl overflow-hidden border border-zinc-200/50 shrink-0">
          <img src={previewUrl} alt="Source" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 flex flex-col justify-center gap-2">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-orange-500" />
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Visual Mood</span>
          </div>
          <h2 className="text-2xl font-bold text-zinc-800">{mood.mood}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {mood.keywords.map((kw) => (
              <span key={kw} className="px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-[10px] font-bold uppercase tracking-wide">{kw}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              {mood.temperature === "warm" ? <Sun size={14} className="text-amber-500" /> : mood.temperature === "cool" ? <Moon size={14} className="text-blue-500" /> : <Droplets size={14} className="text-green-500" />}
              <span className="font-semibold capitalize">{mood.temperature}</span>
            </div>
            <span className="text-zinc-300">•</span>
            <span className="text-xs text-zinc-500 font-semibold capitalize">{mood.energy}</span>
            <span className="text-zinc-300">•</span>
            <span className="text-xs text-zinc-500 font-semibold capitalize">{mood.lightness}</span>
          </div>
        </div>
      </div>

      {/* Color Palette */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={16} className="text-orange-500" />
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Extracted Palette</span>
        </div>

        {/* Color Bar */}
        <div className="h-14 rounded-2xl overflow-hidden flex mb-4 border border-zinc-200/50">
          {colors.map((c, i) => (
            <div
              key={i}
              className="h-full cursor-pointer transition-all hover:scale-y-110 relative group"
              style={{ backgroundColor: c.hex, flex: c.percentage }}
              onClick={(e) => { e.stopPropagation(); copyColor(c.hex, i); }}
              title={`${c.hex} (${c.percentage}%)`}
            >
              {copiedIdx === i && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white">Copied!</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Color Swatches */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {colors.map((c, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); copyColor(c.hex, i); }}
              className="flex flex-col items-center gap-1.5 group"
            >
              <div
                className="w-full aspect-square rounded-xl border border-zinc-200/50 transition-transform group-hover:scale-105 flex items-center justify-center"
                style={{ backgroundColor: c.hex }}
              >
                <Copy size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: getContrastColor(c.hex) }} />
              </div>
              <span className="text-[9px] font-bold text-zinc-600 uppercase">{c.hex}</span>
              <span className="text-[8px] text-zinc-400">{c.percentage}%</span>
            </button>
          ))}
        </div>
      </div>

      {/* Font Suggestions */}
      <div className="glass-panel p-5 rounded-3xl border border-zinc-200/60 shadow-sm" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest block mb-3">Suggested Fonts</span>
        <div className="flex gap-3">
          {mood.fontSuggestions.map((font) => (
            <button
              key={font}
              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(font); }}
              className="flex-1 bg-white/60 border border-zinc-200 rounded-xl px-4 py-3 text-center hover:bg-white hover:border-zinc-300 transition-all group"
            >
              <span className="text-sm font-bold text-zinc-800 block">{font}</span>
              <span className="text-[9px] text-zinc-400 group-hover:text-orange-500 transition-colors">Click to copy</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
