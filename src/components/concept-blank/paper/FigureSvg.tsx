import type { FigureItem } from "@/contracts/conceptBlank.contract";

import styles from "./paper.module.css";

/** 계약(`figureItemSchema`)과 같은 거름 — 은행 시험이 먼저 막지만, 지면도 한 번 더 본다. */
const UNSAFE_SVG = /<script|\son\w+=|href=|<image|<foreignObject/i;
const TAG_HEIGHT = 18;
const GOLD = "#A57F00";

/**
 * E 그림 — 은행의 SVG 조각을 `viewBox` 로 감싸고, 빈 이름표 자리(`tags`)에 금색 점선 네모를 그린다.
 * `answers` 면(채점표) 네모 안에 답을 쓴다 — 글자가 네모보다 길면 글씨를 줄여 넣는다.
 */
export function FigureSvg({
  item,
  answers = false,
  className,
}: {
  item: FigureItem;
  answers?: boolean;
  className?: string;
}) {
  if (UNSAFE_SVG.test(item.svg)) return null;
  return (
    <svg
      aria-label={item.prompt}
      className={className ?? styles.figure}
      data-cb-figure={item.id}
      role="img"
      viewBox={item.viewBox}
    >
      <g dangerouslySetInnerHTML={{ __html: item.svg }} />
      {item.tags.map((tag, i) => (
        <g data-cb-tag="" key={i}>
          <rect
            fill="#fff"
            height={TAG_HEIGHT}
            rx={3}
            stroke={GOLD}
            strokeDasharray="3 2"
            strokeWidth={1.1}
            width={tag.w}
            x={tag.x}
            y={tag.y}
          />
          {answers ? (
            <text
              className={styles.tagAnswer}
              fontSize={Math.min(
                11,
                (tag.w - 4) / Math.max(1, [...tag.answer].length),
              )}
              textAnchor="middle"
              x={tag.x + tag.w / 2}
              y={tag.y + 12.5}
            >
              {tag.answer}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
