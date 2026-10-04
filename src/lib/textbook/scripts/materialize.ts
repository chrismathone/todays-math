/**
 * Offline deterministic authoring, never imported by the application.
 * The committed grade JSON is the manuscript; this file only shows how it is derived.
 *
 * Check (default — writes nothing, exits 1 on any difference):
 *   node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/materialize.ts
 * Write presentation metadata only (refuses if any earlier dialogue would change):
 *   node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/materialize.ts --write
 * Replacing dialogue needs --write --replace-dialogue, after the correction is in the
 * authoring notes; every turn it changes is then listed in static-corrections.json.
 * Never run that as a routine step.
 * No model, network, database, or independent practice answers are used.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  splitBlankSentence,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";
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
import { AUTHORED_EXAMPLES } from "./authoredExamples";
import reference from "./reference-v15.json";
import { normalizeV15Text } from "./normalizeV15";
import { V15_ROLE_MENTIONS, anchorRoleMentions } from "./roleMentions";
import type {
  ConceptTeachingScript,
  ConceptScriptGrade,
  ConceptScriptPresentation,
  ConceptScriptSource,
  ConceptScriptTurn,
} from "./types";

const parts = { 초3: e3, 초4: e4, 초5: e5, 초6: e6, 중1: m1, 중2: m2, 중3: m3 };
export const GRADE_FILE_CODES = {
  초3: "e3",
  초4: "e4",
  초5: "e5",
  초6: "e6",
  중1: "m1",
  중2: "m2",
  중3: "m3",
} as const;
const names = {
  선생님: "teacher",
  민서: "student1",
  지호: "student2",
} as const;
const plain = (concept: ConceptEntry) =>
  splitBlankSentence(concept.definition)
    .map((p) => p.text)
    .join("");
const explained = (concept: ConceptEntry) =>
  splitBlankSentence(concept.definition)
    .map((p) => (p.kind === "key" ? `**${p.text}**` : p.text))
    .join("");
const kindQuestion = {
  정의: "뜻은 무엇인가요?",
  성질: "조건과 성질을 같이 알려 주세요.",
  공식: "각 부분은 무엇을 뜻하나요?",
  방법: "계산이나 판단은 어떤 순서로 하나요?",
  법칙: "계산 규칙과 그 까닭을 알고 싶어요.",
  정리: "조건과 결론을 함께 알고 싶어요.",
  단위: "기준이 되는 양은 무엇인가요?",
};
/**
 * A bank answer that already ends as a sentence — "아니다", "된다 (…)", "없다. …" —
 * rather than as a noun or a value. Math and one closing parenthesis are looked past.
 */
export function endsAsSentence(answer: string): boolean {
  const body = answer
    .replace(/\$[^$]*\$/g, "")
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim();
  return /(?:다|[.!?])$/.test(body);
}

/** The teacher's answer to a bank example. A sentence answer takes no "입니다" after it. */
export function exampleAnswerLine(answer: string): string {
  if (!endsAsSentence(answer))
    return `이 기준으로 물음에 답하면 **${answer}**입니다.`;
  return `이 기준으로 물음에 답하면 **${answer}**${/[.!?]$/.test(answer.trim()) ? "" : "."}`;
}

/** Statements a class records on the board, by the bank's own classification. */
export const BOARD_CONCEPT_KINDS: readonly ConceptEntry["kind"][] = [
  "공식",
  "법칙",
  "정리",
  "단위",
];

/** Elementary chapters start with the semester ("1-3 …"); middle chapters 1–4 are semester 1. */
export function semesterOf(grade: ConceptScriptGrade, chapter: string): 1 | 2 {
  const found = grade.startsWith("초")
    ? /^([12])-\d+\s/.exec(chapter)?.[1]
    : /^(\d+)\.\s/.exec(chapter)?.[1];
  if (!found) throw new Error(`No semester for chapter: ${grade} ${chapter}`);
  if (grade.startsWith("초")) return Number(found) as 1 | 2;
  return Number(found) <= 4 ? 1 : 2;
}

/** Elementary section names carry a catalogue number ("1-1-1 …"), which is not part of the lesson name. */
export function sectionLessonTitle(
  grade: ConceptScriptGrade,
  title: string,
): string {
  if (!grade.startsWith("초")) return title;
  const stripped = title.replace(/^\d+-\d+-\d+\s+/, "");
  if (stripped === title || !stripped)
    throw new Error(`Unexpected elementary section title: ${title}`);
  return stripped;
}

export function materializeGrade(
  grade: ConceptScriptGrade,
): ConceptTeachingScript[] {
  const bank = parts[grade];
  return BLANK_SECTIONS.filter((s) => s.grade === grade).map((section) => {
    const concepts = bank.concepts.filter((c) => c.section === section.key);
    if (!concepts.length)
      throw new Error(`Missing source concepts: ${section.key}`);
    const conceptIds = concepts.map((c) => c.id);
    const sectionId = conceptIds[0]!.replace(/-c\d+$/, "");
    if (conceptIds.some((id) => !id.startsWith(`${sectionId}-c`)))
      throw new Error(`Concept ids do not share a section id: ${section.key}`);
    const sectionTitle = sectionLessonTitle(grade, section.title);
    let lesson: Omit<ConceptScriptPresentation, "kind"> = {
      lessonKey: `section:${sectionId}:open`,
      lessonTitle: sectionTitle,
    };
    const dialogue: ConceptScriptTurn[] = [];
    const add = (
      role: ConceptScriptTurn["role"],
      expression: ConceptScriptTurn["expression"],
      purpose: ConceptScriptTurn["purpose"],
      markdown: string,
      source: ConceptScriptSource,
      ids = conceptIds,
      kind: ConceptScriptPresentation["kind"] = "speech",
    ) => {
      const turn: ConceptScriptTurn = {
        role,
        expression,
        purpose,
        markdown,
        conceptIds: [...ids],
        source,
        presentation: { kind, ...lesson },
      };
      dialogue.push(turn);
      return turn;
    };
    const authoredKey = grade.startsWith("초")
      ? section.title.split(" ")[0]!
      : section.title;
    const authored = AUTHORED_EXAMPLES[grade]?.[authoredKey];
    const sourceExample = concepts.find((c) => c.example);
    if (!authored && !sourceExample)
      throw new Error(`Missing worked example: ${section.key}`);
    const openerSource: ConceptScriptSource = authored
      ? { kind: "authored-example", key: `${grade}::${authoredKey}` }
      : { kind: "bank-example", entryId: sourceExample!.id };
    const question = authored?.question ?? sourceExample!.example!.prompt;
    add("teacher", "question", "opening", question, openerSource);
    add(
      "student1",
      "thinking",
      "opening",
      grade.startsWith("초")
        ? `어떤 뜻으로 생각해야 할까요? **${concepts[0]!.term}**부터 짚어 보고 싶어요.`
        : `계산이나 판단의 기준을 먼저 확인하고 싶어요. **${concepts[0]!.term}**의 조건부터 살펴볼게요.`,
      { kind: "bank-concept", entryId: concepts[0]!.id },
      [concepts[0]!.id],
    );

    // Genuine v15 dialogue keeps its page title as the lesson and its boards as boards.
    const pages = reference.pages.filter((p) => p.sectionKey === section.key);
    for (const page of pages) {
      lesson = {
        lessonKey: `v15:${page.unit}:${page.scriptIndex}`,
        lessonTitle: page.title,
      };
      for (const [blockIndex, block] of page.blocks.entries()) {
        const source: ConceptScriptSource = {
          kind: "v15",
          unit: page.unit,
          scriptIndex: page.scriptIndex,
          blockIndex,
          page: page.page,
        };
        if (block.kind === "turn") {
          const turn = block as {
            who: keyof typeof names;
            text: string;
            expression: ConceptScriptTurn["expression"];
          };
          if (!names[turn.who])
            throw new Error(`Unknown v15 speaker: ${turn.who}`);
          const added = add(
            names[turn.who],
            turn.expression,
            turn.expression === "question" ? "opening" : "explanation",
            normalizeV15Text(turn.text),
            source,
          );
          const mentions =
            V15_ROLE_MENTIONS[`${page.unit}:${page.scriptIndex}:${blockIndex}`];
          if (mentions)
            added.roleMentions = anchorRoleMentions(added.markdown, mentions);
        } else if (block.kind === "board") {
          const board = block as { title: string; tex: string; note?: string };
          add(
            "teacher",
            "neutral",
            "example",
            `**${board.title}**\n\n$${board.tex}$${board.note ? `\n\n${normalizeV15Text(board.note)}` : ""}`,
            source,
            conceptIds,
            "board",
          );
        } else throw new Error(`Unknown v15 block: ${block.kind}`);
      }
    }

    // Every original concept is explained in full, including given-case cards.
    // Where v15 has no authored board, a formula/law/theorem/unit statement is the board.
    const boardConcepts = pages.length
      ? []
      : concepts.filter((c) => BOARD_CONCEPT_KINDS.includes(c.kind));
    for (const [i, concept] of concepts.entries()) {
      lesson = {
        lessonKey: `concept:${concept.id}`,
        lessonTitle: concept.term,
      };
      const source: ConceptScriptSource = {
        kind: "bank-concept",
        entryId: concept.id,
      };
      add(
        i % 2 ? "student2" : "student1",
        "question",
        "explanation",
        `**${concept.term}**의 ${kindQuestion[concept.kind]}`,
        source,
        [concept.id],
      );
      add(
        "teacher",
        "neutral",
        "explanation",
        `**${concept.term}**\n\n${explained(concept)}`,
        source,
        [concept.id],
        boardConcepts.includes(concept) ? "board" : "speech",
      );
      if (concept.example) {
        const exampleSource: ConceptScriptSource = {
          kind: "bank-example",
          entryId: concept.id,
        };
        add(
          "teacher",
          "question",
          "example",
          concept.example.prompt,
          exampleSource,
          [concept.id],
        );
        add(
          "student1",
          "thinking",
          "example",
          `먼저 배운 기준을 적용해 볼게요. ${plain(concept)}`,
          source,
          [concept.id],
        );
        add(
          "teacher",
          "aha",
          "example",
          exampleAnswerLine(concept.example.answer),
          exampleSource,
          [concept.id],
        );
      }
    }
    lesson = {
      lessonKey: `section:${sectionId}:wrap`,
      lessonTitle: sectionTitle,
    };
    if (authored) {
      const source: ConceptScriptSource = {
        kind: "authored-example",
        key: `${grade}::${authoredKey}`,
      };
      add("teacher", "question", "example", question, source);
      authored.steps.forEach((step, i) =>
        add(
          i % 2 ? "teacher" : "student1",
          i % 2 ? "neutral" : "thinking",
          "example",
          step,
          source,
        ),
      );
      add("student2", "aha", "example", authored.answer, source);
    }

    // False statements stay explicitly framed as mistakes, immediately corrected.
    for (const ox of bank.ox.filter(
      (o) => o.section === section.key && !o.answer,
    )) {
      const source: ConceptScriptSource = { kind: "bank-ox", entryId: ox.id };
      add(
        "student1",
        "question",
        "misconception",
        `혹시 이렇게 생각해도 될까요? “${ox.statement}”`,
        source,
      );
      add(
        "teacher",
        "neutral",
        "correction",
        `그 문장은 옳지 않아. ${ox.why}`,
        source,
      );
    }
    const check = concepts.find((c) => !c.givenCase) ?? concepts[0]!;
    const checkSource: ConceptScriptSource = {
      kind: "bank-concept",
      entryId: check.id,
    };
    add(
      "teacher",
      "question",
      "check-question",
      `마지막 확인! **${check.term}**${grade.startsWith("초") ? "의 뜻이나 방법을 배운 내용으로 설명해 볼래?" : "의 조건과 뜻을 정확히 설명해 볼까?"}`,
      checkSource,
      [check.id],
    );
    add("student2", "aha", "check-answer", plain(check), checkSource, [
      check.id,
    ]);
    return {
      version: 1,
      sectionKey: section.key,
      grade,
      semester: semesterOf(grade, section.chapter),
      chapter: section.chapter,
      title: section.title,
      conceptIds,
      dialogue,
      provenance: {
        bank: "original-concept-blank",
        sourceFiles: [
          `src/lib/concept-blank/bank/${GRADE_FILE_CODES[grade]}.ts`,
          ...(authored ? ["src/lib/textbook/scripts/authoredExamples.ts"] : []),
          ...(pages.length
            ? [
                "인재원_KaTeX_교재조판기_v15/manuscript.json",
                "인재원_KaTeX_교재조판기_v15/content/scripts.py",
                "인재원_KaTeX_교재조판기_v15/content/lessons.py",
              ]
            : []),
        ],
        ...(pages.length
          ? { referenceUnits: [...new Set(pages.map((p) => p.unit))] }
          : {}),
        boards: pages.length
          ? {
              status: "authored-v15",
              count: pages.reduce(
                (n, p) => n + p.blocks.filter((b) => b.kind === "board").length,
                0,
              ),
            }
          : boardConcepts.length
            ? {
                status: "derived-bank",
                count: boardConcepts.length,
                basis: "concept-kind",
                entryIds: boardConcepts.map((c) => c.id),
              }
            : { status: "absent", reason: "no-board-kind-concept" },
      },
    };
  });
}

/** The manuscript as it was before lesson, board, role-mention and semester metadata existed. */
export function withoutPresentationMetadata(
  scripts: readonly ConceptTeachingScript[],
): unknown[] {
  return scripts.map((script) => {
    const prior = structuredClone(script);
    delete prior.semester;
    delete prior.provenance.boards;
    for (const turn of prior.dialogue) {
      delete turn.presentation;
      delete turn.roleMentions;
    }
    return prior;
  });
}

export const serializeScripts = (scripts: unknown) =>
  `${JSON.stringify(scripts, null, 2)}\n`;

const directory = fileURLToPath(new URL(".", import.meta.url));
const committed = (grade: ConceptScriptGrade) =>
  readFileSync(
    resolve(directory, `${GRADE_FILE_CODES[grade]}.json`),
    "utf8",
  ).replace(/\r\n/g, "\n");

function main(flags: readonly string[]) {
  const write = flags.includes("--write");
  const replaceDialogue = flags.includes("--replace-dialogue");
  let failed = false;
  for (const grade of CONCEPT_BLANK_GRADES) {
    const scripts = materializeGrade(grade);
    const next = serializeScripts(scripts);
    const current = committed(grade);
    const dialogueKept =
      serializeScripts(withoutPresentationMetadata(scripts)) ===
      serializeScripts(
        withoutPresentationMetadata(
          JSON.parse(current) as ConceptTeachingScript[],
        ),
      );
    const state =
      next === current
        ? "same"
        : dialogueKept
          ? "metadata differs"
          : "dialogue differs";
    console.log(
      `${grade}: ${scripts.length} sections, ${scripts.reduce((n, s) => n + s.conceptIds.length, 0)} concepts, ${scripts.reduce((n, s) => n + s.dialogue.length, 0)} turns — ${state}`,
    );
    if (next === current) continue;
    if (!write || (!dialogueKept && !replaceDialogue)) {
      failed = true;
      continue;
    }
    writeFileSync(
      resolve(directory, `${GRADE_FILE_CODES[grade]}.json`),
      next,
      "utf8",
    );
    console.log(`${grade}: written`);
  }
  if (failed) {
    console.error(
      write
        ? "Refused: committed dialogue differs from the authoring notes. Nothing was written for those grades."
        : "Committed manuscripts differ from the authoring notes. Nothing was written.",
    );
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main(process.argv.slice(2));
