import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import katex from "katex";
import { afterAll, describe, expect, it } from "vitest";
import type {
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { familyCoverage, verifyDraft } from "@/lib/examStudy/evidence";
import { MIDDLE_REMAINING_FAMILIES } from "@/lib/examStudy/families/middle/remaining";
import { generateExamStudy } from "@/lib/examStudy/generate";
import { contentDigest, logicalKey } from "@/lib/examStudy/identity";

const families = MIDDLE_REMAINING_FAMILIES;
const capture = (text: string, re: RegExp) => {
  const m = re.exec(text);
  expect(m, text).not.toBeNull();
  return m!;
};
const all = (f: ExamStudyFamily) => {
  if (f.paramDomain.kind !== "finite")
    throw new Error("finite domain required");
  return Array.from({ length: f.paramDomain.size }, (_, i) => f.generate(0, i));
};
const family = (demand: string) =>
  families.find((f) => f.fulfills[0].requirement === demand)!;
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const B = BigInt;
type Rat = { n: bigint; d: bigint };
const rat = (s: string | number): Rat => {
  const [n, d = "1"] = String(s).split("/");
  return { n: B(n), d: B(d) };
};
const mul = (a: Rat, b: Rat): Rat => ({ n: a.n * b.n, d: a.d * b.d });
const sub = (a: Rat, b: Rat): Rat => ({
  n: a.n * b.d - b.n * a.d,
  d: a.d * b.d,
});
const compare = (a: Rat, b: Rat) => {
  const x = a.n * b.d - b.n * a.d;
  return x < B(0) ? -1 : x > B(0) ? 1 : 0;
};
const value = (a: Rat) => Number(a.n) / Number(a.d);
const area = (A: [Rat, Rat], P: [Rat, Rat]): Rat => {
  const determinant = sub(mul(A[0], P[1]), mul(A[1], P[0]));
  return {
    n: determinant.n < B(0) ? -determinant.n : determinant.n,
    d: B(2) * determinant.d,
  };
};
const records: Record<string, unknown>[] = [];
const generation: Record<string, unknown>[] = [];

/** These oracles accept only printed task, answer and solution; no parameters or author helpers. */
function printedDoubling(text: string, answer: string, solution: string) {
  expect(text).toContain("첫 증가는 관찰 시작으로부터 정확히 한 주기가 지난 순간에 일어난다.");
  const m = capture(text, /A가 (\d+)개, B가 (\d+)개이고 공통 주기는 (\d+)분/);
  const [A, C, period] = m.slice(1).map(Number);
  const known = capture(
    text,
    /([AB])가 목표에 처음 도달하는 시각은 관찰 시작 후 \$t\$시간/,
  )[1];
  const result = capture(answer, /^60t([+-]\d+) 분$/);
  const offset = Number(result[1]);
  const hits = (initial: number, target: number) => {
    const rows = [{ time: 0, population: initial }];
    while (rows.at(-1)!.population < target) {
      const last = rows.at(-1)!;
      rows.push({ time: last.time + period, population: 2 * last.population });
    }
    expect(rows.at(-1)!.population).toBe(target);
    return rows.at(-1)!.time;
  };
  for (let power = 1; power <= 5; power++) {
    const target = Math.max(A, C) * 2 ** power;
    const at = hits(A, target),
      bt = hits(C, target);
    const knownMinutes = known === "A" ? at : bt,
      otherMinutes = known === "A" ? bt : at;
    // t=knownMinutes/60 hours, so evaluating 60t is exactly knownMinutes minutes.
    expect(knownMinutes + offset).toBe(otherMinutes);
    expect(otherMinutes).toBeGreaterThan(0);
    expect(at % period).toBe(0);
    expect(bt % period).toBe(0);
  }
  const row = capture(solution, /반복 두 배 표는 ([\d →]+)이다/)[1]
    .split(" → ")
    .map(Number);
  expect(row[0]).toBe(Math.min(A, C));
  expect(row.at(-1)).toBe(Math.max(A, C));
  row.slice(1).forEach((n, i) => expect(n).toBe(2 * row[i]));
  expect(Math.abs(offset)).toBe(period * (row.length - 1));
  expect(solution).not.toMatch(/log|로그/);
  return {
    commonTargetsChecked: 5,
    offsetMinutes: offset,
    repeatedDoublingTable: row,
  };
}

function printedCircle(text: string, answer: string, solution: string) {
  const m = capture(text, /지름은 (\d+) cm이고 새 바퀴의 반지름은 (\d+) cm/);
  const [diameter, radius] = m.slice(1).map(Number),
    newDiameter = 2 * radius;
  // A separate integer common-distance construction yields whole revolution counts.
  const distanceInPi = (diameter * newDiameter) / gcd(diameter, newDiameter);
  const oldTurns = distanceInPi / diameter,
    newTurns = distanceInPi / newDiameter;
  expect(newTurns).toBeGreaterThan(oldTurns);
  const scaledIncrease = B(newTurns - oldTurns) * B(1000),
    denominator = B(oldTurns);
  // Find the nearest tenth by exact rational rounding intervals, including ties upwards.
  let units = B(0);
  while (B(2) * scaledIncrease >= (B(2) * units + B(1)) * denominator) units++;
  const expected = `${units / B(10)}.${units % B(10)}%`;
  expect(answer).toBe(expected);
  const exact = rat(capture(solution, /×100=([-\d/]+)\$ %/)[1]);
  expect(
    compare(exact, { n: B(100) * B(newTurns - oldTurns), d: B(oldTurns) }),
  ).toBe(0);
  const ratio = rat(
    capture(solution, /새 회전수\/원래 회전수=\$([\d/]+)\$/)[1],
  );
  expect(compare(ratio, { n: B(newTurns), d: B(oldTurns) })).toBe(0);
  expect(solution).toContain(`새 지름은 $2×${radius}=${newDiameter}$`);
  return {
    commonDistanceInPi: distanceInPi,
    oldTurns,
    newTurns,
    exactIncrease: `${exact.n}/${exact.d}`,
    roundedPercent: expected,
  };
}

function printedCoprime(text: string, answer: string, solution: string) {
  const m = capture(text, /분모가 (\d+)인.*\$(\d+)<a\/\d+<n\+(\d+)\$/);
  const D = Number(m[1]),
    lower = Number(m[2]);
  expect(Number(m[3])).toBe(lower);
  const ans = capture(
    answer,
    /^나머지=\{([\d,]+)\}; \$S=(\d+)n\^\{2\}\+(\d+)n\$$/,
  );
  const residues = ans[1].split(",").map(Number),
    quadratic = Number(ans[2]),
    linear = Number(ans[3]);
  const complete = Array.from({ length: D }, (_, r) => r).filter(
    (r) => gcd(r, D) === 1,
  );
  expect(residues).toEqual(complete);
  const directSums: number[] = [];
  for (let n = 1; n <= 12; n++) {
    const numerators: number[] = [];
    // Directly examine every natural numerator in the printed interval, never a block-sum formula.
    for (let a = 1; a <= D * (lower + n); a++)
      if (D * lower < a && a < D * (lower + n) && gcd(a, D) === 1)
        numerators.push(a);
    const sumNumerator = numerators.reduce((s, a) => s + a, 0);
    expect(sumNumerator).toBe(D * (quadratic * n * n + linear * n));
    expect(numerators).toHaveLength(residues.length * n);
    const classified = numerators.map((a) => ({
      k: Math.floor(a / D) - lower,
      r: a % D,
    }));
    expect(
      classified.every(({ k, r }) => k >= 0 && k < n && residues.includes(r)),
    ).toBe(true);
    expect(new Set(classified.map(({ k, r }) => `${k}:${r}`)).size).toBe(
      numerators.length,
    );
    directSums.push(sumNumerator / D);
  }
  const rejected = capture(solution, /탈락하는 0 아닌 나머지는 \{([\d,]+)\}/)[1]
    .split(",")
    .map(Number);
  expect([...residues, ...rejected].sort((a, b) => a - b)).toEqual(
    Array.from({ length: D - 1 }, (_, i) => i + 1),
  );
  expect(rejected.every((r) => gcd(r, D) > 1)).toBe(true);
  const pairs = [...solution.matchAll(/(\d+)↔(\d+)/g)].map((m) =>
    m.slice(1).map(Number),
  );
  expect(pairs.flat().sort((a, b) => a - b)).toEqual(residues);
  expect(pairs.every(([a, b]) => a + b === D)).toBe(true);
  // Division with remainder gives a bijection for arbitrary positive integer n;
  // pairing and the supplied sum identity prove the polynomial beyond these 12 substitutions.
  expect(2 * residues.reduce((s, r) => s + r, 0)).toBe(D * residues.length);
  expect(2 * quadratic).toBe(residues.length);
  expect(linear).toBe(lower * residues.length);
  return {
    denominator: D,
    lower,
    completeResidues: residues,
    pairedResidues: pairs,
    directSumsN1Through12: directSums,
  };
}

function lattice(p: number, q: number, N: number, negativeOnly = true) {
  const feasible: [number, number][] = [];
  for (let x = -N; x <= (negativeOnly ? -1 : N); x++)
    for (let y = -N; y <= (negativeOnly ? -1 : N); y++)
      if (p * x + q * y === -N) feasible.push([x, y]);
  return feasible;
}
function printedArea(text: string, answer: string, solution: string) {
  const m = capture(text, /\$(\d+)x\+(\d+)y=-(\d+)\$/);
  const [p, q, N] = m.slice(1).map(Number);
  expect(p).toBeGreaterThan(0);
  expect(q).toBeGreaterThan(0);
  const feasible = lattice(p, q, N);
  expect(feasible).toHaveLength(1);
  // Outside this square, either positive coefficient times the magnitude already exceeds N.
  expect(feasible.every(([x, y]) => -p * x < N && -q * y < N)).toBe(true);
  const Adata = capture(answer, /A=\(([-\d/]+),0\)/),
    Bdata = capture(answer, /B=\(0,([-\d/]+)\)/);
  const A: [Rat, Rat] = [rat(Adata[1]), rat(0)],
    C: [Rat, Rat] = [rat(0), rat(Bdata[1])];
  expect(compare(mul(rat(p), A[0]), rat(-N))).toBe(0);
  expect(compare(mul(rat(q), C[1]), rat(-N))).toBe(0);
  const printedP = capture(answer, /P=\{\((-?\d+),(-?\d+)\)\}/)
    .slice(1)
    .map(Number);
  expect(printedP).toEqual(feasible[0]);
  const P: [Rat, Rat] = [rat(printedP[0]), rat(printedP[1])];
  const first = area(A, P),
    second = area(C, P);
  expect(compare(first, rat(0))).toBe(1);
  expect(compare(second, rat(0))).toBe(1);
  const printedAreas = capture(
    answer,
    /넓이 OAP=([\d/]+), OBP=([\d/]+); (OAP|OBP)가 큼/,
  );
  expect(compare(first, rat(printedAreas[1]))).toBe(0);
  expect(compare(second, rat(printedAreas[2]))).toBe(0);
  expect(printedAreas[3]).toBe(compare(first, second) > 0 ? "OAP" : "OBP");
  const candidates = [
    ...capture(solution, /전체는 (.+)이다/)[1].matchAll(/\((\d+),([\d/]+)\)/g),
  ];
  expect(candidates).toHaveLength(Math.ceil(N / p) - 1);
  candidates.forEach((m, i) => {
    expect(Number(m[1])).toBe(i + 1);
    expect(compare(mul(rat(q), rat(m[2])), rat(N - p * (i + 1)))).toBe(0);
  });
  return {
    completeNegativeIntegerSet: feasible,
    areaOAP: printedAreas[1],
    areaOBP: printedAreas[2],
    comparison: printedAreas[3],
  };
}

function printedTranslated(text: string, answer: string, solution: string) {
  const shift = capture(
    text,
    /양의 방향으로 (\d+)만큼, \$y\$축의 (양의|음의) 방향으로 (\d+)만큼/,
  );
  const h = Number(shift[1]),
    v = Number(shift[3]) * (shift[2] === "음의" ? -1 : 1);
  const points = capture(text, /P=\((-?\d+),(-?\d+)\).*Q=\((-?\d+),(-?\d+)\)/)
    .slice(1)
    .map(Number);
  const [px, py, qx, qy] = points,
    graphs: [number, number][] = [];
  // Independent finite coefficient search reconstructs g from the two printed incidences.
  for (let slope = -20; slope <= 20; slope++)
    for (let intercept = -80; intercept <= 80; intercept++)
      if (slope * px + intercept === py && slope * qx + intercept === qy)
        graphs.push([slope, intercept]);
  expect(px).not.toBe(qx); // The nonzero difference also proves uniqueness outside the search box.
  expect(graphs).toHaveLength(1);
  const [a, translatedB] = graphs[0],
    b = translatedB + a * h - v;
  const f = capture(answer, /^f\(x\)=(-?\d+)x([+-]\d+); α=(-?\d+), β=(-?\d+)/)
    .slice(1)
    .map(Number);
  const [slopeF, interceptF, alpha, beta] = f;
  expect([slopeF, interceptF]).toEqual([a, b]);
  expect(a * alpha + b).toBe(0);
  expect(beta).toBe(b);
  for (const x of [-11, 0, 7])
    expect(a * (x - h) + b + v).toBe(a * x + translatedB);
  const reused = capture(answer, /새 직선 y=(-?\d+)x([+-]\d+)/)
    .slice(1)
    .map(Number);
  expect(reused).toEqual([beta, alpha]);
  expect(reused).not.toEqual([a, b]);
  const present: number[] = [];
  for (const [quadrant, sx, sy] of [
    [1, 1, 1],
    [2, -1, 1],
    [3, -1, -1],
    [4, 1, -1],
  ]) {
    // x=sx*t, t>0: sy*y=(sy*beta*sx)t+sy*alpha can be positive iff either coefficient is positive.
    if (sy * beta * sx > 0 || sy * alpha > 0) present.push(quadrant);
  }
  const absent = [1, 2, 3, 4].filter((q) => !present.includes(q));
  expect(absent).toHaveLength(1);
  expect(Number(capture(answer, /제(\d)사분면/)[1])).toBe(absent[0]);
  expect(solution).toContain(`$(${px - h},${py - v})$`);
  expect(solution).toContain(`$(${qx - h},${qy - v})$`);
  return {
    translatedGraph: graphs[0],
    recoveredFirstGraph: [a, b],
    intercepts: [alpha, beta],
    reusedCoefficients: reused,
    absentQuadrant: absent[0],
  };
}

const oracle = (f: ExamStudyFamily, q: ExamStudyDraft) => {
  const functions: Record<
    string,
    (text: string, answer: string, solution: string) => Record<string, unknown>
  > = {
    "model.doubling-time-offset": printedDoubling,
    "model.circle-revolution-percentage": printedCircle,
    "number.coprime-symbolic-sum": printedCoprime,
    "coord.intercept-integer-area": printedArea,
    "graph.translated-coefficient-reuse": printedTranslated,
  };
  // The mathematical inputs are three printed strings, with no access to generator parameters.
  return functions[f.fulfills[0].requirement](q.content, q.answer, q.solution);
};

const essentialChanges: Record<string, [string, string][]> = {
  "model.doubling-time-offset": [
    ["첫 증가는 관찰 시작으로부터 정확히 한 주기가 지난 순간에 일어난다.", "첫 증가 시각은 주어지지 않았다."],
    ["동시에 정확히 두 배", "서로 다른 순간에 정확히 두 배"],
    ["같은 주기마다", "서로 다른 주기마다"],
    ["초기 수보다 큰 같은 수", "초기 수보다 큰 서로 다른 수"],
    ["$t$시간", "$t$분"],
  ],
  "model.circle-revolution-percentage": [
    ["반지름은", "지름은"],
    ["총 거리는 같은 양수", "총 거리는 서로 다른 양수"],
    ["미끄러짐은 없다", "미끄러짐이 있다"],
    [
      "마지막의 일부 회전도 회전수에 포함한다",
      "완전히 끝낸 회전만 회전수에 포함한다",
    ],
    ["원래 회전수를 기준량", "새 회전수를 기준량"],
    ["소수 둘째 자리에서 반올림", "소수 둘째 자리에서 버림"],
  ],
  "number.coprime-symbolic-sum": [
    ["양의 정수", "양의 실수"],
    ["기약분수인 것만", "분수인 것은"],
    ["<n+", "<2n+"],
    ["나머지를 모두", "나머지를 하나만"],
  ],
  "coord.intercept-integer-area": [
    ["두 좌표가 모두 음의 정수", "두 좌표가 모두 음의 실수"],
    ["두 좌표가 모두 음의 정수", "x좌표만 음의 정수"],
    ["각각 직선", "순서를 바꾸어 각각 직선"],
    ["가능한 모든 $P$", "임의의 $P$"],
  ],
  "graph.translated-coefficient-reuse": [
    ["$x$축의 양의 방향", "$x$축의 음의 방향"],
    ["평행이동하여", "회전이동하여"],
    ["$x$절편 $α$, $y$절편 $β$", "$y$절편 $α$, $x$절편 $β$"],
    ["$y=βx+α$", "$y=αx+β$"],
  ],
};

describe("remaining middle course demands: every finite canonical tuple", () => {
  it("has five demands and 64 tuples, with native written formats for the three actual process questions", () => {
    expect(families).toHaveLength(5);
    expect(families.map((f) => all(f).length)).toEqual([12, 10, 14, 12, 16]);
    expect(families.reduce((sum, f) => sum + all(f).length, 0)).toBe(64);
    for (const f of families) {
      expect(f.formats).toEqual([f.id === "study-middle-translated-coefficient-reuse-linear" || f.id === "study-middle-coprime-symbolic-sum" ? "단답형" : "서술형"]);
      expect(f.figureKinds).toEqual([]);
      expect(f.evidence?.testFile).toBe(
        "src/__tests__/unit/examStudyMiddleRemaining.test.ts",
      );
    }
  });
  for (const f of families)
    it(`${f.id}: printed oracle, all conditions, wrong answers and wrong steps`, () => {
      const items = all(f),
        keys = new Set<string>(),
        digests = new Set<string>();
      if (f.paramDomain.kind !== "finite")
        throw new Error("finite domain required");
      expect(f.evidence?.sampleCount).toBe(items.length);
      const domain = f.paramDomain.enumerate();
      items.forEach((q, i) => {
        const independent = oracle(f, q);
        const verdict = verifyDraft(f, q);
        expect(verdict, `${f.id}:${i}`).toEqual({
          valid: true,
          checks: ["independent-solution", "essential-conditions", ...(q.questionType === "서술형" ? ["native-rubric"] : [])],
          errors: [],
        });
        expect(familyCoverage(f, f.fulfills[0].requirement, verdict, q)).toBe(
          f.fulfills[0].requirement === "number.coprime-symbolic-sum"
            ? "unavailable"
            : "full",
        );
        const parameters = f.canonicalParams(q),
          key = logicalKey(f, parameters),
          digest = contentDigest(q);
        expect(parameters).toEqual(domain[i]);
        expect(
          Object.keys(parameters).some((k) =>
            /seed|format|questionType/i.test(k),
          ),
        ).toBe(false);
        keys.add(key);
        digests.add(digest);
        expect(f.generate(0, i)).toEqual(q);
        expect(f.generate(items.length, i)).toEqual(q);
        expect(f.generate(-items.length, i)).toEqual(q);
        expect(f.canonicalParams({ ...q, questionType: "서술형" })).toEqual(
          parameters,
        );
        expect(
          f.canonicalParams({
            ...q,
            parameters: { seed: 123, format: "fake" },
          }),
        ).toEqual(parameters);
        let negatives = 0;
        const rejects = (changed: ExamStudyDraft) => {
          expect(f.verify(changed).valid).toBe(false);
          negatives++;
        };
        rejects({
          ...q,
          answer: q.answer.replace(/-?\d+/, (n) => String(Number(n) + 1)),
        });
        rejects({ ...q, parameters: { ...q.parameters, corrupt: true } });
        rejects({ ...q, questionType: "객관식" });
        if (q.questionType === "서술형") {
          expect(f.version).toBe("2-native-written");
          expect(q.rubric?.totalPoints).toBe(8);
          expect(q.rubric?.criteria.map(c=>c.points)).toEqual([2,2,2,2]);
          expect(q.rubric?.criteria.map(c=>c.expected)).toEqual(q.solution.split("\n"));
          rejects({...q, questionType:"단답형"});
          rejects({...q, rubric:undefined});
          rejects({...q, rubric:{...q.rubric!,totalPoints:9}});
          const wrongRubric=structuredClone(q.rubric!);
          wrongRubric.criteria[0].expected="잘못된 채점 기준";
          rejects({...q,rubric:wrongRubric});
          const wrongPoints=structuredClone(q.rubric!);
          wrongPoints.criteria[0].points=3;
          rejects({...q,rubric:wrongPoints});
          const noAlternatives=structuredClone(q.rubric!);
          noAlternatives.criteria[0].alternatives=[];
          rejects({...q,rubric:noAlternatives});
        }
        rejects({ ...q, figureSpec: { version: "graph-1" } });
        const printedLines = q.content.split("\n");
        for (let j = 0; j < printedLines.length; j++)
          rejects({
            ...q,
            content: printedLines.filter((_, k) => k !== j).join("\n"),
          });
        const conditionChanges = essentialChanges[f.fulfills[0].requirement];
        for (const [before, after] of conditionChanges) {
          expect(q.content).toContain(before);
          rejects({ ...q, content: q.content.replace(before, after) });
        }
        const steps = q.solution.split("\n");
        expect(steps).toHaveLength(4);
        for (let j = 0; j < steps.length; j++) {
          const wrong = /-?\d+/.test(steps[j])
            ? steps[j].replace(/-?\d+/, (n) => String(Number(n) + 1))
            : steps[j].replace("양수", "음수");
          expect(wrong).not.toBe(steps[j]);
          rejects({
            ...q,
            solution: steps.map((s, k) => (k === j ? wrong : s)).join("\n"),
          });
          rejects({
            ...q,
            solution: steps.filter((_, k) => k !== j).join("\n"),
          });
        }
        records.push({
          familyId: f.id,
          variant: i,
          key,
          contentDigest: digest,
          parameters,
          verification: verdict,
          independent,
          negativeChecks: negatives,
          printedConditionDeletions: printedLines.length,
          essentialConditionChanges: conditionChanges.length,
          meaningfulStepMutations: steps.length,
          removedSteps: steps.length,
          draft: q,
        });
      });
      expect(keys.size).toBe(items.length);
      expect(digests.size).toBe(items.length);
    });
  it("every printed math span parses with the actual existing KaTeX renderer", () => {
    let count = 0;
    for (const f of families)
      for (const q of all(f))
        for (const text of [q.content, q.answer, q.solution]) {
          expect((text.match(/\$/g) ?? []).length % 2).toBe(0);
          for (const m of text.matchAll(/\$([^$]+)\$/g)) {
            expect(() =>
              katex.renderToString(m[1], {
                throwOnError: true,
                strict: "ignore",
              }),
            ).not.toThrow();
            count++;
          }
        }
    expect(count).toBeGreaterThan(700);
  });
  it("preserves the M1 hard exclusion and offers each process task only in its actual native format", async () => {
    for (const f of families)
      for (const format of ["혼합", "단답형", "서술형"] as const) {
        const result = await generateExamStudy(
          {
            course: f.course,
            profileId: f.course === "중1" ? "daeryun-m1" : "daeryun-m2",
            requirementIds: [f.fulfills[0].requirement],
            count: 1,
            maxPerFamily: 1,
            seed: 20261019,
            format,
          },
          { families },
        );
        if (f.fulfills[0].requirement === "number.coprime-symbolic-sum") {
          expect(result.status).toBe("unavailable");
          expect(result.questions).toHaveLength(0);
          expect(result.requirements[0]).toMatchObject({
            status: "unavailable",
            delivered: 0,
          });
          expect(result.requirements[0].reason).toContain("중1 범위");
          continue;
        }
        if (format !== "혼합" && !f.formats.includes(format)) {
          expect(result.status).toBe("unavailable");
          expect(result.questions).toHaveLength(0);
          expect(result.requirements[0].delivered).toBe(0);
          continue;
        }
        expect(result.status).toBe("complete");
        expect(result.questions).toHaveLength(1);
        expect(result.requirements[0]).toMatchObject({
          status: "full",
          delivered: 1,
        });
        expect(result.questions[0].questionType).toBe(f.formats[0]);
        expect(result.questions[0].figureSvg).toBeNull();
        expect(f.verify(result.questions[0]).valid).toBe(true);
        oracle(f, result.questions[0]);
        generation.push({
          familyId: f.id,
          format,
          status: result.status,
          requirement: result.requirements[0],
          digest: result.digest,
          actualDraft: result.questions[0],
        });
      }
  });
});

describe("mathematical necessity, boundaries and excluded degenerate domains", () => {
  it("doubling needs the common target, common period, synchronous origin and hour conversion", () => {
    // A=3, B=12; common 7-minute period: targets 24 and 48 give the same 14-minute offset.
    expect([21 - 7, 28 - 14]).toEqual([14, 14]);
    // Different periods 7 and 5: targets 24 and 48 give different offsets.
    expect([21 - 5, 28 - 10]).toEqual([16, 18]);
    // Delay B's doubling phase by one minute: its first target 24 now occurs at minute 8.
    expect(21 - 8).not.toBe(14);
    // Different targets A=24,B=48 destroy the original offset; hours are not minutes.
    expect(21 - 14).not.toBe(14);
    expect(60 * (21 / 60) - 14).toBe(7);
    expect(21 / 60 - 14).not.toBe(7);
    const f = family("model.doubling-time-offset"),
      q = f.generate(0, 0);
    for (const initialB of [0, 3, 9])
      expect(
        f.verify({
          ...q,
          content: q.content.replace(/B가 \d+개/, `B가 ${initialB}개`),
        }).valid,
      ).toBe(false);
    expect(all(f).some((q) => q.answer.includes("+"))).toBe(true);
    expect(all(f).some((q) => q.answer.includes("-"))).toBe(true);
    const powersOfTwo = new Set(
      Array.from({ length: 12 }, (_, k) => 3 * 2 ** k),
    );
    expect(
      Array.from({ length: 12 }, (_, k) => 9 * 2 ** k).some((n) =>
        powersOfTwo.has(n),
      ),
    ).toBe(false);
  });
  it("percentage ties, both neighboring sides, radius conversion and original base matter", () => {
    const f = family("model.circle-revolution-percentage"),
      items = all(f);
    const find = (D: number, R: number) =>
      items.find((q) =>
        q.content.includes(`지름은 ${D} cm이고 새 바퀴의 반지름은 ${R} cm`),
      )!;
    expect(find(2024, 1000).answer).toBe("1.2%");
    expect(find(81, 40).answer).toBe("1.3%"); // exactly 1.25%
    expect(find(2026, 1000).answer).toBe("1.3%");
    expect(find(66, 32).answer).toBe("3.1%"); // 3.125%, below the 3.15% threshold
    const q = find(81, 40);
    expect((100 * (81 - 80)) / 81).not.toBe((100 * (81 - 80)) / 80); // wrong percentage base
    expect(81 / 40).not.toBe(81 / 80); // treating the given radius as a diameter
    expect((2 * 81) / 80).not.toBe(81 / 80); // twice the new distance
    // At distance 162π, totals are 2 and 2.025 turns; counting only whole turns gives 0%.
    expect(Math.floor(162 / 81)).toBe(Math.floor(162 / 80));
    expect(162 / 80 / (162 / 81)).toBe(81 / 80);
    for (const radius of [0, 41, 81])
      expect(
        f.verify({
          ...q,
          content: q.content.replace("반지름은 40 cm", `반지름은 ${radius} cm`),
        }).valid,
      ).toBe(false);
  });
  it("coprime filtering and both integer bounds affect the symbolic task", () => {
    const f = family("number.coprime-symbolic-sum");
    for (const q of all(f)) {
      const D = Number(capture(q.content, /분모가 (\d+)/)[1]),
        lower = Number(capture(q.content, /\$(\d+)<a/)[1]);
      const integers = Array.from(
        { length: D - 1 },
        (_, i) => D * lower + i + 1,
      );
      const unfiltered = integers.reduce((s, a) => s + a, 0),
        filtered = integers
          .filter((a) => gcd(a, D) === 1)
          .reduce((s, a) => s + a, 0);
      expect(unfiltered).toBeGreaterThan(filtered);
      expect(filtered).toBeGreaterThan(0); // n=1 is meaningful
      const shifted = integers
        .filter((a) => gcd(a, D) === 1)
        .reduce((s, a) => s + a + D, 0);
      expect(shifted).not.toBe(filtered);
      expect(
        Array.from({ length: D - 2 }, (_, i) => i + 2).some((d) => D % d === 0),
      ).toBe(true);
    }
    const q = f.generate(0, 0);
    expect(
      f.verify({ ...q, content: q.content.replaceAll("6", "7") }).valid,
    ).toBe(false);
    expect(
      f.verify({ ...q, content: q.content.replace("<n+1", "<n+0") }).valid,
    ).toBe(false);
  });
  it("integer-area needs integrality and each sign; checks zero/multiple/axis/collinear cases", () => {
    const f = family("coord.intercept-integer-area");
    for (const q of all(f)) {
      const [p, c, N] = capture(q.content, /\$(\d+)x\+(\d+)y=-(\d+)\$/)
        .slice(1)
        .map(Number);
      const [[x, y]] = lattice(p, c, N);
      for (const [xx, yy] of [
        [x + c, y - p],
        [x - c, y + p],
      ])
        expect(p * xx + c * yy).toBe(-N);
      expect(x + c).toBeGreaterThanOrEqual(0);
      expect(y + p).toBeGreaterThanOrEqual(0);
      // Removing integrality permits every interior division point of the negative-axis segment.
      const A = [-N / p, 0],
        C = [0, -N / c];
      const interior = [1 / 3, 2 / 3].map((t) => [
        A[0] * t + C[0] * (1 - t),
        A[1] * t + C[1] * (1 - t),
      ]);
      expect(interior[0]).not.toEqual(interior[1]);
      expect(
        interior.every(
          ([u, v]) => u < 0 && v < 0 && Math.abs(p * u + c * v + N) < 1e-9,
        ),
      ).toBe(true);
      expect(Math.abs(A[0] * interior[0][1])).not.toBe(
        Math.abs(A[0] * interior[1][1]),
      );
    }
    expect(lattice(2, 3, 1)).toHaveLength(0);
    expect(lattice(2, 3, 17)).toHaveLength(3);
    expect(lattice(2, 3, 6)).toHaveLength(0); // (-3,0),(0,-2) are on the axes, disallowed.
    expect(lattice(2, 3, 6, false).some(([x, y]) => x === 0 || y === 0)).toBe(
      true,
    );
    expect(value(area([rat(2), rat(0)], [rat(1), rat(0)]))).toBe(0);
    const q = f.generate(0, 0);
    for (const N of [0, 1, 6, 17])
      expect(
        f.verify({ ...q, content: q.content.replace(/y=-\d+/, `y=-${N}`) })
          .valid,
      ).toBe(false);
  });
  it("translated graph uses both incidences, both shifts and the recovered intercept positions", () => {
    const f = family("graph.translated-coefficient-reuse");
    const seen = new Set<number>();
    for (const q of all(f)) {
      const [a, b, alpha, beta] = capture(
        q.answer,
        /^f\(x\)=(-?\d+)x([+-]\d+); α=(-?\d+), β=(-?\d+)/,
      )
        .slice(1)
        .map(Number);
      expect(a).not.toBe(0);
      expect(b).not.toBe(0);
      expect(alpha).not.toBe(0);
      expect(alpha).not.toBe(beta);
      // Omitting either shift changes f's intercept; reusing swapped coefficients changes the target line.
      expect(b + a).not.toBe(b);
      expect(b - 1).not.toBe(b);
      expect([alpha, beta]).not.toEqual([beta, alpha]);
      expect([a, b]).not.toEqual([beta, alpha]);
      const [px, py, qx, qy] = capture(
        q.content,
        /P=\((-?\d+),(-?\d+)\).*Q=\((-?\d+),(-?\d+)\)/,
      )
        .slice(1)
        .map(Number);
      // Infinitely many lines through one retained point; a+1 supplies an explicit different completion.
      const alternativeAtP = py - (a + 1) * px;
      expect((a + 1) * qx + alternativeAtP).not.toBe(qy);
      const alternativeAtQ = qy - (a + 1) * qx;
      expect((a + 1) * px + alternativeAtQ).not.toBe(py);
      seen.add(Number(capture(q.answer, /제(\d)사분면/)[1]));
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4]);
    const q = f.generate(0, 0);
    const altered = q.content.replace(
      /\$Q=\([^)]*\)\$/,
      q.content.match(/\$P=\([^)]*\)\$/)![0].replace("P=", "Q="),
    );
    expect(f.verify({ ...q, content: altered }).valid).toBe(false);
  });
});

afterAll(() => {
  const dir = process.env.MIDDLE_REMAINING_EVIDENCE_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  const body =
    JSON.stringify(
      {
        schema: 1,
        testFile: "src/__tests__/unit/examStudyMiddleRemaining.test.ts",
        canonicalTupleCount: records.length,
        negativeChecks: records.reduce(
          (n, r) => n + Number(r.negativeChecks),
          0,
        ),
        commonTargetTimeTables: records.reduce(
          (n, r) =>
            n +
            Number(
              (r.independent as Record<string, unknown>).commonTargetsChecked ??
                0,
            ),
          0,
        ),
        coprimeDirectEnumerations: records.reduce(
          (n, r) =>
            n +
            ((
              (r.independent as Record<string, unknown>)
                .directSumsN1Through12 as number[] | undefined
            )?.length ?? 0),
          0,
        ),
        generations: generation,
        tuples: records,
      },
      null,
      2,
    ) + "\n";
  writeFileSync(path.join(dir, "middle-raw-evidence.json"), body);
  writeFileSync(
    path.join(dir, "middle-raw-evidence.sha256"),
    createHash("sha256").update(body).digest("hex") + "\n",
  );
});
