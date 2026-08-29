/**
 * 연산 집합 표류 점검 — **다시 잡기 전에** 「얼린 키 가운데 빠진 것이 있는가」를 본다.
 *
 * `middleTierYeonsan.test.ts` 머리말이 시키는 절차다: 빠진 키가 있으면 그건 새 유형이
 * 아니라 **규칙이 흔들린 것**이므로 다시 잡지 말고 왜 그런지부터 본다.
 *
 * ⚠️ 씨앗은 그 시험과 **같은 값**이어야 한다 — 다른 씨앗으로 재면 갈래가 달라져
 *    「규칙이 흔들렸다」는 거짓 경보가 난다.
 */
import { readFileSync } from "node:fs";

import {
  generateMiddleProblem,
  registeredTypes,
} from "../src/lib/middle/generate";

const SEED = 20260825;

const src = readFileSync(
  "src/__tests__/unit/middleTierYeonsan.test.ts",
  "utf8",
);
const block = src.slice(
  src.indexOf("const YEONSAN_KEYS = ["),
  src.indexOf("] as const;"),
);
const frozen = new Set(
  [...block.matchAll(/"([^"]+\|[^"]+\|[^"]+)"/g)].map((m) => m[1]!),
);

const found = new Set(
  registeredTypes()
    .filter((t) => generateMiddleProblem(t.key, SEED).difficulty === "연산")
    .map((t) => t.key),
);

const missing = [...frozen].filter((k) => !found.has(k)).sort();
const added = [...found].filter((k) => !frozen.has(k)).sort();

console.log(`얼린 키 ${frozen.size} · 지금 연산 ${found.size}`);
console.log(`빠진 키 ${missing.length}개 ${JSON.stringify(missing)}`);
console.log(`늘어난 키 ${added.length}개 ${JSON.stringify(added)}`);
