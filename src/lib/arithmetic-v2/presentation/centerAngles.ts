import { CENTER_SPECS } from "../families/geometryTriangles/centers";
import { render, type Model } from "../families/geometryTriangles/core";

/** Circumcenter/incenter ANGLE drills, presented figure-first (owner request,
 * 2026-10-15): every given angle is written on the figure, the target is
 * marked x, and one group instruction replaces the per-problem prose.
 * Display only: candidates, canonical gt1 SVGs and saved packs are unchanged.
 */
const CENTER_ANGLE_KEYS: Readonly<Record<string, "O" | "I">> = {
  "obtuse-circum-central-angle": "O",
  "obtuse-circum-vertex-angle": "O",
  "obtuse-circum-base-angle": "O",
  "circum-central-angle": "O",
  "circum-vertex-angle": "O",
  "circum-radius-base-angle": "O",
  "circum-base-central-angle": "O",
  "circum-three-base-angles": "O",
  "incenter-half-angle": "I",
  "incenter-whole-angle": "I",
  "incenter-central-angle": "I",
  "incenter-inverse-angle": "I",
  "incenter-three-half-angles": "I",
  "iso-incenter-base-half": "I",
};

const keyOf = (typeId: string) =>
  typeId.startsWith("m2-") && Object.hasOwn(CENTER_ANGLE_KEYS, typeId.slice(3))
    ? typeId.slice(3)
    : undefined;

export function isCenterAngleType(typeId: string): boolean {
  return keyOf(typeId) !== undefined;
}

export function centerAngleGroupInstruction(
  typeId: string,
): string | undefined {
  const key = keyOf(typeId);
  if (!key) return undefined;
  const [point, name] =
    CENTER_ANGLE_KEYS[key] === "O" ? ["O", "외심"] : ["I", "내심"];
  return `다음 그림에서 점 ${point}가 △ABC의 ${name}일 때, ∠x의 크기를 구하세요.`;
}

const figures = new Map<string, string>();

/** Redraws a validated gt1 identity with all given angles and x. Returns
 * undefined for any other identity so callers keep the saved figure.
 */
export function centerAngleFigureSvg(figureId: string): string | undefined {
  const match = /^gt1-m2-([a-z-]+)-(\d+(?:-\d+)*)$/.exec(figureId);
  if (!match || !Object.hasOwn(CENTER_ANGLE_KEYS, match[1])) return undefined;
  const cached = figures.get(figureId);
  if (cached) return cached;
  const spec = CENTER_SPECS.find((entry) => entry.key === match[1]);
  const parameters = match[2].split("-").map(Number);
  if (
    !spec?.rows.some(
      (row) =>
        row.length === parameters.length &&
        row.every((value, i) => value === parameters[i]),
    )
  )
    return undefined;
  const task = spec.task(parameters);
  const givens: NonNullable<Model["givens"]> = [];
  for (const m of task.text.matchAll(/∠([A-Z]{3})=(\d+)°/g))
    givens.push({ key: m[1], text: `${m[2]}°`, kind: "angle" });
  givens.push({ key: task.target.replace("∠", ""), text: "x", kind: "angle" });
  task.model.givens = givens;
  // Every labelled angle needs its arc so the value reads as that angle.
  task.model.arcs = [
    ...new Set([...(task.model.arcs ?? []), ...givens.map((g) => g.key)]),
  ];
  const svg = render(task.model, { angleLabelsInside: true });
  if (figures.size >= 256) figures.delete(figures.keys().next().value!);
  figures.set(figureId, svg);
  return svg;
}
