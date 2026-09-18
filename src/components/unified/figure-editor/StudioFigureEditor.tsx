"use client";

import { useSyncExternalStore } from "react";
import { FigureEditor } from "./FigureEditor";
import type { StudioFigureEditorProps } from "./types";

const subscribe = () => () => {};
const mounted = () => true;
const serverSnapshot = () => false;

/** Browser-only DOM/SVG editor; safe to import from a Next client component. */
export function StudioFigureEditor(props: StudioFigureEditorProps) {
  const isMounted = useSyncExternalStore(subscribe, mounted, serverSnapshot);
  if (!isMounted) return null;
  return (
    <FigureEditor
      key={`${props.index}:${props.image}:${props.initialSvg ?? ""}`}
      {...props}
    />
  );
}

export default StudioFigureEditor;
export type {
  StudioFigureEditorProps,
  StudioFigureSaveResult,
  StudioFigureRedrawRequest,
  StudioFigureRedrawResult,
  StudioFigureEditRequest,
  StudioFigureEditResult,
} from "./types";
