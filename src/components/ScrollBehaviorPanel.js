import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  ToggleControl,
  RangeControl,
  SelectControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

const DEFAULT = {
  enabled: false,
  mode: "offset",
  offset: 100,
  hideOnExceed: true,
  animation: "fade",
  enableOnMobile: true,
  enableOnDesktop: true,
  directionHideOn: "down",
};

export default function ScrollBehaviorPanel({ attributes, setAttributes }) {
  const sb = { ...DEFAULT, ...(attributes.mlScrollBehavior || {}) };

  function update(changes) {
    setAttributes({ mlScrollBehavior: { ...sb, ...changes } });
  }

  return (
    <InspectorControls>
      <PanelBody
        title={__("Scroll Behavior", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <ToggleControl
          label={__("Enable scroll behavior", "ml-gutenberg-customizations")}
          checked={sb.enabled}
          onChange={(value) => update({ enabled: value })}
          __nextHasNoMarginBottom
        />

        {sb.enabled && (
          <>
            <SelectControl
              label={__("Trigger mode", "ml-gutenberg-customizations")}
              value={sb.mode}
              options={[
                {
                  label: __("Scroll offset", "ml-gutenberg-customizations"),
                  value: "offset",
                },
                {
                  label: __(
                    "Scroll direction",
                    "ml-gutenberg-customizations",
                  ),
                  value: "direction",
                },
              ]}
              onChange={(value) => update({ mode: value })}
              __nextHasNoMarginBottom
            />

            <RangeControl
              label={
                sb.mode === "direction"
                  ? __(
                      "Minimum scroll before direction takes effect (px)",
                      "ml-gutenberg-customizations",
                    )
                  : __("Scroll offset (px)", "ml-gutenberg-customizations")
              }
              value={sb.offset}
              onChange={(value) => update({ offset: value })}
              min={0}
              max={2000}
              step={10}
              __nextHasNoMarginBottom
            />

            {sb.mode === "offset" && (
              <ToggleControl
                label={__(
                  "Hide when offset exceeded",
                  "ml-gutenberg-customizations",
                )}
                checked={sb.hideOnExceed}
                onChange={(value) => update({ hideOnExceed: value })}
                help={
                  sb.hideOnExceed
                    ? __(
                        "Element hides after scrolling past the offset.",
                        "ml-gutenberg-customizations",
                      )
                    : __(
                        "Element appears after scrolling past the offset.",
                        "ml-gutenberg-customizations",
                      )
                }
                __nextHasNoMarginBottom
              />
            )}

            {sb.mode === "direction" && (
              <SelectControl
                label={__(
                  "Hide when scrolling",
                  "ml-gutenberg-customizations",
                )}
                value={sb.directionHideOn}
                options={[
                  {
                    label: __("Down", "ml-gutenberg-customizations"),
                    value: "down",
                  },
                  {
                    label: __("Up", "ml-gutenberg-customizations"),
                    value: "up",
                  },
                ]}
                onChange={(value) => update({ directionHideOn: value })}
                __nextHasNoMarginBottom
              />
            )}

            <SelectControl
              label={__("Hide animation", "ml-gutenberg-customizations")}
              value={sb.animation}
              options={[
                {
                  label: __("Fade", "ml-gutenberg-customizations"),
                  value: "fade",
                },
                {
                  label: __("Slide up", "ml-gutenberg-customizations"),
                  value: "slide",
                },
                {
                  label: __(
                    "None (instant)",
                    "ml-gutenberg-customizations",
                  ),
                  value: "none",
                },
              ]}
              onChange={(value) => update({ animation: value })}
              __nextHasNoMarginBottom
            />

            <ToggleControl
              label={__("Enable on mobile", "ml-gutenberg-customizations")}
              checked={sb.enableOnMobile}
              onChange={(value) => update({ enableOnMobile: value })}
              __nextHasNoMarginBottom
            />

            <ToggleControl
              label={__("Enable on desktop", "ml-gutenberg-customizations")}
              checked={sb.enableOnDesktop}
              onChange={(value) => update({ enableOnDesktop: value })}
              __nextHasNoMarginBottom
            />
          </>
        )}
      </PanelBody>
    </InspectorControls>
  );
}
