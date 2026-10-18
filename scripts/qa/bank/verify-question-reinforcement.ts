/** Independent solvers consume displayed tasks and actual SVG, never generator facts/answers.
 * Reuses the existing independently authored G4/native text oracles without editing frozen R2/R5 files.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { parseProblemContent } from "../../../src/lib/problem/parseProblemContent";
import {
  parseNativeExternalId,
  serializeNativeSolution,
} from "../../../src/contracts/nativeDescriptive.contract";
import { generateNativeDescriptive } from "../../../src/lib/engine/nativeDescriptive20261018";
import { generateMiddleProblem } from "../../../src/lib/middle/generate";
import { isProblemEligible } from "../../../src/lib/problemEligibility";
import { solveBlind } from "../../../docs/planning/tracks/reports/math-bank-reinforcement-20261018/m3-independent";
import {
  valueDigest,
  payloadDigest,
  payloadOf,
  type DatabaseRow,
} from "../../import/protected-question-maintenance";
import {
  contentKey,
  dbPairRow,
  type BoundedTarget,
  type Candidate,
} from "../../import/bounded-question-reinforcement";

/** Exact source table has five entries; do not refill it with tasks already stored in the unit. */
export function finiteDomainShortfallEvidence(
  scope: readonly DatabaseRow[],
  targets: readonly BoundedTarget[],
) {
  const target = targets.find(
    (row) => row.familyKey === "mid:1-2|다면체와 회전체|51",
  );
  assert(target);
  const seen = new Map<
    string,
    {
      contentKey: string;
      faceSides: number;
      facesAtVertex: number;
      independentlyComputedFaces: number;
      alreadyStored: boolean;
      existingRows: { id: string; familyKey: unknown; payloadSha256: string }[];
    }
  >();
  for (let variant = 0; variant < 300; variant++) {
    const generated = generateMiddleProblem(
      target.generatorKey,
      20261018,
      variant,
    );
    const shape = /면의 모양이 (정삼각형|정사각형|정오각형)/.exec(
      generated.content,
    );
    const facesAtVertex = Number(
      /면의 개수가 \$(\d+)\$/.exec(generated.content)?.[1],
    );
    assert(shape && facesAtVertex >= 3);
    const sides = (
      { 정삼각형: 3, 정사각형: 4, 정오각형: 5 } as Record<string, number>
    )[shape[1]!]!;
    const expectedFaces = 2 / (sides / facesAtVertex - sides / 2 + 1); // Euler and incidence equations.
    assert(Math.abs(expectedFaces - Math.round(expectedFaces)) < 0.001);
    assert.equal(
      Number(generated.answer.replace(/\$/g, "")),
      Math.round(expectedFaces),
    );
    const key = contentKey(
      { content: generated.content, figureSvg: null, figureUrls: [] },
      false,
    );
    const matches = scope.filter(
      (row) =>
        row.unit_id === target.unitId &&
        isProblemEligible({
          pool: String(row.pool),
          reviewStatus: String(row.review_status),
          directUseAllowed: row.direct_use_allowed === true,
          answer: String(row.answer),
        }) &&
        contentKey(dbPairRow(row), false) === key,
    );
    seen.set(key, {
      contentKey: key,
      faceSides: sides,
      facesAtVertex,
      independentlyComputedFaces: Math.round(expectedFaces),
      alreadyStored: matches.length > 0,
      existingRows: matches.map((row) => ({
        id: row.id,
        familyKey: row.family_key,
        payloadSha256: payloadDigest(payloadOf(row)),
      })),
    });
  }
  assert.equal(seen.size, 5);
  assert([...seen.values()].every((row) => row.alreadyStored));
  return {
    readOnly: true,
    familyKey: target.familyKey,
    source: "src/lib/middle/midSupB.ts PLATONIC_SUPPLEMENTS mode1",
    finiteSourceTableRows: 5,
    generatedObservations: 300,
    observedDistinctContents: seen.size,
    allFiniteSourceContentsAlreadyInUnit: true,
    contents: [...seen.values()],
  };
}

const matcher = (actual: unknown, negate = false) => {
  const check = (valid: boolean) =>
    assert(negate ? !valid : valid, "Independent text oracle assertion failed");
  return {
    get not() {
      return matcher(actual, !negate);
    },
    toBe: (value: unknown) => check(Object.is(actual, value)),
    toHaveLength: (n: number) =>
      check((actual as { length: number }).length === n),
    toContain: (value: unknown) =>
      check(
        typeof actual === "string"
          ? actual.includes(String(value))
          : (actual as unknown[]).includes(value),
      ),
    toBeGreaterThan: (n: number) => check(Number(actual) > n),
    toBeLessThan: (n: number) => check(Number(actual) < n),
    toBeTruthy: () => check(Boolean(actual)),
    toEqual: (value: unknown) => {
      if (value && typeof value === "object" && "arrayContaining" in value)
        check(
          (value as { arrayContaining: unknown[] }).arrayContaining.every(
            (item) => (actual as unknown[]).includes(item),
          ),
        );
      else {
        let same = true;
        try {
          assert.deepEqual(actual, value);
        } catch {
          same = false;
        }
        check(same);
      }
    },
    toBeCloseTo: (n: number, digits = 2) =>
      check(Math.abs(Number(actual) - n) < 10 ** -digits * 1.01),
  };
};
const independentExpect = Object.assign(matcher, {
  arrayContaining: (values: unknown[]) => ({ arrayContaining: values }),
});
function extractedOracle(
  file: string,
  names: readonly string[],
): Record<string, (...args: never[]) => unknown> {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const snippets: string[] = [];
  const found = new Set<string>();
  for (const statement of source.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      names.includes(statement.name.text)
    ) {
      snippets.push(statement.getText(source));
      found.add(statement.name.text);
    }
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations)
        if (
          ts.isIdentifier(declaration.name) &&
          names.includes(declaration.name.text)
        ) {
          snippets.push(`const ${declaration.getText(source)};`);
          found.add(declaration.name.text);
        }
  }
  assert.equal(
    found.size,
    names.length,
    "Independent oracle source declarations changed",
  );
  const js = ts.transpileModule(snippets.join("\n"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText;
  return vm.runInNewContext(
    `${js}\n({${names.join(",")}})`,
    { expect: independentExpect },
    { timeout: 10_000 },
  ) as Record<string, (...args: never[]) => unknown>;
}
const g4 = extractedOracle(
  "src/__tests__/unit/elementaryReinforcement20261018.test.tsx",
  [
    "ints",
    "cms",
    "degrees",
    "length",
    "vector",
    "cross",
    "solve",
    "answerValues",
  ],
);
const native = extractedOracle(
  "src/__tests__/unit/nativeDescriptive20261018.test.ts",
  ["plain", "solveFromQuestion", "checkNumericEquations"],
);
const call = <T>(
  oracle: Record<string, (...args: never[]) => unknown>,
  name: string,
  ...args: unknown[]
): T => oracle[name]!(...(args as never[])) as T;
const formulas = (text: string) =>
  [...text.matchAll(/\$([^$]+)\$/g)].map((match) => match[1]!);
const numbers = (text: string) =>
  formulas(text)
    .map((value) => Number(/^(-?\d+(?:\.\d+)?)/.exec(value)?.[1]))
    .filter(Number.isFinite);
const tags = (svg: string, tag: string) =>
  [...svg.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, "g"))].map((match) =>
    Object.fromEntries(
      [...match[1]!.matchAll(/([\w-]+)="([^"]*)"/g)].map((attr) => [
        attr[1]!,
        attr[2]!,
      ]),
    ),
  );
const near = (a: number, b: number) => Math.abs(a - b) < 0.02;
type Range = {
  from: number | null;
  to: number | null;
  fromIn: boolean;
  toIn: boolean;
};
function actualRange(svg: string): Range {
  const ticks = tags(svg, "g")
    .filter(
      (tag) =>
        /^-?\d+(?:\.\d+)?$/.test(tag["data-label"] ?? "") &&
        tag["data-x"] !== undefined,
    )
    .map((tag) => ({
      value: Number(tag["data-label"]),
      x: Number(tag["data-x"]),
    }))
    .sort((a, b) => a.x - b.x);
  assert(ticks.length >= 2);
  const scale =
    (ticks[1]!.value - ticks[0]!.value) / (ticks[1]!.x - ticks[0]!.x);
  const value = (x: number) => {
    const v = ticks[0]!.value + (x - ticks[0]!.x) * scale;
    assert(near(v, Math.round(v)));
    return Math.round(v);
  };
  for (const tick of ticks) assert(near(value(tick.x), tick.value));
  const lines = tags(svg, "line").filter((tag) => tag.stroke === "#a8432f");
  assert.equal(lines.length, 1);
  const line = lines[0]!;
  const circles = tags(svg, "circle").filter((tag) => tag.stroke === "#a8432f");
  assert(circles.length >= 1 && circles.length <= 2);
  const from = circles.find((circle) =>
    near(Number(circle.cx), Number(line.x1)),
  );
  const to = circles.find((circle) => near(Number(circle.cx), Number(line.x2)));
  return {
    from: from ? value(Number(from.cx)) : null,
    to: to ? value(Number(to.cx)) : null,
    fromIn: from?.fill === "#a8432f",
    toIn: to?.fill === "#a8432f",
  };
}
const contains = (range: Range, n: number) =>
  (range.from === null || (range.fromIn ? n >= range.from : n > range.from)) &&
  (range.to === null || (range.toIn ? n <= range.to : n < range.to));
function spanOption(text: string): Range {
  const range: Range = { from: null, to: null, fromIn: false, toIn: false };
  for (const match of text.matchAll(/\$(-?\d+)\$ (이상|초과|이하|미만)/g)) {
    if (["이상", "초과"].includes(match[2]!)) {
      range.from = Number(match[1]);
      range.fromIn = match[2] === "이상";
    } else {
      range.to = Number(match[1]);
      range.toIn = match[2] === "이하";
    }
  }
  assert(range.from !== null || range.to !== null);
  return range;
}
function solveG5(
  content: string,
  svg: string,
  originalMc: boolean,
): { expected: number | string; evidence: unknown } {
  const parsed = parseProblemContent(content),
    q = parsed.question,
    range = actualRange(svg);
  if (originalMc) {
    const matches = parsed.choices
      .map(spanOption)
      .map((option) => valueDigest(option) === valueDigest(range));
    assert.equal(matches.filter(Boolean).length, 1);
    return {
      expected: "①②③④⑤"[matches.indexOf(true)]!,
      evidence: { range, truth: matches },
    };
  }
  assert(range.from !== null && range.to !== null);
  if (q.includes("자연수는 모두 몇 개")) {
    const hits = Array.from(
      { length: range.to! - range.from! + 1 },
      (_, i) => range.from! + i,
    ).filter((n) => n > 0 && contains(range, n));
    return { expected: hits.length, evidence: { range, hits } };
  }
  if (q.includes("키가")) {
    const values = formulas(q)[0]!.replace(/\\ /g, "").split(",").map(Number);
    assert.equal(values.length, 5);
    assert(values.every(Number.isFinite));
    return {
      expected: values.filter((value) => contains(range, value)).length,
      evidence: { range, values },
    };
  }
  const scale = q.includes("백의 자리") ? 100 : 10;
  const values = Array.from(
    { length: range.to! - range.from! + 1 },
    (_, i) => range.from! + i,
  ).filter((n) => n > 0 && contains(range, n));
  const rounded = values.map((n) =>
    q.includes("반올림")
      ? Math.floor(n / scale + 0.5) * scale
      : q.includes("버림")
        ? Math.floor(n / scale) * scale
        : Math.ceil(n / scale) * scale,
  );
  assert.equal(new Set(rounded).size, 1);
  return {
    expected: rounded[0]!,
    evidence: { range, scale, naturalNumbersChecked: values.length },
  };
}
const permutations = (items: number[], length = items.length): number[][] =>
  length === 0
    ? [[]]
    : items.flatMap((item, i) =>
        permutations(
          items.filter((_, j) => i !== j),
          length - 1,
        ).map((tail) => [item, ...tail]),
      );
const combinations = (n: number, r: number) =>
  permutations(
    Array.from({ length: n }, (_, i) => i),
    r,
  ).filter((row) => row.every((value, i) => i === 0 || value > row[i - 1]!));
type P3 = [number, number, number];
const subtract = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a: P3, b: P3): P3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot3 = (a: P3, b: P3) =>
  a.reduce((sum, value, i) => sum + value * b[i]!, 0);
const edgesOfPrism = (n: number) => {
  const pts: P3[] = Array.from({ length: 2 * n }, (_, i) => [
    Math.cos((2 * Math.PI * (i % n)) / n),
    Math.sin((2 * Math.PI * (i % n)) / n),
    Math.floor(i / n),
  ]);
  return {
    pts,
    edges: [
      ...Array.from({ length: n }, (_, i) => [i, (i + 1) % n]),
      ...Array.from({ length: n }, (_, i) => [i + n, ((i + 1) % n) + n]),
      ...Array.from({ length: n }, (_, i) => [i, i + n]),
    ],
  };
};
function solveMiddle(
  key: string,
  content: string,
  svg: string | null,
): { expected: number; evidence: unknown } {
  const q = parseProblemContent(content).question,
    ns = numbers(q),
    id = key.split("|").at(-1)!;
  if (key.includes("|기본 도형|65X")) {
    const poq = /\\angle POQ=(\d+)\^/.exec(q),
      boc = /\\angle BOC=(\d+)\^/.exec(q),
      cod = /\\angle COD=(\d+)\^/.exec(q);
    const possible = new Set<number>();
    for (let b = 1; b < 179; b++)
      for (let a = 1; a < 180 - b; a++) {
        const c = 180 - a - b;
        const angle = a / 2 + b + c / 2;
        if (poq && near(angle, Number(poq[1]))) possible.add(b);
        else if (
          !poq &&
          boc &&
          b === Number(boc[1]) + (cod ? Number(cod[1]) : 0)
        )
          possible.add(angle);
      }
    assert.equal(possible.size, 1);
    return {
      expected: [...possible][0]!,
      evidence: { integerCompletionsHaveOneRequestedValue: true },
    };
  }
  if (key.includes("|다각형|70")) {
    const n = Array.from({ length: 98 }, (_, i) => i + 3).filter(
      (n) => (n - 2) * 180 === ns[0],
    );
    assert.equal(n.length, 1);
    const pairs = combinations(n[0]!, 2).filter(
      ([a, b]) => b !== a! + 1 && !(a === 0 && b === n[0]! - 1),
    );
    return {
      expected: pairs.length,
      evidence: { n: n[0], diagonalPairs: pairs },
    };
  }
  if (key.includes("|위치 관계|")) {
    const ko: Record<string, number> = {
      삼: 3,
      사: 4,
      오: 5,
      육: 6,
      칠: 7,
      팔: 8,
      구: 9,
      십: 10,
      십일: 11,
      십이: 12,
    };
    if (id === "69X") {
      const k = ns[0]!,
        solutions: number[] = [];
      for (let n = 3; n <= k; n++) {
        const pts: P3[] = Array.from({ length: n }, (_, i) => [
          Math.cos((2 * Math.PI * i) / n),
          Math.sin((2 * Math.PI * i) / n),
          0,
        ]);
        pts.push([0, 0, 1]);
        let count = 0;
        for (let i = 0; i < n; i++)
          for (let j = 0; j < n; j++) {
            const u = subtract(pts[(i + 1) % n]!, pts[i]!),
              v = subtract(pts[n]!, pts[j]!);
            if (Math.abs(dot3(subtract(pts[j]!, pts[i]!), cross3(u, v))) > 1e-7)
              count++;
          }
        if (count === k) solutions.push(n);
      }
      assert.equal(solutions.length, 1);
      const n = solutions[0]!;
      return {
        expected: q.includes("모서리의 개수와")
          ? 3 * n + 1
          : q.includes("꼭짓점의 개수")
            ? n + 1
            : 2 * n,
        evidence: { geometricPyramidSolutions: solutions, skewPairs: k },
      };
    }
    const name = /^(십이|십일|십|구|팔|칠|육|오|사|삼)각기둥/.exec(q);
    assert(name);
    const n = ko[name[1]!]!,
      { pts, edges } = edgesOfPrism(n),
      reference = id === "72" ? [0, n] : [0, 1];
    const u = subtract(pts[reference[1]!]!, pts[reference[0]!]!);
    const valid = edges.filter(([a, b]) => {
      if (a === reference[0] && b === reference[1]) return false;
      const v = subtract(pts[b!]!, pts[a!]!),
        cross = cross3(u, v);
      return id === "72"
        ? Math.hypot(...cross) < 1e-7
        : Math.abs(dot3(subtract(pts[a!]!, pts[reference[0]!]!), cross)) > 1e-7;
    });
    return {
      expected: valid.length,
      evidence: { prismBaseSides: n, validEdgePairs: valid },
    };
  }
  assert(key.includes("|경우의 수|"));
  if (id === "01") {
    if (q.includes("카드")) {
      const hits = Array.from({ length: ns[1]! }, (_, i) => i + 1).filter(
        (n) => n % ns.at(-1)! === 0,
      );
      return { expected: hits.length, evidence: { hits } };
    }
    const pairs = permutations([1, 2, 3, 4, 5, 6], 1)
      .flatMap(([a]) => [1, 2, 3, 4, 5, 6].map((b) => [a!, b]))
      .filter(([a, b]) =>
        q.includes("차가") ? Math.abs(a! - b!) === ns[0] : a! + b! === ns[0],
      );
    return { expected: pairs.length, evidence: { dicePairs: pairs } };
  }
  if (id === "08") {
    const n = ns[0]!,
      all = permutations(
        Array.from({ length: n }, (_, i) => i),
        q.includes("뽑아") ? ns[1]! : n,
      ),
      valid = q.includes("A 가")
        ? all.filter((row) => row[ns[1]! - 1] === 0)
        : all;
    return { expected: valid.length, evidence: { enumerated: all.length } };
  }
  if (id === "09") {
    const n = ns[0]!,
      g = q.startsWith("A, B, C") ? 3 : 2,
      valid = permutations(Array.from({ length: n }, (_, i) => i)).filter(
        (row) => {
          const positions = Array.from({ length: g }, (_, i) => row.indexOf(i));
          return Math.max(...positions) - Math.min(...positions) === g - 1;
        },
      );
    return {
      expected: valid.length,
      evidence: { blockMembers: g, fullPermutationsEnumerated: true },
    };
  }
  if (id === "10" || id === "11") {
    const lo = ns[0]!,
      hi = ns[1]!,
      r = ns[3]!,
      all = permutations(
        Array.from({ length: hi - lo + 1 }, (_, i) => lo + i),
        r,
      );
    const values = all
      .filter((digits) => digits[0] !== 0)
      .map((digits) => Number(digits.join("")))
      .filter((n) =>
        q.includes("홀수")
          ? n % 2 === 1
          : q.includes("짝수")
            ? n % 2 === 0
            : q.includes("배수")
              ? n % 5 === 0
              : true,
      );
    return {
      expected: values.length,
      evidence: { allOrderedDigitTasks: all.length, validNumbers: values },
    };
  }
  if (id === "12") {
    const n = ns[0]!,
      roles = q.includes("총무") ? 3 : 2;
    return {
      expected: permutations(
        Array.from({ length: n }, (_, i) => i),
        roles,
      ).length,
      evidence: { orderedRoles: roles },
    };
  }
  if (id === "13") {
    const n = ns[0]!;
    return {
      expected: q.includes("부대표")
        ? n * combinations(n - 1, 2).length
        : combinations(n, q.includes("악수") ? 2 : ns[1]!).length,
      evidence: { unorderedPeopleEnumerated: true },
    };
  }
  if (id === "14") {
    if (q.includes("평행한 두 직선")) {
      const p = ns[0]!,
        r = ns[1]!,
        pts = Array.from({ length: p + r }, (_, i) =>
          i < p ? [i, 0] : [i - p, 1],
        );
      const triangles = combinations(pts.length, 3).filter(([a, b, c]) => {
        const pa = pts[a!]!,
          pb = pts[b!]!,
          pc = pts[c!]!;
        return (
          (pb[0]! - pa[0]!) * (pc[1]! - pa[1]!) -
            (pb[1]! - pa[1]!) * (pc[0]! - pa[0]!) !==
          0
        );
      });
      return { expected: triangles.length, evidence: { triangles } };
    }
    return {
      expected: combinations(ns[0]!, q.includes("선분") ? 2 : 3).length,
      evidence: { circleSubsetsEnumerated: true },
    };
  }
  if (id === "15") {
    assert(
      svg && q.includes("모두 다른 색"),
      "Exact prepared coloring task must use its independently supported all-different rule",
    );
    const regionCount = new Set(
      tags(svg, "path")
        .map((tag) => tag["data-region"])
        .filter(Boolean),
    ).size;
    const colors = ns[0]!;
    assert(regionCount >= 3);
    const assignments = permutations(
      Array.from({ length: colors }, (_, i) => i),
      regionCount,
    );
    return {
      expected: assignments.length,
      evidence: {
        actualSvgRegions: regionCount,
        colors,
        allDistinctAssignmentsEnumerated: true,
      },
    };
  }
  if (id === "16") {
    assert(svg);
    const m = ns[0]!,
      n = ns[1]!,
      lines = tags(svg, "line"),
      xs = [
        ...new Set(
          lines
            .filter((line) => line.x1 === line.x2)
            .map((line) => Number(line.x1)),
        ),
      ].sort((a, b) => a - b),
      ys = [
        ...new Set(
          lines
            .filter((line) => line.y1 === line.y2)
            .map((line) => Number(line.y1)),
        ),
      ].sort((a, b) => b - a);
    assert.equal(xs.length, m + 1);
    assert.equal(ys.length, n + 1);
    const positions = Object.fromEntries(
      tags(svg, "g")
        .filter((tag) => ["A", "B", "P"].includes(tag["data-label"] ?? ""))
        .map((tag) => [
          tag["data-label"],
          [
            xs.findIndex((x) => near(x, Number(tag["data-px"]))),
            ys.findIndex((y) => near(y, Number(tag["data-py"]))),
          ],
        ]),
    );
    assert.deepEqual(positions.A, [0, 0]);
    assert.deepEqual(positions.B, [m, n]);
    const ways = (x: number, y: number) => {
      const dp = Array.from(
        { length: y + 1 },
        () => Array(x + 1).fill(0) as number[],
      );
      dp[0]![0] = 1;
      for (let row = 0; row <= y; row++)
        for (let col = 0; col <= x; col++)
          if (row || col)
            dp[row]![col] =
              (row ? dp[row - 1]![col]! : 0) + (col ? dp[row]![col - 1]! : 0);
      return dp[y]![x]!;
    };
    const p = positions.P;
    return {
      expected: p
        ? ways(p[0]!, p[1]!) * ways(m - p[0]!, n - p[1]!)
        : ways(m, n),
      evidence: {
        actualSvgGrid: [m, n],
        via: p ?? null,
        dynamicPathCount: true,
      },
    };
  }
  if (id === "90") {
    const valid = permutations([0, 1, 2, 3, 4]).filter(
      (row) =>
        Math.abs(row.indexOf(1) - row.indexOf(2)) === 1 &&
        row.indexOf(4) < row.indexOf(0),
    );
    assert(q.includes("B$와 $C") && q.includes("E$가 $A"));
    return {
      expected: valid.length,
      evidence: { all120PermutationsEnumerated: true },
    };
  }
  if (id === "114X") {
    const N = ns[1]!,
      p = ns[3]!,
      r = ns[4]!;
    const hits = Array.from({ length: N }, (_, i) => i + 1).filter(
      (n) => n % p !== 0 && n % r !== 0,
    );
    return {
      expected: hits.length,
      evidence: { N, divisors: [p, r], enumeratedNaturalNumbers: true },
    };
  }
  throw new Error(`Missing independent prepared-task solver: ${key}`);
}

export async function verifyCandidateTasks(
  rows: readonly Candidate[],
  targets: readonly BoundedTarget[],
) {
  const proofs = [];
  for (const row of rows) {
    const target = targets.find(
      (target) =>
        target.familyKey === row.familyKey && target.unitId === row.unitId,
    );
    assert(target);
    const parsed = parseProblemContent(row.content);
    let expected: unknown, evidence: unknown;
    if (target.engine === "native-descriptive") {
      const parts = parseNativeExternalId(row.externalId);
      assert(parts);
      const values = call<string[]>(
          native,
          "solveFromQuestion",
          parts.definitionId,
          row.content,
        ),
        answer = call<string>(native, "plain", row.answer);
      for (const value of values)
        if (value.startsWith("(x")) {
          const factors = (text: string) =>
            [...text.matchAll(/\(x([+-]\d+)\)/g)]
              .map((match) => Number(match[1]))
              .sort((a, b) => a - b);
          assert.deepEqual(factors(answer), factors(value));
        } else
          assert(
            answer.includes(value),
            "Native answer fails independent text proof",
          );
      const source = generateNativeDescriptive(
        parts.definitionId,
        parts.seed,
        parts.variant,
      );
      assert.equal(source.content, row.content);
      assert.equal(source.answer, row.answer);
      assert.equal(source.solution, row.solution);
      assert.equal(
        serializeNativeSolution(source.modelAnswer, source.rubric),
        row.solution,
      );
      assert.equal(
        source.rubric.criteria.reduce((n, c) => n + c.points, 0),
        6,
      );
      assert(
        source.rubric.criteria.every(
          (c) => c.alternatives.length && c.errors.length,
        ),
      );
      call(native, "checkNumericEquations", source.modelAnswer);
      expected = values;
      evidence = {
        nativeRubricPoints: 6,
        criteria: source.rubric.criteria.map((c) => ({
          id: c.criterionId,
          points: c.points,
          alternatives: c.alternatives.length,
          errors: c.errors.length,
        })),
        modelNumericEquationsChecked: true,
      };
    } else if (
      target.engine === "middle" &&
      row.familyKey.startsWith("mid:manual-20261018")
    ) {
      const sourceMc = target.nativeChoiceConditions;
      const result = solveBlind(
        target.generatorKey,
        sourceMc ? row.content : parsed.question,
      );
      expected = result.expected;
      evidence = result.evidence;
      if (sourceMc) assert.equal(row.answer, expected);
      else {
        const actual =
          row.questionType === "객관식"
            ? parsed.choices["①②③④⑤".indexOf(row.answer)]
            : row.answer;
        assert.equal(actual, String(expected));
      }
    } else {
      if (target.engine === "elem" && target.grade === "초4") {
        expected = call<number[]>(
          g4,
          "solve",
          parsed.question,
          target.generatorKey,
        );
        evidence = { independentOriginalTextOracle: true };
      } else if (target.engine === "elem") {
        assert(row.figureSvg);
        const result = solveG5(
          row.content,
          row.figureSvg,
          target.nativeChoiceConditions,
        );
        expected = result.expected;
        evidence = result.evidence;
      } else {
        const result = solveMiddle(
          target.generatorKey,
          row.content,
          row.figureSvg,
        );
        expected = result.expected;
        evidence = result.evidence;
      }
      if (target.nativeChoiceConditions) {
        assert.equal(row.answer, expected);
      } else {
        const actual =
          row.questionType === "객관식"
            ? parsed.choices["①②③④⑤".indexOf(row.answer)]
            : row.answer;
        assert(actual);
        const values =
          target.grade === "초4"
            ? call<number[]>(g4, "answerValues", actual, target.generatorKey)
            : numbers(actual);
        assert.deepEqual(
          Array.from(values),
          Array.isArray(expected) ? Array.from(expected) : [expected],
          `Independent answer mismatch: ${row.externalId}`,
        );
        if (row.questionType === "객관식") {
          const matches = parsed.choices.filter((choice) => {
            const nums =
              target.grade === "초4"
                ? call<number[]>(
                    g4,
                    "answerValues",
                    choice,
                    target.generatorKey,
                  )
                : numbers(choice);
            return (
              valueDigest(Array.from(nums)) ===
              valueDigest(
                Array.isArray(expected) ? Array.from(expected) : [expected],
              )
            );
          });
          assert.equal(
            matches.length,
            1,
            "MC must have exactly one independently valid answer",
          );
        }
      }
    }
    proofs.push({
      externalId: row.externalId,
      familyKey: row.familyKey,
      format: row.questionType,
      payloadSha256: valueDigest([
        row.content,
        row.answer,
        row.solution,
        row.figureSvg,
      ]),
      expectedAnswerSha256: valueDigest(expected),
      independentAnswerCorresponds: true,
      uniqueRequestedAnswer: row.questionType !== "서술형",
      nativeRubricAllowsAlternativeReasoning: row.questionType === "서술형",
      actualFigureChecked: row.figureSvg !== null,
      evidence,
    });
  }
  return { rows: proofs.length, allIndependentAnswersCorrespond: true, proofs };
}
