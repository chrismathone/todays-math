/**
 * `probe-middle-combo` 의 눈금이 어긋난 **원인을 가른다**. (내 파일)
 *
 * 물음: 「갈래 B 가 지은 유형이 나빠서인가」 vs 「등록 유형이 **늘어서**인가」.
 * 재는 법: `generate.ts` 에서 `...MID_SUP_B` 한 줄만 빼고(=873유형) 말뭉치·어휘를
 * 다시 만들어 판정기를 돌린다. 그때 눈금이 통과하면 원인은 **수**이지 내용이 아니다.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**. 대상 파일에 미커밋 수정이 있으면
 * 시작하지 않는다(2026-08-23 에 그 자리에서 남의 수정을 덮었다).
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const GEN = "src/lib/middle/generate.ts";

const dirty = execSync(`git status --porcelain -- ${GEN}`, {
  encoding: "utf8",
}).trim();
if (dirty) {
  console.error(`🔴 ${GEN} 에 미커밋 수정이 있다 — 이 도구는 덮어쓴다`);
  process.exit(1);
}

function run(cmd) {
  try {
    return { ok: true, out: execSync(cmd, { encoding: "utf8", maxBuffer: 1 << 28 }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const original = readFileSync(GEN);
try {
  const src = original.toString("utf8");
  const anchor = "  ...MID_SUP_B,\n";
  if (!src.includes(anchor)) {
    console.error("🔴 앵커를 못 찾았다");
    process.exit(1);
  }
  writeFileSync(GEN, src.replace(anchor, ""), "utf8");
  console.log("── 보강 유형을 뺀 채(873유형) 말뭉치·어휘를 다시 만든다…");
  const a = run("npx tsx scripts/qa/build-middle-corpus.ts");
  console.log(a.out.split("\n").filter((l) => l.includes("집계")).join("\n"));
  run("npx tsx scripts/qa/census-middle-solution-vocab.ts");
  const p = run("npx tsx scripts/qa/probe-middle-combo.ts");
  const gauge = p.out.split("\n").filter((l) => l.includes("눈금")).join("\n");
  console.log(gauge);
  console.log(
    p.ok
      ? "\n✅ 873유형에서는 눈금이 통과한다 → 원인은 **유형이 늘어난 것**이다(내용이 아니다)"
      : "\n🔴 873유형에서도 눈금이 어긋난다 → 원인이 다른 데 있다",
  );
} finally {
  writeFileSync(GEN, original);
  console.log("\n── 되돌렸다. 말뭉치·어휘는 다시 만들어야 한다:");
  console.log("   npx tsx scripts/qa/build-middle-corpus.ts");
  console.log("   npx tsx scripts/qa/census-middle-solution-vocab.ts");
}
