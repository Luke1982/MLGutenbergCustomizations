/**
 * Keeps animations off the CPU while their block is off screen.
 *
 * One IntersectionObserver watches every animated block and pauses it the
 * moment it leaves the viewport, which also means an animation set to loop
 * forever costs nothing until someone can actually see it.
 */

import "./animations.scss";

const PAUSED_CLASS = "is-ml-anim-paused";

function init() {
  const blocks = document.querySelectorAll(".ml-anim");

  if (!blocks.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    return;
  }

  const observer = new window.IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        entry.target.classList.toggle(PAUSED_CLASS, !entry.isIntersecting);
      }),
    { rootMargin: "100px" },
  );

  blocks.forEach((block) => {
    block.classList.add(PAUSED_CLASS);
    observer.observe(block);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
