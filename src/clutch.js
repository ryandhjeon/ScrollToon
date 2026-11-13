/**
 * ScrollToon - Dual Input Controller (Mouse & Trackpad Clutch)
 * Left-Click Hold = Clutch Brake
 * Touchpad Two-Finger Counter-Scroll = Dynamic Friction Brake (slow down / stop)
 * Middle-Click / Space = Toggle Start/Stop
 * [ / ] = Speed adjustment with HUD feedback
 */
class WebtoonClutch {
  constructor(scroller, options = {}) {
    this.scroller = scroller;
    this.options = {
      enableLeftClickBrake: true,
      enableMiddleClickToggle: true,
      enableWheelBraking: true,
      enableDoubleTapToggle: true,
      onSpeedChange: options.onSpeedChange || (() => {}),
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
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;
      if (e.button !== 0) return;

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

        if (performance.now() - this.leftDownTimestamp > 120) {
          this.preventNextClick = true;
        }
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
      if (this.isLeftBrakeActive) {
        e.preventDefault();
      }
    }, { capture: true });

    // 2. MIDDLE CLICK = TOGGLE PLAY / PAUSE
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

    // 3. DOUBLE-CLICK IN GUTTER = TOGGLE PLAY / PAUSE
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

  // 4. TOUCHPAD TWO-FINGER SCROLL & MOUSE WHEEL
  bindWheelEvents() {
    window.addEventListener('wheel', (e) => {
      if (!this.options.enableWheelBraking) return;
      if (!this.scroller.isRunning) return;

      // Allow wheel adjustments directly on the Island without braking
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      const deltaY = e.deltaY;

      // TWO FINGERS MOVING UP -> SLOW DOWN / BRAKE
      if (deltaY < -4) {
        e.preventDefault(); // Stop native page jerk

        if (deltaY < -130) {
          // Strong deliberate flick upwards -> user is looking back at panels -> stop
          this.scroller.stop();
        } else {
          // Responsive friction brake: drops speed smoothly
          const brakeIntensity = Math.min(0.65, Math.abs(deltaY) / 25);
          this.scroller.applyTwoFingerBrake(brakeIntensity);
        }
      } 
      // TWO FINGERS MOVING DOWN -> SPEED UP PAST FILLER
      else if (deltaY > 25) {
        const boostPower = Math.min(1.2, deltaY / 55);
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
