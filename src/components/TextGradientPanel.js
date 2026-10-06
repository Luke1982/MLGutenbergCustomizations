import * as blockEditor from "@wordpress/block-editor";
import { PanelBody, GradientPicker } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { sanitizeTextGradient } from "../utils/text-gradient";

const { InspectorControls } = blockEditor;

/**
 * The theme's gradient presets. Which hook provides them moved in WP 6.5,
 * so the right one is picked once, at load, and stays stable from there.
 */
function pickGradientHook() {
  if (blockEditor.useSettings) {
    return () => blockEditor.useSettings("color.gradients")[0] || [];
  }

  if (blockEditor.__experimentalUseSetting) {
    return () => blockEditor.__experimentalUseSetting("color.gradients") || [];
  }

  return () => [];
}

const useGradientPresets = pickGradientHook();

export default function TextGradientPanel({ attributes, setAttributes }) {
  const gradient = sanitizeTextGradient(attributes.mlTextGradient);
  const presets = useGradientPresets();

  return (
    <InspectorControls group="color">
      <PanelBody
        title={__("Gradient text", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "12px" }}>
          <GradientPicker
            value={gradient || undefined}
            gradients={presets}
            onChange={(value) =>
              setAttributes({ mlTextGradient: value || "" })
            }
            clearable
            __nextHasNoMarginBottom
          />

          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "#757575",
            }}
          >
            {__(
              "The gradient fills the letters themselves, so it replaces the text colour. A background image on the same block is replaced too.",
              "ml-gutenberg-customizations",
            )}
          </p>
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
