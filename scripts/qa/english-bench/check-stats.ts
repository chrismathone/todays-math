/**
 * 오늘의 영어 모델 벤치 — 결정적 검사별 실패 수와 표본(검사가 진짜 결함을 무는지 사람이 볼 수 있게).
 *   npx tsx scripts/qa/english-bench/check-stats.ts --out <폴더> [--code insert.answer-slot] [--show 3]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  englishQuestionSchema,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import { reviewEnglishDraft } from "@/lib/english/quality";

import type { GenRecord } from "./generate";
import { BENCH_TASKS } from "./tasks";
import { flag } from "./util";

const out = flag("--out")!;
const code = flag("--code");
const show = Number(flag("--show") ?? 2);
const counts = new Map<string, { fail: number; total: number }>();
const samples: string[] = [];
for (const name of readdirSync(path.join(out, "gen"))) {
  const record = JSON.parse(
    readFileSync(path.join(out, "gen", name), "utf8"),
  ) as GenRecord;
  if (!record.parsed) continue;
  const task = BENCH_TASKS.find((t) => t.id === record.task)!;
  const d = record.draft as {
    title?: string;
    passage?: string;
    questions?: unknown[];
  };
  const qs = (d.questions ?? []).flatMap((q) => {
    const v = englishQuestionSchema.safeParse(q);
    return v.success ? [v.data] : [];
  }) as EnglishQuestion[];
  const report = reviewEnglishDraft(
    {
      title: String(d.title ?? ""),
      source: "deepseek",
      passage: String(d.passage ?? ""),
      questions: qs,
    },
    { ...task.request, words: task.request.words },
  );
  for (const q of report.questions)
    for (const c of q.checks) {
      const e = counts.get(c.code) ?? { fail: 0, total: 0 };
      e.total += 1;
      if (!c.ok) e.fail += 1;
      counts.set(c.code, e);
      if (!c.ok && c.code === code && samples.length < show) {
        const question = qs[q.question]!;
        samples.push(
          `== ${record.model} ${record.task} q${q.question + 1} answer=${question.answer}\n${question.prompt.slice(0, 900)}\nOPTIONS ${JSON.stringify(question.options)}\nEXPL ${question.explanation.slice(0, 200)}`,
        );
      }
    }
}
for (const [c, e] of [...counts.entries()].sort(
  (a, b) => b[1].fail - a[1].fail,
))
  console.log(`${c.padEnd(34)} ${e.fail}/${e.total}`);
if (samples.length) console.log("\n" + samples.join("\n\n"));
