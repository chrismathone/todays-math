/**
 * 판정형(`src/lib/middle/judge/`) 변이 시험 — **가드는 망가뜨려 봐야 가드인 줄 안다** (2026-10-08 엔진 보강 1단계).
 *
 * 판정은 세 단계다(2026-08-20·21 교훈):
 *   ⑴ 파일이 정말 바뀌었나        — 안 바뀌면 판정하지 않는다
 *   ⑵ **산출물이 정말 바뀌었나**  — 안 바뀌면 «뜻이 안 바뀐 변이»다. 판정 거부(`judge-digest.ts`)
 *   ⑶ 그제서야 시험이 빨개지나
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다(`git show HEAD:` 로 짜면 미커밋 수정을 먹는다 — 2026-08-23).
 * 그래서 대상 파일에 미커밋 수정이 있으면 아무것도 안 하고 멈춘다.
 *
 *   node scripts/qa/mutate-judge.mjs [번호 …]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const REGISTRY = "src/lib/middle/judge/registry.ts";
const ADDSUB = "src/lib/middle/judge/addSub.ts";
const TARGETS = [REGISTRY, ADDSUB];
const TESTS = [
  "src/__tests__/unit/judgeAddSub.test.ts",
  "src/__tests__/unit/judgeRegistry.test.ts",
  "src/__tests__/unit/loadJudgeRows.test.ts",
];

/** 변이 — 「거짓 보기를 참으로」를 앞에, 순열 · 해설 · 어댑터 · 까닭 · 꼴 · 부호 상한을 고루. */
const MUTATIONS = [
  {
    name: "거짓 보기를 참으로",
    why: "틀린 보기의 오른쪽에 참값을 찍는다(주장은 그대로 «거짓») — 관문이 다시 재서 멈춰야 한다",
    file: ADDSUB,
    find: "    text: `$${lhsTex(e.terms)}=${texQ(shown)}$`,",
    to: "    text: `$${lhsTex(e.terms)}=${texQ(e.value)}$`,",
  },
  {
    name: "물음 뒤집기",
    why: "«옳지 않은 것» 물음에서 참을 «다른 하나»로 읽는다",
    file: REGISTRY,
    find: '  return ask === "옳지 않은 것" ? !truth : truth;',
    to: '  return ask === "옳지 않은 것" ? truth : !truth;',
  },
  {
    name: "보기를 안 섞는다",
    why: "정답이 늘 ① — 보기 순열이 사라진다",
    file: REGISTRY,
    find: "  const order = shuffled(rng, body.options);",
    to: "  const order = [...body.options];",
  },
  {
    name: "해설이 순열을 안 따라간다",
    why: "해설 줄을 생성기 차례로 적는다 — 보기 ③ 의 해설이 다른 보기를 말한다",
    file: REGISTRY,
    find: "    ...order.map((o, i) => `${CHOICE_MARKS[i]} ${o.explain.trim()}`),",
    to: "    ...body.options.map((o, i) => `${CHOICE_MARKS[i]} ${o.explain.trim()}`),",
  },
  {
    name: "정답 번호를 첫 자리로",
    why: "다시 잰 «다른 하나»와 상관없이 ① 을 정답으로 적는다",
    file: REGISTRY,
    find: "  const answer = CHOICE_MARKS[odd[0]!]!;",
    to: "  const answer = CHOICE_MARKS[0]!;",
  },
  {
    name: "어댑터 부호 틀림(뺄셈)",
    why: "원천 03 의 facts 로 식을 세울 때 빼기를 더하기로 — 어댑터의 되계산이 멈춰야 한다",
    file: ADDSUB,
    find: '  { op: "-", v: fq(f, "b") },',
    to: '  { op: "+", v: fq(f, "b") },',
  },
  {
    name: "까닭과 값이 어긋남",
    why: "«빼는 수의 부호를 바꾸지 않고 더한 값»이라 적고 다른 값(부호 반대)을 찍는다",
    file: ADDSUB,
    find: "      value: evalTerms(wrong),",
    to: "      value: negQ(evalTerms(wrong)),",
  },
  {
    name: "꼴을 안 맞춘다",
    why: "분수 항의 수 · 결과 종류가 다른 재료가 한 문항에 섞인다",
    file: ADDSUB,
    find: "    const shape = shapeOf(e);",
    to: '    const shape = "같은 꼴";',
  },
  {
    name: "부호 반대 상한을 푼다",
    why: "한 문항에 «결과 부호 반대» 보기가 둘 이상 — 부호만 보고 지워 낸다",
    file: ADDSUB,
    find: "      : chooseMistake(rng, e, e.value.d === 1, !b.signUsed);",
    to: "      : chooseMistake(rng, e, e.value.d === 1, true);",
  },
  {
    name: "오른쪽 값 겹침 허용",
    why: "식이 달라도 오른쪽 값이 같은 보기 둘",
    file: ADDSUB,
    find: "    if (b.rights.has(right)) continue;",
    to: "    if (false) continue;",
  },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function digest() {
  const r = spawnSync("npx", ["tsx", "scripts/qa/judge-digest.ts"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) return `DIGEST-FAILED:${(r.stderr || "").slice(0, 200)}`;
  return r.stdout.trim();
}

function runTest() {
  const r = spawnSync("npx", ["vitest", "run", ...TESTS], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

const only = new Set(
  process.argv
    .slice(2)
    .filter((a) => /^\d+$/.test(a))
    .map(Number),
);

const dirty = sh("git", ["status", "--porcelain", "--", ...TARGETS]);
if (dirty !== "") {
  console.error("🛑 대상 파일에 커밋 안 된 수정이 있습니다 — 이 스크립트는 그 파일을 덮어씁니다.");
  console.error(dirty);
  process.exit(2);
}

const original = Object.fromEntries(TARGETS.map((f) => [f, readFileSync(f)]));
const restoreAll = () => {
  for (const f of TARGETS) writeFileSync(f, original[f]);
};

console.log("기준 상태를 잽니다…");
const baseDigest = digest();
if (baseDigest.startsWith("DIGEST-FAILED")) {
  console.error(`🛑 기준 산출물을 못 냈습니다: ${baseDigest}`);
  process.exit(2);
}
if (runTest() !== 0) {
  console.error("🛑 기준 시험이 이미 빨갛습니다 — 변이를 판정할 수 없습니다.");
  process.exit(2);
}
console.log(`기준 지문 ${baseDigest}\n기준 시험 초록\n`);

const results = [];
try {
  MUTATIONS.forEach((m, idx) => {
    const no = idx + 1;
    if (only.size > 0 && !only.has(no)) return;
    const src = original[m.file].toString("utf8");
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const find = m.find.split("\n").join(eol);
    const to = m.to.split("\n").join(eol);
    const hits = src.split(find).length - 1;
    if (hits !== 1) {
      results.push({ no, name: m.name, verdict: `🛑 앵커 ${hits}개 — 판정 불가` });
      console.log(`🛑 [${no}] ${m.name}: 앵커가 ${hits}개입니다. 판정하지 않습니다.`);
      return;
    }
    writeFileSync(m.file, Buffer.from(src.replace(find, to), "utf8"));
    try {
      // ⑴ 파일이 바뀌었나
      if (readFileSync(m.file).equals(original[m.file])) {
        results.push({ no, name: m.name, verdict: "🛑 파일이 안 바뀜 — 판정 거부" });
        return;
      }
      // ⑵ 산출물이 바뀌었나
      const d = digest();
      if (d === baseDigest) {
        results.push({ no, name: m.name, verdict: "🛑 산출물이 그대로 — 판정 거부" });
        console.log(`🛑 [${no}] ${m.name}: 산출물이 그대로입니다. 판정 거부.`);
        return;
      }
      // ⑶ 시험이 빨개지나
      const verdict =
        runTest() !== 0 ? "🔴 빨강 (가드가 산다)" : "🟢 초록 ← 가드가 아니다";
      results.push({ no, name: m.name, verdict });
      console.log(`${verdict}  [${no}] ${m.name} — ${m.why}`);
    } finally {
      writeFileSync(m.file, original[m.file]);
    }
  });
} finally {
  restoreAll();
}

const same = TARGETS.every((f) => readFileSync(f).equals(original[f]));
console.log(`\n원복 확인: ${same ? "바이트 동일 ✓" : "🛑 다르다"}`);
console.log(`원복 후 git status: ${sh("git", ["status", "--porcelain", "--", ...TARGETS]) || "깨끗 ✓"}`);

const red = results.filter((r) => r.verdict.startsWith("🔴")).length;
console.log(`\n빨강 ${red} / 판정한 변이 ${results.length}`);
for (const r of results) console.log(`  ${r.verdict}  [${r.no}] ${r.name}`);
process.exit(results.every((r) => r.verdict.startsWith("🔴")) ? 0 : 1);
