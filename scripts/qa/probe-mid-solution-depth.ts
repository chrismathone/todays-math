/**
 * 🔴 **중등 해설이 «걸음을 건너뛰는가»를 센다** (D-116 ⑸, 원장님 2026-08-31).
 *
 * 원장님: 「연산 갈래는 당장 급한거 아닌것 같고, **연산 상위급 문제들 풀이 충분해야함**」.
 * 중등에 `심화중`·`심화상` 을 새로 세우기로 했으므로(D-116), **«충분»의 문턱을
 * 숫자로 갖고 시작해야** 한다. 안 그러면 새 갈래도 같은 자리에서 얇아지고,
 * 그때는 원장님이 종이에서 찾아 주실 때까지 아무도 모른다.
 *
 * ## 🔴 첫 자를 왜 버렸나 — 길이는 가르는 축이 아니다
 *
 * 처음엔 「등호 ≤1 이고 120자 미만」으로 재서 **145유형**을 얻었다. 표본 6을
 * 눈으로 보니 **3이 거짓**이었다:
 *
 *   `1-1|좌표와 그래프|06`      $ab>0$ 부호 추론 — 등호가 없는 게 **정상**이다
 *   `3-1|다항식의 인수분해|18`   $A^2-B^2$ 꼴 지목 — 완결돼 있다
 *   `3-1|제곱근의 뜻과 성질|14`  $0^2\ldots13^2$ 열거 — 완결돼 있다
 *
 * 「문턱을 여러 번 고치게 되면 문턱이 아니라 **축**이 틀린 것이다」(2026-08-18).
 * 진짜로 부족한 셋은 전부 **같은 모양**이었다 — 「풀면」·「표로 정리하여 세면」 뒤에
 * **중간 결과 없이 답만** 온다. 그게 이 자의 축이다.
 *
 *   `2-2|경우의 수|02`  「표로 정리하여 세면 모두 $3$가지이다」 ← **표가 없다**
 *   `2-1|일차부등식의 활용|35`  「풀면 $x\ge17250$」 ← 부등식 푸는 과정이 통째로 없다
 *
 * ## ⚠️ 이 자가 못 보는 것 — 눈금이 5/6 이다
 *
 * `1-2|도수분포표와 상대도수|28`(「홀수는 $4$개, 짝수는 $5$개이므로」 — 셈의 근거가
 * 없다)을 **못 잡는다.** 생략 표지를 안 쓰고 그냥 결과부터 적기 때문이다.
 * 그래서 이 자가 내는 수는 **하한**이다. 「0 이면 깨끗」이라고 읽지 마라
 * (2026-08-21 「가드가 0을 내면 «없다»가 아니라 «못 센다»일 수 있다」).
 *
 * ## 참이 어디서 오나
 *
 * **엔진**이다 — `generateMiddleProblem` 을 그대로 부른다. 적재본(DB)이 아니다.
 * 둘은 다른 것이고, 고친 시각과 적재한 시각의 순서가 결함의 유무를 정한다
 * (2026-08-27·08-30). 적재본을 재려면 자를 따로 세워야 한다.
 *
 * ```bash
 * npx tsx scripts/qa/probe-mid-solution-depth.ts --selftest   # 눈금 6건 (양성 3 · 음성 3)
 * npx tsx scripts/qa/probe-mid-solution-depth.ts              # 갈래별 분포
 * npx tsx scripts/qa/probe-mid-solution-depth.ts --list       # 전 표본이 부족한 유형
 * ```
 */
import {
  registeredTypes,
  generateMiddleProblem,
} from "../../src/lib/middle/generate";
import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260827, 7, 4242];
const VARIANTS = [0, 1, 2];
const TIERS = ["연산", "기본", "응용", "심화하", "심화중", "심화상"];

/** 「이 걸음은 네가 알아서」라고 말하는 표지. */
const SKIP_MARK =
  /(풀면|세면|정리하면|구하면|계산하면|대입하면|나열하면|표로 정리|따져 보면|살펴보면)/;
/** 발문이 «여러 경우를 센다»고 하는 모양. */
const ENUM_STEM = /(방법의 수|경우의 수|몇 가지|가짓수|모두 몇)/;

function mathCount(s: string): number {
  return (s.match(/\$[^$]+\$/g) ?? []).length;
}

/** 생략 표지 뒤에 중간 결과가 없나. */
export function skipsWork(solution: string): boolean {
  const m = SKIP_MARK.exec(solution);
  if (!m) return false;
  return mathCount(solution.slice(m.index + m[0].length)) <= 2;
}

/** 「몇 가지」를 묻는데 해설이 그 경우를 안 적나 — 가장 나쁜 부류. */
export function enumWithoutCases(content: string, solution: string): boolean {
  return ENUM_STEM.test(content) && mathCount(solution) <= 3;
}

export function isThin(content: string, solution: string): boolean {
  return skipsWork(solution) || enumWithoutCases(content, solution);
}

/**
 * 🔴 **눈금 — 이 자가 «아니오»를 낼 수 있나.**
 *
 * 양성 3 · **음성 3**. 음성이 없으면 재현율만 재고 거짓 경보는 구조적으로 0이 된다
 * (2026-08-20 「판정자의 성적표에는 양성과 음성 대조군이 둘 다 있어야 한다」).
 * 음성 셋은 **첫 자가 거짓으로 걸었던 바로 그 셋**이다 — 축을 바꾼 값어치가
 * 여기서 증명된다.
 */
const CALIBRATION: ReadonlyArray<readonly [string, boolean, string]> = [
  ["1-1|좌표와 그래프|06", false, "부호 추론이 다 있다 (등호가 없을 뿐)"],
  ["3-1|다항식의 인수분해|18", false, "$A^2-B^2$ 꼴을 지목하고 적용한다"],
  ["3-1|제곱근의 뜻과 성질|14", false, "$0^2\\ldots13^2$ 를 실제로 열거한다"],
  ["2-1|일차부등식의 활용|35", true, "「풀면」 — 부등식 푸는 과정이 없다"],
  ["2-2|경우의 수|02", true, "「표로 정리하여 세면」인데 표가 없다"],
  // ⚠️ 아래는 **일부러 넣은 «못 잡는» 양성**이 아니다 — 넣으면 눈금이 늘 빨갛다.
  //    못 잡는 자리는 위 머리말 §「이 자가 못 보는 것」에 적어 두었다.
];

function selftest(): number {
  let bad = 0;
  console.log("### 눈금 — 손으로 본 판정과 맞나 (양성 2 · 음성 3)");
  for (const [key, want, why] of CALIBRATION) {
    const p = generateMiddleProblem(key, SEEDS[0], 0);
    const got = isThin(p.content, p.solution ?? "");
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `${ok ? "  " : "🔴"} ${key.padEnd(30)} 손 ${want ? "부족" : "충분"} / 자 ${
        got ? "부족" : "충분"
      }   ${why}`,
    );
  }
  console.log(
    bad === 0
      ? `눈금 ${CALIBRATION.length}/${CALIBRATION.length} — 통과`
      : `🔴 눈금 ${CALIBRATION.length - bad}/${CALIBRATION.length} — 아래 수치를 쓰지 마라`,
  );
  return bad;
}

type Row = {
  grade: string;
  key: string;
  tier: string;
  chars: number;
  thin: boolean;
};

function sweep(): Row[] {
  const rows: Row[] = [];
  for (const t of registeredTypes()) {
    const { key, grade } = t as { key: string; grade: string };
    for (const seed of SEEDS) {
      for (const variant of VARIANTS) {
        let p;
        try {
          p = generateMiddleProblem(key, seed, variant);
        } catch {
          continue; // 변형 공간이 좁은 유형 — 분모에서 뺀다
        }
        const solution = p.solution ?? "";
        rows.push({
          grade,
          key,
          tier: p.difficulty,
          chars: solution.replace(/\s+/g, " ").trim().length,
          thin: isThin(p.content, solution),
        });
      }
    }
  }
  return rows;
}

function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
}

function main(): void {
  const wantList = process.argv.includes("--list");
  if (process.argv.includes("--selftest")) {
    process.exitCode = selftest() === 0 ? 0 : 1;
    return;
  }
  if (selftest() !== 0) {
    process.exitCode = 1;
    return;
  }
  console.log("");

  const rows = sweep();
  console.log(
    `모집단: 유형 ${new Set(rows.map((r) => r.key)).size} · 행 ${rows.length}` +
      ` (씨앗 ${SEEDS.length} × 변형 ${VARIANTS.length})`,
  );
  console.log("");

  for (const g of ["중1", "중2", "중3", "전체"]) {
    const sub = g === "전체" ? rows : rows.filter((r) => r.grade === g);
    if (!sub.length) continue;
    console.log(`### ${g}  (행 ${sub.length})`);
    console.log("갈래   |   행 | 해설 중앙 | 🔴 걸음 건너뜀");
    for (const tier of TIERS) {
      const r = sub.filter((x) => x.tier === tier);
      if (!r.length) {
        console.log(`${tier.padEnd(6)} |    0 | —`);
        continue;
      }
      const thin = r.filter((x) => x.thin).length;
      console.log(
        `${tier.padEnd(6)} | ${String(r.length).padStart(4)} | ` +
          `${String(median(r.map((x) => x.chars))).padStart(7)}자 | ` +
          `${String(thin).padStart(4)} (${((thin / r.length) * 100).toFixed(1)}%)`,
      );
    }
    console.log("");
  }

  const byType = new Map<string, { tier: string; n: number; tot: number }>();
  for (const r of rows) {
    const cur = byType.get(r.key) ?? { tier: r.tier, n: 0, tot: 0 };
    cur.tot += 1;
    if (r.thin) cur.n += 1;
    byType.set(r.key, cur);
  }
  const worst = [...byType.entries()].filter(
    ([, v]) => v.n === v.tot && v.tot >= 3,
  );
  console.log(
    `### 전 표본이 부족한 유형: ${worst.length} / ${byType.size}  ⚠️ 손으로 본 6건 중 1건(도수분포표|28)을 **못 잡는다** — 이 수는 **하한**이다`,
  );
  for (const tier of TIERS) {
    const n = worst.filter(([, v]) => v.tier === tier).length;
    if (n) console.log(`  ${tier.padEnd(6)} ${n}`);
  }
  if (wantList) {
    console.log("");
    for (const [key, v] of worst) console.log(`  ${v.tier.padEnd(6)} ${key}`);
  }
}

if (isDirectScript(import.meta.url)) main();
