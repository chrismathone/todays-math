"use client";

/**
 * 지면 〈보기〉·〈조건〉 상자 카드 — 좁은 단에서 **그리는** 열 수와 여백을 실제 조판에서 고른다(트랙 51).
 *
 * 원장님 2026-09-21 확정: 88mm 단의 3열 〈보기〉 에서 `y = −⅔x²` 가 칸 안에서 접혔다. 먼저 상자 안쪽
 * 여백·칸 사이 간격을 줄여 한 줄에 세우고, 그래도 안 들어가면 그리는 열 수를 줄인다. 판정은
 * `fitBoxColumns` 하나다 — 여기서는 칸마다 한 줄 폭을 재고, 단계마다 실제로 그려 칸 폭을 잴 뿐이다.
 * HWPX 는 이 지면을 베끼므로(`hwpxLayout`) 한글도 같은 열 수로 선다.
 *
 * 1열 상자와 서버 렌더(`renderToStaticMarkup`·서버 컴포넌트)는 적힌 대로 그린다 — 재는 일은 브라우저의
 * 레이아웃 효과에서만 한다. 그래서 들어가는 상자의 마크업은 예전과 같다(속성이 안 붙는다).
 *
 * 격자 칸 세로 맞춤: 글 칸은 **기준선**(분수 칸 옆 글이 몇 px 높게 서던 것 — 한글과 같아진다),
 * 그림 칸은 **위쪽**(그림의 아래 끝이 기준선이 되면 옆 글이 그림 바닥으로 내려간다).
 */
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  BOX_TIGHT_SPACING,
  fitBoxColumns,
  type BoxFitStep,
} from "@/lib/math/boxFit";
import type { BoxColumns } from "@/lib/math/boxHeader";

/** 칸마다 한 줄 폭 — 그림은 칸 폭에 맞춰 줄어드니 빼고 잰다. */
function naturalWidths(cells: HTMLElement[]): number[] {
  const images = cells.flatMap((cell) => [...cell.querySelectorAll("img")]);
  const savedImages = images.map((image) => image.style.display);
  const savedCells = cells.map((cell) => cell.style.cssText);
  for (const image of images) image.style.display = "none";
  for (const cell of cells) {
    cell.style.width = "max-content";
    cell.style.maxWidth = "none";
  }
  const widths = cells.map((cell) => cell.getBoundingClientRect().width);
  cells.forEach((cell, index) => (cell.style.cssText = savedCells[index]!));
  images.forEach((image, index) => (image.style.display = savedImages[index]!));
  return widths;
}

/** 한 단계를 잠깐 그려 칸 폭을 잰다 — 끝나면 인라인 스타일을 그대로 되돌린다. */
function measureFit(
  card: HTMLElement,
  grid: HTMLElement,
  written: BoxColumns,
): BoxFitStep {
  const cells = [...grid.children] as HTMLElement[];
  if (cells.length < 2) return { cols: written, tight: false };
  const savedCard = card.style.cssText;
  const savedGrid = grid.style.cssText;
  try {
    const naturals = naturalWidths(cells);
    return fitBoxColumns({
      written,
      naturals,
      trackAt: ({ cols, tight }) => {
        card.style.cssText = savedCard;
        grid.style.cssText = savedGrid;
        card.style.paddingLeft = tight ? `${BOX_TIGHT_SPACING.padX}px` : "";
        card.style.paddingRight = tight ? `${BOX_TIGHT_SPACING.padX}px` : "";
        grid.style.columnGap = tight ? `${BOX_TIGHT_SPACING.gapX}px` : "";
        grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        return cells[0]!.getBoundingClientRect().width;
      },
    });
  } finally {
    card.style.cssText = savedCard;
    grid.style.cssText = savedGrid;
  }
}

const sameStep = (a: BoxFitStep | null, b: BoxFitStep) =>
  !!a && a.cols === b.cols && a.tight === b.tight;

export function BoxQuoteCard({
  className,
  label,
  columns,
  gridClassName,
  itemClassName,
  items,
}: {
  className: string;
  /** 머리에 찍을 글(`〈보기〉`). 라벨 없는 상자(나열 대상)는 null. */
  label: string | null;
  /** 원문에 적힌 열 수. */
  columns: BoxColumns;
  gridClassName: string;
  itemClassName: string;
  items: ReactNode[];
}) {
  const card = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<BoxFitStep | null>(null);

  useLayoutEffect(() => {
    if (columns === 1 || !card.current || !grid.current) return;
    const cardElement = card.current;
    const gridElement = grid.current;
    let frame = 0;
    let live = true;
    const run = () => {
      if (!live || !cardElement.isConnected) return;
      const next = measureFit(cardElement, gridElement, columns);
      setFit((previous) => (sameStep(previous, next) ? previous : next));
    };
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };
    run();
    // 단 폭이 바뀌거나(창·확대) 글꼴이 늦게 들어오면 다시 고른다. 높이만 바뀌면 같은 답이 나와 멈춘다.
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(later);
    observer?.observe(cardElement);
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    fonts?.addEventListener?.("loadingdone", later);
    void fonts?.ready?.then(later);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", later);
    };
  }, [columns, items]);

  const drawn = fit && fit.cols !== columns ? fit.cols : null;
  const tight = !!fit?.tight;
  const cardStyle: CSSProperties | undefined = tight
    ? {
        paddingLeft: BOX_TIGHT_SPACING.padX,
        paddingRight: BOX_TIGHT_SPACING.padX,
      }
    : undefined;
  const gridStyle: CSSProperties | undefined =
    drawn || tight
      ? {
          ...(drawn
            ? { gridTemplateColumns: `repeat(${drawn}, minmax(0, 1fr))` }
            : {}),
          ...(tight ? { columnGap: BOX_TIGHT_SPACING.gapX } : {}),
        }
      : undefined;

  return (
    <div
      ref={card}
      data-box-card
      data-box-drawn={drawn ?? undefined}
      data-box-tight={tight ? "" : undefined}
      className={className}
      style={cardStyle}
    >
      {label === null ? null : (
        // 라벨은 상자 위 **가운데**다(D-108) — 한국 시험지 관행.
        <div
          data-box-header
          className="mb-1 text-center font-normal leading-normal [&>p]:my-0"
        >
          {label}
        </div>
      )}
      {items.length > 0 ? (
        // 여러 열 격자는 HWPX 수집기에 칸을 알린다 — 한 행을 한 문단으로, 칸 차례대로 묶게.
        <div
          ref={grid}
          className={gridClassName}
          data-hwpx-grid={columns > 1 ? "" : undefined}
          style={gridStyle}
        >
          {items.map((item, index) => (
            <div key={index} data-box-item className={itemClassName}>
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
