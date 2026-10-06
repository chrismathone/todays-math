"use client";

import { useEffect, useState, type RefObject } from "react";
import s from "./FadingScrollFade.module.css";

/** A visual hint for continuous scrolling; it never handles input or announces updates. */
export function FadingScrollFade({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [moreBelow, setMoreBelow] = useState(false);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      // scrollTop can be fractional (or negative during overscroll).
      setMoreBelow(
        scroller.clientHeight > 0 &&
          scroller.scrollHeight -
            scroller.clientHeight -
            Math.max(0, scroller.scrollTop) >
            1,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    const resize =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(schedule);
    const observeContent = () => {
      resize?.disconnect();
      resize?.observe(scroller);
      // Observing the content, too, catches fonts, math and images changing height
      // while the bounded scrolling viewport itself keeps the same size.
      for (const child of scroller.children) resize?.observe(child);
    };
    observeContent();
    const mutation = new MutationObserver((records) => {
      if (records.some((record) => record.target === scroller))
        observeContent();
      schedule();
    });
    mutation.observe(scroller, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      mutation.disconnect();
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [scrollRef]);

  return (
    <div
      className={s.fade}
      data-fading-scroll-fade="true"
      data-more-below={moreBelow}
      aria-hidden="true"
    />
  );
}
