/**
 * 중등 **판정형 등록부** — `judgementDefinitions()` · `generateJudgeProblem()`.
 *
 * RPM 유형 등록부(`registeredTypes()`)에도 결합형(`middleComboDefinitions()`)에도 넣지 않는다(`contract.ts` 머리말).
 * 그래서 **세 자리에 따로 묶는다** — 안 묶으면 결합형이 겪은 «시험에서만 생성되던» 사각지대가 다시 난다:
 *
 *   ⑴ 적재기 target `engine: "judge"`        — `scripts/import/load-engine-problems.ts` 의 `buildJudgeRows`
 *   ⑵ 미적재 검사                             — `scripts/qa/checkUnloadedTypes.ts` 가 이 등록부를 **정확한 키**로 센다
 *   ⑶ 제자리 갱신                             — `scripts/qa/refresh-engine-content.ts` 가 ⑴ 과 같은 행 생성 함수를 부른다
 *
 * ## 등록부가 지키는 것 — 생성기마다 따로 지키지 않는다
 *
 * 생성기는 보기 다섯과 각자의 참거짓 **주장**만 낸다. 차례를 섞고 번호를 매기고, **지면에 찍힌 글을
 * `truthOf` 로 다시 재서** «다른 하나가 정확히 하나»인지와 주장이 맞는지를 보는 것은 여기 한 곳이다
 * (합의안 §2 Q2 — `numericMistakes` 는 오답 **후보**일 뿐 진위 보증이 아니다). 어기면 던진다.
 */
import { createRng } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import { assertChooseAllAnswerCount } from "../../problem/chooseAllRule";
import {
  assertChoiceCount,
  assertChoiceMarks,
  CHOICE_MARKS,
} from "../../problem/choiceCountRule";

import {
  JUDGE_FAMILY_ID,
  judgeFamilyKey,
  judgeKeyOf,
  type AnyJudgeDefinition,
  type CompareAsk,
  type CompareBody,
  type CompareJudgeDefinition,
  type JudgeAsk,
  type JudgeBody,
  type JudgeDefinition,
  type JudgeProblem,
  type JudgeReadContext,
  type JudgeValue,
  type TruthAsk,
} from "./contract";
import { JUDGE_DEFINITIONS } from "./definitions";
import { paperVerdict } from "./paper";
import { compareFrac, fracText, sameFrac } from "./texArith";

/** 등록부가 밖에 보이는 모양 — 생성기 함수는 빼고 메타만. */
export type JudgeEntry = {
  key: string;
  familyKey: string;
  grade: string;
  unitSection: string;
  familyId: string;
  title: string;
  /** 문형 — 참거짓(«옳지 않은 것» · «옳은 것») · 비교(«나머지 넷과 다른 하나» · «가장 큰/작은 것») */
  form: "truth" | "compare";
  asks: readonly JudgeAsk[];
  sources: readonly string[];
  difficulty: JudgeDefinition["difficulty"];
  difficultyBasis: string;
  ruleVersion: number;
  /** 지면 관문을 면제한 까닭 — 관문을 지나는 등록(기본)이면 null */
  paperExempt: string | null;
};

export type JudgeRegistry = {
  definitions(): readonly JudgeEntry[];
  has(key: string): boolean;
  generate(key: string, seed: number, variant?: number): JudgeProblem;
};

/** 보기 수 — 객관식 틀 그대로(D-80). */
const OPTION_COUNT = CHOICE_MARKS.length;

/** 판정키마다 rng 흐름을 가르는 소금 — 중등 유형 등록부(`../generate.ts`)와 같은 꼴. */
function keySalt(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** 지면 본문에서 보기 글을 **다시 읽는다** — 줄머리가 ①~⑤ 인 줄. 다시 재는 쪽이 생성기 배열을 믿지 않게. */
function printedChoices(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => (CHOICE_MARKS as readonly string[]).includes(l[0] ?? ""))
    .map((l) => [...l].slice(1).join("").trim());
}

/** 지면 본문의 발문 줄 — 다시 재는 함수에 넘기는 문맥(대입값이 여기 있다). */
function printedContext(content: string): JudgeReadContext {
  return { lead: content.split("\n")[0] ?? "" };
}

/** 해설 끝줄의 몸통 — 발문에서 «다음 중»과 물음표를 뗀다(«$x=-3$일 때, 다음 중 …»처럼 가운데 있어도). */
function conclusionOf(lead: string): string {
  return lead
    .trim()
    .replace(/다음 중\s*/, "")
    .replace(/\?$/, "");
}

/**
 * **지면 관문** — 지면에 찍힌 보기 다섯이 제품의 보기 배치(자동)로 접히지 않고 칸에 들어가는가.
 *
 * 열 수는 제품의 규칙이 정하고(`paper.ts` 가 `choiceColumnCount` 를 그대로 부른다), 식의 실제 폭은 KaTeX
 * 글꼴 치수로 계산한다. 그 칸보다 넓으면 수식이 칸 안에서 접힌다 — «=값»이 다음 줄로 내려가 윗줄의 분수와
 * 닿는다(2026-10-08 표본 실측). 폭을 못 잰 보기도 안 낸다(모르는 꼴을 «들어간다»로 읽지 않는다).
 */
function assertFitsPaper(printed: readonly string[], where: string): void {
  const v = paperVerdict(printed);
  if (v.worst === -1) return;
  const mark = CHOICE_MARKS[v.worst];
  const w = v.widthsEm[v.worst];
  throw new Error(
    w === null || w === undefined
      ? `${where}: ${mark} 보기의 폭을 못 쟀다 — 지면에 들어가는지 모른다 · ${printed[v.worst]}`
      : `${where}: ${mark} 보기가 ${v.columns}열 칸에서 접힌다 — 식 폭 ${w.toFixed(2)}em > 칸 ${v.roomEm.toFixed(2)}em · ${printed[v.worst]}`,
  );
}

/** «옳지 않은 것» 물음에서 고를 보기는 거짓인 것 — 그 보기가 «다른 하나»다. */
function isOdd(ask: TruthAsk, truth: boolean): boolean {
  return ask === "옳지 않은 것" ? !truth : truth;
}

/**
 * 생성기 산출 → 지면 문항. **시험이 직접 부른다**(주장을 바꾼 산출물을 먹여 관문이 무는지 본다).
 *
 * 던지는 자리(전부 사유를 적는다):
 *   · 보기가 다섯이 아니다 · 보기 글이 겹친다
 *   · 생성기가 주장한 «다른 하나»가 정확히 하나가 아니다
 *   · 지면 글을 다시 재니 못 읽었다 · 주장과 다르다 · «다른 하나»가 정확히 하나가 아니다
 *   · 발문이 «…것은?» 으로 끝나지 않는다(해설 끝줄을 못 만든다)
 *   · 보기가 제품의 보기 배치로 칸에서 접힌다 · 폭을 못 쟀다(지면 관문 — 면제한 등록은 안 본다)
 */
export function assembleJudge(
  def: JudgeDefinition,
  ask: TruthAsk,
  body: JudgeBody,
  rng: Rng,
): Omit<JudgeProblem, "kind" | "judgeKey" | "familyKey"> {
  const where = `판정형 ${judgeKeyOf(def)} (${ask})`;
  if (body.options.length !== OPTION_COUNT)
    throw new Error(
      `${where}: 보기가 ${body.options.length}개다 — ${OPTION_COUNT}개여야 한다`,
    );
  const texts = body.options.map((o) => norm(o.text));
  if (new Set(texts).size !== OPTION_COUNT)
    throw new Error(`${where}: 보기 글이 겹친다 — ${texts.join(" · ")}`);
  // 거짓 보기에는 «어디가 틀렸나»가 있고 참인 보기에는 없다 — 해설 셋째 줄이 이것으로 선다.
  const whyless = body.options.find((o) => (o.why === null) !== o.claimedTrue);
  if (whyless)
    throw new Error(
      `${where}: 보기 «${whyless.text}» — ${whyless.claimedTrue ? "참인데 «틀린 까닭»이 있다" : "거짓인데 «틀린 까닭»이 없다"}`,
    );
  const claimedOdd = body.options.filter((o) =>
    isOdd(ask, o.claimedTrue),
  ).length;
  if (claimedOdd !== 1)
    throw new Error(
      `${where}: 생성기가 주장한 «${ask}»이 ${claimedOdd}개다 — 정확히 하나여야 한다`,
    );
  if (!/것은\?$/.test(body.lead.trim()))
    throw new Error(
      `${where}: 발문이 «…것은?» 으로 끝나지 않는다 — ${body.lead}`,
    );

  const order = shuffled(rng, body.options);
  const content = [
    body.lead.trim(),
    ...order.map((o, i) => `${CHOICE_MARKS[i]} ${o.text.trim()}`),
  ].join("\n");

  // ── 🔴 지면 글을 다시 잰다 — 생성기의 셈을 다시 부르지 않는다 ──────────────────
  const printed = printedChoices(content);
  if (printed.length !== OPTION_COUNT)
    throw new Error(`${where}: 지면에서 보기를 ${printed.length}개 읽었다`);
  const ctx = printedContext(content);
  const truths = printed.map((text, i) => {
    const t = def.truthOf(text, ctx);
    if (t === null)
      throw new Error(
        `${where}: ${CHOICE_MARKS[i]} 보기를 다시 재지 못했다 — ${text}`,
      );
    if (t !== order[i]!.claimedTrue)
      throw new Error(
        `${where}: ${CHOICE_MARKS[i]} 보기 — 생성기는 «${order[i]!.claimedTrue ? "참" : "거짓"}»이라는데 다시 재니 «${t ? "참" : "거짓"}»이다 · ${text}`,
      );
    return t;
  });
  const odd = truths
    .map((t, i) => (isOdd(ask, t) ? i : -1))
    .filter((i) => i >= 0);
  if (odd.length !== 1)
    throw new Error(
      `${where}: 다시 재니 «${ask}»이 ${odd.length}개다 — 정답이 하나로 안 정해진다`,
    );
  const answer = CHOICE_MARKS[odd[0]!]!;

  const conclusion = conclusionOf(body.lead);
  // 해설 넉 줄(`JudgeBody` 머리말) — 보기 차례(`order`)를 그대로 따라간다. 정답지 한 쪽에 8문항이 들어가야 한다.
  // 정답이 아닌 거짓 보기(«옳은 것» 물음의 넷)의 까닭 — **같은 까닭끼리 묶어** 한 줄에. 번호 차례는 보기 차례다.
  const byWhy = new Map<string, string[]>();
  order.forEach((o, i) => {
    if (i === odd[0] || o.why === null) return;
    const why = o.why.trim();
    byWhy.set(why, [...(byWhy.get(why) ?? []), CHOICE_MARKS[i]!]);
  });
  const solution = [
    `${body.briefLead.trim()} ${order.map((o, i) => `${CHOICE_MARKS[i]} ${o.brief.trim()}`).join(", ")}이다.`,
    `${answer} ${order[odd[0]!]!.detail.trim()}`,
    // 없으면 줄을 안 둔다(«옳지 않은 것» 물음) — 첫 줄의 값이 근거다.
    ...(byWhy.size > 0
      ? [
          `옳지 않은 까닭: ${[...byWhy].map(([why, marks]) => `${marks.join("·")} ${why}`).join(", ")}.`,
        ]
      : []),
    `따라서 ${conclusion} ${answer}이다.`,
  ].join("\n");

  // 객관식 틀의 공용 관문 — 생성기마다 따로 지키지 않는다(`../generate.ts` 와 같은 자리).
  assertChoiceCount(content, where);
  assertChoiceMarks(content, where);
  assertChooseAllAnswerCount(content, answer, where);
  if (def.paperExempt === undefined) assertFitsPaper(printed, where);

  return {
    grade: def.grade,
    unitSection: def.unitSection,
    familyId: def.familyId,
    ruleVersion: def.ruleVersion,
    form: "truth",
    ask,
    content,
    answer,
    solution,
    difficulty: def.difficulty,
    facts: body.facts,
    truths,
    values: [],
  };
}

// ── 비교 문형 (2026-10-08 엔진 보강 2단계) ─────────────────────────────────────

/** 같은 값끼리 묶는다 — 묶음마다 자리(0~4) 목록. 큰 묶음이 앞에 온다. */
function groupByValue(values: readonly JudgeValue[]): number[][] {
  const groups: number[][] = [];
  values.forEach((v, i) => {
    const g = groups.find((members) => sameFrac(values[members[0]!]!, v));
    if (g) g.push(i);
    else groups.push([i]);
  });
  return groups.sort((a, b) => b.length - a.length);
}

/** 묶음의 크기를 사람이 읽게 — `4+1` · `3+2` · `5+0`(전부 같은 값). */
function shapeText(groups: readonly number[][]): string {
  const sizes = groups.map((g) => g.length);
  return sizes.length === 1 ? `${sizes[0]}+0` : sizes.join("+");
}

/**
 * 값 다섯에서 정답 자리를 고른다 — **문형마다 값의 중복 규칙이 다르다**(합의안 §3-2).
 *   4+1   같은 값이 정확히 넷, 혼자인 하나가 정답. 3+2 · 5+0 · 2+2+1 은 던진다.
 *   극값  다섯 값이 서로 다르다. 동점이 하나라도 있으면 던진다(극값이 아닌 자리의 동점도).
 * `who` 는 사유의 머리 — «생성기가 주장한» · «다시 재니».
 */
function answerIndex(
  ask: CompareAsk,
  values: readonly JudgeValue[],
  where: string,
  who: string,
): number {
  const groups = groupByValue(values);
  if (ask === "나머지 넷과 다른 하나") {
    if (groups.length !== 2 || groups[0]!.length !== 4)
      throw new Error(
        `${where}: ${who} 값의 묶음이 ${shapeText(groups)} 이다 — 정확히 4+1 이어야 한다(${values.map(fracText).join(" · ")})`,
      );
    return groups[1]![0]!;
  }
  const tied = groups.filter((g) => g.length > 1);
  if (tied.length > 0)
    throw new Error(
      `${where}: ${who} 값에 동점이 있다 — ${tied.map((g) => `${g.map((i) => CHOICE_MARKS[i]).join("·")} ${fracText(values[g[0]!]!)}`).join(", ")}. 다섯 값이 서로 달라야 한다`,
    );
  let best = 0;
  for (let i = 1; i < values.length; i += 1) {
    const c = compareFrac(values[i]!, values[best]!);
    if (ask === "가장 큰 것" ? c > 0 : c < 0) best = i;
  }
  return best;
}

/**
 * 비교 문형의 생성기 산출 → 지면 문항. **시험이 직접 부른다**(4+1 을 3+2 로 · 동점을 넣은 산출물을 먹인다).
 *
 * 문형별로 따로 본다 — 참거짓 문형의 «값이 같은 보기 금지»를 그대로 옮기지 않는다:
 *   · **식의 중복** — 어느 문형이든 금지(보기 글이 겹치면 던진다)
 *   · **값의 중복** — 4+1 은 정확히 넷이 같다 · 극값은 하나도 없다
 *   · **정답의 유일성** — 4+1 은 혼자인 하나 · 극값은 가장 큰(작은) 하나
 *
 * 던지는 자리(전부 사유를 적는다):
 *   · 보기가 다섯이 아니다 · 보기 글이 겹친다 · 발문 끝이 문형과 다르다
 *   · 생성기가 주장한 값의 묶음이 문형에 안 맞는다(3+2 · 5+0 · 동점)
 *   · 지면 글을 다시 재니 못 읽었다 · 주장한 값과 다르다 · 묶음이 문형에 안 맞는다
 *   · 해설 첫 줄에 서는 값(`brief`)이 그 보기의 값과 다르다
 *   · 보기가 제품의 보기 배치로 칸에서 접힌다 · 폭을 못 쟀다(지면 관문 — 면제한 등록은 안 본다)
 */
export function assembleCompare(
  def: CompareJudgeDefinition,
  ask: CompareAsk,
  body: CompareBody,
  rng: Rng,
): Omit<JudgeProblem, "kind" | "judgeKey" | "familyKey"> {
  const where = `판정형 ${judgeKeyOf(def)} (${ask})`;
  if (body.options.length !== OPTION_COUNT)
    throw new Error(
      `${where}: 보기가 ${body.options.length}개다 — ${OPTION_COUNT}개여야 한다`,
    );
  const texts = body.options.map((o) => norm(o.text));
  if (new Set(texts).size !== OPTION_COUNT)
    throw new Error(`${where}: 보기 글이 겹친다 — ${texts.join(" · ")}`);
  const oddAsk = ask === "나머지 넷과 다른 하나";
  if (!(oddAsk ? /하나는\?$/ : /것은\?$/).test(body.lead.trim()))
    throw new Error(
      `${where}: 발문이 «…${oddAsk ? "하나는?" : "것은?"}» 으로 끝나지 않는다 — ${body.lead}`,
    );
  // 주장부터 본다 — 지면을 짓기 전에 생성기의 산출이 문형에 맞는지.
  answerIndex(
    ask,
    body.options.map((o) => o.claimed),
    where,
    "생성기가 주장한",
  );

  const order = shuffled(rng, body.options);
  const content = [
    body.lead.trim(),
    ...order.map((o, i) => `${CHOICE_MARKS[i]} ${o.text.trim()}`),
  ].join("\n");

  // ── 🔴 지면 글을 다시 잰다 — 생성기의 셈을 다시 부르지 않는다 ──────────────────
  const printed = printedChoices(content);
  if (printed.length !== OPTION_COUNT)
    throw new Error(`${where}: 지면에서 보기를 ${printed.length}개 읽었다`);
  const ctx = printedContext(content);
  const values = printed.map((text, i) => {
    const v = def.readValue(text, ctx);
    if (v === null)
      throw new Error(
        `${where}: ${CHOICE_MARKS[i]} 보기를 다시 재지 못했다 — ${text}`,
      );
    if (!sameFrac(v, order[i]!.claimed))
      throw new Error(
        `${where}: ${CHOICE_MARKS[i]} 보기 — 생성기는 값이 ${fracText(order[i]!.claimed)} 이라는데 다시 재니 ${fracText(v)} 이다 · ${text}`,
      );
    // 해설 첫 줄에 서는 값도 같은 자로 읽는다 — 정답지가 보기와 다른 값을 싣지 않게.
    const shown = def.readValue(order[i]!.brief, ctx);
    if (shown === null || !sameFrac(shown, v))
      throw new Error(
        `${where}: ${CHOICE_MARKS[i]} 보기 — 해설에 적을 값(${order[i]!.brief})이 보기의 값 ${fracText(v)} 과 다르다`,
      );
    return v;
  });
  const at = answerIndex(ask, values, where, "다시 재니");
  const answer = CHOICE_MARKS[at]!;

  const bare = (brief: string) => brief.trim().replace(/^\$|\$$/g, "");
  const third = oddAsk
    ? `나머지 넷은 모두 ${order[at === 0 ? 1 : 0]!.brief.trim()}이다.`
    : `크기를 비교하면 $${order
        .map((o, i) => ({ o, v: values[i]! }))
        .sort((a, b) => compareFrac(a.v, b.v))
        .map((x) => bare(x.o.brief))
        .join("<")}$이다.`;
  const solution = [
    `${body.briefLead.trim()} ${order.map((o, i) => `${CHOICE_MARKS[i]} ${o.brief.trim()}`).join(", ")}이다.`,
    `${answer} ${order[at]!.work.trim()}이다.`,
    third,
    `따라서 ${conclusionOf(body.lead)} ${answer}이다.`,
  ].join("\n");

  assertChoiceCount(content, where);
  assertChoiceMarks(content, where);
  assertChooseAllAnswerCount(content, answer, where);
  if (def.paperExempt === undefined) assertFitsPaper(printed, where);

  return {
    grade: def.grade,
    unitSection: def.unitSection,
    familyId: def.familyId,
    ruleVersion: def.ruleVersion,
    form: "compare",
    ask,
    content,
    answer,
    solution,
    difficulty: def.difficulty,
    facts: body.facts,
    truths: [],
    values: values.map(fracText),
  };
}

const TRUTH_ASKS: readonly JudgeAsk[] = ["옳지 않은 것", "옳은 것"];
const COMPARE_ASKS: readonly JudgeAsk[] = [
  "나머지 넷과 다른 하나",
  "가장 큰 것",
  "가장 작은 것",
];

/**
 * 등록부를 짓는다 — 모양이 틀린 등록은 **지을 때** 던진다(부를 때 가서 알면 늦다).
 * 시험은 픽스처 등록부를 지어 배선을 잰다(살아 있는 등록부만 보면 «도장»이다).
 */
export function createJudgeRegistry(
  defs: readonly AnyJudgeDefinition[],
): JudgeRegistry {
  const byKey = new Map<string, AnyJudgeDefinition>();
  for (const d of defs) {
    const key = judgeKeyOf(d);
    if (!/^중[123]$/.test(d.grade))
      throw new Error(`판정형 학년이 중1~중3 이 아니다: ${key}`);
    if (d.unitSection.length === 0 || d.unitSection.includes("|"))
      throw new Error(`판정형 소단원 이름이 비었거나 «|» 를 품는다: ${key}`);
    if (!JUDGE_FAMILY_ID.test(d.familyId))
      throw new Error(
        `판정형 familyId 꼴이 아니다(${JUDGE_FAMILY_ID}): ${key}`,
      );
    if (!Number.isInteger(d.ruleVersion) || d.ruleVersion < 1)
      throw new Error(
        `판정형 규칙판은 1 이상의 정수다: ${key} r${d.ruleVersion}`,
      );
    if (d.asks.length === 0 || d.sources.length === 0)
      throw new Error(`판정형 물음·원천이 비었다: ${key}`);
    const allowed = d.form === "compare" ? COMPARE_ASKS : TRUTH_ASKS;
    const stray = (d.asks as readonly JudgeAsk[]).filter(
      (a) => !allowed.includes(a),
    );
    if (stray.length > 0)
      throw new Error(
        `판정형 물음이 문형(${d.form ?? "truth"})과 안 맞는다: ${key} — ${stray.join(" · ")}`,
      );
    if (d.difficultyBasis.trim().length === 0)
      throw new Error(`판정형 난이도 근거가 비었다: ${key}`);
    if (d.paperExempt !== undefined && d.paperExempt.trim().length === 0)
      throw new Error(`판정형 지면 관문 면제의 까닭이 비었다: ${key}`);
    if (byKey.has(key)) throw new Error(`판정형 키가 겹친다: ${key}`);
    byKey.set(key, d);
  }

  const entries: JudgeEntry[] = [...byKey.entries()].map(([key, d]) => ({
    key,
    familyKey: judgeFamilyKey(key),
    grade: d.grade,
    unitSection: d.unitSection,
    familyId: d.familyId,
    title: d.title,
    form: d.form ?? "truth",
    asks: d.asks,
    sources: d.sources,
    difficulty: d.difficulty,
    difficultyBasis: d.difficultyBasis,
    ruleVersion: d.ruleVersion,
    paperExempt: d.paperExempt ?? null,
  }));

  return {
    definitions: () => entries,
    has: (key) => byKey.has(key),
    generate(key, seed, variant = 0) {
      const def = byKey.get(key);
      if (!def)
        throw new Error(
          `등록되지 않은 판정형입니다: ${key} — judgementDefinitions() 로 먼저 확인`,
        );
      const rng = createRng(seed + keySalt(key) + variant * 0x9e37);
      // 🔴 재시도 상한에 걸리면 **사유를 달고 멈춘다** — 조용히 모자란 문항을 내지 않는다.
      const failed = (ask: JudgeAsk, e: unknown) =>
        new Error(
          `판정형 ${key} (씨앗 ${seed} · v${variant} · ${ask}) 를 못 만들었다 — ${e instanceof Error ? e.message : String(e)}`,
        );
      const head = {
        kind: "judge" as const,
        judgeKey: key,
        familyKey: judgeFamilyKey(key),
      };
      if (def.form === "compare") {
        const ask = def.asks[variant % def.asks.length]!;
        let body: CompareBody;
        try {
          body = def.generate(rng, ask);
        } catch (e) {
          throw failed(ask, e);
        }
        return { ...head, ...assembleCompare(def, ask, body, rng) };
      }
      const ask = def.asks[variant % def.asks.length]!;
      let body: JudgeBody;
      try {
        body = def.generate(rng, ask);
      } catch (e) {
        throw failed(ask, e);
      }
      return { ...head, ...assembleJudge(def, ask, body, rng) };
    },
  };
}

const DEFAULT = createJudgeRegistry(JUDGE_DEFINITIONS);

/** 기본 등록부 — 적재기 · 미적재 검사 · 제자리 갱신이 부르는 것. */
export function defaultJudgeRegistry(): JudgeRegistry {
  return DEFAULT;
}

/** 등록된 판정형 목록. */
export function judgementDefinitions(): readonly JudgeEntry[] {
  return DEFAULT.definitions();
}

export function generateJudgeProblem(
  key: string,
  seed: number,
  variant = 0,
): JudgeProblem {
  return DEFAULT.generate(key, seed, variant);
}
