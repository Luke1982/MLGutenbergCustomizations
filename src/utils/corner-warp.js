/**
 * Shared bits between the sidebar warp controls and the handles that sit on
 * the block itself in the canvas.
 */

import { DEFAULT_CORNERS, matrixFromCorners } from "./matrix-corners";

export const clampCorner = (n) =>
  Math.min(1.5, Math.max(-0.5, Math.round(n * 100) / 100));

/**
 * The block's element inside the editor canvas, which lives in its own
 * iframe in recent WordPress versions.
 */
export function getBlockElement(clientId) {
  const canvas = document.querySelector('iframe[name="editor-canvas"]');
  const doc = canvas?.contentDocument || document;

  return doc.querySelector(`[data-block="${clientId}"]`) || null;
}

export function readCorners(stored) {
  const corners = stored?.corners;

  if (
    Array.isArray(corners) &&
    corners.length === 4 &&
    corners.every(
      (c) => Array.isArray(c) && c.length === 2 && c.every(Number.isFinite),
    )
  ) {
    return corners;
  }

  return DEFAULT_CORNERS;
}

export function hasCornerWarp(stored) {
  return Array.isArray(stored?.corners);
}

/**
 * The attribute changes for a set of corners: the corners themselves plus
 * the matrix they produce, measured against the block's real size.
 */
export function cornerWarpUpdate(clientId, corners) {
  const el = getBlockElement(clientId);
  const matrix = el
    ? matrixFromCorners(corners, el.offsetWidth, el.offsetHeight)
    : null;

  return { corners, matrix: matrix || "" };
}
