/**
 * Slider ranges and defaults for the 3D transform controls.
 * Mirrored in PHP (TRANSFORM_3D_RANGES) — keep both in sync.
 */
export const TRANSFORM_3D_RANGES = {
  perspective: { min: 0, max: 10000, step: 1, default: 1000 },
  rotateX: { min: -180, max: 180, step: 0.01, default: 0 },
  rotateY: { min: -180, max: 180, step: 0.01, default: 0 },
  rotateZ: { min: -180, max: 180, step: 0.01, default: 0 },
  scale: { min: 0, max: 3, step: 0.01, default: 1 },
};

/**
 * Translate units and their slider ranges.
 * Mirrored in PHP (TRANSFORM_3D_TRANSLATE_UNITS) — keep both in sync.
 */
// "any" lets a typed value be as precise as it likes while the slider and
// the arrow keys still move in sensible whole steps.
export const TRANSLATE_UNITS = {
  px: { min: -2000, max: 2000, step: "any" },
  "%": { min: -500, max: 500, step: "any" },
  em: { min: -100, max: 100, step: "any" },
  rem: { min: -100, max: 100, step: "any" },
  vw: { min: -100, max: 100, step: "any" },
  vh: { min: -100, max: 100, step: "any" },
};

export const TRANSLATE_AXES = ["translateX", "translateY", "translateZ"];

/**
 * Units available on a translate axis. CSS only allows a percentage on
 * X and Y; translateZ takes lengths.
 */
export function getTranslateUnits(axis) {
  return Object.keys(TRANSLATE_UNITS).filter(
    (unit) => axis !== "translateZ" || unit !== "%",
  );
}

const roundTo2 = (n) => Math.round(n * 100) / 100;

// A matrix carries values like 0.866025, so it keeps more precision than the
// sliders do.
const roundTo6 = (n) => Math.round(n * 1e6) / 1e6;

const MATRIX_LENGTH = 16;

export const IDENTITY_MATRIX = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/**
 * Read a matrix3d: a pasted CSS function, a bare list of numbers, or an
 * array. Returns its 16 numbers, or null when it is not a usable matrix.
 */
export function parseMatrix3d(raw) {
  let parts = null;

  if (Array.isArray(raw)) {
    parts = raw;
  } else if (typeof raw === "string" && raw.trim() !== "") {
    parts = raw
      .trim()
      .replace(/^matrix3d\s*\(/i, "")
      .replace(/\)\s*$/, "")
      .split(/[\s,]+/)
      .filter((part) => part !== "");
  }

  if (!parts || parts.length !== MATRIX_LENGTH) {
    return null;
  }

  const numbers = parts.map((part) =>
    typeof part === "number" ? part : Number(String(part).trim()),
  );

  if (!numbers.every((n) => Number.isFinite(n))) {
    return null;
  }

  return numbers.map(roundTo6);
}

/**
 * An identity matrix changes nothing, so it is treated as no matrix at all.
 */
function isIdentityMatrix(matrix) {
  return matrix.every((n, index) => n === IDENTITY_MATRIX[index]);
}

/**
 * Parse a stored translate value ("50%", "-2em", or a plain number in px)
 * into { quantity, unit }, clamped to the unit's range.
 * Invalid values and units the axis does not allow become 0px.
 */
export function parseTranslate(raw, axis) {
  let quantity = NaN;
  let unit = "px";

  if (typeof raw === "number") {
    quantity = raw;
  } else if (typeof raw === "string") {
    const match = raw
      .trim()
      .match(/^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z%]*)$/i);
    if (match) {
      quantity = Number(match[1]);
      unit = match[2].toLowerCase() || "px";
    }
  }

  if (!Number.isFinite(quantity) || !getTranslateUnits(axis).includes(unit)) {
    return { quantity: 0, unit: "px" };
  }

  const range = TRANSLATE_UNITS[unit];
  return {
    quantity: roundTo2(Math.min(range.max, Math.max(range.min, quantity))),
    unit,
  };
}

/**
 * Transform-origin values, matching the AlignmentMatrixControl cells.
 */
export const TRANSFORM_3D_ORIGINS = [
  "top left",
  "top center",
  "top right",
  "center left",
  "center center",
  "center right",
  "bottom left",
  "bottom center",
  "bottom right",
];

const DEFAULT_ORIGIN = "center center";

function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return NaN;
}

/**
 * Fill in defaults for the stored mlTransform3d attribute, clamp numbers
 * to the slider ranges and reject unknown origins.
 */
export function normalizeTransform3d(raw) {
  const stored = raw || {};
  const values = {};

  Object.entries(TRANSFORM_3D_RANGES).forEach(([key, range]) => {
    const num = toNumber(stored[key]);
    values[key] = Number.isFinite(num)
      ? roundTo2(Math.min(range.max, Math.max(range.min, num)))
      : range.default;
  });

  TRANSLATE_AXES.forEach((axis) => {
    values[axis] = parseTranslate(stored[axis], axis);
  });

  values.matrix = parseMatrix3d(stored.matrix);

  values.origin = TRANSFORM_3D_ORIGINS.includes(stored.origin)
    ? stored.origin
    : DEFAULT_ORIGIN;
  values.disableOnMobile = !!stored.disableOnMobile;

  return values;
}

/**
 * Build the CSS transform value for the stored mlTransform3d attribute.
 *
 * Returns an empty string when the values would not move the element
 * (perspective alone does nothing without a transform to apply it to).
 */
export function getTransform3dValue(raw) {
  const t = normalizeTransform3d(raw);
  const functions = [];

  const translate = TRANSLATE_AXES.map((axis) => t[axis]);
  if (translate.some(({ quantity }) => quantity)) {
    functions.push(
      `translate3d(${translate
        .map(({ quantity, unit }) => `${quantity}${unit}`)
        .join(", ")})`,
    );
  }

  ["rotateX", "rotateY", "rotateZ"].forEach((axis) => {
    if (t[axis]) {
      functions.push(`${axis}(${t[axis]}deg)`);
    }
  });

  if (t.scale !== 1) {
    functions.push(`scale(${t.scale})`);
  }

  const matrix = t.matrix && !isIdentityMatrix(t.matrix) ? t.matrix : null;

  if (functions.length === 0 && !matrix) {
    return "";
  }

  if (matrix) {
    // A matrix carries its own perspective in its eleventh value, so the
    // panel's perspective stays out of the way and the matrix renders
    // exactly as it was pasted.
    functions.unshift(`matrix3d(${matrix.join(", ")})`);
  } else if (t.perspective > 0) {
    functions.unshift(`perspective(${t.perspective}px)`);
  }

  return functions.join(" ");
}

/**
 * The transform-origin to output.
 *
 * A matrix is measured from the block's top-left corner — that is the
 * convention matrix generators and the corner warp both use — so an active
 * matrix pins the origin there regardless of what the grid says.
 */
export function getTransform3dOrigin(raw) {
  const values = normalizeTransform3d(raw);

  if (values.matrix && !isIdentityMatrix(values.matrix)) {
    return "0 0";
  }

  return values.origin;
}

/**
 * Build the editor wrapper props for the live preview: the same class and
 * CSS variables the frontend render filter outputs. A static editor
 * stylesheet (enqueued in PHP) maps them to transform / transform-origin.
 *
 * Returns null when the block has no 3D transform.
 */
export function getTransform3dWrapperProps(raw) {
  const transform = getTransform3dValue(raw);

  if (!transform) {
    return null;
  }

  const { disableOnMobile } = normalizeTransform3d(raw);
  const origin = getTransform3dOrigin(raw);

  return {
    className: disableOnMobile
      ? "ml-has-3d-transform ml-3d-desktop-only"
      : "ml-has-3d-transform",
    style: {
      "--ml-3d-transform": transform,
      "--ml-3d-origin": origin,
    },
  };
}

/**
 * Blocks that disable custom class names (synced patterns, Shortcode,
 * Classic, Custom HTML) have no single wrapper element to transform.
 */
export function supportsTransform3d(blockType) {
  return blockType?.supports?.customClassName !== false;
}
