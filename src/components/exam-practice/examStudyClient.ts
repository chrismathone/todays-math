import type {
  ExamStudyCatalog,
  ExamStudyCourse,
  ExamStudyGenerateRequest,
  ExamStudyGeneration,
  ExamStudyItem,
} from "@/contracts/examStudy.contract";
import type { StudioProblem } from "@/components/unified/types";
import { serializeNativeSolution } from "@/contracts/nativeDescriptive.contract";

async function read<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.data) {
    throw new Error(
      value?.error?.message ??
        "응답을 확인하지 못했습니다. 다시 시도해 주세요.",
    );
  }
  return value.data as T;
}

export async function loadStudyCatalog(
  course: ExamStudyCourse,
  signal?: AbortSignal,
) {
  return read<ExamStudyCatalog>(
    await fetch(`/api/exam/practice?course=${encodeURIComponent(course)}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal,
    }),
  );
}

export async function generateStudy(
  recipe: ExamStudyGenerateRequest,
  signal?: AbortSignal,
) {
  return read<ExamStudyGeneration>(
    await fetch("/api/exam/practice", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipe),
    }),
  );
}

export async function recheckStudy(result: ExamStudyGeneration) {
  const current = await read<{ digest: string; deliveredCount: number }>(
    await fetch("/api/exam/practice/resolve", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipe: result.recipe,
        expectedDigest: result.digest,
      }),
    }),
  );
  if (
    current.digest !== result.digest ||
    current.deliveredCount !== result.questions.length
  )
    throw new Error("문항 구성이 바뀌었습니다. 다시 만든 뒤 출력해 주세요.");
}

/** A generated item is a printable local item, never a database UUID or bank row. */
export function studyProblem(item: ExamStudyItem): StudioProblem {
  const solution =
    item.rubric && !item.solution.includes("채점 기준")
      ? serializeNativeSolution(item.solution, item.rubric)
      : item.solution;
  return {
    id: item.id,
    content: item.content,
    answer: item.answer,
    solution,
    questionType:
      item.questionType === "객관식"
        ? "multiple-choice"
        : item.questionType === "서술형"
          ? "descriptive"
          : "short-answer",
    grade: item.course,
    chapter: item.unitSections[0] ?? "기출 대비 연습",
    section: item.unitSections.join(" · "),
    difficulty: item.difficulty,
    problemCode: item.title,
    figureUrls: [],
    figureSvg: item.figureSvg,
    figureDims: [],
    figureSourceMm: [],
    sourceLabel: "자작 기출 대비 연습",
  };
}
