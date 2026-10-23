import { describe, expect, it } from "vitest";
import {
  createLocalCommercialWorkbookSource,
  COMMERCIAL_WORKBOOK_DEMO_ROSTER,
} from "@/lib/commercialWorkbooks/local";
import { parseWorkbookImport } from "@/lib/commercialWorkbooks/import";
import { workbookGradingCapability } from "@/lib/commercialWorkbooks/grading";
import { CommercialWorkbookError } from "@/lib/commercialWorkbooks/errors";
import type { WorkbookPolicy } from "@/lib/commercialWorkbooks/store";

import { bookInput, setup } from "@/__tests__/helpers/commercialWorkbook";
const cls = COMMERCIAL_WORKBOOK_DEMO_ROSTER[0];
describe("commercial workbook domain", () => {
  it("renews the review assertion when the PDF evidence page changes", async () => {
    let now = "2026-10-23T01:00:00.000Z";
    const source = createLocalCommercialWorkbookSource({
      seed: false,
      now: () => now,
    });
    const book = await source.createEdition(bookInput);
    now = "2026-10-23T02:00:00.000Z";
    const revised = await source.reviseEdition(book.id, {
      requestId: "source-page-review",
      expectedRevision: 1,
      provenance: bookInput.provenance,
      exercises: bookInput.exercises.map((exercise, index) =>
        index === 2
          ? { ...exercise, key: { ...exercise.key!, sourcePage: 12 } }
          : exercise,
      ),
    });
    expect(revised.exercises[2].reviewedAt).toBe(now);
    expect(revised.revisions[0].exercises[2].reviewedAt).toBe(
      "2026-10-23T01:00:00.000Z",
    );
    expect(revised.exercises[2].key?.sourcePage).toBe(12);
  });
  it("parses quoted CSV/TSV, preserves leading zeros, rejects duplicate and malformed rows atomically", () => {
    const good = parseWorkbookImport(
      'volume,page,number,subpart,answerText,keyStatus\r\n본책,1,01,,"3, 4",reviewed\r\n해설,1,01,,,',
    );
    expect(good.issues).toEqual([]);
    expect(good.exercises[0].address.number).toBe("01");
    expect(good.exercises[1].key).toBeNull();
    expect(
      parseWorkbookImport("page\tnumber\tanswerText\n1\t1\t설명\n1\t1\t")
        .exercises,
    ).toEqual([]);
    expect(
      parseWorkbookImport('page,number,answerText\n1,1,"unfinished').issues
        .length,
    ).toBeGreaterThan(0);
    expect(
      parseWorkbookImport("page,number,keyStatus\n1,1,reviewed").issues[0]
        .field,
    ).toBe("keyStatus");
  });
  it("rejects manual duplicate normalized addresses but keeps different volumes and subparts", async () => {
    const source = createLocalCommercialWorkbookSource({ seed: false });
    await expect(
      source.createEdition({
        ...bookInput,
        exercises: [
          bookInput.exercises[0],
          {
            ...bookInput.exercises[0],
            address: { ...bookInput.exercises[0].address, number: " 01 " },
          },
        ],
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_ADDRESS" });
    expect(await source.listCatalog()).toEqual([]);
  });
  it("keeps arbitrary/missing/unreviewed keys manual and never invents student answers", async () => {
    expect(workbookGradingCapability(null).reason).toBe("missing-key");
    expect(
      workbookGradingCapability({ answerText: "x² + y²", status: "reviewed" })
        .automatic,
    ).toBe(false);
    expect(
      workbookGradingCapability({ answerText: "증명", status: "unreviewed" })
        .reason,
    ).toBe("unreviewed-key");
    const { source, assignment, marks } = await setup();
    const saved = await source.saveMarks(assignment.id, marks);
    expect(saved.targets[0].marks).toEqual({
      [marks.marks[0].exerciseId]: "wrong",
    });
    expect(saved.targets[0].history[0]).not.toHaveProperty("answerText");
    expect(saved.targets[1].revision).toBe(0);
  });
  it("pins keys and exercise identity through a new edition revision", async () => {
    const { source, assignment, book } = await setup();
    const changed = await source.reviseEdition(book.id, {
      requestId: "revise-book-0001",
      expectedRevision: 1,
      provenance: bookInput.provenance,
      exercises: bookInput.exercises.map((e, i) =>
        i ? e : { ...e, key: { answerText: "새 정답", status: "reviewed" } },
      ),
    });
    expect(changed.exercises.map((e) => e.id)).toEqual(
      book.exercises.map((e) => e.id),
    );
    expect(changed.revisions[0].exercises[0].key?.answerText).toBe(
      "비교해서 설명하기",
    );
    expect(
      (await source.getAssignment(assignment.id)).exercises[0].key?.answerText,
    ).toBe("비교해서 설명하기");
    await expect(
      source.reviseEdition(book.id, {
        requestId: "revise-book-0002",
        expectedRevision: 1,
        provenance: bookInput.provenance,
        exercises: bookInput.exercises,
      }),
    ).rejects.toMatchObject({ code: "STALE_REVISION" });
  });
  it("serializes same requests, rejects changed replay and stale edits, preserves regrading", async () => {
    const { source, assignment, marks } = await setup();
    const [first, replay] = await Promise.all([
      source.saveMarks(assignment.id, marks),
      source.saveMarks(assignment.id, marks),
    ]);
    expect(replay).toEqual(first);
    expect((await source.listWrongNotes()).length).toBe(1);
    await expect(
      source.saveMarks(assignment.id, {
        ...marks,
        marks: [{ ...marks.marks[0], mark: "correct" }],
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    await expect(
      source.saveMarks(assignment.id, {
        ...marks,
        requestId: "another-request",
      }),
    ).rejects.toMatchObject({ code: "STALE_REVISION" });
    await source.saveMarks(assignment.id, {
      ...marks,
      requestId: "same-wrong-again",
      expectedRevision: 1,
    });
    expect((await source.listWrongNotes()).length).toBe(1);
    const corrected = await source.saveMarks(assignment.id, {
      ...marks,
      requestId: "corrected-mark",
      expectedRevision: 2,
      marks: [{ ...marks.marks[0], mark: "correct" }],
    });
    expect(corrected.targets[0].history.map((h) => h.marks[0].mark)).toEqual([
      "wrong",
      "wrong",
      "correct",
    ]);
    const notes = await source.listWrongNotes();
    expect(notes[0].latestMark).toBe("correct");
    await source.saveMarks(assignment.id, {
      ...marks,
      requestId: "new-failure-mark",
      expectedRevision: 3,
    });
    expect((await source.listWrongNotes()).length).toBe(2);
  });
  it("preserves original wrong event while correcting notes; print defaults to no key fields", async () => {
    const { source, assignment, marks } = await setup();
    await source.saveMarks(assignment.id, marks);
    const [note] = await source.listWrongNotes();
    const saved = await source.updateWrongNote(note.id, {
      requestId: "note-correction-1",
      expectedRevision: 0,
      correctionText: "풀이를 다시 확인",
      status: "done",
    });
    expect(saved.originalWrongEvent).toEqual(note.originalWrongEvent);
    const print = await source.getWrongNotePrint({ noteIds: [note.id] });
    expect(print.kind).toBe("reference-only");
    expect(print.items[0]).not.toHaveProperty("answerText");
    expect(JSON.stringify(print)).not.toContain("비교해서 설명하기");
    const teacherPrint = await source.getWrongNotePrint({
      noteIds: [note.id],
      includeAnswers: true,
    });
    expect(teacherPrint.items[0]).toMatchObject({
      answerText: "비교해서 설명하기",
      keyStatus: "unreviewed",
    });
    await expect(
      source.updateWrongNote(note.id, {
        requestId: "note-correction-2",
        expectedRevision: 0,
        correctionText: "",
        status: "todo",
      }),
    ).rejects.toMatchObject({ code: "STALE_REVISION" });
  });
  it("rejects foreign class/student and rechecks revoked authorization before read/write/replay/print", async () => {
    let allowed = true;
    const policy: WorkbookPolicy = {
      assertTeacher: async () => {},
      listRoster: async () => [cls],
      assertRoster: async (classId, studentIds) => {
        if (
          !allowed ||
          classId !== cls.id ||
          studentIds.some((id) => !cls.students.some((s) => s.id === id))
        )
          throw new CommercialWorkbookError("SCOPE_CHANGED", "revoked");
        return { className: cls.name, students: cls.students };
      },
    };
    const { source, assignment, marks, book } = await setup(
      createLocalCommercialWorkbookSource({ seed: false, policy }),
    );
    await expect(
      source.createAssignment({
        requestId: "foreign-student1",
        title: "과제",
        editionId: book.id,
        expectedEditionRevision: 1,
        classId: cls.id,
        studentIds: [crypto.randomUUID()],
        exerciseIds: [book.exercises[0].id],
      }),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    await source.saveMarks(assignment.id, marks);
    const [note] = await source.listWrongNotes();
    allowed = false;
    await expect(source.saveMarks(assignment.id, marks)).rejects.toMatchObject({
      code: "SCOPE_CHANGED",
    });
    await expect(source.getAssignment(assignment.id)).rejects.toMatchObject({
      code: "SCOPE_CHANGED",
    });
    await expect(
      source.getWrongNotePrint({ noteIds: [note.id] }),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    expect(await source.listAssignments()).toEqual([]);
  });
});
