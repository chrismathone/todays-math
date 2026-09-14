import { useEffect, useRef, type HTMLAttributes } from "react";
import {
  paintSourceFigure,
  sourceFigureWidth,
} from "./sourceFigurePresentation";

export function SourceFigureSvg({
  source,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { source: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) return paintSourceFigure(ref.current, source);
  }, [source]);
  return (
    <span
      {...props}
      ref={ref}
      className="source-figure-frame"
      style={{ width: sourceFigureWidth(source) }}
      dangerouslySetInnerHTML={{ __html: source }}
    />
  );
}
