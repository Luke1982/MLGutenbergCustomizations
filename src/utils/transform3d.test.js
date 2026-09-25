import {
  getTransform3dValue,
  getTransform3dWrapperProps,
  normalizeTransform3d,
  supportsTransform3d,
} from "./transform3d";

describe("getTransform3dValue", () => {
  it("returns an empty string when nothing is set", () => {
    expect(getTransform3dValue(undefined)).toBe("");
    expect(getTransform3dValue({})).toBe("");
  });

  it("returns an empty string when only non-transforming values are set", () => {
    expect(
      getTransform3dValue({
        perspective: 500,
        origin: "top left",
        disableOnMobile: true,
        rotateX: 0,
        scale: 1,
      }),
    ).toBe("");
  });

  it("prefixes a single rotation with the default perspective", () => {
    expect(getTransform3dValue({ rotateX: 45 })).toBe(
      "perspective(1000px) rotateX(45deg)",
    );
  });

  it("combines all functions in a fixed order", () => {
    expect(
      getTransform3dValue({
        scale: 1.5,
        rotateZ: 30,
        rotateY: 20,
        rotateX: 10,
        translateZ: 30,
        translateY: -20,
        translateX: 10,
        perspective: 800,
      }),
    ).toBe(
      "perspective(800px) translate3d(10px, -20px, 30px) rotateX(10deg) rotateY(20deg) rotateZ(30deg) scale(1.5)",
    );
  });

  it("fills in zero for untouched translate axes", () => {
    expect(getTransform3dValue({ translateY: 25 })).toBe(
      "perspective(1000px) translate3d(0px, 25px, 0px)",
    );
  });

  it("omits perspective when it is set to 0", () => {
    expect(getTransform3dValue({ perspective: 0, rotateY: 30 })).toBe(
      "rotateY(30deg)",
    );
  });

  it("clamps values to the slider ranges", () => {
    expect(
      getTransform3dValue({
        perspective: 99999,
        rotateX: 999,
        translateX: -9999,
        scale: 10,
      }),
    ).toBe(
      "perspective(3000px) translate3d(-2000px, 0px, 0px) rotateX(180deg) scale(3)",
    );
  });

  it("accepts units other than px for translate", () => {
    expect(
      getTransform3dValue({
        translateX: "50%",
        translateY: "-2.5em",
        translateZ: "10VW",
      }),
    ).toBe("perspective(1000px) translate3d(50%, -2.5em, 10vw)");
  });

  it("reads unitless translate values as px", () => {
    expect(getTransform3dValue({ translateX: "15", translateY: 20 })).toBe(
      "perspective(1000px) translate3d(15px, 20px, 0px)",
    );
  });

  it("rejects % on translate Z, which CSS does not allow", () => {
    expect(getTransform3dValue({ translateZ: "10%", rotateZ: 5 })).toBe(
      "perspective(1000px) rotateZ(5deg)",
    );
  });

  it("rejects unknown units and junk in translate values", () => {
    expect(
      getTransform3dValue({
        translateX: "10pt",
        translateY: "5px);color:red",
        rotateZ: 5,
      }),
    ).toBe("perspective(1000px) rotateZ(5deg)");
  });

  it("clamps translate values to the range of their unit", () => {
    expect(
      getTransform3dValue({
        translateX: "9999px",
        translateY: "-9999%",
        translateZ: "999rem",
      }),
    ).toBe("perspective(1000px) translate3d(2000px, -500%, 100rem)");
  });

  it("ignores non-numeric values", () => {
    expect(
      getTransform3dValue({ rotateX: "abc", rotateY: null, rotateZ: "15" }),
    ).toBe("perspective(1000px) rotateZ(15deg)");
  });

  it("rounds floating point noise to two decimals", () => {
    expect(getTransform3dValue({ scale: 1.1500000000000001 })).toBe(
      "perspective(1000px) scale(1.15)",
    );
  });

  it("keeps negative values and scales below 1", () => {
    expect(
      getTransform3dValue({
        rotateX: -30,
        rotateY: -999,
        translateZ: 20,
        scale: 0.5,
      }),
    ).toBe(
      "perspective(1000px) translate3d(0px, 0px, 20px) rotateX(-30deg) rotateY(-180deg) scale(0.5)",
    );
  });

  it("treats a scale of 0 as a transform", () => {
    expect(getTransform3dValue({ scale: 0 })).toBe(
      "perspective(1000px) scale(0)",
    );
  });

  it("never prints negative zero", () => {
    expect(getTransform3dValue({ translateX: 5, translateY: -0.001 })).toBe(
      "perspective(1000px) translate3d(5px, 0px, 0px)",
    );
  });

  it("ignores non-finite values", () => {
    expect(getTransform3dValue({ rotateX: "1e400", rotateZ: 15 })).toBe(
      "perspective(1000px) rotateZ(15deg)",
    );
  });
});

describe("normalizeTransform3d", () => {
  it("splits translate values into quantity and unit, keeping the unit at 0", () => {
    const t = normalizeTransform3d({ translateX: "0%", translateY: "-1.25em" });

    expect(t.translateX).toEqual({ quantity: 0, unit: "%" });
    expect(t.translateY).toEqual({ quantity: -1.25, unit: "em" });
    expect(t.translateZ).toEqual({ quantity: 0, unit: "px" });
  });
});

describe("getTransform3dWrapperProps", () => {
  it("returns null when the block has no transform", () => {
    expect(getTransform3dWrapperProps(undefined)).toBeNull();
    expect(getTransform3dWrapperProps({ scale: 1 })).toBeNull();
  });

  it("returns the frontend class and CSS variables", () => {
    expect(
      getTransform3dWrapperProps({ rotateZ: 15, origin: "top left" }),
    ).toEqual({
      className: "ml-has-3d-transform",
      style: {
        "--ml-3d-transform": "perspective(1000px) rotateZ(15deg)",
        "--ml-3d-origin": "top left",
      },
    });
  });

  it("falls back to a centered origin for unknown origin values", () => {
    expect(
      getTransform3dWrapperProps({ rotateZ: 15, origin: "center;color:red" })
        .style["--ml-3d-origin"],
    ).toBe("center center");
  });

  it("adds the desktop-only class when disabled on mobile", () => {
    expect(
      getTransform3dWrapperProps({ rotateZ: 15, disableOnMobile: true })
        .className,
    ).toBe("ml-has-3d-transform ml-3d-desktop-only");
  });
});

describe("supportsTransform3d", () => {
  it("supports blocks that do not opt out of custom class names", () => {
    expect(supportsTransform3d({ supports: {} })).toBe(true);
    expect(supportsTransform3d({})).toBe(true);
  });

  it("skips wrapper-less blocks that disable custom class names", () => {
    expect(supportsTransform3d({ supports: { customClassName: false } })).toBe(
      false,
    );
  });
});
