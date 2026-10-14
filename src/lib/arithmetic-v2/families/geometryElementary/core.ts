import type {
  ArithmeticGrade,
  ArithmeticV2Answer,
  ArithmeticV2Definition,
  ArithmeticV2Prompt,
} from "../../types";

export type Q = readonly [number, number];
export type Presentation = {
  givens: string;
  instruction: string;
  unit: string;
  svg: () => string;
};
export type Spec = {
  id: string;
  grade: ArithmeticGrade;
  title: string;
  chapter: string;
  domain: number[][];
  present(p: number[]): Presentation;
  solve(p: number[]): Q;
  /** A separately written mathematical relation, never the forward solver. */
  holds(p: number[], numerator: number, denominator: number): boolean;
};

export const range = (lo: number, hi: number, step = 1): number[] =>
  Array.from(
    { length: Math.floor((hi - lo) / step) + 1 },
    (_, i) => lo + step * i,
  );
export function product(...axes: number[][]): number[][] {
  return axes.reduce<number[][]>(
    (rows, axis) => rows.flatMap((row) => axis.map((n) => [...row, n])),
    [[]],
  );
}
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export function decimal(n: number, scale: number): string {
  const s = String(n).padStart(scale + 1, "0");
  return scale ? `${s.slice(0, -scale)}.${s.slice(-scale)}` : s;
}
export function exactAnswer(
  n: number,
  d: number,
  unit: string,
): ArithmeticV2Answer {
  const g = gcd(n, d);
  n /= g;
  d /= g;
  let kind: ArithmeticV2Answer["kind"] = "integer";
  let exact = [String(n)];
  let value = String(n);
  if (d !== 1) {
    let scale = 1;
    while (10 ** scale % d && scale < 8) scale++;
    if (10 ** scale % d)
      throw new Error("Elementary geometry requires terminating decimals");
    kind = "decimal";
    const coefficient = n * (10 ** scale / d);
    exact = [String(coefficient), String(scale)];
    value = decimal(coefficient, scale);
  }
  const suffix = unit === "°" ? "^{\\circ}" : `\\,\\text{${unit}}`;
  return {
    kind,
    exact,
    text: `${value}${unit === "°" ? "" : " "}${unit}`,
    latex: value + suffix,
  };
}
function valueOf(answer: ArithmeticV2Answer): Q | undefined {
  if (
    answer.kind === "integer" &&
    answer.exact.length === 1 &&
    /^(0|[1-9]\d*)$/.test(answer.exact[0])
  )
    return [Number(answer.exact[0]), 1];
  if (
    answer.kind === "decimal" &&
    answer.exact.length === 2 &&
    /^[1-9]\d*$/.test(answer.exact[0]) &&
    /^[1-8]$/.test(answer.exact[1])
  )
    return [Number(answer.exact[0]), 10 ** Number(answer.exact[1])];
}
const figureKey = (spec: Spec, p: number[]) =>
  `age-${spec.id}-v1-${p.join("-")}`;
const sameFields = (a: object, b: object) => {
  const ordered = (o: object) =>
    Object.entries(o).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
};
const promptFor = (
  spec: Spec,
  p: number[],
  view: Presentation,
): ArithmeticV2Prompt => ({
  layout: "math",
  text: `${spec.title}: ${view.givens}`,
  // Only public givens: inverse-task parameters must never disclose the answer.
  latex: `\\text{${spec.title}: ${view.givens}}`,
  instruction: view.instruction,
  figureId: figureKey(spec, p),
  answerUnit: view.unit,
});
export function compile(specs: readonly Spec[]): {
  definitions: readonly ArithmeticV2Definition[];
  figures: Readonly<Record<string, string>>;
} {
  const figures: Record<string, string> = Object.create(null);
  const definitions = specs.map((spec) => {
    const membership = new Set(spec.domain.map((p) => p.join(",")));
    if (membership.size !== spec.domain.length)
      throw new Error(`Duplicate domain: ${spec.id}`);
    for (const p of spec.domain) {
      const key = figureKey(spec, p);
      if (key.length > 64 || key in figures)
        throw new Error(`Invalid figure key: ${key}`);
      // No SVG rendering at module import and no cache that grows with browsed tasks.
      Object.defineProperty(figures, key, {
        enumerable: true,
        get: () => spec.present(p).svg(),
      });
    }
    return {
      id: spec.id,
      grade: spec.grade,
      strand: "도형" as const,
      title: spec.title,
      description: `${spec.chapter} — ${spec.title}을 직접 계산합니다.`,
      labels: [spec.chapter, "도형 연산"],
      rankGroup: spec.id,
      domainSize: spec.domain.length,
      problemAt(index: number) {
        if (
          !Number.isSafeInteger(index) ||
          index < 0 ||
          index >= spec.domain.length
        )
          throw new RangeError(`${spec.id}: invalid domain index`);
        const p = spec.domain[index];
        const view = spec.present(p);
        const [n, d] = spec.solve(p);
        return {
          parameters: [...p],
          prompt: promptFor(spec, p, view),
          answer: exactAnswer(n, d, view.unit),
        };
      },
      verify(candidate) {
        const p = candidate.parameters;
        if (
          !Array.isArray(p) ||
          !p.every(Number.isSafeInteger) ||
          !membership.has(p.join(","))
        )
          return false;
        const q = valueOf(candidate.answer);
        if (!q || !q.every(Number.isSafeInteger) || !spec.holds(p, ...q))
          return false;
        const view = spec.present(p);
        return (
          sameFields(candidate.answer, exactAnswer(...q, view.unit)) &&
          sameFields(candidate.prompt, promptFor(spec, p, view))
        );
      },
    } satisfies ArithmeticV2Definition;
  });
  return {
    definitions: Object.freeze(definitions),
    figures: Object.freeze(figures),
  };
}
