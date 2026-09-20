import { memo } from "react";
import type { FigureNumber } from "./figureObjectNumbers";

type Pick = (ids: readonly string[], additive: boolean) => void;

/**
 * 그림 둘레의 요소 번호. 끄는 동안 번호 자리는 걸음마다 다시 재지만, **자리가 바뀐 번호만** 다시 그린다 —
 * 번호 하나가 요소 다섯(선·원·글…)이라 38개면 190개를 걸음마다 새로 만들고 있었다(2026-09-18).
 *
 * 묶음은 **번호표 하나**다(원장님 2026-09-21). 합친 번호표에서는 지시선이 속 요소마다 하나씩 나가
 * «이 번호가 이 요소들»임을 그림이 스스로 말한다 — 번호표 모양은 요소 하나짜리와 같다.
 * 누르면 묶음 전체가 선택된다.
 */
const NumberMark = memo(function NumberMark({
  ids,
  group,
  number,
  x,
  y,
  targetX,
  targetY,
  targets,
  selected,
  onPick,
}: FigureNumber & { selected: boolean; onPick: Pick }) {
  const leaders = targets ?? [{ x: targetX, y: targetY }];
  return (
    <g>
      {leaders.map((at, index) => (
        <line
          key={index}
          x1={x}
          y1={y}
          x2={at.x}
          y2={at.y}
          stroke={selected ? "var(--figure-primary)" : "#94a3b8"}
          strokeWidth={selected ? 1.5 : 1}
          strokeDasharray="3 4"
          opacity={selected ? 0.85 : 1}
        />
      ))}
      <g
        data-figure-number={number}
        data-number-object={ids[0]}
        role="button"
        tabIndex={0}
        aria-label={group ? `${group} 묶음 선택` : `요소 ${number} 선택`}
        style={{ pointerEvents: "all", cursor: "pointer" }}
        onClick={(event) =>
          onPick(ids, event.shiftKey || event.ctrlKey || event.metaKey)
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onPick(ids, false);
          }
        }}
      >
        {group && <title>{`${group} 묶음`}</title>}
        <circle
          cx={x}
          cy={y}
          r={10}
          fill={
            selected ? "var(--figure-primary)" : "var(--figure-accent-soft)"
          }
          stroke="var(--figure-accent-line)"
        />
        <text
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          style={{
            font: "600 11px Arial, sans-serif",
            fill: selected ? "#fff" : "var(--figure-accent-ink)",
            stroke: "none",
          }}
        >
          {number}
        </text>
      </g>
    </g>
  );
});

export const FigureNumberLayer = memo(function FigureNumberLayer({
  numbers,
  selectedIds,
  onPick,
}: {
  numbers: FigureNumber[];
  selectedIds: string[];
  onPick: Pick;
}) {
  return (
    <svg
      aria-label="도형 요소 번호"
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
      {numbers.map((item) => (
        <NumberMark
          key={item.id}
          {...item}
          selected={item.ids.every((id) => selectedIds.includes(id))}
          onPick={onPick}
        />
      ))}
    </svg>
  );
});
