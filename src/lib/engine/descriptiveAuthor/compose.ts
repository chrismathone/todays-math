import type {
  NativeAuthoredTask,
  NativeHelperAdapters,
  NativeHelperOutput,
  NativePrimaryAuthor,
} from "../../../contracts/descriptiveAuthor.contract";
import type { ExamStudyDraft } from "../../../contracts/examStudy.contract";
import { parseNativeDescriptiveProblem } from "../../../contracts/nativeDescriptive.contract";
import { createNativeHelperAdapters } from "./adapters";

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** No registry, fallback, database, or school-profile writes. A failed helper aborts this item. */
export async function createNativeAuthoredTask(
  author: NativePrimaryAuthor,
  seed: number,
  variant: number,
  adapters: NativeHelperAdapters = createNativeHelperAdapters(),
): Promise<NativeAuthoredTask> {
  if (
    !Number.isSafeInteger(seed) ||
    !Number.isSafeInteger(variant) ||
    variant < 0
  )
    throw new Error("주 저자 씨앗/변형 범위 오류");
  const context = Object.freeze({ seed, variant });
  const completed = new Map<string, NativeHelperOutput>();
  const ids = author.helpers.map((h) => h.id);
  if (ids.some((id) => !id.trim()) || new Set(ids).size !== ids.length)
    throw new Error("보조 ID 없음/중복");
  for (const helper of author.helpers) {
    try {
      const request = helper.request(
        context,
        new Map(structuredClone([...completed])),
      );
      if (request.id !== helper.id || request.kind !== helper.kind)
        throw new Error("보조 요청 정체가 다릅니다");
      if (
        request.kind === "calculation" &&
        (request.seed !== seed ||
          request.variant !== variant ||
          request.engine !== "middle")
      )
        throw new Error("계산 보조 씨앗/변형/엔진이 다릅니다");
      const result =
        request.kind === "calculation"
          ? await adapters.calculation(request)
          : await adapters[request.kind](request);
      if (!result.ok) throw new Error(result.error);
      const output = result.output;
      if (
        output.id !== helper.id ||
        output.kind !== helper.kind ||
        (request.kind === "calculation" &&
          (output.kind !== "calculation" ||
            output.typeKey !== request.typeKey ||
            output.engine !== request.engine)) ||
        (request.kind !== "calculation" &&
          (output.kind === "calculation" ||
            !same(output.spec, request.spec) ||
            !output.svg.trim()))
      )
        throw new Error("보조 결과 정체/인쇄 스펙이 다릅니다");
      completed.set(helper.id, structuredClone(output));
    } catch (error) {
      throw new Error(
        `${helper.kind}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const problem = author.compose(
    context,
    new Map(structuredClone([...completed])),
  );
  parseNativeDescriptiveProblem(problem);
  const definition = author.definition;
  if (
    problem.definitionId !== definition.definitionId ||
    problem.seed !== seed ||
    problem.variant !== variant ||
    !same(problem.curriculum, definition.curriculum) ||
    definition.grade !== problem.curriculum.grade ||
    !definition.assessmentObjective.trim() ||
    !definition.situation.trim() ||
    !definition.studentEvidence.length ||
    !definition.studyRequirementIds.length ||
    definition.subquestions.length !== problem.requirements.length
  )
    throw new Error("주 저자 평가·정체·교육과정 불일치");
  for (const sub of definition.subquestions) {
    const requirement = problem.requirements.find(
      (r) => r.requirementId === sub.requirementId,
    );
    if (
      !requirement ||
      requirement.text !== sub.text ||
      !problem.content.includes(sub.text) ||
      problem.rubric.criteria
        .filter((c) => requirement.criterionIds.includes(c.criterionId))
        .reduce((sum, c) => sum + c.points, 0) !== sub.points
    )
      throw new Error("주 저자 소문항·요구·배점 불일치");
  }
  const figures = [...completed.values()].filter(
    (h) => h.kind !== "calculation",
  );
  // The current print contract has one figure slot. Refuse ambiguous composition.
  if (
    figures.length > 1 ||
    (figures.length === 1 && !same(figures[0]!.spec, problem.figureSpec))
  )
    throw new Error("주 저자가 조립한 그림과 보조의 인쇄 스펙 불일치");
  if (problem.figureSpec !== null && figures.length === 0)
    throw new Error("그림 보조의 인쇄 결과 없음");
  return {
    authorId: definition.definitionId,
    definition: structuredClone(definition),
    helpers: [...completed.values()],
    problem,
    figureSvg: figures[0]?.svg ?? null,
  };
}

/** An unregistered draft only; examStudy's existing evidence promotion remains authoritative. */
export function toExamStudyDraft(task: NativeAuthoredTask): ExamStudyDraft {
  const p = task.problem;
  return {
    content: p.content,
    answer: p.answer,
    solution: p.solution,
    questionType: "서술형",
    difficulty: task.definition.difficulty,
    difficultyBasis: [task.definition.difficultyBasis],
    parameters: { seed: p.seed, variant: p.variant },
    figureSpec: p.figureSpec,
    rubric: p.rubric,
  };
}
