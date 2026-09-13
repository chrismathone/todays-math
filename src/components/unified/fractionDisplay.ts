/** Presentation only: raw bank/source strings never change. */
export function displayFractions(
  text: string,
  grade: string,
  question = text,
): string {
  if (!/^(초|elementary)/i.test(grade)) return text;
  // A conversion exercise must keep the very fraction the pupil is asked to convert.
  if (/(가분수|대분수)[\s\S]{0,60}(바꾸|바꿔|고쳐|나타내|변환)/.test(question))
    return text;
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
      if (/[\d\w}\]]\s*$/.test(before) || /(?:\^|_)\{?$/.test(before))
        return full;
      const open = before.lastIndexOf("{");
      if (open > before.lastIndexOf("}")) return full;
      const n = Number(numerator),
        d = Number(denominator);
      if (!d || n < d) return full;
      const whole = Math.floor(n / d),
        remainder = n % d;
      return remainder ? `${whole}\\frac{${remainder}}{${d}}` : String(whole);
    },
  );
}
