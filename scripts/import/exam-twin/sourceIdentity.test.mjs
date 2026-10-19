import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { sourceEntries, verifySourceIdentity } from './sourceIdentity.mjs';
const sha = value => createHash('sha256').update(value).digest('hex');
async function fixture(run) {
  const dir = await mkdtemp(path.join(tmpdir(), 'source-identity-'));
  const file = path.join(dir, 'exam.hwp');
  const manifest = path.join(dir, 'manifest.json');
  await writeFile(file, 'current bytes');
  const entry = { path: file, sha256: sha('current bytes'), bytes: 13 };
  const save = entries => writeFile(manifest, JSON.stringify({ sourceFiles: entries }));
  try { await run({ dir, file, manifest, entry, save }); } finally { await rm(dir, { recursive: true }); }
}
test('matches exact bytes reproducibly and never certifies a same-name pair', async () => fixture(async ({ dir, file, manifest, entry, save }) => {
  const pdf = path.join(dir, 'exam.pdf');
  await writeFile(pdf, 'current bytes');
  await save([entry, { ...entry, path: pdf }]);
  const a = await verifySourceIdentity([manifest, manifest]);
  assert.deepEqual(a, await verifySourceIdentity([manifest]));
  assert.equal(a.byteIdentityConfirmed, true);
  assert.equal(a.contentPairIdentity, 'unconfirmed');
  assert.equal(a.contentCertification.status, 'not-performed');
  assert.equal(a.duplicateBytes.length, 1);
  assert.equal(a.duplicateBytes[0].entries.length, 2);
  assert.equal(a.results[0].path, file);
}));
test('stale hashes, missing sources, size mismatch and invalid expectations fail independently', async () => fixture(async ({ dir, manifest, entry, save }) => {
  await save([{ ...entry, sha256: sha('stale bytes') }, { ...entry, path: path.join(dir, 'missing.pdf') }, { ...entry, bytes: 12 }, { ...entry, sha256: '' }]);
  const r = await verifySourceIdentity([manifest]);
  assert.deepEqual(r.results.map(x => x.status), ['hash-mismatch', 'missing', 'size-mismatch', 'invalid-entry']);
  assert.equal(r.byteIdentityConfirmed, false);
}));
test('duplicate manifest entries are retained rather than silently certified away', async () => fixture(async ({ manifest, entry, save }) => {
  await save([entry, entry, { ...entry, sha256: sha('other') }]);
  const r = await verifySourceIdentity([manifest]);
  assert.equal(r.results.length, 3);
  assert.equal(r.byteIdentityConfirmed, false);
  assert.equal(r.duplicateBytes[0].entries.length, 3);
}));
test('bounded reads and entry limits fail closed', async () => fixture(async ({ manifest, entry, save }) => {
  await save([entry, entry]);
  assert.equal((await verifySourceIdentity([manifest], { maxFileBytes: 1 })).results[0].status, 'size-limit');
  await assert.rejects(verifySourceIdentity([manifest], { maxEntries: 1 }), /limit/);
  await assert.rejects(verifySourceIdentity([]), /paths/);
  await assert.rejects(verifySourceIdentity([manifest], { maxFileBytes: -1 }), /bounds/);
}));
test('only explicit source arrays are projected; current relocation is explicit', () => {
  assert.deepEqual(sourceEntries([{ current_path: '/new', manifest_path: '/old', sha256: 'x' }]), [{ path: '/new', sha256: 'x' }]);
  assert.deepEqual(sourceEntries({ inputs: [{ path: '/source', sha256: 'x' }], questions: [{ path: '/answer' }] }), [{ path: '/source', sha256: 'x' }]);
  assert.throws(() => sourceEntries({ questions: [] }), /supported/);
});
test('source directories are rejected', async () => fixture(async ({ dir, manifest, entry, save }) => {
  await save([{ ...entry, path: dir }]);
  assert.equal((await verifySourceIdentity([manifest])).results[0].status, 'not-file');
}));

test('CLI exits nonzero on a stale source and emits structured evidence', async () => fixture(async ({ manifest, entry, save }) => {
  const { spawnSync } = await import('node:child_process');
  await save([{ ...entry, sha256: sha('stale') }]);
  const r = spawnSync(process.execPath, [new URL('./sourceIdentity.mjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), manifest], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(JSON.parse(r.stdout).results[0].status, 'hash-mismatch');
}));
