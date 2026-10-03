// @vitest-environment node
/** Actual product SQL and the full migration chain. PGlite does not model concurrent connections. */
import { randomUUID } from "node:crypto";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const srs = vi.hoisted(() => ({ read: vi.fn(), change: vi.fn() }));
vi.mock("server-only", () => ({}));
// Any unexpected SRS side effect fails rather than reaching the application database.
vi.mock("@/lib/math-srs/serverStore", () => ({
  readSrsState: srs.read,
  changeSrsState: srs.change,
}));

import {
  textbookConceptSchema,
  type TextbookConcept,
} from "@/contracts/textbookConcept.contract";
import { textbookStudentAttemptSchema } from "@/contracts/textbookStudent.contract";
import { emptySrsState } from "@/lib/math-srs/serverState";
import { canonicalHash, conceptContentHash } from "@/lib/textbook/hash.server";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import {
  listStudentConceptAttempts,
  submitStudentConceptAttempt,
} from "@/lib/textbook/studentAttempts";
import {
  type Db,
  draftWithContent,
  fakeHash,
  finalizePublish,
  insertQr,
  openTextbookDb,
  reservePublish,
  runSteps,
  seedWorld,
  sqlNow,
} from "../helpers/textbookPglite";
import { pgliteTextbookDb } from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
}, 120_000);
afterAll(async () => {
  await pg?.close();
});
beforeEach(() => {
  srs.read.mockReset().mockImplementation(() => {
    throw new Error("A blank submission must not read SRS");
  });
  srs.change.mockReset().mockImplementation(() => {
    throw new Error("A blank submission must not change SRS");
  });
});

function frozenConcept(
  conceptKey: string,
  sectionKey: string,
): TextbookConcept {
  const blankSectionKey = "초5::분수::통분";
  const concept = textbookConceptSchema.parse({
    conceptKey,
    unitKey: "u1",
    sectionKey,
    title: "통분",
    kind: "방법",
    unitId: null,
    body: {
      goal: "뜻을 설명한다",
      prerequisites: [],
      definition: "교재에서 고정한 설명",
      conditions: null,
      examples: [],
      counterexamples: [],
      misconceptions: [],
      explainPrompt: null,
    },
    blankItems: [],
    links: [],
    mappingVersion: "1",
    derivedFromConceptKey: null,
    frozen: {
      contentHash: "0".repeat(64),
      parserVersion: "1",
      compositionVersion: "1",
      mappingVersion: "1",
      sections: [{ blankSectionKey, title: "통분", unitLabel: "분수" }],
      entries: [
        {
          entryKind: "concept",
          payload: {
            id: "sql-frozen-entry",
            section: blankSectionKey,
            term: "통분",
            kind: "방법",
            level: "하",
            definition: "분모를 {같게} 만드는 방법입니다.",
          },
        },
      ],
      selection: ["cloze", "term"].map((form) => ({
        blankSectionKey,
        entryKind: "concept",
        entryId: "sql-frozen-entry",
        form,
        level: "하",
      })),
      assetHashes: [],
    },
  });
  concept.frozen!.contentHash = conceptContentHash(concept);
  return concept;
}

/** Seed a valid frozen concept before publishing; do not replace production read/access SQL. */
async function fixture() {
  const world = await seedWorld(pg);
  await pg.query(
    `UPDATE "user" SET "approval_status" = 'approved', "branch_id" = $1::uuid WHERE "id" IN ($2::uuid, $3::uuid)`,
    [world.branchId, world.userA, world.userB],
  );
  const draft = await draftWithContent(pg, world);
  const section = await pg.query<{ section_key: string }>(
    `SELECT "section_key" FROM "textbook_section" WHERE "id" = $1::uuid`,
    [draft.sectionId],
  );
  const concept = frozenConcept(draft.conceptKey, section.rows[0]!.section_key);
  await pg.query(
    `UPDATE "textbook_concept" SET "title" = $3::text, "kind" = $4::text, "body" = $5::jsonb,
      "blank_items" = $6::jsonb, "links" = $7::jsonb, "mapping_version" = $8::text, "frozen" = $9::jsonb
      WHERE "edition_id" = $1::uuid AND "concept_key" = $2::text`,
    [
      draft.editionId,
      draft.conceptKey,
      concept.title,
      concept.kind,
      JSON.stringify(concept.body),
      JSON.stringify(concept.blankItems),
      JSON.stringify(concept.links),
      concept.mappingVersion,
      JSON.stringify(concept.frozen),
    ],
  );
  const qr = await insertQr(pg, {
    editionId: draft.editionId,
    conceptKey: draft.conceptKey,
  });
  const plan = await reservePublish(pg, draft);
  await runSteps(pg, draft, plan);
  await pg.query(
    `UPDATE "textbook_qr_target" SET "state" = 'active', "activated_at" = $2 WHERE "id" = $1::uuid`,
    [qr.id, sqlNow()],
  );
  await finalizePublish(pg, draft, plan, ["concept"]);
  const assignmentId = await assign(draft.editionId, world.userA, {
    studentId: world.studentA,
  });
  return { ...world, ...draft, concept, qrId: qr.id, assignmentId };
}
type Fixture = Awaited<ReturnType<typeof fixture>>;

async function assign(
  editionId: string,
  ownerId: string,
  target: { studentId?: string; classId?: string },
) {
  const id = randomUUID();
  await pg.query(
    `INSERT INTO "textbook_assignment" ("id", "edition_id", "class_id", "student_id", "scope_kind", "opens_at", "assigned_by")
    VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'edition', (now() AT TIME ZONE 'UTC') - interval '2 days', $5::uuid)`,
    [id, editionId, target.classId ?? null, target.studentId ?? null, ownerId],
  );
  return id;
}

async function studentIn(classId: string) {
  const id = randomUUID();
  await pg.query(
    `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1::uuid, $2::uuid, '다른 학생', $3)`,
    [id, classId, sqlNow()],
  );
  return id;
}

async function classFor(ownerId: string) {
  const id = randomUUID();
  await pg.query(
    `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at") VALUES ($1::uuid, $2::uuid, '다른 반', '중2', '{}'::jsonb, $3)`,
    [id, ownerId, sqlNow()],
  );
  return id;
}

const input = (response = "  분모를 같게 합니다.\r\n가  ") => ({
  requestId: randomUUID(),
  form: "cloze" as const,
  response,
});
const send = (f: Fixture, body = input(), studentId = f.studentA) =>
  submitStudentConceptAttempt(db, studentId, f.editionId, f.conceptKey, body);
const list = (f: Fixture, studentId = f.studentA) =>
  listStudentConceptAttempts(db, studentId, f.editionId, f.conceptKey);
async function countAttempts(editionId: string) {
  return (
    await pg.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "textbook_concept_attempt" WHERE "edition_id" = $1::uuid`,
      [editionId],
    )
  ).rows[0]!.count;
}

describe("학생 개념백지 제출 — 실제 Postgres SQL", () => {
  it("같은 요청은 한 행만 남기고 원문·고정 해시·제출 시각을 그대로 재생한다", async () => {
    const f = await fixture();
    const body = input();
    const first = await send(f, body);
    const again = await send(f, body);
    expect(first.replayed).toBe(false);
    expect(again).toEqual({ attempt: first.attempt, replayed: true });
    expect(first.attempt.response).toBe(body.response);
    expect(first.attempt.reviewStatus).toBe("pending");
    expect(await countAttempts(f.editionId)).toBe(1);
    const saved = (
      await pg.query<{
        response: string;
        body_hash: string;
        frozen_hash: string;
        revision: number;
        recorded_by: string | null;
      }>(
        `SELECT "response", "body_hash", "frozen_hash", "revision", "recorded_by" FROM "textbook_concept_attempt" WHERE "id" = $1::uuid`,
        [first.attempt.attemptId],
      )
    ).rows[0]!;
    expect(saved).toEqual({
      response: body.response,
      body_hash: canonicalHash({
        editionId: f.editionId,
        conceptKey: f.conceptKey,
        frozenHash: f.concept.frozen!.contentHash,
        form: body.form,
        response: body.response,
        channel: "student-text",
      }),
      frozen_hash: f.concept.frozen!.contentHash,
      revision: 1,
      recorded_by: null,
    });
    expect(await list(f)).toEqual([first.attempt]);
  });

  it.each(["response", "form"] as const)(
    "같은 요청 번호의 %s 변경은 409이고 기존 행을 덮어쓰지 않는다",
    async (field) => {
      const f = await fixture();
      const body = input();
      const first = await send(f, body);
      const changed =
        field === "response"
          ? { ...body, response: body.response.normalize("NFC") }
          : { ...body, form: "term" as const };
      await expect(
        submitStudentConceptAttempt(
          db,
          f.studentA,
          f.editionId,
          f.conceptKey,
          changed,
        ),
      ).rejects.toMatchObject({ status: 409, code: "CONFLICT" });
      expect(await countAttempts(f.editionId)).toBe(1);
      expect(await list(f)).toEqual([first.attempt]);
    },
  );

  it("다른 판본에도 배정되어 있어도 같은 요청 번호를 그 판본에 재사용할 수 없다", async () => {
    const f = await fixture();
    const other = await fixture();
    // Establish a legitimate shared branch scope and an explicit assignment to the second edition.
    const body = input();
    const first = await send(f, body);
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2::uuid WHERE "id" = $1::uuid`,
      [other.bookId, other.branchId],
    );
    await pg.query(
      `UPDATE "user" SET "branch_id" = $2::uuid WHERE "id" = $1::uuid`,
      [f.userA, other.branchId],
    );
    await assign(other.editionId, other.userA, { studentId: f.studentA });
    await expect(send(other, body, f.studentA)).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });
    expect(await countAttempts(other.editionId)).toBe(0);
    expect(
      (
        await pg.query<{ response: string }>(
          `SELECT "response" FROM "textbook_concept_attempt" WHERE "id" = $1::uuid`,
          [first.attempt.attemptId],
        )
      ).rows[0]!.response,
    ).toBe(body.response);
  });

  it.each(["revoked", "expired"] as const)(
    "기존 요청을 재생하기 전 현재 배정의 %s 상태를 다시 확인한다",
    async (state) => {
      const f = await fixture();
      const body = input();
      await send(f, body);
      if (state === "revoked")
        await pg.query(
          `UPDATE "textbook_assignment" SET "revoked_at" = (now() AT TIME ZONE 'UTC') WHERE "id" = $1::uuid`,
          [f.assignmentId],
        );
      else
        await pg.query(
          `UPDATE "textbook_assignment" SET "expires_at" = (now() AT TIME ZONE 'UTC') - interval '1 day' WHERE "id" = $1::uuid`,
          [f.assignmentId],
        );
      await expect(send(f, body)).rejects.toMatchObject({
        status: 403,
        code: "FORBIDDEN",
      });
      await expect(list(f)).rejects.toMatchObject({ status: 403 });
      expect(await countAttempts(f.editionId)).toBe(1);
    },
  );

  it("현재 반을 옮긴 학생은 이전 반 배정으로 제출을 재생하거나 읽지 못한다", async () => {
    const f = await fixture();
    await pg.query(
      `UPDATE "textbook_assignment" SET "revoked_at" = (now() AT TIME ZONE 'UTC') WHERE "id" = $1::uuid`,
      [f.assignmentId],
    );
    await assign(f.editionId, f.userA, { classId: f.classA });
    const body = input();
    await send(f, body);
    await pg.query(
      `UPDATE "student" SET "class_id" = $2::uuid WHERE "id" = $1::uuid`,
      [f.studentA, await classFor(f.userA)],
    );
    await expect(send(f, body)).rejects.toMatchObject({ status: 403 });
    await expect(list(f)).rejects.toMatchObject({ status: 403 });
    expect(await countAttempts(f.editionId)).toBe(1);
  });

  it("개인 배정은 같은 반의 다른 학생에게 새지 않고 같은 requestId도 학생별로 구분된다", async () => {
    const f = await fixture();
    const peer = await studentIn(f.classA);
    const body = input("첫 학생의 답");
    const first = await send(f, body);
    await expect(list(f, peer)).rejects.toMatchObject({ status: 403 });
    await expect(send(f, body, peer)).rejects.toMatchObject({ status: 403 });
    await assign(f.editionId, f.userA, { studentId: peer });
    expect(await list(f, peer)).toEqual([]);
    const second = await send(f, { ...body, response: "다른 학생의 답" }, peer);
    expect(second.replayed).toBe(false);
    expect(second.attempt.attemptId).not.toBe(first.attempt.attemptId);
    expect(await list(f)).toEqual([first.attempt]);
    expect(await list(f, peer)).toEqual([second.attempt]);
    expect(await countAttempts(f.editionId)).toBe(2);
  });

  it("배정 행이 있어도 다른 소유자의 비공개 책은 읽거나 제출할 수 없다", async () => {
    const f = await fixture();
    const outsider = await studentIn(await classFor(f.userB));
    await assign(f.editionId, f.userA, { studentId: outsider });
    await expect(send(f, input(), outsider)).rejects.toMatchObject({
      status: 403,
    });
    await expect(list(f, outsider)).rejects.toMatchObject({ status: 403 });
    expect(await countAttempts(f.editionId)).toBe(0);
  });

  it("지점 공유로 허용됐던 제출도 반 소유자의 지점이 바뀌면 재생하지 않는다", async () => {
    const f = await fixture();
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2::uuid WHERE "id" = $1::uuid`,
      [f.bookId, f.branchId],
    );
    const peer = await studentIn(await classFor(f.userB));
    await assign(f.editionId, f.userA, { studentId: peer });
    const body = input();
    await send(f, body, peer);
    await pg.query(
      `UPDATE "user" SET "branch_id" = NULL WHERE "id" = $1::uuid`,
      [f.userB],
    );
    await expect(send(f, body, peer)).rejects.toMatchObject({ status: 403 });
    await expect(list(f, peer)).rejects.toMatchObject({ status: 403 });
    expect(await countAttempts(f.editionId)).toBe(1);
  });

  it.each(["owner", "qr"] as const)(
    "%s 제공이 중지되면 기존 성공 요청도 학생에게 반환하지 않는다",
    async (scope) => {
      const f = await fixture();
      const body = input();
      await send(f, body);
      if (scope === "owner")
        await pg.query(
          `UPDATE "user" SET "suspended_at" = $2 WHERE "id" = $1::uuid`,
          [f.userA, sqlNow()],
        );
      else
        await pg.query(
          `UPDATE "textbook_qr_target" SET "suspended_at" = $2 WHERE "id" = $1::uuid`,
          [f.qrId, sqlNow()],
        );
      await expect(send(f, body)).rejects.toMatchObject({ status: 410 });
      await expect(list(f)).rejects.toMatchObject({ status: 410 });
      expect(await countAttempts(f.editionId)).toBe(1);
    },
  );

  it("빈 답과 고정 선택에 없는 형식은 활동 행을 만들지 않는다", async () => {
    const f = await fixture();
    await expect(send(f, input(" \r\n\t"))).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      submitStudentConceptAttempt(db, f.studentA, f.editionId, f.conceptKey, {
        ...input(),
        form: "recall",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(await countAttempts(f.editionId)).toBe(0);
  });

  it("백지 저장·재생·조회가 ProblemAnswer나 학습 기록을 생성하거나 바꾸지 않는다", async () => {
    const f = await fixture();
    const untouched = emptySrsState();
    await pg.query(
      `INSERT INTO "student_srs_state" ("student_id", "revision", "payload", "updated_at") VALUES ($1::uuid, 7, $2::jsonb, $3)`,
      [f.studentA, JSON.stringify(untouched), sqlNow()],
    );
    const before = await pg.query(
      `SELECT * FROM "student_srs_state" WHERE "student_id" = $1::uuid`,
      [f.studentA],
    );
    const beforeAnswers = await pg.query(`SELECT * FROM "problem_answer"`);
    const body = input();
    await send(f, body);
    await send(f, body);
    await list(f);
    const freshStudent = await studentIn(f.classA);
    await assign(f.editionId, f.userA, { studentId: freshStudent });
    await send(f, input(), freshStudent);
    expect(
      (
        await pg.query(
          `SELECT * FROM "student_srs_state" WHERE "student_id" = $1::uuid`,
          [f.studentA],
        )
      ).rows,
    ).toEqual(before.rows);
    expect(
      (
        await pg.query(
          `SELECT * FROM "student_srs_state" WHERE "student_id" = $1::uuid`,
          [freshStudent],
        )
      ).rows,
    ).toEqual([]);
    expect((await pg.query(`SELECT * FROM "problem_answer"`)).rows).toEqual(
      beforeAnswers.rows,
    );
    expect(srs.read).not.toHaveBeenCalled();
    expect(srs.change).not.toHaveBeenCalled();
  });

  it("교사의 원 관찰문·확인 메모와 내부 식별자는 학생 목록·재시도 응답에 나오지 않는다", async () => {
    const f = await fixture();
    const body = input("학생이 쓴 공개 응답");
    const first = await send(f, body);
    const observedId = randomUUID();
    await pg.query(
      `INSERT INTO "textbook_concept_attempt" ("id", "edition_id", "concept_key", "student_id", "request_id", "body_hash", "frozen_hash", "form", "channel", "response", "recorded_by")
      VALUES ($1::uuid, $2::uuid, $3::text, $4::uuid, $5::uuid, $6::text, $7::text, 'figure', 'teacher-observed', 'TEACHER_OBSERVATION_CANARY', $8::uuid)`,
      [
        observedId,
        f.editionId,
        f.conceptKey,
        f.studentA,
        randomUUID(),
        fakeHash(observedId),
        f.concept.frozen!.contentHash,
        f.userA,
      ],
    );
    await pg.query(
      `UPDATE "textbook_concept_attempt" SET "review_status" = 'checked', "reviewed_by" = $3::uuid, "reviewed_at" = $4, "note" = 'TEACHER_PRIVATE_NOTE_CANARY', "revision" = 2 WHERE "id" IN ($1::uuid, $2::uuid)`,
      [first.attempt.attemptId, observedId, f.userA, sqlNow()],
    );
    const attempts = await list(f);
    expect(attempts).toHaveLength(2);
    const observed = attempts.find(
      (attempt) => attempt.attemptId === observedId,
    )!;
    expect(observed).toMatchObject({
      form: "figure",
      channel: "teacher-observed",
      response: null,
      reviewStatus: "checked",
    });
    const replay = await send(f, body);
    expect(replay).toMatchObject({
      replayed: true,
      attempt: {
        attemptId: first.attempt.attemptId,
        response: body.response,
        reviewStatus: "checked",
      },
    });
    for (const attempt of [...attempts, replay.attempt]) {
      textbookStudentAttemptSchema.parse(attempt);
      expect(Object.keys(attempt).sort()).toEqual(
        [
          "attemptId",
          "channel",
          "form",
          "response",
          "reviewStatus",
          "submittedAt",
        ].sort(),
      );
    }
    const publicJson = JSON.stringify({ attempts, replay });
    expect(publicJson).not.toMatch(
      /TEACHER_OBSERVATION_CANARY|TEACHER_PRIVATE_NOTE_CANARY/,
    );
    expect(publicJson).not.toContain(f.concept.frozen!.contentHash);
    expect(publicJson).not.toContain(f.studentA);
    expect(publicJson).not.toContain(f.userA);
    expect(await countAttempts(f.editionId)).toBe(2);
  });
});
