/**
 * ScrollToon - Dual Input Controller
 * Left-Click Hold = Hard Brake (Freezes screen while held)
 * Releasing Left-Click = Springs naturally back to normal cruising speed
 * Space / Middle-Click = Toggle Start/Stop
 * [ / ] = Speed adjustment
 * Trackpad is 100% native and completely untouched.
 */
class WebtoonClutch {
  constructor(scroller, options = {}) {
    this.scroller = scroller;
    this.options = {
      enableLeftClickBrake: true,
      enableMiddleClickToggle: true,
      enableDoubleTapToggle: true,
      onSpeedChange: options.onSpeedChange || (() => {}),
      ...options
    };

    this.speedStep = typeof options.speedStep === 'number' && options.speedStep > 0 ? options.speedStep : 0.1;
    this.isLeftBrakeActive = false;
    this.leftDownTimestamp = 0;
    this.preventNextClick = false;
    this.lastTapTime = 0;

    this.onDown = null;
    this.onUp = null;
    this.onBrakeClick = null;
    this.onDragStart = null;
    this.onAuxClick = null;
    this.onAuxMouseDown = null;
    this.onDoubleTapClick = null;
    this.onKeyDown = null;
    this.onWheel = null;
    this.trackpadYieldTimer = null;

    this.init();
  }

  init() {
    this.bindMouseAndPointerEvents();
    this.bindKeyboardEvents();
  }

  bindMouseAndPointerEvents() {
    // ONE-FINGER PRESS (Left Click) -> HARD BRAKE
    this.onDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      if (e.button === 0 && this.options.enableLeftClickBrake && this.scroller.isRunning) {
        this.leftDownTimestamp = performance.now();
        this.isLeftBrakeActive = true;
        this.scroller.setHardBrake(true);
      }
    };

    // RELEASE EVENTS -> NATURAL RECOVERY
    this.onUp = (e) => {
      if (this.isLeftBrakeActive) {
        const leftStillDown = (e.buttons !== undefined) && ((e.buttons & 1) === 1);
        if (!leftStillDown || e.button === 0 || e.type === 'blur' || e.type === 'pointercancel') {
          this.isLeftBrakeActive = false;
          this.scroller.setHardBrake(false);

          if (performance.now() - this.leftDownTimestamp > 120) {
            this.preventNextClick = true;
          }
        }
      }
    };

    window.addEventListener('mousedown', this.onDown, { capture: true });
    window.addEventListener('pointerdown', this.onDown, { capture: true });

    window.addEventListener('mouseup', this.onUp, { capture: true });
    window.addEventListener('pointerup', this.onUp, { capture: true });
    window.addEventListener('pointercancel', this.onUp, { capture: true });
    window.addEventListener('blur', this.onUp, { capture: true });

    // Suppress accidental link opening when releasing left-click brake
    this.onBrakeClick = (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      if (this.preventNextClick) {
        e.preventDefault();
        e.stopPropagation();
        this.preventNextClick = false;
      }
    };
    window.addEventListener('click', this.onBrakeClick, { capture: true });

    this.onDragStart = (e) => {
      if (this.isLeftBrakeActive) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragstart', this.onDragStart, { capture: true });

    // Middle-click toggle
    this.onAuxClick = (e) => {
      if (!this.options.enableMiddleClickToggle) return;
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        this.scroller.toggle();
      }
    };
    window.addEventListener('auxclick', this.onAuxClick, { capture: true });

    this.onAuxMouseDown = (e) => {
      if (e.button === 1 && this.options.enableMiddleClickToggle) {
        e.preventDefault();
      }
    };
    window.addEventListener('mousedown', this.onAuxMouseDown, { capture: true });

    // Double-click in margin toggle
    this.onDoubleTapClick = (e) => {
      if (!this.options.enableDoubleTapToggle) return;
      if (e.target && e.target.closest && e.target.closest('a, button, input, [role="button"], #scrolltoon-host')) return;

      const now = performance.now();
      if (now - this.lastTapTime < 280) {
        this.scroller.toggle();
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    };
    window.addEventListener('click', this.onDoubleTapClick);

    // TWO-FINGER TRACKPAD TOUCH & HOLD -> CLOSE TO PAUSE
    // When the user touches, scrolls, or adjusts with two fingers, autoscroll drops to 0 immediately.
    // When fingers are lifted, autoscroll smoothly accelerates and scrolls down again.
    this.onWheel = (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;
      if (!this.scroller.isRunning) return;
      if (e.ctrlKey) return; // Ignore pinch-to-zoom gestures

      // Trigger yield immediately on any trackpad movement (even microscopic)
      if (Math.abs(e.deltaY) > 0.1 || Math.abs(e.deltaX) > 0.1) {
        this.scroller.setTrackpadYield(true);

        if (this.trackpadYieldTimer) {
          clearTimeout(this.trackpadYieldTimer);
        }
        // Snappy resumption: 200ms after finger movement ceases, autoscroll flows downward again
        this.trackpadYieldTimer = setTimeout(() => {
          this.scroller.setTrackpadYield(false);
          this.trackpadYieldTimer = null;
        }, 200);
      }
    };
    window.addEventListener('wheel', this.onWheel, { capture: true, passive: true });
  }

  setSpeedStep(step) {
    if (typeof step === 'number' && !isNaN(step) && step > 0) {
      this.speedStep = Math.round(step * 10) / 10;
    }
  }

  bindKeyboardEvents() {
    this.onKeyDown = (e) => {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.scroller.toggle();
          break;

        case 'BracketLeft':
        case 'Minus':
          e.preventDefault();
          this.scroller.adjustCruiseSpeed(-this.speedStep);
          if (this.options.onSpeedChange) this.options.onSpeedChange(-this.speedStep);
          break;

        case 'BracketRight':
        case 'Equal':
          e.preventDefault();
          this.scroller.adjustCruiseSpeed(this.speedStep);
          if (this.options.onSpeedChange) this.options.onSpeedChange(this.speedStep);
          break;

        case 'KeyJ':
          this.scroller.adjustCruiseSpeed(0.2);
          if (this.options.onSpeedChange) this.options.onSpeedChange(0.2);
          break;

        case 'KeyK':
          this.scroller.adjustCruiseSpeed(-0.2);
          if (this.options.onSpeedChange) this.options.onSpeedChange(-0.2);
          break;

        case 'Escape':
          if (this.scroller.isRunning) {
            this.scroller.stop();
          }
          break;
      }
    };
    window.addEventListener('keydown', this.onKeyDown);
  }

  destroy() {
    if (this.onDown) {
      window.removeEventListener('mousedown', this.onDown, { capture: true });
      window.removeEventListener('pointerdown', this.onDown, { capture: true });
    }
    if (this.onUp) {
      window.removeEventListener('mouseup', this.onUp, { capture: true });
      window.removeEventListener('pointerup', this.onUp, { capture: true });
      window.removeEventListener('pointercancel', this.onUp, { capture: true });
      window.removeEventListener('blur', this.onUp, { capture: true });
    }
    if (this.onBrakeClick) {
      window.removeEventListener('click', this.onBrakeClick, { capture: true });
    }
    if (this.onDragStart) {
      window.removeEventListener('dragstart', this.onDragStart, { capture: true });
    }
    if (this.onAuxClick) {
      window.removeEventListener('auxclick', this.onAuxClick, { capture: true });
    }
    if (this.onAuxMouseDown) {
      window.removeEventListener('mousedown', this.onAuxMouseDown, { capture: true });
    }
    if (this.onDoubleTapClick) {
      window.removeEventListener('click', this.onDoubleTapClick);
    }
    if (this.onKeyDown) {
      window.removeEventListener('keydown', this.onKeyDown);
    }
    if (this.trackpadYieldTimer) {
      clearTimeout(this.trackpadYieldTimer);
      this.trackpadYieldTimer = null;
    }
    if (this.onWheel) {
      window.removeEventListener('wheel', this.onWheel, { capture: true, passive: true });
    }
  }
}

window.ScrollToonClutch = WebtoonClutch;
