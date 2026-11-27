import "server-only";
import { randomUUID } from "node:crypto";
import {
  scanMarkupActionSchema,
  type ScanMarkupAction,
  type ScanMarkupEntry,
  type ScanMarkupTarget,
} from "@/contracts/conceptBlankScanMarkup.contract";
import { scanDatabaseError, type ScanDatabase, type ScanSql } from "./database";
import { ScanAccessError, type ScanIdentity } from "./issuance";
import { validateScanMarkupNotes } from "./markup";
import { loadScanSubmission, scanEvidence, scanPublished } from "./submission";

type MarkupEvent = {
  id: string;
  grade_id: string;
  photo_id: string;
  sequence: number;
  action: "snapshot" | "edit" | "remove" | "publish";
  notes: ScanMarkupEntry[];
  removed_note_id: string | null;
  teacher_id: string | null;
};

async function markupEvents(tx: ScanSql, id: string) {
  return tx.query<MarkupEvent>(
    `SELECT id,grade_id,photo_id,sequence,action,notes,removed_note_id,teacher_id
     FROM concept_blank_scan_markup WHERE submission_id=$1::uuid ORDER BY sequence`,
    [id],
  );
}

export async function saveScanMarkupSnapshot(
  tx: ScanSql,
  input: {
    submissionId: string;
    gradeId: string;
    photoId: string;
    notes: ScanMarkupEntry["note"][];
    failed: boolean;
    promptVersion: string | null;
    model: string | null;
  },
) {
  await tx.query(
    `INSERT INTO concept_blank_scan_markup
     (id,submission_id,grade_id,photo_id,sequence,action,status,notes,prompt_version,requested_model)
     VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,1,'snapshot',$5::text,$6::jsonb,$7::text,$8::text)`,
    [
      randomUUID(),
      input.submissionId,
      input.gradeId,
      input.photoId,
      input.notes.length ? "ready" : input.failed ? "failed" : "empty",
      JSON.stringify(input.notes.map((note) => ({ id: randomUUID(), note }))),
      input.promptVersion,
      input.model,
    ],
  );
}

async function markupContext(actor: ScanIdentity, id: string, tx: ScanSql) {
  const { row, issue } = await loadScanSubmission(actor, id, tx, true);
  const events = await markupEvents(tx, id);
  const evidence = await scanEvidence(tx, id);
  const latestGrades = new Map(
    evidence.grades.map((grade) => [grade.target_id, grade]),
  );
  const pages = scanPublished(row) ? issue.snapshot.pages : [];
  const targets = pages.flatMap((page) =>
    page.targets.flatMap((target) => {
      const grade = latestGrades.get(target.id);
      const photo = evidence.photos.find(
        (item) => item.page_number === page.number,
      );
      if (!grade || !photo) return [];
      const history = events.filter(
        (event) => event.grade_id === grade.id && event.photo_id === photo.id,
      );
      const previous =
        actor.kind === "teacher" &&
        grade.origin === "teacher" &&
        (grade.label === "partial" || grade.label === "incorrect")
          ? evidence.grades.findLast(
              (item) =>
                item.target_id === grade.target_id &&
                item.sequence < grade.sequence &&
                JSON.stringify(item.evidence.readIds) ===
                  JSON.stringify(grade.evidence.readIds) &&
                JSON.stringify(item.evidence.correctionIds) ===
                  JSON.stringify(grade.evidence.correctionIds) &&
                events.some(
                  (event) =>
                    event.grade_id === item.id && event.photo_id === photo.id,
                ),
            )
          : undefined;
      const priorDraft =
        previous &&
        events.findLast(
          (event) =>
            event.grade_id === previous.id && event.photo_id === photo.id,
        );
      // A verdict change withdraws publication. A teacher can approve the prior draft against the new verdict.
      const draft =
        history.at(-1) ?? (priorDraft && { ...priorDraft, sequence: 0 });
      if (!draft) return [];
      const publication = history.findLast(
        (event) => event.action === "publish",
      );
      const published =
        publication?.notes.filter(
          ({ id }) =>
            !history.some(
              (event) =>
                event.sequence > publication.sequence &&
                event.removed_note_id === id,
            ),
        ) ?? [];
      return [{ page, target, grade, draft, published }];
    }),
  );
  return { evidence, events, targets };
}

export function getScanMarkup(
  actor: ScanIdentity,
  id: string,
  db: ScanDatabase,
) {
  return db
    .transaction(async (tx) => {
      const { targets } = await markupContext(actor, id, tx);
      return {
        targets: targets.flatMap<ScanMarkupTarget>(
          ({ grade, draft, published }) => {
            if (actor.kind === "teacher") {
              return [
                {
                  gradeId: grade.id,
                  sequence: draft.sequence,
                  notes: draft.notes.map(({ id, note }) => ({
                    id,
                    ...note,
                    published: published.some(
                      (entry) =>
                        entry.id === id &&
                        JSON.stringify(entry.note) === JSON.stringify(note),
                    ),
                  })),
                },
              ];
            }
            return published.length
              ? [
                  {
                    gradeId: grade.id,
                    notes: published.map(({ id, note }) => ({
                      id,
                      slotId: note.slotId,
                      say: note.say,
                    })),
                  },
                ]
              : [];
          },
        ),
      };
    })
    .catch(scanDatabaseError);
}

export function changeScanMarkup(
  actor: ScanIdentity,
  id: string,
  input: ScanMarkupAction,
  db: ScanDatabase,
) {
  if (actor.kind !== "teacher")
    throw new ScanAccessError("교사만 첨삭을 고칠 수 있습니다.");
  const action = scanMarkupActionSchema.parse(input);
  return db
    .transaction(async (tx) => {
      const { evidence, events, targets } = await markupContext(actor, id, tx);
      const retry = events.find((event) => event.id === action.requestId);
      if (retry) {
        if (
          retry.grade_id === action.gradeId &&
          retry.action === action.action &&
          retry.teacher_id === actor.id &&
          retry.sequence === action.sequence + 1
        )
          return { saved: true };
        throw new ScanAccessError("다른 첨삭 요청에서 사용한 번호입니다.", 409);
      }
      const current = targets.find(({ grade }) => grade.id === action.gradeId);
      if (!current || current.draft.sequence !== action.sequence)
        throw new ScanAccessError(
          "판정이나 첨삭이 바뀌었습니다. 최신 상태를 확인해 주세요.",
          409,
        );

      const { draft, page, grade, target } = current;
      let notes = draft.notes;
      if (action.action !== "publish") {
        const entry = notes.find(({ id }) => id === action.noteId);
        if (!entry) throw new ScanAccessError("첨삭을 찾을 수 없습니다.", 409);
        if (action.action === "remove") {
          notes = notes.filter(({ id }) => id !== entry.id);
        } else {
          const proposed = notes.map((item) =>
            item.id === entry.id
              ? {
                  id: item.id,
                  note: {
                    ...item.note,
                    kind: action.kind,
                    say: action.say,
                    fix: action.fix,
                  },
                }
              : item,
          );
          const { notes: checked } = validateScanMarkupNotes({
            page,
            grades: [
              {
                id: target.id,
                label: grade.label,
                reason: grade.reason,
                directlyEntered: grade.directly_entered,
              },
            ],
            readings: evidence.readings.map((r) => ({
              id: r.slot_id,
              status: r.status,
              text: r.text,
            })),
            corrections: [],
            modelTargets: [target.id],
            rows: proposed.map(({ note }) => note),
          });
          if (checked.length !== proposed.length)
            throw new ScanAccessError(
              "원래 읽은 글에서 첨삭 인용을 확인해 주세요.",
              400,
            );
          notes = proposed.map(({ id }, index) => ({
            id,
            note: checked[index],
          }));
        }
      }
      const [inserted] = await tx.query<{ id: string }>(
        `INSERT INTO concept_blank_scan_markup
       (id,submission_id,grade_id,photo_id,sequence,action,notes,teacher_id,removed_note_id,published_at)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::int,$6::text,$7::jsonb,$8::uuid,$9::uuid,
        CASE WHEN $6::text='publish' THEN CURRENT_TIMESTAMP END) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [
          action.requestId,
          id,
          grade.id,
          draft.photo_id,
          draft.sequence + 1,
          action.action,
          JSON.stringify(notes),
          actor.id,
          action.action === "remove" ? action.noteId : null,
        ],
      );
      if (!inserted)
        throw new ScanAccessError("다른 첨삭 요청에서 사용한 번호입니다.", 409);
      return { saved: true };
    })
    .catch(scanDatabaseError);
}
