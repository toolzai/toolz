"use client";

import { useState, useEffect } from "react";
import { Flame, Zap, Skull, Key, X, Copy, RefreshCw, Cpu, Globe, ChevronDown } from "lucide-react";

// ─── Intensity Presets ────────────────────────────────────────────────────

const INTENSITY_CONFIG = {
  mild: {
    label: "Mild",
    icon: Flame,
    color: "text-yellow-500",
    bg: "bg-yellow-50 border-yellow-200",
    prompt: "You are a witty but friendly design critic reviewing this image. Instead of listing points, give me a single, cohesive, naturally conversational paragraph. Lightly roast the funny or quirky design choices, but keep it playful and encouraging. Make it sound like a human friend teasing me. End with a genuine compliment.",
  },
  medium: {
    label: "Medium",
    icon: Zap,
    color: "text-orange-500",
    bg: "bg-orange-50 border-orange-200",
    prompt: "You are a sarcastic design critic reviewing this image. Give me a single, punchy, continuous paragraph of roasting. Call out bad spacing, color crimes, or font disasters. Be funny and sharp, but do not use bullet points or lists. Make it sound completely natural and conversational, like a real human roasting a design on Twitter. End with one clever backhanded compliment.",
  },
  savage: {
    label: "Savage",
    icon: Skull,
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
    prompt: "You are a ruthless, Gordon-Ramsay-level design critic. Utterly destroy this image in a single, continuous, devastatingly hilarious paragraph. Absolutely NO bullet points, lists, or generic AI phrasing. Call out every flaw with dramatic metaphors and savage wit. Make it feel raw, human, and absolutely ruthless. End with a crushing but funny concluding sentence.",
  },
};

type Intensity = keyof typeof INTENSITY_CONFIG;

const LANGUAGES = ["English", "Hindi", "Hinglish", "French", "Russian", "German"];
const VIBES = ["Default", "Gen Z", "Pirate", "Shakespearean", "Tech Bro", "Passive Aggressive", "Boomer"];

// ─── Groq Configuration ───────────────────────────────────────────────────

const GROQ_CONFIG = {
  label: "Groq",
  baseUrl: "https://api.groq.com/openai/v1",
  format: "openai" as const,
  placeholder: "gsk_...",
  keyLink: "https://console.groq.com/keys",
  model: "meta-llama/llama-4-scout-17b-16e-instruct",
};

// ─── Persisted config ─────────────────────────────────────────────────────

interface SavedConfig {
  apiKey: string;
}

function loadConfig(): SavedConfig {
  try {
    const raw = localStorage.getItem("roast-engine-config");
    if (raw) {
      const parsed = JSON.parse(raw);
      return { apiKey: parsed.apiKey || "" };
    }
  } catch {}
  return { apiKey: "" };
}

function saveConfig(cfg: SavedConfig) {
  localStorage.setItem("roast-engine-config", JSON.stringify(cfg));
}

// ─── Component ────────────────────────────────────────────────────────────

interface Props {
  file: File;
  previewUrl: string;
}

export default function RoastEngine({ file, previewUrl }: Props) {
  const [intensity, setIntensity] = useState<Intensity>("medium");
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState("English");
  const [vibe, setVibe] = useState("Default");
  const [showFullImage, setShowFullImage] = useState(false);

  const [apiKey, setApiKey] = useState("");

  // Results
  const [isRoasting, setIsRoasting] = useState(false);
  const [roastText, setRoastText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    const cfg = loadConfig();
    setApiKey(cfg.apiKey || "");
    if (!cfg.apiKey) setShowSettings(true);
  }, []);

  const provider = GROQ_CONFIG;
  const effectiveModel = provider.model;
  const effectiveBaseUrl = provider.baseUrl;

  const handleSaveSettings = () => {
    saveConfig({ apiKey });
    setShowSettings(false);
  };

  // ─── Image encoding ──────────────────────────────────────────────────

  const imageToBase64 = (url: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = document.createElement("img");
      img.crossOrigin = "anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1024;
        const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
    });
  };

  // ─── API call ─────────────────────────────────────────────────────────

  const handleRoast = async () => {
    if (!apiKey) {
      setShowSettings(true);
      return;
    }

    setIsRoasting(true);
    setError("");
    setRoastText("");

    try {
      const dataUrl = await imageToBase64(previewUrl);
      const base64 = dataUrl.split(",")[1];
      const basePrompt = INTENSITY_CONFIG[intensity].prompt;
      
      const langInstruction = (language === "Hindi" || language === "Hinglish")
        ? "Hinglish (a highly conversational mix of Hindi and English, written in the Latin/English alphabet)"
        : `the ${language} language`;

      const prompt = `${basePrompt}
      
CRITICAL INSTRUCTIONS:
- You MUST write the entire roast in ${langInstruction}.
- You MUST adopt the persona and vibe of: ${vibe === "Default" ? "a modern, sarcastic design critic" : vibe}. Use their slang, tone, and mannerisms extensively.`;

      let response: Response;

      if (provider.format === "gemini") {
        // ── Gemini native format ──────────────────────────────────────
        response = await fetch(
          `${effectiveBaseUrl}/models/${effectiveModel}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: base64 } }] }],
              generationConfig: { temperature: 1.0, maxOutputTokens: 800 },
            }),
          }
        );
      } else {
        // ── OpenAI-compatible format (works with all other providers) ─
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        };

        response = await fetch(`${effectiveBaseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: effectiveModel,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: prompt },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            max_tokens: 800,
          }),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = errData?.error?.message || `API Error ${response.status}`;
        if (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate")) {
          throw new Error("Rate limit hit — wait a moment or switch to another provider/model.");
        }
        if (msg.toLowerCase().includes("must be a string") || msg.toLowerCase().includes("does not support image")) {
          throw new Error("The selected model does not support images! Please select a Vision-capable model.");
        }
        throw new Error(msg);
      }

      const data = await response.json();
      const text =
        provider.format === "gemini"
          ? data.candidates?.[0]?.content?.parts?.[0]?.text
          : data.choices?.[0]?.message?.content;

      if (!text) throw new Error("Empty response. Try a different model.");
      setRoastText(text);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setIsRoasting(false);
    }
  };

  const copyRoast = () => {
    navigator.clipboard.writeText(roastText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col w-full h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>

      {/* ── Settings Panel (collapsible) ───────────────────────────────── */}
      {showSettings && (
        <div className="glass-panel p-5 rounded-3xl border border-orange-200/80 shadow-sm mb-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Key size={16} className="text-orange-500" />
              <h3 className="text-sm font-bold text-zinc-800">API Configuration</h3>
            </div>
            {apiKey && (
              <button onClick={() => setShowSettings(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={16} /></button>
            )}
          </div>


          {/* API key */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest">API Key</span>
              {provider.keyLink && (
                <a href={provider.keyLink} target="_blank" rel="noopener" className="text-[9px] font-bold text-orange-600 hover:text-orange-700 transition-colors">
                  Get key →
                </a>
              )}
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider.placeholder}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
            />
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={!apiKey.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white py-2.5 rounded-xl font-bold transition-all text-sm"
          >
            Save Configuration
          </button>
        </div>
      )}

      {/* ── Image Preview + Controls ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-5 mb-5">
        <div 
          className="w-full sm:w-48 h-36 rounded-2xl overflow-hidden border border-zinc-200/50 shrink-0 bg-zinc-50 relative cursor-pointer group hover:border-orange-300 transition-colors"
          onClick={() => setShowFullImage(true)}
        >
          <img src={previewUrl} alt="Target" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
             <span className="opacity-0 group-hover:opacity-100 text-white font-bold text-[10px] tracking-widest uppercase px-3 py-1.5 bg-black/50 rounded-full backdrop-blur-sm transition-opacity">View Full</span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-wide">{provider.label}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-3">
          {/* Language & Vibe */}
          <div className="flex gap-2">
            <div className="flex-1">
              <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest block mb-1.5">Language</span>
              <div className="relative">
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 text-[10px] font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/60 appearance-none cursor-pointer"
                >
                  {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
            <div className="flex-1">
              <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest block mb-1.5">Vibe</span>
              <div className="relative">
                <select 
                  value={vibe} 
                  onChange={(e) => setVibe(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 text-[10px] font-bold text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white/60 appearance-none cursor-pointer"
                >
                  {VIBES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Intensity */}
          <div>
            <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-widest block mb-1.5">Intensity</span>
            <div className="flex gap-2">
              {(Object.entries(INTENSITY_CONFIG) as [Intensity, (typeof INTENSITY_CONFIG)[Intensity]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setIntensity(key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-[10px] transition-all border ${
                      intensity === key ? cfg.bg + " " + cfg.color : "bg-white/60 border-zinc-200 text-zinc-500 hover:bg-white"
                    }`}
                  >
                    <Icon size={14} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model badge + Roast button */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200/60 overflow-hidden">
              <Cpu size={12} className="text-zinc-400 shrink-0" />
              <span className="text-[10px] font-bold text-zinc-600 truncate">{effectiveModel || "No model"}</span>
            </div>
            <button
              onClick={handleRoast}
              disabled={isRoasting || !apiKey}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm shrink-0"
            >
              {isRoasting ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Flame size={16} />
              )}
              {isRoasting ? "Working..." : "Roast 🔥"}
            </button>
          </div>

          {/* Settings link */}
          <button
            onClick={() => setShowSettings(true)}
            className="text-[10px] font-bold text-orange-600 hover:text-orange-700 transition-colors flex items-center gap-1 self-start"
          >
            <Key size={10} /> Change API key
          </button>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs mb-4">
          <p className="font-bold mb-1">Error</p>
          <p className="opacity-80 leading-relaxed">{error}</p>
        </div>
      )}

      {/* ── Roast Output ──────────────────────────────────────────────── */}
      {roastText && (
        <div className="glass-panel p-6 rounded-3xl border border-zinc-200/60 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame size={16} className="text-orange-500" />
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">The Roast</span>
            </div>
            <div className="flex gap-1">
              <button onClick={handleRoast} className="p-2 text-zinc-400 hover:text-zinc-800 transition-colors rounded-lg hover:bg-zinc-100" title="Re-roast"><RefreshCw size={15} /></button>
              <button onClick={copyRoast} className="p-2 text-zinc-400 hover:text-zinc-800 transition-colors rounded-lg hover:bg-zinc-100" title="Copy"><Copy size={15} /></button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none text-zinc-700 leading-relaxed whitespace-pre-wrap font-medium">
            {roastText}
          </div>
          {copied && (
            <p className="text-[10px] text-green-600 font-bold mt-3 uppercase tracking-wider">✓ Copied to clipboard</p>
          )}
        </div>
      )}
      {/* ── Full Image Popup ──────────────────────────────────────────── */}
      {showFullImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setShowFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <button 
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all backdrop-blur-md"
              onClick={() => setShowFullImage(false)}
            >
              <X size={20} />
            </button>
            <img 
              src={previewUrl} 
              alt="Full screen preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" 
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
