/**
 * ScrollToon - Ultra-Minimal Proximity Ghost Dynamic Island UI
 * Speed appears in a crisp, 100% opaque layer directly ABOVE the tool
 * so you can see the updated speed with crystal-clear contrast.
 */
class WebtoonDynamicIsland {
  constructor(scroller, options = {}) {
    this.scroller = scroller;
    this.initialPosition = options.initialPosition || null;
    this.isGhosted = false;
    this.proximityThresholdPx = 140;
    this.fadeIdleTimeout = null;
    this.feedbackTimeout = null;
    this.lightingTimeout = null;
    this.hasInitializedRunning = false;
    this.wasRunning = false;
    this.speedStep = typeof options.speedStep === 'number' && options.speedStep > 0 ? options.speedStep : 0.1;
    this.isDragging = false;
    this.wasBraking = false;

    this.host = null;
    this.shadow = null;
    this.islandEl = null;
    this.cardEl = null;

    this.init();
  }

  init() {
    this.createShadowHost();
    this.render();
    if (this.initialPosition) {
      this.setPosition(this.initialPosition);
    }
    this.bindEvents();
    this.setupProximityWatcher();
    this.setupWindowResize();
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
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      /* Flat Shell (No blur filter to keep comic art crystal clear) */
      .island-card {
        background: rgba(16, 20, 26, 0.92);
        border: none;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.45);
        border-radius: 9999px;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 6px 14px;
        height: 48px;
        cursor: default;
        transition: background 0.25s ease,
                    opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    box-shadow 0.2s ease;
      }

      /* Ghost mode: Pure ultra-low opacity with ZERO background blur */
      .island-card.ghost {
        background: rgba(0, 0, 0, 0.04);
        box-shadow: none;
      }

      .island-card.ghost .speed-cluster {
        background: transparent;
      }

      .island-card.ghost .play-btn {
        box-shadow: none;
      }

      .island-card.ghost .drag-handle,
      .island-card.ghost .play-btn,
      .island-card.ghost .speed-step-btn,
      .island-card.ghost .reading-progress-bar,
      .island-card.ghost .progress-text {
        opacity: 0.05;
        transition: opacity 0.3s ease;
      }

      /* Normal cruising speed text in ghost mode */
      .island-card.ghost .speed-display {
        opacity: 0.08;
        font-weight: 500;
        transition: opacity 0.3s ease;
      }

      /* Active feedback: Crisp 100% Solid White Speed in Center (No bold) */
      .island-card.ghost .speed-display.active-feedback {
        opacity: 1 !important;
        color: #FFFFFF !important;
        font-weight: 500 !important;
        transform: none;
      }

      /* Active Brake: Crisp 100% Solid Red BRAKE in Center! */
      .island-card.ghost .speed-display.brake {
        opacity: 1 !important;
        color: #FF4757 !important;
        font-weight: 800;
      }

      .island-card:hover {
        background: rgba(16, 20, 26, 0.92) !important;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.65), 
                    0 4px 14px rgba(0, 0, 0, 0.4);
      }

      .island-card:hover .speed-cluster {
        background: rgba(255, 255, 255, 0.08) !important;
      }

      .island-card:hover .drag-handle,
      .island-card:hover .play-btn,
      .island-card:hover .speed-step-btn,
      .island-card:hover .reading-progress-bar,
      .island-card:hover .progress-text,
      .island-card:hover .speed-display {
        opacity: 1 !important;
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
        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                    background 0.25s ease,
                    box-shadow 0.25s ease,
                    opacity 0.3s ease;
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

      /* Lighting Animation: START (Play) */
      @keyframes iconLightingStart {
        0% {
          transform: scale(0.85);
          box-shadow: 0 0 0 rgba(0, 245, 160, 0);
          filter: brightness(1.7);
        }
        30% {
          transform: scale(1.24);
          box-shadow: 0 0 24px rgba(0, 245, 160, 1), 0 0 46px rgba(0, 245, 160, 0.6);
          filter: brightness(1.35);
        }
        60% {
          transform: scale(1.0);
          box-shadow: 0 0 16px rgba(0, 245, 160, 0.7);
          filter: brightness(1.1);
        }
        100% {
          transform: scale(1.0);
          box-shadow: 0 0 8px rgba(0, 245, 160, 0.3);
          filter: brightness(1.0);
        }
      }

      /* Lighting Animation: STOP (Pause) */
      @keyframes iconLightingStop {
        0% {
          transform: scale(0.85);
          box-shadow: 0 0 0 rgba(255, 71, 87, 0);
          filter: brightness(1.7);
        }
        30% {
          transform: scale(1.24);
          box-shadow: 0 0 24px rgba(255, 71, 87, 1), 0 0 46px rgba(255, 71, 87, 0.6);
          filter: brightness(1.35);
        }
        60% {
          transform: scale(1.0);
          box-shadow: 0 0 16px rgba(255, 71, 87, 0.7);
          filter: brightness(1.1);
        }
        100% {
          transform: scale(1.0);
          box-shadow: 0 0 8px rgba(255, 71, 87, 0.3);
          filter: brightness(1.0);
        }
      }

      .island-card.ghost .play-btn.light-start,
      .play-btn.light-start {
        opacity: 1 !important;
        background: #00F5A0 !important;
        color: #0C1014 !important;
        animation: iconLightingStart 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .island-card.ghost .play-btn.light-stop,
      .play-btn.light-stop {
        opacity: 1 !important;
        background: #FF4757 !important;
        color: #FFFFFF !important;
        animation: iconLightingStop 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      /* Speed Controls Cluster */
      .speed-cluster {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.08);
        padding: 3px 8px;
        border-radius: 9999px;
        border: none;
      }

      .speed-cluster.brake-mode {
        border: none;
        background: rgba(255, 71, 87, 0.2);
        box-shadow: none;
      }

      /* Stepper Buttons (- and +) */
      .speed-step-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.6);
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background 0.15s ease, color 0.15s ease;
      }
      .speed-step-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        color: #FFFFFF;
      }

      /* Speed Display in the Middle */
      .speed-display {
        font-size: 13px;
        font-weight: 500;
        letter-spacing: -0.3px;
        color: #00F5A0;
        min-width: 44px;
        text-align: center;
        cursor: ns-resize;
      }

      .speed-display.active-feedback {
        color: #FFFFFF !important;
        font-weight: 500 !important;
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

      <div class="island-wrapper" id="islandWrapper">
        <!-- MAIN TOOL CARD -->
        <div class="island-card" id="islandCard">
          
          <div class="drag-handle" id="dragHandle" title="Drag to reposition (Double-click to reset position)">
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
    this.cardEl = this.shadow.querySelector('#islandCard');
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
      this.scroller.adjustCruiseSpeed(-this.speedStep);
      this.triggerSpeedFeedback();
    });
    speedIncBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.adjustCruiseSpeed(this.speedStep);
      this.triggerSpeedFeedback();
    });

    // Wheel over speed cluster to dial speed
    speedCluster.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? this.speedStep : -this.speedStep;
      this.scroller.adjustCruiseSpeed(delta);
      this.triggerSpeedFeedback();
    }, { passive: false });

    // Dragging
    this.setupDraggable(dragHandle);

    // Direct hover on card forces full opacity
    this.cardEl.addEventListener('mouseenter', () => {
      this.clearFadeTimer();
      this.setGhost(false);
    });

    this.cardEl.addEventListener('mouseleave', () => {
      this.scheduleFade();
    });
  }

  setSpeedStep(step) {
    if (typeof step === 'number' && !isNaN(step) && step > 0) {
      this.speedStep = Math.round(step * 10) / 10;
    }
  }

  // Highlights updated speed directly on the center speed display in crisp 100% solid white
  triggerSpeedFeedback() {
    const speedDisplay = this.shadow.querySelector('#speedDisplay');
    if (!speedDisplay || this.scroller.isBraking) return;

    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
    }

    speedDisplay.textContent = this.scroller.cruiseSpeed.toFixed(1) + 'x';
    speedDisplay.className = 'speed-display active-feedback';

    // Keep crisp white for 850ms, then smoothly fade back to ghost opacity
    this.feedbackTimeout = setTimeout(() => {
      speedDisplay.classList.remove('active-feedback');
      this.feedbackTimeout = null;
    }, 850);
  }

  // Triggers a radiant lighting flash animation on the Start / Stop icon
  triggerIconLighting(type) {
    const playBtn = this.shadow.querySelector('#playBtn');
    if (!playBtn) return;

    if (this.lightingTimeout) {
      clearTimeout(this.lightingTimeout);
    }

    playBtn.classList.remove('light-start', 'light-stop');
    // Force DOM reflow so repeated toggles replay animation cleanly
    void playBtn.offsetWidth;

    playBtn.classList.add(type === 'START' ? 'light-start' : 'light-stop');

    this.lightingTimeout = setTimeout(() => {
      playBtn.classList.remove('light-start', 'light-stop');
      this.lightingTimeout = null;
    }, 900);
  }

  setupDraggable(handle) {
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;
    let hasMoved = false;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      this.isDragging = true;
      hasMoved = false;
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

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        hasMoved = true;
      }

      const rect = this.islandEl.getBoundingClientRect();
      const newLeft = Math.max(10, Math.min(window.innerWidth - rect.width - 10, initialX + dx));
      const newTop = Math.max(10, Math.min(window.innerHeight - rect.height - 10, initialY + dy));

      this.islandEl.style.left = `${newLeft}px`;
      this.islandEl.style.top = `${newTop}px`;
      this.islandEl.style.bottom = 'auto';
      this.islandEl.style.transform = 'none';
    };

    const onMouseUp = () => {
      if (this.isDragging && hasMoved) {
        const rect = this.islandEl.getBoundingClientRect();
        this.savePosition({ left: Math.round(rect.left), top: Math.round(rect.top) });
      }
      this.isDragging = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', onMouseDown);

    // Double-click handle to reset directly back to default bottom-center position
    handle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.resetPosition();
    });
  }

  savePosition(pos) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ islandPosition: pos });
    }
  }

  setPosition(pos) {
    if (!this.islandEl || !pos || typeof pos.left !== 'number' || typeof pos.top !== 'number') return;
    const rect = this.islandEl.getBoundingClientRect();
    const width = rect.width || 280;
    const height = rect.height || 48;
    const safeLeft = Math.max(10, Math.min(window.innerWidth - width - 10, pos.left));
    const safeTop = Math.max(10, Math.min(window.innerHeight - height - 10, pos.top));

    this.islandEl.style.left = `${safeLeft}px`;
    this.islandEl.style.top = `${safeTop}px`;
    this.islandEl.style.bottom = 'auto';
    this.islandEl.style.transform = 'none';
  }

  resetPosition() {
    if (!this.islandEl) return;
    this.islandEl.style.transition = 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), bottom 0.3s ease';
    this.islandEl.style.left = '';
    this.islandEl.style.top = '';
    this.islandEl.style.bottom = '';
    this.islandEl.style.transform = '';

    setTimeout(() => {
      if (this.islandEl) {
        this.islandEl.style.transition = '';
      }
    }, 350);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.remove('islandPosition');
    }
  }

  setupWindowResize() {
    window.addEventListener('resize', () => {
      if (!this.islandEl || !this.islandEl.style.left || this.islandEl.style.left === '') return;
      const rect = this.islandEl.getBoundingClientRect();
      const safeLeft = Math.max(10, Math.min(window.innerWidth - rect.width - 10, rect.left));
      const safeTop = Math.max(10, Math.min(window.innerHeight - rect.height - 10, rect.top));
      this.islandEl.style.left = `${safeLeft}px`;
      this.islandEl.style.top = `${safeTop}px`;
    }, { passive: true });
  }

  setupProximityWatcher() {
    window.addEventListener('mousemove', (e) => {
      if (!this.cardEl || this.isDragging) return;

      const rect = this.cardEl.getBoundingClientRect();
      const dx = Math.max(rect.left - e.clientX, 0, e.clientX - rect.right);
      const dy = Math.max(rect.top - e.clientY, 0, e.clientY - rect.bottom);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.proximityThresholdPx) {
        this.wakeOpacity();
      } else if (!this.isGhosted) {
        this.scheduleFade();
      }
    }, { passive: true });
  }

  wakeOpacity() {
    this.clearFadeTimer();
    this.setGhost(false);
    this.scheduleFade();
  }

  scheduleFade() {
    this.clearFadeTimer();
    this.fadeIdleTimeout = setTimeout(() => {
      if (!this.isDragging && (!this.cardEl || !this.cardEl.matches(':hover'))) {
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
    if (!this.cardEl) return;
    if (ghost) {
      this.cardEl.classList.add('ghost');
    } else {
      this.cardEl.classList.remove('ghost');
      const speedDisplay = this.shadow.querySelector('#speedDisplay');
      if (speedDisplay && !this.scroller.isBraking) {
        speedDisplay.classList.remove('active-feedback');
      }
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
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }

    if (!this.cardEl.matches(':hover') && !this.isDragging) {
      this.scheduleFade();
    }

    // Check for Start / Stop running transitions to trigger lighting animation on the icon
    if (!this.hasInitializedRunning) {
      this.hasInitializedRunning = true;
      this.wasRunning = !!state.isRunning;
    } else if (this.wasRunning !== !!state.isRunning) {
      const isNowRunning = !!state.isRunning;
      this.wasRunning = isNowRunning;
      this.triggerIconLighting(isNowRunning ? 'START' : 'STOP');
    }

    if (state.isBraking) {
      speedDisplay.textContent = 'BRAKE';
      speedDisplay.className = 'speed-display brake';
      if (speedCluster) speedCluster.className = 'speed-cluster brake-mode';
    } else {
      const formattedSpeed = state.cruiseSpeed.toFixed(1) + 'x';
      speedDisplay.textContent = formattedSpeed;
      if (!speedDisplay.classList.contains('active-feedback')) {
        speedDisplay.className = 'speed-display';
      }
      if (speedCluster) speedCluster.className = 'speed-cluster';
    }
    this.wasBraking = !!state.isBraking;

    this.updateProgress(state.progress);
  }

  updateProgress(pct) {
    const progressFill = this.shadow.querySelector('#progressFill');
    const progressText = this.shadow.querySelector('#progressText');

    const validPct = (typeof pct === 'number' && !isNaN(pct) && isFinite(pct)) ? pct : 0;
    const rounded = Math.min(100, Math.max(0, Math.round(validPct)));
    if (progressFill) progressFill.style.width = `${rounded}%`;
    if (progressText) progressText.textContent = `${rounded}%`;
  }

  destroy() {
    this.clearFadeTimer();
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout);
      this.feedbackTimeout = null;
    }
    if (this.lightingTimeout) {
      clearTimeout(this.lightingTimeout);
      this.lightingTimeout = null;
    }
    if (this.host) {
      this.host.remove();
      this.host = null;
    }
  }
}

window.ScrollToonIsland = WebtoonDynamicIsland;
