// @vitest-environment node
/**
 * 개념의 «고른 백지 형식»(`blank_forms`)은 판본을 건너갈 때도 **그대로** 간다 — 고른 것은 고른 대로, 고르지 않은 것은 고르지 않은 채로.
 *
 * 2026-10-03 실제 API 검수에서 찾은 것: 발행본에서 새 판본을 만들면 개념 줄을 복사하는 문장이 `blank_forms` 를 빠뜨려,
 * [용어 · 빈칸]을 고른 개념이 새 초안에서는 «고르지 않음»이 됐다. 그 판본을 발행하면 다른 백지가 굳는다.
 * 그때까지의 시험이 못 본 까닭 — 복사 뒤의 형식을 견주는 시험이 없었다. 여기서는 **기본값과 다른 고른 값**([recall] 하나)으로 잰다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookActor } from "@/lib/textbook/access";
import { sha256 } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { completeUpload, putUploadChunk } from "@/lib/textbook/server/blobs";
import { createBook, createEdition } from "@/lib/textbook/server/books";
import { listConcepts } from "@/lib/textbook/server/conceptRows";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { importPackage } from "@/lib/textbook/server/imports";
import { captureItems, updateItem } from "@/lib/textbook/server/items";
import { saveSection } from "@/lib/textbook/server/sections";
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
  insertTeacher,
  pgliteTextbookDb,
  requestKey,
  sampleConfig,
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let owner: TextbookActor;
let other: TextbookActor;
const deps = fakePublishDeps();

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
  other = await insertTeacher(pg, { name: "받는 사람" });
}, 120_000);
afterAll(async () => {
  await pg.close();
});

const BODY = JSON.stringify({
  goal: "뜻을 말한다",
  prerequisites: [],
  definition: "같은 숫자 배열이 되풀이되는 무한소수",
  conditions: null,
  examples: [],
  counterexamples: [],
  misconceptions: [],
  explainPrompt: null,
});

/**
 * 개념 둘이 든 책 — `k-chosen` 은 형식을 [recall] 하나만 골랐고, `k-unset` 은 고르지 않았다(NULL).
 * 둘 다 배치가 가리킨다(발행할 때 지워지지 않게).
 */
async function book(options: { publish: boolean }) {
  const { book: made } = await createBook(
    db,
    owner,
    requestKey(owner, "book-create"),
    { config: sampleConfig() },
  );
  const editionId = made.draftEditionId!;
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
  const sectionId = randomUUID();
  const section = await saveSection(
    db,
    owner,
    editionId,
    sectionId,
    requestKey(owner, "section-save"),
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
  const problem = await insertBankProblem(pg, world.unitId);
  const captured = await captureItems(
    db,
    owner,
    editionId,
    requestKey(owner, "capture"),
    {
      expectedRevision: section.aggregateRevision,
      sectionId,
      source: { kind: "problems", problemIds: [problem.id] },
    },
    async () => null,
  );
  for (const [conceptKey, forms] of [
    ["k-chosen", JSON.stringify(["recall"])],
    ["k-unset", null],
  ] as const)
    await pg.query(
      `INSERT INTO "textbook_concept" ("edition_id", "concept_key", "unit_key", "title", "kind", "body", "blank_items", "blank_forms", "links", "mapping_version", "updated_at")
       VALUES ($1, $2, 'u1', $2, '정의', $3::jsonb, '[]'::jsonb, $4::jsonb, '[]'::jsonb, 'm1', $5)`,
      [editionId, conceptKey, BODY, forms, sqlNow()],
    );
  let revision = (await getEditionDetail(db, owner, editionId)).edition
    .revision;
  revision = (
    await updateItem(
      db,
      owner,
      editionId,
      captured.items[0]!.itemId,
      requestKey(owner, "item-update"),
      { expectedRevision: revision, conceptKeys: ["k-chosen", "k-unset"] },
    )
  ).aggregateRevision;
  if (options.publish) {
    const requestId = randomUUID();
    await reservePublish(
      db,
      owner,
      editionId,
      { requestId, expectedRevision: revision },
      fakeHash(requestId),
      deps,
    );
    let job = await runNextStep(db, owner, editionId, requestId, deps);
    for (let guard = 0; guard < 20 && job.status !== "ready"; guard++)
      job = await runNextStep(db, owner, editionId, requestId, deps);
    await finalizePublish(db, owner, editionId, requestId, deps);
  }
  return { bookId: made.id, editionId };
}

/** 판본의 개념 → 고른 형식(고르지 않았으면 «없음») */
async function formsOf(actor: TextbookActor, editionId: string) {
  const records = await listConcepts(db, actor, editionId);
  return Object.fromEntries(
    records.map((record) => [
      record.concept.conceptKey,
      "blankForms" in record.concept ? record.concept.blankForms : "없음",
    ]),
  );
}

const stored = async (editionId: string) =>
  (
    await pg.query<{ concept_key: string; blank_forms: string[] | null }>(
      `SELECT "concept_key", "blank_forms" FROM "textbook_concept" WHERE "edition_id" = $1 ORDER BY "concept_key"`,
      [editionId],
    )
  ).rows;

describe("고른 백지 형식은 판본을 건너가도 그대로다", () => {
  it("발행본에서 새 판본을 만들면 고른 형식은 그대로, 고르지 않은 것은 고르지 않은 채로 온다", async () => {
    const source = await book({ publish: true });
    const { edition } = await createEdition(
      db,
      owner,
      source.bookId,
      requestKey(owner, "edition-create"),
      { sourceEditionId: source.editionId, label: "2판" },
    );
    const next = edition.edition.editionId;
    expect(next).not.toBe(source.editionId);
    expect(await stored(next)).toEqual([
      { concept_key: "k-chosen", blank_forms: ["recall"] },
      { concept_key: "k-unset", blank_forms: null },
    ]);
    // 읽는 쪽도 같다 — 없는 칸을 기본값으로 채워 내지 않는다
    expect(await formsOf(owner, next)).toEqual({
      "k-chosen": ["recall"],
      "k-unset": "없음",
    });
    // 발행본은 그대로다
    expect(await stored(source.editionId)).toEqual([
      { concept_key: "k-chosen", blank_forms: ["recall"] },
      { concept_key: "k-unset", blank_forms: null },
    ]);
  });

  it("패키지로 복사해 가도 같다", async () => {
    const source = await book({ publish: false });
    const exchange = await assembleExchange(db, source.editionId, {
      exportedAt: "2026-10-03T00:00:00.000Z",
    });
    const zip = Buffer.from(`PK-${randomUUID()}`);
    await putUploadChunk(db, other, sha256(zip), 0, zip);
    const upload = await completeUpload(db, other, sha256(zip), {
      byteLength: zip.length,
    });
    const copied = await importPackage(
      db,
      other,
      requestKey(other, "import"),
      { mode: "copy", uploadId: upload.uploadId, expectedSha256: sha256(zip) },
      async () => ({ exchange, files: new Map(), validation: {} }),
      async () => null,
    );
    expect(await stored(copied.editionId!)).toEqual([
      { concept_key: "k-chosen", blank_forms: ["recall"] },
      { concept_key: "k-unset", blank_forms: null },
    ]);
  });
});
