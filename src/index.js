import { addFilter } from "@wordpress/hooks";
import { createHigherOrderComponent } from "@wordpress/compose";

import MobileSpacingPanel from "./components/MobileSpacingPanel";
import VisibilityPanel from "./components/VisibilityPanel";
import { getMobileSpacingClasses, getCustomMarginCSS, getHiddenOverlayCSS } from "./utils/classes";

import "./style.scss";

/**
 * Blocks that receive the mobile-spacing controls.
 * Row and Stack are variations of core/group, so targeting
 * core/group covers all three.
 */
const SUPPORTED_BLOCKS = ["core/columns", "core/column", "core/group"];

/**
 * Register custom attributes for mobile padding and margin.
 */
addFilter(
  "blocks.registerBlockType",
  "ml-gutenberg-customizations/mobile-spacing-attributes",
  (settings, name) => {
    if (!SUPPORTED_BLOCKS.includes(name)) {
      return settings;
    }

    return {
      ...settings,
      attributes: {
        ...settings.attributes,
        mlMobilePadding: {
          type: "object",
          default: { top: "", right: "", bottom: "", left: "" },
        },
        mlMobileMargin: {
          type: "object",
          default: { top: "", right: "", bottom: "", left: "" },
        },
        mlMobileFlexColumn: {
          type: "boolean",
          default: false,
        },
        mlMobileFlexBasis: {
          type: "string",
          default: "",
        },
        mlMobileBreakpoint: {
          type: "number",
          default: 0,
        },
        mlCustomMargin: {
          type: "object",
          default: { top: "", right: "", bottom: "", left: "" },
        },
        mlCustomMarginMobileOnly: {
          type: "boolean",
          default: false,
        },
        mlCustomMarginMobileOverride: {
          type: "object",
          default: { top: "", right: "", bottom: "", left: "" },
        },
        mlCustomMinWidth: {
          type: "string",
          default: "",
        },
        mlHidden: {
          type: "boolean",
          default: false,
        },
      },
    };
  },
);

/**
 * Wrap BlockEdit to inject the Mobile Spacing inspector panel.
 */
const withMobileSpacingControls = createHigherOrderComponent((BlockEdit) => {
  return (props) => {
    if (!SUPPORTED_BLOCKS.includes(props.name)) {
      return <BlockEdit {...props} />;
    }

    const customCSS = getCustomMarginCSS(props.attributes, props.clientId);
    const hiddenCSS = getHiddenOverlayCSS(props.attributes, props.clientId);

    return (
      <>
        <BlockEdit {...props} />
        <MobileSpacingPanel
          attributes={props.attributes}
          setAttributes={props.setAttributes}
        />
        <VisibilityPanel
          attributes={props.attributes}
          setAttributes={props.setAttributes}
        />
        {customCSS && <style>{customCSS}</style>}
        {hiddenCSS && <style>{hiddenCSS}</style>}
      </>
    );
  };
}, "withMobileSpacingControls");

addFilter(
  "editor.BlockEdit",
  "ml-gutenberg-customizations/mobile-spacing-controls",
  withMobileSpacingControls,
);

/**
 * Add mobile-spacing utility classes to the block wrapper in the editor
 * so responsive preview reflects the chosen values.
 */
const withMobileSpacingEditorClasses = createHigherOrderComponent(
  (BlockListBlock) => {
    return (props) => {
      if (!SUPPORTED_BLOCKS.includes(props.name)) {
        return <BlockListBlock {...props} />;
      }

      const classes = getMobileSpacingClasses(props.attributes);

      if (classes) {
        return <BlockListBlock {...props} className={classes} />;
      }

      return <BlockListBlock {...props} />;
    };
  },
  "withMobileSpacingEditorClasses",
);

addFilter(
  "editor.BlockListBlock",
  "ml-gutenberg-customizations/mobile-spacing-editor-classes",
  withMobileSpacingEditorClasses,
);
