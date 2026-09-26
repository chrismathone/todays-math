/**
 * KaTeX 입력 사전 정규화 — 한국 수학 콘텐츠에서 자주 깨지는 케이스를 보정.
 *
 * Ported from F:\mathlab\src\components\math\shared\text-preprocess.ts.
 * 모든 보정은 실제 한국 수학 콘텐츠에서 발견된 깨진 케이스를 기반으로 한다 —
 * 임의로 손대지 말 것.
 *
 * 남은 것은 **보이는 수식 한 개**의 정규화(`applyMathInnerNormalization` — 편집기 KaTeX 렌더가 부른다.
 * 편집 토큰의 원문은 안 바꾼다)와 〈보기〉·〈조건〉 평문 상자 묶기, 이미지 title 파싱이다.
 *
 * 🔴 문서 단위 전처리(`preprocessMathText`·`repairProsePrefixedInlineMath`·`extractHangulFromMath`)는
 * 여기 사본이 규칙이 다른 채 남아 있었다(2026-09-26 걷음). 편집기 렌더러의 문서 단위 복구는 편집 토큰이
 * 있든 없든 입구 후보정 한 함수를 수식 밖에만 거는 `sourceRepair.ts` 하나다.
 *
 * `parseImageTitle`은 마크다운 이미지의 title slot에서 `width%`/`align` 파라미터를
 * 뽑는다 — `![alt](url "50% center")` 패턴.
 */

import { uprightMeasurementUnits } from "./measurementUnits";

/** 마크다운 이미지 title 파싱: "50% center" → { width: '50%', align: 'center' }. */
export const parseImageTitle = (
  title: string | undefined,
): { width?: string; align?: string } => {
  if (!title) return {};
  const parts = title.trim().split(/\s+/);
  let width: string | undefined;
  let align: string | undefined;
  for (const part of parts) {
    if (part.endsWith("%")) {
      const num = parseInt(part);
      if (num >= 10 && num <= 100) width = `${num}%`;
    } else if (["left", "center", "right"].includes(part)) {
      align = part;
    }
  }
  return { width, align };
};

/** KaTeX Main-Regular 폰트에 없는 유니코드 → LaTeX 명령어. */
const UNICODE_MATH_MAP: Array<[RegExp, string]> = [
  [/℃/g, "{}^\\circ\\mathrm{C}"],
  [/℉/g, "{}^\\circ\\mathrm{F}"],
  [/Ω/g, "\\Omega"],
  [/Å/g, "\\mathrm{\\AA}"],
  [/㎡/g, "\\mathrm{m}^2"],
  [/㎥/g, "\\mathrm{m}^3"],
  [/㎝/g, "\\mathrm{cm}"],
  [/㎜/g, "\\mathrm{mm}"],
  [/㎞/g, "\\mathrm{km}"],
  [/㎏/g, "\\mathrm{kg}"],
];

/**
 * 모든 인라인 수식(`$...$`)에 `\displaystyle`을 자동 주입해 display 사이즈로
 * 그리도록 강제한다.
 *
 * 효과:
 *  - `\frac{a}{b}`: 분모/분자가 inline 모드에서 축소되는 기본 동작 차단 →
 *    교과서 분수처럼 큰 사이즈 유지.
 *  - `\sqrt`: 큰 사이즈로 그려짐(주로 내부 분수와 결합될 때 두드러짐).
 *  - `\int` / `\oint`: 적분 기호 자체가 키 큰 모양 (한국 교과서 표기).
 *    첨자는 KaTeX 기본대로 옆에 붙는 subscript/superscript 유지.
 *  - `\sum` / `\prod` / `\lim` / `\max` / `\bigcup`: 기호가 커지면서 동시에
 *    첨자가 아래/위에 쌓이는 limits 스타일로 자동 전환.
 *  - 일반 변수 `x`, `y`, 첨자 `x_1`, `x^2`: 거의 변화 없음 — display 모드에서도
 *    이런 단순 토큰은 inline과 같은 폰트/크기.
 *
 * 사용자가 명시적으로 `\textstyle` / `\scriptstyle` 등을 적었다면 그 directive를
 * 존중하고 건드리지 않는다.
 *
 * 한국 K-12 수학 콘텐츠 기준 — 분수가 인라인에서 작아져 가독성이 떨어지는
 * KaTeX 기본 동작이 사용자 경험과 안 맞는다는 피드백을 반영. mathlab도
 * 같은 처리를 한다.
 */
const HAS_STYLE_DIRECTIVE =
  /\\(?:displaystyle|textstyle|scriptstyle|scriptscriptstyle)\b/;

/**
 * 괄호 내용이 "키 큰" 라텍스 구조(`\int`, `\frac`, `\sum`, `\sqrt`, `\binom`
 * 등) 를 품을 때 자동으로 `\left(...\right)` / `\left\{...\right\}` 로
 * 감싸서 괄호 높이가 내용에 맞게 늘어나도록 한다. KaTeX 기본 `()` `\{\}`
 * 는 고정 높이라 안에 ∫·분수가 있으면 너무 작아 보인다.
 *
 * 처리 대상: `( ... )`, `\{ ... \}`. `[ ... ]` 는 `\sqrt[n]{}` 와 같이 옵션
 * 인자로 자주 쓰여 위험하므로 건드리지 않음.
 *
 * 알고리즘: brace 균형을 맞춰 매칭되는 쌍을 찾고, 내부에 TALL_CMDS 패턴이
 * 들어 있으면 wrap. 중첩된 경우 재귀로 안쪽부터 처리해서 모든 단계에서
 * 사이즈가 맞도록 한다. 이미 `\left/\right` 가 명시된 부분은 다시 wrap
 * 하지 않는다 (regex로 매치 안 됨).
 */
const TALL_CMDS =
  /\\(?:int|iint|iiint|oint|sum|prod|coprod|frac|dfrac|tfrac|cfrac|sqrt|binom|dbinom|tbinom|lim|limsup|liminf|bigcup|bigcap|bigvee|bigwedge|bigoplus|bigotimes)\b/;

const findMatchingClose = (
  s: string,
  startIdx: number,
  openLen: number,
  openTest: (s: string, i: number) => boolean,
  closeTest: (s: string, i: number) => boolean,
): number => {
  let depth = 1;
  let j = startIdx + openLen;
  while (j < s.length) {
    if (openTest(s, j)) {
      depth++;
      j += openLen;
      continue;
    }
    if (closeTest(s, j)) {
      depth--;
      if (depth === 0) return j;
      j += openLen;
      continue;
    }
    j++;
  }
  return -1;
};

const autoSizeBrackets = (math: string): string => {
  let out = "";
  let i = 0;
  const len = math.length;
  while (i < len) {
    // `( ... )` 짝
    if (math[i] === "(") {
      const close = findMatchingClose(
        math,
        i,
        1,
        (s, k) => s[k] === "(",
        (s, k) => s[k] === ")",
      );
      if (close > i) {
        const inner = math.slice(i + 1, close);
        const needsSize = TALL_CMDS.test(inner);
        const processedInner = autoSizeBrackets(inner);
        out += needsSize
          ? `\\left(${processedInner}\\right)`
          : `(${processedInner})`;
        i = close + 1;
        continue;
      }
    }
    // `\{ ... \}` 짝 (visible curly braces in math)
    if (math[i] === "\\" && math[i + 1] === "{") {
      const close = findMatchingClose(
        math,
        i,
        2,
        (s, k) => s[k] === "\\" && s[k + 1] === "{",
        (s, k) => s[k] === "\\" && s[k + 1] === "}",
      );
      if (close > i) {
        const inner = math.slice(i + 2, close);
        const needsSize = TALL_CMDS.test(inner);
        const processedInner = autoSizeBrackets(inner);
        out += needsSize
          ? `\\left\\{${processedInner}\\right\\}`
          : `\\{${processedInner}\\}`;
        i = close + 2;
        continue;
      }
    }
    out += math[i];
    i++;
  }
  return out;
};

const injectDisplayStyle = (inner: string): string => {
  if (HAS_STYLE_DIRECTIVE.test(inner)) return inner;
  // 완전히 빈 식 ("$ $" 등)에는 굳이 주입할 필요 없음.
  if (!inner.trim()) return inner;
  return `\\displaystyle ${inner}`;
};

// §대분수 — **가분수를 대분수로 바꾸는 규칙(`improperToMixed`)이 여기 있었고, 지웠다**
// (2026-09-19). 이 파일은 2026-09-14 원본 편집기를 옮겨 오며(`c0bf4551`) 08-24 에 규칙을
// 뺀 `src/lib/math/textPreprocess.ts` 가 아니라 그 전 판을 가져왔다. 그래서 편집기 렌더러가
// 학년과 상관없이 — 중1·고1 도 — `\frac{10}{3}` 을 3⅓ 로, 355/5 를 71 로 그렸다.
// 렌더러는 학년을 모른다. 초등 대분수는 보여 주는 쪽이 **한 함수**로 한다:
// `src/components/unified/fractionDisplay.ts` (`fractionViewFor` — 문항 하나에 한 번 정한다).
// 지키는 검사: `src/__tests__/unit/mixedNumberPolicy.test.ts` «편집기 렌더러도…».

/**
 * 인접 박스 행 auto-split harness — 사용자 보고 (2026-05-27, CLAUDE.md §26-6).
 *
 * 원본에 *분리된 N 개 박스* `[A][B][C][D]` (순열·배치 문제의 자리 표시) 인데
 * OCR 이 한 박스로 합쳐서 `\boxed{ABCD}` 로 emit 하는 케이스. OCR_PAGE_PROMPT
 * 의 4d-2 룰만으로 100% 차단 어려워 *후처리 안전망* 으로 자동 분리.
 *
 * **보수적 휴리스틱** — false positive 위험 최소화:
 *  - **2-6 개 연속 *순수 대문자 라틴* 만** 매치 (`\boxed{ABCD}`, `\boxed{XY}`).
 *  - 소문자 (`\boxed{xy}` = 변수 곱, 미적용), 숫자 (`\boxed{42}` = 단일 답, 미적용),
 *    연산자·LaTeX 명령어 (`\boxed{A+B}`, `\boxed{\phantom{0}}`) 포함 시 미적용.
 *  - 1 글자 (`\boxed{X}`) 는 이미 정상 — 미적용.
 *  - 7+ 글자 (`\boxed{ANSWER}`) 는 단어/약자 가능성 — 미적용.
 *
 * 결과: `\boxed{ABCD}` → `\boxed{A}\boxed{B}\boxed{C}\boxed{D}`
 *
 * **호출 순서 주의**: `uprightGeometryLabels` 이전에 실행 — uprightGeometry 가
 * `\boxed{A}` 의 단일 A 를 `\mathrm{A}` 로 wrap 한 *후* 에는 정규식 매치 안 됨.
 */
const splitMultiLetterBoxed = (math: string): string =>
  math.replace(/\\boxed\{([A-Z]{2,6})\}/g, (_match, letters: string) =>
    letters
      .split("")
      .map((ch) => `\\boxed{${ch}}`)
      .join(""),
  );

/**
 * 모델이 자주 emit 하는 malformed LaTeX 패턴을 정리 — KaTeX 가 통째로
 * 에러 fallback (빨간 텍스트) 으로 가는 걸 막는다. 사용자 보고 (14번, 8번):
 * `\left\left\{ ... \right\right\}` 가 통째로 빨간 raw 로 노출. KaTeX 는
 * `\left` 다음에 *단일* 구분자를 기대 — `\left` 자체가 명령이라 "Expected
 * delimiter, got \\left" 로 에러. 정상화: 중복된 `\left` / `\right` 를 하나로.
 *
 * Module-level export — `protectLooseLatex` (sanitize.ts) 의 line-level
 * pre-wrap, preprocessMathText 의 `$...$` inner 처리, Step 9 auto-wrap,
 * 그리고 MarkdownRenderer 의 renderKatex final guard 모두에서 호출. 한
 * 군데서만 적용하면 path 가 다를 때 leak 됨.
 */
export const cleanMalformedLatex = (s: string): string =>
  // 모델이 수학 토큰을 \text{} 로 (중첩까지) 잘못 감싼 것 먼저 벗긴다 (아래 정의).
  unwrapBogusTextWrappers(s)
    // 중복 명령어 (\left\left, \right\right, \frac\frac, \sqrt\sqrt) → 단일화
    .replace(/\\left(?=\\left\b)/g, "")
    .replace(/\\right(?=\\right\b)/g, "")
    // 크기 구분자(\big \Big \bigg \Bigg + 옵션 l/r/m)가 \left/\right 앞에 붙은
    // 모델 typo → 크기 구분자 제거. KaTeX 는 \left 다음에 *단일 구분자* 만
    // 받으므로 `\Bigl\left(` 는 "Expected delimiter" 에러 → 빨간 raw 노출
    // (사용자 보고 2026-06-03: `\Bigl\left(...\Bigr\right)`). 기존엔 소문자
    // `\bigl?` 만 처리해서 대문자 `\Bigl` / `\bigg` / `\Bigg` 가 그대로 leak.
    .replace(/\\(?:bigg?|Bigg?)[lrm]?(?=\\(?:left|right)\b)/g, "")
    .replace(/\\frac(?=\\frac\b)/g, "")
    .replace(/\\sqrt(?=\\sqrt\b)/g, "")
    .replace(/\\boxed(?=\\boxed\b)/g, "")
    // 물결표 / 근사 등호 (`\approx`, `≈`) → `=` — 사용자 보고: 물결표 금지.
    .replace(/\\approx\b/g, "=")
    .replace(/≈/g, "=")
    // 빈 분수 `\frac{a}{}` → `\frac{a}{1}` (KaTeX parse error 방지)
    .replace(/\\frac\{([^{}]*)\}\{\}/g, "\\frac{$1}{1}")
    // 빈 분수 `\frac{}{b}` → `\frac{0}{$1}` (드물지만 발생)
    .replace(/\\frac\{\}\{([^{}]*)\}/g, "\\frac{0}{$1}")
    // escaped delimiter typo: `\left\(` / `\left\)` 같이 escape 된 `(` `)` →
    // 그냥 `\left(` `\left)`. 모델이 자주 over-escape 함.
    .replace(/\\left\\\(/g, "\\left(")
    .replace(/\\right\\\)/g, "\\right)")
    .replace(/\\left\\\[/g, "\\left[")
    .replace(/\\right\\\]/g, "\\right]")
    // spacing 중복: `\;\;\;` / `\,\,\,` / `\quad\quad` → 단일화
    .replace(/(\\;){2,}/g, "\\;")
    .replace(/(\\,){2,}/g, "\\,")
    .replace(/(\\quad){2,}/g, "\\quad")
    .replace(/(\\qquad){2,}/g, "\\qquad");

/**
 * `$...$` / `$$...$$` inner 에 적용할 정규화 묶음 — 모든 wrap path 에서
 * 동일한 변환을 거치도록 한 군데에 모음.
 *
 *  1) cleanMalformedLatex (모델 typo 정리)
 *  2) 유니코드 수학기호 → LaTeX 명령어
 *  3) (없음) — 예전에 여기서 «정수 가분수 → 대분수» 를 했다. 뺐다: 위 §대분수
 *  4) uprightGeometryLabels (점 라벨 직립 Roman)
 *  5) autoSizeBrackets (분수/적분 포함 괄호를 `\left/\right` 로)
 *  6) **`\frac` → `\dfrac` 업그레이드** — 한국 교과서 룰: 인라인 모드에서도
 *     모든 분수가 *같은 displaystyle 크기*. 사용자 보고: 한 식 안에 인라인
 *     `\frac` 와 디스플레이 `\frac` 가 섞여 들쭉날쭉. KaTeX 0.16.35 + 번들
 *     woff2 폰트 환경에서 `\dfrac` 정상 작동 → 강제 업그레이드가 가장 강력한
 *     fix. `\tfrac` (textstyle 강제) 는 모델이 *명시 의도* 한 경우라 보존.
 *  7) injectDisplayStyle (보조 안전망 — `\sum`, `\int`, `\lim` 같은 큰
 *     연산자가 있는 식 + dfrac 안 쓰이는 외부 식에도 displaystyle 보장)
 */
export const applyMathInnerNormalization = (inner: string): string => {
  let s = cleanMalformedLatex(inner);
  // 중첩 delimiter 방어 (사용자 보고 2026-06-02): 모델이 `$$...$$` 안에 `$...$`
  // 를 중첩하거나(예: `$$\n$\displaystyle ...$\n$$`) delimiter 가 leak 되면
  // inner 에 unescaped `$` 가 남는다. KaTeX math 모드에서 `$` 는 무효 → 통째
  // 빨간 에러로 raw 노출(사용자가 "raw LaTeX 노출"로 오인). 제거한다.
  // `\$` (의도된 리터럴 달러 기호) 는 보존.
  s = s.replace(/(?<!\\)\$/g, "");
  for (const [re, repl] of UNICODE_MATH_MAP) s = s.replace(re, repl);
  s = uprightMeasurementUnits(s);
  // ⚠️ **가분수를 대분수로 바꾸지 않는다** — 위 §대분수. 학년을 아는 쪽이 한다.
  // 인접 박스 행 안전망 — `\boxed{ABCD}` → `\boxed{A}\boxed{B}\boxed{C}\boxed{D}`.
  // uprightGeometryLabels *이전* 에 호출 — \mathrm{} wrap 후엔 매치 안 됨.
  s = splitMultiLetterBoxed(s);
  s = uprightGeometryLabels(s);
  s = autoSizeBrackets(s);
  // 6) `\frac` → `\dfrac` 강제 업그레이드.
  //    - `(?![a-zA-Z])` lookahead 로 `\fraction` 같은 가상 명령에 안 걸리게.
  //    - `\tfrac` / `\cfrac` 는 매치 안 함 (모델 명시 의도 보존).
  s = s.replace(/\\frac(?![a-zA-Z])/g, "\\dfrac");
  s = injectDisplayStyle(s);
  // 7) **최종 안전망 — 이 함수의 출력은 *항상* KaTeX-safe** (사용자 보고
  //    "후보정 한번씩 덜됨" 2026-06-03). autoSizeBrackets 가 모델이 이미 emit
  //    한 `\left(...\right)` 를 `\left\left(...\right\right)` 로 이중 wrap 할 수
  //    있는데, 그 정리를 downstream guard(Step 10 / renderKatex)에 의존하면 그
  //    guard 가 없는 path(KaTeXInline 등)에서 빨간 글씨로 leak. 함수 끝에서 한
  //    번 더 cleanMalformedLatex → 어떤 caller 든 자기완결적으로 깨끗.
  s = cleanMalformedLatex(s);
  return s;
};

/**
 * 기하 표기에서 점 이름을 직립(Roman)으로 강제.
 *
 * 배경: 한국 교과서 / 수능 시험지에서 점·도형·선분·호 표기는 안의 라틴
 * 대문자가 점 *이름*이지 변수가 아니다 — italic이 아닌 직립 Roman으로
 * 그려야 한다 (텍스트북 조판 관행). KaTeX 기본은 math italic이라
 * 그대로 두면 "점 A"의 A가 비스듬히 기울어진다.
 *
 * 세 가지 패턴을 처리:
 *
 * **(1) 오버레이 명령어** — `\overline` / `\overrightarrow` /
 *      `\overleftarrow` / `\overleftrightarrow` / `\widehat` / `\widetilde`
 *      / `\vec` / `\dot` / `\ddot` 안의 라벨.
 *      - `\overline{AB}` → `\overline{\mathrm{AB}}` ✓
 *
 * **(2) 도형 접두사** — `\triangle` / `\square` / `\angle` /
 *      `\measuredangle` / `\sphericalangle` 뒤에 오는 라벨.
 *      - `\triangle ABC` → `\triangle \mathrm{ABC}` ✓
 *      - `\angle ABC` → `\angle \mathrm{ABC}` ✓
 *
 * **(3) 호(arc) 정규화** — 한국 교과서의 호 기호는 *내용 폭만큼 가로로 늘어나는
 *      얕고 부드러운 돔 곡선* (⌒). KaTeX 내장 accent로는 못 그린다:
 *        - `\widehat{}`은 hat(^) 모양
 *        - `\overset{\frown}{}`은 작은 글자 ⌢ 한 개만 얹음
 *        - `\overgroup{}`은 V자 꺾이는 각 모양
 *
 *      유일한 방법은 KaTeX의 `\htmlClass{cls}{content}` 확장으로 출력 span에
 *      클래스를 달고, CSS `border-radius`로 부드러운 호 곡선을 위에 그리는 것.
 *      `prerenderAllKatex`는 KaTeX 호출 시 `trust: cmd => cmd === "\\htmlClass"`를
 *      넘겨 이 확장만 허용.
 *
 *      그래서 `\widehat{XY}` / `\overset{\frown}{XY}`가 2글자 이상 대문자
 *      라벨일 때는 `\htmlClass{geom-arc-wrap}{\mathrm{XY}}`로 치환한다.
 *      CSS `.geom-arc-wrap`이 위에 ⌒ 곡선을 그려준다.
 *      - `\widehat{AB}` → `\htmlClass{geom-arc-wrap}{\mathrm{AB}}` ✓
 *      - `\overset{\frown}{ABC}` → `\htmlClass{geom-arc-wrap}{\mathrm{ABC}}` ✓
 *      - `\widehat{x}` → 그대로 (소문자 — 통계 estimator 등)
 *      - `\widehat{A}` → `\widehat{\mathrm{A}}` (단일 대문자 — 호가 아닌 hat accent)
 *
 * **(4) 단독 대문자 라벨** — `$...$` 안의 전체 내용이 대문자 라틴 글자
 *      (+ 옵션 prime)만으로 구성된 경우. 점·원·도형 라벨이 단독으로 등장한
 *      경우 ("점 $A$", "원 $O$", "사각형 $ABCD$" 등) 모두 직립 Roman으로.
 *      - `A` → `\mathrm{A}` ✓
 *      - `ABCD` → `\mathrm{ABCD}` ✓
 *      - `A'` → `\mathrm{A'}` ✓
 *
 * 휴리스틱은 보수적으로 — 대문자만, 라틴, prime 한정. `x`, `x+y`, `A_1`,
 * `A^2` 류는 모두 변수로 간주해 그대로 둔다. (`A_1`은 점-with-index일
 * 수도 있지만 false positive 위험이 더 커서 패스.)
 */
// `widehat`과 `vec`은 일반 오버레이 목록에서 제외 — 둘 다 특수 처리 (호와
// 다중자 벡터)가 필요해서 아래 따로 처리한다.
const GEOMETRY_OVERLAY_COMMANDS =
  "overline|overrightarrow|overleftarrow|overleftrightarrow|widetilde|dot|ddot";
const GEOMETRY_LABEL_REGEX = new RegExp(
  `\\\\(${GEOMETRY_OVERLAY_COMMANDS})\\{\\s*([A-Z][A-Z']*)\\s*\\}`,
  "g",
);

const FIGURE_PREFIX_COMMANDS =
  "triangle|square|angle|measuredangle|sphericalangle";
const FIGURE_PREFIX_REGEX = new RegExp(
  `\\\\(${FIGURE_PREFIX_COMMANDS})(?![a-zA-Z])\\s*([A-Z][A-Z']*)`,
  "g",
);

// 호 패턴: \widehat{AB}, \overset{\frown}{AB} (2자 이상 대문자만)
const ARC_WIDEHAT_REGEX = /\\widehat\{\s*([A-Z][A-Z']+)\s*\}/g;
const ARC_FROWN_OVERSET_REGEX =
  /\\overset\{\s*\\frown\s*\}\{\s*([A-Z][A-Z']+)\s*\}/g;
// 단일 대문자 \widehat — 호가 아니라 일반 hat accent 의도. \mathrm만 적용.
const SINGLE_HAT_REGEX = /\\widehat\{\s*([A-Z]'*)\s*\}/g;

// 벡터 패턴:
//  - \vec{AB} (2자 이상 대문자) → \overrightarrow{\mathrm{AB}}
//    (\vec 은 단일 문자용 좁은 화살표라 폭이 안 늘어남 — 벡터 AB 표기는
//    한국 교과서 관례상 두 점 위에 길게 늘어나는 화살표여야 한다)
//  - \vec{A} (단일 대문자) → \vec{\mathrm{A}} (Roman + 좁은 화살표 유지)
//  - \vec{v} (소문자) → 그대로 (변수 벡터, 좁은 화살표 그대로)
const VEC_MULTI_REGEX = /\\vec\{\s*([A-Z][A-Z']+)\s*\}/g;
const VEC_SINGLE_UPPER_REGEX = /\\vec\{\s*([A-Z]'*)\s*\}/g;

const PURE_LABEL_REGEX = /^\s*([A-Z][A-Z']*)\s*$/;

const uprightGeometryLabels = (inner: string): string => {
  let out = inner;
  // (3a) 호 케이스 먼저 — \widehat 2글자+ 와 \overset{\frown}{}를 \overgroup으로 통합.
  //     단일 대문자는 호가 아니라 hat accent로 간주해 \mathrm만 wrap.
  out = out.replace(
    ARC_WIDEHAT_REGEX,
    (_m, label: string) => `\\htmlClass{geom-arc-wrap}{\\mathrm{${label}}}`,
  );
  out = out.replace(
    ARC_FROWN_OVERSET_REGEX,
    (_m, label: string) => `\\htmlClass{geom-arc-wrap}{\\mathrm{${label}}}`,
  );
  out = out.replace(
    SINGLE_HAT_REGEX,
    (_m, label: string) => `\\widehat{\\mathrm{${label}}}`,
  );
  // (3b) 벡터 케이스 — 다중자 \vec 은 \overrightarrow 로 승격 (폭 늘어남).
  //      단일 대문자 \vec 은 Roman만 적용. 두 정규식 모두 ARC 처리 후 실행해야
  //      \overset{\frown}{} 안의 \vec 에 잘못 매치되는 일을 피한다.
  out = out.replace(
    VEC_MULTI_REGEX,
    (_m, label: string) => `\\overrightarrow{\\mathrm{${label}}}`,
  );
  out = out.replace(
    VEC_SINGLE_UPPER_REGEX,
    (_m, label: string) => `\\vec{\\mathrm{${label}}}`,
  );
  // (1) 일반 오버레이 명령어.
  out = out.replace(
    GEOMETRY_LABEL_REGEX,
    (_m, cmd: string, label: string) => `\\${cmd}{\\mathrm{${label}}}`,
  );
  // (2) 도형 접두사 + 라벨.
  out = out.replace(
    FIGURE_PREFIX_REGEX,
    (_m, cmd: string, label: string) => `\\${cmd} \\mathrm{${label}}`,
  );
  // (4) 전체가 단독 대문자 라벨인 경우만 통째로 Roman 처리.
  const pure = out.match(PURE_LABEL_REGEX);
  if (pure) out = `\\mathrm{${pure[1]}}`;
  return out;
};

/* ───────────────────────────────────────────────────────────────────────────
 * 한글-수식 분리 — `$...$` / `$$...$$` 안에 섞인 한글을 prose 레벨로 떼어낸다.
 *
 * 모델(OCR·해설·변형)이 한글 설명어를 수식 안에 박는 사례가 잦다. 사용자
 * 보고(4번 해설 — 실제 출력):
 *   `$2ab^3 \times (\text{가운데}) \times A = 8a^6b^6$`
 * KaTeX 는 `\text{한글}` / raw 한글을 *math 컨텍스트 크기* 로 렌더 → 본문
 * prose 와 글씨 크기가 달라 "한글 크기가 제멋대로" 로 보인다.
 *
 * 해결: 한글 구간을 떼어 `$수식$한글$수식$` 형태로 재조립 → 한글이 본문
 * prose 폰트로 렌더돼 크기가 통일된다. **안전 구간만** 분리한다:
 *  - brace depth 0 — 첨자 `x_{한글}` · 분수 인자 `\frac{한글}{}` 안은 쪼개면
 *    구조가 깨지므로 제외.
 *  - `\left .. \right` 밖 — 안에서 쪼개면 `\left` 짝이 두 span 으로 분리돼
 *    KaTeX "Expected \right" 에러.
 *  - `\begin{}` 환경 없음 — cases/array 내용은 depth 0 라 잘못 쪼개지므로
 *    한글이 있어도 그 span 전체를 통째로 건드리지 않는다.
 * 위 위험 구간의 한글은 그대로 두고 프롬프트에서 별도 방어한다 (v1 한계).
 * ─────────────────────────────────────────────────────────────────────────── */

/** 한글 음절 + 자모. 수식 안에 있으면 분리 트리거. */
const HANGUL_CHAR = /[가-힣ㄱ-ㅎㅏ-ㅣ]/;

/** `\text{}` 류 텍스트 래퍼 여는 부분 — 모델이 한글 설명어를 감쌀 때 쓰는 형태. */
const TEXT_WRAPPER_OPEN =
  /^\\(?:textnormal|textrm|textbf|textit|textsf|textsc|text|mathrm|mathbf|mathsf|mbox|hbox)\s*\{/;

/** `openIdx`(`{`)에 매칭되는 `}` 인덱스. `\{` `\}` escape 는 건너뜀. 못 찾으면 -1. */
const findBraceClose = (s: string, openIdx: number): number => {
  let depth = 0;
  for (let k = openIdx; k < s.length; k++) {
    const c = s[k];
    if (c === "\\") {
      k++; // escape — 다음 글자 소비
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
};

/**
 * 모델이 수학 토큰을 `\text{}` 로 (심하면 여러 겹 중첩까지) 잘못 감싼 것을 푼다.
 *
 * 사용자 보고 (3번 문제): gemini-3-flash-preview 가 `(` · `\dots` · `\dot{c}`
 * 를 `\text{\text{\text{\text{(}}}}` 처럼 4 중 `\text{}` 로 감싸 emit. KaTeX 는
 * `\text{}` 안의 `\dot`·`\left` 등을 못 그려 통째로 빨간 에러 fallback. 게다가
 * `autoSizeBrackets` 가 `\text{(}` 의 `(` 를 `\left(` 로 바꿔 더 악화시킨다.
 *
 * 규칙: `\text{}` (및 `\textrm`/`\mathrm` 등) 의 내용을 *먼저 재귀 처리* 한 뒤,
 * 내용이 한글이 아니고 (a) 백슬래시 명령으로 시작하거나 (b) 단일 구분자
 * (`( ) [ ] |`) 이면 → 래퍼를 벗긴다 (중첩은 재귀로 자연히 collapse). 내용이
 * prose (글자·숫자·한글로 시작) 면 래퍼 유지 — `\text{cm}` 같은 정상 단위 보존.
 *
 * `cleanMalformedLatex` 의 첫 단계로 호출 — 모든 wrap path 에서 일관 적용.
 */
const unwrapBogusTextWrappers = (s: string): string => {
  // 래퍼가 아예 없으면 char 순회 생략 (fast path).
  if (!/\\(?:text|math[rbs]|mbox|hbox)/.test(s)) return s;
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] === "\\") {
      const wm = s.slice(i).match(TEXT_WRAPPER_OPEN);
      if (wm) {
        const braceOpen = i + wm[0].length - 1; // 여는 `{`
        const close = findBraceClose(s, braceOpen);
        if (close > braceOpen) {
          // 내용 먼저 재귀 처리 → 중첩 `\text` 가 안쪽부터 collapse.
          const inner = unwrapBogusTextWrappers(s.slice(braceOpen + 1, close));
          const t = inner.trim();
          const bogus =
            !HANGUL_CHAR.test(inner) &&
            (t.startsWith("\\") || /^[()[\]|]$/.test(t));
          out += bogus ? inner : `${wm[0]}${inner}}`;
          i = close + 1;
          continue;
        }
      }
    }
    out += s[i];
    i++;
  }
  return out;
};

/* ───────────────────────────────────────────────────────────────────────────
 * `<조건>` / `<보기>` 평문 블록 → blockquote 박스 (사용자 보고 2026-06-04).
 *
 * 모델이 조건·보기 박스를 markdown blockquote (`> ` prefix) 로 emit 하면
 * MarkdownRenderer 의 blockquote 컴포넌트가 테두리 박스로 그린다. 그런데 `>`
 * 없이 *평문* 으로 흘리면(헤더+항목이 그냥 줄로) 박스 없이 흩어진다 — 사용자가
 * 본 "박스 밖으로 나온 조건". 후처리에서 헤더+항목을 전부 `> ` 로 정규화해
 * *한 박스* 로 보장한다. (렌더 시점 처리라 기존 시험지도 다시 열면 적용.)
 *
 * 헤더는 `<조건>` 또는 `&lt;조건&gt;` (sanitize 가 `<`/`>` 를 entity 로 escape
 * 한 형태) 둘 다 인식. 재작성 시 `&lt;조건&gt;` (escaped) 로 통일 — raw `<조건>`
 * 이 rehype-raw 에서 unknown tag 로 사라지는 것 방지(텍스트 라벨 보존).
 *
 * 보수적 트리거 (false positive 최소화):
 *  - 헤더 줄 *전체* 가 `<조건>`/`<보기>` (공백·cols·entity 허용) 여야 함.
 *  - 뒤따르는 항목이 (가)/(ㄱ)/ㄱ./①/1. 마커로 시작하는 연속 줄 *1 개 이상*.
 *  - 이미 블록 전체가 `>` 면 손대지 않음(현재 잘 그려지는 박스 보존).
 * ─────────────────────────────────────────────────────────────────────────── */
const COND_BOX_HEADER_RE =
  /^\s*(?:>\s?)?(?:<|&lt;)\s*(조\s*건|보\s*기)(?::cols=(?:auto|[123]))?\s*(?:>|&gt;)\s*$/;
const COND_BOX_ITEM_RE =
  /^\s*(?:>\s?)?(?:\([가-힣ㄱ-ㅎ]\)|[ㄱ-ㅎ]\.|[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.)])/;

export const wrapBareConditionBoxes = (content: string): string => {
  if (!/(?:<|&lt;)\s*(?:조\s*건|보\s*기)/.test(content)) return content; // fast path
  const lines = content.split("\n");
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    const hm = lines[i].match(COND_BOX_HEADER_RE);
    if (!hm) continue;
    // 헤더 다음 연속 항목 줄 수집.
    let j = i + 1;
    while (j < lines.length && COND_BOX_ITEM_RE.test(lines[j])) j++;
    if (j === i + 1) continue; // 항목 없음 → 박스로 묶을 의미 없음.
    // 헤더+항목이 *전부 이미* blockquote 면 현재 박스가 정상 — 건드리지 않음.
    if (lines.slice(i, j).every((l) => /^\s*>/.test(l))) {
      i = j - 1;
      continue;
    }
    const kind = hm[1].replace(/\s+/g, ""); // "조건" | "보기"
    lines[i] = `> &lt;${kind}&gt;`; // 헤더 — escaped 라벨 통일.
    for (let k = i + 1; k < j; k++) {
      lines[k] = /^\s*>/.test(lines[k])
        ? lines[k]
        : `> ${lines[k].replace(/^\s+/, "")}`;
    }
    changed = true;
    i = j - 1;
  }
  return changed ? lines.join("\n") : content;
};
