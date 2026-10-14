/**
 * inline SVG 그림의 화면 폭.
 *
 * `sanitize_svg` 가 root `width`/`height`/`class` 를 버리므로 치수는
 * `viewBox` 밖에 없다. ProblemContent 는 큰 도형을 360px 까지 늘리는데,
 * 초등 그림의 viewBox 는 140~300 이라 발문(12.5px, 열 364px)을 압도한다.
 *
 * 문턱은 `/dev/cube-scrape` 실측 viewBox 폭:
 *   수 카드 136 · opBox 140 · sumBox 144 · 수 모형 152
 *   자릿값 202 · 각 229 · 상자연쇄 242 · 도형수 259 · 연산흐름 304
 * 원장님(2026-08-21): 본문 글자에 비해 크다. 위젯은 140, 중간 도형은 240.
 */
export const FIGURE_SVG_WIDE_MAX_PX = 360;
export const FIGURE_SVG_MID_MAX_PX = 240;
export const FIGURE_SVG_COMPACT_MAX_PX = 140;
export const FIGURE_SVG_COMPACT_VIEWBOX = 160;
export const FIGURE_SVG_MID_VIEWBOX = 320;

/**
 * 그래프 짝(`chartPair`) 전용 — **문항 열을 통째로** 쓴다 (D-70 계열, 원장님 확정 2026-08-23).
 *
 * 왜 등급을 더하나: 짝은 폭이 두 배(실측 405단위)라 `wide`(360px)에 넣으면 눈금 글자가
 * 12.44px 으로 **본문(12.5px) 아래**로 내려간다. 열 폭까지 주면 12.58px 로 조건을 지킨다.
 * 근거는 실측 `problemColumn` 363.5px(`printGeometry.ts`)과 그 지면 환산
 * 96.9mm(= 363.5 ÷ 3.75px/mm, `mid` 240px/64mm 에서 나온 배율).
 *
 * ⚠️ **이 두 수는 `scripts/figure/elem_advanced.py` 의 `PAIR_FRAME_PX`·`PAIR_FRAME_MM`
 *    과 반드시 같아야 한다** — 파이썬이 이 폭으로 「눈금 글자가 본문 이상인가」를 판정하고,
 *    실제로 그려지는 폭은 여기가 정한다. 어긋나면 **가드가 통과시킨 그림이 지면에서
 *    작아진다.** `elementaryFigure.test.ts` 가 두 파일의 숫자를 대조한다.
 *
 * ~~띠를 380 부터 잡은 이유: 지금 나오는 그림 중 가장 넓은 것이 336(`pills`)이라
 * 이 띠는 오늘 비어 있다 — 짝 말고는 등급이 안 바뀐다(실측 확인, 시험이 잠근다).~~
 *
 * 🔴 **위 실측이 낡아서 그 예언이 그대로 실현됐다** (2026-08-23).
 *    같은 문단이 「어긋나면 **가드가 통과시킨 그림이 지면에서 작아진다**」고 경고했는데
 *    바로 그 일이 났다. 짝의 실제 viewBox 는 **273.21~359.61** 로 **380 을 한 번도
 *    안 넘어서** `pair` 등급이 **구조적으로 0**이었다. 파이썬은 `PAIR_FRAME_PX`(364)로
 *    「눈금 글자가 본문 이상인가」를 판정해 통과시키는데, 지면에서는 `mid`(240px)로
 *    그려져 최악 **11.45px**(본문 12.5px 미만). 초4 1-5-3 짝 53장 중 **17장(32%)**.
 *
 *    ⚠️ 그리고 **폭으로는 애초에 못 가른다**: 네 학년 스펙 2,924개를 렌더한 실측에서
 *    단독 `cuboid` 가 **128.17~324.97** 이라 짝(273.21~)과 **겹친다.** 어느 문턱을
 *    놓아도 「좁은 짝」이나 「넓은 단독」 한쪽이 틀린다 — 문턱이 아니라 **축이 틀렸다**
 *    (09 §4-18). 그래서 **kind 로 가른다**(아래 `PAIR_DESC`).
 *
 *    ⚠️ 그 실측의 **1차 판은 「겹침 0」이었다** — 586개를 못 그리고 버렸는데 그 실패가
 *    무작위가 아니라 **3D 종류**였다(엔진 경로 문제). **빠진 표본을 안 세면 0이 나온다.**
 *    다음에 이 수를 갱신하는 사람은 **잰 날짜·표본 수·못 그린 수**를 같이 적어라.
 *
 * 이 문단을 지우지 마라. 「실측이 낡으면 가드가 통과시킨다」는 문장이 다음 사람에게도
 * 필요하고, 그 실례가 바로 위에 있다.
 */
export const FIGURE_SVG_PAIR_MAX_PX = 364;
export const FIGURE_SVG_PAIR_MM = 97;
/**
 * @deprecated 폭으로 짝을 가르지 않는다(위 문단). 옛 규칙을 되살리지 못하게 남겨 둔
 * 값이며, 등급 판정은 `PAIR_DESC` 를 본다. 시험이 「좁은 짝도 pair」를 잠근다.
 */
export const FIGURE_SVG_PAIR_VIEWBOX = 380;

/**
 * 그리는 쪽이 심는 표식. `scripts/figure/elem_advanced.py` 의 `_chart_pair` 가
 * `<desc>chartPair</desc>` 를 낸다 — `sanitize_svg` 의 `_ALLOWED_TAGS` 에 `desc` 가
 * 있고 **속성은 허용되지 않아**(`"desc": frozenset()`) 빈 태그로만 통과한다.
 *
 * **판정과 그리기가 같은 값을 본다** — 지면 폭을 어림해 되짚지 않는다. 이번 결함의
 * 뿌리가 「파이썬은 364 를 믿고 TS 는 폭으로 정한다」였다.
 */
const PAIR_DESC = /<desc>\s*chartPair\s*<\/desc>/;

export type FigureSvgSize = "compact" | "mid" | "wide" | "pair";

/**
 * `viewBox` 의 **폭·높이**. 원점은 0 이 아니어도 된다.
 *
 * 🔴 예전 정규식은 `viewBox="0 0 W H"` 만 읽었다. 엔진이 내는 그림은 `0 0` 으로 시작하도록
 *    `figure_quality._validate_viewbox` 가 강제하니 그것으로 충분해 보였지만, **작업실이
 *    저장 직전에 부르는 `fitFigureViewport` 는 라벨까지 감싸느라 음수 원점**을 쓴다
 *    (`viewBox="-10.4 -10.4 236.654 249.324"`). 그 그림들은 「못 읽었다」가 되어
 *    `figureSvgSize` 의 `wide`(제일 큰 등급)로 조용히 미끄러졌다 — 실패가 기본값으로
 *    번지는 꼴이다. 원점과 구분자(공백·쉼표)를 같이 받는다.
 */
const VIEWBOX_WH =
  /viewBox="\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/;

export function figureSvgViewBox(
  svg: string,
): { width: number; height: number } | null {
  const match = VIEWBOX_WH.exec(svg);
  if (!match) return null;
  const width = Number(match[3]);
  const height = Number(match[4]);
  if (!Number.isFinite(width) || width <= 0) return null;
  if (!Number.isFinite(height) || height <= 0) return null;
  return { width, height };
}

export function figureSvgViewBoxWidth(svg: string): number | null {
  return figureSvgViewBox(svg)?.width ?? null;
}

/** The checked arithmetic angle assets use a 216px / 57.15mm square.
 * Preserve that scale for tall figures too: width follows the longest extent.
 * This opt-in marker does not change other engine figures' size classes.
 */
export function figureSvgAngleDrillWidthMm(svg: string): number | null {
  if (!svg.includes("<desc>arithmetic-angle-drill-v1</desc>")) return null;
  const box = figureSvgViewBox(svg);
  return box ? (57.15 * box.width) / Math.max(box.width, box.height) : null;
}

export function figureSvgSize(svg: string): FigureSvgSize {
  // 🔴 **폭보다 먼저 kind 를 본다.** 짝은 좁아도 열을 통째로 써야 한다 —
  //    폭으로 가르면 「좁은 짝(273)」과 「넓은 단독 cuboid(325)」가 겹쳐 못 갈린다.
  if (PAIR_DESC.test(svg)) return "pair";
  const width = figureSvgViewBoxWidth(svg);
  if (width === null) return "wide";
  if (width <= FIGURE_SVG_COMPACT_VIEWBOX) return "compact";
  if (width <= FIGURE_SVG_MID_VIEWBOX) return "mid";
  return "wide";
}

export function isCompactFigureSvg(svg: string): boolean {
  return figureSvgSize(svg) !== "wide";
}

/**
 * 등급별 틀. **폭은 화면·인쇄가 같은 수(mm)** 다.
 *
 * 🔴 예전에는 화면을 px, 인쇄를 mm 로 따로 적었다(`max-w-[360px] print:max-w-[70mm]`).
 *    compact·mid·pair 는 두 수가 1% 안이라 아무도 몰랐지만 **`wide` 는 화면 360px ·
 *    종이 70mm(264.57px)로 36% 갈렸다.** 그런데 HWPX 내보내기는 미리보기 DOM 을
 *    **화면 매체 그대로** 복제해 재므로(`hwpxLayout.collectHwpxLayout`) HWPX 가 화면
 *    편에 서고 PDF·실제 인쇄가 반대편에 섰다 — 「미리보기와 내보낸 것이 다르다」의
 *    한 갈래다(2026-09-20 실측: 화면·HWPX 360px vs PDF 264.57px).
 *
 *    mm 하나로 적으면 매체가 갈라질 자리가 없다. 확정된 수는 **인쇄 폭**
 *    (`FIGURE_SVG_PRINT_MM`)이므로 화면이 그쪽으로 맞춘다 — 미리보기는 지면을
 *    보여 주는 물건이기 때문이다.
 */
const FRAME: Record<FigureSvgSize, string> = {
  compact:
    "mt-3 max-w-[37mm] [&>svg]:h-auto [&>svg]:w-full print:break-inside-avoid",
  mid: "mt-3 max-w-[64mm] [&>svg]:h-auto [&>svg]:w-full print:break-inside-avoid",
  wide: "mt-3 max-w-[70mm] [&>svg]:h-auto [&>svg]:w-full print:break-inside-avoid",
  // 짝은 문항 열을 통째로 쓴다 — 위 상수와 같은 수여야 한다(97mm = 366.6px).
  pair: "mt-3 max-w-[97mm] [&>svg]:h-auto [&>svg]:w-full print:break-inside-avoid",
};

/**
 * 등급별 **폭(mm)** — 화면·인쇄·HWPX 가 **모두 이 수**다. 아래 `FRAME` 의
 * `max-w-[Xmm]` 과 같은 수여야 한다 — Tailwind 는 클래스 문자열을 글자 그대로 훑으므로
 * 그쪽을 이 표에서 만들 수 없다. 그래서 `figureSvgFrame.test.ts` 가 둘을 대조한다.
 *
 * 🔴 **넘침 판정(`printOverflow.estimateFigureSvgPx`)과 지면 컴포넌트가 같은 표를 읽는다.**
 * 예전에는 화면만 px 로 따로 적어(140/240/360) `wide` 가 종이(70mm = 264.57px)와
 * 36% 갈렸고, HWPX 는 화면 쪽에 서 있었다. 자는 종이를 재는 물건이다.
 */
export const FIGURE_SVG_PRINT_MM: Record<FigureSvgSize, number> = {
  compact: 37,
  mid: 64,
  wide: 70,
  pair: FIGURE_SVG_PAIR_MM,
};

export function figureSvgFrameClass(svg: string): string {
  return FRAME[figureSvgSize(svg)];
}
