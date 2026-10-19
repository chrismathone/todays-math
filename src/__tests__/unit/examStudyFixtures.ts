import type {
  ExamStudyCatalog,
  ExamStudyGenerateRequest,
  ExamStudyGeneration,
} from "@/contracts/examStudy.contract";
import { EXAM_STUDY_LIMITS } from "@/contracts/examStudy.contract";

/** Auth/UI fixtures authored for tests, not school-original questions or quality evidence. */
export const studyCatalog: ExamStudyCatalog = {
  engineVersion: "fixture-engine",
  manifestVersion: "fixture-v1",
  courses: ["중1", "공통수학2"],
  limits: EXAM_STUDY_LIMITS,
  requirements: [
    {
      id: "algebra.linear-model",
      title: "조건에서 일차방정식 세우기",
      concepts: ["일차방정식"],
      conditionTopology: ["상황", "방정식"],
      representation: "text",
      caseAnalysis: "none",
      response: ["단답형", "객관식"],
      structuralDifficultyBasis: ["말을 식으로 전환"],
    },
  ],
  families: [
    {
      id: "fixture-model",
      version: "1",
      title: "조건에서 식 세우기",
      course: "중1",
      unitSections: ["일차방정식의 활용"],
      source: "authored",
      formats: ["단답형"],
      difficulties: ["응용"],
      representation: "text",
      fulfills: [{ requirement: "algebra.linear-model", level: "full" }],
    },
  ],
  profiles: [
    {
      id: "fixture-profile",
      version: "1",
      schoolId: "fixture-school",
      schoolName: "검사학교",
      aliases: ["검사학교"],
      region: "검사",
      course: "중1",
      scope: {
        label: "검사 범위",
        sourceYear: 2025,
        semester: 1,
        round: "기말",
        reviewedOn: "2026-10-18",
        visibleCount: 19,
        totalCount: 22,
        unknownCount: 3,
        difficultyCalibration: "unmeasured",
      },
      requirements: [{ id: "algebra.linear-model", weight: 1 }],
    },
  ],
};

export function studyGeneration(
  recipe: ExamStudyGenerateRequest,
): ExamStudyGeneration {
  return {
    engineVersion: "fixture-engine",
    manifestVersion: "fixture-v1",
    profileId: recipe.profileId ?? null,
    profileVersion: recipe.profileId ? "1" : null,
    recipe,
    digest: (recipe.seed % 2 ? "a" : "b").repeat(64),
    status: "partial",
    requestedCount: recipe.count,
    deliveredCount: 1,
    schoolEvidence: recipe.profileId ? studyCatalog.profiles[0]!.scope : null,
    warnings: ["요청한 문항 수 중 제공 가능한 범위입니다."],
    requirements: [
      {
        id: "algebra.linear-model",
        title: "조건에서 일차방정식 세우기",
        status: "full",
        requested: 1,
        delivered: 1,
        reason: null,
      },
    ],
    questions: [
      {
        id: `practice-fixture-${recipe.seed}`,
        logicalKey: `fixture@1-${recipe.seed}`,
        contentDigest: "c".repeat(64),
        familyId: "fixture-model",
        familyVersion: "1",
        title: "조건에서 식 세우기",
        course: "중1",
        unitSections: ["일차방정식의 활용"],
        seed: recipe.seed,
        variant: 0,
        requirements: ["algebra.linear-model"],
        content: "어떤 수에 7을 더하면 12이다. 어떤 수를 구하시오.",
        answer: "$5$",
        solution: "$x+7=12$에서 $x=5$이다.",
        questionType: "단답형",
        difficulty: "응용",
        difficultyBasis: ["상황에서 식 세우기"],
        parameters: { add: 7, total: 12 },
        figureSpec: null,
        figureSvg: null,
      },
    ],
  };
}
