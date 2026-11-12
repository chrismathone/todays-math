import { describe, expect, it } from "vitest";
import { zlibSync } from "fflate";
import {
  conceptBlankSelectionSchema,
  CONCEPT_BLANK_FORMS,
  CONCEPT_BLANK_LEVELS,
  type ConceptBlankPick,
  type ConceptBlankSelection,
} from "@/contracts/conceptBlank.contract";
import { selectionFromPicks } from "@/lib/concept-blank/exactPick";
import { FIXTURE_BANK } from "@/lib/concept-blank/fixture";
import {
  decodeSelection,
  encodeSelection,
} from "@/lib/concept-blank/selectionCodec";

it("60개 소단원·840문항도 압축된 인쇄 주소 하나로 왕복한다", () => {
  const picks: ConceptBlankPick[] = CONCEPT_BLANK_FORMS.flatMap((form) =>
    Array.from({ length: 60 }, (_, section) => {
      const kinds: ConceptBlankPick["entryKind"][] =
        form === "figure"
          ? ["figure"]
          : form === "term"
            ? ["concept", "ox"]
            : form === "cloze"
              ? ["concept", "apply"]
              : ["concept"];
      return kinds.flatMap((kind) =>
        [0, 1].map((i) => ({
          form,
          entryKind: kind,
          entryId: `question-${form}-${kind}-${section}-${i}`,
          level: CONCEPT_BLANK_LEVELS[(section * 2 + i) % 3],
          blankSectionKey: `초5::여러 단원의 개념을 모아 복습하기::${section}번째 소단원의 뜻과 성질을 설명하기`,
        })),
      );
    }).flat(),
  );
  const selection = selectionFromPicks(picks);
  const code = encodeSelection(selection);
  expect(picks).toHaveLength(840);
  expect(code.startsWith("z1.")).toBe(true);
  // 16KiB 요청 헤더 안에서 인증 쿠키·경로의 자리를 남긴다.
  expect(code.length).toBeLessThan(12 * 1024);
  expect(decodeSelection(code)).toEqual(selection);
});

it("깨진 압축 주소와 과대 해제 결과를 제한된 버퍼에서 거절한다", () => {
  expect(decodeSelection("z1.bad")).toBeNull();
  const bomb = Buffer.from(
    zlibSync(new TextEncoder().encode(" ".repeat(200_000))),
  ).toString("base64url");
  expect(decodeSelection(`z1.${bomb}`)).toBeNull();
});

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function payload(code: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(code, "base64url").toString("utf8"));
}

const line = FIXTURE_BANK.concepts.find((entry) => entry.id === "fx-line")!;
const property = FIXTURE_BANK.concepts.find(
  (entry) => entry.id === "fx-line-prop",
)!;
const ox = FIXTURE_BANK.ox[0];
const apply = FIXTURE_BANK.apply[0];
const figure = FIXTURE_BANK.figures[0];
const conceptPick = (
  entry = line,
  form: ConceptBlankPick["form"] = "term",
): ConceptBlankPick => ({
  blankSectionKey: entry.section,
  entryKind: "concept",
  entryId: entry.id,
  form,
  level: entry.level,
});

const EXACT: ConceptBlankSelection = {
  ...selectionFromPicks([
    conceptPick(property),
    {
      blankSectionKey: ox.section,
      entryKind: "ox",
      entryId: ox.id,
      form: "term",
      level: ox.level,
    },
    conceptPick(),
    conceptPick(line, "cloze"),
    {
      blankSectionKey: apply.section,
      entryKind: "apply",
      entryId: apply.id,
      form: "cloze",
      level: apply.level,
    },
    conceptPick(line, "map"),
    conceptPick(line, "recall"),
    {
      blankSectionKey: figure.section,
      entryKind: "figure",
      entryId: figure.id,
      form: "figure",
      level: figure.level,
    },
  ]),
  title: "직접 고른 개념 · 복습",
  date: "2026-11-12",
};

describe("concept blank selection URL compatibility", () => {
  it("preserves the original automatic JSON bytes and title/date", () => {
    const { sections, forms, title, date } = EXACT;
    const automatic = { sections, forms, title, date };
    const legacy = encodeJson(conceptBlankSelectionSchema.parse(automatic));
    expect(encodeSelection(automatic)).toBe(legacy);
    expect(decodeSelection(legacy)).toEqual(automatic);
  });

  it("round-trips every entry kind, form, order, counts, title and date exactly", () => {
    const code = encodeSelection(EXACT);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSelection(code)).toEqual(EXACT);
    expect(encodeSelection(decodeSelection(code)!)).toBe(code);
  });

  it("keeps optional title/date absent, and preserves an explicitly empty title", () => {
    const selection = selectionFromPicks([conceptPick()]);
    expect(decodeSelection(encodeSelection(selection))).toEqual(selection);
    const emptyTitle = { ...selection, title: "" };
    expect(decodeSelection(encodeSelection(emptyTitle))).toEqual(emptyTitle);
  });

  it("uses bounded compact tuples instead of repeating section names in 120 picks", () => {
    const selection = selectionFromPicks(
      (["하", "중", "상"] as const).flatMap((level) =>
        Array.from({ length: 40 }, (_, index) => ({
          ...conceptPick(),
          entryId: `e5-2-3-3-${level === "하" ? "l" : level === "중" ? "m" : "h"}-${index}`,
          level,
        })),
      ),
    );
    const code = encodeSelection(selection);
    expect(code.length).toBeLessThan(8192);
    expect(code.length).toBeLessThan(encodeJson(selection).length / 3);
    expect(decodeSelection(code)).toEqual(selection);
  });

  it("rejects invalid exact counts on encoding instead of silently changing them", () => {
    const selection = selectionFromPicks([conceptPick()]);
    selection.forms[0].counts.하 = 2;
    expect(() => encodeSelection(selection)).toThrow();
    expect(decodeSelection(encodeJson(selection))).toBeNull();
  });

  it("bounds both encoding and decoding before accepting an oversized URL", () => {
    const automatic = {
      sections: [`초5::${"가".repeat(17000)}::소단원`],
      forms: EXACT.forms.slice(0, 1),
    };
    const code = encodeJson(automatic);
    expect(code.length).toBeGreaterThan(64 * 1024);
    expect(() => encodeSelection(automatic)).toThrow(/주소가 너무 깁니다/);
    expect(decodeSelection(code)).toBeNull();
  });

  it.each([
    { title: "긴".repeat(41) },
    { title: 123 },
    { date: "2026/11/12" },
    { date: null },
    { forms: [{ ...EXACT.forms[0], counts: { 하: -1, 중: 0, 상: 0 } }] },
    { forms: [{ ...EXACT.forms[0], counts: { 하: 1.5, 중: 0, 상: 0 } }] },
    { forms: [{ ...EXACT.forms[0], counts: { 하: 41, 중: 0, 상: 0 } }] },
  ])(
    "rejects malformed title/date/counts in automatic and exact URLs (%#)",
    (change) => {
      const { sections, forms, title, date } = EXACT;
      const automatic = { sections, forms, title, date };
      expect(
        decodeSelection(encodeJson({ ...automatic, ...change })),
      ).toBeNull();
      const value = payload(encodeSelection(EXACT));
      expect(
        decodeSelection(
          encodeJson({ ...value, s: { ...automatic, ...change } }),
        ),
      ).toBeNull();
    },
  );

  it.each([
    undefined,
    null,
    "",
    "%%%",
    "not-a-code",
    "a".repeat(64 * 1024 + 1),
    encodeJson({ sections: [], forms: [] }),
    encodeJson({ ...EXACT, unexpected: true }),
    encodeJson(EXACT), // Unversioned exact JSON was never a supported URL.
  ])(
    "returns null for missing, malformed or unversioned exact input (%#)",
    (code) => {
      expect(decodeSelection(code)).toBeNull();
    },
  );

  it.each([
    [
      "unknown version",
      (value: Record<string, unknown>) => ({ ...value, v: 2 }),
    ],
    [
      "unknown field",
      (value: Record<string, unknown>) => ({ ...value, extra: 1 }),
    ],
    ["missing IDs", (value: Record<string, unknown>) => ({ ...value, i: [] })],
    [
      "missing picks",
      (value: Record<string, unknown>) => ({ ...value, p: [] }),
    ],
    [
      "too many picks",
      (value: Record<string, unknown>) => ({
        ...value,
        p: Array(2001).fill([0, 0, 0, 0, 0]),
      }),
    ],
    [
      "wrong tuple size",
      (value: Record<string, unknown>) => ({ ...value, p: [[0, 0, 0, 0]] }),
    ],
    [
      "negative index",
      (value: Record<string, unknown>) => ({ ...value, p: [[-1, 0, 0, 0, 0]] }),
    ],
    [
      "fractional index",
      (value: Record<string, unknown>) => ({
        ...value,
        p: [[0.5, 0, 0, 0, 0]],
      }),
    ],
    [
      "wrong section index",
      (value: Record<string, unknown>) => ({ ...value, p: [[59, 0, 0, 0, 0]] }),
    ],
    [
      "wrong kind index",
      (value: Record<string, unknown>) => ({ ...value, p: [[0, 4, 0, 0, 0]] }),
    ],
    [
      "wrong ID index",
      (value: Record<string, unknown>) => ({
        ...value,
        p: [[0, 0, 1999, 0, 0]],
      }),
    ],
    [
      "wrong form index",
      (value: Record<string, unknown>) => ({ ...value, p: [[0, 0, 0, 5, 0]] }),
    ],
    [
      "wrong level index",
      (value: Record<string, unknown>) => ({ ...value, p: [[0, 0, 0, 0, 3]] }),
    ],
    [
      "invalid ID",
      (value: Record<string, unknown>) => ({
        ...value,
        i: (value.i as string[]).map((id, index) =>
          index === 0 ? "INVALID ID" : id,
        ),
      }),
    ],
    [
      "wrong counts",
      (value: Record<string, unknown>) => ({
        ...value,
        s: {
          ...(value.s as object),
          forms: EXACT.forms.map((form, index) =>
            index === 0 ? { ...form, counts: { ...form.counts, 하: 2 } } : form,
          ),
        },
      }),
    ],
    [
      "nested pick",
      (value: Record<string, unknown>) => ({ ...value, s: EXACT }),
    ],
  ] as const)("rejects malformed versioned payloads: %s", (_, change) => {
    const value = payload(encodeSelection(EXACT));
    expect(decodeSelection(encodeJson(change(value)))).toBeNull();
  });
});
