import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { insist, match } from "./support";

const requirement = "number.inverse-extreme-range" as const;
const checks = ["independent-solution", "essential-conditions"] as const;
type Parameters = {
  radicand: number;
  small: number;
  offset: number;
  visibleOffset: number;
};
const domain: Parameters[] = [];
for (const radicand of [7, 11, 14])
  for (const small of [2, 3])
    for (const offset of [0, 1])
      for (const visibleOffset of [2, 3])
        domain.push({ radicand, small, offset, visibleOffset });

/** Captured UUID and source/proposal pointers are not live family or grade approval. */
export const inverseMinimumStudyMetadata = Object.freeze({
  unitId: "28032bdd-3db3-4788-9e7a-2f1909233fdb",
  course: "중3",
  section: "무리수와 실수",
  liveFamilyKey: null,
  registrationStatus: "pending" as const,
  targetDirection: "extreme-difference-to-missing-minimum",
  sharedProcedure: [
    "제곱근과 정수 경계 비교",
    "최대·최소의 역할",
    "동류근호항 계산",
  ],
  prerequisite: "실수의 대소와 근호의 사칙계산",
  curriculumReview: "pending-current24-solutions-and-actual-runtime-review",
  proposedCurriculumScope: {
    sourceStudyAcademicYear: 2025,
    sourceStudyEdition: "2015",
    practiceAcademicYear: 2026,
    practiceEdition: "2015",
    m3From2027: "requires-2022-grade-placement-review",
    proposalIsNotApproval: true,
  },
  sourceStudyEvidence:
    ".qa-artifacts/exam-resume-20261008/nobyeon-sem1-group13-review-20261020-r1/current-author-summary-parent-r1.json",
  sourceStudyEvidenceSha256:
    "2fe611a5aff0fd79c7abb38ba8592c623d9d5a3a46c0a1f2dfd0a7522e3c64b5",
  studentOnlyProposal: {
    path: ".qa-artifacts/exam-resume-20261008/inverse-minimum-proposal-20261020-r1/student-only24.json",
    sha256: "9abde29809d9eb15a226bc0680a9281581ae3def22b57d402a17cb02debd68cf",
    actualAuthorSolutionsReviewed: false,
    actualFactoryReviewed: false,
  },
  unitSnapshot: {
    capturedAt: "2026-10-19 06:14:08.658144+00",
    sha256: "0ea7cd153abd708500ee160cecc1f83d1d396fe3823f404b24162e78fff3ddd0",
  },
  rightsApproved: false,
  nativeProvenanceApproved: false,
  loadable: false,
});

function make(p: Parameters): ExamStudyDraft {
  const { radicand: r, small: s, offset: c, visibleOffset: d } = p;
  // Exact integer premises imply every inequality in the student solution.
  // No floating sqrt, pixel geometry or advanced student theorem is used.
  insist(
    r > 4 && s > 0 && s < 4 && c >= 0 && c <= 1 && d >= 2 && d <= 3,
    "정수 경계로 최대·최소를 증명할 수 없는 영역",
  );
  const maximum = `\\sqrt{${r}}${c ? "-1" : ""}`;
  const gap = `2\\sqrt{${r}}-\\sqrt{${s}}${c ? "-1" : ""}`;
  const answer = `\\sqrt{${s}}-\\sqrt{${r}}`;
  return {
    content: `네 실수 $${maximum}, \\sqrt3-\\sqrt2, 1, ${d}-\\sqrt{${r}}$와 지워진 수 하나가 있다. 지워진 수는 다섯 수 중 가장 작은 수였다. 다섯 수의 최댓값에서 최솟값을 뺀 값이 $${gap}$일 때, 지워진 수를 구하시오.`,
    answer,
    solution: `$${r}>4$이므로 $\\sqrt{${r}}>2$이고, 따라서 $${maximum}>1$이다. $\\sqrt3<2$, $\\sqrt2>1$이므로 $0<\\sqrt3-\\sqrt2<1$이다. 또 $${d}\\le3$과 $\\sqrt{${r}}>2$에서 $${d}-\\sqrt{${r}}<1$이다. 따라서 남은 네 수 중 최댓값은 $${maximum}$이다. 지워진 수는 최솟값이었으므로 원래 다섯 수의 최댓값도 같다.\n\n최댓값에서 주어진 차이를 빼면 최솟값이므로 $(${maximum})-(${gap})=${answer}$이다.\n\n$0<${s}<4$이므로 $\\sqrt{${s}}<2<\\sqrt{${r}}$이고, 복원한 수는 음수이다. $\\sqrt{${s}}<2\\le${d}$에서 $${answer}<${d}-\\sqrt{${r}}$이다. 나머지 세 수 $${maximum}$, $\\sqrt3-\\sqrt2$, $1$은 모두 양수이므로 복원한 수는 실제로 다른 네 수보다 작다. 이 값을 최솟값으로 쓰면 최댓값과의 차이는 $(${maximum})-(${answer})=${gap}$으로 주어진 값과 같다. 최댓값이 정해지고 차이도 주어져 복원값은 하나뿐이다.`,
    parameters: { ...p },
    questionType: "단답형",
    difficulty: "기본",
    difficultyBasis: [
      "제곱근과 정수 경계의 대소",
      "최대·최소 차이에서 누락값 복원",
      "복원한 값의 최소성·유일성 검산",
    ],
    figureSpec: null,
  };
}
const sameParams = (actual: CanonicalParams, expected: Parameters) =>
  Object.keys(actual).length === 4 &&
  Object.entries(expected).every(([k, v]) => actual[k] === v);

/** Solve from printed coefficients; generator answer/parameter facts are not inputs. */
function solvePrinted(content: string): {
  parameters: Parameters;
  answer: string;
} {
  const visible = match(
    content,
    /네 실수 \$\\sqrt\{(\d+)\}(-1)?, \\sqrt3-\\sqrt2, 1, (\d+)-\\sqrt\{(\d+)\}\$/u,
  );
  const difference = match(
    content,
    /뺀 값이 \$(\d+)\\sqrt\{(\d+)\}-\\sqrt\{(\d+)\}(-1)?\$일/u,
  );
  const radicand = Number(visible[1]),
    offset = visible[2] ? 1 : 0,
    visibleOffset = Number(visible[3]),
    small = Number(difference[3]),
    rangeCoefficient = Number(difference[1]),
    rangeConstant = difference[4] ? -1 : 0;
  insist(
    Number(visible[4]) === radicand &&
      Number(difference[2]) === radicand &&
      rangeCoefficient === 2 &&
      rangeConstant === -offset,
    "인쇄된 최대항·제4자료·최대·최소 차이의 관계 불일치",
  );
  const parameters = { radicand, small, offset, visibleOffset };
  insist(
    domain.some((p) => sameParams(p, parameters)),
    "검토한 유한 영역 밖",
  );
  // These printed integer premises prove that the first value exceeds1,
  // the remaining visible values are below1, and the result is a strict minimum.
  insist(
    radicand > (offset + 1) ** 2 &&
      radicand > 4 &&
      small > 0 &&
      small < 4 &&
      visibleOffset >= 2 &&
      visibleOffset <= 3,
    "인쇄 조건의 최대·최소성 증명 실패",
  );
  const coefficients = new Map<number, number>([[radicand, 1]]);
  coefficients.set(
    Number(difference[2]),
    (coefficients.get(Number(difference[2])) ?? 0) - rangeCoefficient,
  );
  coefficients.set(small, (coefficients.get(small) ?? 0) + 1);
  insist(-offset - rangeConstant === 0, "인쇄 상수항의 차이 불일치");
  const answer = [...coefficients]
    .filter(([, c]) => c !== 0)
    .sort(([a], [b]) => a - b)
    .map(
      ([n, c], i) =>
        `${c < 0 ? "-" : i ? "+" : ""}${Math.abs(c) === 1 ? "" : Math.abs(c)}\\sqrt{${n}}`,
    )
    .join("");
  return { parameters, answer };
}

/** Internal finite factory. Public release stays held regardless of caller labels. */
export const inverseMinimum: ExamStudyFamily = {
  id: "study-middle-inverse-extreme-minimum",
  version: "2",
  title: "최대·최소 차이에서 지워진 최솟값 복원",
  course: "중3",
  unitIds: ["중3|무리수와 실수"],
  unitSections: ["무리수와 실수"],
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
    testFile: "src/__tests__/unit/examStudyInverseMinimum.test.ts",
    sampleCount: domain.length,
    boundaryCases: [
      "제4자료의 양수·음수 가지",
      "0·1인 최대항의 상수",
      "누락값의 엄격한 최소성",
      "음수인 정답",
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
    return make(
      domain[
        ((seed % domain.length) + (variant % domain.length) + domain.length) %
          domain.length
      ],
    );
  },
  canonicalParams: (item) => ({ ...item.parameters }),
  verify(item) {
    try {
      const { parameters, answer } = solvePrinted(item.content);
      insist(
        sameParams(item.parameters, parameters),
        "인쇄 자료와 매개변수 불일치",
      );
      const expected = make(parameters);
      insist(
        item.answer === answer,
        "인쇄된 최대항과 차이로 복원한 최솟값 불일치",
      );
      insist(
        item.content === expected.content &&
          item.solution === expected.solution,
        "검토한 학생 문장·풀이와 불일치",
      );
      insist(
        item.questionType === "단답형" &&
          item.difficulty === "기본" &&
          item.figureSpec === null &&
          item.distractors === undefined &&
          item.rubric === undefined,
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
        errors: [
          error instanceof Error ? error.message : "누락 최솟값 검산 실패",
        ],
      };
    }
  },
};
