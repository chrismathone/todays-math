import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { insist, match } from "./support";

const requirement = "algebra.inverse-equation-degree" as const;
const checks = ["independent-solution", "essential-conditions"] as const;
type Parameters = { p: number; q: number; r: number; s: number; t: number };
const domain: Parameters[] = [];
for (const p of [2, 3])
  for (const q of [1, 2])
    for (const r of [2, 4])
      for (const s of [-2, 1])
        for (const t of [1, 5])
          if (r * (q - 1) - p - s !== 0) domain.push({ p, q, r, s, t });

/** A reviewed source component never approves every new parameter/template. */
export const inverseEquationDegreeStudyMetadata = Object.freeze({
  unitId: "82399e51-340d-4165-b016-3e941e65f810",
  course: "중3",
  section: "이차방정식의 풀이",
  liveFamilyKey: null,
  registrationStatus: "pending" as const,
  targetDirection: "degree-classification-to-input-coefficient",
  sharedProcedure: [
    "다항식 전개",
    "동류항 정리",
    "이차항 소거",
    "남은 일차항 확인",
  ],
  standardCodesAsProposed: ["9수02-12", "9수02-13"],
  curriculumReview: "pending-entire-current-template-seven-surface-review",
  proposedCurriculumScope: {
    sourceStudyAcademicYear: 2025,
    sourceStudyEdition: "2015",
    practiceAcademicYear: 2026,
    practiceEdition: "2015",
    m3From2027: "requires-separate-2022-placement-review",
    proposalIsNotApproval: true,
  },
  sourceStudyEvidence:
    ".qa-artifacts/exam-resume-20261008/gangbuk-first2-review-20261020-r2/own-review-evidence-r1/own-review-report-r1.json",
  sourceStudyEvidenceSha256:
    "6857d36a7463a82cf70c2692304f37ea2a5cdf04a008aa4d31a0a7168f5b6e2f",
  unitSnapshot: {
    path: ".qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/live-family-snapshot-r2.json",
    sha256: "a755032bd15af63a2151658a2c17490b0c461fc980fa5fc601c3d2598eb591d2",
  },
  rightsApproved: false,
  nativeProvenanceApproved: false,
  loadable: false,
});

const term = (c: number, variable: string) =>
  c === 1 ? variable : c === -1 ? `-${variable}` : `${c}${variable}`;
function make({ p, q, r, s, t }: Parameters): ExamStudyDraft {
  const linear = r * (q - 1) - p - s;
  insist(linear !== 0, "이차항 소거 후 일차항도 없어지면 제외");
  const equation = `(ax-${p})(x+${q})=ax+${r}x^2${s < 0 ? "" : "+"}${term(s, "x")}+${t}`;
  return {
    content: `다음 등식이 $x$에 대한 일차방정식이 되도록 하는 상수 $a$의 값을 구하시오.\n\n$${equation}$`,
    answer: String(r),
    solution: `왼쪽을 전개하면 $ax^2+(${term(q, "a")}-${p})x-${p * q}$이다. 오른쪽의 항을 모두 왼쪽으로 이항하면 $(a-${r})x^2+(${term(q, "a")}-${p}-a-(${s}))x-${p * q + t}=0$이다.\n\n일차방정식이 되려면 이차항의 계수가 $0$이어야 하므로 $a-${r}=0$, 즉 $a=${r}$이다. 이 값을 대입하면 $${term(linear, "x")}-${p * q + t}=0$이다. 여기서 $x$의 계수는 $0$이 아니므로 실제로 일차방정식이 된다. 다른 $a$의 값에서는 이차항이 남으므로 조건을 만족하는 값은 $${r}$ 하나뿐이다.`,
    parameters: { p, q, r, s, t },
    questionType: "단답형",
    difficulty: "기본",
    difficultyBasis: [
      "전개 후 차수 판단",
      "이차항을 없애는 입력 역산",
      "남은 일차항이 0이 아님 확인",
    ],
    figureSpec: null,
  };
}
const sameParameters = (a: CanonicalParams, b: Parameters) =>
  Object.keys(a).length === 5 &&
  Object.entries(b).every(([k, v]) => a[k] === v);

/** Internal study factory. Public selection stays held before generation. */
export const inverseEquationDegree: ExamStudyFamily = {
  id: "study-middle-inverse-equation-degree",
  version: "2-student-wording",
  title: "일차방정식이 되는 계수 역산",
  course: "중3",
  unitIds: ["중3|이차방정식의 풀이"],
  unitSections: ["이차방정식의 풀이"],
  source: "authored",
  fulfills: [{ requirement, level: "full" }],
  formats: ["단답형"],
  difficulties: ["기본"],
  representation: "text",
  figureKinds: [],
  paramDomain: {
    kind: "finite",
    size: domain.length,
    enumerate: () => domain.map((p) => ({ ...p })),
  },
  evidence: {
    testFile: "src/__tests__/unit/examStudyInverseEquationDegree.test.ts",
    sampleCount: domain.length,
    boundaryCases: [
      "남은 일차항의 양/음 계수",
      "두 전개 형태",
      "일차항까지 소거되는 후보 제외",
      "인쇄식과 매개변수 불일치",
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
      const printed = match(
        item.content,
        /\$\(ax-(\d+)\)\(x\+(\d+)\)=ax\+(\d+)x\^2(-\d+|\+)x\+(\d+)\$/u,
      );
      const p = Number(printed[1]),
        q = Number(printed[2]),
        r = Number(printed[3]),
        s = printed[4] === "+" ? 1 : Number(printed[4]),
        t = Number(printed[5]);
      // Read both printed sides before consulting generator parameters/answer.
      const linear = r * q - p - r - s;
      insist(linear !== 0, "인쇄 조건에서 이차항과 일차항이 모두 없어짐");
      const parameters = { p, q, r, s, t };
      insist(
        domain.some((d) => sameParameters(d, parameters)),
        "검토한 유한 매개변수 밖",
      );
      insist(
        sameParameters(item.parameters, parameters),
        "인쇄 조건과 매개변수 불일치",
      );
      const expected = make(parameters);
      insist(item.answer === String(r), "인쇄식에서 계산한 계수와 답 불일치");
      insist(
        item.content === expected.content &&
          item.solution === expected.solution,
        "현재 학생 문장·해설 템플릿 불일치",
      );
      insist(
        item.questionType === "단답형" &&
          item.difficulty === "기본" &&
          item.figureSpec === null &&
          !item.rubric &&
          !item.distractors,
        "미검토 형식·난이도·그림",
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
