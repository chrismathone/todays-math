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
    heights: number[];
    avail: { first: number; cont: number };
    fontError: boolean;
  } | null>(null);
  const key = useMemo(
    () => JSON.stringify([problems, options, meta, answer]),
    [problems, options, meta, answer],
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
  );

  useEffect(() => {
    let cancelled = false;
    let scheduled = 0;
    let observer: ResizeObserver | undefined;
    const measure = () => {
      const root = host.current;
      if (cancelled || !root) return;
      const heights = Array.from(
        root.querySelectorAll<HTMLElement>(
          "[data-measure-items] [data-measure-idx]",
        ),
        (item) => item.getBoundingClientRect().height,
      );
      const first =
        root
          .querySelector<HTMLElement>(
            '[data-measure-probe="first"] .measure-body',
          )
          ?.getBoundingClientRect().height ?? 0;
      const cont =
        root
          .querySelector<HTMLElement>(
            '[data-measure-probe="cont"] .measure-body',
          )
          ?.getBoundingClientRect().height ?? 0;
      setMeasured((previous) => {
        const next = { key, heights, avail: { first, cont }, fontError };
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
  }, [key, options.fontPack]);

  const ready = measured?.key === key;
  const layoutError =
    ready && (measured.avail.first < 40 || measured.avail.cont < 40);
  const pages = useMemo(
    () =>
      ready && !layoutError
        ? packMeasured(
            measured.heights,
            measured.avail,
            answer
              ? { ...options, template: "jeongtong", layoutMode: "spacing" }
              : options,
          )
        : [],
    [ready, layoutError, measured, options, answer],
  );
  const base = {
    columns: options.columns,
    meta,
    options,
    startingNumber: 1,
    totalPages: 2,
    totalProblems: problems.length,
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
