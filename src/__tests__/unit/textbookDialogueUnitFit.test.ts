// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  dialogueMeasurementModel,
  dialogueMeasurementPasses,
  recoveryMeasurePlan,
  assertRecoveryMeasurementBudget,
  applyRecoveryMeasurements,
} from "@/lib/textbook/render/recoveryMeasurement";
import { measurementHtml } from "@/lib/textbook/render/html";
import type { RenderBlock } from "@/lib/textbook/render/model";
import {
  STEP_MAX_BLOCKS,
  STEP_MAX_SECTIONS,
  planChunks,
} from "@/lib/textbook/publish/reserve";
import {
  blockCount,
  dialogueIds,
  judgeDialogueUnit,
  syntheticDialogueUnit,
  type DialoguePageWitness,
} from "../helpers/textbookDialogueUnitProof";

describe("bounded semantic dialogue unit fit (synthetic Node proof)", () => {
  it("groups all three curriculum sections and their captions by BANK unit", () => {
    const whole = syntheticDialogueUnit();
    const before = JSON.stringify(whole);
    const ids = dialogueIds(whole);
    for (const section of whole.sections) {
      const selected = { ...whole, sections: [section] };
      const sizing = dialogueMeasurementModel(whole, selected);
      const plan = recoveryMeasurePlan(sizing);
      expect(dialogueIds(sizing).sort()).toEqual(ids.toSorted());
      expect(
        new Set(
          plan.blocks.flatMap((block) =>
            block.dialogueGroup ? [block.dialogueGroup] : [],
          ),
        ),
      ).toEqual(new Set(["dialogue-unit-synthetic"]));
      expect(
        new Set(
          plan.blocks.flatMap((block) =>
            block.dialoguePage ? [block.dialoguePage] : [],
          ),
        ).size,
      ).toBe(3);
      expect(plan.blocks.filter((block) => block.dialogueCaption)).toHaveLength(
        3,
      );
      expect(selected.sections).toHaveLength(1);
      expect(blockCount(sizing)).toBeLessThan(600);
    }
    expect(JSON.stringify(whole)).toBe(before);
  });

  it("does not probe other units or activate semantic-absent legacy dialogue", () => {
    const whole = syntheticDialogueUnit();
    const legacy = structuredClone(whole.sections[2]);
    legacy.sectionKey = "dialogue-unit-legacy";
    for (const block of legacy.blocks) {
      delete block.semantic;
      delete block.dialogueLesson;
    }
    const other = structuredClone(whole.sections[2]);
    other.unitKey = "dialogue-unit-other";
    other.sectionKey = "dialogue-unit-other-section";
    whole.sections.push(legacy, other);
    const selectedLegacy = { ...whole, sections: [legacy] };
    expect(dialogueMeasurementModel(whole, selectedLegacy).sections).toEqual([
      legacy,
    ]);
    expect(
      recoveryMeasurePlan(selectedLegacy).blocks.some(
        (block) => block.dialogueGroup,
      ),
    ).toBe(false);
    const sizing = dialogueMeasurementModel(whole, {
      ...whole,
      sections: [whole.sections[0]],
    });
    expect(
      sizing.sections.some((section) => section.unitKey === other.unitKey),
    ).toBe(false);
  });

  it("counts selected blocks plus private dialogue and recall probes at the 600 boundary", () => {
    const whole = syntheticDialogueUnit();
    const sizing = dialogueMeasurementModel(whole, {
      ...whole,
      sections: [whole.sections[0]],
    });
    const base = whole.sections[0].blocks[0];
    const probe = {
      ...whole,
      sections: [
        {
          ...whole.sections[0],
          blocks: Array.from(
            { length: 600 - blockCount(sizing) },
            (_, index) => ({
              ...base,
              id: `private-dialogue-unit-probe-${index}`,
            }),
          ),
        },
      ],
    };
    expect(() => assertRecoveryMeasurementBudget(sizing, probe)).not.toThrow();
    probe.sections[0].blocks.push({
      ...base,
      id: "private-dialogue-unit-over-limit",
    });
    expect(() => assertRecoveryMeasurementBudget(sizing, probe)).toThrow(
      "including private helpers",
    );
    expect(() =>
      assertRecoveryMeasurementBudget({
        ...whole,
        sections: Array.from({ length: 9 }, () => whole.sections[0]),
      }),
    ).toThrow("8 sections");
  });

  // The 8-section · 600-block cap bounds one measurement DOM, not a unit: a chapter with more
  // dialogue lessons (중2 «방정식» has 9, 중1 «방정식» 13) is measured in bounded sibling passes.
  it("divides a unit beyond one measurement DOM into bounded sibling passes", () => {
    const whole = syntheticDialogueUnit();
    const first = whole.sections[0];
    whole.sections = Array.from({ length: 9 }, (_, index) => ({
      ...first,
      sectionKey: `dialogue-unit-cap-${index}`,
    }));
    const selected = { ...whole, sections: [whole.sections[0]] };
    const context = dialogueMeasurementModel(whole, selected);
    expect(context.sections).toHaveLength(9);
    const passes = dialogueMeasurementPasses(context, selected);
    expect(passes.sizing.sections).toEqual([whole.sections[0]]);
    expect(passes.batches.map((batch) => batch.sections.length)).toEqual([8]);
    expect(
      passes.batches.flatMap((batch) =>
        batch.sections.map((section) => section.sectionKey),
      ),
    ).toEqual(whole.sections.slice(1).map((section) => section.sectionKey));
    // A unit that fits keeps its single pass.
    const small = syntheticDialogueUnit();
    const one = { ...small, sections: [small.sections[0]] };
    expect(
      dialogueMeasurementPasses(dialogueMeasurementModel(small, one), one)
        .batches,
    ).toEqual([]);
  });

  it("refuses a sibling section that alone exceeds one measurement DOM", () => {
    const whole = syntheticDialogueUnit();
    const turn = whole.sections[1].blocks.find(
      (block) => block.kind === "dialogue",
    )!;
    whole.sections[1].blocks = Array.from({ length: 601 }, (_, index) => ({
      ...turn,
      id: `dialogue-unit-huge-${index}`,
    }));
    const selected = { ...whole, sections: [whole.sections[0]] };
    expect(() =>
      dialogueMeasurementPasses(
        dialogueMeasurementModel(whole, selected),
        selected,
      ),
    ).toThrow("한도");
  });

  it("leaves semantic-absent legacy dialogue and source raw fragments byte-for-byte unchanged", () => {
    const model = syntheticDialogueUnit();
    const base = model.sections[0].blocks.find(
      (block) => block.kind === "dialogue",
    )!;
    const legacy = {
      ...base,
      id: "dialogue-unit-legacy-turn",
      sourceBlockId: "dialogue-unit-legacy-turn",
    };
    delete legacy.semantic;
    const raw: RenderBlock = {
      unitKey: base.unitKey,
      sectionKey: base.sectionKey,
      id: "dialogue-unit-raw-source",
      sourceBlockId: "dialogue-unit-raw-source",
      kind: "text",
      markdown: "원본 미사용 대체문",
      semantic: {
        activity: "dialogue",
        source: {
          unit: "U01",
          page: 3,
          kind: "raw",
          path: "pages[2].blocks[0]",
        },
        node: {
          kind: "fragments",
          fragments: [
            { tag: "p", rawText: "원본 [[\\frac{1}{2}]]와 {{핵심어}}" },
          ],
        },
      },
    };
    model.sections[0].blocks = [legacy, raw];
    model.sections = [model.sections[0]];
    const before = JSON.stringify(model);
    const resources = {
      assetUrl: () => "/synthetic-portrait.png",
      qrDataUrl: () => "",
    };
    const html = measurementHtml(model, resources);
    expect(
      recoveryMeasurePlan(model).blocks.some((block) => block.dialogueGroup),
    ).toBe(false);
    applyRecoveryMeasurements(model, {
      rowHeightsMm: {},
      blockMinHeightsMm: {},
      dialogueSizesPt: { "some-other-bank-turn": 9.2 },
      dialogueGapsMm: {},
      dialogueTopMm: 63.42,
    });
    expect(JSON.stringify(model)).toBe(before);
    expect(measurementHtml(model, resources)).toBe(html);
  });

  it("keeps publisher 4-section/300-block limits", () => {
    expect([STEP_MAX_SECTIONS, STEP_MAX_BLOCKS]).toEqual([4, 300]);
    const chunks = planChunks(
      Array.from({ length: 9 }, (_, index) => ({
        id: `dialogue-unit-publish-${index}`,
        blocks: 100,
      })),
    );
    expect(chunks.map((chunk) => chunk.length)).toEqual([3, 3, 3]);
  });

  it("the independent gate rejects wrong font, smaller paper and missing unit content", () => {
    const page: DialoguePageWitness = {
      index: 2,
      paperMm: [210, 297],
      fontsReady: true,
      blocks: [
        {
          id: "dialogue-unit-control",
          pt: 9.8,
          bottomMm: 240,
          clipped: false,
          speechPt: [9.8],
          families: ["TextbookPretendard"],
          mathCount: 1,
        },
      ],
    };
    expect(judgeDialogueUnit([page], ["dialogue-unit-control"], 9.8)).toEqual(
      [],
    );
    expect(
      judgeDialogueUnit(
        [{ ...page, blocks: [{ ...page.blocks[0], speechPt: [10.5] }] }],
        ["dialogue-unit-control"],
        9.8,
      ),
    ).toContain("common-unit-font");
    expect(
      judgeDialogueUnit(
        [{ ...page, paperMm: [210, 220] }],
        ["dialogue-unit-control"],
        9.8,
      ),
    ).toContain("paper-size");
    expect(judgeDialogueUnit([page], ["dialogue-unit-missing"], 9.8)).toContain(
      "missing-or-duplicate-dialogue",
    );
  });
});
