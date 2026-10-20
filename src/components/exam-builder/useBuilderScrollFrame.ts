"use client";

import { useLayoutEffect, useRef } from "react";
import type { ExamBuilderStep } from "./types";

/** Keep the independent columns below the actual, wrapping step band. */
export function useBuilderScrollFrame(step: ExamBuilderStep, enabled = true) {
  const rootRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const band = bandRef.current;
    if (!enabled || !root || !band) return;
    const measure = () => {
      root.style.setProperty(
        "--builder-band-height",
        `${Math.ceil(band.getBoundingClientRect().height)}px`,
      );
      root
        .querySelectorAll<HTMLElement>(
          "[data-scope-layout], [data-review-layout], [data-output-layout]",
        )
        .forEach((frame) => {
          frame.style.setProperty(
            "--builder-viewport-top",
            `${Math.ceil(frame.getBoundingClientRect().top)}px`,
          );
          // The output editor and its shell both own bottom padding. Reserve
          // that space too, so the viewport frame cannot create page scrolling.
          if (frame.hasAttribute("data-output-layout")) {
            let bottom = 0;
            for (
              let parent = frame.parentElement;
              parent;
              parent = parent.parentElement
            ) {
              const style = getComputedStyle(parent);
              bottom += parseFloat(style.paddingBottom) || 0;
              bottom += parseFloat(style.marginBottom) || 0;
            }
            frame.style.setProperty(
              "--builder-viewport-bottom",
              `${Math.ceil(bottom)}px`,
            );
          }
        });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(band);
    observer.observe(root);
    let pending = 0;
    const onScroll = () => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(measure);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [step, enabled]);
  return { rootRef, bandRef };
}
