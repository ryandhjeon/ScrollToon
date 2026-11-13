/**
 * ScrollToon - Ultra-Minimal Proximity Ghost Dynamic Island UI
 * Direct tactile key feedback:
 * Pressing ] lights up the '+' button in glowing green.
 * Pressing [ lights up the '-' button in glowing green.
 */
class WebtoonDynamicIsland {
  constructor(scroller) {
    this.scroller = scroller;
    this.isGhosted = false;
    this.proximityThresholdPx = 140;
    this.fadeIdleTimeout = null;
    this.isDragging = false;

    this.host = null;
    this.shadow = null;
    this.islandEl = null;

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

      /* COMPACT ISLAND WRAPPER */
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

      .island-wrapper.ghost {
        opacity: 0.16;
      }

      .island-wrapper:hover {
        opacity: 1 !important;
      }

      /* Frosted Glass Shell */
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
        padding: 0 2px;
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

      /* Speed Controls Cluster */
      .speed-cluster {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        padding: 3px 8px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }

      .speed-cluster.slow-mode {
        border-color: rgba(255, 159, 67, 0.6);
        background: rgba(255, 159, 67, 0.12);
        box-shadow: 0 0 12px rgba(255, 159, 67, 0.3);
      }

      .speed-cluster.brake-mode {
        border-color: rgba(255, 71, 87, 0.7);
        background: rgba(255, 71, 87, 0.15);
        box-shadow: 0 0 16px rgba(255, 71, 87, 0.5);
      }

      /* Tactile Backlit Step Buttons (+ and -) */
      .speed-step-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.65);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.15s ease, color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
      }
      .speed-step-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #FFFFFF;
      }

      /* LIGHT UP GREEN ON PRESS */
      .speed-step-btn.lit-green {
        background: rgba(0, 245, 160, 0.25) !important;
        color: #00F5A0 !important;
        box-shadow: 0 0 12px rgba(0, 245, 160, 0.7) !important;
        transform: scale(1.18) !important;
      }

      /* Unified Speed Display: shows 1.5x, SLOW, or BRAKE */
      .speed-display {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: #00F5A0;
        min-width: 44px;
        text-align: center;
        cursor: ns-resize;
        transition: color 0.2s ease;
      }

      .speed-display.slow {
        color: #FF9F43;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
      }

      .speed-display.brake {
        color: #FF4757;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        animation: pulse 0.7s infinite alternate ease-in-out;
      }

      /* Progress Bar & Reading Stats */
      .reading-progress-bar {
        width: 64px;
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

      @keyframes pulse {
        from { opacity: 0.75; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1.04); }
      }
    `;
  }

  render() {
    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>

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

          <!-- Speed & State Cluster: [ -  1.5x  + ] -->
          <div class="speed-cluster" id="speedCluster" title="Hover & scroll wheel to adjust speed">
            <button class="speed-step-btn" id="speedDecBtn" title="Slow Down [-]">-</button>
            <span class="speed-display" id="speedDisplay">1.5x</span>
            <button class="speed-step-btn" id="speedIncBtn" title="Speed Up [+]">+</button>
          </div>

          <div class="reading-progress-bar">
            <div class="progress-fill" id="progressFill"></div>
          </div>
          <span class="progress-text" id="progressText">0%</span>
        </div>
      </div>
    `;

    this.islandEl = this.shadow.querySelector('#islandWrapper');
  }

  bindEvents() {
    const playBtn = this.shadow.querySelector('#playBtn');
    const speedDecBtn = this.shadow.querySelector('#speedDecBtn');
    const speedIncBtn = this.shadow.querySelector('#speedIncBtn');
    const speedCluster = this.shadow.querySelector('#speedCluster');
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

  // Lights up '+' button green on ], and '-' button green on [
  triggerSpeedFeedback(delta = 0) {
    this.wakeOpacity();

    const speedDecBtn = this.shadow.querySelector('#speedDecBtn');
    const speedIncBtn = this.shadow.querySelector('#speedIncBtn');

    if (delta > 0 && speedIncBtn) {
      speedIncBtn.classList.remove('lit-green');
      void speedIncBtn.offsetWidth; // re-flow
      speedIncBtn.classList.add('lit-green');
      setTimeout(() => speedIncBtn.classList.remove('lit-green'), 320);
    } else if (delta < 0 && speedDecBtn) {
      speedDecBtn.classList.remove('lit-green');
      void speedDecBtn.offsetWidth; // re-flow
      speedDecBtn.classList.add('lit-green');
      setTimeout(() => speedDecBtn.classList.remove('lit-green'), 320);
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
    const speedCluster = this.shadow.querySelector('#speedCluster');

    if (!playIcon || !pauseIcon || !speedDisplay) return;

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

    if (state.isBraking) {
      speedDisplay.textContent = 'BRAKE';
      speedDisplay.className = 'speed-display brake';
      if (speedCluster) speedCluster.className = 'speed-cluster brake-mode';
      this.setGhost(false);
    } else if (state.isSlowedDown) {
      speedDisplay.textContent = 'SLOW';
      speedDisplay.className = 'speed-display slow';
      if (speedCluster) speedCluster.className = 'speed-cluster slow-mode';
      this.setGhost(false);
    } else {
      const formattedSpeed = state.cruiseSpeed.toFixed(1) + 'x';
      speedDisplay.textContent = formattedSpeed;
      speedDisplay.className = 'speed-display';
      if (speedCluster) speedCluster.className = 'speed-cluster';
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
