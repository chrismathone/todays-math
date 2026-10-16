// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  ARITHMETIC_V2_ENGINE_VERSION,
  ARITHMETIC_V2_CATALOG_VERSION,
  arithmeticV2PromptIdentity,
  buildArithmeticV2Sheet,
  getArithmeticV2Definition,
  listArithmeticV2Types,
  reopenArithmeticV2Sheet,
} from "@/lib/arithmetic-v2";

const catalog = listArithmeticV2Types();
const request = (typeId: string, count: number, seed = "integrated") => ({
  engineVersion: ARITHMETIC_V2_ENGINE_VERSION,
  catalogVersion: ARITHMETIC_V2_CATALOG_VERSION,
  seed,
  rounds: [{ allocations: [{ typeId, count }] }],
});
describe("real family integration with versioned core", () => {
  it("registers distinct finite definitions across the eight implemented grade groups", () => {
    expect(new Set(catalog.map((type) => type.id)).size).toBe(catalog.length);
    expect(new Set(catalog.map((type) => type.grade))).toEqual(
      new Set(["초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3"]),
    );
    for (const type of catalog)
      expect(type.domainSize).toBeGreaterThanOrEqual(type.defaultCount);
  });
  it.each(catalog.map((type) => [type.id, type.domainSize] as const))(
    "generates, independently verifies and reopens %s",
    (typeId, size) => {
      const definition = getArithmeticV2Definition(typeId);
      for (const seed of ["integrated-a", "integrated-b", "0"]) {
        const input = request(typeId, Math.min(20, size), seed);
        const sheet = buildArithmeticV2Sheet(input);
        expect(
          reopenArithmeticV2Sheet(JSON.parse(JSON.stringify(sheet))),
        ).toEqual(sheet);
        expect(buildArithmeticV2Sheet(input)).toEqual(sheet);
        expect(
          new Set(
            sheet.rounds[0].items.map((item) =>
              arithmeticV2PromptIdentity(item.prompt),
            ),
          ).size,
        ).toBe(sheet.rounds[0].items.length);
        for (const item of sheet.rounds[0].items) {
          // Verify the saved candidate exactly as reopen does: families may
          // reject unknown top-level keys (order/typeId/domainIndex are sheet fields).
          const candidate = {
            parameters: item.parameters,
            prompt: item.prompt,
            answer: item.answer,
          };
          expect(definition.verify(candidate)).toBe(true);
          expect(definition.problemAt(item.domainIndex)).toEqual(candidate);
        }
      }
    },
  );
  it("rejects a real cross-family duplicate on reopen", () => {
    const like = getArithmeticV2Definition("m1-like-terms"),
      linear = getArithmeticV2Definition("m1-linear-add");
    const likeIndex = Array.from(
      { length: like.domainSize },
      (_, index) => index,
    ).find(
      (index) => JSON.stringify(like.problemAt(index).parameters) === "[3,2]",
    )!;
    const first = like.problemAt(likeIndex),
      key = arithmeticV2PromptIdentity(first.prompt);
    let overlap = -1;
    for (let index = 0; index < linear.domainSize; index++)
      if (arithmeticV2PromptIdentity(linear.problemAt(index).prompt) === key) {
        overlap = index;
        break;
      }
    expect(overlap).toBeGreaterThanOrEqual(0);
    const sheet = buildArithmeticV2Sheet(request(like.id, 1));
    sheet.rounds[0].items = [
      { ...first, typeId: like.id, domainIndex: likeIndex, order: 1 },
      {
        ...linear.problemAt(overlap),
        typeId: linear.id,
        domainIndex: overlap,
        order: 2,
      },
    ];
    expect(() => reopenArithmeticV2Sheet(sheet)).toThrow(
      expect.objectContaining({ code: "duplicate" }),
    );
  });
  it("samples mixed overlapping real families without duplicate displayed tasks", () => {
    for (let seed = 0; seed < 20; seed++) {
      const input = request("m1-like-terms", 50, `mixed-${seed}`);
      input.rounds[0].allocations.push({ typeId: "m1-linear-add", count: 50 });
      const sheet = buildArithmeticV2Sheet(input);
      expect(
        new Set(
          sheet.rounds[0].items.map((item) =>
            arithmeticV2PromptIdentity(item.prompt),
          ),
        ).size,
      ).toBe(100);
    }
  });
});
