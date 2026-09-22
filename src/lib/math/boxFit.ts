/**
 * 좁은 단의 〈보기〉 격자 — **그리는** 열 수와 여백을 정하는 판정 하나.
 *
 * 원장님 2026-09-21 확정(트랙 51, «추천대로 가»): 2단 시험지 한 단(88mm)에서 3열 〈보기〉 는 칸이
 * 약 22mm 라 `y = −⅔x²` 가 칸 안에서 «y =» 뒤로 접혔다. 먼저 **상자 안쪽 여백·칸 사이 간격을 줄여**
 * 원본처럼 한 줄에 세우고, 그래도 안 들어가면 **그리는 열 수를 줄인다.** 원문에 적힌 `<보기:cols=N>` 은
 * 그대로다 — 넓은 단(1단 지면)에서는 다시 N 열로 선다.
 *
 * «들어간다» = 칸마다 **한 줄 폭**(줄바꿈 없이 늘어놓은 폭)이 칸 폭 안에 든다. 한 칸이라도 두 줄이 되면
 * 그 행 전체가 어긋나 보인다 — 보기 번호 2열 판정(`fitsTwoColumns`)과 같은 원칙(원장님 2026-08-17).
 * 그림은 칸 폭에 맞춰 줄어드니(`max-w-full`) 한 줄 폭에 넣지 않는다(재는 쪽이 뺀다).
 *
 * 폭은 **실제 조판에서 잰다**(`BoxQuoteCard`) — 글꼴·수식 조판·배율(zoom)을 글자 수로 흉내 내지 않는다.
 * HWPX 는 지면을 베끼므로(`hwpxLayout`) 지면이 고른 열 수가 곧 한글의 열 수다.
 */
import type { BoxColumns } from "./boxHeader";

export interface BoxFitStep {
  /** 그리는 열 수. */
  cols: BoxColumns;
  /** 상자 안쪽 좌우 여백·칸 사이 간격을 줄였는가(`BOX_TIGHT_SPACING`). */
  tight: boolean;
}

/**
 * 줄인 여백(px) — 좌우 안쪽 여백 6 · 칸 사이 10(보통은 16 · 24).
 * 시험지 글자(13.2~13.5px)의 2단 한 단(약 327px)에서 원장님 9번 3열이 한 줄에 서는 값이다.
 * 위아래 여백은 폭과 상관없어 그대로 둔다.
 */
export const BOX_TIGHT_SPACING = { padX: 6, gapX: 10 } as const;

/**
 * «나란히» 칸 묶음의 간격(px) — 지면 클래스(`MarkdownRenderer` SIDE_CARD_CLASS · GRID_CLASS)를 숫자로 옮긴 것.
 * 칸 사이 `gap-x-6` 24 · 행 사이 `gap-y-1`/`space-y-1` 4 · 묶음 위아래 `my-2` 8+8. 테두리·안쪽 여백은 0 이라
 * 좁게 그릴 때(`BOX_TIGHT_SPACING`)는 칸 사이만 줄어든다. 인쇄 높이 자(`printOverflow`)가 이 값으로 센다 —
 * 클래스를 바꾸면 여기도(`sideBySideParity.test.tsx` 가 둘을 같이 잡는다). 실측이 아니라 CSS 값이다.
 */
export const SIDE_BY_SIDE_SPACING = {
  gapX: 24,
  rowGap: 4,
  marginY: 16,
} as const;

/** 소수 px 반올림으로 판정이 흔들리지 않게 반 px 까지는 들어간 것으로 본다. */
const TOLERANCE = 0.5;

/** 적힌 열 수에서 시작하는 사다리 — N 보통 → N 좁게 → … → 2 좁게 → 1(나란히 묶음은 N 이 4까지). */
export function boxFitSteps(written: BoxColumns): BoxFitStep[] {
  const steps: BoxFitStep[] = [];
  for (let cols = written; cols >= 2; cols -= 1) {
    steps.push({ cols: cols as BoxColumns, tight: false });
    steps.push({ cols: cols as BoxColumns, tight: true });
  }
  steps.push({ cols: 1, tight: false });
  return steps;
}

/**
 * 사다리에서 처음으로 모든 칸이 한 줄에 드는 단계. 1열은 묻지 않는다(글은 줄바꿈되어 선다).
 *
 * @param naturals 칸마다 한 줄 폭(그림 뺀)
 * @param trackAt 그 단계로 그렸을 때의 칸 폭 — 재는 쪽이 실제로 그려 보고 준다
 */
export function fitBoxColumns({
  written,
  naturals,
  trackAt,
}: {
  written: BoxColumns;
  naturals: readonly number[];
  trackAt: (step: BoxFitStep) => number;
}): BoxFitStep {
  if (written === 1 || naturals.length === 0)
    return { cols: written, tight: false };
  const widest = Math.max(...naturals);
  for (const step of boxFitSteps(written)) {
    if (step.cols === 1) return step;
    if (widest <= trackAt(step) + TOLERANCE) return step;
  }
  return { cols: 1, tight: false };
}
