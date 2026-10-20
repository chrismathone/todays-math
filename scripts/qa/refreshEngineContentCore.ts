/**
 * `refresh-engine-content.ts` 의 **판정** — DB 도 그림 엔진도 안 문다(시험이 이것만 부른다).
 *
 * 적재본을 지금 엔진으로 덮을 때 물을 것은 셋이다.
 *   ⑴ 무엇이 달라졌나 (`classifyDiff`) — 같음 · 풀이만 · 보기만 · 발문
 *   ⑵ 이 보기는 고쳐야 하는 보기인가 (`brokenChoiceReason`)
 *   ⑶ 그래서 덮는가 (`shouldApply`) — 고치기로 한 문항류 · 고치기로 한 갈래만
 */
import { parseProblemContent } from "../../src/lib/problem/parseProblemContent";

export type Cols = {
  content: string;
  answer: string;
  solution: string | null;
};

/** 달라진 갈래. 여럿이 겹치면 뒤엣것이 이긴다(`stem` 이 가장 세다). */
export type DiffClass = "same" | "solution" | "choices" | "stem";

/** 공백 · 줄끝만 다른 것은 같은 것으로 본다 — 그 밖에는 한 글자도 안 봐준다. */
export function norm(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

export function classifyDiff(db: Cols, made: Cols): DiffClass {
  const a = parseProblemContent(db.content);
  const b = parseProblemContent(made.content);
  if (norm(a.question) !== norm(b.question)) return "stem";
  const aHas = a.choices.length > 0;
  const bHas = b.choices.length > 0;
  // 보기가 한쪽에만 있으면 형식이 바뀐 것이다 — 보기 갈래로 묻어 가면 안 된다.
  if (aHas !== bHas) return "stem";
  if (!aHas) {
    // 단답형은 정답이 흔들릴 까닭이 없다. 다르면 진짜로 바뀐 것이다.
    if (norm(db.answer) !== norm(made.answer)) return "stem";
  } else if (
    norm(db.content) !== norm(made.content) ||
    norm(db.answer) !== norm(made.answer)
  ) {
    return "choices";
  }
  return norm(db.solution) === norm(made.solution) ? "same" : "solution";
}

const MARKS = "①②③④⑤";

/** 보기 줄 다섯의 글(번호 뗀 것). 다섯이 아니면 null. */
function choiceTexts(content: string): string[] | null {
  const lines = content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && MARKS.includes(l[0]!))
    .map((l) => l.slice(1).trim());
  return lines.length === 5 ? lines : null;
}

/** `$3$` · `$-0.5$` · `$\frac{1}{2}$` 처럼 **수 하나뿐인** 보기의 값. 아니면 null. */
function pureValue(text: string): number | null {
  const num = /^\$(-?\d+(?:\.\d+)?)\$$/.exec(text);
  if (num) return Number(num[1]);
  const frac = /^\$(-)?\\d?frac\{(-?\d+)\}\{(-?\d+)\}\$$/.exec(text);
  if (frac && Number(frac[3]) !== 0)
    return ((frac[1] ? -1 : 1) * Number(frac[2])) / Number(frac[3]);
  return null;
}

/**
 * 음수로 **시작하는** 보기인가 — 빼기표 «앞»에 항이 없을 때만 부호다
 * (`$\triangle=\square-3$` 의 빼기는 연산자다 — 2026-09-04 「부호와 연산자를 안 가르면」).
 */
function startsNegative(text: string): boolean {
  return /^\$\s*-\s*(?:\d|\\d?frac)/.test(text);
}

export type BrokenReason = "같은 값" | "소수 정답" | "초등 음수";

/**
 * **지금 DB 에 있는 보기가 고쳐야 하는 보기인가.** 멀쩡하면 null.
 *
 * 🔴 「엔진이 다시 내면 다르다」는 까닭이 못 된다 — 오답 섞기의 난수 소비가 그 사이 바뀌어
 *    **차례만 다른** 보기가 적재본에 수천 행 있다. 그 행들은 자기 보기 · 자기 정답으로 앞뒤가 맞는다
 *    (`refresh-engine-figures.ts` 의 `sameProblem` 주석). 덮을 까닭이 있는 것만 덮는다.
 *
 *   · 같은 값 — 보기 둘의 값이 같다(글자가 달라도: `0.8290` 과 `0.829`).
 *   · 소수 정답 — 정답 보기에 소수가 있다. 소수 오답 표기(`formatRat`)가 통째로 틀렸었다(2026-10-03):
 *     자릿수가 긴 것(`1.0002547`)만이 아니라 `-0.2` 옆의 `0.1`(뜻은 0.2)도 그것이다 — 모양으로 못 가른다.
 *   · 초등 음수 — 정답이 음수가 아닌 초등 문항에 음수 보기(`sameKind` 수리 전에 적재된 행).
 *
 * 정답이 번호 하나가 아니거나 보기가 다섯이 아니면 판정하지 않는다.
 */
export function brokenChoiceReason(
  row: { content: string; answer: string },
  isElementary: boolean,
): BrokenReason | null {
  const answer = row.answer.trim();
  if (answer.length !== 1 || !MARKS.includes(answer)) return null;
  const texts = choiceTexts(row.content);
  if (!texts) return null;
  if (new Set(texts).size !== 5) return "같은 값";
  const seen = new Set<number>();
  for (const t of texts) {
    const v = pureValue(t);
    if (v === null) continue;
    const key = Math.round(v * 1e9);
    if (seen.has(key)) return "같은 값";
    seen.add(key);
  }
  const correct = texts[MARKS.indexOf(answer)]!;
  if (/\d\.\d/.test(correct)) return "소수 정답";
  if (
    isElementary &&
    !startsNegative(correct) &&
    texts.some((t) => startsNegative(t))
  )
    return "초등 음수";
  return null;
}

export type Scope = {
  /** 고치기로 한 문항류(`familyKey`) — 여기 든 것은 갈래를 안 가리고 덮는다. */
  families: ReadonlySet<string>;
  /** 풀이만 다른 행을 문항류 밖에서도 덮는가. */
  solutionEverywhere: boolean;
};

export function shouldApply(
  familyKey: string | null,
  cls: DiffClass,
  broken: BrokenReason | null,
  scope: Scope,
): boolean {
  if (cls === "same") return false;
  if (familyKey !== null && scope.families.has(familyKey)) return true;
  // 🔴 문항류 밖에서 발문이 다른 것은 **내가 모르는 차이**다. 덮지 않고 세어 찍는다.
  if (cls === "stem") return false;
  if (cls === "choices") return broken !== null;
  return scope.solutionEverywhere;
}

/**
 * ## 문지기 — 제자리 갱신이 «같은 행을 다른 문제로» 만들지 않는가
 *
 * 2026-10-03 전수 동기화(`--all-families`)에서 **298행이 같은 문항 코드를 단 채 다른 문제가 됐다**
 * (엔진이 퇴화값을 거르게 고쳐진 뒤로 같은 씨앗이 다른 수를 뽑았다 — 그 사이 적재본은 그대로였다).
 * 은행을 열기 전이고 그 행들을 가리키는 시험지 · 기록이 0 이라 그 상태를 **기준선**으로 두기로 했다
 * (3자 합의 C1 — `docs/planning/tracks/reports/consult-bank-fix/consensus.md` §4). 대신 **앞으로는 막는다**:
 * 문항 코드가 가리키는 문제는 바뀌지 않는다. 같은 문제임을 확인하지 못한 행은 덮지 않고,
 * 그런 행은 «출제 제외 + 새 씨앗으로 따로 적재»로만 고친다.
 *
 * 🔴 **너그러운 예외를 두지 않는다.** «빠진 수가 0 · 1 뿐이면 표기»같은 규칙은 그럴듯하지만 0 과 1 도 조건을 바꾼다.
 *    표기 정리 · 조건 보탬 · 약분(`10:2` → `5:1`)처럼 «같은 문제»인 갱신은 **사람이 행을 짚어** 지나가게 한다
 *    (`--same-problem <목록.json>`). 기계가 «같다»고 믿는 것은 공백 · 조사 · 정답의 끝자리 0 뿐이다.
 */
export type IdentityRisk =
  "발문의 수" | "발문의 글" | "정답의 값" | "그림의 라벨";

/** 조사 — 받침에 따라 갈리는 짝. 문구 수리(을/를 · 이/가 …)는 문제를 바꾸지 않는다. */
const PARTICLES = /[은는이가을를와과으로]/g;

const numberTokens = (text: string): string =>
  (text.match(/\d+(?:\.\d+)?/g) ?? []).sort().join(" ");

/** 수 · 공백 · 조사를 걷어 낸 글 — «무엇을 묻는가»가 남는다(낱말 · 단위 · 수식의 꼴). */
const wording = (text: string): string =>
  text
    .replace(/\d+(?:\.\d+)?/g, "#")
    .replace(/\s+/g, "")
    .replace(PARTICLES, "");

/** 정답의 «값» — 객관식은 번호가 가리키는 보기의 글. 공백과 소수의 끝자리 0 은 값이 아니다. */
function answerValue(cols: Cols): string {
  const mark = cols.answer.trim();
  const index = mark.length === 1 ? MARKS.indexOf(mark) : -1;
  const raw =
    index >= 0
      ? (parseProblemContent(cols.content).choices[index] ?? "(없는 번호)")
      : mark;
  return raw
    .replace(/\s+/g, "")
    .replace(/(\d+\.\d*?)0+(?=\D|$)/g, "$1")
    .replace(/\.(?=\D|$)/g, "");
}

/**
 * 그림이 글로 주는 정보 — 라벨의 다중집합(차례는 안 본다).
 * 옛 판의 `<text data-mj>` 와 조판된 `<g data-label>` 을 같은 것으로 읽는다.
 */
export function figureLabelBag(svg: string): string[] {
  const labels: string[] = [];
  for (const m of svg.matchAll(/<g data-label="([^"]*)"/g)) labels.push(m[1]!);
  for (const m of svg.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const mj = / data-mj="([^"]*)"/.exec(m[1]!)?.[1];
    labels.push(mj ?? m[2]!.replace(/<[^>]+>/g, "").replace(/\s+/g, ""));
  }
  return labels.sort();
}

type WithFigure = Cols & { figureSvg?: string | null };

/** 덮으면 **다른 문제**가 되는가. 같은 문제임이 확인되면 null. */
export function identityRisk(
  db: WithFigure,
  made: WithFigure,
): IdentityRisk | null {
  const a = parseProblemContent(db.content).question;
  const b = parseProblemContent(made.content).question;
  if (numberTokens(a) !== numberTokens(b)) return "발문의 수";
  if (wording(a) !== wording(b)) return "발문의 글";
  if (answerValue(db) !== answerValue(made)) return "정답의 값";
  if (
    db.figureSvg &&
    made.figureSvg &&
    figureLabelBag(db.figureSvg).join("\n") !==
      figureLabelBag(made.figureSvg).join("\n")
  )
    return "그림의 라벨";
  return null;
}

/**
 * 덮는가(`apply`) · 문지기가 막는가(`refuse`) · 애초에 덮을 행이 아닌가(`skip`).
 * `confirmed` — 사람이 «같은 문제»라고 짚어 준 행(`--same-problem`).
 */
export function decideApply(
  familyKey: string | null,
  cls: DiffClass,
  broken: BrokenReason | null,
  scope: Scope,
  risk: IdentityRisk | null,
  confirmed: boolean,
): "apply" | "refuse" | "skip" {
  if (!shouldApply(familyKey, cls, broken, scope)) return "skip";
  return risk !== null && !confirmed ? "refuse" : "apply";
}

/**
 * 글은 같은(«same») 행을 그림 때문에 덮을 목록에 넣는가 — `--figure-families` 문항류에서만.
 * 🔴 엔진이 그림을 **뺀** 행도 넣는다: 예전에는 «엔진 사양이 있을 때만» 넣어서, 발문의 식을 다시 그린 세로셈을
 *    걷은 초등 1,088행(2026-10-20 지면 전수 검사)이 «same» 으로 지나가 적재본에 옛 그림이 남았다.
 */
export function wantsFigureRedraw(o: {
  inFigureFamily: boolean;
  madeHasFigure: boolean;
  dbHasFigure: boolean;
}): boolean {
  return o.inFigureFamily && (o.madeHasFigure || o.dbHasFigure);
}

export type Snapshot = {
  content: string;
  answer: string;
  solution: string | null;
  figureSvg: string | null;
  directUseAllowed: boolean;
};

export type LedgerRow = {
  problemId: string;
  externalId: string;
  problemCode: string | null;
  before: Snapshot;
  after: Snapshot;
};

export type Ledger = {
  runs: { label: string; at: string; count: number }[];
  rows: LedgerRow[];
};

/** 🔴 **누적만.** 빈 회차는 원장을 안 건드린다. */
export function appendLedger(
  prev: Ledger,
  label: string,
  at: string,
  rows: LedgerRow[],
): Ledger {
  if (rows.length === 0) return prev;
  return {
    runs: [...prev.runs, { label, at, count: rows.length }],
    rows: [...prev.rows, ...rows],
  };
}

export function sameSnapshot(a: Snapshot, b: Snapshot): boolean {
  return (
    a.content === b.content &&
    a.answer === b.answer &&
    a.solution === b.solution &&
    a.figureSvg === b.figureSvg &&
    a.directUseAllowed === b.directUseAllowed
  );
}
