/**
 * 변이 시험 — `midTypesB.test.ts` 의 축이 **정말 무는가**. (내 파일)
 *
 * 판정 순서(CLAUDE.md 2026-08-20·08-21·08-23):
 *   ㉠ **음성 대조** — 변이를 넣기 전에 그 시험이 초록인가 (아니면 판정 거부)
 *   ⑴ 앵커가 정확히 하나인가                 (아니면 판정 거부)
 *   ⑵ 파일이 바뀌었나                        (아니면 판정 거부)
 *   ⑶ **산출물이 바뀌었나**                   (아니면 판정 거부 — 뜻이 안 바뀐 변이)
 *   ⑷ 그제서야 시험이 빨개지나 + **실패 이름을 댈 수 있나**
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다 — `git show HEAD:` 로 되돌리면
 * 미커밋 수정을 덮는다(2026-08-23 에 실제로 그랬다). 그래서 대상 파일이 커밋돼
 * 있는지도 먼저 본다.
 */
import { execFileSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TEST = "src/__tests__/unit/midTypesB.test.ts";

/** 산출물 지문 — 이 유형들을 뽑아 글자로 잇는다. */
function fingerprint() {
  const out = execFileSync(
    "npx",
    ["tsx", "scratch/mid-b-snapshot-keys.ts"],
    { encoding: "utf8", maxBuffer: 1 << 28, shell: true },
  );
  return out;
}

function runTest() {
  try {
    const out = execSync(
      `npx vitest run --reporter=json --outputFile=scratch/mut-result.json ${TEST}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 28 },
    );
    void out;
  } catch {
    /* 종료 코드는 아래 json 으로 판정한다 */
  }
  const r = JSON.parse(readFileSync("scratch/mut-result.json", "utf8"));
  const failed = [];
  for (const f of r.testResults ?? [])
    for (const a of f.assertionResults ?? [])
      if (a.status === "failed") failed.push(a.fullName ?? a.title);
  return { ok: r.numFailedTests === 0 && r.numTotalTests > 0, failed, total: r.numTotalTests };
}

const MUTATIONS = [
  ["값: 닮은 삼각형 넓이 +1", "src/lib/middle/m2GeoSim.ts",
   "        const area = p * p * k;\n        const x = q * q * k;",
   "        const area = p * p * k;\n        const x = q * q * k + 1;"],
  ["값: 순환마디 자리 뒤집기", "src/lib/middle/midSupB.ts",
   "const digit = n % 2 === 1 ? a : b;", "const digit = n % 2 === 1 ? b : a;"],
  ["지면: `\\\\ne` 를 홑 백슬래시로", "src/lib/middle/m1Expr.ts",
   "`$${a}\\\\ne 0$이므로", "`$${a}\\ne 0$이므로"],
  ["지면: cases 줄바꿈을 홑으로", "src/lib/middle/midSupB.ts",
   "{cases}x+y=${a}\\\\\\\\x-y=${b}\\\\end", "{cases}x+y=${a}\\\\x-y=${b}\\\\end"],
  ["지면: 조사를 «를» 로 고정", "src/lib/middle/m2Rational.ts",
   "$${eulReul(a)} 계산하시오.`", "$를 계산하시오.`"],
  ["지면: 숫자를 수식 밖으로", "src/lib/middle/midSupB.ts",
   "소수점 아래 $${n}$번째 자리의 숫자", "소수점 아래 ${n}번째 자리의 숫자"],
];

const dirty = execSync(
  `git status --porcelain -- ${[...new Set(MUTATIONS.map((m) => m[1]))].join(" ")} ${TEST}`,
  { encoding: "utf8" },
).trim();
if (dirty) {
  console.error(`🔴 대상 파일에 미커밋 수정이 있다 — 이 도구는 덮어쓴다:\n${dirty}`);
  process.exit(1);
}

console.log("㉠ 음성 대조 — 변이 전 시험이 초록인가…");
const base = runTest();
if (!base.ok) {
  console.error(`🔴 기준 시험이 이미 빨갛다(${base.failed.slice(0, 3)}) — 판정 거부`);
  process.exit(1);
}
console.log(`   ✅ ${base.total} tests 초록`);
const baseFp = fingerprint();

let verdictBad = 0;
for (const [name, file, from, to] of MUTATIONS) {
  const original = readFileSync(file);
  const src = original.toString("utf8");
  const count = src.split(from).length - 1;
  if (count !== 1) {
    console.log(`⚠️  ${name} — 앵커가 ${count}개다. **판정 거부**`);
    verdictBad += 1;
    continue;
  }
  writeFileSync(file, src.replace(from, to), "utf8");
  try {
    if (readFileSync(file).equals(original)) {
      console.log(`⚠️  ${name} — 파일이 안 바뀌었다. **판정 거부**`);
      verdictBad += 1;
      continue;
    }
    const fp = fingerprint();
    if (fp === baseFp) {
      console.log(`⚠️  ${name} — **산출물이 그대로다**. 뜻이 안 바뀐 변이. 판정 거부`);
      verdictBad += 1;
      continue;
    }
    const r = runTest();
    if (r.ok) {
      console.log(`🟢 ${name} — 초록 ← **가드가 아니다**`);
      verdictBad += 1;
    } else if (r.failed.length === 0) {
      console.log(`⚠️  ${name} — 빨간데 실패 이름을 못 댄다. 판정 거부`);
      verdictBad += 1;
    } else {
      console.log(`🔴 ${name} — 가드가 문다`);
      for (const f of r.failed.slice(0, 2)) console.log(`      ↳ ${f}`);
    }
  } finally {
    writeFileSync(file, original);
  }
}
console.log(
  verdictBad === 0
    ? `\n✅ 변이 ${MUTATIONS.length}개 전부 빨강 — 축이 살아 있다`
    : `\n🔴 판정 못 한 변이 ${verdictBad}개`,
);
process.exit(verdictBad === 0 ? 0 : 1);
