/**
 * Read-only inspection of the six frozen r1 definitions. Missing r2 evidence is
 * reported, never inferred, backfilled, registered, or written to stored payloads.
 */
import {
  serializeNativeSolution,
  type NativeDescriptiveProblem,
} from "../../contracts/nativeDescriptive.contract";
import {
  generateNativeDescriptive,
  nativeDescriptiveDefinitions,
} from "./nativeDescriptive20261018";
import {
  checkNativeGates,
  type NativeGateSuite,
} from "./nativeDescriptiveGates";
import { legacyNativeVerifiers } from "./descriptiveVerification/legacy";

const range = (first: number, last: number, step = 1) =>
  Array.from({ length: (last - first) / step + 1 }, (_, i) =>
    String(first + i * step),
  );
const coverage = (
  dimensions: Record<string, string[]>,
): NativeGateSuite["coverage"] =>
  Object.entries(dimensions).map(([dimension, values]) => ({
    dimension,
    values,
  }));

// Declared from each frozen generator's legal ranges, not from the samples observed
// by its independent oracle. These are marginal ranges/branches, not Cartesian coverage.
const LEGACY_COVERAGE: Readonly<Record<string, NativeGateSuite["coverage"]>> = {
  "e4-equilateral-audit-r1": coverage({
    given: ["둘레가", "한 변이"],
    side: range(3, 18),
    sideError: range(1, 3),
    proposedAngle: range(70, 90, 10),
  }),
  "e4-triangle-dual-proof-r1": coverage({
    beta: ["30", "35", "40", "45", "50", "70", "80"],
    largest: ["70", "80", "90", "100", "110", "120"],
    angleClass: ["예각삼각형", "직각삼각형", "둔각삼각형"],
  }),
  "e4-trapezoid-sufficiency-r1": coverage({
    side: range(3, 12),
    parallel: ["변 AB와 CD", "변 AD와 BC"],
  }),
  "m3-factor-error-proof-r1": coverage({
    a: range(2, 6),
    gap: range(1, 4),
    sign: ["+", "-"],
    check: range(1, 4),
  }),
  "m3-quadratic-domain-r1": coverage({
    width: range(4, 15),
    delta: range(2, 6),
    object: ["종이", "사진 판"],
  }),
  // The oracle observes adjacent spacing: twice the scale in the four-value branch.
  "m3-statistics-shift-spread-r1": coverage({
    center: range(12, 20),
    step: ["1", "2", "3", "4", "6"],
    shift: range(2, 6),
    count: ["4", "5"],
  }),
};

function corruptSign(p: NativeDescriptiveProblem): NativeDescriptiveProblem {
  p.content =
    p.definitionId === "m3-factor-error-proof-r1"
      ? p.content.replace(
          /x\^2([+-])/,
          (_, sign: string) => `x^2${sign === "+" ? "-" : "+"}`,
        )
      : p.content.replace(/\$(\d+)/, (_, number: string) => `$-${number}`);
  return p;
}

function corruptUnit(p: NativeDescriptiveProblem): NativeDescriptiveProblem {
  if (p.definitionId === "e4-triangle-dual-proof-r1") {
    p.content = p.content.replace("^\\circ", "\\,\\mathrm{rad}");
  } else if (p.definitionId === "m3-factor-error-proof-r1") {
    // A dimensionless polynomial must not silently accept a new physical unit.
    p.content = p.content.replace("$의", "\\,\\mathrm{cm}$의");
  } else if (p.definitionId === "m3-statistics-shift-spread-r1") {
    p.content = p.content.replace(
      /각 값에 \$(\d+)\$/,
      (_, number: string) => `각 값에 $${number}\\,\\mathrm{cm}$`,
    );
  } else {
    p.content = p.content.replace("\\mathrm{cm}", "\\mathrm{m}");
  }
  return p;
}

function corruptIntermediate(
  p: NativeDescriptiveProblem,
): NativeDescriptiveProblem {
  const c =
    p.rubric.criteria[p.definitionId === "m3-factor-error-proof-r1" ? 1 : 0]!;
  if (p.definitionId === "e4-triangle-dual-proof-r1") {
    c.expected = c.expected.replace(
      "이등변이면서 정삼각형은 아님",
      "정삼각형임",
    );
  } else if (p.definitionId === "e4-trapezoid-sufficiency-r1") {
    c.expected = c.expected.replace("가의 평행 한 쌍", "가의 평행 두 쌍");
  } else {
    c.expected = c.expected.replace(/\d+/, (number) =>
      String(Number(number) + 100),
    );
  }
  // Do not get mutation credit merely from an out-of-date teacher serialization.
  p.solution = serializeNativeSolution(p.modelAnswer, p.rubric);
  return p;
}

export function auditLegacyNativeDefinitions() {
  const seeds = [
    ...Array.from({ length: 500 }, (_, i) => i),
    -2147483648,
    2147483647,
    20261018,
    Number.MIN_SAFE_INTEGER,
    Number.MAX_SAFE_INTEGER,
  ];
  return nativeDescriptiveDefinitions().map((definition) => {
    const { definitionId, title } = definition;
    const verify = legacyNativeVerifiers[definitionId],
      declared = LEGACY_COVERAGE[definitionId];
    if (!verify || !declared)
      throw new Error(`Legacy audit not defined: ${definitionId}`);
    const suite: NativeGateSuite = {
      generate: (seed, variant) =>
        generateNativeDescriptive(definitionId, seed, variant),
      verify,
      samples: seeds.flatMap((seed) =>
        [0, 1].map((variant) => ({ seed, variant })),
      ),
      coverage: structuredClone(declared),
      mutations: [
        { kind: "sign", label: "인쇄 조건의 부호 반전", mutate: corruptSign },
        {
          kind: "unit",
          label: "인쇄 단위 변경 또는 무단 삽입",
          mutate: corruptUnit,
        },
        {
          kind: "intermediate",
          label: "배점 대상 중간 판단/수치 변경",
          mutate: corruptIntermediate,
        },
      ].map((mutation) => ({
        ...mutation,
        seed: 0,
        variant: 0,
      })) as NativeGateSuite["mutations"],
    };
    return { definitionId, title, ...checkNativeGates(suite) };
  });
}
