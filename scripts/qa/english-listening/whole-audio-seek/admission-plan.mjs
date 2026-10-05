import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';

export const valueSha256 = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const contentSha256 = value => valueSha256(canonical(value));

/** Collect hash-bound probe, request, cache, energy and mapping references. */
export function collectFileReferences(value, references = new Map()) {
  if (!value || typeof value !== 'object') return references;
  const add = (path, hash) => {
    if (typeof path !== 'string' || typeof hash !== 'string') return;
    requireEvidence(/^[0-9a-f]{64}$/.test(hash), 'Invalid nested evidence hash');
    requireEvidence(!references.has(path) || references.get(path) === hash, 'Conflicting evidence hashes for one path');
    references.set(path, hash);
  };
  add(value.path, value.sha256);
  for (const [field, item] of Object.entries(value)) {
    if (field.endsWith('Path')) add(item, value[field.slice(0, -4) + 'Sha256']);
    collectFileReferences(item, references);
  }
  return references;
}

/** Queue headers describe their discovery location; the replay binds the actual inventory. */
export function collectQueueFileReferences(queue, references, binding) {
  requireEvidence(queue?.schemaVersion === 1 && queue.evidenceContractVersion === 1 &&
    queue.provider === binding.provider && Array.isArray(queue.records) &&
    typeof queue.inventoryPath === 'string' && queue.inventorySha256 === binding.inventory.sha256,
    'Certified queue inventory or provider differs');
  const observed = { path: queue.inventoryPath, sha256: queue.inventorySha256 };
  // Only this root header is resolved through its hash-checked consuming certificate.
  // Keep the original queue bytes and every nested request/probe reference unchanged.
  collectFileReferences({ ...queue, inventoryPath: binding.inventory.path }, references);
  return { observed, authoritative: binding.inventory,
    labelDiffers: resolve(observed.path) !== resolve(binding.inventory.path) };
}

/** Discover queue bindings only along the current inventory's authenticated ancestor chain. */
export async function certifiedQueueBindings(certificate, readBoundJson) {
  const bindings = new Map(), seen = new Set();
  const equalRef = (a, b) => a && b && typeof a.path === 'string' && typeof b.path === 'string' &&
    a.sha256 === b.sha256 && resolve(a.path) === resolve(b.path);
  let current = certificate;
  while (current) {
    requireEvidence(current.schemaVersion === 1 && current.evidenceContractVersion === 1 &&
      current.completeReplay === true && Array.isArray(current.errors) && current.errors.length === 0 &&
      current.writesDatabase === false && current.writesStorage === false && current.humanReviewed === false,
      'Unverified queue binding certificate');
    const inventoryRef = current.inputs?.inventory;
    requireEvidence(typeof inventoryRef?.path === 'string' && /^[0-9a-f]{64}$/.test(inventoryRef.sha256), 'Missing certified inventory');
    const inventory = await readBoundJson(inventoryRef);
    for (const provider of ['grok', 'claude']) {
      const queue = current.inputs[provider];
      if (!queue) continue;
      requireEvidence(typeof queue.path === 'string' && /^[0-9a-f]{64}$/.test(queue.sha256), 'Invalid certified queue');
      const key = resolve(queue.path), prior = bindings.get(key);
      requireEvidence(!prior || (prior.sha256 === queue.sha256 && prior.provider === provider &&
        equalRef(prior.inventory, inventoryRef)), 'Conflicting certified queue inventories');
      bindings.set(key, { ...queue, provider, inventory: inventoryRef });
    }
    const ancestor = inventory.verifiedAncestor;
    if (!ancestor) {
      requireEvidence(!current.inputs.ancestorCertificate && !current.inputs.ancestorInventory &&
        !current.inputs.ancestorClock, 'Undeclared ancestor queue authority');
      break;
    }
    requireEvidence(equalRef(ancestor.certificate, current.inputs.ancestorCertificate) &&
      equalRef(ancestor.inventory, current.inputs.ancestorInventory) &&
      equalRef(ancestor.clock, current.inputs.ancestorClock), 'Ancestor queue authority differs');
    const key = resolve(ancestor.certificate.path);
    requireEvidence(!seen.has(key), 'Cyclic queue authority');
    seen.add(key);
    current = await readBoundJson(ancestor.certificate);
    requireEvidence(equalRef(current.inputs?.inventory, ancestor.inventory) &&
      equalRef(current.inputs?.clock, ancestor.clock), 'Ancestor certificate input differs');
  }
  return bindings;
}
export function requireEvidence(condition, message) {
  if (!condition) throw new Error(message);
}
const same = (left, right, message) => requireEvidence(isDeepStrictEqual(left, right), message);
const key = row => `${row.sourceRecordId}:${row.questionId}`;

/** Validate the independent replay, never the producer's proposed candidates. */
export function validateCertificate(inventory, snapshot, certificate) {
  requireEvidence(certificate.schemaVersion === 1 && certificate.evidenceContractVersion === 1 &&
    certificate.completeReplay === true && certificate.productionApplicationAuthorized === false &&
    certificate.writesDatabase === false && certificate.writesStorage === false &&
    certificate.writesMedia === false && certificate.humanReviewed === false &&
    Array.isArray(certificate.errors) && certificate.errors.length === 0, 'Incomplete or invalid independent replay');
  const snapshots = new Map(snapshot.snapshots.map(row => [row.id, row]));
  const sources = new Map(inventory.records.map(row => [row.sourceRecordId, row]));
  requireEvidence(sources.size === inventory.records.length, 'Duplicate inventory source');
  const records = new Map(certificate.records.map(row => [key(row), row]));
  const questionCount = inventory.records.reduce((n, source) => n + source.questions.length, 0);
  requireEvidence(records.size === certificate.records.length && records.size === questionCount &&
    certificate.counts.sources === sources.size && certificate.counts.questions === questionCount,
    'Incomplete or duplicate replay questions');
  const checks = new Map(certificate.sourceChecks.map(row => [row.sourceRecordId, row]));
  requireEvidence(checks.size === sources.size && certificate.sourceChecks.length === sources.size &&
    [...checks].every(([id, row]) => sources.has(id) && row.status === 'passed' && row.reason === null),
    'A source clock or immutable input failed replay');
  const preserved = [];
  const outcomes = {};
  const providers = {};
  const grades = {};
  for (const source of sources.values()) {
    const baseline = snapshots.get(source.setId);
    requireEvidence(baseline && baseline.revision === source.revision &&
      valueSha256(baseline.document) === source.documentSha256, 'Frozen document identity differs');
    const groups = baseline.document.groups;
    requireEvidence(groups.length === 1 && groups[0].id === source.groupId &&
      isDeepStrictEqual(groups[0].audio, source.audio), 'Source is not the frozen whole original');
    const questions = new Map(groups[0].questions.map(question => [question.id, question]));
    requireEvidence(questions.size === source.questions.length, 'Frozen question coverage differs');
    for (const question of source.questions) {
      const current = questions.get(question.id);
      const row = records.get(`${source.sourceRecordId}:${question.id}`);
      requireEvidence(current && row && row.setId === source.setId && row.revision === source.revision &&
        row.documentSha256 === source.documentSha256 && row.sourceNumber === question.sourceNumber &&
        current.sourceNumber === question.sourceNumber && row.provider === source.assignedAgent &&
        row.reconstructed === source.reconstructed && row.sourceAudioSha256 === source.sourceAudioSha256 &&
        row.playbackSha256 === source.audio.sha256 && current.metadata?.sourceRecordId === source.sourceRecordId &&
        current.metadata?.sourceAudioSha256 === source.sourceAudioSha256, 'Replay question or audio binding differs');
      same(current.audioRange ?? null, question.audioRange ?? null, 'Frozen existing range differs');
      if (current.audioRange) {
        requireEvidence(row.status === 'preserved', 'Existing start cannot be replaced');
        same(row.audioRange, current.audioRange, 'Existing range must be preserved exactly');
        preserved.push({ sourceRecordId: source.sourceRecordId, questionId: question.id, audioRange: current.audioRange });
      } else if (row.status === 'admitted') {
        const range = row.audioRange;
        requireEvidence(range && Number.isSafeInteger(range.startMs) && range.startMs >= 0 &&
          range.startMs < source.audio.durationMs && range.endMs === source.audio.durationMs &&
          Array.isArray(row.reasons) && row.reasons.length === 0 && row.proofKey && row.nativeEvidence &&
          Array.isArray(row.scopeQuestionNumbers) && row.scopeQuestionNumbers.length > 0 && row.evidenceGrade,
          'Only proven starts continuing to the full original end may be admitted');
        grades[row.evidenceGrade] = (grades[row.evidenceGrade] ?? 0) + 1;
      } else {
        requireEvidence(row.status === 'held' && !row.audioRange && Array.isArray(row.reasons) && row.reasons.length > 0,
          'Unproven or fabricated-existing start');
      }
      outcomes[row.status] = (outcomes[row.status] ?? 0) + 1;
      providers[row.provider] = (providers[row.provider] ?? 0) + 1;
    }
  }
  same(certificate.counts.outcomes, outcomes, 'Replay outcome counts differ');
  same(certificate.counts.providers, providers, 'Replay provider counts differ');
  same(certificate.counts.evidenceGrades, grades, 'Replay grade counts differ');
  same([...certificate.preservedExisting].sort((a, b) => key(a).localeCompare(key(b))),
    preserved.sort((a, b) => key(a).localeCompare(key(b))), 'Existing-range preservation manifest differs');
  return records;
}

/** Change only new audioRange values and revision; retain the raw DB document. */
export function planSource(source, baseline, records) {
  requireEvidence(baseline.revision === source.revision && valueSha256(baseline.document) === source.documentSha256,
    'Stale source document');
  const next = structuredClone(baseline.document);
  const markers = [];
  for (const question of next.groups[0].questions) {
    const row = records.get(`${source.sourceRecordId}:${question.id}`);
    requireEvidence(row, 'Missing replay question');
    if (row.status !== 'admitted') continue;
    requireEvidence(!question.audioRange, 'Cannot replace an existing start');
    question.audioRange = structuredClone(row.audioRange);
    markers.push({ questionId: question.id, sourceNumber: question.sourceNumber, audioRange: row.audioRange,
      cueNumber: row.cueNumber, scopeQuestionNumbers: row.scopeQuestionNumbers, evidenceGrade: row.evidenceGrade });
  }
  if (markers.length) next.revision = baseline.revision + 1;
  const reversed = structuredClone(next);
  reversed.revision = baseline.revision;
  for (const question of reversed.groups[0].questions) {
    if (markers.some(marker => marker.questionId === question.id)) delete question.audioRange;
  }
  same(reversed, baseline.document, 'Original content or media changed');
  return { sourceRecordId: source.sourceRecordId, setId: source.setId, revision: source.revision,
    documentSha256: source.documentSha256, before: baseline.document, next, nextSha256: contentSha256(next),
    audio: source.audio, markers };
}

/** A restart may skip only this exact committed update, backed by its audit. */
export function currentPlanState(current, plan, matchingAudit) {
  // JSONB can reorder object keys on storage; compare the complete content.
  if (current.revision === plan.revision && isDeepStrictEqual(current.document, plan.before)) return 'pending';
  if (plan.markers.length && current.revision === plan.revision + 1 && isDeepStrictEqual(current.document, plan.next) && matchingAudit)
    return 'already_applied';
  throw new Error('Concurrent source edit or unproven previous application');
}
