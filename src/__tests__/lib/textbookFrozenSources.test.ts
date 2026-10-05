// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any -- 시험이 임의 모양의 JSON 을 읽는다 */
/**
 * 확정본이 이미 있는 출처 — 재출제한 시험지에서 다시 담기 · 가져온 문항의 연결 확정 · 조판 걸음의 임대.
 * 여기서 지키는 것은 하나다: **확정본이 있으면 살아 있는 은행 문항의 내용을 다시 읽지 않는다.**
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookActor } from "@/lib/textbook/access";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { claimStep, runNextStep } from "@/lib/textbook/publish/step";
import { completeUpload, putUploadChunk } from "@/lib/textbook/server/blobs";
import { createBook, updateBook } from "@/lib/textbook/server/books";
import { editionAssetSource } from "@/lib/textbook/server/bytes";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import {
  type VerifiedArchive,
  importPackage,
} from "@/lib/textbook/server/imports";
import { getItemDetail, linkItem } from "@/lib/textbook/server/itemLink";
import { captureItems } from "@/lib/textbook/server/items";
import { reissueTest } from "@/lib/textbook/server/reissue";
import { saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import { sha256 } from "@/lib/textbook/hash.server";

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
  tinyPng,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let branchId: string;
let owner: TextbookActor;
let colleague: TextbookActor;

const figures = new Map<string, Buffer>();
const loadFigure = async (path: string) => figures.get(path) ?? null;
const deps = fakePublishDeps();

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  branchId = await insertBranch(pg);
  owner = await insertTeacher(pg, { branchId, name: "주인" });
  colleague = await insertTeacher(pg, { branchId, name: "동료" });
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

async function classOf(teacher: TextbookActor) {
  const classId = randomUUID();
  await pg.query(
    `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at") VALUES ($1, $2, '반', '중2', '{}'::jsonb, $3)`,
    [classId, teacher.id, sqlNow()],
  );
  return classId;
}

/** 구획 하나가 있는 빈 초안 */
async function emptyDraft(actor: TextbookActor) {
  const { book } = await createBook(
    db,
    actor,
    requestKey(actor, "book-create"),
    { config: sampleConfig() },
  );
  const editionId = book.draftEditionId!;
  const detail = await getEditionDetail(db, actor, editionId);
  await saveStructure(
    db,
    actor,
    editionId,
    requestKey(actor, "structure-save"),
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
    actor,
    editionId,
    sectionId,
    requestKey(actor, "section-save"),
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
  return {
    bookId: book.id,
    editionId,
    sectionId,
    revision: saved.aggregateRevision,
  };
}

async function publish(
  actor: TextbookActor,
  editionId: string,
  revision: number,
) {
  const requestId = randomUUID();
  await reservePublish(
    db,
    actor,
    editionId,
    { requestId, expectedRevision: revision },
    fakeHash(requestId),
    deps,
  );
  let job = await runNextStep(db, actor, editionId, requestId, deps);
  while (job.status === "rendering" || job.status === "verifying")
    job = await runNextStep(db, actor, editionId, requestId, deps);
  await finalizePublish(db, actor, editionId, requestId, deps);
}

/** 그림 있는 문항 하나를 싣고 발행한 책 */
async function publishedBook(
  actor: TextbookActor,
  options: { shared?: boolean } = {},
) {
  const draft = await emptyDraft(actor);
  const path = `/figures/frozen/${randomUUID()}.png`;
  figures.set(path, tinyPng(50, 40, path));
  const problem = await insertBankProblem(pg, world.unitId, {
    content: "교재에 실린 발문",
    answer: "교재의 정답",
    figureUrls: [path],
    figureDims: [50, 40],
  });
  const captured = await captureItems(
    db,
    actor,
    draft.editionId,
    requestKey(actor, "capture"),
    {
      expectedRevision: draft.revision,
      sectionId: draft.sectionId,
      source: { kind: "problems", problemIds: [problem.id] },
    },
    loadFigure,
  );
  await publish(actor, draft.editionId, captured.aggregateRevision);
  if (options.shared)
    await updateBook(
      db,
      actor,
      draft.bookId,
      requestKey(actor, "book-update"),
      { visibility: "branch" },
    );
  return { ...draft, problem, item: captured.items[0]!, figurePath: path };
}

const snapshotOf = async (snapshotId: string) =>
  (
    await pg.query<{
      user_id: string;
      content: string;
      answer: string;
      content_hash: string;
      snapshot_hash: string;
    }>(
      `SELECT "user_id", "payload" ->> 'content' AS content, "payload" ->> 'answer' AS answer, "content_hash", "snapshot_hash"
         FROM "textbook_problem_snapshot" WHERE "id" = $1`,
      [snapshotId],
    )
  ).rows[0]!;

describe("재출제한 시험지에서 다시 담기", () => {
  it("시험지 문항에 확정본이 달려 있으면 그 내용을 싣는다 — 은행 문항이 그사이 바뀌어도", async () => {
    const book = await publishedBook(owner);
    const classId = await classOf(owner);
    const test = await reissueTest(
      db,
      owner,
      book.editionId,
      requestKey(owner, "reissue"),
      {
        itemIds: [book.item.itemId],
        classId,
        testType: "review",
        rangeEndUnitId: world.unitId,
      },
    );
    // 재출제한 뒤 은행 문항이 고쳐졌다. 그림 파일도 사라졌다 — 다시 읽으면 담지 못한다
    await pg.query(
      `UPDATE "problem" SET "content" = '은행에서 고친 발문', "answer" = '고친 정답', "updated_at" = $2 WHERE "id" = $1`,
      [book.problem.id, sqlNow()],
    );
    figures.delete(book.figurePath);

    const next = await emptyDraft(owner);
    const captured = await captureItems(
      db,
      owner,
      next.editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: next.revision,
        sectionId: next.sectionId,
        source: { kind: "test", testId: test.testId },
      },
      loadFigure,
    );
    expect(captured.excluded).toEqual([]);
    expect(captured.items).toHaveLength(1);
    // 같은 주인이면 같은 확정본 줄을 쓴다(새 줄을 만들지 않는다)
    expect(captured.items[0]!.snapshotId).toBe(book.item.snapshotId);
    expect(await snapshotOf(captured.items[0]!.snapshotId)).toMatchObject({
      content: "교재에 실린 발문",
      answer: "교재의 정답",
    });
    // 그림도 새 판본의 읽기 범위에 올라 있다
    const exchange = await assembleExchange(db, next.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.assets).toHaveLength(1);
    expect(
      (
        await editionAssetSource(
          db,
          owner,
          next.editionId,
          exchange.assets[0]!.assetId,
        )
      ).mimeType,
    ).toBe("image/png");
  });

  it("동료가 공유본으로 낸 시험지에서 담으면 확정본이 동료의 것으로 복제된다 — 내용 · 해시는 그대로", async () => {
    const book = await publishedBook(owner, { shared: true });
    const classId = await classOf(colleague);
    const test = await reissueTest(
      db,
      colleague,
      book.editionId,
      requestKey(colleague, "reissue"),
      {
        itemIds: [book.item.itemId],
        classId,
        testType: "review",
        rangeEndUnitId: world.unitId,
      },
    );
    await pg.query(
      `UPDATE "problem" SET "content" = '은행에서 고친 발문', "updated_at" = $2 WHERE "id" = $1`,
      [book.problem.id, sqlNow()],
    );
    figures.delete(book.figurePath);

    const next = await emptyDraft(colleague);
    const captured = await captureItems(
      db,
      colleague,
      next.editionId,
      requestKey(colleague, "capture"),
      {
        expectedRevision: next.revision,
        sectionId: next.sectionId,
        source: { kind: "test", testId: test.testId },
      },
      loadFigure,
    );
    expect(captured.items).toHaveLength(1);
    const [original, cloned] = [
      await snapshotOf(book.item.snapshotId),
      await snapshotOf(captured.items[0]!.snapshotId),
    ];
    expect(captured.items[0]!.snapshotId).not.toBe(book.item.snapshotId);
    expect(cloned).toMatchObject({
      user_id: colleague.id,
      content: "교재에 실린 발문",
      content_hash: original.content_hash,
      snapshot_hash: original.snapshot_hash,
    });
    expect(original.user_id).toBe(owner.id);
    // 그림 바이트는 한 줄이고, 동료의 손잡이 · 판본 색인이 생겼다
    const exchange = await assembleExchange(db, next.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const assetId = exchange.assets[0]!.assetId;
    const handles = await pg.query<{ user_id: string }>(
      `SELECT "user_id" FROM "textbook_asset" WHERE "id" = $1 ORDER BY "user_id"`,
      [assetId],
    );
    expect(handles.rows.map((row) => row.user_id).sort()).toEqual(
      [owner.id, colleague.id].sort(),
    );
    expect(
      (
        await pg.query(`SELECT 1 FROM "textbook_blob" WHERE "sha256" = $1`, [
          assetId,
        ])
      ).rows,
    ).toHaveLength(1);
  });

  it("확정본이 달린 문항이어도 지금 자격을 잃었으면 사유와 함께 뺀다", async () => {
    const book = await publishedBook(owner);
    const classId = await classOf(owner);
    const test = await reissueTest(
      db,
      owner,
      book.editionId,
      requestKey(owner, "reissue"),
      {
        itemIds: [book.item.itemId],
        classId,
        testType: "review",
        rangeEndUnitId: world.unitId,
      },
    );
    await pg.query(
      `UPDATE "problem" SET "direct_use_allowed" = FALSE WHERE "id" = $1`,
      [book.problem.id],
    );
    const next = await emptyDraft(owner);
    const captured = await captureItems(
      db,
      owner,
      next.editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: next.revision,
        sectionId: next.sectionId,
        source: { kind: "test", testId: test.testId },
      },
      loadFigure,
    );
    expect(captured.items).toEqual([]);
    expect(captured.excluded).toEqual([
      { problemId: book.problem.id, reason: "출제가 잠긴 문항입니다." },
    ]);
  });
});

describe("연결 후보의 확정", () => {
  /** 다른 계정의 패키지를 복사해 온 초안 — 은행 문항이 그사이 바뀌어 연결을 확인하지 못한 배치가 하나 있다 */
  async function importedDraft() {
    const book = await publishedBook(owner);
    const exchange = await assembleExchange(db, book.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const files = new Map<string, Uint8Array>();
    for (const asset of exchange.assets) {
      const blob = await pg.query<{ bytes: Uint8Array }>(
        `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
        [asset.sha256],
      );
      files.set(asset.packagePath, blob.rows[0]!.bytes);
    }
    const archive: VerifiedArchive = { exchange, files, validation: {} };
    const zip = Buffer.from(`PK-${randomUUID()}`);
    await putUploadChunk(db, colleague, sha256(zip), 0, zip);
    const upload = await completeUpload(db, colleague, sha256(zip), {
      byteLength: zip.length,
    });
    // 가져오는 순간에는 은행 문항이 달라져 있다
    const original = "교재에 실린 발문";
    await pg.query(
      `UPDATE "problem" SET "content" = '잠깐 바뀐 발문', "updated_at" = $2 WHERE "id" = $1`,
      [book.problem.id, sqlNow()],
    );
    const result = await importPackage(
      db,
      colleague,
      requestKey(colleague, "import"),
      { mode: "copy", uploadId: upload.uploadId, expectedSha256: sha256(zip) },
      async () => archive,
      loadFigure,
    );
    const [item] = (
      await pg.query<{ id: string }>(
        `SELECT "id" FROM "textbook_item" WHERE "edition_id" = $1`,
        [result.editionId],
      )
    ).rows;
    const detail = await getEditionDetail(db, colleague, result.editionId!);
    return {
      book,
      editionId: result.editionId!,
      itemId: item!.id,
      revision: detail.edition.revision,
      original,
    };
  }

  it("후보는 주인에게만 보인다. 내용이 다른 은행 문항과는 잇지 않는다", async () => {
    const made = await importedDraft();
    const detail = await getItemDetail(
      db,
      colleague,
      made.editionId,
      made.itemId,
    );
    expect(detail.item.linkStatus).toBe("needs-review");
    expect(detail.linkCandidates).toEqual([
      {
        system: "todays-math",
        problemId: made.book.problem.id,
        problemCode: made.book.problem.code,
      },
    ]);
    // 은행 문항이 아직 다르다 — «비슷해 보인다»로 잇지 않는다
    const error = await refusal(
      linkItem(
        db,
        colleague,
        made.editionId,
        made.itemId,
        requestKey(colleague, "link"),
        { expectedRevision: made.revision, problemId: made.book.problem.id },
        loadFigure,
      ),
    );
    expect(error.status).toBe(409);
    expect(error.message).toContain("내용이 이 문항과 다릅니다");
    expect(
      (await getItemDetail(db, colleague, made.editionId, made.itemId)).item
        .linkStatus,
    ).toBe("needs-review");
    // 남의 판본이면 **그 사유조차 알려 주지 않는다** — «내용이 다르다»(409)는 그 배치가 있다는 것과
    // 은행 문항과의 같고 다름을 새어 보낸다. 주인이 아니면 견주기 전에 404 다
    const outsider = await refusal(
      linkItem(
        db,
        owner,
        made.editionId,
        made.itemId,
        requestKey(owner, "link"),
        { expectedRevision: made.revision, problemId: made.book.problem.id },
        loadFigure,
      ),
    );
    expect(outsider.status).toBe(404);
    expect(outsider.message).not.toContain("내용이");
  });

  it("은행 문항의 내용이 같으면 잇는다 — 배치는 그 은행 문항의 새 확정본을 가리키고 후보는 비워진다", async () => {
    const made = await importedDraft();
    await pg.query(
      `UPDATE "problem" SET "content" = $2, "updated_at" = $3 WHERE "id" = $1`,
      [made.book.problem.id, made.original, sqlNow()],
    );
    const linked = await linkItem(
      db,
      colleague,
      made.editionId,
      made.itemId,
      requestKey(colleague, "link"),
      { expectedRevision: made.revision, problemId: made.book.problem.id },
      loadFigure,
    );
    expect(linked.item.linkStatus).toBe("linked");
    expect(linked.aggregateRevision).toBeGreaterThan(made.revision);
    const row = await pg.query<{
      source_system: string;
      problem_id: string;
      user_id: string;
    }>(
      `SELECT "source_system", "problem_id", "user_id" FROM "textbook_problem_snapshot" WHERE "id" = $1`,
      [linked.item.snapshotId],
    );
    expect(row.rows).toEqual([
      {
        source_system: "todays-math",
        problem_id: made.book.problem.id,
        user_id: colleague.id,
      },
    ]);
    expect(
      (await getItemDetail(db, colleague, made.editionId, made.itemId))
        .linkCandidates,
    ).toEqual([]);
    // 이미 이은 것을 다시 잇지 않는다
    expect(
      (
        await refusal(
          linkItem(
            db,
            colleague,
            made.editionId,
            made.itemId,
            requestKey(colleague, "link"),
            {
              expectedRevision: linked.aggregateRevision,
              problemId: made.book.problem.id,
            },
            loadFigure,
          ),
        )
      ).status,
    ).toBe(409);
  });

  it("자격 없는 은행 문항 · 낡은 revision · 남의 판본으로는 잇지 못한다", async () => {
    const made = await importedDraft();
    await pg.query(
      `UPDATE "problem" SET "content" = $2, "updated_at" = $3 WHERE "id" = $1`,
      [made.book.problem.id, made.original, sqlNow()],
    );
    const link = (actor: TextbookActor, revision: number) =>
      linkItem(
        db,
        actor,
        made.editionId,
        made.itemId,
        requestKey(actor, "link"),
        { expectedRevision: revision, problemId: made.book.problem.id },
        loadFigure,
      );
    expect((await refusal(link(owner, made.revision))).status).toBe(404);
    expect(await refusal(link(colleague, made.revision - 1))).toMatchObject({
      status: 409,
      code: "REVISION_MISMATCH",
    });
    await pg.query(
      `UPDATE "problem" SET "review_status" = 'pending' WHERE "id" = $1`,
      [made.book.problem.id],
    );
    expect((await refusal(link(colleague, made.revision))).message).toBe(
      "검수를 통과하지 않은 문항입니다.",
    );
  });
});

describe("조판 걸음의 임대 — 잡는 문장 자체", () => {
  it("임대가 살아 있는 걸음은 못 잡고, 끝난 임대는 잡는다. 세 번을 넘겨 잡지 못한다", async () => {
    const draft = await emptyDraft(owner);
    const problem = await insertBankProblem(pg, world.unitId);
    const captured = await captureItems(
      db,
      owner,
      draft.editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: draft.revision,
        sectionId: draft.sectionId,
        source: { kind: "problems", problemIds: [problem.id] },
      },
      loadFigure,
    );
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      draft.editionId,
      { requestId, expectedRevision: captured.aggregateRevision },
      fakeHash(requestId),
      deps,
    );
    const step = { userId: owner.id, requestId, idx: 0 };
    const first = await claimStep(db, step);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    // 사전 검사를 지나친 두 번째 요청이 같은 순간에 잡으려 한다 — 문장이 막아야 한다
    expect(await claimStep(db, step)).toBeNull();
    await pg.query(
      `UPDATE "textbook_publish_step" SET "lease_until" = (now() AT TIME ZONE 'UTC') - interval '1 second' WHERE "request_id" = $1 AND "idx" = 0`,
      [requestId],
    );
    expect(await claimStep(db, step)).not.toBeNull();
    await pg.query(
      `UPDATE "textbook_publish_step" SET "lease_until" = (now() AT TIME ZONE 'UTC') - interval '1 second' WHERE "request_id" = $1 AND "idx" = 0`,
      [requestId],
    );
    expect(await claimStep(db, step)).not.toBeNull();
    await pg.query(
      `UPDATE "textbook_publish_step" SET "lease_until" = (now() AT TIME ZONE 'UTC') - interval '1 second' WHERE "request_id" = $1 AND "idx" = 0`,
      [requestId],
    );
    expect(await claimStep(db, step)).toBeNull();
  });
});

describe("가져오기 — 구조 메타의 id 대응", () => {
  it("예제 묶음 · 참조 항목은 새 배치 id 를, 원본 그림 트리는 새 자산 id 를 가리킨다", async () => {
    const book = await publishedBook(owner);
    const exchange = await assembleExchange(db, book.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const oldItemId = exchange.items[0]!.itemId;
    // 패키지의 자산 번호를 «내용 해시가 아닌» 번호로 바꿔 둔다 — 가져오면 해시 번호로 새로 지어지므로,
    // 구조 안의 번호가 따라 바뀌지 않으면 옛 번호가 그대로 남아 드러난다(같은 번호면 안 바꿔도 통과한다).
    const packagedAssetId = exchange.assets[0]!.assetId;
    const oldAssetId = "legacy-figure-1";
    const rename = (value: any, key?: string): any =>
      typeof value === "string"
        ? value === packagedAssetId && key !== "sha256" && key !== "packagePath"
          ? oldAssetId
          : value
        : Array.isArray(value)
          ? value.map((entry) => rename(entry, key))
          : value && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value).map(([name, entry]) => [
                  name,
                  rename(entry, name),
                ]),
              )
            : value;
    Object.assign(exchange, rename(exchange));
    const img = {
      tag: "img" as const,
      attributes: { assetId: oldAssetId },
    };
    const group = {
      activity: "workedExamples" as const,
      node: {
        kind: "exampleGroup" as const,
        groupId: "example-g1",
        title: "예제",
        strategy: "전략",
        exampleItemId: oldItemId,
        confirmItemIds: [oldItemId, randomUUID()],
      },
    };
    const unknownTarget = randomUUID();
    const section = exchange.units[0]!.sections[0]!;
    section.blocks = [
      { blockId: "h1", kind: "text", markdown: "예제", semantic: group },
      { blockId: "p1", kind: "problem", itemId: oldItemId, semantic: group },
      {
        blockId: "r1",
        kind: "text",
        markdown: "참조",
        semantic: {
          activity: "tableOfContents",
          node: {
            kind: "references",
            entries: [
              { key: "k1", label: "문항", targetItemId: oldItemId },
              { key: "k2", label: "모름", targetItemId: unknownTarget },
            ],
          },
          sourceFooter: [{ tag: "div", children: [img] }],
          sourceQuestionHeader: [{ tag: "p", children: [{ ...img }] }],
        },
      },
    ];
    const files = new Map<string, Uint8Array>();
    for (const asset of exchange.assets) {
      const blob = await pg.query<{ bytes: Uint8Array }>(
        `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
        [asset.sha256],
      );
      files.set(asset.packagePath, blob.rows[0]!.bytes);
    }
    const archive: VerifiedArchive = { exchange, files, validation: {} };
    const zip = Buffer.from(`PK-${randomUUID()}`);
    await putUploadChunk(db, colleague, sha256(zip), 0, zip);
    const upload = await completeUpload(db, colleague, sha256(zip), {
      byteLength: zip.length,
    });
    const result = await importPackage(
      db,
      colleague,
      requestKey(colleague, "import"),
      { mode: "copy", uploadId: upload.uploadId, expectedSha256: sha256(zip) },
      async () => archive,
      loadFigure,
    );
    const newItemId = result.idMap.find(
      (entry) => entry.namespace === "item" && entry.from === oldItemId,
    )!.to;
    const newAssetId = result.idMap.find(
      (entry) => entry.namespace === "asset" && entry.from === oldAssetId,
    )!.to;
    const [row] = (
      await pg.query<{ content: { blocks: Array<Record<string, any>> } }>(
        `SELECT "content" FROM "textbook_section" WHERE "edition_id" = $1`,
        [result.editionId],
      )
    ).rows;
    const blocks = row!.content.blocks;
    for (const index of [0, 1])
      expect(blocks[index]!.semantic.node).toMatchObject({
        exampleItemId: newItemId,
        confirmItemIds: [newItemId, group.node.confirmItemIds[1]],
      });
    expect(blocks[1]!.itemId).toBe(newItemId);
    const meta = blocks[2]!.semantic;
    expect(meta.node.entries.map((e: any) => e.targetItemId)).toEqual([
      newItemId,
      unknownTarget,
    ]);
    expect(meta.sourceFooter[0].children[0].attributes.assetId).toBe(
      newAssetId,
    );
    expect(meta.sourceQuestionHeader[0].children[0].attributes.assetId).toBe(
      newAssetId,
    );
    expect(JSON.stringify(row!.content)).not.toContain(oldItemId);
    expect(newAssetId).not.toBe(oldAssetId);
    expect(JSON.stringify(row!.content)).not.toContain(oldAssetId);
  });
});
