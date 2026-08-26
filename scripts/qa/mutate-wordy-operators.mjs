/**
 * 「말 대신 기호」 규칙의 **변이 시험** — 가드를 망가뜨려 보고 빨개지는지 본다.
 *
 *   node scripts/qa/mutate-wordy-operators.mjs
 *   node scripts/qa/mutate-wordy-operators.mjs --only=최솟값
 *
 * ## 판정 순서 (CLAUDE.md 2026-08-20 · 08-21 · 08-23)
 *
 *   ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정 거부.
 *      「망가진 것을 잡는가」만 보면 「멀쩡한 것을 멀쩡하다 하는가」가 구조적으로
 *      안 보인다. 이 검사가 없으면 도구가 **도장**이 된다.
 *   ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부.
 *   ⑵ 파일 바이트가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다.
 *   ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 「가드가 아니다」가
 *      **거짓말**이 된다. 이걸 빠뜨리면 멀쩡한 가드를 의심하고 고치러 간다.
 *   ⑷ 그제서야 시험이 빨개지나.
 *
 * ⑶ 의 지문은 **넓어야 한다**(2026-08-25). 눈금 열 줄로만 재면 서로 가려서
 * 「판정 그대로」라는 거짓 거부가 난다. 그래서 프로브는 **실측 DB 표본**을 쓴다.
 *
 * 원복은 **시작할 때 읽어 둔 바이트 그대로** 한다 — `git show HEAD:` 로 되돌리면
 * 커밋 안 된 수정을 통째로 덮는다(2026-08-23 에 실제로 그랬다).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const TARGET = path.join(ROOT, "scripts", "qa", "wordyOperator.ts");
const TEST = "src/__tests__/unit/wordyOperator.test.ts";
const TSX = path.join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const PROBE = path.join(ROOT, "scripts", "qa", `.mutate-wordy.probe.${process.pid}.ts`);

const BS = String.fromCharCode(92);
const md5 = (buf) => createHash("md5").update(buf).digest("hex");

/**
 * 프로브 말뭉치 — **실측 DB 표본**이다(`census-wordy-operators` 산출물에서 골랐다).
 * 지어낸 문자열만 쓰면 지문이 좁아 서로 가린다.
 */
const CORPUS = [
  String.raw`최대공약수에서 $2$의 지수는 $\min(a,3)=2$이므로 $a=2$이다.`,
  String.raw`$3$의 지수는 $\max(a, 2)=3$에서 $a=3$입니다.`,
  String.raw`$2$의 지수에서 $\max(2, a, 1)=3$이므로 $a=3$입니다.`,
  String.raw`분자의 최대공약수 $\gcd(28,35)=7$, 분모의 최소공배수 $\lcm (15,18)=90$`,
  String.raw`가장 작은 수는 $\mathrm{lcm}(10,12)=60$`,
  String.raw`$\gcd(a,b)=15$, $\text{lcm}(a,b)=225$이므로`,
  String.raw`두 수의 최대공약수는 $3^{\min(3,2)}×5^{\min(2,4)}=3^2×5^2$입니다.`,
  String.raw`$d=\gcd(2^4×3×5,\,2^2×3^2×7)=2^2×3=12$`,
  String.raw`$g(t)=\max(f(t-1),f(t+1))$.`,
  // 안쪽 괄호·중괄호 **속** 쉼표 — 이게 없으면 `depth === 0` 변이가 산출물을 안 바꾼다.
  String.raw`$\gcd(\gcd(12,18),30)=6$`,
  String.raw`$\max(\frac{a}{b},1)$`,
  String.raw`$m=\max\left(0,\frac34+\frac23-1\right)=\frac5{12}$이다.`,
  String.raw`$\min(A)$이다. 조건 (가)에서 $\min(A)=\dfrac12$`,
  String.raw`$f(x)=g(x)Q(x)+R(x)$, $\deg R<n$이고 $\deg Q=2n-n=n$이다.`,
  String.raw`$\gcd (36,90,□)=6$이 되려면`,
  // ── 손대면 안 되는 것들 (음성) ──
  String.raw`서로소이므로 $\gcd=1$, $45×64=2880$을 만족한다.`,
  String.raw`부채꼴의 호의 길이를 $\lcm$ 라 하면 $\frac{1}{2}\times 6\times l=24p$`,
  String.raw`$k\leq \min\{g(x)-12x\}$.`,
  String.raw`$k\ge \max_{x\le0}h(x)$이다.`,
  String.raw`$P_{\max}=16-\frac14+\frac12=\frac{65}{4}$입니다.`,
  String.raw`$30\degree$ 이고 $\sin A\times\cos C+\tan B$의 값은?`,
  String.raw`$28$과 $35$의 최대공약수는 $7$이다.`,
];

/**
 * 변이 — **뜻을 바꾸는** 치환이어야 한다. 이름 문자열만 바꾸는 변이는 넣고 되돌리는
 * 쪽이 같은 값을 쓰므로 동작이 그대로다(2026-08-21 에 그렇게 두 번 속았다).
 */
const MUTANTS = [
  {
    name: "최솟값/최댓값 말이 사라진다",
    from: `min: { one: "의 최솟값", two: " 중 최솟값", many: " 중 가장 작은 값" },`,
    to: `min: { one: "", two: "", many: "" },`,
  },
  {
    name: "인자가 셋 이상일 때도 «중 최솟값» 으로 뭉갠다",
    from: `  if (argCount >= 3) return w.many ?? w.two ?? w.one;`,
    to: `  if (argCount >= 3) return w.two ?? w.one;`,
  },
  {
    name: "«괄호가 있어야 바꾼다» 가드가 없어진다 — HWP 잔재를 뜻으로 읽는다",
    from: `    const open = readOpenParen(text, after);
    if (open < 0) {
      skip(hit, "인자없음");
      continue;
    }`,
    to: `    const open = readOpenParen(text, after);
    if (open < 0) {
      out += text.slice(cursor, hit.index);
      out += "(" + BS + "text{" + wordFor(hit.op, 1) + "})";
      cursor = after;
      changed += 1;
      continue;
    }`,
  },
  {
    name: "아래첨자도 함수 적용으로 읽는다",
    from: `    if (/^\\s*_/.test(tail) || /_\\s*\\{?\\s*$/.test(head)) {
      skip(hit, "아래첨자");
      continue;
    }`,
    to: `    if (false) {
      skip(hit, "아래첨자");
      continue;
    }`,
  },
  {
    name: "중괄호 꼴도 함수 적용으로 읽는다",
    from: `    if (new RegExp("^\\\\s*" + BS + BS + "?\\\\{").test(tail)) {`,
    to: `    if (false && new RegExp("^\\\\s*" + BS + BS + "?\\\\{").test(tail)) {`,
  },
  {
    name: "`\\deg` 가 `\\degree` 까지 문다 — 낱말 경계가 없어진다",
    from: `  BS + BS + "(" + WORDY_OPERATOR_NAMES.join("|") + ")(?![A-Za-z])",`,
    to: `  BS + BS + "(" + WORDY_OPERATOR_NAMES.join("|") + ")",`,
  },
  {
    name: "라벨 꼴(`\\mathrm{lcm}`)을 못 본다",
    from: `  for (const re of [BARE_HEAD, LABEL_HEAD]) {`,
    to: `  for (const re of [BARE_HEAD]) {`,
  },
  {
    name: "바깥 쉼표가 아니라 **모든** 쉼표에서 가른다",
    from: `    else if (c === "," && depth === 0) {`,
    to: `    else if (c === ",") {`,
  },
  {
    name: "`\\left(…\\right)` 의 `\\right` 가 인자에 남는다",
    from: `      .replace(new RegExp(BS + BS + "right\\\\s*$"), "");`,
    to: `      .replace(new RegExp("(?!x)x"), "");`,
  },
];

function writeProbe() {
  const lines = [
    `import { rewriteWordyOperators } from "./wordyOperator";`,
    `const CORPUS = ${JSON.stringify(CORPUS)};`,
    `for (const s of CORPUS) {`,
    `  const r = rewriteWordyOperators(s);`,
    `  console.log(r.changed + " | " + r.skipped.map((x) => x.op + ":" + x.reason).join(",") + " | " + r.out);`,
    `}`,
  ];
  writeFileSync(PROBE, lines.join("\n"), "utf8");
}

function probeOutput() {
  return execFileSync(process.execPath, [TSX, PROBE], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
}

function runTests() {
  try {
    const out = execFileSync(
      process.execPath,
      [path.join(ROOT, "node_modules", "vitest", "vitest.mjs"), "run", TEST, "--reporter=json"],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] },
    );
    return { ok: true, failed: readFailed(out) };
  } catch (e) {
    return { ok: false, failed: readFailed(`${e.stdout ?? ""}`) };
  }
}

/** 실패한 시험 **이름**을 읽는다 — 판정 줄만 읽고 근거 줄이 빈 것을 못 보면 도장이 된다. */
function readFailed(text) {
  const at = text.indexOf("{");
  if (at < 0) return null;
  try {
    const json = JSON.parse(text.slice(at, text.lastIndexOf("}") + 1));
    const names = [];
    for (const f of json.testResults ?? [])
      for (const a of f.assertionResults ?? [])
        if (a.status === "failed") names.push(a.fullName ?? a.title);
    return names;
  } catch {
    return null;
  }
}

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const original = readFileSync(TARGET);
const originalText = original.toString("utf8");

console.log(`대상 ${path.relative(ROOT, TARGET)}  md5 ${md5(original)}`);
writeProbe();

let verdictCount = 0;
try {
  // ㉠ 음성 대조 — 루프 **밖**에서 한 번. 회차당 1회다(45×2 가 아니라 45+1).
  const base = runTests();
  const baseProbe = probeOutput();
  if (!base.ok || base.failed === null || base.failed.length > 0) {
    console.log(
      `⛔ 판정 거부 — 변이 **전에** 시험이 초록이 아니다 (실패 ${base.failed?.length ?? "읽지 못함"}).`,
    );
    console.log(`   이 도구는 «아니오»를 낼 수 있어야 판정자다. 먼저 기준을 초록으로 만들 것.`);
    process.exitCode = 1;
  } else {
    console.log(`✅ 음성 대조 — 변이 전 시험 초록 · 산출물 md5 ${md5(baseProbe)}\n`);

    for (const m of MUTANTS) {
      if (only && !m.name.includes(only)) continue;
      verdictCount += 1;
      const hits = originalText.split(m.from).length - 1;
      if (hits !== 1) {
        console.log(`⛔ ${m.name}\n     앵커가 ${hits}개다 — 판정 거부(치환이 헛돌면 초록이 거짓말이 된다).`);
        continue;
      }
      const mutated = originalText.replace(m.from, m.to);
      writeFileSync(TARGET, mutated, "utf8");
      try {
        if (md5(readFileSync(TARGET)) === md5(Buffer.from(originalText, "utf8"))) {
          console.log(`⛔ ${m.name}\n     파일이 안 바뀌었다 — 판정 거부.`);
          continue;
        }
        let after;
        try {
          after = probeOutput();
        } catch (e) {
          // 변이가 컴파일을 깨면 그것도 «동작이 바뀐 것»이다.
          after = `COMPILE-ERROR ${e.status}`;
        }
        if (after === baseProbe) {
          console.log(`⛔ ${m.name}\n     **산출물이 그대로다** — 뜻이 안 바뀌었으니 판정 거부.`);
          continue;
        }
        const r = runTests();
        if (r.failed === null) {
          console.log(`⛔ ${m.name}\n     판정 결과를 못 읽었다 — 러너가 안 떴을 수 있다. 판정 거부.`);
          continue;
        }
        if (r.failed.length === 0) {
          console.log(`🟢 ${m.name}\n     시험이 초록이다 ← **가드가 아니다.**`);
        } else {
          console.log(`🔴 ${m.name}\n     ↳ ${r.failed.slice(0, 3).join(" / ")}${r.failed.length > 3 ? ` … 외 ${r.failed.length - 3}` : ""}`);
        }
      } finally {
        writeFileSync(TARGET, original);
      }
    }
  }
} finally {
  writeFileSync(TARGET, original);
  try {
    unlinkSync(PROBE);
  } catch {
    /* 이미 지워졌다 */
  }
  const now = md5(readFileSync(TARGET));
  console.log(`\n원복 확인 md5 ${now} ${now === md5(original) ? "✅" : "🔴 원복 실패"}`);
  console.log(`판정 ${verdictCount}건`);
}
