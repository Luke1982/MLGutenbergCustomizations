import { BlockControls } from "@wordpress/block-editor";
import { ToolbarGroup, ToolbarDropdownMenu } from "@wordpress/components";
import {
  justifyTop,
  justifyCenterVertical,
  justifyBottom,
} from "@wordpress/icons";
import { __ } from "@wordpress/i18n";

const ALIGNMENTS = [
  {
    value: "top",
    icon: justifyTop,
    title: __("Align top", "ml-gutenberg-customizations"),
  },
  {
    value: "center",
    icon: justifyCenterVertical,
    title: __("Align middle", "ml-gutenberg-customizations"),
  },
  {
    value: "bottom",
    icon: justifyBottom,
    title: __("Align bottom", "ml-gutenberg-customizations"),
  },
];

export default function CoverVerticalAlignToolbar({
  attributes,
  setAttributes,
}) {
  const { mlCoverVerticalAlign = "" } = attributes;
  const current = ALIGNMENTS.find((a) => a.value === mlCoverVerticalAlign);

  return (
    <BlockControls group="block">
      <ToolbarGroup>
        <ToolbarDropdownMenu
          icon={current?.icon || justifyCenterVertical}
          label={__("Change vertical alignment", "ml-gutenberg-customizations")}
          controls={ALIGNMENTS.map(({ value, icon, title }) => ({
            icon,
            title,
            isActive: mlCoverVerticalAlign === value,
            onClick: () =>
              setAttributes({
                mlCoverVerticalAlign:
                  mlCoverVerticalAlign === value ? "" : value,
              }),
          }))}
        />
      </ToolbarGroup>
    </BlockControls>
  );
}
