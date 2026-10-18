import type { Prisma } from "@prisma/client";
import {
  questionSelectionSchema,
  type QuestionSelection,
} from "@/contracts/questionFormats.contract";
import { QuestionSelectionConflict } from "./questionSelection";
import { validateQuestionSelections } from "./questionQueries";
import { lockProblemRows } from "./lockRows";

/** New selections carry metadata; historical/custom payloads without it remain byte-for-byte readable. */
export function draftQuestionSelections(payload: unknown): QuestionSelection[] {
  if (!payload || typeof payload !== "object") return [];
  const problems = (payload as { problems?: unknown }).problems;
  if (!Array.isArray(problems)) return [];
  const selected: QuestionSelection[] = [];
  for (const raw of problems) {
    if (!raw || typeof raw !== "object") continue;
    const p = raw as Record<string, unknown>;
    if (p.questionId === undefined && p.questionFormats === undefined) continue;
    const representations = Array.isArray(p.questionFormats)
      ? p.questionFormats
      : [];
    const actual = representations.find(
      (r) =>
        r &&
        typeof r === "object" &&
        (r as { problemId?: unknown }).problemId === p.id,
    ) as Record<string, unknown> | undefined;
    if (actual?.state !== "available") throw new QuestionSelectionConflict();
    const selection = questionSelectionSchema.safeParse({
      questionId: p.questionId,
      problemId: p.id,
      format: actual.format,
      revision: actual.revision,
    });
    if (!selection.success) throw new QuestionSelectionConflict();
    selected.push(selection.data);
  }
  if (new Set(selected.map((s) => s.questionId)).size !== selected.length)
    throw new QuestionSelectionConflict(
      "같은 문항의 여러 형식이 있습니다. 유지할 형식을 선택해 주세요.",
    );
  return selected;
}

export async function validateQuestionDraft(
  tx: Prisma.TransactionClient,
  payload: unknown,
): Promise<void> {
  const selections = draftQuestionSelections(payload);
  if (!selections.length) return;
  await lockProblemRows(
    tx,
    selections.map((s) => s.problemId),
  );
  await validateQuestionSelections(selections, tx);
}
