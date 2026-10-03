import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  fingerprint,
  readDraftCorpus,
  type ExamDraft,
} from "../../../scripts/import/exam-paper/audit-bank-fix";
import {
  figureHashes,
  readDecideBaseline,
} from "../../../scripts/import/exam-paper/audit-bank-decide";

describe("bank-decide 전수 지문 — 고정 기출 25편 533행", () => {
  it("합의 5행과 퍼센트 7행만 달라지고 모든 정답·식별자·나머지 521행은 그대로다", () => {
    const baseline = readDecideBaseline();
    const rows = readDraftCorpus();
    expect(baseline.rows).toBe(533);
    expect(baseline.papers).toBe(25);
    expect(rows).toHaveLength(baseline.rows);
    expect(rows.map((d) => d.externalId).sort()).toEqual(
      Object.keys(baseline.hashes).sort(),
    );
    const changed = rows
      .filter((d) => fingerprint(d) !== baseline.hashes[d.externalId])
      .map((d) => d.externalId)
      .sort();
    expect(changed).toEqual([
      "2025-chilgok-3-2-mid-7",
      "2025-daeryun-3-2-mid-7",
      "2025-dongdo-3-2-mid-16",
      "2025-gangdong-3-2-mid-17",
      "2025-joam-3-2-mid-20",
      "2025-neungin-3-2-mid-16",
      "2025-saeron-3-2-mid-15",
      "2025-saeron-3-2-mid-8",
      "2025-sangin-3-2-mid-23",
      "2025-seonghwa-3-2-mid-22",
      "2025-sinmyeongyeo-3-2-mid-18",
      "2025-yeongnamsamyuk-3-2-mid-14",
    ]);
    for (const exam of new Set(rows.map((d) => d.examId))) {
      const source = execFileSync(
        "git",
        [
          "show",
          `${baseline.baseRevision}:scripts/import/exam-paper/exams/${exam}/drafts.json`,
        ],
        { encoding: "utf8" },
      );
      const previous = new Map(
        (JSON.parse(source) as ExamDraft[]).map((d) => [d.externalId, d]),
      );
      for (const after of rows.filter((d) => d.examId === exam)) {
        const before = previous.get(after.externalId)!;
        expect(fingerprint(before)).toBe(baseline.hashes[after.externalId]);
        expect(after.answer, after.externalId).toBe(before.answer);
        if (!changed.includes(after.externalId)) expect(after).toEqual(before);
        else {
          const fields = Object.keys(after)
            .filter(
              (k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]),
            )
            .sort();
          const both = /(?:chilgok|saeron|joam)/.test(exam);
          const solutionOnly = /(?:dongdo|sangin|seonghwa)/.test(exam);
          expect(fields).toEqual(
            both
              ? ["content", "solution"]
              : solutionOnly
                ? ["solution"]
                : ["content"],
          );
          if (
            !solutionOnly &&
            !/chilgok/.test(exam) &&
            after.externalId !== "2025-saeron-3-2-mid-8"
          ) {
            for (const field of ["content", "solution"] as const) {
              expect(after[field]?.replace(/\\%/g, "%")).toBe(
                before[field]?.replace(/\\%/g, "%"),
              );
            }
          }
        }
      }
    }
    expect(figureHashes()).toEqual(baseline.figures);
  });
});
