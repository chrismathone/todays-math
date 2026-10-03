// @vitest-environment node
/**
 * 문항 담기 — 확정본을 **손실 없이** 만들고, 만든 뒤에는 살아 있는 은행 문항을 읽지 않는다.
 * 서버 코드를 PGlite(실제 마이그레이션 사슬) 위에서 그대로 돌린다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { textbookExchangeSchema } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import {
  contentHash,
  manifestHash,
  sha256,
  snapshotHash,
} from "@/lib/textbook/hash.server";
import { createBook } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import {
  type CaptureSource,
  captureItems,
  diffItem,
  recaptureItem,
  updateItem,
} from "@/lib/textbook/server/items";
import { getSection, saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";
import type { FigureLoader } from "@/lib/textbook/snapshotFromProblem";

import {
  type Db,
  type World,
  openTextbookDb,
  seedWorld,
  sqlNow,
} from "../helpers/textbookPglite";
import {
  type BankProblemInput,
  insertBankProblem,
  insertTeacher,
  pgliteTextbookDb,
  requestKey,
  sampleConfig,
  tinyPng,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let owner: TextbookActor;
let other: TextbookActor;

const figures = new Map<string, Buffer>();
const loadFigure: FigureLoader = async (path) => figures.get(path) ?? null;

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
  other = await insertTeacher(pg, { name: "남" });
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

async function draft(actor: TextbookActor = owner) {
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
        sectionKey: "main",
        title: "유형",
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

const problem = (input: BankProblemInput = {}) =>
  insertBankProblem(pg, world.unitId, input);

async function capture(
  target: { editionId: string; sectionId: string; revision: number },
  source: CaptureSource,
  actor: TextbookActor = owner,
  key = requestKey(actor, "capture", source),
) {
  return captureItems(
    db,
    actor,
    target.editionId,
    key,
    { expectedRevision: target.revision, sectionId: target.sectionId, source },
    loadFigure,
  );
}

const snapshotRow = async (snapshotId: string) =>
  (
    await pg.query<{
      payload: {
        content: string;
        answer: string;
        solution: string | null;
        figures: Array<Record<string, unknown>>;
      };
      raw_source: Record<string, unknown>;
      source_metadata: Record<string, unknown>;
      source_ref: Record<string, unknown>;
      content_hash: string;
      snapshot_hash: string;
      problem_id: string | null;
    }>(`SELECT * FROM "textbook_problem_snapshot" WHERE "id" = $1`, [
      snapshotId,
    ])
  ).rows[0]!;

describe("담기 — 문항 목록", () => {
  it("받은 순서대로 확정본 · 배치 · 문제 블록을 만든다. 같은 문항을 두 번 주면 배치는 둘, 확정본은 하나다", async () => {
    const target = await draft();
    const [a, b] = [
      await problem({ content: "가" }),
      await problem({ content: "나" }),
    ];
    const result = await capture(target, {
      kind: "problems",
      problemIds: [b.id, a.id, b.id],
    });
    expect(result.excluded).toEqual([]);
    expect(result.replayed).toBe(false);
    expect(result.items).toHaveLength(3);
    expect(result.items.map((item) => item.orderIndex)).toEqual([0, 1, 2]);
    expect(result.items.map((item) => item.displayNumber)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(
      result.items.every(
        (item) =>
          item.linkStatus === "linked" &&
          item.qrTargetId === null &&
          item.sectionKey === "main",
      ),
    ).toBe(true);
    expect(result.items[0]!.snapshotId).toBe(result.items[2]!.snapshotId);
    expect(result.items[0]!.snapshotId).not.toBe(result.items[1]!.snapshotId);
    const section = await getSection(
      db,
      owner,
      target.editionId,
      target.sectionId,
    );
    expect(
      section.section.blocks.map((block) =>
        block.kind === "problem" ? block.itemId : null,
      ),
    ).toEqual(result.items.map((item) => item.itemId));
    expect(section.revision).toBe(2);
    expect(result.aggregateRevision).toBeGreaterThan(target.revision);
    expect(
      (await snapshotRow(result.items[0]!.snapshotId)).payload.content,
    ).toBe("나");
  });

  it("출제 자격이 없는 문항 · 없는 문항은 사유와 함께 빼고 나머지는 담는다", async () => {
    const target = await draft();
    const ok = await problem();
    const pending = await problem({ reviewStatus: "pending" });
    const locked = await problem({ directUseAllowed: false });
    const hidden = await problem({ pool: "private" });
    const noAnswer = await problem({ answer: "(정답 없음)" });
    const ghost = randomUUID();
    const result = await capture(target, {
      kind: "problems",
      problemIds: [pending.id, ok.id, locked.id, hidden.id, noAnswer.id, ghost],
    });
    expect(result.items).toHaveLength(1);
    expect(result.excluded).toEqual([
      { problemId: pending.id, reason: "검수를 통과하지 않은 문항입니다." },
      { problemId: locked.id, reason: "출제가 잠긴 문항입니다." },
      { problemId: hidden.id, reason: "공용 풀 문항이 아닙니다." },
      { problemId: noAnswer.id, reason: "정답이 없는 문항입니다." },
      { problemId: ghost, reason: "문항을 찾을 수 없습니다." },
    ]);
    const { rows } = await pg.query(
      `SELECT 1 FROM "textbook_problem_snapshot" WHERE "problem_id" = ANY($1::uuid[])`,
      [[pending.id, locked.id, hidden.id, noAnswer.id]],
    );
    expect(rows).toEqual([]);
  });

  it("같은 요청이 다시 오면 그때의 결과를 돌려주고 두 번 담지 않는다", async () => {
    const target = await draft();
    const a = await problem();
    const source: CaptureSource = { kind: "problems", problemIds: [a.id] };
    const key = requestKey(owner, "capture", source);
    const first = await capture(target, source, owner, key);
    const again = await capture(target, source, owner, key);
    expect(again.replayed).toBe(true);
    expect(again.items).toEqual(first.items);
    const { rows } = await pg.query(
      `SELECT 1 FROM "textbook_item" WHERE "edition_id" = $1`,
      [target.editionId],
    );
    expect(rows).toHaveLength(1);
  });

  it("낡은 집계 revision 으로는 담지 못한다", async () => {
    const target = await draft();
    const a = await problem();
    await capture(target, { kind: "problems", problemIds: [a.id] });
    const error = await refusal(
      capture(target, { kind: "problems", problemIds: [a.id] }),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    const { rows } = await pg.query(
      `SELECT 1 FROM "textbook_item" WHERE "edition_id" = $1`,
      [target.editionId],
    );
    expect(rows).toHaveLength(1);
  });

  it("남의 판본에는 담지 못한다", async () => {
    const target = await draft();
    const a = await problem();
    const error = await refusal(
      capture(target, { kind: "problems", problemIds: [a.id] }, other),
    );
    expect(error.status).toBe(404);
  });

  it("문제은행의 문항은 주인으로 거르지 않는다 — 공용 풀이면 누구의 책에나 담긴다", async () => {
    const a = await problem();
    for (const actor of [owner, other]) {
      const target = await draft(actor);
      const result = await capture(
        target,
        { kind: "problems", problemIds: [a.id] },
        actor,
      );
      expect(result.items).toHaveLength(1);
    }
    // 확정본은 주인마다 따로 선다
    const { rows } = await pg.query<{ user_id: string }>(
      `SELECT "user_id" FROM "textbook_problem_snapshot" WHERE "problem_id" = $1 ORDER BY "user_id"`,
      [a.id],
    );
    expect(rows.map((row) => row.user_id).sort()).toEqual(
      [owner.id, other.id].sort(),
    );
  });
});

describe("담기 — 시험지", () => {
  async function test(actor: TextbookActor, problemIds: string[]) {
    const classId = randomUUID();
    await pg.query(
      `INSERT INTO "class" ("id", "user_id", "name", "grade", "difficulty_ratio", "updated_at") VALUES ($1, $2, '반', '중2', '{}'::jsonb, $3)`,
      [classId, actor.id, sqlNow()],
    );
    const testId = randomUUID();
    await pg.query(
      `INSERT INTO "test" ("id", "user_id", "class_id", "test_type", "range_end_unit_id", "test_date") VALUES ($1, $2, $3, 'review', $4, '2026-10-03')`,
      [testId, actor.id, classId, world.unitId],
    );
    const rows: string[] = [];
    for (const [index, problemId] of problemIds.entries()) {
      const id = randomUUID();
      rows.push(id);
      // 일부러 번호를 거꾸로 넣는다 — 담는 차례는 넣은 차례가 아니라 문항 번호다
      await pg.query(
        `INSERT INTO "test_problem" ("id", "test_id", "problem_id", "order_index", "score") VALUES ($1, $2, $3, $4, 5)`,
        [id, testId, problemId, problemIds.length - index],
      );
    }
    return { testId, testProblemIds: rows };
  }

  it("문항 번호 순으로 담고 출처(시험지 · 시험지 문항)를 적는다. 시험지 표는 한 글자도 안 바뀐다", async () => {
    const target = await draft();
    const [a, b] = [
      await problem({ content: "첫째로 넣음" }),
      await problem({ content: "둘째로 넣음" }),
    ];
    const paper = await test(owner, [a.id, b.id]);
    const before = await pg.query(
      `SELECT * FROM "test_problem" WHERE "test_id" = $1 ORDER BY "id"`,
      [paper.testId],
    );
    const result = await capture(target, {
      kind: "test",
      testId: paper.testId,
    });
    expect(result.items.map((item) => item.sourceTestProblemId)).toEqual([
      paper.testProblemIds[1],
      paper.testProblemIds[0],
    ]);
    expect(
      result.items.every((item) => item.sourceTestId === paper.testId),
    ).toBe(true);
    const after = await pg.query(
      `SELECT * FROM "test_problem" WHERE "test_id" = $1 ORDER BY "id"`,
      [paper.testId],
    );
    expect(after.rows).toEqual(before.rows);
  });

  it("남의 시험지는 없는 것과 같다", async () => {
    const target = await draft();
    const paper = await test(other, [(await problem()).id]);
    const error = await refusal(
      capture(target, { kind: "test", testId: paper.testId }),
    );
    expect(error.status).toBe(404);
  });

  it("시험지에 든 문항이어도 자격을 문항마다 다시 묻는다", async () => {
    const target = await draft();
    const [ok, locked] = [
      await problem(),
      await problem({ directUseAllowed: false }),
    ];
    const paper = await test(owner, [ok.id, locked.id]);
    const result = await capture(target, {
      kind: "test",
      testId: paper.testId,
    });
    expect(result.items).toHaveLength(1);
    expect(result.excluded).toEqual([
      { problemId: locked.id, reason: "출제가 잠긴 문항입니다." },
    ]);
  });
});

describe("확정본은 손실 없이 담긴다", () => {
  it("그림 바이트를 얼리고, 원본 배열 넷을 글자 그대로 남긴다", async () => {
    const target = await draft();
    const [stem, choice] = [
      tinyPng(640, 480, "stem"),
      tinyPng(200, 100, "choice"),
    ];
    figures.set("/figures/9001/stem.png", stem);
    figures.set("/figures/9001/choice.png", choice);
    const a = await problem({
      figureUrls: ["/figures/9001/stem.png", "/figures/9001/choice.png"],
      figureDims: [640, 480, 200, 100],
      figureSourceMm: [82.5, 30],
      choiceFigureIndex: [0, 3],
      score: 4.5,
      questionType: "객관식",
    });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    const row = await snapshotRow(result.items[0]!.snapshotId);
    expect(row.raw_source).toEqual({
      figureUrls: ["/figures/9001/stem.png", "/figures/9001/choice.png"],
      figureDims: [640, 480, 200, 100],
      figureSourceMm: [82.5, 30],
      choiceFigureIndex: [0, 3],
      figureSvgAssetId: null,
    });
    expect(row.payload.figures).toEqual([
      {
        assetId: sha256(stem),
        sha256: sha256(stem),
        choiceIndex: 0,
        sourceWidthMm: 82.5,
        altText: null,
      },
      {
        assetId: sha256(choice),
        sha256: sha256(choice),
        choiceIndex: 3,
        sourceWidthMm: 30,
        altText: null,
      },
    ]);
    expect(row.source_metadata).toMatchObject({
      unitId: world.unitId,
      grade: "중2",
      difficulty: "기본",
      originalScore: 4.5,
    });
    expect(row.source_ref).toEqual({
      system: "todays-math",
      problemId: a.id,
      problemCode: a.code,
    });
    // 바이트가 내용 해시로 들어갔고, 주인의 손잡이와 판본의 색인이 생겼다. 치수는 원본 칸이 아니라 바이트에서 잰 값이다
    const assets = await pg.query<{
      id: string;
      width_px: number;
      height_px: number;
      mime_type: string;
    }>(
      `SELECT a."id", a."width_px", a."height_px", a."mime_type" FROM "textbook_edition_asset" ea
         JOIN "textbook_asset" a ON a."user_id" = ea."user_id" AND a."id" = ea."asset_id"
        WHERE ea."edition_id" = $1 ORDER BY a."width_px"`,
      [target.editionId],
    );
    expect(assets.rows).toEqual([
      {
        id: sha256(choice),
        width_px: 200,
        height_px: 100,
        mime_type: "image/png",
      },
      {
        id: sha256(stem),
        width_px: 640,
        height_px: 480,
        mime_type: "image/png",
      },
    ]);
    const blob = await pg.query<{ bytes: Uint8Array }>(
      `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
      [sha256(stem)],
    );
    expect(Buffer.from(blob.rows[0]!.bytes)).toEqual(stem);
  });

  it("길이가 안 맞는 원본 배열도 고치지 않는다 — 지면용 해석만 «모름»이 된다", async () => {
    const target = await draft();
    figures.set("/figures/9002/a.png", tinyPng(10, 10, "a"));
    figures.set("/figures/9002/b.png", tinyPng(10, 10, "b"));
    const a = await problem({
      figureUrls: ["/figures/9002/a.png", "/figures/9002/b.png"],
      figureDims: [10, 10, 10],
      figureSourceMm: [40],
      choiceFigureIndex: [1, 1],
    });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    const row = await snapshotRow(result.items[0]!.snapshotId);
    expect(row.raw_source).toMatchObject({
      figureDims: [10, 10, 10],
      figureSourceMm: [40],
      choiceFigureIndex: [1, 1],
    });
    // 짝이 겹치고(둘 다 ①) 물리 폭 배열의 길이가 다르다 — 아무 그림이나 ①에 붙이지 않는다
    expect(
      row.payload.figures.map((figure) => [
        figure.choiceIndex,
        figure.sourceWidthMm,
      ]),
    ).toEqual([
      [null, null],
      [null, null],
    ]);
  });

  it("엔진이 그린 SVG 는 자산으로 얼리고 그림의 첫 자리에 놓는다", async () => {
    const target = await draft();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>`;
    const a = await problem({ figureSvg: svg });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    const row = await snapshotRow(result.items[0]!.snapshotId);
    const assetId = sha256(Buffer.from(svg, "utf8"));
    expect(row.raw_source.figureSvgAssetId).toBe(assetId);
    expect(row.payload.figures).toEqual([
      {
        assetId,
        sha256: assetId,
        // 인라인 SVG 는 발문의 그림이다(보기 그림이 아니다)
        choiceIndex: 0,
        sourceWidthMm: null,
        altText: null,
      },
    ]);
    const asset = await pg.query<{ mime_type: string }>(
      `SELECT "mime_type" FROM "textbook_asset" WHERE "user_id" = $1 AND "id" = $2`,
      [owner.id, assetId],
    );
    expect(asset.rows).toEqual([{ mime_type: "image/svg+xml" }]);
  });

  it.each([
    [
      "스크립트",
      `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`,
    ],
    [
      "이벤트 속성",
      `<svg xmlns="http://www.w3.org/2000/svg" onload="x()"><path d="M0 0"/></svg>`,
    ],
    [
      "바깥 그림",
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.example/x.png"/></svg>`,
    ],
    [
      "foreignObject",
      `<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div/></foreignObject></svg>`,
    ],
  ])("%s 이(가) 든 SVG 는 고치지 않고 담기를 거절한다", async (_name, svg) => {
    const target = await draft();
    const a = await problem({ figureSvg: svg });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    expect(result.items).toEqual([]);
    expect(result.excluded[0]!.problemId).toBe(a.id);
    expect(result.excluded[0]!.reason).toContain("SVG");
  });

  it("그림을 하나라도 못 읽으면 그 문항을 담지 않는다 — 그림 없는 확정본을 만들지 않는다", async () => {
    const target = await draft();
    figures.set("/figures/9003/ok.png", tinyPng(5, 5, "ok"));
    const a = await problem({
      figureUrls: ["/figures/9003/ok.png", "/figures/9003/missing.png"],
    });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    expect(result.items).toEqual([]);
    expect(result.excluded).toEqual([
      {
        problemId: a.id,
        reason: "그림 파일을 읽지 못했습니다: /figures/9003/missing.png",
      },
    ]);
    const { rows } = await pg.query(
      `SELECT 1 FROM "textbook_problem_snapshot" WHERE "problem_id" = $1`,
      [a.id],
    );
    expect(rows).toEqual([]);
  });

  it("그림 주소가 배포본 밖을 가리키면 읽지 않는다", async () => {
    const target = await draft();
    const a = await problem({ figureUrls: ["/figures/../../etc/passwd"] });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    expect(result.excluded[0]!.reason).toContain(
      "그림 주소를 읽을 수 없습니다",
    );
  });

  it("저장된 payload 로 다시 계산한 해시가 적힌 해시와 같다", async () => {
    const target = await draft();
    figures.set("/figures/9004/x.png", tinyPng(7, 9, "x"));
    const a = await problem({
      figureUrls: ["/figures/9004/x.png"],
      figureDims: [7, 9],
      figureSourceMm: [12.25],
      choiceFigureIndex: [0],
    });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    const exchange = await assembleExchange(db, target.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const snapshot = exchange.snapshots[0]!;
    expect(snapshot.snapshotId).toBe(result.items[0]!.snapshotId);
    expect(contentHash(snapshot.payload)).toBe(snapshot.contentHash);
    expect(snapshotHash(snapshot)).toBe(snapshot.snapshotHash);
  });
});

describe("확정본은 살아 있는 문항을 다시 읽지 않는다", () => {
  it("은행 문항을 고쳐도 확정본과 교환 형식은 그대로다", async () => {
    const target = await draft();
    const a = await problem({
      content: "원래 발문",
      answer: "원래 정답",
      solution: "원래 해설",
    });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    const before = await assembleExchange(db, target.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    await pg.query(
      `UPDATE "problem" SET "content" = '고친 발문', "answer" = '고친 정답', "solution" = '고친 해설', "updated_at" = $2 WHERE "id" = $1`,
      [a.id, sqlNow()],
    );
    const after = await assembleExchange(db, target.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(after.snapshots).toEqual(before.snapshots);
    expect(after.snapshots[0]!.payload).toMatchObject({
      content: "원래 발문",
      answer: "원래 정답",
      solution: "원래 해설",
    });
    expect(manifestHash(after)).toBe(manifestHash(before));
    const diff = await diffItem(
      db,
      owner,
      target.editionId,
      result.items[0]!.itemId,
      loadFigure,
    );
    expect(diff).toMatchObject({
      changed: true,
      contentChanged: true,
      blocked: null,
    });
    expect(diff.fields).toEqual(["content", "answer", "solution"]);
  });

  it("은행 문항이 지워져도 확정본의 내용과 불변 정체는 남는다", async () => {
    const target = await draft();
    const a = await problem({ content: "지워질 문항" });
    const result = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    await pg.query(`DELETE FROM "problem" WHERE "id" = $1`, [a.id]);
    const row = await snapshotRow(result.items[0]!.snapshotId);
    expect(row.problem_id).toBeNull();
    expect(row.payload.content).toBe("지워질 문항");
    expect(row.source_ref).toMatchObject({
      problemId: a.id,
      problemCode: a.code,
    });
    const exchange = await assembleExchange(db, target.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.snapshots[0]!.source).toEqual({
      system: "todays-math",
      problemId: a.id,
      problemCode: a.code,
    });
    const diff = await diffItem(
      db,
      owner,
      target.editionId,
      result.items[0]!.itemId,
      loadFigure,
    );
    expect(diff).toMatchObject({
      changed: false,
      blocked: "원본 문항이 지워졌습니다.",
    });
  });

  it("다시 캡처하면 새 확정본이 생기고 배치가 그것을 가리킨다. 옛 확정본은 그대로 남는다", async () => {
    const target = await draft();
    const a = await problem({ content: "1차" });
    const first = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    await pg.query(
      `UPDATE "problem" SET "content" = '2차', "updated_at" = $2 WHERE "id" = $1`,
      [a.id, sqlNow()],
    );
    const again = await recaptureItem(
      db,
      owner,
      target.editionId,
      first.items[0]!.itemId,
      requestKey(owner, "recapture"),
      { expectedRevision: first.aggregateRevision },
      loadFigure,
    );
    expect(again.item.snapshotId).not.toBe(first.items[0]!.snapshotId);
    expect((await snapshotRow(again.item.snapshotId)).payload.content).toBe(
      "2차",
    );
    expect(
      (await snapshotRow(first.items[0]!.snapshotId)).payload.content,
    ).toBe("1차");
    expect(again.aggregateRevision).toBeGreaterThan(first.aggregateRevision);
  });

  it("내용은 같고 출처 정보만 바뀌면 내용 해시는 같고 확정본 해시가 달라 새 줄이 선다", async () => {
    const target = await draft();
    const a = await problem({ content: "같은 발문", score: 3 });
    const first = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    await pg.query(
      `UPDATE "problem" SET "score" = 5, "updated_at" = $2 WHERE "id" = $1`,
      [a.id, sqlNow()],
    );
    const diff = await diffItem(
      db,
      owner,
      target.editionId,
      first.items[0]!.itemId,
      loadFigure,
    );
    expect(diff).toMatchObject({
      changed: true,
      contentChanged: false,
      metadataChanged: true,
      fields: [],
    });
    const again = await recaptureItem(
      db,
      owner,
      target.editionId,
      first.items[0]!.itemId,
      requestKey(owner, "recapture"),
      {
        expectedRevision: first.aggregateRevision,
      },
      loadFigure,
    );
    const [old, fresh] = [
      await snapshotRow(first.items[0]!.snapshotId),
      await snapshotRow(again.item.snapshotId),
    ];
    expect(fresh.content_hash).toBe(old.content_hash);
    expect(fresh.snapshot_hash).not.toBe(old.snapshot_hash);
    expect(fresh.source_metadata).toMatchObject({ originalScore: 5 });
    expect(old.source_metadata).toMatchObject({ originalScore: 3 });
  });

  it("자격을 잃은 문항은 다시 캡처하지 못한다 — 배치는 옛 확정본을 그대로 쓴다", async () => {
    const target = await draft();
    const a = await problem();
    const first = await capture(target, {
      kind: "problems",
      problemIds: [a.id],
    });
    await pg.query(
      `UPDATE "problem" SET "direct_use_allowed" = FALSE WHERE "id" = $1`,
      [a.id],
    );
    const error = await refusal(
      recaptureItem(
        db,
        owner,
        target.editionId,
        first.items[0]!.itemId,
        requestKey(owner, "recapture"),
        {
          expectedRevision: first.aggregateRevision,
        },
        loadFigure,
      ),
    );
    expect(error).toMatchObject({
      status: 409,
      message: "출제가 잠긴 문항입니다.",
    });
  });
});

describe("배치 고치기", () => {
  it("단계 · 표시 번호 · 풀이선 · 영상 정책을 고친다. 낡은 집계 revision 은 409", async () => {
    const target = await draft();
    const captured = await capture(target, {
      kind: "problems",
      problemIds: [(await problem()).id],
    });
    const itemId = captured.items[0]!.itemId;
    const updated = await updateItem(
      db,
      owner,
      target.editionId,
      itemId,
      requestKey(owner, "item-update"),
      {
        expectedRevision: captured.aggregateRevision,
        learningStage: "application",
        displayNumber: "예제 1",
        layout: {
          columnSpan: 2,
          minWorkLines: 2,
          preferredWorkLines: 4,
          maxWorkLines: 8,
          keepTogether: true,
        },
        videoRequired: true,
      },
    );
    expect(updated.item).toMatchObject({
      learningStage: "application",
      displayNumber: "예제 1",
      videoRequired: true,
    });
    expect(updated.item.layout.columnSpan).toBe(2);
    const stale = await refusal(
      updateItem(
        db,
        owner,
        target.editionId,
        itemId,
        requestKey(owner, "item-update"),
        {
          expectedRevision: captured.aggregateRevision,
          learningStage: "basic",
        },
      ),
    );
    expect(stale).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
  });

  it("이 판본에 없는 개념 열쇠는 조용히 빼지 않고 거절한다", async () => {
    const target = await draft();
    const captured = await capture(target, {
      kind: "problems",
      problemIds: [(await problem()).id],
    });
    const error = await refusal(
      updateItem(
        db,
        owner,
        target.editionId,
        captured.items[0]!.itemId,
        requestKey(owner, "item-update"),
        {
          expectedRevision: captured.aggregateRevision,
          conceptKeys: ["없는-개념"],
        },
      ),
    );
    expect(error.status).toBe(400);
  });
});

describe("교환 형식 조립", () => {
  it("엄격한 계약을 통과하고, 같은 판본은 언제 조립해도 같은 manifest 해시를 낸다", async () => {
    const target = await draft();
    figures.set("/figures/9005/f.png", tinyPng(30, 20, "f"));
    const [a, b] = [
      await problem({
        figureUrls: ["/figures/9005/f.png"],
        figureDims: [30, 20],
      }),
      await problem({ content: "둘째" }),
    ];
    await capture(target, { kind: "problems", problemIds: [a.id, b.id] });
    const first = await assembleExchange(db, target.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const second = await assembleExchange(db, target.editionId, {
      exportedAt: "2026-10-04T09:00:00.000Z",
    });
    const parsed = textbookExchangeSchema.parse(first);
    expect(parsed.items.map((item) => item.orderIndex)).toEqual([0, 1]);
    expect(parsed.units[0]!.sections[0]!.blocks).toHaveLength(2);
    expect(parsed.assets).toHaveLength(1);
    expect(parsed.assets[0]!).toMatchObject({
      widthPx: 30,
      heightPx: 20,
      mimeType: "image/png",
    });
    expect(parsed.qrTargets).toEqual([]);
    expect(parsed.pageMap).toEqual([]);
    // 없는 선택 칸을 기본값으로 채우지 않는다
    expect("conceptIntegration" in first).toBe(false);
    expect("conceptKeys" in first.items[0]!).toBe(false);
    expect("videoRequired" in first.items[0]!).toBe(false);
    // 내보낸 시각은 manifest 밖이다
    expect(manifestHash(second)).toBe(manifestHash(first));
  });
});
