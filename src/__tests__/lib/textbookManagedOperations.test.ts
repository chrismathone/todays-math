// @vitest-environment node
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookActor } from "@/lib/textbook/access";
import { canonicalHash } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import {
  createAssignment,
  listAssignments,
  revokeAssignment,
} from "@/lib/textbook/server/assignments";
import { createBook, updateBook } from "@/lib/textbook/server/books";
import {
  recordObservation,
  reviewAttempt,
  studentConceptAttempts,
} from "@/lib/textbook/server/conceptRows";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { captureItems, updateItem } from "@/lib/textbook/server/items";
import { reissueTest } from "@/lib/textbook/server/reissue";
import { getSection, saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import { resolveStudentQr } from "@/lib/textbook/studentAccess";

import { createManagedWorld } from "../helpers/textbookManagedWorld";
import {
  type Db,
  type World,
  fakeHash,
  openTextbookDb,
  seedWorld,
  sqlNow,
} from "../helpers/textbookPglite";
import {
  fakePublishDeps,
  insertBankProblem,
  pgliteTextbookDb,
  requestKey,
  sampleConfig,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let bank: World;
const conceptKey = "managed-concept";
const deps = fakePublishDeps();

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  bank = await seedWorld(pg);
}, 120_000);
afterAll(async () => {
  await pg.close();
});

// Publishing uses real SQL, snapshots, triggers and permissions; only rendering is a deterministic test dependency.
async function publishedBook(owner: TextbookActor) {
  const { book } = await createBook(
    db,
    owner,
    requestKey(owner, "book-create"),
    { config: sampleConfig() },
  );
  const editionId = book.draftEditionId!;
  const detail = await getEditionDetail(db, owner, editionId);
  await saveStructure(
    db,
    owner,
    editionId,
    requestKey(owner, "structure-save"),
    {
      expectedRevision: detail.structureRevision,
      config: detail.config,
      outline: [
        {
          unitKey: "u1",
          title: "단원",
          sourceUnitIds: [],
          prerequisites: [],
          goals: [],
          conceptLectureRefs: [],
          sections: [],
        },
      ],
    },
  );
  const sectionId = randomUUID();
  const saved = await saveSection(
    db,
    owner,
    editionId,
    sectionId,
    requestKey(owner, "section-save"),
    {
      expectedRevision: 0,
      unitKey: "u1",
      section: {
        sectionKey: "s",
        title: "구획",
        templateKey: "basic",
        startPolicy: "even-left",
        blocks: [],
      },
    },
  );
  const problem = await insertBankProblem(pg, bank.unitId);
  const captured = await captureItems(
    db,
    owner,
    editionId,
    requestKey(owner, "capture"),
    {
      expectedRevision: saved.aggregateRevision,
      sectionId,
      source: { kind: "problems", problemIds: [problem.id] },
    },
    async () => null,
  );
  await pg.query(
    `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "body", "blank_items", "links", "mapping_version", "updated_at")
    VALUES ($1, $2, 'u1', '개념 정의', '정의', $3::jsonb, '[]'::jsonb, '[]'::jsonb, 'm1', $4)`,
    [
      editionId,
      conceptKey,
      JSON.stringify({
        goal: "뜻을 말한다",
        prerequisites: [],
        definition: "개념의 뜻",
        conditions: null,
        examples: [],
        counterexamples: [],
        misconceptions: [],
        explainPrompt: null,
      }),
      sqlNow(),
    ],
  );
  const itemId = captured.items[0]!.itemId;
  const revision = (await getEditionDetail(db, owner, editionId)).edition
    .revision;
  await updateItem(
    db,
    owner,
    editionId,
    itemId,
    requestKey(owner, "item-update"),
    {
      expectedRevision: revision,
      conceptKeys: [conceptKey],
    },
  );
  const section = await getSection(db, owner, editionId, sectionId);
  const placed = await saveSection(
    db,
    owner,
    editionId,
    sectionId,
    requestKey(owner, "section-save"),
    {
      expectedRevision: section.revision,
      unitKey: "u1",
      section: {
        ...section.section,
        blocks: [
          { blockId: "concept", kind: "concept", conceptKey },
          ...section.section.blocks,
        ],
      },
    },
  );
  const requestId = randomUUID();
  await reservePublish(
    db,
    owner,
    editionId,
    { requestId, expectedRevision: placed.aggregateRevision },
    fakeHash(requestId),
    deps,
  );
  let job = await runNextStep(db, owner, editionId, requestId, deps);
  for (let guard = 0; guard < 20 && job.status !== "ready"; guard++)
    job = await runNextStep(db, owner, editionId, requestId, deps);
  await finalizePublish(db, owner, editionId, requestId, deps);
  const {
    rows: [qr],
  } = await pg.query<{ slug: string }>(
    `SELECT "slug" FROM "textbook_qr_target" WHERE "edition_id" = $1 AND "kind" = 'concept'`,
    [editionId],
  );
  return { bookId: book.id, editionId, itemId, slug: qr!.slug };
}

type ManagedWorld = Awaited<ReturnType<typeof createManagedWorld>>;
const assignmentInput = (world: ManagedWorld) => ({
  subject: { kind: "class" as const, classId: world.classId },
  scope: { kind: "edition" as const },
  startsAt: "2020-01-01T00:00:00.000Z",
  expiresAt: null,
});
const observation = (world: ManagedWorld) => ({
  requestId: randomUUID(),
  studentId: world.studentId,
  form: "recall" as const,
  observation: "뜻을 설명했다",
});
const deny = (work: Promise<unknown>) =>
  expect(work).rejects.toMatchObject({ status: 404 });

describe("managed textbook service boundaries with real relation rows", () => {
  it("uses current class membership, preserves private ownership and reads the student's non-primary enrollment", async () => {
    const world = await createManagedWorld(pg);
    const book = await publishedBook(world.teacher);
    const input = assignmentInput(world);
    const created = await createAssignment(
      db,
      world.teacher,
      book.editionId,
      requestKey(world.teacher, "assign"),
      input,
    );
    expect(await listAssignments(db, world.teacher, book.editionId)).toEqual([
      created.assignment,
    ]);
    expect(
      await resolveStudentQr(db, world.studentId, book.slug),
    ).toMatchObject({ ok: true, target: { editionId: book.editionId } });
    // Same-branch membership is not textbook ownership or publication sharing.
    await deny(listAssignments(db, world.delegate, book.editionId));
    await updateBook(
      db,
      world.teacher,
      book.bookId,
      requestKey(world.teacher, "book-update"),
      { visibility: "branch" },
    );
    expect(
      await listAssignments(db, world.formerTeacher, book.editionId),
    ).toEqual([]);
    await deny(
      createAssignment(
        db,
        world.formerTeacher,
        book.editionId,
        requestKey(world.formerTeacher, "assign"),
        input,
      ),
    );
    const body = observation(world);
    const observed = await recordObservation(
      db,
      world.teacher,
      book.editionId,
      conceptKey,
      body,
      canonicalHash(body),
    );
    expect(
      (await studentConceptAttempts(db, world.delegate, world.studentId)).map(
        (row) => row.attemptId,
      ),
    ).toContain(observed.attempt.attemptId);
    expect(await listAssignments(db, world.delegate, book.editionId)).toEqual([
      created.assignment,
    ]);
    await deny(
      recordObservation(
        db,
        world.delegate,
        book.editionId,
        conceptKey,
        observation(world),
        fakeHash("delegate"),
      ),
    );
    await deny(
      createAssignment(
        db,
        world.delegate,
        book.editionId,
        requestKey(world.delegate, "assign"),
        input,
      ),
    );
    await deny(
      reissueTest(
        db,
        world.delegate,
        book.editionId,
        requestKey(world.delegate, "reissue"),
        {
          itemIds: [book.itemId],
          classId: world.classId,
          testType: "review",
          rangeEndUnitId: bank.unitId,
        },
      ),
    );
  });

  it("checks revoked membership before replaying assignment, observation, review, revoke and frozen reissue", async () => {
    const world = await createManagedWorld(pg);
    const book = await publishedBook(world.teacher);
    const input = assignmentInput(world);
    const createKey = requestKey(world.teacher, "assign");
    const assignment = await createAssignment(
      db,
      world.teacher,
      book.editionId,
      createKey,
      input,
    );
    const revokeKey = requestKey(world.teacher, "assign-revoke");
    await revokeAssignment(
      db,
      world.teacher,
      book.editionId,
      assignment.assignment.id,
      revokeKey,
    );
    const body = observation(world);
    const observed = await recordObservation(
      db,
      world.teacher,
      book.editionId,
      conceptKey,
      body,
      canonicalHash(body),
    );
    const reviewKey = requestKey(world.teacher, "attempt-review");
    const review = {
      expectedRevision: observed.attempt.revision,
      reviewStatus: "checked" as const,
      note: "교사 확인",
    };
    const reviewed = await reviewAttempt(
      db,
      world.teacher,
      observed.attempt.attemptId,
      reviewKey,
      review,
    );
    const reissueKey = requestKey(world.teacher, "reissue");
    const reissueInput = {
      itemIds: [book.itemId],
      classId: world.classId,
      testType: "review" as const,
      rangeEndUnitId: bank.unitId,
    };
    const reissued = await reissueTest(
      db,
      world.teacher,
      book.editionId,
      reissueKey,
      reissueInput,
    );
    const actions = [
      () =>
        createAssignment(db, world.teacher, book.editionId, createKey, input),
      () =>
        revokeAssignment(
          db,
          world.teacher,
          book.editionId,
          assignment.assignment.id,
          revokeKey,
        ),
      () =>
        recordObservation(
          db,
          world.teacher,
          book.editionId,
          conceptKey,
          body,
          canonicalHash(body),
        ),
      () =>
        reviewAttempt(
          db,
          world.teacher,
          observed.attempt.attemptId,
          reviewKey,
          review,
        ),
      () =>
        reissueTest(
          db,
          world.teacher,
          book.editionId,
          reissueKey,
          reissueInput,
        ),
    ];
    for (const action of actions)
      expect(await action()).toMatchObject({ replayed: true });
    const frozen = await pg.query(
      `SELECT "snapshot_id" FROM "test_problem" WHERE "test_id" = $1`,
      [reissued.testId],
    );
    expect(frozen.rows).toHaveLength(1);
    expect(frozen.rows[0]).toMatchObject({ snapshot_id: expect.any(String) });
    await pg.query(
      `UPDATE "class_membership" SET "revoked_at" = $2 WHERE "id" = $1`,
      [world.teacherMembershipId, sqlNow()],
    );
    for (const action of actions) await deny(action());
    await deny(studentConceptAttempts(db, world.teacher, world.studentId));
    expect(await listAssignments(db, world.teacher, book.editionId)).toEqual(
      [],
    );
    expect(
      (
        await pg.query(
          `SELECT "revision", "note" FROM "textbook_concept_attempt" WHERE "id" = $1`,
          [observed.attempt.attemptId],
        )
      ).rows,
    ).toEqual([{ revision: reviewed.attempt.revision, note: review.note }]);
    expect(
      (
        await pg.query(
          `SELECT "snapshot_id" FROM "test_problem" WHERE "test_id" = $1`,
          [reissued.testId],
        )
      ).rows,
    ).toEqual(frozen.rows);
    expect(
      (
        await pg.query(
          `SELECT count(*)::int AS count FROM "student_srs_state" WHERE "student_id" = $1`,
          [world.studentId],
        )
      ).rows,
    ).toEqual([{ count: 0 }]);
  });

  it("student assignment survives teacher departure but stops on hold, enrollment revocation, lease expiry or assignment revocation", async () => {
    const world = await createManagedWorld(pg);
    const book = await publishedBook(world.teacher);
    const created = await createAssignment(
      db,
      world.teacher,
      book.editionId,
      requestKey(world.teacher, "assign"),
      assignmentInput(world),
    );
    const read = () => resolveStudentQr(db, world.studentId, book.slug);
    expect(await read()).toMatchObject({ ok: true });
    await pg.query(
      `UPDATE "class_membership" SET "revoked_at" = $2 WHERE "id" = $1`,
      [world.teacherMembershipId, sqlNow()],
    );
    expect(await read()).toMatchObject({ ok: true });
    await pg.query(
      `UPDATE "student_enrollment" SET "on_hold" = TRUE WHERE "id" = $1`,
      [world.enrollmentId],
    );
    expect(await read()).toEqual({ ok: false, reason: "not-assigned" });
    await pg.query(
      `UPDATE "student_enrollment" SET "on_hold" = FALSE, "ended_at" = $2 WHERE "id" = $1`,
      [world.enrollmentId, sqlNow()],
    );
    expect(await read()).toEqual({ ok: false, reason: "not-assigned" });
    await pg.query(
      `UPDATE "student_enrollment" SET "ended_at" = NULL WHERE "id" = $1`,
      [world.enrollmentId],
    );
    await pg.query(
      `UPDATE "eywa_binding" SET "lease_expires_at" = '2000-01-01' WHERE "id" = $1`,
      [world.bindingId],
    );
    expect(await read()).toEqual({ ok: false, reason: "not-assigned" });
    await pg.query(
      `UPDATE "eywa_binding" SET "lease_expires_at" = $2 WHERE "id" = $1`,
      [world.bindingId, world.leaseExpiresAt],
    );
    await pg.query(
      `UPDATE "class_membership" SET "revoked_at" = NULL WHERE "id" = $1`,
      [world.teacherMembershipId],
    );
    expect(await read()).toMatchObject({ ok: true });
    await revokeAssignment(
      db,
      world.teacher,
      book.editionId,
      created.assignment.id,
      requestKey(world.teacher, "assign-revoke"),
    );
    expect(await read()).toEqual({ ok: false, reason: "not-assigned" });
  });
});
