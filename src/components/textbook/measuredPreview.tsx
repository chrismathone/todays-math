"use client";

import { useEffect, useState } from "react";

import { TextbookLayoutError } from "@/lib/textbook/layout/paginate";
import { measureTextbookPreview } from "@/lib/textbook/render/browser";
import type { TextbookRenderModel } from "@/lib/textbook/render/model";
import { TextbookSpread } from "@/components/textbook/paper/TextbookPaper";

import type { PreviewResources } from "./previewModel";

type MeasureState =
  | { status: "pending" }
  | { status: "empty" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      pages: Awaited<ReturnType<typeof measureTextbookPreview>>["pages"];
      issues: Awaited<ReturnType<typeof measureTextbookPreview>>["issues"];
    };

function messageOf(reason: unknown): string {
  if (reason instanceof TextbookLayoutError) {
    const text = reason.issues.map((issue) => issue.message).join(" ");
    return text || reason.message;
  }
  if (reason instanceof Error && reason.message) return reason.message;
  return "지면을 측정하지 못했습니다.";
}

export function SectionMeasure({
  model,
  resources,
}: {
  model: TextbookRenderModel;
  resources: PreviewResources;
}) {
  const [state, setState] = useState<MeasureState>({ status: "pending" });

  useEffect(() => {
    const controller = new AbortController();
    let cancel = false;
    measureTextbookPreview(model, resources, { signal: controller.signal })
      .then((layout) => {
        if (cancel) return;
        if (layout.pages.length === 0) {
          setState({ status: "empty" });
          return;
        }
        setState({
          status: "ready",
          pages: layout.pages,
          issues: layout.issues,
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
  }, [model, resources]);

  if (state.status === "pending") return <p>지면을 측정하는 중입니다.</p>;
  if (state.status === "empty") return <p>측정된 쪽이 없습니다.</p>;
  if (state.status === "error") return <p>{state.message}</p>;
  const first = state.pages[0];
  if (!first) return <p>측정된 쪽이 없습니다.</p>;
  const labels = state.pages
    .map((page) => page.printedPageLabel)
    .filter((label) => label.length > 0);
  return (
    <div>
      {labels.length > 0 ? <p>{labels.join(" · ")}</p> : null}
      <TextbookSpread
        pages={state.pages}
        model={model}
        resources={resources}
        currentPhysicalPageIndex={first.physicalPageIndex}
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
