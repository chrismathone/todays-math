import { useEffect, useRef, useState } from "react";

/** Dedicated sheets keep physical writing heights; overflow blocks export. */
export function useDescriptivePageReadiness(
  key: string,
  enabled: boolean,
  fontsReady: boolean,
) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{
    key: string;
    overflow: boolean;
  } | null>(null);

  useEffect(() => {
    if (!enabled || !fontsReady) return;
    let frame = 0;
    const check = () => {
      const pages = Array.from(
        documentRef.current?.querySelectorAll<HTMLElement>(
          '[data-unified-paper][data-page-kind^="descriptive-"] [data-print-page]',
        ) ?? [],
      );
      // Layout-less clients must not claim that these sheets are printable.
      if (
        !pages.length ||
        pages.some((page) => !page.getBoundingClientRect().height)
      )
        return;
      const overflow = pages.some((page) => {
        const bounds = page.getBoundingClientRect();
        const footer = page.querySelector("footer")?.getBoundingClientRect();
        return Array.from(page.querySelectorAll<HTMLElement>("*")).some(
          (node) => {
            // KaTeX's clipped accessibility text and SVG definitions do not
            // occupy printed space. The visible formula is checked separately.
            if (node.closest(".katex-mathml, defs, symbol, clipPath"))
              return false;
            const rect = node.getBoundingClientRect();
            if (!rect.width && !rect.height) return false;
            const clipsContent = /hidden|clip|auto|scroll/.test(
              getComputedStyle(node).overflowY,
            );
            return (
              rect.bottom > bounds.bottom + 1 ||
              rect.right > bounds.right + 1 ||
              rect.left < bounds.left - 1 ||
              (clipsContent && node.scrollHeight > node.clientHeight + 1) ||
              (!!footer &&
                !node.closest("footer") &&
                rect.bottom > footer.top + 1)
            );
          },
        );
      });
      setMeasured((previous) =>
        previous?.key === key && previous.overflow === overflow
          ? previous
          : { key, overflow },
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(check);
    };
    schedule();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(schedule);
    documentRef.current
      ?.querySelectorAll(
        '[data-unified-paper][data-page-kind^="descriptive-"] [data-print-page], ' +
          '[data-unified-paper][data-page-kind^="descriptive-"] [data-writing-area], ' +
          "[data-descriptive-rubrics]",
      )
      .forEach((node) => observer?.observe(node));
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [key, enabled, fontsReady]);

  return {
    documentRef,
    ready: !enabled || measured?.key === key,
    overflow: enabled && measured?.key === key && measured.overflow,
  };
}
