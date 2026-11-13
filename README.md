# ScrollToon ⚡
> High-performance Webtoon & Manga autoscroller Chrome Extension with a morphing Dynamic Island UI, tactile clutch braking, and predictive image preloading.

---

## ✨ Features

- **Liquid Glass Dynamic Island:**
  - Floats unobtrusively at the bottom or snapped to gutters.
  - **Auto-Morphs into a 38px Glass Bead** after 2.2s of hands-free reading, featuring an SVG circular progress ring and live speed readout.
  - Expands instantly on mouse hover or tap.
- **Dual-Input "Clutch" Braking:**
  - **Hold Right-Click (Mouse)** or **Click & Hold Gutter (Trackpad):** Acts as an immediate foot clutch/brake pedal. Smoothly decelerates to 0; letting go gently accelerates back to cruising speed. (Native context menu is automatically suppressed).
  - **Middle-Click Anywhere:** Instant Play / Pause toggle.
  - **Counter-Scroll Resistance (Wheel / Trackpad):** Flicking upward applies engine braking. A strong swipe upward hard-pauses to let you inspect panels.
  - **Trackpad Double-Tap:** Double-click empty margins to toggle cruise.
- **120Hz/144Hz Sub-Pixel Scroll Engine:**
  - Float accumulator prevents integer rounding jitter on high refresh rate displays.
  - Exponential physics easing eliminates sudden jarring starts and stops.
- **Predictive Lazy-Load Preloader:**
  - Proactively triggers and decodes comic images 3500px ahead of the viewport, eliminating blank white boxes during fast cruising.
- **Total Style Isolation:**
  - Rendered entirely inside an isolated **Shadow DOM**, preventing webtoon site stylesheets from conflicting with the UI.

---

## 🚀 How to Install & Test (30 seconds)

1. Open Google Chrome (or Arc / Brave / Edge).
2. Go to `chrome://extensions`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked** in the top-left corner.
5. Select the folder:
   ```
   /Users/ryan/git/webtoon-scroller
   ```
6. Open any webtoon (e.g., [webtoons.com](https://www.webtoons.com) or [comic.naver.com](https://comic.naver.com)) and start cruising!

---

## 🎮 Controls & Shortcuts

| Action | Mouse | Trackpad | Keyboard |
| :--- | :--- | :--- | :--- |
| **Play / Pause** | **Middle-Click** anywhere | **Double-click** gutter margin | <kbd>Space</kbd> |
| **Clutch Brake (Hold)** | **Hold Left-Click** | **Click & Hold** | - |
| **Trackpad Scrolling** | Native | **Native 2-finger scroll** | <kbd>↑</kbd> / <kbd>↓</kbd> |
| **Emergency Pause** | - | - | <kbd>Esc</kbd> |
| **Speed Dial (±0.1x)** | **Hover speed & scroll wheel** | **Hover speed & scroll** | <kbd>[</kbd> / <kbd>]</kbd> |
| **Speed Feedback** | In-island counter | In-island counter | Floating white badge above tool |
| **Reposition Tool** | Drag gripper icon | Drag gripper icon | - |
| **Reset Position** | **Reset button in Settings** or **Double-click gripper** | Double-click gripper | - |

---

## 📁 Project Architecture

```
webtoon-scroller/
├── manifest.json        # Chrome MV3 config with broad comic site permissions
├── icons/               # High-DPI icons
├── src/
│   ├── preloader.js     # 3500px proactive lazy-load booster
│   ├── scroller.js      # Float accumulator rAF physics engine
│   ├── clutch.js        # Mouse & trackpad gesture clutch engine
│   ├── island.js        # Shadow DOM liquid glass morphing island
│   └── content.js       # Main orchestrator
└── popup/
    ├── popup.html       # Extension settings popup
    ├── popup.css        # Dark theme styling
    └── popup.js         # Chrome storage sync
```
