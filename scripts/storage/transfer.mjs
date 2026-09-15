import { setTimeout as sleep } from "node:timers/promises";
import { createHash } from "node:crypto";
import {
  MigrationError,
  ensure,
  assertManifestSource,
  manifestSha256,
  publicObjectUrl,
  readVerifiedFigure,
  validateManifest,
  validateTarget,
} from "./shared-figures.mjs";

class RetryableError extends MigrationError {}
function limits(options) {
  const values = { concurrency: 4, retries: 3, timeoutMs: 30000, ...options };
  for (const [name, min, max] of [
    ["concurrency", 1, 16],
    ["retries", 0, 8],
    ["timeoutMs", 1, 120000],
  ]) {
    ensure(
      Number.isInteger(values[name]) &&
        values[name] >= min &&
        values[name] <= max,
      `Invalid ${name} limit.`,
    );
  }
  return values;
}
async function pool(items, concurrency, action) {
  let cursor = 0;
  let failure;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (!failure && cursor < items.length) {
        const item = items[cursor++];
        try {
          await action(item);
        } catch (error) {
          failure ??= error;
        }
      }
    }),
  );
  if (failure) throw failure;
}
async function discard(response) {
  await response.body?.cancel().catch(() => {});
}
async function smallError(response) {
  // Error payloads are classified but never surfaced in logs or receipts.
  const chunks = [];
  let size = 0;
  try {
    for await (const chunk of response.body ?? []) {
      size += chunk.length;
      if (size > 8192) return {};
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return {};
  }
}
async function request(fetchImpl, url, init, timeoutMs, consume) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetchImpl(url, {
        ...init,
        signal: controller.signal,
        redirect: "error",
      });
    } catch {
      throw new RetryableError("Storage request failed or timed out.");
    }
    if (
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500
    ) {
      await discard(response);
      throw new RetryableError(
        `Storage returned retryable HTTP ${response.status}.`,
      );
    }
    return await consume(response);
  } catch (error) {
    if (error instanceof MigrationError) throw error;
    throw new RetryableError("Storage response could not be read.");
  } finally {
    clearTimeout(timeout);
  }
}
async function checkPublic(fetchImpl, target, entry, timeoutMs) {
  return request(
    fetchImpl,
    publicObjectUrl(target, entry.objectPath),
    { method: "GET" },
    timeoutMs,
    async (response) => {
      if (response.status !== 200) {
        const detail = await smallError(response);
        const missing =
          detail.code === "NoSuchKey" ||
          ((detail.error === "not_found" || detail.code === "not_found") &&
            detail.message === "Object not found");
        if ((response.status === 400 || response.status === 404) && missing)
          return false;
        throw new MigrationError(
          `Public figure fetch failed with HTTP ${response.status}.`,
        );
      }
      const mimeType = response.headers
        .get("content-type")
        ?.split(";")[0]
        .trim()
        .toLowerCase();
      if (mimeType !== entry.mimeType) {
        await discard(response);
        throw new MigrationError(
          "Public figure MIME type does not match the manifest.",
        );
      }
      let size = 0;
      const hash = createHash("sha256");
      for await (const chunk of response.body ?? []) {
        size += chunk.length;
        ensure(
          size <= entry.size,
          "Public figure exceeds the manifest byte size.",
        );
        hash.update(chunk);
      }
      ensure(
        size === entry.size && hash.digest("hex") === entry.sha256,
        "Public figure content does not match the manifest SHA256 and size.",
      );
      return true;
    },
  );
}
async function uploadObject(fetchImpl, target, key, entry, bytes, timeoutMs) {
  const url = publicObjectUrl(target, entry.objectPath).replace(
    "/storage/v1/object/public/",
    "/storage/v1/object/",
  );
  await request(
    fetchImpl,
    url,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": entry.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-upsert": "false",
      },
      body: bytes,
    },
    timeoutMs,
    async (response) => {
      if (response.ok) {
        await discard(response);
        return;
      }
      const detail = await smallError(response);
      // A race or lost POST response is recoverable only by a full public GET.
      const duplicate =
        [
          "ResourceAlreadyExists",
          "KeyAlreadyExists",
          "already_exists",
        ].includes(detail.code) ||
        ["Duplicate", "already_exists"].includes(detail.error);
      if ((response.status === 400 || response.status === 409) && duplicate)
        return;
      throw new MigrationError(
        `Figure upload failed with HTTP ${response.status}.`,
      );
    },
  );
}
async function retry(action, retries, wait) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (!(error instanceof RetryableError) || attempt >= retries) throw error;
      await wait(Math.min(1000 * 2 ** attempt, 30000));
    }
  }
}

/** Resume operates at the individual image object level.
 * Public bytes are the checkpoint; no local progress file is trusted.
 * All network use is injectable for hermetic tests. This module has no side effects.
 */
export async function transferFigures({
  repo = process.cwd(),
  manifest,
  target,
  mode = "dry-run",
  serviceRoleKey,
  concurrency,
  retries,
  timeoutMs,
  fetchImpl = globalThis.fetch,
  wait = sleep,
  onProgress = () => {},
}) {
  ensure(
    ["dry-run", "upload", "verify"].includes(mode),
    "Invalid migration mode.",
  );
  const options = limits(
    Object.fromEntries(
      Object.entries({ concurrency, retries, timeoutMs }).filter(
        ([, value]) => value !== undefined,
      ),
    ),
  );
  validateManifest(manifest);
  const verifiedCommit = await assertManifestSource(repo, manifest);
  const digest = manifestSha256(manifest);
  const entries = Object.entries(manifest.entries).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  const totalBytes = entries.reduce((sum, [, entry]) => sum + entry.size, 0);
  if (mode === "dry-run")
    return {
      status: "dry-run",
      manifestSha256: digest,
      sourceCommit: manifest.sourceCommit,
      verifiedCommit,
      count: entries.length,
      totalBytes,
    };
  const normalizedTarget = validateTarget(target?.supabaseUrl, target?.bucket);
  if (mode === "upload")
    ensure(
      typeof serviceRoleKey === "string" &&
        serviceRoleKey.length > 0 &&
        !/[\s\x00-\x1f\x7f]/.test(serviceRoleKey),
      "Upload requires SUPABASE_SERVICE_ROLE_KEY in the environment.",
    );
  let completed = 0;
  let uploaded = 0;
  let reused = 0;
  await pool(entries, options.concurrency, async ([originalPath, entry]) => {
    let posted = false;
    await retry(
      async () => {
        // Recheck every retry. A previous timed-out POST may have succeeded.
        if (
          await checkPublic(
            fetchImpl,
            normalizedTarget,
            entry,
            options.timeoutMs,
          )
        )
          return;
        if (mode === "verify")
          throw new RetryableError("Public figure is missing.");
        const bytes = await readVerifiedFigure(repo, originalPath, entry);
        await uploadObject(
          fetchImpl,
          normalizedTarget,
          serviceRoleKey,
          entry,
          bytes,
          options.timeoutMs,
        );
        posted = true;
        if (
          !(await checkPublic(
            fetchImpl,
            normalizedTarget,
            entry,
            options.timeoutMs,
          ))
        )
          throw new RetryableError(
            "Uploaded figure is not yet publicly readable.",
          );
      },
      options.retries,
      wait,
    );
    if (posted) uploaded++;
    else reused++;
    completed++;
    onProgress({ completed, total: entries.length, uploaded, reused });
  });
  // Recheck all local bytes and the complete Git set before issuing proof.
  ensure(
    (await assertManifestSource(repo, manifest)) === verifiedCommit,
    "Git revision changed during transfer; no success receipt was issued.",
  );
  return {
    schemaVersion: 1,
    status: "verified",
    manifestSha256: digest,
    sourceCommit: manifest.sourceCommit,
    verifiedCommit,
    target: normalizedTarget,
    publicBaseUrl: `${normalizedTarget.supabaseUrl}/storage/v1/object/public/${normalizedTarget.bucket}`,
    count: completed,
    totalBytes,
    uploaded,
    reused,
    verifiedAt: new Date().toISOString(),
  };
}
