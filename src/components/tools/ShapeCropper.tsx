"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Square, Circle, Triangle, Star, Heart, Hexagon, Diamond, RectangleHorizontal, MousePointer2 } from "lucide-react";
import clsx from "clsx";
import { Slider } from "../ui/Slider";

type ShapeId = "square" | "circle" | "triangle" | "star" | "heart" | "hexagon" | "diamond" | "rectangle";

interface ShapeDef {
  id: ShapeId;
  name: string;
  icon: any;
  baseAspect: number; // width / height
  drawPath: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
}

const SHAPES: ShapeDef[] = [
  { id: "square", name: "Square", icon: Square, baseAspect: 1, drawPath: (ctx, w, h) => ctx.rect(0, 0, w, h) },
  { id: "circle", name: "Circle", icon: Circle, baseAspect: 1, drawPath: (ctx, w, h) => ctx.arc(w/2, h/2, Math.min(w,h)/2, 0, Math.PI * 2) },
  { id: "triangle", name: "Triangle", icon: Triangle, baseAspect: 1, drawPath: (ctx, w, h) => { ctx.moveTo(w/2, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); } },
  { id: "star", name: "Star", icon: Star, baseAspect: 1, drawPath: (ctx, w, h) => {
      const pts = [ [50,0], [61,35], [98,35], [68,57], [79,91], [50,70], [21,91], [32,57], [2,35], [39,35] ];
      ctx.moveTo((pts[0][0]/100)*w, (pts[0][1]/100)*h);
      for(let i=1; i<pts.length; i++) ctx.lineTo((pts[i][0]/100)*w, (pts[i][1]/100)*h);
      ctx.closePath();
    }
  },
  { id: "heart", name: "Heart", icon: Heart, baseAspect: 1, drawPath: (ctx, w, h) => {
      const x = w/2, y = h/4;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x, 0, 0, 0, 0, y);
      ctx.bezierCurveTo(0, h*0.6, x, h, x, h);
      ctx.bezierCurveTo(x, h, w, h*0.6, w, y);
      ctx.bezierCurveTo(w, 0, x, 0, x, y);
      ctx.closePath();
    }
  },
  { id: "hexagon", name: "Hexagon", icon: Hexagon, baseAspect: 1, drawPath: (ctx, w, h) => {
      const pts = [ [50,0], [93.3,25], [93.3,75], [50,100], [6.7,75], [6.7,25] ];
      ctx.moveTo((pts[0][0]/100)*w, (pts[0][1]/100)*h);
      for(let i=1; i<pts.length; i++) ctx.lineTo((pts[i][0]/100)*w, (pts[i][1]/100)*h);
      ctx.closePath();
    }
  },
  { id: "diamond", name: "Diamond", icon: Diamond, baseAspect: 1, drawPath: (ctx, w, h) => { ctx.moveTo(w/2, 0); ctx.lineTo(w, h/2); ctx.lineTo(w/2, h); ctx.lineTo(0, h/2); ctx.closePath(); } },
  { id: "rectangle", name: "Rectangle", icon: RectangleHorizontal, baseAspect: 16/9, drawPath: (ctx, w, h) => ctx.rect(0, 0, w, h) }
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

const CANVAS_SIZE = 800; // High res internal canvas for crisp preview

export default function ShapeCropper({ file, previewUrl }: { file: File, previewUrl: string }) {
  const [shapeId, setShapeId] = useState<ShapeId>("square");
  const [zoom, setZoom] = useState(1);
  const [stretch, setStretch] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const [imgStretchX, setImgStretchX] = useState(1);
  const [imgStretchY, setImgStretchY] = useState(1);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startPanX: number; startPanY: number } | null>(null);

  // Load Image Once
  useEffect(() => {
    loadImage(previewUrl).then(setImageObj);
  }, [previewUrl]);

  // Compute Layout Parameters
  const activeShape = SHAPES.find(s => s.id === shapeId)!;
  const currentAspect = activeShape.baseAspect * stretch;

  // Render to Canvas whenever params change
  useEffect(() => {
    if (!canvasRef.current || !imageObj) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw light checkerboard/solid background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate Shape Dimensions
    const padding = 60;
    const maxW = CANVAS_SIZE - padding * 2;
    const maxH = CANVAS_SIZE - padding * 2;

    let shapeW = maxW;
    let shapeH = shapeW / currentAspect;
    if (shapeH > maxH) {
      shapeH = maxH;
      shapeW = shapeH * currentAspect;
    }

    const shapeX = (CANVAS_SIZE - shapeW) / 2;
    const shapeY = (CANVAS_SIZE - shapeH) / 2;

    // Calculate Image Transform
    const coverScale = Math.max(shapeW / imageObj.naturalWidth, shapeH / imageObj.naturalHeight) * zoom;
    const imgDrawW = imageObj.naturalWidth * coverScale * imgStretchX;
    const imgDrawH = imageObj.naturalHeight * coverScale * imgStretchY;
    
    // Pan range mapping
    const panRangeX = imgDrawW / 2;
    const panRangeY = imgDrawH / 2;
    
    const finalImgX = shapeX + (shapeW - imgDrawW) / 2 + (panX / 100) * panRangeX;
    const finalImgY = shapeY + (shapeH - imgDrawH) / 2 + (panY / 100) * panRangeY;

    // 1. Draw blurred, dark version of image outside shape for context
    ctx.globalAlpha = 0.3;
    ctx.drawImage(imageObj, finalImgX, finalImgY, imgDrawW, imgDrawH);
    ctx.globalAlpha = 1.0;

    // 2. Draw Shape and Clip
    ctx.save();
    ctx.beginPath();
    ctx.translate(shapeX, shapeY);
    activeShape.drawPath(ctx, shapeW, shapeH);
    ctx.translate(-shapeX, -shapeY);
    ctx.clip();

    // 3. Draw full-brightness image inside shape
    ctx.drawImage(imageObj, finalImgX, finalImgY, imgDrawW, imgDrawH);
    ctx.restore();

    // 4. Draw Shape Outline
    ctx.save();
    ctx.beginPath();
    ctx.translate(shapeX, shapeY);
    activeShape.drawPath(ctx, shapeW, shapeH);
    ctx.translate(-shapeX, -shapeY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();

  }, [imageObj, shapeId, zoom, stretch, panX, panY, currentAspect, activeShape, imgStretchX, imgStretchY]);

  // Drag Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStartRef.current = { clientX: e.clientX, clientY: e.clientY, startPanX: panX, startPanY: panY };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStartRef.current || !canvasRef.current || !imageObj) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const deltaX = e.clientX - dragStartRef.current.clientX;
    const deltaY = e.clientY - dragStartRef.current.clientY;

    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;

    // Estimate pan scaling
    const coverScale = Math.max((CANVAS_SIZE * 0.8) / imageObj.naturalWidth, (CANVAS_SIZE * 0.8) / imageObj.naturalHeight) * zoom;
    const panRangeX = (imageObj.naturalWidth * coverScale * imgStretchX) / 2;
    const panRangeY = (imageObj.naturalHeight * coverScale * imgStretchY) / 2;

    const newPanX = dragStartRef.current.startPanX + ((deltaX * scaleX) / panRangeX) * 100;
    const newPanY = dragStartRef.current.startPanY + ((deltaY * scaleY) / panRangeY) * 100;

    setPanX(clamp(newPanX, -100, 100));
    setPanY(clamp(newPanY, -100, 100));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleDownload = async () => {
    if (!imageObj) return;

    // Export at original resolution scale
    const padding = 60;
    const maxW = CANVAS_SIZE - padding * 2;
    const maxH = CANVAS_SIZE - padding * 2;

    let shapeW = maxW;
    let shapeH = shapeW / currentAspect;
    if (shapeH > maxH) {
      shapeH = maxH;
      shapeW = shapeH * currentAspect;
    }

    const exportScale = Math.max(imageObj.naturalWidth / shapeW, imageObj.naturalHeight / shapeH);
    const exportW = shapeW * exportScale;
    const exportH = shapeH * exportScale;

    const canvas = document.createElement("canvas");
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw Shape
    ctx.beginPath();
    activeShape.drawPath(ctx, exportW, exportH);
    ctx.clip();

    // Draw Image
    const coverScale = Math.max(shapeW / imageObj.naturalWidth, shapeH / imageObj.naturalHeight) * zoom;
    const imgDrawW = imageObj.naturalWidth * coverScale * exportScale * imgStretchX;
    const imgDrawH = imageObj.naturalHeight * coverScale * exportScale * imgStretchY;
    const panRangeX = imgDrawW / 2;
    const panRangeY = imgDrawH / 2;

    const finalImgX = (shapeW - (imageObj.naturalWidth * coverScale * imgStretchX)) / 2 * exportScale + (panX / 100) * panRangeX;
    const finalImgY = (shapeH - (imageObj.naturalHeight * coverScale * imgStretchY)) / 2 * exportScale + (panY / 100) * panRangeY;

    ctx.drawImage(imageObj, finalImgX, finalImgY, imgDrawW, imgDrawH);

    const link = document.createElement("a");
    link.download = `shaped_${file.name.replace(/\.[^/.]+$/, "")}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  };


  return (
    <div className="flex flex-col lg:flex-row w-full h-full">
      {/* Left: Interactive Canvas */}
      <div className="flex-[1.5] p-5 sm:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-zinc-200/60 flex items-center justify-center bg-black/5 rounded-tl-3xl lg:rounded-bl-3xl">
        <div className="relative w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden shadow-sm border border-zinc-200 bg-white/40">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className={`w-full h-full block touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          />
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur-md text-zinc-700 border border-zinc-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 pointer-events-none shadow-sm">
            <MousePointer2 size={12} />
            Drag to pan
          </div>
        </div>
      </div>
      
      {/* Right: Controls */}
      <div className="flex-1 p-5 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="glass-panel p-5 rounded-2xl flex flex-col gap-6 border border-zinc-200/60 mb-6">
          
          {/* Shapes Grid */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Select Shape</label>
            <div className="flex flex-wrap gap-2">
              {SHAPES.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setShapeId(s.id); setStretch(1); }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 min-w-[72px] transition-all ${
                    shapeId === s.id ? "bg-blue-50 border-blue-300 text-blue-700 shadow-sm" : "bg-white/60 border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-white"
                  }`}
                  title={s.name}
                >
                  <s.icon size={20} className={shapeId === s.id ? "stroke-[2.5px]" : "stroke-2"} />
                  <span className="text-[10px] font-bold">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          <hr className="border-zinc-200/60" />

          {/* Adjustments */}
          <div className="flex flex-col gap-5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">Adjustments</label>
            
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-zinc-600">Zoom</label>
                <span className="text-[11px] font-bold text-zinc-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-zinc-100">{zoom.toFixed(2)}x</span>
              </div>
              <Slider value={zoom} min={1} max={5} step={0.05} onChange={(v) => setZoom(v)} />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <label className="text-[11px] font-medium text-zinc-600">Shape Stretch</label>
                <span className="text-[11px] font-bold text-zinc-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-zinc-100">{stretch.toFixed(2)}x</span>
              </div>
              <Slider value={stretch} min={0.5} max={2.0} step={0.05} onChange={(v) => setStretch(v)} />
            </div>

            <div className="grid grid-cols-2 gap-5 pt-2">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-zinc-600">Image Stretch (H)</label>
                  <span className="text-[11px] font-bold text-zinc-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-zinc-100">{imgStretchX.toFixed(2)}x</span>
                </div>
                <Slider value={imgStretchX} min={0.1} max={3.0} step={0.05} onChange={(v) => setImgStretchX(v)} />
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-medium text-zinc-600">Image Stretch (V)</label>
                  <span className="text-[11px] font-bold text-zinc-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-zinc-100">{imgStretchY.toFixed(2)}x</span>
                </div>
                <Slider value={imgStretchY} min={0.1} max={3.0} step={0.05} onChange={(v) => setImgStretchY(v)} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-auto flex justify-end">
          <button 
            onClick={handleDownload}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 w-full rounded-2xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5"
          >
            <Download size={20} />
            Export Shaped Image
          </button>
        </div>
      </div>
    </div>
  );
}
