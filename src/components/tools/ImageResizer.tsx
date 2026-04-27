"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Download,
  Lock,
  Unlock,
  MoveDiagonal2,
  Crop,
  Monitor,
  FileText,
  Search,
  Square,
  Image as ImageIcon,
} from "lucide-react";
import { Slider } from "../ui/Slider";

type FitMode = "stretch" | "smart" | "contain" | "blur-fill";
type PresetCategory = "social" | "documents";

type SizePreset = {
  label: string;
  width: number;
  height: number;
};

const SOCIAL_PRESETS: SizePreset[] = [
  { label: "Instagram Post", width: 1080, height: 1080 },
  { label: "Instagram Story", width: 1080, height: 1920 },
  { label: "Facebook Cover", width: 820, height: 312 },
  { label: "Twitter/X Header", width: 1500, height: 500 },
  { label: "LinkedIn Banner", width: 1584, height: 396 },
  { label: "YouTube Thumbnail", width: 1280, height: 720 },
  { label: "Pinterest Pin", width: 1000, height: 1500 },
  { label: "WhatsApp DP", width: 500, height: 500 },
];

const DOCUMENT_PRESETS: SizePreset[] = [
  { label: "Passport Photo", width: 600, height: 600 },
  { label: "Stamp Size", width: 300, height: 300 },
  { label: "ID Card", width: 1013, height: 638 },
  { label: "A4 (300 DPI)", width: 2480, height: 3508 },
  { label: "US Letter (300 DPI)", width: 2550, height: 3300 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function getPresetKey(preset: SizePreset): string {
  return `${preset.label}-${preset.width}x${preset.height}`;
}

type DrawOptions = {
  mode: FitMode;
  targetWidth: number;
  targetHeight: number;
  smartPosition: { x: number; y: number };
  backgroundColor: string;
  blurStrength: number;
};

function drawImageWithMode(ctx: CanvasRenderingContext2D, img: HTMLImageElement, options: DrawOptions): void {
  const { mode, targetWidth, targetHeight, smartPosition, backgroundColor, blurStrength } = options;

  ctx.clearRect(0, 0, targetWidth, targetHeight);

  if (mode === "stretch") {
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    return;
  }

  if (mode === "smart") {
    const scale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    const overflowX = Math.max(0, drawWidth - targetWidth);
    const overflowY = Math.max(0, drawHeight - targetHeight);
    const drawX = -overflowX * smartPosition.x;
    const drawY = -overflowY * smartPosition.y;
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  if (mode === "contain") {
    const containScale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
    const drawWidth = img.naturalWidth * containScale;
    const drawHeight = img.naturalHeight * containScale;
    const drawX = (targetWidth - drawWidth) / 2;
    const drawY = (targetHeight - drawHeight) / 2;

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    return;
  }

  const coverScale = Math.max(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
  const coverWidth = img.naturalWidth * coverScale;
  const coverHeight = img.naturalHeight * coverScale;
  const coverX = (targetWidth - coverWidth) / 2;
  const coverY = (targetHeight - coverHeight) / 2;

  const containScale = Math.min(targetWidth / img.naturalWidth, targetHeight / img.naturalHeight);
  const containWidth = img.naturalWidth * containScale;
  const containHeight = img.naturalHeight * containScale;
  const containX = (targetWidth - containWidth) / 2;
  const containY = (targetHeight - containHeight) / 2;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  ctx.save();
  ctx.filter = `blur(${blurStrength}px) saturate(1.1)`;
  ctx.drawImage(
    img,
    coverX - blurStrength,
    coverY - blurStrength,
    coverWidth + blurStrength * 2,
    coverHeight + blurStrength * 2
  );
  ctx.restore();

  ctx.drawImage(img, containX, containY, containWidth, containHeight);
}

export default function ImageResizer({ file, previewUrl }: { file: File; previewUrl: string }) {
  const [mode, setMode] = useState<FitMode>("stretch");
  const [category, setCategory] = useState<PresetCategory>("social");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);

  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [keepAspect, setKeepAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  const [smartPosition, setSmartPosition] = useState({ x: 0.5, y: 0.5 });
  const [isDragging, setIsDragging] = useState(false);

  const [backgroundColor, setBackgroundColor] = useState("#101828");
  const [blurStrength, setBlurStrength] = useState(22);

  const [presetQuery, setPresetQuery] = useState("");

  const [estimatedSize, setEstimatedSize] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    startX: number;
    startY: number;
  } | null>(null);

  const presets = useMemo(
    () => (category === "social" ? SOCIAL_PRESETS : DOCUMENT_PRESETS),
    [category]
  );

  const filteredPresets = useMemo(() => {
    const normalizedQuery = presetQuery.trim().toLowerCase();

    return presets.filter((preset) => {
      if (!normalizedQuery) return true;
      const text = `${preset.label} ${preset.width}x${preset.height}`.toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [presetQuery, presets]);

  useEffect(() => {
    const img = document.createElement("img");
    img.src = previewUrl;
    img.onload = () => {
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setSelectedPreset(null);
      setSmartPosition({ x: 0.5, y: 0.5 });
    };
  }, [previewUrl]);

  useEffect(() => {
    let cancelled = false;

    const renderPreview = async () => {
      if (!previewCanvasRef.current || !width || !height) return;

      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = await loadImage(previewUrl);
      if (cancelled) return;

      canvas.width = width;
      canvas.height = height;

      drawImageWithMode(ctx, img, {
        mode,
        targetWidth: width,
        targetHeight: height,
        smartPosition,
        backgroundColor,
        blurStrength,
      });
    };

    void renderPreview();

    return () => {
      cancelled = true;
    };
  }, [backgroundColor, blurStrength, height, mode, previewUrl, smartPosition, width]);

  useEffect(() => {
    let cancelled = false;

    const estimateOutputSize = async () => {
      if (!width || !height) return;
      setEstimating(true);
      setEstimatedSize(null);

      try {
        const img = await loadImage(previewUrl);
        if (cancelled) return;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          if (!cancelled) {
            setEstimating(false);
          }
          return;
        }

        drawImageWithMode(ctx, img, {
          mode,
          targetWidth: width,
          targetHeight: height,
          smartPosition,
          backgroundColor,
          blurStrength,
        });

        const outputType = file.type && file.type.startsWith("image/") ? file.type : "image/png";
        const quality = outputType === "image/png" ? undefined : 0.95;

        canvas.toBlob(
          (blob) => {
            if (cancelled) return;
            setEstimatedSize(blob ? blob.size : null);
            setEstimating(false);
          },
          outputType,
          quality
        );
      } catch {
        if (!cancelled) {
          setEstimatedSize(null);
          setEstimating(false);
        }
      }
    };

    void estimateOutputSize();

    return () => {
      cancelled = true;
    };
  }, [backgroundColor, blurStrength, file.type, height, mode, previewUrl, smartPosition, width]);

  const handleWidthChange = (value: number) => {
    const nextWidth = clamp(Number.isFinite(value) ? Math.round(value) : 1, 1, 10000);
    setSelectedPreset(null);
    setWidth(nextWidth);
    if (keepAspect) {
      setHeight(clamp(Math.round(nextWidth / aspectRatio), 1, 10000));
    }
  };

  const handleHeightChange = (value: number) => {
    const nextHeight = clamp(Number.isFinite(value) ? Math.round(value) : 1, 1, 10000);
    setSelectedPreset(null);
    setHeight(nextHeight);
    if (keepAspect) {
      setWidth(clamp(Math.round(nextHeight * aspectRatio), 1, 10000));
    }
  };

  const handleSelectPreset = (preset: SizePreset) => {
    setSelectedPreset(getPresetKey(preset));
    setWidth(preset.width);
    setHeight(preset.height);
  };

  const getSmartRenderLayout = (frameWidth: number, frameHeight: number) => {
    const scale = Math.max(frameWidth / originalWidth, frameHeight / originalHeight);
    const renderWidth = originalWidth * scale;
    const renderHeight = originalHeight * scale;
    const overflowX = Math.max(0, renderWidth - frameWidth);
    const overflowY = Math.max(0, renderHeight - frameHeight);

    return {
      overflowX,
      overflowY,
    };
  };

  const updateSmartPositionFromDrag = (clientX: number, clientY: number) => {
    if (!previewCanvasRef.current || !dragStartRef.current) return;

    const rect = previewCanvasRef.current.getBoundingClientRect();
    const { overflowX, overflowY } = getSmartRenderLayout(rect.width, rect.height);

    const deltaX = clientX - dragStartRef.current.pointerX;
    const deltaY = clientY - dragStartRef.current.pointerY;

    const nextX =
      overflowX > 0
        ? clamp(dragStartRef.current.startX - deltaX / overflowX, 0, 1)
        : dragStartRef.current.startX;
    const nextY =
      overflowY > 0
        ? clamp(dragStartRef.current.startY - deltaY / overflowY, 0, 1)
        : dragStartRef.current.startY;

    setSmartPosition({ x: nextX, y: nextY });
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (mode !== "smart") return;
    dragStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: smartPosition.x,
      startY: smartPosition.y,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current || mode !== "smart") return;
    event.preventDefault();
    updateSmartPositionFromDrag(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragStartRef.current = null;
    setIsDragging(false);
  };

  const handleDownload = async () => {
    if (!width || !height) return;

    const img = await loadImage(previewUrl);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    drawImageWithMode(ctx, img, {
      mode,
      targetWidth: width,
      targetHeight: height,
      smartPosition,
      backgroundColor,
      blurStrength,
    });

    const outputType = file.type && file.type.startsWith("image/") ? file.type : "image/png";
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const extension = outputType.split("/")[1] || "png";
    const quality = outputType === "image/png" ? undefined : 0.95;

    const link = document.createElement("a");
    link.download = `${baseName}_${width}x${height}.${extension}`;
    link.href = canvas.toDataURL(outputType, quality);
    link.click();
  };

  const previewMeta = `${file.name} · ${originalWidth}×${originalHeight} · ${formatFileSize(file.size)}`;

  return (
    <div className="flex flex-col lg:flex-row w-full h-full">
      {/* LEFT: Preview & Methods */}
      <div className="flex-[1.5] p-5 sm:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-zinc-200/60 custom-scrollbar pr-4">
        <div className="glass-panel p-4 rounded-2xl mb-4 border border-zinc-200/60">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Resize Method</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setMode("stretch")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "stretch"
                ? "bg-white border-zinc-300 shadow-sm"
                : "bg-white/40 border-zinc-200 hover:bg-white/70"
            }`}
          >
            <MoveDiagonal2 size={16} className="mt-0.5 text-zinc-500" />
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Stretch</span>
              <span className="block text-xs text-zinc-500">Fill frame, may distort image</span>
            </span>
          </button>

          <button
            onClick={() => setMode("smart")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "smart"
                ? "bg-white border-zinc-300 shadow-sm"
                : "bg-white/40 border-zinc-200 hover:bg-white/70"
            }`}
          >
            <Crop size={16} className="mt-0.5 text-zinc-500" />
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Smart Crop</span>
              <span className="block text-xs text-zinc-500">No distortion, drag to position</span>
            </span>
          </button>

          <button
            onClick={() => setMode("contain")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "contain"
                ? "bg-white border-zinc-300 shadow-sm"
                : "bg-white/40 border-zinc-200 hover:bg-white/70"
            }`}
          >
            <Square size={16} className="mt-0.5 text-zinc-500" />
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Contain + Background</span>
              <span className="block text-xs text-zinc-500">No crop, add colored letterbox</span>
            </span>
          </button>

          <button
            onClick={() => setMode("blur-fill")}
            className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
              mode === "blur-fill"
                ? "bg-white border-zinc-300 shadow-sm"
                : "bg-white/40 border-zinc-200 hover:bg-white/70"
            }`}
          >
            <ImageIcon size={16} className="mt-0.5 text-zinc-500" />
            <span>
              <span className="block text-sm font-semibold text-zinc-800">Blur Fill</span>
              <span className="block text-xs text-zinc-500">Blurred cover background + full image</span>
            </span>
          </button>
        </div>

        {(mode === "contain" || mode === "blur-fill") && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label htmlFor="bg-color" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Background Color
              </label>
              <input
                id="bg-color"
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="h-11 w-full rounded-xl border border-zinc-200 bg-white"
                title="Choose background color"
              />
            </div>

            {mode === "blur-fill" && (
              <div className="flex flex-col gap-2">
                <label htmlFor="blur-strength" className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                  Blur Strength
                </label>
                <div className="w-full sm:w-52">
                  <Slider
                    value={blurStrength}
                    min={4}
                    max={48}
                    step={1}
                    onChange={(v) => setBlurStrength(v)}
                    activeColor="#3b82f6"
                    trackColor="#bfdbfe"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {mode === "smart" && (
        <p className="text-xs text-zinc-500 mb-2">Drag to position: choose which part of the image to keep.</p>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white/40 mb-3 p-3 shadow-sm">
        <div className="mx-auto flex h-75 items-center justify-center rounded-xl border border-zinc-200/50 bg-black/5">
          <canvas
            ref={previewCanvasRef}
            width={Math.max(width, 1)}
            height={Math.max(height, 1)}
            className={`block max-h-70 w-auto max-w-full select-none rounded-sm shadow-sm ${
              mode === "smart" ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
            }`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onPointerLeave={(event) => {
              if (isDragging) handlePointerEnd(event);
            }}
          />
        </div>

        {mode === "smart" && (
          <p className="text-center text-xs text-zinc-500 mt-2">This preview exactly matches your {width}×{height} output.</p>
        )}
      </div>

      </div>

      {/* RIGHT: Settings & Presets */}
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="glass-panel p-3 rounded-xl border border-zinc-200/60 mb-4 flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-500 truncate max-w-[120px] sm:max-w-[180px]" title={file.name}>{file.name}</span>
            <span className="text-xs font-semibold text-zinc-700">{originalWidth}×{originalHeight}</span>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Output Match</p>
            <p className="text-sm font-bold text-zinc-800">
              {estimating ? "Estimating..." : estimatedSize !== null ? formatFileSize(estimatedSize) : "N/A"}
            </p>
          </div>
        </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setCategory("social")}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            category === "social"
              ? "bg-white text-zinc-900 border-zinc-300"
              : "bg-white/40 text-zinc-500 border-zinc-200 hover:bg-white/70"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <Monitor size={14} />
            Social Media
          </span>
        </button>

        <button
          onClick={() => setCategory("documents")}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            category === "documents"
              ? "bg-white text-zinc-900 border-zinc-300"
              : "bg-white/40 text-zinc-500 border-zinc-200 hover:bg-white/70"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <FileText size={14} />
            Documents
          </span>
        </button>
      </div>

      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          value={presetQuery}
          onChange={(e) => setPresetQuery(e.target.value)}
          placeholder="Search presets by name or size"
          title="Search presets"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-zinc-200 bg-white/70 text-sm outline-none focus:border-blue-400"
        />
      </div>

      <div className="flex-1 overflow-y-auto mb-4 rounded-xl border border-zinc-200/50 bg-white/20 p-2 custom-scrollbar">
        <div className="flex flex-wrap gap-2 items-start justify-between content-start">
          {filteredPresets.map((preset) => {
            const key = getPresetKey(preset);
            const isActive = selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => handleSelectPreset(preset)}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all group shrink-0 w-full sm:w-[50%] lg:w-[48%] mb-2 inline-block shadow-sm ${
                  isActive
                    ? "bg-blue-50 border-blue-200 shadow-sm"
                    : "bg-white border-zinc-200/50 hover:border-zinc-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={`block font-semibold text-sm ${isActive ? "text-blue-700" : "text-zinc-800"}`}>
                    {preset.label}
                  </span>
                </div>
                <span className={`block text-xs ${isActive ? "text-blue-600" : "text-zinc-500"}`}>
                  {preset.width}×{preset.height}
                </span>
              </button>
            );
          })}
        </div>

        {filteredPresets.length === 0 && (
          <p className="text-sm text-zinc-500 py-4 text-center">No preset found. Try another keyword.</p>
        )}
      </div>

      <div className="glass-panel p-4 rounded-xl border border-zinc-200/60 mb-2 bg-white/40">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">Custom Size</p>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="resize-width" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
              Width (px)
            </label>
            <input
              id="resize-width"
              title="Width in pixels"
              placeholder="Width"
              type="number"
              value={width}
              min={1}
              max={10000}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
              className="w-full bg-white border border-zinc-200/80 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono"
            />
          </div>

          <button
            onClick={() => setKeepAspect((value) => !value)}
            className={`h-[38px] w-[38px] rounded-xl mb-[1px] flex items-center justify-center transition-all ${
              keepAspect
                ? "bg-blue-50 text-blue-600 border border-blue-200 shadow-sm"
                : "bg-white text-zinc-400 border border-zinc-200 hover:bg-zinc-50 hover:text-zinc-600"
            }`}
            title={keepAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
          >
            {keepAspect ? <Lock size={14} /> : <Unlock size={14} />}
          </button>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="resize-height" className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">
              Height (px)
            </label>
            <input
              id="resize-height"
              title="Height in pixels"
              placeholder="Height"
              type="number"
              value={height}
              min={1}
              max={10000}
              onChange={(e) => handleHeightChange(Number(e.target.value))}
              className="w-full bg-white border border-zinc-200/80 rounded-xl px-4 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-mono"
            />
          </div>
        </div>

        </div>

        <p className="text-xs text-zinc-500 mt-4 text-center pb-2">
          {originalWidth}×{originalHeight} → {width}×{height}
        </p>

        <div className="mt-4 flex justify-between gap-4">
          <button
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 w-full hover:-translate-y-0.5"
          >
            <Download size={18} />
            Download Resized
          </button>
        </div>
      </div>
    </div>
  );
}
