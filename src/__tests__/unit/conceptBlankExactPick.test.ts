import { describe, expect, it } from "vitest";
import {
  conceptBlankSelectionSchema,
  conceptBlankDocumentSchema,
  type ConceptBlankPick,
} from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { composeSheets } from "@/lib/concept-blank/compose";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import {
  encodeSelection,
  decodeSelection,
} from "@/lib/concept-blank/selectionCodec";
import { encodeSheetCode } from "@/lib/concept-blank/sheetCode";
import { planSheet } from "@/components/concept-blank/paper/paginate";

const line = FIXTURE_BANK.concepts.find((e) => e.id === "fx-line")!;
const property = FIXTURE_BANK.concepts.find((e) => e.id === "fx-line-prop")!;
const ox = FIXTURE_BANK.ox[0];
const pick = (
  entry = line,
  form: ConceptBlankPick["form"] = "term",
): ConceptBlankPick => ({
  blankSectionKey: entry.section,
  entryKind: "concept",
  entryId: entry.id,
  form,
  level: entry.level,
});

describe("frozen exact concept selection", () => {
  it("preserves group and arbitrary main/extra entry order through the printed plan", () => {
    const selection = selectionFromPicks([
      pick(property),
      {
        blankSectionKey: ox.section,
        entryKind: "ox",
        entryId: ox.id,
        form: "term",
        level: ox.level,
      },
      pick(line),
      pick(line, "cloze"),
    ]);
    const sheets = composeSheets(selection, FIXTURE_BANK);
    expect(sheets.map((s) => s.form)).toEqual(["term", "cloze"]);
    const plan = planSheet(sheets[0]);
    expect(
      plan.student.flatMap((p) =>
        p.form === "term"
          ? p.blocks.map((b) => (b.kind === "term" ? b.entry.id : b.item.id))
          : [],
      ),
    ).toEqual([property.id, ox.id, line.id]);
    expect(
      plan.key
        .flat()
        .map((r) => (r.kind === "concept" ? r.entry.id : r.item.id)),
    ).toEqual([property.id, ox.id, line.id]);
  });
  it("uses frozen labels even when source sections no longer exist", () => {
    const old = { ...line, section: "초5::예전 단원::예전 소단원" };
    const selection = selectionFromPicks([pick(old, "recall")]);
    const [sheet] = composeSheets(
      selection,
      { concepts: [old], ox: [], apply: [], figures: [] },
      [
        {
          blankSectionKey: old.section,
          title: "발행 당시 소단원",
          unitLabel: "발행 당시 단원",
        },
      ],
    );
    expect(sheet.header.unitLabel).toBe("발행 당시 단원");
    expect(sheet.form === "recall" && sheet.zones[0].title).toBe(
      "발행 당시 소단원",
    );
    expect(() =>
      composeSheets(selection, {
        concepts: [old],
        ox: [],
        apply: [],
        figures: [],
      }),
    ).toThrow(/소단원/);
  });
  it("rejects unresolved, wrong level/section and recall givenCase without dropping entries", () => {
    const selection = selectionFromPicks([pick()]);
    expect(() =>
      composeSheets(
        selectionFromPicks([{ ...pick(), entryId: "missing" }]),
        FIXTURE_BANK,
      ),
    ).toThrow(/찾을 수/);
    expect(() =>
      composeSheets(
        selectionFromPicks([{ ...pick(), level: "상" }]),
        FIXTURE_BANK,
      ),
    ).toThrow(/난이도/);
    expect(() =>
      composeSheets(selection, {
        ...FIXTURE_BANK,
        concepts: FIXTURE_BANK.concepts.map((e) =>
          e.id === line.id ? { ...e, section: property.section + "틀림" } : e,
        ),
      }),
    ).toThrow(/소단원/);
    expect(() =>
      composeSheets(selectionFromPicks([pick(line, "recall")]), {
        ...FIXTURE_BANK,
        concepts: FIXTURE_BANK.concepts.map((e) =>
          e.id === line.id ? { ...e, givenCase: true } : e,
        ),
      }),
    ).toThrow(/사례/);
  });
  it("rejects duplicates, recurring groups, wrong forms and count/extras disagreement", () => {
    expect(() => selectionFromPicks([pick(), pick()])).toThrow();
    expect(() =>
      selectionFromPicks([pick(), pick(line, "map"), pick(property)]),
    ).toThrow();
    expect(() =>
      selectionFromPicks([{ ...pick(), entryKind: "ox", form: "map" }]),
    ).toThrow();
    const selection = selectionFromPicks([pick()]);
    expect(
      conceptBlankSelectionSchema.safeParse({
        ...selection,
        forms: [{ ...selection.forms[0], extras: { 하: 1, 중: 0, 상: 0 } }],
      }).success,
    ).toBe(false);
    expect(
      conceptBlankSelectionSchema.safeParse({ ...selection, unexpected: 1 })
        .success,
    ).toBe(false);
  });
  it("persists picks in documents and versioned URLs, but never in sheet codes", () => {
    const selection = selectionFromPicks([pick()]);
    expect(conceptBlankDocumentSchema.parse({ selection }).selection).toEqual(
      selection,
    );
    expect(decodeSelection(encodeSelection(selection))).toEqual(selection);
    expect(() => encodeSheetCode(selection, FIXTURE_BANK)).toThrow();
    const bytes = new TextEncoder().encode(JSON.stringify(selection));
    const url = btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(""));
    expect(decodeSelection(url)).toBeNull();
    const legacy = { sections: selection.sections, forms: selection.forms };
    expect(
      Object.hasOwn(conceptBlankSelectionSchema.parse(legacy), "pick"),
    ).toBe(false);
    expect(decodeSelection(encodeSelection(legacy))).toEqual(legacy);
  });
});
