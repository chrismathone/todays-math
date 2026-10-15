import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { FUNCTIONS_DATA_DEFINITIONS as definitions } from "../../lib/arithmetic-v2/families/functionsData";
import {
  answer,
  q,
  root,
} from "../../lib/arithmetic-v2/families/functionsData/core";
import type {
  ArithmeticV2Answer,
  ArithmeticV2Candidate,
} from "../../lib/arithmetic-v2/types";

// This oracle imports no domain tables, problem solvers, or verifier predicates.
// It checks exact cross products and explicitly enumerates labeled sample spaces.
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const integers = (lo: number, hi: number) =>
  Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
const divisor = (a: number, b: number): number =>
  b ? divisor(b, a % b) : Math.abs(a);
function rational(a: ArithmeticV2Answer, n: number, d = 1) {
  assert.ok(a.kind === "integer" || a.kind === "rational");
  const [N, D = 1] = a.exact.map(Number);
  assert.ok(N * d === n * D);
  assert.ok(D > 0);
  assert.equal(divisor(N, D), 1);
  assert.equal(a.kind, D === 1 ? "integer" : "rational");
  assert.equal(a.exact.length, D === 1 ? 1 : 2);
}
function polynomial(a: ArithmeticV2Answer, values: [number, number][]) {
  assert.equal(a.kind, "polynomial");
  assert.equal(a.exact.length, values.length * 2);
  values.forEach(([n, d], i) => {
    const N = Number(a.exact[2 * i]),
      D = Number(a.exact[2 * i + 1]);
    assert.ok(N * d === n * D);
    assert.ok(D > 0);
    assert.equal(divisor(N, D), 1);
  });
}
function signedSquare(
  a: ArithmeticV2Answer,
  n: number,
  d: number,
  sign: number,
) {
  const fields = a.exact.map(Number);
  const [N, R, D] = a.kind === "surd" ? fields : [fields[0], 1, fields[1] ?? 1];
  assert.ok(["integer", "rational", "surd"].includes(a.kind));
  assert.equal(Math.sign(N), n === 0 ? 0 : sign);
  assert.equal(N * N * R * d, n * D * D);
  if (a.kind === "surd") {
    assert.ok(R > 1 && D > 0);
    assert.equal(divisor(N, D), 1);
    for (let k = 2; k * k <= R; k++) assert.notEqual(R % (k * k), 0);
  }
}
function tuples(n: number, k: number, replace: boolean): number[][] {
  const result: number[][] = [];
  const visit = (p: number[]) => {
    if (p.length === k) {
      result.push(p);
      return;
    }
    for (let i = 0; i < n; i++) if (replace || !p.includes(i)) visit([...p, i]);
  };
  visit([]);
  return result;
}
function probabilityOracle(
  id: string,
  p: number[],
): [number, number] | undefined {
  const [a, b, c, d] = p;
  let space: number[][], predicate: (v: number[]) => boolean;
  let count = id.endsWith("-count") || id.startsWith("m2-fd-count-");
  if (id === "m2-fd-count-addition")
    return [
      new Set([
        ...integers(1, a).map((x) => `notebook-${x}`),
        ...integers(1, b).map((x) => `pencil-${x}`),
      ]).size,
      1,
    ];
  if (id === "m2-fd-count-product") {
    space = integers(1, a).flatMap((x) => integers(1, b).map((y) => [x, y]));
    predicate = () => true;
  } else if (id === "m2-fd-count-seating") {
    space = tuples(a, b, false);
    predicate = () => true;
  } else if (id === "m2-fd-count-pair") {
    space = tuples(a, 2, false);
    predicate = ([x, y]) => x < y;
  } else if (id.startsWith("m2-fd-count-digits-")) {
    space = tuples(a, b, false);
    predicate = (v) => id.endsWith("nonzero") || v[0] !== 0;
  } else if (id.startsWith("m2-fd-coin-")) {
    space = tuples(2, a, true);
    predicate = (v) =>
      id.endsWith("complement") ? v.some(Boolean) : sum(v) === b;
  } else if (id.startsWith("m2-fd-single-die-")) {
    space = integers(1, 6).map((x) => [x]);
    predicate = ([x]) => (id.endsWith("above") ? x > a : x % a === 0);
  } else if (id.startsWith("m2-fd-two-dice-")) {
    space = integers(1, 6).flatMap((x) => integers(1, 6).map((y) => [x, y]));
    predicate = ([x, y]) =>
      id.includes("sum-at-least")
        ? x + y >= a
        : id.includes("product-multiple")
          ? (x * y) % a === 0
          : id.includes("at-least-one-face")
            ? x === a || y === a
            : id.includes("difference")
              ? Math.abs(x - y) === a
              : x + y === a;
  } else if (id.startsWith("m2-fd-card-")) {
    space = integers(1, a).map((x) => [x]);
    predicate = ([x]) => x % b === 0 || (id.endsWith("union") && x % c === 0);
  } else if (id === "m2-fd-balls-three-exact") {
    space = tuples(a + b, 3, true);
    predicate = (v) => v.filter((x) => x < a).length === c;
  } else if (id.startsWith("m2-fd-balls-")) {
    space = tuples(a + b, 2, !id.includes("no-replace"));
    predicate = ([x, y]) =>
      id.endsWith("both-red")
        ? x < a && y < a
        : id.endsWith("different")
          ? x < a !== y < a
          : x < a || y < a;
  } else if (id === "m2-fd-independent-different-bags") {
    space = integers(0, a + b - 1).flatMap((x) =>
      integers(0, c + d - 1).map((y) => [x, y]),
    );
    predicate = ([x, y]) => x < a && y < c;
  } else return;
  // Distinct identities remain distinct even when their observed colors agree.
  assert.equal(new Set(space.map((v) => v.join(","))).size, space.length);
  count = Boolean(count);
  return [space.filter(predicate).length, count ? 1 : space.length];
}
function oracle(id: string, p: number[], a: ArithmeticV2Answer) {
  const prob = probabilityOracle(id, p);
  if (prob) {
    rational(a, ...prob);
    return;
  }
  const [x, y, z, w, t] = p;
  const check = (n: number, d = 1) => rational(a, n, d);
  if (id.startsWith("m1-fd-reflect-")) {
    const coord = id.endsWith("-x") ? 0 : 1;
    const negative =
      id.includes("origin") ||
      (id.includes("reflect-x-") ? coord === 1 : coord === 0);
    check(p[coord] * (negative ? -1 : 1));
  } else if (id.startsWith("m1-fd-distance-"))
    check(Math.abs(id.includes("distance-x") ? y : x));
  else if (
    id === "m1-fd-horizontal-distance" ||
    id === "m1-fd-vertical-distance"
  )
    check(Math.abs(x + y - x));
  else if (/^m1-fd-(direct|inverse)-/.test(id)) {
    if (id.endsWith("constant")) check(x, y);
    else if (id.endsWith("input")) check(z);
    else if (id.includes("inverse")) check(x, y * z);
    else check(x * z, y);
  } else if (id === "m2-fd-linear-translation")
    polynomial(a, [
      [x, 1],
      [y - x * z + w, 1],
    ]);
  else if (id.startsWith("m2-fd-linear-"))
    check(
      id.endsWith("value")
        ? x * z + y
        : id.endsWith("input")
          ? z
          : id.endsWith("coefficient")
            ? x
            : y,
    );
  else if (id === "m2-fd-two-points-slope") check(y + w - y, x + z - x);
  else if (id === "m2-fd-two-points-equation")
    polynomial(a, [
      [w, z],
      [y * z - w * x, z],
    ]);
  else if (id.startsWith("m2-fd-change-"))
    check(id.endsWith("slope") ? x : id.endsWith("y-change") ? x * y : y);
  else if (id === "m2-fd-x-intercept") check(-y, x);
  else if (id === "m2-fd-y-intercept") check(y);
  else if (id === "m2-fd-slope-point-equation")
    polynomial(a, [
      [x, 1],
      [x * z + y - x * z, 1],
    ]);
  else if (id === "m2-fd-intercepts-equation")
    polynomial(a, [
      [-y, x],
      [y, 1],
    ]);
  else if (id === "m2-fd-parallel-coefficient") check(x);
  else if (id.startsWith("m2-fd-implicit-")) {
    if (id.endsWith("slope")) check(-x, y);
    else if (id.endsWith("x-intercept")) check(z, x);
    else check(z, y);
  } else if (id === "m2-fd-intersection-x") check(w - z, x - y);
  else if (id === "m2-fd-intersection-y") check(x * w - y * z, x - y);
  else if (id === "m3-fd-quadratic-value") check((x * w + y) * w + z);
  else if (id === "m3-fd-quadratic-vertex-value") check(x * w * w + z);
  else if (id === "m3-fd-quadratic-coefficient")
    check(x * w * w + z - z, w * w);
  else if (id === "m3-fd-quadratic-translation")
    polynomial(a, [
      [x, 1],
      [y - 2 * x * w, 1],
      [(x * w - y) * w + z + t, 1],
    ]);
  else if (id.includes("quadratic-expand-")) {
    if (id.endsWith("equation"))
      polynomial(a, [
        [x, 1],
        [-2 * x * y, 1],
        [x * y * y + z, 1],
      ]);
    else check(id.endsWith("-b") ? -2 * x * y : x * y * y + z);
  } else if (id.includes("quadratic-integer-root-"))
    check(id.endsWith("smaller") ? Math.min(y, z) : Math.max(y, z));
  else if (id.includes("quadratic-radical-root-"))
    signedSquare(a, y, 1, id.endsWith("negative") ? -1 : 1);
  else if (id === "m3-fd-quadratic-tangent-root") check(y);
  else if (id.startsWith("m3-fd-quadratic-")) {
    if (id.endsWith("y-intercept")) check(z);
    else if (
      id.endsWith("vertex-x") ||
      id.endsWith("axis") ||
      id.endsWith("form-p")
    )
      check(-y, 2 * x);
    else check(4 * x * z - y * y, 4 * x);
  } else if (id.includes("-data-")) {
    if (id.endsWith("variance") || id.endsWith("deviation")) {
      const xs = [x + 3 * y, x, x + 4 * y + z, x + y, x + 2 * y],
        N = xs.length,
        S = sum(xs),
        sq = sum(xs.map((v) => (N * v - S) ** 2));
      if (id.endsWith("standard-deviation")) signedSquare(a, sq, N ** 3, 1);
      else if (id.endsWith("variance")) check(sq, N ** 3);
      else check(N * xs[0] - S, N);
    } else if (id.endsWith("even-median")) check(x + y + (x + 2 * y + z), 2);
    else if (id.endsWith("mode")) {
      const xs = [x + y, x, x + 2 * y, x, x],
        counts = new Map<number, number>();
      xs.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
      check([...counts].sort((a, b) => b[1] - a[1])[0][0]);
    } else if (id.endsWith("missing-mean"))
      check(5 * x + 10 * y + z - (x + (x + y) + (x + 3 * y) + (x + 4 * y)));
    else {
      const xs = [x + 3 * y, x, x + 4 * y + z, x + y, x + 2 * y].sort(
        (a, b) => a - b,
      );
      check(
        id.endsWith("mean")
          ? sum(xs)
          : id.endsWith("median")
            ? xs[2]
            : xs.at(-1)! - xs[0],
        id.endsWith("mean") ? 5 : 1,
      );
    }
  } else if (id.startsWith("m1-fd-frequency-")) {
    if (id.endsWith("total")) check(x + y + z);
    else if (id.endsWith("combined")) check(y + z);
    else if (id.endsWith("missing")) check(x + y + z - x - z);
    else check(y * (id.endsWith("percent") ? 100 : 1), x + y + z);
  } else if (id.startsWith("m1-fd-relative-inverse-"))
    check(id.endsWith("count") ? y : x);
  else if (id === "m1-fd-class-midpoint") check(5 * x + (5 * x + y), 2);
  else if (id === "m1-fd-discrete-frequency-mean") {
    const xs = [
      ...Array(z).fill(x),
      ...Array(w).fill(x + y),
      ...Array(t).fill(x + 2 * y),
    ];
    check(sum(xs), xs.length);
  } else if (id === "m1-fd-stem-leaf-median")
    check([10 * x + y, 10 * x + z, 10 * x + w].sort((a, b) => a - b)[1]);
  else if (id === "m3-fd-missing-deviation") check(-(-y - z + y));
  else if (id.startsWith("m3-fd-transformed-")) {
    if (id.endsWith("mean")) check(z * x + w);
    else if (id.endsWith("standard-deviation"))
      signedSquare(a, z * z * y, 1, 1);
    else check(z * z * y);
  } else if (
    ["m3-fd-deviation", "m3-fd-variance", "m3-fd-standard-deviation"].includes(
      id,
    )
  ) {
    const xs = [x - y, x - z, x + y, x + z],
      N = xs.length,
      S = sum(xs);
    if (id.endsWith("fd-deviation")) check(N * xs[0] - S, N);
    else {
      const sq = sum(xs.map((v) => (N * v - S) ** 2));
      if (id.endsWith("standard-deviation")) signedSquare(a, sq, N ** 3, 1);
      else check(sq, N ** 3);
    }
  } else assert.fail(`Oracle missing ${id}`);
}

describe("functions and data direct calculations", () => {
  it("exhausts every finite task with independent exact oracles and unique complete prompts", () => {
    const ids = new Set<string>();
    let tasks = 0;
    for (const def of definitions) {
      assert.ok(!ids.has(def.id));
      ids.add(def.id);
      assert.ok(def.domainSize > 0 && Number.isSafeInteger(def.domainSize));
      assert.deepEqual(Object.keys(def.curriculum!).sort(), [
        "semester",
        "unit",
      ]);
      assert.equal(def.curriculum!.semester, def.strand === "함수" ? 1 : 2);
      assert.ok(def.curriculum!.unit && def.title);
      const prompts = new Set<string>(),
        parameters = new Set<string>();
      for (let i = 0; i < def.domainSize; i++) {
        const c = def.problemAt(i),
          where = `${def.id} #${i} ${c.parameters}`;
        assert.ok(def.verify(c), where);
        assert.equal(c.prompt.layout, "math");
        if (c.prompt.layout !== "math") assert.fail();
        assert.ok(c.prompt.text && c.prompt.latex && c.prompt.instruction);
        assert.ok(!/undefined|NaN|Infinity|\+\-|−-/.test(c.prompt.text), where);
        assert.equal(c.prompt.figureId, undefined);
        const prompt = JSON.stringify(c.prompt),
          key = c.parameters.join(",");
        assert.ok(!prompts.has(prompt), `Duplicate prompt ${where}`);
        prompts.add(prompt);
        assert.ok(!parameters.has(key), `Duplicate parameters ${where}`);
        parameters.add(key);
        c.answer.exact.forEach((n) => assert.match(n, /^(0|-?[1-9]\d*)$/));
        try {
          oracle(def.id, c.parameters, c.answer);
        } catch (error) {
          throw new Error(where, { cause: error });
        }
        const reordered = {
          answer: Object.fromEntries(Object.entries(c.answer).reverse()),
          prompt: Object.fromEntries(Object.entries(c.prompt).reverse()),
          parameters: [...c.parameters],
        } as ArithmeticV2Candidate;
        assert.ok(def.verify(reordered), `${where} property order`);
        const wrong = structuredClone(c);
        if (c.answer.kind === "surd") {
          const [n, r, d] = c.answer.exact.map(Number);
          wrong.answer = answer(root(-n, r, d));
        } else if (c.answer.kind === "polynomial") {
          const ns = c.answer.exact.map(Number),
            cs = Array.from({ length: ns.length / 2 }, (_, j) =>
              q(ns[2 * j], ns[2 * j + 1]),
            );
          cs[cs.length - 1][0] += cs[cs.length - 1][1];
          wrong.answer = answer(cs, cs.length === 2 ? "line" : "quadratic");
        } else {
          const [n, d = 1] = c.answer.exact.map(Number);
          wrong.answer = answer(q(n + d, d));
        }
        assert.equal(def.verify(wrong), false, `${where} wrong numeric answer`);
        tasks++;
      }
    }
    assert.ok(tasks > 0);
  }, 120000);

  it("rejects altered prompts, parameters, answers, indexes and malformed canonical encodings", () => {
    for (const def of definitions) {
      for (const index of [-1, def.domainSize, NaN, Infinity, 1.5])
        assert.throws(() => def.problemAt(index));
      for (const i of [
        ...new Set([0, Math.floor(def.domainSize / 2), def.domainSize - 1]),
      ]) {
        const c = def.problemAt(i);
        const mutate = (f: (v: ArithmeticV2Candidate) => void) => {
          const v = structuredClone(c);
          f(v);
          assert.equal(def.verify(v), false, `${def.id} mutation`);
        };
        mutate((v) => {
          v.parameters[0] = 999999;
        });
        mutate((v) => {
          v.parameters[0] = NaN;
        });
        mutate((v) => {
          v.parameters[0] = -0;
        });
        mutate((v) => {
          delete v.parameters[0];
        });
        mutate((v) => {
          v.parameters.push(0);
        });
        mutate((v) => {
          v.prompt.instruction = "다른 물음";
        });
        mutate((v) => {
          if (v.prompt.layout === "math") v.prompt.text += " (변경)";
        });
        mutate((v) => {
          v.answer.text += " ";
        });
        mutate((v) => {
          v.answer.latex += " ";
        });
        mutate((v) => {
          v.answer.exact[0] = "01";
        });
        mutate((v) => {
          v.answer.exact[0] = "-0";
        });
        mutate((v) => {
          v.answer.exact[0] = "1e2";
        });
        mutate((v) => {
          v.answer.exact[0] = "10000000000000000";
        });
        mutate((v) => {
          v.answer.exact.push("0");
        });
        mutate((v) => {
          v.answer = answer(q(999999));
        });
        const reordered = {
          answer: Object.fromEntries(Object.entries(c.answer).reverse()),
          prompt: Object.fromEntries(Object.entries(c.prompt).reverse()),
          parameters: [...c.parameters],
        } as ArithmeticV2Candidate;
        assert.ok(def.verify(reordered), `${def.id} property order`);
        // Returning a mutable candidate cannot mutate the definition's source.
        c.parameters[0] = 999999;
        c.answer.exact[0] = "999999";
        assert.ok(def.verify(def.problemAt(i)));
      }
    }
  });

  it("enforces root signs, square-free radicals and reduced coefficient tuples", () => {
    let signedRoots = 0,
      nonnegativeRoots = 0,
      rationals = 0,
      polynomials = 0;
    for (const def of definitions) {
      // Find the first noninteger representation, not just the first task.
      let checkedRational = false,
        checkedSurd = false,
        checkedPolynomial = false;
      for (let i = 0; i < def.domainSize; i++) {
        const c = def.problemAt(i);
        if (c.answer.kind === "rational" && !checkedRational) {
          const v = structuredClone(c);
          v.answer.exact = v.answer.exact.map((x) => String(Number(x) * 2));
          assert.equal(def.verify(v), false);
          checkedRational = true;
          rationals++;
        }
        if (c.answer.kind === "polynomial" && !checkedPolynomial) {
          const v = structuredClone(c);
          v.answer.exact[0] = String(Number(v.answer.exact[0]) * 2);
          v.answer.exact[1] = String(Number(v.answer.exact[1]) * 2);
          assert.equal(def.verify(v), false);
          checkedPolynomial = true;
          polynomials++;
        }
        if (c.answer.kind === "surd" && !checkedSurd) {
          const [n, r, d] = c.answer.exact.map(Number),
            opposite = structuredClone(c);
          opposite.answer = answer(root(-n, r, d));
          assert.equal(def.verify(opposite), false, def.id);
          const unreduced = structuredClone(c);
          unreduced.answer.exact = [String(n), String(r * 4), String(d * 2)];
          assert.equal(def.verify(unreduced), false);
          checkedSurd = true;
          if (def.id.includes("radical-root")) signedRoots++;
          else nonnegativeRoots++;
        }
        if (checkedRational || checkedPolynomial || checkedSurd) break;
      }
    }
    assert.ok(
      signedRoots >= 2 &&
        nonnegativeRoots >= 2 &&
        rationals > 0 &&
        polynomials > 0,
    );
  });

  it("keeps all approved units explicit and covers zero/one probability and variance sign", () => {
    const units = new Set(
      definitions.map(
        (d) => `${d.grade}/${d.curriculum!.semester}/${d.curriculum!.unit}`,
      ),
    );
    assert.deepEqual(
      [...units].sort(),
      [
        "중1/1/그래프와 비례관계",
        "중1/2/자료의 정리와 해석",
        "중2/1/일차함수와 일차방정식의 관계",
        "중2/1/일차함수의 그래프",
        "중2/2/확률과 그 기본 성질",
        "중3/1/이차함수와 그래프",
        "중3/2/통계",
      ].sort(),
    );
    const noReplace = definitions.find(
      (d) => d.id === "m2-fd-balls-no-replace-both-red",
    )!;
    assert.deepEqual(noReplace.problemAt(0).answer.exact, ["0"]);
    const different = definitions.find(
      (d) => d.id === "m2-fd-balls-no-replace-different",
    )!;
    assert.deepEqual(different.problemAt(0).answer.exact, ["1"]);
    assert.ok(
      definitions
        .find((d) => d.id === "m3-fd-transformed-standard-deviation")!
        .problemAt(0).parameters[2] < 0,
    );
  });
});
