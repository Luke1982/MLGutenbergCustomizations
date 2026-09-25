/* global mlScrollBehavior */
/**
 * Frontend scroll-behavior handler.
 *
 * Performance approach:
 * - A single shared scroll listener schedules exactly one requestAnimationFrame
 *   per frame burst. All registered element handlers run inside that one rAF,
 *   so DOM style mutations are batched and never happen mid-paint.
 * - `window.innerWidth` (breakpoint check) is read only on a debounced resize,
 *   then cached — never touched during scroll.
 * - `show()` uses double-rAF instead of `void el.offsetHeight` to trigger the
 *   CSS transition without forcing a synchronous layout read.
 *
 * Animation behaviour:
 * - "fade":  opacity 0→1 / 1→0; visibility:hidden + pointer-events:none set
 *            immediately on hide so clicks reach elements underneath.
 * - "slide": transform:translateY(-100%) + opacity together; same pointer-events
 *            rules as fade.
 * - "none":  instant display:none / display:"".
 */
(function () {
  "use strict";

  var mobileBp =
    parseInt((window.mlScrollBehavior || {}).mobileBreakpoint, 10) || 650;

  // Cached breakpoint result — updated only on debounced resize, never on scroll.
  var isMobile = window.innerWidth <= mobileBp;

  // All registered per-element tick functions.
  var handlers = [];

  // Shared RAF state.
  var rafId = null;

  // The scroll position that the pending rAF will consume.
  var pendingScrollY = window.scrollY;

  function runFrame() {
    rafId = null;
    var scrollY = pendingScrollY;
    for (var i = 0; i < handlers.length; i++) {
      handlers[i](scrollY);
    }
  }

  function onScrollEvent() {
    pendingScrollY = window.scrollY;
    if (rafId === null) {
      rafId = requestAnimationFrame(runFrame);
    }
    // If a rAF is already pending we just updated pendingScrollY — the already-
    // scheduled frame will pick up the latest value automatically.
  }

  // Debounce resize: recalculate the cached breakpoint flag and re-run handlers
  // once the viewport stops changing.
  var resizeTimer = null;
  function onResizeEvent() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      isMobile = window.innerWidth <= mobileBp;
      // Re-evaluate all elements at the current scroll position.
      pendingScrollY = window.scrollY;
      if (rafId === null) {
        rafId = requestAnimationFrame(runFrame);
      }
    }, 100);
  }

  window.addEventListener("scroll", onScrollEvent, { passive: true });
  window.addEventListener("resize", onResizeEvent, { passive: true });

  // ── Per-element init ───────────────────────────────────────────────────────

  function initElement(el) {
    var raw = el.getAttribute("data-ml-scroll");
    if (!raw) return;

    var settings;
    try {
      settings = JSON.parse(raw);
    } catch (_) {
      return;
    }

    if (!settings.enabled) return;

    var mode = settings.mode === "direction" ? "direction" : "offset";
    var offset = Math.max(0, parseInt(settings.offset, 10) || 0);
    var hideOnExceed = settings.hideOnExceed !== false;
    var animation = settings.animation || "none";
    var enableOnMobile = settings.enableOnMobile !== false;
    var enableOnDesktop = settings.enableOnDesktop !== false;
    var directionHideOn = settings.directionHideOn === "up" ? "up" : "down";

    var hiddenState = false;
    // Per-element previous scroll position for direction mode.
    var prevScrollY = window.scrollY;
    var pendingTransition = null;

    // Set up CSS transitions once, synchronously during init (no scroll context).
    if (animation === "fade") {
      el.style.transition = "opacity 0.35s ease";
    } else if (animation === "slide") {
      el.style.transition = "transform 0.35s ease, opacity 0.35s ease";
    }

    function cancelPendingTransition() {
      if (pendingTransition) {
        el.removeEventListener("transitionend", pendingTransition);
        pendingTransition = null;
      }
    }

    function hide() {
      if (hiddenState) return;
      hiddenState = true;
      cancelPendingTransition();

      if (animation === "none") {
        el.style.display = "none";
        return;
      }

      // Remove interactivity immediately — clicks must reach elements
      // underneath even while the fade/slide transition is still running.
      el.style.pointerEvents = "none";

      if (animation === "slide") {
        el.style.transform = "translateY(-100%)";
      }
      el.style.opacity = "0";

      // After the transition completes, also remove from layout/a11y tree.
      pendingTransition = function (e) {
        if (e.propertyName !== "opacity") return;
        cancelPendingTransition();
        if (hiddenState) {
          el.style.visibility = "hidden";
        }
      };
      el.addEventListener("transitionend", pendingTransition);
    }

    function show() {
      if (!hiddenState) return;
      hiddenState = false;
      cancelPendingTransition();

      if (animation === "none") {
        el.style.display = "";
        return;
      }

      // Step 1 (this rAF): restore visibility and pointer-events.
      el.style.visibility = "";
      el.style.pointerEvents = "";

      // Step 2 (next rAF): set the target values so the browser sees two
      // distinct frames and fires a CSS transition. This avoids the forced
      // synchronous layout that `void el.offsetHeight` would cause.
      requestAnimationFrame(function () {
        if (hiddenState) return; // cancelled before frame fired
        el.style.opacity = "1";
        if (animation === "slide") {
          el.style.transform = "";
        }
      });
    }

    function tick(scrollY) {
      var active = isMobile ? enableOnMobile : enableOnDesktop;

      if (!active) {
        show();
        prevScrollY = scrollY;
        return;
      }

      if (mode === "offset") {
        if (scrollY > offset) {
          if (hideOnExceed) hide();
          else show();
        } else {
          if (hideOnExceed) show();
          else hide();
        }
      } else {
        // direction mode — always show when at or above the offset threshold.
        if (scrollY <= offset) {
          show();
        } else {
          var scrollingDown = scrollY > prevScrollY;
          if (directionHideOn === "down") {
            if (scrollingDown) hide();
            else show();
          } else {
            if (!scrollingDown) hide();
            else show();
          }
        }
      }

      prevScrollY = scrollY;
    }

    handlers.push(tick);

    // Set the correct initial state without waiting for a scroll event.
    tick(window.scrollY);
  }

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  function init() {
    var els = document.querySelectorAll("[data-ml-scroll]");
    for (var i = 0; i < els.length; i++) {
      initElement(els[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
