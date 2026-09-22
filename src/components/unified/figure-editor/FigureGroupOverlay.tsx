import type { PointerEvent } from "react";
import type { FigureGroupBounds } from "./figureGroupSelection";

export function FigureGroupOverlay({
  bounds,
  viewBox,
  name,
  busy,
  onPointerDown,
}: {
  bounds: FigureGroupBounds;
  viewBox: number[];
  name: string;
  busy: boolean;
  onPointerDown: (event: PointerEvent, border: boolean) => void;
}) {
  const { x, y, width, height, scale } = bounds;
  return (
    <svg
      aria-label={`${name} 이동 영역`}
      viewBox={viewBox.join(" ")}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        maxWidth: "none",
        maxHeight: "none",
        margin: 0,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <rect
        data-figure-group-interior=""
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        style={{ pointerEvents: busy ? "none" : "all", cursor: "move" }}
        onPointerDown={(event) => onPointerDown(event, false)}
      >
        <title>{name} · 안쪽이나 테두리를 드래그해서 함께 이동</title>
      </rect>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="var(--figure-primary)"
        strokeWidth={1.5 / scale}
      />
      <rect
        data-figure-group-border=""
        x={x}
        y={y}
        width={width}
        height={height}
        fill="none"
        stroke="transparent"
        strokeWidth={10 / scale}
        style={{ pointerEvents: busy ? "none" : "stroke", cursor: "move" }}
        onPointerDown={(event) => onPointerDown(event, true)}
      >
        <title>{name} · 드래그해서 함께 이동</title>
      </rect>
    </svg>
  );
}
