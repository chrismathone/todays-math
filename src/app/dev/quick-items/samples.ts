import {
  QUICK_SHAPES,
  generateQuickItemOfShape,
  type QuickItemPreview,
  type QuickShapeInfo,
} from "@/lib/math-srs/quick/generate";
import { choiceWidthEm } from "@/lib/math-srs/quick/width";
import type { Difficulty } from "@/lib/math-srs/types";

/** 시안에 보일 난이도 — 원장님 지시(1·3·5) */
export const PREVIEW_DIFFICULTIES: Difficulty[] = [1, 3, 5];
/** 난이도마다 표본 수 */
export const PREVIEW_PER_DIFFICULTY = 2;

export function previewSeed(base: number, difficulty: number, i: number) {
  return base * 1000 + difficulty * 10 + i;
}

export function shapeByTemplate(
  templateId: string,
): QuickShapeInfo | undefined {
  return QUICK_SHAPES.find((s) => s.templateId === templateId);
}

export function parseDifficulty(value: string | undefined): Difficulty | null {
  const n = Number(value);
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5 ? n : null;
}

/**
 * Playwright 가 넘침을 잴 «가장 빡빡한» 표본 — 모양 × 난이도마다 씨앗 `pool` 개 가운데
 * 보기가 가장 넓은 것 둘과 발문이 가장 긴 것 하나.
 */
export function stressItems(pool: number): QuickItemPreview[] {
  const out: QuickItemPreview[] = [];
  for (const shape of QUICK_SHAPES)
    for (const difficulty of [1, 2, 3, 4, 5] as Difficulty[]) {
      const items = Array.from({ length: pool }, (_, i) =>
        generateQuickItemOfShape({
          templateId: shape.templateId,
          difficulty,
          seed: 900_000 + i * 131,
        }),
      );
      const widest = (it: QuickItemPreview) =>
        Math.max(...it.choices.map((c) => choiceWidthEm(c.slice(1, -1))));
      const byWidth = [...items].sort((a, b) => widest(b) - widest(a));
      const byPrompt = [...items].sort(
        (a, b) => b.prompt.length - a.prompt.length,
      );
      const picked = new Set([byWidth[0]!, byWidth[1]!, byPrompt[0]!]);
      out.push(...picked);
    }
  return out;
}
