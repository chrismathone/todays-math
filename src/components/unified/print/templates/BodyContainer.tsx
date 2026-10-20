// BodyContainer.tsx
// 1단/2단 본문 컨테이너. flex 기반 분할 (CSS columns 사용 안 함 — column-fill
// 동작이 종이 끝까지 차지 않아서).
//
// 측정된 문제지는 pack.ts의 단 경계와 문항별 풀이 여백을 그대로 렌더한다.
// count 모드는 균등 높이 칸, 정답지와 측정 probe는 고정 gap을 유지한다.
// itemWhitespace가 없으면 자연 흐름이므로 probe의 본문 높이를 늘리지 않는다.

import React from "react";
import { PAPER_COLORS } from "../tokens";
import { SOLVING_AREA_LAYOUT } from "../geometry";
import type { PrintOptions } from "../types";
import { SolvingArea } from "./SolvingArea";

interface BodyContainerProps {
  children: React.ReactNode;
  columns: 1 | 2;
  /** 문항 사이 gap (px). 기본 16. */
  gap?: number;
  /** 2단일 때 좌우 컬럼 사이 gap (px). 기본 26. */
  columnGap?: number;
  /**
   * count 모드 — 컬럼당 고정 개수일 때, 문항을 컬럼 높이에 맞춰 *자동 균등 분배*
   * (justify-content: space-between). 첫 문항은 *상단에 붙이고*(사용자 보고
   * 2026-06-04: 최상단 문항은 항상 상단 정렬), 남는 공간을 문항 *사이* 에 균등
   * 배분 → "단별 N문항 + 깔끔한 여백". 마지막 페이지 1문항도 space-between 이면
   * 가운데가 아니라 상단 정렬됨. gap 12px 는 최소 간격.
   */
  distribute?: boolean;
  itemWhitespace?: number[];
  /** 2단일 때 가운데 세로선. `null` 이면 안 그림. CSS 색상 문자열. */
  columnRule?: string | null;
  solvingArea?: PrintOptions["solvingArea"];
  /** Native questions already own their writing area (or a separate answer sheet). */
  omitSolvingArea?: boolean[];
  /**
   * 2단 우측 컬럼 시작 인덱스. usePrintLayout 의 측정 패킹이 정한 분할점.
   * 없으면 children 개수 절반 (Math.ceil(n/2)) — 기존 동작 (회귀 0).
   */
  splitIndex?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function BodyContainer({
  children,
  columns,
  gap = 16,
  columnGap = 26,
  columnRule = null,
  solvingArea = "off",
  omitSolvingArea,
  splitIndex,
  distribute,
  itemWhitespace,
  className,
  style,
}: BodyContainerProps) {
  // `measure-body` — probe shell 이 가용 높이를 읽고, 긴 수식 clamp CSS 가 거는
  // 마커. 모든 BodyContainer 에 부여 (preview·print·measure 모두 동일 적용).
  const mergedClass = ["measure-body", className].filter(Boolean).join(" ");

  // count 모드(distribute): 컬럼을 *문항 수만큼 N등분*. 각 문항을 flex:1 슬롯으로
  // 감싸 균등 분할 → 문항은 슬롯 *상단* 에 붙고 남는 슬롯 높이가 *풀이 여백*. 첫
  // 문항은 상단 정렬, 마지막 문항도 하단에 안 붙고 풀이공간을 가진다 (사용자 보고
  // 2026-06-04: "n등분 + 문제풀이공간 3~5줄"). gap 12px 는 슬롯 사이 최소 간격.
  const colGap = distribute ? 12 : itemWhitespace ? 0 : gap;
  // flex "1 1 0" + minHeight 0: 슬롯을 *균등*(N등분) + 컬럼 높이에 *바운드*(넘침 방지).
  // 문항은 슬롯 상단, 남는 슬롯 높이 = 풀이공간(마지막 포함). 컬럼당 개수는 packing 이
  // 높이 인지로 정해 칸 넘침 최소화.
  const wrapSlots = (nodes: React.ReactNode, offset = 0): React.ReactNode =>
    distribute
      ? React.Children.map(nodes, (child) => (
          <div style={{ flex: "1 1 0", minHeight: 0 }}>{child}</div>
        ))
      : itemWhitespace
        ? React.Children.map(nodes, (child, i) => (
            <div
              data-spacing-slot
              style={{
                flex: "0 0 auto",
                paddingBottom: itemWhitespace[offset + i] ?? 0,
              }}
            >
              {child}
            </div>
          ))
        : nodes;

  // Only mixed/native pages need row-level scratch areas. Ordinary pages keep
  // the existing uninterrupted right column, with identical measurement width.
  if (
    columns === 1 &&
    solvingArea !== "off" &&
    omitSolvingArea?.some(Boolean)
  ) {
    const items = React.Children.toArray(children);
    return (
      <div
        className={mergedClass}
        data-solving-layout
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: `minmax(0, ${SOLVING_AREA_LAYOUT.questionRatio}fr) minmax(0, ${1 - SOLVING_AREA_LAYOUT.questionRatio}fr)`,
          gridTemplateRows: `repeat(${Math.max(1, items.length)}, ${distribute ? "minmax(0, 1fr)" : "max-content"})`,
          columnGap: SOLVING_AREA_LAYOUT.gap,
          rowGap: colGap,
          ...style,
        }}
      >
        {items.map((child, i) => (
          <React.Fragment key={i}>
            <div
              data-question-column
              data-spacing-slot={itemWhitespace ? "" : undefined}
              style={{
                gridColumn: 1,
                gridRow: i + 1,
                minWidth: 0,
                minHeight: 0,
                paddingBottom: itemWhitespace?.[i] ?? 0,
              }}
            >
              {child}
            </div>
            {!omitSolvingArea[i] && (
              <div
                data-solving-for={i}
                style={{
                  gridColumn: 2,
                  gridRow: i + 1,
                  display: "grid",
                  minHeight: 0,
                }}
              >
                <SolvingArea style={solvingArea} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (columns === 1 && solvingArea !== "off") {
    return (
      <div
        className={mergedClass}
        data-solving-layout
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: `minmax(0, ${SOLVING_AREA_LAYOUT.questionRatio}fr) minmax(0, ${1 - SOLVING_AREA_LAYOUT.questionRatio}fr)`,
          columnGap: SOLVING_AREA_LAYOUT.gap,
          ...style,
        }}
      >
        <div
          data-question-column
          data-spacing-column
          style={{
            display: "flex",
            flexDirection: "column",
            gap: colGap,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          {wrapSlots(children)}
        </div>
        <SolvingArea style={solvingArea} />
      </div>
    );
  }

  // 2단 + count: 좌우 *같은 행* 문항 정렬 → 2D 그리드 (row 트랙 하나가 좌우 셀
  // 높이 공유 → 같은 행 문항이 같은 y). N등분 = repeat(N, minmax(0,1fr)) 로 *균등*
  // 행 + grid 를 page body(flex:1)에 *물리적으로 바운드*(minHeight:0) → 어떤 경우에도
  // 페이지를 넘지 않음 (사용자 보고 2026-06-04: "줄맞춤하면서 넘어가면 의미없다").
  // 각 셀 stretch → 문항 상단 + 남는 높이 = 풀이공간. 컬럼당 문항 수는 packing 이
  // 높이 인지로 정해(안 들어가면 적게) 칸 넘침 최소화.
  if (columns === 2 && distribute) {
    const items = React.Children.toArray(children);
    const split = splitIndex ?? Math.ceil(items.length / 2);
    const left = items.slice(0, split);
    const right = items.slice(split);
    const rows = Math.max(left.length, right.length, 1);
    const hasRule = columnRule !== null;
    return (
      <div
        className={mergedClass}
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: hasRule
            ? "minmax(0, 1fr) 1px minmax(0, 1fr)"
            : "minmax(0, 1fr) minmax(0, 1fr)",
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          columnGap: `${columnRule === null ? columnGap : (columnGap - 1) / 2}px`,
          rowGap: "12px",
          ...style,
        }}
      >
        {left.map((child, i) => (
          <div
            key={`l${i}`}
            style={{ gridColumn: 1, gridRow: i + 1, minWidth: 0 }}
          >
            {child}
          </div>
        ))}
        {hasRule && (
          <div
            data-column-divider
            style={{
              gridColumn: 2,
              gridRow: "1 / -1",
              width: 1,
              borderLeft: `1px solid ${columnRule || PAPER_COLORS.ink08}`,
              boxSizing: "border-box",
            }}
          />
        )}
        {right.map((child, i) => (
          <div
            key={`r${i}`}
            style={{ gridColumn: hasRule ? 3 : 2, gridRow: i + 1, minWidth: 0 }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  if (columns === 2) {
    const items = React.Children.toArray(children);
    const split = splitIndex ?? Math.ceil(items.length / 2);
    const colStyle: React.CSSProperties = {
      display: "flex",
      flexDirection: "column",
      gap: `${colGap}px`,
      minWidth: 0,
      // 슬롯(flex:1)이 컬럼 높이를 나누려면 컬럼이 definite height 여야 함 — grid
      // stretch + height:100% 로 보장 (distribute 일 때만).
      ...(distribute ? { height: "100%" } : {}),
    };
    return (
      <div
        className={mergedClass}
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns:
            columnRule === null
              ? "minmax(0, 1fr) minmax(0, 1fr)"
              : "minmax(0, 1fr) 1px minmax(0, 1fr)",
          gap: `0 ${columnRule === null ? columnGap : (columnGap - 1) / 2}px`,
          ...style,
        }}
      >
        <div data-spacing-column style={colStyle}>
          {wrapSlots(items.slice(0, split))}
        </div>
        {columnRule !== null && (
          <div
            data-column-divider
            style={{
              width: 1,
              borderLeft: `1px solid ${columnRule || PAPER_COLORS.ink08}`,
              boxSizing: "border-box",
            }}
          />
        )}
        <div data-spacing-column style={colStyle}>
          {wrapSlots(items.slice(split), split)}
        </div>
      </div>
    );
  }

  // 1단
  return (
    <div
      className={mergedClass}
      style={{
        flex: 1,
        // distribute(count) 면 minHeight:0 으로 page body 에 바운드 → 슬롯 균등 분할
        // 이 페이지를 안 넘김. spacing 모드는 자연 흐름(기존) 유지.
        ...(distribute ? { minHeight: 0 } : {}),
        display: "flex",
        flexDirection: "column",
        gap: `${colGap}px`,
        ...style,
      }}
    >
      {wrapSlots(children)}
    </div>
  );
}
