/**
 * ScrollToon - Dual Input Controller
 * Left-Click Hold = Hard Brake (Freezes screen)
 * Two-Finger Hold on Trackpad = Slow Down (Cushioned glide down at ~35% speed)
 * Releasing = Immediately and naturally glides back to normal cruising speed
 * Fast scroll-up is NEVER hijacked.
 */
class WebtoonClutch {
  constructor(scroller, options = {}) {
    this.scroller = scroller;
    this.options = {
      enableLeftClickBrake: true,
      enableTwoFingerSlow: true,
      enableMiddleClickToggle: true,
      enableDoubleTapToggle: true,
      onSpeedChange: options.onSpeedChange || (() => {}),
      ...options
    };

    this.isLeftBrakeActive = false;
    this.isTwoFingerSlowActive = false;
    this.twoFingerTouchTimer = null;
    this.leftDownTimestamp = 0;
    this.preventNextClick = false;
    this.preventNextContextMenu = false;
    this.lastTapTime = 0;

    this.init();
  }

  init() {
    this.bindMouseAndPointerEvents();
    this.bindTrackpadTouchEvents();
    this.bindKeyboardEvents();
  }

  bindMouseAndPointerEvents() {
    // ONE-FINGER PRESS (Left Click) -> HARD BRAKE
    const onDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      if (e.button === 0 && this.options.enableLeftClickBrake && this.scroller.isRunning) {
        this.leftDownTimestamp = performance.now();
        this.isLeftBrakeActive = true;
        this.scroller.setHardBrake(true);
      }

      // TWO-FINGER PRESS/CLICK -> SLOW DOWN
      else if (e.button === 2 && this.options.enableTwoFingerSlow && this.scroller.isRunning) {
        this.isTwoFingerSlowActive = true;
        this.preventNextContextMenu = true;
        this.scroller.setSlowDown(true);
      }
    };

    // RELEASE EVENTS -> NATURAL RECOVERY
    const onUp = (e) => {
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

      if (this.isTwoFingerSlowActive) {
        const rightStillDown = (e.buttons !== undefined) && ((e.buttons & 2) === 2);
        if (!rightStillDown || e.button === 2 || e.type === 'blur' || e.type === 'pointercancel') {
          this.isTwoFingerSlowActive = false;
          this.scroller.setSlowDown(false);
          this.preventNextContextMenu = true;
        }
      }
    };

    window.addEventListener('mousedown', onDown, { capture: true });
    window.addEventListener('pointerdown', onDown, { capture: true });

    window.addEventListener('mouseup', onUp, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    window.addEventListener('blur', onUp, { capture: true });

    // Suppress context menu on two-finger click/hold
    window.addEventListener('contextmenu', (e) => {
      if (this.isTwoFingerSlowActive || this.preventNextContextMenu) {
        e.preventDefault();
        e.stopPropagation();
        this.preventNextContextMenu = false;
      }
    }, { capture: true });

    window.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      if (this.preventNextClick) {
        e.preventDefault();
        e.stopPropagation();
        this.preventNextClick = false;
      }
    }, { capture: true });

    window.addEventListener('dragstart', (e) => {
      if (this.isLeftBrakeActive || this.isTwoFingerSlowActive) {
        e.preventDefault();
      }
    }, { capture: true });

    // Middle-click toggle
    window.addEventListener('auxclick', (e) => {
      if (!this.options.enableMiddleClickToggle) return;
      if (e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
        this.scroller.toggle();
      }
    }, { capture: true });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 1 && this.options.enableMiddleClickToggle) {
        e.preventDefault();
      }
    }, { capture: true });

    // Double-click toggle
    window.addEventListener('click', (e) => {
      if (!this.options.enableDoubleTapToggle) return;
      if (e.target && e.target.closest && e.target.closest('a, button, input, [role="button"], #scrolltoon-host')) return;

      const now = performance.now();
      if (now - this.lastTapTime < 280) {
        this.scroller.toggle();
        this.lastTapTime = 0;
      } else {
        this.lastTapTime = now;
      }
    });
  }

  // TWO-FINGER TRACKPAD TOUCH & HOLD DETECTION
  bindTrackpadTouchEvents() {
    const handleTrackpadWheel = (e) => {
      if (!this.options.enableTwoFingerSlow) return;
      if (!this.scroller.isRunning) return;

      // Allow wheel over our island
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      const deltaY = e.deltaY;

      // If user is intentionally scrolling UP fast to inspect earlier panels, DO NOT hijack!
      if (deltaY < -45) {
        return;
      }

      // When two fingers are placed and held on the trackpad surface:
      // Trackpad sends gentle low-delta events (micro-movements/friction)
      if (Math.abs(deltaY) >= 0.2 && Math.abs(deltaY) < 35) {
        e.preventDefault();

        // Engage slow-glide
        this.scroller.setSlowDown(true);

        if (this.twoFingerTouchTimer) {
          clearTimeout(this.twoFingerTouchTimer);
        }

        // As soon as fingers lift off the glass surface (250ms of silence),
        // smoothly and naturally accelerate back to normal cruising speed!
        this.twoFingerTouchTimer = setTimeout(() => {
          if (!this.isTwoFingerSlowActive) {
            this.scroller.setSlowDown(false);
          }
          this.twoFingerTouchTimer = null;
        }, 250);
      }
    };

    window.addEventListener('wheel', handleTrackpadWheel, { capture: true, passive: false });
    document.addEventListener('wheel', handleTrackpadWheel, { capture: true, passive: false });
  }

  bindKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
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
          this.scroller.adjustCruiseSpeed(-0.1);
          if (this.options.onSpeedChange) this.options.onSpeedChange(-0.1);
          break;

        case 'BracketRight':
        case 'Equal':
          e.preventDefault();
          this.scroller.adjustCruiseSpeed(0.1);
          if (this.options.onSpeedChange) this.options.onSpeedChange(0.1);
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
    });
  }
}

window.ScrollToonClutch = WebtoonClutch;
