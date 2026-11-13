/**
 * ScrollToon - Main Content Script
 * Wires Preloader, Physics Scroller, Clutch Controller, and Dynamic Island together.
 * Supports Smart Reader Detection, Master Power Switch, and Dynamic SPA Navigation.
 */
(function() {
  if (window.__SCROLLTOON_INITIALIZED__) return;
  window.__SCROLLTOON_INITIALIZED__ = true;

  const defaultSettings = {
    enabled: true,
    autoDetectOnly: true,
    defaultSpeed: 1.5,
    enableLeftClickBrake: true,
    enableMiddleClickToggle: true,
    enableDoubleTapToggle: true,
    islandPosition: null
  };

  let currentSettings = { ...defaultSettings };
  let isMounted = false;
  let forceEnabledOnTab = false;

  let preloader = null;
  let scroller = null;
  let island = null;
  let clutch = null;

  function isWebtoonReaderPage() {
    const href = window.location.href;

    // 1. URL Path patterns for known comic platforms & chapter readers
    const readerUrlPatterns = [
      /webtoons\.com\/.*\/viewer/i,           // Line Webtoons
      /comic\.naver\.com\/webtoon\/detail/i,  // Naver Webtoon
      /tapas\.io\/episode\//i,                // Tapas
      /mangadex\.org\/chapter\//i,            // MangaDex
      /lezhin\.com\/.*\/[0-9]+/i,             // Lezhin
      /lezhinus\.com\/.*\/[0-9]+/i,
      /\/chapter[-_0-9]/i,                    // Scanlation chapter readers (Asura, Reaper, etc.)
      /\/ch[-_0-9]/i,
      /\/read\//i,
      /\/episode[-_0-9]/i,
      /\/viewer\b/i,
      /demo\.html/i                           // Local test canvas
    ];

    if (readerUrlPatterns.some(regex => regex.test(href))) {
      return true;
    }

    // 2. Specific reader DOM containers
    const readerSelectors = [
      '#_imageList',                          // Naver/Webtoons episode image canvas
      '#viewerBox',
      '.viewer-box',
      '.viewer_img',
      '#reader-area',                         // MangaDex / WP Manga
      '.reading-content',                     // Madara theme (Asura, Reaper, Flame, etc.)
      '.comic-container',                     // ScrollToon test canvas
      '.chapter-content',
      '#chapter-video-frame',
      '.page-break',
      '.comic-page',
      '.manga-reader',
      '.ts-main-image'
    ];

    for (const sel of readerSelectors) {
      if (document.querySelector(sel)) {
        return true;
      }
    }

    // 3. Heuristic: page has 3+ sequential images and scrollable height > 2.2x window height
    const images = document.querySelectorAll('img');
    const scrollHeight = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );

    if (images.length >= 3 && scrollHeight > window.innerHeight * 2.2) {
      let tallImagesCount = 0;
      for (let i = 0; i < images.length && i < 20; i++) {
        const img = images[i];
        if (img.naturalHeight > 300 || img.height > 300 || img.hasAttribute('data-src') || img.hasAttribute('data-original') || img.hasAttribute('data-url')) {
          tallImagesCount++;
        }
      }
      if (tallImagesCount >= 2) {
        return true;
      }
    }

    return false;
  }

  function mount() {
    if (isMounted) return;
    isMounted = true;

    // 1. Initialize proactive preloader
    preloader = new window.ScrollToonPreloader();

    // 2. Create Scroller Engine
    scroller = new window.ScrollToonScroller({
      defaultSpeed: currentSettings.defaultSpeed,
      onStateChange: (state) => {
        if (island) island.updateState(state);
      },
      onProgressUpdate: (progress) => {
        if (island) island.updateProgress(progress);
      }
    });

    // 3. Create Dynamic Island UI
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

    // 4. Initialize Controls (Left-Click hold = Brake, [ / ] = Speed adjustment)
    clutch = new window.ScrollToonClutch(scroller, {
      enableLeftClickBrake: currentSettings.enableLeftClickBrake,
      enableMiddleClickToggle: currentSettings.enableMiddleClickToggle,
      enableDoubleTapToggle: currentSettings.enableDoubleTapToggle,
      onSpeedChange: (delta) => {
        if (island) island.triggerSpeedFeedback(delta);
      }
    });

    // Save speed preference whenever user adjusts it
    const originalSetCruiseSpeed = scroller.setCruiseSpeed.bind(scroller);
    scroller.setCruiseSpeed = function(newSpeed) {
      originalSetCruiseSpeed(newSpeed);
      currentSettings.defaultSpeed = scroller.cruiseSpeed;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ defaultSpeed: scroller.cruiseSpeed });
      }
    };
  }

  function unmount() {
    if (!isMounted) return;
    isMounted = false;

    if (scroller) {
      scroller.stop();
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

  function evaluate() {
    // If master power is off, ensure unmounted
    if (!currentSettings.enabled) {
      unmount();
      return;
    }

    // If explicitly forced on for this tab, mount
    if (forceEnabledOnTab) {
      mount();
      return;
    }

    // If user turned off auto-detect, mount on all pages
    if (!currentSettings.autoDetectOnly) {
      mount();
      return;
    }

    // Smart Reader check
    if (isWebtoonReaderPage()) {
      mount();
    } else {
      unmount();
    }
  }

  // Setup SPA navigation tracking (popstate & pushState/replaceState wraps)
  window.addEventListener('popstate', () => {
    setTimeout(evaluate, 150);
  });

  const originalPushState = history.pushState;
  history.pushState = function() {
    originalPushState.apply(this, arguments);
    setTimeout(evaluate, 200);
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    setTimeout(evaluate, 200);
  };

  // Watch for dynamic reader injection (lazy-mounted comic containers)
  let domCheckTimeout = null;
  const pageObserver = new MutationObserver(() => {
    if (isMounted) return; // Already running
    if (domCheckTimeout) return;
    domCheckTimeout = setTimeout(() => {
      domCheckTimeout = null;
      if (!isMounted && currentSettings.enabled && (currentSettings.autoDetectOnly ? isWebtoonReaderPage() : true)) {
        mount();
      }
    }, 400);
  });

  if (document.body) {
    pageObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        pageObserver.observe(document.body, { childList: true, subtree: true });
      }
      evaluate();
    });
  }

  // Listen for messages from popup or background
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === 'setEnabled') {
        currentSettings.enabled = !!msg.enabled;
        evaluate();
        sendResponse({ status: 'ok', isMounted });
      } else if (msg.action === 'setAutoDetectOnly') {
        currentSettings.autoDetectOnly = !!msg.autoDetectOnly;
        evaluate();
        sendResponse({ status: 'ok', isMounted });
      } else if (msg.action === 'toggleCurrentTab') {
        forceEnabledOnTab = !isMounted;
        evaluate();
        sendResponse({ status: 'ok', isMounted });
      } else if (msg.action === 'getTabStatus') {
        sendResponse({
          isMounted,
          isReader: isWebtoonReaderPage(),
          isRunning: scroller ? scroller.isRunning : false,
          speed: scroller ? scroller.cruiseSpeed : (currentSettings.defaultSpeed || 1.5)
        });
      } else if (msg.action === 'toggle') {
        if (!isMounted && currentSettings.enabled) {
          forceEnabledOnTab = true;
          mount();
        }
        if (scroller) {
          scroller.toggle();
          sendResponse({ status: scroller.isRunning });
        } else {
          sendResponse({ status: false });
        }
      } else if (msg.action === 'setSpeed') {
        currentSettings.defaultSpeed = msg.speed;
        if (scroller) {
          const diff = msg.speed - scroller.cruiseSpeed;
          scroller.setCruiseSpeed(msg.speed);
          if (island) island.triggerSpeedFeedback(diff);
          sendResponse({ speed: scroller.cruiseSpeed });
        }
      } else if (msg.action === 'resetPosition') {
        if (island) island.resetPosition();
        sendResponse({ status: 'ok' });
      }
    });
  }

  // Initial load from storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(defaultSettings, (stored) => {
      currentSettings = { ...defaultSettings, ...(stored || {}) };
      evaluate();
    });
  } else {
    evaluate();
  }
})();
