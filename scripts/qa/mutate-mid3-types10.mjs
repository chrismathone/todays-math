/**
 * **중3 다섯 소단원 10유형화 — 변이 시험** (2026-08-29).
 *
 * 이 회차가 지은 유형 10개(m3Quad 17~20 · m3Trig 20·21 · m3Stat2 09·10·14·15)와
 * 그것을 지키는 검사가 **정말 무는지**를 잰다. 가드는 망가뜨려 봐야 가드인 줄 안다
 * (CLAUDE.md 2026-08-18 「LOOP 가 있나」).
 *
 * ## 판정 순서 — 이 저장소가 값을 치르고 얻은 네 단계
 *
 *   ㉠ **음성 대조** — 변이를 넣기 **전에** 그 시험이 초록인가. 아니면 판정을
 *      거부한다. 「망가진 것을 잡는가」만 물으면 「멀쩡한 것을 멀쩡하다 하는가」는
 *      구조적으로 안 보이고, 그 순간 이 도구는 판정자가 아니라 **도장**이 된다
 *      (2026-08-23 `--reporter=basic` 사건).
 *   ⑴ 앵커가 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환 금지).
 *   ⑵ 파일이 정말 바뀌었나.
 *   ⑶ **산출물이 정말 바뀌었나** — 파일이 바뀌어도 뜻이 그대로면 「가드가 아니다」가
 *      거짓말이 된다(2026-08-21). 지문은 `probe-mid3-types10.ts` 가 낸다.
 *   ⑷ 그제서야 시험이 빨개지나. 빨간데 **실패한 시험 이름을 못 대면** 거부한다 —
 *      러너가 기동에 실패한 것과 시험이 빨간 것은 다른 일이다.
 *
 * ## 되돌리기
 *
 * 시작할 때 읽어 둔 **바이트 그대로** 쓴다(`git show HEAD:` 로 되돌리면 커밋 안 된
 * 수정을 덮는다 — 2026-08-23 에 실제로 겪었다). 그래서 시작 전에 대상 파일이
 * 커밋돼 있는지부터 묻고, 아니면 **멈춘다.**
 *
 *   node scripts/qa/mutate-mid3-types10.mjs           # 전량
 *   node scripts/qa/mutate-mid3-types10.mjs Q1 S3     # 이름으로 고른다
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ⚠️ `new URL(import.meta.url).pathname` 은 win32 에서 `/C:/…` 를 낸다 — 앞
//    슬래시가 붙은 그 경로로는 파일을 못 연다. `fileURLToPath` 를 쓴다.
const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

const QUAD = "src/lib/middle/m3Quad.ts";
const TRIG = "src/lib/middle/m3Trig.ts";
const STAT = "src/lib/middle/m3Stat2.ts";

const T_QUAD = "src/__tests__/unit/middleM3Quad.test.ts";
const T_TRIG = "src/__tests__/unit/middleM3Trig.test.ts";
const T_STAT = "src/__tests__/unit/middleM3Stat2.test.ts";

/** 변이 하나 — `[이름, 대상, 시험, 앵커, 바꿀 것, 지문을 볼 유형키]`. */
const MUTATIONS = [
  {
    name: "Q1 17 의 일차항 계수를 홀수로 — 이 유형의 존재 이유를 지운다",
    target: QUAD,
    test: T_QUAD,
    from: "quadEq(a, 2 * m, c)",
    to: "quadEq(a, 2 * m + 1, c)",
    keys: ["3-1|이차방정식의 활용|17"],
  },
  {
    name: "Q2 17 mode2 의 근호 안을 k²s 가 아니게",
    target: QUAD,
    test: T_QUAD,
    from: "const q = mode === 2 ? k * k * s : pick(rng, SURD_POOL);",
    to: "const q = mode === 2 ? k * s : pick(rng, SURD_POOL);",
    keys: ["3-1|이차방정식의 활용|17"],
  },
  {
    name: "Q3 18 의 두 근의 차 관계를 틀리게 (분모 4 → 2)",
    target: QUAD,
    test: T_QUAD,
    from: "const c = (b * b - d * d) / 4;",
    to: "const c = (b * b - d * d) / 2;",
    keys: ["3-1|이차방정식의 활용|18"],
  },
  {
    name: "Q4 18 mode2 의 t 를 한 칸 어긋내기 (m 에 관계없이 일정을 깬다)",
    target: QUAD,
    test: T_QUAD,
    from: "const t = k * k;",
    to: "const t = k * k + 1;",
    keys: ["3-1|이차방정식의 활용|18"],
  },
  {
    name: "Q5 19 삼각형 갈래의 넓이에서 ½ 을 뗀다",
    target: QUAD,
    test: T_QUAD,
    from: "const bigS = mode === 1 ? prod / 2 : prod;",
    to: "const bigS = prod;",
    keys: ["3-1|이차방정식의 활용|19"],
  },
  {
    name: "Q6 20 mode0 의 답을 큰 수 대신 작은 수로",
    target: QUAD,
    test: T_QUAD,
    from: "x: big },",
    to: "x: small },",
    keys: ["3-1|이차방정식의 활용|20"],
  },
  {
    name: "Q7 20 mode2 해설에서 «모두 조건을 만족» 을 지운다",
    target: QUAD,
    test: T_QUAD,
    from: "두 근이 곧 두 수이므로 모두 조건을 만족시킨다.",
    to: "두 근이 곧 두 수이다.",
    keys: ["3-1|이차방정식의 활용|20"],
  },
  {
    name: "T1 삼각비 20 의 곱셈 갈래를 딴 값으로",
    target: TRIG,
    test: T_TRIG,
    from: "? red(u * v, w * w)",
    to: "? red(u, w)",
    keys: ["3-2|삼각비|20"],
  },
  {
    name: "T2 삼각비 21 의 넓이에서 ½ 을 뗀다",
    target: TRIG,
    test: T_TRIG,
    from: "const area = (opp * adj) / 2;",
    to: "const area = opp * adj;",
    keys: ["3-2|삼각비|21"],
  },
  {
    name: "S1 산포도 09 의 편차 제곱합을 n 이 아니라 5 로 만든다",
    target: STAT,
    test: T_STAT,
    from: "const sumSq = n * variance;",
    to: "const sumSq = 5 * variance;",
    keys: ["3-2|산포도|09"],
  },
  {
    name: "S2 산포도 10 의 미지수 a 를 한 칸 어긋내기",
    target: STAT,
    test: T_STAT,
    from: "const a = (total - d) / 2;",
    to: "const a = (total - d) / 2 + 1;",
    keys: ["3-2|산포도|10"],
  },
  {
    name: "S3 산점도 14 를 «가장 큰 차» 가 아니라 «가장 작은 차» 로",
    target: STAT,
    test: T_STAT,
    from: "const sorted = [...gaps].sort((a, b) => b - a);",
    to: "const sorted = [...gaps].sort((a, b) => a - b);",
    keys: ["3-2|상자그림과 산점도|14"],
  },
  {
    name: "S4 산점도 15 의 무리를 x 가 아니라 y 로 고른다",
    target: STAT,
    test: T_STAT,
    from: "const hit = pts.filter(([x]) => x >= t);",
    to: "const hit = pts.filter(([, y]) => y >= t);",
    keys: ["3-2|상자그림과 산점도|15"],
  },
  {
    name: "S5 devTex 가 «+0» 을 다시 내게 한다",
    target: STAT,
    test: T_STAT,
    from: "return d > 0 ?",
    to: "return d >= 0 ?",
    keys: ["3-2|산포도|10"],
  },
];

/**
 * ⚠️ **`shell: true` 를 쓰지 않는다.** 유형 키가 `3-2|산포도|09` 라 win32 셸이
 *    `|` 를 **파이프로 읽는다** — 인자가 갈라져 프로브가 안 뜨고, 그러면 지문이
 *    변이 전후로 **똑같이 «실패»** 가 되어 14개 전부 「산출물이 그대로다」로
 *    거부된다(2026-08-29 실측, 이 도구가 처음 낸 결과가 그것이었다).
 *    그래서 `node` 를 직접 부르고 vitest 도 npx 가 아니라 그 진입점을 바로 쓴다.
 */
function sh(args, opts = {}) {
  return spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
    ...opts,
  });
}

/** 지문 — 제품 엔진을 실제로 돌려 산출물을 찍는다. */
function fingerprint(keys) {
  const r = sh([
    "node_modules/tsx/dist/cli.mjs",
    "scripts/qa/probe-mid3-types10.ts",
    "--keys",
    keys.join(","),
  ]);
  const lines = (r.stdout || "")
    .split("\n")
    .filter((l) => /^[0-9a-f]{64}\s/.test(l));
  // 🔴 프로브가 못 떴으면 **지문이 아니다.** 실패를 지문으로 돌려주면 변이 전후가
  //    같은 문자열이 되어 「산출물이 그대로다」라는 **거짓 거부**가 난다.
  if (r.status !== 0 || lines.length !== keys.length) {
    return {
      ok: false,
      why: `프로브가 못 떴다(status ${r.status}, 지문 ${lines.length}/${keys.length}): ${(r.stderr || "").slice(-300)}`,
    };
  }
  return { ok: true, value: lines.join("|") };
}

/** 시험을 돌려 «빨간가 · 실패한 이름» 을 낸다. 이름을 못 읽으면 그것도 말한다. */
function runTest(file) {
  const r = sh(["node_modules/vitest/vitest.mjs", "run", file, "--reporter=json"], {
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = r.stdout || "";
  const at = out.indexOf("{");
  let failed = null;
  if (at >= 0) {
    try {
      const j = JSON.parse(out.slice(at));
      failed = [];
      for (const t of j.testResults ?? []) {
        for (const a of t.assertionResults ?? []) {
          if (a.status === "failed") failed.push(a.fullName ?? a.title);
        }
      }
    } catch {
      failed = null;
    }
  }
  return { red: r.status !== 0, failed };
}

function main() {
  const want = process.argv.slice(2);
  const picked = want.length
    ? MUTATIONS.filter((m) => want.some((w) => m.name.startsWith(w)))
    : MUTATIONS;
  if (picked.length === 0) {
    console.error("고른 변이가 없다 — 이름의 앞 조각을 주어라(Q1·S3 …).");
    process.exitCode = 1;
    return;
  }

  const files = [...new Set(picked.map((m) => m.target))];
  // 🔴 되돌리기는 «시작할 때 읽은 바이트» 다. 커밋 안 된 수정이 있으면 그것을
  //    덮어쓰게 되므로 **멈춘다**(2026-08-23 에 실제로 잃었다).
  const dirty = execFileSync("git", ["status", "--porcelain", "--", ...files], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  if (dirty) {
    console.error(`🔴 대상 파일에 커밋 안 된 수정이 있다:\n${dirty}`);
    process.exitCode = 1;
    return;
  }

  const original = new Map(
    files.map((f) => [f, readFileSync(path.join(ROOT, f))]),
  );
  const restore = () => {
    for (const [f, buf] of original) writeFileSync(path.join(ROOT, f), buf);
  };

  const tests = [...new Set(picked.map((m) => m.test))];
  const baseFail = [];
  for (const t of tests) {
    process.stdout.write(`㉠ 음성 대조 — ${t} … `);
    const { red } = runTest(t);
    console.log(red ? "🔴 이미 빨갛다" : "🟢");
    if (red) baseFail.push(t);
  }
  if (baseFail.length) {
    console.error(
      `\n🔴 **판정을 거부한다** — 기준이 이미 빨갛다(${baseFail.join(", ")}).\n` +
        "  이 도구가 «아니오» 를 낼 수 있는지부터 세워라.",
    );
    process.exitCode = 1;
    return;
  }

  // 변이 **전** 지문. 하나라도 못 찍으면 ⑶ 을 아예 물을 수 없으므로 멈춘다.
  const base = new Map();
  for (const m of picked) {
    const k = m.keys.join(",");
    if (base.has(k)) continue;
    const fp = fingerprint(m.keys);
    if (!fp.ok) {
      console.error(`🔴 **판정을 거부한다** — 기준 지문을 못 찍었다: ${fp.why}`);
      process.exitCode = 1;
      return;
    }
    base.set(k, fp.value);
  }

  const rows = [];
  try {
    for (const m of picked) {
      const file = path.join(ROOT, m.target);
      const before = original.get(m.target).toString("utf8");
      const hits = before.split(m.from).length - 1;
      if (hits !== 1) {
        rows.push([m.name, `⛔ 앵커가 ${hits}개 — 판정 거부`]);
        continue;
      }
      writeFileSync(file, before.replace(m.from, m.to), "utf8");
      const after = readFileSync(file, "utf8");
      if (after === before) {
        rows.push([m.name, "⛔ 파일이 안 바뀌었다 — 판정 거부"]);
        restore();
        continue;
      }
      const fp = fingerprint(m.keys);
      if (!fp.ok) {
        // 변이가 **컴파일을 깨뜨린** 것일 수도 있다 — 그건 「가드가 문다」가 아니다.
        rows.push([m.name, "⛔ 변이 뒤 지문을 못 찍었다 — 판정 거부", fp.why]);
        restore();
        continue;
      }
      if (fp.value === base.get(m.keys.join(","))) {
        rows.push([m.name, "⛔ 산출물이 그대로다 — 판정 거부"]);
        restore();
        continue;
      }
      const { red, failed } = runTest(m.test);
      if (red && (failed === null || failed.length === 0)) {
        rows.push([m.name, "⛔ 빨간데 실패한 시험을 못 댄다 — 판정 거부"]);
      } else if (red) {
        rows.push([m.name, `🔴 RED — ${failed.length}건`, failed[0]]);
      } else {
        rows.push([m.name, "🟢 초록 ← **가드가 아니다**"]);
      }
      restore();
    }
  } finally {
    restore();
  }

  console.log("\n── 판정 ──");
  for (const [name, verdict, why] of rows) {
    console.log(`${verdict.padEnd(18)} ${name}`);
    if (why) console.log(`   ↳ ${why}`);
  }
  const bad = rows.filter(([, v]) => !v.startsWith("🔴"));
  console.log(
    `\n${rows.length - bad.length}/${rows.length} 이 빨개졌다.` +
      (bad.length ? " 🔴 나머지를 보라." : " 🟢"),
  );
  if (bad.length) process.exitCode = 1;
}

main();
