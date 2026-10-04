// @vitest-environment node
/**
 * 관리자 사용성 점검 후속 — 교재 서버(T01 · D06).
 *
 * 구획 정답 메모(`teacherAnswer`) — 교사만 보는 구획 단위 자유 글의 저장 · 왕복 · 해시 · 학생 비노출.
 * 서버 코드를 PGlite(실제 마이그레이션 사슬) 위에서 그대로 돌린다 — 새 칸 · migration 없이 기존 `content` JSONB 에 실린다.
 * 영상 연결 — 검수자가 본 내용의 해시가 그 확정본의 것이 아니면 409(끝의 describe).
 *
 * 지키는 것:
 *  - 없으면 칸을 뺀다(빈 글 · null · 기본값 없음) — 칸 없는 판본의 manifest 해시가 그대로다
 *  - 쓰는 길 전부에서 살아남는다: 저장 · 문항 담기 · 새 초안 복제 · 내보내기 · 가져오기(새 원고)
 *  - 409 의 `serverSection` 에 실린다 · 발행본은 고치지 못한다
 *  - 학생 지면 · 학생 응답에는 들어가지 않는다(해설 지면에도 인쇄하지 않는다)
 */
import { createHash, randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  type Section,
  type TextbookExchange,
  textbookExchangeSchema,
  textbookSectionSchema,
} from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { manifestProjection } from "@/lib/textbook/canonical";
import { manifestHash, sha256 } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { measurementHtml } from "@/lib/textbook/render/html";
import { createTextbookRenderModel } from "@/lib/textbook/render/model";
import { createAssignment } from "@/lib/textbook/server/assignments";
import { completeUpload, putUploadChunk } from "@/lib/textbook/server/blobs";
import { createBook, createEdition } from "@/lib/textbook/server/books";
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
import { captureItems, recaptureItem } from "@/lib/textbook/server/items";
import { getSection, saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import {
  createBinding,
  createVideo,
  updateBinding,
} from "@/lib/textbook/server/videos";
import { readStudentQr } from "@/lib/textbook/studentRead";

import { textbookFixture } from "../helpers/textbookFixture";
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

/** 어디에도 새면 안 되는 표지 — 문항 정답 · 해설에는 쓰지 않는 글자다 */
const MARK = "구획정답메모-표지-7f3a";

let pg: Db;
let db: TextbookDb;
let world: World;
let owner: TextbookActor;
let importer: TextbookActor;
const deps = fakePublishDeps();
const loadFigure = async () => null;

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  const branchId = await insertBranch(pg);
  owner = await insertTeacher(pg, { branchId, name: "주인" });
  importer = await insertTeacher(pg, { branchId, name: "받는 교사" });
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

const storedContent = async (sectionId: string) =>
  (
    await pg.query<{ content: Record<string, unknown> }>(
      `SELECT "content" FROM "textbook_section" WHERE "id" = $1`,
      [sectionId],
    )
  ).rows[0]!.content;

/** 단원 하나 · 구획 하나(메모는 `teacherAnswer` 를 줄 때만) · 문항 하나 */
async function book(options: { teacherAnswer?: string; publish?: boolean }) {
  const { book: created } = await createBook(
    db,
    owner,
    requestKey(owner, "book-create"),
    { config: sampleConfig() },
  );
  const editionId = created.draftEditionId!;
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
  const sectionId = randomUUID();
  const section: Section = {
    sectionKey: "s0",
    title: "구획",
    templateKey: "basic",
    startPolicy: "even-left",
    blocks: [],
    ...(options.teacherAnswer === undefined
      ? {}
      : { teacherAnswer: options.teacherAnswer }),
  };
  const saved = await saveSection(
    db,
    owner,
    editionId,
    sectionId,
    requestKey(owner, "section-save"),
    { expectedRevision: 0, unitKey: "u1", section },
  );
  const problem = await insertBankProblem(pg, world.unitId, {
    content: "가",
    answer: "1",
  });
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
    loadFigure,
  );
  const made = {
    bookId: created.id,
    editionId,
    sectionId,
    itemId: captured.items[0]!.itemId,
    snapshotId: captured.items[0]!.snapshotId,
    problemId: problem.id,
    revision: captured.aggregateRevision,
  };
  if (options.publish) {
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      editionId,
      { requestId, expectedRevision: made.revision },
      fakeHash(requestId),
      deps,
    );
    let job = await runNextStep(db, owner, editionId, requestId, deps);
    while (job.status === "rendering" || job.status === "verifying")
      job = await runNextStep(db, owner, editionId, requestId, deps);
    await finalizePublish(db, owner, editionId, requestId, deps);
  }
  return made;
}

describe("계약 — 선택 칸이고, 빈 값은 없다", () => {
  const base = {
    sectionKey: "s0",
    title: "구획",
    templateKey: "basic",
    startPolicy: "even-left" as const,
    blocks: [],
  };

  it("글이 있으면 받고, 칸이 없으면 칸을 지어내지 않는다", () => {
    expect(
      textbookSectionSchema.parse({ ...base, teacherAnswer: MARK })
        .teacherAnswer,
    ).toBe(MARK);
    const absent = textbookSectionSchema.parse(base);
    expect(Object.hasOwn(absent, "teacherAnswer")).toBe(false);
  });

  it.each([
    ["빈 글", ""],
    ["공백뿐인 글", " \n\t "],
    ["null", null],
    ["숫자", 3],
  ])("%s 은 거절한다", (_label, value) => {
    expect(
      textbookSectionSchema.safeParse({ ...base, teacherAnswer: value })
        .success,
    ).toBe(false);
  });

  it("목록에 없는 다른 칸은 여전히 오류다", () => {
    expect(
      textbookSectionSchema.safeParse({ ...base, answer: MARK }).success,
    ).toBe(false);
  });
});

describe("판본 해시 — 칸 없는 판본은 그대로, 값이 있으면 달라진다", () => {
  /** 이 시험 안에서 따로 지은 직렬화 — 제품의 `canonicalJson` 을 부르지 않는다 */
  function independent(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(independent).join(",")}]`;
    if (value && typeof value === "object")
      return `{${Object.keys(value)
        .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
        .map(
          (key) =>
            `${JSON.stringify(key)}:${independent((value as Record<string, unknown>)[key])}`,
        )
        .join(",")}}`;
    return JSON.stringify(value);
  }
  const fixture = () => {
    const exchange = textbookFixture(2, 2);
    // 조판기 판 번호가 오르면 해시도 오른다 — 벡터는 판 번호를 고정해 둔다
    exchange.rendererVersion = "golden.renderer.v1";
    exchange.templateVersion = "golden.template.v1";
    return exchange;
  };
  const withAnswer = (exchange: TextbookExchange, answer: string) => {
    exchange.units[0]!.sections[0]!.teacherAnswer = answer;
    return exchange;
  };

  it("칸 없는 판본의 해시는 이 칸을 더하기 전의 값 그대로다", () => {
    const exchange = fixture();
    // 2026-10-04, 이 칸을 계약에 더하기 전에 같은 입력으로 구해 적은 값
    expect(manifestHash(exchange)).toBe(
      "20f01865ed82edf7a549cb6a38d5b4b2045cc43e2019150ab64a5d27e828a3a5",
    );
    // 제품의 직렬화를 거치지 않고 다시 계산해도 같다
    expect(
      createHash("sha256")
        .update(independent(manifestProjection(exchange)), "utf8")
        .digest("hex"),
    ).toBe(manifestHash(exchange));
    // 계약을 한 번 지나도 칸이 생기지 않는다
    const parsed = textbookExchangeSchema.parse(exchange);
    expect(JSON.stringify(parsed)).not.toContain("teacherAnswer");
    expect(manifestHash(parsed)).toBe(manifestHash(exchange));
  });

  it("값이 있으면 해시에 들어가고, 한 글자만 달라도 해시가 다르다", () => {
    const plain = manifestHash(fixture());
    const one = manifestHash(withAnswer(fixture(), "가"));
    const other = manifestHash(withAnswer(fixture(), "나"));
    expect(one).not.toBe(plain);
    expect(other).not.toBe(plain);
    expect(one).not.toBe(other);
  });
});

describe("저장 — 기존 content 칸에 실리고, 없으면 칸이 없다", () => {
  it("저장한 글이 다시 읽어도 그대로다. 칸을 빼고 저장하면 저장 칸에서도 빠진다", async () => {
    const made = await book({ teacherAnswer: `${MARK} 11/12` });
    const read = await getSection(db, owner, made.editionId, made.sectionId);
    expect(read.section.teacherAnswer).toBe(`${MARK} 11/12`);
    expect(await storedContent(made.sectionId)).toMatchObject({
      teacherAnswer: `${MARK} 11/12`,
    });

    const { teacherAnswer: _dropped, ...withoutAnswer } = read.section;
    void _dropped;
    const cleared = await saveSection(
      db,
      owner,
      made.editionId,
      made.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: read.revision,
        unitKey: "u1",
        section: withoutAnswer,
      },
    );
    expect(Object.hasOwn(cleared.section.section, "teacherAnswer")).toBe(false);
    expect(
      Object.hasOwn(await storedContent(made.sectionId), "teacherAnswer"),
    ).toBe(false);
  });

  it("칸 없이 만든 구획의 저장 칸에는 키가 생기지 않는다", async () => {
    const made = await book({});
    expect(Object.keys(await storedContent(made.sectionId))).toEqual([
      "blocks",
    ]);
    const read = await getSection(db, owner, made.editionId, made.sectionId);
    expect(Object.hasOwn(read.section, "teacherAnswer")).toBe(false);
  });

  it("문항을 담아도(구획 원고를 서버가 다시 쓴다) 메모가 남는다", async () => {
    // `book` 이 메모를 저장한 뒤 문항을 담는다 — 담기는 content 를 다시 적는다
    const made = await book({ teacherAnswer: MARK });
    const read = await getSection(db, owner, made.editionId, made.sectionId);
    expect(read.section.blocks).toHaveLength(1);
    expect(read.section.teacherAnswer).toBe(MARK);
  });

  it("낡은 revision 으로 저장하면 409 이고, 서버 구획에 메모가 실려 온다", async () => {
    const made = await book({ teacherAnswer: MARK });
    const read = await getSection(db, owner, made.editionId, made.sectionId);
    const error = await refusal(
      saveSection(
        db,
        owner,
        made.editionId,
        made.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: read.revision - 1,
          unitKey: "u1",
          section: { ...read.section, teacherAnswer: "덮으려는 글" },
        },
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    expect(
      (error.details as { serverSection: { section: Section } }).serverSection
        .section.teacherAnswer,
    ).toBe(MARK);
    // 거절된 글은 저장되지 않았다
    expect(
      (await getSection(db, owner, made.editionId, made.sectionId)).section
        .teacherAnswer,
    ).toBe(MARK);
  });
});

describe("발행 · 복제 · 내보내기 · 가져오기", () => {
  it("발행본의 해시에 메모가 들어가고, 내보내기는 그 해시를 다시 확인한다", async () => {
    const made = await book({ teacherAnswer: MARK, publish: true });
    const exchange = await exportEdition(
      db,
      owner,
      made.editionId,
      "2027-01-01T00:00:00.000Z",
    );
    expect(exchange.edition.status).toBe("published");
    expect(exchange.units[0]!.sections[0]!.teacherAnswer).toBe(MARK);
    expect(manifestHash(exchange)).toBe(exchange.edition.manifestHash);

    // 발행한 뒤 메모가 바뀌면(트리거 밖에서) 내보내기가 알아챈다 — 메모는 발행 내용의 일부다
    await pg.exec(`ALTER TABLE "textbook_section" DISABLE TRIGGER USER`);
    await pg.query(
      `UPDATE "textbook_section" SET "content" = jsonb_set("content", '{teacherAnswer}', '"몰래 고친 글"') WHERE "id" = $1`,
      [made.sectionId],
    );
    await pg.exec(`ALTER TABLE "textbook_section" ENABLE TRIGGER USER`);
    expect(
      await refusal(
        exportEdition(db, owner, made.editionId, "2027-01-01T00:00:00.000Z"),
      ),
    ).toMatchObject({ status: 409 });
  });

  it("메모 없는 발행본은 키 없이 나가고 해시가 맞는다", async () => {
    const made = await book({ publish: true });
    const exchange = await exportEdition(
      db,
      owner,
      made.editionId,
      "2027-01-01T00:00:00.000Z",
    );
    expect(JSON.stringify(exchange)).not.toContain("teacherAnswer");
    expect(manifestHash(exchange)).toBe(exchange.edition.manifestHash);
  });

  it("발행본의 메모는 고치지 못한다", async () => {
    const made = await book({ teacherAnswer: MARK, publish: true });
    const read = await getSection(db, owner, made.editionId, made.sectionId);
    const error = await refusal(
      saveSection(
        db,
        owner,
        made.editionId,
        made.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: read.revision,
          unitKey: "u1",
          section: { ...read.section, teacherAnswer: "발행 뒤에 고친 글" },
        },
      ),
    );
    expect(error.status).toBeGreaterThanOrEqual(400);
    expect(
      (await getSection(db, owner, made.editionId, made.sectionId)).section
        .teacherAnswer,
    ).toBe(MARK);
  });

  it("발행본에서 만든 새 초안에 메모가 따라온다", async () => {
    const made = await book({ teacherAnswer: MARK, publish: true });
    const { edition } = await createEdition(
      db,
      owner,
      made.bookId,
      requestKey(owner, "edition-create"),
      { sourceEditionId: made.editionId, label: "2판" },
    );
    const copied = edition.outline[0]!.sections[0]!;
    const read = await getSection(db, owner, edition.edition.editionId, copied.id);
    expect(read.section.teacherAnswer).toBe(MARK);
    // 새 초안에서는 고칠 수 있다
    const saved = await saveSection(
      db,
      owner,
      edition.edition.editionId,
      copied.id,
      requestKey(owner, "section-save"),
      {
        expectedRevision: read.revision,
        unitKey: "u1",
        section: { ...read.section, teacherAnswer: `${MARK} 2판` },
      },
    );
    expect(saved.section.section.teacherAnswer).toBe(`${MARK} 2판`);
  });

  it("교환 파일을 다른 교사가 새 원고로 가져오면 메모가 따라온다", async () => {
    const made = await book({ teacherAnswer: MARK, publish: true });
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.units[0]!.sections[0]!.teacherAnswer).toBe(MARK);
    const archive: VerifiedArchive = {
      exchange,
      files: new Map(),
      validation: { issues: [] },
    };
    const zip = Buffer.from(`PK-fake-${randomUUID()}`);
    const hash = sha256(zip);
    // 패키지를 건네받은 다른 교사가 새 원고로 가져온다
    await putUploadChunk(db, importer, hash, 0, zip);
    const upload = await completeUpload(db, importer, hash, {
      byteLength: zip.length,
      fileName: "교재.zip",
    });
    const copied = await importPackage(
      db,
      importer,
      requestKey(importer, "import", ["copy", upload.uploadId]),
      { mode: "copy", uploadId: upload.uploadId, expectedSha256: hash },
      async () => archive,
      loadFigure,
    );
    expect(copied.issues.filter((issue) => issue.severity === "error")).toEqual(
      [],
    );
    const detail = await getEditionDetail(db, importer, copied.editionId!);
    const section = await getSection(
      db,
      importer,
      copied.editionId!,
      detail.outline[0]!.sections[0]!.id,
    );
    expect(section.section.teacherAnswer).toBe(MARK);
    expect(section.section.blocks).toHaveLength(1);
  });
});

describe("학생에게는 가지 않는다", () => {
  const resources = {
    assetUrl: (id: string) => `https://textbook.invalid/assets/${id}`,
    qrDataUrl: (id: string) => `https://textbook.invalid/qr/${id}`,
  };

  it("학생 지면에도 해설 지면에도 조판하지 않는다 — 렌더 모델이 구획 칸을 골라 담는다", () => {
    const exchange = textbookFixture(1, 2);
    exchange.units[0]!.sections[0]!.teacherAnswer = MARK;
    for (const variant of ["student", "answers"] as const) {
      const model = createTextbookRenderModel(exchange, variant);
      expect(JSON.stringify(model)).not.toContain(MARK);
      expect(JSON.stringify(model)).not.toContain("teacherAnswer");
      expect(measurementHtml(model, resources)).not.toContain(MARK);
    }
    // 해설 지면에는 문항 정답이 있다 — 메모와 다른 것이다
    expect(
      JSON.stringify(createTextbookRenderModel(exchange, "answers")),
    ).toContain("비공개 정답 0");
  });

  it("배정받은 학생이 QR 로 여는 응답에 메모가 없다", async () => {
    const made = await book({ teacherAnswer: MARK, publish: true });
    const classId = randomUUID();
    await pg.query(
      `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at") VALUES ($1, $2, '반', '중2', '{}'::jsonb, $3)`,
      [classId, owner.id, sqlNow()],
    );
    const studentId = randomUUID();
    await pg.query(
      `INSERT INTO "student" ("id", "class_id", "name", "updated_at") VALUES ($1, $2, '학생', $3)`,
      [studentId, classId, sqlNow()],
    );
    await createAssignment(
      db,
      owner,
      made.editionId,
      requestKey(owner, "assign"),
      {
        subject: { kind: "class", classId },
        scope: { kind: "edition" },
        startsAt: "2026-01-01T00:00:00.000Z",
        expiresAt: null,
      },
    );
    const { rows } = await pg.query<{ slug: string }>(
      `SELECT "slug" FROM "textbook_qr_target" WHERE "edition_id" = $1 AND "item_id" = $2`,
      [made.editionId, made.itemId],
    );
    const dto = await readStudentQr(
      db,
      studentId,
      rows[0]!.slug,
      new Date("2026-10-04T00:00:00.000Z"),
    );
    expect(dto.kind).toBe("problem");
    expect(JSON.stringify(dto)).not.toContain(MARK);
    expect(JSON.stringify(dto)).not.toContain("teacherAnswer");
  });
});

describe("영상 연결 — 검수자가 본 내용의 해시 (D06)", () => {
  const hashOf = async (snapshotId: string) =>
    (
      await pg.query<{ hash: string }>(
        `SELECT "content_hash" AS "hash" FROM "textbook_problem_snapshot" WHERE "id" = $1`,
        [snapshotId],
      )
    ).rows[0]!.hash;
  const write = (
    videoId: string,
    status: "draft" | "review" | "published",
    expectedContentHash: string,
  ) => ({
    videoId,
    startSeconds: 0,
    endSeconds: null,
    status,
    expectedContentHash,
  });

  it("문항을 다시 고정한 뒤에는, 앞서 본 내용의 해시로 새 확정본에 연결 · 게시하지 못한다 (409)", async () => {
    const made = await book({});
    // 화면이 보여 준 내용의 해시 — 검수자는 이 내용을 봤다
    const viewed = await hashOf(made.snapshotId);

    // 그사이 은행 문항이 바뀌고 교재가 다시 고정한다 — 새 확정본이 생긴다
    await pg.query(
      `UPDATE "problem" SET "content" = '바뀐 발문', "updated_at" = $2 WHERE "id" = $1`,
      [made.problemId, sqlNow()],
    );
    const again = await recaptureItem(
      db,
      owner,
      made.editionId,
      made.itemId,
      requestKey(owner, "recapture"),
      { expectedRevision: made.revision },
      loadFigure,
    );
    expect(again.item.snapshotId).not.toBe(made.snapshotId);
    const latest = await hashOf(again.item.snapshotId);
    expect(latest).not.toBe(viewed);

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
    // 본 적 없는 새 내용에 «앞서 본 해시»로 연결하려 한다 — 서버가 거절한다
    const stale = await refusal(
      createBinding(
        db,
        owner,
        again.item.snapshotId,
        requestKey(owner, "binding-create"),
        write(video.id, "draft", viewed),
      ),
    );
    expect(stale).toMatchObject({ status: 409 });
    expect(stale.message).toContain("검수한 뒤에 문항 내용이 바뀌었습니다");
    expect(
      (
        await pg.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM "textbook_video_binding" WHERE "snapshot_id" = $1`,
          [again.item.snapshotId],
        )
      ).rows[0]!.n,
    ).toBe(0);

    // 새 내용을 본 해시로는 연결된다. 게시도 본 해시가 아니면 409 다
    const { binding } = await createBinding(
      db,
      owner,
      again.item.snapshotId,
      requestKey(owner, "binding-create"),
      write(video.id, "review", latest),
    );
    expect(
      await refusal(
        updateBinding(
          db,
          owner,
          binding.bindingId,
          requestKey(owner, "binding-update"),
          write(video.id, "published", viewed),
        ),
      ),
    ).toMatchObject({ status: 409 });
    const published = await updateBinding(
      db,
      owner,
      binding.bindingId,
      requestKey(owner, "binding-update"),
      write(video.id, "published", latest),
    );
    expect(published.binding).toMatchObject({
      status: "published",
      reviewedAgainstHash: latest,
    });
  });
});
