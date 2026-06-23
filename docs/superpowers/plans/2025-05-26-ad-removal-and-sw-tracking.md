# Ad Removal and sw.js Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Adsterra notification ads while preserving Moneytag ads and ensuring sw.js is tracked by git.

**Architecture:** Surgical removal of the Adsterra script from the GlobalAds component and manual addition of sw.js to git tracking.

**Tech Stack:** React, Next.js, Git.

---

### Task 1: Remove Adsterra Notification Script

**Files:**
- Modify: `src/components/GlobalAds.tsx`

- [x] **Step 1: Remove the Adsterra script block**

```tsx
// src/components/GlobalAds.tsx
<<<<<<< SEARCH
      <Script 
        src="https://pl29559557.effectivecpmnetwork.com/3b/14/55/3b145545d30c91f766d28733d8a73c74.js" 
        strategy="lazyOnload" 
      />
=======
>>>>>>> REPLACE
```

- [x] **Step 2: Verify only Moneytag script remains**

Ensure the file content looks like this:
```tsx
"use client";

import { useState, useEffect } from "react";
import Script from "next/script";

export default function GlobalAds() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        src="https://quge5.com/88/tag.min.js"
        data-zone="243379"
        strategy="afterInteractive"
        async
        data-cfasync="false"
      />
    </>
  );
}
```

- [x] **Step 3: Commit the change**

```bash
git add src/components/GlobalAds.tsx
git commit -m "fix: remove Adsterra notification ads"
```

### Task 2: Track sw.js in Git

**Files:**
- Modify: Git Index

- [ ] **Step 1: Add sw.js to git tracking**

Run: `git add sw.js`

- [ ] **Step 2: Verify sw.js is now tracked and staged**

Run: `git status`
Expected: `sw.js` listed under "Changes to be committed".

- [ ] **Step 3: Commit the change**

```bash
git commit -m "chore: track sw.js for moneytag functionality"
```
