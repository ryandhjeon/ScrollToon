/**
 * ScrollToon - Main Content Script
 * Manual Activation Architecture:
 * - Completely dormant by default (never pops up uninvited on any webpage).
 * - Turned on manually via Option+S (Alt+S) or the Chrome Extension popup.
 * - Stays active across chapter navigations within the same tab via sessionStorage.
 */
(function() {
  if (window.__SCROLLTOON_INITIALIZED__) {
    return;
  }
  window.__SCROLLTOON_INITIALIZED__ = true;

  const defaultSettings = {
    defaultSpeed: 1.5,
    enableLeftClickBrake: true,
    enableMiddleClickToggle: true,
    enableDoubleTapToggle: true,
    islandPosition: null
  };

  let currentSettings = { ...defaultSettings };
  let isMounted = false;

  let preloader = null;
  let scroller = null;
  let island = null;
  let clutch = null;

  function mount() {
    if (isMounted) return;
    isMounted = true;
    try {
      sessionStorage.setItem('scrolltoon_tab_active', 'true');
    } catch (e) {}

    // 1. Initialize proactive preloader
    if (window.ScrollToonPreloader) {
      preloader = new window.ScrollToonPreloader();
    }

    // 2. Create Scroller Engine
    if (window.ScrollToonScroller) {
      scroller = new window.ScrollToonScroller({
        defaultSpeed: currentSettings.defaultSpeed,
        onStateChange: (state) => {
          if (island) island.updateState(state);
        },
        onProgressUpdate: (progress) => {
          if (island) island.updateProgress(progress);
        }
      });
    }

    // 3. Create Dynamic Island UI
    if (window.ScrollToonIsland && scroller) {
      island = new window.ScrollToonIsland(scroller, {
        initialPosition: currentSettings.islandPosition
      });

      // Initial state push
      island.updateState({
        isRunning: false,
        isBraking: false,
        cruiseSpeed: scroller.cruiseSpeed,
        currentSpeed: 0,
        progress: scroller.getProgress()
      });
    }

    // 4. Initialize Controls (Left-Click hold = Brake, [ / ] = Speed adjustment)
    if (window.ScrollToonClutch && scroller) {
      clutch = new window.ScrollToonClutch(scroller, {
        enableLeftClickBrake: currentSettings.enableLeftClickBrake,
        enableMiddleClickToggle: currentSettings.enableMiddleClickToggle,
        enableDoubleTapToggle: currentSettings.enableDoubleTapToggle,
        onSpeedChange: (delta) => {
          if (island) island.triggerSpeedFeedback(delta);
        }
      });
    }

    // Save speed preference whenever user adjusts it
    if (scroller) {
      const originalSetCruiseSpeed = scroller.setCruiseSpeed.bind(scroller);
      scroller.setCruiseSpeed = function(newSpeed) {
        originalSetCruiseSpeed(newSpeed);
        currentSettings.defaultSpeed = scroller.cruiseSpeed;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set({ defaultSpeed: scroller.cruiseSpeed });
        }
      };
    }
  }

  function unmount() {
    if (!isMounted) return;
    isMounted = false;
    try {
      sessionStorage.removeItem('scrolltoon_tab_active');
    } catch (e) {}

    if (scroller) {
      scroller.destroy();
      scroller = null;
    }
    if (clutch) {
      clutch.destroy();
      clutch = null;
    }
    if (island) {
      island.destroy();
      island = null;
    }
    if (preloader) {
      preloader.destroy();
      preloader = null;
    }
  }

  function toggleTool() {
    if (isMounted) {
      unmount();
    } else {
      mount();
    }
    return isMounted;
  }

  // Keyboard shortcut: Alt + S (Option + S on Mac) to toggle on/off
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ß')) {
      const tag = document.activeElement ? document.activeElement.tagName : '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (document.activeElement && document.activeElement.isContentEditable)) {
        return;
      }
      e.preventDefault();
      toggleTool();
    }
  }, { capture: true });

  // Listen for messages from popup
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'toggleActive') {
        const active = toggleTool();
        sendResponse({ isMounted: active });
      } else if (msg.action === 'setActive') {
        if (msg.enable) {
          mount();
        } else {
          unmount();
        }
        sendResponse({ isMounted: isMounted });
      } else if (msg.action === 'getTabStatus') {
        sendResponse({
          isMounted,
          isRunning: scroller ? scroller.isRunning : false,
          speed: scroller ? scroller.cruiseSpeed : (currentSettings.defaultSpeed || 1.5)
        });
      } else if (msg.action === 'resetPosition') {
        if (island) island.resetPosition();
        sendResponse({ status: 'ok' });
      }
    });
  }

  // Load preferences from sync storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(defaultSettings, (stored) => {
      currentSettings = { ...defaultSettings, ...(stored || {}) };
      let wasActiveInTab = false;
      try {
        wasActiveInTab = sessionStorage.getItem('scrolltoon_tab_active') === 'true';
      } catch (e) {}

      if (wasActiveInTab) {
        mount();
      }
    });
  }
})();
