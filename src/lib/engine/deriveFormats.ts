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
  /**
   * **생성기가 직접 낸 오답 넷** — 있으면 `asMultipleChoice` 가 수 오답을 만들지 않고 이것을 쓴다.
   *
   * 고등 엔진(2026-09-13)이 처음 쓴다: 「나머지를 구하시오」의 답은 `$-x^{2}+2x+2$` 같은
   * 식인데, 아래 `numericMistakes` 는 **정답 속 첫 수**를 흔들기 때문에 그 수가 **지수**이면
   * `$-x^{1}+2x+2$`·`$-x^{0}+2x+2$` 를 보기로 낸다 — 이 저장소가 「지면 냄새」로 막아 온
   * 그 모양이다(실측 2026-09-13, `expandEngineDistractors.test.ts` 가 잠근다).
   * 초등·중등은 이 칸을 안 채우므로 동작이 한 바이트도 안 바뀐다(전후 해시 대조 —
   * `docs/planning/tracks/high-engine-plan.md` §1-1).
   */
  distractors?: readonly string[];
};

export type DerivedProblem = StemProblem & {
  questionType: QuestionFormat;
};

export type Mistake = { tag: string; value: string };

const DESCRIPTIVE_ASK = "풀이 과정과 답을 쓰시오.";

/**
 * 이 줄이 **물음 문장**인가 — 아래 `toDescriptiveStem` 이 실제로 바꿀 수 있는 끝맺음.
 * 목록이 딸린 발문에서 「어느 줄을 바꿀 것인가」를 고르는 데 쓴다.
 * ⚠️ 아래 치환 목록과 **같은 낱말**이어야 한다. 갈라지면 물음 줄을 찾아 놓고
 *    바꾸지 못해 목록만 헤집는다.
 */
const ASK_LINE =
  /(입?니까\?|인가\?|구하시오|구하여라|구하세요|쓰시오|나타내시오|하시오|하여라|하세요|고르시오)\.?$/;

/**
 * 끝맺음 동사 → **매김꼴**. 「…하시오」를 지우지 않고 「…하는」으로 바꿔
 * 「풀이 과정과 답을 쓰시오」에 잇는다.
 *
 * ⚠️ **긴 것부터** 본다. 「구하시오」보다 「하시오」를 먼저 대면 「구」가 남는다.
 *    「쓰시오·나타내시오」는 지시(「…을 쓰시오」)와 겹치므로 「구하는」으로 받는다.
 */
const ASK_ADNOMINAL: readonly [ending: string, adnominal: string][] = [
  ["구하시오", "구하는"],
  ["구하여라", "구하는"],
  ["구하세요", "구하는"],
  ["나타내시오", "구하는"],
  ["나타내어라", "구하는"],
  ["고르시오", "고르는"],
  ["고르세요", "고르는"],
  ["하시오", "하는"],
  ["하여라", "하는"],
  ["하세요", "하는"],
  ["쓰시오", "구하는"],
  ["써라", "구하는"],
];
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

/**
 * 발문이 **스스로 못 박은 상한** — 없으면 `null`.
 *
 * 🔴 2026-09-03 확대 갈래 4차 물결. 중2 `37W`(일의 양) 발문은 「(단, 전체 일의
 *    양을 $1$로 놓고, …)」라고 **자기가 상한을 선언**한다. 그런데 파생 객관식
 *    오답의 **51.69%(827/1,600)** 가 $1$ 을 넘었다 — $\dfrac{37}{180}$ 의 보기에
 *    $\dfrac{37}{18}$·$\dfrac{217}{180}$·$\dfrac{180}{37}$ 이 끼는 식이다.
 *    「하루에 전체 일을 한 번 넘게 한다」는 값이라 학생이 **계산 없이 지워 낸다**.
 *    넷이 다 그런 판이 **0.75%(3/400)** 였고 그 판은 답이 **거저** 정해진다.
 *
 * ⚠️ 이것은 「값이 틀렸다」가 아니라 **「문항이 쉬워진다」**다. 값 검산·KaTeX·
 *    해설 높이·냄새 훑개 어느 자도 구조적으로 못 본다(2026-08-24 「값이 맞으면
 *    시험이 다 초록이다」와 같은 자리).
 *
 * 🔴 **열쇠를 «유형»이 아니라 «지면의 말»에 둔다.** 유형 목록으로 적으면 다음
 *    물결이 같은 소재를 새로 지을 때 구조적으로 0이 된다. 등록 1,411유형 + 4차
 *    12유형을 전수로 훑어 이 상한을 **스스로 선언**하는 것은 `37W` 와 묵은
 *    `2-1|연립일차방정식의 활용|32A` **둘뿐**이었고(32A 도 45.8%로 같은 결함),
 *    「$N$점 만점」 꼴은 **0유형**이었다 — 3차에서 미룬 「$146$점」은 발문이
 *    상한을 선언하지 않으므로 **다른 부류**이고 이 자로는 안 걸린다.
 *    그래서 그 말은 여기 안 적는다(안 걸리는 규칙은 장식이다).
 */
export function declaredUpperBound(content: string): number | null {
  // 「전체 (…의 양)을 $1$로 놓고」 · 「전체를 1이라 하면」
  if (
    /전체[^.。\n]{0,24}\$?1\$?\s*(?:로|이라고?)\s*(?:놓|하|생각|보)/.test(
      content,
    )
  ) {
    return 1;
  }
  return null;
}

export function asMultipleChoice(stem: StemProblem, rng: Rng): DerivedProblem {
  if (hasChoices(stem.content)) {
    throw new Error(
      "이미 보기 목록이 있어 객관식으로 파생하지 않습니다 — 겹쳐 만들면 한 문항에 보기가 두 겹이 됩니다",
    );
  }
  const correct = stem.answer.trim();
  const parsedCorrect = parseNumericAnswer(correct);
  const decimalPlaces = parsedCorrect?.decimalPlaces;
  // 소수는 끝자리 0·약분 여부가 달라도 같은 유리수면 같은 보기다.
  // 다른 형식의 후보 순서·난수 소비는 그대로 둔다.
  const choiceKey = (value: string): string => {
    if (decimalPlaces === undefined) return value;
    const parsed = parseNumericAnswer(value);
    return parsed ? `${parsed.rat.n}/${parsed.rat.d}` : value;
  };
  // 생성기가 오답을 직접 냈으면 그것을 쓴다 — 수 오답 경로를 타지 않는다.
  // 넷이 아니거나 겹치면 던진다(부르는 쪽이 그 변형의 객관식을 건너뛰고 사유를 찍는다).
  if (stem.distractors !== undefined) {
    const given = stem.distractors.map((d) => {
      const value = d.trim();
      if (decimalPlaces === undefined) return value;
      const parsed = parseNumericAnswer(value);
      const formatted = parsed && formatRat(parsed.rat, "dec", decimalPlaces);
      if (formatted === null) {
        throw new Error(
          `정답의 소수 자릿수로 정확히 적을 수 없는 오답입니다: ${value}`,
        );
      }
      return parsed!.wrapped(formatted);
    });
    if (
      given.length !== 4 ||
      new Set([correct, ...given].map(choiceKey)).size !== 5
    ) {
      throw new Error(
        `생성기가 낸 오답이 넷이 아니거나 서로·정답과 겹칩니다: ${given.join(" · ")}`,
      );
    }
    return withChoices(stem, rng, correct, given);
  }
  // 🔴 `×10`·`÷10` 은 **자릿수가 통째로 달라진다** — $657$ 의 보기에 $6570$ 이
  //    끼면 학생이 계산 없이 크기만 보고 지워 낸다. 그렇다고 버릴 수는 없다:
  //    빼고 재니 초등 69갈래·중등 54유형이 5지선다를 통째로 잃었다(실측).
  //    **버리지 말고 뒤로 민다** — 좋은 후보로 넷을 못 채울 때만 쓴다.
  //    소수도 끝자리 실수로 넷을 채울 수 있으면 자리 이동을 뒤로 민다.
  //    분수 정답의 곱하기·나누기 실수는 그대로 둔다.
  const WEAK = new Set(["times-ten", "div-ten"]);
  // 🔴 발문이 스스로 못 박은 상한을 넘는 오답도 **버리지 말고 뒤로 민다** —
  //    바로 위 `times-ten` 과 같은 처리다. 버리면 후보가 모자라 5지선다를
  //    통째로 잃는 유형이 생긴다(그때는 «상한을 넘는 보기»보다 나쁘다).
  const bound = declaredUpperBound(stem.content);
  const overBound = (value: string): boolean => {
    if (bound === null) return false;
    const p = parseNumericAnswer(value);
    return p !== null && p.rat.d !== 0 && p.rat.n / p.rat.d > bound;
  };
  const seen = new Set<string>([choiceKey(correct)]);
  const strong: string[] = [];
  const weak: string[] = [];
  const overs: string[] = [];
  for (const m of numericMistakes(correct)) {
    const key = choiceKey(m.value);
    if (seen.has(key)) continue;
    seen.add(key);
    if (overBound(m.value)) {
      overs.push(m.value);
      continue;
    }
    (WEAK.has(m.tag) &&
    (decimalPlaces !== undefined ||
      (!m.value.includes("frac") && !m.value.includes(".")))
      ? weak
      : strong
    ).push(m.value);
  }
  const pool = strong.length + weak.length + overs.length;
  if (pool < 4) {
    throw new Error(
      `정답이 수·분수·소수가 아니거나 오답 후보가 ${pool}개뿐이라 5지선다를 못 만듭니다: ${correct}`,
    );
  }
  const distractors: string[] = [];
  // 🔴 정답이 단항식이면 **지수 오답을 적어도 하나** 반드시 넣는다.
  //    넣기만 해서는 모자란다 — 넷을 무작위로 뽑으므로 계수 오답만 뽑히는 판이
  //    생기고(실측 300판 중 7판), 그 판에서는 보기 다섯의 지수가 다시 전부 같아져
  //    「지수를 따져야 한다」는 마디가 통째로 사라진다. 하나를 먼저 못 박는다.
  const expValues = new Set(
    monomialExponentMistakes(correct).map((m) => m.value),
  );
  const expInPool = strong.filter((v) => expValues.has(v));
  if (expInPool.length > 0) {
    const first = pick(rng, expInPool);
    distractors.push(first);
    strong.splice(strong.indexOf(first), 1);
  }
  for (const bucket of [strong, weak, overs]) {
    const rest = [...bucket];
    while (distractors.length < 4 && rest.length > 0) {
      const next = pick(rng, rest);
      distractors.push(next);
      rest.splice(rest.indexOf(next), 1);
    }
  }
  return withChoices(stem, rng, correct, distractors);
}

/**
 * 정답과 오답 넷을 섞어 보기 다섯을 붙인다 — 수 오답 경로와 생성기 오답 경로가 **같이** 쓴다.
 * (섞는 순서·번호 매김이 두 벌이 되면 한쪽만 고쳐도 아무도 모른다.)
 */
function withChoices(
  stem: StemProblem,
  rng: Rng,
  correct: string,
  distractors: readonly string[],
): DerivedProblem {
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
  // 🔴 물음이 **문자열 끝**에 있다고 가정하면 안 된다. 중등에는 「다음 보기 중
  //    …인 것은 모두 몇 개인지 구하시오.」 뒤에 보기 목록이 붙는 유형이 있고,
  //    그때 물음 문장은 **첫 줄**이다. 끝만 보면 지시가 마지막 보기 뒤에 붙어
  //    「⑤ $y=(x+2)^2$ 풀이 과정과 답을 쓰시오.」 라는 지면이 나간다(실측 3유형).
  //    그래서 목록이 붙어 있으면 **물음 줄만** 바꾸고 목록은 그대로 둔다.
  const lines = content.trimEnd().split("\n");
  const askAt = lines.findIndex((l) => ASK_LINE.test(l.trimEnd()));
  if (askAt >= 0 && askAt < lines.length - 1) {
    const head = lines.slice(0, askAt);
    const rest = lines.slice(askAt + 1);
    return [...head, toDescriptiveStem(lines[askAt]!), ...rest].join("\n");
  }

  const trimmed = content.trimEnd();
  if (trimmed.endsWith(DESCRIPTIVE_ASK)) return trimmed;

  const nikka = trimmed.replace(/(입)?니까\?$/, "인지 " + DESCRIPTIVE_ASK);
  if (nikka !== trimmed) return nikka;

  const inga = trimmed.replace(/인가\?$/, "인지 " + DESCRIPTIVE_ASK);
  if (inga !== trimmed) return inga;

  // 🔴 끝맺음 동사를 **지우면** 말이 깨진다.
  //    「다음 식을 전개하시오.」 → 「다음 식을 **전개**풀이 과정과 답을 쓰시오.」
  //    「가장 큰 수를 구하시오.」 → 「가장 큰 수를 풀이 과정과 답을 쓰시오.」
  //    실측으로 중등 873 중 654, 초등 2,300 중 494 가 그렇게 됐다.
  //
  //    지우지 말고 **매김꼴(-는)로 바꿔** 잇는다 — 「전개하는 풀이 과정과 답을
  //    쓰시오」, 「구하는 풀이 과정과 답을 쓰시오」. 「쓰시오·나타내시오」는
  //    지시 자체와 겹치므로 「구하는」으로 받는다.
  // 앞이 이미 «묻는 꼴»(…인지 / …는지)이면 동사를 **떨군다** —
  // 원장님 예시가 그 모양이다: 「길이는 몇 cm 인지 풀이 과정과 답을 쓰시오.」
  // 여기서 매김꼴을 넣으면 「몇 개인지 구하는 풀이 과정과…」로 겹친다.
  const nominalized = trimmed.replace(
    /(인지|는지|ㄴ지)\s*(구하시오|구하여라|구하세요|쓰시오|써라|나타내시오|나타내어라|답하시오)\.?$/,
    `$1 ${DESCRIPTIVE_ASK}`,
  );
  if (nominalized !== trimmed) return nominalized;

  for (const [ending, adnominal] of ASK_ADNOMINAL) {
    const re = new RegExp(`${ending}\\.?$`);
    if (re.test(trimmed))
      return `${trimmed.replace(re, adnominal)} ${DESCRIPTIVE_ASK}`;
  }

  return `${trimmed} ${DESCRIPTIVE_ASK}`;
}

type Rat = { n: number; d: number };

/**
 * 「$a \le x \le b$」처럼 **두 부등호로 묶인 사슬**에서 왼쪽 끝이 오른쪽 끝보다
 * 큰가 — 곧 그 구간이 **있을 수 없는가**.
 *
 * 오답을 만들 때만 쓴다. 정답에는 이 모양이 안 나오므로(생성기가 참인 구간을
 * 낸다) 여기서 걸리는 것은 전부 우리가 방금 지어낸 거짓이다.
 */
const ORDER_CHAIN =
  /(-?\d+(?:\.\d+)?)\s*\\(?:le|leq|lt)\s*[^$]{1,12}?\\(?:le|leq|lt)\s*(-?\d+(?:\.\d+)?)/g;

export function reversesOrder(text: string): boolean {
  for (const m of text.matchAll(ORDER_CHAIN)) {
    if (Number(m[1]) > Number(m[2])) return true;
  }
  return false;
}

export function numericMistakes(answer: string): Mistake[] {
  const parsed = parseNumericAnswer(answer);
  if (!parsed) return [];
  const wrap = parsed.wrapped;
  const out: Mistake[] = [];
  const seen = new Set<string>();
  // 🔴 오답은 **정답과 같은 모양**이어야 한다. 「$8\,\mathrm{cm}$」의 역수는
  //    「$\frac{1}{8}\,\mathrm{cm}$」인데, 길이로는 그럴듯하지 않아 학생이
  //    계산 없이 지워 낸다 — 문항이 오히려 쉬워진다. 수를 N 으로 지운 뒤
  //    모양이 같은 것만 남긴다.
  const shapeOf = (t: string) => t.replace(/-?\d+(?:\.\d+)?/g, "N");
  const wantShape = shapeOf(answer.trim());
  const push = (tag: string, rat: Rat | null): void => {
    if (!rat || rat.d === 0) return;
    const reduced = reduce(rat);
    if (reduced.n === parsed.rat.n && reduced.d === parsed.rat.d) return;
    if (parsed.style === "dec") {
      // 1.0·0.0도 소수 자릿수의 실수를 낼 수 있다. 음수 금지는 그대로다.
      if (parsed.rat.n >= 0 && reduced.n < 0) return;
    } else if (!sameKind(parsed.rat, reduced)) return;
    const formatted = formatRat(reduced, parsed.style, parsed.decimalPlaces);
    if (formatted === null) return;
    const value = wrap(formatted);
    if (parsed.decorated && shapeOf(value) !== wantShape) return;
    // 🔴 정답이 **구간**이면 한쪽 끝만 흔들려 «있을 수 없는 구간»이 나온다.
    //    2026-09-02 확대 갈래 3차 물결이 「$y$ 의 값의 범위」를 정답으로 내는 첫
    //    유형(중2 `35V`)을 들이자 보기에 `$12\le y\le10$` 이 찍혔다 — 실측
    //    157/1200판(13.1%). 학생이 계산 없이 지워 내므로 문항이 쉬워지고,
    //    무엇보다 **종이에 거짓이 나간다.**
    //    `shapeOf` 가르기는 이걸 못 본다 — 모양(`$N\le y\le N$`)은 그대로다.
    //    등록 1,411유형을 전수로 훑어 이 부류를 내는 것은 `35V` **하나뿐**이었다.
    if (reversesOrder(value)) return;
    const key = parsed.style === "dec" ? `${reduced.n}/${reduced.d}` : value;
    if (seen.has(key)) return;
    seen.add(key);
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

  if (parsed.decimalPlaces !== undefined) {
    // 약분된 분모에서 자릿수를 추측하지 않는다: 0.8290은 만분의 자리까지다.
    // 정답의 최소 단위·그 위 자리의 계산 실수로 정확한 소수 후보를 채운다.
    const scale = 10 ** parsed.decimalPlaces;
    const scaled = parsed.rat.n * (scale / parsed.rat.d);
    for (const [tag, step] of [
      ["last", 1],
      ["next", 10],
      ["last-two", 2],
    ] as const) {
      push(`decimal-${tag}-up`, { n: scaled + step, d: scale });
      push(`decimal-${tag}-down`, { n: scaled - step, d: scale });
    }
  }

  // 🔴 위 아홉만으로는 **정수 정답**에서 후보가 모자란다. 같은 종류 가드를 켜면
  //    `sign-flip`·`reciprocal`·`denominator-plus` 가 통째로 빠지기 때문이다
  //    (정답 $1$ 은 후보가 셋뿐이라 5지선다를 못 만든다 — 실측).
  //    **자릿수를 잘못 올린 실수**로 채운다. 초등 연산에서 가장 흔한 오답이고
  //    정수라는 종류를 그대로 지킨다.
  //
  // ⚠️ 없는 자리는 안 만든다 — 한 자리 수에서 «백의 자리 올림»을 틀릴 수는 없다.
  //    그래서 절댓값이 그 자리에 닿을 때만 낸다. 안 그러면 정답 $6$ 에
  //    `$106$` 같은 자리 채우기가 다시 생긴다.
  if (parsed.rat.d === 1) {
    const abs = Math.abs(parsed.rat.n);
    for (const place of [10, 100, 1000]) {
      if (abs < place) break;
      push(`carry-${place}-up`, { n: parsed.rat.n + place, d: 1 });
      push(`carry-${place}-down`, { n: parsed.rat.n - place, d: 1 });
    }
    push("off-by-two-up", { n: parsed.rat.n + 2, d: 1 });
    push("off-by-two-down", { n: parsed.rat.n - 2, d: 1 });
    // 정답이 양수면 0 을 막으므로(`sameKind`) 정답 $1$ · $2$ 는 후보가 다시 모자란다 — 하나 더 위로.
    push("off-by-three-up", { n: parsed.rat.n + 3, d: 1 });
  }

  // 🔴 정답이 **단항식**이면 계수만 흔들어서는 안 된다.
  //    위의 아홉 남짓은 전부 `parsed.rat`(= 맨 앞의 수)만 건드리므로, 정답이
  //    `$36x^{9}y^{7}$` 같은 단항식이면 보기 다섯의 **지수가 전부 같아진다.**
  //    그러면 「$x$·$y$ 의 지수를 각각 따져야 한다」가 마디인 유형이 객관식에서는
  //    계수 하나만 구하면 끝나 버린다 — 2026-09-04 중2 `124X`(심화상) 적대 검문이
  //    실측으로 잡았다(보기 다섯의 지수가 같은 판 **100%** · 계수만으로 갈리는 판 98.39%).
  //    지수 실수는 이 단원에서 학생이 실제로 하는 오답이다(더하기와 곱하기를 바꾼다).
  //
  // ⚠️ **단항식 꼴에만** 낸다. `$4x^{2}-81$`(곱셈 공식)이나 `$y=4x^{2}$`(이차함수)에서
  //    지수를 흔들면 «이차식이 아닌 것»이 되어 학생이 계산 없이 지워 내므로
  //    문항이 오히려 쉬워진다 — 위 `times-ten` 주석과 같은 이유다. 등록 1,483유형을
  //    전수로 훑어 이 부류(계수 있는 단항식 정답)는 여덟, 단항식이 아닌 변수 지수는
  //    서른셋이었고 뒤엣것은 손대지 않는다.
  for (const m of monomialExponentMistakes(answer.trim())) {
    if (seen.has(m.value)) continue;
    seen.add(m.value);
    out.push(m);
  }

  return out;
}

/** `$-8x^{3}y^{7}$` 처럼 **계수 하나 × 변수 거듭제곱**뿐인 정답. */
const MONOMIAL_ANSWER = /^\$(-?\d+)((?:[a-z](?:\^\{\d+\})?)+)\$$/;
const MONOMIAL_FACTOR = /([a-z])(?:\^\{(\d+)\})?/g;

/**
 * 단항식 정답의 **지수**를 흔든 오답. 계수는 그대로 둔다.
 *
 * 정답이 단항식이 아니면 빈 배열이다 — 그 판정이 이 함수의 값어치다.
 */
export function monomialExponentMistakes(answer: string): Mistake[] {
  const m = MONOMIAL_ANSWER.exec(answer.trim());
  if (!m) return [];
  const coefficient = m[1]!;
  const factors: { v: string; e: number }[] = [];
  for (const f of m[2]!.matchAll(MONOMIAL_FACTOR)) {
    factors.push({ v: f[1]!, e: f[2] ? Number(f[2]) : 1 });
  }
  if (factors.length === 0) return [];
  const render = (fs: readonly { v: string; e: number }[]): string =>
    `$${coefficient}${fs.map((f) => (f.e === 1 ? f.v : `${f.v}^{${f.e}}`)).join("")}$`;
  const out: Mistake[] = [];
  factors.forEach((f, i) => {
    for (const step of [1, -1]) {
      const e = f.e + step;
      // ⚠️ 지수 $1$ 은 표기가 사라지고 $0$ 은 변수가 사라진다 — 모양이 달라져
      //    학생이 계산 없이 지워 내므로 안 만든다.
      if (e < 2) continue;
      out.push({
        tag: `exp-${f.v}-${step > 0 ? "up" : "down"}`,
        value: render(factors.map((g, j) => (j === i ? { v: g.v, e } : g))),
      });
    }
  });
  // 두 변수의 지수를 **맞바꾼** 오답 — 어느 쪽을 어느 쪽으로 나눴는지 헷갈린 실수다.
  const [a, b] = factors;
  if (factors.length === 2 && a && b && a.e !== b.e && a.e >= 2 && b.e >= 2) {
    out.push({
      tag: "exp-swap",
      value: render([
        { v: a.v, e: b.e },
        { v: b.v, e: a.e },
      ]),
    });
  }
  return out.filter((x) => x.value !== answer.trim());
}

/**
 * 오답이 정답과 **같은 종류의 수**인가.
 *
 * 🔴 원장님 지적 2026-08-27: 초3 「두 수의 합」 객관식 보기에 `$-865$`·
 *    `$\frac{865}{2}$` 가 나갔다. 초등 교육과정에 음수가 없고 두 수의 합이
 *    분수가 될 수도 없다 — 학생이 계산 없이 지워 내므로 오답이 아니라
 *    **자리 채우기**다. 문항이 오히려 쉬워진다.
 *
 * 이 파일은 「오답은 정답과 같은 모양이어야 한다」를 이미 적어 두고 있었는데
 * (아래 `shapeOf`) **단위가 붙은 정답에만** 걸고 있었다. 맨 정수는 안 걸렀다.
 * 엔진을 돌려 세니 객관식 8,948건 중 **5,407건(초등 4,345 · 중등 1,062)** 이
 * 그랬다. 적재본에서도 5,692건 중 4,693건(82%)이다.
 *
 * 정답이 **음의 정수**면 부호를 풀어 준다 — 중등 부호 실수는 진짜 오답이다.
 * 분수·소수 정답도 그대로 둔다(역수·자리 실수가 그 종류 안에서 나온다).
 */
function sameKind(answer: Rat, candidate: Rat): boolean {
  // 🔴 **부호를 먼저 본다** (2026-08-30). 종전에는 `answer.d !== 1` 이 맨 앞이라
  //    **정답이 분수면 모든 후보가 통과**했고, `sign-flip` 이 만든 음수가 그대로
  //    지면에 나갔다. 초3 「전체를 $6$조각으로 나눈 한 조각은?」(정답 $1/6$) 보기에
  //    `$-\frac{1}{6}$` 이 있었다 — 적재본 실측 **468건**.
  //    이 함수의 주석은 이미 「초등 교육과정에 음수가 없다」고 적어 두었는데,
  //    그 가드가 **정수 정답에만** 걸려 있었다. 분수는 구조적으로 안 걸렸다.
  //    (「같은 규칙을 쓰는 자리가 둘이면 한 숫자를 두 곳이 쓰게 하라」의 다른 얼굴 —
  //     여기서는 «부호»와 «분모»가 한 조건에 얽혀 한쪽이 다른 쪽을 가렸다.)
  //
  //    정답이 **음수**면 부호 실수가 진짜 오답이므로 그대로 푼다(중등).
  if (answer.n >= 0 && candidate.n < 0) return false;
  // 🔴 정답이 양수면 «0» 도 막는다 (2026-10-17) — `minus-one` 이 1 에서 0 을 냈다(«③ 0 cm»).
  //    공유 DB 엔진 객관식의 9.8%(4,724건)가 그랬다. 길이 · 개수 · 넓이의 0 은 오답 노릇을 못 한다.
  if (answer.n > 0 && candidate.n === 0) return false;
  if (answer.d !== 1) return true;
  if (candidate.d !== 1) return false;
  return true;
}

function parseNumericAnswer(raw: string): {
  rat: Rat;
  wrapped: (inner: string) => string;
  style: "int" | "frac" | "dec";
  /** 약분 전의 소수 자릿수 — 끝자리 0도 보존한다. */
  decimalPlaces?: number;
  /** 단위·꼬리표가 붙은 수인가 — 오답 모양을 그대로 지켜야 한다. */
  decorated?: boolean;
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

  const frac = inner.match(/^(-)?\\d?frac\{(-?\d+)\}\{(-?\d+)\}$/);
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
    const signed = dec[1]!.startsWith("-")
      ? intPart * scale - fracPart
      : intPart * scale + fracPart;
    if (!Number.isFinite(signed)) return null;
    return {
      rat: reduce({ n: signed, d: scale }),
      wrapped,
      style: "dec",
      decimalPlaces: dec[2]!.length,
    };
  }

  const int = inner.match(/^-?\d+$/);
  if (int) {
    const n = Number(inner);
    if (!Number.isFinite(n)) return null;
    return { rat: { n, d: 1 }, wrapped, style: "int" };
  }

  // 🔴 **단위·꼬리표가 붙은 수** — 여기까지 오면 「$8\,\mathrm{cm}$」·「$90^\circ$」·
  //    「$12$개」처럼 수 하나에 장식이 붙은 것이다. 전수로 세니 중등에서 객관식을
  //    못 만든 정답의 대부분이 이 부류였다(cm 78 · ° 76 · 개 61 · cm² 29 …).
  //    **틀은 그대로 두고 수만** 바꾸면 그대로 오답이 된다.
  //
  //    ⚠️ 수가 둘 이상이면 손대지 않는다(「$x=2$, $y=5$」) — 어느 쪽을 바꿔야
  //       할지 알 수 없다. 그리고 **닫힌 영역**도 손대지 않는다.
  if (CLOSED_DOMAIN.test(trimmed)) return null;
  const decorated = trimmed.match(/^(\D*?)(-?\d+(?:\.\d+)?)([\s\S]*)$/);
  if (decorated) {
    const [, before, num, after] = decorated as unknown as [
      string,
      string,
      string,
      string,
    ];
    const value = Number(num);
    if (!Number.isFinite(value)) return null;
    const dot = num.indexOf(".");
    const style = dot < 0 ? ("int" as const) : ("dec" as const);
    const scale = dot < 0 ? 1 : 10 ** (num.length - dot - 1);
    return {
      rat: reduce({ n: Math.round(value * scale), d: scale }),
      wrapped: (s) => `${before}${s}${after}`,
      style,
      decimalPlaces: dot < 0 ? undefined : num.length - dot - 1,
      decorated: true,
    };
  }
  return null;
}

/**
 * **닫힌 영역** — 수를 바꾸면 학생이 계산 없이 지워 내는 가짜 오답이 나온다.
 * 「제$2$사분면」에서 2를 8로 바꾸면 「제$8$사분면」이다. 오답을 지어내는 것보다
 * 객관식을 안 만드는 편이 낫다.
 * 목록은 **실측 census 에서** 뽑았다(못 만든 정답 모양 빈도표).
 */
const CLOSED_DOMAIN = /사분면|요일|월$|분면/;

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

function formatRat(
  r: Rat,
  style: "int" | "frac" | "dec",
  places?: number,
): string | null {
  if (style === "dec") {
    if (places === undefined) return null;
    const scale = 10 ** places;
    // 기약분모가 10^places의 약수여야 그 자릿수로 정확히 적을 수 있다.
    // 순환소수·자릿수 초과를 반올림해서 다른 값의 오답으로 만들지 않는다.
    if (!Number.isSafeInteger(scale) || scale % r.d !== 0) return null;
    const scaled = r.n * (scale / r.d);
    if (!Number.isSafeInteger(scaled)) return null;
    const sign = r.n < 0 ? "-" : "";
    const digits = String(Math.abs(scaled)).padStart(places + 1, "0");
    return `${sign}${digits.slice(0, -places)}.${digits.slice(-places)}`;
  }
  if (r.d === 1) return String(r.n);
  if (r.n < 0) return `\\frac{${-r.n}}{${r.d}}`.replace(/^/, "-");
  return `\\frac{${r.n}}{${r.d}}`;
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
