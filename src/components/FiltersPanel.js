import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  Button,
  RangeControl,
  SelectControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { FILTER_RANGES, normalizeFilters } from "../utils/filters";

export default function FiltersPanel({ attributes, setAttributes }) {
  const stored = attributes.mlFilters || {};
  const filters = normalizeFilters(stored);

  const update = (changes) =>
    setAttributes({ mlFilters: { ...stored, ...changes } });

  const sliders = [
    { key: "blur", label: __("Blur (px)", "ml-gutenberg-customizations") },
    {
      key: "brightness",
      label: __("Brightness (%)", "ml-gutenberg-customizations"),
    },
    {
      key: "contrast",
      label: __("Contrast (%)", "ml-gutenberg-customizations"),
    },
    {
      key: "saturate",
      label: __("Saturation (%)", "ml-gutenberg-customizations"),
    },
    {
      key: "grayscale",
      label: __("Grayscale (%)", "ml-gutenberg-customizations"),
    },
    { key: "sepia", label: __("Sepia (%)", "ml-gutenberg-customizations") },
    {
      key: "hueRotate",
      label: __("Hue rotate (°)", "ml-gutenberg-customizations"),
    },
    { key: "invert", label: __("Invert (%)", "ml-gutenberg-customizations") },
    { key: "opacity", label: __("Opacity (%)", "ml-gutenberg-customizations") },
  ];

  return (
    <InspectorControls>
      <PanelBody
        title={__("Filters", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <SelectControl
            label={__("Apply to", "ml-gutenberg-customizations")}
            value={filters.target}
            options={[
              {
                value: "element",
                label: __("The block itself", "ml-gutenberg-customizations"),
              },
              {
                value: "backdrop",
                label: __(
                  "Whatever is behind it",
                  "ml-gutenberg-customizations",
                ),
              },
            ]}
            help={
              filters.target === "backdrop"
                ? __(
                    "Frosted glass. The block needs a see-through background colour for this to show.",
                    "ml-gutenberg-customizations",
                  )
                : undefined
            }
            onChange={(value) => update({ target: value })}
            __nextHasNoMarginBottom
          />

          {sliders.map(({ key, label }) => (
            <RangeControl
              key={key}
              label={label}
              value={filters[key]}
              onChange={(value) => update({ [key]: value })}
              min={FILTER_RANGES[key].min}
              max={FILTER_RANGES[key].max}
              step={FILTER_RANGES[key].step}
              allowReset
              resetFallbackValue={FILTER_RANGES[key].neutral}
              __nextHasNoMarginBottom
            />
          ))}

          <ToggleControl
            label={__("Disable on mobile", "ml-gutenberg-customizations")}
            help={__(
              "Drops the filter below the mobile breakpoint. Blur in particular is expensive on phones.",
              "ml-gutenberg-customizations",
            )}
            checked={filters.disableOnMobile}
            onChange={(value) => update({ disableOnMobile: value })}
            __nextHasNoMarginBottom
          />

          <div>
            <Button
              variant="secondary"
              onClick={() => setAttributes({ mlFilters: {} })}
              disabled={Object.keys(stored).length === 0}
            >
              {__("Reset filters", "ml-gutenberg-customizations")}
            </Button>
          </div>
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
