import {
  ANIMATIONS,
  normalizeAnimation,
  getAnimationProps,
} from "./animations";

describe("ANIMATIONS", () => {
  it("offers the familiar attention seekers", () => {
    const names = ANIMATIONS.map((a) => a.name);

    ["pulse", "wiggle", "shake-x", "bounce", "tada", "jello", "heartbeat"].forEach(
      (name) => expect(names).toContain(name),
    );
  });

  it("gives every animation a label", () => {
    expect(ANIMATIONS.every((a) => a.label && a.name)).toBe(true);
  });
});

describe("normalizeAnimation", () => {
  it("fills in the defaults", () => {
    expect(normalizeAnimation({})).toEqual({
      name: "",
      strength: 1,
      duration: 1000,
      delay: 0,
      repeat: 1,
    });
  });

  it("rejects an animation it does not have", () => {
    expect(normalizeAnimation({ name: "explode" }).name).toBe("");
    expect(normalizeAnimation({ name: "wiggle" }).name).toBe("wiggle");
  });

  it("clamps the strength and the timings", () => {
    const a = normalizeAnimation({ strength: 99, duration: 99999, delay: -5 });

    expect(a.strength).toBe(3);
    expect(a.duration).toBe(10000);
    expect(a.delay).toBe(0);
  });

  it("keeps a repeat count, or forever", () => {
    expect(normalizeAnimation({ repeat: 3 }).repeat).toBe(3);
    expect(normalizeAnimation({ repeat: "infinite" }).repeat).toBe("infinite");
    expect(normalizeAnimation({ repeat: 0 }).repeat).toBe(1);
    expect(normalizeAnimation({ repeat: "lots" }).repeat).toBe(1);
  });

  it("ignores junk", () => {
    expect(normalizeAnimation({ strength: "hard" }).strength).toBe(1);
  });
});

describe("getAnimationProps", () => {
  it("returns nothing without an animation", () => {
    expect(getAnimationProps({})).toBeNull();
    expect(getAnimationProps({ name: "explode" })).toBeNull();
  });

  it("names the keyframes and carries the settings", () => {
    expect(
      getAnimationProps({ name: "wiggle", strength: 1.5, duration: 600, delay: 200, repeat: 3 }),
    ).toEqual({
      className: "ml-anim ml-anim-wiggle",
      style: {
        "--ml-anim-strength": "1.5",
        "--ml-anim-duration": "600ms",
        "--ml-anim-delay": "200ms",
        "--ml-anim-repeat": "3",
      },
    });
  });

  it("leaves out a delay of zero", () => {
    expect(getAnimationProps({ name: "pulse" }).style["--ml-anim-delay"]).toBeUndefined();
  });

  it("says forever when it should loop", () => {
    expect(getAnimationProps({ name: "pulse", repeat: "infinite" }).style["--ml-anim-repeat"]).toBe(
      "infinite",
    );
  });
});
