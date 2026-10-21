/**
 * 초등 문항의 **표기** 한 곳. 생성기는 여기를 거쳐 쓰고, 가드(`rules.ts`)는 여기 결과를 검사한다.
 *
 * 왜 한 곳인가 — 표기 규칙을 생성기 230개가 각자 손으로 쓰면, 세는 쪽과 고치는 쪽이 같이 눈이 먼다.
 * 원장님 육안 검수(2026-08-22)에서 걸린 것 대부분이 「어떤 생성기는 하고 어떤 생성기는 안 한」 부류다.
 */

/** 한자 수사 — 원장님: 「8각형이 아니라 **팔각형**」(2026-08-22). */
const SINO = [
  "",
  "일",
  "이",
  "삼",
  "사",
  "오",
  "육",
  "칠",
  "팔",
  "구",
  "십",
  "십일",
  "십이",
] as const;

/**
 * 도형 이름에 쓰는 한자 수사. `3` → `"삼"`.
 *
 * 표를 넘는 수는 **던진다**. 조용히 아라비아 숫자로 떨어지면 그 자리만 `13각형` 이 되고
 * 아무도 모른다 — 못 쓰는 것은 막는 쪽이 낫다(09 §4 와 같은 태도).
 */
export function sino(n: number): string {
  const name = SINO[n];
  if (!name) throw new Error(`한자 수사 표에 없는 수입니다: ${n}`);
  return name;
}

/** `5` → `"오각형"`. `정오각형` 은 `polyName(5, true)`. */
export function polyName(n: number, regular = false): string {
  return `${regular ? "정" : ""}${sino(n)}각형`;
}

/** 수 하나를 KaTeX 로. 원장님: 「모든 숫자는 일반텍스트 말고 KaTeX」(2026-08-22). */
export function n(value: number | string): string {
  return `$${value}$`;
}

/** 이미 LaTeX 인 식을 감싼다. `expr("3\\times4=12")` → `$3\times4=12$`. */
export function expr(latex: string): string {
  return `$${latex}$`;
}

/** 단위가 붙는 수. `unitNum(4000, "g")` → `$4000\,\mathrm{g}$`. */
export function unitNum(value: number | string, unit: string): string {
  return `$${value}\\,\\mathrm{${unit}}$`;
}

/**
 * 단위로 끝나는 식의 끝소리 받침 — 단위는 우리말로 읽는다(«밀리리터» · «그램» · «톤» · «퍼센트» · «도»).
 * 제곱 · 세제곱(«제곱센티미터»)도 끝은 단위 이름이다. 표에 없는 단위는 모른다고 둔다.
 */
const UNIT_FINAL: Readonly<Record<string, number>> = {
  mm: 0, cm: 0, m: 0, km: 0, mL: 0, L: 0, kL: 0, g: 16, kg: 16, mg: 16, t: 4,
};

/** 수 하나를 읽은 끝소리의 받침. 연산식·문자는 읽는 법을 추측하지 않는다. */
export function mathFinal(latex: string): number | null {
  const unit = /[\d}]\s*\\,\s*\\mathrm\{([A-Za-z]+)\}(?:\^\{?[23]\}?)?$/.exec(latex);
  if (unit) return UNIT_FINAL[unit[1]!] ?? null;
  if (/\d\s*\\%$/.test(latex) || /\d\s*\^\{?\\circ\}?$/.test(latex)) return 0;
  // 빈칸 «□»은 «네모»로 읽는다 — «$8\times\square$가»
  if (/\\square$/.test(latex)) return 0;
  // 식이 연산 기호 뒤의 수 · 분수로 끝나면 읽는 끝소리는 그 토막이다 — «$\frac16\times\frac38$» 은 «… 8분의 3» → «을»
  // (2026-10-20 교차 검수). 지수 · 문자로 끝나는 식은 여전히 모른다고 둔다.
  const tail = /(?:\\times|\\div|\\le|\\ge|\\leq|\\geq|[-+=<>:])\s*((?:\d+)?\\frac\{\d+\}\{\d+\}|\d+(?:\.\d+)?)$/.exec(latex);
  if (tail) return mathFinal(tail[1]!);
  const fraction = /^-?(?:\d+)?\\frac\{(\d+)\}\{\d+\}$/.exec(latex);
  const value = fraction?.[1] ?? latex;
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) return null;
  let ending: string;
  if (value.includes("."))
    ending = "영일이삼사오육칠팔구"[Number(value.at(-1))];
  else {
    let integer = BigInt(value.replace(/^-/, ""));
    if (integer === BigInt(0)) ending = "영";
    else {
      let group = 0;
      while (integer % BigInt(10000) === BigInt(0)) {
        integer /= BigInt(10000);
        group++;
      }
      if (group) ending = ["", "만", "억", "조", "경"][group];
      else if (integer % BigInt(10))
        ending = "영일이삼사오육칠팔구"[Number(integer % BigInt(10))];
      else
        ending =
          integer % BigInt(100) ? "십" : integer % BigInt(1000) ? "백" : "천";
    }
  }
  return ending ? (ending.charCodeAt(0) - 0xac00) % 28 : null;
}

/**
 * 식 뒤에 **붙여 쓰는** 낱말 — 조사와 서술격 조사 «이다»의 활용(D-164 ①, 2026-10-21 리드 · Codex 합의).
 * «$x$ 의» → «$x$의» · «$25$ 입니다» → «$25$입니다». 확인한 낱말 전체가 같을 때만 붙인다 —
 * 단위 · 의존 명사(«$3$ 개» · «$2$ 배»)와 독립 낱말(«$3$ 이상» · «$5$ 이하» · «$4$ 더»)은 띄운 그대로다.
 * 첫 글자로 가르지 않는다: «이»는 붙이고 «이상»은 안 붙인다.
 */
export const MATH_ATTACHED_WORDS: ReadonlySet<string> = new Set([
  // 조사
  "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "로", "으로", "만", "에서", "에는",
  "까지", "보다", "부터", "만큼", "처럼",
  // 조사 + 조사
  "만큼은", "만큼을", "만큼이", "만큼의", "만큼과", "만큼씩", "까지가", "까지의", "부터는",
  // 서술격 조사 «이다»의 활용
  "입니다", "입니까", "이므로", "이고", "이며", "인", "인데", "인지", "일", "이면", "이라", "라",
  "이라면", "라면", "이라고", "이어야", "여야", "였습니다", "이었습니다",
  // 조사 + «이다»
  "만큼입니다", "만큼이고", "만큼이므로", "까지입니다", "까지이므로", "까지인", "부터이고",
  "뿐입니다", "뿐이므로", "뿐인",
]);

const MATH_SPAN = /\$\$[\s\S]+?\$\$|\$[^$\n]+?\$/g;

/** 인라인 식 뒤 «공백 + 붙여 쓰는 낱말»에서 공백을 뺀다. 식은 짝지어 차례로 읽는다(식과 식 사이를 식으로 읽지 않게). */
export function attachMathWords(text: string): string {
  let out = "";
  let last = 0;
  for (const m of text.matchAll(MATH_SPAN)) {
    const end = m.index + m[0].length;
    out += text.slice(last, end);
    last = end;
    if (m[0].startsWith("$$")) continue;
    const word = /^ ([가-힣]+)(?![가-힣])/.exec(text.slice(end));
    if (word && MATH_ATTACHED_WORDS.has(word[1]!)) last = end + 1;
  }
  return out + text.slice(last);
}

/** 손으로 붙인 조사까지 공통 출구에서 교정한다. 답과 그림은 건드리지 않는다. */
export function mathJosa(text: string): string {
  return text.replace(
    /\$([^$]+)\$(으로|로|을|를|이|가|은|는|과|와)(?![가-힣])/g,
    (match, latex: string, particle: string) => {
      const final = mathFinal(latex);
      if (final === null) return match;
      const pair = ["을를", "이가", "은는", "과와"].find((p) =>
        p.includes(particle),
      );
      const suffix = pair
        ? pair[final ? 0 : 1]
        : final && final !== 8
          ? "으로"
          : "로";
      return `$${latex}$${suffix}`;
    },
  );
}

/** 한글 낱말의 마지막 음절에 받침이 있으면 앞 조사, 없으면 뒤 조사를 고른다. */
export function josa(
  word: string,
  withBatchim: string,
  withoutBatchim: string,
): string {
  const trimmed = word.trim();
  const code = trimmed.charCodeAt(trimmed.length - 1);
  if (!(code >= 0xac00 && code <= 0xd7a3)) return withoutBatchim;
  const final = (code - 0xac00) % 28;
  // «(으)로» 는 ㄹ 받침(8)도 «로» 다 — «꿀로» · «길로» (2026-10-20 «꿀으로» 실측).
  if (final === 8 && withBatchim === "으로") return withoutBatchim;
  return final === 0 ? withoutBatchim : withBatchim;
}

/**
 * 분수를 **대분수**로. 초등은 가분수를 대분수로 고쳐 답한다.
 *
 * ⚠️ 소수로 떨어뜨리지 않는다 — 원장님이 `19\times\frac13` 의 답이
 * `6.333333333333333` 으로 나간 것을 잡으셨다(2026-08-22). 부동소수점이 지면으로 샌 자리다.
 */
export function fracLatex(num: number, den: number): string {
  if (den === 0) throw new Error("분모 0");
  const sign = num * den < 0 ? "-" : "";
  const a = Math.abs(num);
  const b = Math.abs(den);
  if (b === 1) return `${sign}${a}`;
  if (a < b) return `${sign}\\frac{${a}}{${b}}`;
  const whole = Math.floor(a / b);
  const rem = a % b;
  if (rem === 0) return `${sign}${whole}`;
  return `${sign}${whole}\\frac{${rem}}{${b}}`;
}

/**
 * 소수를 자릿수만큼. **끝없는 소수를 여기에 넣지 않는다** — 분수는 `fracLatex` 로 간다.
 * 나누어떨어지지 않는 값을 받으면 던진다(조용히 반올림하면 틀린 답이 침묵한다).
 */
export function decLatex(value: number, digits: number): string {
  const p = 10 ** digits;
  const scaled = value * p;
  if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
    throw new Error(
      `소수 ${digits}자리로 떨어지지 않습니다: ${value} — 분수로 답하십시오`,
    );
  }
  return (Math.round(scaled) / p).toFixed(digits);
}
