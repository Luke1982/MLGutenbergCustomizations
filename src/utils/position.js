/**
 * Pure helpers behind the position controls.
 * Mirrored in PHP (ML_Gutenberg_Customizations) — keep both in sync.
 */

const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const POSITION_TYPES = ["relative", "absolute", "fixed", "sticky"];

/**
 * Units an offset may use, and how far each one may go.
 */
export const INSET_UNITS = {
  px: { min: -2000, max: 2000, step: 1 },
  "%": { min: -200, max: 200, step: 1 },
  em: { min: -100, max: 100, step: 0.1 },
  rem: { min: -100, max: 100, step: 0.1 },
  vw: { min: -100, max: 100, step: 1 },
  vh: { min: -100, max: 100, step: 1 },
};

export const INSET_SIDES = ["top", "right", "bottom", "left"];

export const Z_INDEX_RANGE = { min: -999, max: 999, step: 1 };

/**
 * Read a stored offset ("20px", "10%", or a plain number in px) and give it
 * back clamped to its unit's range. Anything unusable becomes an empty
 * string, which leaves the side at auto.
 */
export function parseInset(raw) {
  let quantity = NaN;
  let unit = "px";

  if (typeof raw === "number") {
    quantity = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    const match = raw
      .trim()
      .match(/^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i);

    if (match) {
      quantity = Number(match[1]);
      unit = match[2].toLowerCase() || "px";
    }
  }

  if (!Number.isFinite(quantity) || !INSET_UNITS[unit]) {
    return "";
  }

  const range = INSET_UNITS[unit];

  return `${round2(clamp(quantity, range.min, range.max))}${unit}`;
}

export function normalizePosition(raw) {
  const stored = raw || {};
  const values = {
    type: POSITION_TYPES.includes(stored.type) ? stored.type : "",
  };

  INSET_SIDES.forEach((side) => {
    values[side] = parseInset(stored[side]);
  });

  const z = typeof stored.zIndex === "string" ? Number(stored.zIndex) : stored.zIndex;

  values.zIndex = Number.isFinite(z)
    ? Math.round(clamp(z, Z_INDEX_RANGE.min, Z_INDEX_RANGE.max))
    : "";
  values.disableOnMobile = !!stored.disableOnMobile;

  return values;
}

/**
 * The class and custom properties a positioned block needs, or null while
 * it sits in the normal flow. Offsets left empty stay out, so the
 * stylesheet's own `auto` fallback applies.
 */
export function getPositionStyles(raw) {
  const values = normalizePosition(raw);

  if (!values.type) {
    return null;
  }

  const style = { "--ml-position": values.type };

  INSET_SIDES.forEach((side) => {
    if (values[side] !== "") {
      style[`--ml-${side}`] = values[side];
    }
  });

  if (values.zIndex !== "") {
    style["--ml-z"] = String(values.zIndex);
  }

  return {
    className: values.disableOnMobile
      ? "ml-has-position ml-position-desktop-only"
      : "ml-has-position",
    style,
  };
}
