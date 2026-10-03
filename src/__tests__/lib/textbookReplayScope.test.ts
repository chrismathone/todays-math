// @vitest-environment node
/**
 * 재전송과 범위 — 끝난 요청이 같은 요청 번호로 다시 오면 서버는 일을 건너뛰고 그때의 결과를 돌려준다(멱등).
 * 그런데 **범위는 «그때»가 아니라 «지금»의 것**이다: 확인 · 배정을 끝낸 뒤 학생이 다른 교사의 반으로 옮겨 갔으면,
 * 같은 요청을 다시 보내도 그 학생의 글 · 메모 · 배정을 받아 가지 못해야 한다.
 *
 * 2026-10-03 독립 검수가 찾은 것: 확인(`reviewAttempt`)의 범위 검사가 멱등 기록의 «처음 한 번만 도는 자리» 안에만 있어
 * 재전송이 그것을 건너뛰었다. 배정 만들기 · 회수도 같은 꼴이었다. 여기서 그 넷을 잠근다.
 */
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
  revokeAssignment,
} from "@/lib/textbook/server/assignments";
import { createBook, updateBook } from "@/lib/textbook/server/books";
import {
  recordObservation,
  reviewAttempt,
} from "@/lib/textbook/server/conceptRows";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { captureItems, updateItem } from "@/lib/textbook/server/items";
import { saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";

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
  insertBranch,
  insertTeacher,
  pgliteTextbookDb,
  requestKey,
  sampleConfig,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let branchId: string;
let teacherA: TextbookActor;
let teacherB: TextbookActor;
const deps = fakePublishDeps();

const CONCEPT_KEY = "순환소수";

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  branchId = await insertBranch(pg);
  teacherA = await insertTeacher(pg, { branchId, name: "가 교사" });
  teacherB = await insertTeacher(pg, { branchId, name: "나 교사" });
}, 120_000);
afterAll(async () => {
  await pg.close();
});

async function refusal(run: Promise<unknown>): Promise<TextbookError> {
  try {
    await run;
  } catch (error) {
    if (error instanceof TextbookError) return error;
    throw error;
  }
  throw new Error("거절돼야 하는 요청이 통과했다");
}

async function classWithStudent(teacher: TextbookActor) {
  const classId = randomUUID();
  const studentId = randomUUID();
  await pg.query(
    `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at") VALUES ($1, $2, '반', '중2', '{}'::jsonb, $3)`,
    [classId, teacher.id, sqlNow()],
  );
  await pg.query(
    `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1, $2, '학생', $3)`,
    [studentId, classId, sqlNow()],
  );
  return { classId, studentId };
}

/** 학생이 다른 교사의 반으로 옮겨 간다 */
const moveStudent = (studentId: string, classId: string) =>
  pg.query(`UPDATE "student" SET "class_id" = $2 WHERE "id" = $1`, [
    studentId,
    classId,
  ]);

/** 굳은 개념 하나가 든 발행본 */
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
  let revision = (
    await saveSection(
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
    )
  ).aggregateRevision;
  const problem = await insertBankProblem(pg, world.unitId);
  const captured = await captureItems(
    db,
    owner,
    editionId,
    requestKey(owner, "capture"),
    {
      expectedRevision: revision,
      sectionId,
      source: { kind: "problems", problemIds: [problem.id] },
    },
    async () => null,
  );
  await pg.query(
    `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "body", "blank_items", "links", "mapping_version", "updated_at")
     VALUES ($1, $2, 'u1', '순환소수의 뜻', '정의', $3::jsonb, '[]'::jsonb, '[]'::jsonb, 'm1', $4)`,
    [
      editionId,
      CONCEPT_KEY,
      JSON.stringify({
        goal: "뜻을 말한다",
        prerequisites: [],
        definition: "같은 숫자 배열이 되풀이되는 무한소수",
        conditions: null,
        examples: [],
        counterexamples: [],
        misconceptions: [],
        explainPrompt: null,
      }),
      sqlNow(),
    ],
  );
  revision = (await getEditionDetail(db, owner, editionId)).edition.revision;
  revision = (
    await updateItem(
      db,
      owner,
      editionId,
      captured.items[0]!.itemId,
      requestKey(owner, "item-update"),
      { expectedRevision: revision, conceptKeys: [CONCEPT_KEY] },
    )
  ).aggregateRevision;
  const requestId = randomUUID();
  await reservePublish(
    db,
    owner,
    editionId,
    { requestId, expectedRevision: revision },
    fakeHash(requestId),
    deps,
  );
  let job = await runNextStep(db, owner, editionId, requestId, deps);
  for (let guard = 0; guard < 20 && job.status !== "ready"; guard++)
    job = await runNextStep(db, owner, editionId, requestId, deps);
  await finalizePublish(db, owner, editionId, requestId, deps);
  return { bookId: book.id, editionId };
}

describe("끝난 요청의 재전송도 지금의 범위로 본다", () => {
  it("확인한 뒤 학생이 다른 교사의 반으로 가면, 같은 확인 요청을 다시 보내도 그 학생의 글을 받지 못한다", async () => {
    const book = await publishedBook(teacherA);
    const mine = await classWithStudent(teacherA);
    const theirs = await classWithStudent(teacherB);
    const observe = {
      requestId: randomUUID(),
      studentId: mine.studentId,
      form: "recall" as const,
      observation: "뜻을 스스로 말했다",
    };
    const { attempt } = await recordObservation(
      db,
      teacherA,
      book.editionId,
      CONCEPT_KEY,
      observe,
      canonicalHash(observe),
    );
    const key = requestKey(teacherA, "attempt-review");
    const review = {
      expectedRevision: attempt.revision,
      reviewStatus: "checked" as const,
      note: "교사만 보는 메모",
    };
    const first = await reviewAttempt(
      db,
      teacherA,
      attempt.attemptId,
      key,
      review,
    );
    expect(first).toMatchObject({
      replayed: false,
      attempt: { note: review.note },
    });
    // 같은 요청을 다시 보내면 그때의 결과다(학생이 아직 내 반이다)
    expect(
      await reviewAttempt(db, teacherA, attempt.attemptId, key, review),
    ).toMatchObject({ replayed: true, attempt: { note: review.note } });

    await moveStudent(mine.studentId, theirs.classId);
    const replay = await refusal(
      reviewAttempt(db, teacherA, attempt.attemptId, key, review),
    );
    expect(replay.status).toBe(404);
    // 관찰 기록의 재전송도 같다
    expect(
      (
        await refusal(
          recordObservation(
            db,
            teacherA,
            book.editionId,
            CONCEPT_KEY,
            observe,
            canonicalHash(observe),
          ),
        )
      ).status,
    ).toBe(404);
    // 줄은 그대로다 — 재전송이 무엇도 바꾸지 않았다
    const row = await pg.query<{ revision: number; note: string }>(
      `SELECT "revision", "note" FROM "textbook_concept_attempt" WHERE "id" = $1`,
      [attempt.attemptId],
    );
    expect(row.rows).toEqual([
      { revision: first.attempt.revision, note: review.note },
    ]);
  });

  it("배정한 뒤 학생이 옮겨 가면 같은 배정 요청 · 회수 요청의 재전송은 404 다", async () => {
    const book = await publishedBook(teacherA);
    const mine = await classWithStudent(teacherA);
    const theirs = await classWithStudent(teacherB);
    const input = {
      subject: { kind: "student" as const, studentId: mine.studentId },
      scope: { kind: "edition" as const },
      startsAt: "2026-10-01T00:00:00.000Z",
      expiresAt: null,
    };
    const createKey = requestKey(teacherA, "assign");
    const created = await createAssignment(
      db,
      teacherA,
      book.editionId,
      createKey,
      input,
    );
    expect(
      await createAssignment(db, teacherA, book.editionId, createKey, input),
    ).toMatchObject({
      replayed: true,
      assignment: { id: created.assignment.id },
    });
    const revokeKey = requestKey(teacherA, "assign-revoke");
    await revokeAssignment(
      db,
      teacherA,
      book.editionId,
      created.assignment.id,
      revokeKey,
    );
    expect(
      await revokeAssignment(
        db,
        teacherA,
        book.editionId,
        created.assignment.id,
        revokeKey,
      ),
    ).toMatchObject({ replayed: true });

    await moveStudent(mine.studentId, theirs.classId);
    expect(
      (
        await refusal(
          createAssignment(db, teacherA, book.editionId, createKey, input),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await refusal(
          revokeAssignment(
            db,
            teacherA,
            book.editionId,
            created.assignment.id,
            revokeKey,
          ),
        )
      ).status,
    ).toBe(404);
  });

  it("공유본으로 배정한 동료 — 공유가 닫히면 같은 배정 요청의 재전송은 404 다", async () => {
    const book = await publishedBook(teacherA);
    await updateBook(
      db,
      teacherA,
      book.bookId,
      requestKey(teacherA, "book-update"),
      {
        visibility: "branch",
      },
    );
    const theirs = await classWithStudent(teacherB);
    const input = {
      subject: { kind: "class" as const, classId: theirs.classId },
      scope: { kind: "edition" as const },
      startsAt: "2026-10-01T00:00:00.000Z",
      expiresAt: null,
    };
    const key = requestKey(teacherB, "assign");
    await createAssignment(db, teacherB, book.editionId, key, input);
    await updateBook(
      db,
      teacherA,
      book.bookId,
      requestKey(teacherA, "book-update"),
      {
        visibility: "private",
      },
    );
    expect(
      (
        await refusal(
          createAssignment(db, teacherB, book.editionId, key, input),
        )
      ).status,
    ).toBe(404);
  });
});
