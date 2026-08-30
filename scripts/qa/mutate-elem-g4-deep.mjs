/**
 * 변이 하네스 — 초4 1-3 확대 갈래(D-113)의 가드가 **망가뜨리면 빨개지는가**.
 *
 * 순서(이 저장소가 2026-08-21 에 한 겹 더 붙인 것):
 *   ⑴ 대상 파일이 **커밋돼 있는가** — 이 스크립트는 그 파일을 덮어쓴다.
 *   ⑵ 변이 **전에** 시험이 초록인가(음성 대조) — 아니면 판정을 거부한다.
 *   ⑶ 치환이 **정확히 한 자리**에 먹었는가 — 안 먹었으면 판정하지 않는다.
 *   ⑷ **산출물이 바뀌었는가** — 파일이 바뀐 것과 동작이 바뀐 것은 다르다.
 *   ⑸ 그제서야 시험이 빨개지나.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**(git show HEAD: 가 아니다 —
 * 그러면 커밋 안 된 수정을 덮는다, 2026-08-23).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TARGET = "src/lib/elementary/g4.ts";
const TESTS = [
  "src/__tests__/unit/elemTiersG4MulDivDeep.test.ts",
  "src/__tests__/unit/elemTiersG4MulDiv.test.ts",
  // 확대를 채우면 **분모 가드**가 같이 움직인다 — 그 자리도 여기서 잰다.
  "src/__tests__/unit/elemGenCore.test.ts",
];

const MUTATIONS = [
  {
    label: "1-3-1 심화상 — 후보 24가지 중 **첫 하나**만 보고 최대·최소를 정한다",
    from: "  for (const a of arrangements(cards, 3)) {\n    const tens = cards.find((c) => !a.used.includes(c))! * 10;",
    to: "  for (const a of arrangements(cards, 3).slice(0, 1)) {\n    const tens = cards.find((c) => !a.used.includes(c))! * 10;",
  },
  {
    label: "1-3-3 심화상 — 카드를 넷에서 **셋**으로 줄인다(후보 12 → 6)",
    from: "    cards = drawCards(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 4);\n    field = roughPairField(cards);",
    to: "    cards = drawCards(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9], 3);\n    field = roughPairField(cards);",
  },
  {
    label: "1-3-7 심화상 — 나누어떨어지는 수가 **하나뿐인** 자리도 낸다",
    from: "      if (divs.length >= 2 && divs.length <= 4) rows.push({ bb, a, divs });",
    to: "      if (divs.length >= 1 && divs.length <= 4) rows.push({ bb, a, divs });",
  },
  {
    label: "1-3-4 심화중 — 「가장 큰 나머지」를 하나 작게 잡는다",
    from: "function tier34Mid(unit: UnitSeed, rng: Rng): ElemProblem {\n  const b = intBetween(rng, 2, 9) * 10;\n  const q = intBetween(rng, 2, 9);\n  const r = b - 1;",
    to: "function tier34Mid(unit: UnitSeed, rng: Rng): ElemProblem {\n  const b = intBetween(rng, 2, 9) * 10;\n  const q = intBetween(rng, 2, 9);\n  const r = b - 2;",
  },
  {
    label: "1-3-6 심화중 — 되짚기를 한 겹 빼고 발문에 있는 몫을 그대로 답한다",
    from: "      `구하시오.`,\n    n(q + 1),",
    to: "      `구하시오.`,\n    n(q),",
  },
  {
    label: "1-3-5 심화상 — 몫이 나머지의 배수인 자리를 **첫 하나**만 낸다",
    from: "  const vals = rs.map((r) => b * (r * k) + r);",
    to: "  const vals = rs.slice(0, 1).map((r) => b * (r * k) + r);",
  },
  {
    // 분모 가드 — 「핵심 넷이 다 있나」가 확대를 채운 뒤에도 «아니오»를 낼 수 있나.
    // (tsc 는 이것을 막지만 vitest 는 타입을 안 본다 — 그래서 여기서 잰다.)
    label: "1-3-1 등록에서 **핵심 갈래 하나**(심화하)를 뺀다",
    from: "    심화하: tier31Deep,\n    심화중: tier31Mid,",
    to: "    심화중: tier31Mid,",
  },
];

/** 지금 산출물 — 「파일이 바뀌었다」와 「동작이 바뀌었다」를 가르는 지문. */
function fingerprint() {
  return execFileSync(
    "npx",
    ["tsx", "scripts/qa/fingerprintElemG4Deep.ts"],
    { encoding: "utf8", shell: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } },
  );
}

function runTests() {
  try {
    execFileSync("npx", ["vitest", "run", ...TESTS], {
      encoding: "utf8",
      shell: true,
      stdio: "pipe",
    });
    return { green: true, out: "" };
  } catch (e) {
    return { green: false, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
}

// ⑴ 대상이 커밋돼 있는가
const dirty = execFileSync("git", ["status", "--porcelain", "--", TARGET], {
  encoding: "utf8",
});
if (dirty.trim() !== "") {
  console.error(`🛑 ${TARGET} 에 커밋 안 된 수정이 있다 — 이 스크립트는 그 파일을 덮어쓴다.`);
  process.exit(2);
}

const ORIGINAL = readFileSync(TARGET); // 바이트 그대로
const baseFingerprint = fingerprint();

// ⑵ 음성 대조 — 변이 전에 초록이어야 판정에 도달한다
const base = runTests();
if (!base.green) {
  console.error("🛑 기준 시험이 이미 빨갛다 — 판정을 거부한다.");
  console.error(base.out.slice(-2000));
  process.exit(2);
}
console.log("✅ 기준 초록 — 판정 시작\n");

let verdictBad = 0;
try {
  for (let m of MUTATIONS) {
    const src = ORIGINAL.toString("utf8");
    // ⚠️ **줄끝을 맞춘다.** 이 저장소는 autocrlf 라 `git checkout` 을 한 번만 거쳐도
    //    파일이 CRLF 가 된다. 앵커를 LF 로 적어 두면 여러 줄짜리 치환이 **말없이 0곳**
    //    이 되고, 하네스는 그것을 「판정 못 함」으로 찍는다(실제로 그렇게 다섯이 죽었다).
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    m = { ...m, from: m.from.split("\n").join(eol), to: m.to.split("\n").join(eol) };
    const hits = src.split(m.from).length - 1;
    if (hits !== 1) {
      console.log(`⛔ ${m.label}\n     치환 자리 ${hits}곳 — 판정하지 않는다`);
      verdictBad += 1;
      continue;
    }
    writeFileSync(TARGET, src.replace(m.from, m.to), "utf8");
    let mutFingerprint;
    try {
      mutFingerprint = fingerprint();
    } catch (e) {
      mutFingerprint = "생성이 죽었다: " + String(e.stdout ?? e);
    }
    if (mutFingerprint === baseFingerprint) {
      console.log(`⛔ ${m.label}\n     산출물이 그대로다 — 판정하지 않는다`);
      verdictBad += 1;
      writeFileSync(TARGET, ORIGINAL);
      continue;
    }
    const r = runTests();
    const failed = [...r.out.matchAll(/× ([^\n]*)/g)].map((x) => x[1].trim());
    if (r.green) {
      console.log(`🟢 ${m.label}\n     초록 ← **가드가 아니다**`);
      verdictBad += 1;
    } else if (failed.length === 0) {
      console.log(`⛔ ${m.label}\n     빨간데 실패한 시험을 못 댄다 — 판정하지 않는다`);
      verdictBad += 1;
    } else {
      console.log(`🔴 ${m.label}\n     ↳ ${[...new Set(failed)].slice(0, 3).join("\n     ↳ ")}`);
    }
    writeFileSync(TARGET, ORIGINAL);
  }
} finally {
  writeFileSync(TARGET, ORIGINAL);
}

console.log(`\n변이 ${MUTATIONS.length}건 — 판정 못 하거나 초록 ${verdictBad}건`);
process.exit(verdictBad === 0 ? 0 : 1);
