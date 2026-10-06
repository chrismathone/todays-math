/**
 * 제품의 사진 읽기 지시문을 파일로 뽑는다 — 측정이 제품 함수의 글을 그대로 쓰게(베껴 두면 어긋난다).
 *
 *   node --import tsx scripts/qa/english-read-bench/dump-prompt.ts <폴더>
 *
 * → <폴더>/read.txt(읽기) · <폴더>/verify.txt(대조의 머리말 — `run.mjs --verify` 가 뒤에 지시문과 읽은 글을 붙인다.
 *   붙이는 꼴은 제품 `buildEnglishReadVerifyPrompt` 와 같다).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  ENGLISH_READ_PROMPT_VERSION,
  buildEnglishReadPrompt,
  buildEnglishReadVerifyPrompt,
} from "../../../src/lib/ai/prompts/englishRead";

const dir = process.argv[2] ?? ".";
mkdirSync(dir, { recursive: true });
const read = buildEnglishReadPrompt();
const verify = buildEnglishReadVerifyPrompt("");
writeFileSync(path.join(dir, "read.txt"), read, "utf8");
writeFileSync(
  path.join(dir, "verify.txt"),
  verify.slice(0, verify.indexOf("\n\n[지시문]\n")),
  "utf8",
);
console.log(`읽기 지시문 ${ENGLISH_READ_PROMPT_VERSION} — ${read.length}자`);
