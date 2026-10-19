import type { UsageProblemRecord } from "./assemble";

/** One test containing two representations is one use of that question. No history is rewritten. */
export function questionUses(
  records: readonly UsageProblemRecord[],
  links: readonly { testId: string; problemId: string }[],
): { problemId: string; testCount: number }[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  const testsByQuestion = new Map<string, Set<string>>();
  for (const link of links) {
    const record = byId.get(link.problemId);
    if (!record?.visible) continue;
    const key = record.questionId ?? record.id;
    const tests = testsByQuestion.get(key) ?? new Set<string>();
    tests.add(link.testId);
    testsByQuestion.set(key, tests);
  }
  return records.flatMap((record) => {
    if (!record.visible || !record.eligible || !record.unit) return [];
    const testCount =
      testsByQuestion.get(record.questionId ?? record.id)?.size ?? 0;
    return testCount ? [{ problemId: record.id, testCount }] : [];
  });
}
