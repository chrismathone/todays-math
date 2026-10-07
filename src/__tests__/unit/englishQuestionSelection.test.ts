import { describe, expect, it } from "vitest";
import {
  addBankQuestions,
  groupBankQuestions,
} from "@/components/english/englishQuestionSelection";
import { bankUiItem } from "../fixtures/englishBankUi";

describe("English question composition", () => {
  it("deduplicates a source question and replaces a stale version without changing its position", () => {
    const first = bankUiItem();
    const second = bankUiItem(2);
    const newer = bankUiItem(0, { revision: 2, passage: "New source." });
    expect(addBankQuestions([first, second], [newer, second])).toEqual([
      newer,
      second,
    ]);
  });
  it("caps the selection at 80 while still allowing a revision replacement", () => {
    const full = Array.from({ length: 80 }, (_, i) =>
      bankUiItem(0, { questionIndex: i }),
    );
    const replacement = bankUiItem(0, { revision: 2 });
    const next = addBankQuestions(full, [
      bankUiItem(0, { questionIndex: 90 }),
      replacement,
    ]);
    expect(next).toHaveLength(80);
    expect(next[0]).toEqual(replacement);
  });
  it("preserves original passage, choices and evidence while grouping nonadjacent source questions", () => {
    const a = bankUiItem();
    const b = bankUiItem(2, {
      setId: "30000000-0000-4000-8000-000000000003",
      passage: "Other source.\n  Exact whitespace.",
    });
    const c = bankUiItem(2);
    const groups = groupBankQuestions([a, b, c]);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.numbers).toEqual([1, 3]);
    expect(groups[0]!.set.questions).toEqual([a.question, c.question]);
    expect(groups[1]!.set.passage).toBe(b.passage);
    expect(groups[1]!.numbers).toEqual([2]);
  });
});
