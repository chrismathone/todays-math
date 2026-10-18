import type {
  CanonicalParams,
  ExamStudyDraft,
  ExamStudyEvidenceCheck,
  ExamStudyFamily,
  StudyRequirementId,
} from "@/contracts/examStudy.contract";
import type { NativeRubric } from "@/contracts/nativeDescriptive.contract";

export type XY = [number, number];
export type Graph = {
  version: "graph-1";
  xRange: XY;
  yRange: XY;
  width: number;
  height: number;
  curves: {
    coefficients?: number[];
    type?: "inverse";
    k?: number;
    domain: XY;
  }[];
  segments: { from: XY; to: XY; dashed?: boolean }[];
  polygons: { points: XY[]; fill: string }[];
  points: { at: XY }[];
  labels: {
    at: XY;
    text: string;
    dx?: number;
    dy?: number;
    size?: number;
    anchor?: string;
  }[];
};

export function insist(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export const near = (a: number, b: number) => Math.abs(a - b) < 1e-8;
export const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function fmt(n: number): string {
  insist(Number.isFinite(n), "유한하지 않은 수");
  for (let d = 1; d <= 10000; d++) {
    if (near(n * d, Math.round(n * d)))
      return d === 1 ? String(Math.round(n)) : `${Math.round(n * d)}/${d}`;
  }
  throw new Error("허용된 유리수 범위 밖");
}
export function numberText(s: string): number {
  insist(/^-?\d+(?:\/\d+)?$/.test(s), "수치 표기");
  const [a, b = "1"] = s.split("/");
  insist(Number(b) !== 0, "분모 0");
  return Number(a) / Number(b);
}
export function match(content: string, re: RegExp): RegExpExecArray {
  const m = re.exec(content);
  insist(m, "발문의 조건 또는 자료가 없거나 바뀜");
  return m;
}
export function clauses(content: string, expected: readonly string[]) {
  for (const text of expected)
    insist(content.includes(text), `필수 조건: ${text}`);
}
export function graph(xRange: XY, yRange: XY): Graph {
  return {
    version: "graph-1",
    xRange,
    yRange,
    width: 400,
    height: 400,
    curves: [],
    segments: [],
    polygons: [],
    points: [],
    labels: [{ at: [0, 0], text: "O", dx: -14, dy: 21, size: 20 }],
  };
}
export function label(g: Graph, at: XY, text: string, dx = 10, dy = -12) {
  g.labels.push({ at, text, dx, dy, size: 20, anchor: "start" });
}
export function polygon(g: Graph, pts: XY[], names: string[]) {
  g.polygons.push({ points: pts, fill: "none" });
  pts.forEach((at, i) => {
    g.points.push({ at });
    if (names[i]) label(g, at, names[i]);
  });
}
export function readGraph(item: ExamStudyDraft): Graph {
  const raw = item.figureSpec;
  insist(raw && raw.version === "graph-1", "필수 graph-1 그림 없음");
  insist(
    raw.axes !== false &&
      raw.width === 400 &&
      (raw.height === 340 || raw.height === 400),
    "좌표축/인쇄 폭 규약",
  );
  for (const field of ["curves", "segments", "polygons", "points", "labels"])
    insist(Array.isArray(raw[field]), `그림 ${field} 없음`);
  const g = raw as unknown as Graph;
  insist(g.labels.length > 1, "필수 그림 라벨 없음");
  for (const l of g.labels)
    insist(
      typeof l.text === "string" &&
        l.at.length === 2 &&
        l.at.every(Number.isFinite),
      "그림 라벨 손상",
    );
  return g;
}
export function figureLabel(g: Graph, re: RegExp): RegExpExecArray {
  const found = g.labels
    .map((l) => re.exec(l.text))
    .filter((x): x is RegExpExecArray => !!x);
  insist(found.length === 1, "그림의 핵심 수치 라벨이 없거나 중복됨");
  return found[0];
}
export function hasLabel(g: Graph, text: string, at?: XY) {
  insist(
    g.labels.some(
      (l) =>
        l.text === text &&
        (!at || (near(l.at[0], at[0]) && near(l.at[1], at[1]))),
    ),
    `그림 라벨/위치 ${text}`,
  );
}
export function pointEqual(a: XY, b: XY) {
  return near(a[0], b[0]) && near(a[1], b[1]);
}
export function checkPolygon(g: Graph, pts: XY[], names: string[]) {
  insist(
    g.polygons.length === 1 &&
      g.polygons[0].points.length === pts.length &&
      g.polygons[0].points.every((p, i) => pointEqual(p, pts[i])),
    "그림의 다각형 좌표/순서 불일치",
  );
  pts.forEach((p, i) => {
    insist(
      g.points.some((x) => pointEqual(x.at, p)),
      "그림 꼭짓점 누락",
    );
    if (names[i]) hasLabel(g, names[i], p);
  });
}
export function checkInverse(g: Graph, ks: number[]) {
  insist(
    g.curves.length === ks.length &&
      g.curves.every(
        (c, i) =>
          c.type === "inverse" &&
          near(c.k!, ks[i]) &&
          c.domain[0] !== 0 &&
          c.domain[1] !== 0 &&
          c.domain[0] * c.domain[1] > 0,
      ),
    "반비례 곡선의 계수/정의역 불일치",
  );
}
export function area(pts: XY[]): number {
  return (
    Math.abs(
      pts.reduce((sum, p, i) => {
        const q = pts[(i + 1) % pts.length];
        return sum + p[0] * q[1] - p[1] * q[0];
      }, 0),
    ) / 2
  );
}
export function linear2(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
): XY {
  const det = a * e - b * d;
  insist(!near(det, 0), "독립적이지 않은 연립조건");
  return [(c * e - b * f) / det, (a * f - c * d) / det];
}
export type RubricPart = {
  id: string;
  expected: string;
  alternative: string;
  error: string;
};
export function rubric(parts: RubricPart[]): NativeRubric {
  return {
    totalPoints: parts.length * 2,
    criteria: parts.map((p) => ({
      criterionId: p.id,
      expected: p.expected,
      points: 2,
      alternatives: [p.alternative],
      errors: [p.error],
    })),
  };
}
export function checkRubric(item: ExamStudyDraft, expected: readonly string[]) {
  const r = item.rubric;
  insist(
    item.questionType === "서술형" &&
      r &&
      r.criteria.length === expected.length &&
      r.totalPoints === expected.length * 2,
    "본래 서술형 rubric 없음/총점 불일치",
  );
  insist(
    new Set(r.criteria.map((c) => c.criterionId)).size === r.criteria.length,
    "중복 채점 기준",
  );
  r.criteria.forEach((c, i) => {
    insist(
      c.points === 2 &&
        c.expected === expected[i] &&
        c.alternatives.length > 0 &&
        c.errors.length > 0,
      "채점 기준의 배점/모델/대안/오류 불일치",
    );
    insist(
      item.solution.includes(c.expected),
      "모범 풀이가 채점 기준을 충족하지 않음",
    );
  });
}

type Definition = {
  key: string;
  title: string;
  course: "중1" | "중2";
  unit: string;
  requirement: StudyRequirementId;
  domain: readonly CanonicalParams[];
  visual?: boolean;
  written?: boolean;
  boundaries: readonly string[];
  make(p: CanonicalParams): ExamStudyDraft;
  solve(item: ExamStudyDraft): {
    answer: string;
    parameters: CanonicalParams;
    rubric?: readonly string[];
  };
};
/** Only this finite index selects content. No seed/format multiplier enters the domain. */
export function family(d: Definition): ExamStudyFamily {
  insist(
    d.domain.length > 0 &&
      new Set(d.domain.map((p) => JSON.stringify(p))).size === d.domain.length,
    "중복 유한 매개변수",
  );
  const checks: ExamStudyEvidenceCheck[] = [
    "independent-solution",
    "essential-conditions",
    ...(d.visual ? ["visual-information" as const] : []),
    ...(d.written ? ["native-rubric" as const] : []),
  ];
  return {
    id: `study-middle-${d.key}`,
    version: "1",
    title: d.title,
    course: d.course,
    unitIds: [`${d.course}|${d.unit}`],
    unitSections: [d.unit],
    source: "authored",
    fulfills: [{ requirement: d.requirement, level: "full" }],
    formats: [d.written ? "서술형" : "단답형"],
    difficulties: ["심화하"],
    representation: d.visual ? "figure-required" : "text",
    figureKinds: d.visual ? ["graph-1"] : [],
    paramDomain: {
      kind: "finite",
      size: d.domain.length,
      enumerate: () => d.domain.map((p) => ({ ...p })),
    },
    evidence: {
      testFile: "src/__tests__/unit/examStudyMiddle.test.ts",
      sampleCount: d.domain.length,
      boundaryCases: d.boundaries,
      checkedRequirements: [d.requirement],
      checks,
    },
    generate(seed, variant) {
      insist(
        Number.isSafeInteger(seed) &&
          Number.isSafeInteger(variant) &&
          variant >= 0,
        "seed/variant 범위",
      );
      const index =
        ((seed % d.domain.length) +
          (variant % d.domain.length) +
          d.domain.length) %
        d.domain.length;
      return d.make(d.domain[index]);
    },
    canonicalParams: (item) => ({ ...item.parameters }),
    verify(item) {
      try {
        insist(
          item.questionType === (d.written ? "서술형" : "단답형"),
          "응답 형식 변경",
        );
        insist(
          item.difficulty === "심화하" &&
            item.difficultyBasis.length > 0 &&
            item.solution.trim().length > 20,
          "난도 근거/풀이 누락",
        );
        if (!d.visual)
          insist(item.figureSpec === null, "텍스트 과제에 예상하지 않은 그림");
        const solved = d.solve(item);
        insist(
          same(item.parameters, solved.parameters) &&
            d.domain.some((p) => same(p, solved.parameters)),
          "인쇄 자료와 논리 매개변수/유한 영역 불일치",
        );
        insist(
          item.answer === solved.answer,
          "인쇄 조건으로 독립 계산한 정답과 불일치",
        );
        if (d.written) checkRubric(item, solved.rubric ?? []);
        return { valid: true, checks, errors: [] };
      } catch (error) {
        return {
          valid: false,
          checks: [],
          errors: [error instanceof Error ? error.message : "검산 실패"],
        };
      }
    },
  };
}
export function draft(
  parameters: CanonicalParams,
  content: string,
  answer: string,
  solution: string,
  figureSpec: Graph | null,
  basis: readonly string[],
  native?: NativeRubric,
): ExamStudyDraft {
  return {
    parameters: { ...parameters },
    content,
    answer,
    solution,
    figureSpec,
    difficulty: "심화하",
    difficultyBasis: basis,
    questionType: native ? "서술형" : "단답형",
    ...(native ? { rubric: native } : {}),
  };
}
