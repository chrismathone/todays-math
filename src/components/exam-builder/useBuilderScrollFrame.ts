"use client";

import { useLayoutEffect, useRef } from "react";
import type { ExamBuilderStep } from "./types";

/** Keep the independent columns below the actual, wrapping step band. */
export function useBuilderScrollFrame(step: ExamBuilderStep) {
  const rootRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const band = bandRef.current;
    if (!root || !band) return;
    const measure = () => {
      root.style.setProperty(
        "--builder-band-height",
        `${Math.ceil(band.getBoundingClientRect().height)}px`,
      );
      root
        .querySelectorAll<HTMLElement>(
          "[data-scope-layout], [data-review-layout]",
        )
        .forEach((frame) =>
          frame.style.setProperty(
            "--builder-viewport-top",
            `${Math.ceil(frame.getBoundingClientRect().top)}px`,
          ),
        );
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
  }, [step]);
  return { rootRef, bandRef };
}
