import { describe, expect, it } from "vitest";
import { selectProblems } from "@/lib/generator/selectProblems";
import { selectWithFormats } from "@/lib/generator/selectWithFormats";
import { draftCapacityOf } from "@/lib/tests/draftCapacity";
import {
  DIFFICULTY_LADDER,
  type DifficultyRatio,
} from "@/contracts/difficulty";

const ratio = (count: number) =>
  Object.fromEntries(
    DIFFICULTY_LADDER.map((t) => [t, t === "기본" ? count : 0]),
  ) as DifficultyRatio;
const row = (
  id: string,
  questionGroupKey: string,
  familyKey: string,
  mc = false,
) => ({
  id,
  unitId: "unit",
  questionGroupKey,
  familyKey,
  difficulty: "기본" as const,
  directUseAllowed: true,
  problemType: "계산",
  questionType: mc ? "객관식" : "단답형",
  content: mc ? "1+1은?\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5" : "1+1은?",
  answer: mc ? "②" : "2",
});
describe("question identity in issuance", () => {
  const pool = [
    row("sa", "q1", "f1"),
    row("mc", "q1", "f1", true),
    row("next", "q2", "f1"),
    row("other", "q3", "f2"),
  ];
  it("excludes all formats of a recent question while retaining another number of that type", () => {
    const result = selectProblems({
      pool,
      difficultyRatio: ratio(2),
      count: 2,
      recentProblemIds: ["sa"],
      seed: "s",
    });
    expect(result.problems.map((p) => p.id).sort()).toEqual(["next", "other"]);
    expect(draftCapacityOf(pool.slice(0, 2), ["sa"])).toBe(0);
    expect(draftCapacityOf(pool, ["sa"])).toBe(2);
  });
  it("never takes a second representation, even if legacy family metadata differs", () => {
    const result = selectProblems({
      pool: [pool[0], { ...pool[1], familyKey: "legacy-other" }],
      difficultyRatio: ratio(2),
      count: 2,
      recentProblemIds: [],
      seed: "s",
    });
    expect(result.problems).toHaveLength(1);
  });
  it("uses the full pool to satisfy an actual format quota, keeping actual answers", () => {
    const result = selectWithFormats({
      pool,
      difficultyRatio: ratio(2),
      count: 2,
      recentProblemIds: [],
      seed: "s",
      formats: { 객관식: 1, 단답형: 1, 서술형: 0 },
    });
    expect(result.status).toBe("complete");
    expect(
      result.result?.problems
        .filter((p) => p.questionType === "객관식")
        .map((p) => p.answer),
    ).toEqual(["②"]);
    expect(
      new Set(result.result?.problems.map((p) => p.questionGroupKey)).size,
    ).toBe(2);
  });
  it("does not fill an unsupported written quota with short answers", () => {
    const result = selectWithFormats({
      pool,
      difficultyRatio: ratio(2),
      count: 2,
      recentProblemIds: [],
      seed: "s",
      formats: { 서술형: 2 },
    });
    expect(result.status).toBe("insufficient");
    expect(result.result).toBeNull();
  });
});
