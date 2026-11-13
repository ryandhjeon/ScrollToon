/**
 * ScrollToon - Dual Input Controller (Mouse & Trackpad Clutch)
 * Handles Middle-Click toggle, Right-Click / Margin hold clutch braking,
 * wheel friction, and keyboard shortcuts.
 */
class WebtoonClutch {
  constructor(scroller, options = {}) {
    this.scroller = scroller;
    this.options = {
      enableMiddleClickToggle: true,
      enableRightClickClutch: true,
      enableWheelBraking: true,
      enableDoubleTapToggle: true,
      ...options
    };

    this.rightClickTimer = null;
    this.isRightClutchActive = false;
    this.lastTapTime = 0;

    this.init();
  }

  init() {
    this.bindMouseEvents();
    this.bindWheelEvents();
    this.bindKeyboardEvents();
  }

  bindMouseEvents() {
    // 1. Middle Click (Button 1) Toggle
    window.addEventListener('auxclick', (e) => {
      if (!this.options.enableMiddleClickToggle) return;
      if (e.button === 1) { // Middle click
        e.preventDefault();
        e.stopPropagation();
        this.scroller.toggle();
      }
    }, { capture: true });

    // Prevent default autoscroll icon when middle-clicking
    window.addEventListener('mousedown', (e) => {
      if (e.button === 1 && this.options.enableMiddleClickToggle) {
        e.preventDefault();
      }
    }, { capture: true });

    // 2. Right-Click Clutch Hold (Button 2)
    window.addEventListener('mousedown', (e) => {
      if (!this.options.enableRightClickClutch) return;
      if (e.button === 2 && this.scroller.isRunning) {
        // Start clutch timer
        this.rightClickTimer = setTimeout(() => {
          this.isRightClutchActive = true;
          this.scroller.applyClutch(true);
        }, 140);
      }
    }, { capture: true });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        if (this.rightClickTimer) {
          clearTimeout(this.rightClickTimer);
          this.rightClickTimer = null;
        }
        if (this.isRightClutchActive) {
          this.isRightClutchActive = false;
          this.scroller.applyClutch(false);
        }
      }
    }, { capture: true });

    // Suppress context menu if the user was holding right click as a clutch brake
    window.addEventListener('contextmenu', (e) => {
      if (this.isRightClutchActive || this.rightClickTimer) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, { capture: true });

    // 3. Double-Click in Gutters/Margins for Trackpad
    window.addEventListener('click', (e) => {
      if (!this.options.enableDoubleTapToggle) return;
      // Don't trigger on links or interactive buttons
      if (e.target.closest('a, button, input, [role="button"], #scrolltoon-host')) return;

      const now = performance.now();
      if (now - this.lastTapTime < 280) {
        // Double-click detected
        this.scroller.toggle();
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    });
  }

  bindWheelEvents() {
    window.addEventListener('wheel', (e) => {
      if (!this.options.enableWheelBraking) return;
      if (!this.scroller.isRunning) return;

      // Check if mouse is hovering our Dynamic Island (let island handle its own wheel events)
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      const deltaY = e.deltaY;

      if (deltaY < -70) {
        // Strong swipe UP -> User is actively looking back at previous panels -> Hard Pause
        this.scroller.stop();
      } else if (deltaY < -10) {
        // Gentle scroll UP -> Engine friction / dynamic deceleration
        e.preventDefault();
        const frictionPower = Math.min(1.2, Math.abs(deltaY) / 40);
        this.scroller.applyFriction(frictionPower);
      } else if (deltaY > 30) {
        // Scroll DOWN -> Acceleration / turbo boost past filler
        const boostPower = Math.min(1.5, deltaY / 60);
        this.scroller.applyBoost(boostPower);
      }
    }, { passive: false });
  }

  bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input field or comment box
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.scroller.toggle();
          break;

        case 'BracketLeft': // [ slows down
        case 'Minus':
          e.preventDefault();
          this.scroller.adjustCruiseSpeed(-0.1);
          break;

        case 'BracketRight': // ] speeds up
        case 'Equal':
          e.preventDefault();
          this.scroller.adjustCruiseSpeed(0.1);
          break;

        case 'KeyJ': // Vim-style J for faster
          this.scroller.adjustCruiseSpeed(0.2);
          break;

        case 'KeyK': // Vim-style K for slower
          this.scroller.adjustCruiseSpeed(-0.2);
          break;

        case 'Escape':
          if (this.scroller.isRunning) {
            this.scroller.stop();
          }
          break;
      }
    });
  }
}

window.ScrollToonClutch = WebtoonClutch;
