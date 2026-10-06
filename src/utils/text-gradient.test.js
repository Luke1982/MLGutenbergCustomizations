import { sanitizeTextGradient, getTextGradientProps } from "./text-gradient";

describe("sanitizeTextGradient", () => {
  const linear = "linear-gradient(135deg, rgb(6,147,227) 0%, rgb(155,81,224) 100%)";

  it("keeps the gradients CSS knows", () => {
    expect(sanitizeTextGradient(linear)).toBe(linear);
    expect(sanitizeTextGradient("radial-gradient(circle, #fff 0%, #000 100%)")).toBe(
      "radial-gradient(circle, #fff 0%, #000 100%)",
    );
    expect(sanitizeTextGradient("conic-gradient(from 90deg, red, blue)")).toBe(
      "conic-gradient(from 90deg, red, blue)",
    );
    expect(sanitizeTextGradient("repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)")).toBe(
      "repeating-linear-gradient(45deg, red 0 10px, blue 10px 20px)",
    );
  });

  it("trims what it is given", () => {
    expect(sanitizeTextGradient(`  ${linear}  `)).toBe(linear);
  });

  it("refuses anything that is not a gradient", () => {
    expect(sanitizeTextGradient("red")).toBe("");
    expect(sanitizeTextGradient("")).toBe("");
    expect(sanitizeTextGradient(undefined)).toBe("");
    expect(sanitizeTextGradient(42)).toBe("");
  });

  it("refuses attempts to break out of the declaration", () => {
    expect(sanitizeTextGradient("linear-gradient(red, blue); color: red")).toBe("");
    expect(sanitizeTextGradient("linear-gradient(red, blue)} body{display:none")).toBe("");
    expect(sanitizeTextGradient("url(evil.png)")).toBe("");
    expect(sanitizeTextGradient("linear-gradient(red, url(evil.png))")).toBe("");
    expect(sanitizeTextGradient("linear-gradient(red, blue)/*x*/")).toBe("");
    expect(sanitizeTextGradient("linear-gradient(expression(alert(1)), blue)")).toBe("");
  });

  it("refuses a gradient longer than anything reasonable", () => {
    expect(sanitizeTextGradient(`linear-gradient(${"red,".repeat(400)}blue)`)).toBe("");
  });
});

describe("getTextGradientProps", () => {
  const linear = "linear-gradient(135deg, rgb(6,147,227) 0%, rgb(155,81,224) 100%)";

  it("returns nothing without a usable gradient", () => {
    expect(getTextGradientProps("")).toBeNull();
    expect(getTextGradientProps("red")).toBeNull();
  });

  it("returns the class and the variable", () => {
    expect(getTextGradientProps(linear)).toEqual({
      className: "ml-has-text-gradient",
      style: { "--ml-text-gradient": linear },
    });
  });
});
