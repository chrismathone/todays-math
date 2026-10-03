// @vitest-environment node
/**
 * 교재 표 — 남의 것 · 다른 판본의 것을 가리키지 못한다 / 확정본 · 바이트 · QR 은 안 바뀐다 (PGlite, 실제 마이그레이션 사슬).
 *
 * «UUID 가 있기만 하면 통과»가 아니라 **같은 주인 · 같은 판본**임을 DB 가 본다(복합 FK).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  type Db,
  type World,
  C14N_VERSION,
  draftWithContent,
  fakeHash,
  insertAsset,
  insertBlob,
  insertBook,
  insertConcept,
  insertItem,
  insertProblem,
  insertQr,
  insertSection,
  insertSnapshot,
  openTextbookDb,
  publishedEdition,
  rejected,
  seedWorld,
  sha256Hex,
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

describe("남의 것을 가리키지 못한다 (주인 복합 FK)", () => {
  it("배치가 남의 확정본을 가리키면 거절", async () => {
    const mine = await insertBook(db, world.userA);
    const sectionId = await insertSection(db, mine.editionId);
    const theirs = await insertSnapshot(db, {
      userId: world.userB,
      problem: world.problem1,
    });
    const error = await rejected(
      insertItem(db, {
        editionId: mine.editionId,
        userId: world.userA,
        snapshotId: theirs.id,
        sectionId,
      }),
    );
    expect(error.code).toBe("23503");
    expect(error.message).toContain("textbook_item_snapshot_id_user_id_fkey");
  });

  it("배치의 주인 칸을 남으로 적어 남의 확정본을 끌어오지 못한다", async () => {
    const mine = await insertBook(db, world.userA);
    const sectionId = await insertSection(db, mine.editionId);
    const theirs = await insertSnapshot(db, {
      userId: world.userB,
      problem: world.problem2,
    });
    // user_id 를 userB 로 속이면 확정본 FK 는 맞지만 판본 FK 가 깨진다
    const error = await rejected(
      insertItem(db, {
        editionId: mine.editionId,
        userId: world.userB,
        snapshotId: theirs.id,
        sectionId,
      }),
    );
    expect(error.code).toBe("23503");
    expect(error.message).toContain("textbook_item_edition_id_user_id_fkey");
  });

  it("판본에 남의 자산을 걸지 못한다", async () => {
    const mine = await insertBook(db, world.userA);
    const theirAsset = await insertAsset(
      db,
      world.userB,
      Buffer.from("their-figure"),
    );
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id") VALUES ($1, $2, $3)`,
        [mine.editionId, world.userA, theirAsset],
      ),
    );
    expect(error.code).toBe("23503");
    expect(error.message).toContain(
      "textbook_edition_asset_user_id_asset_id_fkey",
    );
  });

  it("같은 바이트라도 내 손잡이가 없으면 내 판본에 못 건다 — 해시를 안다고 읽을 권리가 생기지 않는다", async () => {
    const mine = await insertBook(db, world.userA);
    const sha = await insertBlob(db, Buffer.from("bytes-without-handle"));
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_edition_asset" ("edition_id", "user_id", "asset_id") VALUES ($1, $2, $3)`,
        [mine.editionId, world.userA, sha],
      ),
    );
    expect(error.code).toBe("23503");
  });

  it("영상 연결이 남의 확정본 · 남의 영상을 가리키면 거절", async () => {
    const mineSnapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: "video-a",
    });
    const theirSnapshot = await insertSnapshot(db, {
      userId: world.userB,
      problem: world.problem1,
      snapshotSeed: "video-b",
    });
    const video = async (userId: string) => {
      const id = uuid();
      await db.query(
        `INSERT INTO "textbook_video" ("id", "user_id", "provider", "provider_video_id", "title", "updated_at")
         VALUES ($1, $2, 'youtube', $3, '풀이', $4)`,
        [id, userId, uuid().replaceAll("-", "").slice(0, 11), sqlNow()],
      );
      return id;
    };
    const myVideo = await video(world.userA);
    const theirVideo = await video(world.userB);
    const bind = (snapshotId: string, videoId: string) =>
      db.query(
        `INSERT INTO "textbook_video_binding" ("id", "user_id", "snapshot_id", "video_id") VALUES ($1, $2, $3, $4)`,
        [uuid(), world.userA, snapshotId, videoId],
      );
    expect((await rejected(bind(theirSnapshot.id, myVideo))).message).toContain(
      "textbook_video_binding_snapshot_id_user_id_fkey",
    );
    expect(
      (await rejected(bind(mineSnapshot.id, theirVideo))).message,
    ).toContain("textbook_video_binding_video_id_user_id_fkey");
    await bind(mineSnapshot.id, myVideo);
  });

  it("책의 주인을 바꾸지 못한다", async () => {
    const mine = await insertBook(db, world.userA);
    const error = await rejected(
      db.query(`UPDATE "textbook" SET "user_id" = $2 WHERE "id" = $1`, [
        mine.bookId,
        world.userB,
      ]),
    );
    expect(error.message).toContain("identity and owner are immutable");
  });

  it("책이 있는 계정은 지워지지 않는다", async () => {
    const owner = uuid();
    await db.query(
      `INSERT INTO "user" ("id", "email", "name", "updated_at") VALUES ($1, $2, '다', $3)`,
      [owner, `${owner}@example.test`, sqlNow()],
    );
    await insertBook(db, owner);
    const error = await rejected(
      db.query(`DELETE FROM "user" WHERE "id" = $1`, [owner]),
    );
    expect(error.code).toBe("23001");
    expect(error.message).toContain("textbook");
  });
});

describe("다른 판본의 것을 가리키지 못한다 (판본 복합 FK)", () => {
  it("배치를 다른 판본의 구획에 놓으면 거절", async () => {
    const a = await insertBook(db, world.userA);
    const b = await insertBook(db, world.userA);
    const sectionOfB = await insertSection(db, b.editionId);
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: a.editionId,
    });
    const error = await rejected(
      insertItem(db, {
        editionId: a.editionId,
        userId: world.userA,
        snapshotId: snapshot.id,
        sectionId: sectionOfB,
      }),
    );
    expect(error.code).toBe("23503");
    expect(error.message).toContain("textbook_item_edition_id_section_id_fkey");
  });

  it("있던 배치를 다른 판본의 구획으로 옮기면 거절", async () => {
    const a = await draftWithContent(db, world);
    const b = await insertBook(db, world.userA);
    const sectionOfB = await insertSection(db, b.editionId);
    const error = await rejected(
      db.query(`UPDATE "textbook_item" SET "section_id" = $2 WHERE "id" = $1`, [
        a.itemId,
        sectionOfB,
      ]),
    );
    expect(error.code).toBe("23503");
  });

  it("개념을 다른 판본의 구획에 놓으면 거절", async () => {
    const a = await insertBook(db, world.userA);
    const b = await insertBook(db, world.userA);
    const sectionOfB = await insertSection(db, b.editionId);
    const error = await rejected(
      insertConcept(db, a.editionId, { sectionId: sectionOfB }),
    );
    expect(error.code).toBe("23503");
    expect(error.message).toContain(
      "textbook_concept_edition_id_section_id_fkey",
    );
  });

  it("QR 이 다른 판본의 배치 · 개념을 가리키면 거절", async () => {
    const a = await draftWithContent(db, world);
    const b = await draftWithContent(db, world);
    const item = await rejected(
      insertQr(db, { editionId: a.editionId, itemId: b.itemId }),
    );
    expect(item.code).toBe("23503");
    expect(item.message).toContain(
      "textbook_qr_target_edition_id_item_id_fkey",
    );
    const concept = await rejected(
      insertQr(db, { editionId: a.editionId, conceptKey: b.conceptKey }),
    );
    expect(concept.code).toBe("23503");
    expect(concept.message).toContain(
      "textbook_qr_target_edition_id_concept_key_fkey",
    );
  });

  it("같은 (단원, 구획) 열쇠는 한 판본에 하나 — 단원이 다르면 같은 구획 열쇠를 쓸 수 있다", async () => {
    const a = await insertBook(db, world.userA);
    await insertSection(db, a.editionId, { unitKey: "u1", sectionKey: "prep" });
    await insertSection(db, a.editionId, { unitKey: "u2", sectionKey: "prep" });
    const error = await rejected(
      insertSection(db, a.editionId, { unitKey: "u1", sectionKey: "prep" }),
    );
    expect(error.code).toBe("23505");
  });

  it("배치가 든 구획은 배치를 먼저 빼야 지워진다", async () => {
    const a = await draftWithContent(db, world);
    await db.query(`DELETE FROM "textbook_concept" WHERE "edition_id" = $1`, [
      a.editionId,
    ]);
    const error = await rejected(
      db.query(`DELETE FROM "textbook_section" WHERE "id" = $1`, [a.sectionId]),
    );
    expect(error.code).toBe("23503");
    await db.query(
      `UPDATE "textbook_item" SET "section_id" = NULL WHERE "id" = $1`,
      [a.itemId],
    );
    await db.query(`DELETE FROM "textbook_section" WHERE "id" = $1`, [
      a.sectionId,
    ]);
  });
});

describe("문항 확정본은 만든 뒤로 안 바뀐다", () => {
  it.each([
    ["payload", `"payload" = '{"content": "고침"}'::jsonb`],
    ["raw_source", `"raw_source" = '{"figureUrls": []}'::jsonb`],
    [
      "source_metadata",
      `"source_metadata" = '{"difficulty": "심화상"}'::jsonb`,
    ],
    ["content_hash", `"content_hash" = '${"a".repeat(64)}'`],
    ["snapshot_hash", `"snapshot_hash" = '${"b".repeat(64)}'`],
    ["difficulty", `"difficulty" = '심화상'`],
    ["captured_at", `"captured_at" = '2030-01-01 00:00:00'`],
  ])("%s UPDATE 거절", async (_column, set) => {
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: uuid(),
    });
    const error = await rejected(
      db.query(
        `UPDATE "textbook_problem_snapshot" SET ${set} WHERE "id" = $1`,
        [snapshot.id],
      ),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain("is immutable");
  });

  it("출처 정체(source_ref)를 다른 문항으로 못 바꾼다", async () => {
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: uuid(),
    });
    const error = await rejected(
      db.query(
        `UPDATE "textbook_problem_snapshot"
            SET "source_ref" = $2::jsonb, "source_key" = $3, "problem_id" = $4 WHERE "id" = $1`,
        [
          snapshot.id,
          JSON.stringify({
            system: "todays-math",
            problemId: world.problem2.id,
            problemCode: world.problem2.code,
          }),
          `tm:${world.problem2.id}`,
          world.problem2.id,
        ],
      ),
    );
    expect(error.message).toContain("is immutable");
  });

  it("원본 문항이 지워지면 problem_id 만 비고 불변 정체는 남는다", async () => {
    const problem = await insertProblem(db, world.unitId);
    const snapshot = await insertSnapshot(db, {
      userId: world.userA,
      problem,
    });
    await db.query(`DELETE FROM "problem" WHERE "id" = $1`, [problem.id]);
    const { rows } = await db.query<{
      problem_id: string | null;
      source_ref: { problemId: string; problemCode: string };
      source_key: string;
    }>(
      `SELECT "problem_id", "source_ref", "source_key" FROM "textbook_problem_snapshot" WHERE "id" = $1`,
      [snapshot.id],
    );
    expect(rows[0]!.problem_id).toBeNull();
    expect(rows[0]!.source_ref).toEqual({
      system: "todays-math",
      problemId: problem.id,
      problemCode: problem.code,
    });
    expect(rows[0]!.source_key).toBe(`tm:${problem.id}`);
  });

  it("빈 problem_id 를 다른 문항으로 다시 채우지 못한다", async () => {
    const problem = await insertProblem(db, world.unitId);
    const snapshot = await insertSnapshot(db, { userId: world.userA, problem });
    await db.query(`DELETE FROM "problem" WHERE "id" = $1`, [problem.id]);
    const error = await rejected(
      db.query(
        `UPDATE "textbook_problem_snapshot" SET "problem_id" = $2 WHERE "id" = $1`,
        [snapshot.id, world.problem2.id],
      ),
    );
    expect(error.message).toContain("is immutable");
  });

  it("살아 있는 문항 id 가 불변 정체와 다르면 넣지 못한다", async () => {
    const error = await rejected(
      insertSnapshot(db, {
        userId: world.userA,
        problem: world.problem1,
        problemId: world.problem2.id,
        snapshotSeed: uuid(),
      }),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain(
      "textbook_problem_snapshot_problem_identity",
    );
  });

  it.each([
    [
      "출처 열쇠가 정체와 다르다",
      { sourceKey: "tm:00000000-0000-4000-8000-000000000000" },
    ],
    [
      "problemId 가 빠졌다 (NULL 로 CHECK 를 지나가지 못한다)",
      {
        sourceRef: { system: "todays-math", problemCode: "J21000-A01-001" },
        problemId: null,
      },
    ],
    [
      "problemCode 가 빠졌다",
      {
        sourceRef: {
          system: "todays-math",
          problemId: "00000000-0000-4000-8000-000000000001",
        },
        sourceKey: "tm:00000000-0000-4000-8000-000000000001",
        problemId: null,
      },
    ],
    [
      "system 이 칸과 다르다 (칸은 studio-authored, 정체는 legacy-studio)",
      {
        sourceSystem: "studio-authored",
        sourceRef: { system: "legacy-studio", legacyId: "x" },
        sourceKey: "legacy:x",
        problemId: null,
      },
    ],
    [
      "은행 문항이 아닌 출처에 은행 문항 열쇠를 적었다",
      {
        sourceRef: { system: "studio-authored", localId: "x" },
        sourceKey: "tm:x",
        problemId: null,
      },
    ],
  ])("출처 정체가 어긋나면 거절 — %s", async (_name, overrides) => {
    const error = await rejected(
      insertSnapshot(db, {
        userId: world.userA,
        problem: world.problem1,
        snapshotSeed: uuid(),
        ...overrides,
      }),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain(
      "textbook_problem_snapshot_source_identity",
    );
  });

  it("은행 문항이 아닌 출처는 살아 있는 문항을 가리키지 못한다", async () => {
    const error = await rejected(
      insertSnapshot(db, {
        userId: world.userA,
        problem: null,
        problemId: world.problem1.id,
      }),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain(
      "textbook_problem_snapshot_problem_identity",
    );
  });

  it("같은 (주인, 출처, snapshotHash) 는 한 줄 — 메타데이터만 다른 새 캡처는 따로 선다", async () => {
    const seed = uuid();
    const first = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: seed,
    });
    const duplicate = await rejected(
      insertSnapshot(db, {
        userId: world.userA,
        problem: world.problem1,
        snapshotSeed: seed,
      }),
    );
    expect(duplicate.code).toBe("23505");
    const recapture = await insertSnapshot(db, {
      userId: world.userA,
      problem: world.problem1,
      snapshotSeed: `${seed}-metadata-changed`,
    });
    expect(recapture.contentHash).toBe(first.contentHash);
    expect(recapture.snapshotHash).not.toBe(first.snapshotHash);
    // 다른 주인은 같은 해시로 자기 줄을 가진다(영상 연결이 주인마다 따로다)
    await insertSnapshot(db, {
      userId: world.userB,
      problem: world.problem1,
      snapshotSeed: seed,
    });
  });

  it("격리된 문항은 확정본으로도 못 나간다 (기존 외벽 함수)", async () => {
    const problem = await insertProblem(db, world.unitId);
    await db.query(
      `INSERT INTO "problem_outer_wall_quarantine" ("problem_id") VALUES ($1)`,
      [problem.id],
    );
    const error = await rejected(
      insertSnapshot(db, { userId: world.userA, problem }),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain("outer-wall quarantine");
  });

  it("`linked` 는 실제 은행 문항의 확정본만 가질 수 있다", async () => {
    const draft = await insertBook(db, world.userA);
    const sectionId = await insertSection(db, draft.editionId);
    const local = await insertSnapshot(db, {
      userId: world.userA,
      problem: null,
    });
    const error = await rejected(
      insertItem(db, {
        editionId: draft.editionId,
        userId: world.userA,
        snapshotId: local.id,
        sectionId,
        linkStatus: "linked",
      }),
    );
    expect(error.message).toContain(
      "cannot be linked without a real bank problem",
    );
    const itemId = await insertItem(db, {
      editionId: draft.editionId,
      userId: world.userA,
      snapshotId: local.id,
      sectionId,
      linkStatus: "unlinked",
    });
    const promote = await rejected(
      db.query(
        `UPDATE "textbook_item" SET "link_status" = 'linked' WHERE "id" = $1`,
        [itemId],
      ),
    );
    expect(promote.message).toContain("cannot be linked");
  });

  it("배치가 가리키는 확정본은 지워지지 않는다", async () => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(
      db.query(`DELETE FROM "textbook_problem_snapshot" WHERE "id" = $1`, [
        draft.snapshotId,
      ]),
    );
    expect(error.code).toBe("23001");
  });

  it("해시 글자 · 정규화 판이 틀리면 거절", async () => {
    const insert = (contentHash: string, c14n: string) =>
      db.query(
        `INSERT INTO "textbook_problem_snapshot" ("id", "user_id", "source_system", "source_key", "source_ref",
            "payload", "raw_source", "source_metadata", "content_hash", "snapshot_hash", "c14n_version")
         VALUES ($1, $2, 'studio-authored', 'studio:h', '{"system": "studio-authored", "localId": "h"}'::jsonb,
                 '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $3, $4, $5)`,
        [uuid(), world.userA, contentHash, fakeHash(uuid()), c14n],
      );
    expect((await rejected(insert("A".repeat(64), C14N_VERSION))).code).toBe(
      "23514",
    );
    expect((await rejected(insert(fakeHash("x"), "c14n.v0"))).code).toBe(
      "23514",
    );
  });
});

describe("바이트는 내용 해시로만 들어가고 안 바뀐다", () => {
  it("주장한 해시가 바이트와 다르면 거절 (DB 가 다시 계산한다)", async () => {
    const bytes = Buffer.from("real bytes");
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_blob" ("sha256", "size", "bytes") VALUES ($1, $2, $3)`,
        [fakeHash("some other bytes"), bytes.byteLength, bytes],
      ),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain("do not match the claimed sha256");
  });

  it("크기가 바이트와 다르면 거절", async () => {
    const bytes = Buffer.from("sized");
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_blob" ("sha256", "size", "bytes") VALUES ($1, $2, $3)`,
        [sha256Hex(bytes), bytes.byteLength + 1, bytes],
      ),
    );
    expect(error.code).toBe("23514");
    expect(error.message).toContain("textbook_blob_size_check");
  });

  it("넣은 바이트는 못 고친다", async () => {
    const sha = await insertBlob(db, Buffer.from("immutable bytes"));
    const error = await rejected(
      db.query(`UPDATE "textbook_blob" SET "bytes" = $2 WHERE "sha256" = $1`, [
        sha,
        Buffer.from("tampered"),
      ]),
    );
    expect(error.message).toContain("is immutable");
  });

  it("손잡이가 가리키는 바이트는 지워지지 않는다", async () => {
    const sha = await insertAsset(db, world.userA, Buffer.from("kept bytes"));
    const error = await rejected(
      db.query(`DELETE FROM "textbook_blob" WHERE "sha256" = $1`, [sha]),
    );
    expect(error.code).toBe("23001");
  });

  it("조각을 DB 가 이어 붙인 해시가 Node 의 해시와 같다 · 구간 읽기가 같은 바이트를 낸다", async () => {
    const whole = Buffer.alloc(2_500_000);
    for (let i = 0; i < whole.length; i++) whole[i] = (i * 31 + 7) % 251;
    const sha = sha256Hex(whole);
    const uploadId = uuid();
    await db.query(
      `INSERT INTO "textbook_upload" ("id", "user_id", "sha256") VALUES ($1, $2, $3)`,
      [uploadId, world.userA, sha],
    );
    // 차례를 뒤섞어 넣는다 — 이어 붙이는 차례는 바이트 자리다
    for (const offset of [2_000_000, 0, 1_000_000])
      await db.query(
        `INSERT INTO "textbook_upload_chunk" ("upload_id", "byte_offset", "bytes") VALUES ($1, $2, $3)`,
        [uploadId, offset, whole.subarray(offset, offset + 1_000_000)],
      );
    const assembled = await db.query<{ sha: string; size: number }>(
      `SELECT encode(sha256(string_agg("bytes", ''::bytea ORDER BY "byte_offset")), 'hex') AS sha,
              sum(octet_length("bytes"))::int AS size
         FROM "textbook_upload_chunk" WHERE "upload_id" = $1`,
      [uploadId],
    );
    expect(assembled.rows[0]).toEqual({ sha, size: whole.length });
    await db.query(
      `INSERT INTO "textbook_blob" ("sha256", "size", "bytes")
       SELECT $2, sum(octet_length("bytes"))::int, string_agg("bytes", ''::bytea ORDER BY "byte_offset")
         FROM "textbook_upload_chunk" WHERE "upload_id" = $1`,
      [uploadId, sha],
    );
    const part = await db.query<{ part: Uint8Array }>(
      `SELECT substring("bytes" FROM $2 FOR $3) AS part FROM "textbook_blob" WHERE "sha256" = $1`,
      [sha, 1_048_577, 4096],
    );
    expect(Buffer.from(part.rows[0]!.part)).toEqual(
      whole.subarray(1_048_576, 1_048_576 + 4096),
    );
  });

  it("조각 하나는 1MB 를 넘지 못한다", async () => {
    const uploadId = uuid();
    await db.query(
      `INSERT INTO "textbook_upload" ("id", "user_id", "sha256") VALUES ($1, $2, $3)`,
      [uploadId, world.userA, fakeHash(uploadId)],
    );
    const error = await rejected(
      db.query(
        `INSERT INTO "textbook_upload_chunk" ("upload_id", "byte_offset", "bytes") VALUES ($1, 0, $2)`,
        [uploadId, Buffer.alloc(1_048_577)],
      ),
    );
    expect(error.code).toBe("23514");
  });

  it("자산 손잡이는 이름만 바꿀 수 있다", async () => {
    const sha = await insertAsset(db, world.userA, Buffer.from("named asset"));
    await db.query(
      `UPDATE "textbook_asset" SET "name" = '새 이름.png' WHERE "user_id" = $1 AND "id" = $2`,
      [world.userA, sha],
    );
    const error = await rejected(
      db.query(
        `UPDATE "textbook_asset" SET "width_px" = 999 WHERE "user_id" = $1 AND "id" = $2`,
        [world.userA, sha],
      ),
    );
    expect(error.message).toContain("immutable except its name");
  });
});

describe("QR 대상은 영구다", () => {
  it("초안에서 예약하고, 확정 안에서만 켜진다", async () => {
    const published = await publishedEdition(db, world);
    const { rows } = await db.query<{ state: string; activated_at: string }>(
      `SELECT "state", "activated_at" FROM "textbook_qr_target" WHERE "id" = $1`,
      [published.plan.qrId],
    );
    expect(rows[0]!.state).toBe("active");
    expect(rows[0]!.activated_at).not.toBeNull();
  });

  it("발행본에는 새 QR 을 예약하지 못한다", async () => {
    const published = await publishedEdition(db, world);
    const error = await rejected(
      insertQr(db, {
        editionId: published.editionId,
        conceptKey: published.conceptKey,
      }),
    );
    expect(error.message).toContain("only while edition");
  });

  it("처음부터 켜진 QR 은 넣지 못한다", async () => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(
      insertQr(
        db,
        { editionId: draft.editionId, itemId: draft.itemId },
        { state: "void" },
      ),
    );
    expect(error.message).toContain("must start reserved");
  });

  it.each([
    [
      "slug",
      `"slug" = 'zzzzzzzzzzzzzzzzzzzz', "url" = 'https://today.example.test/q/zzzzzzzzzzzzzzzzzzzz'`,
    ],
    ["url", `"url" = 'https://evil.example.test/q/' || "slug"`],
    ["kind", `"kind" = 'concept', "item_id" = NULL, "concept_key" = 'c'`],
    ["created_at", `"created_at" = '2030-01-01 00:00:00'`],
  ])("%s 를 못 바꾼다", async (_column, set) => {
    const draft = await draftWithContent(db, world);
    const qr = await insertQr(db, {
      editionId: draft.editionId,
      itemId: draft.itemId,
    });
    const error = await rejected(
      db.query(`UPDATE "textbook_qr_target" SET ${set} WHERE "id" = $1`, [
        qr.id,
      ]),
    );
    expect(error.message).toContain("are permanent");
  });

  it("대상 배치를 다른 배치로 못 바꾼다", async () => {
    const draft = await draftWithContent(db, world);
    const other = await insertItem(db, {
      editionId: draft.editionId,
      userId: world.userA,
      snapshotId: draft.snapshotId,
      sectionId: draft.sectionId,
    });
    const qr = await insertQr(db, {
      editionId: draft.editionId,
      itemId: draft.itemId,
    });
    const error = await rejected(
      db.query(
        `UPDATE "textbook_qr_target" SET "item_id" = $2 WHERE "id" = $1`,
        [qr.id, other],
      ),
    );
    expect(error.message).toContain("are permanent");
  });

  it("지우지 못한다 — 예약 상태여도", async () => {
    const draft = await draftWithContent(db, world);
    const qr = await insertQr(db, {
      editionId: draft.editionId,
      itemId: draft.itemId,
    });
    const error = await rejected(
      db.query(`DELETE FROM "textbook_qr_target" WHERE "id" = $1`, [qr.id]),
    );
    expect(error.message).toContain("is permanent");
  });

  it("발행 뒤에는 상태를 못 바꾼다 · 중지 시각만 바뀐다", async () => {
    const published = await publishedEdition(db, world);
    const error = await rejected(
      db.query(
        `UPDATE "textbook_qr_target" SET "state" = 'void', "activated_at" = NULL WHERE "id" = $1`,
        [published.plan.qrId],
      ),
    );
    expect(error.message).toContain("is final");
    await db.query(
      `UPDATE "textbook_qr_target" SET "suspended_at" = $2 WHERE "id" = $1`,
      [published.plan.qrId, sqlNow()],
    );
    await db.query(
      `UPDATE "textbook_qr_target" SET "suspended_at" = NULL WHERE "id" = $1`,
      [published.plan.qrId],
    );
    const again = await rejected(
      db.query(
        `UPDATE "textbook_qr_target" SET "activated_at" = '2030-01-01 00:00:00' WHERE "id" = $1`,
        [published.plan.qrId],
      ),
    );
    expect(again.message).toContain("activation time is permanent");
  });

  it("배치 하나에 QR 은 하나다", async () => {
    const draft = await draftWithContent(db, world);
    await insertQr(db, { editionId: draft.editionId, itemId: draft.itemId });
    const error = await rejected(
      insertQr(db, { editionId: draft.editionId, itemId: draft.itemId }),
    );
    expect(error.code).toBe("23505");
  });

  it.each([
    [
      "http 주소",
      {
        url: "http://today.example.test/q/aaaaaaaaaaaaaaaaaaaa",
        slug: "aaaaaaaaaaaaaaaaaaaa",
      },
    ],
    [
      "slug 로 끝나지 않는 주소",
      {
        url: "https://today.example.test/q/other",
        slug: "bbbbbbbbbbbbbbbbbbbb",
      },
    ],
    [
      "쿼리가 붙은 주소",
      {
        url: "https://today.example.test/q/cccccccccccccccccccc?x=1",
        slug: "cccccccccccccccccccc",
      },
    ],
    ["짧은 slug", { url: "https://today.example.test/q/short", slug: "short" }],
  ])("%s 는 거절", async (_name, overrides) => {
    const draft = await draftWithContent(db, world);
    const error = await rejected(
      insertQr(
        db,
        { editionId: draft.editionId, itemId: draft.itemId },
        overrides,
      ),
    );
    expect(error.code).toBe("23514");
  });

  it("대상이 둘이거나 없으면 거절", async () => {
    const draft = await draftWithContent(db, world);
    const slug = uuid().replaceAll("-", "").slice(0, 20);
    const insert = (kind: string, itemId: string | null, key: string | null) =>
      db.query(
        `INSERT INTO "textbook_qr_target" ("id", "slug", "url", "kind", "edition_id", "item_id", "concept_key")
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          uuid(),
          slug,
          `https://today.example.test/q/${slug}`,
          kind,
          draft.editionId,
          itemId,
          key,
        ],
      );
    expect(
      (await rejected(insert("item", draft.itemId, draft.conceptKey))).code,
    ).toBe("23514");
    expect((await rejected(insert("item", null, null))).code).toBe("23514");
    expect((await rejected(insert("concept", draft.itemId, null))).code).toBe(
      "23514",
    );
  });
});
