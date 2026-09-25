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

describe("ToggleGroupControl compatibility", () => {
  it("imports ToggleGroupControl with experimental fallback to support WP < 6.6", () => {
    const panelPath = path.resolve(
      process.cwd(),
      "src/components/MobileSpacingPanel.js",
    );
    const panelCode = fs.readFileSync(panelPath, "utf8");

    // Must import the experimental variant as a fallback.
    expect(panelCode).toContain("__experimentalToggleGroupControl");
    expect(panelCode).toContain("__experimentalToggleGroupControlOption");

    // Must not use the stable names directly as the sole import (they are undefined on WP < 6.6).
    // The runtime variable should be defined via a nullish-coalescing fallback.
    expect(panelCode).toMatch(
      /ToggleGroupControl\s*=\s*\S+\s*\?\?\s*Experimental/,
    );
    expect(panelCode).toMatch(
      /ToggleGroupControlOption\s*=\s*\S+\s*\?\?\s*Experimental/,
    );
  });
});
