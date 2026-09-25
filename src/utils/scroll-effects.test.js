import {
  getScrollProgress,
  ease,
  getRevealState,
  getScrollFxState,
  normalizeReveal,
  normalizeScrollFx,
} from "./scroll-effects";

const box = (top) => ({ top, height: 200, viewport: 800 });

describe("getScrollProgress", () => {
  it("is 0 while the block's top sits at the bottom edge of the viewport", () => {
    expect(getScrollProgress(box(800))).toBe(0);
  });

  it("is 1 once the block's bottom has passed the top edge", () => {
    expect(getScrollProgress(box(-200))).toBe(1);
  });

  it("is 0.5 halfway through the range", () => {
    expect(getScrollProgress(box(300))).toBe(0.5);
  });

  it("clamps outside the range", () => {
    expect(getScrollProgress(box(1200))).toBe(0);
    expect(getScrollProgress(box(-900))).toBe(1);
  });

  it("delays the start by the start offset, in % of the viewport", () => {
    expect(getScrollProgress({ ...box(400), startOffset: 50 })).toBe(0);
    expect(getScrollProgress({ ...box(-200), startOffset: 50 })).toBe(1);
  });

  it("ends earlier with an end offset", () => {
    // Window shrinks to 800 + 200 - 200 = 800px; p = (800 - top) / 800.
    expect(getScrollProgress({ ...box(0), endOffset: 25 })).toBe(1);
  });

  it("returns 0 rather than NaN for a degenerate window", () => {
    expect(getScrollProgress({ top: 0, height: 0, viewport: 0 })).toBe(0);
  });
});

describe("ease", () => {
  it("is the identity for linear", () => {
    expect(ease("linear", 0.25)).toBe(0.25);
  });

  it("pins both ends for every curve", () => {
    ["linear", "ease-out", "ease-in-out", "back-out"].forEach((name) => {
      expect(ease(name, 0)).toBe(0);
      expect(ease(name, 1)).toBe(1);
    });
  });

  it("decelerates for ease-out", () => {
    expect(ease("ease-out", 0.5)).toBeGreaterThan(0.5);
  });

  it("overshoots past the end for back-out", () => {
    expect(ease("back-out", 0.6)).toBeGreaterThan(1);
  });

  it("falls back to linear for an unknown curve", () => {
    expect(ease("wobble", 0.25)).toBe(0.25);
  });
});

describe("getRevealState", () => {
  it("starts transparent and ends opaque", () => {
    expect(getRevealState({ effect: "fade" }, 0).opacity).toBe(0);
    expect(getRevealState({ effect: "fade" }, 1).opacity).toBe(1);
  });

  it("adds no transform for a plain fade", () => {
    expect(getRevealState({ effect: "fade" }, 0).transform).toBe("");
  });

  it("slides in from below", () => {
    expect(
      getRevealState({ effect: "slide-bottom", amount: 40 }, 0).transform,
    ).toBe("translate3d(0px, 40px, 0px)");
  });

  it("slides in from the left", () => {
    expect(
      getRevealState({ effect: "slide-left", amount: 40 }, 0).transform,
    ).toBe("translate3d(-40px, 0px, 0px)");
  });

  it("zooms in from smaller", () => {
    expect(getRevealState({ effect: "zoom-in", amount: 0.2 }, 0).transform).toBe(
      "scale(0.8)",
    );
  });

  it("zooms out from bigger", () => {
    expect(
      getRevealState({ effect: "zoom-out", amount: 0.2 }, 0).transform,
    ).toBe("scale(1.2)");
  });

  it("gives flips a perspective so they read as 3D", () => {
    expect(getRevealState({ effect: "flip-x", amount: 60 }, 0).transform).toBe(
      "perspective(1000px) rotateX(60deg)",
    );
  });

  it("rotates in the plane for rotate", () => {
    expect(getRevealState({ effect: "rotate", amount: 15 }, 0).transform).toBe(
      "rotate(15deg)",
    );
  });

  it("uses a filter rather than a transform for blur", () => {
    const state = getRevealState({ effect: "blur", amount: 8 }, 0);

    expect(state.transform).toBe("");
    expect(state.filter).toBe("blur(8px)");
  });

  it("wipes open from the bottom edge", () => {
    expect(getRevealState({ effect: "wipe" }, 0).clipPath).toBe(
      "inset(0% 0% 100% 0%)",
    );
    expect(getRevealState({ effect: "wipe" }, 1).clipPath).toBe(
      "inset(0% 0% 0% 0%)",
    );
  });

  it("interpolates halfway", () => {
    const state = getRevealState({ effect: "slide-bottom", amount: 40 }, 0.5);

    expect(state.transform).toBe("translate3d(0px, 20px, 0px)");
    expect(state.opacity).toBe(0.5);
  });

  it("leaves nothing behind at the end", () => {
    const state = getRevealState({ effect: "slide-bottom", amount: 40 }, 1);

    expect(state.transform).toBe("");
    expect(state.filter).toBe("");
    expect(state.opacity).toBe(1);
  });

  it("can move without fading", () => {
    expect(
      getRevealState({ effect: "slide-bottom", amount: 40, fade: false }, 0)
        .opacity,
    ).toBe(1);
  });

  it("falls back to a fade for an unknown effect", () => {
    const state = getRevealState({ effect: "explode", amount: 40 }, 0);

    expect(state.transform).toBe("");
    expect(state.opacity).toBe(0);
  });
});

describe("getScrollFxState", () => {
  it("does nothing without settings", () => {
    const state = getScrollFxState({}, 0.25);

    expect(state.transform).toBe("");
    expect(state.opacity).toBe(1);
    expect(state.filter).toBe("");
  });

  it("swings from -amount to +amount in centered mode", () => {
    const fx = { rotateY: 20, mode: "centered" };

    expect(getScrollFxState(fx, 0).transform).toBe(
      "perspective(1000px) rotateY(-20deg)",
    );
    expect(getScrollFxState(fx, 0.5).transform).toBe("");
    expect(getScrollFxState(fx, 1).transform).toBe(
      "perspective(1000px) rotateY(20deg)",
    );
  });

  it("runs 0 to amount in progressive mode", () => {
    const fx = { rotateY: 20, mode: "progressive" };

    expect(getScrollFxState(fx, 0).transform).toBe("");
    expect(getScrollFxState(fx, 1).transform).toBe(
      "perspective(1000px) rotateY(20deg)",
    );
  });

  it("moves the block for parallax", () => {
    const fx = { translateY: 100, mode: "centered" };

    expect(getScrollFxState(fx, 0).transform).toBe(
      "translate3d(0px, -100px, 0px)",
    );
    expect(getScrollFxState(fx, 1).transform).toBe(
      "translate3d(0px, 100px, 0px)",
    );
  });

  it("scales around 1", () => {
    const fx = { scale: 0.2, mode: "centered" };

    expect(getScrollFxState(fx, 0).transform).toBe("scale(0.8)");
    expect(getScrollFxState(fx, 1).transform).toBe("scale(1.2)");
  });

  it("dims at both edges in centered mode", () => {
    const fx = { opacity: 0.5, mode: "centered" };

    expect(getScrollFxState(fx, 0).opacity).toBe(0.5);
    expect(getScrollFxState(fx, 0.5).opacity).toBe(1);
    expect(getScrollFxState(fx, 1).opacity).toBe(0.5);
  });

  it("blurs most at the edges in centered mode", () => {
    const fx = { blur: 10, mode: "centered" };

    expect(getScrollFxState(fx, 0).filter).toBe("blur(10px)");
    expect(getScrollFxState(fx, 0.5).filter).toBe("");
  });

  it("combines the functions in a fixed order", () => {
    const fx = {
      scale: 0.2,
      rotateZ: 30,
      rotateY: 20,
      rotateX: 10,
      translateY: 50,
      translateX: 25,
      mode: "progressive",
    };

    expect(getScrollFxState(fx, 1).transform).toBe(
      "perspective(1000px) translate3d(25px, 50px, 0px) rotateX(10deg) rotateY(20deg) rotateZ(30deg) scale(1.2)",
    );
  });

  it("can switch perspective off for a flat rotation", () => {
    expect(
      getScrollFxState({ rotateY: 20, perspective: 0, mode: "progressive" }, 1)
        .transform,
    ).toBe("rotateY(20deg)");
  });

  it("rounds to two decimals", () => {
    expect(
      getScrollFxState({ rotateX: 10, mode: "progressive" }, 1 / 3).transform,
    ).toBe("perspective(1000px) rotateX(3.33deg)");
  });
});

describe("normalizeReveal", () => {
  it("fills in defaults", () => {
    expect(normalizeReveal({})).toEqual({
      enabled: false,
      effect: "fade",
      amount: 40,
      duration: 600,
      delay: 0,
      easing: "ease-out",
      threshold: 0.15,
      offset: 0,
      once: true,
      fade: true,
      stagger: 0,
    });
  });

  it("defaults the amount per effect", () => {
    expect(normalizeReveal({ effect: "zoom-in" }).amount).toBe(0.2);
    expect(normalizeReveal({ effect: "flip-x" }).amount).toBe(60);
  });

  it("rejects an unknown effect and easing", () => {
    const r = normalizeReveal({ effect: "explode", easing: "wobble" });

    expect(r.effect).toBe("fade");
    expect(r.easing).toBe("ease-out");
  });

  it("clamps duration, threshold and stagger", () => {
    const r = normalizeReveal({ duration: 99999, threshold: 5, stagger: -10 });

    expect(r.duration).toBe(5000);
    expect(r.threshold).toBe(1);
    expect(r.stagger).toBe(0);
  });
});

describe("normalizeScrollFx", () => {
  it("fills in defaults", () => {
    expect(normalizeScrollFx({})).toEqual({
      enabled: false,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0,
      translateX: 0,
      translateY: 0,
      scale: 0,
      opacity: 0,
      blur: 0,
      perspective: 1000,
      mode: "centered",
      startOffset: 0,
      endOffset: 0,
      smoothing: 0.15,
    });
  });

  it("rejects an unknown mode", () => {
    expect(normalizeScrollFx({ mode: "sideways" }).mode).toBe("centered");
  });

  it("clamps amplitudes and smoothing", () => {
    const fx = normalizeScrollFx({ rotateX: 9999, blur: -5, smoothing: 2 });

    expect(fx.rotateX).toBe(180);
    expect(fx.blur).toBe(0);
    expect(fx.smoothing).toBe(0.95);
  });

  it("ignores junk values", () => {
    expect(normalizeScrollFx({ translateY: "abc" }).translateY).toBe(0);
  });
});
