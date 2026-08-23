/**
 * 중1 「정수와 유리수의 계산」 변이 시험 — **가드는 망가뜨려 봐야 가드인 줄 안다.**
 *
 * 판정은 세 단계다(2026-08-20·21 교훈, 둘 다 실제로 오판을 냈다):
 *   ⑴ 파일이 정말 바뀌었나        — 안 바뀌면 판정하지 않고 멈춘다
 *   ⑵ **산출물이 정말 바뀌었나**  — 안 바뀌면 「뜻이 안 바뀐 변이」다. 판정 거부.
 *   ⑶ 그제서야 시험이 빨개지나
 *
 * ⑵ 를 건너뛰면 멀쩡한 가드를 의심하고 고치러 간다 — 가드가 없는 것보다 나쁘다.
 *
 * 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**다. `git show HEAD:` 로 짜면
 * 커밋 안 된 수정을 먹는다(2026-08-23 실제 사고). 그래서 시작 전에
 * 대상 파일이 커밋돼 있는지부터 묻고, 아니면 아무것도 안 하고 멈춘다.
 *
 * 사용: node scripts/qa/mutate-m1-calc.mjs
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const MODULE = "src/lib/middle/m1Calc.ts";
const TEST = "src/__tests__/unit/middleM1Calc.test.ts";

/**
 * 변이 목록. 「역산 수치 하나 틀림 · 답을 엉뚱한 값으로 · 검산식이 갈라주는 자리」
 * 를 고루 덮는다(브리프 계약 7).
 */
const MUTATIONS = [
  {
    name: "01-역산방향뒤집기",
    why: "답에서 둘째 항을 역산하는 자리를 거꾸로 — 발문이 답과 안 맞게 된다",
    find: "      const B = subQ(S, A); // 발문의 둘째 수를 답에서 역산",
    to: "      const B = subQ(A, S); // 변이",
  },
  {
    name: "07-답을엉뚱한식으로",
    why: "묻는 것은 $a+b$ 인데 답을 $a-b$ 로 낸다",
    find: "      const S = addQ(A, B);\n      if (S.n === 0 || L1.n === 0 || L2.n === 0) return null;",
    to: "      const S = subQ(A, B);\n      if (S.n === 0 || L1.n === 0 || L2.n === 0) return null;",
  },
  {
    name: "약분을안한다",
    why: "$\\dfrac{4}{2}$ 가 그대로 지면에 나간다 — 2026-08-23 실제 결함 46자리",
    find: "  const g = gcd(sn, sd);\n  return { n: sn / g, d: sd / g };",
    to: "  return { n: sn, d: sd };",
  },
  {
    name: "분모1도분수로쓴다",
    why: "정수를 $\\dfrac{4}{1}$ 로 찍는다",
    find: "function texQ(v: Q): string {\n  if (v.d === 1) return `${v.n}`;",
    to: "function texQ(v: Q): string {\n  if (false) return `${v.n}`;",
  },
  {
    name: "15-바깥부호무시",
    why: "괄호 밖 $-$ 를 안 세어 답의 부호가 뒤집힌다",
    find: "      const P = outerMinus ? negQ(raw) : raw;",
    to: "      const P = raw;",
  },
  {
    name: "21-대괄호앞수역산틀림",
    why: "혼합 계산에서 $E$ 의 부호를 잘못 되돌린다 — 항별로 나눠 더하면 갈린다",
    find: "      const B = A * (T - E) + brace.n; // 대괄호 앞의 수를 역산",
    to: "      const B = A * (T + E) + brace.n; // 변이",
  },
  {
    name: "24-셋째조건부호뒤집기",
    why: "발문에 적는 $a\\div c$ 의 부호만 뒤집는다 — 답의 $c$ 와 어긋난다",
    find: "      const s3 = Math.sign(sa / sc);",
    to: "      const s3 = -Math.sign(sa / sc);",
  },
  {
    name: "25-발문문구를최대로고정",
    why: "「가장 작은 수」를 구하게 해 놓고 발문에는 「가장 큰」이라고 적는다",
    find: '          `${wantMax ? "가장 큰" : "가장 작은"} 수를 구하시오.`,',
    to: '          `가장 큰 수를 구하시오.`,',
  },
  {
    name: "14-발문문구를최소로고정",
    why: "「가장 큰 값」을 구하게 해 놓고 발문에는 「가장 작은」이라고 적는다",
    find: '          `${wantMax ? "가장 큰" : "가장 작은"} 값을 구하시오.`,',
    to: '          `가장 작은 값을 구하시오.`,',
  },
];

/*
 * 25 의 변이가 한 번 바뀐 내력도 남긴다. 처음에는 「극값을 고르는 비교에서
 * `wantMax` 를 무시한다」였고 빨강이었다. 그런데 지면 검수 뒤 생성기에
 * 「대입해 보일 점에서도 같은 것이 극값이라야 한다」는 조건이 들어가면서, 그
 * 변이는 **문항을 못 만들고 스스로 걸러졌다**(제품은 더 안전해졌지만 변이는
 * 초록이 됐다). 그때 드러난 진짜 구멍은 따로였다 — 시험이 **발문의 「가장 큰/
 * 작은」 문구와 답이 같은 쪽인지**를 한 번도 안 봤다. 그래서 그 검사를 더하고
 * 변이를 문구 자리로 옮겼다. 14 도 같은 구멍이 있어 함께 막았다.
 *
 * 왜 「가드 제거」가 아니라 이 둘인가 — **써 보고 바꿨다.**
 * 처음에는 24 의 `sols.length !== 1` 과 25 의 `winner !== bi` 를 껐다. 둘 다
 * ⑵ 에서 «산출물이 그대로» 로 걸렸다. 전수로 세어 보니(scripts/qa 의 일회성 조사)
 * 지금 조건 얼개·보기 풀에서는 그 두 가드가 **한 번도 안 걸린다**
 * (부호 8가지 중 0 · 보기 조합 1008가지 중 0). 즉 못 잡는 가드가 아니라
 * **걸릴 일이 없는 가드**였다 — 그 사실 자체를 시험으로 박아 두었다
 * (`middleM1Calc.test.ts` 의 「전수」 두 건). 변이는 산출물이 실제로 달라지는
 * 자리로 옮겼다.
 */

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8" }).trim();
}

function digest() {
  const r = spawnSync("npx", ["tsx", "scripts/qa/m1-calc-digest.ts"], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (r.status !== 0) return `DIGEST-FAILED:${(r.stderr || "").slice(0, 200)}`;
  return r.stdout.trim();
}

function runTest() {
  const r = spawnSync("npx", ["vitest", "run", TEST], {
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return r.status ?? 1;
}

// ── ⑴ 시작 전 — 대상 파일이 커밋돼 있는가 ───────────────────────────
const dirty = sh("git", ["status", "--porcelain", "--", MODULE, TEST]);
if (dirty !== "") {
  console.error("🛑 대상 파일에 커밋 안 된 수정이 있습니다 — 이 스크립트는 그 파일을 덮어씁니다.");
  console.error(dirty);
  process.exit(2);
}

const original = readFileSync(MODULE);

console.log("기준 상태를 잽니다…");
const baseDigest = digest();
if (baseDigest.startsWith("DIGEST-FAILED")) {
  console.error(`🛑 기준 산출물을 못 냈습니다: ${baseDigest}`);
  process.exit(2);
}
const baseStatus = runTest();
if (baseStatus !== 0) {
  console.error("🛑 기준 시험이 이미 빨갛습니다 — 변이를 판정할 수 없습니다.");
  process.exit(2);
}
console.log(`기준 지문 ${baseDigest}`);
console.log(`기준 시험 초록\n`);

const results = [];
try {
  for (const m of MUTATIONS) {
    const src = original.toString("utf8");
    // 앵커는 LF 로 적고 **파일의 줄끝에 맞춰** 찾는다. 이 저장소는 autocrlf 라
    // `git checkout` 한 번이면 작업 트리가 CRLF 가 되고, 그러면 여러 줄 앵커가
    // 통째로 0개가 된다(2026-08-23 실제로 셋이 그렇게 «판정 불가» 로 떨어졌다).
    const eol = src.includes("\r\n") ? "\r\n" : "\n";
    const find = m.find.split("\n").join(eol);
    const to = m.to.split("\n").join(eol);
    const hits = src.split(find).length - 1;
    if (hits !== 1) {
      results.push({ name: m.name, verdict: `🛑 앵커 ${hits}개 — 판정 불가` });
      console.log(`🛑 ${m.name}: 앵커가 ${hits}개입니다(1개라야 한다). 판정하지 않습니다.`);
      continue;
    }
    writeFileSync(MODULE, Buffer.from(src.replace(find, to), "utf8"));

    // ⑴ 파일이 바뀌었나
    const after = readFileSync(MODULE);
    if (after.equals(original)) {
      results.push({ name: m.name, verdict: "🛑 파일이 안 바뀜 — 판정 거부" });
      console.log(`🛑 ${m.name}: 파일이 안 바뀌었습니다. 판정하지 않습니다.`);
      continue;
    }

    // ⑵ 산출물이 바뀌었나
    const d = digest();
    if (d === baseDigest) {
      results.push({ name: m.name, verdict: "🛑 산출물이 그대로 — 뜻이 안 바뀐 변이" });
      console.log(`🛑 ${m.name}: 파일은 바뀌었지만 **산출물이 그대로**입니다. 판정 거부.`);
      writeFileSync(MODULE, original);
      continue;
    }

    // ⑶ 시험이 빨개지나
    const status = runTest();
    const verdict = status !== 0 ? "🔴 빨강 (가드가 산다)" : "🟢 초록 ← 가드가 아니다";
    results.push({ name: m.name, verdict });
    console.log(`${verdict}  ${m.name} — ${m.why}`);
    writeFileSync(MODULE, original);
  }
} finally {
  // 되돌리기는 **시작할 때 읽어 둔 바이트 그대로**
  writeFileSync(MODULE, original);
}

const restored = readFileSync(MODULE);
console.log(`\n원복 확인: ${restored.equals(original) ? "바이트 동일 ✓" : "🛑 다르다"}`);
console.log(`원복 후 git status: ${sh("git", ["status", "--porcelain", "--", MODULE]) || "깨끗 ✓"}`);

const red = results.filter((r) => r.verdict.startsWith("🔴")).length;
console.log(`\n빨강 ${red} / 변이 ${MUTATIONS.length}`);
for (const r of results) console.log(`  ${r.verdict}  ${r.name}`);
if (red < 3) {
  console.error("\n🛑 빨강이 셋 미만입니다 — 계약 미달(브리프 계약 7).");
  process.exit(1);
}
