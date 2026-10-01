import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  BaseControl,
  RangeControl,
  ToggleControl,
  TextControl,
  Button,
  AlignmentMatrixControl as StableAlignmentMatrixControl,
  __experimentalAlignmentMatrixControl as ExperimentalAlignmentMatrixControl,
  UnitControl as StableUnitControl,
  __experimentalUnitControl as ExperimentalUnitControl,
  NumberControl as StableNumberControl,
  __experimentalNumberControl as ExperimentalNumberControl,
} from "@wordpress/components";
import { __, sprintf } from "@wordpress/i18n";
import { useRef } from "@wordpress/element";

import { DEFAULT_CORNERS } from "../utils/matrix-corners";
import {
  clampCorner,
  cornerWarpUpdate,
  hasCornerWarp,
  readCorners,
} from "../utils/corner-warp";
import {
  PERSPECTIVE_UNITS,
  TRANSFORM_3D_RANGES,
  TRANSLATE_UNITS,
  getTransform3dValue,
  getTranslateUnits,
  normalizeTransform3d,
  parseMatrix3d,
  parseTranslate,
} from "../utils/transform3d";

// Both controls are only exported as experimental on older WP versions.
const AlignmentMatrixControl =
  StableAlignmentMatrixControl ?? ExperimentalAlignmentMatrixControl;
const UnitControl = StableUnitControl ?? ExperimentalUnitControl;
const NumberControl = StableNumberControl ?? ExperimentalNumberControl;

/**
 * Slider plus number-and-unit input for one translate axis. The slider's
 * range follows the selected unit.
 */
function TranslateControl({ axis, label, help, stored, value, onChange }) {
  const { quantity, unit } = value;
  const range = TRANSLATE_UNITS[unit];
  const unitLabels = {
    px: __("Pixels (px)", "ml-gutenberg-customizations"),
    "%": __("Percent of the block's own size (%)", "ml-gutenberg-customizations"),
    em: __("Relative to the font size (em)", "ml-gutenberg-customizations"),
    rem: __("Relative to the root font size (rem)", "ml-gutenberg-customizations"),
    vw: __("Viewport width (vw)", "ml-gutenberg-customizations"),
    vh: __("Viewport height (vh)", "ml-gutenberg-customizations"),
  };
  const units = getTranslateUnits(axis).map((u) => ({
    value: u,
    label: u,
    default: 0,
    step: TRANSLATE_UNITS[u].step,
    a11yLabel: unitLabels[u],
  }));

  // Show what was typed (UnitControl keeps a draft and clamps on blur);
  // values saved as plain numbers are px.
  let inputValue = `${quantity}${unit}`;
  if (typeof stored === "string") {
    inputValue = stored;
  } else if (typeof stored === "number") {
    inputValue = `${stored}px`;
  }

  return (
    <BaseControl help={help} __nextHasNoMarginBottom>
      <BaseControl.VisualLabel>{label}</BaseControl.VisualLabel>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ flex: "1 1 auto" }}>
          <RangeControl
            label={label}
            hideLabelFromVision
            value={quantity}
            min={range.min}
            max={range.max}
            step={range.step}
            withInputField={false}
            onChange={(next) => onChange(`${next ?? 0}${unit}`)}
            __nextHasNoMarginBottom
          />
        </div>
        <div style={{ flex: "0 0 110px" }}>
          <UnitControl
            label={label}
            hideLabelFromVision
            value={inputValue}
            units={units}
            min={range.min}
            max={range.max}
            onChange={onChange}
          />
        </div>
      </div>
    </BaseControl>
  );
}

const CORNER_LABELS = ["Top left", "Top right", "Bottom left", "Bottom right"];

const PERSPECTIVE_UNIT_OPTIONS = Object.keys(PERSPECTIVE_UNITS).map((unit) => ({
  value: unit,
  label: unit,
  default: unit === "px" ? 1000 : 50,
  step: PERSPECTIVE_UNITS[unit].step,
}));

export default function Transform3dPanel({ attributes, setAttributes, clientId }) {
  const stored = attributes.mlTransform3d || {};
  const t = normalizeTransform3d(stored);

  function update(changes) {
    setAttributes({ mlTransform3d: { ...stored, ...changes } });
  }

  function updateTranslate(axis, next) {
    const parsed = parseTranslate(next, axis);
    // Switching units keeps the number, so clamp it to the new unit's range
    // right away. Typed numbers are stored as-is: rewriting them would reset
    // UnitControl's draft (e.g. a lone "-"), and it clamps them on blur.
    const switchedUnit = !!next && parsed.unit !== t[axis].unit;
    update({
      [axis]: switchedUnit ? `${parsed.quantity}${parsed.unit}` : next,
    });
  }

  const surfaceRef = useRef(null);
  const corners = readCorners(stored);
  const warping = hasCornerWarp(stored);

  // Dragging a corner recomputes the matrix against the block's real size in
  // the canvas, so the warp matches what is on screen.
  const setCorners = (next) => update(cornerWarpUpdate(clientId, next));

  const setCorner = (index, axis, value) => {
    const number = Number(value);

    setCorners(
      corners.map((corner, i) =>
        i === index
          ? corner.map((c, a) => (a === axis ? clampCorner(Number.isFinite(number) ? number : 0) : c))
          : corner,
      ),
    );
  };

  const startDrag = (index) => (event) => {
    event.preventDefault();

    const surface = surfaceRef.current;

    if (!surface) {
      return;
    }

    const box = surface.getBoundingClientRect();
    const move = (moveEvent) => {
      const x = clampCorner((moveEvent.clientX - box.left) / box.width);
      const y = clampCorner((moveEvent.clientY - box.top) / box.height);

      setCorners(corners.map((corner, i) => (i === index ? [x, y] : corner)));
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  // A matrix takes over the perspective, so the slider is no use while one
  // is in play.
  const matrixActive = getTransform3dValue(stored).startsWith("matrix3d(");

  const rotateSliders = [
    { key: "rotateX", label: __("Rotate X (°)", "ml-gutenberg-customizations") },
    { key: "rotateY", label: __("Rotate Y (°)", "ml-gutenberg-customizations") },
    { key: "rotateZ", label: __("Rotate Z (°)", "ml-gutenberg-customizations") },
  ];

  const translateControls = [
    {
      axis: "translateX",
      label: __("Translate X", "ml-gutenberg-customizations"),
      help: __(
        "% is relative to the block's own size, not its container.",
        "ml-gutenberg-customizations",
      ),
    },
    {
      axis: "translateY",
      label: __("Translate Y", "ml-gutenberg-customizations"),
    },
    {
      axis: "translateZ",
      label: __("Translate Z", "ml-gutenberg-customizations"),
      help: __(
        "Toward or away from the viewer. % is not available on this axis.",
        "ml-gutenberg-customizations",
      ),
    },
  ];

  const otherSliders = [
    {
      key: "scale",
      label: __("Scale", "ml-gutenberg-customizations"),
    },

  ];

  const renderSlider = ({ key, label, step, help, disabled }) => (
    <RangeControl
      key={key}
      label={label}
      help={help}
      disabled={disabled}
      value={t[key]}
      onChange={(value) => update({ [key]: value })}
      min={TRANSFORM_3D_RANGES[key].min}
      max={TRANSFORM_3D_RANGES[key].max}
      step={step ?? TRANSFORM_3D_RANGES[key].step ?? 1}
      allowReset
      resetFallbackValue={TRANSFORM_3D_RANGES[key].default}
      __nextHasNoMarginBottom
    />
  );

  return (
    <InspectorControls>
      <PanelBody
        title={__("3D Transform", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <BaseControl
            help={__(
              "The point the block rotates and scales around.",
              "ml-gutenberg-customizations",
            )}
            __nextHasNoMarginBottom
          >
            <BaseControl.VisualLabel>
              {__("Transform origin", "ml-gutenberg-customizations")}
            </BaseControl.VisualLabel>
            <div>
              <AlignmentMatrixControl
                label={__("Transform origin", "ml-gutenberg-customizations")}
                value={t.origin}
                onChange={(origin) => update({ origin })}
              />
            </div>
          </BaseControl>

          {rotateSliders.map(renderSlider)}

          {translateControls.map(({ axis, label, help }) => (
            <TranslateControl
              key={axis}
              axis={axis}
              label={label}
              help={help}
              stored={stored[axis]}
              value={t[axis]}
              onChange={(next) => updateTranslate(axis, next)}
            />
          ))}

          {otherSliders.map(renderSlider)}

          <UnitControl
            label={__("Perspective", "ml-gutenberg-customizations")}
            help={
              matrixActive
                ? __(
                    "Ignored while a matrix is set — a matrix carries its own perspective.",
                    "ml-gutenberg-customizations",
                  )
                : __(
                    "Lower values exaggerate the depth; empty or 0 turns it off. cq units measure against a container, so an ancestor needs a container type for them to mean anything.",
                    "ml-gutenberg-customizations",
                  )
            }
            value={t.perspective}
            units={PERSPECTIVE_UNIT_OPTIONS}
            disabled={matrixActive}
            onChange={(value) => update({ perspective: value ?? "" })}
          />

          {!warping && (
            <div>
              <Button
                variant="secondary"
                onClick={() => setCorners(DEFAULT_CORNERS)}
              >
                {__("Warp the corners", "ml-gutenberg-customizations")}
              </Button>
            </div>
          )}

          {warping && (
          <BaseControl
            help={__(
              "Drag the corners on the block itself, or here. Off a rectangle you get perspective, which the sliders above cannot do.",
              "ml-gutenberg-customizations",
            )}
            __nextHasNoMarginBottom
          >
            <BaseControl.VisualLabel>
              {__("Corner warp", "ml-gutenberg-customizations")}
            </BaseControl.VisualLabel>
            <div
              ref={surfaceRef}
              style={{
                position: "relative",
                width: "100%",
                height: "150px",
                margin: "4px 0 8px",
                border: "1px dashed #949494",
                background: "#f0f0f0",
                touchAction: "none",
              }}
            >
              <svg
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
              >
                <polygon
                  points={`${corners[0][0]},${corners[0][1]} ${corners[1][0]},${corners[1][1]} ${corners[3][0]},${corners[3][1]} ${corners[2][0]},${corners[2][1]}`}
                  fill="rgba(0, 124, 186, 0.15)"
                  stroke="#007cba"
                  strokeWidth="0.008"
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
                    width: "18px",
                    height: "18px",
                    margin: "-9px 0 0 -9px",
                    padding: 0,
                    borderRadius: "50%",
                    border: "2px solid #fff",
                    background: "#007cba",
                    cursor: "grab",
                    touchAction: "none",
                  }}
                />
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {corners.map(([x, y], index) => (
                <div key={index} style={{ minWidth: 0 }}>
                  <NumberControl
                    label={sprintf(
                      /* translators: %s: which corner, e.g. Top left. */
                      __("%s X", "ml-gutenberg-customizations"),
                      CORNER_LABELS[index],
                    )}
                    value={x}
                    step={0.01}
                    min={-0.5}
                    max={1.5}
                    onChange={(next) => setCorner(index, 0, next)}
                    __nextHasNoMarginBottom
                  />
                  <NumberControl
                    label={sprintf(
                      /* translators: %s: which corner, e.g. Top left. */
                      __("%s Y", "ml-gutenberg-customizations"),
                      CORNER_LABELS[index],
                    )}
                    value={y}
                    step={0.01}
                    min={-0.5}
                    max={1.5}
                    onChange={(next) => setCorner(index, 1, next)}
                    __nextHasNoMarginBottom
                  />
                </div>
              ))}
            </div>
          </BaseControl>
          )}

          <TextControl
            label={__("Paste a matrix", "ml-gutenberg-customizations")}
            help={__(
              "Drop in a matrix3d() or 16 numbers and the grid fills itself.",
              "ml-gutenberg-customizations",
            )}
            value=""
            onChange={(value) => {
              const pasted = parseMatrix3d(value);

              if (pasted) {
                update({ matrix: pasted });
              }
            }}
            __nextHasNoMarginBottom
          />

          {matrixActive && (
            <div>
              <Button
                variant="tertiary"
                isDestructive
                onClick={() => update({ matrix: "", corners: undefined })}
              >
                {__("Reset the warp", "ml-gutenberg-customizations")}
              </Button>
            </div>
          )}

          <ToggleControl
            label={__("Disable on mobile", "ml-gutenberg-customizations")}
            help={__(
              "Removes the transform below the mobile breakpoint. Use this on containers with a mobile menu: a transformed container traps fixed-position overlays inside it.",
              "ml-gutenberg-customizations",
            )}
            checked={t.disableOnMobile}
            onChange={(value) => update({ disableOnMobile: value })}
            __nextHasNoMarginBottom
          />

          <div>
            <Button
              variant="secondary"
              onClick={() => setAttributes({ mlTransform3d: {} })}
              disabled={Object.keys(stored).length === 0}
            >
              {__("Reset 3D transform", "ml-gutenberg-customizations")}
            </Button>
          </div>
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
