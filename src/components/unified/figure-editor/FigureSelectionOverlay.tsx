import type { PointerEvent } from "react";
import type { FigureHandle } from "./figureHandles";

export function FigureSelectionOverlay({
  selection,
  handles,
  currentType,
  viewBox,
  busy,
  onHandleDown,
}: {
  selection: { matrix: DOMMatrix; bounds: DOMRect; scale: number };
  handles: FigureHandle[];
  currentType?: string;
  viewBox: number[];
  busy: boolean;
  onHandleDown: (event: PointerEvent, handle: string) => void;
}) {
  const at = (x: number, y: number) =>
    new DOMPoint(x, y).matrixTransform(selection.matrix);
  const b = selection.bounds;
  const corners = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x + b.width, b.y + b.height],
    [b.x, b.y + b.height],
  ];
  const controls = handles.length
    ? handles
    : currentType !== "text"
      ? corners.map(([x, y], i) => ({
          key: `resize-${i}`,
          x,
          y,
          label: `크기 조절 ${i + 1}`,
          control: false,
        }))
      : [];
  const radius = 6 / selection.scale;
  return (
    <svg
      aria-label="도형 마우스 조절점"
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
      <polygon
        points={corners
          .map(([x, y]) => {
            const p = at(x, y);
            return `${p.x},${p.y}`;
          })
          .join(" ")}
        fill="none"
        stroke="var(--figure-primary)"
        strokeWidth={1 / selection.scale}
        strokeDasharray={`${4 / selection.scale} ${3 / selection.scale}`}
      />
      {handles.map((h, i) =>
        h.control
          ? [handles[i - 1], handles[i + 1]].filter(Boolean).map((other, j) => {
              const a = at(h.x, h.y),
                z = at(other.x, other.y);
              return (
                <line
                  key={`${h.key}-${j}`}
                  x1={a.x}
                  y1={a.y}
                  x2={z.x}
                  y2={z.y}
                  stroke="var(--figure-accent-line)"
                  strokeWidth={1 / selection.scale}
                  strokeDasharray={`${3 / selection.scale} ${3 / selection.scale}`}
                />
              );
            })
          : null,
      )}
      {controls.map((h) => {
        const p = at(h.x, h.y);
        return (
          <circle
            key={h.key}
            data-figure-handle={h.key}
            aria-label={h.label}
            cx={p.x}
            cy={p.y}
            r={radius}
            fill={h.control ? "var(--figure-accent-soft)" : "white"}
            stroke="var(--figure-primary)"
            strokeWidth={2 / selection.scale}
            style={{
              pointerEvents: busy ? "none" : "all",
              cursor: h.key === "center" ? "move" : "crosshair",
            }}
            onPointerDown={(e) => onHandleDown(e, h.key)}
          >
            <title>{h.label} · 드래그해서 수정</title>
          </circle>
        );
      })}
    </svg>
  );
}
