/**
 * 엔진 단답 산출 → 변형 n개 × 형식 3종.
 *
 * generateElementaryProblem / generateMiddleProblem 을 바꾸지 않는다.
 * 그 함수들의 산출을 여기서만 펼친다. familyKey 는 호출부가 넘긴 값을
 * 형식·변형에 복사할 뿐 조립하지 않는다 (키 모양은 적재기 SSOT).
 *
 * 객관식 오답을 계산 실수로 못 만들면 그 변형의 객관식만 건너뛰고
 * 단답·서술은 남긴다. 조용히 세 형식을 다 냈다고 하지 않는다.
 */
import { createRng } from "../elementary/rng";
import {
  asDescriptive,
  asMultipleChoice,
  asShortAnswer,
  type DerivedProblem,
  type StemProblem,
} from "./deriveFormats";
import { collectDistinctVariants } from "./variants";

export type ExpandResult = {
  items: DerivedProblem[];
  skippedMcq: number;
  reasons: string[];
};

export function expandFamily(
  generateStem: (variant: number) => StemProblem,
  nVariants = 3,
): ExpandResult {
  const stems = collectDistinctVariants(generateStem, nVariants);
  const items: DerivedProblem[] = [];
  const reasons: string[] = [];
  let skippedMcq = 0;

  for (let i = 0; i < stems.length; i += 1) {
    const stem = stems[i]!;
    items.push(asShortAnswer(stem));
    items.push(asDescriptive(stem));
    try {
      items.push(asMultipleChoice(stem, createRng(0x9e37 + i * 17)));
    } catch (err) {
      skippedMcq += 1;
      reasons.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { items, skippedMcq, reasons };
}
