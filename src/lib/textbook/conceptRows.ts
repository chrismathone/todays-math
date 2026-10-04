import {
  splitBlankSentence,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { TextbookSemanticRow } from "@/contracts/textbookSemantic.contract";

export function definitionText(entry: ConceptEntry): string {
  return splitBlankSentence(entry.definition)
    .map((piece) => piece.text)
    .join("");
}

/** One immutable master list, shared by all three memory phases. */
export function conceptMemoryRows(
  entries: readonly ConceptEntry[],
): TextbookSemanticRow[] {
  return entries.map((entry) => ({
    rowKey: `${entry.id}.definition`,
    label: entry.term,
    rawText: entry.definition,
    textFormat: "bank-blank",
  }));
}

export function memoryRowMarkdown(
  row: TextbookSemanticRow,
  phase: "study" | "keywords" | "sentences",
): string {
  const pieces =
    row.textFormat === "bank-blank"
      ? splitBlankSentence(row.rawText)
      : [{ kind: "text", text: row.rawText }];
  const plain = pieces.map((piece) => piece.text).join("");
  if (phase === "sentences") return `**${row.label}**\n\n{{${plain}}}`;
  if (phase === "keywords")
    return `**${row.label}**\n\n${pieces.map((piece) => (piece.kind === "key" ? `[[${piece.text}]]` : piece.text)).join("")}`;
  return `**${row.label}**\n\n${plain}`;
}

const definitionLabels: Record<string, string> = {
  정의: "뜻",
  개념: "뜻",
  성질: "성질",
  방법: "방법",
  공식: "공식",
  법칙: "법칙",
  정리: "정리",
  단위: "단위",
  기호: "기호",
  용어: "뜻",
};

/** Recover the original card boundary from a frozen automatic draft without rewriting it. */
export function frozenConceptGroups(concept: TextbookConcept) {
  if (!concept.mappingVersion.startsWith("quick-create.unit-triple."))
    return [];
  const entries =
    concept.frozen?.entries.flatMap((entry) =>
      entry.entryKind === "concept" ? [entry.payload] : [],
    ) ?? [];
  // An edited definition remains authoritative; do not replace a teacher's edits with bank text.
  if (
    !entries.length ||
    concept.body.definition !== entries.map(definitionText).join("\n\n")
  )
    return [];
  return entries.map((entry) => ({
    conceptId: entry.id,
    title: entry.term,
    rows: [
      {
        rowKey: `${entry.id}.definition`,
        label: definitionLabels[entry.kind] ?? entry.kind,
        rawText: definitionText(entry),
        textFormat: "markdown" as const,
      },
      ...(entry.example
        ? [
            {
              rowKey: `${entry.id}.example`,
              label: "예",
              rawText: `${entry.example.prompt}\n\n${entry.example.answer}`,
              textFormat: "markdown" as const,
            },
          ]
        : []),
    ],
    body: {
      ...concept.body,
      goal: "",
      prerequisites: [],
      definition: definitionText(entry),
      conditions: null,
      examples: entry.example
        ? [`${entry.example.prompt}\n\n${entry.example.answer}`]
        : [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
  }));
}
