/**
 * Pure helpers behind the animation controls.
 *
 * The animations themselves are our own keyframes, modelled on the
 * attention seekers everyone knows from Animate.css. They are written here
 * rather than pulled in because that library is Hippocratic licensed, which
 * does not sit with a GPL plugin, and because none of the ready-made sets
 * let you dial the strength up or down.
 *
 * Mirrored in PHP (ML_Gutenberg_Customizations) — keep both in sync.
 */

export const ANIMATIONS = [
  { name: "pulse", label: "Pulse" },
  { name: "throb", label: "Throb" },
  { name: "heartbeat", label: "Heartbeat" },
  { name: "wiggle", label: "Wiggle" },
  { name: "shake-x", label: "Shake sideways" },
  { name: "shake-y", label: "Shake up and down" },
  { name: "head-shake", label: "Head shake" },
  { name: "bounce", label: "Bounce" },
  { name: "float", label: "Float" },
  { name: "swing", label: "Swing" },
  { name: "tada", label: "Tada" },
  { name: "wobble", label: "Wobble" },
  { name: "jello", label: "Jello" },
  { name: "rubber-band", label: "Rubber band" },
  { name: "flash", label: "Flash" },
  { name: "spin", label: "Spin" },
];

export const ANIMATION_NAMES = ANIMATIONS.map((animation) => animation.name);

export const REPEAT_CHOICES = [1, 2, 3, 5, "infinite"];

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function toNumber(value, fallback) {
  const n = typeof value === "number" ? value : Number(value);

  return Number.isFinite(n) ? n : fallback;
}

export function normalizeAnimation(raw) {
  const stored = raw || {};
  const repeat = stored.repeat;

  return {
    name: ANIMATION_NAMES.includes(stored.name) ? stored.name : "",
    strength: Math.round(clamp(toNumber(stored.strength, 1), 0.25, 3) * 100) / 100,
    duration: Math.round(clamp(toNumber(stored.duration, 1000), 100, 10000)),
    delay: Math.round(clamp(toNumber(stored.delay, 0), 0, 5000)),
    repeat:
      repeat === "infinite"
        ? "infinite"
        : Math.round(clamp(toNumber(repeat, 1), 1, 100)),
  };
}

/**
 * The classes and custom properties an animated block needs, or null when
 * no animation is chosen: a shared class for the timing and a second one
 * naming the keyframes.
 */
export function getAnimationProps(raw) {
  const animation = normalizeAnimation(raw);

  if (!animation.name) {
    return null;
  }

  const style = {
    "--ml-anim-strength": String(animation.strength),
    "--ml-anim-duration": `${animation.duration}ms`,
    "--ml-anim-repeat": String(animation.repeat),
  };

  if (animation.delay > 0) {
    style["--ml-anim-delay"] = `${animation.delay}ms`;
  }

  return { className: `ml-anim ml-anim-${animation.name}`, style };
}
