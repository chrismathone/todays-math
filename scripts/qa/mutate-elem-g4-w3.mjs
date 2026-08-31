/**
 * 변이 하네스 — 초4 셋째 물결(`1-5`·`1-6`·`2-4`) 확대 갈래의 가드가
 * **망가뜨리면 빨개지는가**.
 *
 * 순서(이 저장소가 쌓아 온 그대로):
 *   ⑴ 대상 파일이 **커밋돼 있는가** — 이 스크립트는 그 파일을 덮어쓴다.
 *   ⑵ 변이 **전에** 시험이 초록인가(음성 대조) — 아니면 판정을 거부한다.
 *   ⑶ 치환이 **정확히 한 자리**에 먹었는가 — 안 먹었으면 판정하지 않는다.
 *   ⑷ **산출물이 바뀌었는가** — 파일이 바뀐 것과 동작이 바뀐 것은 다르다.
 *   ⑸ 그제서야 시험이 빨개지나. 빨간데 **실패한 시험을 못 대면** 판정을 거부한다.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**(`git show HEAD:` 가 아니다 —
 * 그러면 커밋 안 된 수정을 덮는다, 2026-08-23).
 *
 * ⚠️ 앵커의 줄끝은 **파일에서 읽어 맞춘다.** autocrlf 저장소라 LF 앵커로 적은 여러 줄
 *    치환이 말없이 0곳이 될 수 있다. 그리고 앵커는 **prettier 가 접은 뒤의 모양**이어야 한다.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TARGET = "src/lib/elementary/g4.ts";
const TESTS = [
  "src/__tests__/unit/elemTiersG4W3Deep.test.ts",
  // 확대를 채우면 그 대단원의 기존 시험도 `tiersOf` 로 새 갈래를 덮는다 — 같이 잰다.
  "src/__tests__/unit/elemTiersG4Expand.test.ts",
  "src/__tests__/unit/elemTiersG4Pattern.test.ts",
  "src/__tests__/unit/elemTiersG4Quad.test.ts",
];

const MUTATIONS = [
  {
    // 심화중의 **마디**를 닫는다 — 굳지 않는 후보가 둘 이상 살아남는다.
    label: "1-5-1 밭 — 「둘째로 작은 값 + $k$ 가 축을 넘는다」를 안 건다",
    from: "        if (v3 - v1 > v4 - v2) out.push({ scale, total, sorted, hideRank: 2 });",
    to: "        if (v3 - v1 > 0) out.push({ scale, total, sorted, hideRank: 2 });",
  },
  {
    // 굳히는 성질이 **지면에서 거짓말**을 하게 만든다 — 발문은 「$M$명까지」인데 축은 더 높다.
    label: "1-5-1 그림 — 축 맨 위를 발문이 말한 눈금 상한보다 한 칸 올린다",
    from: "    yMax: top,",
    to: "    yMax: top + f.scale.step,",
  },
  {
    // 심화중의 굳히는 성질(「한 칸은 모든 막대에 같다」)을 **안 쓴다**.
    label: "1-5-2 심화중 — 두 후보 가운데 성질을 안 보고 그냥 첫째를 고른다",
    from: "          const unitSize = alive[0]!;",
    to: "          const unitSize = cands[0]!;",
  },
  {
    // 심화상의 「성질 ㉠ 이 실제로 무언가를 죽인다」를 끈다 — 한 성질이 장식이 된다.
    label: "1-5-2 심화상 밭 — ㉠(모든 막대에 같다)이 아무도 안 죽여도 넣는다",
    from: "            if (cands.length <= alive.length) continue; // ㉠ 이 아무도 안 죽인다",
    to: "            if (cands.length < 0) continue; // ㉠ 이 아무도 안 죽인다",
  },
  {
    // 심화상의 「남은 하나가 극값이 아니다」를 끈다 — 극값이면 한 줄로 집혀 심화중이다.
    label: "1-5-2 심화상 밭 — 남는 하나가 후보 무리의 가장 큰 값이어도 넣는다",
    from: "            if (unitSize === Math.max(...cands)) continue;",
    to: "            if (unitSize === -1) continue;",
  },
  {
    // 심화중의 「한 자리 수가 정확히 하나」를 깬다 — 답이 여럿이 된다.
    label: "1-6-1 밭 — 첫째가 «$d$ 보다 큰 한 자리 수»여도 넣는다 (후보가 둘 이상)",
    from: "      for (let first = Math.max(1, 10 - step); first <= step; first += 1) {",
    to: "      for (let first = Math.max(1, 10 - step); first <= 9; first += 1) {",
  },
  {
    // 심화상의 「창 안에 답이 하나」를 깬다.
    label: "1-6-2 밭 — 창 안에 합에 닿는 개수가 둘 이상이어도 넣는다",
    from: "            if (clash) continue;",
    to: "            if (!clash) continue;",
  },
  {
    // 심화상의 「후보가 셋 이상」을 깬다 — 둘이면 «만들어 견주기»가 아니라 «둘 중 고르기»다.
    label: "1-6-2 밭 — 창 안 후보가 셋 미만이어도 넣는다",
    from: "            if (width < 3 || width > 6) continue;",
    to: "            if (width < 1 || width > 6) continue;",
  },
  {
    // 심화중의 굳히는 성질(홀짝)을 **거꾸로** 읽는다.
    label: "2-4-2 심화중 — 수직 꺾임의 홀짝을 뒤집는다",
    from: "  const answer = lowerIsOddTurns === lastPerp ? lower : upper;",
    to: "  const answer = lowerIsOddTurns !== lastPerp ? lower : upper;",
  },
  {
    // 심화중의 조건이 **아무것도 안 죽이는** 자리를 넣는다 — 답이 둘이 된다.
    label: "2-4-3 밭 — 차가 «가–나»보다 길어도 넣는다 (조건이 안 문다)",
    from: "      if (far >= near * 2) continue; // 차가 near 보다 짧아야 조건이 문다",
    to: "      if (far >= near * 20) continue; // 차가 near 보다 짧아야 조건이 문다",
  },
  {
    // 심화중의 마디가 **안 갈리는** 자리를 넣는다 — 네 변이 다 같아도 합이 맞는다.
    label: "2-4-5 — 나머지 두 변이 잰 두 변과 같아도 넣는다 (마디가 안 갈린다)",
    from: "    Array.from({ length: 12 }, (_, i) => i + 3).filter((v) => v !== same),",
    to: "    Array.from({ length: 12 }, (_, i) => i + 3).filter((v) => v !== -1),",
  },
  {
    // 굳히는 계산(합의 $4$분의 $1$)이 **지면에 안 떨어지는** 자리를 넣는다.
    label: "2-4-7 — 네 변의 합이 $4$로 나누어떨어지지 않아도 넣는다",
    from: "      (v) => v !== side && (v + side) % 2 === 0,",
    to: "      (v) => v !== side,",
  },
  {
    // 등록 가드 — 비운 자리를 **조용히 채운다**.
    label: "1-5-3(비움)에 심화중을 몰래 붙인다",
    from: '  "초4|1-5-3": {\n    연산: tier53Calc,\n    기본: tier53Basic,\n    응용: tier53Apply,\n    심화하: tier53Deep,\n  },',
    to: '  "초4|1-5-3": {\n    연산: tier53Calc,\n    기본: tier53Basic,\n    응용: tier53Apply,\n    심화하: tier53Deep,\n    심화중: tier51Mid,\n  },',
  },
  {
    // 등록 가드 — 「핵심 넷이 다 있나」가 확대를 채운 뒤에도 «아니오»를 낼 수 있나.
    label: "2-4-3 등록에서 **핵심 갈래 하나**(심화하)를 뺀다",
    from: "    심화하: tier243Deep,\n    심화중: tier243Mid,",
    to: "    심화중: tier243Mid,",
  },
];

/** 지금 산출물 — 「파일이 바뀌었다」와 「동작이 바뀌었다」를 가르는 지문. */
function fingerprint() {
  return execFileSync("npx", ["tsx", "scripts/qa/fingerprintElemG4W3.ts"], {
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runTests() {
  try {
    execFileSync("npx", ["vitest", "run", ...TESTS], {
      encoding: "utf8",
      shell: true,
      stdio: "pipe",
      maxBuffer: 64 * 1024 * 1024,
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

// ⑵ 음성 대조 — 변이 전에 초록이어야 판정에 도달한다 (루프 밖 1회)
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
