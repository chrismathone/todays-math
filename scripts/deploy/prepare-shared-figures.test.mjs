import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { manifestSha256, sha256 } from "../storage/shared-figures.mjs";
import {
  excludeVerifiedFigures,
  prepareSharedFigures,
} from "./prepare-shared-figures.mjs";

const base =
  "https://example.supabase.co/storage/v1/object/public/shared-figures";
async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "shared-figure-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const bytes = Buffer.from("fixture-png");
  const hash = sha256(bytes);
  const manifest = {
    schemaVersion: 1,
    sourceCommit: "a".repeat(40),
    entries: {
      "/figures/one.png": {
        objectPath: `v1/${hash}/figures/one.png`,
        mimeType: "image/png",
        size: bytes.length,
        sha256: hash,
      },
    },
  };
  const receipt = {
    schemaVersion: 1,
    status: "verified",
    sourceCommit: manifest.sourceCommit,
    manifestSha256: manifestSha256(manifest),
    count: 1,
    totalBytes: bytes.length,
    target: {
      supabaseUrl: "https://example.supabase.co",
      bucket: "shared-figures",
    },
    publicBaseUrl: base,
    verifiedAt: "2026-09-15T00:00:00Z",
  };
  for (const dir of [
    "public/figures",
    "public/figures-svg",
    "public/brand",
    "src/config",
  ])
    await mkdir(path.join(root, dir), { recursive: true });
  await writeFile(path.join(root, "public/figures/one.png"), bytes);
  await writeFile(path.join(root, "public/brand/keep.png"), "brand");
  await writeFile(
    path.join(root, "src/config/shared-figures.manifest.json"),
    JSON.stringify(manifest),
  );
  const receiptPath = path.join(root, "src/config/shared-figures.receipt.json");
  await writeFile(receiptPath, JSON.stringify(receipt));
  return {
    root,
    bytes,
    manifest,
    receipt,
    receiptPath,
    image: path.join(root, "public/figures/one.png"),
  };
}

test("default builds retain source assets, including inherited Vercel flags", async (t) => {
  const f = await fixture(t);
  assert.deepEqual(
    await prepareSharedFigures({
      repo: f.root,
      env: { VERCEL: "1", SHARED_FIGURE_CDN_BASE_URL: base },
    }),
    { status: "local" },
  );
  assert.deepEqual(await readFile(f.image), f.bytes);
  await assert.rejects(
    prepareSharedFigures({
      repo: f.root,
      env: { VERCEL: "1", SHARED_FIGURE_ASSETS_EXTERNALIZED: "1" },
    }),
    /cloud build checkout/,
  );
  assert.deepEqual(await readFile(f.image), f.bytes);
});

test("CDN target or verification mismatch prevents any exclusion", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    excludeVerifiedFigures(f.root, "https://other.example/bucket"),
    /receipt/,
  );
  for (const change of [
    { status: "dry-run" },
    { manifestSha256: "b".repeat(64) },
    { count: 2 },
    { totalBytes: 0 },
  ]) {
    await writeFile(f.receiptPath, JSON.stringify({ ...f.receipt, ...change }));
    await assert.rejects(excludeVerifiedFigures(f.root, base), /receipt/);
    assert.deepEqual(await readFile(f.image), f.bytes);
  }
});

test("unverified extra files and changed bytes prevent partial exclusion", async (t) => {
  const f = await fixture(t);
  const extra = path.join(f.root, "public/figures/extra.png");
  await writeFile(extra, "new unverified figure");
  await assert.rejects(excludeVerifiedFigures(f.root, base), /inventory/);
  assert.deepEqual(await readFile(f.image), f.bytes);
  await rm(extra);
  await writeFile(f.image, "wrong");
  await assert.rejects(excludeVerifiedFigures(f.root, base), /bytes/);
  assert.equal(await readFile(f.image, "utf8"), "wrong");
});

test("verified exclusion removes only managed bytes, preserving unrelated assets", async (t) => {
  const f = await fixture(t);
  assert.deepEqual(await excludeVerifiedFigures(f.root, base), {
    status: "external",
    count: 1,
    totalBytes: f.bytes.length,
  });
  await assert.rejects(readFile(f.image), { code: "ENOENT" });
  assert.equal(
    await readFile(path.join(f.root, "public/brand/keep.png"), "utf8"),
    "brand",
  );
  assert.deepEqual(
    JSON.parse(await readFile(f.receiptPath, "utf8")),
    f.receipt,
  );
});
