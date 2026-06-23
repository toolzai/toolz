'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Sparkles, Plus, Check } from 'lucide-react';

const AVAILABLE_TOOLS = [
  "Image Upscaler",
  "Image Resizer",
  "Object Eraser",
  "VHS Filter",
  "CRT Filter",
  "Box Shadow Generator",
  "ASCII Art Generator",
  "AI Roast"
];

// Regex to detect links (http, https, www)
const LINK_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
// Regex to detect emojis
const EMOJI_REGEX = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;

function isInvalidContent(text: string): { invalid: boolean; reason?: string } {
  if (LINK_REGEX.test(text)) return { invalid: true, reason: 'Links are not allowed in the suggestion box.' };
  if (EMOJI_REGEX.test(text)) return { invalid: true, reason: 'Emojis are not allowed in the suggestion box.' };
  if (text.includes('<') || text.includes('>')) return { invalid: true, reason: 'HTML tags are not allowed.' };
  return { invalid: false };
}

export default function SuggestionBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleTool = (toolName: string) => {
    setSelectedTools((prev) => 
      prev.includes(toolName) ? prev.filter(t => t !== toolName) : [...prev, toolName]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Client-side validation
    if (!feedback.trim()) {
      setStatus({ type: 'error', message: 'Feedback cannot be empty.' });
      return;
    }

    const validation = isInvalidContent(feedback);
    if (validation.invalid) {
      setStatus({ type: 'error', message: validation.reason || 'Invalid content.' });
      return;
    }

    if (name) {
      const nameValidation = isInvalidContent(name);
      if (nameValidation.invalid) {
        setStatus({ type: 'error', message: 'Invalid characters in name.' });
        return;
      }
    }

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback, name, email, tools: selectedTools }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Failed to submit.' });
      } else {
        setStatus({ type: 'success', message: 'Thank you for your feedback!' });
        setFeedback('');
        setName('');
        setEmail('');
        setSelectedTools([]);
        // Close after a brief delay
        setTimeout(() => {
          setIsOpen(false);
          setStatus(null);
        }, 2500);
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Something went wrong. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (Bottom Left) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-5 py-3.5 bg-white/80 backdrop-blur-md border border-white/40 text-neutral-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.16)] transition-all focus:outline-none focus:ring-4 focus:ring-neutral-200"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOpen(true)}
            aria-label="Give feedback"
          >
            <MessageSquare className="w-5 h-5 text-neutral-700" />
            <span className="font-medium text-sm">Feedback</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modal Overlay & Container */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Soft invisible backdrop to capture outside clicks */}
            <motion.div
              className="fixed inset-0 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              className="fixed bottom-6 left-6 z-50 w-[calc(100vw-3rem)] max-w-[380px] glass-panel rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col border border-white/60 bg-white/40 backdrop-blur-xl"
              initial={{ opacity: 0, y: 40, scale: 0.95, transformOrigin: 'bottom left' }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Decorative top gradient line */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-80" />

              {/* Header */}
              <div className="px-6 pt-6 pb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl text-neutral-900 tracking-tight flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Share your thoughts
                  </h3>
                  <p className="text-sm text-neutral-500 mt-1.5 font-medium">
                    Help us improve by sharing feedback or reporting bugs.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 -mr-2 -mt-2 bg-white/50 text-neutral-500 rounded-full hover:bg-white hover:text-neutral-900 transition-all shadow-sm border border-white/60"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pb-6 overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Feedback Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label htmlFor="feedback" className="block text-[13px] font-semibold text-neutral-700">
                        Feedback <span className="text-red-400">*</span>
                      </label>
                    </div>

                    {/* Tool Selection Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {AVAILABLE_TOOLS.map((tool) => {
                        const isSelected = selectedTools.includes(tool);
                        return (
                          <button
                            key={tool}
                            type="button"
                            onClick={() => toggleTool(tool)}
                            className={`flex items-center gap-1 px-2.5 py-1 border rounded-full text-[11px] font-medium transition-colors shadow-sm ${
                              isSelected 
                                ? 'bg-green-100/90 border-green-300 text-green-800' 
                                : 'bg-white/60 hover:bg-white/90 border-white/80 text-neutral-600 hover:text-neutral-900'
                            }`}
                          >
                            {isSelected ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                            {tool}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      id="feedback"
                      ref={textareaRef}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="I would love to see a feature that..."
                      className="w-full px-4 py-3 bg-white/70 border border-white/80 rounded-2xl focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 focus:border-purple-400 resize-none h-32 text-neutral-800 placeholder:text-neutral-400 shadow-inner transition-all text-sm leading-relaxed"
                      required
                      maxLength={1000}
                    />
                    <p className="text-[11px] font-medium text-neutral-400 ml-1">Pure text only. Links and emojis are restricted.</p>
                  </div>

                  {/* Name Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="name" className="block text-[13px] font-semibold text-neutral-700 ml-1">
                      Name <span className="text-neutral-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-4 py-2.5 bg-white/70 border border-white/80 rounded-xl focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 focus:border-purple-400 text-neutral-800 placeholder:text-neutral-400 shadow-inner transition-all text-sm"
                      maxLength={100}
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-[13px] font-semibold text-neutral-700 ml-1">
                      Email <span className="text-neutral-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full px-4 py-2.5 bg-white/70 border border-white/80 rounded-xl focus:outline-none focus:ring-[3px] focus:ring-purple-500/20 focus:border-purple-400 text-neutral-800 placeholder:text-neutral-400 shadow-inner transition-all text-sm"
                    />
                  </div>

                  {/* Status Message */}
                  <AnimatePresence>
                    {status && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-4 py-3 rounded-xl text-sm font-medium border ${
                          status.type === 'error' 
                            ? 'bg-red-50/80 border-red-200 text-red-600' 
                            : 'bg-green-50/80 border-green-200 text-green-600'
                        }`}>
                          {status.message}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading || !feedback.trim()}
                    className="w-full relative overflow-hidden group flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all shadow-md active:scale-[0.98] mt-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span className="relative z-10 flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Send Feedback
                        </span>
                        {/* Hover flare effect */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite] z-0" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
