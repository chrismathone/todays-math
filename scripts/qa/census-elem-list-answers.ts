/**
 * **「정답을 여러 값으로 나열하는 갈래」가 어디에 있나** — 전 학년 census.
 *
 *     npx tsx scripts/qa/census-elem-list-answers.ts            # 전 학년
 *     npx tsx scripts/qa/census-elem-list-answers.ts 초3        # 한 학년만
 *     npx tsx scripts/qa/census-elem-list-answers.ts --selftest # 이 자가 눈이 멀었나
 *
 * ── 왜 있나 ──────────────────────────────────────────────────────────────────
 * D-113 확대 갈래를 채우며 「심화상은 **답이 후보 전체**다」를 축으로 잡았다.
 * 리드가 물었다 — 「그럼 이미 나열 답을 내는 심화하와는 어떻게 가르나?
 * 초4 2-1-4 심화하가 벌써 «□ 안에 들어갈 수 있는 수를 모두 구하시오» 다.」
 *
 * 그 물음은 **세어 봐야** 답할 수 있다. 결과(2026-08-30, 갈래 928 × 씨앗 12):
 *
 *     연산 10갈래 · 기본 6 · 응용 7 · 심화하 7 이 이미 나열 답을 낸다.
 *     「모두 구하시오」 **낱말**은 더 심하다 — 연산 58건 · 기본 60건.
 *
 * → **둘 다 갈래를 가르는 성질이 아니다.** 「나열이면 심화상」으로 읽으면 안 된다.
 *   확대 갈래의 축은 **소단원 안의 약속**이어야 한다(심화중=후보 하나 ·
 *   심화상=그 후보 집합 전체), 그리고 그 약속은 발문에서 후보를 **다시 세워**
 *   확인해야 한다 — `src/__tests__/unit/elemTiersG3Mul21Extend.test.ts` 가 그렇게 한다.
 *
 * ── 🔴 이 자가 **먼저 틀렸던 자리** ─────────────────────────────────────────
 * 첫 판은 「정답에 `\d+` 가 둘 이상」으로 셌다. **심화하 60갈래**가 걸렸는데
 * **전부 거짓**이었다 — 소수 `$5.7$` 는 «5»·«7» 로, 대분수 `$2\frac13$` 는 셋으로
 * 세어진다. 나열의 성질은 «수가 여럿»이 아니라 **«쉼표로 갈라 적었다»** 다.
 * 눈금(양성 2 · 음성 4)을 붙이고서야 60 → 7 이 됐다.
 *
 * ⚠️ **못 재는 것**: 「그 나열이 정말 후보 집합인가」는 안 본다. 답 **모양**만 본다 —
 *    「몫 $3$, 나머지 $2$」처럼 한 값을 두 조각으로 적은 것은 한글이 있어 빠지지만,
 *    한글 없이 두 값을 적는 다른 부류가 있으면 여기 섞인다. 이 자는 **census 이지
 *    게이트가 아니다**(종료 코드로 막지 않는다).
 */
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = Array.from({ length: 12 }, (_, i) => 20260830 + i * 7919);

/**
 * 정답이 **값 여럿을 나열**하는가 — `$5,\ 6$` 도 `$5$, $6$` 도 참이다.
 *
 * 한글이 낀 답(「몫 $3$, 나머지 $2$」)은 나열이 아니다 — 한 값을 두 조각으로 적은 것이다.
 */
export function isListAnswer(answer: string): boolean {
  if (/[가-힣]/.test(answer)) return false;
  const parts = answer
    .replace(/\\ /g, " ")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length >= 2 && parts.every((p) => /\d/.test(p));
}

/** 발문이 「모두」를 말하는가 — **손 목록이다.** 이 자가 재는 두 축 중 새는 쪽. */
export function saysAll(content: string): boolean {
  return /모두 구하시오|모두 쓰시오|모두 찾아/.test(content);
}

type Row = {
  grade: string;
  section: string;
  tier: string;
  list: number;
  word: number;
};

export function scan(gradeFilter?: string): { rows: Row[]; tiers: number } {
  const rows: Row[] = [];
  let tiers = 0;
  for (const u of elementaryUnits()) {
    if (gradeFilter && u.grade !== gradeFilter) continue;
    for (const tier of supportedTiers(u)) {
      tiers += 1;
      let list = 0;
      let word = 0;
      for (const s of SEEDS) {
        const p = generateElementaryProblem(u, s, tier);
        if (isListAnswer(p.answer)) list += 1;
        if (saysAll(p.content)) word += 1;
      }
      if (list > 0 || word > 0)
        rows.push({ grade: u.grade, section: u.section, tier, list, word });
    }
  }
  return { rows, tiers };
}

// ── 눈금 — 양성·음성을 **둘 다** 댄다(양성만 대면 지어냄이 구조적으로 0이 된다) ──
const GAUGE: [string, boolean][] = [
  ["$5,\\ 6$", true],
  ["$5$, $6$", true],
  ["$12$", false],
  ["$5.7$", false],
  ["$2\\frac{1}{3}$", false],
  ["몫 $3$, 나머지 $2$", false],
];

function runSelftest(): number {
  let bad = 0;
  for (const [s, want] of GAUGE) {
    const got = isListAnswer(s);
    if (got !== want) bad += 1;
    console.log(`${got === want ? "✅" : "❌"} ${s} → ${got} (기대 ${want})`);
  }
  console.log(`\n눈금 ${GAUGE.length}건 (양성 2 · 음성 4) — 실패 ${bad}건`);
  return bad === 0 ? 0 : 1;
}

function main(): void {
  if (process.argv.includes("--selftest")) process.exit(runSelftest());

  const grade = process.argv.slice(2).find((a) => a.startsWith("초"));
  const { rows, tiers } = scan(grade);

  const by = new Map<string, { units: number; list: number; word: number }>();
  for (const r of rows) {
    const cur = by.get(r.tier) ?? { units: 0, list: 0, word: 0 };
    cur.units += 1;
    cur.list += r.list;
    cur.word += r.word;
    by.set(r.tier, cur);
  }

  console.log(
    `훑은 갈래 ${tiers}개 · 씨앗 ${SEEDS.length}개 — ${grade ?? "전 학년"}\n`,
  );
  console.log("갈래별 — 나열 답이나 「모두」 표지가 **하나라도** 나온 갈래 수");
  for (const [tier, v] of by) {
    console.log(
      `  ${tier}\t갈래 ${String(v.units).padStart(3)}개\t나열 답 ${String(v.list).padStart(4)}건\t「모두」 표지 ${String(v.word).padStart(4)}건`,
    );
  }

  console.log(
    "\n심화하인데 나열 답을 내는 자리 — 「나열=심화상」이 안 되는 근거",
  );
  const clash = rows.filter((r) => r.tier === "심화하" && r.list > 0);
  for (const r of clash)
    console.log(`  ${r.grade} ${r.section}\t나열 ${r.list}/${SEEDS.length}`);
  console.log(`  → ${clash.length}갈래`);

  console.log(
    "\n⚠️ census 다 — 게이트가 아니다. 「0」이 «깨끗»인지 «못 셈»인지는\n" +
      "   `--selftest` 로 먼저 가른다.",
  );
}

if (isDirectScript(import.meta.url)) main();
