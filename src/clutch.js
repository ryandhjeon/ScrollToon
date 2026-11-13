/**
 * ScrollToon - Dual Input Controller (Mouse & Trackpad Clutch)
 * Left-Click Hold = Clutch Brake (Hold to slow down/stop, release to resume)
 * Middle-Click / Space = Toggle Start/Stop
 * Wheel / Two-finger flick UP = Dynamic engine braking
 */
class WebtoonClutch {
  constructor(scroller, options = {}) {
    this.scroller = scroller;
    this.options = {
      enableLeftClickBrake: true,
      enableMiddleClickToggle: true,
      enableWheelBraking: true,
      enableDoubleTapToggle: true,
      ...options
    };

    this.isLeftBrakeActive = false;
    this.leftDownTimestamp = 0;
    this.preventNextClick = false;
    this.lastTapTime = 0;

    this.init();
  }

  init() {
    this.bindMouseEvents();
    this.bindWheelEvents();
    this.bindKeyboardEvents();
  }

  bindMouseEvents() {
    // 1. LEFT-CLICK HOLD = CLUTCH BRAKE PEDAL
    window.addEventListener('mousedown', (e) => {
      // Ignore if clicking inside our Dynamic Island
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;
      if (e.button !== 0) return; // Left click only

      if (this.options.enableLeftClickBrake && this.scroller.isRunning) {
        this.leftDownTimestamp = performance.now();
        this.isLeftBrakeActive = true;
        this.scroller.applyClutch(true);
      }
    }, { capture: true });

    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;

      if (this.isLeftBrakeActive) {
        this.isLeftBrakeActive = false;
        this.scroller.applyClutch(false);

        // If held for more than 120ms, it was a brake action -> prevent accidental link/action triggers
        if (performance.now() - this.leftDownTimestamp > 120) {
          this.preventNextClick = true;
        }
      }
    }, { capture: true });

    // Suppress click / drag if it was a brake hold
    window.addEventListener('click', (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      if (this.preventNextClick) {
        e.preventDefault();
        e.stopPropagation();
        this.preventNextClick = false;
      }
    }, { capture: true });

    // Prevent text / image dragging while holding brake
    window.addEventListener('dragstart', (e) => {
      if (this.isLeftBrakeActive) {
        e.preventDefault();
      }
    }, { capture: true });

    // 2. MIDDLE CLICK (Button 1) = TOGGLE PLAY / PAUSE
    window.addEventListener('auxclick', (e) => {
      if (!this.options.enableMiddleClickToggle) return;
      if (e.button === 1) { // Middle click
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

    // 3. DOUBLE-CLICK IN GUTTER / MARGIN = TOGGLE PLAY / PAUSE (Trackpad friendly)
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

  bindWheelEvents() {
    window.addEventListener('wheel', (e) => {
      if (!this.options.enableWheelBraking) return;
      if (!this.scroller.isRunning) return;

      // Allow wheel on our island without braking page
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      const deltaY = e.deltaY;

      if (deltaY < -75) {
        // Strong swipe UP -> User looking back at panels -> Hard Pause
        this.scroller.stop();
      } else if (deltaY < -10) {
        // Gentle scroll UP -> Engine friction
        e.preventDefault();
        const frictionPower = Math.min(1.2, Math.abs(deltaY) / 40);
        this.scroller.applyFriction(frictionPower);
      } else if (deltaY > 30) {
        // Scroll DOWN -> Acceleration boost
        const boostPower = Math.min(1.5, deltaY / 60);
        this.scroller.applyBoost(boostPower);
      }
    }, { passive: false });
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
          break;

        case 'BracketRight':
        case 'Equal':
          e.preventDefault();
          this.scroller.adjustCruiseSpeed(0.1);
          break;

        case 'KeyJ':
          this.scroller.adjustCruiseSpeed(0.2);
          break;

        case 'KeyK':
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
