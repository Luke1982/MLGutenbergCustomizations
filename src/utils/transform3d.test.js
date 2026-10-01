import {
  PERSPECTIVE_UNITS,
  parsePerspective,
  getTransform3dOrigin,
  parseMatrix3d,
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
      "perspective(10000px) translate3d(-2000px, 0px, 0px) rotateX(180deg) scale(3)",
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

describe("parsePerspective", () => {
  it("reads a plain number as pixels", () => {
    expect(parsePerspective(1000)).toBe("1000px");
    expect(parsePerspective("800")).toBe("800px");
  });

  it("keeps viewport and container units", () => {
    expect(parsePerspective("50vw")).toBe("50vw");
    expect(parsePerspective("30CQW")).toBe("30cqw");
    expect(parsePerspective("10rem")).toBe("10rem");
  });

  it("offers the units CSS allows on a length", () => {
    expect(Object.keys(PERSPECTIVE_UNITS)).toEqual(
      expect.arrayContaining(["px", "em", "rem", "vw", "vh", "cqw", "cqh"]),
    );
    expect(Object.keys(PERSPECTIVE_UNITS)).not.toContain("%");
  });

  it("clamps per unit", () => {
    expect(parsePerspective("99999px")).toBe("10000px");
    expect(parsePerspective("5000cqw")).toBe("500cqw");
  });

  it("treats nothing, junk and zero as no perspective", () => {
    expect(parsePerspective("")).toBe("");
    expect(parsePerspective("abc")).toBe("");
    expect(parsePerspective("10pt")).toBe("");
    expect(parsePerspective(0)).toBe("");
  });
});

describe("getTransform3dValue with perspective units", () => {
  it("writes the unit it was given", () => {
    expect(getTransform3dValue({ rotateY: 30, perspective: "40vw" })).toBe(
      "perspective(40vw) rotateY(30deg)",
    );
    expect(getTransform3dValue({ rotateY: 30, perspective: "25cqw" })).toBe(
      "perspective(25cqw) rotateY(30deg)",
    );
  });

  it("still understands a plain number as pixels", () => {
    expect(getTransform3dValue({ rotateY: 30, perspective: 800 })).toBe(
      "perspective(800px) rotateY(30deg)",
    );
  });
});

describe("parseMatrix3d", () => {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

  it("reads a pasted CSS function", () => {
    expect(
      parseMatrix3d("matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)"),
    ).toEqual(identity);
  });

  it("reads a bare list of numbers, however it is spaced", () => {
    expect(parseMatrix3d("1,0,0,0\n0,1,0,0\n0,0,1,0\n0,0,0,1")).toEqual(identity);
    expect(parseMatrix3d("1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1")).toEqual(identity);
  });

  it("accepts a list that is already numbers", () => {
    expect(parseMatrix3d(identity)).toEqual(identity);
  });

  it("keeps the precision a matrix needs", () => {
    const skewed = parseMatrix3d(
      "0.866025, 0.5, 0, 0, -0.5, 0.866025, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1",
    );

    expect(skewed[0]).toBe(0.866025);
    expect(skewed[4]).toBe(-0.5);
  });

  it("rounds away noise beyond six decimals", () => {
    expect(parseMatrix3d("1.00000049,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1")[0]).toBe(1);
  });

  it("rejects anything that is not sixteen numbers", () => {
    expect(parseMatrix3d("1,0,0,0,0,1,0,0,0,0,1,0,0,0,1")).toBeNull();
    expect(parseMatrix3d("matrix3d(1, 0, 0)")).toBeNull();
    expect(parseMatrix3d("rotate(45deg)")).toBeNull();
    expect(parseMatrix3d("")).toBeNull();
    expect(parseMatrix3d(undefined)).toBeNull();
  });

  it("rejects values that are not finite", () => {
    expect(parseMatrix3d("1e400,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1")).toBeNull();
  });
});

describe("getTransform3dValue with a matrix", () => {
  const identity = "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)";
  const tilt = "matrix3d(0.866025, 0.5, 0, 0, -0.5, 0.866025, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)";

  it("ignores an identity matrix, which changes nothing", () => {
    expect(getTransform3dValue({ matrix: identity })).toBe("");
  });

  it("renders a pasted matrix exactly, without adding perspective", () => {
    expect(getTransform3dValue({ matrix: tilt })).toBe(
      "matrix3d(0.866025, 0.5, 0, 0, -0.5, 0.866025, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)",
    );
  });

  it("puts the matrix in front of the slider values", () => {
    expect(getTransform3dValue({ matrix: tilt, rotateX: 45, translateY: 20 })).toBe(
      "matrix3d(0.866025, 0.5, 0, 0, -0.5, 0.866025, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)" +
        " translate3d(0px, 20px, 0px) rotateX(45deg)",
    );
  });

  it("leaves the sliders alone when the matrix is unusable", () => {
    expect(getTransform3dValue({ matrix: "nonsense", rotateX: 45 })).toBe(
      "perspective(1000px) rotateX(45deg)",
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

describe("getTransform3dOrigin", () => {
  const tilt = "matrix3d(0.866025, 0.5, 0, 0, -0.5, 0.866025, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)";

  it("uses the chosen origin normally", () => {
    expect(getTransform3dOrigin({ rotateZ: 10, origin: "top left" })).toBe("top left");
    expect(getTransform3dOrigin({ rotateZ: 10 })).toBe("center center");
  });

  it("pins a matrix to the top-left corner, which is what it is measured from", () => {
    expect(getTransform3dOrigin({ matrix: tilt, origin: "bottom right" })).toBe("0 0");
  });

  it("leaves the chosen origin alone when the matrix does nothing", () => {
    expect(
      getTransform3dOrigin({
        matrix: "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)",
        origin: "top left",
      }),
    ).toBe("top left");
  });
});

describe("getTransform3dWrapperProps", () => {
  it("returns null when the block has no transform", () => {
    expect(getTransform3dWrapperProps(undefined)).toBeNull();
    expect(getTransform3dWrapperProps({ scale: 1 })).toBeNull();
  });

  it("sends the matrix origin through to the editor preview", () => {
    expect(
      getTransform3dWrapperProps({
        matrix: "matrix3d(0.866025, 0.5, 0, 0, -0.5, 0.866025, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)",
        origin: "bottom right",
      }).style["--ml-3d-origin"],
    ).toBe("0 0");
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
