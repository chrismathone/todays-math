/**
 * 오늘의 영어 모델 벤치 — 저장된 원문 응답(`raw`)을 **지금의** 제품 파서·검증기로 다시 읽는다(모델을 다시 부르지 않는다).
 *
 *   npx tsx scripts/qa/english-bench/reparse.ts --out <폴더>
 *
 * 2026-09-30: `parseAiJsonObject` 가 영어 줄바꿈(`\nMany`)을 LaTeX 로 읽어 글자 그대로의 `\n` 을 남기던 결함을 고친 뒤,
 * 이미 받은 응답을 고친 파서로 다시 읽으려고 만들었다. 바뀐 파일 이름을 찍는다(그 세트의 채점은 다시 해야 한다).
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parseAiJsonObject } from "@/lib/ai/jsonRepair";
import { coerceEnglishDraftShape } from "@/lib/english/chatgpt";
import { validateEnglishDraft } from "@/lib/english/validate";

import type { GenRecord } from "./generate";
import { BENCH_TASKS } from "./tasks";
import { flag } from "./util";

const out = flag("--out");
if (!out) throw new Error("--out <폴더> 가 필요하다");
const dir = path.join(out, "gen");
let changed = 0;
for (const name of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const file = path.join(dir, name);
  const record = JSON.parse(readFileSync(file, "utf8")) as GenRecord;
  if (!record.raw) continue;
  const task = BENCH_TASKS.find((t) => t.id === record.task)!;
  const before = JSON.stringify(record.draft);
  try {
    const value = coerceEnglishDraftShape(
      parseAiJsonObject(record.raw),
      "deepseek",
    );
    const verdict = validateEnglishDraft(value, task.request);
    record.parsed = true;
    record.error = null;
    record.draft = value;
    record.accepted = verdict.ok;
    record.issues = verdict.ok ? [] : verdict.issues;
  } catch (error) {
    record.parsed = false;
    record.draft = null;
    record.accepted = false;
    record.error = `읽기 실패: ${(error as Error).message}`;
  }
  if (JSON.stringify(record.draft) !== before) {
    changed += 1;
    console.log(`바뀜  ${name}`);
  }
  writeFileSync(file, JSON.stringify(record, null, 2), "utf8");
}
console.log(`다시 읽기 끝 — 바뀐 세트 ${changed}`);
