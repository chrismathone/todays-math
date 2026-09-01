/**
 * **초4 물결 4 — `1-2 각도` · `2-2 삼각형` · `2-5 꺾은선` 의 확대 갈래를 잠근다**
 * (D-113 · D-115, 2026-09-01).
 *
 * ## 이 시험이 무엇을 지키나
 *
 * 시험은 생성기를 **안 부른다** — 발문과 그림 스펙에서 마디의 후보 무리를 **다시 만들어**
 * 견준다. 그래야 「생성기가 그렇게 만들었다」가 아니라 「지면이 그렇게 말한다」가 참이 된다.
 *
 * ```
 * ⑴ 등록      세운 곳과 **비운 곳**을 정확히 못 박는다 — 조용히 채우거나 지우면 빨강
 * ⑵ 마디      굳힘을 걸기 **전에** 후보가 여럿이다
 * ⑶ 굳힘      굳힘을 걸면 **정확히 하나**가 남고 그것이 답이다
 * ⑷ 음성 대조 조건 문구를 **뒤집으면 다른 쪽**이 남는다 (굳힘이 장식이 아니다)
 * ⑸ 지름길    100% 인 지름길이 없다 — 자는 `measure-elem-g4w4-shortcuts.ts` 한 곳
 * ⑹ 지면      「잘못」 0 · 규모 · 발문 가짓수 · 표의 지운 칸 수 · 그림 규약
 * ```
 *
 * ## 🔴 ⑸ 를 왜 자로 재나 — 물결 3 이 잃은 셋이 여기 있었다
 *
 * 2026-08-31 적대 검토가 물결 3 의 갈래 아홉 중 **넷**을 「굳힘이 후보를 한 번도 안
 * 갈랐다」로 잡았다. 밭이 「하나만 남긴다」를 보장해도 **죽는 쪽이 늘 같으면** 학생은
 * 굳힘을 안 대고 그 쪽을 바로 고른다. 그 회차가 남긴 규율 —
 * **「지름길은 적어 두는 것이 아니라 전수로 세어 %를 내는 것」** — 을 여기서 시험으로 건다.
 * 셈은 `scripts/qa/measure-elem-g4w4-shortcuts.ts` **한 곳**에 있고 이 시험이 그것을
 * `import` 한다(두 벌로 적으면 한쪽만 고쳐도 아무도 모른다).
 *
 * ## 이 시험이 **못 보는 것**
 *
 * ㉠ **후보 무리를 만드는 규칙은 내가 적은 것이다.** 학생이 밟을 무리와 같은지는 사람이 본다.
 * ㉡ **반증 ⑥ 축이 좁다** — `forwardReachable` 의 허용 꼴이 넷 다 곱을 물어 덧뺄셈·나눗셈
 *    한 걸음에는 «예»를 못 낸다. 게다가 답이 낱말(예각·직각·둔각)이거나 두 쪽인 갈래는
 *    `readRat` 이 못 읽어 한 겹 더 밖이다. **그 0 은 «깨끗»이 아니다** — 못 잰 자리를 따로 센다.
 * ㉢ **높이는 못 잰다** — 「이 심화중이 그 소단원 심화하보다 어려운가」는 지면에 없다.
 * ㉣ **지름길 목록은 손으로 적은 것**이라 거기 없는 규칙은 구조적으로 0 이다.
 */
import { describe, expect, it } from "vitest";

import {
  faults,
  measureClock,
  measureIsoAngle,
  measureIsoSide,
  measureTableHide,
  measureThreshold,
} from "../../../scripts/qa/measure-elem-g4w4-shortcuts";
import type { ElemTier } from "@/lib/elementary/difficulty";
import {
  forwardReachable,
  pageNumbers,
  readRat,
} from "@/lib/elementary/forwardReach";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "@/lib/elementary/generate";

import { expectCoreTiers, tiersOf } from "../helpers/elemTiers";

const SEEDS = Array.from({ length: 16 }, (_, i) => 20260901 + i * 101);
const WIDE = Array.from({ length: 200 }, (_, i) => 20260901 + i * 7);

function unitOf(code: string) {
  const u = elementaryUnits().find(
    (x) => x.grade === "초4" && x.section.startsWith(`${code} `),
  );
  if (!u) throw new Error(`초4 ${code} 소단원이 없다`);
  return u;
}

function gen(code: string, seed: number, tier?: ElemTier) {
  return generateElementaryProblem(unitOf(code), seed, tier);
}

const DEG = "\\$(\\d+)\\^\\\\circ\\$";
const CM = "\\$(\\d+)\\\\,\\\\mathrm\\{cm\\}\\$";
const PLAIN = "\\$(\\d+)\\$";

function grab(text: string, pattern: string): number[] {
  return [...text.matchAll(new RegExp(pattern, "g"))].map((m) => Number(m[1]));
}

/* ─────────────────── ⑴ 등록 — 세운 곳과 비운 곳 ─────────────────── */

/**
 * 🔴 **비운 자리도 못 박는다.** 「세운 것」만 적으면 다음 사람이 비움을 조용히 뒤집어도
 * 아무 검사도 안 운다. 비움은 판단이지 빈칸이 아니다(까닭은 `g4.ts` 등록부 주석과
 * `docs/planning/tracks/reports/tier-fill-g4-w4.md` §3).
 */
const REGISTERED: Record<string, ElemTier[]> = {
  // 1-1 큰 수 — **열넷 전부 비움**(굳힘 성질이 자릿수뿐이라 1-6-1 심화중과 동형).
  "1-1-1": [],
  "1-1-2": [],
  "1-1-3": [],
  "1-1-4": [],
  "1-1-5": [],
  "1-1-6": [],
  "1-1-7": [],
  // 1-2 각도 — 1-2-3 만 선다(시각 ↔ 큰 눈금 칸수).
  "1-2-1": [],
  "1-2-2": [],
  "1-2-3": ["심화중"],
  "1-2-4": [],
  "1-2-5": [],
  "1-2-6": [],
  // 1-4 평면도형의 이동 — **여덟 전부 비움**(상태 공간이 유한하다).
  "1-4-1": [],
  "1-4-2": [],
  "1-4-3": [],
  "1-4-4": [],
  // 2-2 삼각형 — 변 축(2-2-1)과 각 축(2-2-2) 둘. 심화상은 다섯 전부 비움.
  "2-2-1": ["심화중"],
  "2-2-2": ["심화중"],
  "2-2-3": [],
  "2-2-4": [],
  "2-2-5": [],
  // 2-5 꺾은선 — 2-5-2 중 · 2-5-3 상.
  "2-5-1": [],
  "2-5-2": ["심화중"],
  "2-5-3": ["심화상"],
};

describe("초4 물결 4 — 등록", () => {
  it.each(Object.keys(REGISTERED))("%s 는 핵심 넷이 다 있다", (code) => {
    expectCoreTiers(unitOf(code), code);
  });

  it("확대 갈래가 세운 곳에만, 세운 것만 있다", () => {
    const got: Record<string, string[]> = {};
    for (const code of Object.keys(REGISTERED)) {
      got[code] = supportedTiers(unitOf(code)).filter(
        (t) => t === "심화중" || t === "심화상",
      );
    }
    expect(got).toEqual(REGISTERED);
  });

  it("세운 다섯 갈래가 실제로 만들어진다", () => {
    let made = 0;
    for (const [code, tiers] of Object.entries(REGISTERED)) {
      for (const tier of tiers) {
        for (const seed of SEEDS) {
          const p = gen(code, seed, tier);
          expect(
            p.content.length,
            `${code} «${tier}» s${seed}`,
          ).toBeGreaterThan(20);
          expect(p.answer.length, `${code} «${tier}» s${seed}`).toBeGreaterThan(
            0,
          );
          made += 1;
        }
      }
    }
    expect(made).toBe(5 * SEEDS.length);
  });
});

/* ─────────────────── ⑵⑶⑷ 마디 · 굳힘 · 음성 대조 ─────────────────── */

describe("1-2-3 심화중 — 시각 후보 둘을 «$6$시보다 이르다/늦다»가 가른다", () => {
  const kindOf = (hour: number) => {
    const d = 30 * Math.min(hour, 12 - hour);
    return d < 90 ? "예각" : d === 90 ? "직각" : "둔각";
  };

  it("후보가 둘이고, 둘이 서로 다른 답을 내며, 조건이 하나를 고른다", () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const p = gen("1-2-3", seed, "심화중");
      const angle = grab(p.content, DEG)[0]!;
      const after = grab(p.content, PLAIN)[1]!;
      const early = p.content.includes("이릅니다");
      expect(early || p.content.includes("늦습니다"), `s${seed}`).toBe(true);
      // ⑵ 마디 — 「작은 쪽 각이 그 크기인 정각」이 **둘**이다.
      const hours = [angle / 30, 12 - angle / 30];
      expect(new Set(hours).size, `s${seed}: ${hours}`).toBe(2);
      const wrap = (h: number) => ((h + after - 1) % 12) + 1;
      const kinds = hours.map((h) => kindOf(wrap(h)));
      // ⑶ 굳힘이 일을 한다 — 두 후보의 답이 **서로 달라야** 조건이 뜻을 가진다.
      expect(kinds[0], `s${seed}: ${kinds}`).not.toBe(kinds[1]);
      expect(p.answer, `s${seed}`).toBe(early ? kinds[0] : kinds[1]);
      // ⑷ 음성 대조 — 조건을 뒤집으면 **다른 쪽**이 답이다.
      expect(early ? kinds[1] : kinds[0], `s${seed}`).not.toBe(p.answer);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });

  it("그림을 붙이지 않는다 — 시계를 그리면 시각이 바로 보여 마디가 닫힌다", () => {
    for (const seed of WIDE) {
      expect(gen("1-2-3", seed, "심화중").figureSpec, `s${seed}`).toBeNull();
    }
  });

  /**
   * 🔴 **씨앗 열여섯으로는 이 검사가 초록이었다.** 변이 하네스가 「$12$시를 안 막는다」에
   * 「초록 ← 가드가 아니다」를 냈다 — 두 바늘이 겹쳐 각이 $0^\circ$ 가 되는 자리를
   * 표본이 한 번도 안 밟은 것이다. 넓은 훑기로 옮겼다.
   */
  it("$t$시간 뒤가 $12$시가 되지 않는다 — 두 바늘이 겹치면 «이루는 각»이 없다", () => {
    let seen = 0;
    for (const seed of WIDE) {
      const p = gen("1-2-3", seed, "심화중");
      const angle = grab(p.content, DEG)[0]!;
      const after = grab(p.content, PLAIN)[1]!;
      for (const h of [angle / 30, 12 - angle / 30]) {
        expect(((h + after - 1) % 12) + 1, `s${seed}`).not.toBe(12);
      }
      seen += 1;
    }
    expect(seen).toBe(WIDE.length);
  });
});

describe("2-2-1 심화중 — 두 삼각형을 «가장 짧은 변»이 가른다", () => {
  it("두 가지가 다 삼각형이고, 최단 변이 다르며, 조건이 하나를 고른다", () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const p = gen("2-2-1", seed, "심화중");
      const [total, side, bar] = grab(p.content, CM) as [
        number,
        number,
        number,
      ];
      const longer = p.content.includes("보다 깁니다");
      expect(longer || p.content.includes("보다 짧습니다"), `s${seed}`).toBe(
        true,
      );
      // ⑵ 마디 — ㉮ $(a,a,S-2a)$ 와 ㉯ $((S-a)/2,(S-a)/2,a)$ 가 **둘 다 선다**.
      const oddA = total - 2 * side;
      const pairB = (total - side) / 2;
      const stands = (x: number, y: number, z: number) =>
        x > 0 && y > 0 && z > 0 && x + y > z && y + z > x && z + x > y;
      expect(
        stands(side, side, oddA),
        `s${seed}: ㉮ ${side},${side},${oddA}`,
      ).toBe(true);
      expect(Number.isInteger(pairB), `s${seed}: ㉯ ${pairB}`).toBe(true);
      expect(
        stands(pairB, pairB, side),
        `s${seed}: ㉯ ${pairB},${pairB},${side}`,
      ).toBe(true);
      // 🔴 견주는 값은 **길이가 같은 두 변이 아닌 나머지 한 변**이다 — ㉮ 는 $S-2a$,
      //    ㉯ 는 $a$. 그 둘의 순서가 $S=3a$ 에서 뒤집혀 「문구만 보고 고르기」가 무너진다.
      expect(oddA, `s${seed}: 나머지 한 변이 같으면 조건이 못 가른다`).not.toBe(
        side,
      );
      expect(
        bar,
        `s${seed}: 문턱이 한 변과 같으면 같은 수가 두 뜻이 된다`,
      ).not.toBe(side);
      // ⑶ 굳힘이 **정확히 하나**를 남긴다.
      const alive = [
        { odd: oddA, sum: 2 * side },
        { odd: side, sum: total - side },
      ].filter((c) => (longer ? c.odd > bar : c.odd < bar));
      expect(alive, `s${seed}: 살아남은 가지`).toHaveLength(1);
      expect(p.answer, `s${seed}`).toContain(`$${alive[0]!.sum}\\,`);
      /*
       * ⑷ 음성 대조 — **죽는 가지가 조건을 실제로 어긴다.**
       * ⚠️ 처음에는 「조건 문구를 뒤집으면 다른 쪽이 남는다」로 썼는데 그것은 참이 아니다:
       *    문턱이 작은 쪽 최단 변과 **같을 수 있어**(밭이 `lo <= bar` 를 허용한다)
       *    「$bar$보다 짧다」로 뒤집으면 **둘 다 죽는다.** 조건을 뒤집는 것은 다른 문항을
       *    만드는 일이고, 여기서 물을 것은 「이 문항에서 굳힘이 일을 했나」다.
       */
      const dead = [
        { odd: oddA, sum: 2 * side },
        { odd: side, sum: total - side },
      ].filter((c) => c.sum !== alive[0]!.sum);
      expect(dead, `s${seed}`).toHaveLength(1);
      expect(
        longer ? dead[0]!.odd > bar : dead[0]!.odd < bar,
        `s${seed}: 죽는 가지가 조건을 어기지 않는다 — 굳힘이 장식이다`,
      ).toBe(false);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });

  /**
   * ⚠️ 열쇠를 「두 변의 길이의 합」으로 잡으면 **내 발문이 스스로 걸린다** —
   * 답을 묻는 문장이 「길이가 **같은 두 변의 길이의 합**은 몇 cm인가?」이기 때문이다.
   * 삼각형 부등식은 「두 변의 합이 **나머지 한 변보다** 크다」로만 쓰이므로 그 꼴을 본다.
   * (밭을 만들 때는 그 성질을 **생성 필터**로 쓴다 — 지면이 근거로 쓰는 것만 막는다.)
   */
  it("삼각형 부등식을 발문·해설이 근거로 쓰지 않는다 (초4 교과 밖 — 반증 ③)", () => {
    for (const seed of WIDE) {
      const p = gen("2-2-1", seed, "심화중");
      for (const body of [p.content, p.solution]) {
        expect(body, `s${seed}`).not.toContain("나머지 한 변보다 크");
        expect(body, `s${seed}`).not.toContain("나머지 한 변보다 길");
        expect(body, `s${seed}`).not.toContain("부등식");
        expect(body, `s${seed}`).not.toContain("삼각형이 될 수");
      }
    }
  });
});

describe("2-2-2 심화중 — 두 갈래를 «같은 두 각의 합»이 가른다", () => {
  it("문턱이 두 합 사이에 있고, 조건이 하나를 고른다", () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const p = gen("2-2-2", seed, "심화중");
      const [given, bar] = grab(p.content, DEG) as [number, number];
      const bigger = p.content.includes("보다 큽니다");
      expect(bigger || p.content.includes("보다 작습니다"), `s${seed}`).toBe(
        true,
      );
      // ⑵ 마디 — 두 갈래의 «같은 두 각의 합»이 서로 다르다.
      const sumApex = 180 - given;
      const sumBase = 2 * given;
      expect(sumApex, `s${seed}`).not.toBe(sumBase);
      /*
       * 🔴 **$a>60$ 무리가 있어야 한다.** $a<60$ 만 담으면 두 합의 순서가 구조적으로
       * 고정이라 「크다 → 나머지 한 각」이 **100%** 인 지름길이 된다(자가 잰 값).
       * 그래서 문턱은 두 합의 min/max **사이**여야 한다 — 순서를 가정하지 않는다.
       */
      const lo = Math.min(sumApex, sumBase);
      const hi = Math.max(sumApex, sumBase);
      expect(bar, `s${seed}: ${lo} < ${bar} < ${hi}`).toBeGreaterThan(lo);
      expect(bar, `s${seed}`).toBeLessThan(hi);
      // ⑶ 굳힘 — 답은 「가장 큰 각 − 가장 작은 각」이고 갈래마다 다르다.
      const answer = grab(p.answer, DEG)[0]!;
      const gapA = Math.abs(3 * given - 180) / 2;
      const gapB = Math.abs(3 * given - 180);
      expect(gapA, `s${seed}`).not.toBe(gapB);
      const takeA = bigger ? sumApex > bar : sumApex < bar;
      expect(answer, `s${seed}`).toBe(takeA ? gapA : gapB);
      // ⑷ 음성 대조 — **죽는 가지가 조건을 실제로 어긴다.**
      expect(
        bigger ? sumBase > bar : sumBase < bar,
        `s${seed}: 죽는 가지가 조건을 어기지 않는다 — 굳힘이 장식이다`,
      ).toBe(!takeA);
      // 답이 발문의 수와 같아지면 다른 축의 결함이다(`answerPrintedOnPage`).
      expect(answer, `s${seed}`).not.toBe(given);
      expect(answer, `s${seed}`).not.toBe(bar);
      // 정삼각형($a=60$)은 두 가지가 하나로 겹쳐 마디가 안 열린다.
      expect(given, `s${seed}`).not.toBe(60);
      expect(given, `s${seed}`).toBeLessThan(90);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });
});

describe("2-5-2 심화중 — 문턱을 안 준다", () => {
  type LineSpec = { values?: { label: string; value: number }[] };

  it("되짚은 때 앞에 «내려간 구간»이 있고, 그 앞의 최댓값이 답이다", () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const p = gen("2-5-2", seed, "심화중");
      const vs = ((p.figureSpec as LineSpec | null)?.values ?? []).map(
        (v) => v.value,
      );
      expect(vs, `s${seed}`).toHaveLength(5);
      expect(
        new Set(vs).size,
        `s${seed}: 값이 겹치면 «그 때»가 안 정해진다`,
      ).toBe(5);
      const grew = Number(
        new RegExp("값은 \\$(\\d+)\\$\\S* 늘었습니다").exec(p.content)![1],
      );
      const start = vs[4]! - grew;
      const at = vs.indexOf(start);
      expect(at, `s${seed}: 되짚은 값이 그래프에 없다`).toBeGreaterThan(0);
      const before = vs.slice(0, at);
      const peak = Math.max(...before);
      // ⑵ 마디 — $T$ 가 하나로 안 굳는다(창이 둘 이상 넓다).
      expect(start - peak, `s${seed}: ${vs} at=${at}`).toBeGreaterThan(1);
      // ⑶ 굳힘 — 「처음으로」의 뜻이 아래끝을 정한다.
      expect(p.answer, `s${seed}`).toContain(`$${peak}$`);
      // ⑷ 음성 대조 — 「가장 **큰** 수」로 읽으면 다른 값이다(그 판은 앞쪽을 안 본다).
      expect(start - 1, `s${seed}`).not.toBe(peak);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });

  it("«바로 앞 때»가 답이 아닌 자리가 실제로 있다 — 지름길이 강제되지 않는다", () => {
    let notPrev = 0;
    for (const seed of WIDE) {
      const p = gen("2-5-2", seed, "심화중");
      const vs = ((p.figureSpec as LineSpec | null)?.values ?? []).map(
        (v) => v.value,
      );
      const grew = Number(
        new RegExp("값은 \\$(\\d+)\\$\\S* 늘었습니다").exec(p.content)![1],
      );
      const at = vs.indexOf(vs[4]! - grew);
      if (Math.max(...vs.slice(0, at)) !== vs[at - 1]) notPrev += 1;
    }
    // 실측 약 절반. 크게 줄면 밭이 한쪽으로 쏠린 것이다.
    expect(notPrev).toBeGreaterThan(WIDE.length * 0.25);
  });
});

describe("2-5-3 심화상 — 지워진 두 값을 만들어 견준다", () => {
  type TableSpec = { rows?: string[][] };

  it("표의 지운 칸이 정확히 둘이고, 후보가 셋 이상이며, 하나만 살아남는다", () => {
    let seen = 0;
    for (const seed of SEEDS) {
      const p = gen("2-5-3", seed, "심화상");
      const rows = (p.figureSpec as TableSpec | null)?.rows ?? [];
      expect(rows, `s${seed}`).toHaveLength(5);
      const blanks = rows
        .map((r, i) => (r[1] === "□" ? i : -1))
        .filter((i) => i >= 0);
      expect(blanks, `s${seed}: 지운 칸`).toEqual([1, 4]);
      const step = Number(
        new RegExp("한 칸이 \\$(\\d+)\\$").exec(p.content)![1],
      );
      const sum = Number(new RegExp("합은 \\$(\\d+)\\$").exec(p.content)![1]);
      const v = rows.map((r) => Number(r[1]));
      // ⑵ 마디 — 「갈수록 커진다」 + 「눈금 위에 찍힌다」로 만든 후보가 **셋 이상**이다.
      const cand: { lo: number; hi: number }[] = [];
      for (let lo = v[0]! + step; lo <= v[2]! - step; lo += step) {
        if (sum - lo > v[3]!) cand.push({ lo, hi: sum - lo });
      }
      expect(cand.length, `s${seed}: 후보`).toBeGreaterThanOrEqual(3);
      // ⑶ 굳힘 — 「변화량이 넷 다 다르다」 + 「가장 가파른 구간이 그 구간」이 하나만 남긴다.
      const gapsOf = (c: { lo: number; hi: number }) => {
        const w = [v[0]!, c.lo, v[2]!, v[3]!, c.hi];
        return w.slice(1).map((t, i) => t - w[i]!);
      };
      const answer = grab(p.answer, PLAIN);
      const truth = gapsOf({ lo: answer[0]!, hi: answer[1]! });
      const steep = truth.indexOf(Math.max(...truth));
      const alive = cand.filter((c) => {
        const q = gapsOf(c);
        return new Set(q).size === 4 && q[steep]! >= Math.max(...q);
      });
      expect(alive, `s${seed}: 살아남은 짝`).toHaveLength(1);
      expect(alive[0]!.lo, `s${seed}`).toBe(answer[0]);
      expect(alive[0]!.hi, `s${seed}`).toBe(answer[1]);
      // 후보를 **발문이 주지 않는다** — 답 두 값 중 어느 것도 발문에 없다.
      const printed = grab(p.content, PLAIN);
      for (const a of answer) expect(printed, `s${seed}`).not.toContain(a);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });

  it("발문이 표만 가리킨다 — 「그래프에서」·「그림과 같이」를 안 쓴다 (2-5-3 규약)", () => {
    for (const seed of WIDE) {
      const p = gen("2-5-3", seed, "심화상");
      expect(p.content, `s${seed}`).toContain("표");
      for (const word of ["그래프에서", "그림과 같이"]) {
        expect(p.content, `s${seed}`).not.toContain(word);
      }
    }
  });
});

/* ─────────────────── ⑸ 지름길 ─────────────────── */

describe("지름길 — 100% 인 규칙이 하나도 없다 (자는 한 곳에서 온다)", () => {
  it("다섯 갈래 전부 — 마디가 열리고 지름길이 100% 가 아니다", () => {
    const reports = [
      measureClock(120),
      measureIsoSide(120),
      measureIsoAngle(120),
      measureThreshold(120),
      measureTableHide(120),
    ];
    expect(faults(reports)).toEqual([]);
    // 🔴 **분모를 먼저 못 박는다** — 0 을 「깨끗」으로 읽지 않게.
    for (const r of reports) {
      expect(r.n, `${r.code}`).toBe(120);
      expect(r.shortcuts.length, `${r.code}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("자가 «아니오» 를 낼 수 있다 — 지어낸 100% 를 잡는다", () => {
    const rigged = {
      code: "가",
      tier: "심화중",
      n: 10,
      open: 10,
      shortcuts: [{ name: "늘 한쪽", hit: 10, n: 10, chance: 0.5 }],
    };
    expect(faults([rigged])).toHaveLength(1);
    expect(faults([{ ...rigged, shortcuts: [] }])).toEqual([]);
  });
});

/* ─────────────────── ⑹ 지면 약속 ─────────────────── */

const BUILT: [string, ElemTier][] = [
  ["1-2-3", "심화중"],
  ["2-2-1", "심화중"],
  ["2-2-2", "심화중"],
  ["2-5-2", "심화중"],
  ["2-5-3", "심화상"],
];

describe("지면 약속", () => {
  it("「잘못 …했더니」를 한 자리도 안 쓴다 (초4 심화하에 이미 11자리)", () => {
    const bad: string[] = [];
    for (const [code, tier] of BUILT) {
      for (const seed of WIDE) {
        const p = gen(code, seed, tier);
        for (const body of [p.content, p.answer, p.solution]) {
          if (body.includes("잘못")) bad.push(`${code} «${tier}» s${seed}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("규모로 어렵게 만들지 않는다 — 발문의 수가 다섯 자리를 안 넘는다", () => {
    for (const [code, tier] of BUILT) {
      for (const seed of WIDE) {
        const p = gen(code, seed, tier);
        for (const v of grab(p.content, PLAIN)) {
          expect(v, `${code} «${tier}» s${seed}`).toBeLessThan(100000);
        }
      }
    }
  });

  it("씨앗 열여섯에서 발문이 여덟 가지 이상이다", () => {
    for (const [code, tier] of BUILT) {
      const seen = new Set(SEEDS.map((s) => gen(code, s, tier).content));
      expect(seen.size, `${code} «${tier}»`).toBeGreaterThanOrEqual(8);
    }
  });

  it("2-2 의 새 갈래는 그림이 없다 — 붙이면 «어느 쪽이 같은가»가 그림에서 보인다", () => {
    for (const code of ["2-2-1", "2-2-2"]) {
      for (const seed of WIDE) {
        expect(
          gen(code, seed, "심화중").figureSpec,
          `${code} s${seed}`,
        ).toBeNull();
      }
    }
  });
});

/* ─────────────────── 반증 ⑥ — 그리고 그 0 이 어디까지 뜻하나 ─────────────────── */

describe("반증 ⑥ — 순방향으로 답이 나오면 중·상이 아니다", () => {
  it("답을 읽을 수 있는 갈래는 전량 안 닿는다 · 못 잰 자리를 따로 센다", () => {
    const stat: Record<string, { read: number; skipped: number }> = {};
    const bad: string[] = [];
    for (const [code, tier] of BUILT) {
      stat[code] = { read: 0, skipped: 0 };
      for (const seed of SEEDS) {
        const p = gen(code, seed, tier);
        const answer = readRat(p.answer.replace(/\$/g, "").trim());
        if (!answer) {
          stat[code]!.skipped += 1;
          continue;
        }
        stat[code]!.read += 1;
        if (forwardReachable(pageNumbers(p.content), answer)) {
          bad.push(`${code} «${tier}» s${seed}: ${p.answer}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    /*
     * 🔴 **못 잰 자리를 세어 못 박는다** — 0 이 «깨끗»인지 «못 셈»인지 갈려야 한다.
     * 실측(씨앗 16): 1-2-3 은 답이 낱말(예각·직각·둔각)이라 **16/16 축 밖**,
     * 2-5-3 은 답이 두 쪽(「$650$명, $1100$명」)이라 **16/16 축 밖**이다.
     * 2-2-1·2-2-2 는 `readRat` 이 단위 꼬리를 떼므로 읽힌다 — 거기서는 0 이 참말이다.
     * ⚠️ 그리고 그 «닿음 0» 조차 좁다: `forwardReachable` 의 허용 꼴이 넷 다 곱을 물어
     *    덧뺄셈·나눗셈 한 걸음에는 «예»를 못 낸다(2-2-1 의 답 $S-a$ 가 바로 그 부류다).
     *    그 자리는 자가 아니라 **사람이 손으로** 봤다(보고서 §5).
     */
    const read = Object.values(stat).reduce((a, s) => a + s.read, 0);
    const skipped = Object.values(stat).reduce((a, s) => a + s.skipped, 0);
    expect(read + skipped).toBe(BUILT.length * SEEDS.length);
    // 분모가 0이면 「닿음 0」이 공허하다 — 실제로 읽은 자리가 있어야 한다.
    expect(read, JSON.stringify(stat)).toBeGreaterThan(SEEDS.length);
    expect(stat["1-2-3"]!.read, "1-2-3 은 답이 낱말이라 축 밖이다").toBe(0);
    expect(stat["2-5-3"]!.read, "2-5-3 은 답이 두 쪽이라 축 밖이다").toBe(0);
    expect(skipped, JSON.stringify(stat)).toBeGreaterThanOrEqual(
      2 * SEEDS.length,
    );
  });

  it("검출기가 «예»를 낼 수 있다 — 같은 회차에 보인다", () => {
    expect(
      forwardReachable(pageNumbers("$12$, $5$, $7$"), readRat("53")!),
    ).toBe(true);
    expect(forwardReachable(pageNumbers("$12$, $5$"), readRat("53")!)).toBe(
      false,
    );
  });
});

/* ─────────────────── 해설의 «이유» — 값이 아니라 글자를 본다 ─────────────────── */

/**
 * 🔴 물결 3 적대 검토가 「해설의 «이유»에 가드가 하나도 없다」를 짚었다 —
 * 해설 문장을 열한 가지로 망가뜨렸는데 **열한 건 다 초록**이었다. 값 검사와 잣대
 * 판정기는 「수가 맞나」만 보고 **「그 수를 왜 골랐다고 적었나」는 안 본다.**
 *
 * 아래 넷은 **글자만 보고** 판정한다. 그리고 각각 **눈금**(음성·양성)이 같은 시험에 있다 —
 * 없으면 검출기가 조용히 0 이 되는 날 아무도 모른다.
 */
function faultsClock(content: string, solution: string): string[] {
  const bad: string[] = [];
  const early = content.includes("이릅니다");
  const want = early ? "이르므로" : "늦으므로";
  const wrong = early ? "늦으므로" : "이르므로";
  if (!solution.includes(want)) bad.push(`해설에 「${want}」가 없다`);
  if (solution.includes(wrong)) bad.push(`해설이 조건과 반대로 적었다`);
  return bad;
}

function faultsIsoSide(content: string, solution: string): string[] {
  const bad: string[] = [];
  const longer = content.includes("보다 깁니다");
  const want = longer ? "길므로" : "짧으므로";
  const wrong = longer ? "짧으므로" : "길므로";
  if (!solution.includes(want)) bad.push(`해설에 「${want}」가 없다`);
  if (solution.includes(wrong)) bad.push(`해설이 조건과 반대로 적었다`);
  return bad;
}

/**
 * ⚠️ **갈래 이름은 «크다/작다»만으로 못 정한다** — $a>60$ 이면 두 합의 순서가 뒤집히기
 * 때문이고, 그 뒤집힘이 이 갈래의 지름길을 무너뜨리는 장치다. 그래서 이 검출기는 발문의
 * 수까지 읽어 **어느 합이 살아남는지**를 셈한 뒤 문장과 맞대어 본다.
 */
function faultsIsoAngle(content: string, solution: string): string[] {
  const bad: string[] = [];
  const bigger = content.includes("보다 큽니다");
  const [given, bar] = grab(content, DEG) as [number, number];
  const want = bigger ? "크므로" : "작으므로";
  const takeA = bigger ? 180 - given > bar : 180 - given < bar;
  const branch = takeA ? "나머지 한 각" : "크기가 같은 두 각 중 하나";
  const wrong = takeA ? "크기가 같은 두 각 중 하나" : "나머지 한 각";
  if (!solution.includes(want)) bad.push(`해설에 「${want}」가 없다`);
  if (!solution.includes(`${want} `)) bad.push(`판정 문장이 끊겼다`);
  if (!solution.includes(`${branch}입니다`))
    bad.push(`해설이 고른 갈래가 「${branch}」가 아니다`);
  if (solution.includes(`${wrong}입니다`))
    bad.push(`해설이 반대 갈래를 골랐다`);
  return bad;
}

describe("해설의 «이유»가 성하다 — 값이 아니라 글자를 본다", () => {
  it("1-2-3 · 2-2-1 · 2-2-2 의 판정 문장이 발문의 조건과 맞물린다", () => {
    const bad: string[] = [];
    for (const seed of WIDE) {
      const c = gen("1-2-3", seed, "심화중");
      for (const f of faultsClock(c.content, c.solution))
        bad.push(`1-2-3 s${seed}: ${f}`);
      const s = gen("2-2-1", seed, "심화중");
      for (const f of faultsIsoSide(s.content, s.solution))
        bad.push(`2-2-1 s${seed}: ${f}`);
      const a = gen("2-2-2", seed, "심화중");
      for (const f of faultsIsoAngle(a.content, a.solution))
        bad.push(`2-2-2 s${seed}: ${f}`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("2-2-1 해설이 고른 «앞/뒤의 경우»가 답과 맞물린다", () => {
    const bad: string[] = [];
    for (const seed of WIDE) {
      const p = gen("2-2-1", seed, "심화중");
      const [total, side] = grab(p.content, CM) as [number, number];
      const answer = grab(p.answer, CM)[0]!;
      // 「앞의 경우」 = 주어진 변이 같은 두 변 중 하나 → 합이 $2a$.
      const wantFront = answer === 2 * side;
      expect(answer === 2 * side || answer === total - side, `s${seed}`).toBe(
        true,
      );
      const said = p.solution.includes("앞의 경우입니다");
      if (said !== wantFront)
        bad.push(`s${seed}: 해설이 고른 경우가 답과 어긋난다`);
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("2-5-2 해설이 «앞쪽 최댓값을 가진 때»를 이름으로 짚는다", () => {
    type LineSpec = { values?: { label: string; value: number }[] };
    const bad: string[] = [];
    for (const seed of WIDE) {
      const p = gen("2-5-2", seed, "심화중");
      const vals = (p.figureSpec as LineSpec | null)?.values ?? [];
      const vs = vals.map((v) => v.value);
      const grew = Number(
        new RegExp("값은 \\$(\\d+)\\$\\S* 늘었습니다").exec(p.content)![1],
      );
      const at = vs.indexOf(vs[4]! - grew);
      const before = vs.slice(0, at);
      const peakAt = before.indexOf(Math.max(...before));
      const label = vals[peakAt]!.label.replace(/^(\d+)/, "$$$1$$");
      if (!p.solution.includes(`${label}의 `)) {
        bad.push(`s${seed}: 해설이 「${label}」을 안 짚는다`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it("자체 눈금 — 검출기 셋이 실제로 잡고, 맞는 것은 통과시킨다", () => {
    // 음성 3 — 맞는 짝.
    expect(faultsClock("… 이릅니다. …", "… 이르므로 그 시각은 …")).toEqual([]);
    expect(
      faultsIsoSide("… 보다 깁니다. …", "… 길므로 앞의 경우입니다."),
    ).toEqual([]);
    expect(
      faultsIsoAngle(
        "한 각의 크기가 $26^\\circ$입니다. 합은 $59^\\circ$보다 큽니다.",
        "… 크므로 $26^\\circ$는 나머지 한 각입니다.",
      ),
    ).toEqual([]);
    // 양성 3 — 뒤집힌 짝.
    expect(
      faultsClock("… 이릅니다. …", "… 늦으므로 그 시각은 …").length,
    ).toBeGreaterThan(0);
    expect(
      faultsIsoSide("… 보다 깁니다. …", "… 짧으므로 뒤의 경우입니다.").length,
    ).toBeGreaterThan(0);
    expect(
      faultsIsoAngle(
        "한 각의 크기가 $26^\\circ$입니다. 합은 $59^\\circ$보다 큽니다.",
        "… 작으므로 $26^\\circ$는 크기가 같은 두 각 중 하나입니다.",
      ).length,
    ).toBeGreaterThan(0);
    // 🔴 **$a>60$ 무리** — 같은 「큽니다」인데 살아남는 갈래가 반대다.
    expect(
      faultsIsoAngle(
        "한 각의 크기가 $70^\\circ$입니다. 합은 $120^\\circ$보다 큽니다.",
        "… 크므로 $70^\\circ$는 크기가 같은 두 각 중 하나입니다.",
      ),
    ).toEqual([]);
    expect(
      faultsIsoAngle(
        "한 각의 크기가 $70^\\circ$입니다. 합은 $120^\\circ$보다 큽니다.",
        "… 크므로 $70^\\circ$는 나머지 한 각입니다.",
      ).length,
    ).toBeGreaterThan(0);
  });
});

/* ─────────────────── 형제 소단원의 발문이 안 겹친다 ─────────────────── */

describe("겹침 — 새 갈래가 같은 소단원의 다른 갈래와 발문이 다르다", () => {
  it("소단원마다 여섯(또는 다섯) 갈래의 발문이 서로 다르다", () => {
    for (const [code] of BUILT) {
      const unit = unitOf(code);
      for (const seed of SEEDS.slice(0, 4)) {
        const bodies = tiersOf(unit).map((t) =>
          generateElementaryProblem(unit, seed, t).content.replace(/\s+/g, ""),
        );
        expect(new Set(bodies).size, `${code} s${seed}`).toBe(bodies.length);
      }
    }
  });
});
