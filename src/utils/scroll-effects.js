/**
 * Pure helpers behind the Scroll Reveal and Scroll Effects features.
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

export const REVEAL_EFFECTS = [
  "fade",
  "slide-bottom",
  "slide-top",
  "slide-left",
  "slide-right",
  "zoom-in",
  "zoom-out",
  "flip-x",
  "flip-y",
  "rotate",
  "blur",
  "wipe",
];

export const REVEAL_EASINGS = ["linear", "ease-out", "ease-in-out", "back-out"];

/**
 * What the "Amount" slider means per effect: px, scale factor, or degrees.
 */
export const REVEAL_AMOUNTS = {
  fade: { min: 0, max: 600, step: 1, default: 40 },
  "slide-bottom": { min: 0, max: 600, step: 1, default: 40 },
  "slide-top": { min: 0, max: 600, step: 1, default: 40 },
  "slide-left": { min: 0, max: 600, step: 1, default: 40 },
  "slide-right": { min: 0, max: 600, step: 1, default: 40 },
  "zoom-in": { min: 0, max: 1, step: 0.05, default: 0.2 },
  "zoom-out": { min: 0, max: 1, step: 0.05, default: 0.2 },
  "flip-x": { min: 0, max: 180, step: 1, default: 60 },
  "flip-y": { min: 0, max: 180, step: 1, default: 60 },
  rotate: { min: -180, max: 180, step: 1, default: 15 },
  blur: { min: 0, max: 50, step: 1, default: 8 },
  wipe: { min: 0, max: 600, step: 1, default: 40 },
};

export const SCROLL_FX_MODES = ["centered", "progressive"];

export const SCROLL_FX_RANGES = {
  rotateX: { min: -180, max: 180, step: 1, default: 0 },
  rotateY: { min: -180, max: 180, step: 1, default: 0 },
  rotateZ: { min: -180, max: 180, step: 1, default: 0 },
  translateX: { min: -1000, max: 1000, step: 5, default: 0 },
  translateY: { min: -1000, max: 1000, step: 5, default: 0 },
  scale: { min: -1, max: 1, step: 0.05, default: 0 },
  opacity: { min: 0, max: 1, step: 0.05, default: 0 },
  blur: { min: 0, max: 50, step: 1, default: 0 },
  perspective: { min: 0, max: 3000, step: 50, default: 1000 },
  startOffset: { min: -100, max: 100, step: 1, default: 0 },
  endOffset: { min: -100, max: 100, step: 1, default: 0 },
  smoothing: { min: 0, max: 0.95, step: 0.05, default: 0.15 },
};

const EASING_FUNCTIONS = {
  linear: (t) => t,
  "ease-out": (t) => 1 - Math.pow(1 - t, 3),
  "ease-in-out": (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  "back-out": (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

/**
 * Eased progress. Both ends are pinned exactly, so a curve that
 * overshoots (back-out) still starts at 0 and lands on 1.
 */
export function ease(name, t) {
  if (t <= 0) {
    return 0;
  }
  if (t >= 1) {
    return 1;
  }
  return (EASING_FUNCTIONS[name] || EASING_FUNCTIONS.linear)(t);
}

/**
 * How far a block has travelled through the viewport, 0 → 1.
 *
 * 0 is the moment its top edge reaches the bottom of the viewport and 1 is
 * the moment its bottom edge leaves the top. The offsets, in % of the
 * viewport height, shrink that window from either end.
 */
export function getScrollProgress({
  top,
  height,
  viewport,
  startOffset = 0,
  endOffset = 0,
}) {
  const startPx = (viewport * startOffset) / 100;
  const endPx = (viewport * endOffset) / 100;
  const span = viewport + height - startPx - endPx;

  if (!(span > 0)) {
    return 0;
  }

  return clamp((viewport - startPx - top) / span, 0, 1);
}

export function normalizeReveal(raw) {
  const stored = raw || {};
  const effect = REVEAL_EFFECTS.includes(stored.effect) ? stored.effect : "fade";
  const amount = REVEAL_AMOUNTS[effect];

  return {
    enabled: !!stored.enabled,
    effect,
    amount: round2(
      clamp(toNumber(stored.amount, amount.default), amount.min, amount.max),
    ),
    duration: Math.round(clamp(toNumber(stored.duration, 600), 0, 5000)),
    delay: Math.round(clamp(toNumber(stored.delay, 0), 0, 5000)),
    easing: REVEAL_EASINGS.includes(stored.easing) ? stored.easing : "ease-out",
    threshold: round2(clamp(toNumber(stored.threshold, 0.15), 0, 1)),
    offset: Math.round(clamp(toNumber(stored.offset, 0), -100, 100)),
    once: stored.once === undefined ? true : !!stored.once,
    fade: stored.fade === undefined ? true : !!stored.fade,
    stagger: Math.round(clamp(toNumber(stored.stagger, 0), 0, 1000)),
  };
}

export function normalizeScrollFx(raw) {
  const stored = raw || {};
  const value = (key) => {
    const range = SCROLL_FX_RANGES[key];
    return round2(
      clamp(toNumber(stored[key], range.default), range.min, range.max),
    );
  };

  return {
    enabled: !!stored.enabled,
    rotateX: value("rotateX"),
    rotateY: value("rotateY"),
    rotateZ: value("rotateZ"),
    translateX: value("translateX"),
    translateY: value("translateY"),
    scale: value("scale"),
    opacity: value("opacity"),
    blur: value("blur"),
    perspective: value("perspective"),
    mode: SCROLL_FX_MODES.includes(stored.mode) ? stored.mode : "centered",
    startOffset: value("startOffset"),
    endOffset: value("endOffset"),
    smoothing: value("smoothing"),
  };
}

/**
 * The reveal's visual state at eased progress t: 0 is the start state the
 * block animates from, 1 is its resting state (no transform at all).
 */
export function getRevealState(reveal, t) {
  const r = normalizeReveal(reveal);
  const progress = clamp(t, 0, 1);
  const left = 1 - progress;

  let translateX = 0;
  let translateY = 0;
  let rotateX = 0;
  let rotateY = 0;
  let rotateZ = 0;
  let scale = 1;
  let blur = 0;
  let clip = -1;

  switch (r.effect) {
    case "slide-bottom":
      translateY = r.amount * left;
      break;
    case "slide-top":
      translateY = -r.amount * left;
      break;
    case "slide-left":
      translateX = -r.amount * left;
      break;
    case "slide-right":
      translateX = r.amount * left;
      break;
    case "zoom-in":
      scale = 1 - r.amount * left;
      break;
    case "zoom-out":
      scale = 1 + r.amount * left;
      break;
    case "flip-x":
      rotateX = r.amount * left;
      break;
    case "flip-y":
      rotateY = r.amount * left;
      break;
    case "rotate":
      rotateZ = r.amount * left;
      break;
    case "blur":
      blur = r.amount * left;
      break;
    case "wipe":
      clip = 100 * left;
      break;
    default:
      break;
  }

  const tx = round2(translateX);
  const ty = round2(translateY);
  const rx = round2(rotateX);
  const ry = round2(rotateY);
  const rz = round2(rotateZ);
  const sc = round2(scale);
  const parts = [];

  if (rx || ry) {
    parts.push("perspective(1000px)");
  }
  if (tx || ty) {
    parts.push(`translate3d(${tx}px, ${ty}px, 0px)`);
  }
  if (rx) {
    parts.push(`rotateX(${rx}deg)`);
  }
  if (ry) {
    parts.push(`rotateY(${ry}deg)`);
  }
  if (rz) {
    parts.push(`rotate(${rz}deg)`);
  }
  if (sc !== 1) {
    parts.push(`scale(${sc})`);
  }

  return {
    transform: parts.join(" "),
    opacity: r.fade ? round2(progress) : 1,
    filter: round2(blur) ? `blur(${round2(blur)}px)` : "",
    clipPath: clip >= 0 ? `inset(0% 0% ${round2(clip)}% 0%)` : "",
  };
}

/**
 * The scroll-linked state at progress p.
 *
 * Centered mode swings from -amount at the bottom of the viewport through 0
 * in the middle to +amount at the top; progressive runs 0 → amount. Opacity
 * and blur use the distance from rest, so centered dims and blurs at both
 * edges and is sharp in the middle.
 */
export function getScrollFxState(fx, p) {
  const s = normalizeScrollFx(fx);
  const progress = clamp(p, 0, 1);
  const value = (amount) =>
    s.mode === "centered" ? (progress - 0.5) * 2 * amount : progress * amount;

  const tx = round2(value(s.translateX));
  const ty = round2(value(s.translateY));
  const rx = round2(value(s.rotateX));
  const ry = round2(value(s.rotateY));
  const rz = round2(value(s.rotateZ));
  const sc = round2(1 + value(s.scale));
  const dim = Math.abs(round2(value(s.opacity)));
  const blur = Math.abs(round2(value(s.blur)));
  const parts = [];

  if ((rx || ry) && s.perspective > 0) {
    parts.push(`perspective(${s.perspective}px)`);
  }
  if (tx || ty) {
    parts.push(`translate3d(${tx}px, ${ty}px, 0px)`);
  }
  if (rx) {
    parts.push(`rotateX(${rx}deg)`);
  }
  if (ry) {
    parts.push(`rotateY(${ry}deg)`);
  }
  if (rz) {
    parts.push(`rotateZ(${rz}deg)`);
  }
  if (sc !== 1) {
    parts.push(`scale(${sc})`);
  }

  return {
    transform: parts.join(" "),
    opacity: round2(clamp(1 - dim, 0, 1)),
    filter: blur ? `blur(${blur}px)` : "",
  };
}
