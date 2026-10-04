// @vitest-environment node
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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
  quickCreateCatalogSchema,
  type QuickCreateInput,
  type QuickCreateComponents,
} from "@/contracts/textbookQuickCreate.contract";
import { CURRICULUM_UNITS } from "../../../prisma/seed-data/units";
import { assembleExchange } from "@/lib/textbook/server/exchange";
import { validateTextbookIntegrity } from "@/lib/textbook/integrity.server";
import { conceptScriptFor } from "@/lib/textbook/conceptScripts";
import { chooseRestStory } from "@/lib/textbook/restStories";
import { openTextbookDb, type Db } from "../helpers/textbookPglite";
import { publishDeps } from "@/lib/textbook/publish/deps.server";
import { preflightEdition } from "@/lib/textbook/publish/preflight";
import { reservePublish } from "@/lib/textbook/publish/reserve";
import { runNextStep } from "@/lib/textbook/publish/step";
import { finalizePublish } from "@/lib/textbook/publish/finalize";
import { canonicalHash } from "@/lib/textbook/hash.server";
import { validateTextbookReferences } from "@/lib/textbook/references";
import {
  insertTeacher,
  insertBankProblem,
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
  schoolLevel: "elementary" as const,
  grade: 3,
  semester: 1 as const,
  startUnitId: unitId,
  endUnitId: unitId,
  difficulty: "standard" as const,
  problemCountPerUnit: 2,
  includeConcepts: true,
  components: {
    ...DEFAULT_QUICK_CREATE_COMPONENTS,
    practice: false,
    rest: true,
  },
  cast,
});
const request = (input: QuickCreateInput) =>
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

  it("returns 201 for the reported all-components middle-2 range with zero written candidates", async () => {
    const seeds = CURRICULUM_UNITS.filter((unit) => unit.grade === "중2").slice(
      0,
      8,
    );
    const unitIds: string[] = [];
    for (const [index, unit] of seeds.entries()) {
      const id = randomUUID();
      unitIds.push(id);
      await pg.query(
        `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          id,
          unit.grade,
          unit.chapter,
          unit.section,
          unit.orderIndex,
          `J32${String(index + 1).padStart(3, "0")}`,
        ],
      );
      for (let count = 0; count < 8; count++) {
        const bankItem = await insertBankProblem(pg, id, {
          difficulty: "기본",
          questionType: "단답형",
          content: `$${count + 2} + ${index + 1}$을 계산하시오.`,
          answer: String(count + index + 3),
          solution: `$${count + 2} + ${index + 1} = ${count + index + 3}$`,
        });
        await pg.query(`UPDATE "problem" SET "family_key"=$2 WHERE "id"=$1`, [
          bankItem.id,
          `mid:arithmetic-addition:${index}`,
        ]);
      }
    }
    const catalogResponse = await GET(
      new Request(
        "https://today.test/api/textbook/quick-create?schoolLevel=middle&grade=2&semester=1",
      ),
    );
    expect(catalogResponse.status).toBe(200);
    const catalog = quickCreateCatalogSchema.parse(
      await catalogResponse.json(),
    );
    expect(catalog.units).toHaveLength(8);
    expect(
      catalog.units.every(
        (unit) =>
          unit.availability?.standard.total === 8 &&
          unit.availability.standard.written === 0,
      ),
    ).toBe(true);
    const input: QuickCreateInput = {
      ...body(),
      schoolLevel: "middle",
      grade: 2,
      problemCountPerUnit: 8,
      startUnitId: unitIds[0],
      endUnitId: unitIds[7],
      components: Object.fromEntries(
        Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [key, true]),
      ) as QuickCreateComponents,
    };
    const response = await POST(request(input));
    expect(response.status).toBe(201);
    const result = quickCreateResultSchema.parse(await response.json());
    expect(result.problemCount).toBe(64);
    expect(result.conceptCount).toBe(8);
    expect(
      result.warnings.filter((warning) =>
        warning.includes("서술형 1문항 중 0문항"),
      ),
    ).toHaveLength(8);
    const exchange = await assembleExchange(
      gate.db!,
      result.book.draftEditionId!,
      { exportedAt: new Date().toISOString() },
    );
    expect(
      exchange.items.every((item) => item.learningStage !== "written"),
    ).toBe(true);
    const legacy = structuredClone(exchange);
    legacy.conceptIntegration!.concepts.forEach((concept) => {
      concept.mappingVersion = "quick-create.unit-triple.v1";
    });
    for (const section of legacy.units.flatMap((u) => u.sections))
      for (const block of section.blocks)
        if (block.kind === "concept-recall" && /^\d+\.\s/.test(block.markdown))
          delete block.conceptKey;
    expect(
      validateTextbookReferences(legacy, { mode: "publish" }).filter(
        (i) => i.code === "MISSING_CONCEPT",
      ),
    ).toEqual([]);
    legacy.conceptIntegration!.concepts.forEach((c) => {
      c.mappingVersion = "manual";
    });
    expect(
      validateTextbookReferences(legacy, { mode: "publish" }).filter(
        (i) => i.code === "MISSING_CONCEPT",
      ),
    ).toHaveLength(8);
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
    const replay = await POST(request(input));
    expect(replay.status).toBe(201);
    expect(await replay.json()).toEqual(result);
  });

  it
    .skipIf(process.env.TEXTBOOK_PDF_TEST !== "1")
    .each(["elementary", "middle"] as const)(
    "creates all components and publishes actual %s student/answer PDFs with the production renderer and bundled visuals",
    async (schoolLevel) => {
      gate.bundledAssets = true;
      try {
        let targetId = schoolLevel === "elementary" ? unitId : randomUUID();
        if (schoolLevel === "middle") {
          const middle = CURRICULUM_UNITS.find((unit) => unit.grade === "중2")!;
          const existing = await pg.query<{ id: string }>(
            `SELECT "id" FROM "unit" WHERE "grade"=$1 AND "chapter"=$2 AND "section"=$3 LIMIT 1`,
            [middle.grade, middle.chapter, middle.section],
          );
          if (existing.rows[0]) targetId = existing.rows[0].id;
          else
            await pg.query(
              `INSERT INTO "unit" ("id","grade","chapter","section","order_index","problem_code_prefix") VALUES ($1,$2,$3,$4,$5,'J32999')`,
              [
                targetId,
                middle.grade,
                middle.chapter,
                middle.section,
                middle.orderIndex,
              ],
            );
        }
        for (let index = 0; index < 8; index++)
          await insertBankProblem(pg, targetId, {
            difficulty: "기본",
            questionType: index === 7 ? "서술형" : "단답형",
          });
        const input: QuickCreateInput = {
          ...body(),
          schoolLevel,
          grade: schoolLevel === "elementary" ? 3 : 2,
          startUnitId: targetId,
          endUnitId: targetId,
          problemCountPerUnit: 8,
          components: Object.fromEntries(
            Object.keys(DEFAULT_QUICK_CREATE_COMPONENTS).map((key) => [
              key,
              true,
            ]),
          ) as QuickCreateComponents,
        };
        const response = await POST(request(input));
        expect(response.status).toBe(201);
        const created = quickCreateResultSchema.parse(await response.json());
        const editionId = created.book.draftEditionId!;
        const deps = {
          ...publishDeps(),
          officialOrigin: "https://textbook-qa.example.org",
        };
        const preflight = await preflightEdition(
          gate.db!,
          gate.actor!,
          editionId,
          deps,
        );
        expect(preflight.issues.filter((i) => i.severity === "error")).toEqual(
          [],
        );
        const requestId = randomUUID();
        let job = await reservePublish(
          gate.db!,
          gate.actor!,
          editionId,
          { requestId, expectedRevision: preflight.revision },
          canonicalHash({ requestId, expectedRevision: preflight.revision }),
          deps,
        );
        for (let step = 0; step < 40 && job.status !== "ready"; step++) {
          job = await runNextStep(
            gate.db!,
            gate.actor!,
            editionId,
            requestId,
            deps,
          );
          expect(job.issues.filter((i) => i.severity === "error")).toEqual([]);
        }
        expect(job.status).toBe("ready");
        const published = await finalizePublish(
          gate.db!,
          gate.actor!,
          editionId,
          requestId,
          deps,
        );
        expect(published.status).toBe("published");
        expect(
          published.artifacts.filter((a) => a.kind.includes("pdf")).length,
        ).toBeGreaterThanOrEqual(2);
        const frozen = await assembleExchange(gate.db!, editionId, {
          exportedAt: new Date().toISOString(),
        });
        expect(frozen.pageMap).toHaveLength(created.problemCount);
        expect(frozen.conceptIntegration?.concepts).toHaveLength(
          created.conceptCount,
        );
        expect(frozen.qrTargets).toHaveLength(created.problemCount);
        expect(frozen.conceptQrTargets).toHaveLength(created.conceptCount);
        expect(
          await validateTextbookIntegrity(frozen, {
            mode: "archive",
            officialOrigin: deps.officialOrigin,
            readAsset: async (assetId) => {
              const [row] = await gate.db!.query<{ bytes: Uint8Array }>(
                `SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1::text`,
                [assetId],
              );
              return row.bytes;
            },
          }),
        ).toEqual([]);
        if (process.env.TEXTBOOK_PROOF_OUTPUT) {
          const output = path.resolve(
            process.env.TEXTBOOK_PROOF_OUTPUT,
            schoolLevel,
          );
          await mkdir(output, { recursive: true });
          for (const artifact of published.artifacts.filter(
            (a) => a.kind === "student-pdf" || a.kind === "answer-pdf",
          )) {
            const [row] = await gate.db!.query<{ bytes: Uint8Array }>(
              `SELECT "bytes" FROM "textbook_blob" WHERE "sha256"=$1::text`,
              [artifact.sha256],
            );
            await writeFile(
              path.join(output, `${artifact.kind}.pdf`),
              row.bytes,
            );
          }
          await writeFile(
            path.join(output, "publish-proof.json"),
            JSON.stringify(
              {
                schoolLevel,
                problems: created.problemCount,
                concepts: created.conceptCount,
                status: published.status,
                artifacts: published.artifacts.map(
                  ({ kind, sha256, pageCount }) => ({
                    kind,
                    sha256,
                    pageCount,
                  }),
                ),
              },
              null,
              2,
            ),
          );
        }
      } finally {
        gate.bundledAssets = false;
      }
    },
    300_000,
  );
});
