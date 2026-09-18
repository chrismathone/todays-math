import type { Point } from "./figureFaceGeometry";

/**
 * 다각형(면) 도구가 그리는 중인 모양 — 찍은 점 · 마지막 점에서 마우스까지 · 첫 점(다시 누르면 닫힘) · 달라붙은 곳.
 * 보이기만 한다 — 누르기는 캔버스가 받는다(pointer-events 없음). 모양은 선택 조절점 겹(FigureSelectionOverlay)과 같은 색·굵기.
 */
export function FigurePolygonDraft({
  viewBox,
  points,
  hover,
  snapped,
  scale,
  fill,
}: {
  viewBox: number[];
  points: Point[];
  hover: Point | null;
  /** 마우스가 선의 끝점·꼭짓점·교점에 붙어 있나 */
  snapped: boolean;
  /** 화면 px / 도형 단위 — 점·선 굵기를 확대와 무관하게 */
  scale: number;
  fill: string;
}) {
  const unit = 1 / (scale || 1);
  const path = [...points, ...(hover ? [hover] : [])];
  const list = path.map((p) => `${p.x},${p.y}`).join(" ");
  return (
    <svg
      aria-label="그리는 다각형"
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
      {path.length >= 3 && (
        <polygon points={list} fill={fill} fillOpacity={0.6} stroke="none" />
      )}
      <polyline
        points={list}
        fill="none"
        stroke="var(--figure-primary)"
        strokeWidth={1.5 * unit}
        strokeDasharray={`${4 * unit} ${3 * unit}`}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={(i === 0 ? 6 : 3.5) * unit}
          fill={i === 0 ? "white" : "var(--figure-primary)"}
          stroke="var(--figure-primary)"
          strokeWidth={1.5 * unit}
        />
      ))}
      {hover && snapped && (
        <circle
          cx={hover.x}
          cy={hover.y}
          r={8 * unit}
          fill="none"
          stroke="var(--figure-primary)"
          strokeWidth={1.5 * unit}
        />
      )}
    </svg>
  );
}
