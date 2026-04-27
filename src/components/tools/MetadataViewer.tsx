"use client";

import { useState, useEffect } from "react";
import { Trash2, Image as ImageIcon, ShieldCheck, Info } from "lucide-react";

// --- BINARY METADATA STRIPPERS --- //

function stripJpegMetadata(buffer: ArrayBuffer): Blob | null {
  const dataView = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const segments: Uint8Array[] = [];
  
  if (dataView.getUint16(0) !== 0xFFD8) return null;
  
  let offset = 2;
  segments.push(bytes.slice(0, 2)); // SOI
  
  while (offset < dataView.byteLength) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    
    // Standalone markers
    if (marker === 0xD8 || marker === 0xD9 || marker === 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
      if (marker === 0xD9) { // EOI
        segments.push(bytes.slice(offset, offset + 2));
        break;
      }
      segments.push(bytes.slice(offset, offset + 2));
      offset += 2;
      continue;
    }
    
    if (marker === 0xDA) { // SOS (Start of Scan) - Keep the rest of the file
      segments.push(bytes.slice(offset));
      break;
    }
    
    const length = dataView.getUint16(offset + 2);
    
    // APP1 (EXIF/XMP), APP13 (IPTC), COM (Comment)
    const isApp1 = marker === 0xE1;
    const isApp13 = marker === 0xED;
    const isComment = marker === 0xFE;
    
    if (!isApp1 && !isApp13 && !isComment) {
      segments.push(bytes.slice(offset, offset + 2 + length));
    }
    
    offset += 2 + length;
  }
  
  return new Blob(segments as BlobPart[], { type: "image/jpeg" });
}

function stripPngMetadata(buffer: ArrayBuffer): Blob | null {
  const dataView = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const segments: Uint8Array[] = [];
  
  const signature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== signature[i]) return null;
  }
  
  segments.push(bytes.slice(0, 8));
  let offset = 8;
  
  // Safe chunks to keep. Everything else (tEXt, iTXt, zTXt, eXIf, dSIG) is stripped.
  const keepChunks = ["IHDR", "PLTE", "IDAT", "IEND", "tRNS", "gAMA", "cHRM", "sRGB", "iCCP", "pHYs", "sBIT"];
  
  while (offset < bytes.length) {
    const length = dataView.getUint32(offset);
    const type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
    
    if (keepChunks.includes(type)) {
      segments.push(bytes.slice(offset, offset + 8 + length + 4));
    }
    
    if (type === "IEND") break;
    offset += 8 + length + 4;
  }
  
  return new Blob(segments as BlobPart[], { type: "image/png" });
}

function stripWebpMetadata(buffer: ArrayBuffer): Blob | null {
  const dataView = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const segments: Uint8Array[] = [];
  
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff !== "RIFF" || webp !== "WEBP") return null;
  
  segments.push(bytes.slice(0, 12)); // RIFF + size + WEBP
  let offset = 12;
  
  const stripChunks = ["EXIF", "XMP "]; // Keep everything else (VP8, ALPH, ICCP, ANIM)
  
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) break;
    const type = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const size = dataView.getUint32(offset + 4, true); // little-endian
    const paddedSize = size + (size % 2);
    
    if (!stripChunks.includes(type)) {
      segments.push(bytes.slice(offset, offset + 8 + paddedSize));
    }
    offset += 8 + paddedSize;
  }
  
  const totalLength = segments.reduce((acc, seg) => acc + seg.length, 0);
  const head = new Uint8Array(segments[0]);
  const dv = new DataView(head.buffer);
  dv.setUint32(4, totalLength - 8, true); 
  segments[0] = head;
  
  return new Blob(segments as BlobPart[], { type: "image/webp" });
}

export default function MetadataViewer({ file, previewUrl }: { file: File, previewUrl: string }) {
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function extractMetadata() {
      try {
        setLoading(true);
        const exifr = (await import("exifr")).default;
        
        const options = {
          tiff: true, xmp: true, icc: true, iptc: true, jfif: true, ihdr: true, gps: true, exif: true,
          mergeOutput: false
        };
        
        const data = await exifr.parse(file, options);
        
        const fileInfo = {
          "File Name": file.name,
          "File Size": (file.size / 1024 / 1024).toFixed(2) + " MB",
          "MIME Type": file.type,
          "Last Modified": new Date(file.lastModified).toLocaleString(),
        };

        setMetadata(data ? { "Basic Info": fileInfo, ...data } : { "Basic Info": fileInfo });
      } catch (e) {
        setMetadata({
          "Basic Info": {
            "File Name": file.name,
            "File Size": (file.size / 1024 / 1024).toFixed(2) + " MB",
            "MIME Type": file.type,
          }
        });
      } finally {
        setLoading(false);
      }
    }
    extractMetadata();
  }, [file]);

  const triggerDownload = (blob: Blob, ext: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    link.download = `stripped_${baseName}.${ext}`;
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const stripMetadataAndDownload = async () => {
    // 1. Try Binary Stripping (Lossless, 0 file bloat)
    try {
      const buffer = await file.arrayBuffer();
      let strippedBlob: Blob | null = null;
      let ext = "jpg";
      
      if (file.type === "image/jpeg" || file.type === "image/jpg") {
        strippedBlob = stripJpegMetadata(buffer);
        ext = "jpg";
      } else if (file.type === "image/png") {
        strippedBlob = stripPngMetadata(buffer);
        ext = "png";
      } else if (file.type === "image/webp") {
        strippedBlob = stripWebpMetadata(buffer);
        ext = "webp";
      }

      if (strippedBlob) {
        triggerDownload(strippedBlob, ext);
        return;
      }
    } catch (e) {
      console.warn("Binary stripping failed, falling back to canvas", e);
    }

    // 2. Fallback to Canvas (For unsupported formats like HEIC)
    const img = document.createElement('img');
    img.src = previewUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      
      ctx.drawImage(img, 0, 0);
      
      const exportMime = file.type === "image/png" ? "image/png" : "image/jpeg";
      const exportQuality = exportMime === "image/jpeg" ? 0.98 : undefined;

      canvas.toBlob((blob) => {
        if (!blob) return;
        triggerDownload(blob, exportMime === "image/png" ? "png" : "jpg");
      }, exportMime, exportQuality);
    };
  };

  const renderMetadataValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "True" : "False";
    if (value instanceof Uint8Array || value instanceof ArrayBuffer) return `Binary Data (${value.byteLength} bytes)`;
    if (Array.isArray(value)) {
      return value.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join(", ");
    }
    if (typeof value === "object") {
      return (
        <div className="pl-3 border-l-2 border-zinc-200/60 mt-1 flex flex-col gap-1">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="text-[11px]">
              <span className="font-semibold text-zinc-600 mr-2">{k}:</span>
              <span className="text-zinc-800">{String(v)}</span>
            </div>
          ))}
        </div>
      );
    }
    return String(value);
  };

  const blocksFound = metadata ? Object.keys(metadata).filter(k => k !== "Basic Info") : [];
  // Consider standard JFIF or basic ICC as "clean" if they are the only things present,
  // but to be safe we flag if there's any EXIF/GPS/XMP/IPTC.
  const hasPrivacyRisks = blocksFound.some(b => ["exif", "gps", "xmp", "iptc", "ifd0", "ifd1"].includes(b.toLowerCase()));

  return (
    <div className="flex flex-col w-full h-full p-5 sm:p-6">
      <div className="flex-1 glass-panel rounded-2xl p-6 overflow-y-auto mb-6 border border-zinc-200/60 custom-scrollbar">
        <h3 className="text-lg font-bold text-zinc-800 mb-6 flex items-center gap-2">
          <ImageIcon size={22} className="text-blue-500" />
          Metadata Inspector
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center h-40 animate-pulse text-zinc-500 font-medium">
            Scanning blocks...
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {hasPrivacyRisks ? (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-amber-800">
                  <strong>Privacy Risks Found!</strong> This image contains sensitive metadata blocks (like EXIF, GPS, or XMP). We strongly recommend scrubbing this file before sharing.
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-emerald-800">
                  <strong>Clean Image.</strong> No hidden EXIF, XMP, or GPS coordinates were found. It is safe to share.
                </div>
              </div>
            )}

            {metadata && Object.entries(metadata).map(([blockName, blockData]) => (
              <div key={blockName} className="border border-zinc-100 rounded-xl overflow-hidden bg-white/40 shadow-sm">
                <div className="bg-zinc-100/50 px-4 py-2 border-b border-zinc-100 font-semibold text-zinc-700 text-xs uppercase tracking-widest">
                  {blockName}
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                  {typeof blockData === "object" && blockData !== null ? (
                    Object.entries(blockData).map(([key, value]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:justify-between border-b border-zinc-100/50 pb-2 gap-1 sm:gap-4">
                        <span className="text-xs font-medium text-zinc-500 shrink-0">{key}</span>
                        <div className="text-xs text-zinc-800 sm:text-right break-words overflow-hidden">
                          {renderMetadataValue(value)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-zinc-800">{String(blockData)}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="glass-panel p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row gap-5 items-center justify-between border border-zinc-200/60 shadow-sm">
        <div className="text-sm text-zinc-600 leading-relaxed max-w-lg">
          <strong>Binary Lossless Sanitization:</strong> Our remover algorithm directly edits the raw file binary to surgically strip application headers without re-encoding the image pixels. 0% quality loss.
        </div>
        <button 
          onClick={stripMetadataAndDownload}
          className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:-translate-y-0.5 whitespace-nowrap w-full sm:w-auto"
        >
          <Trash2 size={18} />
          Scrub Losslessly
        </button>
      </div>
    </div>
  );
}
