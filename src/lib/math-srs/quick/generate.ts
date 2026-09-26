import { createRng, intBetween } from "../../elementary/rng";
import type { Rng } from "../../elementary/types";
import type { ConceptId, Difficulty } from "../types";
import { BALANCE_SHAPES } from "./balance";
import { BOTH_SIDES_SHAPES } from "./bothSides";
import { DISTRIBUTE_SHAPES } from "./distribute";
import { FRACTIONS_SHAPES } from "./fractions";
import type { Choice, QuickShape, Wrong } from "./shape";
import { m } from "./tex";
import { TWO_STEP_SHAPES } from "./twoStep";
import type { QuickItem } from "./types";
import {
  QUICK_CHOICE_MAX_EM,
  QUICK_EQUATION_MAX_EM,
  choiceWidthEm,
} from "./width";
import { WORD_SHAPES } from "./word";

/**
 * 모바일 «한 걸음» 문항 생성기 (트랙 B1 · 2026-09-27).
 *
 * 🔴 **격리** — 이 문항은 모바일 복습(math-srs 미션) 안에서만 산다. 문제은행·시험지·엔진 등록부
 *    어디에도 넣지 않는다(원장님 2026-09-27). 가져다 쓸 수 있는 곳은
 *    `src/__tests__/unit/mathSrsQuickFence.test.ts` 의 허용 목록이 정한다.
 */
const SHAPES: readonly QuickShape[] = [
  ...BALANCE_SHAPES,
  ...TWO_STEP_SHAPES,
  ...DISTRIBUTE_SHAPES,
  ...BOTH_SIDES_SHAPES,
  ...FRACTIONS_SHAPES,
  ...WORD_SHAPES,
];

export interface QuickShapeInfo {
  /** 원장님이 «몇 번 빼 주세요»라고 부를 번호(1부터) */
  no: number;
  templateId: string;
  conceptId: ConceptId;
  name: string;
  title: string;
  summary: string;
  seconds: readonly [number, number];
}

export const QUICK_SHAPES: readonly QuickShapeInfo[] = SHAPES.map((s, i) => ({
  no: i + 1,
  templateId: `quick:${s.conceptId}:${s.name}`,
  conceptId: s.conceptId,
  name: s.name,
  title: s.title,
  summary: s.summary,
  seconds: s.seconds,
}));

/** 시안 화면용 — 보기마다 «어떤 실수에서 나오나»(정답 칸은 null) */
export type QuickItemPreview = QuickItem & { mistakes: (string | null)[] };

const MAX_ATTEMPTS = 300;
const MAX_NUMBER = 99;

const sameSig = (a: Choice, b: Choice) =>
  a.sig.length === b.sig.length &&
  a.sig.every((v, i) => Math.abs(v - b.sig[i]!) < 1e-9);

/** 보기 종류 — 방정식·식·수. 한 문항의 보기는 한 종류다. */
const kindOf = (tex: string) =>
  tex.includes("=")
    ? "eq"
    : /[a-z]/.test(tex.replace(/\\[a-zA-Z]+/g, ""))
      ? "expr"
      : "num";

const numbersFit = (tex: string) =>
  (tex.match(/\d+/g) ?? []).every((n) => Number(n) <= MAX_NUMBER);

/** 폰 2×2 칸에 들고, 수가 두 자리 안이고, 값이 유한한가 */
const fits = (c: Choice) =>
  choiceWidthEm(c.tex) <= QUICK_CHOICE_MAX_EM &&
  numbersFit(c.tex) &&
  c.sig.every(Number.isFinite);

/** 서식 사고(`1x`·`0x`·`+-`) — 모양 코드의 잘못이라 던진다(조용히 다시 뽑지 않는다) */
function assertTidy(templateId: string, text: string) {
  for (const [, span] of text.matchAll(/\$([^$]+)\$/g))
    if (/(^|[^\d.])[01][a-z]|\+-|-\+|--|\+\+/.test(span!))
      throw new Error(`${templateId}: 서식 사고 «${span}»`);
}

function secondsFor(shape: QuickShape, difficulty: Difficulty): number {
  const [lo, hi] = shape.seconds;
  return Math.round(lo + ((hi - lo) * (difficulty - 1)) / 4);
}

function assemble(
  shape: QuickShape,
  rng: Rng,
  difficulty: Difficulty,
  seed: number,
): QuickItemPreview {
  const templateId = `quick:${shape.conceptId}:${shape.name}`;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const draft = shape.build(rng, difficulty);
    if (!draft || !fits(draft.correct)) continue;
    if (!numbersFit(draft.prompt) || !numbersFit(draft.equation)) continue;
    // 식 칸은 320px 에서 한 줄
    if (draft.equation && choiceWidthEm(draft.equation) > QUICK_EQUATION_MAX_EM)
      continue;
    const kind = kindOf(draft.correct.tex);
    const picked: Wrong[] = [];
    for (const w of draft.wrong) {
      if (picked.length === 3) break;
      if (!w || !fits(w) || kindOf(w.tex) !== kind) continue;
      if (sameSig(w, draft.correct) || picked.some((p) => sameSig(p, w)))
        continue;
      picked.push(w);
    }
    if (picked.length < 3) continue;
    // 오답 순서도 섞는다 — 늘 같은 실수가 같은 칸에 서지 않게
    for (let i = picked.length - 1; i > 0; i -= 1) {
      const j = intBetween(rng, 0, i);
      [picked[i], picked[j]] = [picked[j]!, picked[i]!];
    }
    const answerIndex = intBetween(rng, 0, 3);
    const choices: string[] = [];
    const mistakes: (string | null)[] = [];
    let next = 0;
    for (let i = 0; i < 4; i += 1) {
      if (i === answerIndex) {
        choices.push(m(draft.correct.tex));
        mistakes.push(null);
      } else {
        const w = picked[next++]!;
        choices.push(m(w.tex));
        mistakes.push(w.mistake);
      }
    }
    const equation = draft.equation ? m(draft.equation) : "";
    for (const text of [draft.prompt, equation, ...choices, ...draft.solution])
      assertTidy(templateId, text);
    return {
      templateId,
      conceptId: shape.conceptId,
      difficulty,
      prompt: draft.prompt,
      equation,
      choices,
      answerIndex,
      solution: draft.solution,
      hint: shape.hint,
      expectedSeconds: secondsFor(shape, difficulty),
      mistakes,
    };
  }
  throw new Error(
    `${templateId} 난이도 ${difficulty} 씨앗 ${seed}: ${MAX_ATTEMPTS}번 뽑아도 보기 넷을 못 만들었습니다`,
  );
}

const shapesOf = (conceptId: ConceptId) =>
  SHAPES.filter((s) => s.conceptId === conceptId);

/** 씨앗의 첫 수로 모양을 고른다 — 모양 지정 생성도 같은 한 수를 먼저 쓴다(같은 문항이 나오게). */
function startRng(conceptId: ConceptId, seed: number): [Rng, QuickShape] {
  const own = shapesOf(conceptId);
  if (own.length === 0)
    throw new Error(`한 걸음 모양이 없는 개념: ${conceptId}`);
  const rng = createRng(seed);
  return [rng, own[intBetween(rng, 0, own.length - 1)]!];
}

/** 시안용 칸(`mistakes`)을 떼고 계약 모양(`QuickItem`)만 남긴다 */
export function toQuickItem(preview: QuickItemPreview): QuickItem {
  return {
    templateId: preview.templateId,
    conceptId: preview.conceptId,
    difficulty: preview.difficulty,
    prompt: preview.prompt,
    equation: preview.equation,
    choices: preview.choices,
    answerIndex: preview.answerIndex,
    solution: preview.solution,
    hint: preview.hint,
    expectedSeconds: preview.expectedSeconds,
  };
}

/** 같은 입력 → 같은 출력. 개념의 모양은 씨앗이 고른다. */
export function generateQuickItem(input: {
  conceptId: ConceptId;
  difficulty: Difficulty;
  seed: number;
}): QuickItem {
  const [rng, shape] = startRng(input.conceptId, input.seed);
  return toQuickItem(assemble(shape, rng, input.difficulty, input.seed));
}

/** 모양을 지정해 만든다(시안 화면·시험). 같은 씨앗이면 `generateQuickItem` 과 같은 문항이다. */
export function generateQuickItemOfShape(input: {
  templateId: string;
  difficulty: Difficulty;
  seed: number;
}): QuickItemPreview {
  const shape = SHAPES.find(
    (s) => `quick:${s.conceptId}:${s.name}` === input.templateId,
  );
  if (!shape) throw new Error(`없는 한 걸음 모양: ${input.templateId}`);
  const [rng] = startRng(shape.conceptId, input.seed);
  return assemble(shape, rng, input.difficulty, input.seed);
}
