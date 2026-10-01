import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  BaseControl,
  Button,
  SelectControl,
  ToggleControl,
  UnitControl as StableUnitControl,
  __experimentalUnitControl as ExperimentalUnitControl,
  __experimentalNumberControl as ExperimentalNumberControl,
  NumberControl as StableNumberControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import {
  INSET_SIDES,
  INSET_UNITS,
  Z_INDEX_RANGE,
  normalizePosition,
} from "../utils/position";

// Both are only exported as experimental on older WP versions.
const UnitControl = StableUnitControl ?? ExperimentalUnitControl;
const NumberControl = StableNumberControl ?? ExperimentalNumberControl;

const UNITS = [
  ...Object.keys(INSET_UNITS).map((unit) => ({
    value: unit,
    label: unit,
    default: 0,
    step: INSET_UNITS[unit].step,
  })),
  // Picking this leaves the side to the browser, same as leaving it empty.
  { value: "auto", label: "auto", default: 0 },
];

export default function PositionPanel({ attributes, setAttributes }) {
  const stored = attributes.mlPosition || {};
  const position = normalizePosition(stored);

  const update = (changes) =>
    setAttributes({ mlPosition: { ...stored, ...changes } });

  const sideLabels = {
    top: __("Top", "ml-gutenberg-customizations"),
    right: __("Right", "ml-gutenberg-customizations"),
    bottom: __("Bottom", "ml-gutenberg-customizations"),
    left: __("Left", "ml-gutenberg-customizations"),
  };

  const help = {
    absolute: __(
      "Positioned against the nearest positioned ancestor. Set that parent to Relative with this same control, or it will anchor to the page.",
      "ml-gutenberg-customizations",
    ),
    fixed: __(
      "Stays put while the page scrolls. A 3D transform on any ancestor makes it behave like Absolute instead — that is a browser rule, not a plugin limit.",
      "ml-gutenberg-customizations",
    ),
    sticky: __(
      "Scrolls along until it reaches the offset below, then stays. It needs at least one offset, and a parent that is taller than the block.",
      "ml-gutenberg-customizations",
    ),
    relative: __(
      "Nudges the block by the offsets below, and makes it the anchor for absolutely positioned blocks inside it.",
      "ml-gutenberg-customizations",
    ),
  };

  return (
    <InspectorControls>
      <PanelBody
        title={__("Position", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <SelectControl
            label={__("Position", "ml-gutenberg-customizations")}
            value={position.type}
            options={[
              {
                value: "",
                label: __("Default (in the flow)", "ml-gutenberg-customizations"),
              },
              {
                value: "relative",
                label: __("Relative", "ml-gutenberg-customizations"),
              },
              {
                value: "absolute",
                label: __("Absolute", "ml-gutenberg-customizations"),
              },
              {
                value: "fixed",
                label: __("Fixed", "ml-gutenberg-customizations"),
              },
              {
                value: "sticky",
                label: __("Sticky", "ml-gutenberg-customizations"),
              },
            ]}
            help={help[position.type]}
            onChange={(value) => update({ type: value })}
            __nextHasNoMarginBottom
          />

          {position.type && (
            <>
              <BaseControl
                help={__(
                  "Leave a side empty, or pick auto as its unit, to let the browser decide it.",
                  "ml-gutenberg-customizations",
                )}
                __nextHasNoMarginBottom
              >
                <BaseControl.VisualLabel>
                  {__("Offsets", "ml-gutenberg-customizations")}
                </BaseControl.VisualLabel>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  {INSET_SIDES.map((side) => (
                    <UnitControl
                      key={side}
                      label={sideLabels[side]}
                      value={stored[side] ?? ""}
                      units={UNITS}
                      placeholder={__("auto", "ml-gutenberg-customizations")}
                      onChange={(value) =>
                        update({
                          [side]: /auto$/i.test(value || "")
                            ? "auto"
                            : value ?? "",
                        })
                      }
                    />
                  ))}
                </div>
              </BaseControl>

              <NumberControl
                label={__("Z-index", "ml-gutenberg-customizations")}
                help={__(
                  "Which block sits on top where they overlap.",
                  "ml-gutenberg-customizations",
                )}
                value={position.zIndex}
                min={Z_INDEX_RANGE.min}
                max={Z_INDEX_RANGE.max}
                step={1}
                onChange={(value) =>
                  update({ zIndex: value === "" || value === undefined ? "" : Number(value) })
                }
                __nextHasNoMarginBottom
              />

              <ToggleControl
                label={__("Disable on mobile", "ml-gutenberg-customizations")}
                help={__(
                  "Returns the block to the normal flow below the mobile breakpoint.",
                  "ml-gutenberg-customizations",
                )}
                checked={position.disableOnMobile}
                onChange={(value) => update({ disableOnMobile: value })}
                __nextHasNoMarginBottom
              />

              <div>
                <Button
                  variant="secondary"
                  onClick={() => setAttributes({ mlPosition: {} })}
                >
                  {__("Reset position", "ml-gutenberg-customizations")}
                </Button>
              </div>
            </>
          )}
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
