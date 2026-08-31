/**
 * 🔴 **중1 상위 갈래(`심화중`·`심화상`)가 «정말 서 있는가»를 잰다** (D-116, 브리프 §3).
 *
 * 초등이 네 물결에 걸쳐 물린 함정 셋이 그대로 중등에 온다. 이 자는 그 셋을
 * **갈래마다 따로** 재고, 축이 **없는** 자리는 「깨끗」이 아니라 **「축 없음」**으로 찍는다
 * (「0 은 «깨끗»과 «못 셈»을 안 가른다」 — 이 저장소가 여러 번 데인 자리).
 *
 * ```bash
 * npx tsx scripts/qa/probe-middle-top-m1.ts --selftest   # 눈금 12건 (양성 7 · 음성 5)
 * npx tsx scripts/qa/probe-middle-top-m1.ts              # ㉠㉡㉢ + 해설 깊이
 * npx tsx scripts/qa/probe-middle-top-m1.ts --overlap    # ㉢ 만 (천장 포함)
 * ```
 *
 * ## 무엇을 재나
 *
 * **㉠ 지름길** — 「굳힘 조건을 **안 읽고** 지면의 수만으로 뻔한 한 수를 집으면 몇 %가
 * 맞나」. 초6 에서 두 갈래가 이것으로 병합이 막혔다(각각 **전수** 100%). 우연 수준은
 * 후보가 $k$개일 때 $1/k$ 다. 여기서는 **두 벌**로 잰다.
 *   ⑴ **지면 수 조합 20종** — 유형을 안 가리는 자다. 최댓값·최솟값·합·차·곱·
 *      최대공약수·최소공배수… 를 전부 만들어 정답과 맞대 본다.
 *   ⑵ **유형마다 «굳힘 조건을 지운 판»** — 그 조건이 없을 때 나오는 답을 실제로
 *      계산해 견준다. ⑴ 이 못 보는 자리를 이쪽이 본다.
 *
 * **㉡ 굳힘이 항등식인가** — 굳힘 인자를 흔들어 답이 **안 바뀌면** 그것은 굳힘이 아니라
 * 장식이다. 초등에서 이 검사로만 갈래 넷이 걸렸다.
 *
 * **㉢ 갈래끼리 겹침** — 새 갈래가 그 소단원의 `심화하`·`응용` 과 한 시험지에 실린다.
 * ⚠️ 「수+정답」 열쇠에는 **천장**이 있다(심화상에서 자기 자신과도 19.2%). 그래서
 * **쌍마다 천장을 먼저 찍고**, 천장이 문턱 아래면 «겹침 없음»이 아니라 **«판정 불가»**
 * 로 적는다. 한글 낱말 Jaccard 를 같이 낸다(심화에서는 이쪽이 듣는다).
 *
 * **⑸ 해설 깊이** — 규칙을 옮겨 적지 않는다. `probe-middle-solution-depth.ts` 의
 * `isThin` 을 **그대로 import** 한다(두 벌이 되면 한쪽만 고쳐도 아무도 모른다).
 *
 * ## 🔴 이 자가 못 보는 것
 *
 * 1. **「해설이 밟는 길」을 못 본다.** D-115 ⑾ 이 「중·상의 참은 해설이다」라고 못 박았고
 *    「어느 쪽인지는 기계가 못 정한다 — 사람이 본다」고 이어 적었다. `--rubric` 이 내는
 *    표는 **사람이 읽을 목록**이지 판정이 아니다.
 * 2. **반증 ④(같은 소단원의 아래 갈래가 이 잣대를 통과하나)를 기계로 못 판정한다.**
 *    그래서 그 소단원의 연산·기본·응용을 **전량 찍어** 사람이 읽게 한다.
 * 3. 지면 수 조합 20종은 **손 목록**이다. 목록에 없는 지름길은 구조적으로 0이 된다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";
import {
  coprimePairSums,
  divisors,
  gcd,
  naturalRootCandidates,
  ratioValue,
  solveSameRemainder,
  M1_TOP,
} from "../../src/lib/middle/m1Top";
import { isThin } from "./probe-middle-solution-depth";
import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [20260827, 7, 4242, 99991, 31337, 5150131, 20260901, 12345];
const VARIANTS = [0, 1, 2];
/** 「수+정답」 열쇠가 뜻을 가지려면 천장이 이보다 높아야 한다. */
const CEILING_FLOOR = 0.5;

// ── 열쇠 ────────────────────────────────────────────────────

/** 지면에 찍힌 수 전부 (부호 포함). */
export function pageNumbers(content: string): number[] {
  const out: number[] = [];
  for (const m of content.matchAll(/-?\d+(?:\.\d+)?/g)) out.push(Number(m[0]));
  return out;
}

/** 답에서 처음 나오는 수. */
export function answerNumber(answer: string): number {
  const m = answer.match(/-?\d+(?:\.\d+)?/);
  if (m === null) throw new Error(`답에 수가 없다: ${answer}`);
  return Number(m[0]);
}

function lcm(a: number, b: number): number {
  return Math.abs((a / gcd(a, b)) * b);
}

/**
 * 🔴 **지면 수만으로 만들 수 있는 «뻔한 한 수» 목록.**
 *
 * ⚠️ 손 목록이라 **샌다** — 여기 없는 지름길은 구조적으로 0이 된다. 그래서 유형마다
 * 「굳힘 조건을 지운 판」을 따로 두고(⑵), 둘을 같이 본다.
 */
export function obviousCandidates(
  nums: readonly number[],
): Map<string, number> {
  const out = new Map<string, number>();
  const xs = nums.filter((v) => Number.isInteger(v));
  if (xs.length === 0) return out;
  const pos = xs.filter((v) => v > 0);
  out.set("최댓값", Math.max(...xs));
  out.set("최솟값", Math.min(...xs));
  out.set(
    "합",
    xs.reduce((a, b) => a + b, 0),
  );
  if (pos.length > 0) {
    out.set(
      "양수합",
      pos.reduce((a, b) => a + b, 0),
    );
    out.set("양수최댓값", Math.max(...pos));
    out.set("양수최솟값", Math.min(...pos));
    out.set(
      "전체최대공약수",
      pos.reduce((a, b) => gcd(a, b)),
    );
  }
  for (let i = 0; i < xs.length; i += 1) {
    for (let j = i + 1; j < xs.length; j += 1) {
      const a = xs[i]!;
      const b = xs[j]!;
      out.set(`차 #${i}#${j}`, Math.abs(a - b));
      out.set(`합 #${i}#${j}`, a + b);
      out.set(`곱 #${i}#${j}`, a * b);
      if (a !== 0 && b !== 0) {
        out.set(`최대공약수 #${i}#${j}`, gcd(a, b));
        if (Math.abs(a * b) < 1e7) out.set(`최소공배수 #${i}#${j}`, lcm(a, b));
        if (b !== 0 && a % b === 0) out.set(`몫 #${i}#${j}`, a / b);
        if (a !== 0 && b % a === 0) out.set(`몫 #${j}#${i}`, b / a);
      }
    }
  }
  return out;
}

/** 한글 낱말 Jaccard — 심화에서 진짜 겹침은 0.94~0.97, 무관은 0.03~0.06. */
export function koreanJaccard(a: string, b: string): number {
  const words = (s: string): Set<string> =>
    new Set(
      s
        .replace(/\$[^$]*\$/g, " ")
        .split(/[^가-힣]+/)
        .filter((w) => w.length >= 2),
    );
  const x = words(a);
  const y = words(b);
  if (x.size === 0 && y.size === 0) return 1;
  let hit = 0;
  for (const w of x) if (y.has(w)) hit += 1;
  return hit / (x.size + y.size - hit);
}

/** 「지면 수 + 정답」 열쇠 — 작은 집합에서 잘 듣는다. */
export function numAnswerJaccard(
  aContent: string,
  aAnswer: string,
  bContent: string,
  bAnswer: string,
): number {
  const key = (c: string, ans: string): Set<string> =>
    new Set([...pageNumbers(c).map(String), `=${answerNumber(ans)}`]);
  const x = key(aContent, aAnswer);
  const y = key(bContent, bAnswer);
  let hit = 0;
  for (const w of x) if (y.has(w)) hit += 1;
  return hit / (x.size + y.size - hit);
}

// ── ㉠·㉡ — 유형마다 «굳힘 조건을 지운 판» ──────────────────────

type Row = {
  key: string;
  tier: string;
  seed: number;
  variant: number;
  content: string;
  answer: string;
  solution: string;
  facts: Record<string, number>;
};

/**
 * 유형마다 ⑴ 굳힘 조건을 **지운** 답 ⑵ 굳힘 인자를 **흔든** 답.
 *
 * `null` 은 「그 축이 이 유형에 **없다**」는 뜻이다 — 「0%」와 **다른 말**이라
 * 표에서도 따로 찍는다.
 */
const AXES: Record<
  string,
  {
    /** 굳힘 조건을 안 읽고 낼 수 있는 답. 없으면 `null`(축 없음). */
    withoutBinding: (f: Record<string, number>) => number | null;
    /** 굳힘 인자를 흔든 답. 원래와 같으면 굳힘이 장식이다. */
    perturbed: (f: Record<string, number>) => number;
    /** 후보 개수 — 우연 수준 $1/k$ 를 찍기 위해. `null` 이면 후보 목록이 없다. */
    candidateCount: (f: Record<string, number>) => number | null;
  }
> = {
  // 31T — 굳힘 조건(「나머지가 모두 같다」)을 지우면 문제 자체가 사라진다.
  // 그래서 ㉠ 은 「셋 중 둘만 읽으면 맞나」로 잰다(`thirdNumberMatters` 가 막는 것).
  "1-1|최대공약수와 최소공배수|31T": {
    withoutBinding: (f) => solveSameRemainder([f.a!, f.b!]),
    // ⚠️ 첫 판은 `c + x`(= $c+g$) 로 흔들었다. 그것은 **$g$의 배수를 더한 것**이라
    //    차가 여전히 $g$의 배수다 — 뜻이 안 바뀌는 변이라 「그대로 25%」가 나왔고,
    //    하마터면 멀쩡한 굳힘을 «장식»으로 적을 뻔했다. 변이는 «파일이 바뀌었나»가
    //    아니라 **«뜻이 바뀌었나»**를 봐야 한다(2026-08-21).
    perturbed: (f) => solveSameRemainder([f.a!, f.b!, f.c! + 1]),
    candidateCount: (f) => divisors(f.x!).length,
  },
  // 32T — 굳힘 조건은 「$a$, $b$ 가 서로소」. 지우면 곱이 $n$ 인 **모든** 쌍이 산다.
  "1-1|최대공약수와 최소공배수|32T": {
    withoutBinding: (f) => {
      const g = f.g!;
      const n = f.n!;
      let s = 0;
      for (const a of divisors(n)) {
        const b = n / a;
        if (a > b) continue;
        s += g * (a + b);
      }
      return s;
    },
    perturbed: (f) =>
      coprimePairSums(f.g!, f.n! * 2).reduce((a, b) => a + b, 0),
    candidateCount: (f) => coprimePairSums(f.g!, f.n!).length,
  },
  // 94T — 굳힘 조건은 비 $a:b:c$. 지우면 식의 값이 안 정해져 답이 없다(축 없음).
  "1-1|일차방정식의 풀이|94T": {
    withoutBinding: () => null,
    // ⚠️ 첫 판은 $r_2 \to r_2+r_1$ 로 흔들었다. 그러면 **분모까지 같이 바뀌어**
    //    $k$ 가 정수가 아니게 되는 자리가 많고(그때 `null`), 남은 자리에서는 우연히
    //    같은 $k$ 가 나와 「그대로 45.8%」가 찍혔다. 그것은 굳힘의 성적이 아니라
    //    **내 변이가 뜻을 안 바꾼 것**이다. $r_1 \to r_1+r_2$ 로 바꾸면
    //    $k' = k + c_1$ 이라 **늘 정수이고 늘 다르다** — 이제 이 축이 실제로 잰다.
    perturbed: (f) => {
      const k =
        ratioValue([f.r1! + f.r2!, f.r2!, f.r3!], [f.c1!, f.c2!, f.c3!]) ??
        Number.NaN;
      return f.s! + (f.q! - f.p!) * k;
    },
    candidateCount: () => null,
  },
  // 95T — 굳힘 조건은 **둘째 방정식**. 지우면 $M$의 약수가 전부 산다.
  "1-1|일차방정식의 풀이|95T": {
    withoutBinding: (f) => divisors(f.m!).reduce((a, b) => a + b, 0),
    perturbed: (f) =>
      naturalRootCandidates(f.m!, f.t! + 1, f.n!).kept.reduce(
        (a, b) => a + b,
        0,
      ),
    candidateCount: (f) => divisors(f.m!).length,
  },
};

export function sweep(): Row[] {
  const out: Row[] = [];
  for (const e of M1_TOP) {
    for (const seed of SEEDS) {
      for (const v of VARIANTS) {
        const p = generateMiddleProblem(e.key, seed, v);
        out.push({
          key: e.key,
          tier: p.difficulty,
          seed,
          variant: v,
          content: p.content,
          answer: p.answer,
          solution: p.solution,
          facts: p.facts,
        });
      }
    }
  }
  return out;
}

// ── 보고 ────────────────────────────────────────────────────

function pct(hit: number, all: number): string {
  return `${((hit / all) * 100).toFixed(1)}%`;
}

function reportShortcuts(rows: Row[]): void {
  console.log("\n## ㉠ 지름길 — 굳힘 조건을 안 읽고 답이 나오나\n");
  console.log(
    "| 유형 | 표본 | ⑴ 지면 수 조합이 맞은 최고 규칙 | ⑵ 굳힘 조건을 지운 답 | 우연 수준 |",
  );
  console.log("|---|---|---|---|---|");
  for (const e of M1_TOP) {
    const mine = rows.filter((r) => r.key === e.key);
    const tally = new Map<string, number>();
    for (const r of mine) {
      const want = answerNumber(r.answer);
      for (const [name, v] of obviousCandidates(pageNumbers(r.content))) {
        // `#i#j` 는 자리 이름이라 유형 안에서만 뜻이 있다.
        if (v === want) tally.set(name, (tally.get(name) ?? 0) + 1);
      }
    }
    const best = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    const axis = AXES[e.key]!;
    let noBind = "**축 없음** (조건을 지우면 문제가 사라진다)";
    const probe = axis.withoutBinding(mine[0]!.facts);
    if (probe !== null) {
      const hit = mine.filter(
        (r) => axis.withoutBinding(r.facts) === answerNumber(r.answer),
      ).length;
      noBind = `${pct(hit, mine.length)} (${hit}/${mine.length})`;
    }
    const ks = mine
      .map((r) => axis.candidateCount(r.facts))
      .filter((v): v is number => v !== null);
    const chance =
      ks.length === 0
        ? "— (후보 목록 없음)"
        : `1/${(ks.reduce((a, b) => a + b, 0) / ks.length).toFixed(1)}`;
    console.log(
      `| \`${e.key.split("|")[2]}\` ${mine[0]!.tier} | ${mine.length} | ` +
        `${best ? `\`${best[0]}\` ${pct(best[1], mine.length)}` : "**0건**"} | ${noBind} | ${chance} |`,
    );
  }
}

function reportBinding(rows: Row[]): void {
  console.log("\n## ㉡ 굳힘이 항등식인가 — 인자를 흔들면 답이 바뀌나\n");
  console.log("| 유형 | 표본 | 흔들어도 답이 그대로 | 판정 |");
  console.log("|---|---|---|---|");
  for (const e of M1_TOP) {
    const mine = rows.filter((r) => r.key === e.key);
    const axis = AXES[e.key]!;
    const same = mine.filter((r) => {
      const got = axis.perturbed(r.facts);
      return Number.isFinite(got) && got === answerNumber(r.answer);
    }).length;
    console.log(
      `| \`${e.key.split("|")[2]}\` | ${mine.length} | ${pct(same, mine.length)} (${same}/${mine.length}) | ` +
        `${same === 0 ? "굳힘이 산다" : "🔴 **장식**"} |`,
    );
  }
}

function reportOverlap(rows: Row[]): void {
  console.log("\n## ㉢ 갈래끼리 겹침 — 천장을 먼저 찍는다\n");
  console.log(
    "⚠️ **한글 Jaccard 는 «다름이 수식 안에만 있는» 유형을 못 본다.** 기준선의 `1.000` 쌍은",
  );
  console.log(
    "「중복」이 아니라 **「이 열쇠로는 안 갈린다」**이다(`10`↔`11` 은 둘 다 「다음 방정식을 푸시오」다).",
  );
  console.log(
    "그러므로 기준선의 최댓값을 **내 값의 면제부로 쓰면 안 된다** — 중앙값과 견주어라.\n",
  );
  const all = registeredTypes();
  for (const e of M1_TOP) {
    const mine = rows.filter((r) => r.key === e.key);
    const p0 = generateMiddleProblem(e.key, SEEDS[0]!, 0);
    // 천장 — 같은 유형을 다른 씨앗으로 자기 자신과 견준다.
    let ceilNum = 0;
    let ceilJac = 0;
    let n = 0;
    for (let i = 0; i < mine.length; i += 1) {
      for (let j = i + 1; j < mine.length; j += 1) {
        ceilNum += numAnswerJaccard(
          mine[i]!.content,
          mine[i]!.answer,
          mine[j]!.content,
          mine[j]!.answer,
        );
        ceilJac += koreanJaccard(mine[i]!.content, mine[j]!.content);
        n += 1;
      }
    }
    ceilNum /= n;
    ceilJac /= n;
    const section = p0.unitSection;
    const siblings = all.filter(
      (t) =>
        t.key !== e.key &&
        generateMiddleProblem(t.key, SEEDS[0]!, 0).unitSection === section,
    );
    console.log(
      `\n### \`${e.key}\` (${p0.difficulty}) — 소단원 «${section}» 형제 ${siblings.length}`,
    );
    console.log(
      `천장(자기 자신): 수+정답 **${ceilNum.toFixed(3)}** · 한글 Jaccard **${ceilJac.toFixed(3)}**` +
        `${ceilNum < CEILING_FLOOR ? "  ← 수+정답 천장이 문턱 아래다. 그 열쇠로는 **판정 불가**" : ""}`,
    );
    // 🔴 **분모** — 형제끼리는 원래 얼마나 닮았나. 이것 없이 내 값만 보면
    //    「0.833 이 높은가」를 알 수 없다. 착지한 유형끼리의 분포가 기준선이다.
    const baseline: number[] = [];
    for (let i = 0; i < siblings.length; i += 1) {
      for (let j = i + 1; j < siblings.length; j += 1) {
        baseline.push(
          koreanJaccard(
            generateMiddleProblem(siblings[i]!.key, SEEDS[0]!, 0).content,
            generateMiddleProblem(siblings[j]!.key, SEEDS[0]!, 0).content,
          ),
        );
      }
    }
    baseline.sort((a, b) => a - b);
    const med = baseline[Math.floor(baseline.length / 2)] ?? 0;
    console.log(
      `기준선(**착지한 형제끼리**, ${baseline.length}쌍): 한글 Jaccard 중앙값 **${med.toFixed(3)}** · ` +
        `최댓값 **${(baseline[baseline.length - 1] ?? 0).toFixed(3)}**`,
    );
    console.log("\n| 형제 | 갈래 | 수+정답 | 한글 Jaccard |");
    console.log("|---|---|---|---|");
    const scored = siblings.map((t) => {
      const q = generateMiddleProblem(t.key, SEEDS[0]!, 0);
      return {
        key: t.key.split("|")[2]!,
        tier: q.difficulty,
        num: numAnswerJaccard(p0.content, p0.answer, q.content, q.answer),
        jac: koreanJaccard(p0.content, q.content),
      };
    });
    for (const s of scored.sort((a, b) => b.jac - a.jac)) {
      console.log(
        `| \`${s.key}\` | ${s.tier} | ${s.num.toFixed(3)} | **${s.jac.toFixed(3)}** |`,
      );
    }
  }
}

function reportDepth(rows: Row[]): void {
  console.log(
    "\n## ⑸ 해설 깊이 — `probe-middle-solution-depth` 의 자를 그대로 쓴다\n",
  );
  console.log("| 유형 | 표본 | 걸음 건너뛰기 | 해설 길이 중앙값 |");
  console.log("|---|---|---|---|");
  for (const e of M1_TOP) {
    const mine = rows.filter((r) => r.key === e.key);
    const thin = mine.filter((r) => isThin(r.content, r.solution)).length;
    const lens = mine.map((r) => r.solution.length).sort((a, b) => a - b);
    console.log(
      `| \`${e.key.split("|")[2]}\` | ${mine.length} | ${pct(thin, mine.length)} (${thin}/${mine.length}) | ${lens[Math.floor(lens.length / 2)]}자 |`,
    );
  }
}

function reportRubric(): void {
  console.log(
    "\n## 반증 ④ — 같은 소단원의 **연산·기본·응용**을 사람이 읽을 목록\n",
  );
  console.log(
    "⚠️ **이 표는 판정이 아니다.** D-115 ⑾ 이 「어느 쪽인지는 기계가 못 정한다 —",
  );
  console.log(
    "사람이 본다」고 못 박았다. 읽은 결과는 보고서에 **[눈]** 으로 적는다.\n",
  );
  const all = registeredTypes();
  for (const e of M1_TOP) {
    const section = generateMiddleProblem(e.key, SEEDS[0]!, 0).unitSection;
    console.log(`\n### «${section}» — \`${e.key.split("|")[2]}\` 가 서는 자리`);
    for (const t of all) {
      const q = generateMiddleProblem(t.key, SEEDS[0]!, 0);
      if (q.unitSection !== section) continue;
      if (!["연산", "기본", "응용"].includes(q.difficulty)) continue;
      console.log(`  [${q.difficulty}] ${t.rpmType} ${t.rpmTitle}`);
      console.log(`      ${q.content.replace(/\n/g, " ")}`);
    }
  }
}

// ── 눈금 — **이 자가 «아니오»를 낼 수 있는가** ──────────────────

/**
 * 양성 6 · 음성 6. 음성이 없으면 재현율만 재고 거짓 경보는 구조적으로 0이 된다
 * (2026-08-20 「판정자의 성적표에는 양성과 음성 대조군이 둘 다 있어야 한다」).
 *
 * 🔴 대조군을 **엔진 밖에서** 짓는다 — 엔진 산출물로만 눈금을 매기면 갈래를 고치는
 * 순간 양성이 사라지고, 그 뒤로는 전량 초록이라 잘 도는 것처럼 보인다.
 */
function selftest(): number {
  const cases: [string, boolean, boolean, string][] = [];
  const add = (
    name: string,
    want: boolean,
    got: boolean,
    why: string,
  ): void => {
    cases.push([name, want, got, why]);
  };

  // ㉠ ⑴ 지면 수 조합 — 양성: 답이 두 수의 차인 지면
  add(
    "양성 ㉠: 답이 두 수의 차면 잡는다",
    true,
    [...obviousCandidates([30, 12]).values()].includes(18),
    "obviousCandidates([30,12]) 에 18 이 있어야 한다",
  );
  // 음성: 목록에 없는 수는 안 잡는다
  add(
    "음성 ㉠: 뻔하지 않은 수는 안 잡는다",
    false,
    [...obviousCandidates([30, 12]).values()].includes(7),
    "30·12 로 7 을 만드는 뻔한 규칙은 없다",
  );

  // ㉡ 굳힘 검출 — 양성: 인자를 흔들어도 값이 같은 «장식» 함수
  const decorative = (n: number): number => 42;
  add(
    "양성 ㉡: 장식인 굳힘은 흔들어도 답이 같다",
    true,
    decorative(1) === decorative(999),
    "인자를 무시하는 함수는 장식이다 — 검사가 이것을 잡아야 한다",
  );
  // 음성: 진짜 굳힘은 흔들면 달라진다
  add(
    "음성 ㉡: 산 굳힘은 흔들면 답이 달라진다",
    false,
    solveSameRemainder([75, 183, 318]) === solveSameRemainder([75, 183, 345]),
    "셋째 수를 바꾸면 차들의 최대공약수가 달라져야 한다",
  );

  // ㉢ 수+정답 — 양성: 같은 지면끼리는 1.0
  add(
    "양성 ㉢: 같은 지면끼리 수+정답은 1.0",
    true,
    numAnswerJaccard("$12$와 $18$", "$6$", "$12$와 $18$", "$6$") === 1,
    "자기 자신과 견주면 1.0 이어야 한다",
  );
  // 음성: 무관한 지면은 낮다
  add(
    "음성 ㉢: 무관한 지면은 수+정답이 낮다",
    false,
    numAnswerJaccard("$12$와 $18$", "$6$", "$77$과 $91$", "$7$") > 0.3,
    "겹치는 수가 없으면 0 이어야 한다",
  );

  // ㉢ 한글 Jaccard — 양성/음성
  add(
    "양성 ㉢: 같은 발문끼리 Jaccard 는 1.0",
    true,
    koreanJaccard(
      "세 자연수를 어떤 자연수로 나누면 나머지가 모두 같다",
      "세 자연수를 어떤 자연수로 나누면 나머지가 모두 같다",
    ) === 1,
    "자기 자신과 견주면 1.0 이어야 한다",
  );
  add(
    "음성 ㉢: 무관한 발문은 Jaccard 가 낮다",
    false,
    koreanJaccard(
      "세 자연수를 어떤 자연수로 나누면 나머지가 모두 같다",
      "다음 도수분포표에서 계급값을 구하시오",
    ) > 0.15,
    "겹치는 낱말이 없으면 0 에 가까워야 한다",
  );

  // 해설 깊이 — 남의 자를 그대로 쓴다. 그 자가 살아 있는지 여기서도 확인한다.
  add(
    "양성 ⑸: 생략 표지 뒤에 답만 오면 얇다",
    true,
    isThin("경우의 수를 구하시오.", "표로 정리하여 세면 모두 $3$가지이다."),
    "probe-middle-solution-depth 의 나쁜 실례",
  );
  add(
    "음성 ⑸: 중간 결과가 있으면 얇지 않다",
    false,
    isThin(
      "값을 구하시오.",
      "풀면 $2x=8$이고 $x=4$이다. 이때 $y=3x=12$이므로 $x+y=16$이다.",
    ),
    "생략 표지가 있어도 중간 결과가 셋이면 얇지 않다",
  );

  // 굳힘 함수 자체 — 답을 아는 손 계산과 맞대 본다
  add(
    "양성: 31T 굳힘 함수가 손 계산과 같다",
    true,
    solveSameRemainder([75, 183, 318]) === 27,
    "차 108·135·243 의 최대공약수는 27",
  );
  add(
    "양성: 32T 굳힘 함수가 손 계산과 같다",
    true,
    coprimePairSums(4, 385).join(",") === "184,248,328,1544",
    "(1,385)(5,77)(7,55)(11,35) 에 4를 곱한 합",
  );

  let bad = 0;
  console.log("## 눈금 — 이 자가 «아니오»를 낼 수 있는가\n");
  for (const [name, want, got, why] of cases) {
    const ok = want === got;
    if (!ok) bad += 1;
    console.log(`${ok ? "  ✅" : "  ❌"} ${name} — ${why}`);
  }
  // 🔴 형식은 **관문이 읽는 모양**이어야 한다 — `elemProbeGauges.test.ts` 가
  //    `눈금 N건` 을 세고, 그 수를 그냥 믿지 않고 판정 줄(`✅`/`❌`)을 **다시** 센다.
  //    그리고 파일 이름이 `probe-middle-*` 라야 그 그물에 걸린다 — 처음엔
  //    `probe-mid-top-m1.ts` 였고, 그러면 이 눈금은 **한 번도 자동으로 안 돈다**
  //    (관문은 초록인데 아무것도 안 지킨다 — 「축이 없다」의 또 한 얼굴이다).
  console.log(
    `\n눈금 ${cases.length}건 — ${bad === 0 ? "전부 통과" : `${bad}건 어긋남`}` +
      ` (양성 ${cases.filter((c) => c[1]).length} · 음성 ${cases.filter((c) => !c[1]).length})`,
  );
  return bad;
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes("--selftest")) {
    process.exitCode = selftest() === 0 ? 0 : 1;
    return;
  }
  const rows = sweep();
  console.log(
    `# 중1 상위 갈래 판정 — 유형 ${M1_TOP.length} × 씨앗 ${SEEDS.length} × 변형 ${VARIANTS.length} = ${rows.length}문항`,
  );
  if (argv.includes("--rubric")) {
    reportRubric();
    return;
  }
  if (argv.includes("--overlap")) {
    reportOverlap(rows);
    return;
  }
  reportShortcuts(rows);
  reportBinding(rows);
  reportDepth(rows);
  reportOverlap(rows);
}

if (isDirectScript(import.meta.url)) main();
