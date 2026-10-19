import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { deflateSync, strToU8 } from "fflate";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import { ALGEBRA_COMPLETE_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/algebraComplete";
import { TRIGONOMETRY_COMPLETE_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/trigonometryComplete";
import { arithmeticGeometryCatalogSvg } from "../../src/lib/arithmetic-v2/geometry";
import { arithmeticV2PromptIdentity } from "../../src/contracts/arithmeticV2.contract";
import type { ArithmeticV2SheetItem } from "../../src/contracts/arithmeticV2.contract";
import { createArithmeticGeometryPackStore } from "../../src/lib/arithmetic-v2/geometryPack";
import {
  ARITHMETIC_SHEET_JSON_LIMITS,
  arithmeticSheetByteIssue,
} from "../../src/lib/arithmetic/byteBudget";
import { parseStrictJson } from "../../src/lib/textbook/strictJson";
const definitions = [
  ...new Map(
    [
      ...arithmeticV2Definitions(),
      ...ALGEBRA_COMPLETE_DEFINITIONS,
      ...TRIGONOMETRY_COMPLETE_DEFINITIONS,
    ].map((d) => [d.id, d]),
  ).values(),
];
const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value));
const results = [];
for (const geometryOnly of [false, true]) {
  const started = performance.now();
  const selected = definitions.filter(
    (d) =>
      !geometryOnly ||
      (d.problemAt(0).prompt.layout === "math" &&
        "figureId" in d.problemAt(0).prompt),
  );
  const items: ArithmeticV2SheetItem[] = [];
  const used = new Set<string>();
  for (let index = 0; items.length < 2000; index++) {
    let progress = false;
    for (const d of selected) {
      if (index >= d.domainSize) continue;
      const candidate = d.problemAt(index);
      assert(d.verify(candidate));
      const identity = arithmeticV2PromptIdentity(candidate.prompt);
      if (used.has(identity)) continue;
      used.add(identity);
      items.push({
        order: (items.length % 200) + 1,
        typeId: d.id,
        domainIndex: index,
        ...candidate,
      });
      progress = true;
      if (items.length === 2000) break;
    }
    if (!progress) throw new Error("Insufficient unique candidates");
  }
  const ids = [
    ...new Set(
      items.flatMap((item) =>
        item.prompt.layout === "math" && item.prompt.figureId
          ? [item.prompt.figureId]
          : [],
      ),
    ),
  ].sort();
  const figures = Object.fromEntries(
    ids.map((id) => [id, arithmeticGeometryCatalogSvg(id)]),
  );
  const pack = Buffer.from(
    deflateSync(strToU8(JSON.stringify(figures)), { level: 6 }),
  ).toString("base64");
  const trusted = createArithmeticGeometryPackStore(
    arithmeticGeometryCatalogSvg,
  ).create(ids);
  assert.equal(trusted.svgPack, pack);
  const sheet = {
    payloadVersion: 2,
    kind: "arithmeticSheet",
    engineVersion: "arithmetic-engine-v2",
    catalogVersion: "arithmetic-catalog-v2",
    seed: "x".repeat(128),
    ...(ids.length ? { figures: { version: 2, ids, svgPack: pack } } : {}),
    rounds: Array.from({ length: 10 }, (_, i) => ({
      round: i + 1,
      items: items.slice(i * 200, (i + 1) * 200),
    })),
  };
  const save = {
    kind: sheet.kind,
    title: "가".repeat(200),
    payload: sheet,
    expectedRevision: Number.MAX_SAFE_INTEGER,
    visibility: "branch",
    sharedBranchId: "12345678-1234-1234-1234-123456789012",
  };
  assert.equal(arithmeticSheetByteIssue(sheet), null);
  parseStrictJson(JSON.stringify(save), ARITHMETIC_SHEET_JSON_LIMITS);
  const dto = {
    id: "x".repeat(128),
    kind: sheet.kind,
    title: save.title,
    payload: sheet,
    revision: Number.MAX_SAFE_INTEGER,
    ownerId: save.sharedBranchId,
    ownerName: "가".repeat(200),
    visibility: "branch",
    sharedBranchId: save.sharedBranchId,
    createdAt: "2026-10-15T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
    problemCount: 2000,
    canEdit: true,
  };
  results.push({
    scenario: geometryOnly ? "2000-distinct-geometry" : "2000-heterogeneous",
    types: new Set(items.map((item) => item.typeId)).size,
    uniqueFigures: ids.length,
    uncompressedFigureBytes: bytes(figures),
    packBytes: pack.length,
    sheetBytes: bytes(sheet),
    saveWrapperBytes: bytes(save),
    generateResponseBytes: bytes({ data: sheet }),
    savedResponseBytes: bytes({ data: dto }),
    regenerateResponseBytes: bytes({
      data: {
        sheet,
        round: 1,
        changedOrders: Array.from({ length: 200 }, (_, i) => i + 1),
        unchangedOrders: [],
      },
    }),
    elapsedMs: Math.round(performance.now() - started),
  });
}
writeFileSync(
  "scripts/qa/arithmetic-limit-sizing-evidence.json",
  JSON.stringify({ recorded: "2026-10-15", results }, null, 2) + "\n",
);
console.log(JSON.stringify(results, null, 2));
