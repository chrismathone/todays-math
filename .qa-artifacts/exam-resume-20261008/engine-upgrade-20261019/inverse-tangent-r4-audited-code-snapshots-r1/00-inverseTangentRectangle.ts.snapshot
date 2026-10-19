import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { insist, match } from "./support";
import { assertTangentRectangleGeometry } from "./tangentRectangleGeometry";

const requirement = "geometry.inverse-tangent-rectangle" as const;
const checks = [
  "independent-solution",
  "essential-conditions",
  "visual-information",
] as const;
type Params = { width: number; upperPart: number };
const domain: readonly Params[] = [
  [4, 3],
  [8, 6],
  [6, 4],
  [12, 10],
  [12, 9],
  [8, 5],
  [12, 8],
  [16, 12],
  [20, 15],
  [24, 21],
].map(([width, upperPart]) => ({ width, upperPart }));

/** Captured Unit and family proposal; no registration, grade or rights approval. */
export const inverseTangentRectangleStudyMetadata = Object.freeze({
  unitId: "635abab8-4a87-452b-ad6c-d59065822f29",
  proposedLiveFamilyKey: "mid:3-2|원과 직선|16",
  registrationStatus: "pending" as const,
  proposedCurriculum: {
    grade: "중3",
    edition: "2015",
    years: [2025, 2026],
    from2027: "2022-review-required",
  },
  prerequisites: [
    "원의 접선의 성질",
    "직사각형",
    "피타고라스",
    "다항식 전개와 일차방정식",
  ],
  sourceStudyEvidence:
    ".qa-artifacts/exam-resume-20261008/gyeongsin-group7-review-20261020-r2/current-author-summary-parent-r1.json",
  sourceStudyEvidenceSha256:
    "6ec79748c2e90da690ca71c0776fe0914589e2ba21adb67ded5edb61c44a219b",
  independentTemplateReview: "pending-current-ten-student-surfaces-and-code",
  rightsApproved: false,
  nativeProvenanceApproved: false,
  loadable: false,
});
function member(p: Params) {
  insist(
    domain.some((d) => d.width === p.width && d.upperPart === p.upperPart),
    "검토할 유한 영역 밖",
  );
}
function geometry(p: Params) {
  member(p);
  const r = p.width / 2,
    s = p.upperPart - r;
  insist(s > 0 && s < r, "접점과 분할 선분의 양수 조건");
  const lower = (r * r) / s - s,
    tangent = lower + 2 * s,
    height = p.upperPart + lower;
  insist(
    [r, s, lower, tangent, height].every(
      (n) => Number.isSafeInteger(n) && n > 0,
    ),
    "정확한 정수 길이 영역",
  );
  insist(
    tangent * tangent === lower * lower + p.width * p.width,
    "피타고라스 조건",
  );
  return { r, s, lower, tangent, height };
}
function figure(p: Params, g: ReturnType<typeof geometry>) {
  const { width: w } = p,
    { height: h, r, s, tangent: d, lower: t } = g;
  const scale = 96 / w,
    at = (x: number, y: number) => [40 + scale * x, 35 + scale * (h - y)];
  // Rational coordinates place a construction; pixels are not a calculation input.
  return {
    version: 2,
    style: { show_points: true },
    points: {
      A: at(0, h),
      B: at(0, 0),
      C: at(w, 0),
      D: at(w, h),
      O: at(r, h - r),
      E: at(0, t),
      F: at((s * w) / d, t * (1 - s / d)),
    },
    circles: { c: { center: "O", radius: scale * r } },
    segments: {
      AB: ["A", "B"],
      BC: ["B", "C"],
      CD: ["C", "D"],
      DA: ["D", "A"],
      EC: ["E", "C"],
      OF: ["O", "F"],
    },
    angles: {
      rightF: { vertex: "F", points: ["O", "C"], right: true, label: "" },
    },
    labels: { A: "A", B: "B", C: "C", D: "D", O: "O", E: "E", F: "F" },
  };
}
function make(p: Params): ExamStudyDraft {
  const { width: w, upperPart: a } = p,
    g = geometry(p),
    { r, s, tangent: d, lower: t } = g;
  return {
    content: `직사각형 $ABCD$의 내부에 있는 원 $O$는 세 변 $DA$, $AB$, $CD$에 접한다. 변 $AB$ 위의 점 $E$에서 꼭짓점 $C$를 이은 선분 $EC$도 원에 접하며 접점은 $F$이다. $\\overline{BC}=${w}\\,\\mathrm{cm}$, $\\overline{AE}=${a}\\,\\mathrm{cm}$일 때, 선분 $EC$의 길이를 구하시오.`,
    answer: `$${d}\\,\\mathrm{cm}$`,
    solution: `원과 변 $DA$, $AB$, $CD$의 접점을 각각 $H$, $I$, $G$라 하자. 가로 길이가 지름과 같으므로 반지름은 $${w}\\div2=${r}$이다. 같은 점에서 원에 그은 두 접선의 길이는 같으므로 $AI=AH=${r}$, $DG=DH=${r}$이다. 따라서 $EI=AE-AI=${a}-${r}=${s}$이고 $EF=${s}$이다.\n\n$CF=CG=x$라 하자. $CD=x+${r}$이므로 $EB=AB-AE=x+${r}-${a}=x-${s}$이다. 또 $EC=EF+FC=x+${s}$이다. 직각삼각형 $EBC$에서 $(x+${s})^2=(x-${s})^2+${w}^2$이다. 전개하여 정리하면 $${4 * s}x=${w * w}$이므로 $x=${d - s}$이다.\n\n따라서 $EC=${d - s}+${s}=${d}\\,\\mathrm{cm}$이다. 이때 $EB=${t}>0$이고 $EF=${s}>0$이므로 분할 선분의 조건을 만족한다. 일차식에서 $x$가 하나로 정해져 길이도 유일하다.`,
    parameters: { ...p },
    questionType: "단답형",
    difficulty: "심화하",
    difficultyBasis: [
      "접선 길이의 대응",
      "부분 길이에서 전체 접선 역추론",
      "피타고라스 전개와 양수 길이",
    ],
    figureSpec: figure(p, g),
  };
}
/** Printed givens only: no generator facts, answer or geometry() is a solving input. */
function solvePrinted(content: string) {
  const given = match(
    content,
    /\\overline\{BC\}=(\d+)\\,\\mathrm\{cm\}\$, \$\\overline\{AE\}=(\d+)\\,\\mathrm\{cm\}/u,
  );
  const p = { width: Number(given[1]), upperPart: Number(given[2]) };
  member(p);
  const width = BigInt(p.width),
    twiceS = BigInt(2) * BigInt(p.upperPart) - width;
  insist(twiceS > BigInt(0) && twiceS < width, "인쇄된 접점의 내부 조건");
  // z²=(z-2s)²+w² gives 4sz=4s²+w², independently of make().
  const numerator = width * width + twiceS * twiceS,
    denominator = BigInt(2) * twiceS;
  insist(numerator % denominator === BigInt(0), "인쇄 자료의 정수 답 영역");
  const value = numerator / denominator;
  insist(value > twiceS, "인쇄 자료의 분할 길이 조건");
  insist(
    value <= BigInt(Number.MAX_SAFE_INTEGER),
    "도형 검수의 유한 길이 범위",
  );
  return {
    parameters: p,
    answer: `$${value}\\,\\mathrm{cm}$`,
    tangent: Number(value),
  };
}
const sameParams = (a: CanonicalParams, b: Params) =>
  Object.keys(a).length === 2 &&
  a.width === b.width &&
  a.upperPart === b.upperPart;

/** Internal finite factory. Requirement-based public hold remains unconditional. */
export const inverseTangentRectangle: ExamStudyFamily = {
  id: "study-middle-inverse-tangent-rectangle",
  version: "3-normalized-topology",
  title: "직사각형 부분 길이에서 원의 접선 길이 복원",
  course: "중3",
  unitIds: ["중3|원의 접선"],
  unitSections: ["원의 접선"],
  source: "authored",
  fulfills: [{ requirement, level: "full" }],
  formats: ["단답형"],
  difficulties: ["심화하"],
  representation: "figure-required",
  figureKinds: ["circle-tangent-rectangle"],
  paramDomain: {
    kind: "finite",
    size: domain.length,
    enumerate: () => domain.map((p) => ({ ...p })),
  },
  evidence: {
    testFile: "src/__tests__/unit/examStudyInverseTangentRectangle.test.ts",
    sampleCount: domain.length,
    boundaryCases: [
      "양수 접선 분할",
      "작은 접점 간격",
      "폭과 부분 길이 역산",
      "실제 도형 존재",
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
      const solved = solvePrinted(item.content);
      insist(
        sameParams(item.parameters, solved.parameters),
        "인쇄 조건과 매개변수 불일치",
      );
      insist(
        item.answer === solved.answer,
        "인쇄 조건에서 복원한 접선 길이 불일치",
      );
      assertTangentRectangleGeometry(item.figureSpec, {
        ...solved.parameters,
        tangent: solved.tangent,
      });
      const expected = make(solved.parameters);
      for (const key of [
        "content",
        "solution",
        "figureSpec",
        "difficultyBasis",
      ] as const)
        insist(
          JSON.stringify(item[key]) === JSON.stringify(expected[key]),
          `검토할 학생 면 불일치: ${key}`,
        );
      insist(
        item.questionType === "단답형" &&
          item.difficulty === "심화하" &&
          item.distractors === undefined &&
          item.rubric === undefined,
        "지원하지 않는 형식/난도",
      );
      return { valid: true, checks, errors: [] };
    } catch (err) {
      return {
        valid: false,
        checks: [],
        errors: [err instanceof Error ? err.message : "접선 역산 검산 실패"],
      };
    }
  },
};
