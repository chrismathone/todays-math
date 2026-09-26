/**
 * 중1 세 모듈 **밖** «말이 안 되는 수치» 거름의 변이 시험 — **망가뜨려 봐야 가드인 줄 안다.**
 *
 * 지키는 쪽: `src/__tests__/unit/middleRestDegenerate.test.ts`
 * (판정기 `scripts/qa/census-middle-degenerate.ts` 의 `degenerateFindings`).
 * 틀은 `mutate-m1-degenerate.mjs` 와 같다 — 판정은 세 단계다(2026-08-20·21·23 교훈):
 *   ⑴ 파일이 정말 바뀌었나        — 안 바뀌면 판정하지 않는다
 *   ⑵ **산출물이 정말 바뀌었나**  — 전수 훑개(나머지 모듈, 씨앗 200)의 출력이 그대로면 「뜻이 안 바뀐 변이」
 *   ⑶ 그제서야 시험이 빨개지나 — 그리고 **빨간 시험이 그 변이 자리의 것인가**
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다(`git show HEAD:` 는 미커밋 수정을 먹고,
 * autocrlf 라 줄끝이 바뀐다). 시작 전에 대상 파일이 커밋돼 있는지부터 묻는다.
 *
 * 사용: node scripts/qa/mutate-rest-degenerate.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GEO2 = "src/lib/middle/m1Geo2.ts";
const SYS = "src/lib/middle/m2SystemApply.ts";
const STAT = "src/lib/middle/m3Stat2.ts";
const SIM = "src/lib/middle/m2GeoSim.ts";
const TOP5F = "src/lib/middle/m1Top5f.ts";
const NUM = "src/lib/middle/m1Num.ts";
const SHARED = "src/lib/middle/m1Shared.ts";
const QUAD = "src/lib/middle/m3Quad.ts";
const ROOT3 = "src/lib/middle/m3Root.ts";
const PAGE = "src/__tests__/helpers/midPage.ts";
const CENSUS = "scripts/qa/census-middle-degenerate.ts";
const TEST = "src/__tests__/unit/middleRestDegenerate.test.ts";

/**
 * `expect` 는 **빨개져야 할 시험 이름의 조각**이다 — 그 이름이 실패 목록에 있어야 🔴 로 친다.
 */
const MUTATIONS = [
  {
    name: "다각형20-약분안함",
    file: GEO2,
    why: "「내각과 외각의 비가 $18:2$」 — 가장 간단한 비로 줄이지 않는다",
    find: "      const g = n % 2 === 0 ? 2 : 1; // gcd(n-2, 2)\n",
    to: "      const g = 1;\n",
    expect: "1-2|다각형|20",
  },
  {
    name: "연립10A-서로소거름삭제",
    file: SYS,
    why: "「남녀 비 $3:3$」·「$6:3$」을 되살린다",
    find: "      if (gcd(firstRatio, secondRatio) !== 1) return null;\n",
    to: "",
    expect: "2-1|연립일차방정식의 활용|10A",
  },
  {
    name: "산포도06-같은수·같은평균허용",
    file: STAT,
    why: "「A반 $8$명 … B반 $8$명」·「평균 $63$점 … $63$점」의 치우침을 되살린다",
    find: "        if (n1 === n2 || m1 === m2) return null;\n",
    to: "",
    expect: "3-2|산포도|06",
  },
  {
    name: "닮음14-답이발문에허용",
    file: SIM,
    why: "막대 $3$m·그림자 $3$m → 답=나무 그림자 를 되살린다",
    find: "        if (poleH === poleS || [poleH, poleS, treeS].includes(x)) return null;\n",
    to: "",
    expect: "2-2|도형의 닮음|14",
  },
  {
    name: "88X-가로세로같음허용",
    file: TOP5F,
    why: "목록 속 「가로 $11$cm, 세로 $11$cm인 직사각형」을 되살린다",
    find: "        if (cylR === cylH) return null;\n",
    to: "",
    expect: "1-2|다면체와 회전체|88X",
  },
  {
    name: "최소공배수30-배수관계허용",
    file: NUM,
    why: "$4$cm·$12$cm → 답 $12$cm 를 되살린다",
    find: "        if (L === a || L === b) return null;\n",
    to: "",
    expect: "1-1|최대공약수와 최소공배수|30",
  },
  // ── 지면 표기(원래 있던 결함 — 2회차, «알아서 추천 방향으로» 지시로 함께 고침) ──
  {
    name: "piTerm-계수1되살리기",
    file: SHARED,
    why: "「$(28+1\\pi)$」 — 원과 부채꼴·입체가 같이 쓰는 한 함수를 되돌린다",
    find: '  return k === 1 ? "\\\\pi" : `${k}\\\\pi`;\n',
    to: "  return `${k}\\\\pi`;\n",
    expect: "1-2|원과 부채꼴|17",
  },
  {
    name: "가드-π√앞계수1규칙끄기",
    file: PAGE,
    why: "`pageSmells` 가 `1\\pi` 를 다시 못 본다 — 규칙 단정이 잡아야 한다",
    find: '  ["π·√ 앞에 계수 1 을 적었다", /(?<![\\d.])1\\\\(?:pi|sqrt)(?![a-zA-Z])/],\n',
    to: "",
    expect: "계수 1 은 냄새고",
  },
  {
    name: "이차12-조사못박기",
    file: QUAD,
    why: "「$k=4$은 버린다」를 되살린다",
    find: '$k=${small}$${josaNum(small, "은", "는")} 버린다.',
    to: "$k=${small}$은 버린다.",
    expect: "3-1|이차방정식의 활용|12",
  },
  {
    name: "근호17-계수1되살리기",
    file: ROOT3,
    why: "「$1\\sqrt{15}$」를 되살린다",
    find: "전개하면 $${sqrtTerm(k * q, p)}-",
    to: "전개하면 $${k * q}\\\\sqrt{${p}}-",
    expect: "3-1|근호를 포함한 식의 계산|17",
  },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function digest() {
  const r = spawnSync(
    "npx",
    ["tsx", CENSUS, "--module", "rest", "--seeds", "200", "--smells", "--tsv"],
    { encoding: "utf8", shell: process.platform === "win32" },
  );
  // 훑개는 결함이 있으면 종료 1 이다(B·C 행이 남아 있어 늘 1) — **출력**을 지문으로 쓴다.
  // `--smells` 를 켠다 — 지면 표기 변이(π 계수·조사)는 발문이 아니라 답·해설을 바꾼다.
  return `${r.stdout}\n${r.stderr}`.trim();
}

/** 실패한 시험 이름들 — 기동 실패면 `null`(판정 불가). */
function runTest() {
  const out = join(tmpdir(), `mutate-rest-degenerate-${process.pid}.json`);
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
