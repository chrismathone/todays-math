import {
  createLocalCommercialWorkbookSource,
  COMMERCIAL_WORKBOOK_DEMO_ROSTER,
} from "@/lib/commercialWorkbooks/local";
import type {
  WorkbookCreateEdition,
  WorkbookSaveMarks,
} from "@/contracts/commercialWorkbook.contract";
export const bookInput: WorkbookCreateEdition = {
  requestId: "create-book-0001",
  metadata: { title: "자작 예시", edition: "2026 예시 1판" },
  provenance: {
    kind: "teacher-authored",
    description: "시험을 위해 직접 작성",
  },
  exercises: ["비교해서 설명하기", null, "3/4"].map((answerText, i) => ({
    address: {
      volume: "본책",
      section: "단원 1",
      page: "1",
      number: String(i + 1).padStart(2, "0"),
      subpart: "",
    },
    key: answerText
      ? { answerText, status: i ? "reviewed" : "unreviewed" }
      : null,
  })),
};
const cls = COMMERCIAL_WORKBOOK_DEMO_ROSTER[0];
export async function setup(
  source = createLocalCommercialWorkbookSource({ seed: false }),
) {
  const book = await source.createEdition(bookInput);
  const assignment = await source.createAssignment({
    requestId: "create-assignment-0001",
    title: "확인 과제",
    editionId: book.id,
    expectedEditionRevision: book.revision,
    classId: cls.id,
    studentIds: cls.students.map((s) => s.id),
    exerciseIds: book.exercises.map((e) => e.id),
  });
  const marks: WorkbookSaveMarks = {
    requestId: "save-marks-0001",
    studentId: cls.students[0].id,
    expectedRevision: 0,
    marks: [{ exerciseId: book.exercises[0].id, mark: "wrong" }],
  };
  return { source, book, assignment, marks };
}
