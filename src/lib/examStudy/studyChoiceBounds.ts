import type { ExamStudyDraft } from "@/contracts/examStudy.contract";
import { parseProblemContent } from "@/lib/problem/parseProblemContent";
import { circledValueRaw } from "@/lib/math/circledNumber";
import { scalar } from "./reinforcementMath";

/** Count the printed objects, never the generator answer/facts or the eventual option count. */
export function printedStatementCount(content: string): number | undefined {
  const question = content.split(/\n(?=\s*①)/)[0]!;
  const lines = question.trim().split("\n");
  if (!/(?:개수|몇 개)/.test(lines[0]!)) return undefined;
  const rows = lines.slice(1).filter((s) => s.trim());
  if (rows.length && rows.every((s) => /^[ㄱ-ㅎ㉠-㉯][.:：]?\s/.test(s))) {
    const ids = rows.map((s) => s.trim()[0]);
    if (new Set(ids).size !== ids.length)
      throw new Error("Repeated statement identifier");
    return rows.length;
  }
  // Existing EQ06/EQ09 print an unnumbered comma-separated list of math spans.
  if (rows.length === 1 && /다음 중|보기 중/.test(lines[0]!)) {
    const spans = [...rows[0]!.matchAll(/\$([^$]+)\$/g)];
    const remainder = rows[0]!.replace(/\$[^$]+\$/g, "").replace(/[,\s]/g, "");
    if (!remainder && spans.length >= 1) return spans.length;
  }
  return undefined;
}

export function countValue(answer: string): number {
  const m = /^\$([^$]+)\$\s*개$/.exec(answer.trim());
  if (!m) throw new Error("Expected a count with its unit");
  const value = scalar(m[1]!);
  if (value.d !== 1) throw new Error("A count must be an integer");
  return value.n;
}

/** Supply only four mathematically different, possible counts; fail closed for <5 values. */
export function boundedCountDistractors(
  item: ExamStudyDraft,
): readonly string[] | undefined {
  if (!/개$/.test(item.answer.trim())) return item.distractors;
  const n = printedStatementCount(item.content);
  if (n === undefined) return item.distractors;
  const correct = countValue(item.answer);
  if (n < 4 || correct < 0 || correct > n)
    throw new Error("Five possible count choices cannot be formed");
  if (item.distractors !== undefined) {
    const values = item.distractors.map(countValue);
    if (
      values.length !== 4 ||
      values.some((v) => v < 0 || v > n) ||
      new Set([correct, ...values]).size !== 5
    )
      throw new Error(
        "Injected count distractors are outside the printed domain or equivalent",
      );
    return values.map((v) => `$${v}$개`);
  }
  return Array.from({ length: n + 1 }, (_, i) => i)
    .filter((i) => i !== correct)
    .sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct) || a - b)
    .slice(0, 4)
    .map((v) => `$${v}$개`);
}

/** Also available to production mathematical verifiers without importing adapters (no cycle). */
export function selectedStudyAnswer(item: ExamStudyDraft): {
  question: string;
  answer: string;
} {
  if (item.questionType !== "객관식")
    return { question: item.content, answer: item.answer };
  const parsed = parseProblemContent(item.content);
  const mark = circledValueRaw(item.answer.trim());
  if (
    parsed.choices.length !== 5 ||
    mark < 1 ||
    mark > 5 ||
    [...item.answer.trim()].length !== 1
  )
    throw new Error("Invalid multiple choice answer");
  const n = printedStatementCount(parsed.question);
  if (n !== undefined) {
    const values = parsed.choices.map(countValue);
    if (values.some((v) => v < 0 || v > n) || new Set(values).size !== 5)
      throw new Error(
        "Count alternatives violate the printed statement domain",
      );
  } else {
    const keys = parsed.choices
      .map((c) => scalar(c.replace(/\$/g, "")))
      .map((q) => `${q.n}/${q.d}`);
    if (new Set(keys).size !== 5)
      throw new Error("Mathematically equivalent alternatives");
  }
  return {
    question: item.content.split(/\n(?=\s*①)/)[0]!,
    answer: parsed.choices[mark - 1]!,
  };
}
