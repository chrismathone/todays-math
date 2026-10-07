/** One normalization path for visible-question review and eventual application.
 * This module does not grant editorial approval or change the production bank.
 */
import { createHash } from "node:crypto";
import {
  blankKeywords,
  conceptEntrySchema,
  type ConceptEntry,
  type ConceptQuestion,
  type ConceptClozeQuestion,
} from "@/contracts/conceptBlank.contract";
import { QUESTION_REVISION } from "@/lib/concept-blank/questions";

export type ProposalRecord = Record<string, unknown> & { id: string };
export type NormalizedProposal = {
  id: string;
  grade: string;
  source: ConceptEntry;
  B: ConceptQuestion | { excluded: string };
  C: ConceptClozeQuestion | { excluded: string };
  goal: unknown;
  coreAfter: unknown;
  coreReason: unknown;
  hash: string;
};

export const contentHash = (value: unknown): string =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const record = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

function alternatives(value: unknown, id: string): string[][] {
  if (!Array.isArray(value)) throw new Error(`${id}: 인정 답 배열이 없습니다.`);
  return value.map((group: unknown) => {
    // Older draft files use { anyOf }, while assembled C uses string[].
    const items = Array.isArray(group) ? group : record(group)?.anyOf;
    if (
      !Array.isArray(items) ||
      !items.every((item) => typeof item === "string")
    )
      throw new Error(`${id}: 인정 답의 형식을 확인해야 합니다.`);
    return items as string[];
  });
}

const nonempty = (...values: unknown[]): string => {
  const value = values.find((item) => typeof item === "string" && item.trim());
  return typeof value === "string" ? value : "";
};

/** null means incomplete authoring, never an implicit keep or approval. */
export function normalizeProposal(
  row: ProposalRecord,
  original: ConceptEntry,
): NormalizedProposal | null {
  if (row.id !== original.id) throw new Error(`원천 ID 불일치: ${row.id}`);
  if (!row.bDecision || !row.cDecision) return null;
  const decisions = new Set(["keep", "rewrite", "revise", "exclude"]);
  if (
    ![row.bDecision, row.cDecision].every(
      (value) => typeof value === "string" && decisions.has(value),
    )
  )
    throw new Error(`${row.id}: 알 수 없는 형식 결정입니다.`);
  const excludedB = row.bDecision === "exclude";
  const excludedC = row.cDecision === "exclude";
  const assembledB = record(row.bQuestion);
  const assembledC = record(row.clozeQuestion);
  const exclusions = record(row.questionExclusions);
  if (!excludedB && row.bQuestion === null)
    throw new Error(`${row.id}: B 결정과 질문의 null이 다릅니다.`);
  if (!excludedC && row.clozeQuestion === null)
    throw new Error(`${row.id}: C 결정과 질문의 null이 다릅니다.`);
  const ideas = assembledB?.requiredIdeas ?? row.bRequiredIdeas;
  const prompt = assembledB?.prompt ?? row.bPrompt;
  const answer = assembledB?.answer ?? row.bAnswer;
  if (
    !excludedB &&
    (!prompt || !answer || !Array.isArray(ideas) || !ideas.length)
  )
    return null;
  const sentence = excludedC
    ? null
    : (assembledC?.sentence ??
      (row.cDecision === "keep" ? original.definition : row.cAfter));
  if (!excludedC && !sentence) return null;
  if (sentence !== null && typeof sentence !== "string")
    throw new Error(`${row.id}: C 문장이 문자열이 아닙니다.`);
  const recordedEquivalents = row.cSlotEquivalents;
  const fallbackAnswers = sentence
    ? blankKeywords(sentence).map((key, index) => {
        const group = Array.isArray(recordedEquivalents)
          ? recordedEquivalents[index]
          : undefined;
        if (
          group !== undefined &&
          (!Array.isArray(group) ||
            !group.every((item) => typeof item === "string"))
        )
          throw new Error(
            `${row.id}: 기록한 동치 답의 형식을 확인해야 합니다.`,
          );
        return [...new Set([key, ...(Array.isArray(group) ? group : [])])];
      })
    : [];
  const rawAccepted =
    assembledC?.acceptedAnswers ??
    row.cAcceptedAnswers ??
    row.acceptedAnswers ??
    fallbackAnswers;
  const questionExclusions = {
    ...(excludedB
      ? { term: nonempty(exclusions?.term, row.bReason, row.exclusionReason) }
      : {}),
    ...(excludedC
      ? { cloze: nonempty(exclusions?.cloze, row.cReason, row.exclusionReason) }
      : {}),
  };
  const parsed = conceptEntrySchema.parse({
    ...original,
    definition: row.coreAfter ?? original.definition,
    questionRevision: QUESTION_REVISION,
    bQuestion: excludedB
      ? null
      : {
          prompt,
          answer,
          requiredIdeas: (ideas as unknown[]).map((idea) =>
            typeof idea === "string" ? { anyOf: [idea] } : idea,
          ),
        },
    clozeQuestion: excludedC
      ? null
      : { sentence, acceptedAnswers: alternatives(rawAccepted, row.id) },
    ...(excludedB || excludedC ? { questionExclusions } : {}),
  });
  const normalized = {
    id: row.id,
    grade: original.section.split("::")[0]!,
    // Keep the immutable original exactly as supplied to the reviewer.
    source: original,
    B: parsed.bQuestion ?? { excluded: questionExclusions.term! },
    C: parsed.clozeQuestion ?? { excluded: questionExclusions.cloze! },
    goal: row.bGoal ?? row.learningRole ?? null,
    coreAfter: row.coreAfter ?? null,
    coreReason: row.coreReason ?? null,
  };
  return { ...normalized, hash: contentHash(normalized) };
}

/** Produces a candidate entry only. Callers must independently enforce release gates. */
export function proposedEntry(proposal: NormalizedProposal): ConceptEntry {
  const excludedB = "excluded" in proposal.B;
  const excludedC = "excluded" in proposal.C;
  return conceptEntrySchema.parse({
    ...proposal.source,
    definition: proposal.coreAfter ?? proposal.source.definition,
    questionRevision: QUESTION_REVISION,
    bQuestion: excludedB ? null : proposal.B,
    clozeQuestion: excludedC ? null : proposal.C,
    ...(excludedB || excludedC
      ? {
          questionExclusions: {
            ...("excluded" in proposal.B ? { term: proposal.B.excluded } : {}),
            ...("excluded" in proposal.C ? { cloze: proposal.C.excluded } : {}),
          },
        }
      : {}),
  });
}

/** Parse report arrays without treating a legacy partial report as the canonical input. */
export function proposalRows(data: unknown): ProposalRecord[] {
  const report = record(data);
  const rows = report?.proposedRows ?? report?.rows ?? report?.proposals;
  if (!Array.isArray(rows)) throw new Error("문항 제안 배열이 없습니다.");
  return rows.map((row) => {
    const item = record(row);
    if (!item || typeof item.id !== "string")
      throw new Error("문항 제안에 ID가 없습니다.");
    return item as ProposalRecord;
  });
}
