import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  Button,
  RangeControl,
  SelectControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import {
  REVEAL_AMOUNTS,
  SCROLL_FX_RANGES,
  getRevealState,
  normalizeReveal,
  normalizeScrollFx,
} from "../utils/scroll-effects";

// The engine eases in JS; the editor preview hands the matching curve to the
// browser instead.
const CSS_EASINGS = {
  linear: "linear",
  "ease-out": "cubic-bezier(0.33, 1, 0.68, 1)",
  "ease-in-out": "cubic-bezier(0.65, 0, 0.35, 1)",
  "back-out": "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

/**
 * Play the reveal once on the block in the editor canvas, which lives in its
 * own iframe in recent WordPress versions.
 */
function previewReveal(clientId, reveal) {
  const canvas = document.querySelector('iframe[name="editor-canvas"]');
  const doc = canvas?.contentDocument || document;
  const block = doc.querySelector(`[data-block="${clientId}"]`);

  if (!block) {
    return;
  }

  const settings = normalizeReveal(reveal);
  const targets =
    settings.stagger > 0 ? Array.from(block.children) : [block];

  targets.forEach((el, index) => {
    const base = window.getComputedStyle(el).transform;
    const rest = base && base !== "none" ? base : "";
    const compose = (transform) =>
      [rest, transform].filter(Boolean).join(" ") || "none";
    const from = getRevealState(settings, 0);
    const to = getRevealState(settings, 1);

    el.animate(
      [
        {
          transform: compose(from.transform),
          opacity: from.opacity,
          filter: from.filter || "none",
          clipPath: from.clipPath || "none",
        },
        {
          transform: compose(to.transform),
          opacity: to.opacity,
          filter: "none",
          clipPath: to.clipPath || "none",
        },
      ],
      {
        duration: settings.duration,
        delay: settings.delay + index * settings.stagger,
        easing: CSS_EASINGS[settings.easing] || "linear",
      },
    );
  });
}

const EFFECT_OPTIONS = [
  { value: "fade", label: __("Fade", "ml-gutenberg-customizations") },
  {
    value: "slide-bottom",
    label: __("Slide in from below", "ml-gutenberg-customizations"),
  },
  {
    value: "slide-top",
    label: __("Slide in from above", "ml-gutenberg-customizations"),
  },
  {
    value: "slide-left",
    label: __("Slide in from the left", "ml-gutenberg-customizations"),
  },
  {
    value: "slide-right",
    label: __("Slide in from the right", "ml-gutenberg-customizations"),
  },
  { value: "zoom-in", label: __("Zoom in", "ml-gutenberg-customizations") },
  { value: "zoom-out", label: __("Zoom out", "ml-gutenberg-customizations") },
  {
    value: "flip-x",
    label: __("Flip over the X axis", "ml-gutenberg-customizations"),
  },
  {
    value: "flip-y",
    label: __("Flip over the Y axis", "ml-gutenberg-customizations"),
  },
  { value: "rotate", label: __("Rotate", "ml-gutenberg-customizations") },
  { value: "blur", label: __("Blur", "ml-gutenberg-customizations") },
  { value: "wipe", label: __("Wipe open", "ml-gutenberg-customizations") },
];

const AMOUNT_LABELS = {
  "zoom-in": __("Zoom amount", "ml-gutenberg-customizations"),
  "zoom-out": __("Zoom amount", "ml-gutenberg-customizations"),
  "flip-x": __("Flip angle (°)", "ml-gutenberg-customizations"),
  "flip-y": __("Flip angle (°)", "ml-gutenberg-customizations"),
  rotate: __("Angle (°)", "ml-gutenberg-customizations"),
  blur: __("Blur (px)", "ml-gutenberg-customizations"),
};

export default function ScrollAnimationPanel({
  attributes,
  setAttributes,
  clientId,
}) {
  const storedReveal = attributes.mlScrollReveal || {};
  const storedFx = attributes.mlScrollFx || {};
  const reveal = normalizeReveal(storedReveal);
  const fx = normalizeScrollFx(storedFx);

  const updateReveal = (changes) =>
    setAttributes({ mlScrollReveal: { ...storedReveal, ...changes } });
  const updateFx = (changes) =>
    setAttributes({ mlScrollFx: { ...storedFx, ...changes } });

  const amountRange = REVEAL_AMOUNTS[reveal.effect];
  const hasAmount = !["fade", "wipe"].includes(reveal.effect);

  const fxSliders = [
    { key: "rotateX", label: __("Rotate X (°)", "ml-gutenberg-customizations") },
    { key: "rotateY", label: __("Rotate Y (°)", "ml-gutenberg-customizations") },
    { key: "rotateZ", label: __("Rotate Z (°)", "ml-gutenberg-customizations") },
    {
      key: "translateY",
      label: __("Move Y — parallax (px)", "ml-gutenberg-customizations"),
    },
    {
      key: "translateX",
      label: __("Move X (px)", "ml-gutenberg-customizations"),
    },
    { key: "scale", label: __("Scale", "ml-gutenberg-customizations") },
    { key: "opacity", label: __("Fade", "ml-gutenberg-customizations") },
    { key: "blur", label: __("Blur (px)", "ml-gutenberg-customizations") },
  ];

  const fxSlider = ({ key, label, help }) => (
    <RangeControl
      key={key}
      label={label}
      help={help}
      value={fx[key]}
      onChange={(value) => updateFx({ [key]: value })}
      min={SCROLL_FX_RANGES[key].min}
      max={SCROLL_FX_RANGES[key].max}
      step={SCROLL_FX_RANGES[key].step}
      allowReset
      resetFallbackValue={SCROLL_FX_RANGES[key].default}
      __nextHasNoMarginBottom
    />
  );

  return (
    <InspectorControls>
      <PanelBody
        title={__("Scroll Reveal", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <ToggleControl
            label={__("Animate into view", "ml-gutenberg-customizations")}
            checked={reveal.enabled}
            onChange={(value) => updateReveal({ enabled: value })}
            __nextHasNoMarginBottom
          />

          {reveal.enabled && (
            <>
              <SelectControl
                label={__("Effect", "ml-gutenberg-customizations")}
                value={reveal.effect}
                options={EFFECT_OPTIONS}
                onChange={(value) => updateReveal({ effect: value })}
                __nextHasNoMarginBottom
              />

              {hasAmount && (
                <RangeControl
                  label={
                    AMOUNT_LABELS[reveal.effect] ||
                    __("Distance (px)", "ml-gutenberg-customizations")
                  }
                  value={reveal.amount}
                  onChange={(value) => updateReveal({ amount: value })}
                  min={amountRange.min}
                  max={amountRange.max}
                  step={amountRange.step}
                  allowReset
                  resetFallbackValue={amountRange.default}
                  __nextHasNoMarginBottom
                />
              )}

              <RangeControl
                label={__("Duration (ms)", "ml-gutenberg-customizations")}
                value={reveal.duration}
                onChange={(value) => updateReveal({ duration: value })}
                min={0}
                max={3000}
                step={50}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__("Delay (ms)", "ml-gutenberg-customizations")}
                value={reveal.delay}
                onChange={(value) => updateReveal({ delay: value })}
                min={0}
                max={3000}
                step={50}
                __nextHasNoMarginBottom
              />

              <SelectControl
                label={__("Easing", "ml-gutenberg-customizations")}
                value={reveal.easing}
                options={[
                  {
                    value: "ease-out",
                    label: __("Ease out", "ml-gutenberg-customizations"),
                  },
                  {
                    value: "ease-in-out",
                    label: __("Ease in and out", "ml-gutenberg-customizations"),
                  },
                  {
                    value: "back-out",
                    label: __(
                      "Overshoot at the end",
                      "ml-gutenberg-customizations",
                    ),
                  },
                  {
                    value: "linear",
                    label: __("Linear", "ml-gutenberg-customizations"),
                  },
                ]}
                onChange={(value) => updateReveal({ easing: value })}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__(
                  "Visible before it starts (%)",
                  "ml-gutenberg-customizations",
                )}
                help={__(
                  "How much of the block has to be in view.",
                  "ml-gutenberg-customizations",
                )}
                value={Math.round(reveal.threshold * 100)}
                onChange={(value) =>
                  updateReveal({ threshold: (value ?? 0) / 100 })
                }
                min={0}
                max={100}
                step={5}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__(
                  "Trigger offset (% of viewport)",
                  "ml-gutenberg-customizations",
                )}
                help={__(
                  "Positive values wait until the block is further up the screen.",
                  "ml-gutenberg-customizations",
                )}
                value={reveal.offset}
                onChange={(value) => updateReveal({ offset: value })}
                min={-50}
                max={50}
                step={1}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__("Stagger children (ms)", "ml-gutenberg-customizations")}
                help={__(
                  "Animate the blocks inside this one one after another.",
                  "ml-gutenberg-customizations",
                )}
                value={reveal.stagger}
                onChange={(value) => updateReveal({ stagger: value })}
                min={0}
                max={500}
                step={25}
                __nextHasNoMarginBottom
              />

              <ToggleControl
                label={__("Fade as well", "ml-gutenberg-customizations")}
                checked={reveal.fade}
                onChange={(value) => updateReveal({ fade: value })}
                __nextHasNoMarginBottom
              />

              <ToggleControl
                label={__("Only the first time", "ml-gutenberg-customizations")}
                help={__(
                  "Off replays the animation every time the block comes back into view.",
                  "ml-gutenberg-customizations",
                )}
                checked={reveal.once}
                onChange={(value) => updateReveal({ once: value })}
                __nextHasNoMarginBottom
              />

              <div>
                <Button
                  variant="secondary"
                  onClick={() => previewReveal(clientId, storedReveal)}
                >
                  {__("Preview animation", "ml-gutenberg-customizations")}
                </Button>
              </div>
            </>
          )}
        </div>
      </PanelBody>

      <PanelBody
        title={__("Scroll Effects", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <ToggleControl
            label={__("Follow the scroll", "ml-gutenberg-customizations")}
            help={__(
              "Ties the values below to how far the block has travelled through the viewport.",
              "ml-gutenberg-customizations",
            )}
            checked={fx.enabled}
            onChange={(value) => updateFx({ enabled: value })}
            __nextHasNoMarginBottom
          />

          {fx.enabled && (
            <>
              <SelectControl
                label={__("Mode", "ml-gutenberg-customizations")}
                value={fx.mode}
                options={[
                  {
                    value: "centered",
                    label: __(
                      "Centered: −amount → 0 → +amount",
                      "ml-gutenberg-customizations",
                    ),
                  },
                  {
                    value: "progressive",
                    label: __(
                      "Progressive: 0 → amount",
                      "ml-gutenberg-customizations",
                    ),
                  },
                ]}
                help={
                  fx.mode === "centered"
                    ? __(
                        "At rest in the middle of the screen, strongest at the edges.",
                        "ml-gutenberg-customizations",
                      )
                    : __(
                        "Builds up from the bottom of the screen to the top.",
                        "ml-gutenberg-customizations",
                      )
                }
                onChange={(value) => updateFx({ mode: value })}
                __nextHasNoMarginBottom
              />

              {fxSliders.map(fxSlider)}

              {fxSlider({
                key: "perspective",
                label: __("Perspective (px)", "ml-gutenberg-customizations"),
                help: __(
                  "Depth for the X and Y rotations. 0 keeps them flat.",
                  "ml-gutenberg-customizations",
                ),
              })}

              {fxSlider({
                key: "startOffset",
                label: __("Start offset (%)", "ml-gutenberg-customizations"),
                help: __(
                  "Shifts where the effect starts and ends, in % of the viewport.",
                  "ml-gutenberg-customizations",
                ),
              })}

              {fxSlider({
                key: "endOffset",
                label: __("End offset (%)", "ml-gutenberg-customizations"),
              })}

              {fxSlider({
                key: "smoothing",
                label: __("Smoothing", "ml-gutenberg-customizations"),
                help: __(
                  "Higher values let the block lag behind the scroll.",
                  "ml-gutenberg-customizations",
                ),
              })}

              <div>
                <Button
                  variant="secondary"
                  onClick={() => setAttributes({ mlScrollFx: {} })}
                  disabled={Object.keys(storedFx).length === 0}
                >
                  {__("Reset scroll effects", "ml-gutenberg-customizations")}
                </Button>
              </div>
            </>
          )}
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
