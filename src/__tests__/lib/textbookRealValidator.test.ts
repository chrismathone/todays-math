// @vitest-environment node
/**
 * 서버가 조립한 교환 형식 ↔ **실제 검증기**(`validateTextbookIntegrity`). 브라우저는 띄우지 않는다.
 *
 * 다른 발행 시험은 검증기를 대역(`validate: async () => []`)으로 둔다 — 그래서 서버가 조립한 원고가 검증기의 규칙에
 * 맞는지는 거기서 한 번도 재지지 않는다. 실제로 그 틈으로 두 가지가 지나갔다(2026-10-03 실제 조판기 통합에서 잡았다):
 *   · `orderIndex` 를 구획 안의 차례로 내어 구획이 둘이면 `ITEM_ORDER` 로 발행이 막혔다
 *   · 사전 검사가 초안 기준이라, 발행 기준에서만 막는 사유(그림과 보기의 짝)가 조판 걸음에서야 드러났다
 * 여기서는 검증기를 그대로 꽂아 그 둘을 잠근다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookActor } from "@/lib/textbook/access";
import { validateForPublish } from "@/lib/textbook/publish/deps.server";
import { preflightEdition } from "@/lib/textbook/publish/preflight";
import type { PublishDeps } from "@/lib/textbook/publish/rendererAdapter";
import { createBook } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { captureItems, placedItems } from "@/lib/textbook/server/items";
import { saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";

import {
  type Db,
  type World,
  openTextbookDb,
  seedWorld,
} from "../helpers/textbookPglite";
import {
  fakePublishDeps,
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

const figures = new Map<string, Buffer>();
const loadFigure = async (path: string) => figures.get(path) ?? null;
/** 조판기는 대역, 검증기는 진짜 */
const deps = (): PublishDeps => ({
  ...fakePublishDeps(),
  validate: validateForPublish,
});

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
}, 120_000);
afterAll(async () => {
  await pg.close();
});

/** 구획 둘 — 문항을 구획마다 담는다(구획 안의 차례는 둘 다 0부터다) */
async function draft(
  problems: Array<Array<Parameters<typeof insertBankProblem>[2]>>,
) {
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
  let revision = 0;
  const itemIds: string[] = [];
  for (const [index, inputs] of problems.entries()) {
    const sectionId = randomUUID();
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
            blocks: [],
          },
        },
      )
    ).aggregateRevision;
    const ids = [];
    for (const input of inputs)
      ids.push((await insertBankProblem(pg, world.unitId, input)).id);
    // 빈 구획은 담지 않고 그대로 둔다
    if (!ids.length) continue;
    const captured = await captureItems(
      db,
      owner,
      editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: revision,
        sectionId,
        source: { kind: "problems", problemIds: ids },
      },
      loadFigure,
    );
    expect(captured.excluded).toEqual([]);
    revision = captured.aggregateRevision;
    itemIds.push(...captured.items.map((item) => item.itemId));
  }
  return { editionId, itemIds };
}

describe("서버가 조립한 원고 ↔ 실제 검증기", () => {
  it("차례는 원고 전체에서 이어진다 — 구획이 둘이어도 0 이 둘이 되지 않는다", async () => {
    const made = await draft([[{}, {}], [{}]]);
    const exchange = await assembleExchange(db, made.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    expect(exchange.items.map((item) => item.orderIndex)).toEqual([0, 1, 2]);
    expect(exchange.items.map((item) => item.itemId)).toEqual(made.itemIds);
    // 표시 번호는 구획 안에서 센 그대로다
    expect(exchange.items.map((item) => item.displayNumber)).toEqual([
      "1",
      "2",
      "1",
    ]);
    // 배치 하나만 읽어도 같은 값이다(응답과 교환 형식이 다르지 않다)
    const [last] = await placedItems(db, made.editionId, [made.itemIds[2]!]);
    expect(last!.orderIndex).toBe(2);
    expect(
      (await placedItems(db, made.editionId)).map((item) => item.orderIndex),
    ).toEqual([0, 1, 2]);
  });

  it("문항만 담은 원고는 실제 검증기의 사전 검사를 지난다", async () => {
    const made = await draft([[{}, {}], [{}]]);
    const preflight = await preflightEdition(db, owner, made.editionId, deps());
    expect(
      preflight.issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
    expect(preflight.canPublish).toBe(true);
  });

  it("사전 검사는 발행 기준으로 본다 — 짝을 모르는 스캔 그림은 조판 전에 알린다", async () => {
    const path = `/figures/validator/${randomUUID()}.png`;
    figures.set(path, tinyPng(40, 30, path));
    // 짝 배열이 비어 있다(은행의 기본값 = «짝을 모른다»)
    const unknown = await draft([
      [{ figureUrls: [path], figureDims: [40, 30] }],
    ]);
    const blocked = await preflightEdition(
      db,
      owner,
      unknown.editionId,
      deps(),
    );
    expect(blocked.canPublish).toBe(false);
    expect(
      blocked.issues.filter((issue) => issue.severity === "error"),
    ).toEqual([expect.objectContaining({ code: "FIGURE_CHOICE_UNKNOWN" })]);

    // 발문의 그림이라고 적혀 있으면(0) 지난다
    const path2 = `/figures/validator/${randomUUID()}.png`;
    figures.set(path2, tinyPng(40, 30, path2));
    const known = await draft([
      [{ figureUrls: [path2], figureDims: [40, 30], choiceFigureIndex: [0] }],
    ]);
    expect(
      (await preflightEdition(db, owner, known.editionId, deps())).canPublish,
    ).toBe(true);
  });

  it("엔진이 그린 인라인 SVG 는 발문의 그림이다 — 짝을 모르는 그림으로 막히지 않는다", async () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0L10 10"/></svg>`;
    const made = await draft([[{ figureSvg: svg }]]);
    const preflight = await preflightEdition(db, owner, made.editionId, deps());
    expect(
      preflight.issues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
  });

  it("빈 구획이 있으면 사전 검사가 막는다(조판 걸음까지 가지 않는다)", async () => {
    const made = await draft([[{}], []]);
    const preflight = await preflightEdition(db, owner, made.editionId, deps());
    expect(preflight.canPublish).toBe(false);
    expect(preflight.issues.map((issue) => issue.code)).toContain(
      "EMPTY_SECTION",
    );
  });
});
