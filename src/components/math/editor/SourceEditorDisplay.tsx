"use client";

import { useMemo } from "react";
import SourceEditorRenderer from "./SourceEditorRenderer";
import type { MathTextEditorProps } from "./MathTextEditor";
import "./math-text-editor.css";

export type SourceEditorDisplayProps = Omit<MathTextEditorProps, "onChange">;

/** Source reader for callers that need the editor's renderer in read mode. */
export function SourceEditorDisplay({ value, figures, diagramSvgs, imageCrops, className, ...props }: SourceEditorDisplayProps) {
  const diagrams = useMemo(() => diagramSvgs ?? figures?.map(figure => ({ svg: figure.svg ?? "", label: figure.label, box: figure.box })), [diagramSvgs, figures]);
  const crops = useMemo(() => imageCrops ?? figures?.map(figure => ({ src: figure.src ?? figure.url ?? figure.imageData ?? "", label: figure.label, box: figure.box })), [imageCrops, figures]);
  const positions = useMemo(() => figures?.every(figure => figure.box) ? figures.map(figure => ({ box: figure.box! })) : undefined, [figures]);
  return <div className={`source-math-editor source-editor-display ${className ?? ""}`}><SourceEditorRenderer {...props} content={value} diagramSvgs={diagrams} imageCrops={crops} figures={positions} editorTokens /></div>;
}
