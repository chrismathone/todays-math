/**
 * 초6 확대 갈래 **2차분** — `1-2 각기둥과 각뿔` · `1-6 직육면체의 겉넓이와 부피` ·
 * `2-4 비례식과 비례배분` (D-113 축 · D-115 잣대, 2026-08-31).
 *
 * 파일럿(`elemTiersG6Deep.test.ts`, 2-2)이 재는 것과 **같은 축**을 이 셋에 댄다.
 * 값이 맞는지는 `elemTiersG6.test.ts` 가 이미 잰다 — 여기서는 **잣대**를 잰다.
 *
 * | 축 | 무엇을 재나 |
 * |---|---|
 * | ㉠ 마디가 정말 안 굳나 | 발문의 조건 **하나를 떼면** 값이 여럿이어야 한다(«열린 수» ≥ 2) |
 * | ㉡ 성질이 하나로 굳히나 | 그 성질을 걸면 정확히 **하나**가 남아야 한다(«굳은 수» = 1) |
 * | ㉢ 심화상은 성질로 **못** 굳히나 | 후보를 만든 뒤 **한 번 더 계산**해야 하나가 남는다 |
 * | ㉣ 반증 ⑥ | 발문의 수에 순방향 연산을 적용해 답이 나오면 안 된다 (`forwardReach.ts`) |
 * | ㉤ 반증 ④ | 같은 소단원의 연산·기본·응용이 이 축(구간으로 마디를 여는 것)을 안 쓴다 |
 * | ㉥ 해설이 늘어놓나 | 심화중의 해설은 후보를 늘어놓지 않는다 (D-115 ⑾) |
 * | ㉦ 그림 | 겨냥도는 **밑면의 변의 수를 그대로 보여 준다** — 확대 갈래에는 그림이 없다 |
 *
 * ## 🔴 이 파일이 **못 보는 것**
 *
 * 1. **「학생이 몇 번 생각하나」는 못 잰다.** 재는 것은 후보의 **개수**다 — 후보가 둘이어도
 *    한눈에 고를 수 있으면 얕다. 그 판정은 사람이 `dump-elem-tiers` 로 본다.
 * 2. **해설이 밟는 길은 ㉥ 한 줄로만 본다.** D-115 ⑸·⑾ 이 「참은 해설이다」라고 못 박았는데,
 *    이 파일이 해설에서 세는 것은 «같은 연산을 셋 이상 늘어놓았나» 하나뿐이다.
 * 3. **㉤ 는 대리 지표다.** 「구간 표지가 없다」는 「되짚기를 안 시킨다」와 같은 말이 아니다 —
 *    이 세 대단원의 연산·기본·응용 60갈래를 눈으로 읽은 결과가 보고서 §4 에 있고,
 *    여기서는 그 판단이 **뒤집히면 빨개지도록** 표지 하나만 잠근다.
 * 4. **답이 이름·비인 갈래는 반증 ⑥ 을 못 잰다** — `readRat` 이 「육각형」·「$3:5$」 를
 *    수로 못 읽는다. 그 자리는 ㉣ 에서 **세어 찍고** 건너뛴다(0 이 «깨끗»인지
 *    «못 셈»인지 갈라야 한다).
 */
import { describe, expect, it } from "vitest";

import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";
import {
  forwardReachable,
  pageNumbers,
  readRat,
} from "@/lib/elementary/forwardReach";

import {
  ENUM_THRESHOLD,
  enumeratedSteps,
} from "../../../scripts/qa/probe-elem-tier-enumeration";

const SEEDS = Array.from({ length: 24 }, (_, i) => i * 37 + 5);

const CODES = [
  "1-2-1",
  "1-2-2",
  "1-2-3",
  "1-2-4",
  "1-2-5",
  "1-6-1",
  "1-6-2",
  "1-6-3",
  "2-4-1",
  "2-4-2",
  "2-4-3",
  "2-4-4",
  "2-4-5",
] as const;

const unitOf = (code: string) => {
  const u = elementaryUnits().find(
    (x) => x.grade === "초6" && x.section.startsWith(code),
  );
  expect(u, `${code} 소단원`).toBeTruthy();
  return u!;
};

/** 발문의 `$…$` 안 자연수들을 **차례대로**. 단위 명령·구분 기호는 걷어낸다. */
function numsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/\$([^$]*)\$/g)) {
    const tok = m[1]!
      .replace(/\\,|\\;|\\!/g, " ")
      .replace(/\\mathrm\{[a-zA-Z]+\}(\^\d)?/g, " ")
      .replace(/\\square|\\times|\\div|[:=+\-()]/g, " ");
    for (const piece of tok.split(/\s+/))
      if (/^\d+$/.test(piece)) out.push(Number(piece));
  }
  return out;
}

const gcd = (a: number, b: number): number =>
  b === 0 ? Math.abs(a) : gcd(b, a % b);

/** 구간 $(lo, up)$ 안의 정수 — «마디가 열어 놓은 것». */
const intsBetween = (lo: number, up: number) => {
  const out: number[] = [];
  for (let v = Math.floor(lo) + 1; v < up; v += 1) out.push(v);
  return out;
};

type Split = { open: number; fixed: number };

/**
 * 갈래마다 **«열린 수»와 «굳은 수»** 를 다시 센다 — 엔진 풀을 안 부른다(되부르면 동어반복).
 *
 * `open` 은 굳히는 성질을 **빼고** 남는 후보 수, `fixed` 는 그 성질을 **걸고** 남는 수다.
 * 못 읽으면 `null` — 부르는 쪽이 실패로 다룬다(조용히 통과시키면 그 갈래는 안 잰다).
 */
function splitOf(code: string, tier: string, content: string): Split | null {
  const n = numsIn(content);
  const pairsOf = (p: number) => {
    const out: [number, number][] = [];
    for (let x = 1; x * x <= p; x += 1) if (p % x === 0) out.push([p / x, x]);
    return out;
  };

  if (code === "1-2-1" || code === "1-2-4") {
    if (tier === "심화중") {
      const [s, h, lo, up] = n;
      if (
        s === undefined ||
        h === undefined ||
        lo === undefined ||
        up === undefined
      )
        return null;
      const one = code === "1-2-4" ? (s * h) / 2 : s * h;
      return {
        open: intsBetween(lo, up).length,
        fixed: intsBetween(lo, up).filter((v) => v % one === 0).length,
      };
    }
    // 1-2-4 심화상 — 후보는 **입체의 종류 둘**이고, 성질(면의 수)로는 못 고른다.
    const [faces, cap] = n;
    if (faces === undefined || cap === undefined) return null;
    let open = 0;
    let fixed = 0;
    if (faces - 2 >= 3) {
      open += 1;
      if (2 * (faces - 2) < cap) fixed += 1;
    }
    if (faces - 1 >= 3) {
      open += 1;
      if (faces < cap) fixed += 1;
    }
    return { open, fixed };
  }

  if (code === "1-2-2") {
    const [lo, up] = n;
    if (lo === undefined || up === undefined) return null;
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter((v) => v % 3 === 0).length,
    };
  }

  if (code === "1-2-3") {
    const [s, lo, up] = n;
    if (s === undefined || lo === undefined || up === undefined) return null;
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter((v) => v % s === 0).length,
    };
  }

  if (code === "1-2-5") {
    const [lo, up] = n;
    if (lo === undefined || up === undefined) return null;
    const keep = content.includes("꼭짓점의 개수를 합하면")
      ? (v: number) => v % 2 === 0
      : (v: number) => (v - 1) % 3 === 0;
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter(keep).length,
    };
  }

  if (code === "1-6-1" && tier === "심화중") {
    const [w, d, lo, up] = n;
    if (
      w === undefined ||
      d === undefined ||
      lo === undefined ||
      up === undefined
    )
      return null;
    const base = 2 * w * d;
    const per = 2 * (w + d);
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter(
        (v) => v > base && (v - base) % per === 0,
      ).length,
    };
  }
  if (code === "1-6-1") {
    // 심화상 — 한 변 후보를 **실제로 겉넓이로 만들어** 봐야 하나가 남는다.
    const [h, s] = n;
    if (h === undefined || s === undefined) return null;
    const all: number[] = [];
    for (let a = 1; a <= 40; a += 1) all.push(a);
    return {
      open: all.filter((a) => 2 * a * a + 4 * a * h <= s + 4 * h).length,
      fixed: all.filter((a) => 2 * a * a + 4 * a * h === s).length,
    };
  }

  if (code === "1-6-2" && tier === "심화중") {
    const [v, w, gap] = n;
    if (v === undefined || w === undefined || gap === undefined) return null;
    if (v % w !== 0) return null;
    const pairs = pairsOf(v / w);
    return {
      open: pairs.length,
      fixed: pairs.filter(([big, small]) => big - small === gap).length,
    };
  }
  if (code === "1-6-2") {
    // 심화상 — 서로 다른 세 자연수의 곱으로 갈라지는 방법이 여럿이고,
    // 각 삼조의 «가장 긴 모서리»를 봐야 하나가 남는다.
    const [v, cap] = n;
    if (v === undefined || cap === undefined) return null;
    const triples: number[][] = [];
    for (let a = 1; a * a * a < v; a += 1) {
      if (v % a !== 0) continue;
      const rest = v / a;
      for (let b = a + 1; b * b < rest; b += 1) {
        if (rest % b !== 0) continue;
        const c = rest / b;
        if (c > b) triples.push([a, b, c]);
      }
    }
    return {
      open: triples.length,
      fixed: triples.filter((t) => t[2]! < cap).length,
    };
  }

  if (code === "1-6-3") {
    const [w, d, lo, up] = n;
    if (
      w === undefined ||
      d === undefined ||
      lo === undefined ||
      up === undefined
    )
      return null;
    const ints = intsBetween(lo / 1000000, up / 1000000);
    return {
      open: ints.length,
      fixed: ints.filter((v) => v % (w * d) === 0).length,
    };
  }

  if (code === "2-4-1") {
    // 곱한 수 후보는 두 항의 **공약수 전부** — 그중 서로소로 만드는 것은 최대공약수 하나.
    const [a, b] = n;
    if (a === undefined || b === undefined) return null;
    const common: number[] = [];
    for (let k = 1; k <= Math.min(a, b); k += 1)
      if (a % k === 0 && b % k === 0) common.push(k);
    return {
      open: common.length,
      fixed: common.filter((k) => gcd(a / k, b / k) === 1).length,
    };
  }

  if (code === "2-4-2") {
    const [, lo, up, b] = n;
    if (lo === undefined || up === undefined || b === undefined) return null;
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter((v) => v % b === 0).length,
    };
  }

  if (code === "2-4-3") {
    const [a, b, lo, up] = n;
    if (
      a === undefined ||
      b === undefined ||
      lo === undefined ||
      up === undefined
    )
      return null;
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter((v) => v % (a + b) === 0).length,
    };
  }

  if (code === "2-4-4") {
    const [a, b] = n;
    if (a === undefined || b === undefined) return null;
    const pairs = pairsOf(a * b);
    return {
      open: pairs.length,
      fixed: pairs.filter(([x, y]) => x === y).length,
    };
  }

  if (code === "2-4-5" && tier === "심화중") {
    const [, b, lo, up] = n;
    if (b === undefined || lo === undefined || up === undefined) return null;
    return {
      open: intsBetween(lo, up).length,
      fixed: intsBetween(lo, up).filter((v) => v % b === 0).length,
    };
  }
  if (code === "2-4-5") {
    // 심화상 — 구간이 한 묶음 후보를 여럿 남기고, 각 후보로 **몫을 만들어** 봐야 한다.
    const [a, b, lo, up, c2, d2] = n;
    if (
      a === undefined ||
      b === undefined ||
      lo === undefined ||
      up === undefined ||
      c2 === undefined ||
      d2 === undefined
    )
      return null;
    const totals = intsBetween(lo, up).filter((v) => v % (a + b) === 0);
    return {
      open: totals.length,
      fixed: totals.filter((v) => ((v / (a + b)) * a) % (c2 + d2) === 0).length,
    };
  }
  return null;
}

describe("[초6 확대 2차분] 잣대 — 마디가 안 굳고, 성질이 굳힌다", () => {
  it("㉠㉡ 심화중은 «열린 후보»가 둘 이상이고 성질이 **하나**로 굳힌다", () => {
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      if (!supportedTiers(unit).includes("심화중")) {
        bad.push(`${code}: 심화중이 등록돼 있지 않다`);
        continue;
      }
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화중");
        const s = splitOf(code, "심화중", p.content);
        if (!s) {
          bad.push(
            `${code} 심화중 seed=${seed}: 발문을 못 읽음 — ${p.content}`,
          );
          continue;
        }
        checked += 1;
        if (s.open < 2)
          bad.push(
            `${code} 심화중 seed=${seed}: 마디가 이미 굳어 있다(열린 후보 ${s.open}) — ${p.content}`,
          );
        if (s.fixed !== 1)
          bad.push(
            `${code} 심화중 seed=${seed}: 성질이 하나로 못 굳힌다(${s.fixed}) — ${p.content}`,
          );
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(checked).toBe(CODES.length * SEEDS.length);
  });

  it("㉢ 심화상은 성질까지 써도 후보가 둘 이상 남고, 계산해야 하나가 된다", () => {
    const bad: string[] = [];
    let checked = 0;
    const tops = ["1-2-4", "1-6-1", "1-6-2", "2-4-5"] as const;
    for (const code of tops) {
      const unit = unitOf(code);
      if (!supportedTiers(unit).includes("심화상")) {
        bad.push(`${code}: 심화상이 등록돼 있지 않다`);
        continue;
      }
      for (const seed of SEEDS) {
        const p = generateElementaryProblem(unit, seed, "심화상");
        const s = splitOf(code, "심화상", p.content);
        if (!s) {
          bad.push(
            `${code} 심화상 seed=${seed}: 발문을 못 읽음 — ${p.content}`,
          );
          continue;
        }
        checked += 1;
        if (s.open < 2)
          bad.push(
            `${code} 심화상 seed=${seed}: 되짚기가 후보를 하나만 만든다(${s.open}) — ${p.content}`,
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
    expect(
      forwardReachable(pageNumbers("$4$ $3$ $2$"), readRat("24")!),
      "양성 눈금 — 세 수의 곱도 순방향이다",
    ).toBe(true);

    const bad: string[] = [];
    let measured = 0;
    let unreadable = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of supportedTiers(unit)) {
        if (tier !== "심화중" && tier !== "심화상") continue;
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          const ans = readRat(p.answer.replace(/\$/g, "").trim());
          if (!ans) {
            unreadable += 1; // 이름 답·비 답 — 이 자의 축이 아니다
            continue;
          }
          measured += 1;
          if (forwardReachable(pageNumbers(p.content), ans))
            bad.push(
              `${code} ${tier} seed=${seed}: 순방향으로 닿는다 — ${p.content}`,
            );
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    // 「못 잰 자리」를 **세어 못 박는다** — 0 이 «깨끗»인지 «못 셈»인지 갈리게.
    // 답이 이름(1-2-4 심화중)·비(2-4-2)·비례식(2-4-3)인 셋 × 씨앗.
    expect(unreadable).toBe(3 * SEEDS.length);
    expect(measured).toBe(17 * SEEDS.length - 3 * SEEDS.length);
  });

  it("㉤ 반증 ④ — 연산·기본·응용은 «구간으로 마디를 여는» 축을 안 쓴다", () => {
    const 구간표지 = /보다 (?:크고|많고|길고|넓고)/;
    const bad: string[] = [];
    let checked = 0;
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of ["연산", "기본", "응용"] as const) {
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          checked += 1;
          if (구간표지.test(p.content))
            bad.push(`${code} ${tier} seed=${seed}: 구간 표지 — ${p.content}`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
    expect(checked).toBe(CODES.length * 3 * SEEDS.length);
    // 음성 대조 — 확대 갈래는 **반드시** 그 표지를 쓴다(안 쓰면 위 0 이 아무 뜻이 없다).
    const withMark = CODES.filter((code) =>
      구간표지.test(
        generateElementaryProblem(unitOf(code), SEEDS[0]!, "심화중").content,
      ),
    );
    expect(withMark.length).toBeGreaterThanOrEqual(10);
  });

  it("㉥ 심화중의 해설은 후보를 늘어놓지 않는다 (D-115 ⑾)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
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
    // 눈금 — 이 세는 함수가 «예»를 낼 수 있는가(심화상 하나는 실제로 늘어놓는다).
    const top = generateElementaryProblem(unitOf("1-6-2"), SEEDS[0]!, "심화상");
    expect(enumeratedSteps(top.solution)).toBeGreaterThanOrEqual(
      ENUM_THRESHOLD,
    );
  });

  it("㉦ 확대 갈래에는 그림이 없다 — 겨냥도가 밑면의 변의 수를 그대로 준다", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of supportedTiers(unit)) {
        if (tier !== "심화중" && tier !== "심화상") continue;
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          if (p.figureSpec !== null)
            bad.push(`${code} ${tier} seed=${seed}: 그림이 붙었다`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });

  it("답은 하나이고 「모두 …시오」로 도망가지 않는다 (반증 ⑤)", () => {
    const bad: string[] = [];
    for (const code of CODES) {
      const unit = unitOf(code);
      for (const tier of supportedTiers(unit)) {
        if (tier !== "심화중" && tier !== "심화상") continue;
        for (const seed of SEEDS) {
          const p = generateElementaryProblem(unit, seed, tier);
          if (/모두 (?:구하|쓰)시오|몇 가지/.test(p.content))
            bad.push(`${code} ${tier} seed=${seed}: 열거 문형 — ${p.content}`);
          if (/,\\ /.test(p.answer))
            bad.push(`${code} ${tier} seed=${seed}: 답이 둘이다 — ${p.answer}`);
        }
      }
    }
    expect(bad.slice(0, 6)).toEqual([]);
  });
});
