import type { ExamStudyFamily } from "@/contracts/examStudy.contract";

/** Grade restrictions precede mathematical coverage, format and profile quotas. */
export const STUDY_CURRICULUM_POLICY_VERSION =
  "20261019-m1-symbolic-sum-hold-r1";

const M1_SYMBOLIC_SUM_HOLD = Object.freeze({
  status: "excluded-required-out-of-grade-method" as const,
  targetCurriculum: "2022",
  message:
    "중1 범위를 벗어나는 필수 식 계산이 포함된 문자 합 유형은 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/curriculum-reference-coprime-symbolic-sum-20261019-r1/curriculum-decision.json",
  evidenceSha256:
    "b9eb5fa82ed403763f21dae739dcc7a74fe53badcd0438a5848ac8f6ff34c836",
  basis:
    "9수02-02의 일차식 계산과 이후 다항식 연산을 구분한다. 공식을 제공해도 필수 이차식 전개를 중1 범위로 승인하지 않는다.",
});

/**
 * This is a specific reviewed-method hold, never a blanket ban on an n² glyph.
 * No renamed family, new version or confidence flag can silently clear it.
 * A legitimate rewrite needs separate actual seven-surface review and policy revision.
 * Other templates receive no general curriculum certification from a null result.
 */
export function studyCurriculumHold(
  family: Pick<ExamStudyFamily, "course" | "fulfills">,
): typeof M1_SYMBOLIC_SUM_HOLD | null {
  return family.course === "중1" &&
    family.fulfills.some((f) => f.requirement === "number.coprime-symbolic-sum")
    ? M1_SYMBOLIC_SUM_HOLD
    : null;
}
