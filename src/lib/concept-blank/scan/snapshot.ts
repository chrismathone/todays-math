import "server-only";
import { createHash } from "node:crypto";
import {
  blankKeywords,
  conceptBlankSelectionSchema,
  splitBlankSentence,
  type ConceptBlankBank,
  type ConceptBlankSelection,
  type ConceptEntry,
} from "@/contracts/conceptBlank.contract";
import {
  scanSnapshotSchema,
  type ScanPage,
  type ScanSnapshot,
  type ScanTarget,
} from "@/contracts/conceptBlankScan.contract";
import {
  planSheet,
  sheetHasContent,
  SHEET_CODE_LINE_CAPACITY,
} from "@/components/concept-blank/paper/paginate";
import { composeSheets } from "../compose";
import { encodeSheetCode } from "../sheetCode";
import { clozeSentence, termAnswer, termPrompt } from "../questions";
import { termIsKeyword } from "../audit";

const plain = (s: string) =>
  splitBlankSentence(s)
    .map((p) => p.text)
    .join("");
const ideas = (answers: string[]): ScanTarget["requiredIdeas"] =>
  answers.map((s) => ({ anyOf: [s] }));
function conceptIdeas(entry: ConceptEntry, question: boolean) {
  if (question && entry.bQuestion) return entry.bQuestion.requiredIdeas;
  // Printed term alone is not a definition (26 §10); retain the complete meaning.
  return ideas(
    termIsKeyword(entry.term, entry.definition)
      ? [plain(entry.definition)]
      : blankKeywords(entry.definition),
  );
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b, "en"))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

/** Pure print-time capture. Same composition/pagination as ConceptBlankPaper; no bank loading or writes. */
export function createScanSnapshot(
  selectionInput: ConceptBlankSelection,
  bank: ConceptBlankBank,
): ScanSnapshot {
  const selection = conceptBlankSelectionSchema.parse(selectionInput);
  const sheets = composeSheets(selection, bank).filter(sheetHasContent);
  const pages: ScanPage[] = [];
  for (const sheet of sheets) {
    for (const printed of planSheet(sheet).student) {
      const page: ScanPage = {
        number: pages.length + 1,
        form: printed.form,
        questions: [],
        slots: [],
        targets: [],
      };
      const question = (n: number, sourceId: string, prompt: string) => {
        const id = `p${page.number}.q${n}`;
        page.questions.push({ id, number: n, sourceId, prompt });
        return id;
      };
      const slot = (
        q: string,
        suffix: string,
        kind: ScanPage["slots"][number]["kind"],
        label: string,
      ) => {
        const id = `${q}.${suffix}`;
        page.slots.push({ id, questionId: q, kind, label });
        return id;
      };
      const target = (
        q: string,
        suffix: string,
        kind: ScanTarget["kind"],
        slots: string[],
        answer: string,
        requiredIdeas = ideas([plain(answer)]),
        manualReviewReason?: string,
      ) => {
        page.targets.push({
          id: `${q}.grade-${suffix}`,
          questionId: q,
          kind,
          slotIds: slots,
          referenceAnswer: plain(answer),
          requiredIdeas,
          ...(manualReviewReason ? { manualReviewReason } : {}),
        });
      };
      const concept = (
        n: number,
        entry: ConceptEntry,
        questionMode: boolean,
      ) => {
        const q = question(
          n,
          entry.id,
          questionMode ? termPrompt(entry) : entry.term,
        );
        const answer = slot(
          q,
          "answer",
          questionMode ? "answer" : "meaning",
          questionMode ? "답 줄 전체" : "뜻 칸 전체",
        );
        target(
          q,
          "answer",
          "concept",
          [answer],
          questionMode ? termAnswer(entry) : entry.definition,
          conceptIdeas(entry, questionMode),
          printed.form === "map" && !questionMode
            ? "옛 뜻·예 지도는 교사가 확인해야 합니다."
            : undefined,
        );
        return q;
      };
      switch (printed.form) {
        case "recall":
          if (sheet.form !== "recall")
            throw new Error("지면 형식이 맞지 않습니다.");
          for (const { n, zone } of printed.zones) {
            const q = question(n, zone.section, zone.title);
            const answer = slot(
              q,
              "region",
              "recall",
              "떠올린 뜻을 적는 영역 전체",
            );
            // The side drawing/example is supplementary evidence, not a separate graded answer.
            for (const entry of sheet.key.filter(
              (c) => c.section === zone.section,
            ))
              target(
                q,
                entry.id,
                "concept",
                [answer],
                entry.definition,
                conceptIdeas(entry, false),
                "A 자유 서술·그림과 개념별 기준의 대응은 교사가 확인해야 합니다.",
              );
          }
          break;
        case "term":
          for (const b of printed.blocks) {
            if (b.kind === "term") concept(b.n, b.entry, true);
            else {
              const q = question(b.n, b.item.id, b.item.statement);
              const slots = [
                slot(q, "mark", "ox-mark", "○× 표시"),
                slot(q, "reason", "ox-reason", "까닭 줄 전체"),
              ];
              const mark = b.item.answer ? "○" : "×";
              target(
                q,
                "ox",
                "ox",
                slots,
                `${mark} · ${b.item.why}`,
                ideas([mark, b.item.why]),
              );
            }
          }
          break;
        case "cloze":
          for (const b of printed.blocks) {
            if (b.kind === "sentence") {
              const sentence = clozeSentence(b.entry);
              const q = question(
                b.n,
                b.entry.id,
                splitBlankSentence(sentence)
                  .map((p) => (p.kind === "key" ? "□" : p.text))
                  .join(""),
              );
              blankKeywords(sentence).forEach((answer, i) => {
                const s = slot(
                  q,
                  `b${i + 1}`,
                  "cloze",
                  `왼쪽→오른쪽/위→아래 빈칸 ${i + 1}`,
                );
                target(q, `b${i + 1}`, "cloze", [s], answer, [
                  {
                    anyOf: b.entry.clozeQuestion?.acceptedAnswers[i] ?? [
                      answer,
                    ],
                  },
                ]);
              });
            } else {
              const q = question(b.n, b.item.id, b.item.prompt);
              target(
                q,
                "answer",
                "apply",
                [slot(q, "answer", "answer", "최종 답 줄 전체")],
                b.item.answer,
              );
            }
          }
          break;
        case "map":
          printed.map.nodes.forEach((entry, i) => {
            const q = concept(
              (printed.nodeStart ?? 1) + i,
              entry,
              !!printed.questionMode,
            );
            if (!printed.questionMode) {
              const s = slot(
                q,
                "example",
                "example",
                entry.example?.prompt ?? "예 칸 전체",
              );
              target(
                q,
                "example",
                "example",
                [s],
                entry.example?.answer ??
                  `다음 뜻에 맞는 예: ${plain(entry.definition)}`,
                undefined,
                "옛 뜻·예 지도는 교사가 확인해야 합니다.",
              );
            }
          });
          break;
        case "figure":
          for (const { n, figure } of printed.cards) {
            const q = question(n, figure.id, figure.prompt);
            page.questions[page.questions.length - 1]!.figure =
              structuredClone(figure);
            figure.tags.forEach((tag, i) =>
              target(
                q,
                `tag${i + 1}`,
                "figure",
                [
                  slot(
                    q,
                    `tag${i + 1}`,
                    "figure-tag",
                    `그림 이름표 ${i + 1} (x=${tag.x}, y=${tag.y}, viewBox=${figure.viewBox})`,
                  ),
                ],
                tag.answer,
              ),
            );
            figure.lines.forEach((line, i) =>
              target(
                q,
                `line${i + 1}`,
                "figure",
                [slot(q, `line${i + 1}`, "figure-line", line.label)],
                line.answer,
              ),
            );
          }
          break;
      }
      pages.push(page);
    }
  }
  const code = selection.pick ? null : encodeSheetCode(selection, bank);
  return scanSnapshotSchema.parse({
    version: 1,
    selection,
    sheetCode:
      code && code.replace(/\./g, "").length <= SHEET_CODE_LINE_CAPACITY
        ? code
        : null,
    bankFingerprint: `sha256:${createHash("sha256")
      .update(stable(sheets.map((sheet) => ({ ...sheet, header: undefined }))))
      .digest("hex")}`,
    pageCount: pages.length,
    pages,
  });
}

/** Explicit allowlist: never spread a private question/figure/target into a student response. */
export function toStudentScanSnapshot(input: ScanSnapshot) {
  const snapshot = scanSnapshotSchema.parse(input);
  return {
    version: snapshot.version,
    sheetCode: snapshot.sheetCode,
    pageCount: snapshot.pageCount,
    pages: snapshot.pages.map((p) => ({
      number: p.number,
      form: p.form,
      questions: p.questions.map((q) => ({
        id: q.id,
        number: q.number,
        prompt: q.prompt,
      })),
      slots: p.slots.map((s) => ({
        id: s.id,
        questionId: s.questionId,
        kind: s.kind,
        label: s.label,
      })),
    })),
  };
}
