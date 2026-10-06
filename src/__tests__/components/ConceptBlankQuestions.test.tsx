import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ConceptBlankPaper from "@/components/concept-blank/ConceptBlankPaper";
import {
  planSheet,
  termRuledLines,
} from "@/components/concept-blank/paper/paginate";
import {
  conceptEntrySchema,
  type ConceptBlankBank,
  type ConceptBlankSelection,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import {
  composeSheets,
  stockCounts,
  stockTable,
} from "@/lib/concept-blank/compose";
import {
  composeExactSheets,
  selectionFromPicks,
} from "@/lib/concept-blank/exactPick";
import {
  encodeSheetCode,
  decodeSheetCode,
} from "@/lib/concept-blank/sheetCode";

const section =
  "초6::2-1 분수의 나눗셈::2-1-1 분모가 같은 (분수)÷(분수) 알아보기";
const legacy: ConceptEntry = {
  id: "clear-inverse-check",
  section,
  term: "곱셈으로 몫 확인하기",
  kind: "방법",
  level: "중",
  definition: "구한 몫에 나누는 분수를 곱하면 {나누어지는 분수}가 되어야 한다.",
};
const entry: ConceptEntry = {
  ...legacy,
  questionRevision: "student-clear-20261006-v1",
  bQuestion: {
    prompt:
      "3/4÷1/4=3이 맞는지 곱셈으로 확인하려고 합니다. 확인할 곱셈식을 쓰고, 왜 그 곱셈으로 확인할 수 있는지 설명하세요.",
    answer: "3×1/4=3/4이다. 1/4씩 3번 모은 양이 처음 양 3/4이므로 몫 3이 맞다.",
    requiredIdeas: [
      { anyOf: ["3×1/4=3/4", "1/4×3=3/4"] },
      { anyOf: ["1/4씩 3번 모으면 처음 양 3/4이 된다"] },
    ],
  },
  clozeQuestion: {
    sentence:
      "3/5÷1/5의 몫을 2라고 쓴 답을 확인하면 2×1/5={2/5}이다. 처음 양 3/5과 다르므로 몫 2는 틀렸다.",
    acceptedAnswers: [["2/5", "0.4", "4/10"]],
  },
};
const bank = (entries: ConceptEntry[]): ConceptBlankBank => ({
  concepts: entries,
  ox: [],
  apply: [],
  figures: [],
});
const selection = (form: "term" | "cloze" | "map"): ConceptBlankSelection => ({
  sections: [section],
  forms: [
    { form, counts: { 하: 0, 중: 3, 상: 0 }, extras: { 하: 0, 중: 0, 상: 0 } },
  ],
});

describe("student questions and their answer keys", () => {
  it("uses the reviewed question in new map branches, matches the answer key and keeps only two writable branches per page", () => {
    const entries = [
      entry,
      { ...entry, id: "clear-map-second" },
      { ...entry, id: "clear-map-third" },
    ];
    const sheet = composeSheets(selection("map"), bank(entries))[0];
    expect(sheet.form === "map" && sheet.questionMode).toBe(true);
    expect(
      sheet.form === "map" && sheet.maps.map((map) => map.nodes.length),
    ).toEqual([2, 1]);
    const { container } = render(
      <ConceptBlankPaper sheets={[sheet]} view="both" />,
    );
    const student = container.querySelectorAll('[data-cb-part="student"]');
    expect(student).toHaveLength(2);
    expect(student[0].textContent).toContain(entry.bQuestion!.prompt);
    expect(student[0].textContent).not.toContain(entry.bQuestion!.answer);
    expect(student[0].textContent).not.toContain("뜻");
    expect(student[1].textContent).toContain("문 3");
    expect(
      container.querySelector('[data-cb-part="key"]')!.textContent,
    ).toContain(entry.bQuestion!.answer);
    expect(planSheet(sheet).tally).toBe("맞은 개수 ____ / 3");
  });

  it("keeps legacy maps and their two-cell grading, and refuses a mixed old/new map mode", () => {
    const old = composeSheets(selection("map"), bank([legacy]))[0];
    expect(old.form === "map" && old.questionMode).toBeUndefined();
    expect(planSheet(old).tally).toBe("채운 칸 ____ / 2");
    expect(() =>
      composeSheets(
        selection("map"),
        bank([legacy, { ...entry, id: "clear-new-map" }]),
      ),
    ).toThrow("섞을 수 없습니다");
    const excluded = {
      ...entry,
      id: "clear-map-excluded",
      bQuestion: null,
      questionExclusions: { term: "그림 없이 답할 수 없는 항목이다." },
    };
    expect(stockCounts(section, bank([entry, excluded])).map.중).toBe(1);
    const exact = selectionFromPicks([
      {
        blankSectionKey: section,
        entryKind: "concept",
        entryId: excluded.id,
        form: "map",
        level: "중",
      },
    ]);
    expect(() => composeExactSheets(exact, bank([excluded]))).toThrow(
      "사용할 수 없는 개념",
    );
  });
  it("prints an explicit B question with its own answer and semantic criteria, without the vague title or C answer on the student sheet", () => {
    const sheets = composeSheets(selection("term"), bank([entry]));
    const { container } = render(
      <ConceptBlankPaper sheets={sheets} view="both" />,
    );
    const student = container.querySelector('[data-cb-part="student"]')!;
    const key = container.querySelector('[data-cb-part="key"]')!;
    expect(student.textContent).toContain(entry.bQuestion!.prompt);
    expect(student.textContent).not.toContain(legacy.term);
    expect(student.textContent).not.toContain("나누어지는 분수");
    expect(student.textContent).not.toContain(entry.bQuestion!.answer);
    expect(key.textContent).toContain(entry.bQuestion!.answer);
    expect(key.textContent).toContain("3×1/4=3/4 / 1/4×3=3/4");
    expect(key.textContent).not.toContain("그 이름은 답이 아니다");
  });

  it("uses the same separate C sentence for blanks, tally, key and equivalent answers", () => {
    const sheets = composeSheets(selection("cloze"), bank([entry]));
    const { container } = render(
      <ConceptBlankPaper sheets={sheets} view="both" />,
    );
    const student = container.querySelector('[data-cb-part="student"]')!;
    const key = container.querySelector('[data-cb-part="key"]')!;
    expect(student.querySelectorAll("[data-cb-blank]")).toHaveLength(1);
    expect(student.textContent).toContain("몫을 2라고 쓴 답을 확인하면");
    expect(student.textContent).not.toContain("2/5");
    expect(student.textContent).not.toContain("나누어지는 분수");
    expect(planSheet(sheets[0]).tally).toBe("빈칸 ____ / 1");
    expect(key.textContent).toContain("2/5 / 0.4 / 4/10");
  });

  it("excludes a reviewed form consistently from selection and available counts, while retaining the concept and other forms", () => {
    const excluded = {
      ...entry,
      id: "clear-excluded",
      bQuestion: null,
      questionExclusions: { term: "그림이 없으면 설명할 대상을 정할 수 없다." },
    };
    const data = bank([entry, excluded]);
    const term = composeSheets(selection("term"), data)[0];
    const cloze = composeSheets(selection("cloze"), data)[0];
    expect(term.form === "term" && term.terms.map((e) => e.id)).toEqual([
      entry.id,
    ]);
    expect(cloze.form === "cloze" && cloze.sentences).toHaveLength(2);
    expect(stockCounts(section, data).concepts.중).toBe(2);
    expect(stockCounts(section, data).term.중).toBe(1);
    expect(stockTable(data).get(section)).toEqual(stockCounts(section, data));
    const exact = selectionFromPicks([
      {
        blankSectionKey: section,
        entryKind: "concept",
        entryId: excluded.id,
        form: "term",
        level: "중",
      },
    ]);
    expect(() => composeExactSheets(exact, data)).toThrow(
      "사용할 수 없는 개념",
    );
  });

  it("keeps a legacy frozen payload unchanged and never supplements it with the current question", () => {
    const frozen = structuredClone(legacy);
    const exact = selectionFromPicks([
      {
        blankSectionKey: section,
        entryKind: "concept",
        entryId: frozen.id,
        form: "term",
        level: "중",
      },
    ]);
    const { container } = render(
      <ConceptBlankPaper
        sheets={composeExactSheets(exact, bank([frozen]))}
        view="both"
      />,
    );
    expect(
      container.querySelector('[data-cb-part="student"]')!.textContent,
    ).toContain(legacy.term);
    expect(container.textContent).not.toContain(entry.bQuestion!.prompt);
    expect(frozen).toEqual(legacy);
    expect(conceptEntrySchema.parse(frozen).bQuestion).toBeUndefined();
  });

  it("changes the paper fingerprint when only the new question changes", () => {
    const selected = selection("term");
    const code = encodeSheetCode(selected, bank([entry]))!;
    const changed = {
      ...entry,
      bQuestion: {
        ...entry.bQuestion!,
        prompt: entry.bQuestion!.prompt + " 계산 순서도 쓰세요.",
      },
    };
    expect(decodeSheetCode(code, bank([entry]))?.bankChanged).toBe(false);
    expect(decodeSheetCode(code, bank([changed]))?.bankChanged).toBe(true);
  });

  it("rejects a C answer list missing a slot or the actual key", () => {
    expect(conceptEntrySchema.safeParse(entry).success).toBe(true);
    expect(
      conceptEntrySchema.safeParse({
        ...entry,
        clozeQuestion: { ...entry.clozeQuestion!, acceptedAnswers: [["3/5"]] },
      }).success,
    ).toBe(false);
  });

  it("does not accept half-versioned questions or silently treat an exclusion as a legacy question", () => {
    expect(
      conceptEntrySchema.safeParse({ ...entry, questionRevision: undefined })
        .success,
    ).toBe(false);
    expect(
      conceptEntrySchema.safeParse({
        ...entry,
        bQuestion: null,
        questionExclusions: undefined,
      }).success,
    ).toBe(false);
    expect(
      conceptEntrySchema.safeParse({ ...entry, clozeQuestion: undefined })
        .success,
    ).toBe(false);
  });

  it("allocates writing space for a longer requested explanation while retaining legacy line counts", () => {
    const longer = {
      ...entry,
      bQuestion: {
        ...entry.bQuestion!,
        answer: "답의 이유를 문장으로 설명한다. ".repeat(8),
      },
    };
    expect(termRuledLines(longer)).toBeGreaterThan(2);
    expect(termRuledLines(legacy)).toBe(2);
  });
});
