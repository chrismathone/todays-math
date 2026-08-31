/**
 * **초5 물결 3이 비운 스무 칸의 근거를 «센다»** — 1-2 · 2-1 · 2-3 (D-113 · D-115 ⑹).
 *
 *     npx tsx scripts/qa/census-g5w3-empty.ts
 *
 * ## 왜 있나
 *
 * 「비운다」는 판정이고, 판정은 **무엇을 보고 그렇게 말했는지**가 없으면 다음 회차가
 * 되짚을 수 없다. 물결 2가 같은 까닭으로 `census-g5w2-empty.ts` 를 두었다.
 * 이 자는 **막지 않고 센다** — 이름이 `probe-` 가 아닌 것도 그래서다(관문 쓸기는
 * `probe-elem-*` 만 훑는다). 그러므로 `exit 0` 이 「깨끗」을 뜻하지 않는다.
 *
 * ## ⚠️ 세지 **않은** 자리도 적어 둔다
 *
 * 「후보가 늘 하나뿐이다」를 세면 동어반복이 나오는 자리가 있다(물결 2가 1-6-3 에서
 * 겪었다). 아래 ⑸·⑹ 은 그래서 **구성으로** 비웠고, 이 자는 그것을 세지 않는다 —
 * 보고서 §3 에 그렇게 적었다.
 *
 * ## 🔴 ⓐ 는 이 자 자신의 눈금이다
 *
 * 아래 ⓑ~ⓗ 는 「후보가 둘 이상 남는다」를 세는데, 그 수가 **늘 둘 이상 나오게 짜여
 * 있으면** 아무것도 증명하지 않는다. 그래서 ⓐ 에서 **일부러 하나로 굳는 판**을 같이
 * 대어 이 자가 «하나»를 낼 수 있음을 보인다(양성·음성 대조).
 */
import {
  elementaryUnits,
  generateElementaryProblem,
} from "../../src/lib/elementary/generate";
import {
  forwardReachable,
  pageNumbers,
  rat,
} from "../../src/lib/elementary/forwardReach";
import { divisors, gcd } from "../../src/lib/elementary/math";

import { isDirectScript } from "../import/isDirectScript";

const SEEDS = [
  20260821, 7, 1234, 99991, 20260822, 555, 31337, 4242, 11, 202, 3003, 40404, 5,
  66, 777, 8888,
];

const unitOf = (code: string) =>
  elementaryUnits().find(
    (u) => u.grade === "초5" && u.section.startsWith(`${code} `),
  )!;

const problem = (code: string, tier: string, seed: number) =>
  generateElementaryProblem(unitOf(code), seed, tier as never);

/** 약수를 모두 더한 값. */
const divSum = (v: number) => divisors(v).reduce((s, d) => s + d, 0);

/** `d` 의 배수 중 `N` 보다 작은 것을 모두 더한 값. */
function sumMultiplesBelow(d: number, N: number): number {
  const k = Math.floor((N - 1) / d);
  return (d * k * (k + 1)) / 2;
}

const lines: string[] = [];
const say = (s = "") => lines.push(s);

/* ── ⓐ 이 자의 눈금 — «하나»도 «둘 이상»도 낼 수 있는가 ── */

function calibration(): void {
  say(
    "ⓐ 눈금 — 이 자가 «하나로 굳는다»와 «안 굳는다»를 **둘 다** 낼 수 있는가",
  );
  // 양성: 「최대공약수 $g$ · 합 $S$ · 두 몫이 서로소이고 둘 다 $1$보다 크다」는
  //       실제로 하나로 굳는다(그래서 1-2-4 심화중을 **세웠다**).
  let one = 0;
  let many = 0;
  for (const T of [5, 7, 8, 9, 10, 11, 12, 13, 14]) {
    const pairs: [number, number][] = [];
    for (let p = 2; p * 2 < T; p += 1)
      if (gcd(p, T - p) === 1) pairs.push([p, T - p]);
    if (pairs.length === 1) one += 1;
    else if (pairs.length >= 2) many += 1;
  }
  say(`   합 $T$ 아홉 가지 — 하나로 굳는 것 ${one} · 안 굳는 것 ${many}`);
  say(
    one > 0 && many > 0
      ? "   ✅ 둘 다 낸다 — 아래 «후보 수» 숫자는 뜻이 있다"
      : "   🔴 한쪽만 낸다 — 아래 숫자를 근거로 쓰지 마라",
  );
  say();
}

/* ── ⓑ 1-2-2 — 심화하가 이미 «열거»다 ── */

function census122(): void {
  say("ⓑ 1-2-2(약수와 배수의 관계) — 비움 둘. 심화하의 답이 이미 «목록»인가");
  let list = 0;
  for (const s of SEEDS) {
    // `nums()` 가 만든 목록은 `,\ ` 로 이어진다 — 답이 «한 값»이 아니라는 뜻이다.
    if (problem("1-2-2", "심화하", s).answer.includes(",")) list += 1;
  }
  say(`   심화하 답이 목록인 씨앗 ${list} / ${SEEDS.length}`);
  say("   → 되짚기 사슬이 «$N \\div a$» 한 마디뿐이라, 마디를 열려면 후보를");
  say(
    "     «$N$ 의 약수 전체» 또는 «$N$ 의 배수 전체»로 벌려야 한다 — 그것이 곧 심화하다.",
  );
  say();
}

/* ── ⓒ 1-2-3 — 성질 한 번으로 최대공약수가 굳나 ── */

function census123(): void {
  say(
    "ⓒ 1-2-3(공약수와 최대공약수) — 비움 둘. «공약수의 합»만으로 굳나 (전수 2~99)",
  );
  const bySum = new Map<number, number[]>();
  for (let g = 2; g <= 99; g += 1) {
    const s = divSum(g);
    bySum.set(s, [...(bySum.get(s) ?? []), g]);
  }
  const sizes = [...bySum.values()].map((v) => v.length);
  const amb = sizes.filter((v) => v >= 2).length;
  say(
    `   서로 다른 약수합 ${sizes.length}가지 중 «후보가 둘 이상»인 합 ${amb}가지`,
  );
  say(`   보기 — 약수의 합이 $42$ 인 수: ${(bySum.get(42) ?? []).join(", ")}`);
  say(
    "   → 굳히려면 «약수의 개수»를 함께 줘야 하는데, 그것은 **심화하 ㉠ 이 이미 하는 일**이다",
  );
  say("     (`comdiv123Deep` 주석이 그 어긋남을 스스로 적어 두었다).");
  say();
}

/* ── ⓓ 1-2-5 — 성질만 적용하면 후보가 몇 개 남나 ── */

function census125(): void {
  say(
    "ⓓ 1-2-5(공배수와 최소공배수) — 비움 둘. 「$N$ 보다 작은 공배수의 합이 $S$」 판에서",
  );
  say("   성질(공배수는 최소공배수의 배수)만 적용하면 후보가 몇 개 남나");
  const counts: number[] = [];
  let uniqueByProperty = 0;
  let total = 0;
  for (let m = 6; m <= 24; m += 1) {
    for (let c = 2; c <= 4; c += 1) {
      for (let off = 1; off < m; off += 1) {
        const N = m * c + off;
        const S = sumMultiplesBelow(m, N);
        if (S === 0) continue;
        const cands = divisors(S).filter((d) => d < N);
        total += 1;
        counts.push(cands.length);
        if (cands.length === 1) uniqueByProperty += 1;
      }
    }
  }
  counts.sort((a, b) => a - b);
  say(
    `   판 ${total}가지 — 후보 수 최솟값 ${counts[0]} · 중앙값 ${counts[Math.floor(counts.length / 2)]} · 최댓값 ${counts[counts.length - 1]}`,
  );
  say(`   성질 **한 번**으로 굳는 판 ${uniqueByProperty} / ${total}`);
  say(
    "   → 후보를 좁히려면 «몇 번째 공배수인가»를 줘야 하고, 그것은 심화하 ㉠·㉡ 이 이미 준다.",
  );
  say(
    "     좁히지 않으면 후보마다 실제로 더해 봐야 하니 그건 «상»이지 «중»이 아니다.",
  );
  say();
}

/* ── ⓔ 2-1-5 — 심화하가 이미 두 어림을 겹친다 ── */

function census215(): void {
  say("ⓔ 2-1-5(버림) — 비움 둘. 심화하가 이미 «두 어림을 겹치는가»");
  let both = 0;
  for (const s of SEEDS) {
    const c = problem("2-1-5", "심화하", s).content;
    if (c.includes("올림") && c.includes("버림")) both += 1;
  }
  say(
    `   심화하 발문에 «올림»과 «버림»이 둘 다 있는 씨앗 ${both} / ${SEEDS.length}`,
  );
  say(
    "   → 조건 겹침은 자문이 **심화하의 정의**로 못 박은 모양이다. 그 위에 얹을 자리가 없고,",
  );
  say(
    "     남은 마디(어느 자리까지 어림했나)를 열면 2-1-4 심화중과 낱말만 다른 문항이 된다.",
  );
  say();
}

/* ── ⓕ 2-1-1 · 2-1-2 — 형제가 같은 마디를 쓴다 ── */

function census211(): void {
  say("ⓕ 2-1-2(초과와 미만) — 비움 둘. 2-1-1 과 **같은 마디**인가");
  const norm = (s: string) =>
    s
      .replace(/이상|초과/g, "▲")
      .replace(/이하|미만/g, "▼")
      .replace(/\$\d+\$/g, "◆");
  let same = 0;
  for (const s of SEEDS) {
    const a = norm(problem("2-1-1", "심화하", s).content);
    const b = norm(problem("2-1-2", "심화하", s).content);
    if (a === b) same += 1;
  }
  say(
    `   두 소단원의 심화하 발문이 «이상/초과·이하/미만·수»를 지우면 같은 씨앗 ${same} / ${SEEDS.length}`,
  );
  say(
    "   → 2-1-1 에 세운 심화중(«$k$ 의 배수 개수»)을 2-1-2 에 그대로 대면 낱말만 바뀐 같은 문항이다",
  );
  say("     (브리프 ㉣ 「형제 소단원의 발문이 같아지지 않게 하라」).");
  say();
}

/* ── ⓖ 2-3-2 — 성질로 후보가 갈리나 ── */

function census232(): void {
  say(
    "ⓖ 2-3-2(합동인 도형의 성질) — 비움 둘. 「이등변 + 한 변 $a$ + 둘레 $P$」에서",
  );
  say("   두 후보(밑변인가 / 같은 두 변 중 하나인가)가 **둘 다** 성립하나");
  // 🔴 「자연수가 아닌 후보」를 **미리 걸러내면** 333/333 이라는 동어반복이 나온다.
  //    그래서 전량을 세고 «무엇이 갈랐는지»를 갈라 찍는다.
  let both = 0;
  let byInteger = 0;
  let bySize = 0;
  let total = 0;
  for (let P = 20; P <= 60; P += 1) {
    for (let a = 4; a < P; a += 1) {
      const leg = (P - a) / 2; // `a` 가 밑변일 때 길이가 같은 두 변
      const base = P - 2 * a; // `a` 가 같은 두 변 중 하나일 때 밑변
      const okLeg = Number.isInteger(leg) && leg > 0;
      const okBase = base > 0;
      if (!okLeg && !okBase) continue; // 문항 자체가 안 선다
      total += 1;
      if (okLeg && okBase) both += 1;
      else if (!okLeg) byInteger += 1;
      else bySize += 1;
    }
  }
  say(`   판 ${total}가지 — 두 후보가 둘 다 서는 것 ${both}`);
  say(
    `   갈리는 판: «길이가 자연수라서» ${byInteger} · «다른 후보가 $0$ 이하라서» ${bySize}`,
  );
  say(
    "   → 굳히려면 «자연수여야 한다»(학년 제약)나 «두 변의 합이 나머지 한 변보다 길다»",
  );
  say(
    "     (초등 교과에 없다)를 써야 한다 — 둘 다 **그 소단원 개념이 아니라** 반증 ③ 이다.",
  );
  say();
}

/* ── ⓗ 2-3-3 — 완성 칸 수만으로 (한쪽, 축 위)가 굳나 ── */

function census233(): void {
  say("ⓗ 2-3-3(선대칭도형) — 비움 둘. 완성 칸 수 $N$ 만으로 «축 위 칸»이 굳나");
  const counts: number[] = [];
  for (let N = 4; N <= 20; N += 1) {
    let c = 0;
    for (let t = 0; t <= 5; t += 1) {
      // 축 위 칸(격자 폭 5 이하)
      const s2 = N - t;
      if (s2 <= 0 || s2 % 2 !== 0) continue;
      c += 1;
    }
    counts.push(c);
  }
  counts.sort((a, b) => a - b);
  say(
    `   $N$ 열일곱 가지 — (한쪽, 축 위) 짝의 수 최솟값 ${counts[0]} · 중앙값 ${counts[Math.floor(counts.length / 2)]}`,
  );
  say(
    "   → 성질(축에서 떨어진 칸은 짝수)이 정하는 것은 **홀짝뿐**이라 값이 안 굳는다.",
  );
  say(
    "     굳히려면 개수를 하나 더 줘야 하고, 그러면 심화하(마디마다 굳는다)다.",
  );
  say();
}

/* ── ⓘ 반증 ⑥ 자의 음성 대조 — 이 세 대단원에서 «닿는다»가 나오나 ── */

function reachControl(): void {
  say("ⓘ 반증 ⑥ 자 — 이 세 대단원의 아래 세 갈래에서 «닿는다»가 나오나");
  for (const code of ["1-2-1", "1-2-4", "1-2-6", "2-1-1", "2-1-4", "2-3-4"]) {
    const row: string[] = [];
    for (const tier of ["연산", "기본", "응용"]) {
      let hit = 0;
      let read = 0;
      for (const s of SEEDS) {
        const p = problem(code, tier, s);
        const m = p.answer.match(/^\$(\d+)\$$/);
        if (!m) continue;
        read += 1;
        if (forwardReachable(pageNumbers(p.content), rat(Number(m[1]))))
          hit += 1;
      }
      row.push(`${tier} ${hit}/${read}`);
    }
    say(`   ${code}  ${row.join(" · ")}`);
  }
  say(
    "   → 「안 닿는다」가 **연산 갈래에서도** 나오면 그것은 문항이 아니라 자다",
  );
  say(
    "     (토대 17 §1 «④ 의 자격»). 그런 자리에서는 ④ 를 근거로 쓰지 않았다.",
  );
  say();
}

export function report(): string {
  lines.length = 0;
  say("초5 물결 3 — 비운 스무 칸의 근거 (1-2 · 2-1 · 2-3)");
  say("");
  calibration();
  census122();
  census123();
  census125();
  census215();
  census211();
  census232();
  census233();
  reachControl();
  say("⚠️ 이 자는 **막지 않고 센다** — exit 0 이 「깨끗」을 뜻하지 않는다.");
  say("   그리고 세지 **않은** 비움이 있다: 1-2-5 상 · 2-1-1 상 · 2-1-3 둘 ·");
  say(
    "   2-3-1 둘 · 2-3-4 상 — 세면 동어반복이 나오는 자리라 구성으로 적었다(보고서 §3).",
  );
  return lines.join("\n");
}

if (isDirectScript(import.meta.url)) {
  console.log(report());
}
