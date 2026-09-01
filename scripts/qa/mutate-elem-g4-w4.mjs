/**
 * 변이 하네스 — 초4 **넷째 물결**(`1-2`·`2-2`·`2-5`) 확대 갈래의 가드가
 * **망가뜨리면 빨개지는가**. 그리고 **비운 자리**(1-1·1-4·나머지)를 지키는가.
 *
 * 순서(이 저장소가 쌓아 온 그대로):
 *   ⑴ 대상 파일이 **커밋돼 있는가** — 이 스크립트는 그 파일을 덮어쓴다.
 *   ⑵ 변이 **전에** 시험이 초록인가(음성 대조) — 아니면 판정을 거부한다. 루프 **밖** 1회.
 *   ⑶ 치환이 **정확히 한 자리**에 먹었는가 — 안 먹었으면 판정하지 않는다.
 *   ⑷ **산출물이 바뀌었는가** — 파일이 바뀐 것과 동작이 바뀐 것은 다르다(2026-08-21).
 *   ⑸ 그제서야 시험이 빨개지나. 빨간데 **실패한 시험을 못 대면** 판정을 거부한다.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**(`git show HEAD:` 가 아니다 —
 * 그러면 커밋 안 된 수정을 덮는다, 2026-08-23).
 *
 * ⚠️ 앵커의 줄끝은 **파일에서 읽어 맞춘다**(autocrlf 저장소). 앵커는 **prettier 가 접은
 *    뒤의 모양**이어야 한다 — 커밋 훅이 줄을 접으면 치환이 말없이 0곳이 된다.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const TARGET = "src/lib/elementary/g4.ts";
const TESTS = [
  "src/__tests__/unit/elemTiersG4W4Deep.test.ts",
  // 확대를 채우면 그 대단원의 **기존** 시험도 `tiersOf` 로 새 갈래를 덮는다 — 같이 잰다.
  "src/__tests__/unit/elemTiersG4Line.test.ts",
];

const MUTATIONS = [
  /* ── 밭 — 마디가 열려 있나 ────────────────────────────────────────────── */
  {
    // 두 시각 후보의 **답이 같아도** 넣는다 → 굳힘이 아무것도 안 가른다.
    label: "1-2-3 밭 — 두 후보의 분류가 같아도 넣는다",
    from: "      if (k1 === k2) continue;",
    to: "      if (k1 === k2 && false) continue;",
  },
  {
    // 두 바늘이 겹치는 $12$시를 안 막는다 → 「이루는 각」이 $0^\circ$ 인 자리가 나온다.
    label: "1-2-3 밭 — $12$시를 안 막는다",
    from: "      if (n1 === 12 || n2 === 12) continue;",
    to: "      if (n1 === 13 || n2 === 13) continue;",
  },
  {
    // 조건을 **안 던진다** → 「늘 이른 쪽」이 100% 가 된다(지름길 자가 문다).
    label: "1-2-3 밭 — 늦은 쪽 자리를 안 만든다 (늘 «이른 쪽»)",
    from: "      out.push({ angle, after: t, early: false, hour: late, kind: k2 });",
    to: "      out.push({ angle, after: t, early: true, hour: early, kind: k1 });",
  },
  {
    // 두 삼각형의 **최단 변이 같아도** 넣는다 → 조건이 둘을 못 가른다.
    label: "2-2-1 밭 — 두 가지의 최단 변이 같아도 넣는다",
    from: "      if (minA === minB) continue;",
    to: "      if (minA === minB + 1000) continue;",
  },
  {
    // ㉮ 가 **삼각형이 아니어도** 넣는다 → 마디가 애초에 하나뿐이다.
    label: "2-2-1 밭 — ㉮ 가 삼각형이 아니어도 넣는다",
    from: "      if (!stands(side, side, oddA)) continue;",
    to: "      if (!stands(side, side, oddA) && false) continue;",
  },
  {
    // 답을 **한쪽으로 고정** → 굳힘이 장식이 된다(지름길 100%).
    label: "2-2-1 — 답을 늘 «주어진 변이 나머지 한 변»으로 고정",
    from: "          pairSum: minA > bar ? 2 * side : total - side,",
    to: "          pairSum: total - side,",
  },
  {
    // 문턱이 두 합 **사이**가 아니어도 넣는다 → 둘 다 살거나 둘 다 죽는다.
    label: "2-2-2 밭 — 문턱이 두 합 사이가 아니어도 넣는다",
    from: "    for (let bar = sumBase + 1; bar < sumApex; bar += 1) {",
    to: "    for (let bar = 1; bar < sumApex; bar += 1) {",
  },
  {
    // 「작습니다」 자리의 답을 반대 갈래 값으로 → 조건과 답이 어긋난다.
    label: "2-2-2 밭 — 「작습니다」의 답을 반대 갈래 값으로",
    from: "      out.push({ given, bar, bigger: false, answer: 180 - 2 * given });",
    to: "      out.push({ given, bar, bigger: false, answer: (180 - given) / 2 });",
  },
  {
    // 오르는 폭 $1$ 을 다시 허용 → $T$ 가 하나로 굳어 「가장 작은 수」가 빈말이 된다.
    label: "2-5-2 값 — 오르는 폭이 $1$ 이어도 넣는다 (마디가 안 열린다)",
    from: "  const lift = theme.step >= 2 ? 1 : 2;",
    to: "  const lift = 1;",
  },
  {
    // 앞쪽 최댓값이 아니라 **바로 앞 값**을 답으로 → 지름길이 100% 가 된다.
    label: "2-5-2 — 앞쪽 최댓값 대신 «바로 앞 때»의 값을 답으로",
    from: "  const peak = Math.max(...before);",
    to: "  const peak = before[before.length - 1]!;",
  },
  {
    // 되짚는 자리를 늘 첫 구간으로 → 「바로 앞 = 첫 때」라 지름길 100%.
    label: "2-5-2 — 되짚는 자리를 늘 $1$ 로 고정",
    from: "  const at = pick(rng, [1, 3]);",
    to: "  const at = 1;",
  },
  {
    // 후보가 **셋 미만**이어도 넣는다 → 「만들어 견주기」가 「둘 중 고르기」가 된다.
    label: "2-5-3 밭 — 후보가 셋 미만이어도 넣는다",
    from: "    if (cands.length < 3 || alive.length !== 1) continue;",
    to: "    if (cands.length < 1 || alive.length !== 1) continue;",
  },
  {
    // 살아남는 짝이 **둘 이상**이어도 넣는다 → 답이 하나로 안 선다.
    label: "2-5-3 밭 — 살아남는 짝이 둘 이상이어도 넣는다",
    from: "    if (cands.length < 3 || alive.length !== 1) continue;",
    to: "    if (cands.length < 3 || alive.length < 1) continue;",
  },
  {
    // 표에서 값을 **하나만** 지운다 → 되짚기가 만들 후보가 없다.
    label: "2-5-3 — 표에서 값을 하나만 지운다",
    from: "    tableFigureHidden(theme, nums, [1, 4]),",
    to: "    tableFigureHidden(theme, nums, [1]),",
  },

  /* ── 등록 — 세운 곳과 **비운 곳** ─────────────────────────────────────── */
  {
    label: "1-1-6(비움)에 심화중을 몰래 붙인다",
    from: '  "초4|1-1-6": {\n    연산: tier16Calc,\n    기본: tier16Basic,\n    응용: tier16Apply,\n    심화하: tier16Deep,\n  },',
    to: '  "초4|1-1-6": {\n    연산: tier16Calc,\n    기본: tier16Basic,\n    응용: tier16Apply,\n    심화하: tier16Deep,\n    심화중: tier23Mid,\n  },',
  },
  {
    label: "2-2-5(비움 — 반증 ④)에 심화중을 몰래 붙인다",
    from: '  "초4|2-2-5": {\n    연산: tier225Calc,\n    기본: tier225Basic,\n    응용: tier225Apply,\n    심화하: tier225Deep,\n  },',
    to: '  "초4|2-2-5": {\n    연산: tier225Calc,\n    기본: tier225Basic,\n    응용: tier225Apply,\n    심화하: tier225Deep,\n    심화중: tier222Mid,\n  },',
  },
  {
    label: "2-5-1(비움)에 심화중을 몰래 붙인다",
    from: '  "초4|2-5-1": {\n    연산: tier251Calc,\n    기본: tier251Basic,\n    응용: tier251Apply,\n    심화하: tier251Deep,\n  },',
    to: '  "초4|2-5-1": {\n    연산: tier251Calc,\n    기본: tier251Basic,\n    응용: tier251Apply,\n    심화하: tier251Deep,\n    심화중: tier252Mid,\n  },',
  },
  {
    // 「핵심 넷이 다 있나」가 확대를 채운 뒤에도 «아니오»를 낼 수 있나.
    label: "2-5-2 등록에서 **핵심 갈래**(심화하)를 뺀다",
    from: "    심화하: tier252Deep,\n    심화중: tier252Mid,",
    to: "    심화중: tier252Mid,",
  },

  /* ── 산문 — 「그 수를 왜 골랐다고 적었나」 ───────────────────────────── */
  {
    label: "1-2-3 해설 — 시각을 고른 까닭을 조건과 반대로 적는다",
    from: '      `${n(6)}시보다 ${f.early ? "이르므로" : "늦으므로"} 그 시각은 ${n(f.hour)}시입니다. ` +',
    to: '      `${n(6)}시보다 ${f.early ? "늦으므로" : "이르므로"} 그 시각은 ${n(f.hour)}시입니다. ` +',
  },
  {
    label: "2-2-1 해설 — 고른 «앞/뒤의 경우»를 맞바꾼다",
    from: '        `${f.longer ? "길므로" : "짧으므로"} ${takeA ? "앞" : "뒤"}의 경우입니다. ` +',
    to: '        `${f.longer ? "길므로" : "짧으므로"} ${takeA ? "뒤" : "앞"}의 경우입니다. ` +',
  },
  {
    label: "2-2-2 해설 — 고른 갈래 이름을 맞바꾼다",
    from: '        `${f.bigger ? "나머지 한 각" : "크기가 같은 두 각 중 하나"}입니다. ` +',
    to: '        `${f.bigger ? "크기가 같은 두 각 중 하나" : "나머지 한 각"}입니다. ` +',
  },
  {
    label: "2-5-2 해설 — 앞쪽 최댓값을 가진 때를 «바로 앞 때»로 적는다",
    from: "        `${theme.labels[peakAt]!.math}의 ${n(peak)}${theme.unit}이므로 어떤 수는 ` +",
    to: "        `${theme.labels[at - 1]!.math}의 ${n(peak)}${theme.unit}이므로 어떤 수는 ` +",
  },
];

/** 지금 산출물 — 「파일이 바뀌었다」와 **「동작이 바뀌었다」**를 가르는 지문. */
function fingerprint() {
  return execFileSync("npx", ["tsx", "scripts/qa/fingerprintElemG4W4.ts"], {
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runTests() {
  try {
    execFileSync("npx", ["vitest", "run", "--pool=threads", ...TESTS], {
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

// ⑴ 대상이 커밋돼 있는가 — 이 스크립트는 그 파일을 덮어쓴다.
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

// ⑵ 음성 대조 — 변이 전에 초록이어야 판정에 도달한다(루프 **밖** 1회).
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

console.log(
  `\n변이 ${MUTATIONS.length}건 — 판정 못 하거나 초록 ${verdictBad}건`,
);
process.exit(verdictBad === 0 ? 0 : 1);
