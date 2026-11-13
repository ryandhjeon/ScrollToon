/**
 * ScrollToon - 120Hz Sub-pixel Physics Scroll Engine
 * Uses organic exponential spring damping for super natural transitions.
 * Left-Click Hold = Hard Brake (Decelerates smoothly to 0)
 * Two-Finger Hold = Slow Glide (Glides down smoothly to ~35% speed)
 * Releasing = Immediately and naturally accelerates back to cruising speed in ~400ms.
 */
class WebtoonScroller {
  constructor(options = {}) {
    this.cruiseSpeed = options.defaultSpeed || 1.5;
    this.basePixelsPerSec = 110;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.isRunning = false;

    // States
    this.isBraking = false;     // Left click hold
    this.isSlowedDown = false; // Two finger hold

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
    const candidates = [
      document.querySelector('.viewer-container'),
      document.querySelector('#viewerContainer'),
      document.querySelector('#reader-area'),
      document.querySelector('.comic-content'),
      document.querySelector('.chapter-content')
    ];

    for (const el of candidates) {
      if (el && el.scrollHeight > window.innerHeight && (el.scrollHeight > el.clientHeight)) {
        const style = window.getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          return el;
        }
      }
    }
    return null;
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      this.scrollContainer = this.detectScrollContainer();
    }, { passive: true });
  }

  getScrollTop() {
    if (!this.scrollContainer) {
      return window.scrollY || window.pageYOffset || document.documentElement.scrollTop || (document.body ? document.body.scrollTop : 0) || 0;
    }
    return this.scrollContainer.scrollTop;
  }

  scrollByPixels(pixels) {
    if (!this.scrollContainer) {
      window.scrollBy(0, pixels);
    } else {
      this.scrollContainer.scrollTop += pixels;
    }
  }

  getMaxScroll() {
    if (!this.scrollContainer) {
      const docHeight = Math.max(
        document.body ? document.body.scrollHeight : 0,
        document.documentElement ? document.documentElement.scrollHeight : 0
      );
      return Math.max(0, docHeight - window.innerHeight);
    }
    return Math.max(0, this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight);
  }

  getProgress() {
    const max = this.getMaxScroll();
    if (max <= 5) return 0;
    const current = this.getScrollTop();
    return Math.min(100, Math.max(0, (current / max) * 100));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isBraking = false;
    this.isSlowedDown = false;
    this.targetSpeed = this.cruiseSpeed;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
    this.notifyState();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isBraking = false;
    this.isSlowedDown = false;
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
    if (this.isRunning && !this.isBraking && !this.isSlowedDown) {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  adjustCruiseSpeed(delta) {
    this.setCruiseSpeed(this.cruiseSpeed + delta);
  }

  // 1. Hard Brake (Left-Click Hold): drops target to 0
  setHardBrake(active) {
    this.isBraking = active;
    if (!this.isRunning) return;

    this.recalculateTargetSpeed();
    this.notifyState();
  }

  // 2. Slow Down (Two-Finger Hold): drops target to ~35% cruise speed
  setSlowDown(active) {
    this.isSlowedDown = active;
    if (!this.isRunning) return;

    this.recalculateTargetSpeed();
    this.notifyState();
  }

  recalculateTargetSpeed() {
    if (this.isBraking) {
      this.targetSpeed = 0;
    } else if (this.isSlowedDown) {
      this.targetSpeed = Math.max(0.35, Math.round(this.cruiseSpeed * 0.35 * 10) / 10);
    } else {
      this.targetSpeed = this.cruiseSpeed;
    }
  }

  notifyState() {
    this.onStateChange({
      isRunning: this.isRunning,
      isBraking: this.isBraking,
      isSlowedDown: this.isSlowedDown,
      cruiseSpeed: this.cruiseSpeed,
      currentSpeed: this.currentSpeed,
      progress: this.getProgress()
    });
  }

  loop(now) {
    if (!this.isRunning) return;

    const dt = Math.min(64, now - (this.lastTimestamp || now));
    this.lastTimestamp = now;
    const dtSeconds = dt / 1000;

    // Responsive, natural exponential physics:
    // Decelerating: lambda = 5.5 (cushioned, smooth stop in ~300ms)
    // Accelerating back to cruise: lambda = 5.0 (naturally reaches normal cruise speed in ~400ms)
    const isDecelerating = this.targetSpeed < this.currentSpeed;
    const lambda = isDecelerating ? 5.5 : 5.0;
    const decay = Math.exp(-lambda * dtSeconds);

    this.currentSpeed = this.targetSpeed + (this.currentSpeed - this.targetSpeed) * decay;

    // Clean clamp near target
    if (Math.abs(this.currentSpeed - this.targetSpeed) < 0.015) {
      this.currentSpeed = this.targetSpeed;
    }

    if (this.currentSpeed > 0.005) {
      const targetDeltaPx = (this.currentSpeed * this.basePixelsPerSec * dtSeconds);
      const totalToMove = targetDeltaPx + this.subPixelRemainder;

      const wholePixels = Math.floor(totalToMove);
      this.subPixelRemainder = totalToMove - wholePixels;

      if (wholePixels > 0) {
        const currentScroll = this.getScrollTop();
        const maxScroll = this.getMaxScroll();

        if (maxScroll > 150 && currentScroll >= maxScroll - 4) {
          this.stop();
          return;
        }

        this.scrollByPixels(wholePixels);
      }
    }

    this.onProgressUpdate(this.getProgress());
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}

window.ScrollToonScroller = WebtoonScroller;
