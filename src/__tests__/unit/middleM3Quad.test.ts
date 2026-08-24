/**
 * 중3 「이차방정식」 31유형 (3-1 이차방정식의 풀이 01~16 · 이차방정식의 활용 01~15)
 * — 독립 검산.
 *
 * 생성기의 답을 그대로 믿지 않는다. 생성기는 **근을 먼저 골라 방정식을 만들었으므로**
 * 여기서는 그 반대 방향 — **대입·판별식·전수 탐색** — 으로 다시 확인한다.
 * 같은 식을 옮겨 적으면 동어반복이라 아무것도 못 잡는다(물결 4 공통 계약 2).
 *
 * ⚠️ 이 시험은 **자기 배열(`M3_QUAD`)만 훑는다.** `registeredTypes()` 를 중단원 이름으로
 * 거르면 같은 중단원의 남의 유형을 쓸어 담는다(물결 2 에서 실제로 났다).
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
} from "../../lib/middle/generate";
import { M3_QUAD } from "../../lib/middle/m3Quad";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260824, 1, 7777, 424242, 99991, 31415];

type F = Record<string, number>;

const EPS = 1e-9;

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-7;
}

function isSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.sqrt(n));
  return r * r === n;
}

/** 제곱인수를 갖지 않는가 — `\sqrt{8}` 이 지면에 나가는 것을 막는 축. */
function squareFree(n: number): boolean {
  for (let i = 2; i * i <= n; i += 1) {
    if (n % (i * i) === 0) return false;
  }
  return true;
}

/** 유리수 근 n/d 를 정수계수 이차식에 **정확히** 대입한다 (부동소수점 없음). */
function hitsExact(
  a: number,
  b: number,
  c: number,
  n: number,
  d: number,
): boolean {
  return a * n * n + b * n * d + c * d * d === 0;
}

/** 정수 근 대입. */
function hits(a: number, b: number, c: number, r: number): boolean {
  return a * r * r + b * r + c === 0;
}

/**
 * 유형×모드 독립 검산.
 *
 * 「발문이 말하는 조건」을 여기서 다시 세운다 — 생성기가 쓴 «근 → 방정식» 이 아니라
 * «방정식 → 근» 방향(대입·판별식·전수 탐색)이다.
 */
const VERIFY: Record<string, (f: F) => boolean> = {
  // 뜻: ⑴ x² 계수가 0 이 되는 k ⑵ 원식을 수치로 평가해 정리한 식과 같은가
  "3-1|이차방정식의 풀이|01": (f) => {
    if (f.mode === 0) return f.x === f.a!;
    for (const t of [1, 2, 3, -2]) {
      const left = (t - f.p!) * (t - f.p!) - f.q! * t;
      const right = f.r! * t - f.s! * t * t;
      if (left - right !== f.A! * t * t + f.a! * t + f.b!) return false;
    }
    return f.x === f.a! + f.b!;
  },
  // 해: 두 근이 실제로 근이고, 부등식을 만족시키는 쪽만 답이다
  "3-1|이차방정식의 풀이|02": (f) => {
    if (!hits(1, -f.s!, f.p!, f.r1!) || !hits(1, -f.s!, f.p!, f.r2!))
      return false;
    const ok = (v: number): boolean =>
      f.mode === 0 ? 2 * v - f.d! < v : 2 * v - f.d! > v;
    if (f.mode === 0) return ok(f.r1!) && !ok(f.r2!) && f.x === f.r1!;
    return ok(f.r2!) && !ok(f.r1!) && f.x === f.r2!;
  },
  // 한 근이 주어졌을 때 미지수: 답을 되넣으면 등식이 성립한다
  "3-1|이차방정식의 풀이|03": (f) =>
    f.mode === 0
      ? f.A! * f.t! * f.t! + f.b! * f.t! + f.a! === 0 && f.x === f.a!
      : f.A! * f.t! * f.t! - (f.b0! + f.a!) * f.t! + f.C! === 0 && f.x === f.a!,
  // 한 근이 문자: 실제 근을 수치로 구해 물은 식을 계산한다
  "3-1|이차방정식의 풀이|04": (f) => {
    const disc = f.b! * f.b! - 4 * f.c!;
    if (disc <= 0) return false;
    const al = (-f.b! + Math.sqrt(disc)) / 2;
    if (Math.abs(al) < EPS) return false;
    const value =
      f.mode === 0
        ? al * al + f.b! * al
        : f.mode === 1
          ? al * al + f.b! * al + f.k!
          : al + f.c! / al;
    return near(value, f.x!);
  },
  // AB=0: 두 근을 정확 유리수로 대입해 본다
  "3-1|이차방정식의 풀이|05": (f) => {
    const ea = f.a! * f.c!;
    const eb = -(f.a! * f.d! + f.c! * f.b!);
    const ec = f.b! * f.d!;
    if (!hitsExact(ea, eb, ec, f.n1!, f.d1!)) return false;
    if (!hitsExact(ea, eb, ec, f.n2!, f.d2!)) return false;
    if (f.n1! / f.d1! >= f.n2! / f.d2!) return false;
    return f.x === (f.mode === 0 ? f.n1! : f.n2!);
  },
  // 인수분해: 적힌 계수에 두 근을 대입한다
  "3-1|이차방정식의 풀이|06": (f) => {
    if (!hits(f.ca!, f.cb!, f.cc!, f.p!)) return false;
    if (!hits(f.ca!, f.cb!, f.cc!, f.q!)) return false;
    if (f.p! >= f.q!) return false;
    const want = [f.p!, f.q! - f.p!, f.q! * f.q! - f.p! * f.p!][f.mode!];
    return f.x === want;
  },
  // 다른 한 근: 두 근을 대입해 확인 (비에트를 옮겨 적지 않는다)
  "3-1|이차방정식의 풀이|07": (f) => {
    if (!hits(1, f.B!, f.cc!, f.p!)) return false;
    if (!hits(1, f.B!, f.cc!, f.q!)) return false;
    if (f.p! === f.q!) return false;
    if (f.mode === 0) return f.x === f.a!;
    if (f.mode === 1) return f.x === f.q!;
    return f.x === f.q! - f.cc!;
  },
  // 한 근이 다른 이차방정식의 한 근: 두 방정식 모두 대입으로 확인
  "3-1|이차방정식의 풀이|08": (f) => {
    if (!hits(1, f.b1!, f.c1!, f.p!) || !hits(1, f.b1!, f.c1!, f.q!))
      return false;
    const want = f.mode === 0 ? Math.min(f.p!, f.q!) : Math.max(f.p!, f.q!);
    if (f.t! !== want) return false;
    return (
      f.A! * f.t! * f.t! + (f.a! + f.m!) * f.t! + f.C! === 0 && f.x === f.a!
    );
  },
  // 공통인 근: t 가 둘 다의 근이고 u·v 는 각각 한쪽만의 근이다
  "3-1|이차방정식의 풀이|09": (f) => {
    if (!hits(1, f.b1!, f.c1!, f.t!)) return false;
    if (!hits(f.a2!, f.b2!, f.c2!, f.t!)) return false;
    if (!hits(1, f.b1!, f.c1!, f.u!)) return false;
    if (!hits(f.a2!, f.b2!, f.c2!, f.v!)) return false;
    if (hits(f.a2!, f.b2!, f.c2!, f.u!)) return false;
    return f.x === (f.mode === 0 ? f.t! : f.u! * f.v!);
  },
  // 중근: **판별식이 0** 인지를 직접 잰다 (생성기는 완전제곱식으로 만들었다)
  "3-1|이차방정식의 풀이|10": (f) => {
    if (f.cb1! * f.cb1! - 4 * f.ca1! * f.cc1! !== 0) return false;
    if (f.cb2! * f.cb2! - 4 * f.ca2! * f.cc2! !== 0) return false;
    if (!hitsExact(f.ca1!, f.cb1!, f.cc1!, f.rn1!, f.rd1!)) return false;
    if (!hitsExact(f.ca2!, f.cb2!, f.cc2!, f.rn2!, f.rd2!)) return false;
    if (f.mode === 2) {
      const num = f.rn1! * f.rn2!;
      const den = f.rd1! * f.rd2!;
      // x 는 «답에 처음 나오는 수» = 기약분자
      let g = Math.abs(num);
      let h = Math.abs(den);
      while (h) [g, h] = [h, g % h];
      const red = g === 0 ? num : num / g;
      return f.x === red;
    }
    return f.x === f.rn1!;
  },
  // 중근을 가질 조건: 답을 되넣은 방정식의 판별식이 0 이어야 한다
  "3-1|이차방정식의 풀이|11": (f) => {
    if (f.mode === 2) {
      const cc = f.p! + f.C!;
      return f.B! * f.B! - 4 * f.A! * cc === 0 && f.x === f.p!;
    }
    const cc = f.alpha! * f.p! + f.beta!;
    if (2 * f.m! * (2 * f.m!) - 4 * cc !== 0) return false;
    return f.x === (f.mode === 0 ? f.p! : f.p! - f.m!);
  },
  // 제곱근을 이용: 근을 수치로 되넣는다. 근호 안은 제곱인수가 없어야 한다
  "3-1|이차방정식의 풀이|12": (f) => {
    if (f.mode === 2) {
      return near(2 * Math.sqrt(f.b! / f.a!), f.d!) && f.x === f.b!;
    }
    if (!squareFree(f.q!) || isSquare(f.q!)) return false;
    const root = -f.p! + Math.sqrt(f.q!);
    if (!near(f.a! * (root + f.p!) * (root + f.p!), f.c!)) return false;
    return f.x === (f.mode === 0 ? -f.p! : -f.p! + f.q!);
  },
  // 근을 가질 조건: 경계에서 우변이 0, 한 칸 안팎에서 부호가 갈린다
  "3-1|이차방정식의 풀이|13": (f) => {
    if (f.mode === 3) return f.x === f.p! - f.d!;
    const rhs = (k: number): number => k + f.d!;
    return (
      rhs(f.x!) === 0 && rhs(f.x! + 1) > 0 && rhs(f.x! - 1) < 0 && f.x === -f.d!
    );
  },
  // 완전제곱식의 꼴: (−a+√b) 를 원식에 되넣는다
  "3-1|이차방정식의 풀이|14": (f) => {
    if (f.b! <= 0) return false;
    const r = -f.a! + Math.sqrt(f.b!);
    if (!near(f.A! * r * r + f.B! * r + f.C!, 0)) return false;
    const want = [f.a! + f.b!, f.a! * f.b!, f.b! - f.a!][f.mode!];
    return f.x === want;
  },
  // 완전제곱식을 이용한 풀이: m+√n 을 x²+Bx=P 에 되넣는다
  "3-1|이차방정식의 풀이|15": (f) => {
    if (!squareFree(f.n!) || isSquare(f.n!)) return false;
    const r = f.m! + Math.sqrt(f.n!);
    if (!near(r * r + f.B! * r - f.P!, 0)) return false;
    const want = [f.m! + f.n!, f.m! * f.n!, f.m!][f.mode!];
    return f.x === want;
  },
  // 해에 대한 조건: **전수 탐색**으로 최소·최대·합을 다시 구한다
  "3-1|이차방정식의 풀이|16": (f) => {
    if (f.mode === 0) {
      if (!isSquare(f.a! * f.x!)) return false;
      for (let k = 1; k < f.x!; k += 1) {
        if (isSquare(f.a! * k)) return false;
      }
      return true;
    }
    if (f.mode === 1) {
      let best = 0;
      for (let k = 1; k <= 400; k += 1) {
        const t = Math.sqrt(2 * k);
        if (!Number.isInteger(t)) continue;
        if (t < 1) continue;
        if (f.p! - t < 1) continue;
        best = Math.max(best, k);
      }
      return best === f.x!;
    }
    let sum = 0;
    for (let a = 1; a <= f.m! * f.m!; a += 1) {
      if (isSquare(f.m! * f.m! - a)) sum += a;
    }
    return sum === f.x!;
  },

  // 근의 공식: 판별식·기약 여부·근호 정리를 모두 잰다
  "3-1|이차방정식의 활용|01": (f) => {
    if (f.D! !== f.b! * f.b! - 4 * f.a! * f.c!) return false;
    if (f.D! <= 0 || !squareFree(f.D!)) return false;
    if (f.A! !== -f.b!) return false;
    const r = (f.A! + Math.sqrt(f.D!)) / (2 * f.a!);
    if (!near(f.a! * r * r + f.b! * r + f.c!, 0)) return false;
    const want = [f.A! + f.D!, f.A! * f.D!, f.A!][f.mode!];
    return f.x === want;
  },
  // 복잡한 이차방정식: «양변에 곱한 뒤» 의 정수 방정식에 두 근을 정확 대입
  "3-1|이차방정식의 활용|02": (f) => {
    if (!hitsExact(f.ea!, f.eb!, f.ec!, f.n1!, f.d1!)) return false;
    if (!hitsExact(f.ea!, f.eb!, f.ec!, f.n2!, f.d2!)) return false;
    if (f.n1! / f.d1! >= f.n2! / f.d2!) return false;
    return f.x === (f.mode === 1 ? f.n2! : f.n1!);
  },
  // 공통부분: 치환식 A 의 방정식에 두 값을 대입한다
  "3-1|이차방정식의 활용|03": (f) => {
    if (!hits(f.A!, f.B!, f.C!, f.u1!)) return false;
    if (!hits(f.A!, f.B!, f.C!, f.u2!)) return false;
    if (f.u1! >= f.u2!) return false;
    if (f.mode === 2) return f.u1! < 0 && f.u2! > 0 && f.x === f.u2!;
    const r1 = f.u1! - f.p!;
    const r2 = f.u2! - f.p!;
    if (f.mode === 1) return f.x === r1;
    return f.x === 2 * Math.min(r1, r2) + Math.max(r1, r2);
  },
  // 근의 개수: 판별식 대신 **꼭짓점의 값**으로 다시 센다
  "3-1|이차방정식의 활용|04": (f) => {
    if (f.D! !== f.cb! * f.cb! - 4 * f.ca! * f.cc!) return false;
    const v = -f.cb! / (2 * f.ca!);
    const fv = f.ca! * v * v + f.cb! * v + f.cc!;
    const count = f.ca! > 0 ? (fv < -EPS ? 2 : fv > EPS ? 0 : 1) : -1;
    return count === f.x!;
  },
  // 중근을 가질 조건(활용): 두 해가 모두 판별식 0 을 만들고 합이 답이다
  "3-1|이차방정식의 활용|05": (f) => {
    if (f.mode === 1) {
      const cc = f.alpha! * f.k! + f.beta!;
      return 2 * f.B! * (2 * f.B!) - 4 * cc === 0 && f.x === f.k! - f.B!;
    }
    if (f.A! * f.C! !== f.s! * f.s!) return false;
    if (f.mode === 2) {
      return f.x! * f.x! - 4 * f.A! * f.C! === 0 && -f.x! / (2 * f.A!) < 0;
    }
    const a1 = 2 * f.s! - f.p!;
    const a2 = -2 * f.s! - f.p!;
    const disc = (a: number): number =>
      (a + f.p!) * (a + f.p!) - 4 * f.A! * f.C!;
    return disc(a1) === 0 && disc(a2) === 0 && f.x === a1 + a2;
  },
  // 범위: 경계에서 판별식이 0, 한 칸 옮기면 요구한 부호가 나온다
  "3-1|이차방정식의 활용|06": (f) => {
    if (f.mode === 3) {
      const g = (p: number): number => f.m! * f.m! - p;
      return g(f.x!) < 0 && g(f.x! - 1) >= 0;
    }
    const g = (p: number): number => f.m! * f.m! - (f.alpha! * p + f.beta!);
    if (g(f.bound!) !== 0) return false;
    const inside = f.less === 1 ? f.bound! - 1 : f.bound! + 1;
    const outside = f.less === 1 ? f.bound! + 1 : f.bound! - 1;
    const wantPositive = f.mode !== 2;
    if (wantPositive && !(g(inside) > 0 && g(outside) < 0)) return false;
    if (!wantPositive && !(g(inside) < 0 && g(outside) > 0)) return false;
    return f.x === f.bound!;
  },
  // 두 근이 주어질 때: 세운 방정식에 두 근을 정확 대입한다
  "3-1|이차방정식의 활용|07": (f) => {
    if (!hitsExact(f.A!, f.a!, f.b!, f.n1!, f.d1!)) return false;
    if (!hitsExact(f.A!, f.a!, f.b!, f.n2!, f.d2!)) return false;
    if (f.mode === 1) {
      if (f.a! * f.a! - 4 * f.A! * f.b! !== 0) return false;
      return f.x === f.a! + f.b!;
    }
    if (f.mode === 2) return f.x === f.a! * f.b!;
    return f.x === f.a! - f.b!;
  },
  // 식이 주어진 문제: 조건을 만족시키는 자연수를 **전수로** 찾아 유일한지 본다
  "3-1|이차방정식의 활용|08": (f) => {
    const g = (n: number): number =>
      f.mode === 0
        ? (n * (n - 3)) / 2
        : f.mode === 1
          ? (n * (n + 1)) / 2
          : (n * (n - 1)) / 2;
    const lo = f.mode === 0 ? 3 : 1;
    const hit: number[] = [];
    for (let n = lo; n <= 300; n += 1) if (g(n) === f.val!) hit.push(n);
    return hit.length === 1 && hit[0] === f.x!;
  },
  // 수에 대한 문제: 발문의 관계를 그대로 세우고 버리는 근이 자연수가 아님을 본다
  "3-1|이차방정식의 활용|09": (f) => {
    if (f.mode === 0) {
      const hit: number[] = [];
      for (let k = 1; k <= 200; k += 1) {
        if ((2 * k - 1) * (2 * k - 1) + (2 * k + 1) * (2 * k + 1) === f.S!) {
          hit.push(2 * k + 1);
        }
      }
      return hit.length === 1 && hit[0] === f.x!;
    }
    if (f.mode === 1) {
      const n = f.n!;
      if ((n + 1) * (n + 1) !== 3 * (n - 1) * n - f.K!) return false;
      return f.x === 3 * n;
    }
    if (f.mode === 2) {
      const hit: number[] = [];
      for (let v = 10; v <= 99; v += 1) {
        const t = Math.floor(v / 10);
        const u = v % 10;
        if (t + u === f.s! && v - t * u === f.d!) hit.push(v);
      }
      return hit.length === 1 && hit[0] === f.x!;
    }
    const hit: number[] = [];
    for (let k = 1; k <= 200; k += 1) {
      if ((k + 2) * (k + 2) === 2 * k * k - f.K!) hit.push(k);
    }
    return hit.length === 1 && hit[0] === f.x!;
  },
  // 실생활: 전수 탐색으로 자연수 해가 하나뿐임을 확인한다
  "3-1|이차방정식의 활용|10": (f) => {
    const hit: number[] = [];
    if (f.mode === 0) {
      for (let k = 1; k <= 300; k += 1)
        if (k * (k - f.d!) === f.T!) hit.push(k);
    } else if (f.mode === 1) {
      for (let k = 1; k <= 31; k += 1) if (k * (k + 7) === f.P!) hit.push(k);
    } else {
      for (let k = 1; k <= 200; k += 1) {
        if (3 * k * k === (k + f.g!) * (k + f.g!) + f.K!) hit.push(k);
      }
    }
    return hit.length === 1 && hit[0] === f.x!;
  },
  // 쏘아 올린 물체: 답을 높이 식에 되넣어 그 높이가 나오는지 본다
  "3-1|이차방정식의 활용|11": (f) => {
    const h = (t: number): number => -5 * t * t + f.v! * t + f.h0!;
    if (f.mode === 1) return h(f.t2!) === 0 && f.t2! > 0 && f.x === f.t2!;
    if (h(f.t1!) !== f.H! || h(f.t2!) !== f.H!) return false;
    if (f.t1! >= f.t2!) return false;
    // 두 근 사이에서는 더 높다 — 「처음으로」와 「~ 이상인 동안」이 참인 근거
    const mid = (f.t1! + f.t2!) / 2;
    if (!(h(mid) > f.H!)) return false;
    return f.x === (f.mode === 0 ? f.t1! : f.t2! - f.t1!);
  },
  // 도형: 답을 넓이 식에 되넣는다 (버리는 근은 조건을 깬다)
  "3-1|이차방정식의 활용|12": (f) => {
    if (f.mode === 0) {
      const k = f.x!;
      if ((f.a! + k) * (f.b! + k) !== f.a! * f.b! + f.S!) return false;
      const other = -(f.a! + f.b!) - k;
      return other < 0;
    }
    if (f.mode === 1) {
      if (f.big! + f.small! !== f.L!) return false;
      if (f.big! * f.big! + f.small! * f.small! !== f.S!) return false;
      return f.big! > f.small! && f.x === f.big!;
    }
    if (f.t1! * (f.AB! - f.t1!) !== f.S!) return false;
    if (f.t2! * (f.AB! - f.t2!) !== f.S!) return false;
    return f.t1! < f.t2! && 2 * f.t2! <= f.BC! && f.t1! > 0 && f.x === f.t1!;
  },
  // 길의 폭: 남은 땅의 넓이를 답으로 다시 계산한다
  "3-1|이차방정식의 활용|13": (f) => {
    if (f.mode === 0) {
      const w = f.x!;
      return (f.side! - w) * (f.side! - w) === f.S! && 0 < w && w < f.side!;
    }
    if (f.mode === 1) {
      const w = f.x!;
      return (
        (f.a! - w) * (f.b! - w) === f.S! && 0 < w && w < Math.min(f.a!, f.b!)
      );
    }
    const wide = f.x!;
    const tall = wide - f.k!;
    return (
      (wide - f.w!) * (tall - f.w!) === f.S! && tall > f.w! && f.y! === tall
    );
  },
  // 상자: 부피·밑면 넓이·단면 넓이를 답으로 다시 계산한다
  "3-1|이차방정식의 활용|14": (f) => {
    if (f.mode === 0) {
      const a = f.x!;
      return (
        f.h! * (a - 2 * f.h!) * (a - 2 * f.h!) === f.V! && a - 2 * f.h! > 0
      );
    }
    if (f.mode === 1) {
      const c = f.x!;
      return (f.l! - 2 * c) * (f.w! - 2 * c) === f.A! && 2 * c < f.w!;
    }
    return (
      f.h1! * (f.P! - 2 * f.h1!) === f.A! &&
      f.h2! * (f.P! - 2 * f.h2!) === f.A! &&
      f.h1! < f.h2! &&
      2 * f.h2! < f.P! &&
      f.x === f.h1!
    );
  },
  // 닮음: 답이 닮음비가 낳는 이차방정식을 실제로 만족하는지 수치로 확인한다
  "3-1|이차방정식의 활용|15": (f) => {
    if (f.mode === 2) {
      const t = f.t!;
      return (
        f.p! * t * (f.p! * t) + f.q! * t * (f.q! * t) === f.S! &&
        f.x === f.q! * t
      );
    }
    const k = f.k!;
    if (k !== 2 * f.m!) return false;
    if (f.mode === 0) {
      const t = f.m! * (1 + Math.sqrt(5));
      return near(t * t - k * t - k * k, 0) && t > k && f.x === f.m!;
    }
    const t = f.m! * (Math.sqrt(5) - 1);
    return near(t * t + k * t - k * k, 0) && t > 0 && t < k && f.x === f.m!;
  },
};

/** RPM 색인의 실제 제목 (scripts/rpm/rpm-type-catalog.json 3-1 그대로). */
const TITLES: Record<string, string> = {
  "3-1|이차방정식의 풀이|01": "이차방정식의 뜻",
  "3-1|이차방정식의 풀이|02": "이차방정식의 해",
  "3-1|이차방정식의 풀이|03":
    "이차방정식의 한 근이 주어졌을 때 미지수의 값 구하기",
  "3-1|이차방정식의 풀이|04":
    "이차방정식의 한 근이 문자로 주어졌을 때 식의 값 구하기",
  "3-1|이차방정식의 풀이|05": "의 성질을 이용한 이차방정식의 풀이",
  "3-1|이차방정식의 풀이|06": "인수분해를 이용한 이차방정식의 풀이",
  "3-1|이차방정식의 풀이|07": "한 근이 주어졌을 때 다른 한 근 구하기",
  "3-1|이차방정식의 풀이|08": "한 근이 다른 이차방정식의 한 근일 때",
  "3-1|이차방정식의 풀이|09": "두 이차방정식의 공통인 근",
  "3-1|이차방정식의 풀이|10": "중근을 갖는 이차방정식",
  "3-1|이차방정식의 풀이|11": "이차방정식이 중근을 가질 조건",
  "3-1|이차방정식의 풀이|12": "제곱근을 이용한 이차방정식의 풀이",
  "3-1|이차방정식의 풀이|13": "이차방정식 가 근을 가질 조건",
  "3-1|이차방정식의 풀이|14": "완전제곱식의 꼴로 나타내기",
  "3-1|이차방정식의 풀이|15": "완전제곱식을 이용한 이차방정식의 풀이",
  "3-1|이차방정식의 풀이|16": "해에 대한 조건이 주어진 경우",
  "3-1|이차방정식의 활용|01": "이차방정식의 근의 공식",
  "3-1|이차방정식의 활용|02": "복잡한 이차방정식의 풀이",
  "3-1|이차방정식의 활용|03": "공통부분이 있는 이차방정식의 풀이",
  "3-1|이차방정식의 활용|04": "이차방정식의 근의 개수",
  "3-1|이차방정식의 활용|05": "이차방정식이 중근을 가질 조건",
  "3-1|이차방정식의 활용|06": "근을 가질 조건에 따른 미지수의 값의 범위 구하기",
  "3-1|이차방정식의 활용|07": "두 근이 주어질 때 이차방정식 구하기",
  "3-1|이차방정식의 활용|08": "이차방정식의 활용 식이 주어진 문제",
  "3-1|이차방정식의 활용|09": "이차방정식의 활용 수에 대한 문제",
  "3-1|이차방정식의 활용|10": "이차방정식의 활용 실생활에 대한 문제",
  "3-1|이차방정식의 활용|11": "이차방정식의 활용 쏘아 올린 물체에 대한 문제",
  "3-1|이차방정식의 활용|12": "이차방정식의 활용 도형에 대한 문제",
  "3-1|이차방정식의 활용|13": "이차방정식의 활용 길의 폭에 대한 문제",
  "3-1|이차방정식의 활용|14": "이차방정식의 활용 상자를 만드는 문제",
  "3-1|이차방정식의 활용|15": "이차방정식의 활용 닮음을 이용한 문제",
};

/** 유형별 모드 가짓수 — 변형 폭의 하한을 잠근다. */
const MODE_COUNT: Record<string, number> = {
  "3-1|이차방정식의 풀이|01": 2,
  "3-1|이차방정식의 풀이|02": 2,
  "3-1|이차방정식의 풀이|03": 2,
  "3-1|이차방정식의 풀이|04": 3,
  "3-1|이차방정식의 풀이|05": 2,
  "3-1|이차방정식의 풀이|06": 3,
  "3-1|이차방정식의 풀이|07": 3,
  "3-1|이차방정식의 풀이|08": 2,
  "3-1|이차방정식의 풀이|09": 2,
  "3-1|이차방정식의 풀이|10": 3,
  "3-1|이차방정식의 풀이|11": 3,
  "3-1|이차방정식의 풀이|12": 3,
  "3-1|이차방정식의 풀이|13": 4,
  "3-1|이차방정식의 풀이|14": 3,
  "3-1|이차방정식의 풀이|15": 3,
  "3-1|이차방정식의 풀이|16": 3,
  "3-1|이차방정식의 활용|01": 3,
  "3-1|이차방정식의 활용|02": 3,
  "3-1|이차방정식의 활용|03": 3,
  "3-1|이차방정식의 활용|04": 3,
  "3-1|이차방정식의 활용|05": 3,
  "3-1|이차방정식의 활용|06": 4,
  "3-1|이차방정식의 활용|07": 3,
  "3-1|이차방정식의 활용|08": 3,
  "3-1|이차방정식의 활용|09": 4,
  "3-1|이차방정식의 활용|10": 3,
  "3-1|이차방정식의 활용|11": 3,
  "3-1|이차방정식의 활용|12": 3,
  "3-1|이차방정식의 활용|13": 3,
  "3-1|이차방정식의 활용|14": 3,
  "3-1|이차방정식의 활용|15": 3,
};

/** 우리 Unit.section — 유형 번호별 기대값(DB 실측 리터럴). */
const SECTION: Record<string, string> = {};
for (let i = 1; i <= 16; i += 1) {
  SECTION[`3-1|이차방정식의 풀이|${String(i).padStart(2, "0")}`] =
    "이차방정식의 풀이";
}
for (let i = 1; i <= 15; i += 1) {
  SECTION[`3-1|이차방정식의 활용|${String(i).padStart(2, "0")}`] =
    i <= 7 ? "이차방정식의 근의 공식과 응용" : "이차방정식의 활용";
}

/**
 * 답에 처음 나오는 수. `-\dfrac{1}{2}` 는 **분자**(−1)로 읽는다 —
 * 그냥 정규식을 대면 `1` 이 나와 부호가 사라진다.
 */
function firstNumber(text: string): number {
  const flat = text.replace(/\\d?frac\{(-?\d+)\}\{(\d+)\}/g, "$1");
  const m = flat.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

describe("중3 이차방정식 31유형 (3-1 이차방정식의 풀이·활용)", () => {
  const entries = M3_QUAD;

  it("풀이 16 + 활용 15 = 31유형이 등록돼 있다", () => {
    expect(entries.length).toBe(31);
    const solve = entries.filter((e) => e.rpmMinor === "이차방정식의 풀이");
    const apply = entries.filter((e) => e.rpmMinor === "이차방정식의 활용");
    expect(solve.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(apply.map((e) => e.rpmType)).toEqual(
      Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
    expect(new Set(entries.map((e) => e.rpmBook))).toEqual(new Set(["3-1"]));
  });

  it("RPM 색인의 실제 제목을 쓴다 (31유형 전량 리터럴 대조)", () => {
    for (const e of entries) {
      expect(e.rpmTitle, e.key).toBe(TITLES[e.key]);
    }
  });

  it("우리 단원 이름은 DB 실측 리터럴과 일치한다", () => {
    for (const e of entries) {
      expect(e.unitSection, e.key).toBe(SECTION[e.key]);
    }
    expect(new Set(entries.map((e) => e.unitSection))).toEqual(
      new Set([
        "이차방정식의 풀이",
        "이차방정식의 근의 공식과 응용",
        "이차방정식의 활용",
      ]),
    );
  });

  for (const e of M3_QUAD) {
    describe(`${e.rpmMinor} ${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260824);
        const b = generateMiddleProblem(e.key, 20260824);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          for (let v = 0; v < 10; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              verify!(p.facts),
              `seed ${seed} v${v} 검산 실패: ${JSON.stringify(p.facts)}`,
            ).toBe(true);
          }
        }
      });

      it("답의 첫 수가 facts.x 와 일치한다", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              firstNumber(p.answer),
              `${e.key} seed ${seed} v${v} 답 ${p.answer} vs facts.x`,
            ).toBe(p.facts.x);
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(bareNumbers(p.content), `${e.key} content`).toEqual([]);
            expect(bareNumbers(p.answer), `${e.key} answer`).toEqual([]);
            expect(bareNumbers(p.solution), `${e.key} solution`).toEqual([]);
          }
        }
      });

      /**
       * KaTeX 밖의 백슬래시는 지면에 **날 문자로** 나간다(제품 렌더러가 `$` 밖
       * 백슬래시를 글자 그대로 이스케이프한다). 숫자 가드는 이 부류를 못 본다.
       */
      it("KaTeX 밖에 백슬래시가 없다", () => {
        const outside = (t: string): string => t.replace(/\$[^$]*\$/g, " ");
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            for (const [name, text] of [
              ["content", p.content],
              ["answer", p.answer],
              ["solution", p.solution],
            ] as const) {
              expect(
                outside(text).match(/\\[\s\S]/g) ?? [],
                `${e.key} seed ${seed} v${v} ${name}`,
              ).toEqual([]);
            }
          }
        }
      });

      it("해설이 한 줄로 뭉치지 않는다 (단계 사이 줄바꿈)", () => {
        for (const seed of SEEDS) {
          for (let v = 0; v < 6; v += 1) {
            const p = generateMiddleProblem(e.key, seed, v);
            expect(
              p.solution.split("\n").filter((s) => s.trim() !== "").length,
              `${e.key} seed ${seed} v${v} 해설 줄 수`,
            ).toBeGreaterThanOrEqual(2);
          }
        }
      });

      it("이 중단원은 그림을 쓰지 않는다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(p.figureSpec, `${e.key} 그림`).toBeNull();
        }
      });

      it("변형 폭 — 40변형에서 모드 전 갈래가 나오고 발문이 12종 이상", () => {
        const modes = new Set<number>();
        const contents = new Set<string>();
        for (let v = 0; v < 40; v += 1) {
          const p = generateMiddleProblem(e.key, 20260824, v);
          modes.add(p.facts.mode!);
          contents.add(p.content);
        }
        expect(modes.size, `${e.key} 모드 갈래`).toBe(MODE_COUNT[e.key]);
        expect(contents.size, `${e.key} 발문 다양성`).toBeGreaterThanOrEqual(
          12,
        );
      });
    });
  }

  /**
   * D-73 — 제품이 가분수를 대분수로 바꾸지 않는다. 우리 쪽에서 **대분수를 만들지도**
   * 않는다: `\frac` 이 정수부 뒤에 바로 붙은 꼴(`1\frac{2}{3}`)이 있으면 빨강.
   */
  it("대분수를 직접 쓰지 않는다 (D-73)", () => {
    const bad: string[] = [];
    for (const e of entries) {
      for (const seed of SEEDS) {
        for (let v = 0; v < 6; v += 1) {
          const p = generateMiddleProblem(e.key, seed, v);
          for (const text of [p.content, p.answer, p.solution]) {
            if (/\d\s*\\d?frac\{/.test(text)) bad.push(`${e.key}: ${text}`);
          }
        }
      }
    }
    expect(bad.slice(0, 4), `대분수 꼴 ${bad.length}건`).toEqual([]);
  });

  /**
   * 활용 06 은 답이 **부등식**이다 — 수만 맞고 부등호가 뒤집히면 검산식(판별식 부호)은
   * 그대로 초록이다. 그 축이 시험에 없으면 방향은 아무도 안 본다.
   */
  it("활용 06: 답의 부등호가 facts 의 방향과 같다", () => {
    const e = entries.find((t) => t.key === "3-1|이차방정식의 활용|06")!;
    for (const seed of SEEDS) {
      for (let v = 0; v < 10; v += 1) {
        const p = generateMiddleProblem(e.key, seed, v);
        const f = p.facts;
        if (f.mode === 3) {
          expect(p.answer, "mode 3 은 정수 한 개다").toMatch(/^\$-?\d+\$$/);
          continue;
        }
        const sym =
          f.strict === 1
            ? f.less === 1
              ? "<"
              : ">"
            : f.less === 1
              ? "\\leq"
              : "\\geq";
        expect(
          p.answer.startsWith(`$p${sym} `),
          `seed ${seed} v${v} 답 ${p.answer} vs less=${f.less} strict=${f.strict}`,
        ).toBe(true);
      }
    }
  });

  /**
   * 활용 갈래는 **버리는 근**이 있다. 해설이 그 근을 실제로 적었는지 본다 —
   * 「답이 맞다」만 보면 «왜 다른 근을 버렸는가»가 지면에서 사라진다.
   */
  it("활용 08~15 의 해설이 «버린 근» 또는 «모두 유효»를 말한다", () => {
    const targets = entries.filter(
      (e) => e.rpmMinor === "이차방정식의 활용" && Number(e.rpmType) >= 8,
    );
    expect(targets.length).toBe(8);
    for (const e of targets) {
      for (const seed of SEEDS) {
        for (let v = 0; v < 6; v += 1) {
          const p = generateMiddleProblem(e.key, seed, v);
          expect(
            /버린다|모두 조건을 만족/.test(p.solution),
            `${e.key} seed ${seed} v${v} 해설에 버리는 근 설명 없음`,
          ).toBe(true);
        }
      }
    }
  });

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260824, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });
});
