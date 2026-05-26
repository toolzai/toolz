"use client";

import { useState, useRef, FormEvent } from "react";
import { MessageSquare, X, Send, CheckCircle2 } from "lucide-react";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE_ID = "service_ne83k2f";
const EMAILJS_TEMPLATE_ID = "template_bdj3h64";
const EMAILJS_PUBLIC_KEY = "l80ghDbvAlmh24eML";

const COOLDOWN_MS = 5 * 60 * 1000;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 200;

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

function stripEmoji(input: string): string {
  return input.replace(/\p{Extended_Pictographic}/gu, "");
}

function containsUrl(text: string): boolean {
  return /https?:\/\/[^\s]+|www\.[a-z0-9.-]+\.[a-z]{2,}\S*/gi.test(text);
}

function containsEmoji(text: string): boolean {
  return /\p{Extended_Pictographic}/u.test(text);
}

function sanitize(input: string): string {
  return stripHtml(input).trim();
}

export default function FeedbackForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function getRemainingCooldown(): number {
    const lastSent = localStorage.getItem("feedback_last_sent");
    if (!lastSent) return 0;
    return Math.max(0, COOLDOWN_MS - (Date.now() - parseInt(lastSent, 10)));
  }

  function setCooldown() {
    localStorage.setItem("feedback_last_sent", Date.now().toString());
  }

  function validate(): string | null {
    const sName = sanitize(name);
    const sEmail = sanitize(email);
    const sMsg = sanitize(message);

    if (!sMsg) return "Please enter your feedback.";
    if (sMsg.length > MAX_MESSAGE_LENGTH) return `Message too long (max ${MAX_MESSAGE_LENGTH} characters).`;
    if (sName.length > MAX_NAME_LENGTH) return `Name too long (max ${MAX_NAME_LENGTH} characters).`;
    if (sEmail.length > MAX_EMAIL_LENGTH) return `Email too long (max ${MAX_EMAIL_LENGTH} characters).`;
    if (sEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sEmail)) return "Please enter a valid email address.";
    if (containsUrl(sMsg)) return "URLs are not allowed in feedback. Please remove any links.";
    if (containsEmoji(sMsg)) return "Emojis are not supported. Please use plain text only.";

    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const cooldown = getRemainingCooldown();
    if (cooldown > 0) {
      setStatus("error");
      setErrorMsg(`Please wait ${Math.ceil(cooldown / 60000)} min before submitting again.`);
      return;
    }

    const validationError = validate();
    if (validationError) {
      setStatus("error");
      setErrorMsg(validationError);
      return;
    }

    const honeypot = formRef.current?.querySelector<HTMLInputElement>('input[name="honeypot"]')?.value;
    if (honeypot) return;

    setStatus("sending");
    setErrorMsg("");

    try {
      const sName = sanitize(name);
      const sEmail = sanitize(email);
      const sMsg = sanitize(message);

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          name: sName || "Anonymous",
          title: sMsg,
        },
        EMAILJS_PUBLIC_KEY
      );

      setCooldown();
      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");

      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
      }, 2000);
    } catch {
      setStatus("error");
      setErrorMsg("Failed to send. Please try again later.");
    }
  }

  function handleClose() {
    setIsOpen(false);
    setStatus("idle");
    setErrorMsg("");
  }

  function handleChange(value: string, setter: (v: string) => void) {
    setter(stripEmoji(stripHtml(value)));
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 sm:bottom-28 sm:right-8 z-[90] glass-panel rounded-full p-3 sm:p-4 text-zinc-500 hover:text-zinc-800 hover:scale-110 transition-all duration-200 shadow-xl border border-white/60"
        aria-label="Give Feedback"
      >
        <MessageSquare size={22} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative glass-panel rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl">
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h2 className="text-xl font-semibold text-zinc-800">Feedback</h2>
              <p className="text-sm text-zinc-500 mt-1">Help us improve Toolz</p>
            </div>

            {status === "success" ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 size={48} className="text-emerald-500 mb-3" />
                <p className="text-zinc-800 font-medium">Thank you for your feedback!</p>
              </div>
            ) : (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  name="honeypot"
                  className="absolute -left-[9999px]"
                  tabIndex={-1}
                  autoComplete="off"
                />

                <div>
                  <label htmlFor="feedback-name" className="block text-sm font-medium text-zinc-600 mb-1">
                    Name <span className="text-zinc-400">(optional)</span>
                  </label>
                  <input
                    id="feedback-name"
                    type="text"
                    value={name}
                    onChange={(e) => handleChange(e.target.value, setName)}
                    maxLength={MAX_NAME_LENGTH}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent text-sm transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="feedback-email" className="block text-sm font-medium text-zinc-600 mb-1">
                    Email <span className="text-zinc-400">(optional - for reply)</span>
                  </label>
                  <input
                    id="feedback-email"
                    type="email"
                    value={email}
                    onChange={(e) => handleChange(e.target.value, setEmail)}
                    maxLength={MAX_EMAIL_LENGTH}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent text-sm transition-all"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="feedback-message" className="block text-sm font-medium text-zinc-600 mb-1">
                    Your Feedback <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="feedback-message"
                    value={message}
                    onChange={(e) => handleChange(e.target.value, setMessage)}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={4}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-white/60 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:border-transparent text-sm transition-all resize-none"
                    placeholder="Share your thoughts, suggestions, or report an issue..."
                  />
                  <p className="text-xs text-zinc-400 mt-1 text-right">{message.length}/{MAX_MESSAGE_LENGTH}</p>
                </div>

                {status === "error" && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600">{errorMsg}</div>
                )}

                <button
                  type="submit"
                  disabled={status === "sending" || !message.trim()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {status === "sending" ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
