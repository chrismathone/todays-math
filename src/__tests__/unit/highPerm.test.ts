/**
 * 공통수학1 「경우의 수와 순열」 — **전수 나열 검산** (물결 1 세션 `h1-count`).
 *
 * 생성기는 교과서 공식(곱의 법칙·묶음·빈자리 끼우기·여사건)으로 답을 낸다. 여기서는 같은 `facts`
 * 로 순열·순서쌍·부분집합·자연수를 **실제로 늘어놓고 센다** — 공식을 옮겨 적지 않는다
 * (동어반복 방지). 제품의 `permutationsOf`·`nPr` 도 안 부른다(같이 틀리지 않게).
 * 지면의 답은 `highAnswer.readAnswerValues` 로 읽는다.
 *
 * `VERIFY` 는 facts 만으로 못 세는 자리(낱말 · 되묻는 K · 곱으로 된 식)는 **지면을 읽어** 센다 —
 * 그러면 「facts 는 맞는데 발문에 딴 것이 찍힌」 결함도 같이 걸린다. 나머지 수치는 `SHOWN` 이
 * 발문에 실제로 있는지 본다.
 *
 * 지면(수는 수식 안·냄새·조사)·난이도·형식은 `highRegistry.test.ts` 가 등록 유형 전부에 돈다.
 */
import { describe, expect, it } from "vitest";
import { expectedHighTitle } from "../helpers/highTitles";

import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import {
  generateHighProblem,
  registeredHighTypes,
} from "../../lib/high/generate";
import { H1_PERM, H1_PERM_HOLD } from "../../lib/high/h1Perm";
import type { HighProblem } from "../../lib/high/types";
import { readAnswerValues } from "../helpers/highAnswer";
import { highCatalog, mathSpans } from "../helpers/highPage";

const BOOK = "공통수학1";
const MINOR = "경우의 수와 순열";
const SEEDS = [20260913, 1, 7777, 424242, 99991];
const VARIANTS = 14;

const catalogRows = highCatalog(BOOK).filter((t) => t.minor === MINOR);

type Fact = Record<string, number>;

// ───────────────────────────── 나열 도구 ─────────────────────────────

/** 0..n-1 의 순열 전부 — 사전식이 아니어도 된다(센다). */
function allPerms(n: number): number[][] {
  if (n === 0) return [[]];
  const out: number[][] = [];
  for (const p of allPerms(n - 1)) {
    for (let at = 0; at <= p.length; at += 1) {
      out.push([...p.slice(0, at), n - 1, ...p.slice(at)]);
    }
  }
  return out;
}

const permCache = new Map<number, number[][]>();
function perms(n: number): number[][] {
  let hit = permCache.get(n);
  if (!hit) {
    hit = allPerms(n);
    permCache.set(n, hit);
  }
  return hit;
}

const countCache = new Map<string, number>();
/** `n` 개의 서로 다른 것을 일렬로 놓을 때 조건을 만족하는 배열의 수 — 열쇠마다 한 번만 센다. */
function countArrangements(
  key: string,
  n: number,
  ok: (arr: readonly number[]) => boolean,
): number {
  const k = `${key}|${n}`;
  const hit = countCache.get(k);
  if (hit !== undefined) return hit;
  let c = 0;
  for (const p of perms(n)) if (ok(p)) c += 1;
  countCache.set(k, c);
  return c;
}

/** 배열에서 물건 `x` 가 선 자리. */
const posOf = (arr: readonly number[], x: number): number => arr.indexOf(x);

/** 물건 lo..hi-1 이 한 덩어리로 붙어 있는가. */
function contiguous(arr: readonly number[], lo: number, hi: number): boolean {
  const ps = [];
  for (let x = lo; x < hi; x += 1) ps.push(posOf(arr, x));
  return Math.max(...ps) - Math.min(...ps) === hi - lo - 1;
}

/** 물건 lo..hi-1 가운데 어느 둘도 이웃하지 않는가. */
function noTwoAdjacent(
  arr: readonly number[],
  lo: number,
  hi: number,
): boolean {
  for (let i = 0; i + 1 < arr.length; i += 1) {
    const a = arr[i]!;
    const b = arr[i + 1]!;
    if (a >= lo && a < hi && b >= lo && b < hi) return false;
  }
  return true;
}

/** 1..N 에서 k 개를 고르는 부분집합(오름차순) 전부. */
function subsets(N: number, k: number): number[][] {
  const out: number[][] = [];
  const cur: number[] = [];
  const go = (from: number): void => {
    if (cur.length === k) {
      out.push([...cur]);
      return;
    }
    for (let v = from; v <= N; v += 1) {
      cur.push(v);
      go(v + 1);
      cur.pop();
    }
  };
  go(1);
  return out;
}

/** 허락된 숫자로 만든, 숫자가 서로 다른 r 자리 자연수 전부. */
function distinctDigitNumbers(digits: readonly number[], r: number): number[] {
  const out: number[] = [];
  const go = (acc: number[]): void => {
    if (acc.length === r) {
      out.push(Number(acc.join("")));
      return;
    }
    for (const d of digits) {
      if (acc.includes(d)) continue;
      if (acc.length === 0 && d === 0) continue;
      go([...acc, d]);
    }
  };
  go([]);
  return out;
}

function divisorsOf(n: number): number[] {
  const out: number[] = [];
  for (let d = 1; d <= n; d += 1) if (n % d === 0) out.push(d);
  return out;
}

/** 지면에서 수 하나를 읽는다 — 못 읽으면 던진다(조용히 통과 금지). */
function readInt(text: string, re: RegExp, what: string): number {
  const m = re.exec(text);
  if (!m) throw new Error(`${what} 을(를) 발문에서 못 읽는다: ${text}`);
  return Number(m[1]);
}

/** 발문 맨 앞의 영어 낱말(「castle의 $6$개의 문자」). */
function readWord(content: string): string {
  const m = /^([a-z]+)의 \$(\d+)\$개의 문자/.exec(content);
  if (!m) throw new Error(`낱말을 발문에서 못 읽는다: ${content}`);
  return m[1]!;
}

const isVowel = (c: string): boolean => "aeiou".includes(c);

// ───────────────────────────── 07 도로망 ─────────────────────────────

type Edges = Record<string, number>;
const edgeKey = (x: string, y: string): string => [x, y].sort().join("");

function roads(e: Edges, x: string, y: string): number {
  return e[edgeKey(x, y)] ?? 0;
}

/** 한 번 지난 곳은 다시 안 지나는 A → D 길(도로 수로 가중). */
function simplePaths(
  e: Edges,
  from: string,
  to: string,
  must: readonly string[],
): number {
  const nodes = ["A", "B", "C", "D"];
  let total = 0;
  const go = (at: string, seen: string[], w: number): void => {
    if (at === to) {
      if (must.every((m) => seen.includes(m))) total += w;
      return;
    }
    for (const nx of nodes) {
      if (seen.includes(nx)) continue;
      const k = roads(e, at, nx);
      if (k > 0) go(nx, [...seen, nx], w * k);
    }
  };
  go(from, [from], 1);
  return total;
}

/** A 에서 B 에 갔다가 A 로 — A 말고는 두 번 안 지난다. */
function roundTrips(e: Edges): number {
  const nodes = ["A", "B", "C", "D"];
  let total = 0;
  const go = (at: string, seen: string[], w: number, back: boolean): void => {
    for (const nx of nodes) {
      const k = roads(e, at, nx);
      if (k === 0) continue;
      if (back && nx === "A") {
        total += w * k;
        continue;
      }
      if (seen.includes(nx)) continue;
      go(nx, [...seen, nx], w * k, back || nx === "B");
    }
  };
  go("A", ["A"], 1, false);
  return total;
}

// ───────────────────────────── VERIFY ─────────────────────────────

const VERIFY: Record<string, (f: Fact, p: HighProblem) => number> = {
  "01": (f) => {
    if (f.mode === 0) {
      let c = 0;
      for (let a = 1; a <= 6; a += 1)
        for (let b = 1; b <= 6; b += 1) {
          const s = a + b;
          if (f.kind === 0 && s % f.k! === 0) c += 1;
          if (f.kind === 1 && (s === f.a || s === f.b)) c += 1;
          if (f.kind === 2 && s >= f.s!) c += 1;
        }
      return c;
    }
    if (f.mode === 1) {
      const tensOk = [
        (d: number) => d % 2 === 0,
        (d: number) => d % 2 === 1,
        (d: number) => d % 3 === 0,
      ][f.cls!]!;
      let c = 0;
      for (let t = 1; t <= f.m!; t += 1)
        for (let u = 1; u <= f.m!; u += 1) if (t !== u && tensOk(t)) c += 1;
      return c;
    }
    if (f.mode === 2) {
      let c = 0;
      for (let x = 1; x <= f.N!; x += 1) {
        const hit = x % f.a! === 0 || x % f.b! === 0;
        if (f.kind === 0 ? hit : !hit) c += 1;
      }
      return c;
    }
    return subsets(f.N!, 3).filter((s) => {
      const t = s[0]! + s[1]! + s[2]!;
      return t === f.a || t === f.b;
    }).length;
  },

  "02": (f) => {
    let c = 0;
    if (f.mode === 0) {
      const lo = f.kind === 0 ? 0 : 1;
      for (let x = lo; x <= f.N!; x += 1)
        for (let y = lo; y <= f.N!; y += 1)
          for (let z = lo; z <= f.N!; z += 1)
            if (f.a! * x + f.b! * y + f.c! * z === f.N) c += 1;
      return c;
    }
    if (f.mode === 1) {
      if (f.kind === 0) {
        for (let x = 1; x <= f.N!; x += 1)
          for (let y = 1; y <= f.N!; y += 1) if (x + f.p! * y <= f.N!) c += 1;
        return c;
      }
      for (let x = 0; x <= f.q!; x += 1)
        for (let y = 0; y <= f.q!; y += 1)
          if (x + y >= f.p! && x + y <= f.q!) c += 1;
      return c;
    }
    for (let x = 1; x <= f.M!; x += 1)
      for (let y = 1; y <= f.M!; y += 1)
        for (let z = 1; z <= f.M!; z += 1)
          if (f.u! * x + f.p! * f.u! * y + f.q! * f.u! * z === f.u! * f.M!)
            c += 1;
    return c;
  },

  "03": (f, p) => {
    if (f.mode === 0) {
      const isPrime = (d: number) => [2, 3, 5, 7].includes(d);
      const cls = [
        isPrime,
        (d: number) => d % 3 === 0,
        (d: number) => d % 2 === 1,
        (d: number) => d % 2 === 0,
        (d: number) => 8 % d === 0,
        (d: number) => 6 % d === 0,
        (d: number) => 9 % d === 0,
      ];
      let c = 0;
      for (let n = 100; n <= 999; n += 1) {
        const [h, t, o] = String(n).split("").map(Number) as [
          number,
          number,
          number,
        ];
        if (h === 0 || t === 0 || o === 0) continue;
        if (!cls[f.h!]!(h) || !cls[f.t!]!(t)) continue;
        if (f.odd === 1 ? o % 2 === 1 : o % 2 === 0) c += 1;
      }
      return c;
    }
    if (f.mode === 1) {
      // 지면의 곱을 **실제로 전개해서** 서로 다른 항을 센다.
      const expr = mathSpans(p.content)[0]!;
      const factors = [...expr.matchAll(/\(([^()]*)\)/g)].map((m) =>
        m[1]!.split("+"),
      );
      let terms = [""];
      for (const fac of factors) {
        terms = terms.flatMap((t) =>
          fac.map((v) => [...t.split(""), v].sort().join("")),
        );
      }
      return new Set(terms).size;
    }
    let c = 0;
    const tuples = (m: number): number[][] =>
      m === 0
        ? [[]]
        : tuples(m - 1).flatMap((t) =>
            Array.from({ length: f.f! }, (_, i) => [...t, i + 1]),
          );
    for (const t of tuples(f.m!)) {
      const prod = t.reduce((a, b) => a * b, 1);
      if (f.kind === 0 ? prod % 2 === 0 : prod % 3 === 0) c += 1;
    }
    return c;
  },

  "04": (f, p) => {
    if (f.mode === 0) {
      if (f.kind === 0) return divisorsOf(f.N!).length;
      return divisorsOf(f.A!).filter((d) => f.B! % d === 0).length;
    }
    if (f.mode === 1) {
      const ds = divisorsOf(f.N!);
      const x = ds.length;
      const y = ds.reduce((s, d) => s + d, 0);
      return f.kind === 0 ? x + y : y - x;
    }
    if (f.mode === 2) {
      const ds = divisorsOf(f.N!);
      if (f.kind === 0) return ds.filter((d) => d % 2 === 0).length;
      if (f.kind === 1) return ds.filter((d) => d % 2 === 1).length;
      return ds.filter((d) => d % f.k! === 0).length;
    }
    // 되묻는 꼴 — 발문의 K 로 n 을 찾는다. mⁿ 은 너무 커서 m 을 소인수분해해 지수를 곱한다.
    const K = readInt(p.content, /개수가 \$(\d+)\$일 때/, "약수의 개수");
    const exps: number[] = [];
    let m = f.m!;
    for (let q = 2; q <= m; q += 1) {
      let e = 0;
      while (m % q === 0) {
        m /= q;
        e += 1;
      }
      if (e > 0) exps.push(e);
    }
    const hits: number[] = [];
    for (let n = 1; n <= 20; n += 1) {
      if (exps.reduce((s, e) => s * (e * n + 1), 1) === K) hits.push(n);
    }
    expect(hits, `K=${K} 를 만족하는 n 이 하나가 아니다`).toHaveLength(1);
    return hits[0]!;
  },

  "05": (f) => {
    const n = f.n!;
    return countArrangements(`05-${f.mode}-${f.t ?? 0}`, n, (a) => {
      const fixed = a.filter((v, i) => v === i).length;
      if (f.mode === 0) return fixed === 0;
      if (f.mode === 1)
        return a[0] === f.t && a.every((v, i) => i === 0 || v !== i);
      return fixed === 1;
    });
  },

  "06": (f) => {
    let methods = 0;
    const amounts = new Set<number>();
    for (let x = 0; x <= f.c!; x += 1)
      for (let y = 0; y <= f.b!; y += 1)
        for (let z = 0; z <= f.a!; z += 1) {
          if (x + y + z === 0) continue;
          methods += 1;
          amounts.add(f.l! * x + f.m! * y + f.s! * z);
        }
    if (f.mode === 0) return methods;
    if (f.mode === 1) return amounts.size;
    return f.ask === 0 ? methods - amounts.size : methods + amounts.size;
  },

  "07": (f) => {
    if (f.mode === 2) {
      return roundTrips({
        AC: f.ac!,
        BC: f.cb!,
        BD: f.bd!,
        AD: f.da!,
        CD: f.cd!,
      });
    }
    const e: Edges = { AB: f.ab!, BC: f.bc!, CD: f.cd!, AC: f.ac!, BD: f.bd! };
    return simplePaths(e, "A", "D", f.mode === 0 ? ["B", "C"] : []);
  },

  "09": (f, p) => {
    if (f.mode === 0) {
      const g = f.kind === 0 ? 2 : 3;
      return countArrangements(`09-0-${g}`, f.n!, (a) => contiguous(a, 0, g));
    }
    if (f.mode === 1) {
      const N = f.m! + f.w!;
      return countArrangements(`09-1-${f.m}`, N, (a) => contiguous(a, f.m!, N));
    }
    if (f.mode === 2) {
      const N = f.e! + f.m! + f.h!;
      return countArrangements(
        `09-2-${f.e}-${f.m}`,
        N,
        (a) =>
          contiguous(a, f.e!, f.e! + f.m!) && contiguous(a, f.e! + f.m!, N),
      );
    }
    if (f.kind === 1) {
      return countArrangements(`09-3-or`, f.n!, (a) => {
        const d01 = Math.abs(posOf(a, 0) - posOf(a, 1)) === 1;
        const d12 = Math.abs(posOf(a, 1) - posOf(a, 2)) === 1;
        return d01 || d12;
      });
    }
    const K = readInt(p.content, /경우의 수가 \$(\d+)\$이다/, "경우의 수");
    const hits: number[] = [];
    for (let n = 1; n + f.g! <= 8; n += 1) {
      const c = countArrangements(`09-3-g${f.g}`, n + f.g!, (a) =>
        contiguous(a, 0, f.g!),
      );
      if (c === K) hits.push(n);
    }
    expect(hits, `K=${K} 를 만족하는 n 이 하나가 아니다`).toHaveLength(1);
    return hits[0]!;
  },

  "10": (f) => {
    if (f.mode === 0) {
      const N = f.a! + f.b!;
      return countArrangements(`10-0-${f.a}`, N, (a) =>
        noTwoAdjacent(a, f.a!, N),
      );
    }
    if (f.mode === 1) {
      return countArrangements(`10-1-${f.v}`, f.n!, (a) =>
        noTwoAdjacent(a, 0, f.v!),
      );
    }
    if (f.mode === 2) {
      return countArrangements(
        `10-2`,
        f.n!,
        (a) =>
          Math.abs(posOf(a, 0) - posOf(a, 1)) === 1 &&
          Math.abs(posOf(a, 2) - posOf(a, 3)) !== 1,
      );
    }
    // 서로 다른 학생 k 명이 의자 m 개 중 서로 다른 자리에 — 어느 둘도 옆자리가 아니게.
    let c = 0;
    const go = (seats: number[]): void => {
      if (seats.length === f.k) {
        c += 1;
        return;
      }
      for (let s = 0; s < f.m!; s += 1) {
        if (seats.some((t) => Math.abs(t - s) <= 1)) continue;
        go([...seats, s]);
      }
    };
    go([]);
    return c;
  },

  "11": (f) => {
    if (f.mode === 0) {
      const N = f.a! + f.c!;
      return countArrangements(
        `11-0-${f.a}`,
        N,
        (a) => a[0]! < f.a! && a[N - 1]! < f.a!,
      );
    }
    if (f.mode === 1) {
      const N = f.a! + f.b!;
      return countArrangements(`11-1-${f.a}`, N, (a) =>
        a.every((v, i) => i === 0 || v < f.a! !== a[i - 1]! < f.a!),
      );
    }
    if (f.mode === 2) {
      const want = f.kind === 0 ? 1 : 0; // 1번째(0) 자리부터 — 홀수 번째는 index 짝수
      return countArrangements(`11-2-${f.kind}-${f.v}`, f.n!, (a) => {
        for (let x = 0; x < f.v!; x += 1) {
          if ((posOf(a, x) + 1) % 2 !== want) return false;
        }
        return true;
      });
    }
    return countArrangements(
      `11-3-${f.k}`,
      f.n!,
      (a) => Math.abs(posOf(a, 0) - posOf(a, 1)) - 1 === f.k,
    );
  },

  "12": (f, p) => {
    if (f.mode === 0) {
      return countArrangements(
        `12-0-${f.v}`,
        f.n!,
        (a) => a[0]! < f.v! || a[f.n! - 1]! < f.v!,
      );
    }
    if (f.mode === 1) {
      const N = f.b! + f.g!;
      let c = 0;
      for (let i = 0; i < N; i += 1)
        for (let j = 0; j < N; j += 1)
          if (i !== j && (i < f.b! || j < f.b!)) c += 1;
      return c;
    }
    if (f.mode === 2) {
      return countArrangements(
        `12-2`,
        f.n!,
        (a) => Math.abs(posOf(a, 0) - posOf(a, 1)) > 1,
      );
    }
    if (f.kind === 0) {
      return countArrangements(
        `12-3-${f.v}`,
        f.n!,
        (a) => !noTwoAdjacent(a, 0, f.v!),
      );
    }
    const K = readInt(p.content, /경우의 수가 \$(\d+)\$이다/, "경우의 수");
    const hits: number[] = [];
    for (let e = 1; e <= Math.min(4, f.n! - 1); e += 1) {
      const c = countArrangements(
        `12-3k-${e}`,
        f.n!,
        (a) => a[0]! < e || a[f.n! - 1]! < e,
      );
      if (c === K) hits.push(e);
    }
    expect(hits, `K=${K} 를 만족하는 짝수 개수가 하나가 아니다`).toHaveLength(
      1,
    );
    return hits[0]!;
  },

  "13": (f) => {
    const zeroTo = (k: number) => Array.from({ length: k + 1 }, (_, i) => i);
    if (f.mode <= 2) {
      const nums = distinctDigitNumbers(zeroTo(f.k!), f.r!);
      if (f.mode === 0) return nums.filter((x) => x % 2 === 0).length;
      if (f.mode === 1) return nums.filter((x) => x % 5 === 0).length;
      return nums.filter((x) => {
        const s = String(x);
        return Number(s[0]) % 2 === 1 && Number(s[s.length - 1]) % 2 === 1;
      }).length;
    }
    const oneTo = Array.from({ length: f.k! }, (_, i) => i + 1);
    if (f.kind === 0) {
      return distinctDigitNumbers(oneTo, 3).filter((x) => x % 3 === 0).length;
    }
    return distinctDigitNumbers(oneTo, f.r!).reduce((s, x) => s + x, 0);
  },

  "14": (f, p) => {
    const zeroTo = (k: number) => Array.from({ length: k + 1 }, (_, i) => i);
    if (f.mode === 0) {
      const T = 1000 * f.a! + 100 * f.b!;
      return distinctDigitNumbers(zeroTo(f.k!), 4).filter((x) => x > T).length;
    }
    if (f.mode === 1) {
      const word = readWord(p.content);
      const idx = String(f.code!).padStart(f.n!, "0").split("").map(Number);
      const target = idx.map((i) => word[i]!).join("");
      expect(p.content, "발문에 facts 의 문자열이 없다").toContain(target);
      const all = perms(word.length)
        .map((q) => q.map((i) => word[i]!).join(""))
        .sort();
      return all.indexOf(target) + 1;
    }
    const nums = distinctDigitNumbers(zeroTo(f.k!), f.k! + 1).sort(
      (x, y) => x - y,
    );
    return nums[f.m! - 1]!;
  },
};

// ───────────────────────────── SHOWN ─────────────────────────────

/** 발문이 **보여 줘야 하는** 수 — 수식 안의 정수 조각으로 있어야 한다. */
const SHOWN: Record<string, (f: Fact) => number[]> = {
  "01": (f) =>
    f.mode === 0
      ? f.kind === 0
        ? [f.k!]
        : f.kind === 1
          ? [f.a!, f.b!]
          : [f.s!]
      : f.mode === 1
        ? [f.m!]
        : [f.N!, f.a!, f.b!],
  "02": (f) =>
    f.mode === 0
      ? [f.a!, f.b!, f.c!, f.N!].filter((x) => x !== 1)
      : f.mode === 1
        ? f.kind === 0
          ? [f.p!, f.N!]
          : [f.p!, f.q!]
        : [f.u!, f.p! * f.u!, f.q! * f.u!, f.u! * f.M!],
  "03": (f) => (f.mode === 2 ? [f.f!, f.m!] : []),
  "04": (f) =>
    f.mode === 0
      ? f.kind === 0
        ? [f.N!]
        : [f.A!, f.B!]
      : f.mode === 3
        ? [f.m!]
        : f.mode === 2 && f.kind === 2
          ? [f.N!, f.k!]
          : [f.N!],
  "05": (f) => (f.ctx === 2 ? [1, 2, 3, 4] : []),
  "06": (f) => [f.s!, f.m!, f.l!, f.a!, f.b!, f.c!],
  "07": (f) =>
    f.mode === 2
      ? [f.ac!, f.cb!, f.bd!, f.da!, f.cd!]
      : [f.ab!, f.bc!, f.cd!, f.ac!, f.bd!],
  "09": (f) =>
    f.mode === 0
      ? [f.n!]
      : f.mode === 1
        ? [f.m!, f.w!]
        : f.mode === 2
          ? [f.e!, f.m!, f.h!]
          : f.kind === 0
            ? [f.g!]
            : [f.n!],
  "10": (f) =>
    f.mode === 0
      ? [f.a!, f.b!]
      : f.mode === 1
        ? [f.n!]
        : f.mode === 2
          ? []
          : [f.k!, f.m!],
  "11": (f) =>
    f.mode === 0
      ? [f.a!, f.c!]
      : f.mode === 1
        ? [f.a!, f.b!]
        : f.mode === 2
          ? [f.n!]
          : [f.n!, f.k!],
  "12": (f) => (f.mode === 1 ? [f.b!, f.g!] : [f.n!]),
  "13": (f) =>
    f.mode <= 2 ? [f.k! + 1, f.r!] : f.kind === 0 ? [f.k!] : [f.k!, f.r!],
  "14": (f) =>
    f.mode === 0
      ? [f.k! + 1, 1000 * f.a! + 100 * f.b!]
      : f.mode === 1
        ? [f.n!]
        : [f.k! + 1, f.m!],
};

/** 발문 속 사람 목록의 길이 — 「A, B, C, D 네 사람」. */
const SHOWN_PEOPLE: Record<string, (f: Fact) => number | null> = {
  "05": (f) => (f.ctx === 2 ? null : f.n!),
  "10": (f) => (f.mode === 2 ? f.n! : null),
};

function spanInts(content: string): Set<number> {
  const out = new Set<number>();
  for (const s of mathSpans(content)) {
    for (const m of s.matchAll(/\d+/g)) out.add(Number(m[0]));
  }
  return out;
}

function eachProblem(
  fn: (p: HighProblem, key: string, number: string) => void,
) {
  for (const entry of H1_PERM) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        fn(generateHighProblem(entry.key, seed, v), entry.key, entry.rpmType);
      }
    }
  }
}

describe("고등 공통수학1 경우의 수와 순열 — 등록", () => {
  it("색인 14유형이 등록 ∪ 보류로 전부 덮이고, 번호·제목·중단원이 색인 바이트와 같다", () => {
    expect(catalogRows.length, "색인 유형 수").toBe(14);
    const covered = [
      ...H1_PERM.map((e) => e.rpmType),
      ...H1_PERM_HOLD.map((h) => h.key.split("|")[2]!),
    ].sort();
    expect(covered).toEqual(catalogRows.map((t) => t.number).sort());
    for (const e of H1_PERM) {
      const row = catalogRows.find((t) => t.number === e.rpmType);
      expect(row, `${e.key}: 색인에 없는 번호`).toBeDefined();
      expect(e.rpmTitle, `${e.key} 제목`).toBe(
        expectedHighTitle(e.key, row!.title),
      );
      expect(e.rpmMinor).toBe(MINOR);
      expect(e.key).toBe(`${BOOK}|${MINOR}|${e.rpmType}`);
    }
  });

  it("보류는 그림이 있어야 성립하는 08 하나뿐이고 까닭이 있다", () => {
    expect(H1_PERM_HOLD.map((h) => h.key)).toEqual([`${BOOK}|${MINOR}|08`]);
    for (const h of H1_PERM_HOLD) {
      expect(h.reason).toMatch(/그림/);
    }
  });

  it("단원은 시드의 「경우의 수」 · 「순열」이다", () => {
    const sections = new Set(
      CURRICULUM_UNITS.filter((u) => u.grade === BOOK).map((u) => u.section),
    );
    for (const e of H1_PERM) {
      expect(sections.has(e.unitSection), `${e.key} — ${e.unitSection}`).toBe(
        true,
      );
      expect(Number(e.rpmType) <= 7 ? "경우의 수" : "순열").toBe(e.unitSection);
    }
  });

  it("등록부에 들어 있다", () => {
    const keys = new Set(registeredHighTypes().map((e) => e.key));
    for (const e of H1_PERM) expect(keys.has(e.key)).toBe(true);
  });
});

describe("고등 공통수학1 경우의 수와 순열 — 값", () => {
  it("정답이 facts 로 늘어놓고 센 것과 같다", () => {
    eachProblem((p, key, number) => {
      const want = VERIFY[number]!(p.facts, p);
      const got = readAnswerValues(p.answer);
      expect(got, `${key} 정답이 값 하나가 아니다: ${p.answer}`).toHaveLength(
        1,
      );
      expect(got[0]!.im, `${key} 허수부`).toBe(0);
      expect(got[0]!.re, `${key} (${JSON.stringify(p.facts)})`).toBe(want);
    });
  });

  it("정답이 수이므로 생성기 오답은 없다 — 공용 경로가 보기를 짓는다", () => {
    eachProblem((p, key) => {
      expect(p.distractors, key).toBeUndefined();
    });
  });

  it("발문이 facts 의 수치를 그대로 보여 준다", () => {
    let checked = 0;
    eachProblem((p, key, number) => {
      const shown = spanInts(p.content);
      for (const want of SHOWN[number]!(p.facts)) {
        expect(
          shown.has(want),
          `${key}: 발문에 ${want} 가 없다 — ${p.content}`,
        ).toBe(true);
        checked += 1;
      }
      const people = SHOWN_PEOPLE[number]?.(p.facts) ?? null;
      if (people !== null) {
        const m = /^((?:[A-H], )*[A-H]) /.exec(p.content);
        expect(m, `${key}: 사람 목록이 없다`).not.toBeNull();
        expect(m![1]!.split(", ").length, `${key} 사람 수`).toBe(people);
        checked += 1;
      }
    });
    expect(
      checked,
      "지면 대조가 하나도 안 돌면 이 검사는 장식이다",
    ).toBeGreaterThan(1500);
  });

  it("낱말 문항은 지면의 낱말이 facts 의 글자 수·모음 수와 맞고 문자가 모두 다르다", () => {
    let words = 0;
    eachProblem((p, key) => {
      // 낱말 문항만 `wi`(낱말 번호)를 싣는다 — `w` 는 09 에서 여학생 수라 열쇠로 못 쓴다.
      if (p.facts.wi === undefined) return;
      const word = readWord(p.content);
      expect(new Set(word).size, `${key} ${word}: 겹치는 문자`).toBe(
        word.length,
      );
      expect(word.length, `${key} ${word} 글자 수`).toBe(p.facts.n);
      if (p.facts.v !== undefined) {
        expect([...word].filter(isVowel).length, `${key} ${word} 모음 수`).toBe(
          p.facts.v,
        );
      }
      expect(word, `${key}: y 가 든 낱말은 모음이 갈린다`).not.toMatch(/y/);
      words += 1;
    });
    expect(
      words,
      "낱말 문항이 하나도 안 나오면 이 검사는 장식이다",
    ).toBeGreaterThan(30);
  });

  it("유형마다 꼴이 둘 이상 나온다 — 한 꼴에 갇히지 않는다", () => {
    for (const entry of H1_PERM) {
      const modes = new Set<number>();
      for (const seed of SEEDS)
        for (let v = 0; v < VARIANTS; v += 1)
          modes.add(generateHighProblem(entry.key, seed, v).facts.mode!);
      expect(
        modes.size,
        `${entry.key} 꼴 ${[...modes].join(",")}`,
      ).toBeGreaterThanOrEqual(3);
    }
  });
});
