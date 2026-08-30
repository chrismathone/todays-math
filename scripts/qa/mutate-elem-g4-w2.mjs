/**
 * 변이 하네스 — 초4 둘째 물결(`2-3`·`2-6`·`2-1`) 확대 갈래의 가드가
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
  "src/__tests__/unit/elemTiersG4W2Deep.test.ts",
  // 확대를 채우면 그 대단원의 기존 시험도 `tiersOf` 로 새 갈래를 덮는다 — 같이 잰다.
  "src/__tests__/unit/elemTiersG4Dec.test.ts",
  "src/__tests__/unit/elemTiersG4Frac.test.ts",
  "src/__tests__/unit/elemTiersG4Poly.test.ts",
];

const MUTATIONS = [
  {
    // 심화중의 **굳히는 성질**을 발문과 어긋나게 한다 — 발문은 「첫째+둘째」인데 답은 첫째다.
    label: "2-3-1 심화중 — 셋째 자리 숫자를 「첫째+둘째」가 아니라 「첫째」로 만든다",
    from: "  const value = w * 1000 + a * 100 + b * 10 + s;",
    to: "  const value = w * 1000 + a * 100 + b * 10 + a;",
  },
  {
    // 심화중의 **조건이 하는 일**을 없앤다 — 어느 쪽을 골라도 같은 답이 된다.
    label: "2-3-3 심화중 — 「소수 한 자리 / 두 자리」와 상관없이 늘 같은 쪽을 고른다",
    from: "  const answer = asNatural ? two * 100 : two * 10;",
    to: "  const answer = two * 100;",
  },
  {
    // 밭의 **자릿수 약속**을 깬다 — `s = w+1` 이면 답의 십분위가 $0$ 이라 소수 한 자리 수가 아니다.
    label: "2-3-4 밭 — 답이 「$…{.}0$」이 되는 자리도 넣는다",
    from: "      for (let s = w + 2; s <= w + 9; s += 1) {",
    to: "      for (let s = w + 1; s <= w + 9; s += 1) {",
  },
  {
    // 심화중의 **마디**(받아올림)를 무시한다.
    label: "2-3-6 심화중 — 받아올림을 안 센다",
    from: "  const carry = b + g >= 10 ? 1 : 0;",
    to: "  const carry = 0;",
  },
  {
    // 심화중의 **마디**(받아내림)를 무시한다.
    label: "2-3-7 심화중 — 받아내림을 안 센다",
    from: "  const borrow = bigB < b ? 1 : 0;",
    to: "  const borrow = 0;",
  },
  {
    // 「합이 약분되면 분모가 바뀐다」 가드를 끈다 — 「분모가 $12$인」이 거짓말이 된다.
    label: "2-1-1 밭 — 합이 약분되는 자리도 넣는다 (분모가 바뀐다)",
    from: "      if (sum !== den && gcd(sum, den) !== 1) continue;\n      const pairs = numeratorPairs(den, sum);\n      if (pairs.length < 3) continue;\n      // 작은 쪽 분자는 잇따른 정수라, 하나만 남기는 창은 양 끝 두 자리뿐이다.",
    to: "      const pairs = numeratorPairs(den, sum);\n      if (pairs.length < 3) continue;\n      // 작은 쪽 분자는 잇따른 정수라, 하나만 남기는 창은 양 끝 두 자리뿐이다.",
  },
  {
    // 심화상의 「남은 것이 **극값이 아니다**」를 끈다 — 극값이면 조건 한 줄로 집혀 심화중이다.
    label: "2-1-2 심화상 — 살아남는 차가 극값이어도 넣는다",
    from: "        if (diff === sorted[0] || diff === sorted[sorted.length - 1]) continue;",
    to: "        if (diff === -1) continue;",
  },
  {
    // 심화중의 「하나만 남는다」를 깬다 — 둘 다 나누어떨어지면 답이 둘이다.
    label: "2-6-2 밭 — 창 안 두 후보가 **둘 다** 나누어떨어져도 넣는다",
    from: "        if (div.length !== 1 || div[0] !== side) continue;",
    to: "        if (div.length < 1 || !div.includes(side)) continue;",
  },
  {
    // 심화상의 「하나가 남는다」를 깬다.
    label: "2-6-4 심화상 밭 — 「가장 적은 조각 수」가 여럿이어도 넣는다",
    from: "      if (totals.filter((t) => t === min).length !== 1) continue;",
    to: "      if (totals.filter((t) => t === min).length < 1) continue;",
  },
  {
    // 반증 ⑥ 거르개를 **끈다** — 배선이 실제로 무는지 본다.
    label: "반증 ⑥ — 만든 뒤 지면을 읽어 거르는 것을 끈다",
    from: "function unlessForward(build: () => ElemProblem, tries = 40): ElemProblem {\n  let made = build();",
    to: "function unlessForward(build: () => ElemProblem, tries = 40): ElemProblem {\n  return build();\n  let made = build();",
  },
  {
    // 등록 가드 — 「핵심 넷이 다 있나」가 확대를 채운 뒤에도 «아니오»를 낼 수 있나.
    label: "2-3-1 등록에서 **핵심 갈래 하나**(심화하)를 뺀다",
    from: "    심화하: tier231Deep,\n    심화중: tier231Mid,",
    to: "    심화중: tier231Mid,",
  },
  {
    // 비운 자리를 **조용히 채운다** — 「덜 찼다」와 「일부러 비웠다」가 갈리는가.
    label: "2-3-2(비움)에 심화중을 몰래 붙인다",
    from: "  \"초4|2-3-2\": {\n    연산: tier232Calc,\n    기본: tier232Basic,\n    응용: tier232Apply,\n    심화하: tier232Deep,\n  },",
    to: "  \"초4|2-3-2\": {\n    연산: tier232Calc,\n    기본: tier232Basic,\n    응용: tier232Apply,\n    심화하: tier232Deep,\n    심화중: tier231Mid,\n  },",
  },
];

/** 지금 산출물 — 「파일이 바뀌었다」와 「동작이 바뀌었다」를 가르는 지문. */
function fingerprint() {
  return execFileSync("npx", ["tsx", "scripts/qa/fingerprintElemG4W2.ts"], {
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
