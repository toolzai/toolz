"use client";

import { useState, useRef, useEffect } from "react";
import { Download, Wand2, Loader2, Sparkles } from "lucide-react";
import Image from "next/image";

export default function BackgroundRemover({ file, previewUrl }: { file: File, previewUrl: string }) {
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("Ready to cast some magic.");
  const workerRef = useRef<Worker | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Load the original image into memory
    const img = document.createElement("img");
    img.crossOrigin = "anonymous";
    img.src = previewUrl;
    img.onload = () => {
      originalImageRef.current = img;
    };

    return () => {
      // Clean up worker on unmount
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [previewUrl]);

  const handleWorkerMessage = (event: MessageEvent) => {
    const { status, data, mask, error } = event.data;

    if (status === 'progress') {
      if (data.status === 'initiate' || data.status === 'download') {
        setStatusText(`Downloading AI model...`);
      } else if (data.status === 'progress') {
        const p = Math.round(data.progress || 0);
        setProgress(p);
        setStatusText(`Downloading AI model... ${p}%`);
      } else if (data.status === 'done') {
        setStatusText("Model loaded! Extracting subject...");
        setProgress(100);
      } else if (data.status === 'ready') {
        setStatusText("Processing image...");
      }
    } else if (status === 'complete') {
      applyMask(mask);
    } else if (status === 'error') {
      console.error("Worker error:", error);
      setStatusText(`Error: ${error}`);
      setIsProcessing(false);
    }
  };

  const applyMask = (mask: { data: Uint8ClampedArray; width: number; height: number; channels: number }) => {
    try {
      if (!originalImageRef.current || !canvasRef.current) return;
      
      const img = originalImageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Create mask canvas from the raw pixel data
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = mask.width;
      maskCanvas.height = mask.height;
      const maskCtx = maskCanvas.getContext('2d');
      if (!maskCtx) return;

      // The mask data from RMBG is grayscale (1 or 4 channels).
      // We need to convert it to RGBA ImageData.
      const pixelCount = mask.width * mask.height;
      const rgba = new Uint8ClampedArray(pixelCount * 4);
      const channels = mask.channels || 1;

      for (let i = 0; i < pixelCount; i++) {
        const maskVal = mask.data[i * channels]; // grayscale alpha
        rgba[i * 4 + 0] = 255;     // R
        rgba[i * 4 + 1] = 255;     // G
        rgba[i * 4 + 2] = 255;     // B
        rgba[i * 4 + 3] = maskVal; // A (the mask value IS the alpha)
      }

      const maskImageData = new ImageData(rgba, mask.width, mask.height);
      maskCtx.putImageData(maskImageData, 0, 0);

      // Composite: keep only the masked region of the original image
      ctx.globalCompositeOperation = 'destination-in';
      ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      const finalUrl = canvas.toDataURL("image/png");
      setResultUrl(finalUrl);
      setStatusText("Background successfully removed!");
    } catch (e) {
      console.error(e);
      setStatusText("Failed to compose final image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const removeBackground = () => {
    setIsProcessing(true);
    setProgress(0);
    setStatusText("Starting AI engine...");

    // Spawn module worker from public/ directory (bypasses Turbopack)
    if (!workerRef.current) {
      workerRef.current = new Worker('/bg-worker.js', { type: 'module' });
      workerRef.current.addEventListener('message', handleWorkerMessage);
    }

    workerRef.current.postMessage({ image: previewUrl });
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const link = document.createElement("a");
    link.download = `magic_${file.name.replace(/\.[^/.]+$/, "")}.png`;
    link.href = resultUrl;
    link.click();
  };

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-hidden relative">
      <canvas ref={canvasRef} className="hidden" />

      {/* Image Display Area */}
      <div className="flex-1 min-h-0 relative mb-6 rounded-2xl overflow-hidden border border-zinc-200/50"
        style={{ background: 'repeating-conic-gradient(#f4f4f5 0% 25%, #ffffff 0% 50%) 0 0 / 20px 20px' }}
      >
        <Image 
          src={resultUrl || previewUrl} 
          alt="Preview" 
          fill 
          className="object-contain"
          unoptimized
        />
        
        {isProcessing && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-10 transition-all">
            <div className="w-16 h-16 relative flex items-center justify-center mb-6">
              <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin" 
                style={{ animationDuration: '1.5s' }}
              ></div>
              <Wand2 size={24} className="text-purple-600 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold text-zinc-800 tracking-tight mb-2">Extracting Subject</h3>
            <p className="text-sm font-medium text-purple-600 mb-6">{statusText}</p>
            
            {/* Progress Bar */}
            <div className="w-full max-w-xs bg-zinc-200/80 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-purple-600 h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="glass-panel p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-zinc-200/60 shadow-sm">
        <div className="flex flex-col">
          <h4 className="text-sm font-bold text-zinc-800 flex items-center gap-2">
            <Sparkles size={16} className="text-purple-500" />
            Zero-Gravity Cutout
          </h4>
          <p className="text-xs text-zinc-500 mt-0.5">Powered by local AI. No data leaves your browser.</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {!resultUrl ? (
            <button 
              onClick={removeBackground}
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Wand2 size={20} />}
              {isProcessing ? "Processing..." : "Remove Background"}
            </button>
          ) : (
            <>
              <button 
                onClick={() => setResultUrl(null)}
                className="bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 px-6 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
              >
                Reset
              </button>
              <button 
                onClick={handleDownload}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Export PNG
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
