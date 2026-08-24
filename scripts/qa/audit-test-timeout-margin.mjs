/**
 * 「전역 20초 천장에 붙어 있는 시험」을 센다 — 게이트가 **부하 때문에** 빨개지는 자리.
 *
 *   node scripts/qa/audit-test-timeout-margin.mjs <vitest 기본 리포터 출력 파일>
 *
 * ## 왜 필요한가
 *
 * `vitest.config.mts` 의 `testTimeout` 은 **전역 20초**다. 그 주석이 이미 같은 사건을
 * 적어 두고 있다 — *「기본 5초로는 **전체 실행에서만** 타임아웃이 났다(격리 실행은 통과)」*.
 * 5초가 모자라 20초로 올렸는데, 스위트가 10,284건으로 자라고 다중 세션이 CPU 를 나눠
 * 쓰면서 **같은 일이 다시 났다**(2026-08-24: `elementaryEngine.test.ts` 「두 그래프 결합」
 * — 단독 4.8초, 게이트 20.05초).
 *
 * ⚠️ **한 건만 올리면 다음 회차에 다른 게 터진다.** 실측으로 이 파일에만 17.3초·12.9초·
 *    9.1초짜리가 더 있었다. 그래서 천장에 붙은 것을 **전부** 세고, 그중 자기 타임아웃이
 *    없는 것을 신고한다.
 *
 * ## 무엇을 «참»으로 삼나
 *
 * 지속시간은 **게이트가 실제로 찍은 값**이고(제품 상수가 아니다), 「자기 타임아웃이
 * 있나」는 **소스 파일**에서 읽는다. 둘 다 이 스크립트 밖에 있다.
 *
 * ⚠️ 이 자는 **그 회차의 부하**를 잰다. 한가할 때 돌린 출력으로 재면 여유가 실제보다
 *    넉넉해 보인다 — 판정에 쓸 출력은 **전체 게이트**의 것이어야 한다.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const outPath = process.argv[2];
if (!outPath) {
  console.error(
    "쓰임: node scripts/qa/audit-test-timeout-margin.mjs <게이트 출력 파일>",
  );
  process.exit(2);
}

const CEILING = 20000; // vitest.config.mts testTimeout
/** 천장의 이 비율을 넘으면 「붙어 있다」. 0.4 = 8초 — 부하가 2.5배면 넘는다. */
const RISK = 0.4;

const text = readFileSync(outPath, "utf8");

/** 파일 줄: ` ✓ src/__tests__/... (N tests) 123ms` — 시험 줄보다 들여쓰기가 얕다. */
const FILE_LINE = /^\s*[✓×❯↓]\s+(src\/__tests__\/\S+\.tsx?)\s/;
/** 시험 줄: `     ✓ 이름  1234ms` */
const TEST_LINE = /^\s*[✓×]\s+(.*?)\s{1,2}(\d+)ms\s*$/;

let currentFile = null;
const risky = [];
for (const raw of text.split("\n")) {
  const line = raw.replace(/\r$/, "");
  const f = FILE_LINE.exec(line);
  if (f) {
    currentFile = f[1];
    continue;
  }
  const t = TEST_LINE.exec(line);
  if (!t || !currentFile) continue;
  const ms = Number(t[2]);
  if (ms < CEILING * RISK) continue;
  risky.push({ file: currentFile, name: t[1].trim(), ms });
}

/** 그 시험 블록이 자기 타임아웃을 달고 있나 — 소스에서 읽는다. */
function hasOwnTimeout(file, name) {
  let src;
  try {
    src = readFileSync(join(process.cwd(), file), "utf8");
  } catch {
    return null; // 파일을 못 읽으면 판정하지 않는다
  }
  const lines = src.split("\n");
  // 이름이 별표·기호를 포함하므로 「그 이름이 든 it( 줄」을 찾는다.
  const key = name.replace(/\*\*/g, "");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const bare = lines[i].replace(/\*\*/g, "");
    if (/\b(it|test)(\.\w+)?\s*\(/.test(bare) && bare.includes(key.slice(0, 24))) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  const indent = lines[start].match(/^\s*/)[0];
  for (let i = start + 1; i < Math.min(lines.length, start + 400); i++) {
    // 같은 들여쓰기의 닫는 줄
    if (lines[i].startsWith(`${indent}}`)) {
      return /\},\s*[\d_]+\s*\)/.test(lines[i]);
    }
  }
  return null;
}

const rows = risky
  .map((r) => ({ ...r, own: hasOwnTimeout(r.file, r.name) }))
  .sort((a, b) => b.ms - a.ms);

const naked = rows.filter((r) => r.own === false);
const unknown = rows.filter((r) => r.own === null);

console.log(
  `천장 ${CEILING}ms · 「붙어 있다」 기준 ${CEILING * RISK}ms 이상\n` +
    `걸린 시험 ${rows.length}건 — 자기 타임아웃 있음 ${rows.length - naked.length - unknown.length} · ` +
    `없음 ${naked.length} · 판정 불가 ${unknown.length}\n`,
);

if (naked.length) {
  console.log("🔴 자기 타임아웃이 없어 부하가 걸리면 터질 것:");
  for (const r of naked)
    console.log(
      `   ${String(r.ms).padStart(6)}ms  ${(r.ms / CEILING).toFixed(2)}× 천장  ${r.file}\n              ${r.name}`,
    );
}
if (unknown.length) {
  console.log(
    "\n⚠️ 소스에서 그 블록을 못 찾아 판정하지 않았다(이름이 동적이거나 중첩이 깊다):",
  );
  for (const r of unknown) console.log(`   ${r.ms}ms  ${r.file} — ${r.name}`);
}
if (!naked.length && !unknown.length)
  console.log("✅ 천장에 붙은 시험은 전부 자기 타임아웃을 달고 있다.");

// ⚠️ 이 자가 **못 보는 것**: 게이트 출력에 안 찍힌 시험(건너뛴 것·워커째 죽은 파일)은
//    여기서도 0이다. 「붙은 게 없다」는 「그 회차에 돈 것 중에 없다」는 뜻이다.
process.exitCode = naked.length ? 1 : 0;
