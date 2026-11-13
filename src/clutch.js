/**
 * ScrollToon - Dual Input Controller (Mouse & Trackpad Clutch)
 * Left-Click Hold = Hard Brake (Stops completely)
 * Touchpad Two-Finger Counter-Scroll = Slow-Glide (Continues down at ~35% speed)
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
    // 1. LEFT-CLICK HOLD = HARD CLUTCH BRAKE (stops page while held)
    const onMouseDown = (e) => {
      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;
      if (e.button !== 0) return;

      if (this.options.enableLeftClickBrake && this.scroller.isRunning) {
        this.leftDownTimestamp = performance.now();
        this.isLeftBrakeActive = true;
        this.scroller.applyClutch(true);
      }
    };

    const onMouseUp = (e) => {
      if (e.button !== 0) return;

      if (this.isLeftBrakeActive) {
        this.isLeftBrakeActive = false;
        this.scroller.applyClutch(false);

        if (performance.now() - this.leftDownTimestamp > 120) {
          this.preventNextClick = true;
        }
      }
    };

    window.addEventListener('mousedown', onMouseDown, { capture: true });
    window.addEventListener('mouseup', onMouseUp, { capture: true });

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
    const handleWheel = (e) => {
      if (!this.options.enableWheelBraking) return;
      if (!this.scroller.isRunning) return;

      if (e.target && e.target.closest && e.target.closest('#scrolltoon-host')) return;

      const deltaY = e.deltaY;

      // Two fingers moving UP (deltaY < 0 on macOS default Natural Scrolling)
      if (deltaY < -1.5) {
        e.preventDefault(); // Stop native page jump

        if (deltaY < -140) {
          // Strong deliberate flick upwards -> user is looking back at panels -> stop
          this.scroller.stop();
        } else {
          // SLOW-GLIDE: Continues scrolling down, but at a comfortable ~35% speed
          this.scroller.applyTwoFingerSlowDown();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    document.addEventListener('wheel', handleWheel, { capture: true, passive: false });
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
