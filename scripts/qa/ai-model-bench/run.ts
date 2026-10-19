/**
 * AI 모델 비교 하네스 — 실행 입구. 사용법은 같은 폴더 README.md.
 *
 *   npx tsx --conditions=react-server --env-file=.env scripts/qa/ai-model-bench/run.ts \
 *     --task solution --arms deepseek-v4-pro,deepseek-flash --n 20 --seed s1 --budget 0.5 --out <폴더> [--dry-run]
 *
 * 공유 DB 는 읽기만 한다(표본 뽑기). 유료 API 를 부르므로 `--budget`(달러) 상한을 넘으면 그 자리에서 멈춘다.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { appendFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { armById, ARMS } from "./arms";
import { estimate, runBench, table } from "./bench";
import { Budget, ZERO_USAGE } from "./cost";
import { callArm, type Caller } from "./providers";
import type { RunRecord, Task } from "./task";
import { englishReadCommand } from "./tasks/englishRead";
import { cropOcrTask, pageOcrTask } from "./tasks/pageOcr";
import { solutionTask } from "./tasks/solution";

const TASKS: Record<string, Task<{ id: string }>> = {
  solution: solutionTask as unknown as Task<{ id: string }>,
  "page-ocr": pageOcrTask as unknown as Task<{ id: string }>,
  "crop-ocr": cropOcrTask as unknown as Task<{ id: string }>,
};

function args() {
  const out: Record<string, string | true> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i]!;
    if (!key.startsWith("--")) continue;
    const value = argv[i + 1];
    if (value && !value.startsWith("--")) {
      out[key.slice(2)] = value;
      i++;
    } else out[key.slice(2)] = true;
  }
  return out;
}

async function main() {
  const a = args();
  const taskName = String(a.task ?? "");
  const outDir = path.resolve(String(a.out ?? `ai-model-bench-out/${taskName}`));
  const armIds = String(a.arms ?? "").split(",").filter(Boolean);
  if (a.list) {
    for (const arm of Object.values(ARMS)) console.log(`${arm.id}\t${arm.vendor}/${arm.model}\t${arm.note ?? ""}`);
    return;
  }
  if (taskName === "english-read") {
    console.log(JSON.stringify(englishReadCommand(a.photos as string | undefined, outDir, armIds), null, 2));
    return;
  }
  const task = TASKS[taskName];
  if (!task) throw new Error(`--task 는 ${[...Object.keys(TASKS), "english-read"].join(" | ")} 중 하나`);
  if (!armIds.length) throw new Error("--arms 를 주세요(목록: --list)");
  const arms = armIds.map(armById);
  await mkdir(outDir, { recursive: true });

  // --rescore: 저장한 응답을 다시 채점만 한다(호출 없음 · 비용 0) — 채점기를 고친 뒤 지난 결과에 다시 대 볼 때
  if (a.rescore) {
    const saved = JSON.parse(await readFile(path.join(outDir, "results.json"), "utf8"));
    const items = Object.fromEntries(
      (JSON.parse(await readFile(path.join(outDir, "sample.json"), "utf8")) as { id: string }[]).map((x) => [x.id, x]),
    );
    for (const record of saved.records as RunRecord[]) {
      if (!record.raw) continue;
      const replay: Caller = async () => ({ text: record.raw!, usage: { ...ZERO_USAGE }, ms: 0, finish: record.finish });
      const again = await task.runOne(items[record.itemId]!, armById(record.armId), replay);
      record.score = again.score;
      record.error = again.error;
    }
    await writeFile(path.join(outDir, "results.json"), JSON.stringify(saved, null, 2));
    const md = `# ${task.name} (다시 채점)\n\n${table(task, saved.records, arms)}\n`;
    await writeFile(path.join(outDir, "table.md"), md);
    console.log(md);
    return;
  }

  // 표본: --sample 파일이 있으면 그대로(재현), 없으면 시드로 뽑아 저장
  const samplePath = path.join(outDir, "sample.json");
  let items: { id: string }[];
  if (a.sample) items = JSON.parse(await readFile(String(a.sample), "utf8"));
  else {
    const excludeIds = a.exclude
      ? (JSON.parse(await readFile(String(a.exclude), "utf8")) as { id: string }[]).map((x) => x.id)
      : [];
    items = await task.sample({
      n: Number(a.n ?? 10),
      seed: String(a.seed ?? "ai-model-bench"),
      filter: a.filter ? String(a.filter) : undefined,
      excludeIds,
      dir: path.join(outDir, "sample-files"),
    });
  }
  await writeFile(samplePath, JSON.stringify(items, null, 2));
  console.log(`표본 ${items.length}개 → ${samplePath}`);

  const limit = Number(a.budget ?? 0.5);
  const strictBudget = task.name === "solution" || Boolean(a["strict-budget"]);
  const est = estimate(task, items, arms);
  console.log("어림(드라이런 기준):");
  for (const e of est) console.log(`  ${e.arm}: 호출 ${e.calls} · 약 $${e.cost.toFixed(4)}`);
  if (a["dry-run"]) return;

  const budget = new Budget(limit);
  // 지시문·설정과 각 응답을 즉시 남겨 중단 후에도 호출·비용·표본을 확인할 수 있게 한다.
  const prompts = items.map((item) => {
    const prompt = task.prompt(item);
    return { itemId: item.id, sha256: createHash("sha256").update(prompt).digest("hex"), prompt };
  });
  await writeFile(path.join(outDir, "prompts.json"), JSON.stringify(prompts, null, 2));
  const journal = path.join(outDir, "records.jsonl");
  writeFileSync(journal, "");
  const result = await runBench(task, items, {
    arms,
    budget,
    caller: callArm,
    requireKeys: true,
    strictBudget,
    concurrency: Number(a.concurrency ?? 3),
    onRecord: (r) => {
      appendFileSync(journal, JSON.stringify(r) + "\n");
      console.log(`  ${r.armId} ${r.itemId.slice(0, 8)} ${(r.ms / 1000).toFixed(1)}s $${r.cost.toFixed(5)}${r.error ? " 실패: " + r.error.slice(0, 80) : ""}`);
    },
  });
  const md = [
    `# ${task.name} — ${new Date().toISOString()}`,
    "",
    table(task, result.records, arms),
    "",
    `쓴 돈: $${budget.spent.toFixed(4)} / 상한 $${limit}`,
    ...(result.stopped ? [`멈춤: ${result.stopped}`] : []),
    ...result.skippedArms.map((s) => `건너뜀: ${s.id} — ${s.reason}`),
    "",
    "단가 출처:",
    ...[...new Set(arms.map((x) => x.price.source))].map((s) => `- ${s}`),
  ].join("\n");
  await writeFile(path.join(outDir, "results.json"), JSON.stringify({ task: task.name, arms: armIds, armSettings: arms, strictBudget, ...result, spent: budget.spent, uncertainCost: budget.uncertain }, null, 2));
  await writeFile(path.join(outDir, "table.md"), md);
  console.log("\n" + md);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
