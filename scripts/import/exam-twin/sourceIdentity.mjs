import { open, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;

// Deliberately shallow: never traverse question/answer payloads for source paths.
export function sourceEntries(manifest) {
  const entries = Array.isArray(manifest) ? manifest : manifest.sourceFiles ?? manifest.inputs;
  if (!Array.isArray(entries) || !entries.length) throw new Error('No supported source entries');
  return entries.map(entry => ({
    path: entry.current_path ?? entry.path,
    sha256: entry.sha256,
    ...(entry.bytes === undefined ? {} : { bytes: entry.bytes }),
  }));
}

/** Exact bytes only. No directory discovery, relocation guessing or semantic certification. */
export async function verifySourceIdentity(manifestPaths, { maxFileBytes = 256 * 1024 * 1024, maxEntries = 512 } = {}) {
  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || !Number.isSafeInteger(maxEntries) || maxEntries < 1) throw new Error('Invalid bounds');
  if (!Array.isArray(manifestPaths) || !manifestPaths.length || manifestPaths.length > maxEntries) throw new Error('Invalid manifest paths');
  const manifests = [];
  let count = 0;
  for (const manifestPath of [...new Set(manifestPaths)].sort(compare)) {
    const raw = await readFile(manifestPath);
    const data = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, ''));
    const entries = sourceEntries(data);
    count += entries.length;
    if (count > maxEntries) throw new Error('Source entry limit exceeded');
    manifests.push({ manifestPath, manifestSha256: hash(raw), entries });
  }
  const results = [];
  for (const manifest of manifests) {
    for (const [index, entry] of manifest.entries.entries()) {
      const result = { manifestPath: manifest.manifestPath, index, ...entry };
      if (typeof entry.path !== 'string' || !path.isAbsolute(entry.path) || typeof entry.sha256 !== 'string' || !/^[a-f\d]{64}$/i.test(entry.sha256) || (entry.bytes !== undefined && (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0))) {
        results.push({ ...result, status: 'invalid-entry' });
        continue;
      }
      let handle;
      try {
        handle = await open(entry.path, 'r');
        const before = await handle.stat({ bigint: true });
        if (!before.isFile()) { results.push({ ...result, status: 'not-file' }); continue; }
        if (before.size > BigInt(maxFileBytes)) { results.push({ ...result, status: 'size-limit' }); continue; }
        const digest = createHash('sha256');
        let bytes = 0;
        for await (const chunk of handle.createReadStream({ autoClose: false })) {
          bytes += chunk.length;
          if (bytes > maxFileBytes) throw Object.assign(new Error('size-limit'), { code: 'SIZE_LIMIT' });
          digest.update(chunk);
        }
        const after = await handle.stat({ bigint: true });
        const actualSha256 = digest.digest('hex');
        const changed = ['size', 'mtimeNs', 'ctimeNs', 'ino', 'dev'].some(key => before[key] !== after[key]) || BigInt(bytes) !== after.size;
        results.push({ ...result, actualBytes: bytes, actualSha256, status: changed ? 'changed-during-read' : actualSha256 !== entry.sha256.toLowerCase() ? 'hash-mismatch' : entry.bytes !== undefined && bytes !== entry.bytes ? 'size-mismatch' : 'matched' });
      } catch (error) {
        results.push({ ...result, status: error.code === 'ENOENT' ? 'missing' : error.code === 'SIZE_LIMIT' ? 'size-limit' : 'read-error', errorCode: error.code ?? 'UNKNOWN' });
      } finally { await handle?.close(); }
    }
  }
  const groups = new Map();
  for (const result of results) {
    if (!result.actualSha256) continue;
    const group = groups.get(result.actualSha256) ?? [];
    group.push({ manifestPath: result.manifestPath, index: result.index, path: result.path });
    groups.set(result.actualSha256, group);
  }
  return {
    schema: 'exam-source-identity/v1',
    manifests: manifests.map(({ manifestPath, manifestSha256 }) => ({ manifestPath, manifestSha256 })),
    results,
    duplicateBytes: [...groups].filter(([, entries]) => entries.length > 1).sort(([a], [b]) => compare(a, b)).map(([sha256, entries]) => ({ sha256, entries })),
    byteIdentityConfirmed: results.every(result => result.status === 'matched'),
    contentPairIdentity: 'unconfirmed',
    contentCertification: { status: 'not-performed', reason: 'Byte identity does not certify HWP/PDF question, answer, year, grade or whole-document equivalence.' },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const report = await verifySourceIdentity(process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = report.byteIdentityConfirmed ? 0 : 1;
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 2; }
}
