import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import katex from "katex";
import { describe, expect, it } from "vitest";
import { z } from "zod";
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
import {
  conceptScriptFor,
  conceptScriptCoverage,
} from "@/lib/textbook/conceptScripts";
import { AUTHORED_EXAMPLES } from "@/lib/textbook/scripts/authoredExamples";
import { normalizeV15Text } from "@/lib/textbook/scripts/normalizeV15";
import reference from "@/lib/textbook/scripts/reference-v15.json";

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
const manuscriptSchema = z.strictObject({
  version: z.literal(1),
  sectionKey: z.string().min(1),
  grade: z.enum(CONCEPT_BLANK_GRADES),
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
      }),
    )
    .min(10),
  provenance: z.strictObject({
    bank: z.literal("original-concept-blank"),
    sourceFiles: z.array(z.string()).min(1),
    referenceUnits: z.array(z.string()).optional(),
  }),
});

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
