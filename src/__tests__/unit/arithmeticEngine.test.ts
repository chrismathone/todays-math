import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ARITHMETIC_CATALOG_VERSION,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_MAX_DOMAIN_SCAN,
  ARITHMETIC_MAX_ITEMS_PER_ROUND,
  ARITHMETIC_MAX_ROUNDS,
  ARITHMETIC_MAX_SEED_LENGTH,
  ARITHMETIC_SKILL_IDS,
  ARITHMETIC_SKILL_NOTATION,
  ARITHMETIC_SKILL_OPERATOR,
} from "@/contracts/arithmetic.contract";
import {
  ArithmeticEngineError,
  type ArithmeticGenerateRequest,
  arithmeticAnswerMatches,
  arithmeticDomainSize,
  arithmeticIdentityKey,
  arithmeticSheetProblemCount,
  buildArithmeticSheet,
  defaultArithmeticConstraints,
  generateArithmeticSpecs,
  listArithmeticAnswerViews,
  listArithmeticPrintItems,
  listArithmeticProblemViews,
  listArithmeticSkills,
  reopenArithmeticSheet,
  verifyArithmeticSpec,
} from "@/lib/arithmetic";

function request(
  seed: string,
  rounds: ArithmeticGenerateRequest["rounds"],
): ArithmeticGenerateRequest {
  return {
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed,
    rounds,
  };
}

function oneAdd(
  count: number,
  carry: "none" | "some",
  left = { min: 0, max: 9 },
  right = { min: 0, max: 9 },
) {
  return {
    skillId: "one-digit-add" as const,
    count,
    constraints: { carry, left, right },
  };
}

function rejectedCode(spec: unknown): string {
  const result = verifyArithmeticSpec(spec);
  if (result.ok) throw new Error("통과하면 안 됩니다");
  return result.code;
}

function failure(run: () => unknown): ArithmeticEngineError {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(ArithmeticEngineError);
    return error as ArithmeticEngineError;
  }
  throw new Error("오류가 나야 합니다");
}

function handSpec(fields: Record<string, unknown>) {
  return {
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: "hand-check",
    round: 1,
    order: 1,
    ...fields,
  };
}

describe("연산 카탈로그", () => {
  it("첫 출시 기능은 계획의 일곱 스킬군뿐이다", () => {
    const skills = listArithmeticSkills();
    expect(skills.map((skill) => skill.skillId)).toEqual([
      ...ARITHMETIC_SKILL_IDS,
    ]);
    expect(skills).toHaveLength(7);
    for (const skill of skills) {
      expect(skill.notation).toBe(ARITHMETIC_SKILL_NOTATION[skill.skillId]);
      expect(skill.operator).toBe(ARITHMETIC_SKILL_OPERATOR[skill.skillId]);
      expect(skill.answerFormat).toBe("nonnegative-integer");
      expect(skill.purpose.length).toBeGreaterThan(0);
      for (const prerequisite of skill.prerequisites) {
        expect(ARITHMETIC_SKILL_IDS).toContain(prerequisite);
      }
      expect(
        arithmeticDomainSize(
          skill.skillId,
          defaultArithmeticConstraints(skill.skillId),
        ),
      ).toBeGreaterThan(0);
    }
  });

  it("분수·소수·음수·혼합 계산 기능은 목록에 없다", () => {
    const ids = listArithmeticSkills()
      .map((skill) => skill.skillId)
      .join(" ");
    expect(ids).not.toMatch(/fraction|decimal|negative|mixed/);
  });
});

describe("조건별 유한 용량", () => {
  it("한 자리 덧셈과 뺄셈의 가능 수를 독립 루프로 센다", () => {
    let addNone = 0;
    let addSome = 0;
    let sub = 0;
    for (let left = 0; left <= 9; left += 1) {
      for (let right = 0; right <= 9; right += 1) {
        if (left + right >= 10) addSome += 1;
        else addNone += 1;
        if (left >= right) sub += 1;
      }
    }
    expect(addNone).toBe(55);
    expect(addSome).toBe(45);
    expect(sub).toBe(55);
    expect(
      arithmeticDomainSize("one-digit-add", oneAdd(1, "none").constraints),
    ).toBe(addNone);
    expect(
      arithmeticDomainSize("one-digit-add", oneAdd(1, "some").constraints),
    ).toBe(addSome);
    expect(
      arithmeticDomainSize("one-digit-sub", {
        minuend: { min: 0, max: 9 },
        subtrahend: { min: 0, max: 9 },
      }),
    ).toBe(sub);
  });

  it("두 자리 연산의 받아올림·받아내림·곱셈 올림이 전체를 빠짐없이 가른다", () => {
    const add = [0, 0, 0];
    const sub = [0, 0];
    const mul = [0, 0, 0];
    let div = 0;
    for (let left = 10; left <= 99; left += 1) {
      for (let right = 10; right <= 99; right += 1) {
        const ones = (left % 10) + (right % 10);
        const onesCarry = ones >= 10 ? 1 : 0;
        const tens = Math.floor(left / 10) + Math.floor(right / 10) + onesCarry;
        add[onesCarry + (tens >= 10 ? 1 : 0)] += 1;
        if (left >= right) {
          sub[left % 10 < right % 10 ? 1 : 0] += 1;
        }
      }
      for (let factor = 1; factor <= 9; factor += 1) {
        const ones = (left % 10) * factor;
        const onesCarry = Math.floor(ones / 10) > 0 ? 1 : 0;
        const tens = Math.floor(left / 10) * factor + Math.floor(ones / 10);
        mul[onesCarry + (Math.floor(tens / 10) > 0 ? 1 : 0)] += 1;
        if (left % factor === 0) div += 1;
      }
    }
    expect(add.reduce((sum, count) => sum + count, 0)).toBe(90 * 90);
    expect(sub.reduce((sum, count) => sum + count, 0)).toBe((90 * 91) / 2);
    expect(mul.reduce((sum, count) => sum + count, 0)).toBe(90 * 9);
    expect(add[0]! + add[1]! + add[2]!).toBeLessThanOrEqual(
      ARITHMETIC_MAX_DOMAIN_SCAN,
    );
    for (const carryCount of [0, 1, 2] as const) {
      expect(
        arithmeticDomainSize("two-digit-vertical-add", {
          carryCount,
          left: { min: 10, max: 99 },
          right: { min: 10, max: 99 },
        }),
      ).toBe(add[carryCount]);
      expect(
        arithmeticDomainSize("two-digit-times-one", {
          carryCount,
          multiplicand: { min: 10, max: 99 },
          multiplier: { min: 1, max: 9 },
        }),
      ).toBe(mul[carryCount]);
    }
    for (const borrowCount of [0, 1] as const) {
      expect(
        arithmeticDomainSize("two-digit-vertical-sub", {
          borrowCount,
          minuend: { min: 10, max: 99 },
          subtrahend: { min: 10, max: 99 },
        }),
      ).toBe(sub[borrowCount]);
    }
    expect(
      arithmeticDomainSize("two-digit-div-one", {
        dividend: { min: 10, max: 99 },
        divisor: { min: 1, max: 9 },
      }),
    ).toBe(div);
    expect(
      arithmeticDomainSize("times-table", {
        dans: [4, 2],
        multiplier: { min: 1, max: 9 },
      }),
    ).toBe(18);
  });

  it("범위 안의 빈 조건은 0이고, 범위 밖은 지원하지 않는 조건이다", () => {
    expect(
      arithmeticDomainSize("one-digit-add", {
        carry: "none",
        left: { min: 9, max: 9 },
        right: { min: 9, max: 9 },
      }),
    ).toBe(0);
    expect(
      failure(() =>
        arithmeticDomainSize("one-digit-add", {
          carry: "none",
          left: { min: 0, max: 10 },
          right: { min: 0, max: 9 },
        }),
      ).code,
    ).toBe("unsupported-constraint");
    expect(
      failure(() =>
        arithmeticDomainSize("two-digit-div-one", {
          dividend: { min: 10, max: 99 },
          divisor: { min: 0, max: 9 },
        }),
      ).code,
    ).toBe("unsupported-constraint");
    expect(failure(() => arithmeticDomainSize("fraction-add", {})).code).toBe(
      "unsupported-skill",
    );
  });
});

describe("독립 검산", () => {
  const cases = [
    [
      "7+8",
      {
        skillId: "one-digit-add",
        operator: "+",
        operands: [7, 8],
        constraints: {
          carry: "some",
          left: { min: 0, max: 9 },
          right: { min: 0, max: 9 },
        },
      },
      "15",
    ],
    [
      "7+2",
      {
        skillId: "one-digit-add",
        operator: "+",
        operands: [7, 2],
        constraints: {
          carry: "none",
          left: { min: 0, max: 9 },
          right: { min: 0, max: 9 },
        },
      },
      "9",
    ],
    [
      "0+0",
      {
        skillId: "one-digit-add",
        operator: "+",
        operands: [0, 0],
        constraints: {
          carry: "none",
          left: { min: 0, max: 9 },
          right: { min: 0, max: 9 },
        },
      },
      "0",
    ],
    [
      "5+5",
      {
        skillId: "one-digit-add",
        operator: "+",
        operands: [5, 5],
        constraints: {
          carry: "some",
          left: { min: 0, max: 9 },
          right: { min: 0, max: 9 },
        },
      },
      "10",
    ],
    [
      "9-9",
      {
        skillId: "one-digit-sub",
        operator: "-",
        operands: [9, 9],
        constraints: {
          minuend: { min: 0, max: 9 },
          subtrahend: { min: 0, max: 9 },
        },
      },
      "0",
    ],
    [
      "10+10",
      {
        skillId: "two-digit-vertical-add",
        operator: "+",
        operands: [10, 10],
        constraints: {
          carryCount: 0,
          left: { min: 10, max: 99 },
          right: { min: 10, max: 99 },
        },
      },
      "20",
    ],
    [
      "19+19",
      {
        skillId: "two-digit-vertical-add",
        operator: "+",
        operands: [19, 19],
        constraints: {
          carryCount: 1,
          left: { min: 10, max: 99 },
          right: { min: 10, max: 99 },
        },
      },
      "38",
    ],
    [
      "51+51",
      {
        skillId: "two-digit-vertical-add",
        operator: "+",
        operands: [51, 51],
        constraints: {
          carryCount: 1,
          left: { min: 10, max: 99 },
          right: { min: 10, max: 99 },
        },
      },
      "102",
    ],
    [
      "59+59",
      {
        skillId: "two-digit-vertical-add",
        operator: "+",
        operands: [59, 59],
        constraints: {
          carryCount: 2,
          left: { min: 10, max: 99 },
          right: { min: 10, max: 99 },
        },
      },
      "118",
    ],
    [
      "50-10",
      {
        skillId: "two-digit-vertical-sub",
        operator: "-",
        operands: [50, 10],
        constraints: {
          borrowCount: 0,
          minuend: { min: 10, max: 99 },
          subtrahend: { min: 10, max: 99 },
        },
      },
      "40",
    ],
    [
      "50-17",
      {
        skillId: "two-digit-vertical-sub",
        operator: "-",
        operands: [50, 17],
        constraints: {
          borrowCount: 1,
          minuend: { min: 10, max: 99 },
          subtrahend: { min: 10, max: 99 },
        },
      },
      "33",
    ],
    [
      "20-20",
      {
        skillId: "two-digit-vertical-sub",
        operator: "-",
        operands: [20, 20],
        constraints: {
          borrowCount: 0,
          minuend: { min: 10, max: 99 },
          subtrahend: { min: 10, max: 99 },
        },
      },
      "0",
    ],
    [
      "2×3",
      {
        skillId: "times-table",
        operator: "×",
        operands: [2, 3],
        constraints: { dans: [2], multiplier: { min: 1, max: 9 } },
      },
      "6",
    ],
    [
      "23×2",
      {
        skillId: "two-digit-times-one",
        operator: "×",
        operands: [23, 2],
        constraints: {
          carryCount: 0,
          multiplicand: { min: 10, max: 99 },
          multiplier: { min: 1, max: 9 },
        },
      },
      "46",
    ],
    [
      "23×4",
      {
        skillId: "two-digit-times-one",
        operator: "×",
        operands: [23, 4],
        constraints: {
          carryCount: 1,
          multiplicand: { min: 10, max: 99 },
          multiplier: { min: 1, max: 9 },
        },
      },
      "92",
    ],
    [
      "25×4",
      {
        skillId: "two-digit-times-one",
        operator: "×",
        operands: [25, 4],
        constraints: {
          carryCount: 2,
          multiplicand: { min: 10, max: 99 },
          multiplier: { min: 1, max: 9 },
        },
      },
      "100",
    ],
    [
      "51×2",
      {
        skillId: "two-digit-times-one",
        operator: "×",
        operands: [51, 2],
        constraints: {
          carryCount: 1,
          multiplicand: { min: 10, max: 99 },
          multiplier: { min: 1, max: 9 },
        },
      },
      "102",
    ],
    [
      "48÷6",
      {
        skillId: "two-digit-div-one",
        operator: "÷",
        operands: [48, 6],
        constraints: {
          dividend: { min: 10, max: 99 },
          divisor: { min: 1, max: 9 },
        },
      },
      "8",
    ],
    [
      "99÷1",
      {
        skillId: "two-digit-div-one",
        operator: "÷",
        operands: [99, 1],
        constraints: {
          dividend: { min: 10, max: 99 },
          divisor: { min: 1, max: 9 },
        },
      },
      "99",
    ],
  ] as const;

  it("손으로 계산한 정답과 같다", () => {
    for (const [, fields, answer] of cases) {
      const spec = handSpec(fields);
      expect(verifyArithmeticSpec(spec)).toEqual({ ok: true, answer });
      expect(arithmeticAnswerMatches(spec, answer)).toBe(true);
      expect(arithmeticAnswerMatches(spec, `<b>${answer}</b>`)).toBe(false);
      expect(arithmeticAnswerMatches(spec, `${answer} `)).toBe(false);
      expect(arithmeticAnswerMatches(spec, "999")).toBe(false);
    }
  });

  it("목표 조건이 깨지거나 연산자·피연산자가 바뀌면 통과하지 않는다", () => {
    expect(
      rejectedCode(
        handSpec({
          skillId: "one-digit-add",
          operator: "+",
          operands: [7, 8],
          constraints: {
            carry: "none",
            left: { min: 0, max: 9 },
            right: { min: 0, max: 9 },
          },
        }),
      ),
    ).toBe("constraint");
    expect(
      rejectedCode(
        handSpec({
          skillId: "one-digit-sub",
          operator: "-",
          operands: [3, 5],
          constraints: {
            minuend: { min: 0, max: 9 },
            subtrahend: { min: 0, max: 9 },
          },
        }),
      ),
    ).toBe("constraint");
    expect(
      rejectedCode(
        handSpec({
          skillId: "two-digit-vertical-sub",
          operator: "-",
          operands: [17, 20],
          constraints: {
            borrowCount: 1,
            minuend: { min: 10, max: 99 },
            subtrahend: { min: 10, max: 99 },
          },
        }),
      ),
    ).toBe("constraint");
    expect(
      rejectedCode(
        handSpec({
          skillId: "two-digit-div-one",
          operator: "÷",
          operands: [10, 3],
          constraints: {
            dividend: { min: 10, max: 99 },
            divisor: { min: 1, max: 9 },
          },
        }),
      ),
    ).toBe("constraint");
    expect(
      rejectedCode(
        handSpec({
          skillId: "one-digit-add",
          operator: "-",
          operands: [7, 2],
          constraints: {
            carry: "none",
            left: { min: 0, max: 9 },
            right: { min: 0, max: 9 },
          },
        }),
      ),
    ).toBe("operator");
    expect(
      rejectedCode(
        handSpec({
          skillId: "one-digit-add",
          operator: "+",
          operands: [7, 15],
          constraints: {
            carry: "some",
            left: { min: 0, max: 9 },
            right: { min: 0, max: 9 },
          },
        }),
      ),
    ).toBe("operand");
    expect(
      rejectedCode(
        handSpec({
          skillId: "two-digit-div-one",
          operator: "÷",
          operands: [12, 0],
          constraints: {
            dividend: { min: 10, max: 99 },
            divisor: { min: 1, max: 9 },
          },
        }),
      ),
    ).toBe("operand");
    expect(
      rejectedCode(
        handSpec({
          skillId: "one-digit-add",
          operator: "+",
          operands: [7, 8],
          constraints: { carry: "some", allowNegative: true },
        }),
      ),
    ).toBe("unsupported-constraint");
  });

  it("전수 쌍의 검산 정답이 독립 식과 같다", () => {
    let verified = 0;
    for (let left = 0; left <= 9; left += 1) {
      for (let right = 0; right <= 9; right += 1) {
        const carry = left + right >= 10 ? "some" : "none";
        const result = verifyArithmeticSpec(
          handSpec({
            skillId: "one-digit-add",
            operator: "+",
            operands: [left, right],
            constraints: {
              carry,
              left: { min: 0, max: 9 },
              right: { min: 0, max: 9 },
            },
          }),
        );
        expect(result).toEqual({ ok: true, answer: String(left + right) });
        verified += 1;
      }
    }
    expect(verified).toBe(100);
  });
});

describe("결정적 생성과 거절", () => {
  const pinned = request("smoke-seed", [{ skills: [oneAdd(2, "none")] }]);

  it("같은 버전·설정·시드는 같은 순서의 명세를 낸다", () => {
    const first = generateArithmeticSpecs(pinned);
    const second = generateArithmeticSpecs(pinned);
    expect(second).toEqual(first);
    expect(first.map((spec) => spec.operands)).toEqual([
      [2, 1],
      [0, 0],
    ]);
    const longer = generateArithmeticSpecs(
      request("smoke-seed", [{ skills: [oneAdd(5, "none")] }]),
    );
    expect(longer.slice(0, 2).map((spec) => spec.operands)).toEqual(
      first.map((spec) => spec.operands),
    );
    expect(
      generateArithmeticSpecs(request("other-seed", pinned.rounds)),
    ).not.toEqual(first);
    for (const spec of first) {
      expect(Object.keys(spec)).not.toContain("answer");
      expect(Object.keys(spec)).not.toContain("solution");
      expect(spec.engineVersion).toBe(ARITHMETIC_ENGINE_VERSION);
      expect(spec.catalogVersion).toBe(ARITHMETIC_CATALOG_VERSION);
      expect(spec.seed).toBe("smoke-seed");
    }
  });

  it("단 목록의 순서는 같은 설정으로 본다", () => {
    const left = buildArithmeticSheet(
      request("dan-order", [
        {
          skills: [
            {
              skillId: "times-table",
              count: 4,
              constraints: { dans: [4, 2], multiplier: { min: 1, max: 3 } },
            },
          ],
        },
      ]),
    );
    const right = buildArithmeticSheet(
      request("dan-order", [
        {
          skills: [
            {
              skillId: "times-table",
              count: 4,
              constraints: { dans: [2, 4], multiplier: { min: 1, max: 3 } },
            },
          ],
        },
      ]),
    );
    expect(right).toEqual(left);
    expect(left.rounds[0]!.items[0]!.spec.constraints).toMatchObject({
      dans: [2, 4],
    });
  });

  it("순서 있는 피연산자는 한 회차에서 한 번만 나오고 3+8과 8+3은 둘 다 남는다", () => {
    const sheet = buildArithmeticSheet(
      request("all-carry", [{ skills: [oneAdd(45, "some")] }]),
    );
    const keys = sheet.rounds[0]!.items.map((item) =>
      arithmeticIdentityKey(item.spec.skillId, item.spec.operands),
    );
    expect(new Set(keys).size).toBe(45);
    expect(keys).toContain("one-digit-add:3:8");
    expect(keys).toContain("one-digit-add:8:3");
    expect(keys).not.toContain("one-digit-add:1:1");
  });

  it("한 문항 회차끼리는 같은 식을 허용하지 않는다", () => {
    const rounds = Array.from({ length: 2 }, () => ({
      skills: [
        {
          skillId: "times-table" as const,
          count: 1,
          constraints: { dans: [2], multiplier: { min: 5, max: 5 } },
        },
      ],
    }));
    expect(
      failure(() => buildArithmeticSheet(request("repeat-round", rounds))).code,
    ).toBe("round-overlap");
  });

  it("한 기능이라도 가능 수를 넘으면 회차 전체를 거절한다", () => {
    const error = failure(() =>
      buildArithmeticSheet(
        request("too-many", [
          {
            skills: [
              {
                skillId: "times-table",
                count: 1,
                constraints: { dans: [2], multiplier: { min: 1, max: 1 } },
              },
              oneAdd(46, "some"),
            ],
          },
        ]),
      ),
    );
    expect(error.code).toBe("capacity");
    expect(error.violations).toEqual([
      {
        round: 1,
        allocation: 2,
        skillId: "one-digit-add",
        requested: 46,
        available: 45,
        reason: "domain",
      },
    ]);
  });

  it("같은 조건이 겹쳐 회차 안에서 모자라면 일부만 만들지 않는다", () => {
    const error = failure(() =>
      buildArithmeticSheet(
        request("overlap", [
          { skills: [oneAdd(23, "some"), oneAdd(23, "some")] },
        ]),
      ),
    );
    expect(error.code).toBe("capacity");
    expect(error.violations?.[0]).toMatchObject({
      allocation: 2,
      requested: 23,
      available: 22,
      reason: "overlap",
    });
  });

  it("빈 조건과 문항 수·시드·버전 상한을 거절한다", () => {
    expect(
      failure(() =>
        buildArithmeticSheet(
          request("empty-domain", [
            {
              skills: [
                oneAdd(1, "none", { min: 9, max: 9 }, { min: 9, max: 9 }),
              ],
            },
          ]),
        ),
      ).code,
    ).toBe("capacity");
    expect(
      failure(() =>
        validateCount(request("count", [{ skills: [oneAdd(0, "none")] }])),
      ).code,
    ).toBe("invalid-count");
    expect(
      failure(() =>
        validateCount(request("count", [{ skills: [oneAdd(201, "none")] }])),
      ).code,
    ).toBe("invalid-count");
    expect(
      failure(() =>
        buildArithmeticSheet(
          request("round-limit", [
            { skills: [oneAdd(160, "none"), oneAdd(41, "some")] },
          ]),
        ),
      ).limit,
    ).toMatchObject({
      scope: "round",
      count: 201,
      max: ARITHMETIC_MAX_ITEMS_PER_ROUND,
    });
    expect(
      failure(() =>
        buildArithmeticSheet({
          ...request(
            "rounds",
            Array.from({ length: ARITHMETIC_MAX_ROUNDS + 1 }, () => ({
              skills: [oneAdd(1, "none")],
            })),
          ),
        }),
      ).limit,
    ).toMatchObject({ scope: "rounds", max: ARITHMETIC_MAX_ROUNDS });
    expect(
      failure(() => buildArithmeticSheet({ ...pinned, seed: "" })).code,
    ).toBe("invalid-seed");
    expect(
      failure(() =>
        buildArithmeticSheet({
          ...pinned,
          seed: "a".repeat(ARITHMETIC_MAX_SEED_LENGTH + 1),
        }),
      ).code,
    ).toBe("invalid-seed");
    expect(
      failure(() => buildArithmeticSheet({ ...pinned, seed: "한글" })).code,
    ).toBe("invalid-seed");
    expect(
      failure(() => buildArithmeticSheet({ ...pinned, seed: "a\nb" })).code,
    ).toBe("invalid-seed");
    expect(
      failure(() =>
        buildArithmeticSheet({
          ...pinned,
          engineVersion: "arithmetic-engine-v0",
        }),
      ).code,
    ).toBe("version");
    expect(
      failure(() => buildArithmeticSheet({ ...pinned, solution: "없음" })).code,
    ).toBe("schema");
    expect(
      failure(() =>
        buildArithmeticSheet({
          engineVersion: ARITHMETIC_ENGINE_VERSION,
          catalogVersion: ARITHMETIC_CATALOG_VERSION,
          seed: "extra",
          rounds: [
            {
              skills: [
                {
                  skillId: "one-digit-sub",
                  count: 1,
                  constraints: {
                    minuend: { min: 0, max: 9 },
                    subtrahend: { min: 0, max: 9 },
                    allowNegative: true,
                  },
                },
              ],
            },
          ],
        }),
      ).code,
    ).toBe("unsupported-constraint");
    expect(
      failure(() =>
        buildArithmeticSheet({
          engineVersion: ARITHMETIC_ENGINE_VERSION,
          catalogVersion: ARITHMETIC_CATALOG_VERSION,
          seed: "borrow",
          rounds: [
            {
              skills: [
                {
                  skillId: "two-digit-vertical-sub",
                  count: 1,
                  constraints: {
                    borrowCount: 2,
                    minuend: { min: 10, max: 99 },
                    subtrahend: { min: 10, max: 99 },
                  },
                },
              ],
            },
          ],
        }),
      ).code,
    ).toBe("unsupported-constraint");
    expect(
      buildArithmeticSheet({
        ...pinned,
        seed: "a".repeat(ARITHMETIC_MAX_SEED_LENGTH),
      }).seed,
    ).toHaveLength(ARITHMETIC_MAX_SEED_LENGTH);
  });
});

function validateCount(input: unknown): unknown {
  return buildArithmeticSheet(input);
}

function alignHorizontal(
  payload: ReturnType<typeof buildArithmeticSheet>,
  operands: [number, number],
): void {
  const item = payload.rounds[0]!.items[0]!;
  item.spec.operands = operands;
  const prompt = item.prompt;
  if (prompt.notation !== "horizontal") throw new Error("가로 식이 아닙니다");
  prompt.operands = operands;
  prompt.expression = `${operands[0]}${prompt.operator}${operands[1]}`;
}

describe("학습지 스냅샷", () => {
  const sheet = buildArithmeticSheet(
    request("sheet", [
      { skills: [oneAdd(2, "none")] },
      {
        skills: [
          {
            skillId: "two-digit-vertical-add",
            count: 1,
            constraints: {
              carryCount: 0,
              left: { min: 10, max: 12 },
              right: { min: 10, max: 12 },
            },
          },
        ],
      },
    ]),
  );

  it("발문과 정답만 저장하고 다시 열 때 다시 뽑지 않는다", () => {
    expect(sheet.kind).toBe("arithmeticSheet");
    expect(sheet.payloadVersion).toBe(1);
    expect(JSON.stringify(sheet)).not.toContain("solution");
    expect(reopenArithmeticSheet(sheet)).toEqual(sheet);
    expect(arithmeticSheetProblemCount(sheet)).toBe(3);
    const problems = listArithmeticProblemViews(sheet);
    const answers = listArithmeticAnswerViews(sheet);
    expect(problems.map((item) => item.number)).toEqual([1, 2, 3]);
    expect(answers.map((item) => item.number)).toEqual([1, 2, 3]);
    expect(problems[2]!.round).toBe(2);
    expect(Object.keys(problems[0]!).sort()).toEqual([
      "number",
      "order",
      "prompt",
      "round",
    ]);
    expect(Object.keys(answers[0]!).sort()).toEqual([
      "answer",
      "number",
      "order",
      "round",
    ]);
    for (const item of listArithmeticPrintItems(sheet)) {
      expect(item.answer).toMatch(/^(0|[1-9][0-9]{0,2})$/);
      expect(JSON.stringify(item.prompt)).not.toContain("<");
      if (item.prompt.notation === "horizontal") {
        expect(item.prompt.expression).not.toContain(`=${item.answer}`);
      } else {
        expect(item.prompt.rows).toHaveLength(2);
      }
      expect(
        verifyArithmeticSpec(
          sheet.rounds[item.round - 1]!.items[item.order - 1]!.spec,
        ),
      ).toEqual({
        ok: true,
        answer: item.answer,
      });
    }
  });

  it("저장된 정답·연산자·피연산자·발문이 오염되면 다시 열지 않는다", () => {
    const wrongAnswer = structuredClone(sheet);
    wrongAnswer.rounds[0]!.items[0]!.answer = "0";
    expect(failure(() => reopenArithmeticSheet(wrongAnswer)).code).toBe(
      "answer-mismatch",
    );
    expect(verifyArithmeticSpec(wrongAnswer.rounds[0]!.items[0]!.spec)).toEqual(
      {
        ok: true,
        answer: sheet.rounds[0]!.items[0]!.answer,
      },
    );

    const wrongOperator = structuredClone(sheet);
    wrongOperator.rounds[0]!.items[0]!.spec.operator = "-";
    expect(failure(() => reopenArithmeticSheet(wrongOperator)).code).toBe(
      "operator",
    );

    const brokenGoal = structuredClone(sheet);
    alignHorizontal(brokenGoal, [9, 8]);
    expect(failure(() => reopenArithmeticSheet(brokenGoal)).code).toBe(
      "constraint",
    );

    const outside = structuredClone(sheet);
    alignHorizontal(outside, [7, 15]);
    expect(failure(() => reopenArithmeticSheet(outside)).code).toBe("operand");

    const html = structuredClone(sheet);
    html.rounds[0]!.items[0]!.answer = "<b>4</b>";
    expect(failure(() => reopenArithmeticSheet(html)).code).toBe("schema");

    const solved = structuredClone(sheet) as unknown as {
      rounds: { items: Record<string, unknown>[] }[];
    };
    solved.rounds[0]!.items[0] = {
      ...sheet.rounds[0]!.items[0]!,
      spec: { ...sheet.rounds[0]!.items[0]!.spec, solution: "과정" },
    };
    expect(failure(() => reopenArithmeticSheet(solved)).code).toBe("schema");

    const prompt = structuredClone(sheet);
    const horizontal = prompt.rounds[0]!.items[0]!.prompt;
    if (horizontal.notation !== "horizontal")
      throw new Error("가로 식이 아닙니다");
    horizontal.expression = "9+9";
    expect(failure(() => reopenArithmeticSheet(prompt)).code).toBe(
      "prompt-mismatch",
    );

    const duplicate = structuredClone(sheet);
    const first = duplicate.rounds[0]!.items[0]!;
    const second = duplicate.rounds[0]!.items[1]!;
    second.spec = structuredClone(first.spec);
    second.spec.order = 2;
    second.prompt = structuredClone(first.prompt);
    second.answer = first.answer;
    expect(failure(() => reopenArithmeticSheet(duplicate)).code).toBe(
      "duplicate",
    );
  });
});

describe("엔진 경계", () => {
  it("생성과 다시 열기는 문제은행·기존 장·풀이를 부르지 않는다", () => {
    const directory = path.join(process.cwd(), "src", "lib", "arithmetic");
    const sources = readdirSync(directory).map((file) =>
      readFileSync(path.join(directory, file), "utf8"),
    );
    const combined = sources.join("\n");
    expect(combined).not.toMatch(
      /@\/lib\/(ai|elementary|middle|generator|problem|bank)/,
    );
    expect(combined).not.toMatch(
      /prisma|openai|deepseek|generateElementaryProblem/,
    );
    const generate = readFileSync(path.join(directory, "generate.ts"), "utf8");
    expect(generate).not.toContain("answer:");
    expect(generate).not.toContain("solution");
    const reopen = readFileSync(path.join(directory, "reopen.ts"), "utf8");
    expect(reopen).not.toContain("generateArithmetic");
    expect(reopen).not.toContain("buildArithmeticSheet");
    expect(reopen).not.toContain("arithmeticDomain");
  });
});
