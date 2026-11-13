/**
 * ScrollToon - 120Hz Sub-pixel Physics Scroll Engine
 * Two-finger scroll UP holds slow reading speed until you swipe DOWN (or after reading idle).
 */
class WebtoonScroller {
  constructor(options = {}) {
    this.cruiseSpeed = options.defaultSpeed || 1.5;
    this.basePixelsPerSec = 110;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.isRunning = false;
    this.isBraking = false;     // Left-Click hold = Hard stop
    this.isSlowedDown = false; // Two-finger UP = Kept in slow mode

    this.slowDownTimer = null;

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
    if (this.slowDownTimer) {
      clearTimeout(this.slowDownTimer);
      this.slowDownTimer = null;
    }
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

  // Hard Clutch Brake: stops completely while held (Left-Click)
  applyClutch(engaged) {
    if (this.slowDownTimer) {
      clearTimeout(this.slowDownTimer);
      this.slowDownTimer = null;
    }

    this.isBraking = engaged;
    if (!this.isRunning) return;

    if (engaged) {
      this.targetSpeed = 0;
    } else {
      // Restore appropriate speed
      this.targetSpeed = this.isSlowedDown ? Math.max(0.35, this.cruiseSpeed * 0.35) : this.cruiseSpeed;
    }
    this.notifyState();
  }

  // Two-Finger UP: Keeps the slow reading speed!
  applyTwoFingerSlowDown() {
    if (!this.isRunning || this.isBraking) return;

    this.isSlowedDown = true;
    const slowSpeed = Math.max(0.35, Math.round(this.cruiseSpeed * 0.35 * 10) / 10);
    this.targetSpeed = slowSpeed;

    this.notifyState();

    if (this.slowDownTimer) {
      clearTimeout(this.slowDownTimer);
    }

    // Holds the slow speed for 3.5 seconds of reading, or until user swipes DOWN
    this.slowDownTimer = setTimeout(() => {
      this.resumeCruiseSpeed();
    }, 3500);
  }

  // Two-Finger DOWN: Resumes normal full cruise speed immediately!
  resumeCruiseSpeed() {
    if (this.slowDownTimer) {
      clearTimeout(this.slowDownTimer);
      this.slowDownTimer = null;
    }

    if (this.isRunning && this.isSlowedDown) {
      this.isSlowedDown = false;
      this.targetSpeed = this.cruiseSpeed;
      this.notifyState();
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

    const lerpRate = this.isBraking ? 0.35 : 0.12;
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * lerpRate;

    if (this.isBraking && this.currentSpeed < 0.03) {
      this.currentSpeed = 0;
    }

    if (this.currentSpeed > 0.005) {
      const targetDeltaPx = (this.currentSpeed * this.basePixelsPerSec * (dt / 1000));
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
