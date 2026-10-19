"use client";
import { useEffect, useRef, useState } from "react";
import {
  paginateWrongTableRows,
  type WrongTableLayout,
} from "@/lib/examReport/wrongTable";
import { examReportTableDom } from "@/lib/examReport/wrongTableDom";
import {
  styledReportTableDom,
  styledReportOverflow,
} from "@/lib/examReport/styledReportDom";

/** 시안과 같은 H1 원본 DOM 검사. 서버의 PDF 렌더에서도 다시 검사한다. */
export function usePaperOverflow(key: string) {
  const ref = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<{
    key: string;
    overflow: boolean;
    ready: boolean;
    layout?: WrongTableLayout;
    remainingMm: number | null;
  } | null>(null);
  const layout = fit?.key === key ? fit.layout : undefined;
  const layoutKey = JSON.stringify(layout);
  useEffect(() => {
    let active = true;
    const measure = () => {
      if (!active) return;
      const root = ref.current;
      const fontsReady = !document.fonts || document.fonts.status === "loaded";
      const desk = root?.querySelector("[data-paper-desk]") ?? root;
      const styled = Boolean(desk?.querySelector("[data-report-style]"));
      const metrics =
        root && fontsReady
          ? styled
            ? styledReportTableDom(root)
            : examReportTableDom(root)
          : null;
      const nextLayout = metrics
        ? paginateWrongTableRows(
            metrics.heights,
            metrics.first,
            metrics.continuation,
          )
        : undefined;
      const currentLayout = desk
        ? [
            ...desk.querySelectorAll(
              styled ? ".sc-wrongTable tbody" : ".er-wrongArea tbody",
            ),
          ].map((body) => body.children.length)
        : [];
      const pending =
        nextLayout &&
        JSON.stringify(nextLayout) !== JSON.stringify(currentLayout);
      if (pending) {
        setFit({
          key,
          layout: nextLayout,
          overflow: false,
          ready: false,
          remainingMm: null,
        });
        return;
      }
      const sheets = desk?.querySelectorAll<HTMLElement>(".er-sheet") ?? [];
      const overflow =
        (styled && root ? styledReportOverflow(root) : false) ||
        [...sheets].some((sheet) => {
          if (!sheet.clientHeight) return false;
          const rect = sheet.getBoundingClientRect();
          const scale = rect.height / sheet.clientHeight;
          const children = [...sheet.children] as HTMLElement[];
          return (
            sheet.scrollHeight > sheet.clientHeight + 1 ||
            sheet.scrollWidth > sheet.clientWidth + 1 ||
            children.some(
              (node, i) =>
                node.scrollHeight > node.clientHeight + 2 ||
                (children[i + 1] &&
                  node.getBoundingClientRect().bottom >
                    children[i + 1].getBoundingClientRect().top + scale),
            )
          );
        });
      const summary = root?.querySelector<HTMLElement>(
        '[data-er-summary="true"] :is(.er-sheet,.sc-sheet)',
      );
      let remainingMm = metrics
        ? (Math.max(0, metrics.remaining) * 25.4) / 96
        : null;
      if (!metrics && summary?.clientHeight) {
        const style = getComputedStyle(summary);
        const scale =
          summary.getBoundingClientRect().height /
          (parseFloat(style.height) || summary.clientHeight);
        const children = [...summary.children] as HTMLElement[];
        remainingMm =
          (Math.max(
            0,
            (parseFloat(style.height) || summary.clientHeight) -
              parseFloat(style.paddingTop || "0") -
              parseFloat(style.paddingBottom || "0") -
              children.reduce(
                (sum, child) =>
                  sum + child.getBoundingClientRect().height / (scale || 1),
                0,
              ) -
              (parseFloat(style.rowGap) || 0) * (children.length - 1),
          ) *
            25.4) /
          96;
      }
      setFit({
        key,
        overflow,
        ready: fontsReady,
        layout: nextLayout,
        remainingMm,
      });
    };
    const frame = requestAnimationFrame(measure);
    void document.fonts?.ready.then(measure);
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (ref.current) observer?.observe(ref.current);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [key, layoutKey]);
  return {
    ref,
    overflow: fit?.key === key && fit.overflow,
    checking: fit?.key !== key || !fit.ready,
    wrongTableLayout: layout,
    remainingMm: fit?.key === key ? fit.remainingMm : null,
  };
}
