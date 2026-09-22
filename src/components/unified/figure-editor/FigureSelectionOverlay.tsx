import type { PointerEvent } from "react";
import type { FigureHandle } from "./figureHandles";
import { isMoveHandle } from "./figureSizeLock";

/** 노란 조절점 — 파워포인트의 모양 조절점처럼 노랑(원장님 참고 그림 2026-09-19). 흰 바탕에서 보이게 테두리는 짙은 황토. */
const ADJUST_FILL = "#ffd400";
const ADJUST_STROKE = "#8a6d00";

export function FigureSelectionOverlay({
  selection,
  handles: allHandles,
  currentType,
  viewBox,
  busy,
  sizeLocked = false,
  onHandleDown,
}: {
  selection: { matrix: DOMMatrix; bounds: DOMRect; scale: number };
  handles: FigureHandle[];
  currentType?: string;
  viewBox: number[];
  busy: boolean;
  /** 크기 고정 — 크기·모양을 바꾸는 점은 그리지 않는다(누를 수 있어 보이면 안 된다). 옮기기만 하는 점은 남긴다. */
  sizeLocked?: boolean;
  onHandleDown: (event: PointerEvent, handle: string) => void;
}) {
  const handles = sizeLocked
    ? allHandles.filter((h) => isMoveHandle(h.key))
    : allHandles;
  const at = (x: number, y: number) =>
    new DOMPoint(x, y).matrixTransform(selection.matrix);
  const b = selection.bounds;
  const corners = [
    [b.x, b.y],
    [b.x + b.width, b.y],
    [b.x + b.width, b.y + b.height],
    [b.x, b.y + b.height],
  ];
  const controls: FigureHandle[] = handles.length
    ? handles
    : currentType !== "text" && !sizeLocked
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
        // 곡선 위 노란 손잡이(adjust)는 곡선에 붙어 있어 이을 선이 없다 — 옅은 파란 조절점만 양 끝과 잇는다
        h.control && !h.adjust
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
            fill={
              h.adjust
                ? ADJUST_FILL
                : h.control
                  ? "var(--figure-accent-soft)"
                  : "white"
            }
            stroke={h.adjust ? ADJUST_STROKE : "var(--figure-primary)"}
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
