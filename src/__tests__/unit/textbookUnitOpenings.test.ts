import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { coreSectionSourceHash } from "../../../scripts/qa/concept-blank/student-clear/opening-source";
import { textbookSemanticNodeSchema } from "@/contracts/textbookSemantic.contract";
import {
  BLANK_SECTIONS,
  CONCEPT_BLANK_GRADES,
  sectionTitleTex,
} from "@/lib/concept-blank/sections";
import {
  conceptScriptFor,
  conceptScriptSemesterCoverage,
} from "@/lib/textbook/conceptScripts";
import {
  TEXTBOOK_CORE_BANK,
  coreConceptsForSection,
} from "@/lib/textbook/coreConceptBank";
import referenceV15 from "@/lib/textbook/scripts/reference-v15.json";
import source from "@/lib/textbook/scripts/unit-openings.json";
import {
  UNIT_OPENING_REFERENCE,
  UNIT_OPENING_REVIEW,
  selectUnitOpening,
  selectUnitOpenings,
  unitOpeningById,
  unitOpeningFor,
  unitOpenings,
  type UnitOpening,
} from "@/lib/textbook/unitOpenings";

/** The 72 chapter IDs, written out from the curriculum rather than read back from the file. */
const CHAPTER_IDS = [
  ...["e3", "e4", "e5", "e6"].flatMap((grade) =>
    [1, 2].flatMap((semester) =>
      [1, 2, 3, 4, 5, 6].map((n) => `${grade}-${semester}-${n}`),
    ),
  ),
  ...(
    [
      ["m1", 8],
      ["m2", 9],
      ["m3", 7],
    ] as const
  ).flatMap(([grade, count]) =>
    Array.from(
      { length: count },
      (_, index) => `${grade}-${String(index + 1).padStart(2, "0")}`,
    ),
  ),
];
/** Chapters in the first and second semester of each grade. */
const CHAPTERS_BY_SEMESTER: Record<string, [number, number]> = {
  초3: [6, 6],
  초4: [6, 6],
  초5: [6, 6],
  초6: [6, 6],
  중1: [4, 4],
  중2: [4, 5],
  중3: [4, 3],
};

const sha = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");
const sectionHash = coreSectionSourceHash;

/** Text without its math, and its Korean words of two letters or more. */
const plain = (text: string) =>
  text
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const words = (text: string): string[] =>
  plain(text).match(/[가-힣]{2,}/g) ?? [];
const withoutParticle = (word: string) =>
  word.replace(
    /(으로|에서|에게|까지|부터|이나|과의|와의|을|를|이|가|은|는|의|와|과|로|에|도|만)$/,
    "",
  );
const termsOf = (key: string) =>
  coreConceptsForSection(key).map((card) => plain(card.term));

const isMiddle = (opening: UnitOpening) => opening.grade.startsWith("중");
const authoredTexts = (opening: UnitOpening): [string, string][] => [
  ["question", opening.question],
  ["explanation", opening.explanation],
  ["keyPhrase", opening.keyPhrase],
  ...opening.sections.map((section): [string, string] => [
    `goal ${section.id}`,
    section.goal,
  ]),
];
const frozenDeep = (value: unknown): boolean =>
  !value ||
  typeof value !== "object" ||
  (Object.isFrozen(value) && Object.values(value).every(frozenDeep));

const catalogue = BLANK_SECTIONS.filter((section) =>
  (CONCEPT_BLANK_GRADES as readonly string[]).includes(section.grade),
);

describe("단원 도입 원고 — 72개 대단원", () => {
  it("대단원 ID가 초3부터 중3까지 교육과정 순서 그대로 72개다", () => {
    expect(unitOpenings().map((opening) => opening.id)).toEqual(CHAPTER_IDS);
    expect(new Set(CHAPTER_IDS).size).toBe(72);
    const chapters: string[] = [];
    for (const section of catalogue) {
      const chapter = `${section.grade}::${section.chapter}`;
      if (!chapters.includes(chapter)) chapters.push(chapter);
    }
    expect(
      unitOpenings().map((opening) => `${opening.grade}::${opening.chapter}`),
    ).toEqual(chapters);
    for (const opening of unitOpenings()) {
      expect(unitOpeningById(opening.id)).toBe(opening);
      expect(unitOpeningFor(opening.grade, opening.chapter)).toBe(opening);
      expect(opening.title).toBe(
        opening.chapter.replace(
          isMiddle(opening) ? /^\d+\.\s*/ : /^\d+-\d+\s+/,
          "",
        ),
      );
    }
  });

  it("소단원과 개념 ID가 교육과정·정적 원고·핵심 은행 1,657장과 같다", () => {
    const sections = unitOpenings().flatMap((opening) =>
      opening.sections.map((section) => ({ opening, section })),
    );
    expect(sections.map(({ section }) => section.key)).toEqual(
      catalogue.map((section) => section.key),
    );
    for (const { opening, section } of sections) {
      const script = conceptScriptFor(section.key);
      expect(script?.conceptIds).toEqual(section.conceptIds);
      expect(
        coreConceptsForSection(section.key).map((card) => card.id),
      ).toEqual(section.conceptIds);
      expect(section.key).toBe(
        `${opening.grade}::${opening.chapter}::${section.title}`,
      );
      expect(
        section.conceptIds.every((id) =>
          new RegExp(`^${section.id}-c\\d+$`).test(id),
        ),
      ).toBe(true);
      expect(section.id.startsWith(`${opening.id}-`)).toBe(true);
    }
    const conceptIds = sections.flatMap(({ section }) => section.conceptIds);
    expect(sections).toHaveLength(360);
    expect(conceptIds).toHaveLength(1657);
    expect(conceptIds).toEqual(
      TEXTBOOK_CORE_BANK.concepts.map((card) => card.id),
    );
    expect(source.source).toMatchObject({
      chapters: 72,
      sections: 360,
      concepts: 1657,
    });
  });

  it("원천 해시가 지금의 은행 카드에서 다시 계산한 값과 같다", () => {
    for (const opening of unitOpenings()) {
      for (const section of opening.sections)
        expect(
          sectionHash(section.key, coreConceptsForSection(section.key)),
          `${section.id} — 은행 카드가 바뀌었다. 목표 문장을 다시 읽고 해시를 고친다.`,
        ).toBe(section.sourceHash);
      expect(
        sha(opening.sections.map((section) => section.sourceHash).join("\n")),
      ).toBe(opening.provenance.sourceHash);
    }
    // A changed definition, a changed term and a dropped card each give a different hash.
    const [section] = unitOpenings()[0].sections;
    const cards = coreConceptsForSection(section.key);
    expect(
      sectionHash(section.key, [
        { ...cards[0], definition: `${cards[0].definition} ` },
        ...cards.slice(1),
      ]),
    ).not.toBe(section.sourceHash);
    expect(
      sectionHash(section.key, [
        { ...cards[0], term: "받아내림" },
        ...cards.slice(1),
      ]),
    ).not.toBe(section.sourceHash);
    expect(sectionHash(section.key, cards.slice(1))).not.toBe(
      section.sourceHash,
    );
  });

  it("학기가 대단원 번호·정적 원고와 같고 14개 학년·학기를 모두 덮는다", () => {
    for (const opening of unitOpenings()) {
      const number = isMiddle(opening)
        ? Number(/^(\d+)\./.exec(opening.chapter)?.[1])
        : Number(/^([12])-\d+\s/.exec(opening.chapter)?.[1]);
      expect(opening.semester).toBe(
        isMiddle(opening) ? (number <= 4 ? 1 : 2) : number,
      );
      for (const section of opening.sections)
        expect(conceptScriptFor(section.key)?.semester).toBe(opening.semester);
    }
    const coverage = conceptScriptSemesterCoverage();
    expect(coverage).toHaveLength(14);
    for (const row of coverage) {
      const found = unitOpenings().filter(
        (opening) =>
          opening.grade === row.grade && opening.semester === row.semester,
      );
      expect(found).toHaveLength(
        CHAPTERS_BY_SEMESTER[row.grade][row.semester - 1],
      );
      expect(
        found.reduce((sum, opening) => sum + opening.sections.length, 0),
      ).toBe(row.sections);
      expect(
        found.reduce(
          (sum, opening) =>
            sum +
            opening.sections.reduce(
              (inner, section) => inner + section.conceptIds.length,
              0,
            ),
          0,
        ),
      ).toBe(row.concepts);
    }
  });
});

describe("단원 도입 원고 — 새로 쓴 문장", () => {
  it("수식·로마자가 없고 학교급에 맞는 말투와 길이다", () => {
    for (const opening of unitOpenings()) {
      const middle = isMiddle(opening);
      for (const [name, text] of authoredTexts(opening)) {
        const where = `${opening.id} ${name}`;
        expect(text.trim(), where).toBe(text);
        expect(text.length, where).toBeGreaterThan(0);
        // No formula is carried into any opening, so none can cross a school level.
        expect(text, where).not.toMatch(/[A-Za-z$\\{}]/);
        expect(text, where).not.toMatch(/!/);
      }
      expect(opening.question.length, opening.id).toBeLessThanOrEqual(48);
      expect(opening.explanation.length, opening.id).toBeLessThanOrEqual(150);
      expect(opening.keyPhrase.length, opening.id).toBeLessThanOrEqual(24);
      if (middle) {
        expect(opening.question, opening.id).toMatch(/[^요]\?$/);
        expect(opening.explanation, opening.id).toMatch(/다\.$/);
        expect(opening.explanation, opening.id).not.toMatch(/니다\./);
      } else {
        expect(opening.question, opening.id).toMatch(/까요\?$/);
        expect(opening.explanation, opening.id).toMatch(/니다\.$/);
        expect(opening.explanation, opening.id).not.toMatch(/[^니]다\./);
      }
      for (const section of opening.sections) {
        expect(section.goal.length, section.id).toBeLessThanOrEqual(60);
        expect(section.goal, section.id).toMatch(
          middle ? /[^니]다\.$/ : /수 있어요\.$/,
        );
      }
    }
  });

  it("뒤 대단원에서 처음 나오는 은행 용어를 앞 대단원의 도입에 쓰지 않는다", () => {
    const seen: string[] = [];
    let running = "";
    for (const opening of unitOpenings()) {
      running += ` ${opening.chapter}`;
      for (const section of opening.sections) {
        running += ` ${section.title}`;
        for (const card of coreConceptsForSection(section.key))
          running += ` ${plain(card.term)} ${plain(card.definition.replace(/[{}]/g, ""))} ${plain(card.example?.prompt ?? "")} ${plain(card.example?.answer ?? "")}`;
      }
      seen.push(running);
    }
    const terms = unitOpenings().flatMap((opening, index) =>
      opening.sections.flatMap((section) =>
        termsOf(section.key)
          .filter((term) => /^[가-힣 ]{2,}$/.test(term))
          .map((term) => ({ term, index })),
      ),
    );
    /** Later bank terms in a text of chapter `index` that its own and earlier chapters never use. */
    const earlyTerms = (index: number, text: string): string[] => {
      const known = (part: string) => seen[index].includes(part);
      return [
        ...new Set(
          terms
            .filter(
              (later) =>
                later.index > index &&
                text.includes(later.term) &&
                !known(later.term) &&
                // A term made only of words met by this chapter is ordinary language.
                !words(later.term).every(
                  (word) => known(word) || known(withoutParticle(word)),
                ),
            )
            .map((later) => later.term),
        ),
      ];
    };
    const early = unitOpenings().flatMap((opening, index) =>
      authoredTexts(opening).flatMap(([name, text]) =>
        earlyTerms(index, text).map((term) => `${opening.id} ${name}: ${term}`),
      ),
    );
    expect(early).toEqual([]);
    // The rule bites on a middle-school term in 초3, and lets the chapter's own terms pass.
    expect(earlyTerms(0, "소인수분해를 할 수 있어요.")).toContain("소인수분해");
    expect(earlyTerms(0, "받아올림과 받아내림")).toEqual([]);
    const last = unitOpenings().length - 1;
    expect(earlyTerms(last, "소인수분해와 상자그림")).toEqual([]);
  });

  it("질문·설명·핵심 문구·목표가 그 대단원과 소단원의 이름·은행 용어에 닿아 있다", () => {
    for (const opening of unitOpenings()) {
      const chapterTerms = opening.sections.flatMap((section) =>
        termsOf(section.key),
      );
      const chapterWords = new Set(
        [
          opening.chapter,
          ...opening.sections.map((section) => section.title),
          ...chapterTerms,
        ].flatMap(words),
      );
      const shared = (text: string) =>
        [...chapterWords].filter((word) => text.includes(word));
      expect(
        shared(opening.explanation).length,
        opening.id,
      ).toBeGreaterThanOrEqual(2);
      expect(
        chapterTerms.some(
          (term) => term.length >= 2 && opening.keyPhrase.includes(term),
        ) ||
          opening.keyPhrase
            .split(/,\s*/)
            .every((piece) => chapterTerms.includes(piece)) ||
          shared(opening.keyPhrase).length > 0,
        `${opening.id} ${opening.keyPhrase}`,
      ).toBe(true);
      for (const section of opening.sections) {
        const sectionWords = [section.title, ...termsOf(section.key)].flatMap(
          words,
        );
        expect(
          sectionWords.some((word) => section.goal.includes(word)),
          `${section.id} ${section.goal}`,
        ).toBe(true);
      }
      expect(
        new Set(opening.sections.map((section) => section.goal)).size,
      ).toBe(opening.sections.length);
    }
    for (const field of ["question", "explanation"] as const)
      expect(
        new Set(unitOpenings().map((opening) => opening[field])).size,
      ).toBe(72);
  });

  it("쪽수와 선후 관계를 지어내지 않고, 준비 확인은 아는 것과 질문만 묻는다", () => {
    const keys = new Set<string>();
    const collect = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      if (!Array.isArray(value))
        for (const key of Object.keys(value)) keys.add(key);
      for (const child of Object.values(value)) collect(child);
    };
    collect(source.openings);
    expect([...keys].sort()).toEqual(
      [
        "bankFile",
        "chapter",
        "check",
        "conceptIds",
        "editor",
        "explanation",
        "goal",
        "grade",
        "humanReview",
        "id",
        "key",
        "keyPhrase",
        "kind",
        "origin",
        "provenance",
        "question",
        "reviewedOn",
        "reviewer",
        "scriptFile",
        "sections",
        "semester",
        "sourceHash",
        "status",
        "text",
        "title",
      ].sort(),
    );
    for (const opening of unitOpenings()) {
      const ending = isMiddle(opening) ? "보자." : "보세요.";
      expect(opening.check).toEqual([
        {
          kind: "already-known",
          text: `「${opening.title}」에서 이미 알고 있는 것을 적어 ${ending}`,
        },
        {
          kind: "question",
          text: `이 단원에서 알고 싶은 것을 질문으로 적어 ${ending}`,
        },
      ]);
      for (const [name, text] of [
        ...authoredTexts(opening),
        ...opening.check.map((prompt): [string, string] => [
          prompt.kind,
          prompt.text,
        ]),
      ]) {
        const where = `${opening.id} ${name}`;
        expect(text, where).not.toMatch(/\d+\s*(쪽|페이지)|[pP]\.\s*\d/);
        expect(text, where).not.toMatch(
          /(앞|이전|다음|지난)\s*(단원|학년|학기|시간)|선수|배웠|배운|학년에서|학기에서/,
        );
      }
    }
  });

  it("AI가 쓰고 AI가 읽었다고 적혀 있고 사람의 검수로 적힌 곳이 없다", () => {
    for (const opening of unitOpenings())
      expect(opening.provenance).toMatchObject({
        origin: "bank-derived",
        editor: "AI 작성 (Claude Opus 5.5)",
        reviewer: "AI 정독 (Claude Opus 5.5)",
        status: "AI 검수",
        humanReview: false,
      });
    expect(UNIT_OPENING_REVIEW).toMatchObject({
      status: "AI 검수",
      humanReview: false,
      authored: { question: 72, explanation: 72, keyPhrase: 72, goal: 360 },
      template: { check: 144 },
    });
    expect(JSON.stringify(source)).not.toMatch(
      /편집 확인|사람 검수|실물 검수|"humanReview":\s*true/,
    );
  });

  it("v15 원본 단원 도입은 대단원과 맞지 않아 쓰지 않았다고 적혀 있다", () => {
    expect(UNIT_OPENING_REFERENCE).toMatchObject({
      chapterId: "m2-01",
      used: false,
      fileSha256: referenceV15.files["manuscript.json"],
    });
    const chapter = unitOpeningById("m2-01");
    const sectionsByUnit = new Map<string, Set<string>>();
    for (const page of referenceV15.pages)
      sectionsByUnit.set(
        page.unit,
        (sectionsByUnit.get(page.unit) ?? new Set()).add(page.sectionKey),
      );
    expect([...sectionsByUnit.keys()].sort()).toEqual(
      UNIT_OPENING_REFERENCE.units,
    );
    // Six openings for one chapter: some span two sections, two share one, one section has none.
    expect(
      [...sectionsByUnit.values()].filter((keys) => keys.size > 1).length,
    ).toBeGreaterThan(0);
    const covered = [...sectionsByUnit.values()].flatMap((keys) => [...keys]);
    expect(new Set(covered).size).toBeLessThan(covered.length);
    expect(
      chapter?.sections
        .filter((section) => !covered.includes(section.key))
        .map((section) => section.title),
    ).toEqual(["순환소수를 포함한 식의 계산"]);
    expect(chapter?.provenance.origin).toBe("bank-derived");
  });
});

describe("단원 도입 원고 — 선택 범위", () => {
  it("대단원 전체를 고르면 모든 소단원의 목표와 순서가 나오고 unitIntro 노드에 맞는다", () => {
    for (const opening of unitOpenings()) {
      const selection = selectUnitOpening(opening.grade, opening.chapter);
      expect(selection).toMatchObject({
        id: opening.id,
        semester: opening.semester,
        question: opening.question,
        explanation: opening.explanation,
        keyPhrase: opening.keyPhrase,
        complete: true,
        unmatched: [],
      });
      expect(selection?.goals).toEqual(
        opening.sections.map((section) => section.goal),
      );
      expect(selection?.path).toEqual(
        opening.sections.map((section) => sectionTitleTex(section.title)),
      );
      expect(selection?.check).toEqual(
        opening.check.map((prompt) => prompt.text),
      );
      expect(
        textbookSemanticNodeSchema.safeParse({
          kind: "unitIntro",
          question: selection?.question,
          explanation: selection?.explanation,
          goals: selection?.goals,
          path: selection?.path,
          check: selection?.check,
        }).success,
        opening.id,
      ).toBe(true);
    }
  });

  it("고른 소단원만, 요청 순서와 중복에 상관없이 교육과정 순서로 남긴다", () => {
    const opening = unitOpeningById("m2-01");
    const [rational, repeating, , , exponent] = opening?.sections ?? [];
    const selection = selectUnitOpening("중2", "1. 수와 식", [
      "지수법칙",
      rational.id,
      exponent.key,
      rational.title,
    ]);
    expect(selection?.sections.map((section) => section.id)).toEqual([
      "m2-01-01",
      "m2-01-05",
    ]);
    expect(selection?.path).toEqual(["유리수와 소수", "지수법칙"]);
    expect(selection?.goals).toEqual([rational.goal, exponent.goal]);
    expect(selection?.goals).not.toContain(repeating.goal);
    expect(selection?.complete).toBe(false);
    expect(selection?.provenance.sourceConceptIds).toEqual([
      ...rational.conceptIds,
      ...exponent.conceptIds,
    ]);
    expect(selection?.provenance.sourceHashes).toEqual([
      rational.sourceHash,
      exponent.sourceHash,
    ]);
    expect(selection?.provenance.sourceHash).toBe(
      opening?.provenance.sourceHash,
    );
    expect(selection?.provenance.status).toBe("AI 검수");
    // The question, explanation and key phrase belong to the chapter and do not change.
    expect(selection?.question).toBe(opening?.question);
    for (const name of [rational.id, rational.key, rational.title])
      expect(selectUnitOpening("중2", "1. 수와 식", [name])?.sections).toEqual([
        rational,
      ]);
  });

  it("그 대단원에 없는 소단원은 unmatched에만 남고, 도입이 없는 학년은 undefined다", () => {
    const selection = selectUnitOpening("초5", "1-6 다각형의 둘레와 넓이", [
      "1-6-2 1cm², 직사각형과 정사각형의 넓이",
      "1-9-9 없는 소단원",
      "e3-1-1-1",
    ]);
    expect(selection?.path).toEqual([
      "1-6-2 $1\\,\\mathrm{cm}^2$, 직사각형과 정사각형의 넓이",
    ]);
    expect(selection?.unmatched).toEqual(["1-9-9 없는 소단원", "e3-1-1-1"]);
    expect(selection?.goals).toHaveLength(1);
    expect(
      selectUnitOpening("초5", "1-6 다각형의 둘레와 넓이", [])?.goals,
    ).toEqual([]);
    expect(selectUnitOpening("초2", "1-1 세 자리 수")).toBeUndefined();
    expect(selectUnitOpening("고1", "1. 다항식")).toBeUndefined();
    expect(selectUnitOpening("중2", "1-1 덧셈과 뺄셈")).toBeUndefined();
  });

  it("여러 대단원에 걸친 범위는 대단원마다 하나씩, 교육과정 순서로 돌려준다", () => {
    const result = selectUnitOpenings([
      { grade: "중2", chapter: "2. 부등식", section: "일차부등식의 풀이" },
      "m2-01-08",
      { grade: "중2", chapter: "1. 수와 식", section: "지수법칙" },
      { grade: "중2", chapter: "2. 부등식", section: "부등식" },
      { grade: "초2", chapter: "1-1 세 자리 수", section: "1-1-1 백" },
      "m2-01-05",
    ]);
    expect(result.openings.map((opening) => opening.id)).toEqual([
      "m2-01",
      "m2-02",
    ]);
    expect(result.openings[0].path).toEqual([
      "지수법칙",
      "다항식의 곱셈과 나눗셈",
    ]);
    expect(result.openings[1].path).toEqual(["부등식", "일차부등식의 풀이"]);
    expect(result.openings.every((opening) => !opening.complete)).toBe(true);
    expect(result.unmatched).toEqual(["초2::1-1 세 자리 수::1-1-1 백"]);
    const everything = selectUnitOpenings(
      catalogue.map((section) => section.key),
    );
    expect(everything.openings.map((opening) => opening.id)).toEqual(
      CHAPTER_IDS,
    );
    expect(everything.openings.every((opening) => opening.complete)).toBe(true);
    expect(everything.unmatched).toEqual([]);
  });

  it("원고와 선택 결과를 고칠 수 없다", () => {
    const before = JSON.stringify(unitOpenings());
    const selection = selectUnitOpening("중2", "1. 수와 식", ["지수법칙"]);
    const many = selectUnitOpenings(["m2-01-05", "e3-1-1-1"]);
    for (const value of [unitOpenings(), selection, many])
      expect(frozenDeep(value)).toBe(true);
    expect(() => {
      (selection?.goals as string[]).push("새 목표");
    }).toThrow(TypeError);
    expect(() => {
      (selection as { question: string }).question = "새 질문";
    }).toThrow(TypeError);
    expect(() => {
      (unitOpenings()[0].sections[0] as { goal: string }).goal = "새 목표";
    }).toThrow(TypeError);
    expect(() => {
      (selection?.provenance as { status: string }).status = "편집 확인";
    }).toThrow(TypeError);
    expect(JSON.stringify(unitOpenings())).toBe(before);
    expect(JSON.stringify(unitOpenings())).toBe(
      JSON.stringify(source.openings),
    );
  });
});
