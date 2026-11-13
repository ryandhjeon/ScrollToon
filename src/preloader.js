/**
 * ScrollToon - Predictive Image Preloader
 * Eliminates blank white spaces on webtoons during fast scrolling.
 */
class WebtoonPreloader {
  constructor() {
    this.observer = null;
    this.preloadThresholdPx = 3500; // Look 3500px ahead of the viewport
    this.observedImages = new WeakSet();
    this.init();
  }

  init() {
    this.setupIntersectionObserver();
    this.scanAndPreload();

    // Watch for dynamically inserted images (infinite scroll / next chapter Ajax)
    this.domObserver = new MutationObserver(() => {
      this.scanAndPreload();
    });

    if (document.body) {
      this.domObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  setupIntersectionObserver() {
    const options = {
      root: null, // viewport
      rootMargin: `${this.preloadThresholdPx}px 0px`,
      threshold: 0.01
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.forceLoadImage(entry.target);
          this.observer.unobserve(entry.target);
        }
      });
    }, options);
  }

  scanAndPreload() {
    const images = document.querySelectorAll('img, picture source, [data-src], [data-original], [data-lazy-src], [data-url]');
    images.forEach(el => {
      if (!this.observedImages.has(el)) {
        this.observedImages.add(el);
        // Turn off browser native lazy loading delay if set
        if (el.tagName === 'IMG' && el.getAttribute('loading') === 'lazy') {
          el.setAttribute('loading', 'eager');
        }
        if (this.observer) {
          this.observer.observe(el);
        }
      }
    });
  }

  forceLoadImage(img) {
    if (img.tagName === 'SOURCE') {
      const srcset = img.getAttribute('data-srcset');
      if (srcset) img.setAttribute('srcset', srcset);
      return;
    }

    // Common lazy-load data attributes used by Naver, Webtoons, MangaDex, Asura, etc.
    const lazySrc =
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('data-url') ||
      img.getAttribute('data-srcset');

    if (lazySrc) {
      if (lazySrc.includes(' ')) {
        img.setAttribute('srcset', lazySrc);
      } else if (img.src !== lazySrc) {
        img.src = lazySrc;
      }
    }

    // Decode early in the background to prevent rendering jank
    if (img.tagName === 'IMG' && img.decode) {
      img.decode().catch(() => {
        // Ignore decode errors on non-standard images
      });
    }
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.domObserver) {
      this.domObserver.disconnect();
      this.domObserver = null;
    }
  }
}

window.ScrollToonPreloader = WebtoonPreloader;
