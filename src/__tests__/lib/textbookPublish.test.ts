// @vitest-environment node
/**
 * 발행 — 예약 → 조판 걸음 → 확정. 서버 코드를 PGlite(실제 마이그레이션 사슬) 위에서 그대로 돌린다.
 *
 * 조판기는 결정적인 대역이다(Chromium 을 띄우지 않는다) — 여기서 재는 것은 **서버가 무엇을 믿고 무엇을 다시 확인하는가**다:
 * 걸음의 임대 · 판본이 바뀌었을 때 · 다시 읽은 QR 이 다를 때 · 쪽 계획이 빠졌을 때 · 같은 요청이 다시 올 때.
 * 진짜 조판(쪽 나누기 · PDF · QR 픽셀 해독)은 조판기 쪽 시험과 통합 시험이 잰다.
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookIssue } from "@/contracts/textbookPrimitives.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { contentHash, manifestHash, sha256 } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { preflightEdition } from "@/lib/textbook/publish/preflight";
import type {
  PublishDeps,
  QrReadback,
  RenderedChunk,
} from "@/lib/textbook/publish/rendererAdapter";
import { planChunks, reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { createBook } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { captureItems } from "@/lib/textbook/server/items";
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

const ORIGIN = "https://textbook.todays-math.kr";

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

interface Harness {
  deps: PublishDeps;
  /** 조판기가 받은 것 — 서버가 무엇을 넘겼는지 본다 */
  rendered: Array<{
    variant: string;
    sectionIndices: number[];
    firstPhysicalPageIndex: number;
    exchange: TextbookExchange;
  }>;
  merges: number;
  failNext: number;
  layoutIssues: TextbookIssue[];
  tamperQr: (check: QrReadback) => QrReadback | null;
  skipPageMapFor: string | null;
  validationIssues: TextbookIssue[];
}

function harness(overrides: Partial<PublishDeps> = {}): Harness {
  const h: Harness = {
    rendered: [],
    merges: 0,
    failNext: 0,
    layoutIssues: [],
    tamperQr: (check) => check,
    skipPageMapFor: null,
    validationIssues: [],
    deps: undefined as unknown as PublishDeps,
  };
  h.deps = {
    officialOrigin: ORIGIN,
    now: () => new Date("2026-10-03T03:00:00.000Z"),
    validate: async () => h.validationIssues,
    freezeConcept: (concept) => ({
      ...concept,
      frozen: {
        contentHash: fakeHash(`frozen:${concept.conceptKey}`),
        parserVersion: "p1",
        compositionVersion: "c1",
        mappingVersion: concept.mappingVersion,
        sections: [],
        entries: [],
        selection: [],
        assetHashes: [],
      },
    }),
    renderer: {
      rendererVersion: "fake.renderer.v1",
      templateVersion: "fake.template.v1",
      async renderChunk(input): Promise<RenderedChunk> {
        if (h.failNext > 0) {
          h.failNext -= 1;
          throw new Error("브라우저를 띄우지 못했습니다.");
        }
        h.rendered.push({
          variant: input.variant,
          sectionIndices: input.sectionIndices,
          firstPhysicalPageIndex: input.firstPhysicalPageIndex,
          exchange: input.exchange,
        });
        const flat = input.exchange.units.flatMap((unit) =>
          unit.sections.map((section) => ({
            unitKey: unit.unitKey,
            sectionKey: section.sectionKey,
          })),
        );
        const keys = new Set(
          input.sectionIndices.map(
            (index) => `${flat[index]!.unitKey}/${flat[index]!.sectionKey}`,
          ),
        );
        const items = input.exchange.items.filter((item) =>
          keys.has(`${item.unitKey}/${item.sectionKey}`),
        );
        const qrChecks = items.flatMap((item, index) => {
          const qr = input.exchange.qrTargets.find(
            (target) => target.itemId === item.itemId,
          )!;
          const check = h.tamperQr({
            qrTargetId: qr.qrTargetId,
            url: qr.url,
            decodedUrl: qr.url,
            physicalPageIndex: input.firstPhysicalPageIndex + (index % 2),
          });
          return check ? [check] : [];
        });
        return {
          pdf: Buffer.from(
            `%PDF-fake ${input.variant} ${input.sectionIndices.join(",")} ${randomUUID()}`,
          ),
          pageCount: 2,
          pageMap: items
            .filter((item) => item.itemId !== h.skipPageMapFor)
            .map((item, index) => ({
              itemId: item.itemId,
              physicalPageIndex: input.firstPhysicalPageIndex + (index % 2),
              printedPageLabel: String(
                input.firstPhysicalPageIndex + (index % 2),
              ),
              column: 1 as const,
            })),
          issues: h.layoutIssues,
          qrChecks,
          nextPhysicalPageIndex: input.firstPhysicalPageIndex + 2,
          carry: { qrChecks },
        };
      },
      async mergeChunks(chunks) {
        h.merges += 1;
        return {
          pdf: Buffer.concat(chunks.map((chunk) => Buffer.from(chunk.pdf))),
          pageCount: chunks.reduce((sum, chunk) => sum + chunk.pageCount, 0),
          qrChecks: chunks.flatMap(
            (chunk) => (chunk.carry as { qrChecks: QrReadback[] }).qrChecks,
          ),
        };
      },
    },
    ...overrides,
  };
  return h;
}

/** 구획 둘 · 문항 셋이 놓인 초안 */
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
  const problems = [
    await insertBankProblem(pg, world.unitId, { content: "가" }),
    await insertBankProblem(pg, world.unitId, { content: "나" }),
    await insertBankProblem(pg, world.unitId, { content: "다" }),
  ];
  const noFigures = async () => null;
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
    noFigures,
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
    noFigures,
  );
  return {
    bookId: book.id,
    editionId,
    sectionIds,
    problems,
    items: [...first.items, ...second.items],
    revision: second.aggregateRevision,
  };
}

async function reserve(
  target: { editionId: string; revision: number },
  h: Harness,
  requestId = randomUUID(),
  actor = owner,
) {
  return reservePublish(
    db,
    actor,
    target.editionId,
    { requestId, expectedRevision: target.revision },
    fakeHash(`${requestId}:${target.revision}`),
    h.deps,
  );
}

async function runAll(editionId: string, requestId: string, h: Harness) {
  let job = await runNextStep(db, owner, editionId, requestId, h.deps);
  for (
    let guard = 0;
    guard < 40 &&
    (job.status === "rendering" ||
      job.status === "verifying" ||
      job.status === "reserved");
    guard++
  )
    job = await runNextStep(db, owner, editionId, requestId, h.deps);
  return job;
}

const editionRow = async (editionId: string) =>
  (
    await pg.query<{
      status: string;
      manifest_hash: string | null;
      renderer_version: string;
      revision: number;
    }>(
      `SELECT "status", "manifest_hash", "renderer_version", "revision" FROM "textbook_edition" WHERE "id" = $1`,
      [editionId],
    )
  ).rows[0]!;

describe("구획 묶기", () => {
  it("이어진 구획끼리, 구획 수 · 블록 수 한도 안에서 묶는다", () => {
    const sections = (blocks: number[]) =>
      blocks.map((count, index) => ({ id: `s${index}`, blocks: count }));
    expect(planChunks(sections([1, 1, 1, 1, 1]))).toEqual([
      ["s0", "s1", "s2", "s3"],
      ["s4"],
    ]);
    expect(planChunks(sections([200, 150, 10]))).toEqual([
      ["s0"],
      ["s1", "s2"],
    ]);
    expect(planChunks([])).toEqual([]);
  });
});

describe("사전 검사 · 예약", () => {
  it("정식 주소가 없거나 개발 주소면 발행하지 못한다", async () => {
    const target = await draft();
    for (const origin of [
      null,
      "http://textbook.todays-math.kr",
      "https://localhost:3000",
      "https://preview-abc.vercel.app",
      "https://textbook.todays-math.kr/path",
    ]) {
      const h = harness({ officialOrigin: origin });
      const preflight = await preflightEdition(
        db,
        owner,
        target.editionId,
        h.deps,
      );
      expect(preflight.canPublish, String(origin)).toBe(false);
      expect(preflight.issues.map((entry) => entry.code)).toContain(
        "official-origin",
      );
      const error = await refusal(reserve(target, h));
      expect(error.status).toBe(422);
    }
    const { rows } = await pg.query(
      `SELECT 1 FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [target.editionId],
    );
    expect(rows).toEqual([]);
  });

  it("사전 검사는 읽기만 한다", async () => {
    const target = await draft();
    const before = await editionRow(target.editionId);
    const preflight = await preflightEdition(
      db,
      owner,
      target.editionId,
      harness().deps,
    );
    expect(preflight).toMatchObject({
      canPublish: true,
      revision: target.revision,
      issues: [],
    });
    expect(await editionRow(target.editionId)).toEqual(before);
  });

  it("문제 블록의 차례와 배치의 차례가 다르면 알린다 — 고쳐 주지 않는다", async () => {
    const target = await draft();
    await pg.query(
      `UPDATE "textbook_section" SET "content" = jsonb_set("content", '{blocks}', '[]'::jsonb) WHERE "id" = $1`,
      [target.sectionIds[0]],
    );
    const revision = (await editionRow(target.editionId)).revision;
    const preflight = await preflightEdition(
      db,
      owner,
      target.editionId,
      harness().deps,
    );
    expect(preflight.issues.map((entry) => entry.code)).toContain(
      "item-order-mismatch",
    );
    expect(
      (await refusal(reserve({ ...target, revision }, harness()))).status,
    ).toBe(422);
  });

  it("예약하면 놓인 배치마다 QR 이 예약되고 조판 걸음이 선다. 판본은 초안 그대로다", async () => {
    const target = await draft();
    const h = harness();
    const job = await reserve(target, h);
    expect(job).toMatchObject({
      status: "reserved",
      completedSteps: 0,
      replayed: false,
      manifestHash: null,
      artifacts: [],
    });
    // 구획 둘은 한 걸음에 들어간다: (조판 1 + 합치기 1) × 학생용 · 해설
    expect(job.totalSteps).toBe(4);
    const qr = await pg.query<{ state: string; slug: string; url: string }>(
      `SELECT "state", "slug", "url" FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [target.editionId],
    );
    expect(qr.rows).toHaveLength(3);
    expect(
      qr.rows.every(
        (row) =>
          row.state === "reserved" &&
          row.url === `${ORIGIN}/q/${row.slug}` &&
          /^[0-9a-hjkmnp-tv-z]{20}$/.test(row.slug),
      ),
    ).toBe(true);
    const edition = await editionRow(target.editionId);
    expect(edition.status).toBe("draft");
    expect(edition.renderer_version).toBe("fake.renderer.v1");
    // 조판기 판을 적으면서 집계 revision 이 올랐고, 작업은 **그 뒤의 값**을 조판할 판본으로 적는다
    expect(job.expectedRevision).toBe(edition.revision);
  });

  it("낡은 집계 revision 으로는 예약하지 못한다", async () => {
    const target = await draft();
    const error = await refusal(
      reserve({ ...target, revision: target.revision - 1 }, harness()),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
  });

  it("같은 요청 번호로 다시 오면 있던 작업을 돌려주고 QR · 걸음을 또 만들지 않는다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    const again = await reserve(target, h, requestId);
    expect(again.replayed).toBe(true);
    const qr = await pg.query(
      `SELECT 1 FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [target.editionId],
    );
    expect(qr.rows).toHaveLength(3);
    const steps = await pg.query(
      `SELECT 1 FROM "textbook_publish_step" WHERE "request_id" = $1`,
      [requestId],
    );
    expect(steps.rows).toHaveLength(4);
  });

  it("새 요청 번호로 다시 예약하면 앞의 작업은 그만두고, 예약했던 QR 은 그대로 쓴다", async () => {
    const target = await draft();
    const h = harness();
    const first = randomUUID();
    await reserve(target, h, first);
    const slugs = async () =>
      (
        await pg.query<{ slug: string }>(
          `SELECT "slug" FROM "textbook_qr_target" WHERE "edition_id" = $1 ORDER BY "slug"`,
          [target.editionId],
        )
      ).rows;
    const before = await slugs();
    const revision = (await editionRow(target.editionId)).revision;
    const second = await reserve({ ...target, revision }, h);
    expect(second.status).toBe("reserved");
    expect(await slugs()).toEqual(before);
    const old = await pg.query<{ state: string }>(
      `SELECT "state" FROM "textbook_request" WHERE "request_id" = $1`,
      [first],
    );
    expect(old.rows[0]!.state).toBe("abandoned");
    const stale = await runNextStep(db, owner, target.editionId, first, h.deps);
    expect(stale.status).toBe("failed");
    expect(h.rendered).toEqual([]);
  });

  it("남의 판본은 예약하지 못한다", async () => {
    const target = await draft();
    expect(
      (await refusal(reserve(target, harness(), randomUUID(), other))).status,
    ).toBe(404);
  });
});

describe("조판 걸음", () => {
  it("목차를 전체 예약 뒤 한 번 채우고 최종 조각만 발행한다", async () => {
    const target = await draft();
    const source = await getSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[0],
    );
    const saved = await saveSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[0],
      requestKey(owner, "section-save"),
      {
        expectedRevision: source.revision,
        unitKey: source.unitKey,
        section: {
          ...source.section,
          blocks: [
            {
              blockId: "toc",
              kind: "text",
              markdown: "목차",
              semantic: {
                activity: "tableOfContents",
                node: {
                  kind: "references",
                  entries: [
                    {
                      key: "toc.s1",
                      label: "다음 수업",
                      targetUnitKey: "u1",
                      targetSectionKey: "s1",
                    },
                  ],
                },
              },
            },
            ...source.section.blocks,
          ],
        },
      },
    );
    const h = harness();
    h.deps.renderer.planChunks = () => [[0], [1]];
    const passes: Array<Parameters<PublishDeps["renderer"]["renderChunk"]>[0]> =
      [];
    const render = h.deps.renderer.renderChunk;
    h.deps.renderer.renderChunk = async (input) => {
      passes.push(input);
      return render(input);
    };
    const requestId = randomUUID();
    await reserve(
      { ...target, revision: saved.aggregateRevision },
      h,
      requestId,
    );
    const job = await runAll(target.editionId, requestId, h);
    expect(job.status).toBe("ready");
    expect(passes).toHaveLength(8);
    expect(passes.map((pass) => pass.firstPhysicalPageIndex)).toEqual([
      1, 3, 1, 3, 1, 3, 1, 3,
    ]);
    expect(passes.map((pass) => pass.referenceCarries?.length ?? 0)).toEqual([
      0, 0, 2, 2, 0, 0, 2, 2,
    ]);
    expect(passes[2].reservedCarry).toBeDefined();
    expect(passes[4].studentCarry).toBeDefined();
    const finalized = await finalizePublish(
      db,
      owner,
      target.editionId,
      requestId,
      h.deps,
    );
    expect(finalized.status).toBe("published");
    const result = await assembleExchange(db, target.editionId, {
      exportedAt: h.deps.now().toISOString(),
    });
    expect(result.pageMap).toHaveLength(3);
    const artifacts = await pg.query<{
      kind: string;
      page_count: number;
      parts: unknown[];
    }>(
      `SELECT kind,page_count,parts FROM textbook_artifact WHERE edition_id=$1 AND kind IN ('student-pdf','answer-pdf') ORDER BY kind`,
      [target.editionId],
    );
    expect(artifacts.rows.map((row) => row.page_count)).toEqual([4, 4]);
    expect(artifacts.rows.every((row) => row.parts.length === 2)).toBe(true);
  });
  it("서버가 조립한 교환 형식을 조판기에 넘긴다 — 내용은 확정본이고, 예약한 QR 이 실려 있다", async () => {
    const target = await draft();
    // 담은 뒤에 은행 문항을 고친다 — 조판기는 이것을 보면 안 된다
    await pg.query(
      `UPDATE "problem" SET "content" = '몰래 고친 발문', "updated_at" = $2 WHERE "id" = $1`,
      [target.problems[0]!.id, sqlNow()],
    );
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    const job = await runNextStep(
      db,
      owner,
      target.editionId,
      requestId,
      h.deps,
    );
    expect(job).toMatchObject({ status: "rendering", completedSteps: 1 });
    expect(h.rendered).toHaveLength(1);
    const seen = h.rendered[0]!;
    expect(seen).toMatchObject({
      variant: "student",
      sectionIndices: [0, 1],
      firstPhysicalPageIndex: 1,
    });
    expect(
      seen.exchange.snapshots.map((snapshot) => snapshot.payload.content),
    ).toEqual(["가", "나", "다"]);
    expect(
      seen.exchange.snapshots.every(
        (snapshot) => contentHash(snapshot.payload) === snapshot.contentHash,
      ),
    ).toBe(true);
    expect(seen.exchange.qrTargets).toHaveLength(3);
    expect(seen.exchange.items.every((item) => item.qrTargetId !== null)).toBe(
      true,
    );
  });

  it("차례대로 돈다: 학생용 조판 → 합치기 → 해설 조판 → 합치기. 조각의 바이트는 서버가 넣는다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    const job = await runAll(target.editionId, requestId, h);
    expect(job).toMatchObject({
      status: "ready",
      completedSteps: 4,
      totalSteps: 4,
      issues: [],
    });
    expect(h.rendered.map((entry) => entry.variant)).toEqual([
      "student",
      "answers",
    ]);
    expect(h.merges).toBe(2);
    const steps = await pg.query<{
      kind: string;
      view: string;
      state: string;
      sha256: string;
      page_count: number;
    }>(
      `SELECT "kind", "view", "state", "sha256", "page_count" FROM "textbook_publish_step" WHERE "request_id" = $1 ORDER BY "idx"`,
      [requestId],
    );
    expect(
      steps.rows.map((row) => `${row.view}:${row.kind}:${row.state}`),
    ).toEqual([
      "student:render:done",
      "student:merge:done",
      "answers:render:done",
      "answers:merge:done",
    ]);
    for (const row of steps.rows) {
      const blob = await pg.query<{ bytes: Uint8Array }>(
        `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
        [row.sha256],
      );
      expect(sha256(blob.rows[0]!.bytes)).toBe(row.sha256);
    }
    // 조판만으로는 발행되지 않는다
    expect((await editionRow(target.editionId)).status).toBe("draft");
  });

  it("임대가 살아 있는 걸음은 또 잡지 못한다 — 조판기를 두 번 부르지 않는다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    await pg.query(
      `UPDATE "textbook_publish_step" SET "state" = 'running', "attempts" = 1, "lease_token" = $2,
              "lease_until" = (now() AT TIME ZONE 'UTC') + interval '5 minutes' WHERE "request_id" = $1 AND "idx" = 0`,
      [requestId, randomUUID()],
    );
    const job = await runNextStep(
      db,
      owner,
      target.editionId,
      requestId,
      h.deps,
    );
    expect(job.status).toBe("rendering");
    expect(h.rendered).toEqual([]);
  });

  it("임대가 끝난 걸음은 다시 잡는다. 임대를 잃은 조판의 결과는 적히지 않는다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    await pg.query(
      `UPDATE "textbook_publish_step" SET "state" = 'running', "attempts" = 1, "lease_token" = $2,
              "lease_until" = (now() AT TIME ZONE 'UTC') - interval '1 second' WHERE "request_id" = $1 AND "idx" = 0`,
      [requestId, randomUUID()],
    );
    const job = await runNextStep(
      db,
      owner,
      target.editionId,
      requestId,
      h.deps,
    );
    expect(job.completedSteps).toBe(1);
    const step = await pg.query<{ attempts: number }>(
      `SELECT "attempts" FROM "textbook_publish_step" WHERE "request_id" = $1 AND "idx" = 0`,
      [requestId],
    );
    expect(step.rows[0]!.attempts).toBe(2);
  });

  it("조판이 실패하면 세 번까지 다시 하고, 그 뒤에는 작업을 그만둔다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    h.failNext = 3;
    const attempts = [];
    for (let i = 0; i < 4; i++)
      attempts.push(
        (await runNextStep(db, owner, target.editionId, requestId, h.deps))
          .status,
      );
    expect(attempts.at(-1)).toBe("failed");
    const request = await pg.query<{ state: string }>(
      `SELECT "state" FROM "textbook_request" WHERE "request_id" = $1`,
      [requestId],
    );
    expect(request.rows[0]!.state).toBe("abandoned");
    expect(
      (
        await refusal(
          finalizePublish(db, owner, target.editionId, requestId, h.deps),
        )
      ).status,
    ).toBe(409);
    expect((await editionRow(target.editionId)).status).toBe("draft");
  });

  it("한 번 실패한 뒤 성공하면 이어서 간다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    h.failNext = 1;
    expect(
      (
        await runNextStep(db, owner, target.editionId, requestId, h.deps)
      ).issues.map((entry) => entry.code),
    ).toEqual(["render-failed"]);
    const job = await runAll(target.editionId, requestId, h);
    expect(job).toMatchObject({ status: "ready", issues: [] });
  });

  it("예약 뒤에 원고가 바뀌면 더 조판하지 않고 작업을 그만둔다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    await runNextStep(db, owner, target.editionId, requestId, h.deps);
    const section = await getSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[1]!,
    );
    await saveSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[1]!,
      requestKey(owner, "section-save"),
      {
        expectedRevision: section.revision,
        unitKey: "u1",
        section: { ...section.section, title: "조판 중에 고친 제목" },
      },
    );
    const rendered = h.rendered.length;
    const job = await runNextStep(
      db,
      owner,
      target.editionId,
      requestId,
      h.deps,
    );
    expect(job.status).toBe("failed");
    expect(job.issues.map((entry) => entry.code)).toContain(
      "publish-abandoned",
    );
    expect(h.rendered).toHaveLength(rendered);
    expect(
      (
        await refusal(
          finalizePublish(db, owner, target.editionId, requestId, h.deps),
        )
      ).status,
    ).toBe(409);
  });

  it("조판 진단에 막는 사유가 있으면 확정하지 못한다", async () => {
    const target = await draft();
    const h = harness();
    h.layoutIssues = [
      {
        code: "overflow",
        severity: "error",
        message: "문항이 지면을 넘칩니다.",
        path: ["pages", 2],
      },
    ];
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    const job = await runAll(target.editionId, requestId, h);
    expect(job.status).toBe("failed");
    const error = await refusal(
      finalizePublish(db, owner, target.editionId, requestId, h.deps),
    );
    expect(error.status).toBe(422);
    expect(
      (error.details!.issues as TextbookIssue[]).map((entry) => entry.code),
    ).toContain("overflow");
    expect((await editionRow(target.editionId)).status).toBe("draft");
  });
});

describe("발행 확정", () => {
  async function ready(h: Harness, target?: Awaited<ReturnType<typeof draft>>) {
    const made = target ?? (await draft());
    const requestId = randomUUID();
    await reserve(made, h, requestId);
    const job = await runAll(made.editionId, requestId, h);
    return { ...made, requestId, job };
  }

  it("조판이 끝나기 전에는 확정하지 못한다", async () => {
    const target = await draft();
    const h = harness();
    const requestId = randomUUID();
    await reserve(target, h, requestId);
    await runNextStep(db, owner, target.editionId, requestId, h.deps);
    const error = await refusal(
      finalizePublish(db, owner, target.editionId, requestId, h.deps),
    );
    expect(error.status).toBe(409);
    expect((await editionRow(target.editionId)).status).toBe("draft");
  });

  it("확정하면 쪽 · QR · 산출물이 적히고 판본이 발행된다. manifest 해시는 발행 뒤에 다시 조립해도 같다", async () => {
    const h = harness();
    const made = await ready(h);
    expect(made.job.status).toBe("ready");
    const job = await finalizePublish(
      db,
      owner,
      made.editionId,
      made.requestId,
      h.deps,
    );
    expect(job).toMatchObject({ status: "published", replayed: false });
    expect(job.artifacts.map((artifact) => artifact.kind).sort()).toEqual([
      "answer-pdf",
      "exchange-json",
      "mapping-csv",
      "student-pdf",
      "validation-json",
    ]);
    const edition = await editionRow(made.editionId);
    expect(edition.status).toBe("published");
    expect(job.manifestHash).toBe(edition.manifest_hash);

    const items = await pg.query<{
      physical_page_index: number;
      printed_page_label: string;
      page_column: number;
    }>(
      `SELECT "physical_page_index", "printed_page_label", "page_column" FROM "textbook_item" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    expect(items.rows).toHaveLength(3);
    expect(
      items.rows.every(
        (row) =>
          row.physical_page_index >= 1 &&
          row.printed_page_label &&
          row.page_column === 1,
      ),
    ).toBe(true);
    const qr = await pg.query<{ state: string }>(
      `SELECT "state" FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    expect(qr.rows.map((row) => row.state)).toEqual([
      "active",
      "active",
      "active",
    ]);

    const exported = await assembleExchange(db, made.editionId, {
      exportedAt: "2027-01-01T00:00:00.000Z",
    });
    expect(exported.edition).toMatchObject({
      status: "published",
      manifestHash: edition.manifest_hash,
    });
    expect(exported.pageMap).toHaveLength(3);
    expect(exported.qrTargets).toHaveLength(3);
    expect(manifestHash(exported)).toBe(edition.manifest_hash);

    // 산출물 «exchange-json» 은 발행 때의 교환 형식 그대로다 — 그 바이트의 manifest 도 같은 해시를 낸다
    const artifact = job.artifacts.find(
      (entry) => entry.kind === "exchange-json",
    )!;
    const blob = await pg.query<{ bytes: Uint8Array }>(
      `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
      [artifact.sha256],
    );
    const stored = JSON.parse(
      Buffer.from(blob.rows[0]!.bytes).toString("utf8"),
    ) as TextbookExchange;
    expect(stored.edition).toMatchObject({
      status: "published",
      manifestHash: edition.manifest_hash,
    });
    expect(manifestHash(stored)).toBe(edition.manifest_hash);
    // 학생용 PDF 는 서버가 합친 그 바이트다
    const student = job.artifacts.find(
      (entry) => entry.kind === "student-pdf",
    )!;
    const merged = await pg.query<{ sha256: string }>(
      `SELECT "sha256" FROM "textbook_publish_step" WHERE "request_id" = $1 AND "kind" = 'merge' AND "view" = 'student'`,
      [made.requestId],
    );
    expect(student.sha256).toBe(merged.rows[0]!.sha256);
  });

  it("같은 요청으로 다시 확정하면 그때의 결과를 돌려주고 아무것도 다시 쓰지 않는다", async () => {
    const h = harness();
    const made = await ready(h);
    const first = await finalizePublish(
      db,
      owner,
      made.editionId,
      made.requestId,
      h.deps,
    );
    const before = await editionRow(made.editionId);
    const again = await finalizePublish(
      db,
      owner,
      made.editionId,
      made.requestId,
      h.deps,
    );
    expect(again.replayed).toBe(true);
    expect(again.manifestHash).toBe(first.manifestHash);
    expect(again.artifacts).toEqual(first.artifacts);
    expect(await editionRow(made.editionId)).toEqual(before);
  });

  it("다시 읽은 QR 의 주소가 예약한 주소와 다르면 발행하지 않는다", async () => {
    const h = harness();
    h.tamperQr = (check) => ({
      ...check,
      decodedUrl: "https://evil.example/q/x",
    });
    const made = await ready(h);
    const error = await refusal(
      finalizePublish(db, owner, made.editionId, made.requestId, h.deps),
    );
    expect(error.status).toBe(422);
    expect(
      (error.details!.issues as TextbookIssue[]).map((entry) => entry.code),
    ).toContain("qr-decode-mismatch");
    expect((await editionRow(made.editionId)).status).toBe("draft");
    const qr = await pg.query<{ state: string }>(
      `SELECT DISTINCT "state" FROM "textbook_qr_target" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    expect(qr.rows).toEqual([{ state: "reserved" }]);
  });

  it("지면에서 읽히지 않은 QR 이 하나라도 있으면 발행하지 않는다", async () => {
    const h = harness();
    let dropped = false;
    h.tamperQr = (check) => {
      if (dropped) return check;
      dropped = true;
      return null;
    };
    const made = await ready(h);
    const error = await refusal(
      finalizePublish(db, owner, made.editionId, made.requestId, h.deps),
    );
    expect(
      (error.details!.issues as TextbookIssue[]).map((entry) => entry.code),
    ).toContain("qr-not-printed");
  });

  it("쪽 계획에 빠진 문항이 있으면 발행하지 않는다", async () => {
    const h = harness();
    const target = await draft();
    h.skipPageMapFor = target.items[1]!.itemId;
    const made = await ready(h, target);
    const error = await refusal(
      finalizePublish(db, owner, made.editionId, made.requestId, h.deps),
    );
    expect(
      (error.details!.issues as TextbookIssue[]).map((entry) => entry.code),
    ).toContain("item-not-paged");
    expect((await editionRow(made.editionId)).status).toBe("draft");
  });

  it("검증기가 막으면 발행하지 않는다 (해시 불일치 · 빠진 자산 · 영상 필수 범위의 누락)", async () => {
    const h = harness();
    const made = await ready(h);
    h.validationIssues = [
      {
        code: "CONTENT_HASH",
        severity: "error",
        message: "문항 내용 해시가 실제 원문과 다릅니다.",
        path: ["snapshots", 0],
      },
    ];
    const error = await refusal(
      finalizePublish(db, owner, made.editionId, made.requestId, h.deps),
    );
    expect(error.status).toBe(422);
    expect((await editionRow(made.editionId)).status).toBe("draft");
  });

  it("조판이 끝난 뒤에 원고가 바뀌면 확정이 낡은 revision 을 보고 멈춘다", async () => {
    const h = harness();
    const made = await ready(h);
    const section = await getSection(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
    );
    await saveSection(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
      requestKey(owner, "section-save"),
      {
        expectedRevision: section.revision,
        unitKey: "u1",
        section: { ...section.section, title: "확정 직전에 고친 제목" },
      },
    );
    const error = await refusal(
      finalizePublish(db, owner, made.editionId, made.requestId, h.deps),
    );
    expect(error).toMatchObject({ status: 409, code: "REVISION_MISMATCH" });
    expect((await editionRow(made.editionId)).status).toBe("draft");
    const artifacts = await pg.query(
      `SELECT 1 FROM "textbook_artifact" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    expect(artifacts.rows).toEqual([]);
  });

  it("발행 뒤의 저장은 거절된다", async () => {
    const h = harness();
    const made = await ready(h);
    await finalizePublish(db, owner, made.editionId, made.requestId, h.deps);
    const section = await getSection(
      db,
      owner,
      made.editionId,
      made.sectionIds[0]!,
    );
    const error = await refusal(
      saveSection(
        db,
        owner,
        made.editionId,
        made.sectionIds[0]!,
        requestKey(owner, "section-save"),
        {
          expectedRevision: section.revision,
          unitKey: "u1",
          section: { ...section.section, title: "발행 뒤" },
        },
      ),
    );
    expect(error).toMatchObject({ status: 409, code: "CONFLICT" });
  });

  it("구획 밖으로 나간 배치: QR 을 예약했던 것은 남고 그 QR 은 무효가 된다 · 예약한 적 없는 것은 지워진다", async () => {
    const h = harness();
    const target = await draft();
    // 첫 예약으로 세 배치에 QR 이 생긴다
    await reserve(target, h);
    // 둘째 구획을 비운다 — 그 배치는 구획 밖으로 나가지만 QR 때문에 지워지지 않는다
    const section = await getSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[1]!,
    );
    const saved = await saveSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[1]!,
      requestKey(owner, "section-save"),
      {
        expectedRevision: section.revision,
        unitKey: "u1",
        section: {
          ...section.section,
          blocks: [{ blockId: "t", kind: "text", markdown: "설명" }],
        },
      },
    );
    // QR 을 예약한 적 없는 배치 하나를 구획 밖에 둔다
    const loose = await captureItems(
      db,
      owner,
      target.editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: saved.aggregateRevision,
        sectionId: target.sectionIds[1]!,
        source: { kind: "problems", problemIds: [target.problems[0]!.id] },
      },
      async () => null,
    );
    const again = await getSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[1]!,
    );
    const cleared = await saveSection(
      db,
      owner,
      target.editionId,
      target.sectionIds[1]!,
      requestKey(owner, "section-save"),
      {
        expectedRevision: again.revision,
        unitKey: "u1",
        section: {
          ...again.section,
          blocks: [{ blockId: "t", kind: "text", markdown: "설명" }],
        },
      },
    );
    const made = await ready(h, {
      ...target,
      revision: cleared.aggregateRevision,
    });
    await finalizePublish(db, owner, made.editionId, made.requestId, h.deps);
    const qr = await pg.query<{ state: string }>(
      `SELECT "state" FROM "textbook_qr_target" WHERE "edition_id" = $1 ORDER BY "state"`,
      [made.editionId],
    );
    expect(qr.rows.map((row) => row.state)).toEqual([
      "active",
      "active",
      "void",
    ]);
    const items = await pg.query<{ id: string; section_id: string | null }>(
      `SELECT "id", "section_id" FROM "textbook_item" WHERE "edition_id" = $1`,
      [made.editionId],
    );
    expect(items.rows).toHaveLength(3);
    expect(items.rows.some((row) => row.id === loose.items[0]!.itemId)).toBe(
      false,
    );
    expect(items.rows.filter((row) => row.section_id === null)).toHaveLength(1);
  });

  it("남의 발행 작업은 확정하지 못한다", async () => {
    const h = harness();
    const made = await ready(h);
    expect(
      (
        await refusal(
          finalizePublish(db, other, made.editionId, made.requestId, h.deps),
        )
      ).status,
    ).toBe(404);
    expect((await editionRow(made.editionId)).status).toBe("draft");
  });
});
