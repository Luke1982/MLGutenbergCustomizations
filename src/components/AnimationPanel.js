import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  Button,
  RangeControl,
  SelectControl,
  ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

import { ANIMATIONS, normalizeAnimation } from "../utils/animations";


// Literal labels: translation functions cannot take a variable.
const LABELS = {
  pulse: __("Pulse", "ml-gutenberg-customizations"),
  throb: __("Throb", "ml-gutenberg-customizations"),
  heartbeat: __("Heartbeat", "ml-gutenberg-customizations"),
  wiggle: __("Wiggle", "ml-gutenberg-customizations"),
  "shake-x": __("Shake sideways", "ml-gutenberg-customizations"),
  "shake-y": __("Shake up and down", "ml-gutenberg-customizations"),
  "head-shake": __("Head shake", "ml-gutenberg-customizations"),
  bounce: __("Bounce", "ml-gutenberg-customizations"),
  float: __("Float", "ml-gutenberg-customizations"),
  swing: __("Swing", "ml-gutenberg-customizations"),
  tada: __("Tada", "ml-gutenberg-customizations"),
  wobble: __("Wobble", "ml-gutenberg-customizations"),
  jello: __("Jello", "ml-gutenberg-customizations"),
  "rubber-band": __("Rubber band", "ml-gutenberg-customizations"),
  flash: __("Flash", "ml-gutenberg-customizations"),
  spin: __("Spin", "ml-gutenberg-customizations"),
};

export default function AnimationPanel({ attributes, setAttributes }) {
  const stored = attributes.mlAnimation || {};
  const animation = normalizeAnimation(stored);

  const update = (changes) =>
    setAttributes({ mlAnimation: { ...stored, ...changes } });

  return (
    <InspectorControls>
      <PanelBody
        title={__("Animation", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <SelectControl
            label={__("Animation", "ml-gutenberg-customizations")}
            value={animation.name}
            options={[
              {
                value: "",
                label: __("None", "ml-gutenberg-customizations"),
              },
              ...ANIMATIONS.map(({ name, label }) => ({
                value: name,
                label: LABELS[name] || label,
              })),
            ]}
            onChange={(value) => update({ name: value })}
            __nextHasNoMarginBottom
          />

          {animation.name && (
            <>
              <RangeControl
                label={__("Strength", "ml-gutenberg-customizations")}
                help={__(
                  "Scales how far the block actually moves. 1 is the usual amount.",
                  "ml-gutenberg-customizations",
                )}
                value={animation.strength}
                onChange={(value) => update({ strength: value })}
                min={0.25}
                max={3}
                step={0.05}
                allowReset
                resetFallbackValue={1}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__("Duration (ms)", "ml-gutenberg-customizations")}
                value={animation.duration}
                onChange={(value) => update({ duration: value })}
                min={100}
                max={5000}
                step={50}
                allowReset
                resetFallbackValue={1000}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__("Delay (ms)", "ml-gutenberg-customizations")}
                value={animation.delay}
                onChange={(value) => update({ delay: value })}
                min={0}
                max={3000}
                step={50}
                __nextHasNoMarginBottom
              />

              <SelectControl
                label={__("Repeat", "ml-gutenberg-customizations")}
                value={String(animation.repeat)}
                options={[
                  { value: "1", label: __("Once", "ml-gutenberg-customizations") },
                  { value: "2", label: __("Twice", "ml-gutenberg-customizations") },
                  {
                    value: "3",
                    label: __("Three times", "ml-gutenberg-customizations"),
                  },
                  {
                    value: "5",
                    label: __("Five times", "ml-gutenberg-customizations"),
                  },
                  {
                    value: "infinite",
                    label: __("Forever", "ml-gutenberg-customizations"),
                  },
                ]}
                help={__(
                  "Whatever you pick, the animation pauses while the block is off screen, so a looping one costs nothing until it can be seen.",
                  "ml-gutenberg-customizations",
                )}
                onChange={(value) =>
                  update({
                    repeat: value === "infinite" ? "infinite" : Number(value),
                  })
                }
                __nextHasNoMarginBottom
              />

              <ToggleControl
                label={__("Disable on mobile", "ml-gutenberg-customizations")}
                help={__(
                  "Holds the block still below the mobile breakpoint.",
                  "ml-gutenberg-customizations",
                )}
                checked={animation.disableOnMobile}
                onChange={(value) => update({ disableOnMobile: value })}
                __nextHasNoMarginBottom
              />

              <div>
                <Button
                  variant="secondary"
                  onClick={() => setAttributes({ mlAnimation: {} })}
                >
                  {__("Reset animation", "ml-gutenberg-customizations")}
                </Button>
              </div>
            </>
          )}
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
