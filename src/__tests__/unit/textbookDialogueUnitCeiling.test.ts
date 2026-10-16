// @vitest-environment jsdom
/** Measuring sibling lessons in separate bounded passes yields the same unit font as one pass. */
import { describe, expect, it } from "vitest";
import {
  measureDialogueCeilings,
  measureRecoveryDom,
  type RecoveryMeasurePlan,
} from "@/lib/textbook/render/recoveryMeasurement";
import { syntheticDialogueUnit } from "../helpers/textbookDialogueUnitProof";

const mm = 96 / 25.4;
/** Height (mm) of one turn at 1pt; a page fits while turns × pt × this ≤ 199.58mm (gaps aside). */
const pages = { a: 4, b: 5.1, c: 4.9 } as const; // four turns fit at ≤10.5 · ≤9.6 · ≤10.0
function mountTurns(keys: readonly (keyof typeof pages)[]) {
  document.body.innerHTML = "";
  const blocks: RecoveryMeasurePlan["blocks"] = [];
  for (const page of keys)
    for (let turn = 0; turn < 4; turn++) {
      const element = document.createElement("div");
      element.dataset.measureId = `${page}-${turn}`;
      element.getBoundingClientRect = () => {
        const pt = parseFloat(
          element.style.getPropertyValue("--tb-dialogue-size") || "10.5",
        );
        return { height: pages[page] * pt * mm } as DOMRect;
      };
      document.body.append(element);
      blocks.push({
        id: `${page}-${turn}`,
        dialogueGroup: "unit",
        dialoguePage: page,
      });
    }
  return blocks;
}
const plan = (blocks: RecoveryMeasurePlan["blocks"]): RecoveryMeasurePlan => ({
  sourceMemoryRowKeys: [],
  blocks,
  dialogueBodyTopMm: 63.42,
  dialogueBottomMm: 263,
});

describe("dialogue unit ceilings", () => {
  it("agrees with the single-pass unit font", () => {
    const single = measureRecoveryDom(plan(mountTurns(["a", "b", "c"])));
    expect(new Set(Object.values(single.dialogueSizesPt))).toEqual(
      new Set([9.6]),
    );
    const sibling = measureRecoveryDom(plan(mountTurns(["b", "c"])));
    const ceiling = Math.min(...Object.values(sibling.dialogueSizesPt));
    const split = measureRecoveryDom({
      ...plan(mountTurns(["a"])),
      dialogueCeilingsPt: { unit: ceiling },
    });
    expect(split.dialogueSizesPt["a-0"]).toBe(single.dialogueSizesPt["a-0"]);
    // Alone, the selected page would have been set larger — the ceiling is what keeps one font.
    expect(
      measureRecoveryDom(plan(mountTurns(["a"]))).dialogueSizesPt["a-0"],
    ).toBe(10.5);
  });

  it("keeps the smallest size each unit allowed across sibling passes", async () => {
    const unit = syntheticDialogueUnit();
    const batches = unit.sections.map((section) => ({
      ...unit,
      sections: [section],
    }));
    const sizes = [10.1, 9.4, 9.9];
    const ceilings = await measureDialogueCeilings(
      batches,
      async (batch, measured) => {
        const pt = sizes[unit.sections.indexOf(batch.sections[0])];
        expect(measured.blocks.some((block) => block.dialogueGroup)).toBe(true);
        return {
          rowHeightsMm: {},
          blockMinHeightsMm: {},
          dialogueGapsMm: {},
          dialogueTopMm: 63.42,
          dialogueSizesPt: Object.fromEntries(
            measured.blocks.flatMap((block) =>
              block.dialogueGroup && !block.dialogueCaption
                ? [[block.id, pt]]
                : [],
            ),
          ),
        };
      },
    );
    expect(ceilings).toEqual({ "dialogue-unit-synthetic": 9.4 });
    expect(
      await measureDialogueCeilings([], async () => {
        throw new Error("no pass");
      }),
    ).toEqual({});
  });
});
