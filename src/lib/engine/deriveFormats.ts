/**
 * 엔진이 낸 **단답형**에서 객관식·서술형을 파생한다.
 *
 * 생성기(초등 갈래 920 · 중등 유형 873)마다 형식을 손대지 않는다.
 * 나가는 자리 **한 곳**만 거친다. familyKey 는 형식에 갈라지지 않는다 —
 * 갈라지면 한 시험지에 같은 문제가 객관식과 서술형으로 두 번 들어간다.
 *
 * 판정 규칙을 여기 다시 적지 않는다. 화면은 `classifyFormat`,
 * AI 경로는 `deriveQuestionType`. 여기서는 그 함수가 읽을 **글과 컬럼**만 만든다.
 */
import { pick } from "../elementary/rng";
import type { Rng } from "../elementary/types";
import { canonicalCircled } from "../math/circledNumber";
import { hasChoices } from "../problem/choiceCountRule";

export type QuestionFormat = "객관식" | "단답형" | "서술형";

export type StemProblem = {
  content: string;
  answer: string;
  solution: string;
  familyKey: string;
  problemType: string;
};

export type DerivedProblem = StemProblem & {
  questionType: QuestionFormat;
};

export type Mistake = { tag: string; value: string };

const DESCRIPTIVE_ASK = "풀이 과정과 답을 쓰시오.";
const MARKS = ["①", "②", "③", "④", "⑤"] as const;

export function asShortAnswer(stem: StemProblem): DerivedProblem {
  return { ...stem, questionType: "단답형" };
}

export function asDescriptive(stem: StemProblem): DerivedProblem {
  return {
    ...stem,
    content: toDescriptiveStem(stem.content),
    questionType: "서술형",
  };
}

export function asMultipleChoice(stem: StemProblem, rng: Rng): DerivedProblem {
  if (hasChoices(stem.content)) {
    throw new Error(
      "이미 보기 목록이 있어 객관식으로 파생하지 않습니다 — 겹쳐 만들면 한 문항에 보기가 두 겹이 됩니다",
    );
  }
  const correct = stem.answer.trim();
  const pool = numericMistakes(correct)
    .map((m) => m.value)
    .filter((v) => v !== correct);
  const unique: string[] = [];
  for (const v of pool) {
    if (!unique.includes(v)) unique.push(v);
  }
  if (unique.length < 4) {
    throw new Error(
      `정답이 수·분수·소수가 아니거나 오답 후보가 ${unique.length}개뿐이라 5지선다를 못 만듭니다: ${correct}`,
    );
  }
  const distractors: string[] = [];
  const rest = [...unique];
  while (distractors.length < 4) {
    const next = pick(rng, rest);
    distractors.push(next);
    const i = rest.indexOf(next);
    rest.splice(i, 1);
  }
  const options = shuffleInPlace(rng, [correct, ...distractors]);
  const lines = options.map((v, i) => `${MARKS[i]} ${v}`);
  const index = options.indexOf(correct);
  const mark = canonicalCircled(index + 1);
  if (!mark) throw new Error("보기 번호 1..5 밖입니다");
  return {
    ...stem,
    content: `${stem.content.trimEnd()}\n${lines.join("\n")}`,
    answer: mark,
    questionType: "객관식",
  };
}

export function deriveThreeFormats(
  stem: StemProblem,
  rng: Rng,
): Record<QuestionFormat, DerivedProblem> {
  return {
    단답형: asShortAnswer(stem),
    객관식: asMultipleChoice(stem, rng),
    서술형: asDescriptive(stem),
  };
}

/**
 * 발문 끝의 물음을 서술 지시로 바꾼다.
 * 원장님: 「입니까? → …인지 풀이 과정과 답을 쓰시오.」
 */
export function toDescriptiveStem(content: string): string {
  const trimmed = content.trimEnd();
  if (trimmed.endsWith(DESCRIPTIVE_ASK)) return trimmed;

  const nikka = trimmed.replace(/(입)?니까\?$/, "인지 " + DESCRIPTIVE_ASK);
  if (nikka !== trimmed) return nikka;

  const inga = trimmed.replace(/인가\?$/, "인지 " + DESCRIPTIVE_ASK);
  if (inga !== trimmed) return inga;

  const ask = trimmed.replace(
    /(구하시오|구하여라|구하세요|쓰시오|나타내시오|하시오|하여라|하세요|고르시오)\.?$/,
    DESCRIPTIVE_ASK,
  );
  if (ask !== trimmed) return ask;

  return `${trimmed} ${DESCRIPTIVE_ASK}`;
}

type Rat = { n: number; d: number };

export function numericMistakes(answer: string): Mistake[] {
  const parsed = parseNumericAnswer(answer);
  if (!parsed) return [];
  const wrap = parsed.wrapped;
  const out: Mistake[] = [];
  const seen = new Set<string>();
  const push = (tag: string, rat: Rat | null): void => {
    if (!rat || rat.d === 0) return;
    const reduced = reduce(rat);
    if (reduced.n === parsed.rat.n && reduced.d === parsed.rat.d) return;
    const value = wrap(formatRat(reduced, parsed.style));
    if (seen.has(value)) return;
    seen.add(value);
    out.push({ tag, value });
  };

  push("off-by-one-up", { n: parsed.rat.n + parsed.rat.d, d: parsed.rat.d });
  push("off-by-one-down", { n: parsed.rat.n - parsed.rat.d, d: parsed.rat.d });
  push("sign-flip", { n: -parsed.rat.n, d: parsed.rat.d });
  push("double", { n: parsed.rat.n * 2, d: parsed.rat.d });
  if (parsed.rat.n % 2 === 0) {
    push("half", { n: parsed.rat.n / 2, d: parsed.rat.d });
  }
  push("times-ten", { n: parsed.rat.n * 10, d: parsed.rat.d });
  if (parsed.rat.n % 10 === 0) {
    push("div-ten", { n: parsed.rat.n / 10, d: parsed.rat.d });
  }
  if (parsed.rat.n !== 0) {
    push("reciprocal", { n: parsed.rat.d, d: parsed.rat.n });
  }
  push("numerator-plus", { n: parsed.rat.n + 1, d: parsed.rat.d });
  push("denominator-plus", {
    n: parsed.rat.n,
    d: parsed.rat.d + (parsed.rat.d === 0 ? 0 : 1),
  });

  return out;
}

function parseNumericAnswer(raw: string): {
  rat: Rat;
  wrapped: (inner: string) => string;
  style: "int" | "frac" | "dec";
} | null {
  const trimmed = raw.trim();
  let inner = trimmed;
  let wrapped = (s: string) => s;
  // ⚠️ `.` + `s`(dotAll) 는 ES2018 부터다. 이 저장소 target 은 ES2017 이라
  //    tsc 가 TS1501 로 문다 — **vitest 는 타입을 안 보므로 관문은 초록이었다.**
  //    뜻이 같은 `[\s\S]` 로 적는다.
  const dollar = trimmed.match(/^\$([\s\S]*)\$$/);
  if (dollar) {
    inner = dollar[1]!.trim();
    wrapped = (s) => `$${s}$`;
  }
  inner = inner.replace(/\\,/g, "").trim();

  const frac = inner.match(/^(-)?\\frac\{(-?\d+)\}\{(-?\d+)\}$/);
  if (frac) {
    const sign = frac[1] ? -1 : 1;
    const n = sign * Number(frac[2]);
    const d = Number(frac[3]);
    if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
    return { rat: reduce({ n, d }), wrapped, style: "frac" };
  }

  const dec = inner.match(/^(-?\d+)\.(\d+)$/);
  if (dec) {
    const scale = 10 ** dec[2]!.length;
    const intPart = Number(dec[1]);
    const fracPart = Number(dec[2]);
    const signed =
      intPart < 0 ? intPart * scale - fracPart : intPart * scale + fracPart;
    if (!Number.isFinite(signed)) return null;
    return { rat: reduce({ n: signed, d: scale }), wrapped, style: "dec" };
  }

  const int = inner.match(/^-?\d+$/);
  if (int) {
    const n = Number(inner);
    if (!Number.isFinite(n)) return null;
    return { rat: { n, d: 1 }, wrapped, style: "int" };
  }
  return null;
}

function reduce(r: Rat): Rat {
  const g = gcd(Math.abs(r.n), Math.abs(r.d));
  let n = r.n / g;
  let d = r.d / g;
  if (d < 0) {
    n = -n;
    d = -d;
  }
  return { n, d };
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatRat(r: Rat, style: "int" | "frac" | "dec"): string {
  if (r.d === 1) return String(r.n);
  if (style === "dec") {
    const sign = r.n < 0 ? "-" : "";
    const a = Math.abs(r.n);
    const whole = Math.floor(a / r.d);
    const rem = a % r.d;
    if (rem === 0) return `${sign}${whole}`;
    let decimals = String(rem);
    const width = decimalWidth(r.d);
    decimals = decimals.padStart(width, "0");
    return `${sign}${whole}.${decimals}`;
  }
  if (r.n < 0) return `\\frac{${-r.n}}{${r.d}}`.replace(/^/, "-");
  return `\\frac{${r.n}}{${r.d}}`;
}

function decimalWidth(d: number): number {
  let w = 0;
  let x = d;
  while (x > 1 && x % 2 === 0) {
    x /= 2;
    w += 1;
  }
  while (x > 1 && x % 5 === 0) {
    x /= 5;
    w += 1;
  }
  return w === 0 ? 1 : w;
}

function shuffleInPlace<T>(rng: Rng, items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}
