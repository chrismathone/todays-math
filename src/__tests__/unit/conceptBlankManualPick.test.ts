import { describe, expect, it } from "vitest";
import {
  conceptBlankSelectionSchema,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import { composeSheets, takeByLevel } from "@/lib/concept-blank/compose";
import {
  pickPool,
  fillPicks,
  pickCounts,
  setPickMode,
  materializePicks,
} from "@/lib/concept-blank/manualPick";

const zero = { 하: 0, 중: 0, 상: 0 };
const sections = [...new Set(FIXTURE_BANK.concepts.map((c) => c.section))];
const selection: ConceptBlankSelection = {
  sections,
  forms: [
    { form: "term", counts: { 하: 2, 중: 1, 상: 1 }, extras: zero },
    { form: "cloze", counts: { 하: 1, 중: 1, 상: 0 }, extras: zero },
  ],
  title: "고른 문항",
  date: "2026-11-12",
};

describe("H2 형식별 직접 고르기", () => {
  it("저장된 정확한 문항·소단원·형식 순서를 그대로 유지한다", () => {
    const pool = pickPool(FIXTURE_BANK, sections, "term", "main");
    const chosen = [pool.at(-1)!, pool[0]];
    const cloze = pickPool(FIXTURE_BANK, sections, "cloze", "main").slice(-1);
    const stored = selectionFromPicks([...cloze, ...chosen]);
    expect(
      materializePicks(
        stored,
        {
          term: { mode: "pick", picks: chosen },
          cloze: { mode: "pick", picks: cloze },
        },
        FIXTURE_BANK,
      ),
    ).toEqual(stored);
  });

  it.each(["missing", "level", "section"])(
    "저장 문항이 달라지면(%s) 고치거나 버리지 않고 거절한다",
    (change) => {
      const picks = pickPool(FIXTURE_BANK, sections, "term", "main").slice(
        0,
        2,
      );
      const id = picks[0].entryId;
      const bank = {
        ...FIXTURE_BANK,
        concepts: FIXTURE_BANK.concepts.flatMap((entry) =>
          entry.id !== id
            ? [entry]
            : change === "missing"
              ? []
              : [
                  {
                    ...entry,
                    ...(change === "level"
                      ? { level: "상" as const }
                      : { section: sections.at(-1)! }),
                  },
                ],
        ),
      };
      expect(() =>
        materializePicks(
          selectionFromPicks(picks),
          { term: { mode: "pick", picks } },
          bank,
        ),
      ).toThrow(/다시 확인/);
    },
  );
  it("자동만 쓰면 기존 선택과 합치기를 그대로 둔다", () => {
    expect(materializePicks(selection, {}, FIXTURE_BANK)).toBe(selection);
  });

  it("직접은 고른 것만, 자동 형식은 takeByLevel로 뽑은 문항을 정확한 선택에 싣는다", () => {
    const chosen = pickPool(FIXTURE_BANK, sections, "term", "main").slice(-1);
    const result = materializePicks(
      selection,
      { term: { mode: "pick", picks: chosen } },
      FIXTURE_BANK,
    )!;
    expect(conceptBlankSelectionSchema.safeParse(result).success).toBe(true);
    expect(result.pick!.filter((p) => p.form === "term")).toEqual(chosen);
    const automatic = composeSheets(
      { ...selection, forms: [selection.forms[1]] },
      FIXTURE_BANK,
    )[0];
    expect(automatic.form).toBe("cloze");
    if (automatic.form !== "cloze") throw new Error("fixture");
    expect(
      result
        .pick!.filter((p) => p.form === "cloze")
        .map((p) => p.entryId)
        .sort(),
    ).toEqual(automatic.sentences.map((p) => p.id).sort());
    expect(result.title).toBe(selection.title);
    expect(result.date).toBe(selection.date);
    expect(result.forms[0].counts).toEqual(pickCounts(chosen, "main"));
  });

  it("빈 칸만은 이미 고른 것을 남기고 목표 수까지 채운다 — 낮춘 목표도 기존 선택을 지우지 않는다", () => {
    const pool = pickPool(FIXTURE_BANK, sections, "term", "main");
    const chosen = pool.filter((p) => p.level === "하").slice(-1);
    const filled = fillPicks(pool, chosen, { 하: 2, 중: 1, 상: 0 }, "missing");
    expect(filled).toEqual(expect.arrayContaining(chosen));
    expect(pickCounts(filled, "main")).toEqual({ 하: 2, 중: 1, 상: 0 });
    expect(fillPicks(pool, filled, zero, "missing")).toEqual(filled);
    expect(new Set(filled.map((p) => p.entryId)).size).toBe(filled.length);
  });

  it("모두 비우고는 현재 종류만 바꾼다 — 필터와 관계없이 같은 takeByLevel 규칙", () => {
    const pool = pickPool(FIXTURE_BANK, sections, "term", "main");
    const extra = pickPool(FIXTURE_BANK, sections, "term", "extra").slice(0, 1);
    const counts = { 하: 1, 중: 1, 상: 1 };
    const filled = fillPicks(
      pool,
      [...pool.slice(-2), ...extra],
      counts,
      "replace",
    );
    expect(filled).toEqual(expect.arrayContaining(extra));
    const expected = takeByLevel(
      pool.map((p) => ({
        pick: p,
        section: p.blankSectionKey,
        level: p.level,
      })),
      counts,
    ).map(({ pick }) => pick);
    expect(filled.filter((p) => p.entryKind === "concept")).toEqual(expected);
  });

  it("자동 ↔ 직접 왕복과 형식 꺼짐은 고른 문항을 바꾸지 않는다", () => {
    const draft = {
      mode: "pick" as const,
      picks: pickPool(FIXTURE_BANK, sections, "term", "main").slice(-2),
    };
    const automatic = setPickMode(draft, "auto");
    expect(automatic.picks).toBe(draft.picks);
    expect(setPickMode(automatic, "pick")).toEqual(draft);
    const off = { ...selection, forms: [selection.forms[1]] };
    expect(materializePicks(off, { term: draft }, FIXTURE_BANK)).toBe(off);
  });

  it("범위 밖 고르기는 내보내지 않고, 활성 직접 형식이 비어 있으면 자동으로 대신 채우지 않는다", () => {
    expect(
      materializePicks(
        { ...selection, forms: [selection.forms[0]] },
        { term: { mode: "pick", picks: [] } },
        FIXTURE_BANK,
      ),
    ).toBeNull();
    const picked = pickPool(FIXTURE_BANK, sections, "term", "main").slice(0, 1);
    expect(
      materializePicks(
        {
          ...selection,
          sections: sections.filter((s) => s !== picked[0].blankSectionKey),
          forms: [selection.forms[0]],
        },
        { term: { mode: "pick", picks: picked } },
        FIXTURE_BANK,
      ),
    ).toBeNull();
  });

  it("형식 제외와 A 사례 제외를 공통 판정에 맞춰 거른다", () => {
    const base = FIXTURE_BANK.concepts[0];
    const bank = {
      ...FIXTURE_BANK,
      concepts: [
        {
          ...base,
          bQuestion: null,
          clozeQuestion: null,
          givenCase: true as const,
        },
      ],
    };
    for (const form of ["term", "cloze", "map", "recall"] as const)
      expect(pickPool(bank, sections, form, "main")).toEqual([]);
  });
});
