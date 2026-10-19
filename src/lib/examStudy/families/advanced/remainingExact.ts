/** Small exact-coordinate toolkit. BigInt constructors keep the project's ES2017
 * target; no floating point decision is used for a branch or incidence. */
export class Q {
  readonly n: bigint;
  readonly d: bigint;
  constructor(n: number | string | bigint, d: number | bigint = 1) {
    let a = BigInt(n),
      b = BigInt(d);
    if (b === BigInt(0)) throw new Error("분모 0");
    if (b < BigInt(0)) {
      a = -a;
      b = -b;
    }
    const gcd = (x: bigint, y: bigint): bigint =>
      y === BigInt(0) ? (x < BigInt(0) ? -x : x) : gcd(y, x % y);
    const g = gcd(a, b);
    this.n = a / g;
    this.d = b / g;
  }
  static read(s: string): Q {
    if (!/^-?\d+(?:\/[1-9]\d*)?$/.test(s)) throw new Error("유리수 표기 오류");
    const [n, d = "1"] = s.split("/");
    return new Q(n!, BigInt(d));
  }
  add(x: Q): Q {
    return new Q(this.n * x.d + x.n * this.d, this.d * x.d);
  }
  sub(x: Q): Q {
    return new Q(this.n * x.d - x.n * this.d, this.d * x.d);
  }
  mul(x: Q): Q {
    return new Q(this.n * x.n, this.d * x.d);
  }
  div(x: Q): Q {
    return new Q(this.n * x.d, this.d * x.n);
  }
  neg(): Q {
    return new Q(-this.n, this.d);
  }
  sq(): Q {
    return this.mul(this);
  }
  cmp(x: Q): number {
    const n = this.n * x.d - x.n * this.d;
    return n < BigInt(0) ? -1 : n > BigInt(0) ? 1 : 0;
  }
  eq(x: Q): boolean {
    return this.cmp(x) === 0;
  }
  toString(): string {
    return this.d === BigInt(1) ? String(this.n) : `${this.n}/${this.d}`;
  }
}
export const q = (n: number, d = 1) => new Q(n, d);
export type ExactPoint = readonly [Q, Q];
export const pointText = (p: ExactPoint) => `(${p[0]}, ${p[1]})`;
export const samePoint = (a: ExactPoint, b: ExactPoint) =>
  a[0].eq(b[0]) && a[1].eq(b[1]);
export const norm = (p: ExactPoint) => p[0].sq().add(p[1].sq());
export const determinant = (a: ExactPoint, b: ExactPoint, c: ExactPoint) =>
  b[0]
    .sub(a[0])
    .mul(c[1].sub(a[1]))
    .sub(b[1].sub(a[1]).mul(c[0].sub(a[0])));

/** Gaussian elimination, also used for the Vandermonde reconstruction. */
export function linearSolve(
  matrix: readonly (readonly Q[])[],
  rhs: readonly Q[],
): Q[] {
  const n = rhs.length,
    m = matrix.map((row, i) => [...row, rhs[i]!]);
  for (let col = 0; col < n; col++) {
    const pivot = m.findIndex((row, i) => i >= col && !row[col]!.eq(q(0)));
    if (pivot < 0) throw new Error("독립 조건 부족 또는 퇴화");
    [m[col], m[pivot]] = [m[pivot]!, m[col]!];
    const value = m[col]![col]!;
    m[col] = m[col]!.map((x) => x.div(value));
    for (let row = 0; row < n; row++)
      if (row !== col) {
        const factor = m[row]![col]!;
        m[row] = m[row]!.map((x, j) => x.sub(factor.mul(m[col]![j]!)));
      }
  }
  return m.map((row) => row[n]!);
}

/** The center is computed from three printed points, not symmetry metadata. */
export function circumcenter(
  a: ExactPoint,
  b: ExactPoint,
  c: ExactPoint,
): ExactPoint {
  if (determinant(a, b, c).eq(q(0)))
    throw new Error("중복점 또는 공선: 외접원 없음");
  const center = linearSolve(
    [
      [b[0].sub(a[0]).mul(q(2)), b[1].sub(a[1]).mul(q(2))],
      [c[0].sub(a[0]).mul(q(2)), c[1].sub(a[1]).mul(q(2))],
    ],
    [norm(b).sub(norm(a)), norm(c).sub(norm(a))],
  );
  return [center[0]!, center[1]!];
}

function integerSqrt(n: bigint): bigint {
  if (n < BigInt(0)) throw new Error("음수 제곱근");
  if (n < BigInt(2)) return n;
  let x = n,
    y = (x + BigInt(1)) / BigInt(2);
  while (y < x) {
    x = y;
    y = (x + n / x) / BigInt(2);
  }
  return x;
}
export function exactSqrt(x: Q): Q {
  const n = integerSqrt(x.n),
    d = integerSqrt(x.d);
  if (n * n !== x.n || d * d !== x.d)
    throw new Error("저작 유한 영역 밖의 무리수 후보");
  return new Q(n, d);
}
export function polynomial(cs: readonly Q[], x: Q): Q {
  return cs.reduce((value, c) => value.mul(x).add(c), q(0));
}

export type Interval = readonly [Q, Q];
export const interval = {
  add(a: Interval, b: Interval): Interval {
    return [a[0].add(b[0]), a[1].add(b[1])];
  },
  neg(a: Interval): Interval {
    return [a[1].neg(), a[0].neg()];
  },
  sub(a: Interval, b: Interval): Interval {
    return this.add(a, this.neg(b));
  },
  mul(a: Interval, b: Interval): Interval {
    const values = [
      a[0].mul(b[0]),
      a[0].mul(b[1]),
      a[1].mul(b[0]),
      a[1].mul(b[1]),
    ].sort((x, y) => x.cmp(y));
    return [values[0]!, values[3]!];
  },
  div(a: Interval, b: Interval): Interval {
    if (b[0].cmp(q(0)) <= 0 && b[1].cmp(q(0)) >= 0)
      throw new Error("구간 분모가 0 포함");
    return this.mul(a, [q(1).div(b[1]), q(1).div(b[0])]);
  },
  polynomial(cs: readonly Q[], x: Interval): Interval {
    return cs.reduce<Interval>(
      (value, c) => this.add(this.mul(value, x), [c, c]),
      [q(0), q(0)],
    );
  },
};

/** Exact sign bracket plus strict monotonicity proves exactly one real root.
 * At the zero endpoint, p'(x)=x(4x²+2B)+C<0 for x>0 is checked separately. */
export function isolateRoot(cs: readonly Q[], initial: Interval): Interval {
  let [lo, hi] = initial;
  const deriv = cs.slice(0, -1).map((c, i) => c.mul(q(cs.length - 1 - i)));
  const d = interval.polynomial(deriv, [lo, hi]);
  const decreasingAtZero =
    lo.eq(q(0)) &&
    cs.length === 5 &&
    cs[1]!.eq(q(0)) &&
    hi
      .sq()
      .mul(q(4))
      .add(cs[2]!.mul(q(2)))
      .cmp(q(0)) < 0 &&
    cs[3]!.cmp(q(0)) <= 0;
  if (!(d[0].cmp(q(0)) > 0 || d[1].cmp(q(0)) < 0 || decreasingAtZero))
    throw new Error("구간 단조성 미증명");
  let sign = polynomial(cs, lo).cmp(q(0));
  if (sign * polynomial(cs, hi).cmp(q(0)) >= 0)
    throw new Error("근 부호 구간 없음");
  for (let i = 0; i < 44; i++) {
    const mid = lo.add(hi).div(q(2)),
      s = polynomial(cs, mid).cmp(q(0));
    if (s === 0) return [mid, mid];
    if (s === sign) {
      lo = mid;
      sign = s;
    } else hi = mid;
  }
  return [lo, hi];
}
