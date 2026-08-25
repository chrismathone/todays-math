/**
 * 「천장에 붙은 시험」에 **자기 타임아웃**을 달아 준다 (기본 드라이런).
 *
 *   node scripts/qa/pin-slow-test-timeouts.mjs            # 무엇을 고칠지만 찍는다
 *   node scripts/qa/pin-slow-test-timeouts.mjs --apply
 *
 * 짝: `audit-test-timeout-margin.mjs` 가 **무엇이 붙어 있는지** 세고, 이쪽이 고친다.
 * 목록은 손으로 적되 **그 자가 낸 것**을 옮겨 적는다 — 값을 바꾸려면 자를 다시 돌려라.
 *
 * ⚠️ 닫는 줄을 **들여쓰기로** 찾는다. 같은 들여쓰기의 `});` 가 그 블록의 끝이다.
 *    이미 `}, 60_000);` 처럼 값이 달려 있으면 **건드리지 않는다**(두 번 돌려도 같다).
 */
import { readFileSync, writeFileSync } from "node:fs";

const APPLY = process.argv.includes("--apply");
const TIMEOUT = "60_000";

/**
 * audit-test-timeout-margin.mjs 가 게이트 출력에서 낸 것들.
 *  · 2026-08-24 회차 9건
 *  · 2026-08-25 회차 5건 — 워크트리 넷이 동시에 돌던 날 ProblemBank 가 실제로
 *    관문에서만 빨개졌다(단독 59/59 통과). 그때 감사가 14.6초/13.4초를 짚었다.
 */
const TARGETS = [
  ["src/__tests__/unit/elementaryEngine.test.ts", "두 그래프 결합의 안쪽 스펙 두 장이 실제로 그려진다"],
  ["src/__tests__/unit/elementaryEngine.test.ts", "생성기가 붙인 그림 스펙은 모두 그려진다"],
  ["src/__tests__/unit/elementaryEngine.test.ts", "후반 학년 kind 표본이 SVG 를 낸다"],
  ["src/__tests__/unit/elementaryEngine.test.ts", "두 그래프 결합 갈래는 씨앗을 훑어도 모두 그려진다"],
  ["src/__tests__/unit/elementaryFigure.test.ts", "어느 kind 든 cm 라벨은 halo 치수 글자다"],
  ["src/__tests__/unit/elementaryFigure.test.ts", "각 전개도·겨냥도의 모든 점이 viewBox 안이다"],
  ["src/__tests__/unit/middleM2Func.test.ts", "그림 유형 셋의 figureSpec 이 실제로 그려진다"],
  ["src/__tests__/unit/middleM2Line.test.ts", "그림 유형 넷의 figureSpec 이 실제로 그려진다"],
  ["src/__tests__/unit/elemTiersG4Expand.test.ts", "1-5-2 갈래의 표가 실제로 그려진다"],
  ["src/__tests__/unit/middleM3Func.test.ts", "넓은 씨앗(60×3)에서도 42유형 전량이 던지지 않고 검산을 통과한다"],
  ["src/__tests__/components/ProblemBank.test.tsx", "AppChrome 내비와 학년/중단원/소단원/난이도/유형/상태 필터, 등록·생성을 보여 준다"],
  ["src/__tests__/components/ProblemBank.test.tsx", "목록에서 분수·도형 수식을 MathText로 렌더하고 [교체]는 없다"],
  ["src/__tests__/components/ProblemBank.test.tsx", "API가 돌려준 실제 단원 ID를 범위 피커와 등록 폼에 사용한다"],
  ["src/__tests__/unit/elementaryFigure.test.ts", "그림 스펙이 있는 무작위 문항은 전부 그려진다"],
];

let changed = 0;
let already = 0;
const misses = [];

for (const [file, needle] of TARGETS) {
  const src = readFileSync(file, "utf8");
  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const lines = src.split(/\r?\n/);

  const bare = (s) => s.replace(/\*\*/g, "");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\b(it|test)(\.\w+)?\s*\(/.test(lines[i]) && bare(lines[i]).includes(needle)) {
      start = i;
      break;
    }
  }
  if (start < 0) {
    misses.push(`${file} — 「${needle}」 시작 줄을 못 찾았다`);
    continue;
  }
  const indent = lines[start].match(/^\s*/)[0];
  let end = -1;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith(`${indent}}`)) {
      end = i;
      break;
    }
  }
  if (end < 0) {
    misses.push(`${file} — 「${needle}」 닫는 줄을 못 찾았다`);
    continue;
  }
  if (/\},\s*[\d_]+\s*\)/.test(lines[end])) {
    already++;
    continue;
  }
  if (!/^\s*\}\s*\)\s*;\s*$/.test(lines[end])) {
    misses.push(`${file}:${end + 1} — 닫는 줄 모양이 예상과 다르다: ${lines[end].trim()}`);
    continue;
  }
  console.log(`${file}:${end + 1}  ${lines[end].trim()} → }, ${TIMEOUT});   (${needle})`);
  lines[end] = `${indent}}, ${TIMEOUT});`;
  changed++;
  if (APPLY) writeFileSync(file, lines.join(eol), "utf8");
}

console.log(
  `\n고칠 것 ${changed}건 · 이미 달려 있음 ${already}건 · 못 찾음 ${misses.length}건${APPLY ? " — 적용함" : " (드라이런)"}`,
);
// 「못 찾음」은 조용히 넘기지 않는다 — 넘기면 「전부 고쳤다」로 읽힌다.
if (misses.length) {
  console.log("\n🔴 손대지 못한 것:");
  for (const m of misses) console.log(`   ${m}`);
  process.exitCode = 1;
}
