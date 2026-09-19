/**
 * Presentation only: raw bank/source strings never change.
 *
 * 초등 가분수를 대분수로 **보여 주는** 유일한 함수다 — 화면·인쇄·PDF·HWPX 가 모두 이것을
 * 부른다(원장님 2026-09-19 «모든 화면이 일치하도록»). 렌더러(편집기·지면 전처리)는 학년을
 * 몰라 바꾸지 않는다(`mixedNumberPolicy.test.ts`). 편집 칸은 원문 그대로다.
 */
export function displayFractions(
  text: string,
  grade: string,
  question = text,
): string {
  if (!/^(초|elementary)/i.test(grade)) return text;
  // A question — or a solution step — that names fraction kinds is about the notation
  // itself: converting would change the very fraction the pupil must classify or convert
  // («나타낸» is not «나타내»), or undo a «대분수를 가분수로 고칩니다» step.
  if (NAMES_KIND.test(question) || NAMES_KIND.test(text)) return text;
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

const NAMES_KIND = /가분수|대분수|진분수/;

/** `rest` begins with exactly the term `shown` (not `3000` or `3\frac{1}{2}` for `3`). */
const readsAs = (rest: string, shown: string) =>
  rest.startsWith(shown) &&
  !/^(?:[\d.]|\\[dt]?frac)/.test(rest.slice(shown.length));

/** `head` ends with exactly the term `shown` (not `12\frac…` for `2\frac…`). */
const endsAs = (head: string, shown: string) =>
  head.endsWith(shown) && !/[\d.]$/.test(head.slice(0, -shown.length));
