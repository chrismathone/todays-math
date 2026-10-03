// @vitest-environment node
/**
 * 발행 산출물 전부 — 학생용 · 해설 PDF, 펼침면 PDF, 단일 HTML, 검수 보고, 교환 JSON, 대응표 CSV, 교환 패키지 ZIP.
 *
 * 조판기는 결정적인 대역이다. 여기서 재는 것은 서버 쪽 차례다:
 *   · 조판기가 할 줄 아는 것만 걸음으로 만든다(없는 산출물을 있다고 적지 않는다)
 *   · 해설판 걸음은 **같은 구획 묶음의 학생용 걸음이 남긴 값**을 받는다(요청 본문이 아니라 걸음 줄에서)
 *   · 펼침면은 서버가 보관한 합친 학생용 바이트로 만들고, 그 파일에서 다시 읽은 QR 도 확정이 본다
 *   · 산출물 줄의 해시는 실제 바이트의 해시다
 *   · 조판기의 묶음 계획이 구획을 빠뜨리면 예약하지 않는다
 */
import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { TextbookExchange } from "@/contracts/textbookExchange.contract";
import type { TextbookActor } from "@/lib/textbook/access";
import { sha256 } from "@/lib/textbook/hash.server";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import type {
  PublishDeps,
  QrReadback,
} from "@/lib/textbook/publish/rendererAdapter";
import { chunksFromPlan, reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { artifactSource } from "@/lib/textbook/server/bytes";
import { createBook } from "@/lib/textbook/server/books";
import {
  getEditionDetail,
  saveStructure,
} from "@/lib/textbook/server/editions";
import { TextbookError } from "@/lib/textbook/server/errors";
import { captureItems } from "@/lib/textbook/server/items";
import { saveSection } from "@/lib/textbook/server/sections";
import type { TextbookDb } from "@/lib/textbook/server/sql";

import {
  type Db,
  type World,
  fakeHash,
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
} from "../helpers/textbookServerWorld";

let pg: Db;
let db: TextbookDb;
let world: World;
let owner: TextbookActor;

beforeAll(async () => {
  pg = await openTextbookDb();
  db = pgliteTextbookDb(pg);
  world = await seedWorld(pg);
  owner = await insertTeacher(pg, { name: "주인" });
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

/** 구획 셋(가운데 것은 문항이 없다) · 문항 둘이 놓인 초안 */
async function draft() {
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
  const sectionIds = [randomUUID(), randomUUID(), randomUUID()];
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
            blocks: [],
          },
        },
      )
    ).aggregateRevision;
  const items = [];
  for (const sectionId of [sectionIds[0]!, sectionIds[2]!]) {
    const problem = await insertBankProblem(pg, world.unitId);
    const captured = await captureItems(
      db,
      owner,
      editionId,
      requestKey(owner, "capture"),
      {
        expectedRevision: revision,
        sectionId,
        source: { kind: "problems", problemIds: [problem.id] },
      },
      async () => null,
    );
    revision = captured.aggregateRevision;
    items.push(...captured.items);
  }
  return { editionId, sectionIds, items, revision };
}

interface Seen {
  renders: Array<{
    variant: string;
    sectionIndices: number[];
    studentCarry: unknown;
    carry: unknown;
  }>;
  spread: Array<{
    pdf: Uint8Array;
    pageCount: number;
    firstPhysicalPageIndex: number;
  }>;
  offline: Array<{ chunkCarries: unknown[] }>;
  packaged: Array<{
    exchange: TextbookExchange;
    validation: unknown;
    assetIds: string[];
  }>;
  tamperSpread: (check: QrReadback) => QrReadback;
}

/** 대역 조판기에 펼침면 · 단일 HTML · 묶음 계획 · 패키지를 붙인다 */
function fullDeps(plan?: (exchange: TextbookExchange) => number[][]): {
  deps: PublishDeps;
  seen: Seen;
} {
  const base = fakePublishDeps();
  const seen: Seen = {
    renders: [],
    spread: [],
    offline: [],
    packaged: [],
    tamperSpread: (check) => check,
  };
  const deps: PublishDeps = {
    ...base,
    renderer: {
      ...base.renderer,
      ...(plan ? { planChunks: plan } : {}),
      async renderChunk(input) {
        const rendered = await base.renderer.renderChunk(input);
        seen.renders.push({
          variant: input.variant,
          sectionIndices: input.sectionIndices,
          studentCarry: input.studentCarry,
          carry: rendered.carry,
        });
        return rendered;
      },
      async mergeChunks(chunks, maxBytes) {
        const merged = await base.renderer.mergeChunks(chunks, maxBytes);
        return { ...merged, carry: { qrChecks: merged.qrChecks } };
      },
      async spread(merged, firstPhysicalPageIndex) {
        seen.spread.push({
          pdf: merged.pdf,
          pageCount: merged.pageCount,
          firstPhysicalPageIndex,
        });
        return {
          pdf: Buffer.concat([
            Buffer.from("%PDF-spread "),
            Buffer.from(merged.pdf),
          ]),
          pageCount: Math.ceil(merged.pageCount / 2),
          qrChecks: (merged.carry as { qrChecks: QrReadback[] }).qrChecks.map(
            seen.tamperSpread,
          ),
        };
      },
      async offlineHtml(input) {
        seen.offline.push({ chunkCarries: input.chunkCarries });
        return Buffer.from(
          `<!doctype html><title>${input.exchange.config.title}</title>`,
        );
      },
    },
    async packageArchive(exchange, readAsset, validation) {
      const assetIds = [];
      for (const asset of exchange.assets) {
        await readAsset(asset.assetId);
        assetIds.push(asset.assetId);
      }
      seen.packaged.push({ exchange, validation, assetIds });
      return Buffer.from(`PK-fake ${exchange.edition.manifestHash}`);
    },
  };
  return { deps, seen };
}

async function reserveAndRun(
  target: { editionId: string; revision: number },
  deps: PublishDeps,
) {
  const requestId = randomUUID();
  const reserved = await reservePublish(
    db,
    owner,
    target.editionId,
    { requestId, expectedRevision: target.revision },
    fakeHash(requestId),
    deps,
  );
  let job = reserved;
  for (
    let guard = 0;
    guard < 40 && ["reserved", "rendering", "verifying"].includes(job.status);
    guard++
  )
    job = await runNextStep(db, owner, target.editionId, requestId, deps);
  return { requestId, reserved, job };
}

const stepsOf = async (requestId: string) =>
  (
    await pg.query<{
      idx: number;
      kind: string;
      view: string;
      state: string;
      section_ids: string[];
    }>(
      `SELECT "idx", "kind", "view", "state", "section_ids" FROM "textbook_publish_step" WHERE "request_id" = $1 ORDER BY "idx"`,
      [requestId],
    )
  ).rows;

describe("산출물 여덟 가지", () => {
  it("조판기가 할 줄 아는 것만 걸음으로 만든다 — 대역 조판기(펼침면 · HTML 없음)는 걸음 넷, 산출물 다섯", async () => {
    const target = await draft();
    const deps = fakePublishDeps();
    const { requestId, reserved, job } = await reserveAndRun(target, deps);
    expect(reserved.totalSteps).toBe(4);
    expect(job.status).toBe("ready");
    const done = await finalizePublish(
      db,
      owner,
      target.editionId,
      requestId,
      deps,
    );
    // 꾸리는 함수가 없으면 ZIP 줄도 없다
    expect(done.artifacts.map((artifact) => artifact.kind).sort()).toEqual([
      "answer-pdf",
      "exchange-json",
      "mapping-csv",
      "student-pdf",
      "validation-json",
    ]);
  });

  it("펼침면 · 단일 HTML · 대응표 · 패키지까지 — 줄마다 실제 바이트의 해시가 적힌다", async () => {
    const target = await draft();
    const { deps, seen } = fullDeps((exchange) =>
      exchange.units
        .flatMap((unit) => unit.sections)
        .map((_, index) => [index]),
    );
    const { requestId, reserved, job } = await reserveAndRun(target, deps);
    // 구획 셋을 하나씩: (조판 3 + 합치기 1) × 2 + 펼침면 + HTML
    expect(reserved.totalSteps).toBe(10);
    expect(
      (await stepsOf(requestId)).map((step) => `${step.kind}:${step.view}`),
    ).toEqual([
      "render:student",
      "render:student",
      "render:student",
      "merge:student",
      "render:answers",
      "render:answers",
      "render:answers",
      "merge:answers",
      "spread:student",
      "offline:student",
    ]);
    expect(job).toMatchObject({ status: "ready", completedSteps: 10 });

    // 해설판 걸음은 같은 구획 묶음의 학생용 걸음이 남긴 값을 받는다
    const student = seen.renders.filter(
      (render) => render.variant === "student",
    );
    const answers = seen.renders.filter(
      (render) => render.variant === "answers",
    );
    expect(student.every((render) => render.studentCarry === undefined)).toBe(
      true,
    );
    expect(answers.map((render) => render.sectionIndices)).toEqual([
      [0],
      [1],
      [2],
    ]);
    for (const render of answers) {
      const twin = student.find(
        (entry) => entry.sectionIndices[0] === render.sectionIndices[0],
      )!;
      expect(render.studentCarry).toEqual(
        JSON.parse(JSON.stringify(twin.carry)),
      );
    }
    // 펼침면은 서버가 보관한 합친 학생용 바이트로 만든다. 단일 HTML 은 학생용 조각 전부의 값을 차례대로 받는다
    expect(seen.spread).toHaveLength(1);
    expect(seen.spread[0]!.pageCount).toBe(6);
    expect(Buffer.from(seen.spread[0]!.pdf).toString()).toContain(
      "%PDF-fake student 0",
    );
    expect(seen.offline[0]!.chunkCarries).toEqual(
      student.map((render) => JSON.parse(JSON.stringify(render.carry))),
    );

    const done = await finalizePublish(
      db,
      owner,
      target.editionId,
      requestId,
      deps,
    );
    expect(done.status).toBe("published");
    expect(done.artifacts.map((artifact) => artifact.kind).sort()).toEqual([
      "answer-pdf",
      "exchange-json",
      "exchange-zip",
      "mapping-csv",
      "offline-html",
      "spread-pdf",
      "student-pdf",
      "validation-json",
    ]);
    const bytesOf = new Map<string, Buffer>();
    for (const artifact of done.artifacts) {
      const source = await artifactSource(
        db,
        owner,
        target.editionId,
        artifact.id,
      );
      const stored = await pg.query<{ bytes: Uint8Array }>(
        `SELECT "bytes" FROM "textbook_blob" WHERE "sha256" = $1`,
        [source.sha256],
      );
      const bytes = Buffer.from(stored.rows[0]!.bytes);
      expect(sha256(bytes)).toBe(artifact.sha256);
      expect(bytes.length).toBe(artifact.byteLength);
      bytesOf.set(artifact.kind, bytes);
    }
    expect(
      done.artifacts.find((artifact) => artifact.kind === "spread-pdf")!
        .pageCount,
    ).toBe(3);
    expect(
      done.artifacts.find((artifact) => artifact.kind === "offline-html")!
        .mimeType,
    ).toBe("text/html; charset=utf-8");
    expect(bytesOf.get("spread-pdf")!.toString()).toContain("%PDF-spread ");
    expect(bytesOf.get("offline-html")!.toString()).toContain(
      "<!doctype html>",
    );
    // 대응표에는 놓인 문항이 전부, 방금 적은 쪽과 함께 있다
    const csv = bytesOf.get("mapping-csv")!.toString();
    for (const item of target.items) expect(csv).toContain(item.itemId);
    expect(csv.split("\n").filter((line) => line.trim()).length).toBe(
      1 + target.items.length,
    );
    // 패키지는 **발행본**으로 꾸린다 — 발행 상태 · manifest 해시 · 쪽 계획이 들어 있다
    expect(seen.packaged).toHaveLength(1);
    expect(seen.packaged[0]!.exchange.edition).toMatchObject({
      status: "published",
      manifestHash: done.manifestHash,
    });
    expect(seen.packaged[0]!.exchange.pageMap).toHaveLength(
      target.items.length,
    );
    expect(seen.packaged[0]!.validation).toMatchObject({ requestId });
    expect(bytesOf.get("exchange-zip")!.toString()).toBe(
      `PK-fake ${done.manifestHash}`,
    );
  });

  it("펼침면에서 다시 읽은 QR 이 예약한 주소와 다르면 확정하지 않는다", async () => {
    const target = await draft();
    const { deps, seen } = fullDeps();
    seen.tamperSpread = (check) => ({ ...check, decodedUrl: `${check.url}x` });
    const { requestId, job } = await reserveAndRun(target, deps);
    expect(job.status).toBe("ready");
    const error = await refusal(
      finalizePublish(db, owner, target.editionId, requestId, deps),
    );
    expect(error.status).toBe(422);
    expect(JSON.stringify(error.details)).toContain("qr-decode-mismatch");
    const edition = await pg.query<{ status: string }>(
      `SELECT "status" FROM "textbook_edition" WHERE "id" = $1`,
      [target.editionId],
    );
    expect(edition.rows[0]!.status).toBe("draft");
    expect(
      (
        await pg.query(
          `SELECT 1 FROM "textbook_artifact" WHERE "edition_id" = $1`,
          [target.editionId],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("펼침면이 QR 을 하나 빠뜨려도 확정하지 않는다", async () => {
    const target = await draft();
    const { deps } = fullDeps();
    const spread = deps.renderer.spread!;
    deps.renderer.spread = async (merged, first) => {
      const made = await spread(merged, first);
      return { ...made, qrChecks: made.qrChecks.slice(1) };
    };
    const { requestId } = await reserveAndRun(target, deps);
    const error = await refusal(
      finalizePublish(db, owner, target.editionId, requestId, deps),
    );
    expect(JSON.stringify(error.details)).toContain("qr-not-printed");
  });

  it("해설판은 QR 을 안 찍어도 되지만, 찍었으면 예약한 주소로 읽혀야 한다", async () => {
    const quiet = await draft();
    const base = fullDeps();
    const merge = base.deps.renderer.mergeChunks;
    let tamper: ((check: QrReadback) => QrReadback) | null = null;
    let merges = 0;
    base.deps.renderer.mergeChunks = async (chunks, maxBytes) => {
      const merged = await merge(chunks, maxBytes);
      merges += 1;
      // 둘째 합치기가 해설판이다
      if (merges % 2 === 1) return merged;
      return { ...merged, qrChecks: tamper ? merged.qrChecks.map(tamper) : [] };
    };
    const first = await reserveAndRun(quiet, base.deps);
    expect(
      (
        await finalizePublish(
          db,
          owner,
          quiet.editionId,
          first.requestId,
          base.deps,
        )
      ).status,
    ).toBe("published");

    const loud = await draft();
    tamper = (check) => ({
      ...check,
      decodedUrl: "https://elsewhere.example/q/aaaaaaaaaaaaaaaaaaaa",
    });
    const second = await reserveAndRun(loud, base.deps);
    const error = await refusal(
      finalizePublish(db, owner, loud.editionId, second.requestId, base.deps),
    );
    expect(JSON.stringify(error.details)).toContain("qr-decode-mismatch");
  });
});

describe("조판기의 묶음 계획", () => {
  it("계획대로 걸음을 만든다 — 구획 묶음은 계획의 자리 그대로다", async () => {
    const target = await draft();
    const { deps } = fullDeps(() => [[0, 1], [2]]);
    const { requestId } = await reserveAndRun(target, deps);
    const renders = (await stepsOf(requestId)).filter(
      (step) => step.kind === "render" && step.view === "student",
    );
    expect(renders.map((step) => step.section_ids)).toEqual([
      [target.sectionIds[0], target.sectionIds[1]],
      [target.sectionIds[2]],
    ]);
  });

  it.each([
    ["구획을 빠뜨린 계획", [[0], [1]]],
    [
      "구획을 두 번 넣은 계획",
      [
        [0, 1],
        [1, 2],
      ],
    ],
    ["차례가 뒤집힌 계획", [[1, 0], [2]]],
    ["빈 묶음이 든 계획", [[0, 1, 2], []]],
  ])("%s 으로는 예약하지 않는다", async (_name, plan) => {
    const target = await draft();
    const { deps } = fullDeps(() => plan);
    const requestId = randomUUID();
    const error = await refusal(
      reservePublish(
        db,
        owner,
        target.editionId,
        { requestId, expectedRevision: target.revision },
        fakeHash(requestId),
        deps,
      ),
    );
    expect(error.status).toBe(500);
    expect(
      (
        await pg.query(
          `SELECT 1 FROM "textbook_request" WHERE "request_id" = $1`,
          [requestId],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query(
          `SELECT 1 FROM "textbook_qr_target" WHERE "edition_id" = $1`,
          [target.editionId],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("조판기가 묶지 못하는 원고면 사유와 함께 422 — 작업 · QR 을 만들지 않는다", async () => {
    const target = await draft();
    const { deps } = fullDeps(() => {
      throw new Error("CHUNK_CONTINUATION");
    });
    const requestId = randomUUID();
    const error = await refusal(
      reservePublish(
        db,
        owner,
        target.editionId,
        { requestId, expectedRevision: target.revision },
        fakeHash(requestId),
        deps,
      ),
    );
    expect(error.status).toBe(422);
    expect(JSON.stringify(error.details)).toContain("chunk-plan-failed");
    expect(
      (
        await pg.query(
          `SELECT 1 FROM "textbook_qr_target" WHERE "edition_id" = $1`,
          [target.editionId],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("chunksFromPlan — 자리를 구획 id 로", () => {
    expect(chunksFromPlan([[0, 1], [2]], ["a", "b", "c"])).toEqual([
      ["a", "b"],
      ["c"],
    ]);
    expect(() => chunksFromPlan([[0, 1]], ["a", "b", "c"])).toThrow(
      TextbookError,
    );
  });
});
