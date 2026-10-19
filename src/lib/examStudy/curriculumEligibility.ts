import type { ExamStudyFamily } from "@/contracts/examStudy.contract";

/** Grade restrictions precede mathematical coverage, format and profile quotas. */
export const STUDY_CURRICULUM_POLICY_VERSION =
  "20261019-m1-reviewed-student-methods-r2";

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
): typeof M1_SYMBOLIC_SUM_HOLD | typeof M1_STUDENT_METHOD_HOLD | null {
  if (family.course !== "중1") return null;
  if (
    family.fulfills.some((f) => f.requirement === "number.coprime-symbolic-sum")
  )
    return M1_SYMBOLIC_SUM_HOLD;
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
