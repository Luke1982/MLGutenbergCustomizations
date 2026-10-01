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
// "any" keeps typing free; the arrows still move in whole units.
export const INSET_UNITS = {
  px: { min: -2000, max: 2000, step: "any" },
  "%": { min: -200, max: 200, step: "any" },
  em: { min: -100, max: 100, step: "any" },
  rem: { min: -100, max: 100, step: "any" },
  vw: { min: -100, max: 100, step: "any" },
  vh: { min: -100, max: 100, step: "any" },
};

export const INSET_SIDES = ["top", "right", "bottom", "left"];

export const Z_INDEX_RANGE = { min: -999, max: 999, step: 1 };

/**
 * Read a stored offset ("20px", "10%", or a plain number in px) and give it
 * back clamped to its unit's range. Anything unusable becomes an empty
 * string, which leaves the side at auto.
 */
export const AUTO = "auto";

export function parseInset(raw) {
  if (typeof raw === "string" && raw.trim().toLowerCase() === AUTO) {
    return AUTO;
  }

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
