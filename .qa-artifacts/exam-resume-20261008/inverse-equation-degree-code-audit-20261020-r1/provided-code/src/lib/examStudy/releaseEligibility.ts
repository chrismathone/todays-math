import type { ExamStudyFamily } from "@/contracts/examStudy.contract";

export const STUDY_RELEASE_POLICY_VERSION =
  "20261020-source-informed-template-review-r5";

const INVERSE_EQUATION_DEGREE_REVIEW = Object.freeze({
  status: "review-only-template" as const,
  message:
    "차수 조건 역산 유형은 전체 학년·출처·권리·등록 검토 중이므로 현재 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/gangbuk-first2-review-20261020-r2/own-review-evidence-r1/own-review-report-r1.json",
  evidenceSha256:
    "6857d36a7463a82cf70c2692304f37ea2a5cdf04a008aa4d31a0a7168f5b6e2f",
  basis:
    "한 문항의 검토는 새 생성 규칙 전체의 학년·2015/2022 배치·live family·권리·native 승인과 다르다.",
});

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

const INVERSE_ROOT_TABLE_REVIEW = Object.freeze({
  status: "review-only-template" as const,
  message:
    "제곱근표 입력 역추론 유형은 학년·출처·권리·등록 검토 중이므로 현재 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/nobyeon-sem1-current4-family-audit-20261019-r1/q06.json",
  evidenceSha256:
    "a29e3d681a68dddddf4195b5520aa30c967dfeda5ff7abc29b2dc8afa1a4b185",
  basis:
    "표 근삿값의 정확한 계산과 유일성 검사는 학년·live family·권리·native 사용 승인이 아니다.",
});

const INVERSE_MINIMUM_REVIEW = Object.freeze({
  status: "review-only-template" as const,
  message:
    "누락 최솟값 역추론 유형은 학년·출처·권리·등록 검토 중이므로 현재 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/nobyeon-sem1-group13-review-20261020-r1/current-author-summary-parent-r1.json",
  evidenceSha256:
    "2fe611a5aff0fd79c7abb38ba8592c623d9d5a3a46c0a1f2dfd0a7522e3c64b5",
  basis:
    "학생 문장 설계의 검토는 실제 해설·factory·학년·live family·권리·native 사용 승인이 아니다.",
});

const INVERSE_TANGENT_RECTANGLE_REVIEW = Object.freeze({
  status: "review-only-template" as const,
  message:
    "접선 길이 역추론 유형은 전체 학년·도형·출처·권리·등록 검토 중이므로 현재 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/gyeongsin-group7-review-20261020-r2/current-author-summary-parent-r1.json",
  evidenceSha256:
    "6ec79748c2e90da690ca71c0776fe0914589e2ba21adb67ded5edb61c44a219b",
  basis:
    "한 문항의 검수나 기존 family 후보는 새 factory 전체의 학년·교육과정·형식·권리·native 승인이 아니다. 2022 배치도 보류한다.",
});

/** No ID, version, confidence or caller-supplied approval clears this study hold. */
export function studyReleaseHold(
  family: Pick<ExamStudyFamily, "fulfills">,
):
  | typeof INVERSE_COEFFICIENT_REVIEW
  | typeof INVERSE_ROOT_TABLE_REVIEW
  | typeof INVERSE_MINIMUM_REVIEW
  | typeof INVERSE_TANGENT_RECTANGLE_REVIEW
  | typeof INVERSE_EQUATION_DEGREE_REVIEW
  | null {
  if (
    family.fulfills.some(
      (f) => f.requirement === "algebra.inverse-equation-degree",
    )
  )
    return INVERSE_EQUATION_DEGREE_REVIEW;
  if (
    family.fulfills.some(
      (f) => f.requirement === "geometry.inverse-tangent-rectangle",
    )
  )
    return INVERSE_TANGENT_RECTANGLE_REVIEW;
  if (
    family.fulfills.some(
      (f) => f.requirement === "algebra.inverse-coefficient-sum",
    )
  )
    return INVERSE_COEFFICIENT_REVIEW;
  if (
    family.fulfills.some(
      (f) => f.requirement === "number.inverse-extreme-range",
    )
  )
    return INVERSE_MINIMUM_REVIEW;
  return family.fulfills.some(
    (f) => f.requirement === "number.inverse-root-table",
  )
    ? INVERSE_ROOT_TABLE_REVIEW
    : null;
}
