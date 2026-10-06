import {
  fadingTargets,
  type FadingConcept,
  type FadingTarget,
  type FadingTier,
} from "./concepts";
import { fnv1a } from "./random";

/**
 * 단계마다 무엇을 지우는가 (`docs/planning/srs-overhaul-20261006.md` §4-7).
 * 1단계 정독은 지우지 않고, 2단계는 표적의 3분의 1쯤, 3단계는 3분의 2쯤, 4단계 백지는 전부다.
 * 글 핵심어를 먼저 지우고 수식 핵심어는 3단계부터 지운다(글 핵심어가 하나도 없는 개념만 2단계에 수식을 지운다).
 * 무작위가 없다 — 같은 개념은 누구에게나 같은 자리가 빈다. 뒤 단계는 앞 단계의 빈칸을 그대로 품는다.
 */

export const FADING_STEPS = [1, 2, 3, 4] as const;
export type FadingStep = (typeof FADING_STEPS)[number];

/** 표적 `total` 개 가운데 그 단계에서 지우는 수. `textTargets` 는 그중 글 표적의 수(안 주면 전부 글로 본다). */
export function erasedCount(
  total: number,
  step: FadingStep,
  textTargets = total,
): number {
  if (!Number.isInteger(total) || total < 1)
    throw new Error("표적 수는 1 이상의 정수여야 합니다.");
  if (!Number.isInteger(textTargets) || textTargets < 0 || textTargets > total)
    throw new Error("글 표적 수가 올바르지 않습니다.");
  if (step === 1) return 0;
  if (step === 4) return total;
  const third = Math.max(1, Math.round(total / 3));
  const two = textTargets > 0 ? Math.min(third, textTargets) : third;
  if (step === 2) return two;
  // 3단계는 2단계보다 많이. 표적이 셋 이상이면 이 값은 전체보다 작다 — 4단계 몫이 저절로 남는다.
  return Math.min(Math.max(two + 1, Math.round((2 * total) / 3)), total);
}

/** 지우는 차례 — 글 표적을 명제마다 하나씩 돌아가며 먼저, 수식 표적을 그 뒤에. 시작 명제는 개념마다 다르다. */
export function erasureOrder(concept: FadingConcept): FadingTarget[] {
  const count = concept.propositions.length;
  const offset = fnv1a(concept.id) % count;
  const rotated = Array.from(
    { length: count },
    (_, i) => concept.propositions[(offset + i) % count]!,
  );
  const tier = (wanted: FadingTier) => {
    const rows = rotated.map((p) =>
      p.pieces.flatMap((piece) =>
        piece.kind === "target" && piece.target.tier === wanted
          ? [piece.target]
          : [],
      ),
    );
    const ordered: FadingTarget[] = [];
    for (let pass = 0; rows.some((row) => pass < row.length); pass++)
      for (const row of rows) if (pass < row.length) ordered.push(row[pass]!);
    return ordered;
  };
  return [...tier("text"), ...tier("math")];
}

/** 그 단계에서 빈칸이 되는 표적 — 읽는 차례. */
export function erasedTargets(
  concept: FadingConcept,
  step: FadingStep,
): FadingTarget[] {
  const all = fadingTargets(concept);
  const count = erasedCount(
    all.length,
    step,
    all.filter((t) => t.tier === "text").length,
  );
  const erased = new Set(
    erasureOrder(concept)
      .slice(0, count)
      .map((t) => t.id),
  );
  return all.filter((t) => erased.has(t.id));
}

/** 표적마다 처음 빈칸이 되는 단계(2 · 3 · 4) — 화면이 «이 단계에서 새로 비운 자리»를 가를 때 쓴다. */
export function firstErasedSteps(
  concept: FadingConcept,
): Record<string, FadingStep> {
  const steps: Record<string, FadingStep> = {};
  for (const step of [4, 3, 2] as const)
    for (const target of erasedTargets(concept, step)) steps[target.id] = step;
  return steps;
}

/** 소거율(0 ~ 1) — 지운 표적 ÷ 그 개념의 전체 표적. 화면의 «소거율 N%» 는 이 값에서만 나온다. */
export function erasureRate(concept: FadingConcept, step: FadingStep): number {
  return erasedTargets(concept, step).length / fadingTargets(concept).length;
}
