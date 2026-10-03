// @vitest-environment node
/**
 * 구획 미리보기 — 고른 구획 하나만 실은 교환 형식.
 *
 * 재는 것:
 *   · 범위 — 그 구획과 그 구획이 가리키는 것만 실린다. 실린 값은 판본 전체를 조립했을 때의 그 값과 **글자까지 같다**
 *   · 읽기만 — revision 이 오르지 않고, QR · 굳힌 개념이 DB 에 생기지 않는다
 *   · 권한 — 남의 초안 · 공유 안 된 발행본 · 다른 판본의 구획은 404
 *   · 발행본 — 은행 문항이 그사이 바뀌어도 확정본을 낸다. 개념은 발행 때 굳힌 그대로다(다시 굳히지 않는다)
 *   · 실제 검증기가 잘라 낸 교환 형식을 받아들인다(조판기가 받을 수 있는 모양이다)
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookConcept } from "@/contracts/textbookConcept.contract";
import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import { textbookSectionPreviewSchema } from "@/contracts/textbookServer.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { freezeTextbookConcept } from "@/lib/textbook/concepts";
import { sha256 } from "@/lib/textbook/hash.server";
import { validateTextbookIntegrity } from "@/lib/textbook/integrity.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { linkEditionAssets, putAsset } from "@/lib/textbook/server/blobs";
import { createBook, updateBook } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { captureItems, updateItem } from "@/lib/textbook/server/items";
import { sectionPreview } from "@/lib/textbook/server/sectionPreview";
import { getSection, saveSection } from "@/lib/textbook/server/sections";
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
  tinyPng,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let branchId: string;
let owner: TextbookActor;
let colleague: TextbookActor;
let stranger: TextbookActor;

const figures = new Map<string, Buffer>();
const loadFigure = async (path: string) => figures.get(path) ?? null;
const deps = fakePublishDeps();
const NOW = "2026-10-03T00:00:00.000Z";

/** 굳히기 대역 — 불린 횟수를 센다. `막힘` 이라는 제목의 개념은 굳히지 못한다 */
let freezeCalls = 0;
const freeze = (concept: TextbookConcept): TextbookConcept => {
  freezeCalls += 1;
  if (concept.title === "막힘")
    throw new Error("확인하지 않은 연결이 있습니다.");
  return deps.freezeConcept(concept);
};

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  branchId = await insertBranch(pg);
  owner = await insertTeacher(pg, { branchId, name: "주인" });
  colleague = await insertTeacher(pg, { branchId, name: "동료" });
  stranger = await insertTeacher(pg, { name: "남" });
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

const BODY = {
  goal: "뜻을 말한다",
  prerequisites: [],
  definition: "같은 숫자 배열이 되풀이되는 무한소수",
  conditions: null,
  examples: [],
  counterexamples: [],
  misconceptions: [],
  explainPrompt: null,
};

async function concept(editionId: string, conceptKey: string, title: string) {
  await pg.query(
    `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "body", "blank_items", "links", "mapping_version", "updated_at")
     VALUES ($1, $2, 'u1', $3, '정의', $4::jsonb, '[]'::jsonb, '[]'::jsonb, 'm1', $5)`,
    [editionId, conceptKey, title, JSON.stringify(BODY), sqlNow()],
  );
}

/**
 * 구획 둘인 초안.
 *   s0: 개념 블록(k-first) · 문항 둘(첫째는 스캔 그림)
 *   s1: 그림 블록 · 문항 하나(개념 k-second 를 가리킨다)
 * 어느 구획도 가리키지 않는 개념 k-loose 가 하나 더 있다.
 */
async function draft(options: { blockedConcept?: boolean } = {}) {
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
  await concept(
    editionId,
    "k-first",
    options.blockedConcept ? "막힘" : "첫 개념",
  );
  await concept(editionId, "k-second", "둘째 개념");
  await concept(editionId, "k-loose", "아무도 안 가리키는 개념");

  const imageBytes = tinyPng(30, 20, randomUUID());
  const imageId = sha256(imageBytes);
  await db.transaction(async (tx) => {
    await putAsset(
      tx,
      owner.id,
      {
        assetId: imageId,
        mimeType: "image/png",
        name: "삽화.png",
        widthPx: 30,
        heightPx: 20,
        bytes: imageBytes,
      },
      "image",
    );
    await linkEditionAssets(tx, editionId, owner.id, [imageId]);
  });

  const sectionIds = [randomUUID(), randomUUID()];
  const blocks = [
    [{ blockId: "b-concept", kind: "concept" as const, conceptKey: "k-first" }],
    [
      {
        blockId: "b-image",
        kind: "image" as const,
        assetId: imageId,
        caption: null,
      },
    ],
  ];
  let revision = 0;
  for (const [index, sectionId] of sectionIds.entries())
    revision = (
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
            sectionKey: `s${index}`,
            title: `구획 ${index}`,
            templateKey: "basic",
            startPolicy: "even-left",
            blocks: blocks[index]!,
          },
        },
      )
    ).aggregateRevision;

  const figurePath = `/figures/preview/${randomUUID()}.png`;
  figures.set(figurePath, tinyPng(50, 40, figurePath));
  const problems = [
    await insertBankProblem(pg, world.unitId, {
      content: "첫 구획의 그림 문항",
      figureUrls: [figurePath],
      figureDims: [50, 40],
    }),
    await insertBankProblem(pg, world.unitId, {
      content: "첫 구획의 둘째 문항",
    }),
    await insertBankProblem(pg, world.unitId, { content: "둘째 구획의 문항" }),
  ];
  const first = await captureItems(
    db,
    owner,
    editionId,
    requestKey(owner, "capture"),
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
    owner,
    editionId,
    requestKey(owner, "capture"),
    {
      expectedRevision: first.aggregateRevision,
      sectionId: sectionIds[1]!,
      source: { kind: "problems", problemIds: [problems[2]!.id] },
    },
    loadFigure,
  );
  const linked = await updateItem(
    db,
    owner,
    editionId,
    second.items[0]!.itemId,
    requestKey(owner, "item-update"),
    { expectedRevision: second.aggregateRevision, conceptKeys: ["k-second"] },
  );
  return {
    bookId: book.id,
    editionId,
    sectionIds,
    problems,
    imageId,
    items: [...first.items, ...second.items],
    revision: linked.aggregateRevision,
  };
}

async function publish(target: { editionId: string; revision: number }) {
  const requestId = randomUUID();
  await reservePublish(
    db,
    owner,
    target.editionId,
    { requestId, expectedRevision: target.revision },
    fakeHash(requestId),
    deps,
  );
  let job = await runNextStep(db, owner, target.editionId, requestId, deps);
  for (let guard = 0; guard < 20 && job.status !== "ready"; guard++)
    job = await runNextStep(db, owner, target.editionId, requestId, deps);
  await finalizePublish(db, owner, target.editionId, requestId, deps);
}

/** 판본 전체를 조립한 것에서 그 구획의 것만 고른다 — 미리보기는 이것과 같아야 한다 */
function pick(full: TextbookExchange, sectionKey: string) {
  const items = full.items.filter((item) => item.sectionKey === sectionKey);
  const snapshotIds = new Set(items.map((item) => item.snapshotId));
  return {
    items,
    snapshots: full.snapshots.filter((snapshot) =>
      snapshotIds.has(snapshot.snapshotId),
    ),
    section: full.units[0]!.sections.find(
      (section) => section.sectionKey === sectionKey,
    ),
  };
}

const counts = async (editionId: string) =>
  (
    await pg.query<{ revision: number; qr: number; frozen: number }>(
      `SELECT e."revision",
              (SELECT count(*)::int FROM "textbook_qr_target" q WHERE q."edition_id" = e."id") AS qr,
              (SELECT count(*)::int FROM "textbook_concept" c WHERE c."edition_id" = e."id" AND c."frozen" IS NOT NULL) AS frozen
         FROM "textbook_edition" e WHERE e."id" = $1`,
      [editionId],
    )
  ).rows[0]!;

describe("구획 미리보기", () => {
  it("그 구획과 그 구획이 가리키는 것만 싣는다 — 값은 판본 전체를 조립한 것과 같다", async () => {
    const made = await draft();
    const full = await assembleExchange(db, made.editionId, {
      exportedAt: NOW,
      qrStates: ["reserved", "active"],
    });
    for (const [index, sectionId] of made.sectionIds.entries()) {
      const preview = await sectionPreview(
        db,
        owner,
        made.editionId,
        sectionId,
        freeze,
        NOW,
      );
      expect(() => textbookSectionPreviewSchema.parse(preview)).not.toThrow();
      const expected = pick(full, `s${index}`);
      expect(preview.exchange.units).toHaveLength(1);
      expect(preview.exchange.units[0]!.sections).toEqual([expected.section]);
      expect(preview.exchange.items).toEqual(expected.items);
      expect(preview.exchange.snapshots).toEqual(expected.snapshots);
      expect(preview).toMatchObject({
        kind: "section-preview",
        editionId: made.editionId,
        sectionId,
        aggregateRevision: made.revision,
        manifestVerified: false,
      });
    }
    const [first, second] = await Promise.all(
      made.sectionIds.map((sectionId) =>
        sectionPreview(db, owner, made.editionId, sectionId, freeze, NOW),
      ),
    );
    // 차례는 원고 전체에서의 자리 그대로다(둘째 구획의 문항이 0 이 되지 않는다)
    expect(first!.exchange.items.map((item) => item.orderIndex)).toEqual([
      0, 1,
    ]);
    expect(second!.exchange.items.map((item) => item.orderIndex)).toEqual([2]);
    // 자산: 첫 구획은 문항의 스캔 그림만, 둘째 구획은 그림 블록의 삽화만
    const figureId = first!.exchange.snapshots[0]!.payload.figures[0]!.assetId;
    expect(first!.exchange.assets.map((asset) => asset.assetId)).toEqual([
      figureId,
    ]);
    expect(second!.exchange.assets.map((asset) => asset.assetId)).toEqual([
      made.imageId,
    ]);
    // 개념: 블록이 가리키는 것 · 배치가 가리키는 것만. 아무도 안 가리키는 개념은 어느 쪽에도 없다
    const keys = (exchange: TextbookExchange) =>
      (exchange.conceptIntegration?.concepts ?? []).map((c) => c.conceptKey);
    expect(keys(first!.exchange)).toEqual(["k-first"]);
    expect(keys(second!.exchange)).toEqual(["k-second"]);
    // 다른 구획의 문항 내용은 응답 어디에도 없다
    expect(JSON.stringify(first!.exchange)).not.toContain("둘째 구획의 문항");
    expect(JSON.stringify(second!.exchange)).not.toContain("첫 구획의");
  });

  it("실제 굳히기 · 실제 검증기 — 잘라 낸 교환 형식을 검증기가 받아들인다", async () => {
    const made = await draft();
    for (const sectionId of made.sectionIds) {
      // 라우트가 쓰는 굳히기 그대로(대역이 지어낸 해시는 검증기가 받지 않는다)
      const preview = await sectionPreview(
        db,
        owner,
        made.editionId,
        sectionId,
        (concept) => freezeTextbookConcept(concept),
        NOW,
      );
      const issues = await validateTextbookIntegrity(preview.exchange, {
        mode: "draft",
        verifyManifest: false,
      });
      expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
    }
  });

  it("읽기만 한다 — revision 이 오르지 않고 QR · 굳힌 개념이 DB 에 생기지 않는다", async () => {
    const made = await draft({ blockedConcept: true });
    const before = await counts(made.editionId);
    const sectionBefore = await getSection(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
    );
    freezeCalls = 0;
    const preview = await sectionPreview(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
      freeze,
      NOW,
    );
    // 예약한 적이 없으니 QR 이 없다 — 지어내지 않는다
    expect(preview.exchange.qrTargets).toEqual([]);
    expect(
      preview.exchange.items.every((item) => item.qrTargetId === null),
    ).toBe(true);
    // 굳힐 수 없는 개념은 굳지 않은 채로 온다(미리보기를 막지 않는다)
    expect(freezeCalls).toBe(1);
    expect(preview.exchange.conceptIntegration!.concepts).toEqual([
      expect.objectContaining({ conceptKey: "k-first", frozen: null }),
    ]);
    // 굳힐 수 있는 개념은 응답 안에서만 굳힌 모양이다
    const other = await sectionPreview(
      db,
      owner,
      made.editionId,
      made.sectionIds[1]!,
      freeze,
      NOW,
    );
    expect(
      other.exchange.conceptIntegration!.concepts[0]!.frozen,
    ).not.toBeNull();
    expect(await counts(made.editionId)).toEqual({
      ...before,
      qr: 0,
      frozen: 0,
    });
    expect(preview.sectionRevision).toBe(sectionBefore.revision);
    expect(
      (await getSection(db, owner, made.editionId, made.sectionIds[0]!))
        .revision,
    ).toBe(sectionBefore.revision);
  });

  it("예약한 QR 이 있으면 그것을 싣는다(새로 만들지 않는다)", async () => {
    const made = await draft();
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      made.editionId,
      { requestId, expectedRevision: made.revision },
      fakeHash(requestId),
      deps,
    );
    const before = await counts(made.editionId);
    const preview = await sectionPreview(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
      freeze,
      NOW,
    );
    expect(preview.exchange.qrTargets.map((qr) => qr.itemId).sort()).toEqual(
      made.items
        .slice(0, 2)
        .map((item) => item.itemId)
        .sort(),
    );
    expect((await counts(made.editionId)).qr).toBe(before.qr);
  });

  it("남의 초안 · 공유 안 된 발행본 · 다른 판본의 구획 · 없는 구획은 404", async () => {
    const made = await draft();
    const other = await draft();
    const attempt = (
      actor: TextbookActor,
      editionId: string,
      sectionId: string,
    ) => refusal(sectionPreview(db, actor, editionId, sectionId, freeze, NOW));
    expect(
      (await attempt(colleague, made.editionId, made.sectionIds[0]!)).status,
    ).toBe(404);
    expect(
      (await attempt(stranger, made.editionId, made.sectionIds[0]!)).status,
    ).toBe(404);
    // 내 판본이라도 다른 판본의 구획 id 로는 못 읽는다
    expect(
      (await attempt(owner, made.editionId, other.sectionIds[0]!)).status,
    ).toBe(404);
    expect((await attempt(owner, made.editionId, randomUUID())).status).toBe(
      404,
    );

    await publish(made);
    // 발행했지만 공유하지 않았다
    expect(
      (await attempt(colleague, made.editionId, made.sectionIds[0]!)).status,
    ).toBe(404);
    await updateBook(db, owner, made.bookId, requestKey(owner, "book-update"), {
      visibility: "branch",
    });
    const shared = await sectionPreview(
      db,
      colleague,
      made.editionId,
      made.sectionIds[0]!,
      freeze,
      NOW,
    );
    expect(shared.exchange.edition.status).toBe("published");
    expect(
      (await attempt(stranger, made.editionId, made.sectionIds[0]!)).status,
    ).toBe(404);
  });

  it("발행본 — 은행 문항이 바뀌어도 확정본을 내고, 개념은 발행 때 굳힌 그대로다(다시 굳히지 않는다)", async () => {
    const made = await draft();
    await publish(made);
    const stored = await pg.query<{ frozen: unknown }>(
      `SELECT "frozen" FROM "textbook_concept" WHERE "edition_id" = $1 AND "concept_key" = 'k-first'`,
      [made.editionId],
    );
    await pg.query(
      `UPDATE "problem" SET "content" = '은행에서 고친 발문', "updated_at" = $2 WHERE "id" = $1`,
      [made.problems[0]!.id, sqlNow()],
    );
    freezeCalls = 0;
    const preview = await sectionPreview(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
      () => {
        throw new Error("발행본의 개념을 다시 굳히면 안 된다");
      },
      NOW,
    );
    expect(preview.exchange.snapshots[0]!.payload.content).toBe(
      "첫 구획의 그림 문항",
    );
    expect(JSON.stringify(preview.exchange)).not.toContain(
      "은행에서 고친 발문",
    );
    expect(preview.exchange.conceptIntegration!.concepts[0]!.frozen).toEqual(
      stored.rows[0]!.frozen,
    );
    // 쪽 · 켜진 QR 은 그 구획의 것만
    expect(preview.exchange.pageMap.map((page) => page.itemId).sort()).toEqual(
      made.items
        .slice(0, 2)
        .map((item) => item.itemId)
        .sort(),
    );
    expect(preview.exchange.qrTargets).toHaveLength(2);
  });
});
