/**
 * Frontend script for the cycling text (typewriter) on paragraphs.
 *
 * The paragraph keeps its own text until this runs, so the markup stays
 * readable without JavaScript. From there the text is moved into a span, a
 * blinking cursor is parked behind it, and the cycle runs on timers:
 * hold → backspace → type the next one. Timers stop while the paragraph is
 * off screen.
 */

import { getCycleTexts, normalizeTypewriter } from "./utils/typewriter";

const TEXT_CLASS = "ml-typewriter-text";
const CURSOR_CLASS = "ml-typewriter-cursor";

const reduceMotion =
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function run(textSpan, texts, settings, el) {
  let index = 0;
  let chars = texts[0].length;
  let phase = "holding";
  let timer = null;
  let paused = false;

  function schedule(delay) {
    timer = window.setTimeout(tick, delay);
  }

  function tick() {
    timer = null;

    if (paused) {
      return;
    }

    if (phase === "holding") {
      phase = "deleting";
      schedule(settings.backSpeed);
      return;
    }

    if (phase === "deleting") {
      chars -= 1;
      textSpan.textContent = texts[index].slice(0, Math.max(0, chars));

      if (chars <= 0) {
        index = (index + 1) % texts.length;
        phase = "typing";
        schedule(settings.typeSpeed);
      } else {
        schedule(settings.backSpeed);
      }

      return;
    }

    chars += 1;
    textSpan.textContent = texts[index].slice(0, chars);

    if (chars >= texts[index].length) {
      phase = "holding";
      schedule(settings.interval);
    } else {
      schedule(settings.typeSpeed);
    }
  }

  function pause() {
    paused = true;

    if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  }

  function resume() {
    paused = false;

    if (timer === null) {
      schedule(phase === "holding" ? settings.interval : settings.typeSpeed);
    }
  }

  if ("IntersectionObserver" in window) {
    new window.IntersectionObserver((entries) =>
      entries.forEach((entry) => (entry.isIntersecting ? resume() : pause())),
    ).observe(el);
  } else {
    resume();
  }
}

function setUp(el) {
  const raw = el.getAttribute("data-ml-typewriter");

  if (!raw) {
    return;
  }

  let parsed = null;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return;
  }

  const settings = normalizeTypewriter(parsed);

  if (!settings.enabled) {
    return;
  }

  const texts = getCycleTexts(el.textContent, settings.texts);

  if (texts.length === 0) {
    return;
  }

  const textSpan = document.createElement("span");
  textSpan.className = TEXT_CLASS;
  textSpan.textContent = texts[0];
  el.textContent = "";
  el.appendChild(textSpan);

  if (settings.cursor) {
    const cursor = document.createElement("span");
    cursor.className = CURSOR_CLASS;
    cursor.setAttribute("aria-hidden", "true");
    el.appendChild(cursor);
  }

  // Reduced motion keeps the first text and the cursor, without the typing.
  if (reduceMotion || texts.length < 2) {
    return;
  }

  run(textSpan, texts, settings, el);
}

function init() {
  document.querySelectorAll("[data-ml-typewriter]").forEach(setUp);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
