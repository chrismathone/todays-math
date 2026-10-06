import { fadingTargets, type FadingConcept } from "./concepts";
import { erasedTargets, type FadingStep } from "./erasure";
import { seededShuffle } from "./random";

/**
 * 칩 — 빈칸에 넣는 조각 (`docs/planning/srs-overhaul-20261006.md` §4-6 · §4-7 · §6).
 * 🔴 칩은 어느 빈칸의 것인지 · 함정인지를 싣지 않는다. id 는 놓인 자리(`c1` …)일 뿐이고, 맞는가는 글로만 가린다 —
 * 시안은 칩 번호가 빈칸 번호와 같고 함정에 표시가 붙어 있어 틀릴 길이 없었다.
 */
export type FadingChip = { id: string; text: string };

/**
 * 함정 칩 — 그 개념의 어느 빈칸에도 답이 아닌 조각. 🔴 검증을 거친 것만 넣는다: 넣어도 맞는 조각이 함정으로 들어가면
 * 학생이 맞게 풀고 틀렸다는 말을 듣는다. 검증된 표가 생기기 전에는 함정 없이 돈다(칩을 다른 빈칸에 넣는 것으로도 틀릴 수 있다).
 */
export type FadingTrap = { text: string; why?: string };

/** 칩의 글 — 앞뒤 공백과 겹친 공백을 지운 것. 칩 묶음 · 맞음 판정 · 내용 지문(`contentKey.ts`)이 같은 규칙을 쓴다. */
export const normalizeChipText = (text: string) =>
  text.trim().replace(/\s+/g, " ");
const normalized = normalizeChipText;

/** 그 단계의 칩 묶음 — 지운 표적마다 하나 + 함정. 같은 개념 · 단계 · 씨앗이면 언제나 같은 차례다. */
export function chipTray(
  concept: FadingConcept,
  step: FadingStep,
  options: { seed: number; traps?: readonly FadingTrap[] },
): FadingChip[] {
  const answers = erasedTargets(concept, step).map((t) => normalized(t.text));
  if (!answers.length) return [];
  const taken = new Set(answers);
  const traps: string[] = [];
  for (const trap of options.traps ?? []) {
    const text = normalized(trap.text);
    if (!text || taken.has(text)) continue;
    taken.add(text);
    traps.push(text);
  }
  return seededShuffle(
    [...answers, ...traps],
    `${concept.id}:${step}:${options.seed}`,
  ).map((text, i) => ({ id: `c${i + 1}`, text }));
}

/** 그 칩이 그 빈칸의 답인가 — 글이 같으면 맞다(글이 같은 두 빈칸은 어느 칩이든 받는다). */
export function chipFits(
  concept: FadingConcept,
  targetId: string,
  chip: FadingChip,
): boolean {
  const target = fadingTargets(concept).find((t) => t.id === targetId);
  if (!target) throw new Error(`이 개념에 없는 빈칸입니다: ${targetId}`);
  return normalized(target.text) === normalized(chip.text);
}
