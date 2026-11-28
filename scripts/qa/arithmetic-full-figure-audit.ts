/** Complete registry/accepted-facade census. Reuses the named root toolchain.
 * node --import C:/Creative/testautocreator/node_modules/tsx/dist/loader.mjs --import ./scripts/qa/arithmetic-angle-presentation-deps.mjs scripts/qa/arithmetic-full-figure-audit.ts
 */
import "./init-arithmetic-packs";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { arithmeticV2Definitions } from "../../src/lib/arithmetic-v2/registry";
import { EXTRA_GEOMETRY_DEFINITIONS } from "../../src/lib/arithmetic-v2/extraGeometry";
import { GEOMETRY_ARITHMETIC_DEFINITIONS } from "../../src/lib/arithmetic-v2/families/geometry";
import {
  arithmeticGeometryAssetIds,
  arithmeticGeometryCatalogSvg,
  arithmeticAngleAssetIds,
} from "../../src/lib/arithmetic-v2/geometry";
import { presentArithmeticGeometrySvg } from "../../src/lib/arithmetic-v2/presentation";
import { presentArithmeticAngleSvg } from "../../src/lib/arithmetic-v2/presentation/angles";
import { presentArithmeticDimensionSvg } from "../../src/lib/arithmetic-v2/presentation/dimensions";
import { presentArithmeticSegmentSvg } from "../../src/lib/arithmetic-v2/presentation/segments";

export const output = "scripts/qa/arithmetic-full-figure-audit-evidence";
/** Large committed evidence is losslessly compressed; fresh runs write JSON. */
export const evidenceExists = (file: string) =>
  existsSync(file) || existsSync(`${file}.gz`);
export function readEvidenceText(file: string, encoding: "utf8") {
  return existsSync(file)
    ? readFileSync(file, encoding)
    : gunzipSync(readFileSync(`${file}.gz`)).toString(encoding);
}
export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function acceptedRoute(id: string, original: string) {
  if (presentArithmeticAngleSvg(id, original) !== undefined) return "angles";
  if (presentArithmeticDimensionSvg(id, original) !== undefined)
    return "dimensions";
  if (presentArithmeticSegmentSvg(id, original) !== undefined)
    return "segments";
  return "raw";
}
export function census() {
  const definitions = arithmeticV2Definitions();
  const figureDefinitions = [
    ...GEOMETRY_ARITHMETIC_DEFINITIONS,
    ...EXTRA_GEOMETRY_DEFINITIONS,
  ];
  const known = new Set(figureDefinitions.map((d) => d.id));
  const rows = new Map<
    string,
    {
      id: string;
      family: string;
      route: string;
      owner: string;
      sourceSha256: string;
      displaySha256: string;
      parameters: number[];
      prompt: string;
      instruction: string;
      answer: string;
      verified: boolean;
    }
  >();
  const noFigure = [];
  for (const definition of definitions) {
    if (!known.has(definition.id)) {
      const example = definition.problemAt(0);
      assert.ok(
        example.prompt.layout !== "math" || !example.prompt.figureId,
        definition.id,
      );
      noFigure.push({
        family: definition.id,
        domainSize: definition.domainSize,
        evidence:
          "outside the four registered figure maps and frozen angle pack; first candidate has no figure",
      });
    }
  }
  let noFigureGeometryCandidates = 0;
  for (const definition of figureDefinitions) {
    assert.ok(definitions.some((d) => d.id === definition.id));
    for (let index = 0; index < definition.domainSize; index++) {
      const candidate = definition.problemAt(index),
        prompt = candidate.prompt;
      if (prompt.layout !== "math" || !prompt.figureId) {
        noFigureGeometryCandidates++;
        continue;
      }
      const id = prompt.figureId;
      assert.ok(!rows.has(id), `duplicate figure candidate ${id}`);
      assert.ok(arithmeticGeometryAssetIds.has(id), `unregistered ${id}`);
      const source = arithmeticGeometryCatalogSvg(id),
        route = acceptedRoute(id, source);
      rows.set(id, {
        id,
        family: definition.id,
        route,
        owner:
          route === "dimensions"
            ? "elementary-worker"
            : route === "segments"
              ? "root"
              : "full-audit-worker",
        sourceSha256: hash(source),
        displaySha256: hash(presentArithmeticGeometrySvg(id, source)),
        parameters: candidate.parameters,
        prompt: prompt.text,
        instruction: prompt.instruction ?? "",
        answer: candidate.answer.text,
        verified: definition.verify(candidate),
      });
    }
  }
  assert.equal(
    rows.size,
    arithmeticGeometryAssetIds.size,
    "every registry asset must have exactly one candidate",
  );
  assert.ok(
    [...arithmeticGeometryAssetIds].every((id) => rows.has(id)),
    "orphan registry figure",
  );
  const all = [...rows.values()];
  const families = [...new Set(all.map((r) => r.family))].map((family) => {
    const entries = all.filter((r) => r.family === family);
    return {
      family,
      count: entries.length,
      route: entries[0].route,
      owner: entries[0].owner,
      first: entries[0].id,
      last: entries.at(-1)!.id,
    };
  });
  const counts = Object.fromEntries(
    ["angles", "dimensions", "segments", "raw"].map((route) => [
      route,
      all.filter((r) => r.route === route).length,
    ]),
  );
  return {
    summary: {
      registeredFigures: rows.size,
      figureFamilies: families.length,
      totalDefinitions: definitions.length,
      counts,
      frozenAngles: arithmeticAngleAssetIds.size,
      noFigureGeometryCandidates,
      unregisteredFigures: 0,
      unreferencedFigures: 0,
      failedVerification: all.filter((r) => !r.verified).map((r) => r.id),
    },
    families,
    noFigure,
    rows: all,
  };
}
if (process.argv[1]?.endsWith("arithmetic-full-figure-audit.ts")) {
  mkdirSync(output, { recursive: true });
  const result = census();
  writeFileSync(
    `${output}/census.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        ...result.summary,
        rawFamilies: result.families.filter((r) => r.route === "raw"),
      },
      null,
      2,
    ),
  );
}
