/**
 * DB 없이 커밋된 기출 초안 전량의 content/answer/solution 지문을 기록·대조한다.
 * 고정 자료이므로 씨앗 대신 모든 편·문항을 분모로 삼고, 행 식별자도 보존한다.
 * 사용: npx tsx scripts/import/exam-paper/audit-bank-fix.ts baseline|compare
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface ExamDraft {
  externalId: string;
  examId: string;
  questionNumber: number;
  content: string;
  answer: string;
  solution: string | null;
  questionType: string;
  [key: string]: unknown;
}

export const examRoot = resolve("scripts/import/exam-paper/exams");
export const baselinePath = resolve(
  "scripts/import/exam-paper/bank-fix-baseline.json",
);

export function readDraftCorpus(): ExamDraft[] {
  return readdirSync(examRoot)
    .sort()
    .flatMap((exam) => {
      const file = join(examRoot, exam, "drafts.json");
      return existsSync(file)
        ? (JSON.parse(readFileSync(file, "utf8")) as ExamDraft[])
        : [];
    });
}

export function fingerprint(draft: ExamDraft): string {
  return createHash("sha256")
    .update([draft.content, draft.answer, draft.solution ?? ""].join("|"))
    .digest("hex");
}

if (/[\\/]audit-bank-fix\.(?:ts|js)$/.test(process.argv[1] ?? "")) {
  const drafts = readDraftCorpus();
  const hashes = Object.fromEntries(
    drafts.map((d) => [d.externalId, fingerprint(d)]),
  );
  if (process.argv[2] === "baseline") {
    if (existsSync(baselinePath)) throw new Error("기존 기준선은 덮지 않는다");
    writeFileSync(baselinePath, JSON.stringify(hashes, null, 2) + "\n");
  } else if (process.argv[2] === "rebuild") {
    const output = mkdtempSync(join(tmpdir(), "bank-fix-exams-"));
    const changed: string[] = [];
    for (const exam of [...new Set(drafts.map((d) => d.examId))]) {
      const file = join(output, `${exam}.json`);
      execFileSync(
        process.execPath,
        [
          resolve("node_modules/tsx/dist/cli.mjs"),
          resolve("scripts/import/exam-paper/build-exam-drafts.ts"),
          join(examRoot, exam),
          file,
        ],
        { encoding: "utf8", stdio: "pipe" },
      );
      const rebuilt = JSON.parse(readFileSync(file, "utf8")) as ExamDraft[];
      const previous = new Map(
        drafts.filter((d) => d.examId === exam).map((d) => [d.externalId, d]),
      );
      for (const row of rebuilt) {
        if (
          JSON.stringify(row) !== JSON.stringify(previous.get(row.externalId))
        )
          changed.push(row.externalId);
      }
      if (process.argv.includes("--write"))
        copyFileSync(file, join(examRoot, exam, "drafts.json"));
    }
    console.log(JSON.stringify({ output, changed }, null, 2));
  } else if (process.argv[2] === "compare") {
    const before = JSON.parse(readFileSync(baselinePath, "utf8")) as Record<
      string,
      string
    >;
    const changed = drafts.filter(
      (d) => before[d.externalId] !== fingerprint(d),
    );
    console.log(
      JSON.stringify(
        {
          papers: new Set(drafts.map((d) => d.examId)).size,
          rows: drafts.length,
          unchanged: drafts.length - changed.length,
          changed: changed.map((d) => d.externalId),
          removed: Object.keys(before).filter((id) => !(id in hashes)),
        },
        null,
        2,
      ),
    );
  } else {
    throw new Error("사용: baseline|compare|rebuild [--write]");
  }
}
