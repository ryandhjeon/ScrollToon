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
    const hostname = window.location.hostname;
    const href = window.location.href;

    // Immediately reject non-comic mainstream platforms
    if (/google\.|youtube\.|github\.|amazon\.|reddit\.|twitter\.|x\.com|facebook\.|instagram\.|linkedin\.|wikipedia\.|netflix\.|apple\.com|yahoo\.|bing\./i.test(hostname)) {
      return false;
    }

    // 1. URL Path patterns for recognized comic platforms & chapter readers
    const readerUrlPatterns = [
      /webtoons\.com\/.*\/viewer/i,           // Line Webtoons episode viewer
      /comic\.naver\.com\/webtoon\/detail/i,  // Naver Webtoon episode viewer
      /tapas\.io\/episode\//i,                // Tapas episode reader
      /mangadex\.org\/chapter\//i,            // MangaDex chapter reader
      /lezhin\.com\/.*\/[0-9]+/i,             // Lezhin viewer
      /lezhinus\.com\/.*\/[0-9]+/i,
      /\/(comic|series|manga)\/.*-(chapter|ch)-[0-9]+/i,
      /\/chapter-[0-9]+/i,                    // Scanlation chapter readers
      /\/ch-[0-9]+/i,
      /demo\.html/i                           // Local test canvas
    ];

    if (readerUrlPatterns.some(regex => regex.test(href))) {
      return true;
    }

    // 2. Specific reader DOM containers unique to comic readers
    const readerSelectors = [
      '#_imageList',                          // Naver/Webtoons episode image canvas
      '#viewerBox',
      '.viewer-box',
      '.viewer_img',
      '#reader-area',                         // MangaDex / WP Manga
      '.reading-content',                     // Madara theme (Asura, Reaper, Flame, etc.)
      '.comic-container',                     // ScrollToon test canvas
      '.manga-reader',
      '.ts-main-image'
    ];

    for (const sel of readerSelectors) {
      if (document.querySelector(sel)) {
        return true;
      }
    }

    // 3. Strict Heuristic for unlisted scanlation / manga readers:
    // Webtoons are continuous vertical strips of wide comic images with almost NO text paragraphs.
    // Articles, news, blogs, and stores have many <p> tags and few wide images.
    const paragraphs = document.querySelectorAll('p');
    if (paragraphs.length > 15) {
      // Standard text article, news, or blog -> NOT a webtoon reader
      return false;
    }

    const images = document.querySelectorAll('img');
    const scrollHeight = Math.max(
      document.documentElement ? document.documentElement.scrollHeight : 0,
      document.body ? document.body.scrollHeight : 0
    );

    // Must be a very long page (at least 3500px scrollable) with at least 5 images
    if (images.length >= 5 && scrollHeight > 3500) {
      let cumulativeComicHeight = 0;
      let wideComicPanels = 0;

      for (let i = 0; i < images.length && i < 30; i++) {
        const img = images[i];
        const rect = img.getBoundingClientRect();
        const width = img.naturalWidth || rect.width || img.width || 0;
        const height = img.naturalHeight || rect.height || img.height || 0;

        // Comic panels are wide (> 350px) or tall (> 400px)
        if (width >= 350 || height >= 400 || img.hasAttribute('data-src') || img.hasAttribute('data-original')) {
          wideComicPanels++;
          cumulativeComicHeight += Math.max(height, 400);
        }
      }

      // Require at least 4 wide comic panels and > 3000px of image height
      if (wideComicPanels >= 4 && cumulativeComicHeight >= 3000) {
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
