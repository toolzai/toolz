
# Lumina Creative Studio - Project Context & Specification

This document serves as the "Source of Truth" for any AI agent working on this codebase. It outlines the project's mission, technical architecture, design philosophy, and implementation details to ensure consistency and prevent hallucinations during development.

---

## 🚀 1. Project Mission
**Lumina Studio** is a premium, browser-based creative suite designed to replace "boring" utility websites. It provides high-end image processing tools with a "Studio OS" experience, focusing on an ultra-minimalist, Apple-inspired aesthetic.
- **Key Goal:** $0 operating cost. All heavy processing (Image conversion, AI, Shaders) must run **client-side** in the user's browser.
- **User Experience:** Immersive, spatial, and highly interactive.

---

## 🛠️ 2. Technical Stack
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (Alpha/Edge) + CSS Variables for Glassmorphism.
- **3D Engine:** React Three Fiber (R3F) + Three.js + @react-three/drei.
- **Motion:** Framer Motion + Lucide React (Icons).
- **Image Processing:**
  - `react-dropzone` (File ingestion)
  - `jspdf` (Client-side PDF generation)
  - `exifr` (Metadata parsing - *Dynamically imported to avoid SSR crashes*)
  - `react-easy-crop` (Interactive cropping)
  - Canvas API (Resizing and Format Conversion)
- **Database/Auth (Planned):** Supabase (PostgreSQL + Google OAuth).

---

## 🎨 3. Design Philosophy (Antigravity Design)
- **Aesthetic:** "Apple-like" minimalism. Pure whites, frosted glass (glassmorphism), and subtle silver/indigo gradients.
- **Spatial Depth:** The UI floats on top of a 3D background.
- **Glassmorphism Spec:**
  - `background: rgba(255, 255, 255, 0.25)`
  - `backdrop-filter: blur(20px)`
  - `border: 1px solid rgba(255, 255, 255, 0.5)`
- **Background:** A 3D Canvas (`Scene.tsx`) featuring highly refractive glass shapes (Icosahedrons, Toruses) using `MeshTransmissionMaterial` and the `studio` environment preset.

---

## 📂 4. Project Architecture

### 📍 Core Components
- `src/app/page.tsx`: The "Hub" dashboard with 4 workspace cards.
- `src/components/Scene.tsx`: The persistent 3D background layer.
- `src/components/ImageWorkspace.tsx`: The central controller for all utility tools. It manages image state (`imageFile`, `imagePreview`) and provides a shared dropzone.

### 📍 Workspace A: The Utility Desk (`/utility-desk`)
Contains 4 main tools rendered conditionally within `ImageWorkspace.tsx`:
1. **Format Converter:** Supports JPG, PNG, WebP, AVIF, BMP, GIF, PDF, SVG, ICO, TIFF.
   - *Logic:* Uses Canvas for images, `jspdf` for PDF, and custom XML blobs for SVG.
   - *Feature:* Real-time size estimation using `canvas.toBlob()`.
2. **Image Resizer:** Handles pixel-perfect resizing with aspect ratio locking.
3. **Shape Cropper:** Provides Rectangular and Circular cropping with real-time zoom.
4. **Metadata Viewer:** Parses EXIF data and provides a "Strip & Download" privacy feature.

### 📍 Future Workspaces (Planned)
- **Workspace B (Magic Lab):** Local AI tools using `transformers.js` (Upscaling, Background Removal).
- **Workspace C (Aesthetic Playground):** WebGL shader-based filters (CRT, VHS, ASCII).
- **Workspace D (Creator Toolkit):** AI Roast Engine (Gemini API) and Moodboard generator.

---

## ⚠️ 5. Implementation Gotchas (Read Before Coding)
- **SSR Safety:** Do NOT import `exifr` at the top level. It uses Node.js modules (`fs`, `zlib`) that crash Next.js hydration. Always use `await import('exifr')` inside a `useEffect`.
- **Next.js 15/16 Dev:** If testing on a local network (e.g., mobile), `next.config.ts` must have `allowedDevOrigins: ["YOUR_IP"]` to prevent WebSocket HMR failures.
- **Turbopack:** The project uses Turbopack by default. Avoid adding `webpack` custom blocks to `next.config.ts` unless you add a `turbopack: {}` placeholder to acknowledge the transition.
- **File Input:** The `useDropzone` input MUST be rendered in the active view for the "Change Image" button (which triggers `open()`) to function correctly.

---

## 🔗 6. Key Files
- `src/app/globals.css`: Core design tokens and glassmorphism utilities.
- `src/components/ImageWorkspace.tsx`: Main logic for image state management.
- `src/components/tools/FormatConverter.tsx`: Complex logic for file conversions and size estimation.
- `next.config.ts`: Network and bundler configuration.
