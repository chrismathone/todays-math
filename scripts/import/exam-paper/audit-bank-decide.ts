/** bank-decide 직전의 고정 기출 전량을 보존하고, 리드의 DB 적용용 차이를 만든다. */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  examRoot,
  fingerprint,
  readDraftCorpus,
  type ExamDraft,
} from "./audit-bank-fix";

export const decideBaselinePath = resolve(
  "scripts/import/exam-paper/bank-decide-baseline.json",
);
export const decideReviewPath = resolve(
  "scripts/import/exam-paper/bank-decide-review.json",
);
export interface DecideBaseline {
  baseRevision: string;
  papers: number;
  rows: number;
  hashes: Record<string, string>;
  figures: Record<string, string>;
}
export function figureHashes(): Record<string, string> {
  const dir = join(examRoot, "2025-ansim-3-2-mid/figures");
  return Object.fromEntries(
    readdirSync(dir)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => [
        f,
        createHash("sha256")
          .update(readFileSync(join(dir, f)))
          .digest("hex"),
      ]),
  );
}
export function readDecideBaseline(): DecideBaseline {
  return JSON.parse(readFileSync(decideBaselinePath, "utf8")) as DecideBaseline;
}
if (/[\\/]audit-bank-decide\.(?:ts|js)$/.test(process.argv[1] ?? "")) {
  const drafts = readDraftCorpus();
  if (process.argv[2] === "baseline") {
    if (existsSync(decideBaselinePath))
      throw new Error("기존 기준선은 덮지 않는다");
    const baseline: DecideBaseline = {
      baseRevision: execFileSync("git", ["rev-parse", "HEAD"], {
        encoding: "utf8",
      }).trim(),
      papers: new Set(drafts.map((d) => d.examId)).size,
      rows: drafts.length,
      hashes: Object.fromEntries(
        drafts.map((d) => [d.externalId, fingerprint(d)]),
      ),
      figures: figureHashes(),
    };
    writeFileSync(decideBaselinePath, JSON.stringify(baseline, null, 2) + "\n");
    console.log(
      `기준선 ${baseline.papers}편 ${baseline.rows}행 · PNG ${Object.keys(baseline.figures).length}장`,
    );
  } else if (process.argv[2] === "review") {
    const baseline = readDecideBaseline();
    const original = new Map<string, ExamDraft>();
    for (const exam of new Set(
      Object.keys(baseline.hashes).map((id) => id.replace(/-\d+$/, "")),
    )) {
      const source = execFileSync(
        "git",
        [
          "show",
          `${baseline.baseRevision}:scripts/import/exam-paper/exams/${exam}/drafts.json`,
        ],
        { encoding: "utf8" },
      );
      for (const d of JSON.parse(source) as ExamDraft[])
        original.set(d.externalId, d);
    }
    const changes = drafts.flatMap((after) => {
      const before = original.get(after.externalId);
      if (!before) return [];
      if (fingerprint(before) !== baseline.hashes[after.externalId])
        throw new Error(`기준선 불일치: ${after.externalId}`);
      const fields = [
        ...new Set([...Object.keys(before), ...Object.keys(after)]),
      ].filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
      return fields.length
        ? [
            {
              externalId: after.externalId,
              fields,
              beforeHash: fingerprint(before),
              afterHash: fingerprint(after),
              before: Object.fromEntries(
                fields.map((k) => [k, before[k] ?? null]),
              ),
              after: Object.fromEntries(
                fields.map((k) => [k, after[k] ?? null]),
              ),
            },
          ]
        : [];
    });
    const summary = {
      baseRevision: baseline.baseRevision,
      papers: baseline.papers,
      rows: baseline.rows,
      changed: changes.length,
      unchanged: baseline.rows - changes.length,
      databaseChanged: changes
        .filter((d) => d.externalId.startsWith("2025-dongdo-3-2-mid-"))
        .map((d) => d.externalId),
      added: drafts
        .filter((d) => !original.has(d.externalId))
        .map((d) => d.externalId),
      removed: [...original.keys()].filter(
        (id) => !drafts.some((d) => d.externalId === id),
      ),
      figuresUnchanged:
        JSON.stringify(figureHashes()) === JSON.stringify(baseline.figures),
    };
    writeFileSync(
      decideReviewPath,
      JSON.stringify({ ...summary, changes }, null, 2) + "\n",
    );
    console.log(JSON.stringify(summary, null, 2));
  } else throw new Error("사용: baseline|review");
}
