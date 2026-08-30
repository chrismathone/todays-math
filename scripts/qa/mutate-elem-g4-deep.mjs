/**
 * 변이 하네스 — 초4 1-3 확대 갈래(D-113 **되짚기 축**)의 가드가 **망가뜨리면 빨개지는가**.
 *
 * 순서(이 저장소가 쌓아 온 그대로):
 *   ⑴ 대상 파일이 **커밋돼 있는가** — 이 스크립트는 그 파일을 덮어쓴다.
 *   ⑵ 변이 **전에** 시험이 초록인가(음성 대조) — 아니면 판정을 거부한다.
 *   ⑶ 치환이 **정확히 한 자리**에 먹었는가 — 안 먹었으면 판정하지 않는다.
 *   ⑷ **산출물이 바뀌었는가** — 파일이 바뀐 것과 동작이 바뀐 것은 다르다.
 *   ⑸ 그제서야 시험이 빨개지나.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**(git show HEAD: 가 아니다 —
 * 그러면 커밋 안 된 수정을 덮는다, 2026-08-23).
 *
 * ⚠️ 앵커의 줄끝은 **파일에서 읽어 맞춘다.** autocrlf 저장소라 `git checkout` 한 번이면
 *    대상이 CRLF 가 되고, LF 앵커로 적은 여러 줄 치환이 **말없이 0곳**이 된다
 *    (실측으로 다섯이 그렇게 죽었다 — ⑶ 이 없었으면 「가드가 아니다」로 읽었을 것이다).
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
    // 심화중의 마디를 **닫는다** — 후보가 하나면 「가장 큰/작은」이 아무 일도 안 한다(=심화하).
    label: "1-3-4 심화중 — 「가장 큰 나머지」를 고정값으로 박아 마디를 닫는다",
    from: "  const q = intBetween(rng, 2, 9);\n  const r = b - 1;\n  const x = b * q + r;",
    to: "  const q = intBetween(rng, 2, 9);\n  const r = b - 2;\n  const x = b * q + r;",
  },
  {
    // 심화중의 답을 반대쪽 극값으로 — 조건을 거꾸로 읽는다.
    label: "1-3-1 심화중 — 「가장 작은」을 「가장 큰」으로 뒤집는다",
    from: "  const m = five ? Math.ceil(10000 / b) : Math.floor(9999 / b);",
    to: "  const m = five ? Math.floor(9999 / b) : Math.ceil(10000 / b);",
  },
  {
    // 심화상의 창을 넓혀 **하나가 안 남게** 한다.
    label: "1-3-1 심화상 — 범위를 이웃 몇십까지 넓힌다(둘 이상 남는다)",
    from: "  const low = Math.floor(p / 100) * 100 - 100 * intBetween(rng, 1, 8);\n  const high = Math.ceil(p / 100) * 100 + 100 * intBetween(rng, 1, 8);",
    to: "  const low = Math.floor(p / 100) * 100 - 100 * intBetween(rng, 1, 8) - a * 20;\n  const high = Math.ceil(p / 100) * 100 + 100 * intBetween(rng, 1, 8) + a * 20;",
  },
  {
    // 심화상의 답을 **후보 무리의 끝**으로 민다 — 끝이면 조건 한 번으로 집히므로 심화중이다.
    label: "1-3-2 심화상 — 곱하는 수를 두 자리 수의 **맨 끝**(99)으로 박는다",
    from: "  const a = intBetween(rng, 123, 897);\n  const k = twoDigit(rng);\n  const p = a * k;",
    to: "  const a = intBetween(rng, 123, 897);\n  const k = 99;\n  const p = a * k;",
  },
  {
    // 심화상의 후보를 **발문이 주게** 한다 — 되짚기가 만든 것이 아니게 된다.
    label: "1-3-7 심화상 — 나누는 수가 어림값 그 자체인 자리도 낸다(답이 발문에 적힌다)",
    from: "      if (divs.length === 1 && divs[0] !== bb) rows.push({ bb, a, d: divs[0]! });",
    to: "      if (divs.length === 1) rows.push({ bb, a, d: divs[0]! });",
  },
  {
    // 심화상이 **하나로 안 굳는** 밭을 쓰게 한다.
    label: "1-3-6 심화상 — 답이 둘 이상인 자리도 밭에 넣는다",
    from: "          if (hits === 1 && only === b) out.push({ b, q, r, n });",
    to: "          if (hits >= 1 && only !== 0) out.push({ b, q, r, n });",
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
  return execFileSync("npx", ["tsx", "scripts/qa/fingerprintElemG4Deep.ts"], {
    encoding: "utf8",
    shell: true,
  });
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
    return {
      green: false,
      out: String(e.stdout ?? "") + String(e.stderr ?? ""),
    };
  }
}

// ⑴ 대상이 커밋돼 있는가
const dirty = execFileSync("git", ["status", "--porcelain", "--", TARGET], {
  encoding: "utf8",
});
if (dirty.trim() !== "") {
  console.error(
    `🛑 ${TARGET} 에 커밋 안 된 수정이 있다 — 이 스크립트는 그 파일을 덮어쓴다.`,
  );
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
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    m = {
      ...m,
      from: m.from.split("\n").join(eol),
      to: m.to.split("\n").join(eol),
    };
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
      console.log(`GREEN ${m.label}\n     초록 <- **가드가 아니다**`);
      verdictBad += 1;
    } else if (failed.length === 0) {
      console.log(
        `⛔ ${m.label}\n     빨간데 실패한 시험을 못 댄다 — 판정하지 않는다`,
      );
      verdictBad += 1;
    } else {
      console.log(
        `RED   ${m.label}\n     -> ${[...new Set(failed)].slice(0, 3).join("\n     -> ")}`,
      );
    }
    writeFileSync(TARGET, ORIGINAL);
  }
} finally {
  writeFileSync(TARGET, ORIGINAL);
}

console.log(`\n변이 ${MUTATIONS.length}건 — 판정 못 하거나 초록 ${verdictBad}건`);
process.exit(verdictBad === 0 ? 0 : 1);
