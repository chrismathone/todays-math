/**
 * Opt-in triangle angle drills, intended for a 216px square (also 57.15mm print).
 * Fit the geometry BEFORE the engine places its fixed-size MathJax labels.
 * Scaling an already labelled, arbitrarily tall SVG makes the labels unreadable.
 * The v2 engine still owns SVG generation, collision layout and sanitization.
 */
import { renderFigureSpec, type RenderFigureResult } from "./renderFigureSpec";
import { svgLabels } from "./svgLabels";

export const ANGLE_DRILL_SIZE = 216;
export const ANGLE_DRILL_MIN_FONT_PX = 16;
const GEOMETRY_SPAN = 150;

/** A and B are the given angles; C is unknown. No angle or coordinate rounding. */
export function createTriangleAngleDrillSpec(given: readonly [number, number]) {
  const [a, b] = given;
  const c = 180 - a - b;
  if (![a, b, c].every((angle) => Number.isFinite(angle) && angle > 0)) {
    throw new Error("삼각형의 두 각은 양수이며 합이 180°보다 작아야 합니다");
  }

  // Sine rule with AB=1, followed by ONE uniform scale: never stretch x/y
  // separately to fill a square, since that changes the actual angles.
  const radians = Math.PI / 180;
  const ac = Math.sin(b * radians) / Math.sin(c * radians);
  const cx = ac * Math.cos(a * radians);
  const cy = -ac * Math.sin(a * radians);
  const span = Math.max(Math.max(1, cx) - Math.min(0, cx), -cy);
  const scale = GEOMETRY_SPAN / span;
  return {
    version: 2 as const,
    points: { A: [0, 0], B: [scale, 0], C: [cx * scale, cy * scale] },
    segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
    angles: {
      atA: { vertex: "A", points: ["B", "C"], label: `${a}°` },
      atB: { vertex: "B", points: ["A", "C"], label: `${b}°` },
      atC: { vertex: "C", points: ["A", "B"], label: "?" },
    },
    style: {
      clear_angle_labels: true,
      padding: 8,
      angle_font_size: 16.8,
      angle_radius: 14,
      angle_label_distance: 24,
    },
  };
}

/**
 * Use this entrypoint to retain the legibility gate as well as strict layout.
 * Unrenderable/very extreme triangles return an explicit error; never shrink
 * labels or distort the triangle to make a successful-looking thumbnail.
 */
export async function renderTriangleAngleDrill(
  given: readonly [number, number],
  options: { signal?: AbortSignal } = {},
): Promise<RenderFigureResult> {
  let spec: ReturnType<typeof createTriangleAngleDrillSpec>;
  try {
    spec = createTriangleAngleDrillSpec(given);
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
  const result = await renderFigureSpec(spec, { ...options, strict: true });
  if (!result.ok) return result;
  const viewBox = /viewBox="([^"]+)"/
    .exec(result.svg)?.[1]
    .trim()
    .split(/\s+/)
    .map(Number);
  const extent = viewBox?.length === 4 ? Math.max(viewBox[2], viewBox[3]) : NaN;
  const labels = svgLabels(result.svg);
  if (
    !Number.isFinite(extent) ||
    extent <= 0 ||
    labels.length !== 3 ||
    labels.some(
      (label) =>
        !label.typeset ||
        (label.fontSize * ANGLE_DRILL_SIZE) / extent < ANGLE_DRILL_MIN_FONT_PX,
    )
  ) {
    return {
      ok: false,
      error: "216px 도형에 각 라벨을 읽기 좋게 배치하지 못했습니다",
    };
  }
  return result;
}
