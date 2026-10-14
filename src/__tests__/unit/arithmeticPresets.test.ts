// @vitest-environment node
import { afterAll, describe, expect, it } from "vitest";
import {
  findArithmeticPreset,
  listArithmeticPresets,
} from "@/lib/arithmeticPresets";
import {
  ARITHMETIC_SKILL_IDS,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
  arithmeticDomainSize,
  buildArithmeticSheet,
  reopenArithmeticSheet,
  validateArithmeticRequest,
  type ArithmeticGenerateRequest,
  type ArithmeticPrompt,
  type ArithmeticSkillSelection,
} from "@/lib/arithmetic";
import type { ArithmeticPreset } from "@/lib/arithmeticPresets";
import { arithmeticDomainPairs } from "@/lib/arithmetic/domain";

const presets = listArithmeticPresets();
const seeds = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
];
const evidence = {
  examples: 0,
  domains: 0,
  domainMemberships: 0,
  sheets: 0,
  rounds: 0,
  items: 0,
  variationEligible: 0,
  variationProbes: 0,
};

function requestFor(
  preset: ArithmeticPreset,
  seed: string,
  rounds = 2,
): ArithmeticGenerateRequest {
  return {
    engineVersion: ARITHMETIC_ENGINE_VERSION,
    catalogVersion: ARITHMETIC_CATALOG_VERSION,
    seed: `preset-fixture-v1:${preset.id}:${seed}`,
    rounds: Array.from({ length: rounds }, () => ({
      skills: [{ ...preset.selection, count: preset.defaultCount }],
    })),
  };
}

const inside = (n: number, r: { min: number; max: number }) =>
  n >= r.min && n <= r.max;

// Independent column arithmetic: no generator, domain or verifier functions.
function columnTransfers(
  left: number,
  right: number,
  operation: "+" | "-" | "×",
): number {
  const leftDigits = String(left)
    .padStart(2, "0")
    .split("")
    .reverse()
    .map(Number);
  const rightDigits = String(right)
    .padStart(2, "0")
    .split("")
    .reverse()
    .map(Number);
  let transfer = 0;
  let transfers = 0;
  for (let column = 0; column < 2; column++) {
    const value =
      operation === "+"
        ? leftDigits[column]! + rightDigits[column]! + transfer
        : operation === "-"
          ? leftDigits[column]! - rightDigits[column]! - transfer
          : leftDigits[column]! * right + transfer;
    transfer = operation === "-" ? Number(value < 0) : Math.trunc(value / 10);
    if (transfer > 0) transfers++;
  }
  return transfers;
}

function independentlyAllowed(
  selection: ArithmeticSkillSelection,
  a: number,
  b: number,
): boolean {
  switch (selection.skillId) {
    case "one-digit-add":
      return (
        a <= 9 &&
        b <= 9 &&
        inside(a, selection.constraints.left) &&
        inside(b, selection.constraints.right) &&
        (selection.constraints.carry === "none" ? a + b < 10 : a + b >= 10)
      );
    case "one-digit-sub":
      return (
        a <= 9 &&
        b <= 9 &&
        a >= b &&
        inside(a, selection.constraints.minuend) &&
        inside(b, selection.constraints.subtrahend)
      );
    case "two-digit-vertical-add":
      return (
        a >= 10 &&
        b >= 10 &&
        inside(a, selection.constraints.left) &&
        inside(b, selection.constraints.right) &&
        columnTransfers(a, b, "+") === selection.constraints.carryCount
      );
    case "two-digit-vertical-sub":
      return (
        a >= 10 &&
        b >= 10 &&
        a >= b &&
        inside(a, selection.constraints.minuend) &&
        inside(b, selection.constraints.subtrahend) &&
        columnTransfers(a, b, "-") === selection.constraints.borrowCount
      );
    case "times-table":
      return (
        a >= 1 &&
        a <= 9 &&
        b >= 1 &&
        b <= 9 &&
        selection.constraints.dans.includes(a) &&
        inside(b, selection.constraints.multiplier)
      );
    case "two-digit-times-one":
      return (
        a >= 10 &&
        b >= 1 &&
        b <= 9 &&
        inside(a, selection.constraints.multiplicand) &&
        inside(b, selection.constraints.multiplier) &&
        columnTransfers(a, b, "×") === selection.constraints.carryCount
      );
    case "two-digit-div-one":
      return (
        a >= 10 &&
        b >= 1 &&
        b <= 9 &&
        a % b === 0 &&
        inside(a, selection.constraints.dividend) &&
        inside(b, selection.constraints.divisor)
      );
  }
}

function independentDomain(selection: ArithmeticSkillSelection): Set<string> {
  const pairs = new Set<string>();
  for (let a = 0; a <= 99; a++)
    for (let b = 0; b <= 99; b++)
      if (independentlyAllowed(selection, a, b)) pairs.add(`${a}:${b}`);
  return pairs;
}

function expectedOperator(
  selection: ArithmeticSkillSelection,
): "+" | "-" | "×" | "÷" {
  switch (selection.skillId) {
    case "one-digit-add":
    case "two-digit-vertical-add":
      return "+";
    case "one-digit-sub":
    case "two-digit-vertical-sub":
      return "-";
    case "times-table":
    case "two-digit-times-one":
      return "×";
    case "two-digit-div-one":
      return "÷";
  }
}

function independentAnswer(
  selection: ArithmeticSkillSelection,
  [left, right]: [number, number],
): string {
  const a = BigInt(left),
    b = BigInt(right);
  switch (expectedOperator(selection)) {
    case "+":
      return String(a + b);
    case "-":
      return String(a - b);
    case "×":
      return String(a * b);
    case "÷":
      expect(b).not.toBe(BigInt(0));
      expect(a % b).toBe(BigInt(0));
      return String(a / b);
  }
}

function assertPrompt(
  selection: ArithmeticSkillSelection,
  prompt: ArithmeticPrompt,
  operands: [number, number],
) {
  const operator = expectedOperator(selection);
  expect(prompt.operands).toEqual(operands);
  expect(prompt.operator).toBe(operator);
  if (
    selection.skillId === "two-digit-vertical-add" ||
    selection.skillId === "two-digit-vertical-sub"
  ) {
    expect(prompt).toEqual({
      notation: "vertical",
      operator,
      operands,
      rows: operands.map(String),
    });
  } else {
    expect(prompt).toEqual({
      notation: "horizontal",
      operator,
      operands,
      expression: `${operands[0]}${operator}${operands[1]}`,
    });
  }
  expect(prompt).not.toHaveProperty("answer");
  expect(prompt).not.toHaveProperty("solution");
}

const domains = new Map(
  presets.map((preset) => [preset.id, independentDomain(preset.selection)]),
);

describe("authored arithmetic presets", () => {
  it("provides stable, distinct supported selections with exact positive capacities", () => {
    const presets = listArithmeticPresets();
    expect(presets.length).toBeGreaterThanOrEqual(60);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(
      presets.length,
    );
    expect(
      new Set(presets.map((preset) => JSON.stringify(preset.selection))).size,
    ).toBe(presets.length);
    expect(new Set(presets.map((preset) => preset.selection.skillId))).toEqual(
      new Set(ARITHMETIC_SKILL_IDS),
    );
    for (const preset of presets) {
      expect(preset.id).toMatch(/^[a-z][a-z0-9-]+$/);
      expect(preset.title.length).toBeGreaterThan(0);
      expect(preset.description.length).toBeGreaterThan(0);
      expect(preset.domainSize).toBeGreaterThan(0);
      expect(preset.domainSize).toBe(
        arithmeticDomainSize(
          preset.selection.skillId,
          preset.selection.constraints,
        ),
      );
      expect(preset.defaultCount).toBe(Math.min(20, preset.domainSize));
      expect(findArithmeticPreset(preset.id)).toBe(preset);
      expect(Object.isFrozen(preset.selection.constraints)).toBe(true);
    }
    expect(findArithmeticPreset("unknown-preset")).toBeUndefined();
    expect(findArithmeticPreset("__proto__")).toBeUndefined();
    expect(listArithmeticPresets()).toBe(presets);
  });

  it("keeps every normalized selection and group honest without curriculum claims", () => {
    const keys = new Set<string>();
    const domainKeys = new Set<string>();
    for (const preset of presets) {
      const allocation = validateArithmeticRequest(
        requestFor(preset, "normalization"),
      ).rounds[0]!.skills[0]!;
      expect(preset.selection).toEqual({
        skillId: allocation.skillId,
        constraints: allocation.constraints,
      });
      const key = JSON.stringify([allocation.skillId, allocation.constraints]);
      expect(keys.has(key)).toBe(false);
      keys.add(key);
      const domainKey = `${preset.selection.skillId}:${[...domains.get(preset.id)!].sort().join("|")}`;
      expect(domainKeys.has(domainKey), preset.id).toBe(false);
      domainKeys.add(domainKey);
      expect(preset.group).toBe(
        { "+": "덧셈", "-": "뺄셈", "×": "곱셈", "÷": "나눗셈" }[
          expectedOperator(preset.selection)
        ],
      );
      expect(`${preset.title} ${preset.description}`).not.toMatch(
        /학년|교육과정|성취기준|공식 인증|무한/,
      );
    }
    expect(findArithmeticPreset("add-two-carry-0")?.selection).toEqual({
      skillId: "two-digit-vertical-add",
      constraints: {
        carryCount: 0,
        left: { min: 10, max: 99 },
        right: { min: 10, max: 99 },
      },
    });
  });

  it("does not allow one caller to mutate later cards or selections", () => {
    const preset = findArithmeticPreset("times-table-2")!;
    const before = JSON.stringify(presets);
    expect(() => {
      preset.title = "변경";
    }).toThrow(TypeError);
    if (preset.selection.skillId === "times-table") {
      const dans = preset.selection.constraints.dans;
      expect(() => {
        dans.push(3);
      }).toThrow(TypeError);
    }
    expect(() => {
      preset.example.operands[0] = 99;
    }).toThrow(TypeError);
    expect(JSON.stringify(listArithmeticPresets())).toBe(before);
  });

  it.each(presets)(
    "$id: independently enumerates its exact domain and verifies the card example",
    (preset) => {
      const domain = domains.get(preset.id)!;
      expect(domain.size).toBe(preset.domainSize);
      expect(domain.size).toBeGreaterThan(0);
      expect(
        new Set(
          arithmeticDomainPairs(preset.selection).map((pair) => pair.join(":")),
        ),
      ).toEqual(domain);
      expect(domain.has(preset.example.operands.join(":"))).toBe(true);
      assertPrompt(preset.selection, preset.example, preset.example.operands);
      const exampleRequest = requestFor(preset, "unused", 1);
      exampleRequest.seed = `preset-example-v1:${preset.id}`;
      exampleRequest.rounds[0]!.skills[0]!.count = 1;
      const example = buildArithmeticSheet(exampleRequest).rounds[0]!.items[0]!;
      expect(example.prompt).toEqual(preset.example);
      expect(example.answer).toBe(
        independentAnswer(preset.selection, example.spec.operands),
      );
      evidence.examples++;
      evidence.domains++;
      evidence.domainMemberships += domain.size;
    },
  );

  it.each(presets)(
    "$id: eight seeds preserve conditions, independent answers and duplicate-free snapshots",
    (preset) => {
      const domain = domains.get(preset.id)!;
      for (const seed of seeds) {
        const input = requestFor(preset, seed);
        const sheet = buildArithmeticSheet(input);
        expect(buildArithmeticSheet(structuredClone(input))).toEqual(sheet);
        expect(
          reopenArithmeticSheet(JSON.parse(JSON.stringify(sheet))),
        ).toEqual(sheet);
        expect(sheet.rounds).toHaveLength(2);
        for (const round of sheet.rounds) {
          expect(round.items).toHaveLength(preset.defaultCount);
          const identities = new Set<string>();
          for (const [index, item] of round.items.entries()) {
            const pair = item.spec.operands.join(":");
            expect(domain.has(pair)).toBe(true);
            expect(identities.has(pair)).toBe(false);
            identities.add(pair);
            expect(item.spec).toMatchObject({
              ...preset.selection,
              seed: input.seed,
              order: index + 1,
              round: round.round,
            });
            expect(item.order).toBe(index + 1);
            expect(item.answer).toBe(
              independentAnswer(preset.selection, item.spec.operands),
            );
            assertPrompt(preset.selection, item.prompt, item.spec.operands);
            expect(item).not.toHaveProperty("solution");
          }
          evidence.rounds++;
          evidence.items += round.items.length;
        }
        const corrupted = structuredClone(sheet);
        corrupted.rounds[0]!.items[0]!.answer = "999";
        expect(() => reopenArithmeticSheet(corrupted)).toThrow();
        evidence.sheets++;
      }
    },
  );

  it.each(presets)(
    "$id: fresh seeds vary the numeric set or its order whenever the domain allows it",
    (preset) => {
      const signatures = new Set<string>();
      for (let attempt = 0; attempt < 32 && signatures.size < 2; attempt++) {
        const sheet = buildArithmeticSheet(
          requestFor(preset, `variation-${attempt}`, 1),
        );
        const pairs = sheet.rounds[0]!.items.map((item) =>
          item.spec.operands.join(":"),
        );
        // Full-domain requests can change only order; partial requests should change membership.
        if (preset.domainSize > preset.defaultCount) pairs.sort();
        signatures.add(pairs.join("|"));
        evidence.variationProbes++;
        if (preset.domainSize === 1) break;
      }
      expect(signatures.size).toBe(preset.domainSize > 1 ? 2 : 1);
      if (preset.domainSize > 1) evidence.variationEligible++;
    },
  );

  it("rejects two overlapping preset allocations instead of padding a depleted round", () => {
    // This smaller pair shares the exact 0+1 item, with distinct authored constraints.
    const fixedOne = findArithmeticPreset("add-one-fixed-1-no-carry")!;
    const small = findArithmeticPreset("add-one-small-0-4")!;
    const input = requestFor(small, "overlap", 1);
    input.rounds[0]!.skills = [
      { ...small.selection, count: small.domainSize },
      { ...fixedOne.selection, count: fixedOne.domainSize },
    ];
    expect(() => buildArithmeticSheet(input)).toThrow(/넘습니다/);
  });
});

afterAll(() => {
  console.info("Arithmetic preset verification:", JSON.stringify(evidence));
});
