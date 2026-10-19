import type {
  QuestionFormat,
  QuestionRepresentation,
  QuestionSelection,
} from "@/contracts/questionFormats.contract";

export interface QuestionMetadata {
  id: string;
  questionId?: string;
  questionFormats?: QuestionRepresentation[];
}

export const FORMAT_LABEL: Record<QuestionFormat, string> = {
  multiple_choice: "객관식",
  short_answer: "단답형",
  descriptive: "서술형",
};

/** Only read server identity. Old local / English rows remain independent. */
export const questionIdentity = (
  item: Pick<QuestionMetadata, "id" | "questionId">,
) => item.questionId ?? `row:${item.id}`;

export function selectedQuestionFormat(
  item: QuestionMetadata,
): QuestionSelection | undefined {
  const actual = item.questionFormats?.find(
    (option) => option.problemId === item.id,
  );
  return item.questionId && actual?.format && actual.state === "available"
    ? {
        questionId: item.questionId,
        problemId: item.id,
        format: actual.format,
        revision: actual.revision,
      }
    : undefined;
}

export function possibleFormats(item: QuestionMetadata): string {
  return [
    ...new Set(
      (item.questionFormats ?? [])
        .filter((option) => option.state === "available" && option.format)
        .map((option) => FORMAT_LABEL[option.format!]),
    ),
  ].join(" · ");
}

export function questionConflicts<
  T extends Pick<QuestionMetadata, "id" | "questionId">,
>(items: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = questionIdentity(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}

/** Existing legacy conflicts may be resolved in steps; a new collision is never introduced. */
export function introducesQuestionConflict<
  T extends Pick<QuestionMetadata, "id" | "questionId">,
>(current: readonly T[], next: readonly T[]): boolean {
  const existing = new Map(
    questionConflicts(current).map((group) => [
      questionIdentity(group[0]),
      new Set(group.map((item) => item.id)),
    ]),
  );
  return questionConflicts(next).some((group) => {
    const allowed = existing.get(questionIdentity(group[0]));
    return (
      !allowed ||
      group.length > allowed.size ||
      group.some((item) => !allowed.has(item.id))
    );
  });
}

/** Reject a stale detail rather than copying metadata onto a different actual row. */
export function assertQuestionFormat<T extends QuestionMetadata>(
  original: QuestionMetadata,
  option: QuestionRepresentation,
  actual: T,
): T {
  const current = actual.questionFormats?.find(
    (row) => row.problemId === option.problemId,
  );
  if (
    !original.questionId ||
    actual.questionId !== original.questionId ||
    actual.id !== option.problemId ||
    option.state !== "available" ||
    !option.format ||
    !current ||
    current.state !== "available" ||
    current.format !== option.format ||
    current.revision !== option.revision
  )
    throw new Error(
      "문항 형식이나 내용이 변경되었습니다. 현재 선택은 유지했습니다. 목록을 다시 확인해 주세요.",
    );
  return actual;
}

export function requireQuestionRead(value: { countUnit?: string }) {
  if (value.countUnit !== "question")
    throw new Error(
      "문항 단위 목록을 확인하지 못했습니다. 입력은 유지했습니다. 다시 확인해 주세요.",
    );
}

export function formatBlockedReason(option: QuestionRepresentation): string {
  if (!option.format || option.state === "unverified") return "형식 확인 전";
  const reasons: Record<string, string> = {
    locked: "출제 잠금(사유 미기록)",
    notShared: "공용 풀 아님",
    notApproved: "검수 미통과",
    noAnswer: "정답 없음",
    pending: "검토 대기",
    rejected: "검토 반려",
    review_pending: "검토 대기",
    review_rejected: "검토 반려",
    direct_use_blocked: "직접 출제 제한",
    missing_answer: "정답 확인 필요",
    missing_figure: "그림 확인 필요",
    private: "공개 범위 제한",
  };
  return option.reasonCode && reasons[option.reasonCode]
    ? reasons[option.reasonCode]
    : "현재 출제할 수 없는 표현";
}
