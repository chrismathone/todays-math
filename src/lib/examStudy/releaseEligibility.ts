import type { ExamStudyFamily } from "@/contracts/examStudy.contract";

export const STUDY_RELEASE_POLICY_VERSION =
  "20261019-source-informed-template-review-r1";

const INVERSE_COEFFICIENT_REVIEW = Object.freeze({
  status: "review-only-template" as const,
  message:
    "계수 합 역산 유형은 학년·출처·권리·등록 검토 중이므로 현재 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/nobyeon-sem1-current4-family-audit-20261019-r1/q10.json",
  evidenceSha256:
    "397401ff33e07cc39e68512631751d98bfc245a7f549d31d8bb7c1b540002579",
  basis:
    "새 계산 구현·정답 검산은 기존 live family 등록이나 출처·권리·native 사용 승인과 다르다.",
});

/** No ID, version, confidence or caller-supplied approval clears this study hold. */
export function studyReleaseHold(
  family: Pick<ExamStudyFamily, "fulfills">,
): typeof INVERSE_COEFFICIENT_REVIEW | null {
  return family.fulfills.some(
    (f) => f.requirement === "algebra.inverse-coefficient-sum",
  )
    ? INVERSE_COEFFICIENT_REVIEW
    : null;
}
