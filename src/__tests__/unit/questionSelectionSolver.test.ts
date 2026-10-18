import { describe, expect, it } from "vitest";
import {
  solveQuestionSelection,
  type QuestionSelectionCandidate,
} from "@/lib/problem/questionSelectionSolver";

const c = (
  id: string,
  familyId: string,
  format: QuestionSelectionCandidate["format"],
  difficulty = "기본",
  unitId = "u",
  questionId = id,
): QuestionSelectionCandidate => ({
  id,
  questionId,
  familyId,
  unitId,
  difficulty,
  format,
});
describe("full-pool actual question solver", () => {
  it("finds the feasible alternative before declaring format insufficiency", () => {
    const rows = [
      c("a", "a", "short_answer"),
      c("b", "b", "short_answer"),
      c("c", "c", "descriptive"),
    ];
    const r = solveQuestionSelection({
      candidates: rows,
      count: 2,
      formats: { 단답형: 1, 서술형: 1 },
      random: () => 0.99,
    });
    expect(r.status).toBe("complete");
    expect(r.selected.map((r) => r.id)).toContain("c");
  });
  it("backtracks across family tiers instead of greedily spending the only hard family", () => {
    const r = solveQuestionSelection({
      candidates: [
        c("a1", "a", "short_answer"),
        c("a2", "a", "short_answer", "응용"),
        c("b", "b", "short_answer"),
      ],
      count: 2,
      difficulty: { 기본: 1, 응용: 1 },
      random: () => 0.99,
    });
    expect(r.status).toBe("complete");
    expect(r.selected.map((r) => r.id).sort()).toEqual(["a2", "b"]);
  });
  it("never selects two representations when family restriction is off", () => {
    const r = solveQuestionSelection({
      candidates: [
        c("sa", "f", "short_answer", "기본", "u", "q"),
        c("mc", "f", "multiple_choice", "기본", "u", "q"),
      ],
      count: 2,
      distinctFamilies: false,
    });
    expect(r.status).toBe("insufficient");
    expect(r.witness.reason).toContain("capacity");
  });
  it("never borrows a different same-family question for a format slot", () => {
    const r = solveQuestionSelection({
      candidates: [
        c("sa", "f", "short_answer"),
        c("mc", "f", "multiple_choice"),
      ],
      count: 2,
      formats: { 단답형: 1, 객관식: 1 },
    });
    expect(r.status).toBe("insufficient");
  });
  it("jointly enforces units, formats and tiers over the full pool", () => {
    const rows = [
      c("a", "f1", "short_answer", "기본", "u1"),
      c("b", "f1", "descriptive", "응용", "u1"),
      c("c", "f2", "short_answer", "기본", "u2"),
      c("d", "f3", "descriptive", "응용", "u2"),
    ];
    const r = solveQuestionSelection({
      candidates: rows,
      allocations: [
        { unitId: "u1", count: 1 },
        { unitId: "u2", count: 1 },
      ],
      difficulty: { 기본: 1, 응용: 1 },
      formats: { 단답형: 1, 서술형: 1 },
    });
    expect(r.status).toBe("complete");
    expect(new Set(r.selected.map((r) => r.unitId)).size).toBe(2);
  });
  it("distinguishes a bounded search from proven insufficiency", () => {
    const r = solveQuestionSelection({
      candidates: [c("a", "a", "short_answer")],
      count: 1,
      maxNodes: 0,
    });
    expect(r.status).toBe("search_limit");
  });
  it("zero excludes a format while omitted formats share remaining demand", () => {
    const r = solveQuestionSelection({
      candidates: [c("a", "a", "short_answer"), c("b", "b", "multiple_choice")],
      count: 1,
      formats: { 단답형: 0 },
    });
    expect(r.status).toBe("complete");
    expect(r.selected[0].format).toBe("multiple_choice");
  });
});
