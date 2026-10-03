// @vitest-environment node
/**
 * 교재 표 — 요청 멱등 · 조판 걸음 임대 · 영상 검수 · 배정 · 백지 활동 · 보관본 · 시험지의 확정본 칸
 * (PGlite, 실제 마이그레이션 사슬). 끝에 **DDL 의 값 목록 ↔ 계약** 대조가 있다.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  textbookArtifactSchema,
  textbookAssignmentScopeSchema,
} from "@/contracts/textbook.contract";
import {
  textbookConceptAttemptSchema,
  textbookConceptSchema,
} from "@/contracts/textbookConcept.contract";
import {
  textbookAssetSchema,
  textbookEditionSchema,
  textbookLearningStageSchema,
  textbookLinkStatusSchema,
  textbookSourceRefSchema,
  textbookVideoBindingSchema,
} from "@/contracts/textbookExchange.contract";
import {
  textbookCanonicalizationVersion,
  textbookFormSchema,
  textbookVersion,
} from "@/contracts/textbookPrimitives.contract";

import {
  type Db,
  type World,
  draftWithContent,
  fakeHash,
  insertBlob,
  insertProblem,
  insertSnapshot,
  openTextbookDb,
  publishedEdition,
  rejected,
  reservePublish,
  runSteps,
  seedWorld,
  sqlNow,
  uuid,
} from "../helpers/textbookPglite";

let db: Db;
let world: World;

beforeAll(async () => {
  db = await openTextbookDb();
  world = await seedWorld(db);
}, 120_000);
afterAll(async () => {
  await db.close();
});

const insertRequest = (
  userId: string,
  requestId: string,
  operation: string,
  editionId: string | null,
  bodyHash = fakeHash(requestId),
) =>
  db.query(
    `INSERT INTO "textbook_request" ("user_id", "request_id", "operation", "edition_id", "state", "base_revision", "body_hash", "updated_at")
     VALUES ($1, $2, $3, $4, 'open', 1, $5, $6)`,
    [userId, requestId, operation, editionId, bodyHash, sqlNow()],
  );

describe("요청 기록 — 한 번만 만든다", () => {
  it("같은 (계정, requestId) 는 한 줄이다", async () => {
    const requestId = uuid();
    await insertRequest(world.userA, requestId, "capture", null);
    const error = await rejected(
      insertRequest(world.userA, requestId, "capture", null),
    );
    expect(error.code).toBe("23505");
    // 다른 계정은 같은 id 를 쓸 수 있다 — 남의 요청을 가로채지 못한다
    await insertRequest(world.userB, requestId, "capture", null);
  });

  it("판본마다 열린 발행 요청은 하나다", async () => {
    const draft = await draftWithContent(db, world);
    await insertRequest(world.userA, uuid(), "publish", draft.editionId);
    const error = await rejected(
      insertRequest(world.userA, uuid(), "publish", draft.editionId),
    );
    expect(error.code).toBe("23505");
    expect(error.message).toContain("textbook_request_one_open_publish");
    // 발행이 아닌 요청은 여럿이어도 된다
    await insertRequest(world.userA, uuid(), "capture", draft.editionId);
    await insertRequest(world.userA, uuid(), "capture", draft.editionId);
  });

  it("버린 뒤에는 새 발행 요청을 열 수 있다", async () => {
    const draft = await draftWithContent(db, world);
    const first = uuid();
    await insertRequest(world.userA, first, "publish", draft.editionId);
    await db.query(
      `UPDATE "textbook_request" SET "state" = 'abandoned' WHERE "user_id" = $1 AND "request_id" = $2`,
      [world.userA, first],
    );
    await insertRequest(world.userA, uuid(), "publish", draft.editionId);
  });

  it("본문 해시 · 연산 · 대상 판본을 못 바꾼다", async () => {
    const draft = await draftWithContent(db, world);
    const requestId = uuid();
    await insertRequest(world.userA, requestId, "capture", draft.editionId);
    for (const set of [
      `"body_hash" = '${"c".repeat(64)}'`,
      `"operation" = 'publish'`,
      `"base_revision" = 7`,
    ]) {
      const error = await rejected(
        db.query(
          `UPDATE "textbook_request" SET ${set} WHERE "user_id" = $1 AND "request_id" = $2`,
          [world.userA, requestId],
        ),
      );
      expect(error.message, set).toContain(
        "identity and body hash are immutable",
      );
    }
  });

  it("끝난 요청의 결과는 안 바뀐다 · 결과 없이 끝낼 수 없다", async () => {
    const requestId = uuid();
    await insertRequest(world.userA, requestId, "capture", null);
    const noResult = await rejected(
      db.query(
        `UPDATE "textbook_request" SET "state" = 'done' WHERE "user_id" = $1 AND "request_id" = $2`,
        [world.userA, requestId],
      ),
    );
    expect(noResult.message).toContain("textbook_request_done_result");
    await db.query(
      `UPDATE "textbook_request" SET "state" = 'done', "result" = '{"items": 2}'::jsonb WHERE "user_id" = $1 AND "request_id" = $2`,
      [world.userA, requestId],
    );
    for (const set of [
      `"result" = '{"items": 99}'::jsonb`,
      `"state" = 'open'`,
    ]) {
      const error = await rejected(
        db.query(
          `UPDATE "textbook_request" SET ${set} WHERE "user_id" = $1 AND "request_id" = $2`,
          [world.userA, requestId],
        ),
      );
      expect(error.message, set).toContain("is closed");
    }
  });

  it("끝난 발행 요청은 지우지 못한다 (조각 PDF 가 거기 달려 있다)", async () => {
    const published = await publishedEdition(db, world);
    const error = await rejected(
      db.query(
        `DELETE FROM "textbook_request" WHERE "user_id" = $1 AND "request_id" = $2`,
        [world.userA, published.plan.requestId],
      ),
    );
    expect(error.message).toContain("is permanent");
  });
});

describe("조판 걸음 — 임대는 한 요청만 잡는다", () => {
  const claim = (userId: string, requestId: string, idx: number) =>
    db.query(
      `UPDATE "textbook_publish_step"
          SET "state" = 'running', "attempts" = "attempts" + 1, "lease_until" = $4, "lease_token" = $5, "updated_at" = $4
        WHERE "user_id" = $1 AND "request_id" = $2 AND "idx" = $3 AND "state" = 'queued'`,
      [userId, requestId, idx, sqlNow(), uuid()],
    );

  it("같은 걸음을 두 번 잡으면 둘째는 0행이다", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    expect((await claim(world.userA, plan.requestId, 0)).affectedRows).toBe(1);
    expect((await claim(world.userA, plan.requestId, 0)).affectedRows).toBe(0);
  });

  it("임대 없이 running 으로 못 간다 · 바이트 없이 done 으로 못 간다", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    const noLease = await rejected(
      db.query(
        `UPDATE "textbook_publish_step" SET "state" = 'running' WHERE "request_id" = $1 AND "idx" = 0`,
        [plan.requestId],
      ),
    );
    expect(noLease.message).toContain("textbook_publish_step_running_lease");
    const noBytes = await rejected(
      db.query(
        `UPDATE "textbook_publish_step" SET "state" = 'done', "result" = '{}'::jsonb, "page_count" = 1, "first_page_index" = 1
          WHERE "request_id" = $1 AND "idx" = 0`,
        [plan.requestId],
      ),
    );
    expect(noBytes.message).toContain("textbook_publish_step_done_result");
  });

  it("없는 바이트의 해시로는 끝낼 수 없다 — 클라이언트가 해시만 보내 끝낼 수 없다", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    const error = await rejected(
      db.query(
        `UPDATE "textbook_publish_step" SET "state" = 'done', "sha256" = $2, "result" = '{}'::jsonb, "page_count" = 1, "first_page_index" = 1
          WHERE "request_id" = $1 AND "idx" = 0`,
        [plan.requestId, fakeHash("bytes that were never stored")],
      ),
    );
    expect(error.code).toBe("23503");
  });

  it("끝난 걸음은 안 바뀐다 · 무엇을 조판할지는 예약 때 정해진다", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    const planChange = await rejected(
      db.query(
        `UPDATE "textbook_publish_step" SET "section_ids" = '[]'::jsonb WHERE "request_id" = $1 AND "idx" = 0`,
        [plan.requestId],
      ),
    );
    expect(planChange.message).toContain("plan is immutable");
    await runSteps(db, draft, plan);
    const other = await insertBlob(db, Buffer.from("swapped pdf"));
    const swap = await rejected(
      db.query(
        `UPDATE "textbook_publish_step" SET "sha256" = $2 WHERE "request_id" = $1 AND "idx" = 0`,
        [plan.requestId, other],
      ),
    );
    expect(swap.message).toContain("is immutable");
  });

  it("세 번을 넘겨 다시 잡지 못한다", async () => {
    const draft = await draftWithContent(db, world);
    const plan = await reservePublish(db, draft);
    const error = await rejected(
      db.query(
        `UPDATE "textbook_publish_step" SET "attempts" = 4 WHERE "request_id" = $1 AND "idx" = 0`,
        [plan.requestId],
      ),
    );
    expect(error.message).toContain("textbook_publish_step_attempts_check");
  });
});

describe("영상 연결 — 검수한 것만 게시된다", () => {
  async function binding(owner = world.userA) {
    const snapshot = await insertSnapshot(db, {
      userId: owner,
      problem: world.problem1,
      snapshotSeed: uuid(),
    });
    const videoId = uuid();
    await db.query(
      `INSERT INTO "textbook_video" ("id", "user_id", "provider", "provider_video_id", "title", "updated_at")
       VALUES ($1, $2, 'youtube', $3, '풀이', $4)`,
      [videoId, owner, uuid().replaceAll("-", "").slice(0, 11), sqlNow()],
    );
    const id = uuid();
    await db.query(
      `INSERT INTO "textbook_video_binding" ("id", "user_id", "snapshot_id", "video_id") VALUES ($1, $2, $3, $4)`,
      [id, owner, snapshot.id, videoId],
    );
    return { id, snapshot, videoId };
  }
  const publish = (
    id: string,
    hash: string,
    reviewer: string | null = world.userA,
  ) =>
    db.query(
      `UPDATE "textbook_video_binding"
          SET "status" = 'published', "reviewed_against_hash" = $2, "reviewed_by" = $3, "reviewed_at" = $4, "published_at" = $4
        WHERE "id" = $1`,
      [id, hash, reviewer, sqlNow()],
    );
  const toReview = (id: string) =>
    db.query(
      `UPDATE "textbook_video_binding" SET "status" = 'review' WHERE "id" = $1`,
      [id],
    );

  it("검수를 건너뛰고 게시하지 못한다", async () => {
    const b = await binding();
    const error = await rejected(publish(b.id, b.snapshot.contentHash));
    expect(error.message).toContain("must be reviewed before it is published");
  });

  it("처음부터 게시 상태로 넣지 못한다", async () => {
    const b = await binding();
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_video_binding" ("id", "user_id", "snapshot_id", "video_id", "status", "reviewed_against_hash", "reviewed_at", "published_at")
         VALUES ($1, $2, $3, $4, 'published', $5, $6, $6)`,
        [
          uuid(),
          world.userA,
          b.snapshot.id,
          b.videoId,
          b.snapshot.contentHash,
          sqlNow(),
        ],
      ),
    );
    expect(error.message).toContain("must start as a draft");
  });

  it("다른 내용의 해시로 검수했으면 게시하지 못한다", async () => {
    const b = await binding();
    await toReview(b.id);
    const error = await rejected(publish(b.id, fakeHash("stale content")));
    expect(error.message).toContain("was not reviewed against this snapshot");
  });

  it("검수자 없이 게시하지 못한다", async () => {
    const b = await binding();
    await toReview(b.id);
    const error = await rejected(publish(b.id, b.snapshot.contentHash, null));
    expect(error.message).toContain("was not reviewed against this snapshot");
  });

  it("맞는 해시로 검수하면 게시된다. 게시 뒤에는 구간을 못 고치고 중지만 된다", async () => {
    const b = await binding();
    await toReview(b.id);
    await publish(b.id, b.snapshot.contentHash);
    const edit = await rejected(
      db.query(
        `UPDATE "textbook_video_binding" SET "start_seconds" = 30 WHERE "id" = $1`,
        [b.id],
      ),
    );
    expect(edit.message).toContain("is immutable");
    const back = await rejected(
      db.query(
        `UPDATE "textbook_video_binding" SET "status" = 'draft' WHERE "id" = $1`,
        [b.id],
      ),
    );
    expect(back.message).toContain("can only be withdrawn");
    const gone = await rejected(
      db.query(`DELETE FROM "textbook_video_binding" WHERE "id" = $1`, [b.id]),
    );
    expect(gone.message).toContain("kept as history");
    await db.query(
      `UPDATE "textbook_video_binding" SET "status" = 'withdrawn', "withdrawn_at" = $2 WHERE "id" = $1`,
      [b.id, sqlNow()],
    );
    const revive = await rejected(
      db.query(
        `UPDATE "textbook_video_binding" SET "status" = 'published', "withdrawn_at" = NULL WHERE "id" = $1`,
        [b.id],
      ),
    );
    expect(revive.message).toContain("is final");
  });

  it("게시 영상은 확정본당 하나다", async () => {
    const a = await binding();
    await toReview(a.id);
    await publish(a.id, a.snapshot.contentHash);
    const second = uuid();
    await db.query(
      `INSERT INTO "textbook_video_binding" ("id", "user_id", "snapshot_id", "video_id") VALUES ($1, $2, $3, $4)`,
      [second, world.userA, a.snapshot.id, a.videoId],
    );
    await toReview(second);
    const error = await rejected(publish(second, a.snapshot.contentHash));
    expect(error.code).toBe("23505");
    expect(error.message).toContain("textbook_video_binding_one_published");
  });

  it("검수한 영상의 정체는 안 바뀐다 (제목만 바뀐다)", async () => {
    const b = await binding();
    await db.query(
      `UPDATE "textbook_video" SET "title" = '새 제목' WHERE "id" = $1`,
      [b.videoId],
    );
    const error = await rejected(
      db.query(
        `UPDATE "textbook_video" SET "provider_video_id" = 'AAAAAAAAAAA' WHERE "id" = $1`,
        [b.videoId],
      ),
    );
    expect(error.message).toContain("provider identity is immutable");
  });

  it("끝이 시작보다 앞이면 거절 · 영상 id 모양이 아니면 거절", async () => {
    const b = await binding();
    const range = await rejected(
      db.query(
        `UPDATE "textbook_video_binding" SET "start_seconds" = 50, "end_seconds" = 40 WHERE "id" = $1`,
        [b.id],
      ),
    );
    expect(range.code).toBe("23514");
    const badId = await rejected(
      db.query(
        `INSERT INTO "textbook_video" ("id", "user_id", "provider", "provider_video_id", "title", "updated_at")
         VALUES ($1, $2, 'youtube', 'ab/cd?e=f.g', '풀이', $3)`,
        [uuid(), world.userA, sqlNow()],
      ),
    );
    expect(badId.code).toBe("23514");
    expect(badId.message).toContain("textbook_video_provider_video_id_check");
  });
});

describe("배정 — 발행본에만 건다", () => {
  const assign = (
    editionId: string,
    target: { classId?: string | null; studentId?: string | null },
    scope: { kind: string; ids: string[] } = { kind: "edition", ids: [] },
  ) => {
    const id = uuid();
    return db
      .query(
        `INSERT INTO "textbook_assignment" ("id", "edition_id", "class_id", "student_id", "scope_kind", "scope_ids", "opens_at", "assigned_by")
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
        [
          id,
          editionId,
          target.classId ?? null,
          target.studentId ?? null,
          scope.kind,
          JSON.stringify(scope.ids),
          sqlNow(),
          world.userA,
        ],
      )
      .then(() => id);
  };

  it("초안에는 배정하지 못한다", async () => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(
      assign(draft.editionId, { classId: world.classA }),
    );
    expect(error.message).toContain("only a published edition can be assigned");
  });

  it("반 또는 학생 — 둘 다도, 둘 다 없음도 안 된다", async () => {
    const published = await publishedEdition(db, world);
    await assign(published.editionId, { classId: world.classA });
    await assign(published.editionId, { studentId: world.studentA });
    const both = await rejected(
      assign(published.editionId, {
        classId: world.classA,
        studentId: world.studentA,
      }),
    );
    expect(both.message).toContain("textbook_assignment_target_xor");
    const none = await rejected(assign(published.editionId, {}));
    expect(none.message).toContain("textbook_assignment_target_xor");
  });

  it("빈 범위가 «전체»로 읽히지 않는다", async () => {
    const published = await publishedEdition(db, world);
    const empty = await rejected(
      assign(
        published.editionId,
        { classId: world.classA },
        { kind: "sections", ids: [] },
      ),
    );
    expect(empty.message).toContain("textbook_assignment_scope_ids_check");
    const extra = await rejected(
      assign(
        published.editionId,
        { classId: world.classA },
        { kind: "edition", ids: [published.sectionId] },
      ),
    );
    expect(extra.message).toContain("textbook_assignment_scope_ids_check");
    await assign(
      published.editionId,
      { classId: world.classA },
      { kind: "sections", ids: [published.sectionId] },
    );
  });

  it("범위 · 대상은 못 바꾼다. 회수는 되돌리지 못한다", async () => {
    const published = await publishedEdition(db, world);
    const id = await assign(
      published.editionId,
      { classId: world.classA },
      { kind: "sections", ids: [published.sectionId] },
    );
    const widen = await rejected(
      db.query(
        `UPDATE "textbook_assignment" SET "scope_kind" = 'edition', "scope_ids" = '[]'::jsonb WHERE "id" = $1`,
        [id],
      ),
    );
    expect(widen.message).toContain("target and scope are immutable");
    const retarget = await rejected(
      db.query(
        `UPDATE "textbook_assignment" SET "class_id" = NULL, "student_id" = $2 WHERE "id" = $1`,
        [id, world.studentA],
      ),
    );
    expect(retarget.message).toContain("target and scope are immutable");
    await db.query(
      `UPDATE "textbook_assignment" SET "revoked_at" = $2 WHERE "id" = $1`,
      [id, sqlNow()],
    );
    const restore = await rejected(
      db.query(
        `UPDATE "textbook_assignment" SET "revoked_at" = NULL WHERE "id" = $1`,
        [id],
      ),
    );
    expect(restore.message).toContain("is final");
  });
});

describe("백지 활동 — 발행본의 굳은 개념에만, 낸 글은 그대로", () => {
  async function frozenHashOf(editionId: string, conceptKey: string) {
    const { rows } = await db.query<{ hash: string }>(
      `SELECT "frozen" ->> 'contentHash' AS hash FROM "textbook_concept" WHERE "edition_id" = $1 AND "concept_key" = $2`,
      [editionId, conceptKey],
    );
    return rows[0]!.hash;
  }
  const attempt = (input: {
    editionId: string;
    conceptKey: string;
    frozenHash: string;
    channel?: string;
    form?: string;
    recordedBy?: string | null;
    requestId?: string;
    studentId?: string;
  }) => {
    const id = uuid();
    return db
      .query(
        `INSERT INTO "textbook_concept_attempt" ("id", "edition_id", "concept_key", "student_id", "request_id", "body_hash",
            "frozen_hash", "form", "channel", "response", "recorded_by")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '순환소수는 …', $10)`,
        [
          id,
          input.editionId,
          input.conceptKey,
          input.studentId ?? world.studentA,
          input.requestId ?? uuid(),
          fakeHash(id),
          input.frozenHash,
          input.form ?? "recall",
          input.channel ?? "student-text",
          input.recordedBy ?? null,
        ],
      )
      .then(() => id);
  };

  it("초안의 개념에는 쌓이지 않는다", async () => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(
      attempt({
        editionId: draft.editionId,
        conceptKey: draft.conceptKey,
        frozenHash: fakeHash("anything"),
      }),
    );
    expect(error.message).toContain("need a published edition");
  });

  it("굳은 내용의 해시가 다르면 거절", async () => {
    const published = await publishedEdition(db, world);
    const error = await rejected(
      attempt({
        editionId: published.editionId,
        conceptKey: published.conceptKey,
        frozenHash: fakeHash("another edition's concept"),
      }),
    );
    expect(error.message).toContain("does not match the frozen concept");
  });

  it("학생은 지도 · 그림 형식을 글로 내지 못한다. 교사의 종이 확인은 된다", async () => {
    const published = await publishedEdition(db, world);
    const frozenHash = await frozenHashOf(
      published.editionId,
      published.conceptKey,
    );
    const error = await rejected(
      attempt({
        editionId: published.editionId,
        conceptKey: published.conceptKey,
        frozenHash,
        form: "map",
      }),
    );
    expect(error.message).toContain("textbook_concept_attempt_student_form");
    await attempt({
      editionId: published.editionId,
      conceptKey: published.conceptKey,
      frozenHash,
      form: "map",
      channel: "teacher-observed",
      recordedBy: world.userA,
    });
  });

  it("종이 확인에는 본 교사가 있어야 하고, 학생의 글에는 없어야 한다", async () => {
    const published = await publishedEdition(db, world);
    const frozenHash = await frozenHashOf(
      published.editionId,
      published.conceptKey,
    );
    const base = {
      editionId: published.editionId,
      conceptKey: published.conceptKey,
      frozenHash,
    };
    expect(
      (await rejected(attempt({ ...base, channel: "teacher-observed" })))
        .message,
    ).toContain("recorder does not match its channel");
    expect(
      (await rejected(attempt({ ...base, recordedBy: world.userA }))).message,
    ).toContain("recorder does not match its channel");
  });

  it("낸 글은 덮어쓰지 못한다 — 교사의 확인 칸만 바뀐다", async () => {
    const published = await publishedEdition(db, world);
    const frozenHash = await frozenHashOf(
      published.editionId,
      published.conceptKey,
    );
    const id = await attempt({
      editionId: published.editionId,
      conceptKey: published.conceptKey,
      frozenHash,
    });
    for (const set of [
      `"response" = '고친 글'`,
      `"form" = 'term'`,
      `"frozen_hash" = '${"d".repeat(64)}'`,
      `"submitted_at" = '2030-01-01 00:00:00'`,
    ]) {
      const error = await rejected(
        db.query(
          `UPDATE "textbook_concept_attempt" SET ${set} WHERE "id" = $1`,
          [id],
        ),
      );
      expect(error.message, set).toContain("response is immutable");
    }
    const reviewed = await db.query(
      `UPDATE "textbook_concept_attempt"
          SET "review_status" = 'needs-review', "reviewed_by" = $2, "reviewed_at" = $3, "note" = '조건이 빠졌다', "revision" = "revision" + 1
        WHERE "id" = $1 AND "revision" = 1`,
      [id, world.userA, sqlNow()],
    );
    expect(reviewed.affectedRows).toBe(1);
    const stale = await db.query(
      `UPDATE "textbook_concept_attempt" SET "note" = '낡은 화면', "revision" = "revision" + 1 WHERE "id" = $1 AND "revision" = 1`,
      [id],
    );
    expect(stale.affectedRows).toBe(0);
  });

  it("같은 학생의 같은 requestId 는 한 줄이다", async () => {
    const published = await publishedEdition(db, world);
    const frozenHash = await frozenHashOf(
      published.editionId,
      published.conceptKey,
    );
    const requestId = uuid();
    const base = {
      editionId: published.editionId,
      conceptKey: published.conceptKey,
      frozenHash,
      requestId,
    };
    await attempt(base);
    expect((await rejected(attempt(base))).code).toBe("23505");
  });

  it("학생을 지우면 그 학생의 글이 같이 지워진다. 발행본의 개념은 그대로다", async () => {
    const published = await publishedEdition(db, world);
    const frozenHash = await frozenHashOf(
      published.editionId,
      published.conceptKey,
    );
    const studentId = uuid();
    await db.query(
      `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1, $2, '전학생', $3)`,
      [studentId, world.classA, sqlNow()],
    );
    const id = await attempt({
      editionId: published.editionId,
      conceptKey: published.conceptKey,
      frozenHash,
      studentId,
    });
    await db.query(`DELETE FROM "student" WHERE "id" = $1`, [studentId]);
    const gone = await db.query(
      `SELECT 1 FROM "textbook_concept_attempt" WHERE "id" = $1`,
      [id],
    );
    expect(gone.rows).toEqual([]);
    expect(await frozenHashOf(published.editionId, published.conceptKey)).toBe(
      frozenHash,
    );
  });
});

describe("보관본 — 넣은 그대로", () => {
  it("못 고친다. 주인은 지울 수 있다", async () => {
    const sha = await insertBlob(db, Buffer.from("PK archive bytes"));
    const id = uuid();
    await db.query(
      `INSERT INTO "textbook_archive" ("id", "user_id", "sha256", "byte_size", "file_name", "title", "schema_version", "report")
       VALUES ($1, $2, $3, 16, 'book.zip', '옛 교재', 'injaewon.textbook.exchange.v1', '{"issues": []}'::jsonb)`,
      [id, world.userA, sha],
    );
    const error = await rejected(
      db.query(
        `UPDATE "textbook_archive" SET "title" = '바꿈' WHERE "id" = $1`,
        [id],
      ),
    );
    expect(error.message).toContain("is immutable");
    await db.query(`DELETE FROM "textbook_archive" WHERE "id" = $1`, [id]);
  });
});

describe("시험지 문항의 확정본 칸 (test_problem.snapshot_id)", () => {
  async function test(problemId: string, snapshotId: string | null) {
    const testId = uuid();
    await db.query(
      `INSERT INTO "test" ("id", "user_id", "class_id", "test_type", "range_end_unit_id", "test_date")
       VALUES ($1, $2, $3, 'review', $4, '2026-10-03')`,
      [testId, world.userA, world.classA, world.unitId],
    );
    const id = uuid();
    await db.query(
      `INSERT INTO "test_problem" ("id", "test_id", "problem_id", "order_index", "snapshot_id") VALUES ($1, $2, $3, 1, $4)`,
      [id, testId, problemId, snapshotId],
    );
    return id;
  }

  it("확정본 없는 시험지 문항은 지금처럼 들어가고 고쳐진다", async () => {
    const id = await test(world.problem1.id, null);
    await db.query(
      `UPDATE "test_problem" SET "problem_id" = $2, "replaced" = TRUE WHERE "id" = $1`,
      [id, world.problem2.id],
    );
    const { rows } = await db.query<{ snapshot_id: string | null }>(
      `SELECT "snapshot_id" FROM "test_problem" WHERE "id" = $1`,
      [id],
    );
    expect(rows[0]!.snapshot_id).toBeNull();
  });

  it("그 문항의 확정본이면 들어간다", async () => {
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: uuid(),
    });
    await test(world.problem1.id, snapshot.id);
  });

  it("다른 문항의 확정본을 달면 거절 — 남의 정답으로 채점되지 않는다", async () => {
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem2,
      snapshotSeed: uuid(),
    });
    const error = await rejected(test(world.problem1.id, snapshot.id));
    expect(error.code).toBe("23514");
    expect(error.message).toContain("snapshot does not belong to problem");
  });

  it("은행 문항이 아닌 출처의 확정본은 시험지에 못 단다", async () => {
    const local = await insertSnapshot(db, {
      userId: world.userA,
      problem: null,
    });
    const error = await rejected(test(world.problem1.id, local.id));
    expect(error.message).toContain("snapshot does not belong to problem");
  });

  it("문항을 바꾸면서 확정본을 그대로 두면 거절 — 비우면 된다", async () => {
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: uuid(),
    });
    const id = await test(world.problem1.id, snapshot.id);
    const error = await rejected(
      db.query(`UPDATE "test_problem" SET "problem_id" = $2 WHERE "id" = $1`, [
        id,
        world.problem2.id,
      ]),
    );
    expect(error.message).toContain("snapshot does not belong to problem");
    await db.query(
      `UPDATE "test_problem" SET "problem_id" = $2, "snapshot_id" = NULL WHERE "id" = $1`,
      [id, world.problem2.id],
    );
  });

  it("견주는 것은 불변 정체다 — 시험지가 문항을 붙잡고 있어 원본은 지워지지 않고, 확정본도 지워지지 않는다", async () => {
    const problem = await insertProblem(db, world.unitId);
    const snapshot = await insertSnapshot(db, { userId: world.userA, problem });
    await test(problem.id, snapshot.id);
    expect(
      (
        await rejected(
          db.query(`DELETE FROM "problem" WHERE "id" = $1`, [problem.id]),
        )
      ).code,
    ).toBe("23001");
    expect(
      (
        await rejected(
          db.query(`DELETE FROM "textbook_problem_snapshot" WHERE "id" = $1`, [
            snapshot.id,
          ]),
        )
      ).code,
    ).toBe("23001");
  });
});

describe("DDL 의 값 목록이 계약과 같다", () => {
  /** CHECK 정의문에서 따옴표 값을 뽑는다 — PG 는 IN (...) 을 = ANY (ARRAY[...]) 로 다시 적는다 */
  async function checkValues(table: string, constraint: string) {
    const { rows } = await db.query<{ def: string }>(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
        WHERE conrelid = $1::regclass AND conname = $2 AND contype = 'c'`,
      [`public.${table}`, constraint],
    );
    expect(rows, `${table}.${constraint}`).toHaveLength(1);
    return [
      ...new Set(
        [
          ...rows[0]!.def.matchAll(
            /'((?:[^']|'')*)'::(?:character varying|text|bpchar)/g,
          ),
        ].map((m) => m[1]!),
      ),
    ].sort();
  }
  const sorted = (values: readonly string[]) => [...values].sort();

  it("학습 단계 · 연결 상태", async () => {
    expect(
      await checkValues("textbook_item", "textbook_item_learning_stage_check"),
    ).toEqual(sorted(textbookLearningStageSchema.options));
    expect(
      await checkValues("textbook_item", "textbook_item_link_status_check"),
    ).toEqual(sorted(textbookLinkStatusSchema.options));
  });

  it("판본 상태 · 판 글자", async () => {
    expect(
      await checkValues("textbook_edition", "textbook_edition_status_check"),
    ).toEqual(sorted(textbookEditionSchema.shape.status.options));
    expect(
      await checkValues(
        "textbook_edition",
        "textbook_edition_schema_version_check",
      ),
    ).toEqual([textbookVersion]);
    expect(
      await checkValues(
        "textbook_edition",
        "textbook_edition_c14n_version_check",
      ),
    ).toEqual([textbookCanonicalizationVersion]);
    expect(
      await checkValues(
        "textbook_problem_snapshot",
        "textbook_problem_snapshot_c14n_version_check",
      ),
    ).toEqual([textbookCanonicalizationVersion]);
  });

  it("출처 갈래", async () => {
    expect(
      await checkValues(
        "textbook_problem_snapshot",
        "textbook_problem_snapshot_source_system_check",
      ),
    ).toEqual(
      sorted(textbookSourceRefSchema.options.map((o) => o.shape.system.value)),
    );
  });

  it("산출물 종류 · 자산 형식", async () => {
    expect(
      await checkValues("textbook_artifact", "textbook_artifact_kind_check"),
    ).toEqual(sorted(textbookArtifactSchema.shape.kind.options));
    expect(
      await checkValues("textbook_asset", "textbook_asset_mime_type_check"),
    ).toEqual(sorted(textbookAssetSchema.shape.mimeType.options));
  });

  it("개념 갈래 · 백지 형식 · 경로 · 확인 상태", async () => {
    expect(
      await checkValues("textbook_concept", "textbook_concept_kind_check"),
    ).toEqual(sorted(textbookConceptSchema.shape.kind.options));
    expect(
      await checkValues(
        "textbook_concept_attempt",
        "textbook_concept_attempt_form_check",
      ),
    ).toEqual(sorted(textbookFormSchema.options));
    expect(
      await checkValues(
        "textbook_concept_attempt",
        "textbook_concept_attempt_channel_check",
      ),
    ).toEqual(sorted(textbookConceptAttemptSchema.shape.channel.options));
    expect(
      await checkValues(
        "textbook_concept_attempt",
        "textbook_concept_attempt_review_status_check",
      ),
    ).toEqual(sorted(textbookConceptAttemptSchema.shape.reviewStatus.options));
  });

  it("영상 연결 상태 · 배정 범위", async () => {
    expect(
      await checkValues(
        "textbook_video_binding",
        "textbook_video_binding_status_check",
      ),
    ).toEqual(sorted(textbookVideoBindingSchema.shape.status.options));
    expect(
      await checkValues(
        "textbook_assignment",
        "textbook_assignment_scope_kind_check",
      ),
    ).toEqual(
      sorted(
        textbookAssignmentScopeSchema.options.map((o) => o.shape.kind.value),
      ),
    );
  });
});
