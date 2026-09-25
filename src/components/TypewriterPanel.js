import { InspectorControls } from "@wordpress/block-editor";
import {
  PanelBody,
  Button,
  RangeControl,
  TextareaControl,
  ToggleControl,
} from "@wordpress/components";
import { __, sprintf } from "@wordpress/i18n";

import { normalizeTypewriter } from "../utils/typewriter";

export default function TypewriterPanel({ attributes, setAttributes }) {
  const stored = attributes.mlTypewriter || {};
  const settings = normalizeTypewriter(stored);
  const texts = Array.isArray(stored.texts) ? stored.texts : [];

  const update = (changes) =>
    setAttributes({ mlTypewriter: { ...stored, ...changes } });

  const updateText = (index, value) =>
    update({ texts: texts.map((text, i) => (i === index ? value : text)) });

  const removeText = (index) =>
    update({ texts: texts.filter((text, i) => i !== index) });

  return (
    <InspectorControls>
      <PanelBody
        title={__("Cycling text", "ml-gutenberg-customizations")}
        initialOpen={false}
      >
        <div style={{ display: "grid", gap: "16px" }}>
          <ToggleControl
            label={__("Cycle through texts", "ml-gutenberg-customizations")}
            help={__(
              "Types the texts below one after another, starting from this paragraph's own text.",
              "ml-gutenberg-customizations",
            )}
            checked={settings.enabled}
            onChange={(value) => update({ enabled: value })}
            __nextHasNoMarginBottom
          />

          {settings.enabled && (
            <>
              {texts.map((text, index) => (
                <div
                  key={index}
                  style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
                >
                  <div style={{ flex: "1 1 auto" }}>
                    <TextareaControl
                      label={sprintf(
                        /* translators: %d: position of the text in the cycle. */
                        __("Text %d", "ml-gutenberg-customizations"),
                        index + 2,
                      )}
                      value={text}
                      rows={3}
                      onChange={(value) => updateText(index, value)}
                      __nextHasNoMarginBottom
                    />
                  </div>
                  <Button
                    variant="tertiary"
                    isDestructive
                    onClick={() => removeText(index)}
                    label={__("Remove text", "ml-gutenberg-customizations")}
                  >
                    {__("Remove", "ml-gutenberg-customizations")}
                  </Button>
                </div>
              ))}

              <div>
                <Button
                  variant="secondary"
                  onClick={() => update({ texts: [...texts, ""] })}
                  disabled={texts.length >= 20}
                >
                  {__("Add text", "ml-gutenberg-customizations")}
                </Button>
              </div>

              <RangeControl
                label={__(
                  "Pause between texts (ms)",
                  "ml-gutenberg-customizations",
                )}
                help={__(
                  "How long a finished text stays before it is backspaced away.",
                  "ml-gutenberg-customizations",
                )}
                value={settings.interval}
                onChange={(value) => update({ interval: value })}
                min={200}
                max={10000}
                step={100}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__(
                  "Typing speed (ms per character)",
                  "ml-gutenberg-customizations",
                )}
                value={settings.typeSpeed}
                onChange={(value) => update({ typeSpeed: value })}
                min={5}
                max={300}
                step={5}
                __nextHasNoMarginBottom
              />

              <RangeControl
                label={__(
                  "Backspace speed (ms per character)",
                  "ml-gutenberg-customizations",
                )}
                value={settings.backSpeed}
                onChange={(value) => update({ backSpeed: value })}
                min={5}
                max={300}
                step={5}
                __nextHasNoMarginBottom
              />

              <ToggleControl
                label={__("Blinking cursor", "ml-gutenberg-customizations")}
                checked={settings.cursor}
                onChange={(value) => update({ cursor: value })}
                __nextHasNoMarginBottom
              />
            </>
          )}
        </div>
      </PanelBody>
    </InspectorControls>
  );
}
