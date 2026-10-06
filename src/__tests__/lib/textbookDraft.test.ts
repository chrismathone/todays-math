// @vitest-environment node
/**
 * 교재 초안 — 책 · 목차 · 구획의 저장과 범위. 서버 코드를 PGlite(실제 마이그레이션 사슬) 위에서 그대로 돌린다.
 * 대역 DB 가 아니다: 여기서 초록이면 그 SQL 이 트리거 · 복합 FK · 부분 유일 색인과 같이 돈 것이다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type {
  ManuscriptBlock,
  Section,
} from "@/contracts/textbookExchange.contract";
import {
  type TextbookActor,
  editionReadScope,
  requireOwnedDraft,
  requireReadableEdition,
} from "@/lib/textbook/access";
import {
  createBook,
  createEdition,
  listBooks,
  updateBook,
} from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import {
  deleteSection,
  getSection,
  saveSection,
} from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";

import {
  type Db,
  type World,
  draftWithContent,
  finalizePublish,
  insertAsset,
  insertConcept,
  insertItem,
  insertSnapshot,
  openTextbookDb,
  reservePublish,
  revisionOf,
  runSteps,
  seedWorld,
  sqlNow,
} from "../helpers/textbookPglite";
import {
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
let owner: TextbookActor;
let colleague: TextbookActor;
let outsider: TextbookActor;

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

async function newBook(actor: TextbookActor = owner) {
  const { book } = await createBook(
    db,
    actor,
    requestKey(actor, "book-create"),
    {
      config: sampleConfig(),
    },
  );
  return { bookId: book.id, editionId: book.draftEditionId! };
}

const section = (overrides: Partial<Section> = {}): Section => ({
  sectionKey: `s-${randomUUID().slice(0, 8)}`,
  title: "준비 학습",
  templateKey: "basic",
  startPolicy: "even-left",
  blocks: [],
  ...overrides,
});

async function withUnits(
  editionId: string,
  unitKeys: string[],
  actor: TextbookActor = owner,
) {
  const detail = await getEditionDetail(db, actor, editionId);
  return saveStructure(
    db,
    actor,
    editionId,
    requestKey(actor, "structure-save"),
    {
      expectedRevision: detail.structureRevision,
      config: detail.config,
      outline: [
        ...detail.outline,
        ...unitKeys.map((unitKey) => ({
          unitKey,
          title: `단원 ${unitKey}`,
          sourceUnitIds: [],
          prerequisites: [],
          goals: [],
          conceptLectureRefs: [],
          sections: [],
        })),
      ],
    },
  );
}

async function newSection(
  editionId: string,
  unitKey: string,
  value: Section = section(),
) {
  const sectionId = randomUUID();
  const saved = await saveSection(
    db,
    owner,
    editionId,
    sectionId,
    requestKey(owner, "section-save"),
    {
      expectedRevision: 0,
      unitKey,
      section: value,
    },
  );
  return { sectionId, ...saved };
}

/** DDL 하네스로 정식 발행한 판본 — 주인은 이 파일의 `owner` */
async function publishedBook(shared: boolean) {
  const draft = await draftWithContent(
    pg,
    { ...world, userA: owner.id },
    owner.id,
  );
  const plan = await reservePublish(pg, draft);
  await runSteps(pg, draft, plan);
  await finalizePublish(pg, draft, plan);
  if (shared)
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2 WHERE "id" = $1`,
      [draft.bookId, branchId],
    );
  return draft;
}

describe("새 책", () => {
  it("책과 1판 초안을 만들고 설정의 교재 번호를 서버가 지은 id 로 적는다", async () => {
    const { bookId, editionId } = await newBook();
    const detail = await getEditionDetail(db, owner, editionId);
    expect(detail.config.bookId).toBe(bookId);
    expect(detail.edition).toMatchObject({
      status: "draft",
      revision: 1,
      publishedAt: null,
      manifestHash: null,
    });
    expect(detail.structureRevision).toBe(1);
    expect(detail.book).toMatchObject({
      isOwner: true,
      ownerId: owner.id,
      visibility: "private",
      draftEditionId: editionId,
    });
  });

  it("같은 요청이 다시 오면 책을 또 만들지 않고 그때의 책을 돌려준다", async () => {
    const key = requestKey(owner, "book-create", { n: 1 });
    const first = await createBook(db, owner, key, { config: sampleConfig() });
    const again = await createBook(db, owner, key, { config: sampleConfig() });
    expect(first.replayed).toBe(false);
    expect(again.replayed).toBe(true);
    expect(again.book.id).toBe(first.book.id);
    const { rows } = await pg.query(
      `SELECT 1 FROM "textbook" WHERE "id" = $1`,
      [first.book.id],
    );
    expect(rows).toHaveLength(1);
  });

  it("같은 요청 번호를 다른 내용에 다시 쓰면 409", async () => {
    const requestId = randomUUID();
    await createBook(
      db,
      owner,
      requestKey(owner, "book-create", { n: 1 }, requestId),
      { config: sampleConfig() },
    );
    const error = await refusal(
      createBook(
        db,
        owner,
        requestKey(owner, "book-create", { n: 2 }, requestId),
        { config: sampleConfig() },
      ),
    );
    expect(error.status).toBe(409);
  });

  it("남의 요청 번호를 써도 남의 결과를 받지 못한다 — 열쇠는 (계정, 번호)다", async () => {
    const requestId = randomUUID();
    const mine = await createBook(
      db,
      owner,
      requestKey(owner, "book-create", {}, requestId),
      { config: sampleConfig() },
    );
    const theirs = await createBook(
      db,
      colleague,
      requestKey(colleague, "book-create", {}, requestId),
      {
        config: sampleConfig(),
      },
    );
    expect(theirs.replayed).toBe(false);
    expect(theirs.book.id).not.toBe(mine.book.id);
    expect(theirs.book.ownerId).toBe(colleague.id);
  });
});

describe("범위 — 주인의 것, 그리고 지점에 공유된 발행본", () => {
  it("남의 초안은 없는 것과 같다 (같은 지점의 동료에게도)", async () => {
    const { editionId } = await newBook();
    for (const actor of [colleague, outsider]) {
      const error = await refusal(getEditionDetail(db, actor, editionId));
      expect(error.status).toBe(404);
    }
    expect(
      (await listBooks(db, colleague)).some(
        (book) => book.ownerId === owner.id,
      ),
    ).toBe(false);
  });

  it("비공개 발행본도 남에게는 없는 것이다", async () => {
    const book = await publishedBook(false);
    expect(
      (await refusal(getEditionDetail(db, colleague, book.editionId))).status,
    ).toBe(404);
  });

  it("지점에 공유한 발행본은 같은 지점의 동료가 읽는다 — 다른 지점은 못 읽는다", async () => {
    const book = await publishedBook(true);
    const seen = await requireReadableEdition(db, colleague, book.editionId);
    expect(seen.scope).toBe("shared");
    expect(
      (await refusal(requireReadableEdition(db, outsider, book.editionId)))
        .status,
    ).toBe(404);
    const listed = (await listBooks(db, colleague)).find(
      (entry) => entry.id === book.bookId,
    );
    expect(listed).toMatchObject({
      isOwner: false,
      latestPublishedEditionId: book.editionId,
      draftEditionId: null,
    });
    expect(
      (await listBooks(db, outsider)).some((entry) => entry.id === book.bookId),
    ).toBe(false);
  });

  it("공유한 책이어도 동료는 그 책의 새 초안을 못 읽고, 목록도 초안이 있다고 알리지 않는다", async () => {
    const book = await publishedBook(true);
    const { edition } = await createEdition(
      db,
      owner,
      book.bookId,
      requestKey(owner, "edition-create"),
      {
        label: "2판",
      },
    );
    expect(
      (
        await refusal(
          getEditionDetail(db, colleague, edition.edition.editionId),
        )
      ).status,
    ).toBe(404);
    const listed = (await listBooks(db, colleague)).find(
      (entry) => entry.id === book.bookId,
    )!;
    expect(listed.draftEditionId).toBeNull();
    const mine = (await listBooks(db, owner)).find(
      (entry) => entry.id === book.bookId,
    )!;
    expect(mine.draftEditionId).toBe(edition.edition.editionId);
  });

  it("동료는 공유본을 고치지 못한다 (쓰기는 주인만)", async () => {
    const book = await publishedBook(true);
    expect(
      (
        await refusal(
          db.transaction((tx) =>
            requireOwnedDraft(tx, colleague, book.editionId),
          ),
        )
      ).status,
    ).toBe(404);
    expect(
      (
        await refusal(
          updateBook(
            db,
            colleague,
            book.bookId,
            requestKey(colleague, "book-update"),
            { title: "가로챔" },
          ),
        )
      ).status,
    ).toBe(404);
  });

  it("주인이 지점을 떠나면 공유가 그 순간 닫힌다 — 칸을 고쳐 쓰지 않아도", async () => {
    const mover = await insertTeacher(pg, { branchId, name: "떠날 사람" });
    const draft = await draftWithContent(
      pg,
      { ...world, userA: mover.id },
      mover.id,
    );
    const plan = await reservePublish(pg, draft);
    await runSteps(pg, draft, plan);
    await finalizePublish(pg, draft, plan);
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2 WHERE "id" = $1`,
      [draft.bookId, branchId],
    );
    await requireReadableEdition(db, colleague, draft.editionId);
    await pg.query(`UPDATE "user" SET "branch_id" = $2 WHERE "id" = $1`, [
      mover.id,
      outsider.branchId,
    ]);
    expect(
      (await refusal(requireReadableEdition(db, colleague, draft.editionId)))
        .status,
    ).toBe(404);
    expect(
      (await listBooks(db, colleague)).some(
        (entry) => entry.id === draft.bookId,
      ),
    ).toBe(false);
  });

  it("주인 계정이 정지되면 공유본이 닫힌다", async () => {
    const suspended = await insertTeacher(pg, {
      branchId,
      name: "정지될 사람",
    });
    const draft = await draftWithContent(
      pg,
      { ...world, userA: suspended.id },
      suspended.id,
    );
    const plan = await reservePublish(pg, draft);
    await runSteps(pg, draft, plan);
    await finalizePublish(pg, draft, plan);
    await pg.query(
      `UPDATE "textbook" SET "visibility" = 'branch', "shared_branch_id" = $2 WHERE "id" = $1`,
      [draft.bookId, branchId],
    );
    await pg.query(`UPDATE "user" SET "suspended_at" = $2 WHERE "id" = $1`, [
      suspended.id,
      sqlNow(),
    ]);
    expect(
      (await refusal(requireReadableEdition(db, colleague, draft.editionId)))
        .status,
    ).toBe(404);
  });

  it("판정 함수 — 세 겹 가운데 하나라도 빠지면 못 읽는다", () => {
    const row = {
      ownerId: "o",
      status: "published" as const,
      visibility: "branch" as const,
      sharedBranchId: "b",
      ownerBranchId: "b",
      ownerActive: true,
    };
    const viewer = { id: "v", name: "", branchId: "b" };
    expect(editionReadScope(viewer, row)).toBe("shared");
    expect(
      editionReadScope({ ...viewer, id: "o" }, { ...row, status: "draft" }),
    ).toBe("owner");
    for (const broken of [
      { ...row, status: "draft" as const },
      { ...row, status: "retired" as const },
      { ...row, visibility: "private" as const, sharedBranchId: null },
      { ...row, sharedBranchId: "other" },
      { ...row, ownerBranchId: "other" },
      { ...row, ownerActive: false },
    ])
      expect(editionReadScope(viewer, broken)).toBeNull();
    expect(editionReadScope({ ...viewer, branchId: null }, row)).toBeNull();
    expect(editionReadScope({ ...viewer, branchId: "other" }, row)).toBeNull();
  });

  it("공유는 지금 내 지점에만 켤 수 있다", async () => {
    const { bookId } = await newBook();
    const elsewhere = await refusal(
      updateBook(db, owner, bookId, requestKey(owner, "book-update"), {
        visibility: "branch",
        sharedBranchId: outsider.branchId,
      }),
    );
    expect(elsewhere.status).toBe(400);
    const { book } = await updateBook(
      db,
      owner,
      bookId,
      requestKey(owner, "book-update"),
      { visibility: "branch" },
    );
    expect(book).toMatchObject({
      visibility: "branch",
      sharedBranchId: branchId,
    });
    const loner = await insertTeacher(pg, { branchId: null });
    const lonely = await newBook(loner);
    expect(
      (
        await refusal(
          updateBook(
            db,
            loner,
            lonely.bookId,
            requestKey(loner, "book-update"),
            { visibility: "branch" },
          ),
        )
      ).status,
    ).toBe(400);
  });
});

describe("목차 — structureRevision CAS", () => {
  it("낡은 값으로 저장하면 409 와 지금 값을 준다. 덮어쓰지 않는다", async () => {
    const { editionId } = await newBook();
    await withUnits(editionId, ["u1"]);
    const detail = await getEditionDetail(db, owner, editionId);
    const error = await refusal(
      saveStructure(db, owner, editionId, requestKey(owner, "structure-save"), {
        expectedRevision: 1,
        config: { ...detail.config, title: "낡은 화면의 제목" },
        outline: [],
      }),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    expect(error.details).toMatchObject({ serverRevision: 2 });
    const after = await getEditionDetail(db, owner, editionId);
    expect(after.config.title).toBe(detail.config.title);
    expect(after.outline.map((unit) => unit.unitKey)).toEqual(["u1"]);
  });

  it("저장하면 목차 값과 집계 revision 이 같이 오른다", async () => {
    const { editionId } = await newBook();
    const { edition } = await withUnits(editionId, ["u1", "u2"]);
    expect(edition.structureRevision).toBe(2);
    expect(edition.edition.revision).toBe(2);
  });

  it("목차의 구획 목록이 지금 구획과 다르면 거절한다 (빠짐 · 모르는 id)", async () => {
    const { editionId } = await newBook();
    await withUnits(editionId, ["u1"]);
    const { sectionId } = await newSection(editionId, "u1");
    const detail = await getEditionDetail(db, owner, editionId);
    const base = {
      expectedRevision: detail.structureRevision,
      config: detail.config,
    };
    const missing = await refusal(
      saveStructure(db, owner, editionId, requestKey(owner, "structure-save"), {
        ...base,
        outline: detail.outline.map((unit) => ({ ...unit, sections: [] })),
      }),
    );
    expect(missing.status).toBe(400);
    const unknown = await refusal(
      saveStructure(db, owner, editionId, requestKey(owner, "structure-save"), {
        ...base,
        outline: detail.outline.map((unit) => ({
          ...unit,
          sections: [
            ...unit.sections,
            {
              id: randomUUID(),
              sectionKey: "ghost",
              title: "유령",
              revision: 1,
            },
          ],
        })),
      }),
    );
    expect(unknown.status).toBe(400);
    expect((await getSection(db, owner, editionId, sectionId)).id).toBe(
      sectionId,
    );
  });

  it("구획의 차례를 바꾸고 단원 사이로 옮긴다 — 같은 열쇠의 두 구획이 단원을 맞바꿔도 된다", async () => {
    const { editionId } = await newBook();
    await withUnits(editionId, ["u1", "u2"]);
    const a = await newSection(
      editionId,
      "u1",
      section({ sectionKey: "prep", title: "가" }),
    );
    const b = await newSection(
      editionId,
      "u2",
      section({ sectionKey: "prep", title: "나" }),
    );
    const c = await newSection(
      editionId,
      "u1",
      section({ sectionKey: "main", title: "다" }),
    );
    const snapshot = await insertSnapshot(pg, {
      userId: owner.id,
      problem: world.problem1,
    });
    const itemId = await insertItem(pg, {
      editionId,
      userId: owner.id,
      snapshotId: snapshot.id,
      sectionId: a.sectionId,
    });
    const detail = await getEditionDetail(db, owner, editionId);
    const entry = (id: string) =>
      detail.outline.flatMap((unit) => unit.sections).find((s) => s.id === id)!;
    const { edition } = await saveStructure(
      db,
      owner,
      editionId,
      requestKey(owner, "structure-save"),
      {
        expectedRevision: detail.structureRevision,
        config: detail.config,
        outline: [
          {
            ...detail.outline[0]!,
            sections: [entry(c.sectionId), entry(b.sectionId)],
          },
          { ...detail.outline[1]!, sections: [entry(a.sectionId)] },
        ],
      },
    );
    expect(
      edition.outline.map((unit) => unit.sections.map((s) => s.title)),
    ).toEqual([["다", "나"], ["가"]]);
    expect((await getSection(db, owner, editionId, a.sectionId)).unitKey).toBe(
      "u2",
    );
    // 옮긴 구획의 배치가 단원 열쇠를 따라간다
    const { rows } = await pg.query<{ unit_key: string }>(
      `SELECT "unit_key" FROM "textbook_item" WHERE "id" = $1`,
      [itemId],
    );
    expect(rows[0]!.unit_key).toBe("u2");
  });

  it("구획이 남은 단원은 목차에서 못 뺀다", async () => {
    const { editionId } = await newBook();
    await withUnits(editionId, ["u1"]);
    await newSection(editionId, "u1");
    const detail = await getEditionDetail(db, owner, editionId);
    const error = await refusal(
      saveStructure(db, owner, editionId, requestKey(owner, "structure-save"), {
        expectedRevision: detail.structureRevision,
        config: detail.config,
        outline: [],
      }),
    );
    expect(error.status).toBe(400);
  });

  it("설정의 교재 번호를 다른 책으로 바꿔 저장하지 못한다", async () => {
    const { editionId } = await newBook();
    const detail = await getEditionDetail(db, owner, editionId);
    const error = await refusal(
      saveStructure(db, owner, editionId, requestKey(owner, "structure-save"), {
        expectedRevision: detail.structureRevision,
        config: { ...detail.config, bookId: randomUUID() },
        outline: [],
      }),
    );
    expect(error.status).toBe(400);
  });

  it("발행한 판본의 목차는 못 고친다", async () => {
    const book = await publishedBook(false);
    const detail = await getEditionDetail(db, owner, book.editionId);
    const error = await refusal(
      saveStructure(
        db,
        owner,
        book.editionId,
        requestKey(owner, "structure-save"),
        {
          expectedRevision: detail.structureRevision,
          config: detail.config,
          outline: detail.outline,
        },
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "CONFLICT" });
  });
});

describe("구획 — 구획마다 CAS, 자리는 블록 순서가 정한다", () => {
  async function editionWithUnit() {
    const book = await newBook();
    await withUnits(book.editionId, ["u1"]);
    return book;
  }
  const problemBlock = (itemId: string): ManuscriptBlock => ({
    blockId: randomUUID(),
    kind: "problem",
    itemId,
  });
  async function looseItem(editionId: string, sectionId: string | null = null) {
    const snapshot = await insertSnapshot(pg, {
      userId: owner.id,
      problem: world.problem1,
      snapshotSeed: randomUUID(),
    });
    return insertItem(pg, {
      editionId,
      userId: owner.id,
      snapshotId: snapshot.id,
      sectionId,
    });
  }
  const placement = async (itemId: string) =>
    (
      await pg.query<{ section_id: string | null; order_index: number }>(
        `SELECT "section_id", "order_index" FROM "textbook_item" WHERE "id" = $1`,
        [itemId],
      )
    ).rows[0]!;

  it("expectedRevision 0 이면 주소의 id 로 만든다. 목차에 없는 단원에는 못 만든다", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(editionId, "u1");
    expect(created.section).toMatchObject({
      id: created.sectionId,
      unitKey: "u1",
      revision: 1,
    });
    expect(created.replayed).toBe(false);
    const detail = await getEditionDetail(db, owner, editionId);
    expect(detail.outline[0]!.sections.map((s) => s.id)).toEqual([
      created.sectionId,
    ]);
    // 구획 목록이 바뀌었으므로 목차의 CAS 값도 오른다 — 낡은 목차가 새 구획을 모른 채 저장되지 않게
    expect(detail.structureRevision).toBe(3);
    const error = await refusal(
      saveSection(
        db,
        owner,
        editionId,
        randomUUID(),
        requestKey(owner, "section-save"),
        {
          expectedRevision: 0,
          unitKey: "nowhere",
          section: section(),
        },
      ),
    );
    expect(error.status).toBe(400);
  });

  it("있는 구획을 0 으로 다시 만들면 409 — 덮어쓰지 않는다", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(
      editionId,
      "u1",
      section({ title: "원래" }),
    );
    const error = await refusal(
      saveSection(
        db,
        owner,
        editionId,
        created.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: 0,
          unitKey: "u1",
          section: section({ title: "덮어쓰기" }),
        },
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    expect(
      (await getSection(db, owner, editionId, created.sectionId)).section.title,
    ).toBe("원래");
  });

  it("낡은 revision 으로 저장하면 409 와 서버의 구획을 준다. 집계 revision 도 안 오른다", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(
      editionId,
      "u1",
      section({ sectionKey: "main" }),
    );
    const saved = await saveSection(
      db,
      owner,
      editionId,
      created.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: 1,
        unitKey: "u1",
        section: section({ sectionKey: "main", title: "첫 기기" }),
      },
    );
    expect(saved.section.revision).toBe(2);
    const before = await revisionOf(pg, editionId);
    const error = await refusal(
      saveSection(
        db,
        owner,
        editionId,
        created.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: 1,
          unitKey: "u1",
          section: section({ sectionKey: "main", title: "둘째 기기" }),
        },
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    expect(error.details).toMatchObject({
      serverRevision: 2,
      serverSection: { revision: 2, section: { title: "첫 기기" } },
    });
    expect(await revisionOf(pg, editionId)).toBe(before);
  });

  it("서로 다른 구획은 서로 부딪히지 않는다", async () => {
    const { editionId } = await editionWithUnit();
    const a = await newSection(editionId, "u1");
    const b = await newSection(editionId, "u1");
    await saveSection(
      db,
      owner,
      editionId,
      a.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: 1,
        unitKey: "u1",
        section: { ...a.section.section, title: "가 고침" },
      },
    );
    const saved = await saveSection(
      db,
      owner,
      editionId,
      b.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: 1,
        unitKey: "u1",
        section: { ...b.section.section, title: "나 고침" },
      },
    );
    expect(saved.section.revision).toBe(2);
  });

  it("같은 요청이 다시 오면 그때의 결과를 돌려주고 두 번 저장하지 않는다", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(editionId, "u1");
    const key = requestKey(owner, "section-save", { retry: true });
    const input = {
      expectedRevision: 1,
      unitKey: "u1",
      section: { ...created.section.section, title: "한 번" },
    };
    const first = await saveSection(
      db,
      owner,
      editionId,
      created.sectionId,
      key,
      input,
    );
    const again = await saveSection(
      db,
      owner,
      editionId,
      created.sectionId,
      key,
      input,
    );
    expect(again.replayed).toBe(true);
    expect(again.section).toEqual(first.section);
    expect(again.aggregateRevision).toBe(first.aggregateRevision);
    expect(
      (await getSection(db, owner, editionId, created.sectionId)).revision,
    ).toBe(2);
  });

  it("문제 블록의 차례대로 배치가 놓이고, 블록에서 빠진 배치는 구획 밖으로 나간다 (지워지지 않는다)", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(editionId, "u1");
    const [first, second, third] = [
      await looseItem(editionId),
      await looseItem(editionId),
      await looseItem(editionId),
    ];
    const placed = await saveSection(
      db,
      owner,
      editionId,
      created.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: 1,
        unitKey: "u1",
        section: {
          ...created.section.section,
          blocks: [
            problemBlock(third!),
            problemBlock(first!),
            problemBlock(second!),
          ],
        },
      },
    );
    expect(await placement(third!)).toEqual({
      section_id: created.sectionId,
      order_index: 0,
    });
    expect(await placement(first!)).toEqual({
      section_id: created.sectionId,
      order_index: 1,
    });
    expect(await placement(second!)).toEqual({
      section_id: created.sectionId,
      order_index: 2,
    });
    await saveSection(
      db,
      owner,
      editionId,
      created.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: placed.section.revision,
        unitKey: "u1",
        section: {
          ...created.section.section,
          blocks: [problemBlock(second!)],
        },
      },
    );
    expect(await placement(second!)).toEqual({
      section_id: created.sectionId,
      order_index: 0,
    });
    expect((await placement(first!)).section_id).toBeNull();
    expect((await placement(third!)).section_id).toBeNull();
  });

  it("없는 배치 · 다른 판본의 배치 · 다른 구획의 배치 · 두 번 놓은 배치는 사유와 함께 거절한다", async () => {
    const { editionId } = await editionWithUnit();
    const other = await editionWithUnit();
    const here = await newSection(editionId, "u1");
    const there = await newSection(editionId, "u1");
    const foreign = await looseItem(other.editionId);
    const taken = await looseItem(editionId, there.sectionId);
    const mine = await looseItem(editionId);
    const save = (blocks: ManuscriptBlock[]) =>
      refusal(
        saveSection(
          db,
          owner,
          editionId,
          here.sectionId,
          requestKey(owner, "section-save"),
          {
            expectedRevision: 1,
            unitKey: "u1",
            section: { ...here.section.section, blocks },
          },
        ),
      );
    const codes = async (blocks: ManuscriptBlock[]) =>
      ((await save(blocks)).details!.issues as Array<{ code: string }>).map(
        (entry) => entry.code,
      );
    expect(await codes([problemBlock(randomUUID())])).toEqual([
      "item-not-found",
    ]);
    expect(await codes([problemBlock(foreign)])).toEqual(["item-not-found"]);
    expect(await codes([problemBlock(taken)])).toEqual([
      "item-in-other-section",
    ]);
    expect(await codes([problemBlock(mine), problemBlock(mine)])).toEqual([
      "duplicate-item",
    ]);
    // 하나가 틀리면 전부 안 쓴다 — 맞는 배치도 놓이지 않는다
    await save([problemBlock(mine), problemBlock(randomUUID())]);
    expect((await placement(mine)).section_id).toBeNull();
  });

  it("개념 블록은 그 판본의 개념만 가리키고, 놓인 구획이 개념 줄에 적힌다", async () => {
    const { editionId } = await editionWithUnit();
    const here = await newSection(editionId, "u1");
    const conceptKey = await insertConcept(pg, editionId);
    const unknown = await refusal(
      saveSection(
        db,
        owner,
        editionId,
        here.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: 1,
          unitKey: "u1",
          section: {
            ...here.section.section,
            blocks: [
              { blockId: randomUUID(), kind: "concept", conceptKey: "nope" },
            ],
          },
        },
      ),
    );
    expect((unknown.details!.issues as Array<{ code: string }>)[0]!.code).toBe(
      "concept-not-found",
    );
    await saveSection(
      db,
      owner,
      editionId,
      here.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: 1,
        unitKey: "u1",
        section: {
          ...here.section.section,
          blocks: [{ blockId: randomUUID(), kind: "concept", conceptKey }],
        },
      },
    );
    const { rows } = await pg.query<{ section_id: string }>(
      `SELECT "section_id" FROM "textbook_concept" WHERE "edition_id" = $1 AND "concept_key" = $2`,
      [editionId, conceptKey],
    );
    expect(rows[0]!.section_id).toBe(here.sectionId);
  });

  it("그림 블록은 내 자산만 쓴다 — 쓰면 판본의 읽기 범위에 올라간다. 남의 자산은 해시를 알아도 못 쓴다", async () => {
    const { editionId } = await editionWithUnit();
    const here = await newSection(editionId, "u1");
    const mine = await insertAsset(
      pg,
      owner.id,
      Buffer.from(`mine-${editionId}`),
    );
    const theirs = await insertAsset(
      pg,
      colleague.id,
      Buffer.from(`theirs-${editionId}`),
    );
    const image = (assetId: string): ManuscriptBlock => ({
      blockId: randomUUID(),
      kind: "image",
      assetId,
      caption: null,
    });
    const error = await refusal(
      saveSection(
        db,
        owner,
        editionId,
        here.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: 1,
          unitKey: "u1",
          section: { ...here.section.section, blocks: [image(theirs)] },
        },
      ),
    );
    expect((error.details!.issues as Array<{ code: string }>)[0]!.code).toBe(
      "asset-not-found",
    );
    await saveSection(
      db,
      owner,
      editionId,
      here.sectionId,
      requestKey(owner, "section-save"),
      {
        expectedRevision: 1,
        unitKey: "u1",
        section: { ...here.section.section, blocks: [image(mine)] },
      },
    );
    const { rows } = await pg.query<{ asset_id: string }>(
      `SELECT "asset_id" FROM "textbook_edition_asset" WHERE "edition_id" = $1`,
      [editionId],
    );
    expect(rows.map((row) => row.asset_id)).toEqual([mine]);
  });

  it("너무 큰 구획은 413", async () => {
    const { editionId } = await editionWithUnit();
    const error = await refusal(
      saveSection(
        db,
        owner,
        editionId,
        randomUUID(),
        requestKey(owner, "section-save"),
        {
          expectedRevision: 0,
          unitKey: "u1",
          section: section({
            blocks: [
              { blockId: "b", kind: "text", markdown: "가".repeat(100_000) },
            ],
          }),
        },
      ),
    );
    expect(error).toMatchObject({ status: 413, code: "PAYLOAD_TOO_LARGE" });
  });

  it("남의 판본에는 구획을 만들지도 고치지도 못한다", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(editionId, "u1");
    for (const [sectionId, expectedRevision] of [
      [randomUUID(), 0],
      [created.sectionId, 1],
    ] as const) {
      const error = await refusal(
        saveSection(
          db,
          colleague,
          editionId,
          sectionId,
          requestKey(colleague, "section-save"),
          {
            expectedRevision,
            unitKey: "u1",
            section: section({ title: "남의 손" }),
          },
        ),
      );
      expect(error.status).toBe(404);
    }
    expect(
      (await getSection(db, owner, editionId, created.sectionId)).section.title,
    ).toBe("준비 학습");
  });

  it("구획을 지우면 배치는 구획 밖으로 나간다. 낡은 revision 으로는 못 지운다", async () => {
    const { editionId } = await editionWithUnit();
    const created = await newSection(editionId, "u1");
    const itemId = await looseItem(editionId, created.sectionId);
    const stale = await refusal(
      deleteSection(
        db,
        owner,
        editionId,
        created.sectionId,
        requestKey(owner, "section-delete"),
        { expectedRevision: 9 },
      ),
    );
    expect(stale).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    const { edition } = await deleteSection(
      db,
      owner,
      editionId,
      created.sectionId,
      requestKey(owner, "section-delete"),
      {
        expectedRevision: 1,
      },
    );
    expect(edition.outline[0]!.sections).toEqual([]);
    expect((await placement(itemId)).section_id).toBeNull();
    expect(
      (await refusal(getSection(db, owner, editionId, created.sectionId)))
        .status,
    ).toBe(404);
  });

  it("발행한 판본의 구획은 못 고친다 — 앱이 먼저 409 로 막는다", async () => {
    const book = await publishedBook(false);
    const error = await refusal(
      saveSection(
        db,
        owner,
        book.editionId,
        book.sectionId,
        requestKey(owner, "section-save"),
        {
          expectedRevision: 1,
          unitKey: "u1",
          section: section({ title: "발행 뒤 고침" }),
        },
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "CONFLICT" });
  });
});

describe("새 판본", () => {
  it("초안이 있으면 또 만들지 못한다", async () => {
    const { bookId, editionId } = await newBook();
    const error = await refusal(
      createEdition(db, owner, bookId, requestKey(owner, "edition-create"), {
        label: "2판",
      }),
    );
    expect(error.status).toBe(409);
    expect(error.details).toMatchObject({ draftEditionId: editionId });
  });

  it("발행본을 복제하면 구획 · 배치 · 개념이 새 줄로 오고, 확정본은 같은 행이며, 옛 판본은 그대로다", async () => {
    const book = await publishedBook(false);
    await pg.query(
      `UPDATE "textbook_edition" SET "status" = 'published' WHERE FALSE`, // 발행본은 못 고친다는 것을 아래가 전제한다
    );
    const before = await pg.query(
      `SELECT "content", "revision" FROM "textbook_section" WHERE "id" = $1`,
      [book.sectionId],
    );
    const { edition } = await createEdition(
      db,
      owner,
      book.bookId,
      requestKey(owner, "edition-create"),
      {
        sourceEditionId: book.editionId,
        label: "2판",
      },
    );
    const nextId = edition.edition.editionId;
    expect(edition.edition).toMatchObject({ status: "draft", label: "2판" });
    const items = await pg.query<{
      id: string;
      snapshot_id: string;
      derived_from_item_id: string;
      physical_page_index: number | null;
    }>(
      `SELECT "id", "snapshot_id", "derived_from_item_id", "physical_page_index" FROM "textbook_item" WHERE "edition_id" = $1`,
      [nextId],
    );
    expect(items.rows).toHaveLength(1);
    expect(items.rows[0]!.id).not.toBe(book.itemId);
    expect(items.rows[0]!).toMatchObject({
      snapshot_id: book.snapshotId,
      derived_from_item_id: book.itemId,
      physical_page_index: null,
    });
    const concepts = await pg.query<{
      frozen: unknown;
      derived_from_concept_key: string | null;
    }>(
      `SELECT "frozen", "derived_from_concept_key" FROM "textbook_concept" WHERE "edition_id" = $1`,
      [nextId],
    );
    expect(concepts.rows).toEqual([
      { frozen: null, derived_from_concept_key: null },
    ]);
    // QR 은 따라오지 않는다 — 새 판본은 발행할 때 새로 받는다
    const qr = await pg.query(
      `SELECT 1 FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [nextId],
    );
    expect(qr.rows).toEqual([]);
    const assets = await pg.query(
      `SELECT 1 FROM "textbook_edition_asset" WHERE "edition_id" = $1`,
      [nextId],
    );
    expect(assets.rows).toHaveLength(1);
    const after = await pg.query(
      `SELECT "content", "revision" FROM "textbook_section" WHERE "id" = $1`,
      [book.sectionId],
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("복제하면 원고의 문제 블록이 새 배치를 가리킨다", async () => {
    const draft = await draftWithContent(
      pg,
      { ...world, userA: owner.id },
      owner.id,
    );
    await pg.query(
      `UPDATE "textbook_section" SET "content" = $2::jsonb WHERE "id" = $1`,
      [
        draft.sectionId,
        JSON.stringify({
          blocks: [{ blockId: "b1", kind: "problem", itemId: draft.itemId }],
        }),
      ],
    );
    const plan = await reservePublish(pg, draft);
    await runSteps(pg, draft, plan);
    await finalizePublish(pg, draft, plan);
    const { edition } = await createEdition(
      db,
      owner,
      draft.bookId,
      requestKey(owner, "edition-create"),
      {
        sourceEditionId: draft.editionId,
        label: "2판",
      },
    );
    const copied = await pg.query<{
      id: string;
      content: { blocks: Array<{ itemId: string }> };
    }>(
      `SELECT "id", "content" FROM "textbook_section" WHERE "edition_id" = $1`,
      [edition.edition.editionId],
    );
    const item = await pg.query<{ id: string; section_id: string }>(
      `SELECT "id", "section_id" FROM "textbook_item" WHERE "edition_id" = $1`,
      [edition.edition.editionId],
    );
    expect(copied.rows[0]!.content.blocks[0]!.itemId).toBe(item.rows[0]!.id);
    expect(item.rows[0]!.section_id).toBe(copied.rows[0]!.id);
  });

  it("복제하면 구조 메타(예제 묶음 · 참조 항목)의 배치 id 도 새 배치를 가리킨다 — 옛 id 는 어디에도 남지 않는다", async () => {
    const draft = await draftWithContent(
      pg,
      { ...world, userA: owner.id },
      owner.id,
    );
    const second = await insertSnapshot(pg, {
      userId: owner.id,
      problem: world.problem2,
      snapshotSeed: `${draft.editionId}-2`,
    });
    const secondItemId = await insertItem(pg, {
      editionId: draft.editionId,
      userId: owner.id,
      snapshotId: second.id,
      sectionId: draft.sectionId,
    });
    const group = {
      activity: "workedExamples",
      node: {
        kind: "exampleGroup",
        groupId: "example-g1",
        title: "예제",
        strategy: "전략",
        exampleItemId: draft.itemId,
        confirmItemIds: [secondItemId],
      },
    };
    await pg.query(
      `UPDATE "textbook_section" SET "content" = $2::jsonb WHERE "id" = $1`,
      [
        draft.sectionId,
        JSON.stringify({
          blocks: [
            { blockId: "h1", kind: "text", markdown: "예제", semantic: group },
            {
              blockId: "p1",
              kind: "problem",
              itemId: draft.itemId,
              semantic: group,
            },
            {
              blockId: "p2",
              kind: "problem",
              itemId: secondItemId,
              semantic: group,
            },
            {
              blockId: "r1",
              kind: "text",
              markdown: "참조",
              semantic: {
                activity: "tableOfContents",
                node: {
                  kind: "references",
                  entries: [
                    { key: "k1", label: "예제", targetItemId: draft.itemId },
                    { key: "k2", label: "확인", targetItemId: secondItemId },
                    { key: "k3", label: "없는 대상" },
                  ],
                },
              },
            },
          ],
        }),
      ],
    );
    const plan = await reservePublish(pg, draft);
    await runSteps(pg, draft, plan);
    await finalizePublish(pg, draft, plan);
    const { edition } = await createEdition(
      db,
      owner,
      draft.bookId,
      requestKey(owner, "edition-create"),
      { sourceEditionId: draft.editionId, label: "2판" },
    );
    const nextId = edition.edition.editionId;
    const copied = await pg.query<{
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 시험이 임의 모양의 JSON 을 읽는다
      content: { blocks: Array<Record<string, any>> };
    }>(`SELECT "content" FROM "textbook_section" WHERE "edition_id" = $1`, [
      nextId,
    ]);
    const items = await pg.query<{ id: string; derived: string }>(
      `SELECT "id", "derived_from_item_id" AS "derived" FROM "textbook_item" WHERE "edition_id" = $1`,
      [nextId],
    );
    const newOf = (old: string) =>
      items.rows.find((row) => row.derived === old)!.id;
    const newExample = newOf(draft.itemId);
    const newConfirm = newOf(secondItemId);
    const blocks = copied.rows[0]!.content.blocks;
    for (const index of [0, 1, 2]) {
      expect(blocks[index]!.semantic.node).toMatchObject({
        exampleItemId: newExample,
        confirmItemIds: [newConfirm],
      });
    }
    expect(blocks[1]!.itemId).toBe(newExample);
    expect(blocks[2]!.itemId).toBe(newConfirm);
    expect(blocks[3]!.semantic.node.entries).toEqual([
      { key: "k1", label: "예제", targetItemId: newExample },
      { key: "k2", label: "확인", targetItemId: newConfirm },
      { key: "k3", label: "없는 대상" },
    ]);
    const text = JSON.stringify(copied.rows[0]!.content);
    expect(text).not.toContain(draft.itemId);
    expect(text).not.toContain(secondItemId);
  });

  it("남의 책에는 판본을 만들지 못한다 — 공유받은 책이어도", async () => {
    const book = await publishedBook(true);
    const error = await refusal(
      createEdition(
        db,
        colleague,
        book.bookId,
        requestKey(colleague, "edition-create"),
        {
          sourceEditionId: book.editionId,
          label: "가로챈 2판",
        },
      ),
    );
    expect(error.status).toBe(404);
  });
});
