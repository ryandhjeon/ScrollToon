/**
 * ScrollToon - 120Hz Sub-pixel Physics Scroll Engine
 * Uses float accumulation + spring interpolation for buttery smooth movement.
 */
class WebtoonScroller {
  constructor(options = {}) {
    this.cruiseSpeed = options.defaultSpeed || 1.5; // Multiplier
    this.basePixelsPerSec = 96; // 1.0x = ~96px/sec at 60Hz (~1.6px/frame)
    this.currentSpeed = 0; // Current actual speed
    this.targetSpeed = 0; // Desired target speed
    this.isRunning = false;
    this.isBraking = false; // Clutch or engine brake engaged

    // Sub-pixel accumulator
    this.subPixelRemainder = 0;
    this.lastTimestamp = null;
    this.animationFrameId = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onProgressUpdate = options.onProgressUpdate || (() => {});

    // Active scrolling element
    this.scrollContainer = this.detectScrollContainer();
    this.setupResizeListener();
  }

  detectScrollContainer() {
    // Check if the page has a dedicated full-height scrolling reader container
    const candidates = [
      document.querySelector('.viewer-container'),
      document.querySelector('#viewerContainer'),
      document.querySelector('#reader-area'),
      document.querySelector('.comic-content'),
      document.querySelector('.chapter-content'),
      document.scrollingElement || document.documentElement || document.body
    ];

    for (const el of candidates) {
      if (el && el.scrollHeight > window.innerHeight && (el.scrollHeight > el.clientHeight)) {
        const style = window.getComputedStyle(el);
        if (el === document.scrollingElement || el === document.documentElement || el === document.body ||
            style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return el;
        }
      }
    }
    return document.scrollingElement || document.documentElement || document.body;
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      this.scrollContainer = this.detectScrollContainer();
    }, { passive: true });
  }

  getScrollTop() {
    if (this.scrollContainer === document.body || this.scrollContainer === document.documentElement || this.scrollContainer === document.scrollingElement) {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    }
    return this.scrollContainer.scrollTop;
  }

  setScrollTop(val) {
    if (this.scrollContainer === document.body || this.scrollContainer === document.documentElement || this.scrollContainer === document.scrollingElement) {
      window.scrollTo(0, val);
    } else {
      this.scrollContainer.scrollTop = val;
    }
  }

  getMaxScroll() {
    const el = this.scrollContainer;
    if (el === document.body || el === document.documentElement || el === document.scrollingElement) {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ) - window.innerHeight;
    }
    return el.scrollHeight - el.clientHeight;
  }

  getProgress() {
    const max = this.getMaxScroll();
    if (max <= 0) return 0;
    const current = this.getScrollTop();
    return Math.min(100, Math.max(0, (current / max) * 100));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isBraking = false;
    this.targetSpeed = this.cruiseSpeed;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
    this.notifyState();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isBraking = false;
    this.targetSpeed = 0;
    this.currentSpeed = 0;
    this.subPixelRemainder = 0;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.notifyState();
  }

  toggle() {
    if (this.isRunning) {
      this.stop();
    } else {
      this.start();
    }
  }

  setCruiseSpeed(speed) {
    this.cruiseSpeed = Math.max(0.2, Math.min(6.0, Math.round(speed * 10) / 10));
    if (this.isRunning && !this.isBraking) {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  adjustCruiseSpeed(delta) {
    this.setCruiseSpeed(this.cruiseSpeed + delta);
  }

  // Engage clutch / brake: smoothly drop target speed to 0 without canceling the running state
  applyClutch(engaged) {
    this.isBraking = engaged;
    if (!this.isRunning) return;

    if (engaged) {
      this.targetSpeed = 0;
    } else {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  // Engine braking by friction (e.g. from reverse scroll flick)
  applyFriction(amount = 0.5) {
    if (!this.isRunning) return;
    this.currentSpeed = Math.max(0, this.currentSpeed - amount);
  }

  // Boost speed temporarily (e.g. forward wheel flick)
  applyBoost(amount = 0.5) {
    if (!this.isRunning) return;
    this.currentSpeed = Math.min(this.cruiseSpeed * 2.5, this.currentSpeed + amount);
  }

  notifyState() {
    this.onStateChange({
      isRunning: this.isRunning,
      isBraking: this.isBraking,
      cruiseSpeed: this.cruiseSpeed,
      currentSpeed: this.currentSpeed,
      progress: this.getProgress()
    });
  }

  loop(now) {
    if (!this.isRunning) return;

    const dt = Math.min(64, now - (this.lastTimestamp || now)); // cap dt to avoid huge jumps after tab pause
    this.lastTimestamp = now;

    // Smooth physics easing:
    // When braking: snappy ease-out deceleration
    // When accelerating: gentle ease-in ramp
    const lerpRate = this.isBraking ? 0.22 : 0.08;
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * lerpRate;

    // If speed is practically zero while braking, keep it at 0
    if (this.isBraking && this.currentSpeed < 0.02) {
      this.currentSpeed = 0;
    }

    if (this.currentSpeed > 0.005) {
      // Calculate delta pixels: (speed * baseSpeed * (dt / 1000))
      const targetDeltaPx = (this.currentSpeed * this.basePixelsPerSec * (dt / 1000));
      const totalToMove = targetDeltaPx + this.subPixelRemainder;

      const wholePixels = Math.floor(totalToMove);
      this.subPixelRemainder = totalToMove - wholePixels;

      if (wholePixels > 0) {
        const currentScroll = this.getScrollTop();
        const maxScroll = this.getMaxScroll();

        if (currentScroll >= maxScroll - 1) {
          // Reached the bottom
          this.stop();
          return;
        }

        this.setScrollTop(currentScroll + wholePixels);
      }
    }

    // Report progress periodically (every few frames)
    if (Math.random() < 0.2) {
      this.onProgressUpdate(this.getProgress());
    }

    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}

window.ScrollToonScroller = WebtoonScroller;
