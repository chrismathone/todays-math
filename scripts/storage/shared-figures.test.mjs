import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  lstat,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import {
  buildManifest,
  assertManifestSource,
  canonicalManifest,
  manifestSha256,
  publicObjectUrl,
  validateManifest,
  validateOriginalPath,
  validateTarget,
} from "./shared-figures.mjs";
import { transferFigures } from "./transfer.mjs";

const cli = fileURLToPath(new URL("./shared-figures-cli.mjs", import.meta.url));
const target = {
  supabaseUrl: "https://example.supabase.co",
  bucket: "shared-figures",
};
const key = "TEST_SERVICE_ROLE_SECRET";
function git(repo, ...args) {
  return execFileSync("git", ["-C", repo, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}
async function fixture(t) {
  const tmpRoot = path.resolve(os.tmpdir());
  const repo = await mkdtemp(path.join(tmpRoot, "shared-figures-test-"));
  t.after(async () => {
    // Delete only this test's newly created, resolved temp directory.
    assert.equal(path.dirname(path.resolve(repo)), tmpRoot);
    assert.ok(path.basename(repo).startsWith("shared-figures-test-"));
    await rm(repo, { recursive: true, force: true });
  });
  git(repo, "init", "-q");
  git(repo, "config", "user.name", "Storage Test");
  git(repo, "config", "user.email", "storage-test@example.invalid");
  git(repo, "config", "core.autocrlf", "false");
  git(repo, "config", "core.hooksPath", path.join(repo, "no-hooks"));
  await mkdir(path.join(repo, "public/figures"), { recursive: true });
  await mkdir(path.join(repo, "public/figures-svg"), { recursive: true });
  const images = new Map([
    ["/figures/a.png", Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])],
    ["/figures/b.jpeg", Buffer.from([255, 216, 255, 1, 2, 255, 217])],
    [
      "/figures-svg/a.svg",
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1"/></svg>\n',
      ),
    ],
  ]);
  for (const [name, bytes] of images)
    await writeFile(path.join(repo, "public", name.slice(1)), bytes);
  git(repo, "add", "public");
  git(repo, "commit", "-qm", "figure fixture");
  return { repo, images, manifest: await buildManifest(repo) };
}
function remoteStore(
  manifest,
  images,
  { prefill = false, behavior = async () => undefined, delay = 0 } = {},
) {
  const objects = new Map();
  const requests = [];
  let active = 0;
  let maxActive = 0;
  if (prefill)
    for (const [name, entry] of Object.entries(manifest.entries))
      objects.set(entry.objectPath, {
        bytes: images.get(name),
        mimeType: entry.mimeType,
      });
  const fetchImpl = async (url, init) => {
    assert.equal(init.redirect, "error");
    requests.push({ url, method: init.method });
    active++;
    maxActive = Math.max(maxActive, active);
    try {
      if (delay) await sleep(delay);
      const objectPath = decodeURIComponent(
        new URL(url).pathname.split(`${target.bucket}/`)[1],
      );
      const overridden = await behavior({
        url,
        init,
        objectPath,
        objects,
        requests,
      });
      if (overridden) return overridden;
      if (init.method === "GET") {
        assert.equal(
          init.headers?.Authorization,
          undefined,
          "public verification must be anonymous",
        );
        assert.equal(init.headers?.apikey, undefined);
        const object = objects.get(objectPath);
        return object
          ? new Response(object.bytes, {
              headers: { "content-type": object.mimeType },
            })
          : new Response(JSON.stringify({ code: "NoSuchKey" }), {
              status: 404,
            });
      }
      assert.equal(
        init.method,
        "POST",
        "only insert and public download are allowed",
      );
      assert.equal(init.headers["x-upsert"], "false");
      assert.equal(init.headers.Authorization, `Bearer ${key}`);
      assert.equal(init.headers.apikey, key);
      assert.match(init.headers["Cache-Control"], /immutable/);
      if (objects.has(objectPath))
        return new Response(JSON.stringify({ code: "ResourceAlreadyExists" }), {
          status: 409,
        });
      objects.set(objectPath, {
        bytes: Buffer.from(init.body),
        mimeType: init.headers["Content-Type"],
      });
      return new Response("{}", { status: 200 });
    } finally {
      active--;
    }
  };
  return {
    objects,
    requests,
    fetchImpl,
    get maxActive() {
      return maxActive;
    },
  };
}
async function run(f, remote, extra = {}) {
  return transferFigures({
    repo: f.repo,
    manifest: f.manifest,
    target,
    mode: "upload",
    serviceRoleKey: key,
    fetchImpl: remote.fetchImpl,
    wait: async () => {},
    ...extra,
  });
}

test("manifest is deterministic, complete, and restricted to tracked public images", async (t) => {
  const f = await fixture(t);
  await writeFile(
    path.join(f.repo, "public/figures/untracked.png"),
    "untracked",
  );
  await writeFile(path.join(f.repo, "private.txt"), "private");
  git(f.repo, "add", "private.txt");
  assert.equal(
    canonicalManifest(await buildManifest(f.repo)),
    canonicalManifest(f.manifest),
  );
  assert.equal(Object.keys(f.manifest.entries).length, 3);
  const entry = f.manifest.entries["/figures/a.png"];
  assert.equal(entry.objectPath, `v1/${entry.sha256}/figures/a.png`);
  assert.equal(entry.size, f.images.get("/figures/a.png").length);
  assert.equal(
    publicObjectUrl(target, entry.objectPath),
    `${target.supabaseUrl}/storage/v1/object/public/shared-figures/${entry.objectPath}`,
  );
  const reordered = {
    ...f.manifest,
    entries: Object.fromEntries(Object.entries(f.manifest.entries).reverse()),
  };
  assert.equal(manifestSha256(reordered), manifestSha256(f.manifest));
});

test("rejects traversal, encoded paths, private roots, bad hashes, keys, sizes, MIME and empty manifests", async (t) => {
  const f = await fixture(t);
  for (const unsafe of [
    "/figures/../a.png",
    "/figures//a.png",
    "/figures/./a.png",
    "/figures/a.png?x",
    "/figures/%2e%2e/a.png",
    "/figures/a\\b.png",
    "/figures/a.png#x",
    "/figures-backup/a.png",
    "/private/a.png",
    "/figures/.env",
  ]) {
    assert.throws(() => validateOriginalPath(unsafe));
  }
  for (const field of [
    { sha256: "A".repeat(64) },
    { size: -1 },
    { mimeType: "text/html" },
    { objectPath: "unrelated/a.png" },
  ]) {
    const altered = structuredClone(f.manifest);
    Object.assign(altered.entries["/figures/a.png"], field);
    assert.throws(() => validateManifest(altered));
  }
  assert.throws(() => validateManifest({ ...f.manifest, entries: {} }));
  assert.throws(() =>
    publicObjectUrl(target, `v1/${"a".repeat(64)}/figures/../a.png`),
  );
});

test("rejects credential-bearing, non-HTTPS, non-origin targets and invalid buckets", () => {
  for (const url of [
    "http://example.com",
    "https://secret@example.com",
    "https://example.com/path",
    "https://example.com?secret=1",
    "https://example.com#secret",
  ])
    assert.throws(() => validateTarget(url, target.bucket));
  for (const bucket of ["../other", "/other", "other?token", "", "a/b"])
    assert.throws(() => validateTarget(target.supabaseUrl, bucket));
});

test("dirty, staged, missing, subset, and skip-worktree modified content fail before any fetch", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const remote = {
    fetchImpl: async () => {
      calls++;
      throw new Error("must not fetch");
    },
  };
  const file = path.join(f.repo, "public/figures/a.png");
  await writeFile(file, "changed");
  await assert.rejects(run(f, remote), /Git identity|Working figure/);
  git(f.repo, "add", "public");
  await assert.rejects(run(f, remote), /Git identity/);
  git(f.repo, "reset", "--hard", "HEAD");
  git(f.repo, "update-index", "--skip-worktree", "public/figures/a.png");
  await writeFile(file, "changed despite skip-worktree");
  await assert.rejects(run(f, remote), /Working figure bytes/);
  git(f.repo, "update-index", "--no-skip-worktree", "public/figures/a.png");
  git(f.repo, "reset", "--hard", "HEAD");
  const subset = structuredClone(f.manifest);
  delete subset.entries["/figures/b.jpeg"];
  await assert.rejects(run(f, remote, { manifest: subset }), /exactly cover/);
  await rm(file);
  await assert.rejects(run(f, remote));
  assert.equal(calls, 0);
});

test("ancestor source revision is accepted only for identical complete figure trees", async (t) => {
  const f = await fixture(t);
  git(
    f.repo,
    "commit",
    "--allow-empty",
    "-qm",
    "unrelated implementation commit",
  );
  assert.equal(
    await assertManifestSource(f.repo, f.manifest),
    git(f.repo, "rev-parse", "HEAD").trim(),
  );
  await writeFile(path.join(f.repo, "public/figures/new.png"), "new");
  git(f.repo, "add", "public");
  git(f.repo, "commit", "-qm", "added figure");
  await assert.rejects(
    assertManifestSource(f.repo, f.manifest),
    /Tracked figure set differs/,
  );
});

test("clean CRLF SVG checkout produces Git-canonical LF manifest and upload bytes", async (t) => {
  const f = await fixture(t);
  git(f.repo, "config", "core.autocrlf", "true");
  await writeFile(
    path.join(f.repo, "public/figures-svg/a.svg"),
    f.images.get("/figures-svg/a.svg").toString().replace(/\n/g, "\r\n"),
  );
  assert.equal(
    canonicalManifest(await buildManifest(f.repo)),
    canonicalManifest(f.manifest),
  );
  const remote = remoteStore(f.manifest, f.images);
  assert.equal((await run(f, remote)).status, "verified");
  assert.deepEqual(
    remote.objects.get(f.manifest.entries["/figures-svg/a.svg"].objectPath)
      .bytes,
    f.images.get("/figures-svg/a.svg"),
  );
});

test("rejects Git-tracked symlinks and directory junctions", async (t) => {
  const f = await fixture(t);
  const blob = git(f.repo, "hash-object", "-w", "--stdin");
  git(
    f.repo,
    "update-index",
    "--add",
    "--cacheinfo",
    `120000,${blob.trim()},public/figures/link.png`,
  );
  git(f.repo, "commit", "-qm", "symlink entry");
  await assert.rejects(buildManifest(f.repo));
  git(f.repo, "reset", "--hard", "HEAD~1");
  const outside = path.join(f.repo, "outside");
  await mkdir(outside);
  await writeFile(
    path.join(outside, "a.svg"),
    f.images.get("/figures-svg/a.svg"),
  );
  await rm(path.join(f.repo, "public/figures-svg"), { recursive: true });
  await symlink(
    outside,
    path.join(f.repo, "public/figures-svg"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    buildManifest(f.repo),
    /regular files and directories|Git identity/,
  );
});

test("dry-run performs zero network calls even when credentials and a target are supplied", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const result = await run(
    f,
    {
      fetchImpl: async () => {
        calls++;
        throw new Error("network forbidden");
      },
    },
    { mode: "dry-run" },
  );
  assert.equal(result.status, "dry-run");
  assert.equal(result.count, 3);
  assert.equal(calls, 0);
  assert.ok(!JSON.stringify(result).includes(key));
});

test("upload verifies every object, binds receipt, respects concurrency, and resumes with no POSTs", async (t) => {
  const f = await fixture(t);
  const remote = remoteStore(f.manifest, f.images, { delay: 5 });
  const receipt = await run(f, remote, { concurrency: 2 });
  assert.equal(receipt.status, "verified");
  assert.equal(receipt.manifestSha256, manifestSha256(f.manifest));
  assert.deepEqual(receipt.target, target);
  assert.equal(receipt.count, 3);
  assert.equal(receipt.uploaded, 3);
  assert.equal(
    receipt.totalBytes,
    [...f.images.values()].reduce((sum, bytes) => sum + bytes.length, 0),
  );
  assert.equal(remote.maxActive, 2);
  assert.equal(remote.requests.filter((r) => r.method === "POST").length, 3);
  remote.requests.length = 0;
  const resumed = await run(f, remote);
  assert.equal(resumed.uploaded, 0);
  assert.equal(resumed.reused, 3);
  assert.equal(remote.requests.length, 3);
  assert.ok(remote.requests.every((r) => r.method === "GET"));
  assert.ok(!JSON.stringify(receipt).includes(key));
});

test("public remote hash and MIME mismatches are fatal and never overwritten", async (t) => {
  const f = await fixture(t);
  for (const mismatch of ["hash", "mime", "extra-bytes"]) {
    const remote = remoteStore(f.manifest, f.images, { prefill: true });
    const object = remote.objects.get(
      f.manifest.entries["/figures/a.png"].objectPath,
    );
    if (mismatch === "hash") object.bytes = Buffer.alloc(object.bytes.length);
    if (mismatch === "mime") object.mimeType = "text/html";
    if (mismatch === "extra-bytes")
      object.bytes = Buffer.alloc(object.bytes.length + 1);
    await assert.rejects(run(f, remote, { concurrency: 1 }), /Public figure/);
    assert.ok(remote.requests.every((r) => r.method === "GET"));
  }
});

test("partial failed upload is resumable and unrelated objects survive untouched", async (t) => {
  const f = await fixture(t);
  let fail = true;
  const remote = remoteStore(f.manifest, f.images, {
    behavior: async ({ init, requests }) => {
      if (
        fail &&
        init.method === "POST" &&
        requests.filter((r) => r.method === "POST").length === 2
      )
        return new Response(key, { status: 403 });
    },
  });
  remote.objects.set("unrelated/keep.png", {
    bytes: Buffer.from("keep"),
    mimeType: "image/png",
  });
  await assert.rejects(
    run(f, remote, { concurrency: 1 }),
    (error) => /HTTP 403/.test(error.message) && !error.message.includes(key),
  );
  assert.equal(remote.objects.size, 2);
  fail = false;
  remote.requests.length = 0;
  const receipt = await run(f, remote, { concurrency: 1 });
  assert.equal(receipt.reused, 1);
  assert.equal(receipt.uploaded, 2);
  assert.equal(
    remote.objects.get("unrelated/keep.png").bytes.toString(),
    "keep",
  );
});

test("lost successful POST response resumes by public GET; transient failures are retried", async (t) => {
  const f = await fixture(t);
  let lost = false;
  let throttle = true;
  const remote = remoteStore(f.manifest, f.images, {
    behavior: async ({ init, objectPath, objects }) => {
      if (throttle) {
        throttle = false;
        return new Response("busy", { status: 429 });
      }
      if (init.method === "POST" && !lost) {
        lost = true;
        objects.set(objectPath, {
          bytes: Buffer.from(init.body),
          mimeType: init.headers["Content-Type"],
        });
        throw new Error(`transport error containing ${key}`);
      }
    },
  });
  const backoffs = [];
  const receipt = await run(f, remote, {
    concurrency: 1,
    wait: async (ms) => backoffs.push(ms),
  });
  assert.equal(receipt.status, "verified");
  assert.deepEqual(backoffs, [1000, 2000]);
  assert.equal(remote.requests.filter((r) => r.method === "POST").length, 3);
});

test("duplicate create is accepted only after downloaded bytes match", async (t) => {
  const f = await fixture(t);
  const remote = remoteStore(f.manifest, f.images, {
    behavior: async ({ init, objectPath, objects }) => {
      if (init.method === "POST") {
        objects.set(objectPath, {
          bytes: Buffer.from(init.body),
          mimeType: init.headers["Content-Type"],
        });
        return new Response(JSON.stringify({ error: "Duplicate" }), {
          status: 400,
        });
      }
    },
  });
  assert.equal((await run(f, remote)).status, "verified");
});

test("verify makes public GETs only and rejects missing/private-bucket responses", async (t) => {
  const f = await fixture(t);
  const remote = remoteStore(f.manifest, f.images, { prefill: true });
  assert.equal(
    (await run(f, remote, { mode: "verify", serviceRoleKey: undefined })).count,
    3,
  );
  assert.ok(remote.requests.every((r) => r.method === "GET"));
  remote.objects.clear();
  await assert.rejects(
    run(f, remote, { mode: "verify", retries: 0 }),
    /missing/,
  );
  const privateBucket = remoteStore(f.manifest, f.images, {
    behavior: async () =>
      new Response(JSON.stringify({ code: "NoSuchBucket" }), { status: 404 }),
  });
  await assert.rejects(run(f, privateBucket), /HTTP 404/);
  assert.ok(privateBucket.requests.every((r) => r.method === "GET"));
});

test("legacy HTTP 400 Object not found allows insert, unrelated HTTP 400 does not", async (t) => {
  const f = await fixture(t);
  const remote = remoteStore(f.manifest, f.images, {
    behavior: async ({ init, objects, objectPath }) => {
      if (init.method === "GET" && !objects.has(objectPath))
        return new Response(
          JSON.stringify({
            statusCode: "404",
            error: "not_found",
            message: "Object not found",
          }),
          { status: 400 },
        );
    },
  });
  assert.equal((await run(f, remote)).count, 3);
  const rejected = remoteStore(f.manifest, f.images, {
    behavior: async () =>
      new Response(JSON.stringify({ error: "Unauthorized", message: key }), {
        status: 400,
      }),
  });
  await assert.rejects(run(f, rejected), /HTTP 400/);
  assert.ok(rejected.requests.every((r) => r.method === "GET"));
});

test("retry exhaustion and redirects never issue a receipt or leak transport details", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  await assert.rejects(
    run(
      f,
      {
        fetchImpl: async () => {
          calls++;
          throw new Error(`https://${key}@example.com`);
        },
      },
      { concurrency: 1, retries: 2 },
    ),
    (error) =>
      /request failed/.test(error.message) && !error.message.includes(key),
  );
  assert.equal(calls, 3);
  const redirect = remoteStore(f.manifest, f.images, {
    behavior: async () =>
      new Response(null, {
        status: 302,
        headers: { location: `https://${key}@example.invalid` },
      }),
  });
  await assert.rejects(run(f, redirect), /HTTP 302/);
  assert.ok(redirect.requests.every((r) => r.method === "GET"));
});

test("source mutation during transfer prevents success receipt", async (t) => {
  const f = await fixture(t);
  const remote = remoteStore(f.manifest, f.images, { prefill: true });
  await assert.rejects(
    run(f, remote, {
      onProgress: () =>
        git(f.repo, "commit", "--allow-empty", "-qm", "concurrent change"),
    }),
    /Git revision changed during transfer/,
  );
});

test("request timeout aborts hanging downloads and exhausts bounded retries", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const remote = {
    fetchImpl: async (_url, init) => {
      calls++;
      return new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new Error(key)), {
          once: true,
        });
      });
    },
  };
  await assert.rejects(
    run(f, remote, { concurrency: 1, timeoutMs: 5, retries: 1 }),
    (error) => /timed out/.test(error.message) && !error.message.includes(key),
  );
  assert.equal(calls, 2);
});

test("CLI defaults to offline dry-run, writes new deterministic manifests, and preserves existing outputs", async (t) => {
  const f = await fixture(t);
  const env = {
    ...process.env,
    SUPABASE_URL: "https://must-not-connect.invalid",
    SUPABASE_SERVICE_ROLE_KEY: key,
  };
  const invoke = (args) =>
    spawnSync(process.execPath, [cli, "--repo", f.repo, ...args], {
      cwd: f.repo,
      env,
      encoding: "utf8",
    });
  const dry = invoke([]);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).status, "dry-run");
  const filename = path.join(f.repo, "manifest.json");
  const made = spawnSync(
    process.execPath,
    [cli, "manifest", "--repo", f.repo, "--out", filename],
    { env, encoding: "utf8" },
  );
  assert.equal(made.status, 0, made.stderr);
  assert.equal(await readFile(filename, "utf8"), canonicalManifest(f.manifest));
  const repeated = spawnSync(
    process.execPath,
    [cli, "manifest", "--repo", f.repo, "--out", filename],
    { env, encoding: "utf8" },
  );
  assert.equal(repeated.status, 1);
  assert.match(repeated.stderr, /already exists/);
  const receipt = path.join(f.repo, "receipt.json");
  const missingKey = spawnSync(
    process.execPath,
    [
      cli,
      "upload",
      "--repo",
      f.repo,
      "--manifest",
      filename,
      "--bucket",
      target.bucket,
      "--receipt",
      receipt,
    ],
    { env: { ...env, SUPABASE_SERVICE_ROLE_KEY: "" }, encoding: "utf8" },
  );
  assert.equal(missingKey.status, 1);
  assert.match(missingKey.stderr, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.ok(!missingKey.stderr.includes(key));
  await assert.rejects(lstat(receipt), { code: "ENOENT" });
});
