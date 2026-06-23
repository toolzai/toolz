# Design System & Theming Guide

This document serves as the global design reference for this project. Provide this file to any AI coding assistant to ensure new components automatically inherit the exact same aesthetic, layout principles, colors, and UI patterns.

## 1. Design Philosophy
- **Aesthetic**: "Apple-like", Clean, Minimal, Glassmorphism.
- **Form Factor**: Extremely generous border radius (e.g., `rounded-2xl`, `rounded-3xl`, `rounded-full`).
- **Depth & Elevation**: Uses translucent backgrounds with varied backdrop blurs rather than solid blocks, paired with extremely soft, wide shadow diffusions.
- **Interactions**: Micro-interactions on hover (scale scaling, soft background color shifts). Soft transitions (`transition-all duration-300`).

## 2. Global Styling & CSS Variables
The project uses strict CSS variables mapped directly to Tailwind utilities.

```css
/* Globals Configuration */
:root {
  --background: #f4f4f6; /* Soft, cool pastel gray base */
  --foreground: #1d1d1f; /* Almost black for maximum contrast without pure harsh #000 */
  --glass-bg: rgba(255, 255, 255, 0.45); /* Highly translucent for underlying gradient blur */
  --glass-border: rgba(255, 255, 255, 0.6); /* Soft distinct edge for depth */
  --glass-shadow: 0 12px 40px 0 rgba(0, 0, 0, 0.06); 
}

body {
  /* Pastel mesh background gradient, very subtle */
  background-image: radial-gradient(at 0% 0%, hsla(210, 80%, 92%, 1) 0px, transparent 60%),
                    radial-gradient(at 100% 0%, hsla(280, 80%, 93%, 1) 0px, transparent 60%),
                    radial-gradient(at 100% 100%, hsla(210, 80%, 90%, 1) 0px, transparent 60%),
                    radial-gradient(at 0% 100%, hsla(280, 80%, 90%, 1) 0px, transparent 60%);
  background-attachment: fixed;
}
```

### Global Utility: Glass Panel
Whenever you need a container, card, or sidebar, **always** use the `glass-panel` class instead of standard white background colors.
```css
@layer utilities {
  .glass-panel {
    background: var(--glass-bg);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    box-shadow: var(--glass-shadow);
  }
}
```

## 3. Core Color Palette (Tailwind Variants)
- **Surface / Backgrounds**: `bg-zinc-50/50`, `bg-white/40`, `bg-white/60`, `bg-white`
- **Text (Primary)**: `text-zinc-800`
- **Text (Secondary/Muted)**: `text-zinc-500`, `text-zinc-400`
- **Accents / Active States**: `text-blue-600`, `bg-blue-50/20`, `bg-blue-600`
- **Borders**: `border-zinc-200`, `border-zinc-100`, `border-dashed border-blue-400` (for active dropzones).

## 4. Typography
- Focus on `font-medium` and `font-semibold` for labels and interactive elements.
- Section Headers: `text-lg font-medium text-zinc-800`
- Small Labels / Uppercase Meta text: `text-xs font-medium text-zinc-500 uppercase tracking-wider`

## 5. UI Component Recipes

### Main Container (Glass)
```tsx
<div className="glass-panel w-full p-6 rounded-3xl flex flex-col gap-6 relative">
  {/* Content */}
</div>
```

### Standard Button (Primary Action)
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-sm flex items-center justify-center gap-2 hover:-translate-y-0.5">
  <Icon size={18} />
  Action Label
</button>
```

### Tool / Toggle Buttons (Active & Inactive State)
```tsx
<button className={clsx(
  "flex items-center transition-all duration-200 font-medium text-sm rounded-2xl p-3",
  isActive 
    ? "bg-white shadow-sm text-blue-600 border border-blue-100" 
    : "text-zinc-600 hover:bg-white/60 border border-transparent"
)}>
  {/* Icon Wrapper */}
  <div className={clsx(
    "flex items-center justify-center shrink-0 w-8 h-8 rounded-full",
    isActive ? "bg-blue-50 text-blue-600" : "text-zinc-500 group-hover:text-zinc-800"
  )}>
    <Icon size={18} />
  </div>
  Label
</button>
```

### Pattern Overlays
To add subtle texture inside dark components (like an image preview area):
```tsx
<div className="bg-zinc-900 border border-zinc-200 rounded-2xl relative overflow-hidden">
  <div className="absolute inset-0 pattern-dots text-zinc-800 pointer-events-none opacity-20"></div>
  {/* Inner dark content */}
</div>
```

## 6. Layout Principles
1. **Paddings & Gaps**: Use `p-6` for larger structural padding, `p-3` or `p-4` for element paddings. Use `gap-6` or `gap-4` in flex layouts to maintain breathing room.
2. **Icons**: Standardize on `lucide-react` icons (sizes usually `16`, `18`, or `20`).
3. **Responsive**: Use `flex-col md:flex-row` for structural layouts. Collapse sidebars gracefully with `clsx` transitions.
4. **Tooltips**: For collapsed icon-only menus, implement tooltips matching:
   ```tsx
   <div className="absolute right-full mr-4 px-3 py-2 bg-zinc-800 text-white text-xs rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity flex items-center shadow-xl">
     <div className="absolute -right-1 top-1/2 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-zinc-800"></div>
     Tooltip Text
   </div>
   ```