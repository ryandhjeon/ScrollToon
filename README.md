# ScrollToon

ScrollToon is a Chrome extension that scrolls webtoons and manga for you.

---

## Why ScrollToon?

Reading long webtoon chapters tires your fingers from constant scrolling. Most autoscrollers stutter, cover the art with big toolbars, or break your trackpad gestures.

ScrollToon gives you a smooth, hands-free reading experience. You get steady scrolling, clear art, and instant control whenever you want to pause.

---

## What You Get

- **Hands-Free Scrolling:** Read comfortably without continuous swiping or trackpad strain.
- **Hold to Pause (Clutch Brake):** Hold the left mouse button to freeze the screen on dialogue or art. Release to continue scrolling.
- **Clear Comic Art:** The control bar fades to near-transparent while you read. It never blurs the panels.
- **No Blank Loading Boxes:** Images preload 3500 pixels ahead so you never wait for pictures to load.
- **Normal Trackpad Use:** Scroll up or down with your trackpad anytime without turning off the tool.
- **Custom Speed Steps:** Choose how much your speed changes when you press <kbd>[</kbd> or <kbd>]</kbd>.

---

## How to Install

Follow these steps to add ScrollToon to your browser:

1. Open `chrome://extensions` in your browser.
2. Turn on **Developer mode** in the top-right corner.
3. Click **Load unpacked**.
4. Select the project folder:
   ```
   /Users/ryan/git/webtoon-scroller
   ```
5. Open any webtoon chapter.
6. Press <kbd>Option</kbd> + <kbd>S</kbd> (<kbd>Alt</kbd> + <kbd>S</kbd>) to start reading.

---

## Quick Shortcuts

| Action | How to Do It |
| :--- | :--- |
| **Turn On / Off** | Press <kbd>Option</kbd> + <kbd>S</kbd> (<kbd>Alt</kbd> + <kbd>S</kbd>) or click the popup switch |
| **Pause / Resume** | Press <kbd>Space</kbd> or click the middle mouse button |
| **Brake and Hold** | Hold the left mouse button |
| **Change Speed** | Press <kbd>[</kbd> to slow down or <kbd>]</kbd> to speed up |
| **Emergency Stop** | Press <kbd>Esc</kbd> |
| **Move the Tool** | Drag the handle icon with your mouse |
| **Center the Tool** | Double-click the handle icon or click Reset in the popup |

---

## GitHub Setup

Push changes to your repository with these commands:

```bash
cd /Users/ryan/git/webtoon-scroller

# Push code and tags
git push origin main
git push origin --tags
```
