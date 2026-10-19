/** Run: tsx --test scripts/qa/arithmetic-elementary-complete.test.ts */
import assert from "node:assert/strict";
import { test } from "node:test";
import katex from "katex";
import { ELEMENTARY_COMPLETE_DEFINITIONS as definitions } from "../../src/lib/arithmetic-v2/families/elementaryComplete";
import {
  complete,
  grid,
  integerAnswer,
  math,
} from "../../src/lib/arithmetic-v2/families/elementaryComplete/core";
import {
  arithmeticV2CandidateSchema,
  arithmeticV2PromptIdentity,
} from "../../src/contracts/arithmeticV2.contract";
import type { ArithmeticV2Candidate } from "../../src/lib/arithmetic-v2/types";

type Q = [bigint, bigint];
const q = (n: number | bigint, d: number | bigint = 1): Q => [
  BigInt(n),
  BigInt(d),
];
const gcd = (a: number, b: number) => {
  let d = Math.min(a, b);
  while (a % d || b % d) d--;
  return d;
};
const rounded = (a: number, b: number, mode: string) => {
  const quotient = Math.trunc(a / b),
    remainder = a % b;
  return (
    quotient +
    (mode === "up"
      ? Number(remainder !== 0)
      : mode === "nearest"
        ? Number(remainder * 2 >= b)
        : 0)
  );
};

/** Independent test oracle. Does not import any generator/check arithmetic helper. */
function oracle(id: string, p: number[]): Q {
  const key = id.replace(/^ec-/, "").replace(/-v1$/, "");
  const [a, b, c, d, e] = p;
  if (key === "g3-multiply-two-by-one") return q(a * b);
  if (key === "g3-fraction-whole") return q(c * b * a, b);
  if (key === "g3-fraction-amount") return q(c * a * b, a);
  if (
    key === "g3-fraction-part-representation" ||
    key === "g3-unit-fraction-amount"
  )
    return q(b, a);
  if (key === "g3-unit-fraction-count") return q(a * b);
  if (key === "g3-unit-fraction-count-in-fraction") return q(a);
  if (key === "g3-improper-to-mixed" || key === "g3-mixed-to-improper")
    return q(a * c + b, c);
  if (key.startsWith("g3-tenths-")) return q(a, 10);
  if (key.startsWith("g3-unit-")) {
    const factor = key.includes("hour-second")
      ? 3600
      : key.includes("kg")
        ? 1000
        : 60;
    return q(key.endsWith("-large") ? a : a * factor);
  }
  if (key.startsWith("g3-compound-")) {
    const factor = key.includes("hour") || key.includes("minute") ? 60 : 1000;
    return q(
      key.endsWith("to-small")
        ? a * factor + b
        : key.endsWith("large-blank")
          ? a
          : b,
    );
  }
  if (
    /^g3-(hour-minute|minute-second|capacity|mass)-(sum|difference)$/.test(key)
  ) {
    const factor = key.includes("hour") || key.includes("minute") ? 60 : 1000;
    return q(
      a * factor + b + (key.endsWith("difference") ? -1 : 1) * (c * factor + d),
    );
  }
  if (key === "g3-elapsed-time") return q(c);
  if (key === "g4-large-place-value") return q(a * 10 ** b);
  if (key.startsWith("g4-large-unit-"))
    return q(key.endsWith("count") ? b : b * 10 ** a);
  if (key.startsWith("g4-large-scale-"))
    return key.endsWith("down")
      ? q(a * 10 ** b, 10 ** c)
      : q(BigInt(a) * BigInt(10 ** b) * BigInt(10 ** c));
  if (key === "g4-large-skip-count") return q(a * 10 ** b + c * 10 ** b);
  if (key === "g4-decimal-place-value") return q(a, 10 ** b);
  if (key === "g4-decimal-place-count") return q(c * 10 ** b + a);
  if (key.startsWith("g4-decimal-scale-"))
    return key.endsWith("down") ? q(a, 10 * 10 ** b) : q(a * 10 ** b, 10);
  if (/^g4-pattern-(divide|subtract)-/.test(key)) {
    const at = key.endsWith("missing") ? 1 : 0;
    return q(key.includes("divide") ? a * b ** at : a + b * at);
  }
  if (key.startsWith("g4-pattern-")) {
    let value = a;
    for (let i = 0; i < (key.endsWith("missing") ? 2 : 3); i++)
      value = key.includes("multiply") ? value * b : value + b;
    return q(value);
  }
  if (key.startsWith("g5-four-operations-"))
    return q(
      key.endsWith("brackets")
        ? ((a + b) * c - d * c) / c
        : key.endsWith("parentheses")
          ? (a + b) * c - (d * e) / d
          : a + b * c - (d * e) / d,
    );
  if (key.startsWith("g5-divisor-")) {
    let result = 0;
    for (let i = 1; i <= a; i++)
      if (a % i === 0) result += key.endsWith("sum") ? i : 1;
    return q(result);
  }
  if (key === "g5-gcd") return q(gcd(a, b));
  if (key === "g5-lcm") {
    let multiple = a;
    while (multiple % b) multiple += a;
    return q(multiple);
  }
  if (key === "g5-multiple-count") {
    let count = 0;
    for (let i = a; i <= a * b + 1; i += a) count++;
    return q(count);
  }
  if (key === "g5-multiple-nth") return q(a * b);
  if (key === "g5-reduce-fraction") return q(a * c, b * c);
  if (key.startsWith("g5-equivalent-fraction-"))
    return q((key.endsWith("denominator") ? b : a) * c);
  if (key.startsWith("g5-common-")) {
    let common = a;
    while (common % b) common += a;
    return q(key.endsWith("numerator") ? common / a : common);
  }
  if (key === "g5-fraction-to-decimal") return q(a, b);
  if (key === "g5-decimal-to-fraction") return q(a, 100);
  if (key === "g5-range-integer-count") {
    let count = 0;
    for (let i = a; i <= a + b; i++)
      if ((!c || i > a) && (!d || i < a + b)) count++;
    return q(count);
  }
  if (key.startsWith("g5-round-decimal-"))
    return q(rounded(a, 10 ** (3 - b), key.split("-").at(-1)!), 10 ** b);
  if (key.startsWith("g5-round-"))
    return q(rounded(a, 10 ** b, key.split("-").at(-1)!) * 10 ** b);
  if (key.startsWith("g5-correspondence-"))
    return q(key.endsWith("input") ? (a * c + b - b) / a : a * c + b);
  if (key === "g6-ratio-value" || key === "g6-fraction-to-percent")
    return q(key.endsWith("percent") ? a * 100 : a, b);
  if (key.startsWith("g6-percent-to-")) return q(a, 100);
  if (key === "g6-decimal-to-percent") return q(a);
  if (key === "g6-percent-part") return q(20 * a * 5 * b, 100);
  if (key === "g6-percent-whole") return q(a * b * 100, 5 * b);
  if (key === "g6-percent-rate") return q(a * b * 100, 20 * a);
  if (key.startsWith("g6-simplest-ratio-")) {
    const x = a * d,
      y = c * b;
    return q((e === 0 ? x : y) / gcd(x, y));
  }
  if (key === "g6-proportion-blank")
    return q(
      d === 0
        ? (b * a * c) / (b * c)
        : d === 1
          ? (a * b * c) / (a * c)
          : d === 2
            ? (a * b * c) / b
            : (b * a * c) / a,
    );
  if (key === "g6-distribution-part") return q((a + b) * c * a, a + b);
  if (key === "g6-distribution-whole") return q(a * c * (a + b), a);
  if (key === "g6-rounded-quotient")
    return q(rounded(a * 10 ** c, b, "nearest"), 10 ** c);
  if (key.startsWith("g6-decimal-sharing-")) {
    let left = a,
      count = 0;
    while (left >= b) {
      left -= b;
      count++;
    }
    return key.endsWith("count") ? q(count) : q(left, 10);
  }
  if (/^g[34]-(?:bar-)?data-/.test(key))
    return q(
      (key.endsWith("total")
        ? a + (a + b) + (a + b + c)
        : key.endsWith("difference")
          ? a + b + c - a
          : 3 * a + 2 * b + c - a - (a + b)) * (key.startsWith("g4") ? 10 : 1),
    );
  if (key === "g3-pictogram-quantity") return q(a * b + c);
  if (key.startsWith("g4-line-data-")) return q(b);
  if (key === "g5-average") return q(a + (a + b) + (a + 2 * b + 3 * c), 3);
  if (key === "g5-average-total") return q(a * b);
  if (key === "g5-average-missing") return q(c * 3 - a - b);
  if (key === "g6-chart-count") return q(20 * a * 5 * b, 100);
  if (key === "g6-chart-percent")
    return q(a * b * 100, a * b + a * c + (20 - b - c) * a);
  if (key === "g6-chart-missing-percent") return q(100 - b * 5 - c * 5);
  throw new Error(`Missing independent oracle: ${id}`);
}
function exact(candidate: ArithmeticV2Candidate): Q {
  const a = candidate.answer;
  return [
    BigInt(a.exact[0]),
    a.kind === "integer"
      ? BigInt(1)
      : a.kind === "rational"
        ? BigInt(a.exact[1])
        : BigInt(10 ** Number(a.exact[1])),
  ];
}

test("every finite candidate has an independently correct exact answer, unique parameters/prompt and valid schema", () => {
  const identities = new Map<string, string>();
  let count = 0;
  for (const def of definitions) {
    assert.ok(def.curriculum?.unit && [1, 2].includes(def.curriculum.semester));
    const parameters = new Set<string>();
    for (let i = 0; i < def.domainSize; i++) {
      const candidate = def.problemAt(i),
        label = `${def.id}:${i}`;
      const [n, d] = oracle(def.id, candidate.parameters),
        [x, y] = exact(candidate);
      assert.equal(x * d, n * y, label);
      assert.ok(def.verify(candidate), label);
      assert.ok(
        arithmeticV2CandidateSchema.safeParse(candidate).success,
        label,
      );
      const p = JSON.stringify(candidate.parameters),
        identity = arithmeticV2PromptIdentity(candidate.prompt);
      assert.ok(!parameters.has(p), `${label}: duplicate parameters`);
      assert.ok(
        !identities.has(identity),
        `${label}: duplicate of ${identities.get(identity)}`,
      );
      parameters.add(p);
      identities.set(identity, label);
      count++;
    }
  }
  console.log(
    JSON.stringify({
      types: definitions.length,
      candidates: count,
      byGrade: Object.fromEntries(
        ["초3", "초4", "초5", "초6"].map((g) => [
          g,
          definitions.filter((d) => d.grade === g).length,
        ]),
      ),
    }),
  );
});

test("all families reject malformed inputs, wrong answers/prompts, unsafe values and invalid indices without mutation", () => {
  const reverse = (o: object) =>
    Object.fromEntries(Object.entries(o).reverse());
  for (const def of definitions)
    for (const index of new Set([
      0,
      Math.floor(def.domainSize / 2),
      def.domainSize - 1,
    ])) {
      const original = def.problemAt(index);
      for (const badIndex of [
        -1,
        -0,
        0.5,
        NaN,
        Infinity,
        def.domainSize,
        Number.MAX_SAFE_INTEGER,
      ])
        assert.throws(() => def.problemAt(badIndex), RangeError);
      const frozen = structuredClone(original);
      Object.freeze(frozen.parameters);
      Object.freeze(frozen.prompt);
      Object.freeze(frozen.answer.exact);
      Object.freeze(frozen.answer);
      Object.freeze(frozen);
      assert.ok(def.verify(frozen));
      assert.ok(
        def.verify({
          answer: reverse(original.answer),
          prompt: reverse(original.prompt),
          parameters: original.parameters,
        } as ArithmeticV2Candidate),
      );
      const reject = (mutate: (c: ArithmeticV2Candidate) => void) => {
        const c = structuredClone(original);
        mutate(c);
        const before = JSON.stringify(c);
        assert.equal(def.verify(c), false, def.id);
        assert.equal(JSON.stringify(c), before);
      };
      reject((c) => {
        c.answer.exact[0] = String(Number(c.answer.exact[0]) + 1);
      });
      for (const invalid of [
        "-0",
        "01",
        "1.0",
        "1e3",
        "NaN",
        "Infinity",
        "9007199254740992",
        "9".repeat(100),
      ])
        reject((c) => {
          c.answer.exact[0] = invalid;
        });
      for (const invalid of [
        -0,
        NaN,
        Infinity,
        0.5,
        Number.MAX_SAFE_INTEGER,
        -1,
      ])
        reject((c) => {
          c.parameters[0] = invalid;
        });
      reject((c) => {
        delete c.parameters[0];
      });
      reject((c) => {
        c.parameters.push(1);
      });
      reject((c) => {
        c.answer.exact.push("1");
      });
      reject((c) => {
        delete c.answer.exact[0];
      });
      if (original.answer.kind !== "integer") {
        reject((c) => {
          c.answer.exact[1] = "-1";
        });
        reject((c) => {
          c.answer.exact[1] = "9007199254740992";
        });
      }
      reject((c) => {
        c.answer.text += "x";
      });
      reject((c) => {
        c.answer.latex += "x";
      });
      reject((c) => {
        c.answer.kind = c.answer.kind === "integer" ? "decimal" : "integer";
      });
      reject((c) => {
        c.prompt.instruction += " changed";
      });
      reject((c) => {
        if (c.prompt.layout === "math") c.prompt.latex += "+1";
      });
      reject((c) => {
        Object.assign(c, { unexpected: 1 });
      });
      reject((c) => {
        Object.assign(c.prompt, { unexpected: 1 });
      });
      reject((c) => {
        Object.assign(c.answer, { unexpected: 1 });
      });
      for (const malformed of [
        null,
        undefined,
        [],
        {},
        { parameters: null },
        {
          parameters: original.parameters,
          prompt: null,
          answer: original.answer,
        },
      ])
        assert.equal(
          def.verify(malformed as unknown as ArithmeticV2Candidate),
          false,
        );
      assert.deepEqual(def.problemAt(index), original);
    }
});

test("verify is independent of problemAt, domain.at and calculate", () => {
  let generating = true;
  const dom = grid([[2, 12]]),
    at = dom.at;
  dom.at = (i) => {
    assert.ok(generating);
    return at(i);
  };
  const def = complete({
    key: "test-independent",
    grade: "초3",
    semester: 1,
    unit: "곱셈",
    strand: "자연수",
    title: "test",
    description: "test",
    domain: dom,
    prompt: ([n]) => math(`${n} × 2`, `${n}\\times2`, "계산하세요."),
    calculate: ([n]) => {
      assert.ok(generating);
      return integerAnswer(n * 2);
    },
    holds: ([n], a) =>
      a / BigInt(2) === BigInt(n) && a % BigInt(2) === BigInt(0),
  });
  const candidate = def.problemAt(4);
  generating = false;
  def.problemAt = () => {
    throw new Error("must not generate in verify");
  };
  assert.ok(def.verify(candidate));
});

test("requested fraction and rounded display forms are explicit and independently enforced", () => {
  for (const def of definitions.filter((d) =>
    /g3-(mixed|improper|tenths-fraction|fraction-part|unit-fraction-amount)|round/.test(
      d.id,
    ),
  )) {
    let tested = false;
    for (let i = 0; i < def.domainSize; i++) {
      const candidate = def.problemAt(i);
      if (candidate.answer.kind === "integer") continue;
      const [n, d] = exact(candidate),
        alternative = `${n}/${d}`;
      if (alternative === candidate.answer.text) continue;
      assert.match(
        candidate.prompt.instruction ?? "",
        /분모|대분수|가분수|자리/,
      );
      candidate.answer.text = alternative;
      candidate.answer.latex = `\\frac{${n}}{${d}}`;
      assert.equal(def.verify(candidate), false, def.id);
      tested = true;
      break;
    }
    if (/round/.test(def.id) && def.problemAt(0).answer.kind === "decimal") {
      assert.match(def.problemAt(0).prompt.instruction ?? "", /0도 쓰세요/);
      assert.ok(tested, def.id);
    }
  }
  for (const def of definitions.filter(
    (d) => d.problemAt(0).answer.kind === "rational",
  )) {
    const c = def.problemAt(0);
    c.answer.exact = c.answer.exact.map((s) => String(Number(s) * 2));
    assert.equal(def.verify(c), false, `${def.id}: nonreduced exact`);
  }
});

test("all prompt/answer shapes render in KaTeX and first-semester grade 3 fraction tasks remain proper", () => {
  let renders = 0;
  for (const def of definitions)
    for (const i of new Set([
      0,
      1,
      Math.floor(def.domainSize / 2),
      def.domainSize - 1,
    ])) {
      const c = def.problemAt(i);
      if (c.prompt.layout === "math") {
        const latex = c.prompt.latex;
        assert.doesNotThrow(
          () =>
            katex.renderToString(latex, {
              throwOnError: true,
              strict: "ignore",
            }),
          def.id,
        );
        renders++;
      }
      assert.doesNotThrow(
        () =>
          katex.renderToString(c.answer.latex, {
            throwOnError: true,
            strict: "ignore",
          }),
        def.id,
      );
      renders++;
    }
  for (const def of definitions.filter(
    (d) => d.grade === "초3" && d.curriculum?.unit === "분수와 소수",
  ))
    for (let i = 0; i < def.domainSize; i++) {
      const [n, d] = exact(def.problemAt(i));
      assert.ok(n < d, def.id);
    }
  console.log(JSON.stringify({ katexRenders: renders }));
});
