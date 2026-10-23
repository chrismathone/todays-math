// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { Prisma } from "@prisma/client";
import { createSqlWorkbookStore } from "@/lib/commercialWorkbooks/server/store";
import { createCommercialWorkbookSource } from "@/lib/commercialWorkbooks/service";
import { COMMERCIAL_WORKBOOK_DEMO_ROSTER } from "@/lib/commercialWorkbooks/local";
import type {
  WorkbookRun,
  WorkbookPolicy,
} from "@/lib/commercialWorkbooks/store";
import { bookInput, setup } from "@/__tests__/helpers/commercialWorkbook";
import { CommercialWorkbookError } from "@/lib/commercialWorkbooks/errors";
import {
  loadPublisherPack,
  PUBLISHER_PACKS,
} from "@/lib/commercialWorkbooks/publisherPacks";
const actor = "10000000-0000-4000-8000-000000000004";
const other = "10000000-0000-4000-8000-000000000005";
const cls = COMMERCIAL_WORKBOOK_DEMO_ROSTER[0];
let pg: PGlite;
let failNote = false;
const policy: WorkbookPolicy = {
  assertTeacher: async () => {},
  listRoster: async () => [cls],
  assertRoster: async () => ({ className: cls.name, students: cls.students }),
};
function sqlClient(client: { query: PGlite["query"] }) {
  const sql = (first: Prisma.Sql | TemplateStringsArray, values: unknown[]) =>
    Array.isArray(first)
      ? Prisma.sql(first as TemplateStringsArray, ...values)
      : (first as Prisma.Sql);
  return {
    $queryRaw: async (
      first: Prisma.Sql | TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const statement = sql(first, values);
      return (await client.query(statement.text, statement.values)).rows;
    },
    $executeRaw: async (
      first: Prisma.Sql | TemplateStringsArray,
      ...values: unknown[]
    ) => {
      const statement = sql(first, values);
      return (
        (await client.query(statement.text, statement.values)).affectedRows ?? 0
      );
    },
  } as Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;
}
function source(ownerId = actor, scope = policy) {
  const run: WorkbookRun = (write, work) =>
    pg.transaction(async (transaction) => {
      if (write)
        await transaction.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1, 231023))::text",
          [ownerId],
        );
      const store = createSqlWorkbookStore(sqlClient(transaction), ownerId);
      return work({
        actorId: ownerId,
        policy: scope,
        store: {
          ...store,
          putNote: async (value) => {
            if (failNote) throw new Error("injected note storage failure");
            return store.putNote(value);
          },
        },
        now: () => new Date().toISOString(),
        newId: () => crypto.randomUUID(),
      });
    });
  return createCommercialWorkbookSource(run);
}
beforeEach(async () => {
  failNote = false;
  pg = new PGlite();
  await pg.exec(
    'CREATE ROLE anon; CREATE ROLE authenticated; CREATE TABLE "user"(id uuid PRIMARY KEY); CREATE TABLE class(id uuid PRIMARY KEY); CREATE TABLE student(id uuid PRIMARY KEY);',
  );
  await pg.query('INSERT INTO "user" VALUES ($1),($2)', [actor, other]);
  await pg.query("INSERT INTO class VALUES ($1)", [cls.id]);
  for (const student of cls.students)
    await pg.query("INSERT INTO student VALUES ($1)", [student.id]);
  await pg.exec(
    readFileSync(
      "prisma/migrations/20261023110000_commercial_workbooks/migration.sql",
      "utf8",
    ),
  );
});
afterEach(async () => {
  await pg.close();
});
describe("commercial workbook SQL persistence", () => {
  it.each(PUBLISHER_PACKS)(
    "preserves every imported address and runs assignment → wrong note → print for $id",
    async (pack) => {
      const api = source();
      const { input } = await loadPublisherPack(pack);
      const edition = await api.createEdition(input);
      expect((await api.createEdition(input)).id).toBe(edition.id);
      const reloaded = await api.getEdition(edition.id);
      expect(
        reloaded.exercises.map(({ address, key }) => ({ address, key })),
      ).toEqual(input.exercises);
      expect(await source(other).listCatalog()).toEqual([]);
      const reviewed = reloaded.exercises.find(
        (row) => row.key?.status === "reviewed",
      )!;
      const missing = reloaded.exercises.find((row) => row.key === null)!;
      expect(reviewed).toBeDefined();
      expect(missing).toBeDefined();
      const assignment = await api.createAssignment({
        requestId: `assignment:${pack.id}`,
        title: "검증용 교재 과제",
        editionId: edition.id,
        expectedEditionRevision: edition.revision,
        classId: cls.id,
        studentIds: [cls.students[0].id],
        exerciseIds: [reviewed.id, missing.id],
      });
      await api.saveMarks(assignment.id, {
        requestId: `marks:${pack.id}`,
        studentId: cls.students[0].id,
        expectedRevision: 0,
        marks: [
          { exerciseId: reviewed.id, mark: "wrong" },
          { exerciseId: missing.id, mark: "unattempted" },
        ],
      });
      const notes = await api.listWrongNotes();
      expect(notes).toHaveLength(1);
      expect(notes[0].address).toEqual(reviewed.address);
      expect(notes[0].edition.metadata).toEqual(input.metadata);
      const printed = await api.getWrongNotePrint({ noteIds: [notes[0].id] });
      expect(printed.items).toHaveLength(1);
      expect(printed.items[0].address).toEqual(reviewed.address);
      expect(printed.items[0].answerText).toBeUndefined();
    },
  );
  it("round-trips catalog, immutable revisions, assignment snapshot and grade history through the real SQL store", async () => {
    const { source: api, book, assignment, marks } = await setup(source());
    const first = await api.saveMarks(assignment.id, marks);
    expect(await api.getAssignment(assignment.id)).toEqual(first);
    expect((await api.listCatalog())[0]).toMatchObject({
      revision: 1,
      exerciseCount: 3,
      reviewedKeyCount: 1,
      missingKeyCount: 1,
    });
    await api.reviseEdition(book.id, {
      requestId: "key-revision-0002",
      expectedRevision: 1,
      provenance: bookInput.provenance,
      exercises: bookInput.exercises.map((row, i) =>
        i
          ? row
          : { ...row, key: { answerText: "수정 정답", status: "reviewed" } },
      ),
    });
    const newer = await api.getEdition(book.id);
    expect(newer.revisions.length).toBe(2);
    expect(newer.exercises[0].id).toBe(book.exercises[0].id);
    expect((await api.getAssignment(assignment.id)).edition.revision).toBe(1);
    await expect(
      pg.query(
        "UPDATE commercial_workbook_revision SET snapshot = snapshot WHERE edition_id = $1",
        [book.id],
      ),
    ).rejects.toThrow(/immutable/);
    await expect(
      pg.query(
        "DELETE FROM commercial_workbook_grade_event WHERE assignment_id = $1",
        [assignment.id],
      ),
    ).rejects.toThrow(/immutable/);
    expect(await source(other).listCatalog()).toEqual([]);
    await expect(
      source(other).getAssignment(assignment.id),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("rolls back grades, wrong notes and receipts together, then permits retry", async () => {
    const { source: api, assignment, marks } = await setup(source());
    failNote = true;
    await expect(api.saveMarks(assignment.id, marks)).rejects.toThrow(
      "injected",
    );
    expect(
      (await pg.query("SELECT * FROM commercial_workbook_grade_event")).rows,
    ).toHaveLength(0);
    expect(
      (await pg.query("SELECT * FROM commercial_workbook_wrong_note")).rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query(
          "SELECT * FROM commercial_workbook_request WHERE request_id = $1",
          [marks.requestId],
        )
      ).rows,
    ).toHaveLength(0);
    failNote = false;
    const [a, b] = await Promise.all([
      api.saveMarks(assignment.id, marks),
      api.saveMarks(assignment.id, marks),
    ]);
    expect(a).toEqual(b);
    expect(await api.listWrongNotes()).toHaveLength(1);
    await expect(
      api.saveMarks(assignment.id, { ...marks, requestId: "stale-after-save" }),
    ).rejects.toMatchObject({ code: "STALE_REVISION" });
    await expect(
      api.saveMarks(assignment.id, {
        ...marks,
        marks: [{ ...marks.marks[0], mark: "unattempted" }],
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("enforces duplicate addresses and stable identities below the service", async () => {
    const { book } = await setup(source());
    const duplicate = {
      ...book.revisions[0],
      revision: 2,
      exercises: [
        book.exercises[0],
        { ...book.exercises[0], id: crypto.randomUUID() },
      ],
    };
    await expect(
      pg.query("INSERT INTO commercial_workbook_revision VALUES ($1,2,$2)", [
        book.id,
        JSON.stringify(duplicate),
      ]),
    ).rejects.toThrow(/Duplicate/);
    const replaced = {
      ...book.revisions[0],
      revision: 2,
      exercises: book.exercises.map((e, i) =>
        i ? e : { ...e, id: crypto.randomUUID() },
      ),
    };
    await expect(
      pg.query("INSERT INTO commercial_workbook_revision VALUES ($1,2,$2)", [
        book.id,
        JSON.stringify(replaced),
      ]),
    ).rejects.toThrow(/identities/);
  });
  it("keeps wrong-event identity immutable while regrading changes latest status and print excludes keys", async () => {
    const { source: api, assignment, marks } = await setup(source());
    await api.saveMarks(assignment.id, marks);
    const [note] = await api.listWrongNotes();
    await api.updateWrongNote(note.id, {
      requestId: "note-update-0001",
      expectedRevision: 0,
      correctionText: "확인했습니다",
      status: "done",
    });
    await api.saveMarks(assignment.id, {
      ...marks,
      requestId: "regrade-correct-1",
      expectedRevision: 1,
      marks: [{ ...marks.marks[0], mark: "correct" }],
    });
    const [updated] = await api.listWrongNotes();
    expect(updated.originalWrongEvent).toEqual(note.originalWrongEvent);
    expect(updated.latestMark).toBe("correct");
    expect(updated.status).toBe("done");
    const print = await api.getWrongNotePrint({ noteIds: [note.id] });
    expect(JSON.stringify(print)).not.toContain("비교해서 설명하기");
    await expect(
      pg.query(
        "UPDATE commercial_workbook_wrong_note SET revision = revision + 1, snapshot = jsonb_set(jsonb_set(snapshot, '{revision}', '2'), '{originalWrongEvent,revision}', '99') WHERE id = $1",
        [note.id],
      ),
    ).rejects.toThrow(/Original wrong/);
  });
  it("enables RLS and revokes all browser table grants", async () => {
    const rows = (
      await pg.query<{ relrowsecurity: boolean; relname: string }>(
        "SELECT relname, relrowsecurity FROM pg_class WHERE relname LIKE 'commercial_workbook_%' AND relkind = 'r'",
      )
    ).rows;
    expect(rows).toHaveLength(6);
    expect(rows.every((row) => row.relrowsecurity)).toBe(true);
    for (const role of ["anon", "authenticated"])
      for (const row of rows) {
        const result = await pg.query<{ allowed: boolean }>(
          "SELECT has_table_privilege($1,$2,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS allowed",
          [role, row.relname],
        );
        expect(result.rows[0].allowed).toBe(false);
      }
    await pg.exec("SET ROLE anon");
    await expect(
      pg.query("SELECT * FROM commercial_workbook_edition"),
    ).rejects.toThrow(/permission denied/);
    await pg.exec("RESET ROLE");
  });
  it("rejects missing JSON properties instead of accepting SQL UNKNOWN and prevents forged assignment keys", async () => {
    const { source: api, book, assignment, marks } = await setup(source());
    await expect(
      pg.query(
        "INSERT INTO commercial_workbook_edition VALUES ($1,$2,$3,1,now())",
        [crypto.randomUUID(), actor, "{}"],
      ),
    ).rejects.toThrow();
    const incompleteRevision = { ...book.revisions[0], revision: 2 } as Record<
      string,
      unknown
    >;
    delete incompleteRevision.provenance;
    await expect(
      pg.query("INSERT INTO commercial_workbook_revision VALUES ($1,2,$2)", [
        book.id,
        JSON.stringify(incompleteRevision),
      ]),
    ).rejects.toThrow();
    const incompleteAssignment = {
      ...assignment,
      id: crypto.randomUUID(),
    } as Record<string, unknown>;
    delete incompleteAssignment.dueAt;
    await expect(
      pg.query(
        "INSERT INTO commercial_workbook_assignment VALUES ($1,$2,$3,$4,1,$5,now())",
        [
          incompleteAssignment.id,
          actor,
          cls.id,
          book.id,
          JSON.stringify(incompleteAssignment),
        ],
      ),
    ).rejects.toThrow();
    const forged = {
      ...assignment,
      id: crypto.randomUUID(),
      exercises: assignment.exercises.map((e) => ({
        ...e,
        key: { answerText: "forged", status: "reviewed" },
      })),
    };
    await expect(
      pg.query(
        "INSERT INTO commercial_workbook_assignment VALUES ($1,$2,$3,$4,1,$5,now())",
        [forged.id, actor, cls.id, book.id, JSON.stringify(forged)],
      ),
    ).rejects.toThrow(/frozen/);
    const saved = await api.saveMarks(assignment.id, marks);
    const event = {
      ...saved.targets[0].history[0],
      id: crypto.randomUUID(),
      revision: 2,
      previousRevision: 1,
    } as Record<string, unknown>;
    delete event.requestId;
    await expect(
      pg.query(
        "INSERT INTO commercial_workbook_grade_event VALUES ($1,$2,$3,2,$4)",
        [event.id, assignment.id, marks.studentId, JSON.stringify(event)],
      ),
    ).rejects.toThrow();
    const [note] = await api.listWrongNotes();
    await expect(
      pg.query(
        "UPDATE commercial_workbook_wrong_note SET revision = 1, snapshot = jsonb_set(snapshot - 'correctionText', '{revision}', '1') WHERE id = $1",
        [note.id],
      ),
    ).rejects.toThrow();
  });
  it("pages assignments without dropping entries and leaves source convenience compatible", async () => {
    const { source: api, book } = await setup(source());
    for (let i = 0; i < 2; i++)
      await api.createAssignment({
        requestId: `page-assignment-${i}`,
        title: `과제 ${i}`,
        editionId: book.id,
        expectedEditionRevision: 1,
        classId: cls.id,
        studentIds: [cls.students[0].id],
        exerciseIds: [book.exercises[0].id],
      });
    const first = await api.listAssignmentPage({ limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();
    const last = await api.listAssignmentPage({
      limit: 2,
      after: first.nextCursor!,
    });
    expect(last.items).toHaveLength(1);
    expect(last.nextCursor).toBeNull();
    expect(new Set([...first.items, ...last.items].map((a) => a.id)).size).toBe(
      3,
    );
    expect(await api.listAssignments()).toHaveLength(3);
  });
  it("keeps A usable when B transfers, rejects B operations, and filters old receipt responses", async () => {
    const active = new Set(cls.students.map((s) => s.id));
    let classAllowed = true;
    const scoped: WorkbookPolicy = {
      assertTeacher: async () => {},
      listRoster: async () => [cls],
      assertRoster: async (id, ids) => {
        if (
          !classAllowed ||
          id !== cls.id ||
          ids.some((studentId) => !active.has(studentId))
        )
          throw new CommercialWorkbookError("SCOPE_CHANGED", "transferred");
        return {
          className: cls.name,
          students: cls.students.filter((s) => ids.includes(s.id)),
        };
      },
    };
    const {
      source: api,
      assignment,
      marks,
    } = await setup(source(actor, scoped));
    const first = await api.saveMarks(assignment.id, marks);
    expect(first.targets).toHaveLength(2);
    const bMarks = {
      ...marks,
      requestId: "student-b-wrong-01",
      studentId: cls.students[1].id,
    };
    await api.saveMarks(assignment.id, bMarks);
    const allNotes = await api.listWrongNotes();
    const aNote = allNotes.find((n) => n.studentId === marks.studentId)!;
    const bNote = allNotes.find((n) => n.studentId === bMarks.studentId)!;
    active.delete(bMarks.studentId);
    expect(
      (await api.getAssignment(assignment.id)).targets.map((t) => t.studentId),
    ).toEqual([marks.studentId]);
    expect((await api.listAssignments())[0].targets).toHaveLength(1);
    expect((await api.listWrongNotes()).map((n) => n.id)).toEqual([aNote.id]);
    const replay = await api.saveMarks(assignment.id, marks);
    expect(replay.targets).toHaveLength(1);
    expect(JSON.stringify(replay)).not.toContain(cls.students[1].name);
    expect(JSON.stringify(replay)).not.toContain(bMarks.studentId);
    await api.saveMarks(assignment.id, {
      ...marks,
      requestId: "student-a-later-01",
      expectedRevision: 1,
    });
    await api.updateWrongNote(aNote.id, {
      requestId: "student-a-note-01",
      expectedRevision: 0,
      correctionText: "확인",
      status: "done",
    });
    expect(
      (await api.getWrongNotePrint({ noteIds: [aNote.id] })).items,
    ).toHaveLength(1);
    await expect(api.saveMarks(assignment.id, bMarks)).rejects.toMatchObject({
      code: "SCOPE_CHANGED",
    });
    await expect(
      api.saveMarks(assignment.id, {
        ...bMarks,
        requestId: "student-b-later-01",
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    await expect(
      api.updateWrongNote(bNote.id, {
        requestId: "student-b-note-01",
        expectedRevision: 0,
        correctionText: "",
        status: "done",
      }),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    await expect(
      api.getWrongNotePrint({ noteIds: [bNote.id] }),
    ).rejects.toMatchObject({ code: "SCOPE_CHANGED" });
    expect(
      (
        await pg.query(
          "SELECT * FROM commercial_workbook_grade_event WHERE student_id = $1",
          [bMarks.studentId],
        )
      ).rows,
    ).toHaveLength(1);
    classAllowed = false;
    await expect(api.getAssignment(assignment.id)).rejects.toMatchObject({
      code: "SCOPE_CHANGED",
    });
  });
});
