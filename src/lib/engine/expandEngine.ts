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
import { hasChoices } from "../problem/choiceCountRule";
import { answerIsChoiceNumber } from "../problem/provenance";
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
    // 🔴 **이미 객관식인 발문은 파생하지 않는다.** 중등 873유형 가운데 20개가
    //    그렇다(2.3%). 파생하면 둘이 어긋난다 — `asShortAnswer` 가 보기 다섯인
    //    문항을 「단답형」으로 찍고, `asDescriptive` 가 보기를 단 채로
    //    「…풀이 과정과 답을 쓰시오」를 붙인다.
    //
    // ⚠️ 가르는 축은 **「보기가 있나」가 아니라 「정답이 번호인가」**다.
    //    「다음 보기 중 …인 것은 **모두 몇 개**인지 구하시오」는 보기가 세는
    //    대상이고 정답이 「$2$개」다 — 그건 단답이고, 서술 파생도 자연스럽다
    //    (「…몇 개인지 풀이 과정과 답을 쓰시오」). 보기만 보고 접으면 그 부류가
    //    통째로 `[?형식]` 이 된다(실측 3유형). `classifyFormat` 이 쓰는 바로
    //    그 축을 여기서도 쓴다.
    if (hasChoices(stem.content) && answerIsChoiceNumber(stem.answer)) {
      items.push({ ...stem, questionType: "객관식" });
      continue;
    }
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
