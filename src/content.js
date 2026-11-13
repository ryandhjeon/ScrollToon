/**
 * ScrollToon - Main Content Script
 * Wires Preloader, Physics Scroller, Clutch Controller, and Dynamic Island together.
 */
(function() {
  if (window.__SCROLLTOON_INITIALIZED__) return;
  window.__SCROLLTOON_INITIALIZED__ = true;

  // 1. Initialize proactive preloader
  const preloader = new window.ScrollToonPreloader();

  // 2. Default preferences
  const defaultSettings = {
    defaultSpeed: 1.5,
    enableLeftClickBrake: true,
    enableMiddleClickToggle: true,
    enableDoubleTapToggle: true
  };

  function boot(settings) {
    let island = null;

    // 3. Create Scroller Engine
    const scroller = new window.ScrollToonScroller({
      defaultSpeed: settings.defaultSpeed,
      onStateChange: (state) => {
        if (island) island.updateState(state);
      },
      onProgressUpdate: (progress) => {
        if (island) island.updateProgress(progress);
      }
    });

    // 4. Create Dynamic Island UI
    island = new window.ScrollToonIsland(scroller);

    // Initial state push
    island.updateState({
      isRunning: false,
      isBraking: false,
      cruiseSpeed: scroller.cruiseSpeed,
      currentSpeed: 0,
      progress: scroller.getProgress()
    });

    // 5. Initialize Controls (Left-Click hold = Brake, [ / ] = Speed adjustment)
    const clutch = new window.ScrollToonClutch(scroller, {
      enableLeftClickBrake: settings.enableLeftClickBrake,
      enableMiddleClickToggle: settings.enableMiddleClickToggle,
      enableDoubleTapToggle: settings.enableDoubleTapToggle,
      onSpeedChange: (delta) => {
        if (island) island.triggerSpeedFeedback(delta);
      }
    });

    // Save speed preference whenever user adjusts it
    const originalSetCruiseSpeed = scroller.setCruiseSpeed.bind(scroller);
    scroller.setCruiseSpeed = function(newSpeed) {
      originalSetCruiseSpeed(newSpeed);
      if (chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ defaultSpeed: scroller.cruiseSpeed });
      }
    };

    // Listen for messages from popup or background
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'toggle') {
          scroller.toggle();
          sendResponse({ status: scroller.isRunning });
        } else if (msg.action === 'setSpeed') {
          const diff = msg.speed - scroller.cruiseSpeed;
          scroller.setCruiseSpeed(msg.speed);
          if (island) island.triggerSpeedFeedback(diff);
          sendResponse({ speed: scroller.cruiseSpeed });
        }
      });
    }
  }

  if (chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(defaultSettings, (stored) => {
      boot(stored || defaultSettings);
    });
  } else {
    boot(defaultSettings);
  }
})();
