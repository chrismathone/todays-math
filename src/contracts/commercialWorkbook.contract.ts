import { z } from "zod";

const id = z.string().uuid();
const label = z.string().trim().min(1).max(200);
const optionalLabel = z.string().trim().min(1).max(200).optional();
const revision = z.number().int().nonnegative();
export const workbookRequestIdSchema = z.string().trim().min(8).max(100);
export const workbookMetadataSchema = z.object({
  title: label, publisher: optionalLabel, grade: optionalLabel,
  curriculum: optionalLabel, edition: optionalLabel, isbn: optionalLabel,
}).strict();
export const workbookProvenanceSchema = z.object({
  kind: z.enum(["teacher-authored", "publisher", "licensed-other"]),
  description: z.string().trim().min(1).max(2000),
  reference: z.string().trim().min(1).max(2000).optional(),
}).strict();
export const workbookAddressSchema = z.object({
  volume: z.string().trim().max(100).default(""),
  section: z.string().trim().max(200).default(""),
  page: z.string().trim().min(1).max(100),
  number: z.string().trim().min(1).max(100),
  subpart: z.string().trim().max(100).default(""),
}).strict();
// Keys are teacher reference text, never a promise of automatic grading.
export const workbookKeySchema = z.object({
  answerText: z.string().trim().min(1).max(4000),
  status: z.enum(["unreviewed", "reviewed"]),
}).strict();
export const workbookExerciseInputSchema = z.object({
  address: workbookAddressSchema,
  key: workbookKeySchema.nullable().default(null),
}).strict();
const exercises = z.array(workbookExerciseInputSchema).min(1).max(1000);
export const workbookCreateEditionSchema = z.object({
  requestId: workbookRequestIdSchema, metadata: workbookMetadataSchema,
  provenance: workbookProvenanceSchema, exercises,
}).strict();
// Full replacement snapshot; an existing address always keeps its stable exercise ID.
// Omitted addresses are rejected: key corrections must not silently remove exercises.
export const workbookReviseEditionSchema = z.object({
  requestId: workbookRequestIdSchema, expectedRevision: revision,
  provenance: workbookProvenanceSchema, exercises,
}).strict();
const uniqueIds = (max: number) => z.array(id).min(1).max(max)
  .refine(v => new Set(v).size === v.length, "중복 ID가 있습니다.");
export const workbookCreateAssignmentSchema = z.object({
  requestId: workbookRequestIdSchema, title: label, editionId: id,
  expectedEditionRevision: revision, classId: id,
  studentIds: uniqueIds(100), exerciseIds: uniqueIds(500),
  dueAt: z.string().datetime({ offset: true }).optional(),
}).strict();
export const workbookMarkSchema = z.enum(["correct", "wrong", "unattempted"]);
export const workbookSaveMarksSchema = z.object({
  requestId: workbookRequestIdSchema, studentId: id, expectedRevision: revision,
  marks: z.array(z.object({ exerciseId: id, mark: workbookMarkSchema }).strict())
    .min(1).max(500).refine(rows => new Set(rows.map(r => r.exerciseId)).size === rows.length,
      "같은 문항을 두 번 채점할 수 없습니다."),
}).strict();
export const workbookUpdateWrongNoteSchema = z.object({
  requestId: workbookRequestIdSchema, expectedRevision: revision,
  correctionText: z.string().max(10000), status: z.enum(["todo", "done"]),
}).strict();
export const workbookWrongNoteFilterSchema = z.object({
  assignmentId: id.optional(), studentId: id.optional(),
}).strict();
export const workbookWrongNotePrintSchema = z.object({
  noteIds: uniqueIds(100), includeAnswers: z.boolean().default(false),
}).strict();

export type WorkbookMetadata = z.infer<typeof workbookMetadataSchema>;
export type WorkbookProvenance = z.infer<typeof workbookProvenanceSchema>;
export type WorkbookAddress = z.infer<typeof workbookAddressSchema>;
export type WorkbookKey = z.infer<typeof workbookKeySchema>;
export type WorkbookExerciseInput = z.infer<typeof workbookExerciseInputSchema>;
export type WorkbookCreateEdition = z.infer<typeof workbookCreateEditionSchema>;
export type WorkbookReviseEdition = z.infer<typeof workbookReviseEditionSchema>;
export type WorkbookCreateAssignment = z.infer<typeof workbookCreateAssignmentSchema>;
export type WorkbookSaveMarks = z.infer<typeof workbookSaveMarksSchema>;
export type WorkbookUpdateWrongNote = z.infer<typeof workbookUpdateWrongNoteSchema>;
export type WorkbookWrongNoteFilter = z.infer<typeof workbookWrongNoteFilterSchema>;
export type WorkbookWrongNotePrintRequest = z.input<typeof workbookWrongNotePrintSchema>;
export type WorkbookMark = z.infer<typeof workbookMarkSchema>;

export interface WorkbookExercise extends WorkbookExerciseInput {
  id: string;
  grading: "manual";
  reviewedBy: string | null;
  reviewedAt: string | null;
}
export interface WorkbookEdition {
  id: string;
  metadata: WorkbookMetadata;
  revision: number;
  exerciseCount: number;
  reviewedKeyCount: number;
  missingKeyCount: number;
  createdAt: string;
}
export interface WorkbookKeyRevision {
  revision: number;
  provenance: WorkbookProvenance;
  createdAt: string;
  createdBy: string;
  exercises: WorkbookExercise[];
}
export interface WorkbookEditionDetail extends WorkbookEdition {
  provenance: WorkbookProvenance;
  exercises: WorkbookExercise[];
  revisions: WorkbookKeyRevision[];
}
export interface WorkbookGradeEvent {
  id: string;
  revision: number;
  previousRevision: number;
  requestId: string;
  gradedAt: string;
  gradedBy: string;
  marks: { exerciseId: string; mark: WorkbookMark }[];
}
export interface WorkbookAssignmentTarget {
  studentId: string;
  studentName: string;
  revision: number;
  // Absent property = not graded; explicit unattempted is a teacher judgment.
  marks: Record<string, WorkbookMark>;
  history: WorkbookGradeEvent[];
}
export interface WorkbookRosterClass {
  id: string;
  name: string;
  students: { id: string; name: string }[];
}
export interface WorkbookAssignment {
  id: string;
  title: string;
  classId: string;
  className: string;
  dueAt: string | null;
  createdAt: string;
  createdBy: string;
  edition: { id: string; metadata: WorkbookMetadata; revision: number; provenance: WorkbookProvenance };
  exercises: WorkbookExercise[];
  targets: WorkbookAssignmentTarget[];
}
export interface WorkbookWrongNote {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentId: string;
  studentName: string;
  exerciseId: string;
  edition: WorkbookAssignment["edition"];
  address: WorkbookAddress;
  key: WorkbookKey | null;
  originalWrongEvent: { id: string; revision: number; gradedAt: string; gradedBy: string };
  latestMark: WorkbookMark | null;
  correctionText: string;
  status: "todo" | "done";
  revision: number;
  updatedAt: string;
}
export interface WorkbookWrongNotePrint {
  kind: "reference-only";
  generatedAt: string;
  includesAnswers: boolean;
  items: {
    noteId: string; studentName: string; assignmentTitle: string;
    workbook: WorkbookMetadata; keyRevision: number; address: WorkbookAddress;
    correctionText: string; status: "todo" | "done";
    // Present only after explicit teacher opt-in, never a hidden nested key.
    answerText?: string;
  }[];
}
export const WORKBOOK_ERROR_STATUS = {
  UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400,
  DUPLICATE_ADDRESS: 400, STALE_REVISION: 409, IDEMPOTENCY_CONFLICT: 409,
  SCOPE_CHANGED: 403, UNAVAILABLE: 503,
} as const;
export type WorkbookErrorCode = keyof typeof WORKBOOK_ERROR_STATUS;
export interface WorkbookErrorBody {
  error: { code: WorkbookErrorCode; message: string; details?: unknown };
}
