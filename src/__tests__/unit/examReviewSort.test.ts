import { describe, expect, it } from "vitest";
import { DIFFICULTY_LADDER } from "@/contracts/difficulty";
import { sortReviewQuestions } from "@/components/exam-builder/reviewSort";
import type { ExamQuestionInfo } from "@/components/exam-builder/types";

type Item = ExamQuestionInfo & { answer: string };
const row = (id: string, fields: Partial<Item> = {}): Item => ({
  id,
  scopeId: id,
  scopeLabel: id,
  difficulty: "기본",
  answer: `정답 ${id}`,
  ...fields,
});
const info = (item: Item) => item;
const ids = (items: Item[]) => items.map((item) => item.id);

describe("review sheet ordering", () => {
  it("uses the full difficulty ladder in both directions and leaves missing tiers last", () => {
    const items = [
      row("missing", { difficulty: "" }),
      ...[...DIFFICULTY_LADDER]
        .reverse()
        .map((difficulty) => row(difficulty, { difficulty })),
      row("same", { difficulty: "기본" }),
    ];
    expect(
      ids(
        sortReviewQuestions(items, info, "difficulty-asc", DIFFICULTY_LADDER),
      ),
    ).toEqual([
      "연산",
      "기본",
      "same",
      "응용",
      "심화하",
      "심화중",
      "심화상",
      "missing",
    ]);
    expect(
      ids(
        sortReviewQuestions(items, info, "difficulty-desc", DIFFICULTY_LADDER),
      ),
    ).toEqual([
      "심화상",
      "심화중",
      "심화하",
      "응용",
      "기본",
      "same",
      "연산",
      "missing",
    ]);
  });

  it("groups short answers and descriptions as subjective without reclassifying unknowns", () => {
    const items = [
      row("unknown", { format: "미분류" }),
      row("descriptive", { format: "서술형" }),
      row("choice1", { format: "객관식" }),
      row("short", { format: "단답형" }),
      row("choice2", { format: "객관식" }),
    ];
    expect(
      ids(
        sortReviewQuestions(
          items,
          info,
          "multiple-choice-first",
          DIFFICULTY_LADDER,
        ),
      ),
    ).toEqual(["choice1", "choice2", "descriptive", "short", "unknown"]);
    expect(
      ids(
        sortReviewQuestions(items, info, "subjective-first", DIFFICULTY_LADDER),
      ),
    ).toEqual(["descriptive", "short", "choice1", "choice2", "unknown"]);
    expect(items[0].format).toBe("미분류");
  });

  it("uses catalogue order instead of chapter names, incoming order or unit ids", () => {
    const items = [
      row("missing"),
      row("aaa", { scopeLabel: "1. 먼저 보이는 이름", scopeOrder: 150 }),
      row("zzz", { scopeLabel: "10. 뒤에 보이는 이름", scopeOrder: 2 }),
      row("same-unit", { scopeOrder: 2 }),
      row("invalid", { scopeOrder: Number.NaN }),
    ];
    expect(
      ids(sortReviewQuestions(items, info, "scope", DIFFICULTY_LADDER)),
    ).toEqual(["zzz", "same-unit", "aaa", "missing", "invalid"]);
  });

  it("retains every question object and the input array, and makes a no-op reusable", () => {
    const a = row("a", { difficulty: "응용" });
    const b = row("b", { difficulty: "기본" });
    const items = Object.freeze([a, b]) as unknown as Item[];
    const sorted = sortReviewQuestions(
      items,
      info,
      "difficulty-asc",
      DIFFICULTY_LADDER,
    );
    expect(items).toEqual([a, b]);
    expect(sorted[0]).toBe(b);
    expect(sorted[1]).toBe(a);
    expect(
      sortReviewQuestions(sorted, info, "difficulty-asc", DIFFICULTY_LADDER),
    ).toBe(sorted);
  });
});
