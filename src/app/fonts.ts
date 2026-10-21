import localFont from "next/font/local";

// Pretendard 가변 폰트 — D-29 디자인 확정 서체.
// 파일 출처: eywa_refactoring(원장님 본인 프로젝트) public/fonts/PretendardVariable.woff2를
// 그대로 복사. OFL 라이선스 폰트이며 동봉 LICENSE 파일은 원본 위치에 없었음(보고 대상).
export const pretendard = localFont({
  src: "../../public/fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  style: "normal",
  display: "swap",
  preload: true,
  // 폰트 로딩 실패/지연 시 폴백. "Malgun Gothic"은 Windows 기본 서체로 남겨
  // globals.css:57의 기존 폴백 순서(D-29 이전)와 호환한다.
  fallback: [
    "-apple-system",
    "BlinkMacSystemFont",
    "system-ui",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    "Malgun Gothic",
    "sans-serif",
  ],
});

/**
 * 시험지 지면 명조 — **자체 적재** (UI-09 후속, 2026-09-08).
 *
 * ## 왜 실었나 — 「깨져 보인다」가 아니라 「기계마다 다르다」
 *
 * 2026-09-07 실측(`scripts/qa/measure-paper-font.tsx`): 이 PC 는 스택이 **Noto Serif KR**
 * 로 풀린다. 그런데 그 글꼴은 **Windows 기본 설치에 없다.** 없는 기계는 `Batang` 으로
 * 떨어지고, 실측하면 같은 글이 **6.1~7.1% 넓어져** 표본 4개 중 1개가 2줄 → 3줄이 된다.
 * 자(`estimateProblemPx`·넘침 판정)는 **이 PC 의 글꼴로 눈금을 맞추므로**, 다른 기계에서는
 * 자가 그대로인데 지면만 커져 **넘침을 놓친다** — 정답지는 `overflow:hidden` 이라
 * 해설이 잘리는 게 아니라 **통째로 사라진다.**
 *
 * ## 🔴 이 PC 에서는 **한 픽셀도 안 바뀐다** — 재서 확인했다
 *
 * 실은 것이 **이 PC 에 깔린 그 파일을 자른 것**이라 자형·너비가 같다. 실측:
 * 본문 400 에서 **0.00px**, 굵게 800 에서 0.02px(반올림). 곧 이 변경의 효과는
 * 「없던 기계가 이 PC 와 같아진다」 하나뿐이다.
 *
 * ## 자르기와 라이선스
 *
 * 원본 `NotoSerifKR-VF.ttf` 23.8MB → 부분집합 woff2 **1.77MB**(이미 싣고 있는
 * Pretendard 1.96MB 보다 작다). 한글 음절 전체 + 라틴 + 문장부호 + 원문자 + 일부 기호,
 * 가변 굵기 100–900(지면이 **700·800 을 실제로 쓴다** — `.dateValue` 700 ·
 * `.questionNumber` 800). SIL OFL 1.1 이라 자체 적재가 허용되고, 고지는
 * `public/fonts/NotoSerifKR-OFL.txt` 에 **글꼴 자신의 name 테이블에서 뽑아** 두었다.
 *
 * ⚠️ **절대 규칙 6 — 아직 종이로 검수하지 않았다.** `/dev/print-check` 에 항목을 세웠다.
 * ⚠️ 자(`paperProbe`)는 Next 밖에서 그리므로 이 변수를 **직접 정의하고 같은 파일을 싣는다**
 *    (`scripts/qa/paperProbe.tsx` 의 `PAPER_FONT_CSS`). 🔴 2026-10-21 까지는 안 그랬다 — 정의 안 된
 *    `var()` 는 선언 전체를 무효로 만들어 스택의 다음 이름으로 넘어가지 않으므로, 자는 브라우저 기본
 *    서체로 쟀다(«시스템에 깔린 같은 글꼴로 떨어진다»는 이 자리의 옛 가정은 틀렸다).
 */
export const notoSerifKR = localFont({
  src: "../../public/fonts/NotoSerifKR-subset.woff2",
  variable: "--font-noto-serif-kr",
  weight: "100 900",
  style: "normal",
  display: "block",
  preload: false,
});
