import {
  normalizePosition,
  getPositionStyles,
  parseInset,
} from "./position";

describe("normalizePosition", () => {
  it("fills in the defaults", () => {
    expect(normalizePosition({})).toEqual({
      type: "",
      top: "",
      right: "",
      bottom: "",
      left: "",
      zIndex: "",
      disableOnMobile: false,
    });
  });

  it("keeps the four position types", () => {
    ["relative", "absolute", "fixed", "sticky"].forEach((type) => {
      expect(normalizePosition({ type }).type).toBe(type);
    });
  });

  it("rejects an unknown position type", () => {
    expect(normalizePosition({ type: "sideways" }).type).toBe("");
  });

  it("clamps the z-index and ignores junk", () => {
    expect(normalizePosition({ zIndex: 5 }).zIndex).toBe(5);
    expect(normalizePosition({ zIndex: "5" }).zIndex).toBe(5);
    expect(normalizePosition({ zIndex: 99999 }).zIndex).toBe(999);
    expect(normalizePosition({ zIndex: "top" }).zIndex).toBe("");
  });
});

describe("parseInset", () => {
  it("reads a plain number as pixels", () => {
    expect(parseInset(20)).toBe("20px");
    expect(parseInset("20")).toBe("20px");
  });

  it("keeps the unit it was given", () => {
    expect(parseInset("10%")).toBe("10%");
    expect(parseInset("-3rem")).toBe("-3rem");
    expect(parseInset("5VH")).toBe("5vh");
  });

  it("keeps an explicit auto", () => {
    expect(parseInset("auto")).toBe("auto");
    expect(parseInset("AUTO")).toBe("auto");
    expect(parseInset("  auto ")).toBe("auto");
  });

  it("treats an empty value as auto", () => {
    expect(parseInset("")).toBe("");
    expect(parseInset(undefined)).toBe("");
  });

  it("rejects unknown units and junk", () => {
    expect(parseInset("10pt")).toBe("");
    expect(parseInset("abc")).toBe("");
    expect(parseInset("10px;color:red")).toBe("");
  });

  it("clamps to the range of the unit", () => {
    expect(parseInset("9999px")).toBe("2000px");
    expect(parseInset("-9999%")).toBe("-200%");
    expect(parseInset("500vh")).toBe("100vh");
  });
});

describe("getPositionStyles", () => {
  it("returns nothing while the block sits in the normal flow", () => {
    expect(getPositionStyles({})).toBeNull();
    expect(getPositionStyles({ top: "20px" })).toBeNull();
  });

  it("writes an explicit auto through to CSS", () => {
    expect(
      getPositionStyles({ type: "absolute", top: "auto", left: "10px" }).style,
    ).toEqual({
      "--ml-position": "absolute",
      "--ml-top": "auto",
      "--ml-left": "10px",
    });
  });

  it("carries the position and only the offsets that are set", () => {
    expect(getPositionStyles({ type: "absolute", top: "20px", left: "10%" })).toEqual({
      className: "ml-has-position",
      style: {
        "--ml-position": "absolute",
        "--ml-top": "20px",
        "--ml-left": "10%",
      },
    });
  });

  it("is worth outputting on its own, so a parent can anchor children", () => {
    expect(getPositionStyles({ type: "relative" })).toEqual({
      className: "ml-has-position",
      style: { "--ml-position": "relative" },
    });
  });

  it("carries the z-index", () => {
    expect(getPositionStyles({ type: "absolute", zIndex: 5 }).style["--ml-z"]).toBe(
      "5",
    );
  });

  it("marks a block that should drop out of position on mobile", () => {
    expect(
      getPositionStyles({ type: "absolute", disableOnMobile: true }).className,
    ).toBe("ml-has-position ml-position-desktop-only");
  });
});
