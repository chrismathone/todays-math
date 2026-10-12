import type {
  GradeSheetResponse,
  GradeSheetStudent,
} from "@/contracts/testresult.contract";
import type { RetryPlanResponse } from "@/contracts/retry.contract";
import type { StudioProblem } from "@/components/unified/types";

export type RetryPlan = RetryPlanResponse["data"];
export type RetrySeat = RetryPlan["picked"][number];
export type RetryGroup = {
  original: GradeSheetResponse["data"]["problems"][number];
  textbook: boolean;
  seats: (RetrySeat | null)[];
};

export async function retryError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error?.message === "string"
    ? body.error.message
    : fallback;
}

/** Pin the saved result: never ask for an implicit latest result or a count that drops a slot. */
export async function fetchSavedRetry(
  testId: string,
  student: GradeSheetStudent,
  signal?: AbortSignal,
): Promise<RetryPlan> {
  const latest = student.latest;
  if (!latest || latest.absent)
    throw new Error("저장된 응시 채점이 필요합니다.");
  const response = await fetch(`/api/tests/${testId}/retry`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      studentId: student.studentId,
      testResultId: latest.testResultId,
    }),
    signal,
  });
  if (!response.ok)
    throw new Error(
      await retryError(response, "오답 복습을 불러오지 못했습니다."),
    );
  const { retryPlanResponseSchema } =
    await import("@/contracts/retry.contract");
  const parsed = retryPlanResponseSchema.safeParse(await response.json());
  if (!parsed.success)
    throw new Error("복습 응답을 확인하지 못했습니다. 다시 불러와 주세요.");
  const plan = parsed.data.data;
  if (
    plan.testId !== testId ||
    plan.studentId !== student.studentId ||
    plan.testResultId !== latest.testResultId ||
    plan.wrongProblemIds.length !== latest.wrongProblemIds.length ||
    new Set(plan.wrongProblemIds).size !== plan.wrongProblemIds.length ||
    plan.wrongProblemIds.some((id) => !latest.wrongProblemIds.includes(id))
  )
    throw new Error(
      "저장된 채점과 복습 응답이 다릅니다. 채점표를 다시 열어 주세요.",
    );
  return plan;
}

/** The server chooses the candidates; this adapter only preserves original links and slot identity. */
export function retryGroups(
  plan: RetryPlan,
  problems: GradeSheetResponse["data"]["problems"],
): RetryGroup[] {
  const byId = new Map(problems.map((problem) => [problem.problemId, problem]));
  const shortageIds = new Set(
    plan.textbookShortfalls.map((row) => row.wrongProblemId),
  );
  const seen = new Set<string>();
  for (const seat of plan.picked) {
    if (
      !plan.wrongProblemIds.includes(seat.wrongProblemId) ||
      seen.has(seat.problem.id)
    )
      throw new Error("복습 문항의 원문 연결을 확인하지 못했습니다.");
    seen.add(seat.problem.id);
  }
  return plan.wrongProblemIds.map((id) => {
    const original = byId.get(id);
    if (!original) throw new Error("시험지에 없는 오답이 있습니다.");
    const picked = plan.picked.filter((seat) => seat.wrongProblemId === id);
    const textbook =
      shortageIds.has(id) ||
      picked.some((seat) =>
        seat.problem.externalId?.startsWith("tb-retry-v1:"),
      );
    if (!textbook) return { original, textbook, seats: picked };
    const seats: (RetrySeat | null)[] = [null, null];
    for (const seat of picked) {
      const slot = [1, 2].find(
        (n) => seat.problem.externalId === `tb-retry-v1:${id}:${n}`,
      );
      if (
        !slot ||
        seats[slot - 1] ||
        seat.origin !== "형제" ||
        seat.problem.source !== "transformed" ||
        seat.problem.originProblemId !== id ||
        seat.problem.reviewStatus !== "approved" ||
        !seat.problem.directUseAllowed
      )
        throw new Error(
          "교과서 원문에 지정된 검토 완료 변형을 확인하지 못했습니다.",
        );
      seats[slot - 1] = seat;
    }
    return { original, textbook, seats };
  });
}

export function retryWorksheetProblems(groups: RetryGroup[]): StudioProblem[] {
  return groups.flatMap((group) =>
    group.seats.flatMap((seat, index) => {
      if (!seat) return [];
      const p = seat.problem;
      const label = `원문 ${group.original.no}번 · ${group.textbook ? `변형 ${index + 1}` : seat.origin}`;
      return [
        {
          id: p.id,
          content: p.content,
          answer: p.answer,
          solution: p.solution ?? "",
          grade: "",
          chapter: "",
          section: label,
          sourceLabel: label,
          difficulty: p.difficulty,
          problemCode: p.problemCode,
          figureUrls: p.figureUrls,
          figureSvg: p.figureSvg,
          // Null geometry stays at the same index; zero is the renderer's unknown-size sentinel.
          figureDims: (p.figureDims ?? []).map((value) => value ?? 0),
          figureSourceMm: (p.figureSourceMm ?? []).map((value) => value ?? 0),
          choiceFigureIndex: (p.choiceFigureIndex ?? []).map(
            (value) => value ?? -1,
          ),
          questionType:
            p.questionType === "객관식"
              ? ("multiple-choice" as const)
              : p.questionType === "서술형"
                ? ("descriptive" as const)
                : ("short-answer" as const),
        },
      ];
    }),
  );
}
