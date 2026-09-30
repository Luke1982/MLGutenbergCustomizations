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

import {
  IDENTITY_MATRIX,
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

export default function Transform3dPanel({ attributes, setAttributes }) {
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

  // A matrix takes over the perspective, so the slider is no use while one
  // is in play.
  const matrixActive = getTransform3dValue(stored).startsWith("matrix3d(");
  const matrix = parseMatrix3d(stored.matrix) || IDENTITY_MATRIX;

  // Editing one cell starts from whatever matrix is there, or the identity.
  const setCell = (index, next) => {
    const value = Number(next);
    const cells = [...matrix];

    cells[index] = Number.isFinite(value) ? value : 0;
    update({ matrix: cells });
  };

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
      step: 0.01,
    },
    {
      key: "perspective",
      label: __("Perspective (px)", "ml-gutenberg-customizations"),
      step: 10,
      disabled: matrixActive,
      help: matrixActive
        ? __(
            "Ignored while a matrix is set — a matrix carries its own perspective.",
            "ml-gutenberg-customizations",
          )
        : __(
            "Lower values exaggerate the 3D depth. 0 disables perspective.",
            "ml-gutenberg-customizations",
          ),
    },
  ];

  const renderSlider = ({ key, label, step = 1, help, disabled }) => (
    <RangeControl
      key={key}
      label={label}
      help={help}
      disabled={disabled}
      value={t[key]}
      onChange={(value) => update({ [key]: value })}
      min={TRANSFORM_3D_RANGES[key].min}
      max={TRANSFORM_3D_RANGES[key].max}
      step={step}
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

          <BaseControl
            help={__(
              "Four rows of four, the way a matrix is written. Anything the sliders above can do, this can do too — and a few things they cannot, like skew.",
              "ml-gutenberg-customizations",
            )}
            __nextHasNoMarginBottom
          >
            <BaseControl.VisualLabel>
              {__("Matrix (matrix3d)", "ml-gutenberg-customizations")}
            </BaseControl.VisualLabel>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: "4px",
              }}
            >
              {matrix.map((cell, index) => (
                <div key={index} style={{ minWidth: 0 }}>
                  <NumberControl
                    label={sprintf(
                      /* translators: 1: matrix row, 2: matrix column. */
                      __("Row %1$d column %2$d", "ml-gutenberg-customizations"),
                      Math.floor(index / 4) + 1,
                      (index % 4) + 1,
                    )}
                    hideLabelFromVision
                    value={cell}
                    step="any"
                    onChange={(next) => setCell(index, next)}
                    __nextHasNoMarginBottom
                  />
                </div>
              ))}
            </div>
          </BaseControl>

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
                onClick={() => update({ matrix: "" })}
              >
                {__("Reset matrix to identity", "ml-gutenberg-customizations")}
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
