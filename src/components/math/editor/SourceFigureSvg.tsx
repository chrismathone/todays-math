import { useEffect, useRef, type HTMLAttributes } from "react";
import {
  firstPaintFigureMarkup,
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
      // 본문에서 떼어 온 글자다 — 실행되는 것이 섞였으면 첫 그림은 비우고, 효과가 살균본을 그린다.
      dangerouslySetInnerHTML={{ __html: firstPaintFigureMarkup(source) }}
    />
  );
}
