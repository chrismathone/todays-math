import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { normalizeProposal, proposalRows } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/proposals';
import { workerFingerprint } from 'C:/Users/user/orca/workspaces/todays-math/student-clear-integration-20261006/scripts/qa/concept-blank/student-clear/editorial';
const directory = 'C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/middle-negative-tail-116';
const primary = 'C:/Users/user/orca/workspaces/todays-math/student-clear-m1m2m3-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/m1m2m3';
const snapshotPath = `${primary}/evidence/negative-current-ctx_9cb9b54195a9.json`;
const auditPath = `${primary}/audit.json`;
const baselinePath = 'D:/tmp/concept-student-clear-20261006/baseline.json';
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const write = (name: string, value: unknown) => { const path = `${directory}/${name}`; if (existsSync(path)) throw Error(`Immutable evidence exists: ${name}`); writeFileSync(path, JSON.stringify(value, null, 2) + '\n'); };
const command = process.argv[2];
if (command === 'init') {
  const snapshotBytes = readFileSync(snapshotPath), auditBytes = readFileSync(auditPath), baselineBytes = readFileSync(baselinePath);
  const snapshot = JSON.parse(snapshotBytes.toString('utf8')), audit = proposalRows(JSON.parse(auditBytes.toString('utf8'))), baseline = JSON.parse(baselineBytes.toString('utf8'));
  if (baseline.sourceCommit !== '13bf05dce') throw Error('Wrong original commit');
  const originals = new Map(Object.values(baseline.parts).flatMap((part: any) => part.concepts).map((entry: any) => [entry.id, entry]));
  const rows = snapshot.current.slice(160, 276).map((item: any, offset: number) => {
    const raw = audit.find(row => row.id === item.id); if (!raw) throw Error('Missing ID ' + item.id);
    const original = originals.get(item.id), normalized = normalizeProposal(raw, original as any); if (!normalized) throw Error('Incomplete ' + item.id);
    return { originalDisputeIndex: 160 + offset, id: item.id, sourceIndex: raw.sourceIndex, original, raw, normalized, currentFingerprint: workerFingerprint('middle', raw), snapshotNormalizedHash: item.normalized.hash, matchesSnapshot: normalized.hash === item.normalized.hash, snapshotItem: item };
  });
  if (rows.length !== 116 || new Set(rows.map((row: any) => row.id)).size !== 116) throw Error('Scope mismatch');
  if (existsSync(`${directory}/source-snapshot.json`)) throw Error('Snapshot already captured');
  writeFileSync(`${directory}/source-snapshot.json`, snapshotBytes);
  write('immutable-input.json', { capturedAt: new Date().toISOString(), reader: 'Codex dispatched worker ctx_6bf34890cd2d; actual text review, no independent approval', sourceSnapshot: { path: snapshotPath, byteSha256: sha(snapshotBytes) }, currentAudit: { path: auditPath, byteSha256: sha(auditBytes) }, immutableBaseline: { path: baselinePath, sourceCommit: baseline.sourceCommit, byteSha256: sha(baselineBytes) }, range: { array: 'current', begin: 160, endInclusive: 275 }, rows });
  console.log(JSON.stringify({ rows: rows.length, uniqueIds: new Set(rows.map((row: any) => row.id)).size, stale: rows.filter((row: any) => !row.matchesSnapshot).map((row: any) => ({ index: row.originalDisputeIndex, id: row.id, current: row.normalized.hash, snapshot: row.snapshotNormalizedHash })), inputSha256: sha(readFileSync(`${directory}/immutable-input.json`)) }, null, 2));
} else if (command === 'before') {
  const begin = Number(process.argv[3]), end = Number(process.argv[4]);
  if (end - begin > 20 || begin < 160 || end > 276) throw Error('Reading batch out of bounds');
  const input = JSON.parse(readFileSync(`${directory}/immutable-input.json`, 'utf8'));
  const rows = input.rows.filter((row: any) => row.originalDisputeIndex >= begin && row.originalDisputeIndex < end);
  const output = rows.map((row: any) => JSON.stringify({ index: row.originalDisputeIndex, id: row.id, sourceIndex: row.sourceIndex, hashCurrent: row.matchesSnapshot, role: row.raw.learningRole, roleReason: row.raw.roleReason, original: row.original, B: row.normalized.B, C: row.normalized.C, generalDefinition: row.normalized.coreAfter ?? row.original.definition, coreReason: row.normalized.coreReason, originalBlind: row.snapshotItem.review.blind, originalKey: row.snapshotItem.review.key })).join('\n') + '\n';
  const name = `before-${begin}-${end}.txt`; if (existsSync(`${directory}/${name}`)) throw Error('Batch exists');
  writeFileSync(`${directory}/${name}`, output); console.log(output);
}
