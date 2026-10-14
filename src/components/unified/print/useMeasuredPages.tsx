import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { columnContentWidth } from "./geometry";
import { getFontPack } from "./fontPacks";
import { loadPrintFonts } from "./loadFonts";
import { packMeasured } from "./pack";
import type {
  PrintMeta,
  PrintOptions,
  PrintTemplateProps,
  ProblemReview,
} from "./types";
import s from "./WorksheetPrint.module.css";

const frame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** Measure exactly the same template, body renderer, width, metadata and loaded fonts as output. */
export function useMeasuredPages(
  Template: ComponentType<PrintTemplateProps>,
  problems: ProblemReview[],
  options: PrintOptions,
  meta: PrintMeta,
  answer = false,
) {
  const host = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{
    key: string;
    contentKey: string;
    heights: number[];
    avail: { first: number; cont: number };
    fontError: boolean;
  } | null>(null);
  const key = useMemo(
    () => JSON.stringify([problems, options, meta, answer]),
    [problems, options, meta, answer],
  );
  // Metadata changes must update existing headers immediately without unmounting
  // every sheet. Content/format changes still require a fresh set of pages.
  const contentKey = useMemo(
    () => JSON.stringify([problems, options, answer]),
    [problems, options, answer],
  );
  const font = getFontPack(options.fontPack);
  const fontStyle = useMemo(
    () =>
      ({
        "--paper-font-serif": font.serif,
        "--paper-font-sans":
          options.fontPack === "pretendard"
            ? `var(--font-pretendard), ${font.sans}`
            : font.sans,
      }) as CSSProperties,
    [font, options.fontPack],
  );
  const width = columnContentWidth(
    answer ? "jeongtong" : options.template,
    options.columns,
    options.marginPreset,
    answer ? "off" : options.solvingArea,
  );

  useEffect(() => {
    let cancelled = false;
    let scheduled = 0;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const root = host.current;
      // The screen measurement host is display:none in print media. Keep the
      // prepared pagination while printing instead of replacing it with zeros.
      if (cancelled || !root || !root.getClientRects().length) return;
      const heights = Array.from(
        root.querySelectorAll<HTMLElement>(
          "[data-measure-items] [data-measure-idx]",
        ),
        (item) => item.getBoundingClientRect().height,
      );
      const availableHeight = (page: "first" | "cont") => {
        const body = root.querySelector<HTMLElement>(
          `[data-measure-probe="${page}"] .measure-body`,
        );
        if (!body) return 0;
        const style = getComputedStyle(body);
        // Bounding rectangles include template padding (e.g. pyeongga's 16px
        // below the questions), which is not available to question content.
        return (
          body.getBoundingClientRect().height -
          (parseFloat(style.paddingTop) || 0) -
          (parseFloat(style.paddingBottom) || 0)
        );
      };
      const first = availableHeight("first");
      const cont = availableHeight("cont");
      setMeasured((previous) => {
        const next = {
          key,
          contentKey,
          heights,
          avail: { first, cont },
          fontError,
        };
        return previous && JSON.stringify(previous) === JSON.stringify(next)
          ? previous
          : next;
      });
    };
    let fontError = false;
    void (async () => {
      try {
        await loadPrintFonts(options.fontPack);
      } catch {
        fontError = true;
      }
      if (cancelled) return;
      const images = Array.from(host.current?.querySelectorAll("img") ?? []);
      await Promise.all(
        images.map(async (img) => {
          try {
            if (img.decode) await img.decode();
          } catch {
            /* Broken images remain visible as alt text. */
          }
        }),
      );
      await frame();
      await frame();
      if (cancelled) return;
      measure();
      if (typeof ResizeObserver !== "undefined" && host.current) {
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(scheduled);
          scheduled = requestAnimationFrame(measure);
        });
        host.current
          .querySelectorAll<HTMLElement>("[data-measure-idx], .measure-body")
          .forEach((item) => observer!.observe(item));
      }
    })();
    return () => {
      cancelled = true;
      observer?.disconnect();
      cancelAnimationFrame(scheduled);
    };
  }, [key, contentKey, options.fontPack]);

  const ready = measured?.key === key;
  const layoutError =
    ready && (measured.avail.first < 40 || measured.avail.cont < 40);
  const pages = useMemo(
    () =>
      measured?.contentKey === contentKey && !layoutError
        ? packMeasured(
            measured.heights,
            measured.avail,
            answer
              ? { ...options, template: "jeongtong", layoutMode: "spacing" }
              : options,
            problems.flatMap((problem, index) =>
              index > 0 &&
              problem.variant.arithmetic?.round !==
                problems[index - 1].variant.arithmetic?.round
                ? [index]
                : [],
            ),
          )
        : [],
    [contentKey, layoutError, measured, options, answer, problems],
  );
  const base = {
    columns: options.columns,
    meta,
    options: answer ? { ...options, solvingArea: "off" as const } : options,
    startingNumber: 1,
    totalPages: 2,
    totalProblems: problems.length,
    round: problems[0]?.variant.arithmetic?.round,
  };
  const measureNode = (
    <div
      className={`${s.measureHost} ${s.document}`}
      ref={host}
      aria-hidden="true"
      style={fontStyle}
    >
      <div data-measure-items>
        <Template
          {...base}
          page={1}
          problems={problems}
          measure={{ columnWidthPx: width }}
        />
      </div>
      <div data-measure-probe="first">
        <Template {...base} page={1} problems={[]} />
      </div>
      <div data-measure-probe="cont">
        <Template {...base} page={2} problems={[]} />
      </div>
    </div>
  );
  return {
    pages,
    ready,
    layoutError,
    fontError: ready && measured.fontError,
    measureNode,
    fontStyle,
  };
}
