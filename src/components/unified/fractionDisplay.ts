/**
 * Presentation only: raw bank/source strings never change.
 *
 * 초등 가분수를 대분수로 **보여 주는** 유일한 자리다 — 화면·인쇄·PDF·HWPX 가 모두 이것을
 * 부른다(원장님 2026-09-19 «모든 화면이 일치하도록»). 렌더러(편집기·지면 전처리)는 학년을
 * 몰라 바꾸지 않는다(`mixedNumberPolicy.test.ts`). 편집 칸은 원문 그대로다.
 */

/**
 * 대분수 결정에 드는 한 문항의 글 — **본문·정답·해설 셋 다** 넘긴다.
 *
 * 🔴 키를 옵셔널로 만들지 말 것. 한 화면이 해설을 안 넘기면 그 화면만 다른 결정을 내려
 *    같은 문항이 화면마다 다른 수로 보인다(원장님 2026-09-19 «항상 뷰는 통일이야»).
 *    값이 없으면 `null` 을 적어 «없다»를 밝힌다. 학년을 모르면 `""` — 원문 그대로다.
 */
export interface FractionViewProblem {
  grade: string | null | undefined;
  content: string;
  answer: string | null | undefined;
  solution: string | null | undefined;
}

/**
 * 대분수로 보일지를 **문항 하나에 한 번** 정하고, 그 문항의 글(본문·정답·해설·보기)마다 쓸
 * 변환을 돌려준다(원장님 2026-09-19 «항상 뷰는 통일이야»).
 *
 * - 초등이 아니거나 학년을 모르면 → 문항 전체 원문.
 * - 문항의 어느 글이든 분수의 이름(가분수·대분수·진분수)을 부르면 → 문항 전체 원문.
 *   바꾸기·가르기 문제(«대분수를 가분수로 나타낸 수»)도, «가분수는 그대로 두고» 같은 해설
 *   단계도 이 한 줄에 걸린다. 한 글만 원문으로 두면 본문 «3½ ÷ 2/3» · 해설 «7/2×3/2» 처럼
 *   한 문항 안에서 수가 갈렸다(트랙 12 판 — 초등 엔진 1,380문항 중 3문항).
 * - 아니면 → 문항 전체 대분수. 뜻을 깨는 한 식(«X=X» 등식·거듭제곱·붙은 항)만 식 단위로
 *   원문을 둔다.
 */
export function fractionViewFor(
  problem: FractionViewProblem,
): (text: string) => string {
  if (!/^(초|elementary)/i.test(problem.grade ?? "")) return keep;
  const texts = [problem.content, problem.answer, problem.solution];
  if (texts.some((text) => text && NAMES_KIND.test(text))) return keep;
  return toMixedFractions;
}

const NAMES_KIND = /가분수|대분수|진분수/;

const keep = (text: string) => text;

/** 식 단위 변환 — 문항 단위 결정(`fractionViewFor`)을 지난 글에만 쓴다. */
function toMixedFractions(text: string): string {
  return text.replace(
    /\\(?:d|t)?frac\s*\{(\d{1,6})\}\s*\{(\d{1,6})\}/g,
    (
      full: string,
      numerator: string,
      denominator: string,
      offset: number,
      source: string,
    ) => {
      // Adjacent terms, powers and nested fractions need their original grouping.
      const before = source.slice(0, offset);
      const after = source.slice(offset + full.length);
      if (/^\s*[\^_]/.test(after)) return full;
      if (/[\d\w}\]]\s*$/.test(before) || /(?:\^|_)\{?$/.test(before))
        return full;
      const open = before.lastIndexOf("{");
      if (open > before.lastIndexOf("}")) return full;
      const n = Number(numerator),
        d = Number(denominator);
      if (!d || n < d) return full;
      const whole = Math.floor(n / d),
        remainder = n % d;
      const shown = remainder
        ? `${whole}\\frac{${remainder}}{${d}}`
        : String(whole);
      // A step such as `\frac{1500}{5}=300` would read «300=300»: keep the source step.
      const next = after.match(/^\s*=\s*/);
      if (next && readsAs(after.slice(next[0].length), shown)) return full;
      const previous = before.match(/\s*=\s*$/);
      if (previous && endsAs(before.slice(0, -previous[0].length), shown))
        return full;
      return shown;
    },
  );
}

/** `rest` begins with exactly the term `shown` (not `3000` or `3\frac{1}{2}` for `3`). */
const readsAs = (rest: string, shown: string) =>
  rest.startsWith(shown) &&
  !/^(?:[\d.]|\\[dt]?frac)/.test(rest.slice(shown.length));

/** `head` ends with exactly the term `shown` (not `12\frac…` for `2\frac…`). */
const endsAs = (head: string, shown: string) =>
  head.endsWith(shown) && !/[\d.]$/.test(head.slice(0, -shown.length));
