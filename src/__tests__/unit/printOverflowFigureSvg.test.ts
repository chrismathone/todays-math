/**
 * **지면 자가 인라인 SVG 그림을 보는가.**
 *
 * ## 🔴 왜 생겼나 (2026-08-29, 적대적 점검)
 *
 * `SeatProblem` 이 `figureUrls`·`figureDims`·`figureSourceMm` 만 담고 있었다 —
 * `figureSvg` 가 **타입에 없었다.** 그래서 `estimateProblemPx` → `packProblems`
 * (인쇄 분할, `TestPrint.tsx`)가 엔진 그림을 **0으로** 셌다.
 *
 * 실측(공유 DB): 출제 가능 문항 중 `figureSvg` 가 있는 것 **4,640건 전량**이
 * `figureUrls` 가 비어 있다. 그 그림의 지면 세로는 **중앙값 151px · p90 240px ·
 * 최대 367px** — 문항 칸(484px)의 31%·50%·76% 다. 이만큼을 0으로 세고 두 문항을
 * 한 칸에 짝지으면 **뒤 문항이 겹쳐 찍힌다.**
 *
 * 「과소평가는 곧 놓침이고, 놓침은 겹쳐 찍힌 시험지로 간다」(CLAUDE.md 2026-08-18).
 *
 * ## 참이 어디서 오나
 *
 * 폭 등급은 **지면이 쓰는 그 함수**(`figureSvgSize`)가 정하고, 인쇄 폭(mm)은
 * `FIGURE_SVG_PRINT_MM` 한 곳에서 온다 — `figureSvgFrame.test.ts` 가 그 표와
 * 실제 Tailwind 클래스 문자열이 같은 수인지 대조한다. mm → px 환산은
 * `mmToCssPx` 한 줄뿐이다. 규칙을 옮겨 적지 않는다.
 */
import { describe, expect, it } from "vitest";

import { mmToCssPx } from "@/lib/figurePrintSize";
import { FIGURE_SVG_PRINT_MM } from "@/lib/figure/figureSvgFrame";
import { JASEUP_MEASURED_PX } from "@/lib/printGeometry";
import {
  assessSeat,
  estimateFigureSvgPx,
  estimateProblemPx,
} from "@/lib/printOverflow";

const COMPACT = '<svg viewBox="0 0 160 120"><g/></svg>';
const MID = '<svg viewBox="0 0 240 300"><g/></svg>';
const PAIR = '<svg viewBox="0 0 300 150"><desc>chartPair</desc><g/></svg>';
const NO_VIEWBOX = "<svg><g/></svg>";

describe("[지면 자] 인라인 SVG 그림도 높이를 먹는다", () => {
  it("**검출기가 살아 있다** — 0 이 「깨끗」인지 「못 셈」인지 갈라야 한다", () => {
    expect(estimateFigureSvgPx(COMPACT)).toBeGreaterThan(100);
    expect(estimateFigureSvgPx(null)).toBe(0);
    expect(estimateFigureSvgPx(undefined)).toBe(0);
  });

  it("등급이 정한 **인쇄 폭(mm)** 으로 재고, 세로는 viewBox 비율이다", () => {
    const top = JASEUP_MEASURED_PX.figureBlockTop;
    expect(estimateFigureSvgPx(COMPACT)).toBeCloseTo(
      top + mmToCssPx(FIGURE_SVG_PRINT_MM.compact) * (120 / 160),
      3,
    );
    expect(estimateFigureSvgPx(MID)).toBeCloseTo(
      top + mmToCssPx(FIGURE_SVG_PRINT_MM.mid) * (300 / 240),
      3,
    );
    // 짝은 폭으로 안 가른다 — `<desc>chartPair</desc>` 가 정한다.
    expect(estimateFigureSvgPx(PAIR)).toBeCloseTo(
      top + mmToCssPx(FIGURE_SVG_PRINT_MM.pair) * (150 / 300),
      3,
    );
  });

  it("🔴 viewBox 를 못 읽으면 **0이 아니라 「모른다」**로 센다", () => {
    // 0 으로 세면 그림 문항일수록 조용해진다 — 그게 이 결함의 모양이었다.
    expect(estimateFigureSvgPx(NO_VIEWBOX)).toBeGreaterThan(100);
  });

  it("🔴 문항 높이에 **실제로 더해진다** — 같은 본문, 그림만 다르다", () => {
    const content = "다음 원기둥의 겉넓이를 구하시오.";
    const without = estimateProblemPx(content, []);
    const withSvg = estimateProblemPx(content, [], COMPACT);
    expect(withSvg - without).toBeCloseTo(estimateFigureSvgPx(COMPACT), 3);
  });

  it("🔴 `[그림]` 자국을 **지면과 같이** 숨긴다", () => {
    // `ProblemContent` 는 `figures.length > 0 || Boolean(figureSvg)` 로 숨긴다.
    // 자가 한쪽만 보면 그 문항만 한 줄 더 높게 세어 규칙이 갈라진다.
    const marked = "[그림]\n다음 원기둥의 겉넓이를 구하시오.";
    const plain = "다음 원기둥의 겉넓이를 구하시오.";
    expect(estimateProblemPx(marked, [], COMPACT)).toBeCloseTo(
      estimateProblemPx(plain, [], COMPACT),
      3,
    );
    // 그림이 없으면 그 줄은 **그대로 있다** — 숨김이 무조건이 아니어야 한다.
    expect(estimateProblemPx(marked, [])).toBeGreaterThan(
      estimateProblemPx(plain, []),
    );
  });

  it("🔴 **배선** — `assessSeat` 가 figureSvg 를 본다", () => {
    const content = "다음 원기둥의 겉넓이를 구하시오.";
    const slot = JASEUP_MEASURED_PX.continuationSlot / 2;
    const bare = assessSeat({ content }, slot);
    const withSvg = assessSeat({ content, figureSvg: COMPACT }, slot);
    expect(withSvg.px - bare.px).toBeCloseTo(estimateFigureSvgPx(COMPACT), 3);
    expect(withSvg.figurePx).toBeCloseTo(estimateFigureSvgPx(COMPACT), 3);
    // 🔴 판정 자체가 뒤집혀야 한다 — px 만 커지고 `tooTall` 이 안 바뀌면
    //    분할(`packProblems`)은 그대로 두 문항을 한 칸에 넣는다.
    //    `MID`(240x300)는 지면에서 314px 라 반쪽 칸(242px)에 못 들어간다.
    const tall = assessSeat({ content, figureSvg: MID }, slot);
    expect(bare.tooTall).toBe(false);
    expect(tall.tooTall).toBe(true);
  });
});
