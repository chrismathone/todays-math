// @vitest-environment node
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextbookActor } from "@/lib/textbook/access";
import type { TextbookDb } from "@/lib/textbook/server/sql";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/errorLog/withErrorLog", () => ({
  withErrorLog: (_name: string, handler: unknown) => handler,
}));
const gate = vi.hoisted(() => ({
  actor: null as TextbookActor | null,
  db: null as TextbookDb | null,
  failAsset: false,
  assetReads: 0,
  bundledAssets: false,
}));
vi.mock("@/lib/textbook/server/authorize", () => ({
  textbookHeaders: {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  },
  authorizeTextbook: async () => ({ actor: gate.actor, response: null }),
}));
vi.mock("@/lib/textbook/server/prismaSql", () => ({
  get textbookDb() {
    return gate.db;
  },
}));
vi.mock("@/lib/textbook/server/visualLibrary", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/lib/textbook/server/visualLibrary")
    >();
  return {
    ...actual,
    freezeTextbookVisualLibrary: (
      tx: Parameters<typeof actual.freezeTextbookVisualLibrary>[0],
      input: Parameters<typeof actual.freezeTextbookVisualLibrary>[1],
    ) =>
      actual.freezeTextbookVisualLibrary(
        tx,
        input,
        gate.bundledAssets
          ? undefined
          : async (src) => {
              gate.assetReads++;
              if (gate.failAsset) throw new Error("missing visual asset");
              return tinyPng(256, 256, src);
            },
      ),
  };
});
import { GET, POST } from "@/app/api/textbook/quick-create/route";
import {
  DEFAULT_QUICK_CREATE_COMPONENTS,
  quickCreateResultSchema,
} from "@/contracts/textbookQuickCreate.contract";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { validateTextbookIntegrity } from "@/lib/textbook/integrity.server";
import { conceptScriptFor } from "@/lib/textbook/conceptScripts";
import { chooseRestStory } from "@/lib/textbook/restStories";
import { openTextbookDb, type Db } from "../helpers/textbookPglite";
import {
  insertTeacher,
  pgliteTextbookDb,
  tinyPng,
} from "../helpers/textbookServerWorld";
let pg: Db, unitId: string;
const seed = CURRICULUM_UNITS.find((u) => u.grade === "초3")!;
const cast = {
  teacherId: "teacher-m3",
  student1Id: "student-f5",
  student2Id: "student-m4",
};
const body = () => ({
  requestId: randomUUID(),
  schoolLevel: "elementary",
  grade: 3,
  semester: 1,
  startUnitId: unitId,
  endUnitId: unitId,
  difficulty: "standard",
  problemCountPerUnit: 2,
  includeConcepts: true,
  components: {
    ...DEFAULT_QUICK_CREATE_COMPONENTS,
    practice: false,
    rest: true,
  },
  cast,
});
const request = (input: ReturnType<typeof body>) =>
  new Request("https://today.test/api/textbook/quick-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
beforeAll(async () => {
  pg = await openTextbookDb();
  gate.db = pgliteTextbookDb(pg);
  gate.actor = await insertTeacher(pg);
  unitId = randomUUID();
  await pg.query(
    `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,'J31001')`,
    [unitId, seed.grade, seed.chapter, seed.section, seed.orderIndex],
  );
}, 120_000);
afterAll(async () => {
  await pg.close();
});
describe("quick create prepared script and frozen visual integration", () => {
  it("GET scopes a live DB unit; POST uses the actual prepared script and immutable asset helper", async () => {
    const catalog = await GET(
      new Request(
        "https://today.test/api/textbook/quick-create?schoolLevel=elementary&grade=3&semester=1",
      ),
    );
    expect(await catalog.json()).toMatchObject({
      units: [{ id: unitId, problemCount: 0 }],
    });
    const input = body();
    const response = await POST(request(input));
    expect(response.status).toBe(201);
    const result = quickCreateResultSchema.parse(await response.json());
    expect(result.problemCount).toBe(0);
    expect(result.conceptCount).toBe(1);
    const exchange = await assembleExchange(
      gate.db!,
      result.book.draftEditionId!,
      { exportedAt: new Date().toISOString() },
    );
    const script = conceptScriptFor(
      `${seed.grade}::${seed.chapter}::${seed.section}`,
    )!;
    const turns = exchange.units.flatMap((u) =>
      u.sections.flatMap((s) =>
        s.blocks.flatMap((b) => (b.kind === "dialogue" ? b.turns : [])),
      ),
    );
    expect(turns.map((t) => t.markdown)).toEqual(
      script.dialogue.map((t) => t.markdown),
    );
    expect(
      turns.every(
        (t) =>
          t.speakerId.startsWith("tb-portrait-") &&
          exchange.assets.some((a) => a.assetId === t.portraitAssetId),
      ),
    ).toBe(true);
    expect(turns.some((t) => t.speakerId === "tb-portrait-teacher-m3")).toBe(
      true,
    );
    const rest = exchange.units
      .flatMap((u) => u.sections)
      .find((s) => s.templateKey === "rest")!;
    expect(
      rest.blocks.some(
        (b) =>
          b.kind === "image" &&
          exchange.assets.some((a) => a.assetId === b.assetId),
      ),
    ).toBe(true);
    expect(
      rest.blocks.some(
        (b) =>
          b.kind === "text" && b.markdown === chooseRestStory(seed).markdown,
      ),
    ).toBe(true);
    expect(
      await validateTextbookIntegrity(exchange, {
        verifyManifest: false,
        readAsset: async (assetId) => {
          const [row] = await gate.db!.query<{ bytes: Uint8Array }>(
            `SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1::text`,
            [assetId],
          );
          return row.bytes;
        },
      }),
    ).toEqual([]);
    const reads = gate.assetReads;
    const replay = await POST(request(input));
    expect(await replay.json()).toEqual(result);
    expect(gate.assetReads).toBe(reads);
  });
  it("visual-file failures leave no shell or receipt and retry the same request successfully", async () => {
    const [before] = await gate.db!.query<{ books: number; requests: number }>(
      `SELECT (SELECT count(*)::int FROM "textbook") AS books,(SELECT count(*)::int FROM "textbook_request") AS requests`,
    );
    const input = body();
    gate.failAsset = true;
    const failed = await POST(request(input));
    expect(failed.status).toBe(400);
    gate.failAsset = false;
    const [after] = await gate.db!.query<{ books: number; requests: number }>(
      `SELECT (SELECT count(*)::int FROM "textbook") AS books,(SELECT count(*)::int FROM "textbook_request") AS requests`,
    );
    expect(after).toEqual(before);
    expect((await POST(request(input))).status).toBe(201);
  });
  it("freezes the bundled original PNGs using the production file loader", async () => {
    gate.bundledAssets = true;
    try {
      const response = await POST(request(body()));
      expect(response.status).toBe(201);
      const result = quickCreateResultSchema.parse(await response.json());
      const exchange = await assembleExchange(
        gate.db!,
        result.book.draftEditionId!,
        { exportedAt: new Date().toISOString() },
      );
      expect(exchange.assets.length).toBeGreaterThanOrEqual(4);
      expect(
        exchange.assets.filter((asset) => asset.widthPx === asset.heightPx)
          .length,
      ).toBeGreaterThanOrEqual(3);
      expect(
        await validateTextbookIntegrity(exchange, {
          verifyManifest: false,
          readAsset: async (assetId) => {
            const [row] = await gate.db!.query<{ bytes: Uint8Array }>(
              `SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1::text`,
              [assetId],
            );
            return row.bytes;
          },
        }),
      ).toEqual([]);
    } finally {
      gate.bundledAssets = false;
    }
  });
});
