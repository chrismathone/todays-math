"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { MarkdownRendererProps } from "./SourceEditorRenderer";
import "./math-text-editor.css";

function EditorLoading() {
  return (
    <div className="source-math-editor visual-editor-loading" role="status">
      편집기 준비 중
    </div>
  );
}
const Editor = dynamic(
  () =>
    import("./SourceMathTextEditor").then(
      (module) => module.SourceMathTextEditor,
    ),
  {
    ssr: false,
    loading: EditorLoading,
  },
);

export interface MathEditorFigure {
  svg?: string;
  imageData?: string;
  url?: string;
  src?: string;
  label?: string;
  box?: [number, number, number, number];
}

export interface MathTextEditorProps extends Omit<
  MarkdownRendererProps,
  "content" | "figures" | "editorTokens"
> {
  value: string;
  onChange: (value: string) => void;
  figures?: ReadonlyArray<MathEditorFigure>;
  "aria-label"?: string;
}

/** Browser-only source editor: importing this public entry is safe during Next SSR. */
export function MathTextEditor({
  figures,
  diagramSvgs,
  imageCrops,
  ...props
}: MathTextEditorProps) {
  const diagrams = useMemo(
    () =>
      diagramSvgs ??
      figures?.map((figure) => ({
        svg: figure.svg ?? "",
        label: figure.label,
        box: figure.box,
      })),
    [diagramSvgs, figures],
  );
  const crops = useMemo(
    () =>
      imageCrops ??
      figures?.map((figure) => ({
        src: figure.src ?? figure.url ?? figure.imageData ?? "",
        label: figure.label,
        box: figure.box,
      })),
    [imageCrops, figures],
  );
  const positions = useMemo(
    () =>
      figures?.every((figure) => figure.box)
        ? figures.map((figure) => ({ box: figure.box! }))
        : undefined,
    [figures],
  );
  return (
    <Editor
      {...props}
      diagramSvgs={diagrams}
      imageCrops={crops}
      figures={positions}
    />
  );
}
