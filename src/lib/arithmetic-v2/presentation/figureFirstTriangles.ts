import { CENTER_SPECS } from "../families/geometryTriangles/centers";
import { PROPORTION_SPECS } from "../families/geometryTriangles/proportions";
import { PYTHAGORAS_SPECS } from "../families/geometryTriangles/pythagoras";
import { RELATIONSHIP_SPECS } from "../families/geometryTriangles/relationships";
import {
  render,
  type Model,
  type Spec,
} from "../families/geometryTriangles/core";
import { defineFigureFirst, type FigureFirstFamily } from "./figureFirstTypes";

/** gt1 families presented figure-first (owner, 2026-10-16). The canonical gt1
 * figure prints one given; here the same validated identity is redrawn with
 * every given from the task text and the target marked x, and the prose is
 * replaced by one group instruction. Display only: the frozen gt1 bytes and
 * saved packs are untouched (centerAngles.ts did the same for 내심·외심).
 */
type Entry = {
  instruction: string;
  /** Segment givens that would sit on another point (a diagonal's midpoint is
   * its crossing) stay in one line under the figure instead. */
  proseGivens?: readonly string[];
  /** The target is a whole quantity (an area) or a segment that contains a
   * named point; the group instruction names it and no x is drawn. */
  noTarget?: boolean;
  /** Display-only model edits (e.g. drop an altitude the area does not use). */
  adjust?: (model: Model) => void;
};

const X = "x의 값을 구하세요.";
const ANGLE_X = "∠x의 크기를 구하세요.";
const inFigure = (figure: string, rest = X) =>
  `다음 그림${figure}${rest ? ` ${rest}` : ""}`;
const entries: Record<string, Entry> = {};
const add = (keys: readonly string[], entry: Entry) => {
  for (const key of keys) entries[key] = entry;
};

for (const kind of ["integer", "surd"] as const) {
  add([`pythagoras-hypotenuse-${kind}`, `pythagoras-leg-${kind}`], {
    instruction: inFigure("의 직각삼각형 ABC에서"),
  });
  add(
    [
      `pythagoras-rectangle-diagonal-${kind}`,
      `pythagoras-rectangle-side-${kind}`,
    ],
    { instruction: inFigure("의 직사각형 ABCD에서") },
  );
  add([`pythagoras-isosceles-height-${kind}`], {
    instruction: inFigure("과 같이 AB=AC인 삼각형 ABC에서 AD⊥BC일 때,"),
  });
  add([`pythagoras-rhombus-side-${kind}`], {
    instruction: inFigure("의 마름모 ABCD에서 두 대각선의 교점이 O일 때,"),
    proseGivens: ["AC", "BD"],
  });
}
add(["right-radius-from-legs"], {
  instruction: inFigure("에서 점 O가 직각삼각형 ABC의 외심일 때,"),
});
add(
  [
    "right-triangle-height",
    "right-triangle-projection",
    "right-altitude-product",
    "right-leg-product",
  ],
  { instruction: inFigure("의 직각삼각형 ABC에서 BD⊥AC일 때,") },
);
add(["right-triangle-area"], {
  instruction: inFigure("의 직각삼각형 ABC의 넓이를 구하세요.", ""),
  noTarget: true,
  adjust(model) {
    delete model.points.D;
    model.edges = model.edges.filter((edge) => !edge.includes("D"));
    model.right = model.right?.filter((key) => !key.includes("D"));
  },
});
add(["parallel-triangle-side-part", "parallel-triangle-base"], {
  instruction: inFigure("에서 DE∥BC일 때,"),
});
add(["parallel-triangle-whole-side"], {
  instruction: inFigure("에서 DE∥BC일 때, AC의 길이를 구하세요.", ""),
  noTarget: true,
});
add(["three-parallel-segments"], {
  instruction: inFigure("에서 AD∥BE∥CF일 때,"),
});
add(["trapezoid-parallel-section"], {
  instruction: inFigure("의 사다리꼴 ABCD에서 AD∥EF∥BC일 때,"),
});
add(["triangle-bisector-segment"], {
  instruction: inFigure("의 삼각형 ABC에서 AD가 ∠A의 이등분선일 때,"),
});
add(["external-bisector-part"], {
  instruction: inFigure("의 삼각형 ABC에서 AD가 ∠A의 외각의 이등분선일 때,"),
});
add(["external-bisector-base"], {
  instruction: inFigure("의 삼각형 ABC에서 AD가 ∠A의 외각의 이등분선일 때,"),
  proseGivens: ["BD"],
});
add(["triangle-midsegment", "midsegment-to-base"], {
  instruction: inFigure("의 삼각형 ABC에서 점 D, E가 각각 AB, AC의 중점일 때,"),
});
add(["trapezoid-midline", "trapezoid-base"], {
  instruction: inFigure(
    "과 같이 AD∥BC인 사다리꼴 ABCD에서 점 E, F가 각각 AB, DC의 중점일 때,",
  ),
});
add(["trapezoid-diagonal-midpoints"], {
  instruction: inFigure(
    "과 같이 AD∥BC인 사다리꼴 ABCD에서 점 P, Q가 각각 AC, BD의 중점일 때,",
  ),
});
add(["parallelogram-adjacent"], {
  instruction: inFigure("의 평행사변형 ABCD에서", ANGLE_X),
});
add(["parallelogram-diagonal-half", "parallelogram-diagonal-whole"], {
  instruction: inFigure("의 평행사변형 ABCD에서 두 대각선의 교점이 O일 때,"),
});
add(["rectangle-diagonal-half"], {
  instruction: inFigure("의 직사각형 ABCD에서 두 대각선의 교점이 O일 때,"),
});
add(["rhombus-diagonal-angle"], {
  instruction: inFigure(
    "의 마름모 ABCD에서 두 대각선의 교점이 O일 때,",
    ANGLE_X,
  ),
});
add(["isosceles-trapezoid-angle"], {
  instruction: inFigure(
    "과 같이 AD∥BC, AB=CD인 등변사다리꼴 ABCD에서",
    ANGLE_X,
  ),
});
add(["iso-bisector-angle"], {
  instruction: inFigure(
    "과 같이 AB=AC인 삼각형 ABC에서 AD가 ∠A의 이등분선일 때,",
    ANGLE_X,
  ),
});
add(["iso-bisector-base", "iso-bisector-half-base"], {
  instruction: inFigure(
    "과 같이 AB=AC인 삼각형 ABC에서 AD가 ∠A의 이등분선일 때,",
  ),
});
add(["circum-equal-radii"], {
  instruction: inFigure("에서 점 O가 삼각형 ABC의 외심일 때,"),
});
add(["right-circumradius", "right-circum-diameter"], {
  instruction: inFigure("에서 점 O가 직각삼각형 ABC의 외심일 때,"),
});
add(
  [
    "centroid-vertex-from-short",
    "centroid-short-from-vertex",
    "centroid-vertex-from-median",
    "centroid-short-from-median",
    "centroid-median-from-vertex",
    "centroid-median-from-short",
  ],
  { instruction: inFigure("에서 점 G가 삼각형 ABC의 무게중심일 때,") },
);

const specs = new Map<string, Spec>(
  [
    ...PYTHAGORAS_SPECS,
    ...RELATIONSHIP_SPECS,
    ...PROPORTION_SPECS,
    ...CENTER_SPECS,
  ].map((spec) => [spec.key, spec]),
);
const typeIdOf = (spec: Spec) =>
  `${spec.grade === "중3" ? "m3" : "m2"}-${spec.key}`;

type Given = NonNullable<Model["givens"]>[number];
/** The task text is the complete public statement; read its values back. */
function givensOf(text: string): Given[] {
  const givens: Given[] = [];
  for (const m of text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
    if (Number(m[2]) !== 90)
      givens.push({ key: m[1], text: `${m[2]}°`, kind: "angle" });
  for (const m of text.matchAll(
    /(?<![A-Z+])([A-Z]{2})(?:=([A-Z]{2}))?=(\d+) cm(?!²)/g,
  )) {
    givens.push({ key: m[1], text: m[3], kind: "segment" });
    if (m[2]) givens.push({ key: m[2], text: m[3], kind: "segment" });
  }
  return givens;
}
function targetOf(target: string): Given | undefined {
  const segment = /^(?:높이 )?([A-Z]{2})의 길이$/.exec(target);
  if (segment) return { key: segment[1], text: "x", kind: "segment" };
  const angle = /^∠([A-Z]{3})$/.exec(target);
  if (angle) return { key: angle[1], text: "x", kind: "angle" };
  if (target === "외접원 반지름")
    return { key: "OB", text: "x", kind: "segment" };
  return undefined;
}

function family(spec: Spec, entry: Entry): FigureFirstFamily {
  const typeId = typeIdOf(spec);
  const prefix = `gt1-${typeId}-`;
  const rows = new Map(spec.rows.map((row) => [row.join("-"), row]));
  return defineFigureFirst<readonly number[]>({
    instruction: entry.instruction,
    parse: (prompt) =>
      prompt.figureId?.startsWith(prefix)
        ? rows.get(prompt.figureId.slice(prefix.length))
        : undefined,
    lines: (prompt, parameters) => {
      if (!entry.proseGivens?.length) return [];
      const line = givensOf(spec.task(parameters).text)
        .filter((given) => entry.proseGivens!.includes(given.key))
        .map((given) => `${given.key}=${given.text} cm`)
        .join(", ");
      return line ? [line] : [];
    },
    draw: (prompt, parameters) => {
      const task = spec.task(parameters);
      const givens = givensOf(task.text).filter(
        (given) => !entry.proseGivens?.includes(given.key),
      );
      const target = entry.noTarget ? undefined : targetOf(task.target);
      if (!entry.noTarget && !target) return undefined;
      // The target claims its spot first: x must sit beside what it measures.
      if (target) givens.unshift(target);
      const model = task.model;
      entry.adjust?.(model);
      model.givens = givens;
      model.arcs = [
        ...new Set([
          ...(model.arcs ?? []),
          ...givens.filter((g) => g.kind === "angle").map((g) => g.key),
        ]),
      ];
      return render(model, {
        angleLabelsInside: true,
        givenLeaders: "far",
        tightGivens: true,
      });
    },
  });
}

export const TRIANGLE_FIGURE_FIRST: Readonly<
  Record<string, FigureFirstFamily>
> = Object.fromEntries(
  Object.entries(entries).map(([key, entry]) => {
    const spec = specs.get(key);
    if (!spec) throw new Error(`Unknown figure-first family: ${key}`);
    return [typeIdOf(spec), family(spec, entry)];
  }),
);
