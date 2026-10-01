import { createPortal, useEffect, useState } from "@wordpress/element";
import { __, sprintf } from "@wordpress/i18n";

import {
  clampCorner,
  cornerWarpUpdate,
  getBlockElement,
  readCorners,
} from "../utils/corner-warp";

const CORNER_LABELS = ["Top left", "Top right", "Bottom left", "Bottom right"];

/**
 * Drag handles sitting on the block itself in the canvas.
 *
 * They are placed on the block's untransformed layout box, which is exactly
 * where the warped corners land, because a matrix is measured from the
 * block's top-left corner.
 */
export default function CornerWarpOverlay({
  clientId,
  attributes,
  setAttributes,
}) {
  const stored = attributes.mlTransform3d || {};
  const corners = readCorners(stored);
  const [box, setBox] = useState(null);

  useEffect(() => {
    const el = getBlockElement(clientId);

    if (!el) {
      return undefined;
    }

    const doc = el.ownerDocument;
    const view = doc.defaultView;

    const measure = () => {
      let left = 0;
      let top = 0;
      let node = el;

      while (node) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent;
      }

      setBox({
        doc,
        left,
        top,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    };

    measure();

    const observer = new view.ResizeObserver(measure);

    observer.observe(el);
    view.addEventListener("scroll", measure, true);
    view.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      view.removeEventListener("scroll", measure, true);
      view.removeEventListener("resize", measure);
    };
  }, [clientId, corners]);

  if (!box) {
    return null;
  }

  const startDrag = (index) => (event) => {
    event.preventDefault();
    event.stopPropagation();

    const view = box.doc.defaultView;

    const move = (moveEvent) => {
      const x = clampCorner(
        (moveEvent.clientX + view.scrollX - box.left) / box.width,
      );
      const y = clampCorner(
        (moveEvent.clientY + view.scrollY - box.top) / box.height,
      );

      setAttributes({
        mlTransform3d: {
          ...stored,
          ...cornerWarpUpdate(
            clientId,
            corners.map((corner, i) => (i === index ? [x, y] : corner)),
          ),
        },
      });
    };

    const stop = () => {
      view.removeEventListener("pointermove", move);
      view.removeEventListener("pointerup", stop);
    };

    view.addEventListener("pointermove", move);
    view.addEventListener("pointerup", stop);
  };

  return createPortal(
    <div
      style={{
        position: "absolute",
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      <svg
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <polygon
          points={`${corners[0][0]},${corners[0][1]} ${corners[1][0]},${corners[1][1]} ${corners[3][0]},${corners[3][1]} ${corners[2][0]},${corners[2][1]}`}
          fill="none"
          stroke="#007cba"
          strokeWidth="1"
          strokeDasharray="4 3"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {corners.map(([x, y], index) => (
        <button
          key={index}
          type="button"
          aria-label={sprintf(
            /* translators: %s: which corner, e.g. Top left. */
            __("Drag the %s corner", "ml-gutenberg-customizations"),
            CORNER_LABELS[index],
          )}
          onPointerDown={startDrag(index)}
          style={{
            position: "absolute",
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: "16px",
            height: "16px",
            margin: "-8px 0 0 -8px",
            padding: 0,
            borderRadius: "50%",
            border: "2px solid #fff",
            background: "#007cba",
            boxShadow: "0 0 0 1px rgba(0,0,0,.2)",
            cursor: "grab",
            pointerEvents: "auto",
            touchAction: "none",
          }}
        />
      ))}
    </div>,
    box.doc.body,
  );
}
