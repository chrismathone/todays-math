export const PAPER_COLORS = {
  ink: "#0E0E10",
  ink90: "#1F1F23",
  ink70: "#3A3A40",
  ink50: "#6B6B72",
  ink30: "#A0A0A8",
  ink15: "#D4D4D8",
  ink08: "#E8E8EB",
  paper: "#FFFFFF",
  paperWarm: "#FCFCF8",
  accentGold: "#A57F00",
} as const;

export const PAPER_FONTS = {
  /**
   * 🔴 **맨 앞이 자체 적재분이다** (2026-09-08). `var(--font-noto-serif-kr)` 는
   *    `src/app/fonts.ts` 가 `next/font/local` 로 싣고 루트 레이아웃이 얹는다.
   *    이것이 없으면 그 기계에 깔린 것이 지면을 정하고, 실측상 `Batang` 으로 떨어지면
   *    같은 글이 6~7% 넓어져 **자가 넘침을 놓친다**(UI-09).
   *
   * ⚠️ 뒤의 이름들을 지우지 마라 — 변수는 있는데 글꼴 파일이 안 실리면 그 목록이 길이다.
   *    🔴 **변수가 아예 없으면** 정의 안 된 `var()` 가 선언 전체를 무효로 만들어 목록도 안 쓰인다
   *    (부모의 글꼴을 물려받는다). Next 밖에서 그리는 자 `paperProbe` 는 그래서 변수를 직접 정의한다
   *    (`PAPER_FONT_CSS` · 2026-10-21).
   */
  serifKR:
    'var(--font-noto-serif-kr), "KoPubBatang", "Nanum Myeongjo", "Noto Serif KR", "Batang", serif',
  sansKR: 'Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
} as const;

export const A4_DIMENSIONS = {
  widthMm: 210,
  heightMm: 297,
  widthPx: 794,
  heightPx: 1123,
} as const;

/**
 * 지면 문항 열 폭 — 210mm 지면에서 좌우 패딩(50px×2)과 그리드 gap(14px)을 뺀 뒤
 * `.problemItem` 의 1.15fr : 1fr 중 문항 열 몫. 약 364px.
 *
 * ⚠️ `.problemItem` 열 구성이나 `.jaseupFirst` 패딩을 바꾸면 이 값도 같이 바꿔야 한다.
 *
 * ⚠️ 같은 식이 `TestPrint.module.css` 의 `.paperParity { width }` 에도 적혀 있다.
 * CSS 변수로 합치려면 `PAPER_CSS_VARIABLES` 에 넣어야 하는데, 그러면
 * `PaperProblemView` 의 `style` 속성이 바뀌어 `renderParity` 잠금이 깨진다
 * (그 테스트는 "화면·지면이 실제로 달라졌다"는 신호라 갱신 대상이 아니다).
 * 그래서 값은 두 곳에 두되 `paperColumnWidth.test.ts` 가 둘이 같은지 잠근다.
 */
export const PAPER_COLUMN_WIDTH = "calc((210mm - 100px - 14px) * 1.15 / 2.15)";

/**
 * 문제은행 카드의 **폭**. 본문 열(위) + 카드 좌우 패딩(p-6 = 24px×2) + 테두리(1px×2).
 *
 * ⚠️ 하한이 아니라 **고정값**이다 (원장님 지시 2026-08-19: 「문제 공간은 고정시켜 …
 * 창 크기에 따라서 그냥 3열 4열 이렇게만 바뀌면 되고」). 종전에는 `minmax(…, 1fr)` 로
 * 열이 남는 폭만큼 늘어났는데, **본문은 지면과 같은 폭으로 고정**이라(`.paperParity`)
 * 늘어난 만큼이 카드 오른쪽의 **빈칸**이 됐다 — 2단일 때 카드 600px 에 본문 364px.
 * 이제 트랙 폭을 이 값으로 박고 **열 수만** 바뀐다.
 *
 * 너무 좁은 창에서는 `min(100%, …)` 가 1단으로 떨어뜨린다(가로 스크롤 대신).
 */
export const PROBLEM_CARD_WIDTH = `calc(${PAPER_COLUMN_WIDTH} + 50px)`;

/**
 * 지면 CSS 변수 — A4Page(인쇄)와 PaperProblemView(화면 지면 틀)가 같은 값을 쓴다.
 * 한쪽만 바꾸면 화면과 인쇄물이 갈라지므로 반드시 여기서만 정의한다.
 */
export const PAPER_CSS_VARIABLES = {
  "--a4-width": `${A4_DIMENSIONS.widthMm}mm`,
  "--a4-height": `${A4_DIMENSIONS.heightMm}mm`,
  "--paper-color": PAPER_COLORS.paper,
  "--paper-warm": PAPER_COLORS.paperWarm,
  "--paper-ink": PAPER_COLORS.ink,
  "--paper-gold": PAPER_COLORS.accentGold,
  "--paper-font-serif": PAPER_FONTS.serifKR,
  "--paper-font-sans": PAPER_FONTS.sansKR,
} as const;
