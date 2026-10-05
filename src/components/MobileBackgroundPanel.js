import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  BaseControl,
  FocalPointPicker,
  ToggleControl,
  ToggleGroupControl as StableToggleGroupControl,
  ToggleGroupControlOption as StableToggleGroupControlOption,
  __experimentalToggleGroupControl as ExperimentalToggleGroupControl,
  __experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
  AlignmentMatrixControl as StableAlignmentMatrixControl,
  __experimentalAlignmentMatrixControl as ExperimentalAlignmentMatrixControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { normalizeMobileBackground } from "../utils/mobile-background";

const ToggleGroupControl =
  StableToggleGroupControl ?? ExperimentalToggleGroupControl;
const ToggleGroupControlOption =
  StableToggleGroupControlOption ?? ExperimentalToggleGroupControlOption;
const AlignmentMatrixControl =
  StableAlignmentMatrixControl ?? ExperimentalAlignmentMatrixControl;

/**
 * The nine alignment cells as focal points, for blocks with no image to
 * drag a point over.
 */
const MATRIX_POINTS = {
  "top left": { x: 0, y: 0 },
  "top center": { x: 0.5, y: 0 },
  "top right": { x: 1, y: 0 },
  "center left": { x: 0, y: 0.5 },
  "center center": { x: 0.5, y: 0.5 },
  "center right": { x: 1, y: 0.5 },
  "bottom left": { x: 0, y: 1 },
  "bottom center": { x: 0.5, y: 1 },
  "bottom right": { x: 1, y: 1 },
};

function closestMatrixValue(point) {
  if (!point) {
    return "center center";
  }

  const round = (n) => {
    if (n < 0.25) {
      return 0;
    }

    return n > 0.75 ? 1 : 0.5;
  };
  const x = round(point.x);
  const y = round(point.y);

  return (
    Object.keys(MATRIX_POINTS).find(
      (key) => MATRIX_POINTS[key].x === x && MATRIX_POINTS[key].y === y,
    ) || "center center"
  );
}

/**
 * The block's background image, if it has one, so the focal point can be
 * dragged over the real thing.
 */
function backgroundImageUrl(attributes) {
  return (
    attributes?.style?.background?.backgroundImage?.url ||
    attributes?.url ||
    ""
  );
}

export default function MobileBackgroundPanel({ attributes, setAttributes }) {
  const stored = attributes.mlMobileBackground || {};
  const background = normalizeMobileBackground(stored);
  const url = backgroundImageUrl(attributes);

  const update = (changes) =>
    setAttributes({ mlMobileBackground: { ...stored, ...changes } });

  return (
    <InspectorControls>
      <PanelBody
        title={__("Mobile background", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <ToggleControl
            label={__("Hide the background", "ml-gutenberg-customizations")}
            help={__(
              "Drops the background image below the mobile breakpoint. Any background colour stays.",
              "ml-gutenberg-customizations",
            )}
            checked={background.hide}
            onChange={(value) => update({ hide: value })}
            __nextHasNoMarginBottom
          />

          {!background.hide && (
            <>
              <ToggleGroupControl
                label={__("How it fits", "ml-gutenberg-customizations")}
                value={background.size}
                onChange={(value) => update({ size: value })}
                isBlock
                __nextHasNoMarginBottom
              >
                <ToggleGroupControlOption
                  value=""
                  label={__("Default", "ml-gutenberg-customizations")}
                />
                <ToggleGroupControlOption
                  value="cover"
                  label={__("Cover", "ml-gutenberg-customizations")}
                />
                <ToggleGroupControlOption
                  value="contain"
                  label={__("Contain", "ml-gutenberg-customizations")}
                />
                <ToggleGroupControlOption
                  value="auto"
                  label={__("Auto", "ml-gutenberg-customizations")}
                />
              </ToggleGroupControl>

              {url ? (
                <FocalPointPicker
                  label={__("Focal point", "ml-gutenberg-customizations")}
                  help={__(
                    "Drag the point to choose what stays in frame on a narrow screen.",
                    "ml-gutenberg-customizations",
                  )}
                  url={url}
                  value={background.position || { x: 0.5, y: 0.5 }}
                  onChange={(value) => update({ position: value })}
                  __nextHasNoMarginBottom
                />
              ) : (
                <BaseControl
                  help={__(
                    "Add a background image to this block to drag a focal point over it.",
                    "ml-gutenberg-customizations",
                  )}
                  __nextHasNoMarginBottom
                >
                  <BaseControl.VisualLabel>
                    {__("Focal point", "ml-gutenberg-customizations")}
                  </BaseControl.VisualLabel>
                  <div>
                    <AlignmentMatrixControl
                      label={__("Focal point", "ml-gutenberg-customizations")}
                      value={closestMatrixValue(background.position)}
                      onChange={(value) =>
                        update({ position: MATRIX_POINTS[value] })
                      }
                    />
                  </div>
                </BaseControl>
              )}
            </>
          )}
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
