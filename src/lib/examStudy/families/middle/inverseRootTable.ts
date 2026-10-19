import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { insist, match } from "./support";

const requirement = "number.inverse-root-table" as const;
const checks = ["independent-solution", "essential-conditions"] as const;
type Parameters = { start: number; bRoot: number; index: number };
const starts = [110, 250, 510] as const;
const bRoots = [7, 13, 23] as const;
const domain: Parameters[] = starts.flatMap((start) =>
  bRoots.flatMap((bRoot) =>
    Array.from({ length: 5 }, (_, index) => ({ start, bRoot, index })),
  ),
);

/** Actual captured UUID and proposal only; no persisted family key or approval. */
export const inverseRootTableStudyMetadata = Object.freeze({
  unitId: "28032bdd-3db3-4788-9e7a-2f1909233fdb",
  course: "중3",
  section: "무리수와 실수",
  liveFamilyKey: null,
  registrationStatus: "pending" as const,
  targetDirection: "rounded-table-result-to-input-column",
  sharedProcedure: [
    "양의 제곱근",
    "피제곱수100분의1은제곱근10분의1",
    "표 소수값의 결합 계산",
  ],
  prerequisite: "유리수 계산과 한 미지수의 수치 관계 역산",
  curriculumReview: "pending-actual-template-seven-surface-review",
  proposedCurriculumScope: {
    sourceStudyAcademicYear: 2025,
    sourceStudyEdition: "2015",
    practiceAcademicYear: 2026,
    practiceEdition: "2015",
    m3From2027: "requires-2022-grade-placement-review",
    proposalIsNotApproval: true,
  },
  representation: "native-markdown-table; no raster required",
  approximationContract:
    "Round roots to nearest thousandth; thereafter use printed cells exactly, never equate them to actual radicals.",
  sourceStudyEvidence:
    ".qa-artifacts/exam-resume-20261008/nobyeon-sem1-current4-family-audit-20261019-r1/q06.json",
  sourceStudyEvidenceSha256:
    "a29e3d681a68dddddf4195b5520aa30c967dfeda5ff7abc29b2dc8afa1a4b185",
  unitSnapshot: {
    capturedAt: "2026-10-19 06:14:08.658144+00",
    sha256: "0ea7cd153abd708500ee160cecc1f83d1d396fe3823f404b24162e78fff3ddd0",
  },
  rightsApproved: false,
  nativeProvenanceApproved: false,
  loadable: false,
});

function decimal(value: number, places: 2 | 3): string {
  insist(
    Number.isSafeInteger(value) && value >= 0,
    "0 이상의 정수 자릿수 표기",
  );
  const s = String(value).padStart(places + 1, "0");
  return `${s.slice(0, -places)}.${s.slice(-places)}`;
}

/** Integer squared bounds, not a floating sqrt/round oracle. Input is hundredths. */
function rootThousandths(hundredths: number): number {
  insist(
    Number.isSafeInteger(hundredths) && hundredths >= 100 && hundredths <= 999,
    "제곱근표 입력 범위",
  );
  const one = BigInt(1),
    two = BigInt(2),
    squared = BigInt(hundredths) * BigInt(10000);
  let low = BigInt(0),
    high = BigInt(10000);
  while (low + one < high) {
    const middle = (low + high) / two;
    if (middle * middle <= squared) low = middle;
    else high = middle;
  }
  return Number(
    BigInt(4) * squared < (two * low + one) ** two ? low : low + one,
  );
}

const table = (start: number) =>
  Array.from({ length: 5 }, (_, i) => ({
    input: start + i,
    root: rootThousandths(start + i),
  }));

/** Verify rounding with squared midpoint inequalities, independently of the generator search. */
function checkPrintedRoot(hundredths: number, rounded: number): boolean {
  if (!Number.isSafeInteger(rounded) || rounded <= 0) return false;
  const exact = BigInt(4) * BigInt(hundredths) * BigInt(10000),
    twice = BigInt(2) * BigInt(rounded),
    one = BigInt(1);
  return (
    (twice - one) ** BigInt(2) <= exact && exact < (twice + one) ** BigInt(2)
  );
}

function make({ start, bRoot, index }: Parameters): ExamStudyDraft {
  const cells = table(start),
    root = cells[index].root;
  insist(
    new Set(cells.map((c) => c.root)).size === 5,
    "표값의 역대응이 유일하지 않음",
  );
  // 100*(s/10)+b = 10s+b; in hundredths this is rootThousandths + 100*b.
  const resultCents = root + 100 * bRoot;
  return {
    content: `다음은 제곱근을 소수 넷째 자리에서 반올림하여 소수 셋째 자리까지 나타낸 표이다.\n\n|$x$|${cells.map((c) => `$${decimal(c.input, 2)}$`).join("|")}|\n|:---:|:---:|:---:|:---:|:---:|:---:|\n|$\\sqrt{x}$의 근삿값|${cells.map((c) => `$${decimal(c.root, 3)}$`).join("|")}|\n\n표의 다섯 수 중 하나를 $x$로 선택했다. 양수 $a,b$가 $a^{2}=\\dfrac{x}{100}$, $b^{2}=${bRoot * bRoot}$을 만족한다. 표의 소수값을 그대로 이용하여 $a$의 근삿값을 구하고, 그 근삿값으로 $100a+b$를 계산한 결과는 $${decimal(resultCents, 2)}$였다. 선택한 $x$의 값을 구하시오.`,
    answer: decimal(start + index, 2),
    solution: `$b$가 양수이고 $b^{2}=${bRoot * bRoot}$이므로 $b=${bRoot}$이다. $a$도 양수이므로 정확한 관계는 $a=\\sqrt{x}/10$이다.\n\n표에 실린 $\\sqrt{x}$의 근삿값을 $s$라 하면 표를 이용해 구한 $a$의 근삿값은 $s/10$이다. 이 근삿값으로 계산한 결과에서 $100\\times(s/10)+${bRoot}=${decimal(resultCents, 2)}$이다. 따라서 $10s=${decimal(root, 2)}$, $s=${decimal(root, 3)}$이다.\n\n표에서 $${decimal(root, 3)}$에 대응하는 입력은 $${decimal(start + index, 2)}$ 하나뿐이다. 다섯 표값을 대입한 계산 결과도 서로 달라 선택은 유일하다. 이때 $s$는 인쇄된 근삿값이며 실제 제곱근과 정확히 같다고 놓은 것이 아니다.`,
    parameters: { start, bRoot, index },
    questionType: "단답형",
    difficulty: "응용",
    difficultyBasis: [
      "표 근삿값과 실제 근호값 구별",
      "양수의 제곱 관계와 자릿수",
      "계산 결과에서 입력 열 역산",
    ],
    figureSpec: null,
  };
}

function parseCell(cell: string, places: 2 | 3): number {
  const parsed = new RegExp(`^\\$(\\d+)\\.(\\d{${places}})\\$$`, "u").exec(
    cell,
  );
  insist(parsed, "표의 소수 표기");
  return Number(parsed[1]) * 10 ** places + Number(parsed[2]);
}
const sameParams = (actual: CanonicalParams, expected: Parameters) =>
  Object.keys(actual).length === 3 &&
  Object.entries(expected).every(([k, v]) => actual[k] === v);

/** Finite internal implementation; public selection is closed by studyReleaseHold. */
export const inverseRootTable: ExamStudyFamily = {
  id: "study-middle-inverse-root-table",
  version: "2",
  title: "제곱근표 결합 결과에서 입력 열 복원",
  course: "중3",
  unitIds: ["중3|무리수와 실수"],
  unitSections: ["무리수와 실수"],
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
    testFile: "src/__tests__/unit/examStudyInverseRootTable.test.ts",
    sampleCount: domain.length,
    boundaryCases: [
      "5개 입력의 결과와 유일성",
      "소수2자리 입력·3자리 표값",
      "양수 제곱 관계",
      "근삿값 계약",
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
      const lines = item.content.split("\n"),
        inputRow = lines.find((l) => l.startsWith("|$x$|")),
        rootRow = lines.find((l) => l.startsWith("|$\\sqrt{x}$의 근삿값|"));
      insist(inputRow && rootRow, "입력과 근삿값 표가 필요함");
      const printedInputs = inputRow.split("|").slice(2, -1);
      const inputs = printedInputs.map((c) => parseCell(c, 2)),
        roots = rootRow
          .split("|")
          .slice(2, -1)
          .map((c) => parseCell(c, 3));
      insist(inputs.length === 5 && roots.length === 5, "다섯 열 표만 검토됨");
      const start = inputs[0];
      insist(
        starts.some((s) => s === start),
        "검토한 입력 표 밖",
      );
      insist(
        inputs.every((v, i) => v === start + i),
        "인쇄된 표 입력 순서 불일치",
      );
      insist(
        roots.every((v, i) => checkPrintedRoot(inputs[i], v)),
        "실제 근호의 반올림값과 불일치",
      );
      const square = Number(match(item.content, /b\^\{2\}=(\d+)/u)[1]),
        bRoot = bRoots.find((b) => b * b === square);
      insist(bRoot !== undefined, "검토한 양의 b 제곱 밖");
      const result = match(
          item.content,
          /계산한 결과는 \$(\d+\.\d{2})\$였다/u,
        )[1],
        resultCents = parseCell(`$${result}$`, 2),
        wanted = resultCents - 100 * bRoot;
      const matching = roots.flatMap((v, i) => (v === wanted ? [i] : []));
      insist(matching.length === 1, "표값의 결과에 맞는 입력이 하나여야 함");
      const parameters = { start, bRoot, index: matching[0] },
        expected = make(parameters);
      insist(
        sameParams(item.parameters, parameters),
        "인쇄된 표·결과와 매개변수 불일치",
      );
      insist(
        item.answer === printedInputs[matching[0]].slice(1, -1),
        "인쇄된 표에서 독립 복원한 입력과 불일치",
      );
      insist(
        item.content === expected.content &&
          item.solution === expected.solution,
        "검토한 전체 학생 문장·풀이와 불일치",
      );
      insist(
        item.questionType === "단답형" &&
          item.difficulty === "응용" &&
          item.figureSpec === null &&
          !item.distractors &&
          !item.rubric,
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
          error instanceof Error ? error.message : "제곱근표 역산 검산 실패",
        ],
      };
    }
  },
};
