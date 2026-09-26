/**
 * 중1 세 모듈 «말이 안 되는 수치» 가드의 변이 시험 — **망가뜨려 봐야 가드인 줄 안다.**
 *
 * 지키는 쪽: `src/__tests__/unit/middleM1Degenerate.test.ts`
 * (판정기 `scripts/qa/census-middle-degenerate.ts` + `midPage.pageSmells`·`josaMismatches`).
 *
 * 판정은 세 단계다(2026-08-20·21 교훈, 둘 다 실제로 오판을 냈다 — `mutate-m1-calc.mjs` 와 같다):
 *   ⑴ 파일이 정말 바뀌었나        — 안 바뀌면 판정하지 않고 멈춘다
 *   ⑵ **산출물이 정말 바뀌었나**  — 전수 훑개(씨앗 200)의 출력이 그대로면 「뜻이 안 바뀐 변이」. 판정 거부.
 *   ⑶ 그제서야 시험이 빨개지나 — 그리고 **빨간 시험이 그 변이 자리의 것인가**
 *      (종료 코드만 보면 기동 실패도 「빨강」이다 — 2026-08-23 「변이 판정기가 도장이었다」).
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다(`git show HEAD:` 는 미커밋 수정을 먹는다,
 * 그리고 autocrlf 라 줄끝이 바뀐다). 시작 전에 대상 파일이 커밋돼 있는지부터 묻는다.
 *
 * 사용: node scripts/qa/mutate-m1-degenerate.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const LA = "src/lib/middle/m1LinearApply.ts";
const EXPR = "src/lib/middle/m1Expr.ts";
const CENSUS = "scripts/qa/census-middle-degenerate.ts";
const TEST = "src/__tests__/unit/middleM1Degenerate.test.ts";

/**
 * `expect` 는 **빨개져야 할 시험 이름의 조각**이다 — 그 이름이 실패 목록에 있어야 🔴 로 친다.
 */
const MUTATIONS = [
  {
    name: "30-톱니수같음허용",
    file: LA,
    why: "「각각 $10$개, $10$개」 — 원장님이 본 결함을 되살린다",
    find: "      if (a === b) return null;\n      const turnsA",
    to: "      const turnsA",
    expect: "1-1|일차방정식의 활용|30",
  },
  {
    name: "59-두사람일수같음허용",
    file: LA,
    why: "「A는 $14$일, B는 $14$일」을 되살린다",
    find: "        if (a === b) return null;\n        const k = intBetween(rng, 1, a - 2);",
    to: "        const k = intBetween(rng, 1, a - 2);",
    expect: "1-1|일차방정식의 활용|59",
  },
  {
    name: "23-기약아닌비허용",
    file: LA,
    why: "「비가 $2:2$」·「$2:6$」을 되살린다",
    find: "      if (gcd(a, b) !== 1) return null;\n      const k = intBetween(rng, 3, 15);",
    to: "      const k = intBetween(rng, 3, 15);",
    expect: "1-1|일차방정식의 활용|23",
  },
  {
    name: "풀이04-괄호앞계수1허용",
    file: EXPR,
    why: "항등식 목록에 `-1\\left(x-5\\right)` 를 되살린다",
    find: "(`pageSmells`).\n          if (Math.abs(a) === 1) return null;\n",
    to: "(`pageSmells`).\n",
    expect: "1-1|일차방정식의 풀이|04",
  },
  {
    name: "풀이16-a-1x되살리기",
    file: EXPR,
    why: "`a${signed(ss)}x` 로 되돌려 지면에 `a-1x` 를 낸다",
    find: '=a${ss < 0 ? "-" : "+"}${Math.abs(ss) === 1 ? "" : Math.abs(ss)}x`;',
    to: "=a${signed(ss)}x`;",
    expect: "1-1|일차방정식의 풀이|16",
  },
  {
    name: "판정기-생략을못본다",
    file: CENSUS,
    why: "「$14$일,」 뒤 생략을 안 보면 「A는 $14$일, B는 $14$일」이 조용해진다 — 눈금이 잡아야 한다",
    find: "    const ellipsis =\n      stopChar",
    to: "    const ellipsis =\n      false &&\n      stopChar",
    expect: "눈금",
  },
  {
    name: "판정기-답규칙끄기",
    file: CENSUS,
    why: "「답이 발문에 그대로」를 통째로 끈다 — 톱니·공의 비 양성 눈금이 잡아야 한다",
    find: "  if (answer !== undefined) {",
    to: "  if (false && answer !== undefined) {",
    expect: "눈금",
  },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function digest() {
  const r = spawnSync(
    "npx",
    [
      "tsx",
      CENSUS,
      "--module",
      "m1core",
      "--smells",
      "--seeds",
      "200",
      "--tsv",
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  // 훑개는 결함이 있으면 종료 1 이다 — 종료 코드가 아니라 **출력**을 지문으로 쓴다.
  return `${r.stdout}\n${r.stderr}`.trim();
}

/** 실패한 시험 이름들 — 기동 실패면 `null`(판정 불가). */
function runTest() {
  const out = join(tmpdir(), `mutate-m1-degenerate-${process.pid}.json`);
  writeFileSync(out, "");
  const r = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      TEST,
      "--pool=threads",
      "--reporter=json",
      `--outputFile=${out}`,
    ],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  let report;
  try {
    report = JSON.parse(readFileSync(out, "utf8"));
  } catch {
    return { status: r.status ?? 1, failed: null };
  }
  const failed = report.testResults.flatMap((f) =>
    f.assertionResults
      .filter((a) => a.status === "failed")
      .map((a) => a.fullName),
  );
  return { status: r.status ?? 1, failed, total: report.numTotalTests };
}

// ── 시작 전 — 대상 파일이 커밋돼 있는가 ───────────────────────────
const files = [...new Set(MUTATIONS.map((m) => m.file))];
const dirty = sh("git", ["status", "--porcelain", "--", ...files, TEST]);
if (dirty !== "") {
  console.error(
    "🛑 대상 파일에 커밋 안 된 수정이 있습니다 — 이 스크립트는 그 파일을 덮어씁니다.",
  );
  console.error(dirty);
  process.exit(2);
}
const originals = new Map(files.map((f) => [f, readFileSync(f)]));

console.log("기준 상태를 잽니다…");
const baseDigest = digest();
const base = runTest();
if (base.failed === null || base.failed.length !== 0 || base.status !== 0) {
  console.error("🛑 기준 시험이 초록이 아닙니다 — 변이를 판정할 수 없습니다.");
  console.error(base.failed);
  process.exit(2);
}
console.log(`기준 시험 초록 (${base.total}건) — 이 명령은 초록을 낼 수 있다\n`);

const results = [];
try {
  for (const m of MUTATIONS) {
    const original = originals.get(m.file);
    const src = original.toString("utf8");
    // 앵커는 LF 로 적고 파일의 줄끝에 맞춰 찾는다(autocrlf — 2026-08-23 앵커 0개 사고).
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const find = m.find.split("\n").join(eol);
    const to = m.to.split("\n").join(eol);
    const hits = src.split(find).length - 1;
    if (hits !== 1) {
      results.push({ name: m.name, verdict: `🛑 앵커 ${hits}개 — 판정 불가` });
      console.log(`🛑 ${m.name}: 앵커가 ${hits}개입니다(1개라야 한다).`);
      continue;
    }
    // `replace` 가 아니라 split/join — 치환 문자열의 `$$`·`$&` 가 먹히지 않게(2026-08 사고).
    writeFileSync(m.file, Buffer.from(src.split(find).join(to), "utf8"));
    try {
      // ⑴ 파일이 바뀌었나
      if (readFileSync(m.file).equals(original)) {
        results.push({
          name: m.name,
          verdict: "🛑 파일이 안 바뀜 — 판정 거부",
        });
        continue;
      }
      // ⑵ 산출물이 바뀌었나
      if (digest() === baseDigest) {
        results.push({
          name: m.name,
          verdict: "🛑 산출물이 그대로 — 뜻이 안 바뀐 변이",
        });
        continue;
      }
      // ⑶ 시험이 빨개지나 — 그 자리의 시험이
      const r = runTest();
      let verdict;
      if (r.failed === null) verdict = "🛑 시험이 기동하지 못함 — 판정 불가";
      else if (r.failed.some((n) => n.includes(m.expect)))
        verdict = `🔴 빨강 (가드가 산다) — 실패 ${r.failed.length}건, 기대 자리 「${m.expect}」 포함`;
      else if (r.failed.length > 0)
        verdict = `🟠 빨강이지만 엉뚱한 자리 — ${r.failed.slice(0, 2).join(" / ")}`;
      else verdict = "🟢 초록 ← 가드가 아니다";
      results.push({ name: m.name, verdict });
      console.log(`${verdict}  ${m.name} — ${m.why}`);
    } finally {
      writeFileSync(m.file, original);
    }
  }
} finally {
  for (const [f, bytes] of originals) writeFileSync(f, bytes);
}

console.log("");
for (const r of results) console.log(`${r.verdict}  ${r.name}`);
let allSame = true;
for (const [f, bytes] of originals) {
  const same = readFileSync(f).equals(bytes);
  allSame &&= same;
  console.log(`원복 확인 ${f}: ${same ? "바이트 동일 ✓" : "🛑 다르다"}`);
}
console.log(
  `원복 후 git status: ${sh("git", ["status", "--porcelain", "--", ...files]) || "깨끗 ✓"}`,
);
const red = results.filter((r) => r.verdict.startsWith("🔴")).length;
console.log(`\n빨강 ${red} / 변이 ${MUTATIONS.length}`);
process.exitCode = red === MUTATIONS.length && allSame ? 0 : 1;
