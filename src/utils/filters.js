/**
 * Pure helpers behind the CSS filter controls.
 * Mirrored in PHP (ML_Gutenberg_Customizations) — keep both in sync.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function toNumber(value, fallback) {
  let n = NaN;

  if (typeof value === "number") {
    n = value;
  } else if (typeof value === "string" && value.trim() !== "") {
    n = Number(value);
  }

  return Number.isFinite(n) ? n : fallback;
}

/**
 * Every filter, in the order they are written, with the range of the slider
 * and the value that means "no effect".
 */
export const FILTER_RANGES = {
  blur: { min: 0, max: 50, step: 0.5, neutral: 0, unit: "px", css: "blur" },
  brightness: { min: 0, max: 300, step: 5, neutral: 100, unit: "%", css: "brightness" },
  contrast: { min: 0, max: 300, step: 5, neutral: 100, unit: "%", css: "contrast" },
  saturate: { min: 0, max: 300, step: 5, neutral: 100, unit: "%", css: "saturate" },
  grayscale: { min: 0, max: 100, step: 1, neutral: 0, unit: "%", css: "grayscale" },
  sepia: { min: 0, max: 100, step: 1, neutral: 0, unit: "%", css: "sepia" },
  hueRotate: { min: -180, max: 180, step: 1, neutral: 0, unit: "deg", css: "hue-rotate" },
  invert: { min: 0, max: 100, step: 1, neutral: 0, unit: "%", css: "invert" },
  opacity: { min: 0, max: 100, step: 1, neutral: 100, unit: "%", css: "opacity" },
};

export const FILTER_TARGETS = ["element", "backdrop"];

export function normalizeFilters(raw) {
  const stored = raw || {};
  const values = {};

  Object.entries(FILTER_RANGES).forEach(([key, range]) => {
    values[key] = round2(
      clamp(toNumber(stored[key], range.neutral), range.min, range.max),
    );
  });

  values.target = FILTER_TARGETS.includes(stored.target)
    ? stored.target
    : "element";
  values.disableOnMobile = !!stored.disableOnMobile;

  return values;
}

/**
 * Build the CSS filter value, leaving out everything still at its neutral
 * setting. Returns an empty string when nothing would change.
 */
export function getFilterValue(raw) {
  const values = normalizeFilters(raw);

  return Object.entries(FILTER_RANGES)
    .filter(([key, range]) => values[key] !== range.neutral)
    .map(([key, range]) => `${range.css}(${values[key]}${range.unit})`)
    .join(" ");
}

/**
 * Whether the filter applies to what sits behind the block (frosted glass)
 * rather than to the block itself.
 */
export function isBackdrop(raw) {
  return normalizeFilters(raw).target === "backdrop";
}
