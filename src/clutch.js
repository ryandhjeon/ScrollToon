/**
 * ScrollToon - Dual Input Controller
 * Left-Click Hold = Hard Brake (Freezes screen)
 * Two-Finger Hold = Slow Down (Cushioned glide down at ~35% speed)
 * Scrolling UP is 100% unrestricted: downward auto-scroll yields while user scrolls up!
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
    this.scrollUpSuspendTimer = null;
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

  // TRACKPAD TWO-FINGER SCROLL & TOUCH
  bindTrackpadTouchEvents() {
    const handleTrackpadWheel = (e) => {
      if (!this.scroller.isRunning) return;
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      const deltaY = e.deltaY;

      // 1. SCROLLING UP: NEVER preventDefault! Allow native scroll up freely!
      if (deltaY < -1.5) {
        // Suspend downward auto-scroll while user is scrolling up so we don't fight them!
        this.scroller.suspendForScrollUp(true);

        if (this.scrollUpSuspendTimer) {
          clearTimeout(this.scrollUpSuspendTimer);
        }

        // 450ms after user stops scrolling up, softly resume downward auto-scroll
        this.scrollUpSuspendTimer = setTimeout(() => {
          this.scroller.suspendForScrollUp(false);
          this.scrollUpSuspendTimer = null;
        }, 450);
        return;
      }

      // 2. TWO-FINGER RESTING / SLOW HOLD ON TRACKPAD:
      // When holding two fingers to slow down (tiny micro-touch or forward friction)
      if (this.options.enableTwoFingerSlow && Math.abs(deltaY) >= 0.2 && deltaY < 20) {
        this.scroller.setSlowDown(true);

        if (this.twoFingerTouchTimer) {
          clearTimeout(this.twoFingerTouchTimer);
        }

        // When fingers lift, smoothly accelerate back to full cruising speed
        this.twoFingerTouchTimer = setTimeout(() => {
          if (!this.isTwoFingerSlowActive) {
            this.scroller.setSlowDown(false);
          }
          this.twoFingerTouchTimer = null;
        }, 260);
      }
    };

    window.addEventListener('wheel', handleTrackpadWheel, { capture: true, passive: true });
    document.addEventListener('wheel', handleTrackpadWheel, { capture: true, passive: true });
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
