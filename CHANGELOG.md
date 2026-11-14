# Changelog - ScrollToon ⚡

All notable changes, version milestones, and status updates for the ScrollToon Chrome Extension.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-11-13 *(Current Active Release)*

### 🚀 Added
- **Brief Upward Scroll Dip**: Detects when the reader scrolls up with two fingers on their trackpad (or wheel) and briefly dips autoscroll speed by ~50% (min `0.3x`). Features a brief 180ms release and fast spring recovery (`lambda = 6.0`) so the screen continues flowing downward naturally without stalling.
- **Speed Limit Increased to 7.0x**: Boosted top cruising speed limit from 6.0x to 7.0x in the scroller engine, and expanded the popup default speed slider to 7.0x.
- **Configurable Bracket Step Size**: New slider in popup settings allowing users to customize how much speed changes per <kbd>[</kbd> and <kbd>]</kbd> press (`±0.1x` to `±1.0x`).
- **Live Tab Settings Synchronization**: Modifications in the popup settings immediately sync live to open tabs without requiring a page refresh.
- **Organic SVG Icon Morphing**: Smooth, fluid crossfade and scale morphing between Play (▶) and Pause (❚❚) icons using SVG transforms.
- **Calm Breathing Feedback**: Replaced aggressive multi-keyframe animations with a gentle, tranquil mint illumination breath on the button during start and pause.
- **Idle Opacity Fade While Paused**: The HUD automatically fades to ghost opacity after 1.8s of idle even when stopped, keeping manual trackpad reading unobstructed.

### 🎨 Refined & Fixed
- **Consistent Mint Identity**: Maintained pure `#00F5A0` mint tone on the play button during pause feedback, eliminating awkward grayish-green color blending.
- **Standard Media Player Icon Orientation**: Play icon (▶) displays when stopped to start; Pause icon (❚❚) displays while scrolling to pause.
- **Ultra-Low Ghost Opacity**: Lowered reading mode opacity to `0.04` background, `0.05` controls, and `0.08` cruising speed for maximum transparency.
- **Continuous Passive Progress**: Reading percentage continuously tracks manual trackpad scrolling in real time even when autoscroll is stopped.

---

## [1.1.0] - 2026-11-13

### 🚀 Added
- **Unified Center Display**: Consolidated all speed adjustments and clutch brake feedback directly into the center `.speed-display` element.
- **Instant Clutch Brake**: Holding Left-Click freezes the screen and displays high-visibility solid red `BRAKE` text at 100% opacity with zero drop shadows.
- **Sleek Header Power Switch**: Redesigned extension popup with an integrated iOS-style master switch (`OFF` muted vs. `ON` neon mint).
- **Proximity-Based Ghost Wakeup**: Cursor approaching within 140px automatically wakes HUD to 100% opacity.
- **Position Memory & Reset**: Saved drag position persists across sessions with double-click reset and popup "Reset Position" button.

### 🎨 Refined & Fixed
- **Zero Backdrop Blur**: Completely stripped `backdrop-filter: blur(...)` to keep underlying comic panels and speech bubbles 100% sharp.
- **Manual Activation Architecture**: Replaced fragile URL regex and auto-detect heuristics with clean manual activation via <kbd>Option</kbd>+<kbd>S</kbd> (<kbd>Alt</kbd>+<kbd>S</kbd>) or popup toggle.
- **Tab Session Persistence**: Preserved active reading state across next/previous chapter navigations using `sessionStorage`.
- **Script Injection Fallback**: Added `chrome.scripting.executeScript` fallback so the popup toggle works immediately on tabs opened prior to extension reloads.

---

## [1.0.0] - 2026-11-13 *(Initial Foundation)*

### 🚀 Added
- **Sub-Pixel 120Hz/144Hz Engine**: High-performance scrolling loop with float accumulator to eliminate integer rounding jitter on ProMotion displays.
- **Left-Click Clutch Brake**: Tactile brake with exponential spring physics easing.
- **Predictive Lazy-Load Preloader**: Proactively decodes images 3500px ahead to eliminate blank loading boxes during high-speed cruising.
- **Shadow DOM Style Isolation**: Fully isolated HUD rendering preventing interference from webtoon site stylesheets.
- **Native Trackpad Preservation**: Zero touch or wheel hijacking; manual trackpad scrolling remains 100% native.

---

## Update Status Per Version

| Version | Status | Date | Key Focus |
| :--- | :--- | :--- | :--- |
| **v1.2.0** | 🟢 **Active / Current** | 2026-11-13 | Customizable step size, calm SVG morph, ultra-low opacity |
| **v1.1.0** | 🟡 **Shipped** | 2026-11-13 | Zero blur, borderless glass, unified center feedback, manual toggle |
| **v1.0.0** | ⚪ **Initial Base** | 2026-11-13 | 120Hz sub-pixel engine, predictive preloader, clutch brake |
