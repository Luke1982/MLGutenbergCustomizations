import { BlockControls } from "@wordpress/block-editor";
import {
  ToolbarButton,
  ToolbarDropdownMenu,
  Popover,
  MenuGroup,
  MenuItem,
  TextControl,
} from "@wordpress/components";
import { __experimentalLinkControl as LinkControl } from "@wordpress/block-editor";
import { link, linkOff } from "@wordpress/icons";
import { useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useSelect } from "@wordpress/data";
import { store as coreStore } from "@wordpress/core-data";

const LINK_TYPE_LABELS = {
  "": __("Custom URL", "ml-gutenberg-customizations"),
  post: __("Post Link", "ml-gutenberg-customizations"),
  term: __("Term Link", "ml-gutenberg-customizations"),
};

export default function LinkToolbar({ attributes, setAttributes }) {
  const {
    mlLinkUrl = "",
    mlLinkTarget = "",
    mlLinkType = "",
    mlLinkTaxonomy = "category",
  } = attributes;
  const [isOpen, setIsOpen] = useState(false);

  const hasLink = mlLinkType === "post" || mlLinkType === "term" || mlLinkUrl;

  const taxonomies = useSelect(
    (select) => select(coreStore).getTaxonomies({ per_page: -1 }) || [],
    [],
  );

  const publicTaxonomies = taxonomies.filter((t) => t.visibility?.public);

  return (
    <BlockControls group="other">
      {hasLink ? (
        <ToolbarButton
          icon={linkOff}
          label={__("Unlink", "ml-gutenberg-customizations")}
          onClick={() =>
            setAttributes({
              mlLinkUrl: "",
              mlLinkTarget: "",
              mlLinkType: "",
            })
          }
          isActive
        />
      ) : (
        <ToolbarButton
          icon={link}
          label={__("Link", "ml-gutenberg-customizations")}
          onClick={() => setIsOpen(true)}
        />
      )}

      {hasLink && (
        <ToolbarButton
          label={LINK_TYPE_LABELS[mlLinkType] || LINK_TYPE_LABELS[""]}
          onClick={() => setIsOpen(true)}
          text={LINK_TYPE_LABELS[mlLinkType] || LINK_TYPE_LABELS[""]}
        />
      )}

      {isOpen && (
        <Popover
          position="bottom center"
          onClose={() => setIsOpen(false)}
          anchor={undefined}
          focusOnMount="firstElement"
        >
          <div style={{ padding: "16px", minWidth: "260px" }}>
            <MenuGroup label={__("Link Type", "ml-gutenberg-customizations")}>
              {Object.entries(LINK_TYPE_LABELS).map(([value, label]) => (
                <MenuItem
                  key={value}
                  isSelected={mlLinkType === value}
                  role="menuitemradio"
                  onClick={() => {
                    setAttributes({
                      mlLinkType: value,
                      ...(value !== "" ? { mlLinkUrl: "" } : {}),
                    });
                  }}
                >
                  {label}
                  {mlLinkType === value && " ✓"}
                </MenuItem>
              ))}
            </MenuGroup>

            {mlLinkType === "" && (
              <div style={{ marginTop: "12px" }}>
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
              </div>
            )}

            {mlLinkType === "term" && publicTaxonomies.length > 0 && (
              <div style={{ marginTop: "12px" }}>
                <label
                  htmlFor="ml-link-taxonomy"
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontWeight: 500,
                  }}
                >
                  {__("Taxonomy", "ml-gutenberg-customizations")}
                </label>
                <select
                  id="ml-link-taxonomy"
                  value={mlLinkTaxonomy}
                  onChange={(e) =>
                    setAttributes({ mlLinkTaxonomy: e.target.value })
                  }
                  style={{ width: "100%" }}
                >
                  {publicTaxonomies.map((tax) => (
                    <option key={tax.slug} value={tax.slug}>
                      {tax.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(mlLinkType === "post" || mlLinkType === "term") && (
              <p
                style={{
                  marginTop: "12px",
                  color: "#757575",
                  fontSize: "12px",
                }}
              >
                {mlLinkType === "post"
                  ? __(
                      "Links to the current post URL in a query loop.",
                      "ml-gutenberg-customizations",
                    )
                  : __(
                      "Links to the primary term URL in a query loop.",
                      "ml-gutenberg-customizations",
                    )}
              </p>
            )}
          </div>
        </Popover>
      )}
    </BlockControls>
  );
}
