import { conceptWeightsFor } from "./generator";
import { generateQuickItem } from "./quick/types";
import type {
  ConceptId,
  Difficulty,
  GeneratedProblem,
  MissionKind,
} from "./types";

/**
 * 학생 서버 복습 미션의 문항 공급 — 폰 «한 걸음» 문항(`quick/**`)을 미션 문항 모양으로 옮긴다.
 *
 * 모양은 B2 의 저장 규칙 그대로(`sharedAnswers.ts` `srsChoiceIssue`): `answer` 는 정답 보기 번호(0부터),
 * `choices` 는 표시 순서 그대로의 보기 넷, 숫자 정답 표기(`answerText`·`answerUnit`)와 종이 엔진 출처(`source`)는 없다.
 * 저장 스키마가 엄격(strict)해서 한 걸음 문항의 다른 칸(`answerIndex` 등)은 싣지 않는다.
 *
 * 🔴 **학생 서버 미션만** 이 공급을 쓴다(`serverState.ts` `startSrsMission`). 원장님 연구실
 *    (`/lab/math-srs/algebra`, 브라우저 기록 · 글자 입력칸뿐)은 `createMission` 의 기본 공급인 숫자 엔진 그대로다.
 * 🔴 **격리**(원장님 2026-09-27): 이 파일은 복습 미션 안에서만 쓴다 — `mathSrsQuickFence.test.ts`.
 */
export function quickMissionProblem({
  conceptId,
  difficulty,
  kind = "training",
  seed,
}: {
  conceptId: ConceptId;
  difficulty: Difficulty;
  kind?: MissionKind;
  seed: number;
}): GeneratedProblem {
  const item = generateQuickItem({ conceptId, difficulty, seed });
  return {
    id: `${item.templateId}-${seed >>> 0}-${kind}`,
    templateId: item.templateId,
    conceptId: item.conceptId,
    conceptWeights: conceptWeightsFor(item.conceptId),
    difficulty: item.difficulty,
    kind,
    prompt: item.prompt,
    equation: item.equation,
    answer: item.answerIndex,
    choices: [...item.choices],
    hint: item.hint,
    solution: [...item.solution],
    expectedSeconds: item.expectedSeconds,
  };
}
