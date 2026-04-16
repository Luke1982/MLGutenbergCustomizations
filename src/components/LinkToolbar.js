import { BlockControls } from "@wordpress/block-editor";
import { ToolbarButton, Popover } from "@wordpress/components";
import { __experimentalLinkControl as LinkControl } from "@wordpress/block-editor";
import { link, linkOff } from "@wordpress/icons";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";

export default function LinkToolbar({ attributes, setAttributes }) {
  const { mlLinkUrl = "", mlLinkTarget = "" } = attributes;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BlockControls group="other">
      {mlLinkUrl ? (
        <ToolbarButton
          icon={linkOff}
          label={__("Unlink", "ml-gutenberg-customizations")}
          onClick={() => setAttributes({ mlLinkUrl: "", mlLinkTarget: "" })}
          isActive
        />
      ) : (
        <ToolbarButton
          icon={link}
          label={__("Link", "ml-gutenberg-customizations")}
          onClick={() => setIsOpen(true)}
        />
      )}

      {(isOpen || mlLinkUrl) && isOpen && (
        <Popover
          position="bottom center"
          onClose={() => setIsOpen(false)}
          anchor={undefined}
          focusOnMount="firstElement"
        >
          <LinkControl
            value={{
              url: mlLinkUrl,
              opensInNewTab: mlLinkTarget === "_blank",
            }}
            onChange={({ url, opensInNewTab }) => {
              setAttributes({
                mlLinkUrl: url || "",
                mlLinkTarget: opensInNewTab ? "_blank" : "",
              });
            }}
            onRemove={() => {
              setAttributes({ mlLinkUrl: "", mlLinkTarget: "" });
              setIsOpen(false);
            }}
          />
        </Popover>
      )}
    </BlockControls>
  );
}
