/**
 * 오늘의 영어 — 고쳐 쓰기 되먹임 (D-150 · 25 §12). 초안 하나에 대해 **기계가 잰 사실**만 한 줄씩 돌려준다:
 * 제품 검증기(`validate.ts` — 저장을 막는 규칙)의 사유 + 결정적 품질 검사(`quality.ts` — 막지 않는 규칙)의 실패.
 *
 * DeepSeek 생성이 검증기에 걸리면 이 목록을 모델에 되먹여 한 번 고쳐 쓰게 한다(`generate.ts`). 모델 벤치의 쪼기 루프
 * (`scripts/qa/english-bench/refine.ts`)도 같은 함수를 쓴다 — 벤치에서 잰 효과(DeepSeek 채택률 67% → 100%)가 제품과 같은 되먹임에서 나오게.
 * 모델 자신의 «반성»은 넣지 않는다(외부 피드백 없는 자기 수정은 안 된다 — ICLR 2024, codex 조사).
 */
import {
  englishQuestionSchema,
  type EnglishQuestion,
} from "@/contracts/english.contract";

import { reviewEnglishDraft, type EnglishQualityExpectation } from "./quality";
import { validateEnglishDraft } from "./validate";

export function englishDraftFeedback(
  value: unknown,
  expect: EnglishQualityExpectation,
): string[] {
  const lines: string[] = [];
  const verdict = validateEnglishDraft(value, expect);
  if (!verdict.ok)
    for (const issue of verdict.issues)
      lines.push(
        `${issue.question === null ? "세트" : `q${issue.question + 1}`}: ${issue.message}`,
      );
  const draft = (value ?? {}) as {
    title?: unknown;
    passage?: unknown;
    questions?: unknown;
  };
  const parsed = (Array.isArray(draft.questions) ? draft.questions : []).map(
    (question) => englishQuestionSchema.safeParse(question),
  );
  const valid = parsed.flatMap((p) =>
    p.success ? [p.data] : [],
  ) as EnglishQuestion[];
  const index = parsed.flatMap((p, i) => (p.success ? [i] : []));
  const report = reviewEnglishDraft(
    {
      title: String(draft.title ?? ""),
      source: "deepseek",
      passage: String(draft.passage ?? ""),
      questions: valid,
    },
    expect,
  );
  for (const question of report.questions)
    for (const c of question.checks)
      if (!c.ok)
        lines.push(
          `q${index[question.question]! + 1} (${question.type}): ${c.message}`,
        );
  for (const c of report.set) if (!c.ok) lines.push(`세트: ${c.message}`);
  return [...new Set(lines)];
}
