import { addFilter } from "@wordpress/hooks";
import { createHigherOrderComponent } from "@wordpress/compose";
import { registerBlockType, getBlockType } from "@wordpress/blocks";
import { __ } from "@wordpress/i18n";
import { useEffect } from "@wordpress/element";
import {
  InspectorControls,
  MediaUpload,
  MediaUploadCheck,
  useBlockProps,
  store as blockEditorStore,
} from "@wordpress/block-editor";
import {
  Button,
  PanelBody,
  SelectControl,
  Placeholder,
  Spinner,
} from "@wordpress/components";
import ServerSideRender from "@wordpress/server-side-render";
import { useSelect } from "@wordpress/data";
import { store as coreDataStore } from "@wordpress/core-data";

import MobileSpacingPanel from "./components/MobileSpacingPanel";
import VisibilityPanel from "./components/VisibilityPanel";
import ScrollBehaviorPanel from "./components/ScrollBehaviorPanel";
import LinkToolbar from "./components/LinkToolbar";
import CoverVerticalAlignToolbar from "./components/CoverVerticalAlignToolbar";
import Transform3dPanel from "./components/Transform3dPanel";
import {
  getMobileSpacingClasses,
  getCustomMarginCSS,
  getHiddenOverlayCSS,
} from "./utils/classes";
import {
  getTransform3dWrapperProps,
  supportsTransform3d,
} from "./utils/transform3d";

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
        mlMobileJustifyContent: {
          type: "string",
          default: "",
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
        mlVisibility: {
          type: "string",
          default: "all",
        },
        mlHidden: {
          type: "boolean",
          default: false,
        },
        mlLinkUrl: {
          type: "string",
          default: "",
        },
        mlLinkTarget: {
          type: "string",
          default: "",
        },
        mlLinkType: {
          type: "string",
          default: "",
        },
        mlLinkTaxonomy: {
          type: "string",
          default: "category",
        },
        mlScrollBehavior: {
          type: "object",
          default: {
            enabled: false,
            mode: "offset",
            offset: 100,
            hideOnExceed: true,
            animation: "fade",
            enableOnMobile: true,
            enableOnDesktop: true,
            directionHideOn: "down",
          },
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
    const { mlVisibility = "all" } = props.attributes;
    const { clientId } = props;

    // Inject a scoped <style> into the main document <head> so the badge
    // CSS reaches the list view (which lives outside the canvas iframe).
    // window.parent === window in the post editor (no iframe), so this
    // works in both editors without cross-origin issues.
    useEffect(() => {
      const mobilePath =
        "M15 4H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm.5" +
        " 14c0 .3-.2.5-.5.5H9c-.3 0-.5-.2-.5-.5V6c0-.3.2-.5.5-.5h6c.3 0 .5.2.5.5v12zm-4.5-.5h2V16h-2v1.5z";
      const desktopPath =
        "M20.5 16h-.7V8c0-1.1-.9-2-2-2H6.2c-1.1 0-2 .9-2 2v8h-.7c-.8 0-1.5.7-1.5 1.5h20" +
        "c0-.8-.7-1.5-1.5-1.5zM5.7 8c0-.3.2-.5.5-.5h11.6c.3 0 .5.2.5.5v7.6H5.7V8z";

      const svgPath =
        mlVisibility === "mobile-only"
          ? mobilePath
          : mlVisibility === "desktop-only"
          ? desktopPath
          : null;

      const mainDoc = window.parent?.document ?? document;
      const styleId = `ml-visibility-badge-${clientId}`;

      mainDoc.getElementById(styleId)?.remove();

      if (!svgPath) return;

      const svgUri =
        'url("data:image/svg+xml,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#1e1e1e" d="${svgPath}"/></svg>`,
        ) +
        '")';

      const styleEl = mainDoc.createElement("style");
      styleEl.id = styleId;
      styleEl.textContent =
        `[data-block="${clientId}"] .block-editor-list-view-block__contents-cell{position:relative;}` +
        `[data-block="${clientId}"] .block-editor-list-view-block__contents-cell::after` +
        `{content:"";display:block;position:absolute;right:8px;top:50%;transform:translateY(-50%);width:16px;height:16px;background:${svgUri} no-repeat center/contain;pointer-events:none;}`;
      mainDoc.head.appendChild(styleEl);

      return () => {
        mainDoc.getElementById(styleId)?.remove();
      };
    }, [clientId, mlVisibility]);

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
        <ScrollBehaviorPanel
          attributes={props.attributes}
          setAttributes={props.setAttributes}
        />
        <LinkToolbar
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

/**
 * Register the vertical-align attribute for core/cover.
 */
addFilter(
  "blocks.registerBlockType",
  "ml-gutenberg-customizations/cover-vertical-align-attribute",
  (settings, name) => {
    if (name !== "core/cover") {
      return settings;
    }

    return {
      ...settings,
      attributes: {
        ...settings.attributes,
        mlCoverVerticalAlign: {
          type: "string",
          default: "",
        },
      },
    };
  },
);

/**
 * Inject the vertical-alignment toolbar into core/cover.
 */
const withCoverVerticalAlignControls = createHigherOrderComponent(
  (BlockEdit) => {
    return (props) => {
      if (props.name !== "core/cover") {
        return <BlockEdit {...props} />;
      }

      const { mlCoverVerticalAlign = "" } = props.attributes;
      const justifyValue = {
        top: "flex-start",
        center: "center",
        bottom: "flex-end",
      }[mlCoverVerticalAlign];
      const alignCSS = justifyValue
        ? `[data-block="${props.clientId}"] .wp-block-cover__inner-container{display:flex !important;flex-direction:column !important;height:100% !important;justify-content:${justifyValue} !important;align-self:${justifyValue} !important}`
        : "";

      return (
        <>
          <BlockEdit {...props} />
          <CoverVerticalAlignToolbar
            attributes={props.attributes}
            setAttributes={props.setAttributes}
          />
          {alignCSS && <style>{alignCSS}</style>}
        </>
      );
    };
  },
  "withCoverVerticalAlignControls",
);

addFilter(
  "editor.BlockEdit",
  "ml-gutenberg-customizations/cover-vertical-align-controls",
  withCoverVerticalAlignControls,
);

/**
 * Register the 3D transform attribute on every block that has a wrapper.
 * PHP registers it (without a default) on every block so ServerSideRender
 * previews accept it; that server definition also reaches wrapper-less
 * blocks such as core/html, which is harmless since they get no panel.
 */
addFilter(
  "blocks.registerBlockType",
  "ml-gutenberg-customizations/transform-3d-attribute",
  (settings) => {
    if (!supportsTransform3d(settings)) {
      return settings;
    }

    return {
      ...settings,
      attributes: {
        ...settings.attributes,
        mlTransform3d: {
          type: "object",
          default: {},
        },
      },
    };
  },
);

/**
 * Inject the 3D transform panel for the selected block.
 * The fragment is kept while unselected so BlockEdit is never remounted.
 */
const withTransform3dControls = createHigherOrderComponent((BlockEdit) => {
  return (props) => {
    if (!supportsTransform3d(getBlockType(props.name))) {
      return <BlockEdit {...props} />;
    }

    return (
      <>
        <BlockEdit {...props} />
        {props.isSelected && (
          <Transform3dPanel
            attributes={props.attributes}
            setAttributes={props.setAttributes}
          />
        )}
      </>
    );
  };
}, "withTransform3dControls");

addFilter(
  "editor.BlockEdit",
  "ml-gutenberg-customizations/transform-3d-controls",
  withTransform3dControls,
);

/**
 * Live editor preview: put the frontend class and CSS variables on the
 * block wrapper. Unlike a <style> next to the block, this adds no sibling
 * element that would shift :nth-child layouts (e.g. gallery columns).
 * wrapperProps (not className) keeps it composable with the
 * mobile-spacing editor classes.
 */
const withTransform3dEditorWrapper = createHigherOrderComponent(
  (BlockListBlock) => {
    return (props) => {
      const transform = getTransform3dWrapperProps(
        props.attributes?.mlTransform3d,
      );

      if (!transform) {
        return <BlockListBlock {...props} />;
      }

      const wrapperProps = props.wrapperProps || {};

      return (
        <BlockListBlock
          {...props}
          wrapperProps={{
            ...wrapperProps,
            className: [wrapperProps.className, transform.className]
              .filter(Boolean)
              .join(" "),
            style: { ...wrapperProps.style, ...transform.style },
          }}
        />
      );
    };
  },
  "withTransform3dEditorWrapper",
);

addFilter(
  "editor.BlockListBlock",
  "ml-gutenberg-customizations/transform-3d-editor-wrapper",
  withTransform3dEditorWrapper,
);

/**
 * Register the scroll animation attributes on every block that has a
 * wrapper — the same blocks that can take a 3D transform.
 */
registerBlockType("ml/term-image", {
  title: __("Term Image", "ml-gutenberg-customizations"),
  description: __(
    "Displays an image for the current loop term, or the first matching term of the current post.",
    "ml-gutenberg-customizations",
  ),
  icon: "format-image",
  category: "theme",
  usesContext: ["postId", "postType", "termId", "termTaxonomy"],
  attributes: {
    taxonomy: {
      type: "string",
      default: "category",
    },
    imageSize: {
      type: "string",
      default: "medium",
    },
    linkToTerm: {
      type: "boolean",
      default: false,
    },
    aspectRatio: {
      type: "string",
      default: "auto",
    },
    scale: {
      type: "string",
      default: "cover",
    },
    fallbackImageId: {
      type: "number",
      default: 0,
    },
    fallbackImageUrl: {
      type: "string",
      default: "",
    },
  },
  supports: {
    html: false,
    align: ["left", "center", "right", "wide", "full"],
  },
  edit: ({ attributes, setAttributes, context }) => {
    const blockProps = useBlockProps();
    const {
      taxonomy,
      imageSize,
      linkToTerm,
      aspectRatio,
      scale,
      fallbackImageUrl,
    } = attributes;

    const taxonomies = useSelect(
      (select) =>
        select(coreDataStore)
          .getTaxonomies({ per_page: -1 })
          ?.filter((item) => item.visibility?.public) || [],
      [],
    );

    const imageSizes = useSelect(
      (select) => select(blockEditorStore).getSettings()?.imageSizes || [],
      [],
    );

    const taxonomyOptions = taxonomies.map((item) => ({
      label: item.name,
      value: item.slug,
    }));

    const imageSizeOptions = imageSizes.map((item) => ({
      label: item.name,
      value: item.slug,
    }));

    return (
      <>
        <InspectorControls>
          <PanelBody
            title={__("Term Image Settings", "ml-gutenberg-customizations")}
            initialOpen={true}
          >
            <SelectControl
              label={__("Taxonomy", "ml-gutenberg-customizations")}
              value={taxonomy}
              options={
                taxonomyOptions.length
                  ? taxonomyOptions
                  : [
                      {
                        label: __("Loading…", "ml-gutenberg-customizations"),
                        value: "category",
                      },
                    ]
              }
              onChange={(value) => setAttributes({ taxonomy: value })}
            />
            <SelectControl
              label={__("Image Size", "ml-gutenberg-customizations")}
              value={imageSize}
              options={
                imageSizeOptions.length
                  ? imageSizeOptions
                  : [
                      {
                        label: __("Medium", "ml-gutenberg-customizations"),
                        value: "medium",
                      },
                    ]
              }
              onChange={(value) => setAttributes({ imageSize: value })}
            />
            <SelectControl
              label={__("Link", "ml-gutenberg-customizations")}
              value={linkToTerm ? "term" : "none"}
              options={[
                {
                  label: __("No link", "ml-gutenberg-customizations"),
                  value: "none",
                },
                {
                  label: __(
                    "Link to term archive",
                    "ml-gutenberg-customizations",
                  ),
                  value: "term",
                },
              ]}
              onChange={(value) =>
                setAttributes({ linkToTerm: value === "term" })
              }
            />
            <SelectControl
              label={__("Aspect ratio", "ml-gutenberg-customizations")}
              value={aspectRatio || "auto"}
              options={[
                {
                  label: __("Original", "ml-gutenberg-customizations"),
                  value: "auto",
                },
                {
                  label: "1:1",
                  value: "1/1",
                },
                {
                  label: "16:9",
                  value: "16/9",
                },
                {
                  label: "9:16",
                  value: "9/16",
                },
                {
                  label: "4:3",
                  value: "4/3",
                },
                {
                  label: "3:4",
                  value: "3/4",
                },
                {
                  label: "3:2",
                  value: "3/2",
                },
                {
                  label: "2:3",
                  value: "2/3",
                },
              ]}
              onChange={(value) => setAttributes({ aspectRatio: value })}
            />
            <SelectControl
              label={__("Scale", "ml-gutenberg-customizations")}
              value={scale || "cover"}
              options={[
                {
                  label: __("Cover", "ml-gutenberg-customizations"),
                  value: "cover",
                },
                {
                  label: __("Contain", "ml-gutenberg-customizations"),
                  value: "contain",
                },
                {
                  label: __("Fill", "ml-gutenberg-customizations"),
                  value: "fill",
                },
                {
                  label: __("None", "ml-gutenberg-customizations"),
                  value: "none",
                },
                {
                  label: __("Scale down", "ml-gutenberg-customizations"),
                  value: "scale-down",
                },
              ]}
              onChange={(value) => setAttributes({ scale: value })}
            />

            <MediaUploadCheck>
              <MediaUpload
                onSelect={(media) =>
                  setAttributes({
                    fallbackImageId: media?.id || 0,
                    fallbackImageUrl: media?.url || "",
                  })
                }
                allowedTypes={["image"]}
                value={attributes.fallbackImageId}
                render={({ open }) => (
                  <Button variant="secondary" onClick={open}>
                    {fallbackImageUrl
                      ? __(
                          "Replace fallback image",
                          "ml-gutenberg-customizations",
                        )
                      : __(
                          "Choose fallback image",
                          "ml-gutenberg-customizations",
                        )}
                  </Button>
                )}
              />
            </MediaUploadCheck>

            {fallbackImageUrl && (
              <>
                <img
                  src={fallbackImageUrl}
                  alt={__("Fallback preview", "ml-gutenberg-customizations")}
                  style={{
                    display: "block",
                    marginTop: "12px",
                    maxWidth: "100%",
                    height: "auto",
                  }}
                />
                <Button
                  variant="link"
                  isDestructive
                  onClick={() =>
                    setAttributes({
                      fallbackImageId: 0,
                      fallbackImageUrl: "",
                    })
                  }
                >
                  {__("Remove fallback image", "ml-gutenberg-customizations")}
                </Button>
              </>
            )}
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          {!taxonomies.length && <Spinner />}
          {context.postId || context.termId ? (
            <ServerSideRender
              block="ml/term-image"
              attributes={attributes}
              skipBlockSupportAttributes
              urlQueryArgs={{
                ml_term_id: context.termId || 0,
                ml_term_taxonomy: context.termTaxonomy || "",
                post_id: context.postId || 0,
              }}
            />
          ) : (
            <Placeholder
              icon="format-image"
              label={__("Term Image", "ml-gutenberg-customizations")}
              instructions={__(
                "Outputs a term image from the current loop context.",
                "ml-gutenberg-customizations",
              )}
            >
              {__(
                "Place this block inside a loop template.",
                "ml-gutenberg-customizations",
              )}
            </Placeholder>
          )}
        </div>
      </>
    );
  },
  save: () => null,
});
