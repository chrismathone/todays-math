// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  CONCEPT_BLANK_FORMS,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import type { ScanGrade } from "@/contracts/conceptBlankScan.contract";
import { scanMarkupNoteSchema } from "@/contracts/conceptBlankScanMarkup.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { createScanSnapshot } from "@/lib/concept-blank/scan/snapshot";
import {
  gradeScanPage,
  SCAN_GRADE_PROMPT_VERSION,
  SCAN_GRADE_MARKUP_PROMPT_VERSION,
} from "@/lib/concept-blank/scan/grade";
import {
  SCAN_GRADE_OUTPUT_SCHEMA,
  SCAN_GRADE_MARKUP_OUTPUT_SCHEMA,
} from "@/lib/concept-blank/scan/output";
import { validateScanMarkupNotes } from "@/lib/concept-blank/scan/markup";
import type { ScanModel } from "@/lib/concept-blank/scan/model";

const selection: ConceptBlankSelection = {
  sections: [...new Set(FIXTURE_BANK.concepts.map((c) => c.section))],
  forms: CONCEPT_BLANK_FORMS.map((form) => ({
    form,
    counts: { 하: 40, 중: 40, 상: 40 },
    extras: { 하: 40, 중: 40, 상: 40 },
  })),
};
const clozePage = () =>
  createScanSnapshot(selection, FIXTURE_BANK).pages.find(
    (p) => p.form === "cloze",
  )!;

const ANSWER = "접는 선이 대칭축이다";
function setup() {
  const page = clozePage();
  const target = page.targets[0]!;
  const slotId = target.slotIds[0]!;
  const readings = page.slots.map((s) => ({
    id: s.id,
    status: "read" as const,
    text: s.id === slotId ? ANSWER : "다른 칸의 답",
  }));
  const grades: ScanGrade[] = page.targets.map((t) => ({
    id: t.id,
    label: t.id === target.id ? "incorrect" : "correct",
    reason: "까닭",
    directlyEntered: false,
  }));
  return { page, target, slotId, readings, grades };
}
const note = (over: Record<string, unknown> = {}) => ({
  targetId: "",
  slotId: "",
  kind: "wrong",
  quote: "접는 선",
  say: "이 선의 이름을 물었어요.",
  fix: "",
  ...over,
});

describe("scan markup note contract", () => {
  it("keeps every note on one short line", () => {
    const ok = {
      targetId: "t",
      slotId: "s",
      kind: "wrong",
      quote: "a",
      say: "b",
      fix: "",
    };
    expect(scanMarkupNoteSchema.safeParse(ok).success).toBe(true);
    for (const bad of [
      { ...ok, say: "첫째\n둘째" },
      { ...ok, quote: "" },
      { ...ok, say: "가".repeat(61) },
      { ...ok, fix: "가".repeat(81) },
      { ...ok, kind: "praise" },
      { ...ok, extra: 1 },
    ])
      expect(scanMarkupNoteSchema.safeParse(bad).success).toBe(false);
  });
});

describe("validateScanMarkupNotes — the code decides what may be drawn", () => {
  it("keeps a note whose quote is a unique part of that slot's original reading", () => {
    const { page, target, slotId, readings, grades } = setup();
    const { notes, dropped } = validateScanMarkupNotes({
      page,
      grades,
      readings,
      corrections: [],
      modelTargets: [target.id],
      rows: [note({ targetId: target.id, slotId })],
    });
    expect(dropped).toEqual([]);
    expect(notes).toEqual([
      expect.objectContaining({ targetId: target.id, slotId, quote: "접는 선" }),
    ]);
  });

  it("drops notes it cannot place or must not show, and says why", () => {
    const { page, target, slotId, readings, grades } = setup();
    const correctTarget = page.targets[1]!;
    const otherSlot = page.slots.find((s) => !target.slotIds.includes(s.id))!;
    const rows = [
      note({ targetId: target.id, slotId, quote: "대칭점" }), // not in the reading
      note({ targetId: target.id, slotId: otherSlot.id }), // slot of another target
      note({ targetId: correctTarget.id, slotId: correctTarget.slotIds[0] }), // correct answer
      note({ targetId: "unknown", slotId }), // unknown target
      note({ targetId: target.id, slotId, say: "둘\n줄" }), // malformed
      { targetId: target.id },
    ];
    const { notes, dropped } = validateScanMarkupNotes({
      page,
      grades,
      readings,
      corrections: [],
      modelTargets: [target.id, correctTarget.id],
      rows,
    });
    expect(notes).toEqual([]);
    expect(dropped.map((d) => d.reason)).toEqual([
      "quote-not-found",
      "slot-not-in-target",
      "label-not-marked",
      "unknown-target",
      "malformed",
      "malformed",
    ]);
  });

  it("does not point at a quote that appears twice, nor across slots", () => {
    const { page, target, slotId, readings, grades } = setup();
    const twice = readings.map((r) =>
      r.id === slotId ? { ...r, text: "선 하나와 선 하나" } : r,
    );
    const { dropped } = validateScanMarkupNotes({
      page,
      grades,
      readings: twice,
      corrections: [],
      modelTargets: [target.id],
      rows: [note({ targetId: target.id, slotId, quote: "선 하나" })],
    });
    expect(dropped.map((d) => d.reason)).toEqual(["quote-not-unique"]);
  });

  it("never uses a direct entry or an uncertain reading as paper evidence", () => {
    const { page, target, slotId, readings, grades } = setup();
    const corrected = validateScanMarkupNotes({
      page,
      grades,
      readings,
      corrections: [
        {
          slotId,
          text: ANSWER,
          directlyEntered: true,
          actor: { kind: "student", id: crypto.randomUUID() },
          at: new Date().toISOString(),
        },
      ],
      modelTargets: [target.id],
      rows: [note({ targetId: target.id, slotId })],
    });
    expect(corrected.dropped.map((d) => d.reason)).toEqual(["direct-entry"]);
    const uncertain = validateScanMarkupNotes({
      page,
      grades,
      readings: readings.map((r) =>
        r.id === slotId ? { ...r, status: "uncertain" as const } : r,
      ),
      corrections: [],
      modelTargets: [target.id],
      rows: [note({ targetId: target.id, slotId })],
    });
    expect(uncertain.dropped.map((d) => d.reason)).toEqual(["reading-not-read"]);
  });

  it("only marks targets the model graded, at most three per target, no duplicates", () => {
    const { page, target, slotId, readings, grades } = setup();
    const long = readings.map((r) =>
      r.id === slotId ? { ...r, text: "가 나 다 라 마" } : r,
    );
    const rows = ["가", "나", "나", "다", "라"].map((q) =>
      note({ targetId: target.id, slotId, quote: q }),
    );
    const out = validateScanMarkupNotes({
      page,
      grades,
      readings: long,
      corrections: [],
      modelTargets: [target.id],
      rows,
    });
    expect(out.notes.map((n) => n.quote)).toEqual(["가", "나", "다"]);
    expect(out.dropped.map((d) => d.reason)).toEqual(["duplicate", "too-many"]);
    const notGraded = validateScanMarkupNotes({
      page,
      grades,
      readings,
      corrections: [],
      modelTargets: [],
      rows: [note({ targetId: target.id, slotId })],
    });
    expect(notGraded.dropped.map((d) => d.reason)).toEqual([
      "not-model-graded",
    ]);
  });
});

describe("gradeScanPage with markup", () => {
  it("leaves the shipped prompt and schema untouched when markup is not asked for", async () => {
    const { page, readings } = setup();
    const model = vi.fn<ScanModel>().mockResolvedValue('{"grades":[]}');
    await gradeScanPage({ page, readings, corrections: [] }, model);
    const request = model.mock.calls[0]![0];
    expect(request.promptVersion).toBe(SCAN_GRADE_PROMPT_VERSION);
    expect(request.jsonSchema).toBe(SCAN_GRADE_OUTPUT_SCHEMA);
    expect(request.prompt).not.toContain("notes");
  });

  it("asks for notes under its own version and hands back only validated ones", async () => {
    const { page, target, slotId, readings } = setup();
    const grades = page.targets.map((t) => ({
      id: t.id,
      label: t.id === target.id ? "incorrect" : "correct",
      reason: "까닭",
    }));
    const model = vi.fn<ScanModel>().mockResolvedValue(
      JSON.stringify({
        grades,
        notes: [
          note({ targetId: target.id, slotId }),
          note({ targetId: page.targets[1]!.id, slotId: page.targets[1]!.slotIds[0] }),
        ],
      }),
    );
    const onNotes = vi.fn();
    const result = await gradeScanPage(
      { page, readings, corrections: [], markup: { onNotes } },
      model,
    );
    const request = model.mock.calls[0]![0];
    expect(request.promptVersion).toBe(SCAN_GRADE_MARKUP_PROMPT_VERSION);
    expect(request.jsonSchema).toBe(SCAN_GRADE_MARKUP_OUTPUT_SCHEMA);
    expect(result.find((g) => g.id === target.id)!.label).toBe("incorrect");
    expect(onNotes).toHaveBeenCalledTimes(1);
    const { notes, dropped } = onNotes.mock.calls[0]![0];
    expect(notes.map((n: { targetId: string }) => n.targetId)).toEqual([
      target.id,
    ]);
    expect(dropped.map((d: { reason: string }) => d.reason)).toEqual([
      "label-not-marked",
    ]);
  });

  it("keeps the grades when the notes are broken or missing", async () => {
    const { page, target, readings } = setup();
    const grades = page.targets.map((t) => ({
      id: t.id,
      label: t.id === target.id ? "incorrect" : "correct",
      reason: "까닭",
    }));
    for (const notes of ["broken", null, [{ nope: 1 }], undefined]) {
      const model = vi
        .fn<ScanModel>()
        .mockResolvedValue(JSON.stringify({ grades, notes }));
      const onNotes = vi.fn();
      const result = await gradeScanPage(
        { page, readings, corrections: [], markup: { onNotes } },
        model,
      );
      expect(result.find((g) => g.id === target.id)!.label).toBe("incorrect");
      expect(onNotes.mock.calls[0]![0].notes).toEqual([]);
    }
  });
});
