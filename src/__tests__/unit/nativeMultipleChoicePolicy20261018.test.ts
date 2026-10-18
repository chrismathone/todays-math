import { describe, expect, it, vi } from "vitest";
const policy = vi.hoisted(() => ({ disabled: false }));
vi.mock("@/lib/elementary/generate", async (importOriginal) => {
  const source =
    await importOriginal<typeof import("@/lib/elementary/generate")>();
  return {
    ...source,
    listedForms: (unit: Parameters<typeof source.listedForms>[0]) =>
      source
        .listedForms(unit)
        .map((f) =>
          policy.disabled ? { ...f, allowMultipleChoice: false } : f,
        ),
  };
});
import { expandFamily } from "@/lib/engine/expandEngine";
import { buildElemRows } from "../../../scripts/import/load-engine-problems";

const stem = () => ({
  familyKey: "elem:pure-format-policy",
  content: "$3+4$의 값을 구하시오.",
  answer: "$7$",
  solution: "$3+4=7$입니다.",
  problemType: "계산",
});
describe("optional author policy for MC derivation (root requested A f33/f39 wiring)", () => {
  it("omitted/true policy preserves identical existing short+multiple choice output", () => {
    const before = expandFamily(stem, 1);
    expect(before.items.map((r) => r.questionType)).toEqual([
      "단답형",
      "객관식",
    ]);
    expect(expandFamily(stem, 1, { allowMultipleChoice: true })).toEqual(
      before,
    );
  });
  it("false keeps the original short answer and reports the intentionally omitted MC", () => {
    const before = expandFamily(stem, 1);
    const after = expandFamily(stem, 1, { allowMultipleChoice: false });
    expect(after.items).toEqual([before.items[0]]);
    expect(after.skippedMcq).toBe(1);
    expect(after.reasons).toEqual([
      "문형 정책: 객관식 파생을 허용하지 않는 단답 전용 문형",
    ]);
    expect(after.items.every((r) => r.questionType !== "서술형")).toBe(true);
  });
  it("loader passes the per-form opt-in policy without changing IDs/stems/answers/RNG", () => {
    const target = {
      engine: "elem" as const,
      grade: "초4",
      chapter: "2-2 삼각형",
      sections: ["2-2-3 정삼각형의 성질"],
      formIds: ["05"],
      perTier: 1,
    };
    policy.disabled = false;
    const before = buildElemRows(target, 20261018);
    policy.disabled = true;
    const after = buildElemRows(target, 20261018);
    expect(before.map((r) => r.questionType)).toEqual(["단답형", "객관식"]);
    expect(after).toEqual(before.filter((r) => r.questionType === "단답형"));
    policy.disabled = false;
  });
});
