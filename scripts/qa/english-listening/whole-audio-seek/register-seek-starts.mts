/** Root-only operator: adopt an independently replayed whole-original seek certificate. */
import { Prisma, PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { certifiedQueueBindings, collectFileReferences, collectQueueFileReferences, currentPlanState, planSource, requireEvidence, validateCertificate, valueSha256 } from './admission-plan.mjs';

const require = createRequire(import.meta.url);
const { listeningDraftSchema } = require('../../../../src/contracts/englishListeningHttp.contract');
const { listeningMediaCompletionSchema } = require('../../../../src/contracts/englishListeningMedia.contract');
const { teacher, lock, ownedSet, audit, json } = require('../../../../src/lib/english/listening/runtime/database');
const { verifiedMedia } = require('../../../../src/lib/english/listening/runtime/sets');
const { values } = parseArgs({ options: {
  inventory: { type: 'string' }, certificate: { type: 'string' }, 'certificate-sha256': { type: 'string' },
  'media-bindings': { type: 'string' }, 'media-bindings-sha256': { type: 'string' },
  owner: { type: 'string' }, apply: { type: 'boolean', default: false },
} });
const ownerId = values.owner;
requireEvidence(ownerId && /^[0-9a-f-]{36}$/.test(ownerId), 'Explicit owner required');
requireEvidence(values.inventory && values.certificate && values['media-bindings'], 'Explicit proof paths required');
requireEvidence(/^[0-9a-f]{64}$/.test(values['certificate-sha256'] ?? '') &&
  /^[0-9a-f]{64}$/.test(values['media-bindings-sha256'] ?? ''), 'Reviewed immutable proof hashes required');

async function fileHash(path: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}
async function readJson(path: string, expectedSha?: string): Promise<any> {
  if (expectedSha) requireEvidence(await fileHash(path) === expectedSha, 'Immutable proof hash differs: ' + path);
  return JSON.parse(await readFile(path, 'utf8'));
}
const inventoryPath = resolve(values.inventory!);
const certificatePath = resolve(values.certificate!);
const certificateSha256 = values['certificate-sha256']!;
const inventory = await readJson(inventoryPath);
const inventorySha256 = await fileHash(inventoryPath);
const certificate = await readJson(certificatePath, certificateSha256);
const media = await readJson(resolve(values['media-bindings']!), values['media-bindings-sha256']);
const snapshot = await readJson(inventory.liveSnapshotPath, inventory.liveSnapshotSha256);
requireEvidence(inventory.records.length === 193 && inventory.records.reduce((n: number, s: any) => n + s.questions.length, 0) === 3699,
  'Unexpected historical source inventory');
requireEvidence(media.project === 'jyaguxwuaxgdnovtulna' && media.sources === 193 &&
  media.writesDatabase === false && media.writesStorage === false, 'Wrong original-media inventory');
requireEvidence(certificate.inputs.inventory.path.replaceAll('\\', '/') === inventoryPath.replaceAll('\\', '/') &&
  certificate.inputs.inventory.sha256 === inventorySha256 && certificate.inputs.liveSnapshot.sha256 === inventory.liveSnapshotSha256,
  'Independent replay refers to different source inventory');
const evidenceReferences = collectFileReferences(certificate.records.filter((row: any) => row.status === 'admitted'));
for (const ref of [...Object.values(certificate.inputs), ...certificate.implementation] as any[]) {
  requireEvidence(typeof ref.path === 'string' && /^[0-9a-f]{64}$/.test(ref.sha256), 'Invalid replay input reference');
  requireEvidence(await fileHash(ref.path) === ref.sha256, 'Replay input or implementation changed: ' + ref.path);
}
const frozen = await readJson(certificate.inputs.frozen.path, certificate.inputs.frozen.sha256);
requireEvidence(frozen.records.length === 193, 'Incomplete immutable source input manifest');
for (const source of frozen.records) {
  for (const ref of Object.values(source.files) as any[])
    requireEvidence(await fileHash(ref.path) === ref.sha256, 'Original source input changed: ' + source.sourceRecordId);
}
console.log(JSON.stringify({ stage: 'immutable-source-inputs-checked', sources: frozen.records.length }));
// Recheck nested admitted proof artifacts and their request/native manifests.
// Grow the queue as immutable JSON manifests reference further actual files.
const checked = new Set<string>();
const queueBindings = await certifiedQueueBindings(certificate, (ref: any) => readJson(ref.path, ref.sha256));
const queueInventoryLabels: any[] = [];
for (const [path, hash] of evidenceReferences) {
  requireEvidence(await fileHash(path) === hash, 'Nested replay artifact changed: ' + path);
  if (path.toLowerCase().endsWith('.json') && !checked.has(path)) {
    checked.add(path);
    const manifest = await readJson(path, hash);
    const binding = queueBindings.get(resolve(path));
    if (binding) {
      requireEvidence(binding.sha256 === hash, 'Certified queue bytes differ');
      queueInventoryLabels.push({ queue: { path, sha256: hash },
        ...collectQueueFileReferences(manifest, evidenceReferences, binding) });
    } else collectFileReferences(manifest, evidenceReferences);
  }
}
console.log(JSON.stringify({ stage: 'admitted-proof-files-checked', files: evidenceReferences.size,
  staleQueueInventoryLabels: queueInventoryLabels.filter(row => row.labelDiffers).length }));
const records = validateCertificate(inventory, snapshot, certificate);
const preservedStarts = inventory.records.reduce((count: number, source: any) =>
  count + source.questions.filter((question: any) => question.audioRange).length, 0);
requireEvidence(certificate.preservedExisting.length === preservedStarts, 'Every frozen existing start must be preserved');
const snapshots = new Map<string, any>(snapshot.snapshots.map((row: any) => [row.id, row]));
const bindings = new Map<string, any>(media.proofs.map((row: any) => [row.setId, row]));
requireEvidence(bindings.size === 193, 'Duplicate or missing original media record');
const plans = inventory.records.map((source: any) => {
  const plan = planSource(source, snapshots.get(source.setId), records);
  const binding = bindings.get(source.setId);
  requireEvidence(binding && binding.sourceRecordId === source.sourceRecordId && binding.assetId === source.audio.assetId &&
    binding.sourceAudioSha256 === source.sourceAudioSha256 && binding.playbackSha256 === source.audio.sha256 &&
    valueSha256(binding.record) === binding.recordSha256, 'Frozen asset record binding differs');
  listeningDraftSchema.parse(plan.next);
  return { ...plan, binding };
}).sort((a: any, b: any) => a.setId.localeCompare(b.setId));

let url: URL;
try { url = new URL(process.env.DIRECT_URL ?? ''); }
catch { throw new Error('DIRECT_URL is missing or invalid'); }
requireEvidence(url.protocol === 'postgresql:' || url.protocol === 'postgres:', 'Invalid DB connection protocol');
requireEvidence((decodeURIComponent(url.username) === 'postgres.jyaguxwuaxgdnovtulna' &&
  url.hostname.endsWith('.pooler.supabase.com')) ||
  (url.hostname === 'db.jyaguxwuaxgdnovtulna.supabase.co' && url.username === 'postgres'), 'Wrong DB project');
url.searchParams.set('connection_limit', '1');
url.searchParams.set('pool_timeout', '60');
const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
const output = resolve('.qa-artifacts/whole-audio-seek-20261005',
  'adoption-' + new Date().toISOString().replace(/[:.]/g, '-'));
const receipts: any[] = [];

function validateAsset(plan: any, set: any, record: any) {
  requireEvidence(set.owner_id === ownerId && set.branch_id === null && !set.deleted_at, 'Source owner scope differs');
  requireEvidence(record && record.setId === set.id && record.ownerId === ownerId && record.branchId === null &&
    record.state === 'ready' && !record.sourceClip && record.assetId === plan.audio.assetId &&
    record.expectedSha256 === plan.binding.sourceAudioSha256 && valueSha256(record) === plan.binding.recordSha256,
    'Original asset changed');
  const completion = listeningMediaCompletionSchema.parse(record.completion);
  requireEvidence(completion.setId === set.id && completion.ownerId === ownerId && completion.branchId === null &&
    completion.state === 'ready' && completion.assetId === plan.audio.assetId &&
    completion.sha256 === plan.audio.sha256 && completion.durationMs === plan.audio.durationMs,
    'Whole-original playback identity differs');
}
async function inspectBatch() {
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await teacher(tx, { kind: 'teacher', userId: ownerId }, 'materials');
    const ids = plans.map((plan: any) => plan.setId);
    const sets = await tx.$queryRaw<any[]>(Prisma.sql`SELECT * FROM english_listening_set WHERE id::text IN (${Prisma.join(ids)}) ORDER BY id`);
    const assets = await tx.$queryRaw<any[]>(Prisma.sql`SELECT "setId"::text AS set_id,record FROM english_listening_media_asset WHERE "assetId"::text IN (${Prisma.join(plans.map((p: any) => p.audio.assetId))}) AND state='ready'`);
    const publications = await tx.$queryRaw<any[]>(Prisma.sql`SELECT set_id::text,COUNT(*)::int AS count FROM english_listening_publication WHERE set_id::text IN (${Prisma.join(ids)}) GROUP BY set_id`);
    const audits = await tx.$queryRaw<any[]>(Prisma.sql`SELECT resource_id::text,payload FROM english_listening_audit WHERE resource_id::text IN (${Prisma.join(ids)}) AND actor_id=${ownerId}::uuid AND kind='whole_source_seek_starts_registered' AND payload->>'certificateSha256'=${certificateSha256}`);
    requireEvidence(sets.length === 193 && assets.length === 193 && publications.length === 0, 'Live source scope or publication state differs');
    const bySet = new Map(sets.map(set => [set.id, set]));
    const byAsset = new Map(assets.map(asset => [asset.record.assetId, asset.record]));
    return plans.map((plan: any) => {
      const set = bySet.get(plan.setId);
      requireEvidence(set, 'Live source missing');
      validateAsset(plan, set, byAsset.get(plan.audio.assetId));
      const matchingAudit = audits.some(row => row.resource_id === plan.setId && row.payload.previousRevision === plan.revision &&
        row.payload.revision === plan.revision + 1 && row.payload.nextDocumentSha256 === plan.nextSha256 &&
        row.payload.inventorySha256 === inventorySha256);
      return { setId: plan.setId, state: currentPlanState(set, plan, matchingAudit), revision: set.revision };
    });
  }, { timeout: 30000 });
}

try {
  const before = await inspectBatch();
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'before-and-plan.json'), JSON.stringify({ certificateSha256, inventorySha256,
    checkedEvidenceFiles: evidenceReferences.size, queueInventoryLabels, before, plans }, null, 2), { flag: 'wx' });
  if (values.apply) {
    for (const plan of plans.filter((p: any) => p.markers.length)) {
      const receipt = await db.$transaction(async tx => {
        await lock(tx, plan.setId);
        const account = await teacher(tx, { kind: 'teacher', userId: ownerId }, 'materials');
        const current = await ownedSet(tx, account, plan.setId);
        const [asset] = await tx.$queryRaw<any[]>(Prisma.sql`SELECT record FROM english_listening_media_asset WHERE "assetId"=${plan.audio.assetId}::uuid AND "setId"=${plan.setId}::uuid AND state='ready' FOR SHARE`);
        validateAsset(plan, current, asset?.record);
        const completion = await verifiedMedia(tx, current, plan.audio.assetId);
        requireEvidence(completion.sha256 === plan.audio.sha256 && completion.durationMs === plan.audio.durationMs, 'Playback changed during save');
        const [publication] = await tx.$queryRaw<any[]>(Prisma.sql`SELECT COUNT(*)::int AS count FROM english_listening_publication WHERE set_id=${plan.setId}::uuid`);
        requireEvidence(publication.count === 0, 'Source published concurrently');
        const audits = await tx.$queryRaw<any[]>(Prisma.sql`SELECT payload FROM english_listening_audit WHERE resource_id=${plan.setId}::uuid AND actor_id=${ownerId}::uuid AND kind='whole_source_seek_starts_registered' AND payload->>'certificateSha256'=${certificateSha256}`);
        const matchingAudit = audits.some(row => row.payload.previousRevision === plan.revision && row.payload.revision === plan.revision + 1 &&
          row.payload.nextDocumentSha256 === plan.nextSha256 && row.payload.inventorySha256 === inventorySha256);
        const state = currentPlanState(current, plan, matchingAudit);
        if (state === 'already_applied') return { setId: plan.setId, state, markers: plan.markers.length };
        const now = new Date().toISOString();
        const changed = await tx.$executeRaw(Prisma.sql`UPDATE english_listening_set SET document=${json(plan.next)},revision=revision+1,updated_at=${new Date(now)} WHERE id=${plan.setId}::uuid AND revision=${plan.revision} AND document=${json(plan.before)}`);
        requireEvidence(changed === 1, 'Source revision or content changed while saving');
        const payload = { certificateSha256, inventorySha256, previousRevision: plan.revision, revision: plan.revision + 1,
          nextDocumentSha256: plan.nextSha256, originalAudio: plan.audio, markers: plan.markers,
          humanReviewed: false, originalAudioModified: false, questionContentModified: false, playbackContinuesToEnd: true };
        await audit(tx, plan.setId, ownerId, 'whole_source_seek_starts_registered', payload, now);
        return { setId: plan.setId, state: 'applied', revision: plan.revision + 1, markers: plan.markers.length };
      }, { timeout: 30000 });
      receipts.push(receipt);
      await writeFile(resolve(output, plan.setId + '.json'), JSON.stringify(receipt, null, 2), { flag: 'wx' });
      console.log(JSON.stringify({ stage: 'source-adopted', ...receipt }));
    }
  }
  const after = await inspectBatch();
  if (values.apply) requireEvidence(after.every((row: any) => {
    const plan = plans.find((p: any) => p.setId === row.setId);
    return row.state === (plan.markers.length ? 'already_applied' : 'pending');
  }), 'Incomplete live DB readback');
  const additions = plans.reduce((n: number, p: any) => n + p.markers.length, 0);
  const report = { checkedAt: new Date().toISOString(), mode: values.apply ? 'apply' : 'dry-run',
    certificateSha256, inventorySha256, sourceSets: 193, questions: 3699,
    checkedEvidenceFiles: evidenceReferences.size,
    staleQueueInventoryLabels: queueInventoryLabels.filter(row => row.labelDiffers).length,
    changedSources: plans.filter((p: any) => p.markers.length).length, newlyVerifiedStarts: additions,
    preservedStarts, totalStarts: preservedStarts + additions, held: certificate.counts.outcomes.held ?? 0,
    writesStorage: false, audioFilesChanged: false, questionContentChanged: false, humanReviewChanged: false,
    playback: 'seek_full_source_and_continue_to_end', before, after, outputDirectory: output };
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ ...report, before: undefined, after: undefined }));
} catch (error) {
  // Receipts remain available for exact audited resumption; never log DB URLs or credentials.
  console.error('Whole-source seek adoption failed: ' + (error instanceof Error ? error.message : 'unknown'));
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
