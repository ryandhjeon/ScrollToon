/**
 * ScrollToon - 120Hz Sub-pixel Physics Scroll Engine
 * Uses float accumulation + spring interpolation with responsive friction braking.
 */
class WebtoonScroller {
  constructor(options = {}) {
    this.cruiseSpeed = options.defaultSpeed || 1.5;
    this.basePixelsPerSec = 110;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.isRunning = false;
    this.isBraking = false; // Clutch or two-finger friction brake engaged

    // Recovery timer for dynamic touchpad friction
    this.frictionTimer = null;

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
    if (this.frictionTimer) {
      clearTimeout(this.frictionTimer);
      this.frictionTimer = null;
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
    if (this.isRunning && !this.isBraking) {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  adjustCruiseSpeed(delta) {
    this.setCruiseSpeed(this.cruiseSpeed + delta);
  }

  // Engage clutch / brake: smoothly drop target speed to 0
  applyClutch(engaged) {
    if (this.frictionTimer) {
      clearTimeout(this.frictionTimer);
      this.frictionTimer = null;
    }

    this.isBraking = engaged;
    if (!this.isRunning) return;

    if (engaged) {
      this.targetSpeed = 0;
    } else {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  // Two-Finger Touchpad Friction Braking
  applyTwoFingerBrake(brakeAmount = 0.4) {
    if (!this.isRunning) return;

    this.isBraking = true;
    // Drop both target speed and current speed proportionally
    this.targetSpeed = Math.max(0, this.targetSpeed - brakeAmount);
    this.currentSpeed = Math.max(0, this.currentSpeed - (brakeAmount * 0.8));

    this.notifyState();

    // Reset recovery timer: hold the brake while two fingers are dragging up,
    // then smoothly ease back to cruising speed 600ms after fingers stop
    if (this.frictionTimer) {
      clearTimeout(this.frictionTimer);
    }

    this.frictionTimer = setTimeout(() => {
      if (this.isRunning && this.isBraking) {
        this.isBraking = false;
        this.targetSpeed = this.cruiseSpeed;
        this.notifyState();
      }
      this.frictionTimer = null;
    }, 550);
  }

  // Forward scroll boost
  applyBoost(amount = 0.4) {
    if (!this.isRunning || this.isBraking) return;
    this.currentSpeed = Math.min(this.cruiseSpeed * 2.2, this.currentSpeed + amount);
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

    const dt = Math.min(64, now - (this.lastTimestamp || now));
    this.lastTimestamp = now;

    // Physics interpolation:
    // When braking: rapid deceleration curve
    // When accelerating: gentle ease-in ramp
    const lerpRate = this.isBraking ? 0.22 : 0.09;
    this.currentSpeed += (this.targetSpeed - this.currentSpeed) * lerpRate;

    if (this.isBraking && this.currentSpeed < 0.02) {
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
