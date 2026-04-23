import { getMobileSpacingClasses } from "./classes";

describe("getMobileSpacingClasses", () => {
  it("adds the space-around justify class", () => {
    const classes = getMobileSpacingClasses({
      mlMobileJustifyContent: "space-around",
    });

    expect(classes).toContain("has-mobile-justify-space-around");
  });
});
