/**
 * Offline source ledger, never imported by the application. It measures the committed
 * manuscripts against their sources and writes nothing unless asked:
 *   node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/sourceLedger.ts          (check)
 *   node node_modules/tsx/dist/cli.mjs src/lib/textbook/scripts/sourceLedger.ts --write
 * States follow the recovery plan: 자동 확인 (a calculation or a match in code),
 * 미검수 (no person has reviewed it), 수정 필요 (a defect is recorded). Nothing here is
 * 편집 확인: no editor has read these manuscripts, and a model's reading is recorded as such.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import { bank as e3 } from "@/lib/concept-blank/bank/e3";
import { bank as e4 } from "@/lib/concept-blank/bank/e4";
import { bank as e5 } from "@/lib/concept-blank/bank/e5";
import { bank as e6 } from "@/lib/concept-blank/bank/e6";
import { bank as m1 } from "@/lib/concept-blank/bank/m1";
import { bank as m2 } from "@/lib/concept-blank/bank/m2";
import { bank as m3 } from "@/lib/concept-blank/bank/m3";
import { REST_STORIES, planRestStories } from "../restStories";
import {
  AUTHORED_EXAMPLE_FINDINGS,
  reviewAuthoredExamples,
} from "./authoredExampleReview";
import { checkNumericStatements } from "./mathCheck";
import { GRADE_FILE_CODES } from "./materialize";
import reference from "./reference-v15.json";
import {
  TEMPLATE_FRAMES,
  everyTurn,
  frameHasTurn,
  measureTemplateFrames,
  repeatedOpeningQuestions,
} from "./templateReview";
import type {
  ConceptScriptBoardProvenance,
  ConceptScriptGrade,
  ConceptTeachingScript,
} from "./types";

type State = "자동 확인" | "미검수" | "수정 필요" | "해당 없음";
const parts = { 초3: e3, 초4: e4, 초5: e5, 초6: e6, 중1: m1, 중2: m2, 중3: m3 };
const grades = Object.keys(parts) as ConceptScriptGrade[];
const plain = (definition: string) =>
  splitBlankSentence(definition)
    .map((piece) => piece.text)
    .join("");
const directory = fileURLToPath(new URL(".", import.meta.url));
const fileOf = (grade: ConceptScriptGrade) =>
  `src/lib/textbook/scripts/${GRADE_FILE_CODES[grade]}.json`;

export function readCommittedScripts(): ConceptTeachingScript[] {
  return grades.flatMap(
    (grade) =>
      JSON.parse(
        readFileSync(
          resolve(directory, `${GRADE_FILE_CODES[grade]}.json`),
          "utf8",
        ),
      ) as ConceptTeachingScript[],
  );
}

export type SourceLedgerSection = {
  id: string;
  grade: ConceptScriptGrade;
  semester: 1 | 2;
  chapter: string;
  title: string;
  /** Where the manuscript is, and the hash of its dialogue as reviewed. */
  evidence: { file: string; dialogueSha256: string; referenceUnits?: string[] };
  concepts: number;
  lessons: number;
  turns: {
    total: number;
    bankConcept: number;
    bankExample: number;
    bankOx: number;
    authoredExample: number;
    v15: number;
  };
  boards: ConceptScriptBoardProvenance;
  workedExample: "bank-example" | "authored-example";
  /** Matches recalculated here against the bank and the v15 reference: found/expected. */
  matches: {
    definitions: string;
    examples: string;
    corrections: string;
    checkAnswer: string;
    v15Blocks: string;
  };
  status: {
    /** Ids, sources and bank text are kept exactly. */
    idsAndSources: State;
    /** Bank definitions, examples and corrections: their own review record applies, not this ledger. */
    bankMathematics: State;
    /** The newly written lesson example of this section, if it has one. */
    newExample: State;
    /** Grade wording and lesson flow. */
    wordingAndFlow: State;
    /** The printed page. Outside this track. */
    printedPage: State;
  };
  /** Defects that reach particular turns of this section. Frame-wide defects are under templateFrames. */
  findings: { id: string; turns: number }[];
};

export type SourceLedger = {
  generatedBy: string;
  reviewedOn: string;
  reviewers: { calculation: string; reading: string; editor: string };
  totals: Record<string, unknown>;
  sections: SourceLedgerSection[];
  /**
   * The 72 chapters with what exists for a chapter opening: section names and the bank's
   * concept names. No chapter question, key phrase, goal or prerequisite link is stored
   * anywhere in this repository; none is inferred here.
   */
  chapters: {
    grade: ConceptScriptGrade;
    semester: 1 | 2;
    chapter: string;
    sections: { id: string; title: string; conceptTerms: string[] }[];
    concepts: number;
    referenceUnits?: string[];
    unitOpening: {
      sectionNames: "bank";
      conceptTerms: "bank";
      question: "absent";
      keyPhrase: "absent";
      goals: "absent";
      prerequisites: "absent";
    };
  }[];
  authoredExamples: {
    key: string;
    grade: string;
    method: "calculated" | "read-only";
    relationsChecked: number;
    relationsSkipped: number;
    claimsChecked: number;
    faults: string[];
    findings: { kind: string; status: string; finding: string }[];
    state: State;
  }[];
  templateFrames: {
    id: string;
    frame: string;
    origin: string;
    repeatsAsWhole: boolean;
    turns: number;
    grades: Record<string, number>;
    findings: { id: string; turns: number; finding: string }[];
    state: State;
  }[];
  restStories: {
    id: string;
    title: string;
    characters: number;
    relationsChecked: number;
    faults: string[];
    firstTaught: string;
    ageBands: Record<string, { suitable: boolean; basis: string }>;
    state: State;
  }[];
  restShortages: {
    grade: string;
    semester: 1 | 2;
    chapters: number;
    suitableStories: number;
    assigned: number;
    shortage: number;
  }[];
};

export function buildSourceLedger(
  scripts: readonly ConceptTeachingScript[] = readCommittedScripts(),
): SourceLedger {
  const examples = reviewAuthoredExamples();
  const exampleByKey = new Map(examples.map((row) => [row.key, row]));
  const frames = measureTemplateFrames(scripts);
  // Frame-wide defects are listed once, on the frame; a section lists the turns that
  // a narrower defect reaches.
  const frameFinding = TEMPLATE_FRAMES.flatMap((frame) =>
    frame.findings
      .filter((finding) => finding.affects !== everyTurn)
      .map((finding) => ({ frame, finding })),
  );
  // A finding that makes a sentence wrong needs correcting; the others are flow notes.
  const wrongSentence = new Set(["example-answer:predicate"]);

  const sections = scripts.map((script): SourceLedgerSection => {
    const bank = parts[script.grade];
    const concepts = bank.concepts.filter(
      (concept) => concept.section === script.sectionKey,
    );
    const mistakes = bank.ox.filter(
      (item) => item.section === script.sectionKey && !item.answer,
    );
    const count = (kind: string) =>
      script.dialogue.filter((turn) => turn.source.kind === kind).length;
    const definitions = concepts.filter((concept) =>
      script.dialogue.some(
        (turn) =>
          turn.role === "teacher" &&
          turn.purpose === "explanation" &&
          turn.source.kind === "bank-concept" &&
          turn.source.entryId === concept.id &&
          turn.markdown.replace(/\*\*/g, "") ===
            `${concept.term}\n\n${plain(concept.definition)}`,
      ),
    ).length;
    const withExample = concepts.filter((concept) => concept.example);
    const examplesKept = withExample.filter((concept) => {
      const turns = script.dialogue.filter(
        (turn) =>
          turn.source.kind === "bank-example" &&
          turn.source.entryId === concept.id,
      );
      return (
        turns.some((turn) => turn.markdown === concept.example!.prompt) &&
        turns.some((turn) => turn.markdown.includes(concept.example!.answer))
      );
    }).length;
    const corrections = mistakes.filter((item) => {
      const at = script.dialogue.findIndex(
        (turn) =>
          turn.purpose === "misconception" &&
          turn.source.kind === "bank-ox" &&
          turn.source.entryId === item.id,
      );
      return (
        at >= 0 &&
        script.dialogue[at]!.markdown.includes(item.statement) &&
        script.dialogue[at + 1]?.purpose === "correction" &&
        script.dialogue[at + 1]!.markdown.includes(item.why)
      );
    }).length;
    const last = script.dialogue.at(-1)!;
    const checked = concepts.find(
      (concept) =>
        last.source.kind === "bank-concept" &&
        concept.id === last.source.entryId,
    );
    const checkAnswer =
      checked && last.markdown === plain(checked.definition) ? 1 : 0;
    const pages = reference.pages.filter(
      (page) => page.sectionKey === script.sectionKey,
    );
    const blocks = pages.reduce((n, page) => n + page.blocks.length, 0);
    const opener = script.dialogue[0]!.source;
    const example =
      opener.kind === "authored-example"
        ? exampleByKey.get(opener.key)
        : undefined;
    const findings = [
      ...frameFinding.flatMap(({ frame, finding }) => {
        const turns = script.dialogue.filter(
          (turn) => frameHasTurn(frame, turn) && finding.affects(turn),
        ).length;
        return turns ? [{ id: finding.id, turns }] : [];
      }),
      ...(example?.findings ?? []).map((finding) => ({
        id: `authored-example:${finding.kind}`,
        turns: 1,
      })),
    ];
    const matched =
      definitions === concepts.length &&
      examplesKept === withExample.length &&
      corrections === mistakes.length &&
      checkAnswer === 1 &&
      count("v15") === blocks;
    return {
      id: script.sectionKey,
      grade: script.grade,
      semester: script.semester!,
      chapter: script.chapter,
      title: script.title,
      evidence: {
        file: fileOf(script.grade),
        dialogueSha256: createHash("sha256")
          .update(
            JSON.stringify(
              script.dialogue.map((turn) => [
                turn.role,
                turn.markdown,
                turn.source,
              ]),
            ),
            "utf8",
          )
          .digest("hex")
          .slice(0, 16),
        ...(script.provenance.referenceUnits
          ? { referenceUnits: script.provenance.referenceUnits }
          : {}),
      },
      concepts: script.conceptIds.length,
      lessons: new Set(
        script.dialogue.map((turn) => turn.presentation!.lessonKey),
      ).size,
      turns: {
        total: script.dialogue.length,
        bankConcept: count("bank-concept"),
        bankExample: count("bank-example"),
        bankOx: count("bank-ox"),
        authoredExample: count("authored-example"),
        v15: count("v15"),
      },
      boards: script.provenance.boards!,
      workedExample:
        opener.kind === "authored-example"
          ? "authored-example"
          : "bank-example",
      matches: {
        definitions: `${definitions}/${concepts.length}`,
        examples: `${examplesKept}/${withExample.length}`,
        corrections: `${corrections}/${mistakes.length}`,
        checkAnswer: `${checkAnswer}/1`,
        v15Blocks: `${count("v15")}/${blocks}`,
      },
      status: {
        idsAndSources: matched ? "자동 확인" : "수정 필요",
        bankMathematics: "미검수",
        newExample: !example
          ? "해당 없음"
          : example.faults.length
            ? "수정 필요"
            : example.method === "calculated"
              ? "자동 확인"
              : "미검수",
        wordingAndFlow: findings.some(
          (finding) =>
            wrongSentence.has(finding.id) ||
            finding.id === "authored-example:wording",
        )
          ? "수정 필요"
          : "미검수",
        printedPage: "미검수",
      },
      findings,
    };
  });

  const tally = <T extends string>(values: readonly T[]) =>
    values.reduce(
      (out, value) => ({ ...out, [value]: (out[value] ?? 0) + 1 }),
      {} as Record<string, number>,
    );
  const sum = (pick: (section: SourceLedgerSection) => number) =>
    sections.reduce((n, section) => n + pick(section), 0);
  const restShortages = grades.flatMap((grade) =>
    ([1, 2] as const).map((semester) => {
      const units = scripts
        .filter((s) => s.grade === grade && s.semester === semester)
        .map((s) => ({ chapter: s.chapter, section: s.title }));
      const plan = planRestStories({ grade, semester, units });
      return {
        grade,
        semester,
        chapters: plan.assignments.length,
        suitableStories: plan.suitableStoryIds.length,
        assigned: plan.assignments.length - plan.shortageCount,
        shortage: plan.shortageCount,
      };
    }),
  );
  const termOf = new Map(
    grades.flatMap((grade) =>
      parts[grade].concepts.map((concept) => [concept.id, concept.term]),
    ),
  );
  const chapters = scripts
    .filter(
      (script, index) =>
        scripts.findIndex(
          (other) =>
            other.grade === script.grade && other.chapter === script.chapter,
        ) === index,
    )
    .map((first) => {
      const inChapter = scripts.filter(
        (script) =>
          script.grade === first.grade && script.chapter === first.chapter,
      );
      const units = [
        ...new Set(
          inChapter.flatMap((script) => script.provenance.referenceUnits ?? []),
        ),
      ].sort();
      return {
        grade: first.grade,
        semester: first.semester!,
        chapter: first.chapter,
        sections: inChapter.map((script) => ({
          id: script.sectionKey,
          title: script.title,
          conceptTerms: script.conceptIds.map((id) => termOf.get(id)!),
        })),
        concepts: inChapter.reduce((n, s) => n + s.conceptIds.length, 0),
        ...(units.length ? { referenceUnits: units } : {}),
        unitOpening: {
          sectionNames: "bank" as const,
          conceptTerms: "bank" as const,
          question: "absent" as const,
          keyPhrase: "absent" as const,
          goals: "absent" as const,
          prerequisites: "absent" as const,
        },
      };
    });
  return {
    generatedBy: "src/lib/textbook/scripts/sourceLedger.ts",
    reviewedOn: "2026-10-05",
    reviewers: {
      calculation:
        "코드(mathCheck.ts · authoredExampleReview.ts · 이 파일의 일치 계산)",
      reading: "Claude Opus 5.5 — 모델의 정독. 편집 검수가 아니다",
      editor: "없음 — 사람이 읽은 기록이 없다",
    },
    totals: {
      chapters: chapters.length,
      sections: sections.length,
      concepts: sum((s) => s.concepts),
      lessons: sum((s) => s.lessons),
      turns: {
        total: sum((s) => s.turns.total),
        bankConcept: sum((s) => s.turns.bankConcept),
        bankExample: sum((s) => s.turns.bankExample),
        bankOx: sum((s) => s.turns.bankOx),
        authoredExample: sum((s) => s.turns.authoredExample),
        v15: sum((s) => s.turns.v15),
      },
      semesters: grades.flatMap((grade) =>
        ([1, 2] as const).map((semester) => ({
          grade,
          semester,
          sections: sections.filter(
            (s) => s.grade === grade && s.semester === semester,
          ).length,
          concepts: sections
            .filter((s) => s.grade === grade && s.semester === semester)
            .reduce((n, s) => n + s.concepts, 0),
        })),
      ),
      boards: {
        sections: tally(sections.map((s) => s.boards.status)),
        turns: {
          v15: sections
            .filter((s) => s.boards.status === "authored-v15")
            .reduce((n, s) => n + (s.boards as { count: number }).count, 0),
          derived: sections
            .filter((s) => s.boards.status === "derived-bank")
            .reduce((n, s) => n + (s.boards as { count: number }).count, 0),
        },
      },
      workedExample: tally(sections.map((s) => s.workedExample)),
      status: {
        idsAndSources: tally(sections.map((s) => s.status.idsAndSources)),
        bankMathematics: tally(sections.map((s) => s.status.bankMathematics)),
        newExample: tally(sections.map((s) => s.status.newExample)),
        wordingAndFlow: tally(sections.map((s) => s.status.wordingAndFlow)),
        printedPage: tally(sections.map((s) => s.status.printedPage)),
      },
      authoredExamples: {
        total: examples.length,
        byGrade: tally(examples.map((row) => row.grade)),
        method: tally(examples.map((row) => row.method)),
        relationsChecked: examples.reduce((n, r) => n + r.relationsChecked, 0),
        relationsSkipped: examples.reduce((n, r) => n + r.relationsSkipped, 0),
        claimsChecked: examples.reduce((n, r) => n + r.claimsChecked, 0),
        faults: examples.reduce((n, r) => n + r.faults.length, 0),
        findings: tally(
          AUTHORED_EXAMPLE_FINDINGS.map((f) => `${f.kind}:${f.status}`),
        ),
      },
      templateFrames: {
        frames: frames.length,
        repeatingAsWhole: TEMPLATE_FRAMES.filter((f) => f.repeatsAsWhole)
          .length,
        turnsRepeatingAsWhole: frames
          .filter(
            (m) => TEMPLATE_FRAMES.find((f) => f.id === m.id)!.repeatsAsWhole,
          )
          .reduce((n, m) => n + m.turns, 0),
        turnsAll: frames.reduce((n, m) => n + m.turns, 0),
        lessonsRepeatingTheirOpeningQuestion: repeatedOpeningQuestions(scripts),
      },
      rest: {
        stories: REST_STORIES.length,
        chapters: restShortages.reduce((n, r) => n + r.chapters, 0),
        shortage: restShortages.reduce((n, r) => n + r.shortage, 0),
      },
    },
    sections,
    chapters,
    authoredExamples: examples.map((row) => ({
      key: row.key,
      grade: row.grade,
      method: row.method,
      relationsChecked: row.relationsChecked,
      relationsSkipped: row.relationsSkipped,
      claimsChecked: row.claimsChecked,
      faults: row.faults,
      findings: row.findings.map(({ kind, status, finding }) => ({
        kind,
        status,
        finding,
      })),
      state: row.faults.length
        ? "수정 필요"
        : row.findings.some((f) => f.kind === "wording" && f.status === "open")
          ? "수정 필요"
          : row.method === "calculated"
            ? "자동 확인"
            : "미검수",
    })),
    templateFrames: frames.map((measure) => {
      const frame = TEMPLATE_FRAMES.find((f) => f.id === measure.id)!;
      const findings = measure.findings.map((found) => ({
        ...found,
        finding: frame.findings.find((f) => f.id === found.id)!.finding,
      }));
      return {
        id: frame.id,
        frame: frame.frame,
        origin: frame.origin,
        repeatsAsWhole: frame.repeatsAsWhole,
        turns: measure.turns,
        grades: measure.grades,
        findings,
        state: findings.some((f) => f.turns) ? "수정 필요" : "미검수",
      };
    }),
    restStories: REST_STORIES.map((story) => {
      const text = `${story.markdown}\n${story.reflectionQuestions.join("\n")}`;
      const relations = checkNumericStatements(text);
      return {
        id: story.id,
        title: story.title,
        characters: story.markdown.length,
        relationsChecked: relations.checked.length,
        faults: relations.faults,
        firstTaught: `${story.firstTaught.grade} ${story.firstTaught.semester}학기 ${story.firstTaught.chapter}`,
        ageBands: story.ageBands,
        state: relations.faults.length ? "수정 필요" : "미검수",
      };
    }),
    restShortages,
  };
}

export const serializeLedger = (ledger: SourceLedger) =>
  `${JSON.stringify(ledger, null, 2)}\n`;

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const path = resolve(directory, "source-ledger.json");
  const next = serializeLedger(buildSourceLedger());
  let current = "";
  try {
    current = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch {
    current = "";
  }
  if (next === current) console.log("source-ledger.json: same");
  else if (process.argv.includes("--write")) {
    writeFileSync(path, next, "utf8");
    console.log("source-ledger.json: written");
  } else {
    console.error(
      "source-ledger.json differs from the manuscripts. Nothing was written.",
    );
    process.exitCode = 1;
  }
}
