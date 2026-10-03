// @vitest-environment node
/**
 * 발행 뒤의 흐름 — 영상 검수 · 배정과 학생 QR 판정 · 백지 활동 · 올리기와 자산 읽기 · 재출제 · 가져오기 · 내보내기.
 * 서버 코드를 PGlite(실제 마이그레이션 사슬) 위에서 그대로 돌린다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { contentHash, sha256 } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import {
  createAssignment,
  listAssignments,
  revokeAssignment,
} from "@/lib/textbook/server/assignments";
import {
  completeUpload,
  putUploadChunk,
  registerUploadedAsset,
} from "@/lib/textbook/server/blobs";
import { createBook, updateBook } from "@/lib/textbook/server/books";
import {
  artifactSource,
  editionAssetSource,
  parseRange,
  serveBytes,
} from "@/lib/textbook/server/bytes";
import {
  type ConceptReviewer,
  recordObservation,
  reviewAttempt,
  saveConcept,
  studentConceptAttempts,
} from "@/lib/textbook/server/conceptRows";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { exportEdition } from "@/lib/textbook/server/exportEdition";
import {
  type VerifiedArchive,
  importPackage,
} from "@/lib/textbook/server/imports";
import { captureItems } from "@/lib/textbook/server/items";
import { reissueTest } from "@/lib/textbook/server/reissue";
import { getSection, saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import {
  createBinding,
  createVideo,
  listBindings,
  updateBinding,
} from "@/lib/textbook/server/videos";
import {
  qrTargetReferencesAsset,
  resolveStudentQr,
} from "@/lib/textbook/studentAccess";

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
let outsider: TextbookActor;

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
  outsider = await insertTeacher(pg, {
    branchId: await insertBranch(pg),
    name: "다른 지점",
  });
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
  const studentId = randomUUID();
  await pg.query(
    `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1, $2, '학생', $3)`,
    [studentId, classId, sqlNow()],
  );
  return { classId, studentId };
}

const reviewer: ConceptReviewer = (input, options) => ({
  ...input,
  links: input.links.map((link) =>
    options.confirmLinkIds?.includes(link.linkId)
      ? {
          ...link,
          review: {
            ...link.review,
            status: "confirmed",
            reviewedBy: options.reviewerId,
            reviewedAt: options.now,
            targetHash: fakeHash(link.linkId),
          },
        }
      : link,
  ),
});

const concept = (
  conceptKey: string,
  overrides: Partial<TextbookConcept> = {},
): TextbookConcept => ({
  conceptKey,
  unitKey: "u1",
  sectionKey: null,
  title: "순환소수",
  kind: "정의",
  unitId: null,
  body: {
    goal: "순환소수를 설명한다",
    prerequisites: [],
    definition:
      "소수점 아래의 어떤 자리부터 일정한 숫자의 배열이 끝없이 되풀이되는 소수",
    conditions: null,
    examples: [],
    counterexamples: [],
    misconceptions: [],
    explainPrompt: null,
  },
  blankItems: [],
  links: [],
  mappingVersion: "m1",
  derivedFromConceptKey: null,
  frozen: null,
  ...overrides,
});

/** 구획 둘 · 문항 셋(첫 문항에 그림) · 개념 하나가 놓인 판본 — `publish` 면 발행까지 */
async function book(
  actor: TextbookActor,
  options: { publish?: boolean; shared?: boolean } = {},
) {
  const { book: created } = await createBook(
    db,
    actor,
    requestKey(actor, "book-create"),
    { config: sampleConfig() },
  );
  const editionId = created.draftEditionId!;
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
          title: "유리수",
          sourceUnitIds: [],
          prerequisites: [],
          goals: [],
          conceptLectureRefs: [],
          sections: [],
        },
      ],
    },
  );
  const sectionIds = [randomUUID(), randomUUID()];
  let revision = 0;
  for (const [index, sectionId] of sectionIds.entries())
    revision = (
      await saveSection(
        db,
        actor,
        editionId,
        sectionId,
        requestKey(actor, "section-save"),
        {
          expectedRevision: 0,
          unitKey: "u1",
          section: {
            sectionKey: `s${index}`,
            title: `구획 ${index}`,
            templateKey: "basic",
            startPolicy: "even-left",
            blocks: [],
          },
        },
      )
    ).aggregateRevision;
  const figurePath = `/figures/flows/${randomUUID()}.png`;
  figures.set(figurePath, tinyPng(40, 30, figurePath));
  const problems = [
    await insertBankProblem(pg, world.unitId, {
      content: "가",
      answer: "1",
      figureUrls: [figurePath],
      figureDims: [40, 30],
    }),
    await insertBankProblem(pg, world.unitId, { content: "나", answer: "2" }),
    await insertBankProblem(pg, world.unitId, { content: "다", answer: "3" }),
  ];
  const first = await captureItems(
    db,
    actor,
    editionId,
    requestKey(actor, "capture"),
    {
      expectedRevision: revision,
      sectionId: sectionIds[0]!,
      source: {
        kind: "problems",
        problemIds: [problems[0]!.id, problems[1]!.id],
      },
    },
    loadFigure,
  );
  const second = await captureItems(
    db,
    actor,
    editionId,
    requestKey(actor, "capture"),
    {
      expectedRevision: first.aggregateRevision,
      sectionId: sectionIds[1]!,
      source: { kind: "problems", problemIds: [problems[2]!.id] },
    },
    loadFigure,
  );
  const conceptKey = "순환소수";
  await saveConcept(
    db,
    actor,
    editionId,
    conceptKey,
    requestKey(actor, "concept-save"),
    { expectedRevision: 0, concept: concept(conceptKey) },
    reviewer,
  );
  const section = await getSection(db, actor, editionId, sectionIds[1]!);
  const placed = await saveSection(
    db,
    actor,
    editionId,
    sectionIds[1]!,
    requestKey(actor, "section-save"),
    {
      expectedRevision: section.revision,
      unitKey: "u1",
      section: {
        ...section.section,
        blocks: [
          { blockId: "c", kind: "concept", conceptKey },
          ...section.section.blocks,
        ],
      },
    },
  );
  const made = {
    bookId: created.id,
    editionId,
    sectionIds,
    problems,
    items: [...first.items, ...second.items],
    conceptKey,
    revision: placed.aggregateRevision,
  };
  if (options.publish) {
    const requestId = randomUUID();
    await reservePublish(
      db,
      actor,
      editionId,
      { requestId, expectedRevision: made.revision },
      fakeHash(requestId),
      deps,
    );
    let job = await runNextStep(db, actor, editionId, requestId, deps);
    while (job.status === "rendering" || job.status === "verifying")
      job = await runNextStep(db, actor, editionId, requestId, deps);
    await finalizePublish(db, actor, editionId, requestId, deps);
  }
  if (options.shared)
    await updateBook(db, actor, created.id, requestKey(actor, "book-update"), {
      visibility: "branch",
    });
  return made;
}

const slugOf = async (
  editionId: string,
  target: { itemId?: string; conceptKey?: string },
) =>
  (
    await pg.query<{ slug: string }>(
      `SELECT "slug" FROM "textbook_qr_target" WHERE "edition_id" = $1 AND ("item_id" = $2 OR "concept_key" = $3)`,
      [editionId, target.itemId ?? null, target.conceptKey ?? null],
    )
  ).rows[0]!.slug;

describe("개념 — 저장과 확인", () => {
  it("확인은 서버가 찍는다. 저장하면 굳은 내용은 비고, 낡은 revision 은 409", async () => {
    const made = await book(owner);
    const link = {
      linkId: "l1",
      target: { namespace: "explorer-card" as const, cardId: "card-1" },
      relation: "same" as const,
      review: {
        status: "confirmed" as const,
        candidateRule: "manual" as const,
        reviewedBy: outsider.id,
        reviewedAt: "2020-01-01T00:00:00.000Z",
        targetHash: fakeHash("claimed"),
      },
    };
    // 화면이 «확인됨»이라 적어 보내도 확인 목록에 없으면 서버는 그 표시를 그대로 통과시킬 뿐 스스로 찍지 않는다 —
    // 확인을 찍는 것은 `review` 이고, 여기서는 confirmLinkIds 에 든 것만 이 계정의 확인으로 바뀐다
    const saved = await saveConcept(
      db,
      owner,
      made.editionId,
      made.conceptKey,
      requestKey(owner, "concept-save"),
      {
        expectedRevision: 1,
        concept: concept(made.conceptKey, {
          links: [link],
          frozen: {
            contentHash: fakeHash("x"),
            parserVersion: "p",
            compositionVersion: "c",
            mappingVersion: "m",
            sections: [],
            entries: [],
            selection: [],
            assetHashes: [],
          },
        }),
        confirmLinkIds: ["l1"],
      },
      reviewer,
    );
    expect(saved.revision).toBe(2);
    expect(saved.concept.frozen).toBeNull();
    expect(saved.concept.links[0]!.review).toMatchObject({
      status: "confirmed",
      reviewedBy: owner.id,
      targetHash: fakeHash("l1"),
    });
    // 놓인 구획은 구획 저장이 정한 그대로다(개념 저장이 자리를 바꾸지 않는다)
    expect(saved.concept.sectionKey).toBe("s1");
    const stale = await refusal(
      saveConcept(
        db,
        owner,
        made.editionId,
        made.conceptKey,
        requestKey(owner, "concept-save"),
        { expectedRevision: 1, concept: concept(made.conceptKey) },
        reviewer,
      ),
    );
    expect(stale).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    expect(
      (
        await refusal(
          saveConcept(
            db,
            colleague,
            made.editionId,
            "남의개념",
            requestKey(colleague, "concept-save"),
            { expectedRevision: 0, concept: concept("남의개념") },
            reviewer,
          ),
        )
      ).status,
    ).toBe(404);
  });

  it("발행 예약이 개념을 굳히고, 발행본의 개념은 저장하지 못한다", async () => {
    const made = await book(owner, { publish: true });
    const { rows } = await pg.query<{ hash: string }>(
      `SELECT "frozen" ->> 'contentHash' AS hash FROM "textbook_concept" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    expect(rows[0]!.hash).toBe(fakeHash(`frozen:${made.conceptKey}`));
    const error = await refusal(
      saveConcept(
        db,
        owner,
        made.editionId,
        made.conceptKey,
        requestKey(owner, "concept-save"),
        { expectedRevision: 1, concept: concept(made.conceptKey) },
        reviewer,
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "CONFLICT" });
  });
});

describe("영상 연결 — 검수한 것만 게시된다", () => {
  const write = (
    videoId: string,
    status: "draft" | "review" | "published" | "withdrawn",
    hash: string,
    start = 0,
  ) => ({
    videoId,
    startSeconds: start,
    endSeconds: null,
    status,
    expectedContentHash: hash,
  });
  async function setup() {
    const made = await book(owner);
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const snapshot = exchange.snapshots[0]!;
    const { video } = await createVideo(
      db,
      owner,
      requestKey(owner, "video-create"),
      {
        title: "풀이 영상",
        provider: "youtube",
        providerVideoId: randomUUID().replaceAll("-", "").slice(0, 11),
      },
    );
    return { made, snapshot, video };
  }

  it("초안 → 검수 대기 → 게시. 게시할 때 확정본의 내용 해시가 적힌다", async () => {
    const { made, snapshot, video } = await setup();
    const { binding } = await createBinding(
      db,
      owner,
      snapshot.snapshotId,
      requestKey(owner, "binding-create"),
      write(video.id, "review", snapshot.contentHash, 12.5),
    );
    expect(binding).toMatchObject({
      status: "review",
      startSeconds: 12.5,
      reviewedAgainstHash: null,
    });
    const published = await updateBinding(
      db,
      owner,
      binding.bindingId,
      requestKey(owner, "binding-update"),
      write(video.id, "published", snapshot.contentHash),
    );
    expect(published.binding).toMatchObject({
      status: "published",
      reviewedAgainstHash: snapshot.contentHash,
    });
    expect(
      (await listBindings(db, owner, made.editionId)).map(
        (entry) => entry.bindingId,
      ),
    ).toEqual([binding.bindingId]);
    // 교환 형식에는 게시한 연결만 실린다
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.videoBindings).toEqual([published.binding]);
  });

  it("처음부터 게시로 만들지 못한다 · 검수 대기를 거치지 않은 연결은 게시하지 못한다", async () => {
    const { snapshot, video } = await setup();
    expect(
      (
        await refusal(
          createBinding(
            db,
            owner,
            snapshot.snapshotId,
            requestKey(owner, "binding-create"),
            write(video.id, "published", snapshot.contentHash),
          ),
        )
      ).status,
    ).toBe(400);
    const { binding } = await createBinding(
      db,
      owner,
      snapshot.snapshotId,
      requestKey(owner, "binding-create"),
      write(video.id, "draft", snapshot.contentHash),
    );
    const error = await refusal(
      updateBinding(
        db,
        owner,
        binding.bindingId,
        requestKey(owner, "binding-update"),
        write(video.id, "published", snapshot.contentHash),
      ),
    );
    expect(error.status).toBe(409);
  });

  it("검수자가 본 해시가 지금 확정본과 다르면 게시하지 못한다", async () => {
    const { snapshot, video } = await setup();
    const { binding } = await createBinding(
      db,
      owner,
      snapshot.snapshotId,
      requestKey(owner, "binding-create"),
      write(video.id, "review", snapshot.contentHash),
    );
    const error = await refusal(
      updateBinding(
        db,
        owner,
        binding.bindingId,
        requestKey(owner, "binding-update"),
        write(video.id, "published", fakeHash("다른 내용")),
      ),
    );
    expect(error.status).toBe(409);
    expect(await listBindings(db, owner)).toContainEqual(
      expect.objectContaining({
        bindingId: binding.bindingId,
        status: "review",
      }),
    );
  });

  it("교체하면 옛 게시 연결은 중지되고 줄은 남는다 — 확정본마다 게시 영상은 하나다", async () => {
    const { snapshot, video } = await setup();
    const publish = async () => {
      const { binding } = await createBinding(
        db,
        owner,
        snapshot.snapshotId,
        requestKey(owner, "binding-create"),
        write(video.id, "review", snapshot.contentHash),
      );
      return (
        await updateBinding(
          db,
          owner,
          binding.bindingId,
          requestKey(owner, "binding-update"),
          write(video.id, "published", snapshot.contentHash),
        )
      ).binding;
    };
    const first = await publish();
    const second = await publish();
    const all = (await listBindings(db, owner)).filter(
      (entry) => entry.snapshotId === snapshot.snapshotId,
    );
    expect(
      all
        .map(
          (entry) =>
            `${entry.bindingId === first.bindingId ? "first" : "second"}:${entry.status}`,
        )
        .sort(),
    ).toEqual(["first:withdrawn", "second:published"]);
    expect(second.status).toBe("published");
    // 게시한 연결은 고치지 못한다
    expect(
      (
        await refusal(
          updateBinding(
            db,
            owner,
            second.bindingId,
            requestKey(owner, "binding-update"),
            write(video.id, "review", snapshot.contentHash, 30),
          ),
        )
      ).status,
    ).toBe(409);
  });

  it("남의 확정본 · 남의 영상에는 연결하지 못한다", async () => {
    const { snapshot, video } = await setup();
    const theirs = await createVideo(
      db,
      colleague,
      requestKey(colleague, "video-create"),
      {
        title: "남의 영상",
        provider: "youtube",
        providerVideoId: "abcdefghijk",
      },
    );
    expect(
      (
        await refusal(
          createBinding(
            db,
            colleague,
            snapshot.snapshotId,
            requestKey(colleague, "binding-create"),
            write(theirs.video.id, "draft", snapshot.contentHash),
          ),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await refusal(
          createBinding(
            db,
            owner,
            snapshot.snapshotId,
            requestKey(owner, "binding-create"),
            write(theirs.video.id, "draft", snapshot.contentHash),
          ),
        )
      ).status,
    ).toBe(404);
    expect(video.provider).toBe("youtube");
  });
});

describe("배정과 학생 QR", () => {
  const assign = (
    actor: TextbookActor,
    editionId: string,
    input: Partial<Parameters<typeof createAssignment>[4]> & {
      subject: Parameters<typeof createAssignment>[4]["subject"];
    },
  ) =>
    createAssignment(db, actor, editionId, requestKey(actor, "assign"), {
      scope: { kind: "edition" },
      startsAt: "2026-01-01T00:00:00.000Z",
      expiresAt: null,
      ...input,
    });

  it("초안은 배정하지 못한다 · 남의 반에는 배정하지 못한다 · 범위는 그 판본의 것이어야 한다", async () => {
    const draft = await book(owner);
    const mine = await classOf(owner);
    expect(
      (
        await refusal(
          assign(owner, draft.editionId, {
            subject: { kind: "class", classId: mine.classId },
          }),
        )
      ).status,
    ).toBe(409);
    const made = await book(owner, { publish: true });
    const theirs = await classOf(colleague);
    expect(
      (
        await refusal(
          assign(owner, made.editionId, {
            subject: { kind: "class", classId: theirs.classId },
          }),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await refusal(
          assign(owner, made.editionId, {
            subject: { kind: "student", studentId: theirs.studentId },
          }),
        )
      ).status,
    ).toBe(404);
    const other = await book(owner, { publish: true });
    expect(
      (
        await refusal(
          assign(owner, made.editionId, {
            subject: { kind: "class", classId: mine.classId },
            scope: { kind: "sections", sectionIds: [other.sectionIds[0]!] },
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await refusal(
          assign(owner, made.editionId, {
            subject: { kind: "class", classId: mine.classId },
            scope: { kind: "items", itemIds: [other.items[0]!.itemId] },
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("배정이 없으면 학생은 열지 못한다. 반에 배정하면 열리고, 회수하면 다음 요청에 닫힌다", async () => {
    const made = await book(owner, { publish: true });
    const mine = await classOf(owner);
    const slug = await slugOf(made.editionId, {
      itemId: made.items[0]!.itemId,
    });
    expect(await resolveStudentQr(db, mine.studentId, slug)).toEqual({
      ok: false,
      reason: "not-assigned",
    });
    const { assignment } = await assign(owner, made.editionId, {
      subject: { kind: "class", classId: mine.classId },
    });
    const opened = await resolveStudentQr(db, mine.studentId, slug);
    expect(opened).toMatchObject({
      ok: true,
      target: {
        kind: "item",
        itemId: made.items[0]!.itemId,
        editionId: made.editionId,
      },
    });
    expect(
      (await listAssignments(db, owner, made.editionId)).map(
        (entry) => entry.id,
      ),
    ).toEqual([assignment.id]);
    const revoked = await revokeAssignment(
      db,
      owner,
      made.editionId,
      assignment.id,
      requestKey(owner, "assign-revoke"),
    );
    expect(revoked.assignment.revokedAt).not.toBeNull();
    expect(await resolveStudentQr(db, mine.studentId, slug)).toEqual({
      ok: false,
      reason: "not-assigned",
    });
  });

  it("범위 밖의 문항 · 아직 열리지 않은 배정 · 만료된 배정은 열리지 않는다", async () => {
    const made = await book(owner, { publish: true });
    const mine = await classOf(owner);
    const [inFirst, inSecond] = [
      await slugOf(made.editionId, { itemId: made.items[0]!.itemId }),
      await slugOf(made.editionId, { itemId: made.items[2]!.itemId }),
    ];
    await assign(owner, made.editionId, {
      subject: { kind: "student", studentId: mine.studentId },
      scope: { kind: "sections", sectionIds: [made.sectionIds[0]!] },
    });
    expect((await resolveStudentQr(db, mine.studentId, inFirst)).ok).toBe(true);
    expect(await resolveStudentQr(db, mine.studentId, inSecond)).toEqual({
      ok: false,
      reason: "not-assigned",
    });

    const later = await classOf(owner);
    await assign(owner, made.editionId, {
      subject: { kind: "class", classId: later.classId },
      startsAt: "2999-01-01T00:00:00.000Z",
    });
    expect(await resolveStudentQr(db, later.studentId, inFirst)).toEqual({
      ok: false,
      reason: "not-assigned",
    });
    const past = await classOf(owner);
    await assign(owner, made.editionId, {
      subject: { kind: "class", classId: past.classId },
      startsAt: "2020-01-01T00:00:00.000Z",
      expiresAt: "2020-02-01T00:00:00.000Z",
    });
    expect(await resolveStudentQr(db, past.studentId, inFirst)).toEqual({
      ok: false,
      reason: "not-assigned",
    });
  });

  it("배치 범위 배정은 그 배치만 연다. 개념 QR 은 그 개념을 연습하는 배치가 범위에 있을 때 열린다", async () => {
    const made = await book(owner);
    const captured = made.items[2]!;
    // 셋째 배치가 이 개념을 연습한다
    const { updateItem } = await import("@/lib/textbook/server/items");
    const updated = await updateItem(
      db,
      owner,
      made.editionId,
      captured.itemId,
      requestKey(owner, "item-update"),
      {
        expectedRevision: made.revision,
        conceptKeys: [made.conceptKey],
      },
    );
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      made.editionId,
      { requestId, expectedRevision: updated.aggregateRevision },
      fakeHash(requestId),
      deps,
    );
    let job = await runNextStep(db, owner, made.editionId, requestId, deps);
    while (job.status === "rendering" || job.status === "verifying")
      job = await runNextStep(db, owner, made.editionId, requestId, deps);
    await finalizePublish(db, owner, made.editionId, requestId, deps);

    const conceptSlug = await slugOf(made.editionId, {
      conceptKey: made.conceptKey,
    });
    const firstClass = await classOf(owner);
    await assign(owner, made.editionId, {
      subject: { kind: "class", classId: firstClass.classId },
      scope: { kind: "items", itemIds: [made.items[0]!.itemId] },
    });
    expect(
      (
        await resolveStudentQr(
          db,
          firstClass.studentId,
          await slugOf(made.editionId, { itemId: made.items[0]!.itemId }),
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await resolveStudentQr(
          db,
          firstClass.studentId,
          await slugOf(made.editionId, { itemId: made.items[1]!.itemId }),
        )
      ).ok,
    ).toBe(false);
    expect(
      (await resolveStudentQr(db, firstClass.studentId, conceptSlug)).ok,
    ).toBe(false);
    const secondClass = await classOf(owner);
    await assign(owner, made.editionId, {
      subject: { kind: "class", classId: secondClass.classId },
      scope: { kind: "items", itemIds: [captured.itemId] },
    });
    expect(
      await resolveStudentQr(db, secondClass.studentId, conceptSlug),
    ).toMatchObject({
      ok: true,
      target: { kind: "concept", conceptKey: made.conceptKey },
    });
  });

  it("예약만 된 QR · 없는 주소는 학생에게 같은 «없음»이다", async () => {
    const made = await book(owner);
    const mine = await classOf(owner);
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      made.editionId,
      { requestId, expectedRevision: made.revision },
      fakeHash(requestId),
      deps,
    );
    const reserved = await slugOf(made.editionId, {
      itemId: made.items[0]!.itemId,
    });
    expect(await resolveStudentQr(db, mine.studentId, reserved)).toEqual({
      ok: false,
      reason: "not-found",
    });
    expect(
      await resolveStudentQr(db, mine.studentId, "0123456789abcdefghjk"),
    ).toEqual({ ok: false, reason: "not-found" });
    expect(await resolveStudentQr(db, mine.studentId, "x")).toEqual({
      ok: false,
      reason: "not-found",
    });
  });

  it("판본을 종료하거나 QR 을 중지하면 «닫힘»이다. 반을 옮기면 옛 반의 배정은 닫힌다", async () => {
    const made = await book(owner, { publish: true });
    const mine = await classOf(owner);
    await assign(owner, made.editionId, {
      subject: { kind: "class", classId: mine.classId },
    });
    const slug = await slugOf(made.editionId, {
      itemId: made.items[0]!.itemId,
    });
    await pg.query(
      `UPDATE "textbook_qr_target" SET "suspended_at" = $2 WHERE "slug" = $1`,
      [slug, sqlNow()],
    );
    expect(await resolveStudentQr(db, mine.studentId, slug)).toEqual({
      ok: false,
      reason: "closed",
    });
    await pg.query(
      `UPDATE "textbook_qr_target" SET "suspended_at" = NULL WHERE "slug" = $1`,
      [slug],
    );
    const elsewhere = await classOf(owner);
    await pg.query(`UPDATE "student" SET "class_id" = $2 WHERE "id" = $1`, [
      mine.studentId,
      elsewhere.classId,
    ]);
    expect(await resolveStudentQr(db, mine.studentId, slug)).toEqual({
      ok: false,
      reason: "not-assigned",
    });
    await pg.query(`UPDATE "student" SET "class_id" = $2 WHERE "id" = $1`, [
      mine.studentId,
      mine.classId,
    ]);
    await pg.query(
      `UPDATE "textbook_edition" SET "status" = 'retired', "retired_at" = $2 WHERE "id" = $1`,
      [made.editionId, sqlNow()],
    );
    expect(await resolveStudentQr(db, mine.studentId, slug)).toEqual({
      ok: false,
      reason: "closed",
    });
  });

  it("공유한 발행본은 동료가 자기 반에 배정한다. 주인이 지점을 떠나면 그 배정은 닫힌다", async () => {
    const mover = await insertTeacher(pg, { branchId, name: "떠날 주인" });
    const made = await book(mover, { publish: true, shared: true });
    const theirs = await classOf(colleague);
    const slug = await slugOf(made.editionId, {
      itemId: made.items[0]!.itemId,
    });
    await assign(colleague, made.editionId, {
      subject: { kind: "class", classId: theirs.classId },
    });
    expect((await resolveStudentQr(db, theirs.studentId, slug)).ok).toBe(true);
    // 다른 지점의 교사는 그 판본을 읽지 못하므로 배정도 못 한다
    const far = await classOf(outsider);
    expect(
      (
        await refusal(
          assign(outsider, made.editionId, {
            subject: { kind: "class", classId: far.classId },
          }),
        )
      ).status,
    ).toBe(404);
    await pg.query(`UPDATE "user" SET "branch_id" = $2 WHERE "id" = $1`, [
      mover.id,
      outsider.branchId,
    ]);
    expect(await resolveStudentQr(db, theirs.studentId, slug)).toEqual({
      ok: false,
      reason: "not-assigned",
    });
  });

  it("학생용 그림은 그 QR 의 문항이 가리키는 자산만 연다", async () => {
    const made = await book(owner, { publish: true });
    const mine = await classOf(owner);
    await assign(owner, made.editionId, {
      subject: { kind: "class", classId: mine.classId },
    });
    const withFigure = await resolveStudentQr(
      db,
      mine.studentId,
      await slugOf(made.editionId, { itemId: made.items[0]!.itemId }),
    );
    const without = await resolveStudentQr(
      db,
      mine.studentId,
      await slugOf(made.editionId, { itemId: made.items[1]!.itemId }),
    );
    if (!withFigure.ok || !without.ok)
      throw new Error("배정이 열려 있어야 한다");
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const assetId = exchange.assets[0]!.assetId;
    expect(await qrTargetReferencesAsset(db, withFigure.target, assetId)).toBe(
      true,
    );
    // 같은 판본의 그림이어도 다른 문항의 QR 로는 열지 못한다
    expect(await qrTargetReferencesAsset(db, without.target, assetId)).toBe(
      false,
    );
    expect(
      await qrTargetReferencesAsset(
        db,
        withFigure.target,
        fakeHash("없는 그림"),
      ),
    ).toBe(false);
  });
});

describe("백지 활동 — 교사의 종이 확인", () => {
  it("발행본의 개념에만 기록한다 · 내 학생만 · 같은 요청은 한 줄 · 확인은 revision 으로", async () => {
    const draft = await book(owner);
    const mine = await classOf(owner);
    const observe = (
      actor: TextbookActor,
      editionId: string,
      studentId: string,
      requestId = randomUUID(),
      text = "지도를 그렸다",
    ) =>
      recordObservation(
        db,
        actor,
        editionId,
        "순환소수",
        { requestId, studentId, form: "map", observation: text },
        fakeHash(`${requestId}:${text}`),
      );
    expect(
      (await refusal(observe(owner, draft.editionId, mine.studentId))).status,
    ).toBe(409);
    const made = await book(owner, { publish: true });
    const theirs = await classOf(colleague);
    expect(
      (await refusal(observe(owner, made.editionId, theirs.studentId))).status,
    ).toBe(404);
    const requestId = randomUUID();
    const first = await observe(
      owner,
      made.editionId,
      mine.studentId,
      requestId,
    );
    expect(first.attempt).toMatchObject({
      channel: "teacher-observed",
      form: "map",
      reviewStatus: "pending",
      revision: 1,
      response: "지도를 그렸다",
    });
    const again = await observe(
      owner,
      made.editionId,
      mine.studentId,
      requestId,
    );
    expect(again).toMatchObject({
      replayed: true,
      attempt: { attemptId: first.attempt.attemptId },
    });
    expect(
      (
        await refusal(
          observe(owner, made.editionId, mine.studentId, requestId, "다른 글"),
        )
      ).status,
    ).toBe(409);

    const reviewed = await reviewAttempt(
      db,
      owner,
      first.attempt.attemptId,
      requestKey(owner, "attempt-review"),
      {
        expectedRevision: 1,
        reviewStatus: "needs-review",
        note: "조건이 빠졌다",
      },
    );
    expect(reviewed.attempt).toMatchObject({
      reviewStatus: "needs-review",
      reviewedBy: owner.id,
      revision: 2,
      response: "지도를 그렸다",
    });
    expect(
      (
        await refusal(
          reviewAttempt(
            db,
            owner,
            first.attempt.attemptId,
            requestKey(owner, "attempt-review"),
            { expectedRevision: 1, reviewStatus: "checked", note: null },
          ),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await refusal(
          reviewAttempt(
            db,
            colleague,
            first.attempt.attemptId,
            requestKey(colleague, "attempt-review"),
            { expectedRevision: 2, reviewStatus: "checked", note: null },
          ),
        )
      ).status,
    ).toBe(404);
    expect(
      (await studentConceptAttempts(db, owner, mine.studentId)).map(
        (entry) => entry.attemptId,
      ),
    ).toEqual([first.attempt.attemptId]);
    expect(
      (await refusal(studentConceptAttempts(db, colleague, mine.studentId)))
        .status,
    ).toBe(404);
  });
});

describe("올리기와 자산 읽기", () => {
  const upload = async (
    actor: TextbookActor,
    bytes: Buffer,
    chunk = 1_000_000,
  ) => {
    const hash = sha256(bytes);
    const offsets = [];
    for (let offset = 0; offset < bytes.length; offset += chunk)
      offsets.push(offset);
    for (const offset of offsets.reverse())
      await putUploadChunk(
        db,
        actor,
        hash,
        offset,
        bytes.subarray(offset, offset + chunk),
      );
    return {
      hash,
      done: await completeUpload(db, actor, hash, {
        byteLength: bytes.length,
        fileName: "그림.png",
      }),
    };
  };

  it("조각을 뒤섞어 올려도 이어 붙인 해시가 맞으면 받아들인다. 그 바이트가 자산이 된다", async () => {
    const bytes = Buffer.concat([
      tinyPng(320, 240, "uploaded"),
      Buffer.alloc(2_200_000, 7),
    ]);
    const { hash, done } = await upload(owner, bytes);
    expect(done).toMatchObject({ sha256: hash, byteLength: bytes.length });
    const asset = await registerUploadedAsset(db, owner, done.uploadId, {
      kind: "image",
      name: "그림.png",
    });
    expect(asset).toEqual({
      assetId: hash,
      mimeType: "image/png",
      widthPx: 320,
      heightPx: 240,
    });
    const chunks = await pg.query(
      `SELECT 1 FROM "textbook_upload_chunk" WHERE "upload_id" = $1`,
      [done.uploadId],
    );
    expect(chunks.rows).toEqual([]);
    // 이미 끝난 올리기를 다시 끝맺어도 같은 결과다
    expect(
      await completeUpload(db, owner, hash, { byteLength: bytes.length }),
    ).toMatchObject({ uploadId: done.uploadId });
  });

  it("주소의 해시와 다른 바이트 · 빈틈이 있는 조각 · 크기가 다른 끝맺기는 거절하고 올리던 것을 버린다", async () => {
    const bytes = Buffer.from("실제로 올린 바이트");
    const wrong = fakeHash("주장한 해시");
    await putUploadChunk(db, owner, wrong, 0, bytes);
    expect(
      (
        await refusal(
          completeUpload(db, owner, wrong, { byteLength: bytes.length }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await pg.query(`SELECT 1 FROM "textbook_upload" WHERE "sha256" = $1`, [
          wrong,
        ])
      ).rows,
    ).toEqual([]);
    expect(
      (
        await pg.query(`SELECT 1 FROM "textbook_blob" WHERE "sha256" = $1`, [
          wrong,
        ])
      ).rows,
    ).toEqual([]);

    const whole = Buffer.alloc(3000, 1);
    const hash = sha256(whole);
    await putUploadChunk(db, owner, hash, 0, whole.subarray(0, 1000));
    await putUploadChunk(db, owner, hash, 2000, whole.subarray(2000));
    expect(
      (await refusal(completeUpload(db, owner, hash, { byteLength: 3000 })))
        .status,
    ).toBe(400);

    const sized = Buffer.from("크기");
    await putUploadChunk(db, owner, sha256(sized), 0, sized);
    expect(
      (
        await refusal(
          completeUpload(db, owner, sha256(sized), {
            byteLength: sized.length + 1,
          }),
        )
      ).status,
    ).toBe(400);
  });

  it("그림이 아닌 바이트 · 스크립트가 든 SVG 는 자산이 되지 못한다. 남의 올리기는 내 자산이 되지 못한다", async () => {
    const text = await upload(owner, Buffer.from("그냥 글자"));
    expect(
      (
        await refusal(
          registerUploadedAsset(db, owner, text.done.uploadId, {
            kind: "image",
            name: "x.png",
          }),
        )
      ).status,
    ).toBe(400);
    const svg = await upload(
      owner,
      Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg"><script>x()</script></svg>`,
      ),
    );
    expect(
      (
        await refusal(
          registerUploadedAsset(db, owner, svg.done.uploadId, {
            kind: "image",
            name: "x.svg",
          }),
        )
      ).status,
    ).toBe(400);
    const png = await upload(owner, tinyPng(8, 8, "남의 것"));
    expect(
      (
        await refusal(
          registerUploadedAsset(db, colleague, png.done.uploadId, {
            kind: "image",
            name: "x.png",
          }),
        )
      ).status,
    ).toBe(404);
  });

  it("자산은 판본의 색인을 지나서만 읽힌다 — 해시를 알아도 다른 판본 · 남의 판본으로는 못 읽는다", async () => {
    const made = await book(owner, { publish: true, shared: true });
    const other = await book(owner);
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const assetId = exchange.assets[0]!.assetId;
    const source = await editionAssetSource(db, owner, made.editionId, assetId);
    expect(source).toMatchObject({ sha256: assetId, mimeType: "image/png" });
    // 지점에 공유된 발행본이면 동료도 그 판본의 자산을 읽는다
    expect(
      (await editionAssetSource(db, colleague, made.editionId, assetId)).size,
    ).toBe(source.size);
    expect(
      (await refusal(editionAssetSource(db, outsider, made.editionId, assetId)))
        .status,
    ).toBe(404);
    // 그 자산을 가리키지 않는 판본으로는 못 읽는다
    const elsewhere = await assembleExchange(db, other.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(elsewhere.assets.some((asset) => asset.assetId === assetId)).toBe(
      false,
    );
    expect(
      (await refusal(editionAssetSource(db, owner, other.editionId, assetId)))
        .status,
    ).toBe(404);

    const response = await serveBytes(
      db,
      new Request("https://x.test/a", { headers: { range: "bytes=0-7" } }),
      source,
    );
    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe(
      `bytes 0-7/${source.size}`,
    );
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const whole = await serveBytes(db, new Request("https://x.test/a"), source);
    expect(whole.status).toBe(200);
    expect((await whole.arrayBuffer()).byteLength).toBe(source.size);
  });

  it("산출물도 그 판본의 것만 읽힌다. 구간 모양이 틀리면 416", async () => {
    const made = await book(owner, { publish: true });
    const artifacts = await pg.query<{ id: string; kind: string }>(
      `SELECT "id", "kind" FROM "textbook_artifact" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    const pdf = artifacts.rows.find((row) => row.kind === "student-pdf")!;
    const source = await artifactSource(db, owner, made.editionId, pdf.id);
    expect(source).toMatchObject({
      mimeType: "application/pdf",
      downloadName: "student-pdf.pdf",
    });
    expect(
      (await refusal(artifactSource(db, colleague, made.editionId, pdf.id)))
        .status,
    ).toBe(404);
    const other = await book(owner);
    expect(
      (await refusal(artifactSource(db, owner, other.editionId, pdf.id)))
        .status,
    ).toBe(404);
    expect(parseRange("bytes=5-", 10)).toEqual({ start: 5, end: 9 });
    expect(parseRange("bytes=-3", 10)).toEqual({ start: 7, end: 9 });
    expect(() => parseRange("bytes=20-30", 10)).toThrow(TextbookError);
    expect(() => parseRange("items=0-1", 10)).toThrow(TextbookError);
  });
});

describe("같은 문제로 다시 출제", () => {
  const reissue = (
    actor: TextbookActor,
    editionId: string,
    itemIds: string[],
    classId: string,
  ) =>
    reissueTest(db, actor, editionId, requestKey(actor, "reissue", itemIds), {
      itemIds,
      classId,
      testType: "review",
      rangeEndUnitId: world.unitId,
    });

  it("새 시험지의 문항마다 확정본이 달린다 — 뒤에 은행 문항을 고쳐도 그 확정본은 그대로다", async () => {
    const made = await book(owner, { publish: true });
    const mine = await classOf(owner);
    const result = await reissue(
      owner,
      made.editionId,
      [made.items[2]!.itemId, made.items[0]!.itemId],
      mine.classId,
    );
    expect(result).toMatchObject({ problemCount: 2, replayed: false });
    const rows = await pg.query<{
      problem_id: string;
      order_index: number;
      snapshot_id: string;
      content: string;
    }>(
      `SELECT tp."problem_id", tp."order_index", tp."snapshot_id", s."payload" ->> 'content' AS content
         FROM "test_problem" tp JOIN "textbook_problem_snapshot" s ON s."id" = tp."snapshot_id"
        WHERE tp."test_id" = $1 ORDER BY tp."order_index"`,
      [result.testId],
    );
    expect(
      rows.rows.map((row) => [row.order_index, row.problem_id, row.content]),
    ).toEqual([
      [1, made.problems[2]!.id, "다"],
      [2, made.problems[0]!.id, "가"],
    ]);
    expect(rows.rows.map((row) => row.snapshot_id)).toEqual([
      made.items[2]!.snapshotId,
      made.items[0]!.snapshotId,
    ]);
    await pg.query(
      `UPDATE "problem" SET "content" = '은행에서 고친 발문', "answer" = '99' WHERE "id" = $1`,
      [made.problems[2]!.id],
    );
    const after = await pg.query<{ content: string; answer: string }>(
      `SELECT s."payload" ->> 'content' AS content, s."payload" ->> 'answer' AS answer
         FROM "test_problem" tp JOIN "textbook_problem_snapshot" s ON s."id" = tp."snapshot_id"
        WHERE tp."test_id" = $1 AND tp."order_index" = 1`,
      [result.testId],
    );
    expect(after.rows).toEqual([{ content: "다", answer: "3" }]);
    const test = await pg.query<{
      user_id: string;
      status: string;
      test_type: string;
    }>(`SELECT "user_id", "status", "test_type" FROM "test" WHERE "id" = $1`, [
      result.testId,
    ]);
    expect(test.rows).toEqual([
      { user_id: owner.id, status: "draft", test_type: "review" },
    ]);
  });

  it("자격을 잃은 문항 · 지워진 문항 · 두 번 고른 문항이 있으면 만들지 않고 사유를 낸다", async () => {
    const made = await book(owner);
    // 같은 문항을 한 번 더 싣는다(교재 안의 반복 배치는 허용된다)
    const again = await captureItems(
      db,
      owner,
      made.editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: made.revision,
        sectionId: made.sectionIds[0]!,
        source: { kind: "problems", problemIds: [made.problems[0]!.id] },
      },
      loadFigure,
    );
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      made.editionId,
      { requestId, expectedRevision: again.aggregateRevision },
      fakeHash(requestId),
      deps,
    );
    let job = await runNextStep(db, owner, made.editionId, requestId, deps);
    while (job.status === "rendering" || job.status === "verifying")
      job = await runNextStep(db, owner, made.editionId, requestId, deps);
    await finalizePublish(db, owner, made.editionId, requestId, deps);
    const mine = await classOf(owner);
    const tests = async () =>
      (
        await pg.query(`SELECT 1 FROM "test" WHERE "class_id" = $1`, [
          mine.classId,
        ])
      ).rows.length;

    const twice = await refusal(
      reissue(
        owner,
        made.editionId,
        [made.items[0]!.itemId, again.items[0]!.itemId],
        mine.classId,
      ),
    );
    expect(twice.status).toBe(422);
    expect(twice.message).toContain("같은 문항을 두 번 골랐습니다");

    await pg.query(
      `UPDATE "problem" SET "direct_use_allowed" = FALSE WHERE "id" = $1`,
      [made.problems[1]!.id],
    );
    const locked = await refusal(
      reissue(
        owner,
        made.editionId,
        [made.items[0]!.itemId, made.items[1]!.itemId],
        mine.classId,
      ),
    );
    expect(locked.message).toContain("출제가 잠긴 문항입니다");

    await pg.query(`DELETE FROM "problem" WHERE "id" = $1`, [
      made.problems[2]!.id,
    ]);
    const deleted = await refusal(
      reissue(owner, made.editionId, [made.items[2]!.itemId], mine.classId),
    );
    expect(deleted.message).toContain("원본 문항이 지워졌습니다");
    expect(await tests()).toBe(0);
  });

  it("초안의 문항 · 남의 반 · 읽을 수 없는 판본으로는 만들지 못한다. 공유본은 동료가 자기 반에 낸다", async () => {
    const draft = await book(owner);
    const mine = await classOf(owner);
    expect(
      (
        await refusal(
          reissue(
            owner,
            draft.editionId,
            [draft.items[0]!.itemId],
            mine.classId,
          ),
        )
      ).status,
    ).toBe(409);
    const made = await book(owner, { publish: true, shared: true });
    const theirs = await classOf(colleague);
    expect(
      (
        await refusal(
          reissue(
            owner,
            made.editionId,
            [made.items[0]!.itemId],
            theirs.classId,
          ),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await refusal(
          reissue(
            outsider,
            made.editionId,
            [made.items[0]!.itemId],
            (await classOf(outsider)).classId,
          ),
        )
      ).status,
    ).toBe(404);
    const shared = await reissue(
      colleague,
      made.editionId,
      [made.items[0]!.itemId],
      theirs.classId,
    );
    expect(shared.problemCount).toBe(1);
  });
});

describe("내보내기", () => {
  it("발행본은 다시 계산한 manifest 해시가 발행 때의 값과 같을 때만 낸다", async () => {
    const made = await book(owner, { publish: true });
    const exchange = await exportEdition(
      db,
      owner,
      made.editionId,
      "2027-01-01T00:00:00.000Z",
    );
    expect(exchange.edition.status).toBe("published");
    expect(exchange.pageMap).toHaveLength(3);
    // 트리거가 막는 길 밖에서(트리거를 꺼서) 발행본의 줄을 바꿔 본다 — 내보내기가 알아채야 한다
    await pg.exec(`ALTER TABLE "textbook_item" DISABLE TRIGGER USER`);
    await pg.query(
      `UPDATE "textbook_item" SET "display_number" = '몰래' WHERE "id" = $1`,
      [made.items[0]!.itemId],
    );
    await pg.exec(`ALTER TABLE "textbook_item" ENABLE TRIGGER USER`);
    const error = await refusal(
      exportEdition(db, owner, made.editionId, "2027-01-01T00:00:00.000Z"),
    );
    expect(error).toMatchObject({ status: 409 });
    expect(error.message).toContain("해시와 다릅니다");
  });

  it("남의 초안은 내보내지 못한다", async () => {
    const made = await book(owner);
    expect(
      (
        await refusal(
          exportEdition(
            db,
            colleague,
            made.editionId,
            "2027-01-01T00:00:00.000Z",
          ),
        )
      ).status,
    ).toBe(404);
  });
});

describe("가져오기", () => {
  /** 발행본을 «패키지»로 만든다 — 판독기(Codex)의 검증은 대역이 통과시킨다 */
  async function packageOf(
    actor: TextbookActor,
    mutate: (exchange: TextbookExchange) => TextbookExchange = (x) => x,
  ) {
    const made = await book(actor, { publish: true });
    const exchange = mutate(
      await assembleExchange(db, made.editionId, {
        exportedAt: "2026-10-03T00:00:00.000Z",
      }),
    );
    const files = new Map<string, Uint8Array>();
    for (const asset of exchange.assets) {
      const blob = await pg.query<{ bytes: Uint8Array }>(
        `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
        [asset.sha256],
      );
      files.set(asset.packagePath, blob.rows[0]!.bytes);
    }
    const archive: VerifiedArchive = {
      exchange,
      files,
      validation: { issues: [] },
    };
    const zip = Buffer.from(`PK-fake-${randomUUID()}`);
    const hash = sha256(zip);
    await putUploadChunk(db, actor, hash, 0, zip);
    const done = await completeUpload(db, actor, hash, {
      byteLength: zip.length,
      fileName: "교재.zip",
    });
    return { made, exchange, archive, uploadId: done.uploadId, hash };
  }
  const run = (
    actor: TextbookActor,
    mode: "archive" | "copy",
    pack: { uploadId: string; hash: string; archive: VerifiedArchive },
    readArchive = async () => pack.archive,
  ) =>
    importPackage(
      db,
      actor,
      requestKey(actor, "import", [mode, pack.uploadId]),
      { mode, uploadId: pack.uploadId, expectedSha256: pack.hash },
      readArchive,
      loadFigure,
    );

  it("보관본은 바이트 그대로 둔다 — 살아 있는 책 · 판본 · QR 표에는 한 줄도 넣지 않는다", async () => {
    const pack = await packageOf(owner);
    const count = async (table: string) =>
      (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM "${table}"`,
        )
      ).rows[0]!.n;
    const before = [
      await count("textbook"),
      await count("textbook_edition"),
      await count("textbook_qr_target"),
      await count("textbook_item"),
    ];
    const result = await run(colleague, "archive", {
      ...pack,
      uploadId: (await reupload(colleague, pack.hash)).uploadId,
    });
    expect(result).toMatchObject({
      mode: "archive",
      bookId: null,
      editionId: null,
      idMap: [],
      issues: [],
    });
    expect(result.archiveId).not.toBeNull();
    expect([
      await count("textbook"),
      await count("textbook_edition"),
      await count("textbook_qr_target"),
      await count("textbook_item"),
    ]).toEqual(before);
    const row = await pg.query<{
      sha256: string;
      report: { source: { editionId: string } };
    }>(`SELECT "sha256", "report" FROM "textbook_archive" WHERE "id" = $1`, [
      result.archiveId,
    ]);
    expect(row.rows[0]!.sha256).toBe(pack.hash);
    // 원 판본의 id 는 보고에만 남는다
    expect(row.rows[0]!.report.source.editionId).toBe(pack.made.editionId);
  });

  /** 같은 바이트를 다른 계정이 올린다(패키지를 건네받았다) */
  async function reupload(actor: TextbookActor, hash: string) {
    const blob = await pg.query<{ bytes: Uint8Array }>(
      `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
      [hash],
    );
    await putUploadChunk(db, actor, hash, 0, blob.rows[0]!.bytes);
    return completeUpload(db, actor, hash, {
      byteLength: blob.rows[0]!.bytes.byteLength,
    });
  }

  it("복사는 새 책 · 새 초안 · 새 id 다. 은행 문항과 내용이 같은 것만 연결로 받는다", async () => {
    const pack = await packageOf(owner);
    // 패키지를 만든 뒤 은행의 둘째 문항이 바뀌었다 — 그 문항의 «연결됨»은 더는 참이 아니다
    await pg.query(
      `UPDATE "problem" SET "content" = '은행에서 바뀐 발문', "updated_at" = $2 WHERE "id" = $1`,
      [pack.made.problems[1]!.id, sqlNow()],
    );
    const result = await run(colleague, "copy", {
      ...pack,
      uploadId: (await reupload(colleague, pack.hash)).uploadId,
    });
    expect(result.mode).toBe("copy");
    expect(result.bookId).not.toBe(pack.made.bookId);
    expect(result.editionId).not.toBe(pack.made.editionId);
    const detail = await getEditionDetail(db, colleague, result.editionId!);
    expect(detail.edition).toMatchObject({
      status: "draft",
      publishedAt: null,
      manifestHash: null,
    });
    expect(detail.book.ownerId).toBe(colleague.id);
    expect(detail.config.bookId).toBe(result.bookId);
    // 원 주인의 판본은 그대로다
    expect(
      (await getEditionDetail(db, owner, pack.made.editionId)).edition.status,
    ).toBe("published");

    const items = await pg.query<{
      id: string;
      link_status: string;
      link_candidates: unknown[];
      source_system: string;
      problem_id: string | null;
      content: string;
      user_id: string;
    }>(
      `SELECT i."id", i."link_status", i."link_candidates", s."source_system", s."problem_id", s."payload" ->> 'content' AS content, s."user_id"
         FROM "textbook_item" i JOIN "textbook_problem_snapshot" s ON s."id" = i."snapshot_id"
        WHERE i."edition_id" = $1 ORDER BY s."payload" ->> 'content'`,
      [result.editionId],
    );
    expect(
      items.rows.map((row) => [
        row.content,
        row.link_status,
        row.source_system,
        row.problem_id !== null,
      ]),
    ).toEqual([
      ["가", "linked", "todays-math", true],
      ["나", "needs-review", "legacy-studio", false],
      ["다", "linked", "todays-math", true],
    ]);
    // 확인 못 한 주장은 후보로만 남는다 — 은행 문항의 정체로 굳지 않는다
    expect(items.rows[1]!.link_candidates).toEqual([
      {
        system: "todays-math",
        problemId: pack.made.problems[1]!.id,
        problemCode: pack.made.problems[1]!.code,
      },
    ]);
    expect(items.rows.every((row) => row.user_id === colleague.id)).toBe(true);
    expect(new Set(items.rows.map((row) => row.id)).size).toBe(3);
    expect(
      items.rows.some((row) =>
        pack.made.items.some((item) => item.itemId === row.id),
      ),
    ).toBe(false);
    expect(result.issues.map((entry) => entry.code).sort()).toEqual([
      "link-unverified",
      "server-issued-skipped",
    ]);

    // QR · 쪽 · 굳은 개념은 따라오지 않는다
    expect(
      (
        await pg.query(
          `SELECT 1 FROM "textbook_qr_target" WHERE "edition_id" = $1`,
          [result.editionId],
        )
      ).rows,
    ).toEqual([]);
    const copied = await assembleExchange(db, result.editionId!, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(copied.pageMap).toEqual([]);
    expect(
      copied.conceptIntegration?.concepts.map((entry) => entry.frozen),
    ).toEqual([null]);
    expect(
      copied.snapshots.every(
        (snapshot) => contentHash(snapshot.payload) === snapshot.contentHash,
      ),
    ).toBe(true);
    // 원고의 문제 블록은 새 배치를 가리킨다
    const blocks = copied.units.flatMap((unit) =>
      unit.sections.flatMap((section) => section.blocks),
    );
    expect(
      blocks
        .flatMap((block) => (block.kind === "problem" ? [block.itemId] : []))
        .sort(),
    ).toEqual(items.rows.map((row) => row.id).sort());
    // 대응표가 옛 id → 새 id 를 준다
    expect(result.idMap).toContainEqual({
      namespace: "edition",
      from: pack.made.editionId,
      to: result.editionId,
    });
    expect(
      result.idMap.filter((entry) => entry.namespace === "item"),
    ).toHaveLength(3);
  });

  it("다른 계정이 찍은 개념 확인은 후보로 되돌린다", async () => {
    const pack = await packageOf(owner, (exchange) => ({
      ...exchange,
      conceptIntegration: {
        version: "injaewon.textbook.concepts.v1",
        concepts: exchange.conceptIntegration!.concepts.map((entry) => ({
          ...entry,
          links: [
            {
              linkId: "l1",
              target: { namespace: "explorer-card" as const, cardId: "card-1" },
              relation: "same" as const,
              review: {
                status: "confirmed" as const,
                candidateRule: "manual" as const,
                reviewedBy: owner.id,
                reviewedAt: "2026-01-01T00:00:00.000Z",
                targetHash: fakeHash("x"),
              },
            },
          ],
        })),
      },
    }));
    const result = await run(colleague, "copy", {
      ...pack,
      uploadId: (await reupload(colleague, pack.hash)).uploadId,
    });
    const { rows } = await pg.query<{
      links: Array<{ review: { status: string; reviewedBy: string | null } }>;
    }>(`SELECT "links" FROM "textbook_concept" WHERE "edition_id" = $1`, [
      result.editionId,
    ]);
    expect(rows[0]!.links[0]!.review).toMatchObject({
      status: "candidate",
      reviewedBy: null,
      targetHash: null,
    });
  });

  it("검증을 못 지난 패키지는 어느 표에도 넣지 않는다", async () => {
    const pack = await packageOf(owner);
    const result = await run(owner, "copy", pack, async () => {
      throw new Error("Package hash or length mismatch: assets/x.png");
    });
    expect(result).toMatchObject({
      bookId: null,
      editionId: null,
      archiveId: null,
    });
    expect(result.issues.map((entry) => entry.code)).toEqual([
      "package-invalid",
    ]);
  });

  it("남이 올린 파일로는 가져오지 못한다 · 해시가 다르면 거절한다", async () => {
    const pack = await packageOf(owner);
    expect((await refusal(run(colleague, "archive", pack))).status).toBe(404);
    expect(
      (
        await refusal(
          run(owner, "archive", { ...pack, hash: fakeHash("다른 파일") }),
        )
      ).status,
    ).toBe(400);
  });
});
