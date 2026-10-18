import type { CanonicalParams } from "@/contracts/examStudy.contract";
import {
  BASIC_CHECKS,
  allMaps,
  assert,
  assertAnswer,
  authoredFamily,
  checked,
  draft,
  listText,
  permutations,
  readNumbers,
  requireMatch,
  sameNumbers,
  setText,
  unique,
} from "./shared";

export interface ChainProblem {
  x: number[];
  y: number[];
  z: number[];
  direct: readonly [number, number];
  inverse: readonly [number, number];
  composition: readonly [number, number];
}

export function readChain(content: string): ChainProblem {
  const sets = requireMatch(
    content,
    /X=\{([^}]+)\}, Y=\{([^}]+)\}, Z=\{([^}]+)\}/,
  );
  requireMatch(content, /f:X→Y, g:Y→Z는 모두 일대일대응/);
  const direct = requireMatch(content, /f\((-?\d+)\)=(-?\d+)/);
  const inverse = requireMatch(content, /g⁻¹\((-?\d+)\)=(-?\d+)/);
  const composition = requireMatch(content, /\(g∘f\)\((-?\d+)\)=(-?\d+)/);
  requireMatch(content, /X와 Y의 적힌 원소 순서대로/);
  const [x, y, z] = [sets[1]!, sets[2]!, sets[3]!].map(readNumbers);
  assert(
    x &&
      y &&
      z &&
      [x, y, z].every((s) => s.length === 3 && unique(s).length === 3),
    "세 유한집합의 크기 오류",
  );
  const result: ChainProblem = {
    x,
    y,
    z,
    direct: [+direct[1]!, +direct[2]!],
    inverse: [+inverse[1]!, +inverse[2]!],
    composition: [+composition[1]!, +composition[2]!],
  };
  assert(
    x.includes(result.direct[0]) &&
      y.includes(result.direct[1]) &&
      z.includes(result.inverse[0]) &&
      y.includes(result.inverse[1]) &&
      x.includes(result.composition[0]) &&
      z.includes(result.composition[1]),
    "대응 조건의 원소가 집합 밖입니다.",
  );
  return result;
}

/** Exhausts all 3!·3! pairs. Values are taken solely from the printed sets. */
export function solveChain(
  p: ChainProblem,
  omit?: "direct" | "inverse" | "composition" | "bijective",
) {
  const fMaps = omit === "bijective" ? allMaps(p.y) : permutations(p.y);
  // g^-1 itself presupposes that g is invertible; retain that even when the
  // explicit bijectivity condition on f is removed for the witness.
  const gMaps = permutations(p.z);
  return fMaps.flatMap((f) =>
    gMaps
      .filter(
        (g) =>
          (omit === "direct" || f[p.x.indexOf(p.direct[0])] === p.direct[1]) &&
          (omit === "inverse" ||
            g[p.y.indexOf(p.inverse[1])] === p.inverse[0]) &&
          (omit === "composition" ||
            g[p.y.indexOf(f[p.x.indexOf(p.composition[0])]!)] ===
              p.composition[1]),
      )
      .map((g) => ({ f, g })),
  );
}

const chainDomain: CanonicalParams[] = [];
for (const offset of [-4, 0, 5])
  for (const f of permutations([0, 1, 2]))
    for (const g of permutations([0, 1, 2]))
      chainDomain.push({
        x: [offset, offset + 2, offset + 5],
        y: [offset + 11, offset + 14, offset + 18],
        z: [offset + 23, offset + 27, offset + 32],
        f,
        g,
      });

export const finiteBijectionFamily = authoredFamily({
  id: "exam-advanced:finite-bijection-chain",
  title: "세 집합의 직접·역·합성 대응 복원",
  requirement: "function.finite-bijection-chain",
  unit: "합성함수와 역함수",
  domain: chainDomain,
  boundaries: [
    "매개변수마다 36개 순열쌍 전수",
    "직접값·역함수값·합성값 각각 제거",
    "f의 전사·단사 제거 시 다가 후보",
    "음수/0을 포함한 집합",
  ],
  build: (p) => {
    const x = p.x as number[],
      y = p.y as number[],
      z = p.z as number[];
    const fi = p.f as number[],
      gi = p.g as number[],
      f = fi.map((i) => y[i]!),
      g = gi.map((i) => z[i]!);
    // All permutations are allowed. The inverse clue fixes g at f(x1), and
    // the composition at x2 is a DIFFERENT z. Neither f(x0) nor f(x1) may be
    // reused at x2, so both remaining bijections are then forced.
    const inverseY = f[1]!,
      inverseZ = g[y.indexOf(inverseY)]!;
    const compZ = g[y.indexOf(f[2]!)]!;
    return draft(
      p,
      `X=${setText(x)}, Y=${setText(y)}, Z=${setText(z)}이고 f:X→Y, g:Y→Z는 모두 일대일대응이다. ` +
        `f(${x[0]})=${f[0]}, g⁻¹(${inverseZ})=${inverseY}, (g∘f)(${x[2]})=${compZ}이다. ` +
        `X와 Y의 적힌 원소 순서대로 (f(${x.join("), f(")}), g(${y.join("), g(")}))를 구하시오.`,
      listText([...f, ...g]),
      `g⁻¹(${inverseZ})=${inverseY}에서 g(${inverseY})=${inverseZ}이다. ` +
        `합성값 ${compZ}는 ${inverseZ}와 다르므로 f(${x[2]})≠${inverseY}이다. ` +
        `또 단사성으로 f(${x[2]})≠f(${x[0]})=${f[0]}이므로 f(${x[2]})=${f[2]}가 강제된다. ` +
        `남은 Y의 원소로 f(${x[1]})=${f[1]}이다. 합성 조건으로 g(${f[2]})=${compZ}, 역함수 조건으로 g(${inverseY})=${inverseZ}를 얻는다. ` +
        `g의 남은 값도 전사·단사로 정해져 전체 순서쌍은 ${listText([...f, ...g])}이다.`,
      [
        "세 집합의 역할과 역함수 방향 구별",
        "합성값의 차이와 단사성을 결합한 배제",
        "남은 대응의 전사성으로 전체 복원",
      ],
    );
  },
  verify: (item) =>
    checked(BASIC_CHECKS, () => {
      const p = readChain(item.content),
        solutions = solveChain(p);
      assert(
        solutions.length === 1,
        "인쇄 조건으로 전체 대응이 유일하지 않습니다.",
      );
      assertAnswer(item, listText([...solutions[0]!.f, ...solutions[0]!.g]));
      for (const condition of [
        "direct",
        "inverse",
        "composition",
        "bijective",
      ] as const)
        assert(
          solveChain(p, condition).length > 1,
          `${condition} 조건이 필수가 아닙니다.`,
        );
    }),
});

export interface IterateProblem {
  x: number[];
  image: number[];
  fixed: readonly [number, number];
  direction: "≥" | "≤";
}
export function readIterate(content: string): IterateProblem {
  const set = requireMatch(content, /X=\{([^}]+)\}/);
  requireMatch(content, /함수 f:X→X/);
  const image = requireMatch(content, /치역은 정확히 \{([^}]+)\}/);
  const fixed = requireMatch(content, /f\((-?\d+)\)=(-?\d+)/);
  const inequality = requireMatch(
    content,
    /모든 x∈X에 대해 f\(f\(x\)\) (≥|≤) x/,
  );
  const x = readNumbers(set[1]!),
    y = readNumbers(image[1]!);
  assert(
    x.length === 4 &&
      unique(x).length === 4 &&
      y.length === 3 &&
      unique(y).length === 3 &&
      y.every((n) => x.includes(n)),
    "유한 자기함수의 집합 오류",
  );
  const point = [+fixed[1]!, +fixed[2]!] as const;
  assert(
    x.includes(point[0]) && x.includes(point[1]),
    "주어진 함수값의 정의역 오류",
  );
  requireMatch(content, new RegExp(`f\\(${x.join("\\)\\+f\\(")}\\)의 값을`));
  return { x, image: y, fixed: point, direction: inequality[1] as "≥" | "≤" };
}

/** All 4^4 functions, including NON-injective maps. Exact range is set equality. */
export function solveIterate(
  p: IterateProblem,
  omit?: "range" | "fixed" | "iterate",
): number[][] {
  return allMaps(p.x).filter(
    (f) =>
      (omit === "range" || sameNumbers(unique(f), unique(p.image))) &&
      (omit === "fixed" || f[p.x.indexOf(p.fixed[0])] === p.fixed[1]) &&
      (omit === "iterate" ||
        p.x.every((x, i) =>
          p.direction === "≥"
            ? f[p.x.indexOf(f[i]!)]! >= x
            : f[p.x.indexOf(f[i]!)]! <= x,
        )),
  );
}

// These are independently authored finite order patterns. Their solution counts
// include 1,2,3,4: uniqueness of the REQUESTED output never assumes unique f.
const iteratePatterns = [
  {
    image: [0, 1, 3],
    fixed: [0, 1],
    direction: "≥",
    solutions: [[1, 0, 3, 3]],
  },
  {
    image: [0, 1, 3],
    fixed: [2, 3],
    direction: "≥",
    solutions: [
      [0, 1, 3, 3],
      [1, 0, 3, 3],
    ],
  },
  {
    image: [0, 2, 3],
    fixed: [1, 3],
    direction: "≥",
    solutions: [
      [0, 3, 2, 3],
      [0, 3, 3, 2],
      [2, 3, 0, 3],
    ],
  },
  {
    image: [1, 2, 3],
    fixed: [0, 3],
    direction: "≥",
    solutions: [
      [3, 1, 2, 3],
      [3, 1, 3, 2],
      [3, 2, 1, 3],
      [3, 3, 2, 1],
    ],
  },
  {
    image: [0, 1, 2],
    fixed: [3, 0],
    direction: "≤",
    solutions: [
      [0, 1, 2, 0],
      [0, 2, 1, 0],
      [1, 0, 2, 0],
      [2, 1, 0, 0],
    ],
  },
  {
    image: [0, 2, 3],
    fixed: [1, 0],
    direction: "≤",
    solutions: [
      [0, 0, 2, 3],
      [0, 0, 3, 2],
    ],
  },
  {
    image: [0, 2, 3],
    fixed: [0, 3],
    direction: "≤",
    solutions: [[3, 3, 2, 0]],
  },
] as const;
const iterateDomain: CanonicalParams[] = [];
for (const offset of [-5, 1, 7])
  for (const step of [1, 2, 3])
    for (const pattern of iteratePatterns) {
      const x = [0, 1, 2, 3].map((i) => offset + i * step);
      iterateDomain.push({
        x,
        image: pattern.image.map((i) => x[i]!),
        fixed: pattern.fixed.map((i) => x[i]!),
        direction: pattern.direction,
      });
    }

export const iteratedRangeFamily = authoredFamily({
  id: "exam-advanced:iterated-finite-range",
  title: "정확한 치역과 두 번 합성 부등식",
  requirement: "function.iterated-finite-range",
  unit: "합성함수와 역함수",
  domain: iterateDomain,
  boundaries: [
    "각 매개변수에서 4^4 함수 전수",
    "두 번 합성의 ≥/≤ 양 방향",
    "유일한 함수와 서로 다른 함수의 같은 출력",
    "정확한 치역/한 함수값/합성 부등식 각각 필수",
  ],
  build: (p) => {
    const x = p.x as number[],
      image = p.image as number[],
      fixed = p.fixed as number[];
    const pattern = iteratePatterns.find(
      (v) =>
        v.direction === p.direction &&
        sameNumbers(
          v.image.map((i) => x[i]!),
          image,
        ) &&
        sameNumbers(
          v.fixed.map((i) => x[i]!),
          fixed,
        ),
    );
    assert(pattern, "저작된 순서 패턴이 없습니다.");
    const admissible = pattern.solutions.map((f) => f.map((i) => x[i]!));
    const witness = admissible[0]!;
    const sum = witness.reduce((n, y) => n + y, 0);
    return draft(
      p,
      `X=${setText(x)}에서 함수 f:X→X를 정한다. f의 치역은 정확히 ${setText(image)}이고 f(${fixed[0]})=${fixed[1]}이다. ` +
        `모든 x∈X에 대해 f(f(x)) ${p.direction} x이다. f(${x.join(")+f(")})의 값을 구하시오.`,
      String(sum),
      `f의 값은 X의 네 원소 중 하나이므로 전체 후보는 4^4개로 유한하다. 각 후보에서 ` +
        `① 치역이 ${setText(image)}와 정확히 같은지, ② f(${fixed[0]})=${fixed[1]}인지, ` +
        `③ 네 입력 모두에 대해 f를 두 번 적용한 값이 입력보다 ${p.direction === "≥" ? "작지 않은지" : "크지 않은지"} 검사한다. ` +
        `먼저 치역의 세 원소 중 네 함수값을 고르되 주어진 함수값을 고정한다. 각 후보에서 두 번 적용한 값을 비교하고 치역의 세 원소가 모두 쓰였는지 확인하면, ` +
        `X에 적힌 순서의 함수값은 ${admissible.map(listText).join(", ")}뿐이다. ` +
        `이 ${admissible.length}개 대응을 원조건에 다시 대입할 수 있다. 가능한 함수가 여러 개여도 그 출력값의 합은 모두 ${sum}으로 같다. ` +
        `여기서 치역이 주어진 집합의 부분집합이라는 조건만 쓰거나 f(f(x)) 대신 f(x)를 비교해서는 안 된다.`,
      [
        "정확한 치역과 한 함수값의 공유 제약",
        "두 번째 함수 입력을 첫 출력에서 찾아야 하는 합성",
        "함수의 비유일성과 요청 출력의 유일성 구별",
      ],
    );
  },
  verify: (item) =>
    checked(BASIC_CHECKS, () => {
      const p = readIterate(item.content),
        functions = solveIterate(p);
      const sums = unique(functions.map((f) => f.reduce((n, y) => n + y, 0)));
      assert(
        functions.length > 0 && sums.length === 1,
        "요청한 합이 유일하지 않습니다.",
      );
      assertAnswer(item, String(sums[0]));
      assert(
        functions.every((f) => item.solution.includes(listText(f))),
        "모범 풀이에서 가능한 함수가 누락되었습니다.",
      );
      for (const condition of ["range", "fixed", "iterate"] as const) {
        const altered = unique(
          solveIterate(p, condition).map((f) => f.reduce((n, y) => n + y, 0)),
        );
        assert(
          altered.length > 1,
          `${condition} 조건을 빼도 요청 출력이 같으므로 필수성이 없습니다.`,
        );
      }
    }),
});
