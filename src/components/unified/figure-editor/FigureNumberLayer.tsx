import { memo } from "react";
import { isAutoGroupName } from "./figureObjectGroups";
import type { FigureNumber } from "./figureObjectNumbers";

type Pick = (ids: readonly string[], additive: boolean) => void;

/** 동그라미(요소)의 반지름과, 그와 같은 무게의 네모(묶음) — 크기 토큰은 하나다. */
const DOT = 10;
const BOX = { width: 22, height: 18, corner: 5 };

/**
 * 묶음 표에 넣을 글자 — 자동 이름(A·B·…·AA)은 그대로, 손수 지은 이름은 **첫 글자 하나**만.
 * 표는 요소 표와 같은 크기라 «오르막» 같은 이름이 안 들어간다. 전체 이름은 읽는 이름(aria-label)과
 * 마우스 올림(title)에 그대로 있고, 요소 목록·오른쪽 칸에도 늘 보인다.
 * 이름이 자동인지 가르는 규칙은 다시 매기기(`isAutoGroupName`)와 **같은 하나**다.
 */
const groupGlyph = (name: string) =>
  isAutoGroupName(name) ? name.trim() : ([...name][0] ?? "");

/**
 * 그림 둘레의 요소 번호. 끄는 동안 번호 자리는 걸음마다 다시 재지만, **자리가 바뀐 번호만** 다시 그린다 —
 * 번호 하나가 요소 다섯(선·원·글…)이라 38개면 190개를 걸음마다 새로 만들고 있었다(2026-09-18).
 *
 * 묶음은 **번호표 하나**다. 누르면 묶음 전체가 선택되고 이동 사각형이 표시된다.
 * 묶음 지시선은 그리지 않는다 — 속 요소마다 뻗는 선이 그림과 이동 영역을 가렸다.
 *
 * 묶음 표는 **네모(모서리를 살짝 둥글린 사각)에 묶음 이름**, 요소 표는 **동그라미에 번호**다
 * (원장님 2026-09-21 «그룹은 요소와 차별성을 둬서 네모 A 로 하든지. 그게 나을지도.»).
 * **모양만** 갈리고 크기·글자 크기·색은 같은 토큰을 쓴다 — 새 시안이 아니다(D-07).
 * AI 에게 보내는 그림(`figureEditSnapshot`)은 묶음을 받지 않아 늘 동그라미에 번호다.
 */
const NumberMark = memo(function NumberMark({
  ids,
  group,
  number,
  x,
  y,
  targetX,
  targetY,
  selected,
  onPick,
}: FigureNumber & { selected: boolean; onPick: Pick }) {
  const leaders = group ? [] : [{ x: targetX, y: targetY }];
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
        {group ? (
          <rect
            x={x - BOX.width / 2}
            y={y - BOX.height / 2}
            width={BOX.width}
            height={BOX.height}
            rx={BOX.corner}
            fill={
              selected ? "var(--figure-primary)" : "var(--figure-accent-soft)"
            }
            stroke="var(--figure-accent-line)"
          />
        ) : (
          <circle
            cx={x}
            cy={y}
            r={DOT}
            fill={
              selected ? "var(--figure-primary)" : "var(--figure-accent-soft)"
            }
            stroke="var(--figure-accent-line)"
          />
        )}
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
          {group ? groupGlyph(group) : number}
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
