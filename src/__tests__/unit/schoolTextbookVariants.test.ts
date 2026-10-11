import { describe, expect, it } from "vitest";
import {
  generateTextbookVariantPair,
  textbookVariantSourceDigest,
  validateTextbookVariantPair,
  type TextbookVariantSource,
  type TextbookVariantCandidate,
} from "@/lib/import/schoolTextbook/variants";

function source(
  content: string,
  answer: string,
  delta: Partial<TextbookVariantSource> = {},
): TextbookVariantSource {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    source: "school_textbook",
    content,
    answer,
    solution: "기존 풀이",
    question_type: "단답형",
    direct_use_allowed: true,
    review_status: "approved",
    origin_problem_id: null,
    unit_id: "unit",
    source_material_id: "material",
    external_id: "tb-external",
    family_key: "solo:original",
    source_file: "source.hwp",
    updated_at: "2026-10-11T00:00:00.000Z",
    figure_svg: null,
    figure_urls: [],
    figure_dims: [],
    choice_figure_index: [],
    ...delta,
  };
}
function pair(
  input: TextbookVariantSource,
): [TextbookVariantCandidate, TextbookVariantCandidate] {
  const result = generateTextbookVariantPair(input);
  expect(result.status, JSON.stringify(result)).toBe("matched");
  if (result.status !== "matched") throw new Error(result.reason);
  expect(validateTextbookVariantPair(input, result.candidates)).toEqual({
    valid: true,
    issues: [],
  });
  return result.candidates;
}
function unresolved(input: TextbookVariantSource, reason?: string): void {
  const result = generateTextbookVariantPair(input);
  expect(result.status).toBe("unresolved");
  if (reason && result.status === "unresolved")
    expect(result.reason).toBe(reason);
}

describe("source-matched textbook variant pairs", () => {
  it("keeps high-degree derivative coefficients exact and compact on paper", () => {
    const [a, b] = pair(
      source("다음 함수의 도함수를 구하시오.\n$y=x^{100}$", "$100x^{99}$"),
    );
    expect(a.content).toContain("(2x)^{100}");
    expect(b.content).toContain("(3x)^{100}");
    expect(a.answer).toBe("$100\\cdot 2^{100}x^{99}$");
    expect(b.answer).toBe("$100\\cdot 3^{100}x^{99}$");
    expect(b.solution).toContain(b.answer);
    const low = pair(
      source("다음 함수의 도함수를 구하시오.\n$y=x^{3}$", "$3x^{2}$"),
    );
    expect(low[1].answer).toBe("$81x^{2}$");
  });
  it("produces exact integer calculations, two distinct siblings and reproducible provenance", () => {
    const input = source("다음을 계산하시오.\n$2+3\\times4$", "$14$");
    const before = structuredClone(input),
      [a, b] = pair(input);
    expect(a.content).toBe("다음을 계산하시오.\n$4+5\\times6$");
    expect(a.answer).toBe("$34$");
    expect(b.answer).toBe("$47$");
    expect(a.content).not.toBe(b.content);
    expect(a.content).not.toBe(input.content);
    expect(a).toMatchObject({
      source: "transformed",
      slot: 1,
      originProblemId: input.id,
      familyKey: input.family_key,
      externalId: `tb-retry-v1:${input.id}:1`,
      sourceMaterialId: "material",
      unitId: "unit",
      questionType: "단답형",
    });
    expect(pair(input)).toEqual([a, b]);
    expect(input).toEqual(before);
  });
  it("retains exact rational answers rather than floating point", () => {
    const [a] = pair(
      source(
        "다음을 계산하시오.\n$\\frac{2}{3}+\\frac{4}{5}$",
        "$\\frac{22}{15}$",
      ),
    );
    expect(a.answer).toBe("$\\frac{58}{35}$");
  });
  it("retains decimal place counts and recalculates decimals exactly", () => {
    const [a] = pair(source("다음을 계산하시오.\n$0.2+0.3$", "$0.5$"));
    expect(a.content).toContain("$0.4+0.5$");
    expect(a.answer).toBe("$\\frac{9}{10}$");
  });
  it("preserves unary minus and power precedence", () => {
    const [a] = pair(source("다음을 계산하시오.\n$-2^{2}+(-3)^{2}$", "$5$"));
    expect(a.answer).toBe("$9$");
    expect(a.content).toContain("-4^{2}+(-5)^{2}");
  });
  it("uses i²=-1 including conjugate division", () => {
    const [a] = pair(
      source("다음을 계산하시오.\n$\\frac{3+i}{1-i}$", "$1+2i$"),
    );
    expect(a.answer).toBe("$3i+2$");
  });
  it("preserves all subquestion labels and independently verifies every answer", () => {
    const input = source(
      "다음을 계산하시오.\n⑴ $2+3$\n⑵ $4-7$",
      "⑴ $5$ ⑵ $-3$",
    );
    const [a] = pair(input);
    expect(a.answer).toBe("⑴ $9$ ⑵ $-3$");
    expect(a.solution).toContain("⑴ ");
    expect(a.solution).toContain("⑵ ");
    unresolved({ ...input, answer: "⑴ $5$ ⑵ $3$" }, "source-answer-mismatch");
  });
  it("preserves identities by rescaling a variable rather than perturbing related coefficients", () => {
    const [a] = pair(
      source("다음 식을 전개하시오.\n$(x+2)(x^{2}-2x+4)$", "$x^{3}+8$"),
    );
    expect(a.answer).toBe("$8x^{3}+8$");
    expect(a.content).toContain("((2x)+2)((2x)^{2}-2(2x)+4)");
  });
  it("can vary a wholly symbolic expression while preserving the expansion method", () => {
    const [a] = pair(
      source("$(a-b+c)(a+b-c)$을 전개하시오.", "$a^{2}-b^{2}-c^{2}+2bc$"),
    );
    expect(a.answer).toBe("$4a^{2}-b^{2}+2bc-c^{2}$");
  });
  it("constructs factorization from an exact source certificate and checks expansion", () => {
    const [a] = pair(
      source("다음 식을 인수분해하시오.\n$x^{2}-9$", "$(x-3)(x+3)$"),
    );
    expect(a.content).toContain("$4x^{2}-9$");
    expect(a.answer).toBe("$((2x)-3)((2x)+3)$");
    expect(a.validation.checks).toContain("factor-product-expanded-exact");
    unresolved(
      source("다음 식을 인수분해하시오.\n$x^{2}-9$", "$(x-3)(x+2)$"),
      "source-answer-mismatch",
    );
  });
  it("solves linear equations and verifies by substituting on both sides", () => {
    const [a] = pair(
      source("일차방정식 $0.7x-1.2=3(0.2x-0.8)$의 해를 구하시오.", "$x=-12$"),
    );
    expect(a.validation.checks).toContain("root-substitution-both-sides");
    expect(a.answer).toBe("$x=\\frac{36}{11}$");
  });
  it("handles a source-matched substitution question", () => {
    const [a] = pair(source("$x=-3$일 때, $2x+4$의 값을 구하시오.", "$-2$"));
    expect(a.recipe).toBe("exact-substitution");
    expect(a.content).toBe("$x=-1$일 때, $2x+4$의 값을 구하시오.");
    expect(a.answer).toBe("$2$");
  });
  it("keeps multiple-choice format with exactly one correct option and stable offsets", () => {
    const [a] = pair(
      source("$2+3$의 값은?\n① $3$\n② $4$\n③ $5$\n④ $6$\n⑤ $7$", "③", {
        question_type: "객관식",
      }),
    );
    expect(a.answer).toBe("③");
    expect(a.content).toBe(
      "$4+5$의 값은?\n① $7$\n② $8$\n③ $9$\n④ $10$\n⑤ $11$",
    );
    expect(a.validation.checks).toContain("unique-numeric-choice");
    unresolved(
      source("$2+3$의 값은?\n① $5$\n② $5$\n③ $6$", "①", {
        question_type: "객관식",
      }),
      "source-answer-mismatch",
    );
  });
  it("preserves prime factor multiplicities and recalculates the new integer", () => {
    const [a, b] = pair(
      source("다음 수를 소인수분해하시오.\n$60$", "$2^{2}\\times3\\times5$"),
    );
    expect(a.content).toContain("$84$");
    expect(a.answer).toContain("$2^{2}\\times 3\\times 7$");
    expect(b.content).toContain("$132$");
  });
  it("computes gcd/lcm from the same relationship under common scaling", () => {
    const [g] = pair(
      source("다음 두 수의 최대공약수를 구하시오.\n$48,80$", "$16$"),
    );
    expect(g.content).toContain("$96,\\,160$");
    expect(g.answer).toBe("$32$");
    const [l] = pair(source("두 수 $12,18$의 최소공배수를 구하시오.", "$36$"));
    expect(l.answer).toBe("$72$");
  });
});

describe("further source-specific methods", () => {
  it("extracts the requested monomial coefficient without changing the requested term", () => {
    const [a] = pair(
      source(
        "$(x-2y+3)(2x-y+1)$을 전개한 식에서 $xy$의 계수를 구하시오.",
        "$-5$",
      ),
    );
    expect(a.recipe).toBe("exact-polynomial-coefficient");
    expect(a.answer).toBe("$-10$");
    expect(a.content).toContain("$xy$의 계수를");
  });
  it("checks coefficient questions and alternatives exactly", () => {
    const [a] = pair(
      source(
        "$(x+2)(x^{2}+x+3)$의 전개식에서 $x^{2}$의 계수는?\n① $1$\n② $2$\n③ $3$\n④ $4$\n⑤ $5$",
        "③",
        { question_type: "객관식" },
      ),
    );
    expect(a.content).toContain("③ $12$");
    expect(a.answer).toBe("③");
  });
  it("accepts equivalent numeric subquestion label styles without changing either source style", () => {
    const [a] = pair(
      source("다음을 계산하시오.\n(1) $2+3$\n(2) $4-7$", "⑴ $5$ ⑵ $-3$"),
    );
    expect(a.content).toContain("(1) ");
    expect(a.answer).toContain("⑴ ");
  });
  it("substitutes multiple assignments and keeps every target calculation", () => {
    const [a] = pair(
      source(
        "$a=2,~b=-3$일 때, 다음 식의 값을 구하시오.\n⑴ $a^{2}+2b$\n⑵ $ab$",
        "⑴ $-2$ ⑵ $-6$",
      ),
    );
    expect(a.content).toContain("$a=4,\\,b=-1$");
    expect(a.answer).toBe("⑴ $14$ ⑵ $-4$");
  });
  it("rejects duplicate or symbolic assignments", () => {
    unresolved(
      source("$a=2,a=3$일 때, $a+2$의 값을 구하시오.", "$5$"),
      "duplicate-assignment",
    );
    unresolved(source("$a=b$일 때, $a+2$의 값을 구하시오.", "$5$"));
  });
  it("differentiates a product under a consistent variable change", () => {
    const [a] = pair(
      source("다음 함수를 미분하시오.\n$y=(x-3)(2x+5)$", "$4x-1$"),
    );
    expect(a.recipe).toBe("exact-derivative");
    expect(a.answer).toBe("$16x-2$");
    expect(a.content).toContain("y=((2x)-3)(2(2x)+5)");
  });
  it("evaluates finite removable limits and preserves the cancellation order", () => {
    const [a] = pair(
      source(
        "$\\lim_{x\\to 2}\\frac{x^{3}-8}{x^{2}-x-2}$의 값을 구하시오.",
        "$4$",
      ),
    );
    expect(a.recipe).toBe("exact-polynomial-limit");
    expect(a.content).toContain("\\lim_{x\\to 4}");
    expect(a.answer).toBe("$8$");
    expect(a.solution).toContain("$1$번 약분");
  });
  it("checks repeated removable factors and direct polynomial limits", () => {
    const [a] = pair(
      source(
        "다음 극한값을 구하시오.\n⑴ $\\lim_{x\\to 3}\\frac{(x-3)^{2}}{(x-3)^{2}}$\n⑵ $\\lim_{x\\to 2}(x^{2}+1)$",
        "⑴ $1$ ⑵ $5$",
      ),
    );
    expect(a.answer).toBe("⑴ $2$ ⑵ $10$");
    expect(a.solution).toContain("$2$번 약분");
  });
  it("never converts a divergent limit into a finite answer", () => {
    unresolved(
      source("$\\lim_{x\\to 2}\\frac{1}{x-2}$의 값을 구하시오.", "$0$"),
      "non-finite-limit",
    );
  });
  it("integrates polynomials and verifies the primitive derivative", () => {
    const [a] = pair(
      source("정적분 $\\int_{0}^{2}(3x^{2}+1)dx$의 값을 구하시오.", "$10$"),
    );
    expect(a.recipe).toBe("exact-polynomial-integral");
    expect(a.answer).toBe("$34$");
  });
  it("preserves oriented integral bounds", () => {
    const [a] = pair(
      source("다음 정적분의 값을 구하시오.\n$\\int_{2}^{0}3x^{2}dx$", "$-8$"),
    );
    expect(a.answer).toBe("$-32$");
  });
  it("matches gcd/lcm with separate source fragments and factored choices", () => {
    const [a] = pair(
      source(
        "두 수 $2^{2}\\times3$, $2\\times3^{2}$의 최대공약수는?\n① $2$\n② $3$\n③ $2\\times3$\n④ $2\\times5$\n⑤ $2^{2}\\times3$",
        "③",
        { question_type: "객관식" },
      ),
    );
    expect(a.recipe).toBe("exact-gcd");
    expect(a.content).toContain("$2^{3}\\times 3$");
    expect(a.answer).toBe("③");
    const [b] = pair(source("$12$과 $18$의 최소공배수를 구하시오.", "$36$"));
    expect(b.answer).toBe("$72$");
  });
  it("retains x= option format for equation multiple choice", () => {
    const [a] = pair(
      source("일차방정식 $2x+3=7$의 해는?\n① $x=1$\n② $x=2$\n③ $x=3$", "②", {
        question_type: "객관식",
      }),
    );
    expect(a.recipe).toBe("exact-linear-equation");
    expect(a.content).toContain("② $x=1$");
    expect(a.answer).toBe("②");
  });
});

describe("adversarial source and write-boundary guards", () => {
  it.each([{ direct_use_allowed: false }, { review_status: "pending" }])(
    "does not manufacture eligibility for held originals: %j",
    (delta) => {
      unresolved(
        source("다음을 계산하시오.\n$2+3$", "$5$", delta),
        "source-held",
      );
    },
  );
  it.each([{ source: "manual" }, { origin_problem_id: "parent" }])(
    "requires genuine textbook originals: %j",
    (delta) => {
      unresolved(
        source("다음을 계산하시오.\n$2+3$", "$5$", delta),
        "not-textbook-original",
      );
    },
  );
  it("refuses diagrams instead of carrying stale labels", () => {
    unresolved(
      source("다음을 계산하시오.\n$2+3$", "$5$", {
        figure_urls: ["diagram.png"],
      }),
      "figure-dependent",
    );
    unresolved(
      source("[그림] 다음을 계산하시오.\n$2+3$", "$5$"),
      "figure-dependent",
    );
  });
  it("does not invent descriptive problems from short answers", () => {
    unresolved(
      source("다음 문제의 풀이 과정과 그 답을 쓰시오.\n$2+3$", "$5$", {
        question_type: "서술형",
      }),
      "no-exact-template",
    );
  });
  it("refuses unrelated narratives, inequalities, unknown commands and extra conditions", () => {
    for (const content of [
      "연필 $2$개와 $3$개를 합하면?",
      "다음을 계산하시오.\n$2<3$",
      "다음을 계산하시오.\n$\\input{secret}$",
      "다음을 계산하시오.\n$2+3$ (단, 정답이 7이다.)",
    ])
      unresolved(source(content, "$5$"));
  });
  it("rejects division by zero, degenerate equations and ambiguous ungrouped monomial divisors", () => {
    unresolved(
      source("다음을 계산하시오.\n$2/(3-3)$", "$0$"),
      "zero-denominator",
    );
    unresolved(
      source("다음 방정식을 푸시오.\n$2x+3=2x+3$", "$0$"),
      "degenerate-equation",
    );
    unresolved(
      source(
        "다음을 계산하시오.\n$\\frac{1}{2}x^{3}\\div\\frac{3}{2}x$",
        "$\\frac{1}{3}x^{2}$",
      ),
    );
  });
  it("rejects large work and malformed expressions rather than hanging", () => {
    unresolved(
      source("다음을 계산하시오.\n$2^{100000000}$", "$0$"),
      "exponent-limit",
    );
    unresolved(
      source(
        `다음을 계산하시오.\n$${"(".repeat(35)}2${")".repeat(35)}$`,
        "$2$",
      ),
      "expression-depth",
    );
    unresolved(source("다음을 계산하시오.\n$2+$", "$2$"));
  });
  it("never returns only one sibling when a numerical method has no safe variation", () => {
    unresolved(
      source("다음을 계산하시오.\n$(-1)^{5}$", "$-1$"),
      "insufficient-distinct-pair",
    );
  });
  it("binds every source field, date serialization and key-order independence", () => {
    const input = source("다음을 계산하시오.\n$2+3$", "$5$");
    const digest = textbookVariantSourceDigest(input);
    for (const delta of [
      { content: "$2+4$" },
      { answer: "$6$" },
      { solution: "new" },
      { unit_id: "other" },
      { source_material_id: "other" },
      { direct_use_allowed: false },
      { figure_svg: "svg" },
      { figure_urls: ["x"] },
      { figure_dims: [5, 6] },
      { choice_figure_index: [1] },
      { updated_at: "2026-10-12" },
      { family_key: "other" },
    ])
      expect(textbookVariantSourceDigest({ ...input, ...delta })).not.toBe(
        digest,
      );
    expect(
      textbookVariantSourceDigest(
        Object.fromEntries(
          Object.entries(input).reverse(),
        ) as TextbookVariantSource,
      ),
    ).toBe(digest);
    expect(
      textbookVariantSourceDigest({
        ...input,
        updated_at: new Date(input.updated_at as string),
      }),
    ).toBe(digest);
  });
  it("rejects tampered content, answers, proof, slots, provenance, figures and claimed evidence", () => {
    const input = source("다음을 계산하시오.\n$2+3$", "$5$"),
      good = pair(input);
    for (const delta of [
      { answer: "$999$" },
      { content: "unrelated" },
      { solution: "false proof" },
      { slot: 2 },
      { sourceId: "other" },
      { originProblemId: "other" },
      { sourceDigest: "old" },
      { figureUrls: ["x"] },
      { validation: { ...good[0].validation, computedAnswers: ["999"] } },
    ]) {
      const bad = [
        { ...good[0], ...delta } as TextbookVariantCandidate,
        good[1],
      ];
      expect(validateTextbookVariantPair(input, bad).valid).toBe(false);
    }
    expect(validateTextbookVariantPair(input, [good[0]]).valid).toBe(false);
    expect(
      validateTextbookVariantPair({ ...input, solution: "changed" }, good)
        .valid,
    ).toBe(false);
  });
});
