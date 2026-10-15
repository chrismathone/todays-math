// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/arithmetic-v2/registry", async () => {
  const fixture = await import("@/__tests__/helpers/arithmeticV2Fixture");
  return {
    getArithmeticV2Definition: fixture.getFixtureDefinition,
    arithmeticV2Definitions: () => fixture.fixtureDefinitions,
  };
});
import {
  fixtureDefinitions,
  fixtureRequest,
  getFixtureDefinition,
} from "../helpers/arithmeticV2Fixture";
import {
  buildArithmeticV2Sheet,
  reopenArithmeticV2Sheet,
  listArithmeticV2PrintItems,
  listArithmeticV2Types,
  arithmeticV2AnswerSchema,
  arithmeticV2SheetProblemCount,
} from "@/lib/arithmetic-v2";
import {
  anyArithmeticSheetProblemCount,
  reopenAnyArithmeticSheet,
} from "@/lib/arithmeticDocument";
import {
  buildArithmeticSheet,
  ARITHMETIC_ENGINE_VERSION,
  ARITHMETIC_CATALOG_VERSION,
  defaultArithmeticConstraints,
} from "@/lib/arithmetic";

afterEach(() => vi.restoreAllMocks());
describe("v2 indexed snapshots", () => {
  it("excludes identical displayed tasks across type IDs and reports exact exhausted overlap", () => {
    const request = fixtureRequest(7);
    request.rounds[0].allocations.push({ typeId: "test-peer", count: 4 });
    const result = buildArithmeticV2Sheet(request);
    expect(
      result.rounds[0].items
        .slice(7)
        .map((item) => item.domainIndex)
        .sort((a, b) => a - b),
    ).toEqual([7, 8, 9, 10]);
    expect(buildArithmeticV2Sheet(request)).toEqual(result);
    request.rounds[0].allocations[1].count = 5;
    expect(() => buildArithmeticV2Sheet(request)).toThrow(
      expect.objectContaining({
        code: "capacity",
        violations: [
          {
            round: 1,
            allocation: 2,
            typeId: "test-peer",
            requested: 5,
            available: 4,
            reason: "overlap",
          },
        ],
      }),
    );
    const duplicate = buildArithmeticV2Sheet(fixtureRequest(1));
    duplicate.rounds[0].items.push({
      ...duplicate.rounds[0].items[0],
      typeId: "test-peer",
      order: 2,
    });
    expect(() => reopenArithmeticV2Sheet(duplicate)).toThrow(
      expect.objectContaining({ code: "duplicate" }),
    );
  });
  it("has deterministic selection without replacement across repeated allocations", () => {
    const request = fixtureRequest(3);
    request.rounds[0].allocations.push({ typeId: "test-add", count: 4 });
    const first = buildArithmeticV2Sheet(request);
    expect(buildArithmeticV2Sheet(request)).toEqual(first);
    expect(
      new Set(first.rounds[0].items.map((item) => item.domainIndex)).size,
    ).toBe(7);
    expect(
      first.rounds[0].items
        .map((item) => item.domainIndex)
        .sort((a, b) => a - b),
    ).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(first.rounds[0].items.map((item) => item.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(
      buildArithmeticV2Sheet({ ...request, seed: "different" }),
    ).not.toEqual(first);
  });
  it("refuses exact domain/overlap capacity before generating any partial output", () => {
    const spy = vi.spyOn(getFixtureDefinition("test-add"), "problemAt");
    expect(() => buildArithmeticV2Sheet(fixtureRequest(8))).toThrow(
      expect.objectContaining({
        code: "capacity",
        violations: [
          {
            round: 1,
            allocation: 1,
            typeId: "test-add",
            requested: 8,
            available: 7,
            reason: "domain",
          },
        ],
      }),
    );
    const request = fixtureRequest(4);
    request.rounds[0].allocations.push({ typeId: "test-add", count: 4 });
    expect(() => buildArithmeticV2Sheet(request)).toThrow(
      expect.objectContaining({
        code: "capacity",
        violations: [
          expect.objectContaining({
            allocation: 2,
            requested: 4,
            available: 3,
            reason: "overlap",
          }),
        ],
      }),
    );
    expect(spy).not.toHaveBeenCalled();
  });
  it("samples a trillion-index domain with work bounded by item count", () => {
    const spy = vi.spyOn(getFixtureDefinition("test-large"), "problemAt");
    const sheet = buildArithmeticV2Sheet(fixtureRequest(100, "test-large"));
    expect(
      new Set(sheet.rounds[0].items.map((item) => item.domainIndex)).size,
    ).toBe(100);
    expect(
      sheet.rounds[0].items.some((item) => item.domainIndex > 2 ** 32),
    ).toBe(true);
    expect(spy).toHaveBeenCalledTimes(200); // one generation and one correspondence read
  });
  it("preserves type sections, bounded round overlap and global print numbers", () => {
    const request = fixtureRequest(3);
    request.rounds.push({
      allocations: [
        { typeId: "test-other", count: 2 },
        { typeId: "test-peer", count: 5 },
      ],
    });
    const sheet = buildArithmeticV2Sheet(request);
    expect(sheet.rounds[1].items.map((item) => item.typeId)).toEqual([
      "test-other",
      "test-other",
      ...Array(5).fill("test-peer"),
    ]);
    expect(
      listArithmeticV2PrintItems(sheet).map((item) => item.number),
    ).toEqual(Array.from({ length: 10 }, (_, i) => i + 1));
    expect(arithmeticV2SheetProblemCount(sheet)).toBe(10);
  });
  it.each([
    ["payloadVersion", 3],
    ["engineVersion", "old"],
    ["catalogVersion", "old"],
    ["solution", "secret"],
  ])("rejects unknown versions and extra sheet fields: %s", (key, value) => {
    expect(() =>
      reopenArithmeticV2Sheet({
        ...buildArithmeticV2Sheet(fixtureRequest()),
        [key]: value,
      }),
    ).toThrow();
  });
  it.each([
    "prompt",
    "answer-display",
    "answer-exact",
    "parameters",
    "index",
    "type",
    "order",
    "duplicate",
    "extra",
  ])("rejects snapshot tampering: %s", (change) => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest());
    const item = sheet.rounds[0].items[0];
    if (change === "prompt")
      item.prompt = { layout: "math", text: "different", latex: "different" };
    if (change === "answer-display") item.answer.text = "wrong";
    if (change === "answer-exact") item.answer.exact = ["-99"];
    if (change === "parameters") item.parameters[0] = 999;
    if (change === "index") item.domainIndex = 7;
    if (change === "type") item.typeId = "unknown";
    if (change === "order") item.order = 2;
    if (change === "duplicate")
      sheet.rounds[0].items[1] = { ...item, order: 2 };
    if (change === "extra") Object.assign(item, { solution: "hidden" });
    expect(() => reopenArithmeticV2Sheet(sheet)).toThrow();
  });
  it("checks index correspondence even for an independently valid replacement", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest(1));
    const item = sheet.rounds[0].items[0];
    Object.assign(
      item,
      getFixtureDefinition(item.typeId).problemAt((item.domainIndex + 1) % 7),
    );
    expect(getFixtureDefinition(item.typeId).verify(item)).toBe(true);
    expect(() => reopenArithmeticV2Sheet(sheet)).toThrow(
      expect.objectContaining({ code: "operand" }),
    );
  });
  it("independent verification catches a consistently wrong producer", () => {
    const def = getFixtureDefinition("test-add");
    const original = def.problemAt;
    vi.spyOn(def, "problemAt").mockImplementation((index) => ({
      ...original(index),
      answer: { kind: "integer", exact: ["-100"], text: "-100", latex: "-100" },
    }));
    expect(() => buildArithmeticV2Sheet(fixtureRequest())).toThrow(
      expect.objectContaining({ code: "verification" }),
    );
  });
  it("reopening uses snapshots and the stored index, not the seed", () => {
    const sheet = buildArithmeticV2Sheet(fixtureRequest());
    sheet.seed = "any-printable-seed";
    expect(reopenArithmeticV2Sheet(sheet)).toEqual(sheet);
  });
  it("retains v1 readers and counts while rejecting mixed-version content", () => {
    const v1 = buildArithmeticSheet({
      engineVersion: ARITHMETIC_ENGINE_VERSION,
      catalogVersion: ARITHMETIC_CATALOG_VERSION,
      seed: "v1",
      rounds: [
        {
          skills: [
            {
              skillId: "times-table",
              constraints: defaultArithmeticConstraints("times-table"),
              count: 2,
            },
          ],
        },
      ],
    });
    const v2 = buildArithmeticV2Sheet(fixtureRequest(3));
    expect(reopenAnyArithmeticSheet(v1)).toEqual(v1);
    expect(reopenAnyArithmeticSheet(v2)).toEqual(v2);
    expect(anyArithmeticSheetProblemCount(v1)).toBe(2);
    expect(anyArithmeticSheetProblemCount(v2)).toBe(3);
    expect(() =>
      reopenAnyArithmeticSheet({ ...v2, payloadVersion: 1 }),
    ).toThrow();
    expect(() =>
      reopenAnyArithmeticSheet({ ...v1, payloadVersion: 2 }),
    ).toThrow();
  });
  it("enforces v1 limits, invalid requests and canonical exact values", () => {
    for (const request of [
      fixtureRequest(0),
      fixtureRequest(1.5),
      fixtureRequest(101),
      fixtureRequest(1, "unknown"),
      { ...fixtureRequest(), seed: "한글" },
      {
        ...fixtureRequest(),
        rounds: Array(21).fill(fixtureRequest(1).rounds[0]),
      },
      {
        ...fixtureRequest(100, "test-large"),
        rounds: Array(11).fill(fixtureRequest(100, "test-large").rounds[0]),
      },
    ])
      expect(() => buildArithmeticV2Sheet(request)).toThrow();
    expect(
      arithmeticV2AnswerSchema.safeParse({
        kind: "surd",
        exact: [],
        text: "0",
        latex: "0",
      }).success,
    ).toBe(true);
    expect(
      arithmeticV2AnswerSchema.safeParse({
        kind: "integer",
        exact: [],
        text: "0",
        latex: "0",
      }).success,
    ).toBe(false);
    expect(
      arithmeticV2AnswerSchema.safeParse({
        kind: "integer",
        exact: ["-0"],
        text: "0",
        latex: "0",
      }).success,
    ).toBe(false);
  });
  it("catalog exposes exact capacity and verified examples without functions", () => {
    expect(listArithmeticV2Types().map((item) => item.domainSize)).toEqual(
      fixtureDefinitions.map((item) => item.domainSize),
    );
    expect(listArithmeticV2Types()[0]).not.toHaveProperty("problemAt");
  });
});
