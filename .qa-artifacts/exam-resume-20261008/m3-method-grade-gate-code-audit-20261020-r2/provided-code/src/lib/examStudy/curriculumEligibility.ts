import type { ExamStudyFamily } from "@/contracts/examStudy.contract";

/** Grade restrictions precede mathematical coverage, format and profile quotas. */
export const STUDY_CURRICULUM_POLICY_VERSION =
  "20261020-reviewed-student-methods-r4";

function m3MethodHold(
  method: string,
  evidence: string,
  evidenceSha256: string,
  basis: string,
) {
  return Object.freeze({
    status: "excluded-required-out-of-grade-method" as const,
    targetCurriculum: "2015-M3;2022-placement-review-pending",
    message: `초등·중1·중2에서는 중3 범위의 ${method} 유형을 제공하지 않습니다.`,
    evidence,
    evidenceSha256,
    basis,
  });
}

// Restrictions follow complete required methods, including component coverage.
// A null result for another course is never a curriculum or release approval.
const M3_ONLY_STUDENT_METHODS = [
  {
    requirement: "algebra.inverse-coefficient-sum",
    hold: m3MethodHold(
      "다항식 곱셈의 계수 전개",
      ".qa-artifacts/exam-resume-20261008/inverse-coefficient-engine-audit-20261019-r2/report.json",
      "3fe6f7e52c257bb29faa7d15047f4661791de639277523e85c42d1072a50d861",
      "검토된 학생 방법은 두 일차식의 곱을 전개하여 두 계수의 합에서 입력을 역산한다. 중3 실제 방법 검토를 이전 학년 배치 허가로 바꾸지 않는다.",
    ),
  },
  {
    requirement: "number.inverse-root-table",
    hold: m3MethodHold(
      "제곱근과 제곱근표의 관계 계산",
      ".qa-artifacts/exam-resume-20261008/inverse-root-table-engine-audit-20261019-r1/own-engine-audit-report.json",
      "2d99647a2761cfb19ecbd80e1b5a8d17be292f19c366c8bf2b15cd832b768bc2",
      "검토된 학생 방법은 양의 제곱근과 피제곱수 변화의 관계를 해석해 입력을 복원한다. 소수표를 읽는 기능만으로 이전 학년의 제곱근 방법을 허용하지 않는다.",
    ),
  },
  {
    requirement: "number.inverse-extreme-range",
    hold: m3MethodHold(
      "근호의 대소 비교와 사칙계산",
      ".qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r2/own-audit-report.json",
      "29c514b7040b9b4b3aafbfd8eeb0c657c751ac2f7bb883ec32b3ba6557b00c7d",
      "검토된 학생 방법은 실제 최대·최소와 복원값의 위치를 근호의 성질로 증명한다. 최대와 차이를 주는 질문 전환이 필수 근호 방법을 없애지 않는다.",
    ),
  },
  {
    requirement: "geometry.inverse-tangent-rectangle",
    hold: m3MethodHold(
      "원의 접선 길이와 피타고라스 관계 계산",
      ".qa-artifacts/exam-resume-20261008/inverse-tangent-rectangle-prototype-20261020-r1/own-engine-audit-report-r4.json",
      "e60aac49dcb5db7343d6eecf9e7fd0f131cd5eb960d08a75f30ba9910e8956e3",
      "검토된 학생 방법은 원의 접선 길이 관계를 직각삼각형과 연결한다. 직사각형 소재나 일부 길이의 역산으로 이전 학년의 접선 방법을 허용하지 않는다.",
    ),
  },
] as const;

const INVERSE_DEGREE_GRADE_HOLD = Object.freeze({
  status: "excluded-required-out-of-grade-method" as const,
  targetCurriculum: "2015/2022-placement-review",
  message:
    "초등·중1·중2 범위로 승인하지 않은 이차방정식 차수 조건 유형은 제공하지 않습니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/gangbuk-first2-review-20261020-r2/own-review-evidence-r1/own-review-report-r1.json",
  evidenceSha256:
    "6857d36a7463a82cf70c2692304f37ea2a5cdf04a008aa4d31a0a7168f5b6e2f",
  basis:
    "2015중3 원문 개념과 새 일차방정식 조건의 검토는 다른 학년·2022 배치 승인이 아니다. 새 템플릿은 학년별 전체 풀이 검토 전 제공하지 않는다.",
});

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

const M1_STUDENT_METHOD_HOLD = Object.freeze({
  status: "pending-reviewed-student-method-version" as const,
  targetCurriculum: "2022",
  message: "중1 학생용 풀이 검토가 완료된 전체 유형과 버전만 제공합니다.",
  evidence:
    ".qa-artifacts/exam-resume-20261008/m1-inverse-geometry-curriculum-audit-20261019-r3/report.json",
  evidenceSha256:
    "626cce750576be3869d66bf150f2f241ad464b270b48d2de150ce37fe6af7db0",
  basis:
    "두 반비례 전체 유형의 실제 학생 방법을 검토했다. 구버전의 두 미지수 소거 또는 불명확한 넓이 해설은 재사용하지 않으며, 새로운 전체 유형과 버전은 별도 검토한다.",
});

const REVIEWED_M1_METHODS = [
  {
    requirement: "coord.inverse-equal-legs",
    id: "study-middle-inverse-equal-legs",
    version: "2-m1-single-variable",
  },
  {
    requirement: "coord.inverse-area-ratio",
    id: "study-middle-inverse-area-ratio",
    version: "2-m1-elementary-area",
  },
] as const;

/**
 * This is a specific reviewed-method hold, never a blanket ban on an n² glyph.
 * No renamed family, new version or confidence flag can silently clear it.
 * A legitimate rewrite needs separate actual seven-surface review and policy revision.
 * Other templates receive no general curriculum certification from a null result.
 */
export function studyCurriculumHold(
  family: Pick<ExamStudyFamily, "course" | "fulfills"> &
    Partial<Pick<ExamStudyFamily, "id" | "version">>,
):
  | typeof M1_SYMBOLIC_SUM_HOLD
  | typeof M1_STUDENT_METHOD_HOLD
  | typeof INVERSE_DEGREE_GRADE_HOLD
  | (typeof M3_ONLY_STUDENT_METHODS)[number]["hold"]
  | null {
  if (
    (family.course.startsWith("초") ||
      family.course === "중1" ||
      family.course === "중2") &&
    family.fulfills.some(
      (f) => f.requirement === "algebra.inverse-equation-degree",
    )
  )
    return INVERSE_DEGREE_GRADE_HOLD;
  // Preserve the existing explicit M1 reason when several hard holds apply.
  if (
    family.course === "중1" &&
    family.fulfills.some((f) => f.requirement === "number.coprime-symbolic-sum")
  )
    return M1_SYMBOLIC_SUM_HOLD;
  if (
    family.course.startsWith("초") ||
    family.course === "중1" ||
    family.course === "중2"
  ) {
    const method = M3_ONLY_STUDENT_METHODS.find((m) =>
      family.fulfills.some((f) => f.requirement === m.requirement),
    );
    if (method) return method.hold;
  }
  if (family.course !== "중1") return null;
  // The reviewed scope is the complete authored method, not loosely related
  // legacy components. A component/null result remains no curriculum certificate.
  for (const intent of family.fulfills) {
    if (intent.level !== "full") continue;
    const method = REVIEWED_M1_METHODS.find(
      (m) => m.requirement === intent.requirement,
    );
    if (
      method &&
      (family.id !== method.id || family.version !== method.version)
    )
      return M1_STUDENT_METHOD_HOLD;
  }
  return null;
}
