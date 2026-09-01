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
      // 두 바늘이 겹치는 $12$시는 「이루는 각」이 없다.
      for (const h of hours) expect(wrap(h), `s${seed}`).not.toBe(12);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });

  it("그림을 붙이지 않는다 — 시계를 그리면 시각이 바로 보여 마디가 닫힌다", () => {
    for (const seed of WIDE) {
      expect(gen("1-2-3", seed, "심화중").figureSpec, `s${seed}`).toBeNull();
    }
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
      const minA = Math.min(side, oddA);
      const minB = Math.min(pairB, side);
      expect(minA, `s${seed}: 최단 변이 같으면 조건이 못 가른다`).not.toBe(
        minB,
      );
      // ⑶ 굳힘이 **정확히 하나**를 남긴다.
      const alive = [
        { min: minA, sum: 2 * side },
        { min: minB, sum: total - side },
      ].filter((c) => (longer ? c.min > bar : c.min < bar));
      expect(alive, `s${seed}: 살아남은 가지`).toHaveLength(1);
      expect(p.answer, `s${seed}`).toContain(`$${alive[0]!.sum}\\,`);
      // ⑷ 음성 대조 — 조건을 뒤집으면 다른 쪽이 남는다.
      const flipped = [
        { min: minA, sum: 2 * side },
        { min: minB, sum: total - side },
      ].filter((c) => (longer ? c.min < bar : c.min > bar));
      expect(flipped, `s${seed}`).toHaveLength(1);
      expect(flipped[0]!.sum, `s${seed}`).not.toBe(alive[0]!.sum);
      seen += 1;
    }
    expect(seen).toBe(SEEDS.length);
  });

  it("삼각형 부등식을 발문·해설이 근거로 쓰지 않는다 (초4 교과 밖 — 반증 ③)", () => {
    for (const seed of WIDE) {
      const p = gen("2-2-1", seed, "심화중");
      for (const body of [p.content, p.solution]) {
        expect(body, `s${seed}`).not.toContain("두 변의 길이의 합");
        expect(body, `s${seed}`).not.toContain("부등식");
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
      expect(sumBase, `s${seed}`).toBeLessThan(sumApex);
      // ⑶ 문턱이 **사이**에 있어야 정확히 하나가 죽는다.
      expect(bar, `s${seed}: ${sumBase} < ${bar} < ${sumApex}`).toBeGreaterThan(
        sumBase,
      );
      expect(bar, `s${seed}`).toBeLessThan(sumApex);
      const answer = grab(p.answer, DEG)[0]!;
      expect(answer, `s${seed}`).toBe(bigger ? sumApex / 2 : 180 - 2 * given);
      // ⑷ 음성 대조 — 뒤집으면 다른 쪽.
      expect(bigger ? 180 - 2 * given : sumApex / 2, `s${seed}`).not.toBe(
        answer,
      );
      // 답이 발문의 수와 같아지면 다른 축의 결함이다(`answerPrintedOnPage`).
      expect(answer, `s${seed}`).not.toBe(given);
      expect(answer, `s${seed}`).not.toBe(bar);
      // 두 갈래 모두 «가장 큰 각»이 주어진 각이 아니어야 한다.
      expect(given, `s${seed}`).toBeLessThan(60);
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
    let read = 0;
    let skipped = 0;
    const bad: string[] = [];
    for (const [code, tier] of BUILT) {
      for (const seed of SEEDS) {
        const p = gen(code, seed, tier);
        const answer = readRat(p.answer.replace(/\$/g, "").trim());
        if (!answer) {
          skipped += 1;
          continue;
        }
        read += 1;
        if (forwardReachable(pageNumbers(p.content), answer)) {
          bad.push(`${code} «${tier}» s${seed}: ${p.answer}`);
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // 🔴 **못 잰 자리를 세어 찍는다.** 1-2-3(답이 낱말) · 2-2-1·2-2-2(단위) ·
    //    2-5-2(단위) · 2-5-3(두 쪽)은 `readRat` 이 못 읽는다 — 그 0 은 «깨끗»이 아니다.
    //    실측으로 다섯 갈래 **전부** 축 밖이라 `read` 가 0 이다. 그것이 사실이므로
    //    사실대로 못 박는다 — 「전량 안 닿는다」로 적으면 다음 사람이 속는다.
    expect(read + skipped).toBe(BUILT.length * SEEDS.length);
    expect(skipped).toBe(BUILT.length * SEEDS.length);
    expect(read).toBe(0);
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
