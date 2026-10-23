import type {
  WorkbookAssignment, WorkbookCreateAssignment, WorkbookCreateEdition, WorkbookEdition,
  WorkbookEditionDetail, WorkbookReviseEdition, WorkbookSaveMarks, WorkbookUpdateWrongNote,
  WorkbookWrongNote, WorkbookWrongNoteFilter, WorkbookWrongNotePrint, WorkbookWrongNotePrintRequest, WorkbookRosterClass,
} from "@/contracts/commercialWorkbook.contract";

/** Both sources throw CommercialWorkbookError; HTTP uses {data:T} / {error:{code,message}}. */
export interface CommercialWorkbookSource {
  listRoster(): Promise<WorkbookRosterClass[]>;
  listCatalog(): Promise<WorkbookEdition[]>;
  getEdition(id: string): Promise<WorkbookEditionDetail>;
  createEdition(input: WorkbookCreateEdition): Promise<WorkbookEditionDetail>;
  reviseEdition(id: string, input: WorkbookReviseEdition): Promise<WorkbookEditionDetail>;
  listAssignments(): Promise<WorkbookAssignment[]>;
  getAssignment(id: string): Promise<WorkbookAssignment>;
  createAssignment(input: WorkbookCreateAssignment): Promise<WorkbookAssignment>;
  saveMarks(assignmentId: string, input: WorkbookSaveMarks): Promise<WorkbookAssignment>;
  listWrongNotes(filter?: WorkbookWrongNoteFilter): Promise<WorkbookWrongNote[]>;
  updateWrongNote(id: string, input: WorkbookUpdateWrongNote): Promise<WorkbookWrongNote>;
  getWrongNotePrint(input: WorkbookWrongNotePrintRequest): Promise<WorkbookWrongNotePrint>;
}
