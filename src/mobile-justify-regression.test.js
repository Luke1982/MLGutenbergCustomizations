import fs from "fs";
import path from "path";

describe("mobile justify regressions", () => {
  it("keeps space-around in the SCSS justify map", () => {
    const scssPath = path.resolve(process.cwd(), "src/style.scss");
    const scss = fs.readFileSync(scssPath, "utf8");

    expect(scss).toContain('"space-around": space-around');
  });

  it("keeps space-around selectable in the mobile controls", () => {
    const panelPath = path.resolve(
      process.cwd(),
      "src/components/MobileSpacingPanel.js",
    );
    const panelCode = fs.readFileSync(panelPath, "utf8");

    expect(panelCode).toMatch(
      /allowedControls\s*=\s*\{\s*\[[\s\S]*?"space-around"/,
    );
  });
});
