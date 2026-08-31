/**
 * 초6 확대 갈래 **3차분** — `1-1 분수의 나눗셈` · `2-5 원의 둘레와 넓이` ·
 * `2-6 원기둥, 원뿔, 구` (D-113 축 · D-115 잣대, 2026-08-31).
 *
 * 값이 맞는지는 `elemTiersG6.test.ts` 가 이미 잰다 — 여기서는 **잣대**를 잰다.
 * 축은 2차분(`elemTiersG6DeepW2.test.ts`)과 같고, 이 회차가 **하나를 더한다**.
 *
 * | 축 | 무엇을 재나 |
 * |---|---|
 * | ㉠ 마디가 정말 안 굳나 | 굳히는 성질을 **빼면** 후보가 여럿이어야 한다(«열린 수» ≥ 2) |
 * | ㉡ 성질이 하나로 굳히나 | 그 성질을 걸면 정확히 **하나**가 남아야 한다(«굳은 수» = 1) |
 * | ㉢ 심화상은 성질로 **못** 굳히나 | 후보를 만든 뒤 **한 번 더 계산**해야 하나가 남는다 |
 * | ㉣ 반증 ⑥ | 발문의 수에 순방향 연산을 적용해 답이 나오면 안 된다 (`forwardReach.ts`) |
 * | ㉤ 반증 ④ | 같은 소단원의 연산·기본·응용이 이 축(구간·모양 성질)을 안 쓴다 |
 * | ㉥ 해설이 늘어놓나 | 심화중의 해설은 후보를 늘어놓지 않는다 (D-115 ⑾) |
 * | ㉦ 그림 | 확대 갈래는 역산이라 그림이 없다 |
 * | 🔴 ㉧ **지면이 진짜 원과 모순되지 않나** | 이 회차가 새로 세운 축 — 아래 참조 |
 *
 * ## 🔴 ㉧ 는 왜 필요한가 — **2-5 를 비운 근거가 여기 있다**
 *
 * 「원주가 $c$ 이고 지름이 자연수」 꼴은 구간 $(c/4,\ c/3)$ 이 자연수를 하나만 남기게
 * 지으면 «선다». 그런데 그 자연수가 **정말 그 원의 지름**이려면 $c=3.14\times d$ 여야 한다.
 * 둘을 같이 요구하면 남는 자리가 **2개**뿐이다(보고서 §3 에 세는 판이 있다) —
 * 그래서 2-5 의 심화중 넷을 비웠다. 살아남은 2-5-2 심화상은 **원주율을 값으로 주므로**
 * 그 모순이 없어야 한다. 이 축이 없으면 다음 회차가 「구간이 하나를 남긴다」만 보고
 * **있을 수 없는 원**을 지면에 내보낼 수 있다.
 *
 * ## 🔴 이 파일이 **못 보는 것**
 *
 * 1. **「학생이 몇 번 생각하나」는 못 잰다.** 재는 것은 후보의 **개수**다.
 * 2. **해설이 밟는 길은 ㉥ 한 줄로만 본다** — «같은 연산을 셋 이상 늘어놓았나» 하나뿐이다.
 *    2-6-2 심화중이 그 자에 걸렸다가 풀린 적이 있는데, 늘어놓아서가 아니라 **한 사슬의
 *    걸음이 셋**(÷4 · ÷3.14 · ÷2)이어서였다 — 그 자의 머리말이 「못 보는 것」으로 적어 둔 자리다.
 * 3. **㉤ 는 대리 지표다.** 「구간·모양 표지가 없다」는 「되짚기를 안 시킨다」와 같은 말이
 *    아니다. 이 세 대단원의 연산·기본·응용을 눈으로 읽은 결과가 보고서 §4 에 있다.
 * 4. **비운 자리(15개)는 여기서 안 지킨다.** 「1-1-1 에 심화상을 세우면 안 된다」 같은
 *    금지는 잣대가 아니라 판단이라, 다음 회차가 **측정을 대고** 뒤집을 수 있어야 한다.
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import {
  answerPrintedOnPage,
  forwardReachable,
  pageNumbers,
  readRat,
  type Rat,
} from "@/lib/elementary/forwardReach";

import {
  ENUM_THRESHOLD,
  enumeratedSteps,
} from "../../../scripts/qa/probe-elem-tier-enumeration";

const SEEDS = Array.from({ length: 24 }, (_, i) => i * 37 + 5);

/**
 * ㉠ 의 «열린 후보» 최소치. 기본은 둘(D-115 가 요구하는 값)이고, **더 요구하는 자리만**
 * 여기 적는다.
 *
 * 1-1-1 은 셋이다 — 성질이 만드는 것이 «배수열»이고 해설이 그 열을 **지면에 늘어놓기**
 * 때문이다. 둘이면 창의 두 끝이 곧 답이라 열이 열로 안 보인다. 생성기 쪽 `base.length < 3`
 * 가 그 뜻인데 **어떤 시험도 그것을 안 물고 있었다**(2026-08-31 변이 시험이 초록으로
 * 찍었다). 손 상수를 생성기와 시험에 두 벌 두는 것이 아니라, 시험은 **지면에서 다시 풀어**
 * 센다(`splitOf`) — 그래서 생성기의 그 줄을 무르면 여기가 빨개진다.
 */
const MIN_OPEN: Record<string, number> = { "1-1-1": 3 };

/**
 * 🔴 **반증 ⑥ 만 씨앗을 넓게 쓴다** — 2차분 §8.2 가 실측으로 남긴 교훈이다.
 * 풀에서 걸러지는 비율과 지면에 닿는 비율이 열 배 가까이 벌어져, 24씨앗이면 절반을 놓친다.
 */
const WIDE_SEEDS = Array.from({ length: 240 }, (_, i) => i * 7 + 3);

/** 이 회차가 세운 갈래 — «어디에 무엇을 세웠나»를 코드로 못 박는다. */
const BUILT: { code: string; tier: "심화중" | "심화상" }[] = [
  { code: "1-1-1", tier: "심화중" },
  { code: "1-1-2", tier: "심화중" },
  { code: "1-1-3", tier: "심화상" },
  { code: "2-5-2", tier: "심화상" },
  { code: "2-6-1", tier: "심화중" },
  { code: "2-6-2", tier: "심화중" },
  { code: "2-6-3", tier: "심화상" },
];

/** 이 회차가 손댄 소단원 전부(비운 것 포함) — ㉤ 는 여기를 돈다. */
const CODES = [
  "1-1-1",
  "1-1-2",
  "1-1-3",
  "2-5-1",
  "2-5-2",
  "2-5-3",
  "2-5-4",
  "2-6-1",
  "2-6-2",
  "2-6-3",
  "2-6-4",
] as const;

const unitOf = (code: string) => {
  const u = elementaryUnits().find(
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원`).toBeTruthy();
  return u!;
};

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);

/** 발문의 `$…$` 안 자연수들을 **차례대로**(소수·분수는 뺀다 — 자리 세기용이 아니다). */
function natsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!/g, " ")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, " ")
      .replace(/\d+\.\d+/g, " ")
      .replace(/\\frac\{\d+\}\{\d+\}/g, " ")
      .replace(/\\square|\\times|\\div|[:=+\-()]/g, " ");
    for (const piece of tok.split(/\s+/))
      if (/^\d+$/.test(piece)) out.push(Number(piece));
  }
  return out;
}

/** 발문의 소수 하나를 **센트(정수)**로. 부동소수를 판정에 안 쓴다. */
function centsOf(text: string, re: RegExp): number | null {
  const m = text.match(re);
  if (!m) return null;
  const [whole, frac = ""] = m[1]!.split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

const intsBetween = (lo: number, up: number) => {
  const out: number[] = [];
  for (let v = Math.floor(lo) + 1; v < up; v += 1) out.push(v);
  return out;
};

type Split = { open: number; fixed: number };

/**
 * 갈래마다 **«열린 수»와 «굳은 수»** 를 다시 센다 — 엔진 풀을 안 부른다(되부르면 동어반복).
 *
 * `open` 은 굳히는 성질을 **빼고** 발문이 허락하는 후보 수, `fixed` 는 성질을 **걸고** 남는 수다.
 * 못 읽으면 `null` — 부르는 쪽이 실패로 다룬다.
 */
function splitOf(code: string, content: string): Split | null {
  const n = natsIn(content);

  if (code === "1-1-1") {
    // 「$b$ 로 나눈 몫의 기약 분모가 $m$」 + 몫의 크기(창의 위쪽) + 하한.
    const b = n[0];
    const m = n[1];
    const lo = n[n.length - 1];
    if (b === undefined || m === undefined || lo === undefined) return null;
    if (b % m !== 0) return null;
    const g = b / m;
    const band = /\$1\$보다 크고 \$2\$보다 작습니다/.test(content) ? 1 : 0;
    const inRange: number[] = [];
    for (let a = band * b + 1; a < (band + 1) * b; a += 1)
      if (a > lo) inRange.push(a);
    return {
      open: inRange.length,
      fixed: inRange.filter((a) => gcd(a, b) === g).length,
    };
  }

  if (code === "1-1-2") {
    // 「몫의 분모가 처음과 같은 $q$」 ⟺ 분자 $p$ 가 나누는 수로 나누어떨어진다.
    const f = content.match(/\\frac\{(\d+)\}\{(\d+)\}/);
    const win = content.match(/\$(\d+)\$보다 크고 \$(\d+)\$보다 작을 때/);
    if (!f || !win) return null;
    const p = Number(f[1]);
    const cands = intsBetween(Number(win[1]), Number(win[2])).filter(
      (k) => k >= 2,
    );
    return {
      open: cands.length,
      fixed: cands.filter((k) => p % k === 0).length,
    };
  }

  if (code === "1-1-3") {
    // 배수열이 만든 후보 가운데 기약 분모가 $m$ 인 것 하나.
    const mix = content.match(/\$(\d+)\\frac\{(\d+)\}\{(\d+)\}\$/);
    const cap = n.find((v, i) => i > 0 && v !== undefined);
    const m = n[n.length - 1];
    if (!mix || cap === undefined || m === undefined) return null;
    const d = Number(mix[3]);
    const imp = Number(mix[1]) * d + Number(mix[2]);
    if (m % d !== 0) return null;
    const step = m / d;
    const cands: number[] = [];
    for (let v = step; v < cap; v += step) if (v >= 2) cands.push(v);
    return {
      open: cands.length,
      fixed: cands.filter((v) => (d * v) / gcd(imp, d * v) === m).length,
    };
  }

  if (code === "2-5-2") {
    // 되짚기가 만든 곱 (지름)×(바퀴 수). 창 안의 자연수 중 나누어떨어지는 것 하나.
    const dist = centsOf(content, /굴렸더니 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
    const win = content.match(
      /지름이 \$(\d+)\$ cm보다 길고 \$(\d+)\$ cm보다 짧은/,
    );
    if (dist === null || !win || dist % 314 !== 0) return null;
    const prod = dist / 314;
    const cands = intsBetween(Number(win[1]), Number(win[2]));
    return {
      open: cands.length,
      fixed: cands.filter((d) => prod % d === 0 && prod / d >= 2).length,
    };
  }

  if (code === "2-6-1") {
    // 앞에서 본 직사각형의 넓이 = (지름)×(높이). 「정사각형」이 둘을 하나로 묶는다.
    const area = n[0];
    if (area === undefined) return null;
    const pairs: [number, number][] = [];
    for (let d = 2; d <= area; d += 2)
      if (area % d === 0) pairs.push([d, area / d]);
    return {
      open: pairs.length,
      fixed: pairs.filter(([d, h]) => d === h).length,
    };
  }

  if (code === "2-6-2") {
    // 옆면의 둘레 = (밑면 둘레 + 높이)×2. 「정사각형」이 둘을 하나로 묶는다.
    const perim = centsOf(content, /둘레가 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
    if (perim === null || perim % 2 !== 0) return null;
    const half = perim / 2; // 밑면의 둘레 + 높이
    const cands: number[] = [];
    for (let r = 1; 628 * r < half; r += 1) cands.push(r);
    return {
      open: cands.length,
      fixed: cands.filter((r) => 2 * 628 * r === half).length,
    };
  }

  if (code === "2-6-3") {
    // 앞에서 본 삼각형의 넓이 = (반지름)×(높이). 짝을 만들어 높이 조건에 대 본다.
    const area = n[0];
    const cap = n[1];
    if (area === undefined || cap === undefined) return null;
    const pairs: [number, number][] = [];
    for (let r = 1; r * r < area; r += 1)
      if (area % r === 0) pairs.push([r, area / r]);
    return {
      open: pairs.length,
      fixed: pairs.filter(([, h]) => h < cap).length,
    };
  }
  return null;
}

describe("[초6 확대 3차분] 잣대 — 마디가 안 굳고, 성질이 굳힌다", () => {
  it("세운 일곱 갈래가 등록돼 있고 그 자리에만 있다", () => {
    const got: string[] = [];
    for (const code of CODES)
      for (const tier of supportedTiers(unitOf(code)))
        if (tier === "심화중" || tier === "심화상") got.push(`${code} ${tier}`);
    expect(got.sort()).toEqual(BUILT.map((b) => `${b.code} ${b.tier}`).sort());
  });

  it("㉠㉡ 심화중은 «열린 후보»가 둘 이상이고 성질이 **하나**로 굳힌다", () => {
    const bad: string[] = [];
    let checked = 0;
    const mids = BUILT.filter((b) => b.tier === "심화중");
    for (const { code } of mids) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화중");
        const s = splitOf(code, p.content);
        if (!s) {
          bad.push(
            `${code} 심화중 seed=${seed}: 발문을 못 읽음 — ${p.content}`,
          );
          continue;
        }
        checked += 1;
        const want = MIN_OPEN[code] ?? 2;
        if (s.open < want)
          bad.push(
            `${code} 심화중 seed=${seed}: 마디가 얕다(열린 후보 ${s.open} < ${want}) — ${p.content}`,
          );
        if (s.fixed !== 1)
          bad.push(
            `${code} 심화중 seed=${seed}: 성질이 하나로 못 굳힌다(${s.fixed}) — ${p.content}`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(checked).toBe(mids.length * SEEDS.length);
  });

  it("㉢ 심화상은 되짚기가 후보를 여럿 만들고, 계산해야 하나가 된다", () => {
    const bad: string[] = [];
    let checked = 0;
    const tops = BUILT.filter((b) => b.tier === "심화상");
    for (const { code } of tops) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화상");
        const s = splitOf(code, p.content);
        if (!s) {
          bad.push(
            `${code} 심화상 seed=${seed}: 발문을 못 읽음 — ${p.content}`,
          );
          continue;
        }
        checked += 1;
        // 🔴 심화상은 후보가 **셋 이상**이어야 한다 — 둘이면 «만들어 견주기»가
        //    한눈에 끝나 심화중과 구분이 안 된다(2차분이 1-2-4 에서 둘로 두고
        //    「원장님 검수 몫」으로 남긴 자리다. 여기서는 셋으로 못 박는다).
        if (s.open < 3)
          bad.push(
            `${code} 심화상 seed=${seed}: 되짚기가 후보를 ${s.open}개만 만든다 — ${p.content}`,
          );
        if (s.fixed !== 1)
          bad.push(
            `${code} 심화상 seed=${seed}: 둘째 조건이 하나로 못 남긴다(${s.fixed}) — ${p.content}`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(checked).toBe(tops.length * SEEDS.length);
  });

  it("㉣ 반증 ⑥ — 발문의 수에 순방향 연산을 적용해서는 답이 안 나온다", () => {
    // 🔴 **양성 눈금 먼저.** 이 자가 «예»를 낼 수 있어야 아래의 0 이 «깨끗»이다.
    expect(
      forwardReachable(pageNumbers("$6$ $9$"), readRat("54")!),
      "양성 눈금 — $6\\times9=54$ 는 순방향이다",
    ).toBe(true);
    // 🔴 그리고 **이 회차가 실제로 밟은 함정**을 눈금으로 박는다. 앞판 1-1-2 심화중은
    //    「$\\frac{p}{q}$ 를 나눈 몫의 기약 분모가 $m$」 꼴이라 답이 $\\frac pq\\times m$ 이었다 —
    //    분수를 **한 값**으로 읽어야 그것이 보인다(생성기가 두 값으로 세어 8건이 샜다).
    expect(
      forwardReachable(pageNumbers("$\\frac{3}{8}$ $48$"), readRat("18")!),
      "양성 눈금 — 분수를 한 값으로 읽으면 $\\frac38\\times48=18$ 이 잡힌다",
    ).toBe(true);
    // 🔴 둘째 자의 눈금 — 양성과 음성을 **둘 다** 댄다.
    expect(
      answerPrintedOnPage(pageNumbers("$19$ $25$"), readRat("19")!),
      "양성 눈금 — 답이 지면에 그대로 있다",
    ).toBe(true);
    expect(
      answerPrintedOnPage(pageNumbers("$19$ $25$"), readRat("20")!),
      "음성 눈금 — 지면에 없는 답은 «있다»가 아니다",
    ).toBe(false);

    const bad: string[] = [];
    let measured = 0;
    for (const { code, tier } of BUILT) {
      const unit = unitOf(code);
      for (const seed of WIDE_SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim());
        expect(ans, `${code} ${tier}: 답을 못 읽음 — ${p.answer}`).toBeTruthy();
        measured += 1;
        const nums = pageNumbers(p.content);
        if (forwardReachable(nums, ans!))
          bad.push(
            `${code} ${tier} seed=${seed}: 순방향으로 닿는다 — ${p.content}`,
          );
        // 🔴 생성기 가드(`backsolveSafeStem`)는 **둘**을 본다 — 순방향과 «답이 지면에
        //    그대로 있나». 이 시험은 앞엣것만 봤고, 그래서 2-5-2 의 가드를 통째로
        //    무르는 변이가 **초록**으로 찍혔다(2026-08-31). 새로 들어온 짝이 거의 다
        //    뒤엣것이었기 때문이다 — 답이 바퀴 수인데 창의 두 끝과 겹칠 수 있다.
        //    **가드가 보는 것을 시험도 다 봐야 한다.**
        if (answerPrintedOnPage(nums, ans!))
          bad.push(
            `${code} ${tier} seed=${seed}: 답이 지면에 그대로 있다 — ${p.content}`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 분모 — 이 회차의 답은 **전부 수**라 못 재는 자리가 없다(0 이 «못 셈»이 아니다).
    expect(measured).toBe(BUILT.length * WIDE_SEEDS.length);
  });

  it("㉤ 반증 ④ — 연산·기본·응용은 «구간·모양 성질로 마디를 여는» 축을 안 쓴다", () => {
    // 이 회차의 축은 둘이다 — ⑴ 창(부등식) ⑵ 「정사각형」이 두 미지수를 묶는 것.
    //
    // ⚠️ 처음엔 낱말 「정사각형」만으로 셌다가 **거짓 경보**가 났다 — 1-1-1·1-1-3 응용의
    //    「**정사각형 모양** 화단」은 그저 소재다(정다각형 결합 갈래). 축은 낱말이 아니라
    //    «앞에서 본 모양 / 옆면이 정사각형이라 두 값이 같다»는 **관계**이므로 그것을 센다.
    //    거짓 경보는 가드를 끈다(2026-08-20).
    const 확대표지 =
      /보다 (?:크고|많고|길고|넓고|클 때|짧은|작은|짧을 때)|(?:앞에서 본 모양이|옆면이) 정사각형/;
    const built = new Set(BUILT.map((b) => b.code));
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      if (!built.has(code)) continue; // 비운 소단원은 아래에서 따로 본다
      const unit = unitOf(code);
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          checked += 1;
          if (확대표지.test(p.content))
            bad.push(`${code} ${tier} seed=${seed}: 확대 표지 — ${p.content}`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(checked).toBe(built.size * 3 * SEEDS.length);
    // 음성 대조 — 확대 갈래는 **반드시** 그 표지를 쓴다(안 쓰면 위 0 이 아무 뜻이 없다).
    const withMark = BUILT.filter(({ code, tier }) =>
      확대표지.test(
        generateElementaryProblem(unitOf(code), SEEDS[0]!, tier).content,
      ),
    );
    expect(withMark.length).toBe(BUILT.length);

    // 🔴 **그리고 반증 ④ 가 실제로 무는 자리를 못 박는다 — 이 회차의 큰 발견이다.**
    //
    // 토대 §2.4-0 은 「반증 ④ 에는 초6 에서 작동하는 기계 구현이 없고, 「비움 0」은
    // 열한 번의 사람 판단」이라고 적었다. 그런데 **2-5-1 은 기계로 문다** —
    // 「원주는 지름의 $3$배보다 길고 $4$배보다 짧습니다」를 **기본·응용이 이미 쓴다.**
    // 곧 그 부등식은 이 소단원에서 난이도를 안 가른다(반증 ④ 그대로) — 그래서
    // 2-5-1 심화중을 **비웠다.** 2-5-3 도 응용이 「몇 cm²보다 크고 …」로 같은 자리다.
    //
    // 이 두 줄이 빨개지면 그 근거가 사라진 것이니, 그때는 비움을 다시 판단해야 한다.
    const usesAxis = (code: string, tier: "기본" | "응용") =>
      SEEDS.some((s) =>
        확대표지.test(generateElementaryProblem(unitOf(code), s, tier).content),
      );
    expect(usesAxis("2-5-1", "기본"), "2-5-1 기본이 원주율 부등식을 쓴다").toBe(
      true,
    );
    expect(usesAxis("2-5-3", "응용"), "2-5-3 응용이 어림 부등식을 쓴다").toBe(
      true,
    );
  });

  it("㉥ 심화중의 해설은 후보를 늘어놓지 않는다 (D-115 ⑾)", () => {
    const bad: string[] = [];
    for (const { code, tier } of BUILT) {
      if (tier !== "심화중") continue;
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화중");
        const steps = enumeratedSteps(p.solution);
        if (steps >= ENUM_THRESHOLD)
          bad.push(
            `${code} 심화중 seed=${seed}: 같은 연산 ${steps}개 — ${p.solution}`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 눈금 — 이 세는 함수가 «예»를 낼 수 있는가(내 심화상 하나는 실제로 늘어놓는다).
    //
    // ⚠️ **2-6-3 이어야 한다.** 이 자는 `$…=…$` 안의 연산만 세므로, 후보를 등호 없이
    //    적는 자리는 구조적으로 0 이다 — 내 2-5-2 심화상은 「$140\div18$ 은 나누어떨어지지
    //    않고」처럼 **결과를 안 적고**(적을 수가 없다) 1-1-3 은 약분이라 연산 기호가 없다.
    //    둘 다 **후보를 실제로 늘어놓는데** 이 자가 못 센다(그 자의 머리말 §「못 보는 것」
    //    넷째가 적어 둔 부류다). 그러니 여기서 그 둘을 눈금으로 쓰면 **거짓 빨강**이 난다.
    const top = generateElementaryProblem(unitOf("2-6-3"), SEEDS[0]!, "심화상");
    expect(enumeratedSteps(top.solution)).toBeGreaterThanOrEqual(
      ENUM_THRESHOLD,
    );
  });

  it("㉦ 확대 갈래에는 그림이 없다 — 되짚을 값을 그림이 알려 준다", () => {
    const bad: string[] = [];
    for (const { code, tier } of BUILT) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        if (p.figureSpec !== null)
          bad.push(`${code} ${tier} seed=${seed}: 그림이 붙었다`);
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("🔴 ㉧ 지면이 진짜 원과 모순되지 않는다 — 2-5 를 비운 근거를 잠근다", () => {
    // 2-5-2 심화상은 **원주율을 값으로 준다.** 그러면 굴러간 거리는
    // $3.14\times(지름)\times(바퀴 수)$ 와 **정확히** 같아야 한다 — 안 그러면
    // 있을 수 없는 원이 지면에 나간다(그 모순이 2-5 심화중 넷을 비우게 한 이유다).
    const bad: string[] = [];
    let checked = 0;
    for (const seed of WIDE_SEEDS) {
      const p = generateElementaryProblem(unitOf("2-5-2"), seed, "심화상");
      const dist = centsOf(p.content, /굴렸더니 \$([\d.]+)\\,\\mathrm\{cm\}\$/);
      const turns = Number(p.answer.replace(/\$/g, ""));
      const win = p.content.match(
        /지름이 \$(\d+)\$ cm보다 길고 \$(\d+)\$ cm보다 짧은/,
      );
      if (dist === null || !win || !Number.isFinite(turns)) {
        bad.push(`seed=${seed}: 발문을 못 읽음 — ${p.content}`);
        continue;
      }
      checked += 1;
      const hit = intsBetween(Number(win[1]), Number(win[2])).filter(
        (d) => d * turns * 314 === dist,
      );
      if (hit.length !== 1)
        bad.push(
          `seed=${seed}: 창 안에 «거리 = 3.14×지름×바퀴 수» 인 지름이 ${hit.length}개다 — ${p.content}`,
        );
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(checked).toBe(WIDE_SEEDS.length);

    // 그리고 **모양 성질 쪽도** 같은 태도로 잠근다 — 2-6-1·2-6-2 의 「정사각형」이
    // 실제로 성립하는가(값은 맞고 말만 정사각형인 부류를 막는다).
    for (const seed of SEEDS) {
      const a = generateElementaryProblem(unitOf("2-6-1"), seed, "심화중");
      const area = natsIn(a.content)[0]!;
      const r = Number(a.answer.replace(/\$/g, ""));
      expect(
        2 * r * (2 * r),
        `2-6-1 seed=${seed}: 앞모양이 정사각형이 아니다`,
      ).toBe(area);
      const b = generateElementaryProblem(unitOf("2-6-2"), seed, "심화중");
      const perim = centsOf(b.content, /둘레가 \$([\d.]+)\\,\\mathrm\{cm\}\$/)!;
      const rb = Number(b.answer.replace(/\$/g, ""));
      expect(
        4 * (2 * rb * 314),
        `2-6-2 seed=${seed}: 옆면이 정사각형이 아니다`,
      ).toBe(perim);
    }

    // 🔴 2-6-3 — **지면이 답을 하나로 정하는가.** 발문은 「넓이가 $A$ 인 삼각형 ·
    //    반지름과 높이가 자연수 · 높이가 반지름보다 길며 $cap$ 보다 짧다」고만 말한다.
    //    그 말만으로 짝이 둘이면 답이 둘이고, 그건 값 검산이 **구조적으로 못 본다**
    //    (엔진이 고른 하나로 계산하면 산술은 그대로 맞는다).
    //    생성기에 있던 「하나만 남았나」 줄은 `cap` 의 범위와 대수적으로 같은 말이라
    //    아무것도 안 갈랐다(변이가 「산출물 그대로」로 찍었다). 그래서 지웠고,
    //    지키는 일은 여기서 **발문을 다시 풀어서** 한다.
    let coneChecked = 0;
    for (const seed of WIDE_SEEDS) {
      const p = generateElementaryProblem(unitOf("2-6-3"), seed, "심화상");
      const m = p.content.match(
        /넓이가 \$(\d+)\$ cm²인 삼각형.*?\$(\d+)\$ cm보다 짧을 때/s,
      );
      if (!m) {
        bad.push(`2-6-3 seed=${seed}: 발문을 못 읽음 — ${p.content}`);
        continue;
      }
      coneChecked += 1;
      const area = Number(m[1]);
      const cap = Number(m[2]);
      // (앞모양 넓이) = (지름)×(높이)÷2 = (반지름)×(높이)
      const fit: number[] = [];
      for (let r = 1; r * r < area; r += 1)
        if (area % r === 0 && area / r < cap) fit.push(r);
      if (fit.length !== 1 || fit[0] !== Number(p.answer.replace(/\$/g, "")))
        bad.push(
          `2-6-3 seed=${seed}: 발문이 정하는 반지름이 ${fit.length}개다(${fit.join(",")}) — ${p.content}`,
        );
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(coneChecked).toBe(WIDE_SEEDS.length);
  });

  it("🔴 ㉨ ±**한 걸음** — 지면의 두 수를 더하거나 빼서 답이 나오지 않는다", () => {
    // 🔴 반증 ⑥ 의 자(`forwardReachable`)는 허용 꼴 넷이 **전부 곱을 문다.**
    //    그래서 곱이 첫 걸음이 아닌 자리에서는 구조적으로 0 이고, 그 0 은 «깨끗»이
    //    아니라 **«못 셈»** 이다(2026-08-31 리드 지시 · 초3 1-1-4 는 전수 «두 수의 차»,
    //    초4 는 「⑥ 0건」 144자리가 전량 못 셈이었다). 그 사각지대를 이 축이 덮는다.
    //
    //    규칙: 지면의 두 수 `a`·`b` 에 대해 `a+b` 또는 `a−b` 가 답과 같고 그 결과가
    //    `a` 와도 `b` 와도 다르면 «한 걸음». `0` 은 세지 않고, 두 걸음은 일부러 안 본다.
    const eq = (x: Rat, y: Rat) => x.n * y.d === y.n * x.d;
    const pmOneStep = (nums: readonly Rat[], answer: Rat): boolean => {
      for (let i = 0; i < nums.length; i += 1)
        for (let j = 0; j < nums.length; j += 1) {
          if (i === j) continue;
          const a = nums[i]!;
          const b = nums[j]!;
          if (a.n === 0 || b.n === 0) continue;
          if (eq(answer, a) || eq(answer, b)) continue;
          if (
            eq({ n: a.n * b.d + b.n * a.d, d: a.d * b.d }, answer) ||
            eq({ n: a.n * b.d - b.n * a.d, d: a.d * b.d }, answer)
          )
            return true;
        }
      return false;
    };

    // 🔴 눈금 — 양성 둘·음성 둘. 이 자가 «예»와 «아니오»를 **둘 다** 낼 수 있어야
    //    아래의 0 이 «깨끗»이다(2026-08-20 「판정자의 성적표에는 음성 대조군도 있어야」).
    expect(
      pmOneStep(pageNumbers("$25$ $19$"), readRat("6")!),
      "양성 — $25-19=6$",
    ).toBe(true);
    expect(
      pmOneStep(pageNumbers("$\\frac{3}{4}$ $\\frac{1}{4}$"), readRat("1")!),
      "양성 — 분수도 잰다",
    ).toBe(true);
    expect(
      pmOneStep(pageNumbers("$25$ $19$"), readRat("25")!),
      "음성 — 답이 지면의 수 그대로면 «한 걸음»이 아니다",
    ).toBe(false);
    expect(
      pmOneStep(pageNumbers("$25$ $19$"), readRat("475")!),
      "음성 — 곱은 이 축이 보는 것이 아니다",
    ).toBe(false);

    const bad: string[] = [];
    let measured = 0;
    for (const { code, tier } of BUILT) {
      const unit = unitOf(code);
      for (const seed of WIDE_SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        const ans = readRat(p.answer.replace(/\$/g, "").trim());
        expect(ans, `${code} ${tier}: 답을 못 읽음 — ${p.answer}`).toBeTruthy();
        measured += 1;
        if (pmOneStep(pageNumbers(p.content), ans!))
          bad.push(
            `${code} ${tier} seed=${seed}: 두 수의 합·차로 답이 나온다 — ${p.content}`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(measured).toBe(BUILT.length * WIDE_SEEDS.length);
  });

  it("답은 하나이고 「모두 …시오」로 도망가지 않는다 (반증 ⑤)", () => {
    const bad: string[] = [];
    for (const { code, tier } of BUILT) {
      const unit = unitOf(code);
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, tier);
        if (/모두 (?:구하|쓰)시오|몇 가지/.test(p.content))
          bad.push(`${code} ${tier} seed=${seed}: 열거 문형 — ${p.content}`);
        if (/,\\ /.test(p.answer))
          bad.push(`${code} ${tier} seed=${seed}: 답이 둘이다 — ${p.answer}`);
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });
});
