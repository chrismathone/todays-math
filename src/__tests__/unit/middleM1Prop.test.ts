/**
 * 5B — RPM 1-1 「정비례와 반비례」 21 + 「좌표와 그래프」 6 = **27유형** (`m1Prop.ts`).
 *
 * ## 이 시험이 지키는 것
 *
 * ⑴ **자기 배열을 직접 훑는다.** `registeredTypes()` 를 중단원 이름으로 거르면
 *    같은 중단원의 **남의 유형**(`m1Book1` 의 좌표 03~06·10, `m1Real` 의 정비례 04·
 *    반비례 14)을 쓸어 담는다 — 이 중단원은 물결 5 시작 시점에 **반쯤 차 있었다.**
 * ⑵ **검산은 생성기와 다른 방향으로.** 생성기는 «답을 먼저 정하고 발문을 역산»
 *    하므로, 시험은 반대로 **발문에 적힌 수에서 답을 푼다**(예: 순서쌍 유형은
 *    $a=\dfrac{u-c}{2}$ 로 되푼다). 같은 식을 옮겨 적으면 동어반복이다.
 * ⑶ **사분면 주장은 좌표로 확인한다.** 「제1·제3사분면을 지난다」를 글자로 믿지
 *    않고 실제 점을 찍어 «그 두 사분면에 있고 나머지 둘에는 없다»를 센다.
 * ⑷ **그림이 발문과 같은 수를 말한다.** `marks` 를 `facts` 에서 다시 만들어 대조하고,
 *    엔진에 **실제로 태운다**(모킹하지 않는다 — 없는 축은 변이시킬 수 없다).
 * ⑸ **그림을 안 붙인 자리를 못 박는다.** 「좌표와 그래프」 07·08·09·11 은 꺾은선이라
 *    좌표평면 한 벌로 그리면 «시각이 음수인 자리까지 뻗는 직선»이 나온다. 그 판단이
 *    코드에만 있으면 다음 사람이 그림을 붙이고도 아무도 모른다.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { bareNumbers } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { eulReul } from "../../lib/middle/m2Josa";
import { INV_K, M1_PROP, invLattice } from "../../lib/middle/m1Prop";
import { preprocessMathText } from "../../lib/math/textPreprocess";
import type { MidProblem } from "../../lib/middle/types";

const ENGINE = process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기";
const VENDOR = path.join(process.cwd(), "vendor", "figure-engine");
const hasEngine = existsSync(VENDOR) || existsSync(ENGINE);

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31337, 5150, 60613];

type F = Record<string, number>;
type Spec = Record<string, unknown>;

const COORD_TYPES = ["01", "02", "07", "08", "09", "11"];
const PROP_TYPES = [
  "01",
  "02",
  "03",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "22",
  "23",
  "11",
  "12",
  "13",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
];

/**
 * 그림이 붙는 유형 — **키로** 고른다. 번호 `09` 는 두 중단원에 다 있어서
 * 번호만으로 거르면 「좌표와 그래프 09」(그림 없음)까지 쓸려 온다.
 */
const FIGURE_TYPES = ["05", "09", "10", "23", "15", "19", "20", "21"];
const FIGURE_KEYS = new Set(
  FIGURE_TYPES.map((t) => `1-1|정비례와 반비례|${t}`),
);

/**
 * `$...$` 뒤 조사가 **읽는 소리**와 맞는가 — 잡힌 자리와 «잰 자리 수»를 같이 돌려준다.
 *
 * 왜 `josaFaults`(정본)를 안 쓰고 여기 하나 더 두는가: 그 함수는 수식이 **숫자로
 * 끝날 때만** 잰다. 이 단원의 발문은 「$(2a-3,\ b-3)$」처럼 **괄호로 닫힌 순서쌍**이
 * 대부분이라 거기서는 구조적으로 0이 된다 — 실제로 첫 미리보기에 「$(2a-3, b-3)$**와**」
 * 「$\mathrm{P}(2a+4,\ a-1)$**가**」가 그대로 나갔고 어느 가드도 안 울었다.
 * 그래서 **닫는 괄호를 벗기고** 마지막 수를 본다. 소리를 모르는 것(문자·분수로 끝나는
 * 것)은 «통과»가 아니라 **안 잰 것**이므로 세지 않는다.
 */
function josaCheck(text: string): { bad: string[]; measured: number } {
  const bad: string[] = [];
  let measured = 0;
  const re = /\$([^$]*)\$ ?(을|를|이|가|과|와|은|는)(?![가-힣])/g;
  for (const m of text.matchAll(re)) {
    const span = m[1]!.replace(/[)\]\s]+$/, "");
    const tail = /(\d+)$/.exec(span);
    if (!tail) continue; // 소리를 모른다 — 「안 잼」이지 「통과」가 아니다
    measured += 1;
    const n = Number(tail[1]);
    const vowel = eulReul(n) === "를";
    const want: Record<string, boolean> = {
      을: false,
      를: true,
      이: false,
      가: true,
      과: false,
      와: true,
      은: false,
      는: true,
    };
    if (want[m[2]!] !== vowel) bad.push(m[0]!);
  }
  return { bad, measured };
}

/**
 * 갈래를 훑는 씨앗 수. **검산도 이만큼 훑는다** — 여덟 씨앗만 보면 드물게 나오는
 * 갈래의 검산식이 통째로 «안 도는 줄»이 되고, 그건 빨강이 아니라 **침묵**이다.
 */
const BRANCH_SWEEP = 400;

/**
 * 유형마다 실제로 나오는 갈래 — 표를 **한 곳**에만 둔다.
 * 「모든 갈래가 나온다」 검사와 「씨앗별 독립 검산」이 같은 것을 봐야,
 * 갈래를 하나 더 만들고 검산식을 안 쓴 경우가 드러난다.
 */
const BRANCHES: Record<string, Set<number>> = {
  좌표01: new Set([0, 1, 2]),
  좌표02: new Set([0, 1, 2, 3]),
  좌표07: new Set([0, 1, 2]),
  좌표08: new Set([0, 1, 2]),
  좌표09: new Set([0, 1, 2]),
  좌표11: new Set([0, 1, 2]),
  정비01: new Set([0, 1]),
  정비02: new Set([0, 1, 2]),
  정비03: new Set([0, 1, 2, 3]),
  정비05: new Set([0]),
  정비06: new Set([0, 1]),
  정비07: new Set([0, 1, 2]),
  정비08: new Set([0, 1, 2]),
  정비09: new Set([0, 1]),
  정비10: new Set([0, 1]),
  정비11: new Set([0, 1]),
  정비12: new Set([0, 1, 2]),
  정비13: new Set([0, 1, 2, 3]),
  정비15: new Set([0]),
  정비16: new Set([0, 1]),
  정비17: new Set([0, 1, 2]),
  정비18: new Set([0, 1, 2]),
  정비19: new Set([0, 1]),
  정비20: new Set([0, 1]),
  정비21: new Set([0, 1, 2]),
  정비22: new Set([0, 1, 2]),
  정비23: new Set([0, 1]),
};

const quadrantOf = (x: number, y: number): number =>
  x > 0 ? (y > 0 ? 1 : 4) : y > 0 ? 2 : 3;

/** 「제$1$사분면과 제$3$사분면」 꼴 문자열에서 사분면 번호를 되꺼낸다. */
function quadsInText(s: string): number[] {
  return [...s.matchAll(/제\$(\d)\$사분면/g)].map((m) => Number(m[1]));
}

/** 답에서 정수 하나를 꺼낸다 — `$-12$` · `$12$분` 처럼 적힌 자리. */
function ansInt(answer: string): number {
  const m = /\$(-?\d+)\$/.exec(answer);
  if (!m) throw new Error(`답에서 수를 못 찾았다: ${answer}`);
  return Number(m[1]);
}

/** `$y=3x$` · `$y=-x$` 의 계수를 되읽는다(생성기의 `mono` 를 옮겨 적지 않는다). */
function slopeInAnswer(answer: string): number {
  const m = /\$y=(-?)(\d*)x\$/.exec(answer);
  if (!m) throw new Error(`정비례 식이 아니다: ${answer}`);
  const mag = m[2] === "" ? 1 : Number(m[2]);
  return m[1] === "-" ? -mag : mag;
}

/** `$y=\dfrac{6}{x}$` · `$y=-\dfrac{6}{x}$` 의 상수를 되읽는다. */
function invInAnswer(answer: string): number {
  const m = /\$y=(-?)\\dfrac\{(\d+)\}\{x\}\$/.exec(answer);
  if (!m) throw new Error(`반비례 식이 아니다: ${answer}`);
  return (m[1] === "-" ? -1 : 1) * Number(m[2]);
}

/** `$y=\dfrac{3}{2}x$` · `$y=2x$` 를 (분자, 분모)로. */
function ratioInAnswer(answer: string): [number, number] {
  const f = /\$y=(-?)\\dfrac\{(\d+)\}\{(\d+)\}x\$/.exec(answer);
  if (f) {
    return [(f[1] === "-" ? -1 : 1) * Number(f[2]), Number(f[3])];
  }
  return [slopeInAnswer(answer), 1];
}

// ── 유형별 독립 검산 — **발문에 적힌 수에서 답을 푼다** ────────────────

type Check = (f: F, p: MidProblem) => void;

const COORD_VERIFY: Record<string, Check> = {
  "01": (f, p) => {
    if (f.branch === 2) {
      // 「$a-b=d$, $a+b=s$」를 실제로 연립해 푼다.
      const a = (f.s! + f.d!) / 2;
      const b = (f.s! - f.d!) / 2;
      expect([a, b]).toEqual([f.a, f.b]);
      expect(p.answer).toBe(`$(${a}, ${b})$`);
      return;
    }
    const a = (f.u! - f.c!) / 2;
    const b = f.v! + f.d!;
    expect([a, b]).toEqual([f.a, f.b]);
    expect(ansInt(p.answer)).toBe(f.branch === 0 ? a + b : a * b);
  },
  "02": (f, p) => {
    // 0 이 되는 좌표를 실제로 풀어 문자의 값을 얻는다.
    expect(f.r! * f.t! + f.s!).toBe(0);
    expect(f.p! * f.t! + f.q!).toBe(f.other);
    expect(f.other).not.toBe(0);
    if (f.ask === 0) {
      // 답으로 적힌 점이 **정말 그 축 위**에 있는가.
      const m = /\$\((-?\d+), (-?\d+)\)\$/.exec(p.answer);
      expect(m, p.answer).not.toBeNull();
      const [x, y] = [Number(m![1]), Number(m![2])];
      expect(f.axis === 0 ? y : x).toBe(0);
      expect(f.axis === 0 ? x : y).toBe(f.other);
    } else {
      expect(ansInt(p.answer)).toBe(f.t);
    }
  },
  "07": (f, p) => {
    expect(f.h1).toBe(f.p! * f.t1!);
    expect(f.q!).toBeGreaterThan(f.p!); // 위가 좁으므로 나중이 더 빠르다
    if (f.branch === 0) {
      expect(p.answer).toBe(`$(${f.t1}, ${f.h1})$`);
      return;
    }
    if (f.branch === 1) {
      expect(ansInt(p.answer)).toBe(f.h1! + f.q! * (f.t2! - f.t1!));
      return;
    }
    // 높이 → 시간: 남은 높이를 나중 빠르기로 나눈다(생성기와 반대 방향).
    expect((f.h! - f.h1!) % f.q!).toBe(0);
    expect(ansInt(p.answer)).toBe(f.t1! + (f.h! - f.h1!) / f.q!);
  },
  "08": (f, p) => {
    // 나눗셈 없이 — (속력)×(시간) = 60×(거리).
    expect(f.v1! * f.t1!).toBe(60 * f.d!);
    expect(f.v2! * (f.t3! - f.t2!)).toBe(60 * f.d!);
    expect(f.stay).toBe(f.t2! - f.t1!);
    const want = f.branch === 0 ? f.stay! : f.branch === 1 ? f.v2! : f.v1!;
    expect(ansInt(p.answer)).toBe(want);
  },
  "09": (f, p) => {
    expect(f.period).toBe(2 * f.half!);
    expect(f.high!).toBeGreaterThan(f.low!);
    if (f.branch === 0) {
      expect(ansInt(p.answer)).toBe(f.half! + (f.k! - 1) * f.period!);
      return;
    }
    if (f.branch === 1) {
      // 「몇 번 지나는가」를 **세어서** 확인한다 — 나눗셈 식을 옮겨 적지 않는다.
      let cnt = 0;
      for (let t = f.half!; t <= f.total!; t += f.period!) cnt += 1;
      expect(ansInt(p.answer)).toBe(cnt);
      expect(cnt).toBe(f.m);
      return;
    }
    expect(f.x! % f.period!).toBe(f.top === 1 ? f.half! : 0);
    expect(ansInt(p.answer)).toBe(f.top === 1 ? f.high! : f.low!);
  },
  "11": (f, p) => {
    expect(f.v1! * f.t1!).toBe(60 * f.d1!);
    expect(f.v2! * (f.tB! - f.t1!)).toBe(60 * (f.bigD! - f.d1!));
    expect(f.vA! * f.tA!).toBe(60 * f.bigD!);
    expect(f.tA!).toBeGreaterThan(f.tB!); // 형이 먼저 도착해야 성립한다
    if (f.branch === 0) {
      expect(ansInt(p.answer)).toBe(f.tA! - f.tB!);
      return;
    }
    if (f.branch === 1) {
      expect(ansInt(p.answer)).toBe(f.v2);
      return;
    }
    const v = ansInt(p.answer);
    expect(v * f.tB!).toBe(60 * f.bigD!); // 평균 속력 × 걸린 시간 = 거리
    expect(v).toBeGreaterThan(f.vA!); // 더 짧은 쪽이 더 빠르다
  },
};

const PROP_VERIFY: Record<string, Check> = {
  "01": (f, p) => {
    if (f.branch === 0) {
      // 표의 세 쌍이 **모두 같은 비**를 갖는가 — 곱셈으로만 본다.
      expect(f.y1! * f.x2!).toBe(f.bigA! * f.x1!);
      expect(f.y1! * f.x3!).toBe(f.y3! * f.x1!);
      expect(ansInt(p.answer)).toBe(f.bigA! + f.x3!);
      return;
    }
    expect(f.q! * f.k!).toBe(ansInt(p.answer)); // $x$ 가 $k$ 배 → $y$ 도 $k$ 배
    expect(f.a! * f.p!).toBe(f.q);
  },
  "02": (f, p) => {
    expect(f.a! * f.p!).toBe(f.q);
    if (f.branch === 0) {
      expect(slopeInAnswer(p.answer)).toBe(f.a);
      return;
    }
    if (f.branch === 1) {
      expect(ansInt(p.answer)).toBe(f.a! * f.r!);
      return;
    }
    expect(f.a! * ansInt(p.answer)).toBe(f.s);
  },
  "03": (f, p) => {
    expect(slopeInAnswer(p.answer)).toBe(f.a);
    // 발문이 말한 «1 단위당 값»이 곧 비례상수여야 한다.
    expect(p.content).toContain(`$${f.a}$`);
  },
  "05": (f, p) => {
    expect(ansInt(p.answer)).toBe(f.a! * f.p!);
    expect(f.m).not.toBe(f.p);
  },
  "06": (f, p) => {
    const list = [f.a0!, f.a1!, f.a2!, f.a3!];
    const mags = list.map(Math.abs);
    expect(new Set(mags).size).toBe(4); // 절댓값이 겹치면 답이 하나로 안 정해진다
    const target = f.branch === 0 ? Math.max(...mags) : Math.min(...mags);
    expect(Math.abs(slopeInAnswer(p.answer))).toBe(target);
    expect(list).toContain(slopeInAnswer(p.answer));
  },
  "07": (f, p) => {
    if (f.branch === 2) {
      expect(f.a! * f.p!).toBe(f.q);
      expect(ansInt(p.answer)).toBe(f.a);
      return;
    }
    expect(f.a! * f.m!).toBe(f.k);
    expect(ansInt(p.answer)).toBe(f.branch === 0 ? f.k : f.m);
  },
  "08": (f, p) => {
    if (f.branch === 1) {
      // 증감은 **두 점을 찍어** 본다.
      const rising = f.a! * 2 > f.a! * 1;
      expect(p.answer).toBe(rising ? "증가한다." : "감소한다.");
      return;
    }
    if (f.branch === 2) {
      expect(p.answer).toBe(f.a! > 0 ? "$a>0$" : "$a<0$");
      const claimed = quadsInText(p.content);
      expectQuadrantsMatch(claimed, (x) => f.a! * x);
      return;
    }
    expectQuadrantsMatch(quadsInText(p.answer), (x) => f.a! * x);
  },
  "09": (f, p) => {
    expect(f.a! * f.p!).toBe(f.q);
    if (f.branch === 0) {
      expect(slopeInAnswer(p.answer)).toBe(f.a);
      return;
    }
    expect(ansInt(p.answer)).toBe(f.a! * f.r!);
  },
  "10": (f, p) => {
    // 기울기가 분수일 수 있으므로 **곱셈으로만** 견준다(부동소수 반올림 금지).
    expect(f.num! * f.p!).toBe(f.den! * f.q!);
    const v = ansInt(p.answer);
    // 삼각형은 직사각형의 절반이다 — 두 갈래를 **한 관계식**으로 견준다.
    expect(f.branch === 0 ? 2 * v : v).toBe(f.p! * f.q!);
  },
  "22": (f, p) => {
    const [num, den] = ratioInAnswer(p.answer);
    expect([num, den]).toEqual([f.num, f.den]);
    // 넓이를 이등분하는가 — **직선이 도형의 중심(또는 대변의 중점)을 지나는가**로 본다.
    if (f.branch === 0) expect(2 * num * f.w!).toBe(2 * den * f.h! * 0.5 * 2);
    if (f.branch === 0) expect(num * f.w!).toBe(den * f.h!);
    if (f.branch === 1)
      expect(num * (f.x1! + f.x2!)).toBe(den * (f.y1! + f.y2!));
    if (f.branch === 2) expect(2 * num * f.w!).toBe(den * f.h!);
  },
  "23": (f, p) => {
    expect(Math.abs(f.a!)).not.toBe(Math.abs(f.b!));
    const nearY = f.branch === 0;
    const want = (
      nearY ? Math.abs(f.a!) > Math.abs(f.b!) : Math.abs(f.a!) < Math.abs(f.b!)
    )
      ? "$y=ax$"
      : "$y=bx$";
    expect(p.answer).toBe(want);
    expect(f.ans).toBe(want === "$y=ax$" ? f.a : f.b);
  },
};

const INV_VERIFY: Record<string, Check> = {
  "11": (f, p) => {
    if (f.branch === 0) {
      // 표의 세 쌍이 **모두 같은 곱**을 갖는가.
      expect(f.x1! * f.y1!).toBe(f.k);
      expect(f.x2! * f.bigA!).toBe(f.k);
      expect(f.x3! * f.y3!).toBe(f.k);
      expect(ansInt(p.answer)).toBe(f.bigA! + f.x3!);
      return;
    }
    expect(f.p! * f.q!).toBe(f.k);
    expect(ansInt(p.answer) * (f.p! * f.m!)).toBe(f.k);
  },
  "12": (f, p) => {
    expect(f.p! * f.q!).toBe(f.k);
    if (f.branch === 0) {
      expect(invInAnswer(p.answer)).toBe(f.k);
      return;
    }
    const v = ansInt(p.answer);
    expect(v * (f.branch === 1 ? f.r! : f.s!)).toBe(f.k);
  },
  "13": (f, p) => {
    expect(invInAnswer(p.answer)).toBe(f.k);
    expect(p.content).toContain(`$${f.k}$`);
  },
  "15": (f, p) => {
    expect(f.m! * (f.k! / f.m!)).toBe(f.k);
    expect(ansInt(p.answer) * f.p!).toBe(f.k);
    expect(f.m).not.toBe(f.p);
  },
  "16": (f, p) => {
    const list = [f.k0!, f.k1!, f.k2!, f.k3!];
    const mags = list.map(Math.abs);
    expect(new Set(mags).size).toBe(4);
    const target = f.branch === 0 ? Math.max(...mags) : Math.min(...mags);
    expect(Math.abs(invInAnswer(p.answer))).toBe(target);
    expect(list).toContain(invInAnswer(p.answer));
  },
  "17": (f, p) => {
    expect(f.p! * f.q!).toBe(f.k);
    if (f.branch === 2) {
      expect(ansInt(p.answer)).toBe(f.k);
      return;
    }
    expect(f.m! * f.n!).toBe(f.k);
    expect(ansInt(p.answer)).toBe(f.branch === 0 ? f.n : f.m);
  },
  "18": (f, p) => {
    if (f.branch === 1) {
      // 한 사분면 안에서 두 점을 찍어 증감을 **본다**.
      const falling = f.k! / 2 > f.k! / 3;
      expect(p.answer).toBe(falling ? "감소한다." : "증가한다.");
      return;
    }
    if (f.branch === 2) {
      expect(p.answer).toBe(f.k! > 0 ? "$a>0$" : "$a<0$");
      expectQuadrantsMatch(quadsInText(p.content), (x) => f.k! / x);
      return;
    }
    expectQuadrantsMatch(quadsInText(p.answer), (x) => f.k! / x);
  },
  "19": (f, p) => {
    expect(f.p! * f.q!).toBe(f.k);
    if (f.branch === 0) {
      expect(invInAnswer(p.answer)).toBe(f.k);
      return;
    }
    expect(ansInt(p.answer) * f.r!).toBe(f.k);
  },
  "20": (f, p) => {
    expect(f.p! * f.q!).toBe(f.k);
    const v = ansInt(p.answer);
    expect(f.branch === 0 ? v : 2 * v).toBe(f.k);
  },
  "21": (f, p) => {
    expect(f.p! * f.q!).toBe(f.k); // 반비례 상수
    expect(f.num! * f.p!).toBe(f.den! * f.q!); // 정비례 상수
    if (f.branch === 1) {
      expect(ansInt(p.answer)).toBe(f.k);
      return;
    }
    if (f.branch === 0) {
      const [num, den] = /\\dfrac/.test(p.answer)
        ? [
            Number(/\\dfrac\{(\d+)\}/.exec(p.answer)![1]),
            Number(/\\dfrac\{\d+\}\{(\d+)\}/.exec(p.answer)![1]),
          ]
        : [ansInt(p.answer), 1];
      expect(num * f.p!).toBe(den * f.q!);
      return;
    }
    // 다른 교점 — **좌표를 직접 뒤집어** 두 그래프 위에 있는지 본다.
    const m = /\$\((-?\d+), (-?\d+)\)\$/.exec(p.answer);
    expect(m, p.answer).not.toBeNull();
    const [x, y] = [Number(m![1]), Number(m![2])];
    expect([x, y]).toEqual([-f.p!, -f.q!]);
    expect(x * y).toBe(f.k); // 반비례 그래프 위
    expect(f.num! * x).toBe(f.den! * y); // 정비례 그래프 위
    expect(quadrantOf(x, y)).not.toBe(quadrantOf(f.p!, f.q!));
  },
};

/**
 * 「제 몇 사분면을 지나는가」를 **좌표로** 센다 — 글자를 믿지 않는다.
 * 주장한 사분면에는 점이 있어야 하고, 나머지 사분면에는 **하나도 없어야** 한다.
 */
function expectQuadrantsMatch(claimed: number[], fn: (x: number) => number) {
  expect(claimed).toHaveLength(2);
  const seen = new Set<number>();
  for (let x = -6; x <= 6; x += 1) {
    if (x === 0) continue;
    const y = fn(x);
    if (y === 0) continue;
    seen.add(quadrantOf(x, y));
  }
  expect([...seen].sort()).toEqual([...claimed].sort());
}

const VERIFY: Record<string, Record<string, Check>> = {
  "좌표와 그래프": COORD_VERIFY,
  "정비례와 반비례": { ...PROP_VERIFY, ...INV_VERIFY },
};

// ── 그림 대조 ────────────────────────────────────────────────────────

/** `marks` 가 **정말 그 그래프 위**인가 — `facts` 에서 다시 만들어 견준다. */
function checkFigure(type: string, f: F, spec: Spec) {
  const marks = spec.marks as number[][];
  const xr = spec.xRange as number[];
  const yr = spec.yRange as number[];
  expect(xr[0]).toBeLessThanOrEqual(-1);
  expect(xr[1]).toBeGreaterThanOrEqual(1);
  expect(yr[0]).toBeLessThanOrEqual(-1);
  expect(yr[1]).toBeGreaterThanOrEqual(1);
  for (const [lo, hi] of [xr, yr] as [number, number][]) {
    expect(hi - lo).toBeGreaterThanOrEqual(4);
    expect(hi - lo).toBeLessThanOrEqual(12);
  }
  for (const [mx, my] of marks as [number, number][]) {
    expect(mx).toBeGreaterThanOrEqual(xr[0]!);
    expect(mx).toBeLessThanOrEqual(xr[1]!);
    expect(my).toBeGreaterThanOrEqual(yr[0]!);
    expect(my).toBeLessThanOrEqual(yr[1]!);
  }
  if (spec.kind === "linearGraph") {
    const lines = spec.lines as { slope: number }[];
    for (const [mx, my] of marks as [number, number][]) {
      expect(lines.some((l) => Math.abs(l.slope * mx - my) < 1e-9)).toBe(true);
    }
    if (type === "23") {
      expect(lines.map((l) => l.slope).sort()).toEqual([f.a!, f.b!].sort());
    } else {
      expect(lines).toHaveLength(1);
      // 기울기는 «분수 그대로» 견준다 — `f.a` 는 정수 갈래에만 있다.
      expect(lines[0]!.slope).toBe(f.num! / f.den!);
    }
    return;
  }
  expect(spec.kind).toBe("curveGraph");
  const curves = spec.curves as { type: string; k: number }[];
  expect(curves).toHaveLength(1);
  expect(curves[0]!.type).toBe("inverse");
  expect(curves[0]!.k).toBe(f.k);
  for (const [mx, my] of marks as [number, number][]) {
    expect(mx * my).toBe(f.k); // 쌍곡선 위
  }
  if (type === "21") {
    const lines = spec.lines as { slope: number }[];
    expect(lines).toHaveLength(1);
    for (const [mx, my] of marks as [number, number][]) {
      expect(Math.abs(lines[0]!.slope * mx - my)).toBeLessThan(1e-9);
    }
    expect(marks).toHaveLength(2); // 두 교점이 원점에 대하여 대칭
    expect(marks[0]![0]).toBe(-marks[1]![0]!);
    expect(marks[0]![1]).toBe(-marks[1]![1]!);
  }
}

// ── 시험 ─────────────────────────────────────────────────────────────

describe("5B — 정비례와 반비례 21 + 좌표와 그래프 6", () => {
  it("자기 배열만 훑는다 — 27유형·두 중단원", () => {
    expect(M1_PROP).toHaveLength(27);
    expect(
      M1_PROP.filter((e) => e.rpmMinor === "좌표와 그래프").map(
        (e) => e.rpmType,
      ),
    ).toEqual(COORD_TYPES);
    expect(
      M1_PROP.filter((e) => e.rpmMinor === "정비례와 반비례").map(
        (e) => e.rpmType,
      ),
    ).toEqual(PROP_TYPES);
  });

  it("**남은 번호만** 냈다 — 이미 있던 7유형은 남의 것이다", () => {
    // 물결 5 의 새 함정: 이 두 중단원은 시작 시점에 반쯤 차 있었다.
    // 남의 유형을 다시 내면 key 가 겹치고, 안 내면 중단원이 안 찬다.
    const mine = new Set(M1_PROP.map((e) => e.key));
    const others = registeredTypes().filter(
      (e) =>
        !mine.has(e.key) &&
        (e.rpmMinor === "좌표와 그래프" || e.rpmMinor === "정비례와 반비례"),
    );
    expect(others.map((e) => e.key).sort()).toEqual([
      "1-1|정비례와 반비례|04",
      "1-1|정비례와 반비례|14",
      "1-1|좌표와 그래프|03",
      "1-1|좌표와 그래프|04",
      "1-1|좌표와 그래프|05",
      "1-1|좌표와 그래프|06",
      "1-1|좌표와 그래프|10",
    ]);
    // 남의 것 + 내 것 = 색인 전량(좌표 11 · 정비례 23).
    const all = [...others, ...M1_PROP];
    expect(all.filter((e) => e.rpmMinor === "좌표와 그래프").length).toBe(11);
    expect(all.filter((e) => e.rpmMinor === "정비례와 반비례").length).toBe(23);
  });

  it("우리 단원 이름이 교육과정 시드(정본)에 실제로 있다", () => {
    const seeded = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === "중1").map((u) => u.section),
    );
    for (const e of M1_PROP) {
      expect(seeded.has(e.unitSection), `시드에 없다: ${e.unitSection}`).toBe(
        true,
      );
    }
    const bySec = (s: string) =>
      M1_PROP.filter((e) => e.unitSection === s).length;
    expect(bySec("순서쌍과 좌표평면(기본)")).toBe(2);
    expect(bySec("그래프의 이해")).toBe(4);
    expect(bySec("정비례 관계 y=ax의 그래프")).toBe(11);
    expect(bySec("반비례 관계 y=a/x의 그래프")).toBe(10);
  });

  it("그림을 붙인 자리와 안 붙인 자리가 못 박혀 있다", () => {
    // 「좌표와 그래프」 07·08·09·11 은 **꺾은선**이라 좌표평면 한 벌로 그리면
    // 시각이 음수인 자리까지 직선이 뻗는다(실렌더 `qa/m1-prop-sheet/`).
    // 이 판단이 코드에만 있으면 다음 사람이 그림을 붙여도 아무도 모른다.
    const withFig = M1_PROP.filter(
      (e) => generateMiddleProblem(e.key, 20260824).figureSpec != null,
    );
    expect(withFig.map((e) => e.rpmType)).toEqual(FIGURE_TYPES);
    expect(withFig.every((e) => e.rpmMinor === "정비례와 반비례")).toBe(true);
    for (const e of M1_PROP.filter((x) => x.rpmMinor === "좌표와 그래프")) {
      for (const seed of SEEDS) {
        expect(
          generateMiddleProblem(e.key, seed).figureSpec ?? null,
          `${e.key} 에 그림이 붙었다 — 꺾은선을 그릴 문법이 생겼는지 먼저 확인하라`,
        ).toBeNull();
      }
    }
  });

  it("`INV_K` 는 **엔진 상수에서 유도한** 조건을 만족한다", () => {
    // 손 목록은 샌다 — 그림이 되는 $k$ 의 경계를 여기서 다시 적지 않고
    // `elem_advanced.py` 의 값을 읽어 재계산한다. 엔진이 문턱을 바꾸면 빨개진다.
    const src = readFileSync(
      path.resolve(process.cwd(), "scripts/figure/elem_advanced.py"),
      "utf8",
    );
    const num = (name: string) => {
      const m = new RegExp(`^${name} = ([\\d.]+)`, "m").exec(src);
      expect(m, `${name} 을 엔진에서 못 찾았다`).not.toBeNull();
      return Number(m![1]);
    };
    const gap = num("CG_ASYM_GAP");
    const arc = num("CG_MIN_ARC");
    const span = 6; // `inverseSpec` 이 박아 둔 범위 — 아래에서 스펙으로 대조한다
    for (const k of INV_K) {
      expect(k / span, `k=${k} 가 축에 붙는다`).toBeGreaterThanOrEqual(gap);
      expect(
        span - k / span,
        `k=${k} 의 가지가 실오라기다`,
      ).toBeGreaterThanOrEqual(arc);
      expect(
        invLattice(k).length,
        `k=${k} 에 찍을 격자점이 모자란다`,
      ).toBeGreaterThanOrEqual(2);
    }
    // 격자점은 «범위 안 정수점»이라는 뜻이어야 한다.
    for (const k of INV_K) {
      for (const p of invLattice(k)) {
        expect(k % p).toBe(0);
        expect(Math.abs(k / p)).toBeLessThanOrEqual(span);
      }
    }
  });

  for (const e of M1_PROP) {
    describe(`${e.rpmMinor.slice(0, 2)} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260824)).toEqual(
          generateMiddleProblem(e.key, 20260824),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치에서 답을 되푼다", () => {
        // ⚠️ **넓게 훑는다.** 씨앗 여덟만 보면 드물게 나오는 갈래의 검산식이
        // 통째로 «장식»이 되는데, 그건 «빨강»이 아니라 **안 도는 줄**이라 침묵한다.
        // 2026-08-24 변이 [12](정비 22 삼각형 이등분)가 정확히 그렇게 초록이었다 —
        // 그 유형은 여덟 씨앗에서 갈래 0·1 만 나오고 2 는 한 번도 안 나온다.
        // 그래서 「모든 갈래가 나온다」 검사와 **같은 훑기**로 검산한다.
        const verify = VERIFY[e.rpmMinor]![e.rpmType];
        expect(verify, `검산식 누락: ${e.rpmMinor} ${e.rpmType}`).toBeDefined();
        const seen = new Set<number>();
        const seeds = [
          ...SEEDS,
          ...Array.from({ length: BRANCH_SWEEP }, (_, s) => s * 7919 + 13),
        ];
        for (const seed of seeds) {
          const p = generateMiddleProblem(e.key, seed);
          verify!(p.facts, p);
          seen.add((p.facts.branch ?? 0) as number);
        }
        expect(
          seen.size,
          "검산한 갈래가 하나뿐이면 갈래별 가지가 안 돈 것이다",
        ).toBe(BRANCHES[`${e.rpmMinor.slice(0, 2)}${e.rpmType}`]!.size);
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content), p.content).toEqual([]);
          expect(bareNumbers(p.answer), p.answer).toEqual([]);
          expect(bareNumbers(p.solution), p.solution).toEqual([]);
        }
      });

      it("제품 전처리가 내 수식의 수를 바꾸지 않는다 (D-73)", () => {
        const digits = (s: string) =>
          (s.match(/\$[^$]*\$/g) ?? []).join(" ").match(/\d+/g)?.join(",") ??
          "";
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const field of [p.content, p.answer, p.solution]) {
            expect(digits(preprocessMathText(field)), field).toBe(
              digits(field),
            );
          }
        }
      });

      it("지면에 «1» 이 붙은 항이 안 나간다 ($1x$·$-1x$)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          for (const field of [p.content, p.answer, p.solution]) {
            expect(/(?:^|[^\d])1[a-z](?![a-z])/.test(field), field).toBe(false);
          }
        }
      });
    });
  }

  it("그림이 발문과 **같은 수**를 말한다", () => {
    for (const e of M1_PROP.filter((x) => FIGURE_KEYS.has(x.key))) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        expect(p.figureSpec, `${e.key} 에 그림이 없다`).not.toBeNull();
        checkFigure(e.rpmType, p.facts, p.figureSpec as Spec);
      }
    }
  });

  it("수식 뒤 조사가 **읽는 소리**와 맞는다", () => {
    const bad: string[] = [];
    let measured = 0;
    for (const e of M1_PROP) {
      for (let s = 0; s < 40; s += 1) {
        const p = generateMiddleProblem(e.key, s * 7919 + 13);
        for (const field of [p.content, p.answer, p.solution]) {
          const r = josaCheck(field);
          measured += r.measured;
          bad.push(...r.bad.map((x) => `${e.key}: ${x}`));
        }
      }
    }
    // 0 은 「깨끗」과 「못 셈」을 안 가른다 — 몇 자리를 실제로 쟀는지 먼저 못 박는다.
    expect(
      measured,
      "아무 조사도 안 쟀다면 이 검사는 장식이다",
    ).toBeGreaterThan(500);
    expect(
      [...new Set(bad)].slice(0, 8),
      `조사 오류 ${bad.length}자리`,
    ).toEqual([]);
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of M1_PROP) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      expect(new Set(set.map((p: MidProblem) => p.content)).size, e.key).toBe(
        4,
      );
    }
  });

  it("씨앗을 넓게 훑어도 던지지 않는다 (attempt 소진 없음)", () => {
    for (const e of M1_PROP) {
      for (let s = 0; s < 200; s += 1) {
        expect(
          () => generateMiddleProblem(e.key, s * 7919 + 13),
          e.key,
        ).not.toThrow();
      }
    }
  });

  it("모든 갈래가 실제로 나온다 — 죽은 갈래가 없다", () => {
    // 표(`BRANCHES`)는 위에 하나뿐이다 — 검산도 그것을 본다. 갈래를 더하고
    // 검산식을 안 쓰면 **검산 쪽이** 먼저 빨개진다.
    expect(Object.keys(BRANCHES).sort()).toEqual(
      M1_PROP.map((e) => `${e.rpmMinor.slice(0, 2)}${e.rpmType}`).sort(),
    );
    for (const e of M1_PROP) {
      const key = `${e.rpmMinor.slice(0, 2)}${e.rpmType}`;
      const seen = new Set<number>();
      for (let s = 0; s < BRANCH_SWEEP; s += 1) {
        const f = generateMiddleProblem(e.key, s * 7919 + 13).facts as F;
        seen.add((f.branch ?? 0) as number);
      }
      expect(seen, key).toEqual(BRANCHES[key]);
    }
  });

  it("정비례와 반비례가 발문에서 **섞이지 않는다**", () => {
    // 「$x$ 가 $2$배면 $y$ 도 $2$배」와 「$y$ 는 $\\dfrac12$배」가 가르는 자리다.
    for (const e of M1_PROP) {
      for (const seed of SEEDS) {
        const p = generateMiddleProblem(e.key, seed);
        const text = `${p.content}\n${p.solution}`;
        const saysProp = text.includes("정비례");
        const saysInv = text.includes("반비례");
        if (e.unitSection === "정비례 관계 y=ax의 그래프") {
          expect(saysInv, `${e.key}: 정비례 유형이 반비례를 말한다`).toBe(
            false,
          );
        }
        if (
          e.unitSection === "반비례 관계 y=a/x의 그래프" &&
          e.rpmType !== "21"
        ) {
          expect(saysProp, `${e.key}: 반비례 유형이 정비례를 말한다`).toBe(
            false,
          );
        }
        if (e.rpmType === "21") expect(saysProp && saysInv).toBe(true);
      }
    }
  });
});

describe.skipIf(!hasEngine)("5B — 그림이 실제로 그려진다", () => {
  // 「스펙이 그럴듯하다」와 「엔진이 그린다」는 다른 질문이다. 쌍곡선은 $k$ 하나로
  // «두 가지가 안 보인다»·«축에 붙는다»·«실오라기다»를 넘나든다 — 코드를 읽어서가
  // 아니라 **돌려 봐야** 안다. 그래서 모킹하지 않는다.
  for (const e of M1_PROP.filter((x) => FIGURE_KEYS.has(x.key))) {
    it(`${e.rpmType} ${e.rpmTitle}`, async () => {
      for (const seed of SEEDS.slice(0, 4)) {
        const p = generateMiddleProblem(e.key, seed);
        const r = await renderFigureSpec(p.figureSpec!);
        expect(
          r.ok,
          `${e.key} seed ${seed}: ${r.ok ? "" : r.error} ${JSON.stringify(p.figureSpec)}`,
        ).toBe(true);
        if (r.ok) {
          // 지면 등급은 viewBox 폭 하나로 갈린다 — 좌표평면은 240 에 박혀 있다.
          const w = Number(/viewBox="0 0 ([\d.]+)/.exec(r.svg)?.[1] ?? NaN);
          expect(w).toBe(240);
        }
      }
    }, 60_000);
  }
});
