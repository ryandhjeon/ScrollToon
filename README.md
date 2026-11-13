# ScrollToon ⚡
> Minimal autoscroller Chrome Extension for webtoons and manga.

---

## Features

- **120Hz Sub-Pixel Engine:** Uses physics easing to scroll smoothly without screen jitter.
- **Ultra-Low Opacity HUD:** Fades to 4% opacity during reading. Does not blur comic artwork.
- **Left-Click Clutch Brake:** Hold the left mouse button to freeze the screen. Release to resume scrolling.
- **Proactive Image Preloader:** Preloads images 3500 pixels ahead to eliminate blank loading boxes.
- **Configurable Speed Steps:** Change speed increment per key press in the extension popup.
- **Native Trackpad Support:** Keep trackpad scrolling fully native without gesture interference.
- **Shadow DOM Isolation:** Isolates styles to prevent conflicts with website code.

---

## Installation

Do these steps to install the extension in Google Chrome, Brave, Arc, or Edge:

1. Open `chrome://extensions` in your browser.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the project folder:
   ```
   /Users/ryan/git/webtoon-scroller
   ```
5. Open any webtoon chapter.
6. Press <kbd>Option</kbd> + <kbd>S</kbd> (<kbd>Alt</kbd> + <kbd>S</kbd>) to start the tool.

---

## Controls and Shortcuts

| Action | Mouse | Trackpad | Keyboard |
| :--- | :--- | :--- | :--- |
| **Start / Stop Tool** | Click popup switch | - | <kbd>Option</kbd> + <kbd>S</kbd> (<kbd>Alt</kbd> + <kbd>S</kbd>) |
| **Play / Pause Scroll** | Click middle button | Double-click margin | <kbd>Space</kbd> |
| **Hold Brake** | Hold left button | Click and hold | - |
| **Adjust Speed** | Turn scroll wheel over HUD | Scroll over HUD | <kbd>[</kbd> / <kbd>]</kbd> |
| **Emergency Stop** | - | - | <kbd>Esc</kbd> |
| **Move HUD** | Drag handle icon | Drag handle icon | - |
| **Reset HUD Position** | Click Reset in popup | Double-click handle | - |

---

## Project Structure

```
webtoon-scroller/
├── manifest.json        # Chrome Manifest V3 configuration
├── CHANGELOG.md         # Release history and version status
├── icons/               # Extension icons
├── src/
│   ├── preloader.js     # 3500px proactive image preloader
│   ├── scroller.js      # Sub-pixel physics scroll engine
│   ├── clutch.js        # Mouse and keyboard input handler
│   ├── island.js        # Shadow DOM Dynamic Island HUD
│   └── content.js       # Main controller and settings listener
└── popup/
    ├── popup.html       # Settings panel with step-size slider
    ├── popup.css        # Minimal dark interface styles
    └── popup.js         # Settings synchronization
```

---

## Version Status

See [CHANGELOG.md](file:///Users/ryan/git/webtoon-scroller/CHANGELOG.md) for detailed release logs.

| Version | Status | Date | Summary |
| :--- | :--- | :--- | :--- |
| **v1.2.0** | 🟢 **Active** | 2026-11-13 | Configurable step size, organic SVG morph, calm breathing animation |
| **v1.1.0** | 🟡 **Shipped** | 2026-11-13 | Zero-blur glass, center feedback, manual toggle, reset button |
| **v1.0.0** | ⚪ **Initial** | 2026-11-13 | 120Hz sub-pixel engine, predictive preloader, clutch brake |

---

## GitHub Setup

Push this repository to GitHub with these commands:

```bash
cd /Users/ryan/git/webtoon-scroller

# 1. Connect remote repository
git remote set-url origin https://github.com/ryandhjeon/ScrollToon.git

# 2. Push main branch
git push -u origin main

# 3. Push release tags
git push origin --tags
```
