import {
  normalizeMobileBackground,
  getMobileBackgroundStyles,
  getMobileBackgroundRules,
} from "./mobile-background";

describe("normalizeMobileBackground", () => {
  it("fills in the defaults", () => {
    expect(normalizeMobileBackground({})).toEqual({
      hide: false,
      size: "",
      position: null,
    });
  });

  it("rejects a size CSS does not know", () => {
    expect(normalizeMobileBackground({ size: "squish" }).size).toBe("");
    expect(normalizeMobileBackground({ size: "cover" }).size).toBe("cover");
    expect(normalizeMobileBackground({ size: "contain" }).size).toBe("contain");
    expect(normalizeMobileBackground({ size: "auto" }).size).toBe("auto");
  });

  it("keeps a focal point inside the block", () => {
    expect(normalizeMobileBackground({ position: { x: 0.25, y: 0.8 } }).position).toEqual({
      x: 0.25,
      y: 0.8,
    });
    expect(normalizeMobileBackground({ position: { x: 5, y: -2 } }).position).toEqual({
      x: 1,
      y: 0,
    });
  });

  it("ignores a focal point that is not a pair of numbers", () => {
    expect(normalizeMobileBackground({ position: { x: "left" } }).position).toBeNull();
    expect(normalizeMobileBackground({ position: "center" }).position).toBeNull();
  });
});

describe("getMobileBackgroundStyles", () => {
  it("returns nothing when the background is left alone", () => {
    expect(getMobileBackgroundStyles({})).toBeNull();
  });

  it("hides the background", () => {
    expect(getMobileBackgroundStyles({ hide: true })).toEqual({
      classes: ["has-mobile-bg-hidden"],
      vars: {},
    });
  });

  it("carries the size as a variable", () => {
    expect(getMobileBackgroundStyles({ size: "contain" })).toEqual({
      classes: ["has-mobile-bg-size"],
      vars: { "--ml-mobile-bg-size": "contain" },
    });
  });

  it("writes the focal point as percentages", () => {
    expect(getMobileBackgroundStyles({ position: { x: 0.25, y: 0.8 } })).toEqual({
      classes: ["has-mobile-bg-position"],
      vars: { "--ml-mobile-bg-position": "25% 80%" },
    });
  });

  it("combines everything", () => {
    const styles = getMobileBackgroundStyles({
      hide: true,
      size: "cover",
      position: { x: 0.5, y: 0.5 },
    });

    expect(styles.classes).toEqual([
      "has-mobile-bg-hidden",
      "has-mobile-bg-size",
      "has-mobile-bg-position",
    ]);
    expect(styles.vars["--ml-mobile-bg-position"]).toBe("50% 50%");
  });
});

describe("getMobileBackgroundRules", () => {
  it("returns the same thing as declarations, for a custom breakpoint", () => {
    expect(
      getMobileBackgroundRules({ hide: true, size: "cover", position: { x: 0, y: 1 } }),
    ).toEqual([
      "background-image:none !important",
      "background-size:cover !important",
      "background-position:0% 100% !important",
    ]);
  });

  it("returns nothing when there is nothing to say", () => {
    expect(getMobileBackgroundRules({})).toEqual([]);
  });
});
