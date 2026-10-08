import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
const directory = 'C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/middle-negative-tail-116';
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const input = JSON.parse(readFileSync(`${directory}/immutable-input.json`,'utf8'));
if (sha(readFileSync(`${directory}/source-snapshot.json`)) !== input.sourceSnapshot.byteSha256) throw Error('Captured snapshot bytes changed');
if (sha(readFileSync(input.sourceSnapshot.path)) !== input.sourceSnapshot.byteSha256) throw Error('External snapshot bytes changed');
if (sha(readFileSync(input.immutableBaseline.path)) !== input.immutableBaseline.byteSha256) throw Error('Baseline bytes changed');
const finalFiles = ['candidates-160-180-v3.json','candidates-180-200-v2.json','candidates-200-220.json','candidates-220-240.json','candidates-240-260-v2.json','candidates-260-276-v3.json'];
const superseded = ['candidates-160-180.json','candidates-160-180-v2.json','candidates-180-200.json','candidates-240-260.json','candidates-260-276.json','candidates-260-276-v2.json'];
const reviews = JSON.parse(readFileSync(`${directory}/reviews.json`,'utf8'));
for (const review of reviews.reviews) {
 for (const evidence of [review.manualEvidence,review.beforeReadingEvidence,review.candidateArtifact,review.afterReadingEvidence,review.afterReadingEvidence.actualOutput]) if(sha(readFileSync(`${directory}/${evidence.path}`))!==evidence.byteSha256)throw Error('Changed final evidence '+evidence.path);
}
const manifestName = process.argv[2] ?? 'manifest.json'; if(!/^manifest(?:-final)?\.json$/.test(manifestName))throw Error('Manifest name');
const path = `${directory}/${manifestName}`; if(existsSync(path))throw Error('Manifest already fixed');
writeFileSync(path,JSON.stringify({generatedAt:new Date().toISOString(),algorithm:'SHA-256 of exact file bytes',selfExcluded:manifestName+' cannot hash its own bytes; completion message supplies manifest byte SHA.',supersededInitialSeal:manifestName==='manifest-final.json'?'manifest.json (created before Git line-ending byte preservation was configured; final seal wins)':null,finalCandidateFiles:finalFiles,supersededCandidateFiles:superseded,files:readdirSync(directory).filter(file=>file!==manifestName&&statSync(`${directory}/${file}`).isFile()).sort().map(file=>({path:file,bytes:statSync(`${directory}/${file}`).size,byteSha256:sha(readFileSync(`${directory}/${file}`)),status:finalFiles.includes(file)?'final-candidate':superseded.includes(file)?'superseded-do-not-apply':file==='manifest.json'&&manifestName==='manifest-final.json'?'superseded-initial-seal':'evidence-or-report'}))},null,2)+'\n');
console.log(JSON.stringify({manifestByteSha256:sha(readFileSync(path)),fileCount:JSON.parse(readFileSync(path,'utf8')).files.length,summary:reviews.summary}));
