import type {
  ExamStudyCourse,
  ExamStudyProfile,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";

const weighted = (ids: readonly StudyRequirementId[]) =>
  ids.map((id) => ({ id, weight: 1 }));
const scope = (
  label: string,
  visibleCount: number,
  totalCount: number,
  unknownCount: number,
  semester: 1 | 2 = 1,
): ExamStudyProfile["scope"] => ({
  label,
  sourceYear: 2025,
  semester,
  round: "기말",
  reviewedOn: "2026-10-18",
  visibleCount,
  totalCount,
  unknownCount,
  difficultyCalibration: "unmeasured",
});

/**
 * Aggregates of the public abstract audit, never source question records.
 * Equal weights mean equal practice allocation, NOT observed exam frequencies.
 * References: source-profiles.json and source-comparison.md in the readiness audit;
 * Kyungmyung additionally uses the public benchmark-engine-gap abstract structures.
 */
export const EXAM_STUDY_PROFILES: readonly ExamStudyProfile[] = [
  {
    id: "daeryun-m1",
    version: "2026-10-18-r1",
    schoolId: "daeryun-middle",
    schoolName: "대륜중학교",
    aliases: ["대륜중", "대륜중학교"],
    region: "대구",
    course: "중1",
    scope: scope("일차식·방정식·비례와 좌표의 선택 검토 범위", 19, 22, 3),
    requirements: weighted([
      "coord.sign-quadrant",
      "graph.piecewise-multi-claim",
      "model.doubling-time-offset",
      "coord.shared-side-square",
      "coord.inverse-area-ratio",
      "coord.inverse-equal-legs",
      "coord.ray-area-partition",
      "model.circle-revolution-percentage",
      "number.coprime-symbolic-sum",
      "written.dependent-formula-min-time",
      "coord.signed-inverse-trapezoid",
    ]),
  },
  {
    id: "daeryun-m2",
    version: "2026-10-18-r1",
    schoolId: "daeryun-middle",
    schoolName: "대륜중학교",
    aliases: ["대륜중", "대륜중학교"],
    region: "대구",
    course: "중2",
    scope: scope("함수·부등식·연립식과 모델 설명의 선택 검토 범위", 18, 18, 0),
    requirements: weighted([
      "graph.translated-coefficient-reuse",
      "graph.line-multi-properties",
      "concept.function-uniqueness",
      "algebra.inequality-solution-count",
      "coord.intercept-integer-area",
      "algebra.shifted-system-coupling",
      "coord.intercept-trapezoid-cases",
      "written.linear-fuel-model",
      "written.stopped-travel",
      "written.two-work-rates",
    ]),
  },
  {
    id: "kyungmyung-m1",
    version: "2026-10-18-r1",
    schoolId: "kyungmyung-girls-middle",
    schoolName: "경명여자중학교",
    aliases: ["경명여중", "경명여자중", "경명여자중학교"],
    region: "대구",
    course: "중1",
    // All displayed stems were read; two source tasks remained uncertain. They
    // are not silently promoted into the reviewed mathematical scope below.
    scope: scope("일차식·방정식·비례의 판독 가능한 선택 검토 범위", 22, 22, 2),
    requirements: weighted([
      "algebra.linear-simplify",
      "algebra.equation-classification",
      "algebra.equality-truth",
      "algebra.candidate-verification",
      "algebra.linear-model",
      "coord.sign-quadrant",
      "algebra.natural-parameter",
    ]),
  },
  {
    id: "kyungmyung-m3",
    version: "2026-10-18-r1",
    schoolId: "kyungmyung-girls-middle",
    schoolName: "경명여자중학교",
    aliases: ["경명여중", "경명여자중", "경명여자중학교"],
    region: "대구",
    course: "중3",
    scope: scope("이차함수·이차방정식의 선택 검토 범위", 22, 22, 1),
    requirements: weighted([
      "graph.parabola-line-chain",
      "written.rectangle-domain",
      "algebra.rational-root-parameter",
      "graph.translated-coefficient-reuse",
    ]),
  },
  {
    id: "kyungshin-common2",
    version: "2026-10-18-r1",
    schoolId: "kyungshin-high",
    schoolName: "경신고등학교",
    aliases: ["경신고", "경신고등학교"],
    region: "대구",
    course: "공통수학2",
    scope: scope("진리집합·함수의 조건 결합 선택 검토 범위", 20, 20, 0, 2),
    requirements: weighted([
      "logic.truth-set-inclusion-param",
      "logic.intermediate-truth-set-count",
      "function.restricted-quadratic-bijection",
      "function.radical-area-maximum",
      "function.absolute-rational-level-count",
      "function.finite-bijection-chain",
      "function.iterated-finite-range",
      "function.radical-inverse-circle",
    ]),
  },
];

export function normalizeStudySchoolName(name: string): string {
  return name.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

export function profileMatchesSchool(
  profile: ExamStudyProfile,
  name: string,
): boolean {
  const normalized = normalizeStudySchoolName(name);
  return [profile.schoolName, ...profile.aliases].some(
    (alias) => normalizeStudySchoolName(alias) === normalized,
  );
}

export function findStudyProfile(
  schoolName: string,
  course: ExamStudyCourse,
  profiles = EXAM_STUDY_PROFILES,
): ExamStudyProfile | undefined {
  return profiles.find(
    (p) => p.course === course && profileMatchesSchool(p, schoolName),
  );
}
