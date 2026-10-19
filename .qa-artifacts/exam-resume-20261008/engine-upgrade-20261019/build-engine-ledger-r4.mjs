import fs from 'node:fs';
import { createHash } from 'node:crypto';
const base = '.qa-artifacts/exam-resume-20261008/';
const hash = (x) => createHash('sha256').update(x).digest('hex');
const ev = (path) => ({ path, sha256: hash(fs.readFileSync(path)) });
const previous = base + 'engine-upgrades-progress-r3.json';
const old = JSON.parse(fs.readFileSync(previous, 'utf8'));
const implemented = {
  U03: 'Native adoption keeps locked origins/past-exam descendants/unresolved source roots closed; general independent-solve approval remains unimplemented.',
  U05: 'Bounded exact numeric choice uniqueness and simplified distractors in deriveFormats and direct-MC expandFamily; unreadable symbolic/domain equivalence remains pending.',
  U14: 'Native renderFigureSpec saved-image adapter, trusted resource injection and real q10/q19 previews; public catalog/API registration and whole-problem release remain pending.',
  U18: 'Native PNG/math binding/student/diagram/generation/prompt digests invalidate stale asset requests and reviews; generic twin version/native provenance chain still pending.',
  U21: 'Native bounded PNG integrity/decode and trusted data construction; ordinary vector image ban unchanged. Offline outputs refuse dependencies/.git even without a junction.',
  U22: 'Past-exam ancestry and origin locks inherited at adoption; fresh protected82/correction/closure read verified. No new loader, permanent-exclusion override or writer added.',
  U27: 'Native initial middle3/2025-2027 applied-edition validation, seven-surface/legitimate-method reject and missing-evidence holds for authored images. General curriculum/template grading remains pending.',
  U30: 'Direct-MC numeric exact duplicates are now blocked even when only wrong choices collide; geometry-role and universal symbolic identities remain outside this bounded proof.',
};
const scan = JSON.parse(fs.readFileSync(base + 'engine-upgrade-20261019/exact-choice-scan-r2.json', 'utf8'));
const closure = JSON.parse(fs.readFileSync(base + 'engine-upgrade-20261019/past-exam-closure-current.json', 'utf8'));
const source = JSON.parse(fs.readFileSync(base + 'source-reconnection-20261019/run-receipt-r1.json', 'utf8'));
const code = [
  'src/lib/math/exactChoiceValue.ts','src/lib/engine/deriveFormats.ts','src/lib/engine/expandEngine.ts',
  'src/lib/engine/authoredImage.ts','src/lib/figure/renderFigureSpec.ts','src/app/api/problems/transform/adopt/route.ts',
  'scripts/import/exam-twin/candidatePack.mjs','scripts/import/exam-twin/sourceIdentity.mjs',
  'scripts/qa/scan-choice-exact-values.ts','scripts/qa/audit-past-exam-closure.mjs','scripts/qa/verify-authored-image-support.ts',
];
const result = {
  kind: 'exam-engine-upgrades-progress/v4', version: 4, createdAt: new Date().toISOString(), previous: ev(previous),
  report: ev('docs/planning/tracks/reports/exam-engine-native-upgrade-20261019.md'),
  choiceReport: ev('docs/planning/tracks/reports/exam-engine-choice-upgrade-20261019.md'),
  latestUserDirection: 'Continue engine upgrade, N source reconnected; remove unused worktrees preserving branches/evidence; checkpoint feature commits/pushes.',
  code: code.map(ev),
  items: old.items.map((item) => ({ id: item.id, title: item.title, previousProductionStatus: item.productionStatus,
    productionStatus: implemented[item.id] ? 'partially-implemented-bounded-native-support' : 'requires-latest-main-audit',
    change: implemented[item.id] ?? 'Previous evidence preserved. Latest main changed substantially; this version does not carry old not-implemented labels forward as a new audit.',
    remainingValidation: item.validationRequired,
  })),
  validations: { vitest: { files: 22, passed: 335 }, nodePassed: 41, scopedOwnedTypecheck: 'passed against latest schema using independent Prisma/client/dependency copies; no shared writes or npm install', fullAppBuildValidated: false,
    exactScan: { evidence: ev(base + 'engine-upgrade-20261019/exact-choice-scan-r2.json'), engines: scan.engines, mcRows: scan.mcRows, allChoicesReadable: scan.mcRowsAllChoicesReadable, sameValuePairsFound: scan.sameValueRows, failedTypeSeeds: scan.failedTypeSeeds, symbolicAndUnreadableAnswersNotCertified: true },
    nativeImages: ev(base + 'engine-upgrade-20261019/native-images-r3/report.json'), native70mmPreview: ev(base + 'engine-upgrade-20261019/native-images-r3/visual-check.json'),
    independentCodeReview: ev(base + 'source-reconnection-20261019/asset-adapter-review-r1.md'), independentRecheck: ev(base + 'source-reconnection-20261019/asset-angle-investigation-r1.md'),
  },
  latestClosure: { evidence: ev(base + 'engine-upgrade-20261019/past-exam-closure-current.json'), capturedAt: closure.capturedAt, originals: closure.originalCount, directlyAllowed: closure.originalsDirectUseAllowed, transformedDescendants: closure.descendantsCount, protected82Unchanged: true, dbWrites: 0 },
  sourceAccess: { observedAt: source.observedAt, nDriveAvailable: true, matchedEntries: source.sourceCount, manifests: source.sourceManifests.length, contentPairIdentity: 'unconfirmed', allSourcesExtracted: false },
  candidateReviewCountsRecomputed: false, newAuthoredProblems: 0, newImagegenRasters: 0, nativeAssetPreviews: 2, nativePreviewsLoadable: 0,
  wholeEngineComplete: false, wholeExtractionComplete: false, operationalLoads: 0, dbWrites: 0, deployed: false,
  workerOwnership: 'One current root engine writer plus one existing source-identity worktree worker for source extraction; inactive historical algebra/geometry checkouts are being preserved/removed on user direction.',
  automaticContinuationControllerChanged: false,
};
fs.writeFileSync(base + 'engine-upgrades-progress-r4.json', JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ items: result.items.length, boundedNativeChanges: Object.keys(implemented).length, vitestPassed:335, nodePassed:41, wholeEngineComplete:false, dbWrites:0 }));
