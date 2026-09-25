/**
 * Frontend engine for Scroll Reveal and Scroll Effects.
 *
 * Approach:
 * - IntersectionObserver decides *when* something happens: a reveal starts,
 *   and a scroll-linked block counts as "in view".
 * - A single requestAnimationFrame loop does the work, and only runs while
 *   something is actually animating. Nothing is scheduled while the page is
 *   idle, and there is no scroll listener at all.
 * - Each frame reads every rect first and writes styles afterwards, so the
 *   browser never has to re-layout in the middle of the pass.
 * - One element carries at most one item, so a block that both reveals and
 *   moves with the scroll composes into a single transform — including the
 *   static value from the 3D Transform feature, which stays in front.
 */

import {
  ease,
  getRevealState,
  getScrollFxState,
  getScrollProgress,
  normalizeReveal,
  normalizeScrollFx,
} from "./utils/scroll-effects";

import "./scroll-effects.scss";

const REVEALED_CLASS = "is-ml-revealed";

const reduceMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const itemsByElement = new Map();
const running = new Set();
const observers = new Map();

let frame = null;
let viewport = window.innerHeight;

function parseSettings(el, attribute) {
  const raw = el.getAttribute(attribute);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

/**
 * The 3D Transform feature's value, so scroll effects add to it instead of
 * replacing it.
 */
function baseTransform(el) {
  const value = window
    .getComputedStyle(el)
    .getPropertyValue("--ml-3d-transform");

  return value ? value.trim() : "";
}

function getItem(el) {
  let item = itemsByElement.get(el);

  if (!item) {
    item = {
      el,
      base: baseTransform(el),
      reveal: null,
      fx: null,
      staggerDelay: 0,
      revealStart: null,
      revealDone: false,
      progress: null,
      inView: false,
    };
    itemsByElement.set(el, item);
  }

  return item;
}

function schedule(item) {
  running.add(item);

  if (frame === null) {
    frame = window.requestAnimationFrame(tick);
  }
}

function tick(now) {
  frame = null;
  viewport = window.innerHeight;

  const work = Array.from(running);
  // Read first…
  const rects = work.map((item) =>
    item.fx ? item.el.getBoundingClientRect() : null,
  );

  // …then write.
  work.forEach((item, index) => update(item, now, rects[index]));

  if (running.size > 0) {
    frame = window.requestAnimationFrame(tick);
  }
}

function update(item, now, rect) {
  const transforms = [];
  const filters = [];
  let opacity = 1;
  let clipPath = "";
  let settled = true;

  if (item.fx && rect) {
    const target = getScrollProgress({
      top: rect.top,
      height: rect.height,
      viewport,
      startOffset: item.fx.startOffset,
      endOffset: item.fx.endOffset,
    });

    if (item.progress === null) {
      item.progress = target;
    } else {
      item.progress += (target - item.progress) * (1 - item.fx.smoothing);
    }

    const state = getScrollFxState(item.fx, item.progress);

    if (state.transform) {
      transforms.push(state.transform);
    }
    if (state.filter) {
      filters.push(state.filter);
    }
    opacity *= state.opacity;

    // Keep going while it is on screen, and long enough afterwards for the
    // smoothing to catch up with its target.
    if (item.inView || Math.abs(target - item.progress) > 0.001) {
      settled = false;
    }
  }

  if (item.reveal && !item.revealDone) {
    const elapsed =
      now - item.revealStart - item.reveal.delay - item.staggerDelay;
    const duration = item.reveal.duration;
    let linear = 1;

    if (item.revealStart === null) {
      linear = 0;
    } else if (duration > 0) {
      linear = Math.min(1, Math.max(0, elapsed / duration));
    }

    const state = getRevealState(item.reveal, ease(item.reveal.easing, linear));

    if (state.transform) {
      transforms.push(state.transform);
    }
    if (state.filter) {
      filters.push(state.filter);
    }
    if (state.clipPath) {
      clipPath = state.clipPath;
    }
    opacity *= state.opacity;

    if (item.revealStart === null || linear < 1) {
      settled = false;
    } else {
      item.revealDone = true;
      item.el.classList.add(REVEALED_CLASS);
    }
  }

  const el = item.el;
  const transform = [item.base].concat(transforms).filter(Boolean).join(" ");

  if (settled && (!item.fx || !item.inView) && item.revealDone !== false) {
    // Nothing left to animate: hand the element back to the stylesheet.
    el.style.transform = transform || "";
    el.style.opacity = opacity === 1 ? "" : String(opacity);
    el.style.filter = filters.join(" ");
    el.style.clipPath = clipPath;
    el.style.willChange = "";
  } else {
    el.style.transform = transform;
    el.style.opacity = String(opacity);
    el.style.filter = filters.join(" ");
    el.style.clipPath = clipPath;
    el.style.willChange = "transform, opacity";
  }

  if (settled) {
    running.delete(item);

    if (item.revealDone && !item.fx) {
      el.style.transform = item.base;
      el.style.opacity = "";
      el.style.filter = "";
      el.style.clipPath = "";
      el.style.willChange = "";
    }
  }
}

/**
 * One observer per distinct trigger configuration; blocks sharing a
 * threshold and offset share it. Each observer keeps its own element →
 * handler map, so a block that both reveals and moves is handled twice
 * without the two settings treading on each other.
 */
function observerFor(kind, threshold, offset) {
  const key = `${kind}|${threshold}|${offset}`;

  if (!observers.has(key)) {
    const handlers = new WeakMap();
    const io = new window.IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const handler = handlers.get(entry.target);

          if (handler) {
            handler(entry);
          }
        }),
      {
        threshold,
        rootMargin: `0px 0px ${-offset}% 0px`,
      },
    );

    observers.set(key, { io, handlers });
  }

  return observers.get(key);
}

function observe(kind, el, threshold, offset, handler) {
  const observer = observerFor(kind, threshold, offset);

  observer.handlers.set(el, handler);
  observer.io.observe(el);

  return observer;
}

function startReveal(container, targets, now) {
  // From here the engine writes the inline styles every frame, so the
  // stylesheet's start state has to stop applying — to the container, since
  // that is what the stagger rule keys on.
  container.classList.add(REVEALED_CLASS);

  targets.forEach((item) => {
    item.revealStart = now;
    item.revealDone = false;
    schedule(item);
  });
}

function resetReveal(container, targets) {
  container.classList.remove(REVEALED_CLASS);

  targets.forEach((item) => {
    item.revealStart = null;
    item.revealDone = false;
    item.el.classList.remove(REVEALED_CLASS);
    schedule(item);
  });
}

function setUpReveal(el) {
  const settings = parseSettings(el, "data-ml-reveal");

  if (!settings || !settings.enabled) {
    return;
  }

  if (reduceMotion) {
    el.classList.add(REVEALED_CLASS);
    return;
  }

  const reveal = normalizeReveal(settings);
  const staggered = reveal.stagger > 0;
  const elements = staggered ? Array.from(el.children) : [el];
  const targets = elements.map((target, index) => {
    const item = getItem(target);
    item.reveal = reveal;
    item.staggerDelay = staggered ? index * reveal.stagger : 0;
    return item;
  });

  function onIntersect(entry) {
    if (entry.isIntersecting) {
      startReveal(el, targets, performance.now());

      if (reveal.once) {
        observerFor("reveal", reveal.threshold, reveal.offset).io.unobserve(el);
      }
    } else if (!reveal.once) {
      resetReveal(el, targets);
    }
  }

  observe("reveal", el, reveal.threshold, reveal.offset, onIntersect);
}

function setUpScrollFx(el) {
  const settings = parseSettings(el, "data-ml-scroll-fx");

  if (!settings || !settings.enabled || reduceMotion) {
    return;
  }

  const item = getItem(el);
  item.fx = normalizeScrollFx(settings);

  function onIntersect(entry) {
    item.inView = entry.isIntersecting;

    if (entry.isIntersecting) {
      schedule(item);
    }
  }

  observe("fx", el, 0, 0, onIntersect);
}

function init() {
  if (!("IntersectionObserver" in window)) {
    document
      .querySelectorAll(".ml-reveal")
      .forEach((el) => el.classList.add(REVEALED_CLASS));
    return;
  }

  document.querySelectorAll("[data-ml-reveal]").forEach(setUpReveal);
  document.querySelectorAll("[data-ml-scroll-fx]").forEach(setUpScrollFx);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
