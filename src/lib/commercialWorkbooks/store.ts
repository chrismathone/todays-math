import type {
  WorkbookAssignment,
  WorkbookEdition,
  WorkbookEditionDetail,
  WorkbookGradeEvent,
  WorkbookWrongNote,
  WorkbookRosterClass,
} from "@/contracts/commercialWorkbook.contract";

export interface WorkbookReceipt {
  requestId: string;
  fingerprint: string;
  result: unknown;
}
/** Every store is scoped to ONE authenticated owner; assignment access also needs the policy. */
export interface WorkbookStore {
  listEditions(): Promise<WorkbookEdition[]>;
  getEdition(id: string): Promise<WorkbookEditionDetail | null>;
  putEdition(value: WorkbookEditionDetail): Promise<void>;
  listAssignments(
    after?: string,
    limit?: number,
  ): Promise<WorkbookAssignment[]>;
  getAssignment(id: string): Promise<WorkbookAssignment | null>;
  insertAssignment(value: WorkbookAssignment): Promise<void>;
  appendGrade(
    assignmentId: string,
    studentId: string,
    event: WorkbookGradeEvent,
  ): Promise<void>;
  listNotes(): Promise<WorkbookWrongNote[]>;
  getNote(id: string): Promise<WorkbookWrongNote | null>;
  putNote(value: WorkbookWrongNote): Promise<void>;
  getReceipt(requestId: string): Promise<WorkbookReceipt | null>;
  insertReceipt(value: WorkbookReceipt): Promise<void>;
}
export interface WorkbookPolicy {
  listRoster(): Promise<WorkbookRosterClass[]>;
  /** Authorize the class and return only currently eligible requested students. */
  projectRoster?(
    classId: string,
    studentIds: string[],
    write: boolean,
  ): Promise<{
    className: string;
    students: { id: string; name: string }[];
  }>;
  /** Must re-read the account/menu, including in a transaction before replay. */
  assertTeacher(): Promise<void>;
  /** Return current names only after class capability and each enrollment are verified. */
  assertRoster(
    classId: string,
    studentIds: string[],
    write: boolean,
  ): Promise<{
    className: string;
    students: { id: string; name: string }[];
  }>;
}
export interface WorkbookContext {
  store: WorkbookStore;
  policy: WorkbookPolicy;
  actorId: string;
  now(): string;
  newId(): string;
}
export type WorkbookRun = <T>(
  write: boolean,
  work: (context: WorkbookContext) => Promise<T>,
) => Promise<T>;
