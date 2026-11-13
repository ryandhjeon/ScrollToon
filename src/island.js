/**
 * ScrollToon - Proximity Ghost Dynamic Island UI with Minimal Speed HUD
 * Renders inside a Shadow DOM for total style isolation.
 * Remains a sleek horizontal control bar that fades to low opacity during cruising,
 * restores full opacity on cursor proximity, and shows a minimal HUD toast on speed changes.
 */
class WebtoonDynamicIsland {
  constructor(scroller) {
    this.scroller = scroller;
    this.isGhosted = false;
    this.proximityThresholdPx = 140; // Cursor distance to wake up full opacity
    this.fadeIdleTimeout = null;
    this.toastTimeout = null;
    this.isDragging = false;

    this.host = null;
    this.shadow = null;
    this.islandEl = null;
    this.toastEl = null;

    this.init();
  }

  init() {
    this.createShadowHost();
    this.render();
    this.bindEvents();
    this.setupProximityWatcher();
  }

  createShadowHost() {
    let existing = document.getElementById('scrolltoon-host');
    if (existing) existing.remove();

    this.host = document.createElement('div');
    this.host.id = 'scrolltoon-host';
    this.host.style.cssText = `
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 0 !important;
      overflow: visible !important;
      z-index: 2147483647 !important;
      pointer-events: none !important;
    `;

    const targetParent = document.body || document.documentElement;
    if (targetParent) {
      targetParent.appendChild(this.host);
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        (document.body || document.documentElement).appendChild(this.host);
      });
    }

    this.shadow = this.host.attachShadow({ mode: 'open' });
  }

  getStyles() {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        user-select: none;
        -webkit-user-select: none;
      }

      /* MINIMAL CENTER SPEED HUD TOAST */
      .speed-toast {
        position: fixed;
        top: 36%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.92);
        background: rgba(16, 20, 26, 0.82);
        backdrop-filter: blur(24px) saturate(190%);
        -webkit-backdrop-filter: blur(24px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.22);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55),
                    0 0 24px rgba(0, 245, 160, 0.2);
        border-radius: 9999px;
        padding: 8px 18px;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #FFFFFF;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 100;
      }

      .speed-toast.visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .toast-icon {
        color: #00F5A0;
        font-size: 14px;
        line-height: 1;
      }

      .toast-val {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.4px;
        color: #FFFFFF;
      }

      .toast-arrow {
        font-size: 12px;
        font-weight: 700;
        color: #00F5A0;
      }

      /* ISLAND WRAPPER */
      .island-wrapper {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: auto;
        opacity: 1;
        transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }

      /* Ghost mode: fades down while reading hands-free */
      .island-wrapper.ghost {
        opacity: 0.16;
      }

      /* Direct hover always forces 100% clarity */
      .island-wrapper:hover {
        opacity: 1 !important;
      }

      /* Frosted Glass Pill */
      .island-card {
        background: rgba(16, 20, 26, 0.78);
        backdrop-filter: blur(24px) saturate(190%);
        -webkit-backdrop-filter: blur(24px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45), 
                    0 2px 8px rgba(0, 0, 0, 0.25),
                    inset 0 1px 0 rgba(255, 255, 255, 0.25);
        border-radius: 9999px;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 14px;
        height: 48px;
        cursor: default;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }

      .island-card:hover {
        border-color: rgba(255, 255, 255, 0.35);
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.6), 
                    0 4px 12px rgba(0, 0, 0, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.35);
      }

      /* Drag handle */
      .drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        opacity: 0.4;
        transition: opacity 0.15s;
        padding: 0 3px;
      }
      .drag-handle:hover { opacity: 0.9; }
      .drag-handle:active { cursor: grabbing; }

      /* Play / Pause Toggle Button */
      .play-btn {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: none;
        background: #00F5A0;
        color: #0C1014;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: transform 0.15s ease, background 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 0 12px rgba(0, 245, 160, 0.45);
      }
      .play-btn:hover {
        transform: scale(1.08);
        background: #2affb0;
        box-shadow: 0 0 18px rgba(0, 245, 160, 0.7);
      }
      .play-btn:active {
        transform: scale(0.92);
      }
      .play-btn svg {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }

      /* Speed Controls */
      .speed-cluster {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        padding: 3px 8px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: transform 0.15s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.15s ease;
      }

      .speed-cluster.pulse {
        transform: scale(1.1);
        border-color: #00F5A0;
        box-shadow: 0 0 14px rgba(0, 245, 160, 0.4);
      }

      .speed-step-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.15s;
      }
      .speed-step-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #FFFFFF;
      }

      .speed-display {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: #00F5A0;
        min-width: 36px;
        text-align: center;
        cursor: ns-resize;
      }

      /* Quick Presets */
      .presets {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .preset-chip {
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.7);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .preset-chip:hover {
        background: rgba(255, 255, 255, 0.18);
        color: #FFF;
      }
      .preset-chip.active {
        background: rgba(0, 245, 160, 0.2);
        border-color: rgba(0, 245, 160, 0.55);
        color: #00F5A0;
      }

      /* Progress Bar & Reading Stats */
      .reading-progress-bar {
        width: 60px;
        height: 4px;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }
      .progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00F5A0, #00D2FF);
        border-radius: 2px;
        transition: width 0.12s linear;
      }

      .progress-text {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.55);
        min-width: 28px;
      }

      /* Clutch / Brake Status Indicator */
      .brake-badge {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        background: #FF4757;
        color: #FFF;
        padding: 2px 7px;
        border-radius: 9999px;
        display: none;
        animation: pulse 0.9s infinite alternate ease-in-out;
      }
      .brake-badge.active {
        display: inline-block;
      }

      @keyframes pulse {
        from { opacity: 0.75; transform: scale(0.97); }
        to { opacity: 1; transform: scale(1.03); }
      }
    `;
  }

  render() {
    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>

      <!-- Minimal Speed Change HUD Toast -->
      <div class="speed-toast" id="speedToast">
        <span class="toast-icon">⚡</span>
        <span class="toast-val" id="toastVal">1.5x</span>
        <span class="toast-arrow" id="toastArrow"></span>
      </div>

      <!-- Main Dynamic Island -->
      <div class="island-wrapper" id="islandWrapper">
        <div class="island-card" id="islandCard">
          
          <div class="drag-handle" id="dragHandle" title="Drag to reposition">
            <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
              <circle cx="2" cy="2" r="1.5"/>
              <circle cx="8" cy="2" r="1.5"/>
              <circle cx="2" cy="8" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="2" cy="14" r="1.5"/>
              <circle cx="8" cy="14" r="1.5"/>
            </svg>
          </div>

          <button class="play-btn" id="playBtn" title="Toggle Auto-Scroll (Space or Middle-Click)">
            <svg id="playIcon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg id="pauseIcon" viewBox="0 0 24 24" style="display:none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>

          <div class="speed-cluster" id="speedCluster" title="Hover & scroll wheel to adjust speed">
            <button class="speed-step-btn" id="speedDecBtn">-</button>
            <span class="speed-display" id="speedDisplay">1.5x</span>
            <button class="speed-step-btn" id="speedIncBtn">+</button>
          </div>

          <div class="presets">
            <button class="preset-chip" data-speed="1.0">1.0x</button>
            <button class="preset-chip active" data-speed="1.5">1.5x</button>
            <button class="preset-chip" data-speed="2.0">2.0x</button>
            <button class="preset-chip" data-speed="3.0">3.0x</button>
          </div>

          <div class="reading-progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <span class="progress-text" id="progressText">0%</span>

          <span class="brake-badge" id="brakeBadge">BRAKE</span>
        </div>
      </div>
    `;

    this.islandEl = this.shadow.querySelector('#islandWrapper');
    this.toastEl = this.shadow.querySelector('#speedToast');
  }

  bindEvents() {
    const playBtn = this.shadow.querySelector('#playBtn');
    const speedDecBtn = this.shadow.querySelector('#speedDecBtn');
    const speedIncBtn = this.shadow.querySelector('#speedIncBtn');
    const speedCluster = this.shadow.querySelector('#speedCluster');
    const presets = this.shadow.querySelectorAll('.preset-chip');
    const dragHandle = this.shadow.querySelector('#dragHandle');

    // Play/Pause
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.toggle();
    });

    // Speed Step
    speedDecBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.adjustCruiseSpeed(-0.1);
      this.triggerSpeedFeedback(-0.1);
    });
    speedIncBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.adjustCruiseSpeed(0.1);
      this.triggerSpeedFeedback(0.1);
    });

    // Wheel over speed cluster to dial speed
    speedCluster.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      this.scroller.adjustCruiseSpeed(delta);
      this.triggerSpeedFeedback(delta);
    }, { passive: false });

    // Preset buttons
    presets.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const speed = parseFloat(btn.getAttribute('data-speed'));
        const diff = speed - this.scroller.cruiseSpeed;
        this.scroller.setCruiseSpeed(speed);
        this.triggerSpeedFeedback(diff);
      });
    });

    // Dragging
    this.setupDraggable(dragHandle);

    // Direct hover on island forces full opacity
    this.islandEl.addEventListener('mouseenter', () => {
      this.clearFadeTimer();
      this.setGhost(false);
    });

    this.islandEl.addEventListener('mouseleave', () => {
      if (this.scroller.isRunning) {
        this.scheduleFade();
      }
    });
  }

  // Shows the minimal HUD toast and pulses the island's speed cluster
  triggerSpeedFeedback(delta = 0) {
    this.wakeOpacity();

    // Pulse the island cluster
    const cluster = this.shadow.querySelector('#speedCluster');
    if (cluster) {
      cluster.classList.remove('pulse');
      void cluster.offsetWidth; // re-flow
      cluster.classList.add('pulse');
      setTimeout(() => cluster.classList.remove('pulse'), 300);
    }

    // Display Toast HUD
    if (this.toastEl) {
      const toastVal = this.shadow.querySelector('#toastVal');
      const toastArrow = this.shadow.querySelector('#toastArrow');

      const speedStr = this.scroller.cruiseSpeed.toFixed(1) + 'x';
      if (toastVal) toastVal.textContent = speedStr;

      if (toastArrow) {
        if (delta > 0) {
          toastArrow.textContent = '▲';
          toastArrow.style.color = '#00F5A0';
        } else if (delta < 0) {
          toastArrow.textContent = '▼';
          toastArrow.style.color = '#FF9F43';
        } else {
          toastArrow.textContent = '';
        }
      }

      this.toastEl.classList.add('visible');

      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
      }
      this.toastTimeout = setTimeout(() => {
        this.toastEl.classList.remove('visible');
        this.toastTimeout = null;
      }, 750);
    }
  }

  setupDraggable(handle) {
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;

    const onMouseDown = (e) => {
      this.isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.islandEl.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const newLeft = Math.max(10, Math.min(window.innerWidth - 60, initialX + dx));
      const newTop = Math.max(10, Math.min(window.innerHeight - 60, initialY + dy));

      this.islandEl.style.left = `${newLeft}px`;
      this.islandEl.style.top = `${newTop}px`;
      this.islandEl.style.bottom = 'auto';
      this.islandEl.style.transform = 'none';
    };

    const onMouseUp = () => {
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);
  }

  // Watches cursor distance to the island
  setupProximityWatcher() {
    window.addEventListener('mousemove', (e) => {
      if (!this.islandEl || this.isDragging) return;

      const rect = this.islandEl.getBoundingClientRect();
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.proximityThresholdPx) {
        this.wakeOpacity();
      } else if (this.scroller.isRunning && !this.isGhosted) {
        this.scheduleFade();
      }
    }, { passive: true });
  }

  wakeOpacity() {
    this.clearFadeTimer();
    this.setGhost(false);
    if (this.scroller.isRunning) {
      this.scheduleFade();
    }
  }

  scheduleFade() {
    this.clearFadeTimer();
    this.fadeIdleTimeout = setTimeout(() => {
      if (this.scroller.isRunning && !this.isDragging) {
        this.setGhost(true);
      }
    }, 1800);
  }

  clearFadeTimer() {
    if (this.fadeIdleTimeout) {
      clearTimeout(this.fadeIdleTimeout);
      this.fadeIdleTimeout = null;
    }
  }

  setGhost(ghost) {
    this.isGhosted = ghost;
    if (ghost) {
      this.islandEl.classList.add('ghost');
    } else {
      this.islandEl.classList.remove('ghost');
    }
  }

  updateState(state) {
    const playIcon = this.shadow.querySelector('#playIcon');
    const pauseIcon = this.shadow.querySelector('#pauseIcon');
    const speedDisplay = this.shadow.querySelector('#speedDisplay');
    const brakeBadge = this.shadow.querySelector('#brakeBadge');
    const presets = this.shadow.querySelectorAll('.preset-chip');

    if (!playIcon || !pauseIcon) return;

    if (state.isRunning) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      this.scheduleFade();
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      this.clearFadeTimer();
      this.setGhost(false);
    }

    const formattedSpeed = state.cruiseSpeed.toFixed(1) + 'x';
    speedDisplay.textContent = formattedSpeed;

    presets.forEach(p => {
      if (Math.abs(parseFloat(p.getAttribute('data-speed')) - state.cruiseSpeed) < 0.05) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    if (state.isBraking) {
      brakeBadge.classList.add('active');
      this.setGhost(false);
    } else {
      brakeBadge.classList.remove('active');
    }

    this.updateProgress(state.progress);
  }

  updateProgress(pct) {
    const progressFill = this.shadow.querySelector('#progressFill');
    const progressText = this.shadow.querySelector('#progressText');

    const rounded = Math.round(pct);
    if (progressFill) progressFill.style.width = `${rounded}%`;
    if (progressText) progressText.textContent = `${rounded}%`;
  }
}

window.ScrollToonIsland = WebtoonDynamicIsland;
