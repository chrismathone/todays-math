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
  type JudgeAsk,
  type JudgeBody,
  type JudgeDefinition,
  type JudgeProblem,
} from "./contract";
import { JUDGE_DEFINITIONS } from "./definitions";

/** 등록부가 밖에 보이는 모양 — 생성기 함수는 빼고 메타만. */
export type JudgeEntry = {
  key: string;
  familyKey: string;
  grade: string;
  unitSection: string;
  familyId: string;
  title: string;
  asks: readonly JudgeAsk[];
  sources: readonly string[];
  difficulty: JudgeDefinition["difficulty"];
  difficultyBasis: string;
  ruleVersion: number;
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

/** «옳지 않은 것» 물음에서 고를 보기는 거짓인 것 — 그 보기가 «다른 하나»다. */
function isOdd(ask: JudgeAsk, truth: boolean): boolean {
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
 */
export function assembleJudge(
  def: JudgeDefinition,
  ask: JudgeAsk,
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
  const truths = printed.map((text, i) => {
    const t = def.truthOf(text);
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

  const conclusion = body.lead
    .trim()
    .replace(/^다음 중\s*/, "")
    .replace(/\?$/, "");
  const solution = [
    ...order.map((o, i) => `${CHOICE_MARKS[i]} ${o.explain.trim()}`),
    `따라서 ${conclusion} ${answer}이다.`,
  ].join("\n");

  // 객관식 틀의 공용 관문 — 생성기마다 따로 지키지 않는다(`../generate.ts` 와 같은 자리).
  assertChoiceCount(content, where);
  assertChoiceMarks(content, where);
  assertChooseAllAnswerCount(content, answer, where);

  return {
    grade: def.grade,
    unitSection: def.unitSection,
    familyId: def.familyId,
    ruleVersion: def.ruleVersion,
    ask,
    content,
    answer,
    solution,
    difficulty: def.difficulty,
    facts: body.facts,
    truths,
  };
}

/**
 * 등록부를 짓는다 — 모양이 틀린 등록은 **지을 때** 던진다(부를 때 가서 알면 늦다).
 * 시험은 픽스처 등록부를 지어 배선을 잰다(살아 있는 등록부만 보면 «도장»이다).
 */
export function createJudgeRegistry(
  defs: readonly JudgeDefinition[],
): JudgeRegistry {
  const byKey = new Map<string, JudgeDefinition>();
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
    if (d.difficultyBasis.trim().length === 0)
      throw new Error(`판정형 난이도 근거가 비었다: ${key}`);
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
    asks: d.asks,
    sources: d.sources,
    difficulty: d.difficulty,
    difficultyBasis: d.difficultyBasis,
    ruleVersion: d.ruleVersion,
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
      const ask = def.asks[variant % def.asks.length]!;
      let body: JudgeBody;
      try {
        body = def.generate(rng, ask);
      } catch (e) {
        // 🔴 재시도 상한에 걸리면 **사유를 달고 멈춘다** — 조용히 모자란 문항을 내지 않는다.
        throw new Error(
          `판정형 ${key} (씨앗 ${seed} · v${variant} · ${ask}) 를 못 만들었다 — ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return {
        kind: "judge",
        judgeKey: key,
        familyKey: judgeFamilyKey(key),
        ...assembleJudge(def, ask, body, rng),
      };
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
