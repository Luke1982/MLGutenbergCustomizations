import {
  normalizeFilters,
  getFilterValue,
  isBackdrop,
} from "./filters";

describe("normalizeFilters", () => {
  it("fills in the neutral values", () => {
    expect(normalizeFilters({})).toEqual({
      blur: 0,
      brightness: 100,
      contrast: 100,
      saturate: 100,
      grayscale: 0,
      sepia: 0,
      hueRotate: 0,
      invert: 0,
      opacity: 100,
      target: "element",
      disableOnMobile: false,
    });
  });

  it("clamps out-of-range values", () => {
    const f = normalizeFilters({ blur: 9999, brightness: -50, hueRotate: 400 });

    expect(f.blur).toBe(300);
    expect(f.brightness).toBe(0);
    expect(f.hueRotate).toBe(180);
  });

  it("ignores values that are not numbers", () => {
    expect(normalizeFilters({ blur: "soft" }).blur).toBe(0);
  });

  it("rejects an unknown target", () => {
    expect(normalizeFilters({ target: "sideways" }).target).toBe("element");
    expect(normalizeFilters({ target: "backdrop" }).target).toBe("backdrop");
  });
});

describe("getFilterValue", () => {
  it("returns nothing when every value is neutral", () => {
    expect(getFilterValue({})).toBe("");
    expect(getFilterValue({ brightness: 100, opacity: 100 })).toBe("");
  });

  it("writes a blur in pixels", () => {
    expect(getFilterValue({ blur: 4 })).toBe("blur(4px)");
  });

  it("writes the percentage filters as percentages", () => {
    expect(getFilterValue({ brightness: 120 })).toBe("brightness(120%)");
    expect(getFilterValue({ grayscale: 60 })).toBe("grayscale(60%)");
    expect(getFilterValue({ opacity: 40 })).toBe("opacity(40%)");
  });

  it("uses the CSS name for hue rotation, in degrees", () => {
    expect(getFilterValue({ hueRotate: -45 })).toBe("hue-rotate(-45deg)");
  });

  it("combines the functions in a fixed order", () => {
    expect(
      getFilterValue({
        opacity: 90,
        invert: 10,
        hueRotate: 30,
        sepia: 20,
        grayscale: 30,
        saturate: 140,
        contrast: 110,
        brightness: 120,
        blur: 2,
      }),
    ).toBe(
      "blur(2px) brightness(120%) contrast(110%) saturate(140%) grayscale(30%) sepia(20%) hue-rotate(30deg) invert(10%) opacity(90%)",
    );
  });

  it("rounds to two decimals", () => {
    expect(getFilterValue({ blur: 1.005 })).toBe("blur(1px)");
    expect(getFilterValue({ blur: 2.567 })).toBe("blur(2.57px)");
  });

  it("clamps before writing the value", () => {
    expect(getFilterValue({ blur: 9999 })).toBe("blur(300px)");
  });
});

describe("isBackdrop", () => {
  it("is off by default", () => {
    expect(isBackdrop({ blur: 4 })).toBe(false);
  });

  it("is on when the filter targets the background behind the block", () => {
    expect(isBackdrop({ blur: 4, target: "backdrop" })).toBe(true);
  });
});
