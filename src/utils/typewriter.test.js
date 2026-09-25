import { normalizeTypewriter, getCycleTexts } from "./typewriter";

describe("normalizeTypewriter", () => {
  it("fills in defaults", () => {
    expect(normalizeTypewriter({})).toEqual({
      enabled: false,
      texts: [],
      interval: 2500,
      typeSpeed: 60,
      backSpeed: 30,
      cursor: true,
    });
  });

  it("keeps the texts in order", () => {
    expect(normalizeTypewriter({ texts: ["one", "two"] }).texts).toEqual([
      "one",
      "two",
    ]);
  });

  it("drops blank entries and trims the rest", () => {
    expect(
      normalizeTypewriter({ texts: ["  spaced  ", "", "   ", "kept"] }).texts,
    ).toEqual(["spaced", "kept"]);
  });

  it("ignores entries that are not text", () => {
    expect(normalizeTypewriter({ texts: ["kept", 42, null, {}] }).texts).toEqual(
      ["kept"],
    );
  });

  it("ignores a texts value that is not a list", () => {
    expect(normalizeTypewriter({ texts: "one, two" }).texts).toEqual([]);
  });

  it("caps how many texts and how long each one is", () => {
    const many = normalizeTypewriter({
      texts: Array.from({ length: 30 }, (_, i) => `text ${i}`),
    });

    expect(many.texts).toHaveLength(20);
    expect(normalizeTypewriter({ texts: ["x".repeat(500)] }).texts[0]).toHaveLength(200);
  });

  it("clamps the timings", () => {
    const t = normalizeTypewriter({
      interval: 999999,
      typeSpeed: 0,
      backSpeed: 9999,
    });

    expect(t.interval).toBe(20000);
    expect(t.typeSpeed).toBe(5);
    expect(t.backSpeed).toBe(500);
  });

  it("falls back to the defaults for junk timings", () => {
    expect(normalizeTypewriter({ interval: "soon" }).interval).toBe(2500);
  });
});

describe("getCycleTexts", () => {
  it("puts the block's own text first", () => {
    expect(getCycleTexts("Designers", ["Developers", "Makers"])).toEqual([
      "Designers",
      "Developers",
      "Makers",
    ]);
  });

  it("trims the block text and skips it when empty", () => {
    expect(getCycleTexts("  ", ["Developers"])).toEqual(["Developers"]);
    expect(getCycleTexts("  Designers ", [])).toEqual(["Designers"]);
  });

  it("collapses whitespace inside the block text", () => {
    expect(getCycleTexts("We\n  build", [])).toEqual(["We build"]);
  });

  it("returns nothing to cycle when there is no text at all", () => {
    expect(getCycleTexts("", [])).toEqual([]);
  });
});
