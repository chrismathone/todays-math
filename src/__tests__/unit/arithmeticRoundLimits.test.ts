import { describe, expect, it } from "vitest";
import {
  buildArithmeticSheet,
  defaultArithmeticConstraints,
  reopenArithmeticSheet,
} from "@/lib/arithmetic";
import {
  buildArithmeticV2Sheet,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";
import { arithmeticV2Definitions } from "@/lib/arithmetic-v2/registry";
import { arithmeticV2PromptIdentity } from "@/contracts/arithmeticV2.contract";
import {
  regenerateArithmeticItems,
  regenerateArithmeticV2Items,
  arithmeticRegenerationNotice,
} from "@/lib/arithmeticRegeneration";
import { parseStrictJson } from "@/lib/textbook/strictJson";
import {
  ARITHMETIC_SHEET_JSON_LIMITS,
  arithmeticSheetByteIssue,
} from "@/lib/arithmetic/byteBudget";

const v1 = (count: number, rounds: number) => ({
  engineVersion: "arithmetic-engine-v1",
  catalogVersion: "arithmetic-catalog-v1",
  seed: '"'.repeat(128),
  rounds: Array.from({ length: rounds }, () => ({
    skills: [
      {
        skillId: "two-digit-vertical-add",
        count,
        constraints: {
          ...defaultArithmeticConstraints("two-digit-vertical-add"),
          carryCount: 1,
        },
      },
    ],
  })),
});
const v2 = (count: number, rounds: number, typeId = "m2-polynomial-add") => ({
  engineVersion: "arithmetic-engine-v2",
  catalogVersion: "arithmetic-catalog-v2",
  seed: '"'.repeat(128),
  rounds: Array.from({ length: rounds }, () => ({
    allocations: [{ typeId, count }],
  })),
});
function check(rounds: string[][]) {
  for (let i = 0; i < rounds.length; i++) {
    expect(new Set(rounds[i]).size).toBe(rounds[i].length);
    for (let j = 0; j < i; j++)
      expect(
        rounds[i].filter((key) => rounds[j].includes(key)).length,
      ).toBeLessThanOrEqual(
        Math.floor(Math.min(rounds[i].length, rounds[j].length) / 5),
      );
  }
}
describe("10 rounds, 200 items each, historical reader compatibility", () => {
  it("generates and serializes real 2000-item v1/v2 sheets with all pair limits", () => {
    const first = buildArithmeticSheet(v1(200, 10));
    const second = buildArithmeticV2Sheet(v2(200, 10));
    for (const sheet of [first, second]) {
      expect(sheet.rounds).toHaveLength(10);
      expect(sheet.rounds.flatMap((r) => r.items)).toHaveLength(2000);
      expect(arithmeticSheetByteIssue(sheet)).toBeNull();
      expect(() =>
        parseStrictJson(
          JSON.stringify({
            kind: "arithmeticSheet",
            title: "가".repeat(200),
            payload: sheet,
            expectedRevision: null,
          }),
          ARITHMETIC_SHEET_JSON_LIMITS,
        ),
      ).not.toThrow();
    }
    check(
      first.rounds.map((r) =>
        r.items.map((i) =>
          JSON.stringify([
            i.prompt.notation,
            i.prompt.operator,
            i.prompt.operands,
          ]),
        ),
      ),
    );
    check(
      second.rounds.map((r) =>
        r.items.map((i) => arithmeticV2PromptIdentity(i.prompt)),
      ),
    );
    expect(reopenArithmeticSheet(first)).toEqual(first);
    expect(reopenArithmeticV2Sheet(second)).toEqual(second);
  });
  it.each(arithmeticV2Definitions().map((d) => [d.id, d.domainSize] as const))(
    "checks actual finite domain %s across two rounds",
    (id, size) => {
      const count = Math.min(200, Math.floor(size / 2));
      if (!count) {
        expect(() => buildArithmeticV2Sheet(v2(1, 2, id))).toThrow();
        return;
      }
      const sheet = buildArithmeticV2Sheet(v2(count, 2, id));
      check(
        sheet.rounds.map((r) =>
          r.items.map((i) => arithmeticV2PromptIdentity(i.prompt)),
        ),
      );
      expect(reopenArithmeticV2Sheet(sheet)).toEqual(sheet);
    },
  );
  it("rejects new 11th rounds and 201st items, including split allocations", () => {
    for (const build of [
      () => buildArithmeticSheet(v1(201, 1)),
      () => buildArithmeticV2Sheet(v2(201, 1)),
    ])
      expect(build).toThrow(expect.objectContaining({ code: "invalid-count" }));
    for (const build of [
      () => buildArithmeticSheet(v1(1, 11)),
      () => buildArithmeticV2Sheet(v2(1, 11)),
    ])
      expect(build).toThrow(
        expect.objectContaining({
          code: "limit",
          limit: expect.objectContaining({ scope: "rounds", max: 10 }),
        }),
      );
    const request = v2(150, 1);
    request.rounds[0].allocations.push({
      typeId: "m2-polynomial-add",
      count: 51,
    });
    expect(() => buildArithmeticV2Sheet(request)).toThrow(
      expect.objectContaining({
        code: "limit",
        limit: expect.objectContaining({
          scope: "round",
          count: 201,
          max: 200,
        }),
      }),
    );
  });
  it("reads historical 20-round and 100% overlapping sheets unchanged, and targets round20", () => {
    const first = buildArithmeticSheet(v1(1, 1));
    first.rounds = Array.from({ length: 20 }, (_, n) => ({
      round: n + 1,
      items: first.rounds[0].items.map((item) => ({
        ...structuredClone(item),
        spec: { ...structuredClone(item.spec), round: n + 1 },
      })),
    }));
    const second = buildArithmeticV2Sheet(v2(1, 1));
    second.rounds = Array.from({ length: 20 }, (_, n) => ({
      round: n + 1,
      items: structuredClone(second.rounds[0].items),
    }));
    const before = [JSON.stringify(first), JSON.stringify(second)];
    expect(reopenArithmeticSheet(first)).toEqual(first);
    expect(reopenArithmeticV2Sheet(second)).toEqual(second);
    const a = regenerateArithmeticItems(
      first,
      { round: 20, orders: [1] },
      "repair",
    );
    const b = regenerateArithmeticV2Items(
      second,
      { round: 20, orders: [1] },
      "repair",
    );
    expect(a.changedOrders).toEqual([1]);
    expect(b.changedOrders).toEqual([1]);
    expect(a.sheet.rounds[0]).toBe(first.rounds[0]);
    expect(b.sheet.rounds[0]).toBe(second.rounds[0]);
    expect([JSON.stringify(first), JSON.stringify(second)]).toEqual(before);
  });
  it("returns unchanged for fixed overlap, repairs selected positions, and preserves unrelated legacy pairs", () => {
    const sheet = buildArithmeticV2Sheet(v2(5, 1));
    sheet.rounds = Array.from({ length: 4 }, (_, i) => ({
      round: i + 1,
      items: structuredClone(sheet.rounds[0].items),
    }));
    const unchanged = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1] },
      "repair",
    );
    expect(unchanged.sheet).toBe(sheet);
    expect(unchanged.changedOrders).toEqual([]);
    expect(unchanged.unchangedReason).toBe("fixed-overlap");
    expect(arithmeticRegenerationNotice(unchanged)).toContain(
      "선택하지 않은 문항",
    );
    const repaired = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1, 2, 3, 4, 5] },
      "repair",
    );
    expect(repaired.changedOrders).toHaveLength(5);
    for (let i = 1; i < 4; i++)
      expect(repaired.sheet.rounds[i]).toBe(sheet.rounds[i]);
    check(
      [repaired.sheet.rounds[0], repaired.sheet.rounds[1]].map((r) =>
        r.items.map((i) => arithmeticV2PromptIdentity(i.prompt)),
      ),
    );
  });
});
