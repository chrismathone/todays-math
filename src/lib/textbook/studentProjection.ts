import "server-only";
import { splitBlankSentence } from "@/contracts/conceptBlank.contract";
import { clozeSentence, termPrompt } from "@/lib/concept-blank/questions";
import type {
  TextbookConcept,
  TextbookConceptAttempt,
  TextbookFrozenEntry,
} from "@/contracts/textbookConcept.contract";
import {
  textbookStudentAttemptSchema,
  textbookStudentConceptSchema,
  type TextbookStudentBlank,
  type TextbookStudentConcept,
} from "@/contracts/textbookStudent.contract";

/** Permission and content hash verification precede this projection. Never import a live bank here. */
export function studentConceptOf(
  editionId: string,
  concept: TextbookConcept,
  reviewAccess: TextbookStudentConcept["reviewAccess"],
): TextbookStudentConcept {
  const frozen = concept.frozen;
  if (!frozen) throw new Error("발행 시 고정한 개념 내용이 없습니다.");
  const entries = new Map<string, TextbookFrozenEntry>();
  for (const entry of frozen.entries) {
    const key = `${entry.entryKind}:${entry.payload.id}`;
    if (entries.has(key))
      throw new Error("고정 개념 항목 ID가 중복되었습니다.");
    entries.set(key, entry);
  }
  const forms = new Map<string, TextbookStudentBlank>();
  const paperForms = new Set<"map" | "figure">();
  const recallSections = new Set<string>();
  for (const pick of frozen.selection) {
    const entry = entries.get(`${pick.entryKind}:${pick.entryId}`);
    if (
      !entry ||
      entry.payload.section !== pick.blankSectionKey ||
      entry.payload.level !== pick.level
    )
      throw new Error("고정된 백지 선택과 항목이 일치하지 않습니다.");
    if (pick.form === "figure" || pick.form === "map") {
      paperForms.add(pick.form);
      continue;
    }
    let sheet = forms.get(pick.form);
    if (!sheet) {
      sheet = { form: pick.form, prompts: [] };
      forms.set(pick.form, sheet);
    }
    if (pick.form === "recall") {
      if (entry.entryKind !== "concept" || entry.payload.givenCase)
        throw new Error("완전 백지에 맞지 않는 고정 항목입니다.");
      if (recallSections.has(pick.blankSectionKey)) continue;
      const section = frozen.sections.find(
        (row) => row.blankSectionKey === pick.blankSectionKey,
      );
      if (!section) throw new Error("고정한 백지 소단원 이름이 없습니다.");
      recallSections.add(pick.blankSectionKey);
      sheet.prompts.push({
        id: pick.entryId,
        label: section.title,
        pieces: [{ kind: "blank", index: 0 }],
      });
    } else if (pick.form === "term") {
      if (entry.entryKind !== "concept" && entry.entryKind !== "ox")
        throw new Error("용어 백지에 맞지 않는 고정 항목입니다.");
      const question =
        entry.entryKind === "concept"
          ? termPrompt(entry.payload)
          : entry.payload.statement;
      const hasQuestion =
        entry.entryKind === "concept" && Boolean(entry.payload.bQuestion);
      sheet.prompts.push({
        id: pick.entryId,
        label: hasQuestion ? `문항 ${sheet.prompts.length + 1}` : question,
        pieces: [
          ...(hasQuestion ? [{ kind: "text" as const, text: question }] : []),
          ...(entry.entryKind === "ox"
            ? [
                {
                  kind: "text" as const,
                  text: "○ 또는 ×를 쓰고, 그 이유를 설명하세요. ",
                },
              ]
            : []),
          { kind: "blank", index: 0 },
        ],
      });
    } else if (entry.entryKind === "concept") {
      let blankIndex = 0;
      const pieces: TextbookStudentBlank["prompts"][number]["pieces"] =
        splitBlankSentence(clozeSentence(entry.payload)).map((piece) =>
          piece.kind === "text"
            ? { kind: "text", text: piece.text }
            : { kind: "blank", index: blankIndex++ },
        );
      sheet.prompts.push({
        id: pick.entryId,
        label: entry.payload.clozeQuestion
          ? `문항 ${sheet.prompts.length + 1}`
          : entry.payload.term,
        pieces,
      });
    } else if (entry.entryKind === "apply") {
      sheet.prompts.push({
        id: pick.entryId,
        label: entry.payload.prompt,
        pieces: [
          { kind: "text", text: "결론과 그 이유를 설명하세요. " },
          { kind: "blank", index: 0 },
        ],
      });
    } else {
      throw new Error("문장 백지에 맞지 않는 고정 항목입니다.");
    }
  }
  return textbookStudentConceptSchema.parse({
    editionId,
    conceptKey: concept.conceptKey,
    title: concept.title,
    frozenHash: frozen.contentHash,
    blanks: [...forms.values()],
    paperForms: [...paperForms],
    reviewAccess,
  });
}

export function studentAttemptOf(attempt: TextbookConceptAttempt) {
  return textbookStudentAttemptSchema.parse({
    attemptId: attempt.attemptId,
    form: attempt.form,
    channel: attempt.channel,
    response: attempt.channel === "student-text" ? attempt.response : null,
    submittedAt: attempt.submittedAt,
    reviewStatus: attempt.reviewStatus,
  });
}
