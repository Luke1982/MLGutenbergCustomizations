/**
 * Pure helpers behind the mobile background controls.
 * Mirrored in PHP (ML_Gutenberg_Customizations) — keep both in sync.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const clamp01 = (n) => Math.min(1, Math.max(0, n));

export const MOBILE_BACKGROUND_SIZES = ["cover", "contain", "auto"];

export function normalizeMobileBackground(raw) {
  const stored = raw || {};
  const point = stored.position;
  const hasPoint =
    point &&
    typeof point === "object" &&
    Number.isFinite(Number(point.x)) &&
    Number.isFinite(Number(point.y)) &&
    point.x !== "" &&
    point.y !== "";

  return {
    hide: !!stored.hide,
    size: MOBILE_BACKGROUND_SIZES.includes(stored.size) ? stored.size : "",
    position: hasPoint
      ? { x: round2(clamp01(Number(point.x))), y: round2(clamp01(Number(point.y))) }
      : null,
  };
}

const asPercentages = ({ x, y }) => `${round2(x * 100)}% ${round2(y * 100)}%`;

/**
 * The classes and custom properties for the global breakpoint, where the
 * mobile stylesheet is already scoped to the viewport. Null when the
 * background is left alone.
 */
export function getMobileBackgroundStyles(raw) {
  const background = normalizeMobileBackground(raw);
  const classes = [];
  const vars = {};

  if (background.hide) {
    classes.push("has-mobile-bg-hidden");
  }

  if (background.size) {
    classes.push("has-mobile-bg-size");
    vars["--ml-mobile-bg-size"] = background.size;
  }

  if (background.position) {
    classes.push("has-mobile-bg-position");
    vars["--ml-mobile-bg-position"] = asPercentages(background.position);
  }

  return classes.length ? { classes, vars } : null;
}

/**
 * The same settings as plain declarations, for a block with its own
 * breakpoint, which gets its rules inline inside a media query.
 */
export function getMobileBackgroundRules(raw) {
  const background = normalizeMobileBackground(raw);
  const rules = [];

  if (background.hide) {
    rules.push("background-image:none !important");
  }

  if (background.size) {
    rules.push(`background-size:${background.size} !important`);
  }

  if (background.position) {
    rules.push(`background-position:${asPercentages(background.position)} !important`);
  }

  return rules;
}
