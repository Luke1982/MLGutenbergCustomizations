const SIDES = ["top", "right", "bottom", "left"];

/**
 * Build a space-separated string of mobile-spacing utility class names
 * from the block's mlMobilePadding / mlMobileMargin attributes.
 *
 * Returns an empty string when no mobile spacing is set.
 */
export function getMobileSpacingClasses(attributes) {
  const {
    mlMobilePadding = {},
    mlMobileMargin = {},
    mlMobileFlexColumn = false,
    mlMobileJustifyContent = "",
    mlMobileFlexBasis = "",
  } = attributes;
  const classes = [];

  if (mlMobileFlexColumn) {
    classes.push("has-mobile-flex-column");
  }

  if (mlMobileJustifyContent) {
    classes.push(`has-mobile-justify-${mlMobileJustifyContent}`);
  }

  if (mlMobileFlexBasis) {
    classes.push("has-mobile-flex-basis");
  }

  SIDES.forEach((side) => {
    const padVal = mlMobilePadding[side];
    if (padVal !== undefined && padVal !== "") {
      classes.push(`has-mobile-padding-${side}-${padVal}`);
    }

    const marVal = mlMobileMargin[side];
    if (marVal !== undefined && marVal !== "") {
      classes.push(`has-mobile-margin-${side}-${marVal}`);
    }
  });

  return classes.join(" ");
}

/**
 * Build a CSS rule string targeting a block by clientId for editor live preview.
 * Returns an empty string when no custom margin is set.
 */
export function getCustomMarginCSS(attributes, clientId) {
  const {
    mlCustomMargin = {},
    mlCustomMarginMobileOnly = false,
    mlCustomMarginMobileOverride = {},
    mlCustomMinWidth = "",
    mlMobileBreakpoint = 0,
  } = attributes;
  const declarations = [];

  SIDES.forEach((side) => {
    const val = mlCustomMargin[side];
    if (val) {
      declarations.push(`margin-${side}:${val} !important`);
    }
  });

  if (mlCustomMinWidth) {
    declarations.push(`min-width:${mlCustomMinWidth} !important`);
  }

  if (declarations.length === 0) {
    return "";
  }

  const rule = `[data-block="${clientId}"]{${declarations.join(";")}}`;

  if (mlCustomMarginMobileOnly) {
    // Toggle ON = override below breakpoint: apply a different margin on mobile.
    // Empty override values default to 0.
    const resetDeclarations = [];
    SIDES.forEach((side) => {
      if (mlCustomMargin[side]) {
        const overrideVal = mlCustomMarginMobileOverride[side] || "0px";
        resetDeclarations.push(`margin-${side}:${overrideVal} !important`);
      }
    });
    const globalBp =
      window.mlGutenbergCustomizations?.mobileBreakpoint || "650px";
    const bp = mlMobileBreakpoint > 0 ? `${mlMobileBreakpoint}px` : globalBp;
    const resetRule = `[data-block="${clientId}"]{${resetDeclarations.join(
      ";",
    )}}`;
    return `${rule}@media(max-width:${bp}){${resetRule}}`;
  }

  return rule;
}

/**
 * Build a CSS string that creates a semi-opaque white overlay on a block
 * in the editor to indicate it is hidden on the frontend.
 *
 * Returns an empty string when the block is not hidden.
 */
export function getHiddenOverlayCSS(attributes, clientId) {
  const { mlHidden = false } = attributes;
  if (!mlHidden) return "";

  return (
    `[data-block="${clientId}"]{position:relative}` +
    `[data-block="${clientId}"]::after{content:"";position:absolute;inset:0;background:rgba(255,255,255,0.8);pointer-events:none;z-index:1}`
  );
}
