/**
 * Pure helpers behind the gradient text controls.
 * Mirrored in PHP (ML_Gutenberg_Customizations) — keep both in sync.
 */

const MAX_LENGTH = 1000;

// Only the gradient functions, and only with characters a gradient needs.
// The value ends up inside a style attribute, so anything that could close
// the declaration, start a comment or load a URL is refused outright.
const GRADIENT = /^(repeating-)?(linear|radial|conic)-gradient\([^;{}<>\\]*\)$/i;
const FORBIDDEN = /url\s*\(|expression\s*\(|\/\*|\*\/|@|;|\{|\}/i;

export function sanitizeTextGradient(raw) {
  if (typeof raw !== "string") {
    return "";
  }

  const value = raw.trim();

  if (
    value === "" ||
    value.length > MAX_LENGTH ||
    FORBIDDEN.test(value) ||
    !GRADIENT.test(value)
  ) {
    return "";
  }

  return value;
}

/**
 * The class and custom property a gradient-filled block needs, or null when
 * there is no usable gradient.
 */
export function getTextGradientProps(raw) {
  const gradient = sanitizeTextGradient(raw);

  if (!gradient) {
    return null;
  }

  return {
    className: "ml-has-text-gradient",
    style: { "--ml-text-gradient": gradient },
  };
}
