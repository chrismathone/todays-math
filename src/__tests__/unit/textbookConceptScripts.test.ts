import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import katex from "katex";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
// Only quickCreateSemester is read from the server module: the product's own scope rule.
vi.mock("server-only", () => ({}));
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import {
  BLANK_SECTIONS,
  CONCEPT_BLANK_GRADES,
} from "@/lib/concept-blank/sections";
import { bank as e3 } from "@/lib/concept-blank/bank/e3";
import { bank as e4 } from "@/lib/concept-blank/bank/e4";
import { bank as e5 } from "@/lib/concept-blank/bank/e5";
import { bank as e6 } from "@/lib/concept-blank/bank/e6";
import { bank as m1 } from "@/lib/concept-blank/bank/m1";
import { bank as m2 } from "@/lib/concept-blank/bank/m2";
import { bank as m3 } from "@/lib/concept-blank/bank/m3";
import { TEXTBOOK_CHARACTERS } from "@/lib/textbook/characters";
import {
  conceptScriptFor,
  conceptScriptForCast,
  conceptScriptCoverage,
  conceptScriptSectionKeys,
  conceptScriptSemesterCoverage,
} from "@/lib/textbook/conceptScripts";
import { AUTHORED_EXAMPLES } from "@/lib/textbook/scripts/authoredExamples";
import {
  STATIC_CORRECTIONS,
  STATIC_CORRECTIONS_REVIEW,
  keepsMathTokens,
  withoutStaticCorrections,
} from "@/lib/textbook/scripts/corrections";
import {
  BOARD_CONCEPT_KINDS,
  GRADE_FILE_CODES,
  endsAsSentence,
  exampleAnswerLine,
  materializeGrade,
  sectionLessonTitle,
  serializeScripts,
  withoutPresentationMetadata,
} from "@/lib/textbook/scripts/materialize";
import { normalizeV15Text } from "@/lib/textbook/scripts/normalizeV15";
import reference from "@/lib/textbook/scripts/reference-v15.json";
import {
  V15_ROLE_MENTIONS,
  anchorRoleMentions,
  applyRoleMentions,
  particleAfter,
} from "@/lib/textbook/scripts/roleMentions";
import { quickCreateSemester } from "@/lib/textbook/server/quickCreate";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";

const parts = { e3, e4, e5, e6, m1, m2, m3 };
const concepts = Object.values(parts).flatMap((bank) => bank.concepts);
const ox = Object.values(parts).flatMap((bank) => bank.ox);
const conceptById = new Map(concepts.map((concept) => [concept.id, concept]));
const oxById = new Map(ox.map((item) => [item.id, item]));
const independentIds = new Set(
  Object.values(parts)
    .flatMap((bank) => [...bank.apply, ...bank.figures])
    .map((item) => item.id),
);
const sections = BLANK_SECTIONS.filter((section) =>
  (CONCEPT_BLANK_GRADES as readonly string[]).includes(section.grade),
);
const scripts = sections.map((section) => conceptScriptFor(section.key)!);
const plain = (text: string) =>
  splitBlankSentence(text)
    .map((piece) => piece.text)
    .join("");

const sourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("bank-concept"),
    entryId: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("bank-example"),
    entryId: z.string().min(1),
  }),
  z.strictObject({ kind: z.literal("bank-ox"), entryId: z.string().min(1) }),
  z.strictObject({
    kind: z.literal("authored-example"),
    key: z.string().min(1),
  }),
  z.strictObject({
    kind: z.literal("v15"),
    unit: z.string(),
    scriptIndex: z.number().int().positive(),
    blockIndex: z.number().int().nonnegative(),
    page: z.number().int().positive(),
  }),
]);
// The root contract bounds: lessonKey ≤ 120, lessonTitle ≤ 200 characters.
const presentationSchema = z.strictObject({
  kind: z.enum(["speech", "board"]),
  lessonKey: z
    .string()
    .max(120)
    .regex(
      /^(?:v15:U\d{2}:\d+|concept:[a-z]\d(?:-\d+)+-c\d+|section:[a-z]\d(?:-\d+)+:(?:open|wrap))$/,
    ),
  lessonTitle: z.string().min(1).max(200),
});
const roleMentionSchema = z.strictObject({
  role: z.enum(["student1", "student2"]),
  name: z.string().min(1),
  particle: z.enum(["은/는", "이/가", "을/를", "과/와", "아/야", ""]),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});
const boardsSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("authored-v15"),
    count: z.number().int().positive(),
  }),
  z.strictObject({
    status: z.literal("derived-bank"),
    count: z.number().int().positive(),
    basis: z.literal("concept-kind"),
    entryIds: z.array(z.string()).min(1),
  }),
  z.strictObject({
    status: z.literal("absent"),
    reason: z.literal("no-board-kind-concept"),
  }),
]);
const manuscriptSchema = z.strictObject({
  version: z.literal(1),
  sectionKey: z.string().min(1),
  grade: z.enum(CONCEPT_BLANK_GRADES),
  semester: z.union([z.literal(1), z.literal(2)]),
  chapter: z.string().min(1),
  title: z.string().min(1),
  conceptIds: z.array(z.string()).min(1),
  dialogue: z
    .array(
      z.strictObject({
        role: z.enum(["teacher", "student1", "student2"]),
        expression: z.enum(["neutral", "question", "thinking", "aha"]),
        purpose: z.enum([
          "opening",
          "explanation",
          "example",
          "misconception",
          "correction",
          "check-question",
          "check-answer",
        ]),
        markdown: z.string().min(1),
        conceptIds: z.array(z.string()).min(1),
        source: sourceSchema,
        presentation: presentationSchema,
        roleMentions: z.array(roleMentionSchema).min(1).optional(),
      }),
    )
    .min(10),
  provenance: z.strictObject({
    bank: z.literal("original-concept-blank"),
    sourceFiles: z.array(z.string()).min(1),
    referenceUnits: z.array(z.string()).optional(),
    boards: boardsSchema,
  }),
});
const mathTokens = (markdown: string): string[] =>
  markdown.match(/\$[^$]*\$/g) ?? [];
const students = TEXTBOOK_CHARACTERS.filter(
  (character) => character.role === "student",
);

/**
 * SHA-256 of each grade file with lesson, board, role-mention and semester metadata
 * removed. These are the committed files of 122dad6dd, before that metadata existed:
 * adding or changing metadata must leave every earlier turn, source and id as it was.
 * These values never change. A deliberate manuscript correction is an entry in
 * static-corrections.json; the files are compared with those entries undone, so a turn
 * that changes without an entry still fails here.
 */
const PRIOR_DIALOGUE_SHA256: Record<string, string> = {
  e3: "34093da7236daa5839fd0c2ac2b2a1c9cdee7aa8d6741f1697df157432238986",
  e4: "f2068af0b8c9725975161244bdb8eb585b01986ea28e8d7fa1b4070fb6442ad8",
  e5: "b4d1590fd495741089205e9c4e2999d8bb8fe8a21672405975571d399c57b9fe",
  e6: "e2df22749286bdb7dbc7e24b735f85cce1e7f65f2ede3c6c4c7f6093275ab720",
  m1: "c50a6d80548eb7e92224b6523d59d51547afee1f3a7cd37b8f666580a4860e05",
  m2: "8921d492464cdd9f444e097e803a3f191b5a54e32dc3a384972809a34aa5e238",
  m3: "cc71b3a07fe5f2fc4e8a51e69cdf3fc0af143c20998d8729b6a4d6335bd8e87f",
};
/** The hash of a grade file as first committed: corrections undone, then metadata removed. */
const priorDialogueSha256 = (
  committed: Parameters<typeof withoutStaticCorrections>[0],
) =>
  createHash("sha256")
    .update(
      serializeScripts(
        withoutPresentationMetadata(withoutStaticCorrections(committed)),
      ),
      "utf8",
    )
    .digest("hex");

describe("prewritten concept teaching manuscripts", () => {
  it("covers exactly every supported curriculum section in seven committed grade files", () => {
    const coverage = conceptScriptCoverage();
    expect(coverage).toMatchObject({
      totalSections: 360,
      coveredSections: 360,
      coveragePercent: 100,
      missingSectionKeys: [],
    });
    expect(
      coverage.grades.map((row) => [
        row.grade,
        row.totalSections,
        row.coveredSections,
      ]),
    ).toEqual([
      ["초3", 56, 56],
      ["초4", 62, 62],
      ["초5", 56, 56],
      ["초6", 56, 56],
      ["중1", 52, 52],
      ["중2", 56, 56],
      ["중3", 22, 22],
    ]);
    const persisted = ["e3", "e4", "e5", "e6", "m1", "m2", "m3"].flatMap(
      (code) =>
        JSON.parse(
          readFileSync(
            resolve(`src/lib/textbook/scripts/${code}.json`),
            "utf8",
          ),
        ) as { sectionKey: string }[],
    );
    expect(persisted.map((script) => script.sectionKey).sort()).toEqual(
      sections.map((section) => section.key).sort(),
    );
    expect(new Set(persisted.map((script) => script.sectionKey)).size).toBe(
      360,
    );
    expect(conceptScriptFor("초2::없는 대단원::없는 소단원")).toBeUndefined();
    expect(
      conceptScriptFor("중2::1. 수와 식::존재하지 않는 소단원"),
    ).toBeUndefined();
  });

  it("has all three speakers, section-specific content, a worked example and an answered check in every section", () => {
    for (const [index, script] of scripts.entries()) {
      manuscriptSchema.parse(script);
      expect(script).toMatchObject({
        sectionKey: sections[index]!.key,
        title: sections[index]!.title,
        chapter: sections[index]!.chapter,
        grade: sections[index]!.grade,
      });
      expect(new Set(script.dialogue.map((turn) => turn.role))).toEqual(
        new Set(["teacher", "student1", "student2"]),
      );
      expect(script.dialogue[0]).toMatchObject({
        role: "teacher",
        expression: "question",
        purpose: "opening",
      });
      expect(
        script.dialogue.some(
          (turn) =>
            turn.purpose === "example" && turn.expression === "thinking",
        ),
        script.sectionKey,
      ).toBe(true);
      expect(script.dialogue.at(-2)).toMatchObject({
        role: "teacher",
        purpose: "check-question",
        expression: "question",
      });
      expect(script.dialogue.at(-1)).toMatchObject({
        role: "student2",
        purpose: "check-answer",
        expression: "aha",
      });
      expect(
        script.dialogue.filter(
          (turn) => turn.purpose === "explanation" && turn.role === "teacher",
        ).length,
      ).toBeGreaterThanOrEqual(script.conceptIds.length);
    }
    expect(
      new Set(
        scripts.map((script) =>
          script.dialogue.map((turn) => turn.markdown).join("\n"),
        ),
      ).size,
    ).toBe(360);
  });

  it("explains all 1657 original concepts in full and validates every concept reference against its own section", () => {
    expect(concepts).toHaveLength(1657);
    for (const script of scripts) {
      const expected = concepts.filter(
        (concept) => concept.section === script.sectionKey,
      );
      expect(script.conceptIds).toEqual(expected.map((concept) => concept.id));
      for (const concept of expected) {
        const explanation = script.dialogue.find(
          (turn) =>
            turn.role === "teacher" &&
            turn.purpose === "explanation" &&
            turn.source.kind === "bank-concept" &&
            turn.source.entryId === concept.id,
        );
        expect(explanation, concept.id).toBeDefined();
        expect(explanation!.markdown.replace(/\*\*/g, "")).toContain(
          plain(concept.definition),
        );
      }
      for (const turn of script.dialogue)
        for (const id of turn.conceptIds) {
          expect(conceptById.get(id)?.section, id).toBe(script.sectionKey);
        }
    }
  });

  it("keeps misconceptions explicitly false, followed immediately by the exact sourced correction", () => {
    for (const script of scripts) {
      const expected = ox.filter(
        (item) => item.section === script.sectionKey && !item.answer,
      );
      const mistakes = script.dialogue.filter(
        (turn) => turn.purpose === "misconception",
      );
      expect(mistakes).toHaveLength(expected.length);
      for (const item of expected) {
        const index = script.dialogue.findIndex(
          (turn) =>
            turn.purpose === "misconception" &&
            turn.source.kind === "bank-ox" &&
            turn.source.entryId === item.id,
        );
        expect(index, item.id).toBeGreaterThanOrEqual(0);
        expect(script.dialogue[index]!.markdown).toContain(item.statement);
        const correction = script.dialogue[index + 1]!;
        expect(correction).toMatchObject({
          role: "teacher",
          purpose: "correction",
          source: { kind: "bank-ox", entryId: item.id },
        });
        expect(correction.markdown).toContain(item.why);
      }
    }
  });

  it("retains the question and answer of every original concept example", () => {
    const examples = concepts.filter((concept) => concept.example);
    expect(examples).toHaveLength(372);
    for (const concept of examples) {
      const turns = conceptScriptFor(concept.section)!.dialogue.filter(
        (turn) =>
          turn.source.kind === "bank-example" &&
          turn.source.entryId === concept.id,
      );
      expect(
        turns.some(
          (turn) =>
            turn.role === "teacher" &&
            turn.expression === "question" &&
            turn.markdown === concept.example!.prompt,
        ),
        concept.id,
      ).toBe(true);
      expect(
        turns.some(
          (turn) =>
            turn.role === "teacher" &&
            turn.expression === "aha" &&
            turn.markdown.includes(concept.example!.answer),
        ),
        concept.id,
      ).toBe(true);
    }
  });

  it("uses instructional example sources and never imports independent apply/figure answers into dialogue", () => {
    for (const script of scripts)
      for (const turn of script.dialogue) {
        if ("entryId" in turn.source) {
          expect(
            independentIds.has(turn.source.entryId),
            turn.source.entryId,
          ).toBe(false);
          if (turn.source.kind === "bank-ox")
            expect(oxById.get(turn.source.entryId)?.section).toBe(
              script.sectionKey,
            );
          else
            expect(conceptById.get(turn.source.entryId)?.section).toBe(
              script.sectionKey,
            );
          if (turn.source.kind === "bank-example")
            expect(conceptById.get(turn.source.entryId)?.example).toBeDefined();
        }
        if (turn.source.kind === "authored-example") {
          const [grade, key] = turn.source.key.split("::");
          expect(AUTHORED_EXAMPLES[grade!]?.[key!]).toBeDefined();
        }
      }
    const runtime = readFileSync(
      resolve("src/lib/textbook/conceptScripts.ts"),
      "utf8",
    );
    expect(runtime).not.toMatch(
      /bank\/|AUTHORED_EXAMPLES|materialize|openai|typesafe|fetch\(/i,
    );
    const authoring = readFileSync(
      resolve("src/lib/textbook/scripts/materialize.ts"),
      "utf8",
    );
    expect(authoring).not.toMatch(/bank\.(?:apply|figures)/);
  });

  it("preserves all 298 v15 blocks and their correct curriculum mapping after conversion", () => {
    expect(reference.pages).toHaveLength(24);
    let count = 0;
    for (const page of reference.pages) {
      const script = conceptScriptFor(page.sectionKey)!;
      expect(script.provenance.referenceUnits).toContain(page.unit);
      for (const [blockIndex, block] of page.blocks.entries()) {
        const sourceTurns = script.dialogue.filter(
          (turn) =>
            turn.source.kind === "v15" &&
            turn.source.unit === page.unit &&
            turn.source.scriptIndex === page.scriptIndex &&
            turn.source.blockIndex === blockIndex,
        );
        expect(sourceTurns).toHaveLength(1);
        const turn = sourceTurns[0]!;
        if (
          block.kind === "turn" &&
          "text" in block &&
          typeof block.text === "string" &&
          "who" in block &&
          typeof block.who === "string"
        ) {
          expect(turn.markdown).toBe(normalizeV15Text(block.text));
          expect(turn.role).toBe(
            (
              {
                선생님: "teacher",
                민서: "student1",
                지호: "student2",
              } as Record<string, string>
            )[block.who],
          );
        } else if ("tex" in block)
          expect(turn.markdown).toContain(`$${block.tex}$`);
        count += 1;
      }
    }
    expect(count).toBe(298);
    for (const hash of Object.values(reference.files))
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("converts keywords around nested TeX without removing mathematical braces", () => {
    expect(
      normalizeV15Text(
        String.raw`조건은 {{[[\frac{x^{n+1}}{2}]]}}이고 {{전체 [[0]]}}이다.`,
      ),
    ).toBe(String.raw`조건은 **$\frac{x^{n+1}}{2}$**이고 **전체 $0$**이다.`);
  });

  it("renders every math token with KaTeX and leaves no legacy delimiters or blank wrappers", () => {
    const faults: string[] = [];
    for (const script of scripts)
      for (const turn of script.dialogue) {
        const label = `${script.sectionKey}: ${turn.markdown}`;
        if (
          /\[\[|\]\]|\{\{/.test(turn.markdown) ||
          (turn.markdown.match(/\$/g) ?? []).length % 2
        )
          faults.push(label);
        for (const match of turn.markdown.matchAll(/\$([^$]*)\$/g)) {
          try {
            katex.renderToString(match[1]!, {
              throwOnError: true,
              strict: "ignore",
            });
          } catch (error) {
            faults.push(`${label}: ${String(error)}`);
          }
        }
        const outsideMath = turn.markdown.replace(/\$[^$]*\$/g, "");
        if (/[{}]/.test(outsideMath))
          faults.push(`${label}: keyword wrapper remains`);
      }
    expect(faults).toEqual([]);
  });

  it("returns independent editable copies", () => {
    const key = sections[0]!.key;
    const first = conceptScriptFor(key)!;
    const original = first.dialogue[0]!.markdown;
    first.dialogue[0]!.markdown = "edited locally";
    first.conceptIds.length = 0;
    expect(conceptScriptFor(key)!.dialogue[0]!.markdown).toBe(original);
    expect(conceptScriptFor(key)!.conceptIds.length).toBeGreaterThan(0);
  });

  it("independently checks numeric equalities in the newly authored worked examples", () => {
    const faults: string[] = [];
    let checked = 0;
    for (const [grade, examples] of Object.entries(AUTHORED_EXAMPLES))
      for (const [key, example] of Object.entries(examples)) {
        for (const text of [example.question, ...example.steps, example.answer])
          for (const match of text.matchAll(/\$([^$]*)\$/g)) {
            const sides = match[1]!.split("=");
            if (sides.length < 2) continue;
            const values = sides.map(numericTexValue);
            // Symbolic identities, tuples and units are outside this arithmetic check.
            if (values.some((value) => value === undefined)) continue;
            checked += 1;
            if (
              values.some(
                (value) =>
                  Math.abs(value! - values[0]!) >
                  1e-9 * Math.max(1, Math.abs(values[0]!)),
              )
            )
              faults.push(`${grade} ${key}: $${match[1]}$`);
          }
      }
    expect(checked).toBeGreaterThan(150);
    expect(faults).toEqual([]);
  });
});

describe("lesson, board and semester metadata on the manuscripts", () => {
  it("keeps every earlier turn, source and id byte for byte and stays reproducible from the authoring notes", () => {
    for (const grade of CONCEPT_BLANK_GRADES) {
      const code = GRADE_FILE_CODES[grade];
      const committed = readFileSync(
        resolve(`src/lib/textbook/scripts/${code}.json`),
        "utf8",
      ).replace(/\r\n/g, "\n");
      // Writing nothing: the derivation is compared in memory.
      expect(
        serializeScripts(materializeGrade(grade)) === committed,
        grade,
      ).toBe(true);
      expect(priorDialogueSha256(JSON.parse(committed)), grade).toBe(
        PRIOR_DIALOGUE_SHA256[code],
      );
    }
    const authoring = readFileSync(
      resolve("src/lib/textbook/scripts/materialize.ts"),
      "utf8",
    );
    // The only write sits behind the explicit --write flag of the command line.
    expect(authoring.match(/writeFileSync\(/g)).toHaveLength(1);
    expect(authoring).toMatch(/flags\.includes\("--write"\)/);
    expect(authoring).toMatch(/!dialogueKept && !replaceDialogue/);
  });

  it("differs from the first manuscripts by exactly the 41 approved corrections", () => {
    expect(STATIC_CORRECTIONS.map((correction) => correction.id)).toEqual(
      Array.from(
        { length: 41 },
        (_, index) => `SC-${String(index + 1).padStart(3, "0")}`,
      ),
    );
    expect(STATIC_CORRECTIONS_REVIEW.review).toMatch(/^AI 편집 검수/);
    expect(STATIC_CORRECTIONS_REVIEW.review).toContain(
      "사람이 읽은 검수가 아니다",
    );
    const kinds: Record<string, number> = {};
    for (const correction of STATIC_CORRECTIONS) {
      kinds[correction.kind] = (kinds[correction.kind] ?? 0) + 1;
      const script = scripts.find(
        (item) => item.sectionKey === correction.sectionKey,
      )!;
      const turn = script.dialogue[correction.turnIndex]!;
      expect(turn.markdown, correction.id).toBe(correction.new);
      expect(turn.source, correction.id).toEqual(correction.source);
      expect(correction.old).not.toBe(correction.new);
      expect(correction.reason.length).toBeGreaterThan(10);
      // No number or formula was touched: every earlier math token is still there, in order.
      expect(
        keepsMathTokens(correction.old, correction.new),
        correction.id,
      ).toBe(true);
      if (correction.kind === "sentence-answer-copula") {
        const answer = conceptById.get(
          (correction.source as { entryId: string }).entryId,
        )!.example!.answer;
        expect(endsAsSentence(answer), correction.id).toBe(true);
        expect(correction.old).toBe(
          `이 기준으로 물음에 답하면 **${answer}**입니다.`,
        );
        expect(correction.new).toBe(exampleAnswerLine(answer));
        expect(mathTokens(correction.new)).toEqual(mathTokens(correction.old));
      } else {
        expect(correction.source.kind).toBe("authored-example");
        // A condition added to a question is one the lesson already states elsewhere.
        const lesson = script.dialogue
          .filter((item) => item.source.kind === "authored-example")
          .filter((item) => item.markdown !== correction.new)
          .flatMap((item) => mathTokens(item.markdown));
        const before = mathTokens(correction.old);
        for (const token of mathTokens(correction.new))
          if (!before.includes(token))
            expect(lesson, correction.id).toContain(token);
      }
    }
    expect(kinds).toEqual({
      "sentence-answer-copula": 32,
      particle: 1,
      "missing-condition": 4,
      "ambiguous-wording": 4,
    });
    // Every bank answer that ends as a sentence is among them, and none keeps "입니다".
    const sentenceAnswers = concepts.filter(
      (concept) => concept.example && endsAsSentence(concept.example.answer),
    );
    expect(sentenceAnswers).toHaveLength(32);
    for (const script of scripts)
      for (const turn of script.dialogue)
        expect(turn.markdown).not.toMatch(
          /다(?:\s?\([^()]*\))?\.?\*\*입니다\.$/,
        );
    expect(exampleAnswerLine("유리수이다")).toBe(
      "이 기준으로 물음에 답하면 **유리수이다**.",
    );
    expect(exampleAnswerLine("된다 ($40=2^3\\times5$)")).toBe(
      "이 기준으로 물음에 답하면 **된다 ($40=2^3\\times5$)**.",
    );
    expect(exampleAnswerLine("아니다. 조각의 크기가 같지 않다.")).toBe(
      "이 기준으로 물음에 답하면 **아니다. 조각의 크기가 같지 않다.**",
    );
    expect(exampleAnswerLine("십의 자리")).toBe(
      "이 기준으로 물음에 답하면 **십의 자리**입니다.",
    );
    expect(exampleAnswerLine("순환소수 ($0.1666\\cdots$)")).toBe(
      "이 기준으로 물음에 답하면 **순환소수 ($0.1666\\cdots$)**입니다.",
    );
  });

  it("still catches a turn that changes without an approved correction", () => {
    const code = "m2";
    const committed = JSON.parse(
      readFileSync(resolve(`src/lib/textbook/scripts/${code}.json`), "utf8"),
    ) as (typeof scripts)[number][];
    expect(priorDialogueSha256(committed)).toBe(PRIOR_DIALOGUE_SHA256[code]);
    const listed = new Set(
      STATIC_CORRECTIONS.map(
        (correction) => `${correction.sectionKey}#${correction.turnIndex}`,
      ),
    );
    // A turn outside the ledger: one changed character is a different manuscript.
    const stray = structuredClone(committed);
    const target = stray[0]!.dialogue.findIndex(
      (_, index) => !listed.has(`${stray[0]!.sectionKey}#${index}`),
    );
    stray[0]!.dialogue[target]!.markdown += " ";
    expect(priorDialogueSha256(stray)).not.toBe(PRIOR_DIALOGUE_SHA256[code]);
    // A corrected turn that reads differently from its ledger entry is refused outright.
    const drifted = structuredClone(committed);
    const entry = STATIC_CORRECTIONS.find((correction) =>
      correction.sectionKey.startsWith("중2::"),
    )!;
    drifted.find((script) => script.sectionKey === entry.sectionKey)!.dialogue[
      entry.turnIndex
    ]!.markdown = entry.new.replace("**.", "**이다.");
    expect(() => priorDialogueSha256(drifted)).toThrow(entry.id);
    // An entry that is dropped from the ledger leaves its correction unexplained.
    expect(
      createHash("sha256")
        .update(
          serializeScripts(
            withoutPresentationMetadata(
              withoutStaticCorrections(
                committed,
                STATIC_CORRECTIONS.filter((correction) => correction !== entry),
              ),
            ),
          ),
          "utf8",
        )
        .digest("hex"),
    ).not.toBe(PRIOR_DIALOGUE_SHA256[code]);
  });

  it("reads every plain number with a particle that fits its final sound", () => {
    // 1 일, 3 삼, 6 육, 7 칠, 8 팔 and 0 (영, 십, 백 …) end in a consonant.
    const endsInConsonant = (number: string) =>
      "013678".includes(number.at(-1)!);
    const pairs: [afterConsonant: string, afterVowel: string][] = [
      ["이에요", "예요"],
      ["은", "는"],
      ["을", "를"],
      ["과", "와"],
    ];
    const faults: string[] = [];
    let checked = 0;
    for (const script of scripts)
      for (const turn of script.dialogue)
        for (const match of turn.markdown.matchAll(
          /\$-?(\d+(?:\.\d+)?)\$(이에요|예요|[은는을를과와](?![가-힣]))/g,
        )) {
          const pair = pairs.find((item) => item.includes(match[2]!))!;
          checked += 1;
          if (match[2] !== pair[endsInConsonant(match[1]!) ? 0 : 1])
            faults.push(`${script.sectionKey}: ${match[0]}`);
        }
    expect(checked).toBeGreaterThan(300);
    expect(faults).toEqual([]);
    expect(
      scripts
        .find(
          (script) =>
            script.grade === "초5" && script.title.startsWith("2-4-6 "),
        )!
        .dialogue.map((turn) => turn.markdown),
    ).toContain("곱은 $1.56$이에요.");
  });

  it("places every turn in exactly one contiguous lesson with a sourced title", () => {
    let turns = 0;
    for (const script of scripts) {
      const sectionId = script.conceptIds[0]!.replace(/-c\d+$/, "");
      const sectionTitle = sectionLessonTitle(script.grade, script.title);
      const runs: string[] = [];
      for (const turn of script.dialogue) {
        turns += 1;
        const { lessonKey, lessonTitle } = turn.presentation!;
        if (runs.at(-1) !== lessonKey) runs.push(lessonKey);
        const [origin, ...rest] = lessonKey.split(":");
        if (origin === "v15") {
          expect(turn.source.kind).toBe("v15");
          const page = reference.pages.find(
            (p) => p.unit === rest[0] && String(p.scriptIndex) === rest[1],
          )!;
          expect(page.sectionKey).toBe(script.sectionKey);
          expect(lessonTitle).toBe(page.title);
        } else if (origin === "concept") {
          const concept = conceptById.get(rest.join(":"))!;
          expect(concept.section).toBe(script.sectionKey);
          expect(lessonTitle).toBe(concept.term);
          expect(turn.conceptIds).toEqual([concept.id]);
          expect(turn.source).toMatchObject({ entryId: concept.id });
        } else {
          expect(lessonKey).toMatch(
            new RegExp(`^section:${sectionId}:(open|wrap)$`),
          );
          expect(lessonTitle).toBe(sectionTitle);
        }
        expect(turn.source.kind === "v15").toBe(origin === "v15");
      }
      // A lesson never resumes after another lesson has started.
      expect(new Set(runs).size, script.sectionKey).toBe(runs.length);
      const pages = reference.pages.filter(
        (p) => p.sectionKey === script.sectionKey,
      );
      expect(runs).toEqual([
        `section:${sectionId}:open`,
        ...pages.map((p) => `v15:${p.unit}:${p.scriptIndex}`),
        ...script.conceptIds.map((id) => `concept:${id}`),
        `section:${sectionId}:wrap`,
      ]);
      expect(
        script.dialogue.filter((turn) =>
          turn.presentation!.lessonKey.endsWith(":open"),
        ),
      ).toHaveLength(2);
      expect(script.dialogue.at(-1)!.presentation!.lessonKey).toBe(
        `section:${sectionId}:wrap`,
      );
      if (script.grade.startsWith("초"))
        expect(script.title).toBe(
          `${script.title.split(" ")[0]} ${sectionTitle}`,
        );
      else expect(sectionTitle).toBe(script.title);
    }
    expect(turns).toBe(7792);
    // Lesson titles may carry inline math; it must typeset like the dialogue itself.
    for (const script of scripts)
      for (const turn of script.dialogue)
        for (const token of mathTokens(turn.presentation!.lessonTitle))
          expect(() =>
            katex.renderToString(token.slice(1, -1), {
              throwOnError: true,
              strict: "ignore",
            }),
          ).not.toThrow();
  });

  it("keeps the 24 original v15 boards as boards and never turns original speech into one", () => {
    let boards = 0;
    let speech = 0;
    for (const page of reference.pages) {
      const script = conceptScriptFor(page.sectionKey)!;
      const lesson = script.dialogue.filter(
        (turn) =>
          turn.presentation!.lessonKey ===
          `v15:${page.unit}:${page.scriptIndex}`,
      );
      expect(lesson).toHaveLength(page.blocks.length);
      for (const [blockIndex, block] of page.blocks.entries()) {
        const turn = lesson[blockIndex]!;
        expect(turn.source).toEqual({
          kind: "v15",
          unit: page.unit,
          scriptIndex: page.scriptIndex,
          blockIndex,
          page: page.page,
        });
        if (block.kind === "board" && "tex" in block) {
          boards += 1;
          expect(turn.presentation!.kind).toBe("board");
          const note =
            "note" in block && block.note
              ? `\n\n${normalizeV15Text(block.note)}`
              : "";
          expect(turn.markdown).toBe(
            `**${block.title}**\n\n$${block.tex}$${note}`,
          );
        } else {
          speech += 1;
          expect(turn.presentation!.kind).toBe("speech");
        }
      }
      expect(script.provenance.boards?.status).toBe("authored-v15");
    }
    expect([boards, speech]).toEqual([24, 274]);
    const authored = scripts.filter(
      (script) => script.provenance.boards?.status === "authored-v15",
    );
    expect(authored).toHaveLength(7);
    expect(
      authored.reduce(
        (n, script) =>
          n + (script.provenance.boards as { count: number }).count,
        0,
      ),
    ).toBe(24);
    for (const script of authored)
      expect(
        script.dialogue.filter(
          (turn) =>
            turn.presentation!.kind === "board" && turn.source.kind !== "v15",
        ),
      ).toEqual([]);
  });

  it("derives a board only from a formula, law, theorem or unit statement of the bank and records that 273 sections have none", () => {
    expect([...BOARD_CONCEPT_KINDS]).toEqual(["공식", "법칙", "정리", "단위"]);
    const status = { "authored-v15": 0, "derived-bank": 0, absent: 0 };
    let derivedBoards = 0;
    for (const script of scripts) {
      const boards = script.provenance.boards!;
      status[boards.status] += 1;
      if (boards.status === "authored-v15") continue;
      const expected = script.conceptIds.filter((id) =>
        BOARD_CONCEPT_KINDS.includes(conceptById.get(id)!.kind),
      );
      const found = script.dialogue.filter(
        (turn) => turn.presentation!.kind === "board",
      );
      expect(
        found.map((turn) => "entryId" in turn.source && turn.source.entryId),
        script.sectionKey,
      ).toEqual(expected);
      for (const turn of found) {
        const concept = conceptById.get(
          (turn.source as { entryId: string }).entryId,
        )!;
        expect(turn).toMatchObject({
          role: "teacher",
          purpose: "explanation",
          source: { kind: "bank-concept" },
        });
        // Title, blank line, body: the same shape as an original board.
        expect(turn.markdown.startsWith(`**${concept.term}**\n\n`)).toBe(true);
        expect(turn.markdown.replace(/\*\*/g, "")).toBe(
          `${concept.term}\n\n${plain(concept.definition)}`,
        );
      }
      derivedBoards += found.length;
      if (expected.length)
        expect(boards).toEqual({
          status: "derived-bank",
          count: expected.length,
          basis: "concept-kind",
          entryIds: expected,
        });
      else
        expect(boards).toEqual({
          status: "absent",
          reason: "no-board-kind-concept",
        });
    }
    expect(status).toEqual({
      "authored-v15": 7,
      "derived-bank": 80,
      absent: 273,
    });
    expect(derivedBoards).toBe(163);
  });

  it("maps all 360 sections and 1657 concepts onto the fourteen grade-semester books", () => {
    const coverage = conceptScriptSemesterCoverage();
    expect(
      coverage.map((row) => [row.grade, row.semester, row.sections]),
    ).toEqual([
      ["초3", 1, 31],
      ["초3", 2, 25],
      ["초4", 1, 32],
      ["초4", 2, 30],
      ["초5", 1, 26],
      ["초5", 2, 30],
      ["초6", 1, 27],
      ["초6", 2, 29],
      ["중1", 1, 28],
      ["중1", 2, 24],
      ["중2", 1, 33],
      ["중2", 2, 23],
      ["중3", 1, 12],
      ["중3", 2, 10],
    ]);
    expect(coverage.reduce((n, row) => n + row.sections, 0)).toBe(360);
    expect(coverage.reduce((n, row) => n + row.concepts, 0)).toBe(1657);
    expect(coverage.every((row) => row.sections > 0 && row.concepts > 0)).toBe(
      true,
    );
    // The same rule the product uses to scope a book, on the seeded curriculum.
    const seeded = CURRICULUM_UNITS.filter((unit) =>
      (CONCEPT_BLANK_GRADES as readonly string[]).includes(unit.grade),
    );
    expect(seeded).toHaveLength(360);
    for (const unit of seeded) {
      const script = conceptScriptFor(
        `${unit.grade}::${unit.chapter}::${unit.section}`,
      );
      expect(script?.semester, unit.section).toBe(quickCreateSemester(unit));
    }
    for (const row of coverage)
      expect(conceptScriptSectionKeys(row.grade, row.semester)).toHaveLength(
        row.sections,
      );
    expect(
      CONCEPT_BLANK_GRADES.flatMap((grade) => [
        ...conceptScriptSectionKeys(grade, 1),
        ...conceptScriptSectionKeys(grade, 2),
      ]).sort(),
    ).toEqual(sections.map((section) => section.key).sort());
  });
});

describe("student names addressed inside the manuscript", () => {
  const key = "중2::1. 수와 식::유리수와 소수";
  const anchored = scripts.flatMap((script) =>
    script.dialogue
      .filter((turn) => turn.roleMentions)
      .map((turn) => ({ script, turn })),
  );

  it("anchors the one turn that addresses students by name and nothing else", () => {
    expect(Object.keys(V15_ROLE_MENTIONS)).toEqual(["U01:1:3"]);
    expect(anchored).toHaveLength(1);
    const { script, turn } = anchored[0]!;
    expect(script.sectionKey).toBe(key);
    expect(turn.source).toMatchObject({
      kind: "v15",
      unit: "U01",
      scriptIndex: 1,
      blockIndex: 3,
    });
    expect(
      turn.roleMentions!.map((mention) => [
        mention.role,
        turn.markdown.slice(mention.start, mention.end),
      ]),
    ).toEqual([
      ["student1", "민서는"],
      ["student2", "지호는"],
    ]);
    // Every student name that appears as text anywhere is one of these anchors.
    for (const candidate of scripts)
      for (const item of candidate.dialogue)
        for (const student of students) {
          const outside = item.markdown.replace(/\$[^$]*\$/g, "");
          if (outside.includes(student.name)) expect(item).toBe(turn);
        }
  });

  it("writes the chosen names with the right particle and changes no other turn or math", () => {
    const source = conceptScriptFor(key)!;
    expect(
      conceptScriptForCast(key, { student1: "민서", student2: "지호" }),
    ).toEqual(source);
    expect(conceptScriptForCast(key, {})).toEqual(source);
    const cast = conceptScriptForCast(key, {
      student1: "다은",
      student2: "도현",
    })!;
    const changed = cast.dialogue.filter(
      (turn, index) => turn.markdown !== source.dialogue[index]!.markdown,
    );
    expect(changed).toHaveLength(1);
    const before = source.dialogue[cast.dialogue.indexOf(changed[0]!)]!;
    expect(changed[0]!.markdown).toBe(
      before.markdown
        .replace("민서는 쓰인 모양을", "다은은 쓰인 모양을")
        .replace("지호는 그 수의 값을", "도현은 그 수의 값을"),
    );
    expect(changed[0]!.markdown).toContain(
      "다은은 쓰인 모양을, 도현은 그 수의 값을 봤어.",
    );
    expect(mathTokens(changed[0]!.markdown)).toEqual(
      mathTokens(before.markdown),
    );
    expect(
      changed[0]!.roleMentions!.map((mention) =>
        changed[0]!.markdown.slice(mention.start, mention.end),
      ),
    ).toEqual(["다은은", "도현은"]);
    const text = cast.dialogue.map((turn) => turn.markdown).join("\n");
    expect(text).not.toMatch(/민서|지호/);
    // Only one role chosen: the other keeps the name written in the manuscript.
    expect(
      conceptScriptForCast(key, { student2: "건우" })!.dialogue.find(
        (turn) => turn.roleMentions,
      )!.markdown,
    ).toContain("민서는 쓰인 모양을, 건우는 그 수의 값을 봤어.");
    expect(conceptScriptFor(key)).toEqual(source);
  });

  it("follows the final consonant for all ten students and never doubles the teacher's title", () => {
    const withFinalConsonant = ["다은", "하준", "도현"];
    expect(students.map((student) => student.name)).toEqual([
      "민서",
      "수아",
      "유나",
      "지아",
      "다은",
      "지호",
      "하준",
      "시우",
      "도현",
      "건우",
    ]);
    const { turn } = anchored[0]!;
    const teacherWord = (markdown: string) =>
      (markdown.match(/선생님/g) ?? []).length;
    for (const first of students)
      for (const second of students) {
        if (first === second) continue;
        const cast = conceptScriptForCast(key, {
          student1: first.name,
          student2: second.name,
        })!;
        const line = cast.dialogue.find((item) => item.roleMentions)!.markdown;
        const particle = (name: string) =>
          withFinalConsonant.includes(name) ? "은" : "는";
        expect(line).toContain(
          `${first.name}${particle(first.name)} 쓰인 모양을, ${second.name}${particle(second.name)} 그 수의 값을 봤어.`,
        );
        expect(mathTokens(line)).toEqual(mathTokens(turn.markdown));
        const whole = cast.dialogue.map((item) => item.markdown).join("\n");
        expect(teacherWord(whole)).toBe(
          teacherWord(
            conceptScriptFor(key)!
              .dialogue.map((item) => item.markdown)
              .join("\n"),
          ),
        );
        expect(whole).not.toMatch(/선생님\s*선생님/);
      }
    expect(
      (
        [
          ["은/는", "은", "는"],
          ["이/가", "이", "가"],
          ["을/를", "을", "를"],
          ["과/와", "과", "와"],
          ["아/야", "아", "야"],
          ["", "", ""],
        ] as const
      ).map(([pair]) => [
        pair,
        particleAfter("도현", pair),
        particleAfter("지호", pair),
      ]),
    ).toEqual([
      ["은/는", "은", "는"],
      ["이/가", "이", "가"],
      ["을/를", "을", "를"],
      ["과/와", "과", "와"],
      ["아/야", "아", "야"],
      ["", "", ""],
    ]);
    expect(particleAfter("Mina", "은/는")).toBe("은(는)");
  });

  it("leaves a name inside another word alone, such as 지은 in 짝지은", () => {
    const paired = scripts.flatMap((script) =>
      script.dialogue
        .filter((turn) => turn.markdown.includes("짝지은"))
        .map((turn) => ({ script, turn })),
    );
    expect(paired).toHaveLength(4);
    for (const { script, turn } of paired) {
      expect(turn.roleMentions).toBeUndefined();
      for (const names of [
        { student1: "지은", student2: "도현" },
        { student1: "다은", student2: "지은" },
      ]) {
        const cast = conceptScriptForCast(script.sectionKey, names)!;
        expect(cast.dialogue[script.dialogue.indexOf(turn)]!.markdown).toBe(
          turn.markdown,
        );
        expect(cast).toEqual(conceptScriptFor(script.sectionKey));
      }
    }
    // Across all 360 manuscripts a cast change touches the anchored turn only.
    let changed = 0;
    for (const script of scripts) {
      const cast = conceptScriptForCast(script.sectionKey, {
        student1: "다은",
        student2: "도현",
      })!;
      for (const [index, turn] of cast.dialogue.entries())
        if (turn.markdown !== script.dialogue[index]!.markdown) changed += 1;
    }
    expect(changed).toBe(1);
  });

  it("refuses a stale, overlapping, repeated or in-math anchor instead of guessing", () => {
    const text = "민서는 $x$를 보고, 지호는 값을 봤어.";
    const mentions = anchorRoleMentions(text, [
      { role: "student2", name: "지호", particle: "은/는" },
      { role: "student1", name: "민서", particle: "은/는" },
    ]);
    expect(mentions.map((mention) => mention.role)).toEqual([
      "student1",
      "student2",
    ]);
    expect(
      applyRoleMentions(text, mentions, { student1: "도현", student2: "수아" })
        .markdown,
    ).toBe("도현은 $x$를 보고, 수아는 값을 봤어.");
    expect(() =>
      applyRoleMentions(`앞 ${text}`, mentions, { student1: "도현" }),
    ).toThrow(/Stale/);
    expect(() =>
      applyRoleMentions(text, [mentions[0]!, mentions[0]!], {}),
    ).toThrow(/Stale/);
    expect(() =>
      anchorRoleMentions("민서는 보고 민서는 썼어.", [
        { role: "student1", name: "민서", particle: "은/는" },
      ]),
    ).toThrow(/exactly once/);
    expect(() =>
      anchorRoleMentions("값은 $민서는$이다.", [
        { role: "student1", name: "민서", particle: "은/는" },
      ]),
    ).toThrow(/exactly once/);
    expect(() =>
      anchorRoleMentions("짝지은 순서쌍", [
        { role: "student1", name: "지은", particle: "은/는" },
      ]),
    ).toThrow(/exactly once/);
  });
});

/** A small independent arithmetic parser, with no eval and no app calculation code. */
function numericTexValue(tex: string): number | undefined {
  let text = tex.replace(/\^\\circ/g, "").replace(/\\(?:left|right)/g, "");
  function argument(at: number): [string, number] {
    if (text[at] !== "{") return [text[at] ?? "", at + 1];
    let depth = 1,
      end = at + 1;
    while (end < text.length && depth) {
      if (text[end] === "{") depth += 1;
      if (text[end] === "}") depth -= 1;
      end += 1;
    }
    return [text.slice(at + 1, end - 1), end];
  }
  // Expand the innermost fraction/radical first, preserving numeric mixed numbers.
  for (let guard = 0; guard < 50; guard += 1) {
    const commands = [...text.matchAll(/\\(?:[dt]?frac|sqrt)/g)];
    const command = commands.at(-1);
    if (!command) break;
    let start = command.index!;
    const [first, end] = argument(start + command[0].length);
    let replacement: string,
      finish = end;
    if (command[0] === "\\sqrt") replacement = `sqrt(${first})`;
    else {
      const [second, next] = argument(end);
      replacement = `((${first})/(${second}))`;
      finish = next;
      const integer = text.slice(0, start).match(/\d+$/);
      if (integer) {
        replacement = `(${integer[0]}+${replacement})`;
        start -= integer[0].length;
      }
    }
    text = text.slice(0, start) + replacement + text.slice(finish);
  }
  text = text
    .replace(/\\times|\\cdot/g, "*")
    .replace(/\\div/g, "/")
    .replace(/\\[,;! ]/g, "")
    .replace(/[{}]/g, "")
    .replace(/\s/g, "");
  // Implicit coefficient multiplication occurs in radical notation, e.g. 5sqrt(3).
  text = text.replace(/(\d|\))(?=sqrt\()/g, "$1*");
  if (
    /[^0-9.+*/()^\-sqrt]/.test(text) ||
    /[A-Za-z]/.test(text.replace(/sqrt/g, ""))
  )
    return undefined;
  const tokens = text.match(/sqrt|\d+(?:\.\d+)?|[()+*/^\-]/g) ?? [];
  let cursor = 0;
  function atom(): number {
    const token = tokens[cursor++];
    if (token === "-") return -atom();
    if (token === "+") return atom();
    if (token === "sqrt") return Math.sqrt(atom());
    if (token === "(") {
      const value = sum();
      if (tokens[cursor++] !== ")")
        throw new Error("Unclosed arithmetic group");
      return value;
    }
    if (!token || !/^\d/.test(token))
      throw new Error("Unsupported arithmetic token");
    return Number(token);
  }
  function power(): number {
    const value = atom();
    if (tokens[cursor] === "^") {
      cursor += 1;
      return value ** power();
    }
    return value;
  }
  function product(): number {
    let value = power();
    while (tokens[cursor] === "*" || tokens[cursor] === "/") {
      const operator = tokens[cursor++];
      const next = power();
      value = operator === "*" ? value * next : value / next;
    }
    return value;
  }
  function sum(): number {
    let value = product();
    while (tokens[cursor] === "+" || tokens[cursor] === "-") {
      const operator = tokens[cursor++];
      const next = product();
      value = operator === "+" ? value + next : value - next;
    }
    return value;
  }
  try {
    const value = sum();
    return cursor === tokens.length && Number.isFinite(value)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
