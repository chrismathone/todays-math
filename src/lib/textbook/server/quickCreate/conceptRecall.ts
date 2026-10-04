import "server-only";
import { randomUUID } from "node:crypto";
import type { ConceptEntry } from "@/contracts/conceptBlank.contract";
import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import type { QuickCreateComponents } from "@/contracts/textbookQuickCreate.contract";
import { sectionTitleTex } from "@/lib/concept-blank/sections";
import type { TextbookActor } from "../../access";
import { freezeTextbookConcept } from "../../concepts";
import { canonicalHash } from "../../hash.server";
import { invalid } from "../errors";
import { QUICK_CREATE_CORE_MAPPING_VERSION } from "../../coreConceptBank";
import {
  additionalConceptActivities,
  memoryActivityBlocks,
} from "../quickCreateRecovery";
import {
  keyOf,
  plainDefinition,
  type QuickCreateAssembly,
  type QuickCreateLesson,
  type UnitRow,
} from "./context";

/** Any of these needs the section's frozen concept row, even when no concept block is printed. */
export const wantsConceptFamily = (components: QuickCreateComponents) =>
  components.concepts ||
  components.termRecall ||
  components.clozeRecall ||
  components.sentenceRecall ||
  components.errorCheck ||
  components.conceptStudy ||
  components.dialogueCheck ||
  components.conceptBlankTest ||
  components.explainActivity ||
  components.conceptMap;
function conceptFor(
  unit: UnitRow,
  unitKey: string,
  sectionKey: string,
  entries: ConceptEntry[],
  actor: TextbookActor,
  now: string,
  forms: TextbookConcept["blankForms"],
) {
  const concept = textbookConceptSchema.parse({
    conceptKey: `concept-${unit.id}`,
    unitKey,
    sectionKey,
    title: unit.section,
    kind: entries[0].kind,
    unitId: unit.id,
    body: {
      goal: `${sectionTitleTex(unit.section)}의 뜻과 적용 방법을 설명할 수 있습니다.`,
      prerequisites: [],
      definition: entries
        .map(plainDefinition)
        .join("\n\n"),
      conditions: null,
      examples: entries.flatMap((entry) =>
        entry.example
          ? [`${entry.example.prompt} → ${entry.example.answer}`]
          : [],
      ),
      counterexamples: [],
      misconceptions: [],
      explainPrompt: "배운 개념을 자신의 말로 설명해 보세요.",
    },
    blankItems: entries.map((entry) => ({
      blankSectionKey: keyOf(unit),
      entryKind: "concept",
      entryId: entry.id,
      review: {
        status: "confirmed",
        candidateRule: "unit-triple",
        reviewedBy: actor.id,
        reviewedAt: now,
        targetHash: canonicalHash(entry),
      },
    })),
    blankForms: forms,
    links: [],
    mappingVersion: QUICK_CREATE_CORE_MAPPING_VERSION,
    derivedFromConceptKey: null,
    frozen: null,
  });
  return freezeTextbookConcept(concept);
}

export function appendConceptAndRecall(
  ctx: QuickCreateAssembly,
  lesson: QuickCreateLesson,
): void {
  const { components, actor, now, concepts, unitKey } = ctx;
  const { unit, section, entries } = lesson;
  if (!wantsConceptFamily(components)) return;
  if (!entries.length)
    throw invalid(`${unit.section}: 준비된 개념 설명이 없습니다.`);
  const forms: NonNullable<TextbookConcept["blankForms"]> = [];
  if (components.termRecall) forms.push("term");
  if (components.clozeRecall) forms.push("cloze");
  if (!forms.length) forms.push("term");
  const concept = conceptFor(
    unit,
    unitKey,
    section.sectionKey,
    entries,
    actor,
    now,
    forms,
  );
  concepts.push(concept);
  if (components.concepts)
    section.blocks.push({
      blockId: randomUUID(),
      kind: "concept",
      conceptKey: concept.conceptKey,
      semantic: { activity: "concepts", title: "개념 이해" },
    });
  const recall = (
    title: string,
    phase: "keywords" | "sentences",
    markdown: string,
  ) =>
    section.blocks.push({
      blockId: randomUUID(),
      kind: "concept-recall",
      phase,
      markdown,
      showRepetitionChecks: false,
      conceptKey: concept.conceptKey,
      semantic: { activity: "termRecall", title },
    });
  if (components.termRecall)
    recall(
      "용어 백지",
      "keywords",
      entries
        .map((entry) => `[[${entry.term}]]: ${plainDefinition(entry)}`)
        .join("\n\n"),
    );
  section.blocks.push(
    ...memoryActivityBlocks({
      entries,
      conceptKey: concept.conceptKey,
      components,
    }),
  );
  section.blocks.push(
    ...additionalConceptActivities({
      entries,
      sectionKey: keyOf(unit),
      conceptKey: concept.conceptKey,
      components,
    }),
  );
}
