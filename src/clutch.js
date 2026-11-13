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

    this.isLeftBrakeActive = false;
    this.leftDownTimestamp = 0;
    this.preventNextClick = false;
    this.lastTapTime = 0;

    this.init();
  }

  init() {
    this.bindMouseAndPointerEvents();
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
    };

    window.addEventListener('mousedown', onDown, { capture: true });
    window.addEventListener('pointerdown', onDown, { capture: true });

    window.addEventListener('mouseup', onUp, { capture: true });
    window.addEventListener('pointerup', onUp, { capture: true });
    window.addEventListener('pointercancel', onUp, { capture: true });
    window.addEventListener('blur', onUp, { capture: true });

    // Suppress accidental link opening when releasing left-click brake
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

    // Double-click in margin toggle
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
