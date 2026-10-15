// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { buildArithmeticSheet } from "@/lib/arithmetic/sheet";
import { reopenArithmeticSheet } from "@/lib/arithmetic/reopen";
import { defaultArithmeticPresentation } from "@/contracts/arithmeticPresentation.contract";
import type { ArithmeticSheetPayload } from "@/contracts/arithmeticSheet.contract";
import {
  arithmeticRegenerationNotice,
  mergeArithmeticRegeneration,
  regenerateArithmeticItems,
  regenerateArithmeticV2Items,
} from "@/lib/arithmeticRegeneration";
import { buildArithmeticV2Sheet } from "@/lib/arithmetic-v2/sheet";
import { reopenArithmeticV2Sheet } from "@/lib/arithmetic-v2/reopen";
import { arithmeticV2PromptIdentity } from "@/contracts/arithmeticV2.contract";
import {
  fixtureRequest,
  getFixtureDefinition,
} from "../helpers/arithmeticV2Fixture";

vi.mock("@/lib/arithmetic-v2/registry", async () => {
  const fixture = await import("@/__tests__/helpers/arithmeticV2Fixture");
  return { getArithmeticV2Definition: fixture.getFixtureDefinition };
});

function legacy(rights = [0, 1, 2]): ArithmeticSheetPayload {
  const sheet = buildArithmeticSheet({
    engineVersion: "arithmetic-engine-v1",
    catalogVersion: "arithmetic-catalog-v1",
    seed: "saved",
    rounds: [1, 2].map((round) => ({
      skills: rights.map((right) => ({
        skillId: "one-digit-add",
        count: 1,
        constraints: {
          carry: "none",
          left: { min: round - 1, max: round - 1 },
          right: { min: right, max: right },
        },
      })),
    })),
  });
  sheet.presentation = defaultArithmeticPresentation("그대로 학원");
  return sheet;
}
function widen(
  sheet: ArithmeticSheetPayload,
  round: number,
  order: number,
  min: number,
  max: number,
) {
  const item = sheet.rounds[round - 1].items[order - 1];
  if (
    item.spec.skillId !== "one-digit-add" ||
    !("right" in item.spec.constraints)
  )
    throw new Error("fixture");
  item.spec.constraints.right = { min, max };
}

describe("targeted legacy regeneration", () => {
  it("changes only selected saved orders and preserves metadata and retained bytes/references", () => {
    const sheet = legacy();
    widen(sheet, 2, 1, 0, 9);
    widen(sheet, 2, 3, 0, 9);
    const before = JSON.stringify(sheet);
    const result = regenerateArithmeticItems(
      sheet,
      { round: 2, orders: [3, 1] },
      "replacement",
    );
    expect(result.changedOrders).toEqual([1, 3]);
    expect(result.unchangedOrders).toEqual([]);
    expect(result.sheet.rounds[0]).toBe(sheet.rounds[0]);
    expect(result.sheet.rounds[1].items[1]).toBe(sheet.rounds[1].items[1]);
    expect(JSON.stringify(result.sheet.rounds[1].items[1])).toBe(
      JSON.stringify(sheet.rounds[1].items[1]),
    );
    expect(result.sheet.presentation).toBe(sheet.presentation);
    expect(result.sheet.seed).toBe(sheet.seed);
    expect(
      result.sheet.rounds[1].items.map((item) => [
        item.order,
        item.spec.order,
        item.spec.round,
        item.spec.seed,
      ]),
    ).toEqual([
      [1, 1, 2, "saved"],
      [2, 2, 2, "saved"],
      [3, 3, 2, "saved"],
    ]);
    expect(reopenArithmeticSheet(result.sheet)).toEqual(result.sheet);
    expect(JSON.stringify(sheet)).toBe(before);
    expect(
      regenerateArithmeticItems(
        sheet,
        { round: 2, orders: [1, 3] },
        "replacement",
      ),
    ).toEqual(result);
  });

  it("reports a singleton or retained-prompt exhaustion without changing even the seed", () => {
    const sheet = legacy();
    widen(sheet, 2, 1, 0, 2);
    const result = regenerateArithmeticItems(
      sheet,
      { round: 2, orders: [1, 2] },
      "replacement",
    );
    expect(result.sheet).toBe(sheet);
    expect(result.changedOrders).toEqual([]);
    expect(result.unchangedOrders).toEqual([1, 2]);
    expect(arithmeticRegenerationNotice(result)).toContain("2회차 4, 5번");
    expect(arithmeticRegenerationNotice(result)).toContain("기존 문항을 유지");
  });

  it("allows selected prompts to swap when all other prompts are exhausted", () => {
    const sheet = legacy([0, 1]);
    widen(sheet, 1, 1, 0, 1);
    widen(sheet, 1, 2, 0, 1);
    const result = regenerateArithmeticItems(
      sheet,
      { round: 1, orders: [1, 2] },
      "swap",
    );
    expect(result.changedOrders).toEqual([1, 2]);
    expect(
      result.sheet.rounds[0].items.map((item) => item.spec.operands[1]),
    ).toEqual([1, 0]);
  });

  it("finds the maximum possible changes for every small overlapping interval domain", () => {
    const ranges = [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 1],
      [1, 2],
      [2, 2],
    ];
    for (const a of ranges.filter(([lo, hi]) => lo <= 0 && hi >= 0))
      for (const b of ranges.filter(([lo, hi]) => lo <= 1 && hi >= 1))
        for (const c of ranges.filter(([lo, hi]) => lo <= 2 && hi >= 2)) {
          const domains = [a, b, c].map(([lo, hi]) =>
            Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
          );
          for (const orders of [[1], [1, 2], [1, 2, 3]]) {
            const sheet = legacy();
            [a, b, c].forEach(([lo, hi], index) =>
              widen(sheet, 1, index + 1, lo, hi),
            );
            let optimum = 0;
            for (const x of domains[0])
              for (const y of domains[1])
                for (const z of domains[2]) {
                  const assignment = [x, y, z];
                  if (
                    new Set(assignment).size !== 3 ||
                    assignment.some(
                      (value, i) => !orders.includes(i + 1) && value !== i,
                    )
                  )
                    continue;
                  optimum = Math.max(
                    optimum,
                    assignment.filter((value, i) => value !== i).length,
                  );
                }
            const result = regenerateArithmeticItems(
              sheet,
              { round: 1, orders },
              "overlap",
            );
            expect(
              result.changedOrders.length,
              JSON.stringify({ a, b, c, orders }),
            ).toBe(optimum);
            expect(reopenArithmeticSheet(result.sheet)).toEqual(result.sheet);
          }
        }
  });

  it.each([
    { round: 0, orders: [1] },
    { round: 3, orders: [1] },
    { round: 1, orders: [] },
    { round: 1, orders: [1, 1] },
    { round: 1, orders: [0] },
    { round: 1, orders: [4] },
    { round: 1, orders: [1.5] },
  ])("rejects invalid targets %j atomically", (target) => {
    const sheet = legacy();
    const before = JSON.stringify(sheet);
    expect(() =>
      regenerateArithmeticItems(sheet, target, "replacement"),
    ).toThrow();
    expect(JSON.stringify(sheet)).toBe(before);
  });
  it("rejects corrupted snapshots and seed before changing anything", () => {
    const sheet = legacy();
    expect(() =>
      regenerateArithmeticItems(sheet, { round: 1, orders: [1] }, ""),
    ).toThrow();
    sheet.rounds[0].items[0].answer = "99";
    expect(() =>
      regenerateArithmeticItems(
        sheet,
        { round: 1, orders: [1] },
        "replacement",
      ),
    ).toThrow();
  });
});

describe("targeted grade regeneration", () => {
  it("keeps an exhausted historical overlap unchanged with a precise notice", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest(7));
    sheet.rounds.push({
      round: 2,
      items: structuredClone(sheet.rounds[0].items),
    });
    const before = JSON.stringify(sheet);
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1, 2, 3, 4, 5, 6, 7] },
      "repair",
    );
    expect(result.sheet).toBe(sheet);
    expect(result.changedOrders).toEqual([]);
    expect(result.unchangedReason).toBe("overlap-capacity");
    expect(arithmeticRegenerationNotice(result)).toContain("20% 이하");
    expect(JSON.stringify(sheet)).toBe(before);
  });
  it("preserves other rounds and retained items while changing selected prompt identities", () => {
    const request = fixtureRequest(3);
    request.rounds.push(fixtureRequest(2, "test-other").rounds[0]);
    const sheet = buildArithmeticV2Sheet(request);
    sheet.presentation = defaultArithmeticPresentation();
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [3, 1] },
      "new",
    );
    expect(result.changedOrders).toEqual([1, 3]);
    expect(result.sheet.presentation).toBe(sheet.presentation);
    expect(result.sheet.seed).toBe(sheet.seed);
    expect(result.sheet.rounds[1]).toBe(sheet.rounds[1]);
    expect(result.sheet.rounds[0].items[1]).toBe(sheet.rounds[0].items[1]);
    for (const order of result.changedOrders)
      expect(
        arithmeticV2PromptIdentity(
          result.sheet.rounds[0].items[order - 1].prompt,
        ),
      ).not.toBe(
        arithmeticV2PromptIdentity(sheet.rounds[0].items[order - 1].prompt),
      );
    expect(reopenArithmeticV2Sheet(result.sheet)).toEqual(result.sheet);
    expect(
      regenerateArithmeticV2Items(sheet, { round: 1, orders: [1, 3] }, "new"),
    ).toEqual(result);
  });
  it("excludes retained visible prompts across different type IDs", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest(7));
    sheet.rounds[0].items = sheet.rounds[0].items.map((item, index) =>
      index === 0 ? item : { ...item, typeId: "test-peer" },
    );
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1] },
      "new",
    );
    expect(result.changedOrders).toEqual([]);
    expect(result.unchangedOrders).toEqual([1]);
    expect(result.sheet).toBe(sheet);
  });
  it("deranges an entire exhausted section without false no-change", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest(7));
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1, 2, 3, 4, 5, 6, 7] },
      "new",
    );
    expect(result.changedOrders).toHaveLength(7);
    expect(result.unchangedOrders).toEqual([]);
    expect(
      new Set(
        result.sheet.rounds[0].items.map((item) =>
          arithmeticV2PromptIdentity(item.prompt),
        ),
      ).size,
    ).toBe(7);
    expect(reopenArithmeticV2Sheet(result.sheet)).toEqual(result.sheet);
  });
  it("reports partial exhaustion truthfully", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest(7));
    const definition = getFixtureDefinition("test-other");
    sheet.rounds[0].items.push({
      ...definition.problemAt(0),
      order: 8,
      typeId: definition.id,
      domainIndex: 0,
    });
    const result = regenerateArithmeticV2Items(
      sheet,
      { round: 1, orders: [1, 8] },
      "new",
    );
    expect(result.changedOrders).toEqual([8]);
    expect(result.unchangedOrders).toEqual([1]);
    expect(result.sheet.rounds[0].items[0]).toBe(sheet.rounds[0].items[0]);
    expect(arithmeticRegenerationNotice(result)).toContain(
      "1문항의 숫자를 바꿨습니다",
    );
  });
  it("samples domains beyond 2^32 sparsely, without retries or full materialization", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest(100, "test-large"));
    const definition = getFixtureDefinition("test-large");
    const spy = vi.spyOn(definition, "problemAt");
    try {
      const result = regenerateArithmeticV2Items(
        sheet,
        { round: 1, orders: [100] },
        "large",
      );
      expect(result.changedOrders).toEqual([100]);
      expect(spy.mock.calls.length).toBeLessThanOrEqual(301); // 2 reopens + at most 101 excluded indexes
    } finally {
      spy.mockRestore();
    }
  });
  it("merge preserves opaque sheet and round metadata including shared figure packs", () => {
    const first = { order: 1, value: "a" };
    const second = { order: 2, value: "b" };
    const sheet = {
      title: "kept",
      figures: { version: 1, svgPack: "immutable-pack" },
      rounds: [{ round: 1, name: "kept round", items: [first, second] }],
    };
    const result = mergeArithmeticRegeneration(sheet, 1, [
      { order: 1, value: "c" },
    ]);
    expect(result.figures).toBe(sheet.figures);
    expect(result.title).toBe(sheet.title);
    expect(result.rounds[0].name).toBe("kept round");
    expect(result.rounds[0].items[1]).toBe(second);
  });
});
