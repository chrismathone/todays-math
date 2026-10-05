/** Final-reference correction only: immutable old run in, fresh D: evidence out.
 * node --conditions=react-server --import tsx scripts/qa/textbook/recovery/refinalize-bank.ts OLD FRESH --only 초3-1,중2-1
 * After coordinator supplies integrated QA: OLD OUTPUT --verify-only --qa-commit HASH
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { constants } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type { TextbookExchange } from "../../../../src/contracts/textbookExchange.contract";
import { launchExportBrowser } from "../../../../src/lib/export/pdfServer";
import {
  studentPageMapFromPages,
  type TextbookPage,
} from "../../../../src/lib/textbook/layout/paginate";
import { createTextbookRenderModel } from "../../../../src/lib/textbook/render/model";
import {
  assertTextbookReferenceLayoutUnchanged,
  withTextbookPageReferences,
} from "../../../../src/lib/textbook/render/pageReferences";
import {
  mergeTextbookPdfs,
  renderTextbookChunk,
  type TextbookChunkResult,
} from "../../../../src/lib/textbook/render/server";
import {
  captureDomWitness,
  computedCoverage,
  expectedRenderedRows,
  normalizeRowPages,
} from "./dom-witness";
import { loadFinalDom, readFinalHtml } from "./load-final-dom";

const sha = (v: string | Uint8Array) =>
  createHash("sha256").update(v).digest("hex");
const normalizedSha = (v: Buffer) =>
  sha(v.toString("utf8").replace(/\r\n/g, "\n"));
const git = (...args: string[]) =>
  execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
const json = async <T>(file: string): Promise<T> =>
  JSON.parse((await readFile(file, "utf8")).replace(/^\uFEFF/, "")) as T;
const save = async (file: string, value: unknown) =>
  writeFile(file, JSON.stringify(value, null, 2) + "\n");
type Variant = "student" | "answers";
type Placement = Pick<
  TextbookChunkResult,
  "pages" | "qrPlacements" | "artifactHash"
> & { rendererGitCommit: string; referencePhase: string };
type Phase = {
  referencePhase: "reserve" | "final";
  chunkIndex: number;
  firstPhysicalPageIndex: number;
  nextPhysicalPageIndex: number;
  pdfSha256: string;
  pages: TextbookPage[];
  origin?: unknown;
};
type Phases = {
  version: number;
  rendererGitCommit: string;
  mode: string;
  publisherPlan: number[][];
  finalLayoutMatchesReserved: boolean;
  phases: Phase[];
};
type OldManifest = {
  key: string;
  status: string;
  fixtureSha256: string;
  rendererGitCommit: string;
  publisherPlan: number[][];
  input: { components: Record<string, boolean> };
  exports: { variant: Variant; pdfSha256: string; pageCount: number }[];
};
type FileOrigin = {
  file: string;
  source: string;
  sha256: string;
  bytes: number;
  origin: "copied-byte-for-byte" | "decoded-original-html-bytes";
};
type Authority = {
  rendererGitCommit: string;
  harnessSha256: string;
  oldRun: string;
  selected: string[];
  code: Record<string, string>;
  createdAtUtc: string;
  oldVerdict: "FAILED-preserved";
};
const qaFiles = [
  "scripts/qa/textbook/recovery/dom-witness.ts",
  "scripts/qa/textbook/recovery/geometry.py",
  "scripts/qa/textbook/recovery/page_references.py",
  "scripts/qa/textbook/recovery/verify_exports.py",
  "scripts/qa/textbook/recovery/load-final-dom.ts",
];

async function codeHashes() {
  const files = git(
    "ls-files",
    "src/lib/textbook/render",
    "src/lib/textbook/layout",
    "src/contracts/textbook*",
    "src/lib/export",
    ...qaFiles,
  )
    .split(/\r?\n/)
    .filter(Boolean);
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [file, sha(await readFile(file))]),
    ),
  );
}

function unchanged(
  before: readonly TextbookPage[],
  after: readonly TextbookPage[],
) {
  assertTextbookReferenceLayoutUnchanged(before, after);
  before.forEach((p, i) => {
    for (const key of [
      "physicalPageIndex",
      "printedPageLabel",
      "unitKey",
      "sectionKey",
      "kind",
    ] as const)
      assert.equal(after[i][key], p[key], `Page identity changed: ${key}`);
    p.blocks.forEach((b, j) => {
      for (const key of ["xMm", "yMm", "widthMm", "heightMm"] as const)
        assert(
          Number.isFinite(after[i].blocks[j][key]) &&
            Math.abs(b[key] - after[i].blocks[j][key]) <= 0.01,
        );
    });
  });
}

async function exactCopy(
  source: string,
  destination: string,
  records: FileOrigin[],
) {
  const bytes = await readFile(source);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination, constants.COPYFILE_EXCL);
  assert.equal(sha(await readFile(destination)), sha(bytes));
  records.push({
    file: destination,
    source,
    sha256: sha(bytes),
    bytes: bytes.length,
    origin: "copied-byte-for-byte",
  });
}

async function htmlCopy(
  source: string,
  destination: string,
  records: FileOrigin[],
) {
  const html = await readFinalHtml(source);
  await writeFile(destination, html, { flag: "wx" });
  assert.equal(sha(await readFile(destination)), sha(html));
  records.push({
    file: destination,
    source,
    sha256: sha(html),
    bytes: Buffer.byteLength(html),
    origin: "decoded-original-html-bytes",
  });
}

/** Regenerate both PDFs at the same scale, compare every page, bind prior AI notes by PNG SHA only. */
const imageEvidencePython = String.raw`
import json, hashlib, sys
from pathlib import Path
import pymupdf as fitz
old, out, variant, changed = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3], set(json.loads(sys.argv[4]))
h = lambda b: hashlib.sha256(b).hexdigest()
a, b = fitz.open(old / (variant+'.pdf')), fitz.open(out / (variant+'.pdf'))
assert len(a) == len(b)
folder = out / 'page-images'; folder.mkdir(exist_ok=True)
old_pdf_sha = h((old / (variant+'.pdf')).read_bytes())
reviews = []
for file in sorted(old.rglob('*ai-review.json')):
    value = json.loads(file.read_text(encoding='utf-8-sig'))
    if value.get('variant') == variant and value.get('pdfSha256') == old_pdf_sha:
        for row in value.get('pages', []):
            index = row.get('pdfPageIndex', row.get('page'))
            png = row.get('pngFile', row.get('file'))
            digest = row.get('pngSha256', row.get('sha256'))
            if isinstance(index, int) and png and digest and Path(png).exists() and h(Path(png).read_bytes()) == digest:
                reviews.append((index, Path(png), digest, file, h(file.read_bytes()), row))
rows = []
for i in range(len(a)):
    pa, pb = a[i].get_pixmap(matrix=fitz.Matrix(1.5,1.5), alpha=False), b[i].get_pixmap(matrix=fitz.Matrix(1.5,1.5), alpha=False)
    ra, rb = pa.tobytes('png'), pb.tobytes('png')
    same = ra == rb and pa.samples == pb.samples and (pa.width,pa.height) == (pb.width,pb.height)
    touched = i+1 in changed
    assert touched or same, 'Untouched PDF page image changed: '+str(i+1)
    file = folder / (variant+'-p'+str(i+1).zfill(3)+'.png'); file.write_bytes(rb)
    bindings = []
    if same:
        for index, png, digest, review_file, review_sha, finding in reviews:
            if index != i+1: continue
            stored = fitz.Pixmap(str(png))
            scale = next((s for s in (1.5,1.2,2.0,1.0) if a[i].get_pixmap(matrix=fitz.Matrix(s,s),alpha=False).width == stored.width and a[i].get_pixmap(matrix=fitz.Matrix(s,s),alpha=False).height == stored.height), None)
            if scale is None: continue
            old_png = a[i].get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False).tobytes('png')
            new_png = b[i].get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False).tobytes('png')
            if h(old_png) == digest and old_png == new_png:
                bindings.append({'oldReviewFile':str(review_file),'oldReviewSha256':review_sha,'oldPng':str(png),'oldPngSha256':digest,'regeneratedPngSha256':h(new_png),'finding':finding})
    rows.append({'pdfPageIndex':i+1,'rerenderedChunkPage':touched,'pngFile':str(file),'oldRegeneratedPngSha256':h(ra),'newPngSha256':h(rb),'pngBytesEqual':same,'pixelSamplesEqual':pa.samples==pb.samples,'oldAIFindingBindings':bindings,'review':'prior-AI-finding-bound-by-identical-PNG' if bindings else 'fresh-AI-review-required' if not same else 'unchanged-image-no-prior-AI-finding-bound'})
(out / (variant+'-page-equality.json')).write_text(json.dumps({'version':1,'pngScale':1.5,'oldPdfSha256':old_pdf_sha,'newPdfSha256':h((out/(variant+'.pdf')).read_bytes()),'humanApproval':False,'physicalApproval':False,'pages':rows},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'variant':variant,'pages':len(rows),'changedImages':[r['pdfPageIndex'] for r in rows if not r['pngBytesEqual']],'priorAIBound':sum(bool(r['oldAIFindingBindings']) for r in rows)}),flush=True)
`;

async function main() {
  const [oldArg, outputArg, ...flags] = process.argv.slice(2);
  assert(
    oldArg && outputArg,
    "OLD_RUN FRESH_D_OUTPUT [--only KEYS] [--verify-only --qa-commit HASH]",
  );
  const oldRun = path.resolve(oldArg),
    output = path.resolve(outputArg);
  assert(/^D:\\/i.test(output), "Evidence must be on D:");
  const relative = path.relative(oldRun, output);
  assert(
    relative && relative.startsWith("..") && !path.isAbsolute(relative),
    "Output must be outside immutable old run",
  );
  const worktrees = git("worktree", "list", "--porcelain")
    .split(/\r?\n/)
    .filter((s) => s.startsWith("worktree "))
    .map((s) => path.resolve(s.slice(9)));
  for (const root of worktrees) {
    const r = path.relative(root, output);
    assert(
      r && (r.startsWith("..") || path.isAbsolute(r)),
      "Output inside worktree",
    );
  }
  let only = "초3-1,중2-1",
    qaCommit = "",
    verifyOnly = false;
  for (let i = 0; i < flags.length; i++) {
    if (flags[i] === "--only") only = flags[++i];
    else if (flags[i] === "--qa-commit") qaCommit = flags[++i];
    else if (flags[i] === "--verify-only") verifyOnly = true;
    else throw new Error(`Unknown option ${flags[i]}`);
  }
  assert(
    !verifyOnly || /^[a-f0-9]{40}$/.test(qaCommit),
    "Strict verification requires coordinator-supplied QA commit",
  );
  const rendererGitCommit = git("rev-parse", "HEAD");
  const code = await codeHashes(),
    harnessSha256 = sha(await readFile(__filename));
  for (const file of Object.keys(code))
    assert.equal(
      normalizedSha(await readFile(file)),
      normalizedSha(
        execFileSync("git", ["show", `${rendererGitCommit}:${file}`], {
          maxBuffer: 64 * 1024 * 1024,
        }),
      ),
      `Tracked runtime differs from HEAD: ${file}`,
    );
  const oldAuthority = await json<{ authorizedOrigin: string }>(
    path.join(oldRun, "run-authority.json"),
  );
  const settled = await json<OldManifest[]>(
    path.join(oldRun, "automatic-summary.json"),
  );
  if (only === "all") {
    await readFile(path.join(oldRun, "local-pglite-manifest.json"));
    only = settled.map((r) => r.key).join(",");
    assert.equal(settled.length, 14, "Full14 writer has not settled");
  }
  let selected = only.split(",");
  let authority: Authority;
  if (verifyOnly) {
    authority = await json<Authority>(
      path.join(output, "correction-authority.json"),
    );
    assert.equal(authority.oldRun, oldRun);
    assert.equal(
      authority.harnessSha256,
      harnessSha256,
      "Frozen harness changed",
    );
    selected = authority.selected;
    assert.equal(git("rev-parse", `${qaCommit}^{commit}`), qaCommit);
    assert.equal(
      execFileSync("git", [
        "merge-base",
        "--is-ancestor",
        qaCommit,
        rendererGitCommit,
      ]).length,
      0,
    );
    for (const file of qaFiles)
      assert.equal(
        normalizedSha(await readFile(file)),
        normalizedSha(
          execFileSync("git", ["show", `${qaCommit}:${file}`], {
            maxBuffer: 64 * 1024 * 1024,
          }),
        ),
        `QA helper mismatch: ${file}`,
      );
    for (const [file, hash] of Object.entries(authority.code))
      if (!qaFiles.includes(file))
        assert.equal(
          code[file],
          hash,
          `Frozen production code changed: ${file}`,
        );
  } else {
    assert.equal(
      (
        await readdir(output).catch((error: NodeJS.ErrnoException) => {
          if (error.code === "ENOENT") return [];
          throw error;
        })
      ).length,
      0,
      "Destination must be fresh",
    );
    await mkdir(output, { recursive: true });
    authority = {
      rendererGitCommit,
      harnessSha256,
      oldRun,
      selected,
      code,
      createdAtUtc: new Date().toISOString(),
      oldVerdict: "FAILED-preserved",
    };
    await save(path.join(output, "correction-authority.json"), authority);
    const feasibility = await readFile(
      path.join(oldRun, "index-rerender-feasibility-first12.private.json"),
    );
    assert.equal(
      sha(feasibility),
      "5fd7c112714a311d4a84f07d888f706b320caeb8945383c6c14cf9ab7921a7b7",
    );
    await save(path.join(output, "input-feasibility-hash.json"), {
      sha256: sha(feasibility),
      source: path.join(
        oldRun,
        "index-rerender-feasibility-first12.private.json",
      ),
    });
  }
  const browser = await launchExportBrowser();
  const summaries: unknown[] = [];
  try {
    for (const key of selected) {
      assert(/^(초[3-6]|중[1-3])-[12]$/.test(key));
      const settledRow = settled.find((r) => r.key === key);
      assert.equal(
        settledRow?.status,
        "exported-checks-pending",
        `Combination not settled: ${key}`,
      );
      const source = path.join(oldRun, key),
        folder = path.join(output, key);
      const manifest = await json<OldManifest>(
        path.join(source, "export-manifest.json"),
      );
      assert.deepEqual(
        manifest,
        settledRow,
        "Manifest differs from completed writer summary",
      );
      const raw = await readFile(path.join(source, "exchange.private.json"));
      assert.equal(sha(raw), manifest.fixtureSha256);
      const exchange = JSON.parse(raw.toString("utf8")) as TextbookExchange;
      const plan = manifest.publisherPlan,
        files: FileOrigin[] = [];
      const studentBase = createTextbookRenderModel(exchange, "student");
      const phases = {} as Record<Variant, Phases>,
        finals = {} as Record<Variant, Placement[]>;
      for (const variant of ["student", "answers"] as const) {
        phases[variant] = await json<Phases>(
          path.join(source, `${variant}-reference-phases.json`),
        );
        assert.deepEqual(phases[variant].publisherPlan, plan);
        assert.equal(phases[variant].phases.length, 2 * plan.length);
        finals[variant] = [];
        for (const [index] of plan.entries()) {
          const final = await json<Placement>(
            path.join(source, `${variant}-chunk-${index}-placements.json`),
          );
          const reserved = await json<Placement>(
            path.join(
              source,
              "reserve",
              `${variant}-chunk-${index}-placements.json`,
            ),
          );
          const finalPhase = phases[variant].phases.filter(
            (p) => p.referencePhase === "final" && p.chunkIndex === index,
          );
          const reservePhase = phases[variant].phases.filter(
            (p) => p.referencePhase === "reserve" && p.chunkIndex === index,
          );
          assert.equal(finalPhase.length, 1);
          assert.equal(reservePhase.length, 1);
          assert.deepEqual(final.pages, finalPhase[0].pages);
          assert.deepEqual(reserved.pages, reservePhase[0].pages);
          unchanged(reserved.pages, final.pages);
          assert.equal(
            sha(
              await readFile(
                path.join(source, `${variant}-chunk-${index}.pdf`),
              ),
            ),
            final.artifactHash,
          );
          assert.equal(final.artifactHash, finalPhase[0].pdfSha256);
          assert.equal(
            sha(
              await readFile(
                path.join(source, "reserve", `${variant}-chunk-${index}.pdf`),
              ),
            ),
            reservePhase[0].pdfSha256,
          );
          finals[variant].push(final);
        }
        const exported = manifest.exports.find((e) => e.variant === variant)!;
        assert.equal(
          sha(await readFile(path.join(source, `${variant}.pdf`))),
          exported.pdfSha256,
        );
      }
      const pageMap = plan.flatMap((indices, i) =>
        studentPageMapFromPages(
          indices.map((n) => studentBase.sections[n]),
          finals.student[i].pages,
          exchange.config,
        ),
      );
      const affected = plan
        .map((indices, index) => ({ index, indices }))
        .filter(({ indices }) =>
          indices.some((i) =>
            studentBase.sections[i].blocks.some(
              (b) =>
                b.semantic?.activity === "conceptIndex" &&
                b.semantic.node?.kind === "references",
            ),
          ),
        );
      assert(affected.length > 0, "No actual concept-index chunk discovered");
      if (!verifyOnly) {
        await mkdir(folder);
        for (const name of [
          "exchange.private.json",
          "publish-reservation.json",
          "creation-manifest.json",
          "creation-result.private.json",
        ])
          await exactCopy(
            path.join(source, name),
            path.join(folder, name),
            files,
          );
        for (const asset of exchange.assets) {
          const file = path.basename(asset.packagePath);
          assert.equal(
            sha(await readFile(path.join(source, "assets", file))),
            asset.sha256,
          );
          await exactCopy(
            path.join(source, "assets", file),
            path.join(folder, "assets", file),
            files,
          );
        }
        await exactCopy(
          path.join(source, "export-manifest.json"),
          path.join(folder, "original-export-manifest.json"),
          files,
        );
      }
      const readAsset = async (id: string) => {
        const asset = exchange.assets.find((a) => a.assetId === id);
        assert(asset);
        const bytes = await readFile(
          path.join(source, "assets", path.basename(asset.packagePath)),
        );
        assert.equal(sha(bytes), asset.sha256);
        return bytes;
      };
      const exports: unknown[] = [];
      for (const variant of ["student", "answers"] as const) {
        const referencePages = phases[variant].phases
          .filter((p) => p.referencePhase === "reserve")
          .sort((a, b) => a.chunkIndex - b.chunkIndex)
          .flatMap((p) => p.pages);
        const model = withTextbookPageReferences(
          createTextbookRenderModel({ ...exchange, pageMap }, variant),
          referencePages,
        );
        const oldModel = (
          await json<{ projectedModel: typeof model }>(
            path.join(source, `${variant}-witness.json`),
          )
        ).projectedModel;
        const proof = model.sections
          .flatMap((s) => s.blocks)
          .filter(
            (b) =>
              b.semantic?.activity === "conceptIndex" &&
              b.semantic.node?.kind === "references",
          )
          .flatMap((b) => {
            const node = b.semantic!.node;
            assert.equal(node?.kind, "references");
            if (node?.kind !== "references") return [];
            const previous = oldModel.sections
              .flatMap((s) => s.blocks)
              .find((o) => o.id === b.id)?.semantic?.node;
            return node.entries.map((entry) => ({
              blockId: b.id,
              ...entry,
              oldPageLabel:
                previous?.kind === "references"
                  ? previous.entries.find((e) => e.key === entry.key)?.pageLabel
                  : null,
            }));
          });
        await save(path.join(folder, `${variant}-index-target-proof.json`), {
          variant,
          rendererGitCommit: authority.rendererGitCommit,
          exchangeSha256: sha(raw),
          affectedChunks: affected,
          entries: proof,
        });
        const changed = new Map<number, TextbookChunkResult>();
        if (!verifyOnly)
          for (const { index, indices } of affected) {
            const reserve = phases[variant].phases.find(
              (p) => p.referencePhase === "reserve" && p.chunkIndex === index,
            )!;
            console.info(
              JSON.stringify({
                key,
                variant,
                chunk: index,
                stage: "rerender-index",
              }),
            );
            const chunk = await renderTextbookChunk({
              exchange: { ...exchange, pageMap },
              officialOrigin: oldAuthority.authorizedOrigin,
              readAsset,
              sectionIndices: indices,
              firstPhysicalPageIndex: reserve.firstPhysicalPageIndex,
              variant,
              browser,
              mode: "publish",
              maxPages: 32,
              referencePages,
              reservedPages: reserve.pages,
              ...(variant === "answers"
                ? { studentPages: finals.student[index].pages }
                : {}),
            });
            unchanged(reserve.pages, chunk.pages);
            unchanged(finals[variant][index].pages, chunk.pages);
            assert.equal(
              chunk.nextPhysicalPageIndex,
              reserve.nextPhysicalPageIndex,
            );
            await writeFile(
              path.join(folder, `${variant}-chunk-${index}.html`),
              chunk.html,
              { flag: "wx" },
            );
            await writeFile(
              path.join(folder, `${variant}-chunk-${index}.pdf`),
              chunk.pdf,
              { flag: "wx" },
            );
            await save(
              path.join(folder, `${variant}-chunk-${index}-placements.json`),
              {
                rendererGitCommit: authority.rendererGitCommit,
                referencePhase: "final",
                artifactHash: chunk.artifactHash,
                pages: chunk.pages,
                qrPlacements: chunk.qrPlacements,
                source: "fresh-production-final-reference-rerender",
              },
            );
            changed.set(index, chunk);
            console.info(
              JSON.stringify({
                key,
                variant,
                chunk: index,
                stage: "target-proof",
                entries: proof.map((e) => ({
                  key: e.key,
                  before: e.oldPageLabel,
                  after: e.pageLabel,
                })),
                placementsUnchanged: true,
              }),
            );
          }
        const chunks: Pick<
          TextbookChunkResult,
          "pdf" | "pages" | "qrPlacements" | "artifactHash"
        >[] = [];
        const dom: Awaited<ReturnType<typeof captureDomWitness>> = [];
        const mixedPhases: Phase[] = [];
        for (const [index] of plan.entries()) {
          if (!verifyOnly) {
            for (const extension of ["pdf", "html", "placements.json"]) {
              const name = `${variant}-chunk-${index}${extension === "placements.json" ? "-" : "."}${extension}`;
              const reserveDestination = path.join(folder, "reserve", name);
              await mkdir(path.dirname(reserveDestination), {
                recursive: true,
              });
              if (extension === "html")
                await htmlCopy(
                  path.join(source, "reserve", name),
                  reserveDestination,
                  files,
                );
              else
                await exactCopy(
                  path.join(source, "reserve", name),
                  reserveDestination,
                  files,
                );
              if (!changed.has(index)) {
                if (extension === "html")
                  await htmlCopy(
                    path.join(source, name),
                    path.join(folder, name),
                    files,
                  );
                else
                  await exactCopy(
                    path.join(source, name),
                    path.join(folder, name),
                    files,
                  );
              }
            }
          }
          const placement = await json<Placement>(
            path.join(folder, `${variant}-chunk-${index}-placements.json`),
          );
          unchanged(finals[variant][index].pages, placement.pages);
          const pdf = await readFile(
            path.join(folder, `${variant}-chunk-${index}.pdf`),
          );
          assert.equal(sha(pdf), placement.artifactHash);
          chunks.push({ pdf, ...placement });
          for (const referencePhase of ["reserve", "final"] as const) {
            const oldPhase = phases[variant].phases.find(
              (p) =>
                p.referencePhase === referencePhase && p.chunkIndex === index,
            )!;
            mixedPhases.push({
              ...oldPhase,
              ...(referencePhase === "final"
                ? { pdfSha256: placement.artifactHash, pages: placement.pages }
                : {}),
              origin:
                referencePhase === "final" &&
                affected.some((c) => c.index === index)
                  ? {
                      rendererGitCommit: authority.rendererGitCommit,
                      kind: "rerendered",
                    }
                  : {
                      rendererGitCommit: manifest.rendererGitCommit,
                      kind: "copied",
                      oldRun,
                    },
            });
          }
          const page = await browser.newPage();
          try {
            await loadFinalDom(
              page,
              await readFinalHtml(
                path.join(folder, `${variant}-chunk-${index}.html`),
              ),
              path.join(folder, `${variant}-chunk-${index}-dom-resources.json`),
            );
            dom.push(
              ...(await captureDomWitness(page, model, placement.pages)),
            );
          } finally {
            await page.close();
          }
        }
        let pdfSha256: string, pageCount: number;
        if (!verifyOnly) {
          const merged = await mergeTextbookPdfs(
            chunks,
            128 * 1024 * 1024,
            browser,
          );
          await writeFile(path.join(folder, `${variant}.pdf`), merged.pdf, {
            flag: "wx",
          });
          pdfSha256 = sha(merged.pdf);
          pageCount = merged.pageCount;
          await save(path.join(folder, `${variant}-reference-phases.json`), {
            version: 2,
            rendererGitCommit: authority.rendererGitCommit,
            mode: "publish",
            publisherPlan: plan,
            finalLayoutMatchesReserved: true,
            mixedOrigin: true,
            phases: mixedPhases,
          });
        } else {
          pdfSha256 = sha(await readFile(path.join(folder, `${variant}.pdf`)));
          pageCount = chunks.reduce((n, c) => n + c.pages.length, 0);
        }
        normalizeRowPages(dom);
        const pages = chunks.flatMap((c) => c.pages),
          expectedRows = expectedRenderedRows(model),
          coverage = computedCoverage(dom, pages, expectedRows, false);
        await save(path.join(folder, `${variant}-witness.json`), {
          version: 2,
          variant,
          pdfSha256,
          fixtureSha256: sha(raw),
          requiredFonts: ["NotoSansKR|Nanum"],
          requireEmbeddedFonts: true,
          pages: dom.map((p, i) => ({ ...p, pdfPageIndex: i + 1 })),
          coverage,
          coverageEvidence: {
            pdfSha256,
            expectedPages: pageCount,
            observedPages: dom.length,
            expectedPlacedBlocks: pages.reduce(
              (n, p) => n + p.blocks.length,
              0,
            ),
            observedBlocks: dom.reduce(
              (n, p) => n + p.accounting.actualBlocks,
              0,
            ),
          },
          expectedRows,
          projectedModel: model,
          publicExampleItemIds: exchange.items
            .filter((i) => i.learningStage === "worked-example")
            .map((i) => i.itemId),
          disabledActivities: Object.entries(manifest.input.components)
            .filter(([, on]) => !on)
            .map(([k]) => k),
          provenance: {
            mixedOrigin: true,
            originalRendererGitCommit: manifest.rendererGitCommit,
            correctedRendererGitCommit: authority.rendererGitCommit,
            qaCommit: qaCommit || null,
            qaCodeHashes: Object.fromEntries(qaFiles.map((f) => [f, code[f]])),
          },
        });
        const touchedPages = new Set(
          affected.flatMap(({ index }) =>
            finals[variant][index].pages.map(
              (p) =>
                pages.findIndex(
                  (q) => q.physicalPageIndex === p.physicalPageIndex,
                ) + 1,
            ),
          ),
        );
        console.info(
          execFileSync(
            "python",
            [
              "-B",
              "-c",
              imageEvidencePython,
              source,
              folder,
              variant,
              JSON.stringify([...touchedPages]),
            ],
            { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 },
          ).trim(),
        );
        exports.push({
          variant,
          pdfSha256,
          pageCount,
          chunks: chunks.length,
          coverage,
        });
      }
      if (!verifyOnly) {
        await save(path.join(folder, "copy-provenance.json"), {
          version: 1,
          oldRun,
          files,
        });
        await save(path.join(folder, "export-manifest.json"), {
          ...manifest,
          status: "corrected-final-references-QA-pending",
          rendererGitCommit: authority.rendererGitCommit,
          mixedOrigin: true,
          originalRendererGitCommit: manifest.rendererGitCommit,
          originalManifest: "original-export-manifest.json",
          sourceExchangePreserved: true,
          correctedChunks: affected,
          exports,
          oldVerdict: "FAILED-preserved",
        });
      }
      const row = {
        key,
        status: verifyOnly
          ? "corrected-QA-recaptured"
          : "corrected-final-references-QA-pending",
        exports,
        affectedChunks: affected,
      };
      summaries.push(row);
      await save(path.join(output, "correction-summary.json"), summaries);
      await save(path.join(output, "automatic-summary.json"), summaries);
      console.info(
        JSON.stringify({
          key,
          stage: "complete",
          qaCommit: qaCommit || "pending",
          affectedChunks: affected.map((c) => c.index),
        }),
      );
    }
    assert.deepEqual(
      await codeHashes(),
      code,
      "Runtime changed during evidence collection",
    );
    if (verifyOnly) {
      console.info(
        execFileSync(
          "python",
          [
            "-B",
            "scripts/qa/textbook/recovery/verify_exports.py",
            output,
            "--only",
            selected.join(","),
          ],
          { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
        ).trim(),
      );
      const result = await json<{ key: string; status: string }[]>(
        path.join(output, "automatic-verification.json"),
      );
      await save(path.join(output, "strict-QA-authority.json"), {
        qaCommit,
        currentCommit: rendererGitCommit,
        code,
        harnessSha256,
        passed: result.every((r) => r.status === "passed"),
        keys: result.map((r) => r.key),
        checkedAtUtc: new Date().toISOString(),
      });
      assert.equal(result.length, selected.length);
      assert(
        result.every((r) => r.status === "passed"),
        "Corrected strict geometry/reference check FAILED; preserved fresh failure evidence",
      );
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
