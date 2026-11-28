/** Census the actual output path, including display-only figures with no saved ID.
 * No DB, network or writes outside the report directory. Numerical-only domains
 * are inventoried, not falsely described as exhaustively visually enumerated. */
import "../init-arithmetic-packs";
import { createHash } from "node:crypto";
import {
  writeFileSync,
  mkdirSync,
  createWriteStream,
  renameSync,
} from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { gzipSync, createGzip } from "node:zlib";
import { arithmeticV2Definitions } from "../../../src/lib/arithmetic-v2/registry";
import {
  arithmeticGeometryAssetIds,
  arithmeticGeometryCatalogSvg,
} from "../../../src/lib/arithmetic-v2/geometry";
import { presentArithmeticGeometrySvg } from "../../../src/lib/arithmetic-v2/presentation";
import {
  figureFirstSvg,
  isFigureFirstType,
  figureFirstDrawing,
} from "../../../src/lib/arithmetic-v2/presentation/figureFirst";
import { arithmeticFigurePresentation } from "../../../src/lib/arithmetic-v2/presentation/figurePolicy";
import { GEOMETRY_ARITHMETIC_DEFINITIONS } from "../../../src/lib/arithmetic-v2/families/geometry";
import { EXTRA_GEOMETRY_DEFINITIONS } from "../../../src/lib/arithmetic-v2/extraGeometry";
import { arithmeticGeometryDisplaySize } from "../../../src/lib/arithmetic-v2/presentation";
import {
  figureSvgUrlPrintMm,
  figureWidthStyle,
} from "../../../src/lib/figurePrintSize";
import {
  arithmeticEngineFigureSvg,
  arithmeticEngineInlineSvg,
} from "../../../src/lib/arithmetic-v2/presentation/engineFigures";
import type {
  ArithmeticV2Candidate,
  ArithmeticV2Definition,
} from "../../../src/lib/arithmetic-v2/types";
export const out =
  process.env.FIGURE_AUDIT_OUT ??
  "docs/planning/tracks/reports/arithmetic-figure-quality-20261112";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const figureDefs = new Set(
  [...GEOMETRY_ARITHMETIC_DEFINITIONS, ...EXTRA_GEOMETRY_DEFINITIONS].map(
    (d) => d.id,
  ),
);
const definitions = arithmeticV2Definitions();
type FamilyEntry = Pick<
  ArithmeticV2Definition,
  "id" | "title" | "grade" | "strand" | "domainSize"
> & { enumerated: boolean; figureFirst: boolean };
type CensusRow = ArithmeticV2Candidate & {
  id: string;
  family: string;
  index: number;
  verified: boolean;
  canonical?: string;
  sourceScreen?: { width: number; height: number };
  sourcePrint?: { widthMm: number; heightMm: number };
  display?: string;
  route: string;
  renderer: string;
  screen?: { width: number; height: number };
  print?: { widthMm: number; heightMm: number };
  lines: string[];
  error?: string;
};
const families: FamilyEntry[] = [],
  rows: CensusRow[] = [],
  assets = new Map<string, string>(),
  seen = new Set<string>();
for (const d of definitions) {
  const produces = figureDefs.has(d.id) || isFigureFirstType(d.id);
  families.push({
    id: d.id,
    title: d.title,
    grade: d.grade,
    strand: d.strand,
    domainSize: d.domainSize,
    enumerated: produces,
    figureFirst: isFigureFirstType(d.id),
  });
  if (!produces) continue;
  for (let i = 0; i < d.domainSize; i++) {
    const c = d.problemAt(i),
      p = c.prompt;
    const id = p.layout === "math" ? p.figureId : undefined;
    const canonical = id ? arithmeticGeometryCatalogSvg(id) : undefined;
    if (id) {
      if (seen.has(id)) throw Error("duplicate " + id);
      seen.add(id);
    }
    let first: string | undefined, error: string | undefined;
    try {
      first = isFigureFirstType(d.id)
        ? figureFirstSvg(d.id, p, canonical)
        : undefined;
    } catch (e) {
      error = String(e);
    }
    let rawError: string | undefined;
    if (isFigureFirstType(d.id) && !first)
      try {
        rawError = figureFirstDrawing(d.id, p, canonical)
          ? "typesetting fallback"
          : "unrecognized figure-first candidate";
      } catch (e) {
        rawError = String(e);
      }
    const policy = arithmeticFigurePresentation(p, d.id, {
      figureFirst: first !== undefined,
    });
    const display =
      first ??
      (id && canonical && policy.showFigure
        ? presentArithmeticGeometrySvg(id, canonical)
        : undefined);
    const key = id ?? `inline:${d.id}:${i}`;
    if (display) assets.set(hash(display), display);
    if (canonical) assets.set(hash(canonical), canonical);
    const screen = display ? arithmeticGeometryDisplaySize(display) : undefined;
    const print = display
      ? figureSvgUrlPrintMm(`data:image/svg+xml,${encodeURIComponent(display)}`)
      : undefined;
    const width = print
      ? figureWidthStyle(print.widthMm, print.maxWidthMm)?.width
      : undefined;
    const printSize =
      width && print
        ? {
            widthMm: parseFloat(width),
            heightMm: (parseFloat(width) * print.height) / print.width,
          }
        : undefined;
    const compiled = id
      ? arithmeticEngineFigureSvg(id, canonical)
      : arithmeticEngineInlineSvg(d.id, p);
    const renderer =
      first && compiled
        ? "compiled-python-engine"
        : display?.includes("arithmetic-geometry-drill-v1")
          ? "legacy-drawing"
          : first
            ? "existing-figure-first"
            : display
              ? "asset-presentation"
              : "none";
    const sourcePrint = canonical
      ? figureSvgUrlPrintMm(
          `data:image/svg+xml,${encodeURIComponent(canonical)}`,
        )
      : undefined;
    const sourceWidth = sourcePrint
      ? figureWidthStyle(sourcePrint.widthMm, sourcePrint.maxWidthMm)?.width
      : undefined;
    const sourcePrintSize =
      sourceWidth && sourcePrint
        ? {
            widthMm: parseFloat(sourceWidth),
            heightMm:
              (parseFloat(sourceWidth) * sourcePrint.height) /
              sourcePrint.width,
          }
        : undefined;
    const sourceBox = canonical
      ? /viewBox="([^"]+)"/.exec(canonical)?.[1].split(/\s+/).map(Number)
      : undefined;
    rows.push({
      id: key,
      family: d.id,
      index: i,
      parameters: c.parameters,
      prompt: p,
      answer: c.answer,
      verified: d.verify(c),
      canonical: canonical ? hash(canonical) : undefined,
      sourceScreen: sourceBox
        ? { width: sourceBox[2], height: sourceBox[3] }
        : undefined,
      sourcePrint: sourcePrintSize,
      display: display ? hash(display) : undefined,
      route: first ? "figure-first" : display ? "presentation" : "hidden",
      renderer,
      screen,
      print: printSize,
      lines: policy.lines,
      error: error ?? rawError,
    });
  }
}
for (const id of arithmeticGeometryAssetIds)
  if (!seen.has(id)) throw Error("orphan " + id);
const summary = {
  definitions: definitions.length,
  enumeratedFamilies: families.filter((d) => d.enumerated).length,
  finiteFigureDomain: rows.length,
  registeredAssets: arithmeticGeometryAssetIds.size,
  inlineFigures: rows.filter((r) => r.id.startsWith("inline:") && r.display)
    .length,
  displayed: rows.filter((r) => r.display).length,
  hidden: rows.filter((r) => !r.display).length,
  figureFirst: rows.filter((r) => r.route === "figure-first").length,
  failedVerification: rows.filter((r) => !r.verified).length,
  drawErrors: rows.filter((r) => r.error).length,
  uniqueCanonical: new Set(rows.map((r) => r.canonical).filter(Boolean)).size,
  uniqueDisplay: new Set(rows.map((r) => r.display).filter(Boolean)).size,
};
mkdirSync(out, { recursive: true });
const manifest = JSON.stringify({ summary, families, rows });
async function saveAudit() {
  // Actual MathJax paths make the finite SVG cache approach V8's single-string
  // limit. Stream both representations; never stringify the entire asset map.
  function* objectChunks() {
    yield "{";
    let first = true;
    for (const [key, svg] of assets) {
      yield `${first ? "" : ","}${JSON.stringify(key)}:${JSON.stringify(svg)}`;
      first = false;
    }
    yield "}";
  }
  function* lineChunks() {
    for (const entry of assets) yield JSON.stringify(entry) + "\n";
  }
  await pipeline(
    Readable.from(objectChunks()),
    createGzip({ level: 9 }),
    createWriteStream(`${out}/assets.json.gz.tmp`),
  );
  await pipeline(
    Readable.from(lineChunks()),
    createWriteStream(`${out}/assets.ndjson.tmp`),
  );
  renameSync(`${out}/assets.ndjson.tmp`, `${out}/assets.ndjson`);
  renameSync(`${out}/assets.json.gz.tmp`, `${out}/assets.json.gz`);
  writeFileSync(`${out}/manifest.json.gz`, gzipSync(manifest, { level: 9 }));
  writeFileSync(
    `${out}/summary.json`,
    JSON.stringify(
      {
        ...summary,
        manifestSha256: hash(manifest),
        families: families.filter((d) => d.enumerated),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify(summary, null, 2));
}
saveAudit().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
