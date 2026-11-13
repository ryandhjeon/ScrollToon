/**
 * ScrollToon - Morphing Dynamic Island UI
 * Renders inside a Shadow DOM for total style isolation.
 * Morphs between an interactive control bar and a 38px frosted glass bead.
 */
class WebtoonDynamicIsland {
  constructor(scroller) {
    this.scroller = scroller;
    this.isExpanded = true;
    this.autoCollapseTimeout = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.currentPosition = { x: null, y: null }; // Default centered bottom

    this.host = null;
    this.shadow = null;
    this.islandEl = null;

    this.init();
  }

  init() {
    this.createShadowHost();
    this.render();
    this.bindEvents();
    this.setupAutoCollapse();
  }

  createShadowHost() {
    let existing = document.getElementById('scrolltoon-host');
    if (existing) existing.remove();

    this.host = document.createElement('div');
    this.host.id = 'scrolltoon-host';
    this.host.style.position = 'fixed';
    this.host.style.zIndex = '2147483647'; // top-most
    this.host.style.pointerEvents = 'none'; // pass-through except island
    this.host.style.inset = '0';
    document.body.appendChild(this.host);

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

      .island-wrapper {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: auto;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                    width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
                    opacity 0.25s ease;
      }

      /* Liquid Frosted Glass Shell */
      .island-card {
        background: rgba(18, 22, 28, 0.72);
        backdrop-filter: blur(24px) saturate(190%);
        -webkit-backdrop-filter: blur(24px) saturate(190%);
        border: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.45), 
                    0 2px 8px rgba(0, 0, 0, 0.25),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
        border-radius: 9999px;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        overflow: hidden;
        cursor: default;
        transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .island-card:hover {
        border-color: rgba(255, 255, 255, 0.3);
        box-shadow: 0 16px 44px rgba(0, 0, 0, 0.55), 
                    0 4px 12px rgba(0, 0, 0, 0.3),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      /* EXPANDED STATE */
      .island-wrapper.expanded .island-card {
        padding: 6px 14px;
        gap: 12px;
        height: 48px;
      }

      .drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        opacity: 0.4;
        transition: opacity 0.2s;
        padding: 0 2px;
      }
      .drag-handle:hover { opacity: 0.85; }
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
        box-shadow: 0 0 14px rgba(0, 245, 160, 0.45);
      }
      .play-btn:hover {
        transform: scale(1.08);
        background: #2affb0;
        box-shadow: 0 0 20px rgba(0, 245, 160, 0.7);
      }
      .play-btn:active {
        transform: scale(0.94);
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
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .speed-step-btn {
        background: transparent;
        border: none;
        color: rgba(255, 255, 255, 0.7);
        font-size: 14px;
        font-weight: 600;
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
        background: rgba(255, 255, 255, 0.18);
        color: #FFFFFF;
      }

      .speed-display {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: -0.3px;
        color: #00F5A0;
        min-width: 34px;
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
        padding: 3px 7px;
        border-radius: 9999px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.65);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .preset-chip:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #FFF;
      }
      .preset-chip.active {
        background: rgba(0, 245, 160, 0.18);
        border-color: rgba(0, 245, 160, 0.5);
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
        transition: width 0.1s linear;
      }

      .progress-text {
        font-size: 11px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.5);
        min-width: 28px;
      }

      /* Brake status indicator badge */
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
        animation: pulse 1s infinite alternate ease-in-out;
      }
      .brake-badge.active {
        display: inline-block;
      }

      @keyframes pulse {
        from { opacity: 0.7; transform: scale(0.96); }
        to { opacity: 1; transform: scale(1.04); }
      }

      /* COLLAPSED BEAD STATE */
      .island-wrapper.collapsed .island-card {
        width: 42px;
        height: 42px;
        padding: 0;
        justify-content: center;
        cursor: pointer;
        background: rgba(18, 22, 28, 0.85);
      }

      .island-wrapper.collapsed .expanded-content {
        display: none;
      }

      .bead-content {
        display: none;
        position: relative;
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
      }

      .island-wrapper.collapsed .bead-content {
        display: flex;
      }

      .bead-ring-svg {
        position: absolute;
        inset: 2px;
        width: 38px;
        height: 38px;
        transform: rotate(-90deg);
      }
      .bead-ring-bg {
        stroke: rgba(255, 255, 255, 0.12);
        stroke-width: 2.5;
        fill: none;
      }
      .bead-ring-val {
        stroke: #00F5A0;
        stroke-width: 2.5;
        stroke-linecap: round;
        fill: none;
        stroke-dasharray: 100;
        stroke-dashoffset: 100;
        transition: stroke-dashoffset 0.15s ease;
      }

      .bead-speed-text {
        font-size: 11px;
        font-weight: 800;
        color: #FFFFFF;
        letter-spacing: -0.5px;
        z-index: 2;
      }

      /* Clutch alert ring when collapsed */
      .island-wrapper.collapsed.braking .island-card {
        box-shadow: 0 0 16px rgba(255, 71, 87, 0.8);
        border-color: #FF4757;
      }
    `;
  }

  render() {
    this.shadow.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="island-wrapper expanded" id="islandWrapper">
        <div class="island-card" id="islandCard">
          
          <!-- Expanded Mode Content -->
          <div class="expanded-content" style="display: flex; align-items: center; gap: 10px;">
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

            <span class="brake-badge" id="brakeBadge">CLUTCH</span>
          </div>

          <!-- Collapsed Bead Content -->
          <div class="bead-content" id="beadContent" title="Click to expand controls">
            <svg class="bead-ring-svg" viewBox="0 0 36 36">
              <path class="bead-ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
              <path class="bead-ring-val" id="beadRingVal" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"/>
            </svg>
            <span class="bead-speed-text" id="beadSpeedText">1.5</span>
          </div>

        </div>
      </div>
    `;

    this.islandEl = this.shadow.getElementById('islandWrapper');
  }

  bindEvents() {
    const playBtn = this.shadow.getElementById('playBtn');
    const speedDecBtn = this.shadow.getElementById('speedDecBtn');
    const speedIncBtn = this.shadow.getElementById('speedIncBtn');
    const speedCluster = this.shadow.getElementById('speedCluster');
    const presets = this.shadow.querySelectorAll('.preset-chip');
    const beadContent = this.shadow.getElementById('beadContent');
    const dragHandle = this.shadow.getElementById('dragHandle');

    // Play/Pause
    playBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.toggle();
    });

    // Speed Step
    speedDecBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.adjustCruiseSpeed(-0.1);
      this.resetAutoCollapse();
    });
    speedIncBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.scroller.adjustCruiseSpeed(0.1);
      this.resetAutoCollapse();
    });

    // Wheel over speed cluster to dial speed
    speedCluster.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      this.scroller.adjustCruiseSpeed(delta);
      this.resetAutoCollapse();
    }, { passive: false });

    // Preset buttons
    presets.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const speed = parseFloat(btn.getAttribute('data-speed'));
        this.scroller.setCruiseSpeed(speed);
        this.resetAutoCollapse();
      });
    });

    // Clicking collapsed bead restores expanded island
    beadContent.addEventListener('click', (e) => {
      e.stopPropagation();
      this.expand();
    });

    // Dragging
    this.setupDraggable(dragHandle);

    // Expand on hover
    this.islandEl.addEventListener('mouseenter', () => {
      if (!this.isExpanded) {
        this.expand();
      }
      this.clearAutoCollapse();
    });

    this.islandEl.addEventListener('mouseleave', () => {
      if (this.scroller.isRunning) {
        this.scheduleAutoCollapse();
      }
    });
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

  setupAutoCollapse() {
    window.addEventListener('mousemove', () => {
      if (this.scroller.isRunning) {
        this.resetAutoCollapse();
      }
    }, { passive: true });
  }

  scheduleAutoCollapse() {
    this.clearAutoCollapse();
    this.autoCollapseTimeout = setTimeout(() => {
      if (this.scroller.isRunning && !this.isDragging) {
        this.collapse();
      }
    }, 2200);
  }

  clearAutoCollapse() {
    if (this.autoCollapseTimeout) {
      clearTimeout(this.autoCollapseTimeout);
      this.autoCollapseTimeout = null;
    }
  }

  resetAutoCollapse() {
    if (!this.isExpanded) {
      this.expand();
    }
    this.scheduleAutoCollapse();
  }

  collapse() {
    this.isExpanded = false;
    this.islandEl.classList.remove('expanded');
    this.islandEl.classList.add('collapsed');
  }

  expand() {
    this.isExpanded = true;
    this.islandEl.classList.remove('collapsed');
    this.islandEl.classList.add('expanded');
  }

  updateState(state) {
    const playIcon = this.shadow.getElementById('playIcon');
    const pauseIcon = this.shadow.getElementById('pauseIcon');
    const speedDisplay = this.shadow.getElementById('speedDisplay');
    const beadSpeedText = this.shadow.getElementById('beadSpeedText');
    const brakeBadge = this.shadow.getElementById('brakeBadge');
    const presets = this.shadow.querySelectorAll('.preset-chip');

    // Play/Pause icon
    if (state.isRunning) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
      this.scheduleAutoCollapse();
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
      this.expand();
      this.clearAutoCollapse();
    }

    // Speed display
    const formattedSpeed = state.cruiseSpeed.toFixed(1) + 'x';
    speedDisplay.textContent = formattedSpeed;
    beadSpeedText.textContent = state.cruiseSpeed.toFixed(1);

    // Highlight active preset chip if matches
    presets.forEach(p => {
      if (Math.abs(parseFloat(p.getAttribute('data-speed')) - state.cruiseSpeed) < 0.05) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    // Brake status
    if (state.isBraking) {
      brakeBadge.classList.add('active');
      this.islandEl.classList.add('braking');
    } else {
      brakeBadge.classList.remove('active');
      this.islandEl.classList.remove('braking');
    }

    this.updateProgress(state.progress);
  }

  updateProgress(pct) {
    const progressFill = this.shadow.getElementById('progressFill');
    const progressText = this.shadow.getElementById('progressText');
    const beadRingVal = this.shadow.getElementById('beadRingVal');

    const rounded = Math.round(pct);
    if (progressFill) progressFill.style.width = `${rounded}%`;
    if (progressText) progressText.textContent = `${rounded}%`;

    if (beadRingVal) {
      // 100 dashoffset = 0%, 0 dashoffset = 100%
      const offset = 100 - rounded;
      beadRingVal.style.strokeDashoffset = offset;
    }
  }
}

window.ScrollToonIsland = WebtoonDynamicIsland;
