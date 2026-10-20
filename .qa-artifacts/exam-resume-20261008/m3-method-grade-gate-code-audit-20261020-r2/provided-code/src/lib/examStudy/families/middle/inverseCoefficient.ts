import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { clauses, insist, match } from "./support";

const requirement = "algebra.inverse-coefficient-sum" as const;
const checks = ["independent-solution", "essential-conditions"] as const;
type Parameters = { a: number; c: number; d: number; k: number };
const domain: Parameters[] = [];
for (const a of [2, 3])
  for (const c of [2, 4])
    for (const d of [-5, -3])
      for (const k of [-2, 0, 3, 8]) domain.push({ a, c, d, k });

/** A captured Unit binding is a proposal; it never invents a persisted family key. */
export const inverseCoefficientStudyMetadata = Object.freeze({
  unitId: "e63d61c6-2b41-4c83-a74b-a605fd343c42",
  course: "중3",
  section: "다항식의 곱셈",
  liveFamilyKey: null,
  registrationStatus: "pending" as const,
  targetDirection: "coefficient-sum-to-input-constant",
  sharedProcedure: ["분배법칙", "동류항과 계수 식별", "계수 합의 관계"],
  prerequisite: "수치 계수의 일차방정식",
  curriculumReview: "pending-actual-template-seven-surface-review",
  proposedCurriculumScope: {
    sourceStudyAcademicYear: 2025,
    sourceStudyEdition: "2015",
    practiceAcademicYear: 2026,
    practiceEdition: "2015",
    m3From2027: "requires-2022-grade-placement-review",
    proposalIsNotApproval: true,
  },
  sourceStudyEvidence:
    ".qa-artifacts/exam-resume-20261008/nobyeon-sem1-current4-family-audit-20261019-r1/q10.json",
  sourceStudyEvidenceSha256:
    "397401ff33e07cc39e68512631751d98bfc245a7f549d31d8bb7c1b540002579",
  unitSnapshot: {
    capturedAt: "2026-10-19 06:14:08.658144+00",
    sha256: "0ea7cd153abd708500ee160cecc1f83d1d396fe3823f404b24162e78fff3ddd0",
  },
  rightsApproved: false,
  nativeProvenanceApproved: false,
  loadable: false,
});

const term = (coefficient: number) =>
  coefficient === 1 ? "k" : coefficient === -1 ? "-k" : `${coefficient}k`;

function make({ a, c, d, k }: Parameters): ExamStudyDraft {
  const constant = a * d,
    slope = c + d,
    sum = constant + slope * k;
  insist(slope !== 0, "역산 계수가 0이면 해가 유일하지 않음");
  return {
    content: `다항식 $(${a}x+ky)(${c}x-${-d}y)$를 전개하여 동류항끼리 정리한다. $xy$의 계수와 $y^{2}$의 계수의 합이 $${sum}$일 때, 상수 $k$의 값을 구하시오.`,
    answer: String(k),
    solution: `$xy$항의 계수는 $${c}k-${-constant}$이고, $y^{2}$항의 계수는 $${d}k$이다. 두 계수의 합에서 $(${c}k-${-constant})+(${d}k)=${sum}$이다. 이를 정리하면 $${term(slope)}-${-constant}=${sum}$, $${term(slope)}=${sum - constant}$이므로 $k=${k}$이다. 역산할 때 나누는 수 $${slope}$은 $0$이 아니므로 해는 하나뿐이다. 실제로 이 값을 대입하면 두 계수는 각각 $${constant + c * k}$, $${d * k}$이다. 합을 계산하면 $${constant + c * k}+(${d * k})=${sum}$이다. 따라서 조건을 만족한다.`,
    parameters: { a, c, d, k },
    questionType: "단답형",
    difficulty: "응용",
    difficultyBasis: [
      "두 계수의 합으로 입력 상수 역산",
      "0이 아닌 일차방정식 계수",
      "원래 계수 대입 검산",
    ],
    figureSpec: null,
  };
}

function sameParameters(a: CanonicalParams, b: Parameters) {
  return (
    Object.keys(a).length === 4 &&
    Object.entries(b).every(([key, value]) => a[key] === value)
  );
}

/** Internal finite factory. Public selection stays closed in studyReleaseHold. */
export const inverseCoefficientSum: ExamStudyFamily = {
  id: "study-middle-inverse-coefficient-sum",
  version: "2-neutral-student-wording",
  title: "두 계수의 합에서 인수 안 상수 역산",
  course: "중3",
  unitIds: ["중3|다항식의 곱셈"],
  unitSections: ["다항식의 곱셈"],
  source: "authored",
  fulfills: [{ requirement, level: "full" }],
  formats: ["단답형"],
  difficulties: ["응용"],
  representation: "text",
  figureKinds: [],
  paramDomain: {
    kind: "finite",
    size: domain.length,
    enumerate: () => domain.map((p) => ({ ...p })),
  },
  evidence: {
    testFile: "src/__tests__/unit/examStudyInverseCoefficient.test.ts",
    sampleCount: domain.length,
    boundaryCases: [
      "음수·0·양수인 해",
      "역산 계수 -3/-1/1",
      "0인 계수의 해석",
      "수치 재대입",
    ],
    checkedRequirements: [requirement],
    checks,
  },
  generate(seed, variant) {
    insist(
      Number.isSafeInteger(seed) &&
        Number.isSafeInteger(variant) &&
        variant >= 0,
      "seed/variant 범위 오류",
    );
    const index =
      ((seed % domain.length) + (variant % domain.length) + domain.length) %
      domain.length;
    return make(domain[index]);
  },
  canonicalParams: (item) => ({ ...item.parameters }),
  verify(item) {
    try {
      clauses(item.content, [
        "동류항끼리 정리",
        "$xy$의 계수와 $y^{2}$의 계수의 합",
        "상수 $k$의 값을",
      ]);
      const factors = match(
          item.content,
          /\$\((\d+)x\+ky\)\((\d+)x-(\d+)y\)\$/u,
        ),
        total = match(item.content, /계수의 합이 \$(-?\d+)\$일/u),
        a = Number(factors[1]),
        c = Number(factors[2]),
        d = -Number(factors[3]),
        sum = Number(total[1]),
        slope = c + d;
      insist(slope !== 0, "역산 계수가 0이면 해가 유일하지 않음");
      const k = (sum - a * d) / slope,
        parameters = { a, c, d, k };
      insist(
        domain.some((p) => sameParameters(p, parameters)),
        "검토한 유한 매개변수 밖",
      );
      insist(
        sameParameters(item.parameters, parameters),
        "인쇄 조건과 매개변수 불일치",
      );
      const expected = make(parameters);
      insist(
        item.answer === String(k),
        "인쇄 조건으로 독립 계산한 상수와 불일치",
      );
      insist(
        item.content === expected.content &&
          item.solution === expected.solution,
        "검토된 학생용 문장·풀이 템플릿과 불일치",
      );
      insist(
        item.questionType === "단답형" &&
          item.difficulty === "응용" &&
          item.figureSpec === null &&
          !item.rubric &&
          !item.distractors,
        "지원하지 않는 형식·난이도·그림",
      );
      insist(
        JSON.stringify(item.difficultyBasis) ===
          JSON.stringify(expected.difficultyBasis),
        "난이도 근거 불일치",
      );
      return { valid: true, checks, errors: [] };
    } catch (error) {
      return {
        valid: false,
        checks: [],
        errors: [error instanceof Error ? error.message : "검산 실패"],
      };
    }
  },
};
