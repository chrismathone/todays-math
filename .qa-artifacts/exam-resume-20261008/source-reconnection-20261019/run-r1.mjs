import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifySourceIdentity } from '../../../../scripts/import/exam-twin/sourceIdentity.mjs';
const root = '.qa-artifacts/exam-resume-20261008/';
const out = root + 'source-reconnection-20261019/';
const manifests = [
 'bumil-source-audit-r2/source-files.json',
 ...['gyeonggu','gyeongsan','gyeongsang','gyeongam','gyeongsin'].map(s => `next-five-extraction-r1/${s}/source-manifest.json`),
 ...['nobyeon','gyeseong','gyeongilyeo'].map(s => `next-three-extraction-r1-attempt2/${s}/source-manifest.json`),
 ...['daegok','daegudong','neungin'].map(s => `next-three-extraction-r2-attempt1/${s}/source-manifest.json`),
].map(p => root + p);
const report = await verifySourceIdentity(manifests);
await writeFile(out + 'n-source-verification-r1.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
const summary = {};
for (const r of report.results) summary[r.status] = (summary[r.status] ?? 0) + 1;
const receipt = { observedAt: new Date().toISOString(), sourceManifests: manifests, summary, sourceCount: report.results.length, duplicateByteGroups: report.duplicateBytes.length, contentPairIdentity: report.contentPairIdentity, contentCertification: report.contentCertification, manifestSelection: 'Existing latest v11 continuation references plus current per-school source manifests; Bumil current_path preserves explicit previously recorded relocation. No N directory scan, fallback path guessing, answer extraction or author answer access.', reportSha256: createHash('sha256').update(await readFile(out + 'n-source-verification-r1.json')).digest('hex') };
await writeFile(out + 'run-receipt-r1.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
