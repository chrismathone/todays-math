// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
  arithmeticGenerateRequestSchema,
  arithmeticIdentityKey,
} from "@/contracts/arithmetic.contract";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  arithmeticV2GenerateRequestSchema,
  arithmeticV2PromptIdentity,
} from "@/contracts/arithmeticV2.contract";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import {
  buildArithmeticSheet,
  defaultArithmeticConstraints,
  reopenArithmeticSheet,
} from "@/lib/arithmetic";
import {
  buildArithmeticV2Sheet,
  listArithmeticV2Types,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import { parseStrictJson } from "@/lib/textbook/strictJson";

const legacy = (count: number, rounds: number) => ({
  engineVersion: ARITHMETIC_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_CATALOG_VERSION,
  // Escaped printable characters exercise the largest supported seed encoding.
  seed: '"'.repeat(128),
  rounds: Array.from({ length: rounds }, () => ({
    skills: [
      {
        skillId: "two-digit-times-one" as const,
        count,
        constraints: defaultArithmeticConstraints("two-digit-times-one"),
      },
    ],
  })),
});
const grade = (typeId: string, count: number, rounds: number) => ({
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
  seed: '"'.repeat(128),
  rounds: Array.from({ length: rounds }, () => ({
    allocations: [{ typeId, count }],
  })),
});

function saveBody(sheet: object) {
  return JSON.stringify({
    kind: "arithmeticSheet",
    title: "가".repeat(100),
    expectedRevision: null,
    payload: { ...sheet, presentation: defaultArithmeticPresentation("학원") },
  });
}

describe("multi-round arithmetic quantity and snapshot boundaries", () => {
  it.each([
    [100, 2],
    [10, 20],
  ])(
    "v1 generates and reopens %i x %i without within-round duplicates",
    (count, rounds) => {
      const input = legacy(count, rounds);
      expect(arithmeticGenerateRequestSchema.safeParse(input).success).toBe(
        true,
      );
      const sheet = buildArithmeticSheet(input);
      expect(sheet.rounds).toHaveLength(rounds);
      expect(sheet.rounds.flatMap((round) => round.items)).toHaveLength(200);
      for (const round of sheet.rounds) {
        expect(
          new Set(
            round.items.map((item) =>
              arithmeticIdentityKey(item.spec.skillId, item.spec.operands),
            ),
          ).size,
        ).toBe(count);
        expect(round.items.map((item) => item.order)).toEqual(
          Array.from({ length: count }, (_, i) => i + 1),
        );
      }
      expect(reopenArithmeticSheet(JSON.parse(JSON.stringify(sheet)))).toEqual(
        sheet,
      );
      expect(() =>
        parseStrictJson(saveBody(sheet), {
          maxBytes: 256 * 1024,
          maxDepth: 16,
        }),
      ).not.toThrow();
    },
  );

  it.each(
    listArithmeticV2Types().map((type) => [type.id, type.domainSize] as const),
  )(
    "v2 generates two full available rounds of %s within the existing save-body guard",
    (typeId, domainSize) => {
      const count = Math.min(100, domainSize);
      const input = grade(typeId, count, 2);
      expect(arithmeticV2GenerateRequestSchema.safeParse(input).success).toBe(
        true,
      );
      const sheet = buildArithmeticV2Sheet(input);
      expect(sheet.rounds).toHaveLength(2);
      for (const round of sheet.rounds) {
        expect(round.items).toHaveLength(count);
        expect(
          new Set(
            round.items.map((item) => arithmeticV2PromptIdentity(item.prompt)),
          ).size,
        ).toBe(count);
      }
      expect(
        reopenArithmeticV2Sheet(JSON.parse(JSON.stringify(sheet))),
      ).toEqual(sheet);
      expect(() =>
        parseStrictJson(saveBody(sheet), {
          maxBytes: 256 * 1024,
          maxDepth: 16,
        }),
      ).not.toThrow();
    },
  );

  it("reuses the entire finite domain in later rounds, including beyond the old total cap", () => {
    const type = listArithmeticV2Types().find(
      (item) => item.id === "m1-integer-power",
    )!;
    expect(type).toBeDefined();
    const sheet = buildArithmeticV2Sheet(grade(type.id, type.domainSize, 4));
    const identities = (index: number) =>
      sheet.rounds[index].items
        .map((item) => arithmeticV2PromptIdentity(item.prompt))
        .sort();
    expect(identities(3)).toEqual(identities(0));
    expect(reopenArithmeticV2Sheet(sheet)).toEqual(sheet);
    expect(() =>
      buildArithmeticV2Sheet(grade(type.id, type.domainSize + 1, 2)),
    ).toThrow(
      expect.objectContaining({
        code: "capacity",
        violations: [
          expect.objectContaining({
            reason: "domain",
            available: type.domainSize,
          }),
          expect.anything(),
        ],
      }),
    );
  });

  it("rejects request-size overflow before distinct-expression checks", () => {
    for (const [count, rounds, scope] of [
      [101, 1, "invalid-count"],
      [67, 3, "total"],
      [10, 21, "rounds"],
    ] as const) {
      for (const [build, input] of [
        [buildArithmeticSheet, legacy(count, rounds)],
        [buildArithmeticV2Sheet, grade("m2-polynomial-add", count, rounds)],
      ] as const) {
        expect(() => build(input)).toThrow(
          expect.objectContaining(
            scope === "invalid-count"
              ? { code: scope }
              : { code: "limit", limit: expect.objectContaining({ scope }) },
          ),
        );
      }
    }
  });

  it("reopen rejects an oversized snapshot and a duplicate even at the new boundary", () => {
    const v1 = buildArithmeticSheet(legacy(100, 2));
    const v2 = buildArithmeticV2Sheet(grade("m2-polynomial-add", 100, 2));
    const thirdV1 = structuredClone(v1.rounds[0]);
    thirdV1.round = 3;
    thirdV1.items.forEach((item) => {
      item.spec.round = 3;
    });
    expect(() =>
      reopenArithmeticSheet({ ...v1, rounds: [...v1.rounds, thirdV1] }),
    ).toThrow(expect.objectContaining({ code: "limit" }));
    expect(() =>
      reopenArithmeticV2Sheet({
        ...v2,
        rounds: [...v2.rounds, { ...v2.rounds[0], round: 3 }],
      }),
    ).toThrow(expect.objectContaining({ code: "limit" }));
    v1.rounds[1].items[1] = {
      ...structuredClone(v1.rounds[1].items[0]),
      order: 2,
    };
    v1.rounds[1].items[1].spec.order = 2;
    v2.rounds[1].items[1] = {
      ...structuredClone(v2.rounds[1].items[0]),
      order: 2,
    };
    expect(() => reopenArithmeticSheet(v1)).toThrow(
      expect.objectContaining({ code: "duplicate" }),
    );
    expect(() => reopenArithmeticV2Sheet(v2)).toThrow(
      expect.objectContaining({ code: "duplicate" }),
    );
  });
});
