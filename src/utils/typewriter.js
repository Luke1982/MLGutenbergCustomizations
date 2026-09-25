/**
 * Pure helpers behind the cycling-text (typewriter) feature.
 * Mirrored in PHP (ML_Gutenberg_Customizations) — keep both in sync.
 */

const MAX_TEXTS = 20;
const MAX_LENGTH = 200;

const TIMINGS = {
  interval: { min: 200, max: 20000, default: 2500 },
  typeSpeed: { min: 5, max: 500, default: 60 },
  backSpeed: { min: 5, max: 500, default: 30 },
};

function clampTiming(value, key) {
  const range = TIMINGS[key];
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return range.default;
  }

  return Math.round(Math.min(range.max, Math.max(range.min, number)));
}

export function normalizeTypewriter(raw) {
  const stored = raw || {};
  const texts = Array.isArray(stored.texts) ? stored.texts : [];

  return {
    enabled: !!stored.enabled,
    texts: texts
      .filter((text) => typeof text === "string")
      .map((text) => text.trim().slice(0, MAX_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_TEXTS),
    interval: clampTiming(stored.interval, "interval"),
    typeSpeed: clampTiming(stored.typeSpeed, "typeSpeed"),
    backSpeed: clampTiming(stored.backSpeed, "backSpeed"),
    cursor: stored.cursor === undefined ? true : !!stored.cursor,
  };
}

/**
 * The full cycle: the paragraph's own text first — that is what search
 * engines and visitors without JavaScript see — followed by the extra
 * texts from the sidebar.
 */
export function getCycleTexts(blockText, texts) {
  const first = String(blockText || "")
    .replace(/\s+/g, " ")
    .trim();

  return [first, ...(texts || [])].filter(Boolean);
}
