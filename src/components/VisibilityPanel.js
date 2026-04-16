import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export default function VisibilityPanel({ attributes, setAttributes }) {
  const { mlHidden = false } = attributes;

  return (
    <InspectorControls>
      <PanelBody
        title={__("Visibility", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <ToggleControl
          label={__("Hidden?", "ml-gutenberg-customizations")}
          checked={mlHidden}
          onChange={(value) => setAttributes({ mlHidden: value })}
          __nextHasNoMarginBottom
        />
      </PanelBody>
    </InspectorControls>
  );
}
