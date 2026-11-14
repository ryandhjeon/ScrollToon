/**
 * ScrollToon - 120Hz Sub-pixel Physics Scroll Engine
 * Pure, reliable, and rock-solid:
 * Cruising with exponential spring easing.
 * Left-Click Hold = Hard Brake (Decelerates smoothly to 0).
 * Trackpad is 100% native and untouched.
 */
class WebtoonScroller {
  constructor(options = {}) {
    this.cruiseSpeed = options.defaultSpeed || 1.5;
    this.basePixelsPerSec = 110;
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.isRunning = false;
    this.isBraking = false; // Left-Click hold
    this.isTrackpadYielding = false; // Two-finger trackpad scroll & hold yield

    // Sub-pixel accumulator
    this.subPixelRemainder = 0;
    this.lastTimestamp = null;
    this.animationFrameId = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onProgressUpdate = options.onProgressUpdate || (() => {});

    // Active scrolling element
    this.scrollContainer = this.detectScrollContainer();
    this.onScroll = null;
    this.onResize = null;
    this.resizeObserver = null;

    this.setupResizeListener();
    this.setupScrollListener();
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
    this.onResize = () => {
      this.scrollContainer = this.detectScrollContainer();
      this.onProgressUpdate(this.getProgress());
    };
    window.addEventListener('resize', this.onResize, { passive: true });

    // Continuously observe document height mutations as lazy-loaded images load
    if (typeof ResizeObserver !== 'undefined' && document.documentElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.onProgressUpdate(this.getProgress());
      });
      this.resizeObserver.observe(document.documentElement);
    }
  }

  setupScrollListener() {
    this.onScroll = () => {
      // Updates progress in real-time on manual scrolling even when stopped!
      this.onProgressUpdate(this.getProgress());
    };

    window.addEventListener('scroll', this.onScroll, { passive: true });
    document.addEventListener('scroll', this.onScroll, { passive: true });
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('scroll', this.onScroll, { passive: true });
    }

    // Trigger immediate calculation
    setTimeout(() => {
      this.onProgressUpdate(this.getProgress());
    }, 50);
  }

  getScrollTop() {
    if (!this.scrollContainer) {
      return window.scrollY || window.pageYOffset || (document.documentElement ? document.documentElement.scrollTop : 0) || (document.body ? document.body.scrollTop : 0) || 0;
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
    if (!max || max <= 5) return 0;
    const current = this.getScrollTop();
    const pct = (current / max) * 100;
    if (isNaN(pct) || !isFinite(pct)) return 0;
    return Math.min(100, Math.max(0, pct));
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isBraking = false;
    this.isTrackpadYielding = false;
    this.targetSpeed = this.cruiseSpeed;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
    this.notifyState();
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.isBraking = false;
    this.isTrackpadYielding = false;
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
    this.cruiseSpeed = Math.max(0.2, Math.min(7.0, Math.round(speed * 10) / 10));
    if (this.isRunning && !this.isBraking && !this.isTrackpadYielding) {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  adjustCruiseSpeed(delta) {
    this.setCruiseSpeed(this.cruiseSpeed + delta);
  }

  // Hard Brake (Left-Click Hold): smoothly drops target speed to 0
  setHardBrake(active) {
    if (this.isBraking === active) return;
    this.isBraking = active;
    if (!this.isRunning) return;

    if (active || this.isTrackpadYielding) {
      this.targetSpeed = 0;
    } else {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  // Two-Finger Trackpad Yield: drops immediately to 0 ("close to pause") while scrolling,
  // and smoothly accelerates back to cruising speed when fingers are off.
  setTrackpadYield(active) {
    if (this.isTrackpadYielding === active) return;
    this.isTrackpadYielding = active;
    if (!this.isRunning) return;

    if (active) {
      this.currentSpeed = 0; // Cut downward velocity immediately so trackpad has full free control
      this.targetSpeed = 0;
      this.subPixelRemainder = 0;
    } else if (this.isBraking) {
      this.targetSpeed = 0;
    } else {
      this.targetSpeed = this.cruiseSpeed;
    }
    this.notifyState();
  }

  notifyState() {
    this.onStateChange({
      isRunning: this.isRunning,
      isBraking: this.isBraking,
      isTrackpadYielding: this.isTrackpadYielding,
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

    // Organic exponential spring physics:
    // Deceleration (8.0): frictionless, rapid drop to pause when touching trackpad.
    // Acceleration (4.2): gentle, luxurious ease-in resumption when fingers are off.
    const isDecelerating = this.targetSpeed < this.currentSpeed;
    const lambda = isDecelerating ? 8.0 : 4.2;
    const decay = Math.exp(-lambda * dtSeconds);

    this.currentSpeed = this.targetSpeed + (this.currentSpeed - this.targetSpeed) * decay;

    if (Math.abs(this.currentSpeed - this.targetSpeed) < 0.01) {
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

  destroy() {
    this.stop();
    if (this.onScroll) {
      window.removeEventListener('scroll', this.onScroll);
      document.removeEventListener('scroll', this.onScroll);
      if (this.scrollContainer) {
        this.scrollContainer.removeEventListener('scroll', this.onScroll);
      }
    }
    if (this.onResize) {
      window.removeEventListener('resize', this.onResize);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}

window.ScrollToonScroller = WebtoonScroller;
