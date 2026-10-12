import { describe, expect, it } from "vitest";
import {
  generateTextbookGeometryPair,
  validateTextbookGeometryPair,
  type TextbookGeometryCandidate,
} from "@/lib/import/schoolTextbook/variantsGeometry";
import {
  textbookVariantSourceDigest,
  type TextbookVariantSource,
} from "@/lib/import/schoolTextbook/variants";

function source(
  content: string,
  answer: string,
  extra: Partial<TextbookVariantSource> = {},
): TextbookVariantSource {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "school_textbook",
    content,
    answer,
    solution: "Do not copy this wrong solution",
    question_type: "단답형",
    direct_use_allowed: true,
    review_status: "approved",
    origin_problem_id: null,
    unit_id: "unit",
    source_material_id: "material",
    family_key: "family",
    external_id: "source-external",
    source_file: "original.hwp",
    updated_at: "2026-10-11T00:00:00Z",
    figure_svg: null,
    figure_urls: [],
    ...extra,
  };
}
function pair(
  s: TextbookVariantSource,
): [TextbookGeometryCandidate, TextbookGeometryCandidate] {
  const result = generateTextbookGeometryPair(s);
  expect(result.status, JSON.stringify(result)).toBe("matched");
  if (result.status !== "matched") throw new Error(result.reason);
  expect(validateTextbookGeometryPair(s, result.candidates)).toEqual({
    valid: true,
    issues: [],
  });
  return result.candidates;
}
function rejects(s: TextbookVariantSource, reason?: string): void {
  const r = generateTextbookGeometryPair(s);
  expect(r.status).toBe("unresolved");
  if (reason && r.status === "unresolved") expect(r.reason).toBe(reason);
}

describe("complete-template textbook geometry and finite counting", () => {
  it("separates inherited adjacent inline delimiters in new candidates", () => {
    const s = source(
      "좌표평면 위의 다음 두 점 $A, B$를 이은 선분 $AB$의 중점 $M$의 좌표를 구하시오.\n⑴ $A(-4,-3)$$, B(-8,1)$",
      "⑴ $(-6,-1)$",
    );
    const before = s.content,
      [a, b] = pair(s);
    expect(a.content).not.toContain("$$");
    expect(b.content).not.toContain("$$");
    expect(a.answer).toBe("⑴ $(-12,\\,-2)$");
    expect(s.content).toBe(before);
  });
  it("checks unary minus after exponentiation when verifying a source answer", () => {
    const s = source(
      "다음 두 점 사이의 거리를 구하시오.\n⑴ $A(0),B(4)$",
      "⑴ $-2^{2}$",
    );
    rejects(s, "source-answer-mismatch");
    pair({ ...s, answer: "⑴ $(-2)^{2}$" });
    rejects({ ...s, answer: "⑴ $\\frac{4}{0}$" }, "zero-denominator");
  });
  it("recalculates a mixed 1D/2D/3D source without dropping its subquestions", () => {
    const s = source(
      "다음 두 점 사이의 거리를 구하시오.\n(1) $A(-2),B(4)$\n(2) $(2,1),(4,-2)$\n(3) $(3,2,4),(1,4,5)$",
      "⑴ $6$ ⑵ $\\sqrt{13}$ ⑶ $3$",
    );
    const before = structuredClone(s),
      [a, b] = pair(s);
    expect(a.answer).toBe("⑴ $12$\n⑵ $2\\sqrt{13}$\n⑶ $6$");
    expect(b.answer).toBe("⑴ $18$\n⑵ $3\\sqrt{13}$\n⑶ $9$");
    expect(a.solution).toContain("(4)^{2}+(-6)^{2}");
    expect(a.solution).not.toContain("Do not copy");
    expect(s).toEqual(before);
    expect(a).toMatchObject({
      sourceDigest: textbookVariantSourceDigest(s),
      originProblemId: s.id,
      sourceMaterialId: "material",
      unitId: "unit",
      familyKey: "family",
      sourceExternalId: "source-external",
      sourceFile: "original.hwp",
      questionType: "단답형",
      externalId: `tb-retry-v1:${s.id}:1`,
      slot: 1,
    });
    expect(b.externalId).toBe(`tb-retry-v1:${s.id}:2`);
    expect(a.content).not.toBe(b.content);
    expect(a.content).not.toBe(s.content);
  });
  it("computes negative fractional midpoints exactly", () => {
    const [a, b] = pair(
      source(
        "좌표평면 위의 다음 두 점 $A,B$를 이은 선분 $AB$의 중점 $M$의 좌표를 구하시오.\n⑴ $A(-1,5),B(-2,5)$",
        "⑴ $(-\\frac{3}{2},5)$",
      ),
    );
    expect(a.answer).toBe("⑴ $(-3,\\,10)$");
    expect(b.answer).toBe("⑴ $(-\\frac{9}{2},\\,15)$");
  });
  it("supports LaTeX spacing/left-right delimiters and a nondegenerate spatial centroid", () => {
    const [a, b] = pair(
      source(
        "다음을 구하시오.\n(1) 세 점 $\\mathrm{A}\\left(2,\\,3,\\,-1\\right)$, $\\mathrm{B}\\left(3,\\,-1,\\,2\\right)$, $\\mathrm{C}\\left(-1,\\,2,\\,3\\right)$을 꼭짓점으로 하는 삼각형 $ABC$의 무게중심 $G$의 좌표",
        "(1) $(\\frac{4}{3},\\frac{4}{3},\\frac{4}{3})$",
      ),
    );
    expect(a.answer).toBe(
      "(1) $(\\frac{8}{3},\\,\\frac{8}{3},\\,\\frac{8}{3})$",
    );
    expect(b.answer).toBe("(1) $(4,\\,4,\\,4)$");
  });
  it("preserves a shared endpoint pair and both section ratios", () => {
    const [a, b] = pair(
      source(
        "좌표평면 위의 두 점 $A(-2,2)$, $B(4,5)$에 대하여 다음 점의 좌표를 구하시오.\n⑴ 선분 $AB$를 $2:1$로 내분하는 점 $P$\n⑵ 선분 $AB$를 $1:2$로 내분하는 점 $P$",
        "⑴ $(2,4)$ ⑵ $(0,3)$",
      ),
    );
    expect(a.answer).toBe("⑴ $(4,\\,8)$\n⑵ $(0,\\,6)$");
    expect(b.answer).toBe("⑴ $(6,\\,12)$\n⑵ $(0,\\,9)$");
    expect(a.content).toContain("$2:1$");
    expect(a.content).toContain("$1:2$");
  });
  it("recovers a missing triangle vertex from centroid and midpoint", () => {
    const [a] = pair(
      source(
        "삼각형 $ABC$의 무게중심의 좌표는 $(2,1)$이고 변 $AB$의 중점의 좌표는 $\\left(\\frac{3}{2},-2\\right)$일 때, 점 $C$의 좌표를 구하시오.",
        "$(3,7)$",
      ),
    );
    expect(a.answer).toBe("$(6,\\,14)$");
  });
  it("computes affine line distances with oblique, horizontal and vertical lines", () => {
    const [a, b] = pair(
      source(
        "다음 점과 직선 사이의 거리를 구하시오.\n⑴ 점 $(1,2)$, 직선 $5x-12y-7=0$\n⑵ 점 $(-5,1)$, 직선 $3y-2=0$\n⑶ 점 $(1,6)$, 직선 $x=3$\n⑷ 점 $(-1,4)$, 직선 $y=\\frac{3}{2}x-1$",
        "⑴ $2$ ⑵ $\\frac{1}{3}$ ⑶ $2$ ⑷ $\\sqrt{13}$",
      ),
    );
    expect(a.answer).toBe("⑴ $4$\n⑵ $\\frac{2}{3}$\n⑶ $4$\n⑷ $2\\sqrt{13}$");
    expect(b.answer).toBe("⑴ $6$\n⑵ $1$\n⑶ $6$\n⑷ $3\\sqrt{13}$");
  });
  it("normalizes proportional parallel-line coefficients before measuring the distance", () => {
    const [a] = pair(
      source(
        "평행한 두 직선 $2x-y+8=0$, $4x-2y-4=0$ 사이의 거리를 구하시오.",
        "$2\\sqrt{5}$",
      ),
    );
    expect(a.answer).toBe("$4\\sqrt{5}$");
    rejects(
      source(
        "평행한 두 직선 $2x-y+8=0$, $4x-y-4=0$ 사이의 거리를 구하시오.",
        "$2\\sqrt{5}$",
      ),
      "non-parallel-lines",
    );
  });
  it("keeps all four reflection targets and their shared point", () => {
    const [a] = pair(
      source(
        "점 $(-4,3)$을 다음 점 또는 직선에 대하여 대칭이동한 점의 좌표를 구하시오.\n(1) $x$축\n(2) $y$축\n(3) 원점\n(4) 직선 $y=x$",
        "(1) $(-4,-3)$ (2) $(4,3)$ (3) $(4,-3)$ (4) $(3,-4)$",
      ),
    );
    expect(a.answer).toBe(
      "(1) $(-8,\\,-6)$\n(2) $(8,\\,6)$\n(3) $(8,\\,-6)$\n(4) $(6,\\,-8)$",
    );
  });
  it("preserves translation amounts while changing the starting coordinates", () => {
    const [a] = pair(
      source(
        "다음 점을 $x$축의 방향으로 $3$만큼, $y$축의 방향으로 $-1$만큼 평행이동한 점의 좌표를 구하시오.\n⑴ $(0,0)$ ⑵ $(3,1)$",
        "⑴ $(3,-1)$ ⑵ $(6,0)$",
      ),
    );
    expect(a.answer).toBe("⑴ $(3,\\,-1)$\n⑵ $(9,\\,1)$");
    expect(a.content).toContain("$3$만큼");
  });
  it.each([
    ["{}_{5}P_{2}", "20", "30", "42"],
    ["{}_{5}C_{2}", "10", "15", "21"],
    ["{}_{3}H_{2}", "6", "10", "15"],
    ["{}_{3}\\Pi_{3}", "27", "64", "125"],
  ])(
    "recomputes %s as a typed finite combinatorics template",
    (expr, ans, v1, v2) => {
      const [a, b] = pair(
        source(`다음 값을 구하시오.\n(1) $${expr}$`, `(1) $${ans}$`),
      );
      expect(a.answer).toBe(`(1) $${v1}$`);
      expect(b.answer).toBe(`(1) $${v2}$`);
    },
  );
  it("counts unrestricted gifts and recalculates numeric multiple choice alternatives", () => {
    const s = source(
      "서로 다른 $5$개의 사탕을 $A$, $B$, $C$, $D$ $4$명의 학생에게 남김없이 나누어 주는 방법의 수는? (단, 받지 못하는 학생이 있을 수 있다.)\n① $120$ ② $225$ ③ $256$ ④ $625$ ⑤ $1024$",
      "⑤",
      { question_type: "객관식" },
    );
    const [a, b] = pair(s);
    expect(a.answer).toBe("⑤");
    expect(a.content).toContain("⑤ $4096$");
    expect(b.content).toContain("⑤ $16384$");
    expect(a.questionType).toBe("객관식");
    rejects(
      { ...s, content: s.content.replace("$4$명의", "$5$명의") },
      "recipient-list-count-mismatch",
    );
  });
  it("keeps power word restrictions and recalculates the factorial examples", () => {
    const [a] = pair(
      source(
        "다음을 구하시오.\n(1) 학생 $4$명을 일렬로 세우는 경우의 수\n(2) 뷔페식당에서 요리사가 서로 다른 음식 $6$가지를 일렬로 배열하는 경우의 수",
        "(1) $24$ (2) $720$",
      ),
    );
    expect(a.answer).toBe("(1) $120$\n(2) $5040$");
    rejects(
      source(
        "$6$명의 학생이 사진반, 축구반, 게임반 중에서 각자 한 반씩 들어가는 방법의 수를 구하시오. (단, 빈 반이 있을 수 없다.)",
        "$729$",
      ),
    );
  });
  it.each([
    "(단, A는 제1사분면 위의 점이다.)",
    "두 점의 중점도 구하시오.",
    "[그림]",
    " x+y=3일 때",
  ])("does not ignore appended condition %s", (extra) => {
    rejects(
      source(
        `다음 두 점 사이의 거리를 구하시오.\n⑴ $A(-2),B(4)$ ${extra}`,
        "⑴ $6$",
      ),
    );
  });
  it("rejects wrong answers, dropped subanswers and wrong dimensions", () => {
    rejects(
      source("다음 두 점 사이의 거리를 구하시오.\n⑴ $A(-2),B(4)$", "⑴ $5$"),
      "source-answer-mismatch",
    );
    rejects(
      source(
        "다음 두 점 사이의 거리를 구하시오.\n⑴ $A(-2),B(4)$ ⑵ $A(1),B(3)$",
        "⑴ $6$",
      ),
      "source-answer-shape",
    );
    rejects(
      source("다음 두 점 사이의 거리를 구하시오.\n⑴ $A(-2),B(4,3)$", "⑴ $6$"),
      "coordinate-shape",
    );
  });
  it("rejects identical points, fake origins, collinear triangles and illegal permutation selection", () => {
    rejects(
      source("다음 두 점 사이의 거리를 구하시오.\n⑴ $A(2),B(2)$", "⑴ $0$"),
      "identical-points",
    );
    rejects(
      source("다음 두 점 사이의 거리를 구하시오.\n⑴ $O(1,1),A(4,5)$", "⑴ $5$"),
      "origin-coordinate-mismatch",
    );
    rejects(
      source(
        "다음 세 점 $A,B,C$를 꼭짓점으로 하는 삼각형 $ABC$의 무게중심 $G$의 좌표를 구하시오.\n⑴ $A(4,2),B(-1,7),C(3,3)$",
        "⑴ $(2,4)$",
      ),
      "degenerate-triangle",
    );
    rejects(
      source("다음 값을 구하시오.\n⑴ ${}_{3}P_{5}$", "⑴ $0$"),
      "counting-range",
    );
  });
  it.each([
    { figure_urls: ["original.png"] },
    { figure_svg: "<svg/>" },
    { figure_source: "original.hwp" },
    { review_status: "pending" },
    { direct_use_allowed: false },
    { origin_problem_id: "parent" },
    { source: "transformed" },
  ])("excludes unsafe source metadata %j", (extra) => {
    rejects(
      source(
        "다음 두 점 사이의 거리를 구하시오.\n⑴ $A(-2),B(4)$",
        "⑴ $6$",
        extra,
      ),
    );
  });
  it("checks every authored field, slot order and current source digest at validation", () => {
    const s = source(
        "다음 두 점 사이의 거리를 구하시오.\n⑴ $A(-2),B(4)$",
        "⑴ $6$",
      ),
      p = pair(s);
    for (const field of [
      "content",
      "answer",
      "solution",
      "familyKey",
      "sourceMaterialId",
      "externalId",
      "method",
    ] as const) {
      const tampered = structuredClone(p);
      tampered[0][field] = "tampered";
      expect(validateTextbookGeometryPair(s, tampered).valid, field).toBe(
        false,
      );
    }
    expect(validateTextbookGeometryPair(s, [p[1], p[0]]).valid).toBe(false);
    for (const extra of [
      { answer: "⑴ $7$" },
      { updated_at: "new" },
      { family_key: "new" },
      { review_status: "pending" },
      { figure_urls: ["new.png"] },
    ])
      expect(validateTextbookGeometryPair({ ...s, ...extra }, p).valid).toBe(
        false,
      );
  });
});
