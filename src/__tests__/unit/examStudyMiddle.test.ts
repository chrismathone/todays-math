import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import katex from "katex";
import { describe, expect, it } from "vitest";
import type {
  ExamStudyDraft,
  ExamStudyFamily,
} from "@/contracts/examStudy.contract";
import { MIDDLE_STUDY_FAMILIES as REGISTERED_MIDDLE_FAMILIES } from "@/lib/examStudy/families/middle";

// This oracle covers the original twelve. New demands have their own independent
// domain oracles in examStudyMiddleRemaining.test.ts and actual API completion tests.
const originalRequirements = new Set([
  "graph.piecewise-multi-claim",
  "coord.shared-side-square",
  "coord.inverse-area-ratio",
  "coord.inverse-equal-legs",
  "coord.ray-area-partition",
  "coord.signed-inverse-trapezoid",
  "algebra.shifted-system-coupling",
  "coord.intercept-trapezoid-cases",
  "written.dependent-formula-min-time",
  "written.linear-fuel-model",
  "written.stopped-travel",
  "written.two-work-rates",
]);
const MIDDLE_STUDY_FAMILIES = REGISTERED_MIDDLE_FAMILIES.filter((f) =>
  f.fulfills.some((r) => originalRequirements.has(r.requirement)),
);

type Point = [number, number];
type Scene = {
  labels: { text: string; at: Point }[];
  segments: { from: Point; to: Point; dashed?: boolean }[];
  polygons: { points: Point[] }[];
  curves: { k?: number; coefficients?: number[] }[];
  points: { at: Point }[];
};
const scene = (q: ExamStudyDraft) => q.figureSpec as unknown as Scene;
const num = (s: string) => {
  const [a, b = "1"] = s.split("/");
  return Number(a) / Number(b);
};
const captures = (s: string, re: RegExp) => {
  const m = re.exec(s);
  expect(m, s).not.toBeNull();
  return m!;
};
const f = (suffix: string) =>
  MIDDLE_STUDY_FAMILIES.find((x) => x.id === `study-middle-${suffix}`)!;
function all(family: ExamStudyFamily) {
  expect(family.paramDomain.kind).toBe("finite");
  return Array.from(
    {
      length:
        family.paramDomain.kind === "finite" ? family.paramDomain.size : 0,
    },
    (_, i) => family.generate(0, i),
  );
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7;
function determinantArea(p: Point, q: Point, r: Point) {
  return (
    Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / 2
  );
}
function shapeArea(pts: Point[]) {
  let sum = 0;
  for (let i = 1; i < pts.length - 1; i++)
    sum += determinantArea(pts[0], pts[i], pts[i + 1]);
  return sum;
}
function coordinates(answer: string, name: string): Point {
  const m = captures(answer, new RegExp(`${name}=\\(([-0-9/]+),([-0-9/]+)\\)`));
  return [num(m[1]), num(m[2])];
}
const assignment = (answer: string, key: string) =>
  num(captures(answer, new RegExp(`${key}=([-0-9/]+)`))[1]);

/** Test oracles read only the task a student sees, never parameters or generator helpers. */
function printedCheck(family: ExamStudyFamily, item: ExamStudyDraft) {
  const text = item.content,
    answer = item.answer,
    requirement = family.fulfills[0].requirement;
  if (requirement === "graph.piecewise-multi-claim") {
    const lines = scene(item).segments,
      target = Number(captures(text, /ㄷ\. 위치가 (\d+) m/)[1]);
    const finish = lines.at(-1)!.to[0];
    const position = (time: number) => {
      const z = lines.find((l) => time >= l.from[0] && time <= l.to[0])!;
      return (
        z.from[1] +
        ((z.to[1] - z.from[1]) * (time - z.from[0])) / (z.to[0] - z.from[0])
      );
    };
    // All crossing times of this bounded domain lie on this quarter-minute grid.
    let length = 0,
      negative = 0;
    const hits: number[] = [];
    for (let t = 0; t <= finish; t += 0.25) {
      if (close(position(t), target)) hits.push(t);
      if (t > 0) {
        const d = position(t) - position(t - 0.25);
        length += Math.abs(d);
        if (d < 0) negative += 0.25;
      }
    }
    const actual = [length, negative, hits[0], hits.length];
    const claims = [
      /ㄱ\. 전체 이동 거리는 (\d+)/,
      /ㄴ\. 음의 방향으로 움직인 시간은 모두 (\d+)/,
      /최초 시각은 (\d+)/,
      /서로 다른 시각은 (\d+)/,
    ].map((re) => Number(captures(text, re)[1]));
    expect(answer).toBe(
      ["ㄱ", "ㄴ", "ㄷ", "ㄹ"]
        .filter((_, i) => close(actual[i], claims[i]))
        .join(", "),
    );
  } else if (requirement === "coord.shared-side-square") {
    const g = scene(item),
      slopes = g.labels
        .map((l) => /^\$y=(\d+)x\$$/.exec(l.text))
        .filter(Boolean)
        .map((m) => Number(m![1]))
        .sort((a, b) => a - b);
    const right = Number(
      g.labels.find((l) => l.text.startsWith("R="))!.text.slice(2),
    );
    const candidates = [];
    for (let u = 0.25; u < right; u += 0.25)
      if (close(slopes[0] * u + right - u, slopes[1] * u))
        candidates.push([right, slopes[1] * u]);
    expect(candidates).toHaveLength(1);
    expect(coordinates(answer, "C")).toEqual(candidates[0]);
    const pts = g.polygons[0].points;
    const lengths = pts.map((p, i) =>
      Math.hypot(p[0] - pts[(i + 1) % 4][0], p[1] - pts[(i + 1) % 4][1]),
    );
    expect(lengths.every((x) => close(x, lengths[0]))).toBe(true);
  } else if (requirement === "coord.inverse-area-ratio") {
    const a = captures(
        scene(item).labels.find((l) => /^A\(/.test(l.text))!.text,
        /^A\((\d+),(\d+)\)$/,
      ),
      A: Point = [Number(a[1]), Number(a[2])],
      C: Point = [A[0], 0];
    const ratio = captures(text, /넓이비가 (\d+):(\d+)/),
      solutions: Point[] = [];
    for (let x = A[0] + 0.5; x <= 20; x += 0.5) {
      const B: Point = [x, (A[0] * A[1]) / x];
      if (
        close(
          determinantArea(A, B, C) * Number(ratio[2]),
          determinantArea([0, 0], A, C) * Number(ratio[1]),
        )
      )
        solutions.push(B);
    }
    expect(solutions).toHaveLength(1);
    expect(coordinates(answer, "B")).toEqual(solutions[0]);
    expect(assignment(answer, "넓이")).toBeCloseTo(
      determinantArea([0, 0], A, solutions[0]),
      8,
    );
  } else if (requirement === "coord.inverse-equal-legs") {
    const m = captures(text, /A=\((\d+),u\).*B=\((\d+),v\)/),
      p = Number(m[1]),
      q = Number(m[2]),
      candidates: Point[] = [];
    for (let u = 1; u <= 100; u++)
      for (let v = 1; v < u; v++)
        if (q - p === u - v && p * u === q * v) candidates.push([u, v]);
    expect(p - q).not.toBe(0); // Nonzero determinant also excludes additional noninteger solutions.
    expect(candidates).toHaveLength(1);
    const [u, v] = candidates[0];
    expect([assignment(answer, "u"), assignment(answer, "v")]).toEqual([u, v]);
    expect(assignment(answer, "k")).toBe(p * u);
  } else if (requirement === "coord.ray-area-partition") {
    const g = scene(item),
      A = g.polygons[0].points[1],
      B = g.polygons[0].points[2],
      P = g.labels.find((l) => l.text === "P")!.at,
      Q = g.labels.find((l) => l.text === "Q")!.at;
    const m = captures(text, /넓이비가 (\d+):(\d+):(\d+)/),
      ratios = m.slice(1).map(Number),
      total = ratios.reduce((a, b) => a + b),
      whole = determinantArea([0, 0], A, B);
    const areas = [
      determinantArea([0, 0], A, P),
      determinantArea([0, 0], P, Q),
      determinantArea([0, 0], Q, B),
    ];
    areas.forEach((x, i) =>
      expect(x / whole).toBeCloseTo(ratios[i] / total, 8),
    );
    expect(P[0] / A[0] + P[1] / B[1]).toBeCloseTo(1, 8);
    expect(Q[0] / A[0] + Q[1] / B[1]).toBeCloseTo(1, 8);
    expect(assignment(answer, "m")).toBeCloseTo(P[1] / P[0], 8);
    expect(assignment(answer, "n")).toBeCloseTo(Q[1] / Q[0], 8);
  } else if (requirement === "coord.signed-inverse-trapezoid") {
    const g = scene(item),
      A = Number(
        captures(
          g.labels.find((l) => /^\$y=\d/.test(l.text))!.text,
          /=(\d+)\//,
        )[1],
      ),
      B = Number(
        captures(
          g.labels.find((l) => /^\$y=-/.test(l.text))!.text,
          /=-(\d+)\//,
        )[1],
      );
    const coefficient = num(captures(answer, /Q=\(-\(([^)]+)\)t/)[1]),
      sy = num(captures(answer, /S=\(-\([^)]+\)t,-\(([^)]+)\)\/t/)[1]);
    for (const t of [0.5, 1, 3, 10]) {
      const P: Point = [t, A / t],
        Q: Point = [-coefficient * t, A / t],
        R: Point = [t, -B / t],
        S: Point = [-coefficient * t, -sy / t];
      expect(P[0] * P[1]).toBeCloseTo(A, 8);
      expect(Q[0] * Q[1]).toBeCloseTo(-B, 8);
      expect(R[0] * R[1]).toBeCloseTo(-B, 8);
      expect(S[0] * S[1]).toBeCloseTo(A, 8);
      expect(assignment(answer, "넓이")).toBeCloseTo(
        shapeArea([P, Q, S, R]),
        8,
      );
    }
  } else if (requirement === "algebra.shifted-system-coupling") {
    const m = captures(
        text,
        /x\+2y=(\d+),\\ ax\+by=(\d+).*2x-y=(-?\d+),\\ ax-by=(-?\d+)/,
      ),
      sh = captures(text, /\(u\+(\d+),v\+(\d+)\)/);
    const C = Number(m[1]),
      E = Number(m[2]),
      D = Number(m[3]),
      F = Number(m[4]),
      h = Number(sh[1]),
      j = Number(sh[2]);
    const candidates: number[][] = [];
    for (let u = -20; u <= 20; u++)
      for (let v = -20; v <= 20; v++)
        if (u + 2 * v === C && 2 * (u + h) - v - j === D) {
          for (let a = -10; a <= 10; a++)
            for (let b = -10; b <= 10; b++)
              if (a * u + b * v === E && a * (u + h) - b * (v + j) === F)
                candidates.push([u, v, a, b]);
        }
    expect(candidates).toHaveLength(1);
    expect(["u", "v", "a", "b"].map((k) => assignment(answer, k))).toEqual(
      candidates[0],
    );
    const [u, v, a, b] = candidates[0];
    expect(u * (v + j) + v * (u + h)).not.toBe(0);
    expect(2 * a - b).not.toBe(0);
    expect(a + 2 * b).not.toBe(0);
  } else if (requirement === "coord.intercept-trapezoid-cases") {
    const g = scene(item),
      a = Number(
        captures(
          g.labels.find((l) => /^P\(/.test(l.text))!.text,
          /P\((\d+),/,
        )[1],
      ),
      b = Number(
        captures(
          g.labels.find((l) => /^Q\(/.test(l.text))!.text,
          /Q\(0,(\d+)/,
        )[1],
      ),
      c = Number(
        captures(
          g.labels.find((l) => /^R\(/.test(l.text))!.text,
          /R\(-(\d+)/,
        )[1],
      );
    const candidates = new Set<string>();
    // All roots of the two linear parallelism conditions have denominator <= max(a,c^2).
    for (let den = 1; den <= Math.max(a, c * c); den++)
      for (let n = -a * b * den - b * c * den; n < 0; n++) {
        const value = n / den,
          first = close(-b / a, value),
          second = close(b / c, (-c * value) / a);
        if (Number(first) + Number(second) === 1)
          candidates.add(value.toFixed(8));
      }
    expect(candidates.size).toBe(2);
    const printed = [...answer.matchAll(/(?:m=|, )(-?[0-9/]+) \(/g)].map((m) =>
      num(m[1]).toFixed(8),
    );
    expect(new Set(printed)).toEqual(candidates);
    expect(answer).toContain("PQ∥RS");
    expect(answer).toContain("QR∥SP");
  } else if (requirement === "written.dependent-formula-min-time") {
    const m = captures(text, /(\d+)행 (\d+)열.*배양액 (\d+) mL/),
      L = Number(captures(text, /배양액은 (\d+) L/)[1]),
      rate = Number(captures(text, /초당 (\d+) mL/)[1]);
    let trays = 0,
      used = 0;
    for (let i = 0; i < Number(m[1]); i++)
      for (let j = 0; j < Number(m[2]); j++) {
        trays++;
        used += Number(m[3]);
      }
    const remain = L * 1000 - used;
    let second = 0;
    while (second * rate < remain) second++;
    expect(assignment(answer, "N")).toBe(trays);
    expect(assignment(answer, "V")).toBe(used);
    expect(assignment(answer, "U")).toBe(remain);
    const minute = assignment(answer, "최소");
    expect(minute * 60).toBeGreaterThanOrEqual(second);
    expect((minute - 1) * 60).toBeLessThan(second);
  } else if (requirement === "written.linear-fuel-model") {
    const E = Number(captures(text, /1 L로 (\d+) km/)[1]),
      F = Number(captures(text, /출발할 때 (\d+) L/)[1]),
      D = Number(captures(text, /길이 (\d+) km/)[1]),
      x0 = Number(captures(text, /(\d+) km를 달렸을 때/)[1]);
    const model = captures(answer, /y=(\d+)-x\/(\d+), 0<=x<=(\d+)/);
    expect(model.slice(1).map(Number)).toEqual([F, E, D]);
    let remaining = F,
      at = F;
    for (let x = 1; x <= D; x++) {
      remaining -= 1 / E;
      if (x === x0) at = remaining;
    }
    expect(num(captures(answer, /\)=(\d+) L/)[1])).toBeCloseTo(at, 8);
    expect(assignment(answer, "추가")).toBeCloseTo(remaining * E, 8);
  } else if (requirement === "written.stopped-travel") {
    const D = num(captures(text, /출발점에서 ([0-9/]+) km/)[1]),
      m = captures(
        text,
        /처음 (\d+)분 동안 시속 (\d+).*이어서 (\d+)분.*뒤 시속 (\d+)/,
      ),
      a = Number(m[1]),
      v1 = Number(m[2]),
      rest = Number(m[3]),
      v2 = Number(m[4]);
    let seconds = 0,
      scaledDistance = 0;
    const target = D * 3600;
    while (scaledDistance < target && seconds < 10000) {
      const speed = seconds < a * 60 ? v1 : seconds < (a + rest) * 60 ? 0 : v2;
      scaledDistance += speed;
      seconds++;
    }
    expect(scaledDistance).toBe(target);
    expect(assignment(answer, "도착")).toBe(seconds / 60);
    const segments = captures(
      answer,
      /^0<=t<=(\d+): y=\(([^)]+)\)t; (\d+)<t<=(\d+): y=([0-9/]+); (\d+)<t<=(\d+): y=([0-9/]+)\+\(([^)]+)\)\(t-(\d+)\)/,
    );
    expect(num(segments[2]) * a).toBeCloseTo(num(segments[5]), 8);
    expect(num(segments[5])).toBeCloseTo(num(segments[8]), 8);
    expect(Number(segments[4])).toBe(a + rest);
    expect(Number(segments[10])).toBe(a + rest);
    expect(
      num(segments[8]) +
        num(segments[9]) * (seconds / 60 - Number(segments[10])),
    ).toBeCloseTo(D, 8);
  } else if (requirement === "written.two-work-rates") {
    const C = Number(captures(text, /용량 (\d+) L/)[1]),
      m = captures(text, /\$A\$만 (\d+)분, 이어서 \$B\$만 (\d+)분 틀면/),
      n = captures(
        text,
        /다시 빈 물통에 \$A\$만 (\d+)분, 이어서 \$B\$만 (\d+)분/,
      ),
      p = Number(m[1]),
      q = Number(m[2]),
      r = Number(n[1]),
      s = Number(n[2]);
    const candidates: Point[] = [];
    for (let u = 1; u <= C; u++)
      for (let v = 1; v <= C; v++)
        if (p * u + q * v === C && r * u + s * v === C) candidates.push([u, v]);
    expect(p * s - q * r).not.toBe(0);
    expect(candidates).toHaveLength(1);
    const [u, v] = candidates[0],
      times = captures(answer, /단독 A=([0-9/]+)분, B=([0-9/]+)분/);
    expect(assignment(answer, "A")).toBe(u);
    expect(assignment(answer, "B")).toBe(v);
    expect(num(times[1]) * u).toBeCloseTo(C, 8);
    expect(num(times[2]) * v).toBeCloseTo(C, 8);
    expect(
      answer.endsWith(u === v ? "같음" : u > v ? "A가 빠름" : "B가 빠름"),
    ).toBe(true);
  } else throw new Error(`No independent printed oracle for ${requirement}`);
}

describe("middle authored finite tasks — printed mathematics", () => {
  it("has twelve distinct demands and exactly 120 mathematical tuples, with no format clones", () => {
    expect(MIDDLE_STUDY_FAMILIES).toHaveLength(12);
    expect(
      new Set(
        MIDDLE_STUDY_FAMILIES.flatMap((x) =>
          x.fulfills.map((r) => r.requirement),
        ),
      ).size,
    ).toBe(12);
    expect(
      MIDDLE_STUDY_FAMILIES.reduce(
        (n, f) =>
          n + (f.paramDomain.kind === "finite" ? f.paramDomain.size : 0),
        0,
      ),
    ).toBe(120);
    for (const family of MIDDLE_STUDY_FAMILIES)
      expect(family.formats).toHaveLength(1);
    const evidenceDir = process.env.MIDDLE_EVIDENCE_DIR;
    if (evidenceDir) {
      mkdirSync(evidenceDir, { recursive: true });
      writeFileSync(
        path.join(evidenceDir, "authored-items.json"),
        JSON.stringify(
          MIDDLE_STUDY_FAMILIES.flatMap((family) =>
            all(family).map((item, variant) => ({
              familyId: family.id,
              requirement: family.fulfills[0].requirement,
              variant,
              ...item,
            })),
          ),
          null,
          2,
        ),
      );
    }
  });
  it("every displayed formula parses with the existing print math renderer", () => {
    let formulas = 0;
    for (const family of MIDDLE_STUDY_FAMILIES)
      for (const item of all(family)) {
        for (const text of [item.content, item.solution]) {
          expect((text.match(/\$/g) ?? []).length % 2).toBe(0);
          for (const m of text.matchAll(/\$([^$]+)\$/g)) {
            formulas++;
            expect(
              () =>
                katex.renderToString(m[1], {
                  throwOnError: true,
                  strict: "ignore",
                }),
              `${family.id}: ${m[1]}`,
            ).not.toThrow();
          }
        }
      }
    expect(formulas).toBeGreaterThan(1000);
  });
  for (const family of MIDDLE_STUDY_FAMILIES) {
    it(`${family.id}: every tuple solves from the printed task and has stable identity`, () => {
      const items = all(family),
        params =
          family.paramDomain.kind === "finite"
            ? family.paramDomain.enumerate()
            : [];
      expect(family.evidence?.sampleCount).toBe(items.length);
      expect(
        new Set(items.map((x) => JSON.stringify(family.canonicalParams(x))))
          .size,
      ).toBe(items.length);
      expect(
        new Set(items.map((x) => x.content + JSON.stringify(x.figureSpec)))
          .size,
      ).toBe(items.length);
      items.forEach((item, i) => {
        expect(family.canonicalParams(item)).toEqual(params[i]);
        expect(family.generate(0, i)).toEqual(item);
        expect(family.generate(items.length, i)).toEqual(item);
        expect(family.verify(item), `${family.id}:${i}`).toMatchObject({
          valid: true,
          errors: [],
        });
        printedCheck(family, item);
        expect(
          family.verify({ ...item, answer: item.answer + "0" }).valid,
        ).toBe(false);
        expect(
          family.verify({
            ...item,
            parameters: { ...item.parameters, corrupt: true },
          }).valid,
        ).toBe(false);
      });
    });
  }
});

const essentialPhrases: Record<string, string[]> = {
  "piecewise-multi-claim": [
    "각 선분에서는 일정한 속도로 움직인다",
    "위치가 감소하면 음의 방향",
  ],
  "shared-side-square": [
    "정사각형 $ABCD$",
    "각 변이 좌표축과 평행",
    "각각 그림의 아래쪽 직선과 위쪽 직선 위",
    "오른쪽 두 꼭짓점의 $x$좌표",
  ],
  "inverse-area-ratio": [
    "$k>0$인 반비례 그래프 $y=k/x$",
    "$B$는 $A$보다 오른쪽",
    "$C$는 $A$에서 $x$축에 내린 수선의 발",
  ],
  "inverse-equal-legs": [
    "반비례 그래프 $y=k/x$",
    "가로 좌표 차와 세로 좌표 차가 같다",
  ],
  "ray-area-partition": [
    "선분 $AB$의 내부",
    "$A,P,Q,B$ 순서",
    "원점을 지나는 두 직선 $OP,OQ$",
  ],
  "signed-inverse-trapezoid": [
    "$P,S$는 양의 계수 그래프 위",
    "$Q,R$는 음의 계수 그래프 위",
    "$P,Q$의 $y$좌표는 같고",
    "$P,R$의 $x$좌표와 $Q,S$의 $x$좌표는 각각 같다",
  ],
  "shifted-system-coupling": [
    "각각 유일한 해",
    "(Ⅰ)의 해가 $(u,v)$",
    "(Ⅱ)의 해는",
  ],
  "intercept-trapezoid-cases": [
    "$a≠c$",
    "네 점의 축 위 순서는 그대로",
    "정확히 한 쌍의 대변만 평행",
    "모든 $m$",
  ],
  "dependent-formula-min-time": [
    "$N=행수×열수$",
    "$V=트레이당 사용량×N$",
    "$U=처음 양(mL)-V$",
    "양의 정수 분 단위로 예약",
    "처리 용량이 잔량 이상",
  ],
  "linear-fuel-model": [
    "주유 없이 한 번",
    "노선에서 달린 거리를 $x$ km",
    "도착 후 남은 연료",
  ],
  "stopped-travel": ["같은 방향", "제자리에 정지한 뒤", "출발 후 시간 $t$분"],
  "two-work-rates": [
    "각각 일정하고 양수",
    "새로 비운 물통",
    "다시 빈 물통",
    "물은 새거나 넘치지 않는다",
  ],
};
describe("middle evidence corruption and required conditions", () => {
  for (const [key, phrases] of Object.entries(essentialPhrases))
    it(`${key}: missing constraints are not silently accepted`, () => {
      const family = f(key),
        item = family.generate(0, 0);
      for (const phrase of phrases) {
        expect(item.content).toContain(phrase);
        expect(
          family.verify({ ...item, content: item.content.replace(phrase, "") })
            .valid,
          phrase,
        ).toBe(false);
      }
    });
  for (const family of MIDDLE_STUDY_FAMILIES.filter(
    (f) => f.representation === "figure-required",
  ))
    it(`${family.id}: missing or inconsistent visual data fails`, () => {
      const item = family.generate(0, 0);
      expect(family.verify({ ...item, figureSpec: null }).valid).toBe(false);
      const noLabels = structuredClone(item);
      noLabels.figureSpec!.labels = [];
      expect(family.verify(noLabels).valid).toBe(false);
      const altered = structuredClone(item),
        g = scene(altered);
      if (g.polygons.length) g.polygons[0].points[1][0] += 0.5;
      else g.segments[0].to[1] += 1;
      expect(family.verify(altered).valid).toBe(false);
      const dataLabels = scene(item).labels.filter((l) =>
        /(?:R=|\([0-9-]|\$y=)/.test(l.text),
      );
      expect(dataLabels.length).toBeGreaterThan(0);
      for (const l of dataLabels) expect(item.content).not.toContain(l.text);
      if (scene(item).curves.length) {
        const changedCurve = structuredClone(item),
          c = scene(changedCurve).curves[0];
        if (c.k !== undefined) c.k += 1;
        else c.coefficients![0] += 1;
        expect(family.verify(changedCurve).valid).toBe(false);
      }
    });
  for (const family of MIDDLE_STUDY_FAMILIES.filter(
    (f) => f.formats[0] === "서술형",
  ))
    it(`${family.id}: native multi-output rubric is executable evidence`, () => {
      for (const item of all(family)) {
        const r = item.rubric!;
        expect(r.criteria.length).toBeGreaterThanOrEqual(4);
        expect(r.totalPoints).toBe(
          r.criteria.reduce((n, c) => n + c.points, 0),
        );
        expect(family.verify({ ...item, rubric: undefined }).valid).toBe(false);
        expect(family.verify({ ...item, questionType: "단답형" }).valid).toBe(
          false,
        );
        expect(
          family.verify({
            ...item,
            solution: "계산하여 답을 얻었다. 단위와 과정은 생략한다.",
          }).valid,
        ).toBe(false);
        const badTotal = structuredClone(item);
        badTotal.rubric!.totalPoints++;
        expect(family.verify(badTotal).valid).toBe(false);
        const noAlternative = structuredClone(item);
        noAlternative.rubric!.criteria[0].alternatives = [];
        expect(family.verify(noAlternative).valid).toBe(false);
        const wrongModel = structuredClone(item);
        wrongModel.rubric!.criteria[0].expected += "0";
        expect(family.verify(wrongModel).valid).toBe(false);
      }
    });
});

describe("mathematical witnesses for essential constraints and boundary branches", () => {
  it("a polyline needs the constant-speed condition for an interior hitting time", () => {
    // Same endpoints (0,0),(3,6): linear motion first hits 2 at t=1;
    // an admissible nonuniform interpolation first hits it at t=1.5.
    expect(6 * (1 / 3)).toBe(2);
    expect(6 * (1.5 / 3) ** (Math.log(1 / 3) / Math.log(1 / 2))).toBeCloseTo(
      2,
      8,
    );
    expect(
      all(f("piecewise-multi-claim")).some((x) => x.answer === "ㄴ, ㄹ"),
    ).toBe(true);
  });
  it("square, two incidences, axis parallelism and right coordinate are all active", () => {
    // Both rectangles satisfy a=1,b=2,R=4; dropping the square condition allows different C.
    const rectangles = [1, 2].map((u) => ({
      A: [u, u],
      D: [u, 2 * u],
      C: [4, 2 * u],
      width: 4 - u,
      height: u,
    }));
    expect(rectangles[0].C).not.toEqual(rectangles[1].C);
    expect(rectangles[0].width).not.toBe(rectangles[0].height);
    expect(rectangles[1].width).toBe(rectangles[1].height);
    // Keep a square and R=4, omitting only the upper incidence or only the lower incidence.
    const upperDropped = { A: [1, 1], D: [1, 4], C: [4, 4] };
    expect(upperDropped.A[1]).toBe(upperDropped.A[0]);
    expect(upperDropped.D[1] - upperDropped.A[1]).toBe(
      upperDropped.C[0] - upperDropped.D[0],
    );
    expect(upperDropped.D[1]).not.toBe(2 * upperDropped.D[0]);
    const lowerDropped = { A: [3, 5], D: [3, 6], C: [4, 6] };
    expect(lowerDropped.D[1]).toBe(2 * lowerDropped.D[0]);
    expect(lowerDropped.D[1] - lowerDropped.A[1]).toBe(
      lowerDropped.C[0] - lowerDropped.D[0],
    );
    expect(lowerDropped.A[1]).not.toBe(lowerDropped.A[0]);
    expect(lowerDropped.C).not.toEqual([4, 4]);
    // Rotated square A=(1,1), D=(5/3,10/3), C=(4,8/3) has both incidences and R=4.
    const A: Point = [1, 1],
      D: Point = [5 / 3, 10 / 3],
      C: Point = [4, 8 / 3];
    const AD: Point = [D[0] - A[0], D[1] - A[1]],
      DC: Point = [C[0] - D[0], C[1] - D[1]];
    expect(AD[0] * DC[0] + AD[1] * DC[1]).toBeCloseTo(0);
    expect(Math.hypot(...AD)).toBeCloseTo(Math.hypot(...DC));
    expect(C[1]).not.toBe(4);
    expect(2 * 2).not.toBe(2 * 3); // No R permits every positive scale.
  });
  it("reciprocal area ratio, side choice, foot and second incidence determine the final area", () => {
    const A: Point = [4, 6],
      O: Point = [0, 0],
      C: Point = [4, 0];
    const right: Point = [6, 4],
      left: Point = [2, 12];
    expect(determinantArea(A, right, C) / determinantArea(O, A, C)).toBe(0.5);
    expect(determinantArea(A, left, C) / determinantArea(O, A, C)).toBe(0.5);
    expect(determinantArea(O, A, right)).not.toBe(determinantArea(O, A, left));
    expect(determinantArea(A, [6, 5], C)).toBe(determinantArea(A, right, C));
    expect(determinantArea(O, A, [6, 5])).not.toBe(
      determinantArea(O, A, right),
    );
    expect(
      determinantArea(A, right, [3, 0]) / determinantArea(O, A, [3, 0]),
    ).not.toBe(0.5);
    expect(determinantArea(A, [8, 3], C) / determinantArea(O, A, C)).not.toBe(
      0.5,
    );
  });
  it("equal legs and each reciprocal incidence are necessary; no fully specified point bypasses them", () => {
    const p = 2,
      q = 5;
    expect([q - p, q - p]).toEqual([3, 3]);
    expect(p * 5).toBe(q * 2);
    expect(p * 10).toBe(q * 4);
    expect(10 - 4).not.toBe(q - p); // omit equal legs
    expect(6 - 3).toBe(q - p);
    expect(p * 6).not.toBe(q * 3); // omit shared incidence
    for (const x of all(f("inverse-equal-legs")))
      expect(x.content).toMatch(/A=\(\d+,u\).*B=\(\d+,v\)/);
  });
  it("rays need shared edge incidence and both ratios; same triangle areas alone do not determine slopes", () => {
    const O: Point = [0, 0],
      A: Point = [8, 0],
      B: Point = [0, 4],
      P: Point = [6, 1],
      Q: Point = [4, 2];
    expect(determinantArea(O, A, P)).toBe(4);
    expect(determinantArea(O, P, Q)).toBe(4);
    expect(determinantArea(O, Q, B)).toBe(8);
    // P'=(5,1), Q'=(4,12/5) preserve all three areas, but leave AB and change both slopes.
    const P2: Point = [5, 1],
      Q2: Point = [4, 12 / 5];
    expect(determinantArea(O, A, P2)).toBe(4);
    expect(determinantArea(O, P2, Q2)).toBe(4);
    expect(determinantArea(O, Q2, B)).toBe(8);
    expect(P2[1] / P2[0]).not.toBe(P[1] / P[0]);
    expect(Q2[1] / Q2[0]).not.toBe(Q[1] / Q[0]);
    expect(determinantArea(O, P, [2, 3])).not.toBe(4); // remove a ratio changes Q
  });
  it("signed trapezoid depends on both verticals, shared horizontal and all four curve incidences", () => {
    const pts: Point[] = [
      [2, 2],
      [-4, 2],
      [-4, -1],
      [2, -4],
    ];
    const original = shapeArea(pts);
    expect(original).toBe(27);
    for (let i = 0; i < 4; i++) {
      const changed = structuredClone(pts);
      changed[i][1] += 0.5;
      expect(shapeArea(changed)).not.toBe(original);
    }
    const horizontalRemoved: Point[] = [
      [2, 2],
      [-2, 4],
      [-2, -2],
      [2, -4],
    ];
    expect(horizontalRemoved[0][0] * horizontalRemoved[0][1]).toBe(4);
    expect(horizontalRemoved[1][0] * horizontalRemoved[1][1]).toBe(-8);
    expect(shapeArea(horizontalRemoved)).not.toBe(original);
    for (const index of [2, 3]) {
      const changed = structuredClone(pts);
      changed[index][0] *= 2;
      changed[index][1] /= 2;
      expect(shapeArea(changed)).not.toBe(original);
    }
  });
  it("shifted systems have two independent numeric equations and two independent coefficient equations", () => {
    const q = f("shifted-system-coupling").generate(0, 0),
      p = q.parameters;
    expect(p).toEqual({ u: 2, v: 1, h: 1, j: 1, a: 2, b: 1 });
    // With original u=2,v=1, one coefficient equation 2a+b=5 leaves both these choices.
    expect(2 * 2 + 1).toBe(5);
    expect(2 * 1 + 3).toBe(5);
    expect(3 * 2 - 2 * 1).not.toBe(3 * 1 - 2 * 3);
    // Without the second numeric equation, u+2v=4 also permits (0,2),
    // whose two coefficient constraints 2b=5, a-3b=4 are consistent with different a,b.
    expect(0 + 2 * 2).toBe(4);
    expect(0 * 11.5 + 2 * 2.5).toBe(5);
    expect(11.5 - 3 * 2.5).toBe(4);
    // Omitting the first numeric equation keeps the second and both coefficient equations,
    // but permits u=3,v=3,a=4/3,b=1/3 instead.
    expect(2 * (3 + 1) - (3 + 1)).toBe(4);
    expect(3 * (4 / 3) + 3 * (1 / 3)).toBe(5);
    expect(4 * (4 / 3) - 4 * (1 / 3)).toBe(4);
    expect(3 + 2 * 3).not.toBe(4);
    // Omitting the other coefficient equation permits a=b=4: 3a-2b=4,
    // while the original first coefficient equation changes.
    expect(3 * 4 - 2 * 4).toBe(4);
    expect(2 * 4 + 4).not.toBe(5);
    expect(
      f("shifted-system-coupling").verify({
        ...q,
        content: q.content.replace("u+1,v+1", "u+2,v+1"),
      }).valid,
    ).toBe(false);
  });
  it("intercept trapezoid enumerates both cases and excludes the a=c parallelogram", () => {
    const a = 2,
      b = 4,
      c = 3,
      m1 = -2,
      m2 = -8 / 9;
    expect(-b / a).toBe(m1);
    expect((-c * m2) / a).toBeCloseTo(b / c);
    expect(m1).not.toBe(m2);
    const sameIntercept = a;
    expect(-b / a).toBe((-a * b) / sameIntercept ** 2); // both pairs parallel: no exact-one-pair solution
    expect(
      all(f("intercept-trapezoid-cases")).some(
        (x) => Number(x.parameters.a) < Number(x.parameters.c),
      ),
    ).toBe(true);
    expect(
      all(f("intercept-trapezoid-cases")).some(
        (x) => Number(x.parameters.a) > Number(x.parameters.c),
      ),
    ).toBe(true);
  });
  it("minimum booking includes exact division and its neighboring tray amounts", () => {
    const items = all(f("dependent-formula-min-time")).filter(
      (x) => x.parameters.rows === 2 && x.parameters.cols === 5,
    );
    expect(items.map((x) => assignment(x.answer, "U"))).toEqual([
      2530, 2520, 2510,
    ]);
    expect(items.map((x) => assignment(x.answer, "최소"))).toEqual([7, 6, 6]);
    expect(2530 / 420).toBeLessThan(7);
    expect(2530 / 420).toBeGreaterThan(6); // continuous time differs from integer booking
    expect(3 - 480).not.toBe(3000 - 480); // unit conversion is active
  });
  it("fuel definition, no-refill constraint and route domain change the model", () => {
    const E = 8,
      F = 5,
      D = 32;
    expect(F - D / E).toBe(1);
    expect((F - D / E) * E).toBe(8);
    expect(E * F).not.toBe(D); // route domain cannot be replaced by range-to-empty
    expect(F + 1 - D / E).not.toBe(F - D / E); // permitting refill changes y
    expect(F - D * E).toBeLessThan(0); // efficiency unit cannot be reversed
  });
  it("rest duration affects arrival, with correct constant distance at both boundaries", () => {
    const items = all(f("stopped-travel"));
    const a = items.find(
      (x) =>
        x.parameters.v1 === 6 &&
        x.parameters.v2 === 12 &&
        x.parameters.rest === 5 &&
        x.parameters.b === 10,
    )!;
    const b = items.find(
      (x) =>
        x.parameters.v1 === 6 &&
        x.parameters.v2 === 12 &&
        x.parameters.rest === 10 &&
        x.parameters.b === 10,
    )!;
    expect(assignment(b.answer, "도착") - assignment(a.answer, "도착")).toBe(5);
    expect(items.some((x) => x.parameters.v1 === x.parameters.v2)).toBe(true);
    expect(items.some((x) => x.content.includes("/2 km"))).toBe(true);
  });
  it("two schedules, initially empty, lossless constant rates and equal-rate branch matter", () => {
    const candidates: Point[] = [];
    for (let u = 1; u <= 10; u++)
      for (let v = 1; v <= 10; v++)
        if (5 * u + 3 * v === 19) candidates.push([u, v]);
    expect(candidates).toEqual([[2, 3]]); // integer witness alone is insufficient; rates are real
    expect(5 * 1 + 3 * (14 / 3)).toBe(19);
    expect(2 * 1 + 5 * (14 / 3)).not.toBe(19); // missing second schedule
    expect(5 * 1 + 3 * 3 + 5).toBe(19); // nonempty start changes the first equation
    expect(
      all(f("two-work-rates")).some((x) => x.answer.endsWith("같음")),
    ).toBe(true);
  });
});
