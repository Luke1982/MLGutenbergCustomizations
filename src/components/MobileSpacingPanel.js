import {
  InspectorControls,
  __experimentalSpacingSizesControl as SpacingSizesControl,
  JustifyContentControl,
} from "@wordpress/block-editor";
import {
  PanelBody,
  ToggleControl,
  RangeControl,
  __experimentalBoxControl as BoxControl,
  __experimentalUnitControl as UnitControl,
} from "@wordpress/components";
import { __, sprintf } from "@wordpress/i18n";

const SIDES = ["top", "right", "bottom", "left"];

/**
 * Convert our slug-based values ({ top: "50", left: "0" })
 * to the format SpacingSizesControl expects ({ top: "var:preset|spacing|50", left: "0" }).
 */
function slugsToPresetValues(obj) {
  const result = {};
  SIDES.forEach((side) => {
    const val = obj[side];
    if (val && val !== "0") {
      result[side] = `var:preset|spacing|${val}`;
    } else if (val === "0") {
      result[side] = "0";
    }
  });
  return result;
}

/**
 * Convert SpacingSizesControl values back to slug format.
 * "var:preset|spacing|50" → "50", "0" → "0", undefined → ""
 */
function presetValuesToSlugs(obj) {
  const result = { top: "", right: "", bottom: "", left: "" };
  SIDES.forEach((side) => {
    const val = obj?.[side];
    if (!val) {
      result[side] = "";
    } else if (val === "0") {
      result[side] = "0";
    } else {
      const match = val.match(/spacing\|(\w+)$/);
      result[side] = match ? match[1] : "";
    }
  });
  return result;
}

export default function MobileSpacingPanel({ attributes, setAttributes }) {
  const {
    mlMobilePadding = {},
    mlMobileMargin = {},
    mlMobileFlexColumn = false,
    mlMobileJustifyContent = "",
    mlMobileFlexBasis = "",
    mlMobileBreakpoint = 0,
    mlCustomMargin = {},
    mlCustomMarginMobileOnly = false,
    mlCustomMarginMobileOverride = {},
    mlCustomMinWidth = "",
  } = attributes;

  const globalBreakpoint =
    window.mlGutenbergCustomizations?.mobileBreakpoint || "650px";
  const effectiveBreakpoint =
    mlMobileBreakpoint > 0 ? `${mlMobileBreakpoint}px` : globalBreakpoint;

  return (
    <InspectorControls>
      <PanelBody
        title={__("Mobile Behavior", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <p style={{ fontSize: "12px", color: "#757575", marginBottom: "16px" }}>
          {sprintf(
            /* translators: %s: breakpoint width, e.g. "650px" */
            __(
              "Applied below %s viewport width.",
              "ml-gutenberg-customizations",
            ),
            effectiveBreakpoint,
          )}
        </p>

        <ToggleControl
          label={__("Force column direction", "ml-gutenberg-customizations")}
          help={__(
            "Stacks flex children vertically on mobile.",
            "ml-gutenberg-customizations",
          )}
          checked={mlMobileFlexColumn}
          onChange={(value) => setAttributes({ mlMobileFlexColumn: value })}
          __nextHasNoMarginBottom
        />

        <div style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "11px", fontWeight: 500, textTransform: "uppercase", marginBottom: "8px" }}>
            {__("Justify items", "ml-gutenberg-customizations")}
          </p>
          <JustifyContentControl
            value={mlMobileJustifyContent}
            onChange={(value) =>
              setAttributes({ mlMobileJustifyContent: value ?? "" })
            }
            allowedControls={["left", "center", "right", "space-between"]}
          />
        </div>

        <UnitControl
          label={__("Mobile width (flex-basis)", "ml-gutenberg-customizations")}
          help={__(
            "Sets the flex-basis on mobile. Leave empty for auto.",
            "ml-gutenberg-customizations",
          )}
          value={mlMobileFlexBasis}
          onChange={(value) =>
            setAttributes({ mlMobileFlexBasis: value ?? "" })
          }
          units={[
            {
              value: "%",
              label: "%",
              default: 100,
              step: 1,
              a11yLabel: "Percent",
            },
            {
              value: "px",
              label: "px",
              default: 100,
              step: 1,
              a11yLabel: "Pixels",
            },
            {
              value: "vw",
              label: "vw",
              default: 100,
              step: 1,
              a11yLabel: "Viewport width",
            },
          ]}
          min={0}
          max={100}
          __nextHasNoMarginBottom
        />

        <RangeControl
          label={__("Custom breakpoint (px)", "ml-gutenberg-customizations")}
          help={__(
            "Override the global breakpoint for this block. Set to 0 to use the default.",
            "ml-gutenberg-customizations",
          )}
          value={mlMobileBreakpoint}
          onChange={(value) =>
            setAttributes({ mlMobileBreakpoint: value ?? 0 })
          }
          min={0}
          max={2000}
          step={10}
          allowReset
          resetFallbackValue={0}
          __nextHasNoMarginBottom
        />

        <SpacingSizesControl
          label={__("Padding", "ml-gutenberg-customizations")}
          values={slugsToPresetValues(mlMobilePadding)}
          onChange={(nextValues) =>
            setAttributes({
              mlMobilePadding: presetValuesToSlugs(nextValues),
            })
          }
          sides={SIDES}
          allowReset
        />

        <SpacingSizesControl
          label={__("Margin", "ml-gutenberg-customizations")}
          values={slugsToPresetValues(mlMobileMargin)}
          onChange={(nextValues) =>
            setAttributes({
              mlMobileMargin: presetValuesToSlugs(nextValues),
            })
          }
          sides={SIDES}
          allowReset
        />
      </PanelBody>

      <PanelBody
        title={__("Custom Spacing & Alignment", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <p style={{ fontSize: "12px", color: "#757575", marginBottom: "16px" }}>
          {__(
            "Applies at all screen sizes. Supports negative values for pulling elements.",
            "ml-gutenberg-customizations",
          )}
        </p>

        <BoxControl
          label={__("Margin", "ml-gutenberg-customizations")}
          values={mlCustomMargin}
          onChange={(nextValues) =>
            setAttributes({ mlCustomMargin: nextValues })
          }
          allowReset
          inputProps={{ min: -100, max: 0 }}
        />

        <UnitControl
          label={__("Min-width", "ml-gutenberg-customizations")}
          help={__(
            "Sets a minimum width on this block. Leave empty for none.",
            "ml-gutenberg-customizations",
          )}
          value={mlCustomMinWidth}
          onChange={(value) => setAttributes({ mlCustomMinWidth: value ?? "" })}
          units={[
            {
              value: "px",
              label: "px",
              default: 0,
              step: 1,
              a11yLabel: "Pixels",
            },
            {
              value: "%",
              label: "%",
              default: 0,
              step: 1,
              a11yLabel: "Percent",
            },
            {
              value: "vw",
              label: "vw",
              default: 0,
              step: 1,
              a11yLabel: "Viewport width",
            },
          ]}
          min={0}
          __nextHasNoMarginBottom
        />

        <ToggleControl
          label={__("Override below breakpoint", "ml-gutenberg-customizations")}
          help={sprintf(
            /* translators: %s: breakpoint width */
            __(
              "Use different margins below %s.",
              "ml-gutenberg-customizations",
            ),
            effectiveBreakpoint,
          )}
          checked={mlCustomMarginMobileOnly}
          onChange={(value) =>
            setAttributes({ mlCustomMarginMobileOnly: value })
          }
          __nextHasNoMarginBottom
        />

        {mlCustomMarginMobileOnly && (
          <BoxControl
            label={__("Mobile margin override", "ml-gutenberg-customizations")}
            help={__(
              "Leave empty to reset to 0.",
              "ml-gutenberg-customizations",
            )}
            values={mlCustomMarginMobileOverride}
            onChange={(nextValues) =>
              setAttributes({ mlCustomMarginMobileOverride: nextValues })
            }
            allowReset
            inputProps={{ min: -100, max: 0 }}
          />
        )}
      </PanelBody>
    </InspectorControls>
  );
}
