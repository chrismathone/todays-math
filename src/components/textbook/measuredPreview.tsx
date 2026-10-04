"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { TextbookLayoutError } from "@/lib/textbook/layout/paginate";
import { measureTextbookPreview } from "@/lib/textbook/render/browser";
import type { TextbookRenderModel } from "@/lib/textbook/render/model";
import { TextbookSpread } from "@/components/textbook/paper/TextbookPaper";

import { withBrowserQrImages } from "./browserQr";
import type { ZoomMode } from "./model";
import type { PreviewResources } from "./previewModel";
import { measuredSpreadAnchor } from "./model";
import styles from "./textbook.module.css";

type MeasureState =
  | { status: "pending" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      pages: Awaited<ReturnType<typeof measureTextbookPreview>>["pages"];
      issues: Awaited<ReturnType<typeof measureTextbookPreview>>["issues"];
      resources: PreviewResources;
    };

function messageOf(reason: unknown): string {
  if (reason instanceof TextbookLayoutError) {
    const text = reason.issues.map((issue) => issue.message).join(" ");
    return text || reason.message;
  }
  if (reason instanceof Error && reason.message) return reason.message;
  return "지면을 측정하지 못했습니다.";
}

/** Fit the actual visible pages, including a single cover, to the available width. */
function FittedSpread({
  pages,
  model,
  resources,
  anchor,
  zoom,
}: {
  pages: Awaited<ReturnType<typeof measureTextbookPreview>>["pages"];
  model: TextbookRenderModel;
  resources: PreviewResources;
  anchor: number;
  zoom: ZoomMode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const surface = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0, scale: 1 });

  useLayoutEffect(() => {
    const outer = viewport.current;
    const paper = surface.current;
    if (!outer || !paper) return;
    const update = () => {
      const width = paper.offsetWidth;
      const height = paper.offsetHeight;
      if (!width || !height) return;
      const available = Math.max(1, outer.clientWidth - 12);
      const scale = zoom === "fit" ? Math.min(1, available / width) : 1;
      setSize((current) =>
        current.width === width &&
        current.height === height &&
        current.scale === scale
          ? current
          : { width, height, scale },
      );
    };
    update();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(outer);
    observer?.observe(paper);
    window.addEventListener("resize", update);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [anchor, pages, zoom]);

  return (
    <div
      ref={viewport}
      className={styles.paperViewport}
      data-textbook-preview-viewport
    >
      <div
        className={styles.paperFrame}
        style={{
          width: size.width * size.scale,
          height: size.height * size.scale,
        }}
      >
        <div
          ref={surface}
          className={styles.paperSurface}
          style={{ transform: `scale(${size.scale})` }}
        >
          <TextbookSpread
            pages={pages}
            model={model}
            resources={resources}
            currentPhysicalPageIndex={anchor}
          />
        </div>
      </div>
    </div>
  );
}

export function SectionMeasure({
  model,
  recallMeasurementModel,
  resources,
  zoom,
  physicalPageIndex,
  provisionalNotice,
  onPages,
}: {
  model: TextbookRenderModel;
  recallMeasurementModel?: TextbookRenderModel;
  resources: PreviewResources;
  zoom: ZoomMode;
  physicalPageIndex: number | null;
  provisionalNotice: string | null;
  onPages: (
    pages: { physicalPageIndex: number; printedPageLabel: string }[],
  ) => void;
}) {
  const [state, setState] = useState<MeasureState>({ status: "pending" });

  useEffect(() => {
    const controller = new AbortController();
    let cancel = false;
    withBrowserQrImages(model, resources)
      .then((prepared) => {
        if (cancel) return null;
        return measureTextbookPreview(model, prepared, {
          signal: controller.signal,
          recallMeasurementModel,
        }).then((layout) => ({ layout, prepared }));
      })
      .then((result) => {
        if (cancel || !result) return;
        if (result.layout.pages.length === 0) {
          setState({ status: "empty" });
          return;
        }
        const pages = result.layout.pages.map((page) => ({
          physicalPageIndex: page.physicalPageIndex,
          printedPageLabel: page.printedPageLabel,
        }));
        onPages(pages);
        setState({
          status: "ready",
          pages: result.layout.pages,
          issues: result.layout.issues,
          resources: result.prepared,
        });
      })
      .catch((reason: unknown) => {
        if (cancel) return;
        if (reason instanceof Error && reason.message === "Preview aborted") {
          return;
        }
        setState({ status: "error", message: messageOf(reason) });
      });
    return () => {
      cancel = true;
      controller.abort();
    };
  }, [model, onPages, resources, recallMeasurementModel]);

  if (state.status === "pending") return <p>지면을 측정하는 중입니다.</p>;
  if (state.status === "empty") return <p>측정된 쪽이 없습니다.</p>;
  if (state.status === "error") return <p>{state.message}</p>;
  const first = state.pages[0];
  if (!first) return <p>측정된 쪽이 없습니다.</p>;
  const anchor =
    measuredSpreadAnchor(state.pages, physicalPageIndex) ??
    first.physicalPageIndex;
  return (
    <div className={styles.measureHost} data-zoom={zoom}>
      {provisionalNotice ? (
        <p className={styles.muted}>{provisionalNotice}</p>
      ) : null}
      <FittedSpread
        pages={state.pages}
        model={model}
        resources={state.resources}
        anchor={anchor}
        zoom={zoom}
      />
      {state.issues.length > 0 ? (
        <ul>
          {state.issues.map((issue) => (
            <li key={`${issue.code}:${issue.message}`}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
