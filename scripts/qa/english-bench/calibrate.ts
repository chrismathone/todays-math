/**
 * 오늘의 영어 모델 벤치 — 결정적 검사 보정표. «검사가 결함이라 한 문항»이 채점관 쪽에서도 결함인가(정밀도)와
 * «채점관이 키 오류로 본 문항»을 검사가 잡았나(재현율)를 센다. 검증기 규칙으로 올릴지의 근거다(25 §12).
 *
 *   npx tsx scripts/qa/english-bench/calibrate.ts --out <회차 폴더> [--out2 <다른 회차> …]
 *
 * 채점관 쪽 «키 문제» = 눈가림 풀이에서 셋 중 과반이 키와 다른 답(또는 «동등 정답» 표시) **또는** 루브릭 keyValid 중앙값 ≤ 3.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  englishQuestionSchema,
  type EnglishQuestion,
} from "@/contracts/english.contract";
import { reviewEnglishDraft } from "@/lib/english/quality";

import type { GenRecord } from "./generate";
import { JUDGES } from "./models";
import { BENCH_TASKS } from "./tasks";
import { safeName } from "./util";

const KEY_CHECKS: Record<string, string[]> = {
  "문장 삽입": ["insert.answer-slot", "insert.given-in-passage"],
  어법: [
    "variant.single-edit",
    "grammar.answer-is-edit",
    "grammar.distractors-in-passage",
  ],
  "빈칸 추론": ["blank.marker", "variant.single-edit"],
};

function judgeFile(out: string, base: string, judge: string, kind: string) {
  const file = path.join(
    out,
    "judge",
    `${base}__${safeName(judge)}__${kind}.json`,
  );
  if (!existsSync(file)) return null;
  const data = JSON.parse(readFileSync(file, "utf8"));
  return data.error ? null : data;
}

const dirs = process.argv
  .slice(2)
  .filter((a, i, all) => all[i - 1] === "--out" || all[i - 1] === "--out2");
type Cell = {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  fpSamples: string[];
  fnSamples: string[];
};
const table = new Map<string, Cell>();
for (const out of dirs)
  for (const name of readdirSync(path.join(out, "gen"))) {
    const record = JSON.parse(
      readFileSync(path.join(out, "gen", name), "utf8"),
    ) as GenRecord;
    if (!record.parsed) continue;
    const base = path.basename(name, ".json");
    const task = BENCH_TASKS.find((t) => t.id === record.task)!;
    const d = record.draft as {
      title?: string;
      passage?: string;
      questions?: unknown[];
    };
    const raw = d.questions ?? [];
    const parsed = raw.map((q) => englishQuestionSchema.safeParse(q));
    const valid = parsed.flatMap((p) =>
      p.success ? [p.data] : [],
    ) as EnglishQuestion[];
    const idx = parsed.flatMap((p, i) => (p.success ? [i] : []));
    const report = reviewEnglishDraft(
      {
        title: "",
        source: "deepseek",
        passage: String(d.passage ?? ""),
        questions: valid,
      },
      { ...task.request, words: task.request.words },
    );
    for (const qr of report.questions) {
      const keys = KEY_CHECKS[qr.type];
      if (!keys) continue;
      const index = idx[qr.question]!;
      const question = valid[qr.question]!;
      const flagged = qr.checks.some((c) => keys.includes(c.code) && !c.ok);
      // 채점관 쪽 판정
      let wrong = 0;
      let seen = 0;
      const keyValid: number[] = [];
      for (const judge of JUDGES) {
        const solve = judgeFile(out, base, judge.id, "solveB");
        const meta = solve?.items?.find(
          (it: { index: number }) => it.index === index,
        );
        const answer = solve?.result?.answers?.find(
          (a: { id: string }) => a.id === meta?.id,
        );
        if (answer && meta) {
          seen += 1;
          const chosen = meta.order[answer.choice - 1];
          const also = (answer.alsoDefensible ?? []).length > 0;
          if (chosen !== Number(question.answer) - 1 || also) wrong += 1;
        }
        const rubric = judgeFile(out, base, judge.id, "rubric");
        const item = rubric?.result?.items?.find(
          (it: { q: string }) =>
            Number(String(it.q).replace(/\D/g, "")) - 1 === index,
        );
        if (typeof item?.keyValid === "number") keyValid.push(item.keyValid);
      }
      if (!seen && !keyValid.length) continue;
      keyValid.sort((a, b) => a - b);
      const median = keyValid.length
        ? keyValid[Math.floor(keyValid.length / 2)]!
        : 5;
      const judged = (seen > 0 && wrong * 2 > seen) || median <= 3;
      const cell = table.get(qr.type) ?? {
        tp: 0,
        fp: 0,
        fn: 0,
        tn: 0,
        fpSamples: [],
        fnSamples: [],
      };
      const tag = `${record.model} ${record.task} q${index + 1} (풀이 ${seen - wrong}/${seen} 일치 · keyValid 중앙 ${median})`;
      if (flagged && judged) cell.tp += 1;
      else if (flagged) {
        cell.fp += 1;
        cell.fpSamples.push(
          `${tag} — ${qr.checks
            .filter((c) => !c.ok)
            .map((c) => c.code)
            .join(",")}`,
        );
      } else if (judged) {
        cell.fn += 1;
        cell.fnSamples.push(tag);
      } else cell.tn += 1;
      table.set(qr.type, cell);
    }
  }
for (const [type, c] of table) {
  const precision = c.tp / Math.max(1, c.tp + c.fp);
  const recall = c.tp / Math.max(1, c.tp + c.fn);
  console.log(
    `\n## ${type}  검사 결함 ${c.tp + c.fp} · 채점관 키 문제 ${c.tp + c.fn} · 둘 다 ${c.tp} · 둘 다 아님 ${c.tn}`,
  );
  console.log(
    `정밀도 ${(precision * 100).toFixed(0)}% · 재현율 ${(recall * 100).toFixed(0)}%`,
  );
  console.log("검사만 결함:", c.fpSamples.slice(0, 6).join("\n  "));
  console.log("채점관만 문제:", c.fnSamples.slice(0, 6).join("\n  "));
}
