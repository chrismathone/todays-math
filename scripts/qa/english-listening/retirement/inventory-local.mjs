#!/usr/bin/env node
/** Read-only material audit. The only writes are the two private/aggregate reports. */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CONTROL = '.qa-artifacts/listening-retirement-20261006';
const MAX_TEXT_BYTES = 32 * 1024 * 1024;
const TEXT = /\.(?:json|jsonl|ndjson|txt|md|html?|csv|tsv|log|xml|ya?ml|sql|mjs|cjs|[cm]?tsx?|jsx?|py|sh|ps1)$/i;
const CODE = /\.(?:mjs|cjs|[cm]?tsx?|jsx?|py|sh|ps1|pyc)$/i;
const MEDIA = /\.(?:mp3|wav|m4a|aac|flac|ogg|opus|pcm|mp4|webm|pdf|png|jpe?g|webp|gif|svg|bmp|tiff?|npz|npy|bin|dat|zip|tar|gz|7z)$/i;
const AUDIO = /\.(?:mp3|wav|m4a|aac|flac|ogg|opus|pcm)$/i;
const WEIGHT = /\.(?:safetensors|onnx|pt|pth|ckpt|gguf|tflite)$/i;
const TASK_NAME = /(?:listening|assemblyai|whole-audio|seek|reconstruction)/i;
const EXTERNAL_QA = /^(?:listening-(?:ebs|import|original-preservation|bank-visual|storage-migration-backup|style)|assemblyai-seek|whole-audio-seek|listening-seek-research)(?:-|$)/i;
const PROTECTED_PATTERNS = [
  'scripts/qa/english-listening/pattern-learning',
  'src/lib/english/listening/creation/assessment-patterns.json',
  'src/lib/english/listening/creation/assessmentPatterns.ts',
  'docs/listening-production/PATTERN-GUIDE.md',
];
const OWN = ['.qa-artifacts/listening-postgres', '.qa-artifacts/listening-samples',
  '.qa-artifacts/listening-tts-models', '.qa-artifacts/listening-tts-venv',
  'docs/listening-samples/20261003', 'docs/listening-samples/visuals'];
const slash = value => value.replaceAll('\\', '/');
const key = value => process.platform === 'win32' ? value.toLowerCase() : value;
const underRelative = (relative, prefix) => relative === prefix || relative.startsWith(`${prefix}/`);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const sorted = values => [...values].sort(compare);

export function isWithin(root, target, pathApi = path) {
  const relative = pathApi.relative(pathApi.resolve(root), pathApi.resolve(target));
  return relative === '' || (!pathApi.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${pathApi.sep}`));
}

/** Reject links at every ancestor, including a junction above the explicit root. */
export function assertNoLinks(target) {
  const absolute = path.resolve(target);
  const parsed = path.parse(absolute);
  let current = parsed.root;
  for (const segment of absolute.slice(parsed.root.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    const stat = fs.lstatSync(current);
    if (stat.isSymbolicLink()) throw new Error('LINK_PATH');
  }
  return absolute;
}

export function verifyFile(root, target) {
  const absolute = path.resolve(target);
  if (!isWithin(root, absolute)) throw new Error('PATH_ESCAPE');
  assertNoLinks(absolute);
  const stat = fs.lstatSync(absolute);
  if (!stat.isFile()) throw new Error('NOT_REGULAR_FILE');
  const realPath = fs.realpathSync.native(absolute);
  if (!isWithin(fs.realpathSync.native(root), realPath)) throw new Error('REALPATH_ESCAPE');
  return { path: realPath, bytes: stat.size, mtimeMs: stat.mtimeMs,
    device: stat.dev, inode: stat.ino, hardLinks: stat.nlink };
}

function runtimeReason(relative, isDirectory) {
  const segments = relative.split('/');
  if (segments.some(segment => segment === 'node_modules' || segment === '.git')) return 'dependency-or-git';
  if (segments.some(segment => /(?:^|[-_.])venv(?:$|[-_.])|^site-packages$|^__pycache__$/.test(segment))) return 'public-runtime';
  if (segments.some(segment => /^(?:models?|model-weights|cache-models|models--[^/]+|model-base-\d+|huggingface|huggingface-cache|hf-cache|model-cache|torch-cache)$/.test(segment))) return 'public-model';
  if (!isDirectory && (WEIGHT.test(relative) || /(?:model|weights|pytorch|recognizer|acoustic)[^/]*\.bin$/i.test(path.basename(relative)))) return 'public-model-weight';
  return null;
}

export function parseArgs(argv) {
  const options = { auditRoots: [], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--dry-run') {
      if (options.dryRun) throw new Error('DUPLICATE_FLAG');
      options.dryRun = true;
    } else if (flag === '--main' || flag === '--audit-root') {
      const value = argv[++i];
      if (!value || value.startsWith('--') || !path.isAbsolute(value)) throw new Error('ABSOLUTE_ROOT_REQUIRED');
      if (flag === '--main') {
        if (options.main) throw new Error('DUPLICATE_FLAG');
        options.main = path.resolve(value);
      } else options.auditRoots.push(path.resolve(value));
    } else throw new Error('UNSUPPORTED_FLAG');
  }
  if (!options.dryRun || !options.main) throw new Error('MAIN_AND_DRY_RUN_REQUIRED');
  if ([options.main, ...options.auditRoots].some(root => root === path.parse(root).root)) throw new Error('FILESYSTEM_ROOT_REJECTED');
  return options;
}

function readJson(root, relative) {
  return JSON.parse(fs.readFileSync(verifyFile(root, path.join(root, relative)).path, 'utf8'));
}

function strings(value, callback, property = '') {
  if (typeof value === 'string') callback(value, property);
  else if (Array.isArray(value)) value.forEach(item => strings(item, callback, property));
  else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) strings(item, callback, name);
  }
}

const tokens = text => text.toLowerCase().match(/[a-z0-9가-힣]+/g) ?? [];

/** Long exact token sequences establish copied text without retaining snippets. */
export function buildEvidence(corpus, retirement = {}) {
  const phrases = new Map();
  const identifiers = new Set();
  const references = new Set();
  const sourcePaths = [];
  const addIdentifier = value => {
    if (typeof value === 'string' && value.length >= 12) identifiers.add(value);
  };
  const addText = value => {
    if (value.length < 80 || /^(?:https?:|[A-Za-z]:[\\/]|data:)/.test(value)) return;
    const words = tokens(value);
    for (let start = 0; start + 16 <= words.length; start += 8) {
      const phrase = words.slice(start, start + 16).join(' ');
      if (phrase.length < 80) continue;
      const first = `${words[start]} ${words[start + 1]}`;
      if (!phrases.has(first)) phrases.set(first, new Set());
      phrases.get(first).add(phrase);
    }
  };
  for (const record of corpus.records ?? []) {
    addIdentifier(record.sourceRecordId);
    addIdentifier(record.setId);
    addIdentifier(record.audio?.assetId);
    strings([record.document, record.questions], addText);
    const paths = {};
    for (const field of ['sourceAudioPath', 'asrPath', 'preparedPath', 'alignmentPath']) {
      if (typeof record[field] === 'string') {
        references.add(record[field]);
        paths[field] = record[field];
      }
    }
    sourcePaths.push({ sourceRecordId: record.sourceRecordId, paths });
  }
  for (const transcript of corpus.transcripts ?? []) {
    addIdentifier(transcript.set_id);
    addIdentifier(transcript.asset_id);
    addText(transcript.text ?? '');
    addText(transcript.display_text ?? '');
  }
  for (const value of retirement.discardSetIds ?? []) addIdentifier(value);
  for (const value of retirement.discardAssets ?? []) addIdentifier(value.assetId);
  const idRegex = identifiers.size ? new RegExp(sorted(identifiers).map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')) : null;
  return {
    references, sourcePaths,
    hasIdentity: text => idRegex?.test(text) ?? false,
    hasText(text) {
      const words = tokens(text);
      for (let i = 0; i + 16 <= words.length; i++) {
        const possible = phrases.get(`${words[i]} ${words[i + 1]}`);
        if (possible?.has(words.slice(i, i + 16).join(' '))) return true;
      }
      return false;
    },
  };
}

function gitTracked(root) {
  return new Set(execFileSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\0').filter(Boolean).map(slash));
}

function commonGit(root) {
  return key(fs.realpathSync.native(execFileSync('git', ['-C', root, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim()));
}

function scopeRoots(root, tracked) {
  const scopes = [{ relative: 'output/listening-assessments', kind: 'external-output' },
    { relative: 'docs/listening-samples', kind: 'samples' }];
  const qa = path.join(root, '.qa-artifacts');
  if (fs.existsSync(qa)) {
    assertNoLinks(qa);
    for (const entry of fs.readdirSync(qa, { withFileTypes: true })) {
      if (TASK_NAME.test(entry.name)) scopes.push({ relative: `.qa-artifacts/${entry.name}`,
        kind: EXTERNAL_QA.test(entry.name) ? 'external-qa' : 'associated-qa' });
    }
  }
  // Known project scratch areas are audited by evidence, never by directory-wide disposal.
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && /^(?:scratch|tmp|temp|\.measure|\.tmp(?:-|$))/.test(entry.name)) scopes.push({ relative: entry.name, kind: 'scratch' });
    if (entry.isFile() && TASK_NAME.test(entry.name) && !/^package/.test(entry.name)) scopes.push({ relative: entry.name, kind: 'associated-root-file' });
  }
  for (const relative of tracked) {
    if (/(?:listen|assemblyai|whole-audio|reconstruct)/i.test(relative) && !scopes.some(scope => underRelative(relative, scope.relative))) scopes.push({ relative, kind: 'tracked-audit' });
  }
  for (const relative of PROTECTED_PATTERNS) {
    if (!scopes.some(scope => underRelative(relative, scope.relative))) scopes.push({ relative, kind: 'pattern-output' });
  }
  return scopes.sort((a, b) => compare(a.relative, b.relative));
}

function initialProtection(relative, directory) {
  if (underRelative(relative, CONTROL)) return 'live-retirement-control';
  const runtime = runtimeReason(relative, directory);
  if (runtime) return runtime;
  if (PROTECTED_PATTERNS.some(prefix => underRelative(relative, prefix))) return 'abstract-production-pattern';
  return null;
}

function enumerate(root, scopes, worktree, issues, protectedPaths, counts) {
  const files = [];
  const visited = new Set();
  const walk = (absolute, scope) => {
    if (!isWithin(root, absolute)) { issues.push({ path: absolute, reason: 'scope-escape-rejected' }); return; }
    const relative = slash(path.relative(root, absolute));
    let stat;
    try { stat = fs.lstatSync(absolute); }
    catch (error) { issues.push({ path: absolute, reason: 'missing-or-unreadable', errorCode: error.code ?? 'UNKNOWN' }); return; }
    if (stat.isSymbolicLink()) { protectedPaths.push({ path: absolute, reason: 'symlink-or-junction', worktree }); counts.skippedLinks++; return; }
    const protection = initialProtection(relative, stat.isDirectory());
    if (protection && stat.isDirectory() && protection !== 'abstract-production-pattern') {
      protectedPaths.push({ path: absolute, reason: protection, worktree, descendantsEnumerated: false });
      counts.excludedDirectories++; return;
    }
    if (visited.has(key(absolute))) return;
    visited.add(key(absolute));
    try {
      const real = fs.realpathSync.native(absolute);
      if (!isWithin(root, real) || key(real) !== key(path.resolve(absolute))) throw new Error('REALPATH_ESCAPE');
      if (stat.isDirectory()) {
        counts.directories++;
        for (const name of sorted(fs.readdirSync(absolute))) walk(path.join(absolute, name), scope);
      } else if (stat.isFile()) {
        const verified = verifyFile(root, absolute);
        files.push({ ...verified, relative, scope: scope.kind, scopeRoot: scope.relative, worktree, protection });
        counts.files++;
        counts.bytes += stat.size;
      } else issues.push({ path: absolute, reason: 'non-regular-entry' });
    } catch (error) { issues.push({ path: absolute, reason: 'verification-or-read-error', errorCode: error.code ?? error.message }); }
  };
  for (const scope of scopes) {
    const absolute = path.resolve(root, scope.relative);
    if (!fs.existsSync(absolute)) continue;
    // Also validate ancestors of an individually tracked file before traversing it.
    try { assertNoLinks(absolute); walk(absolute, scope); }
    catch (error) { protectedPaths.push({ path: absolute, reason: 'linked-or-unreadable-scope', worktree }); issues.push({ path: absolute, reason: 'scope-not-enumerated', errorCode: error.code ?? error.message }); }
  }
  return files;
}

function inspect(file, evidence, issues) {
  const signals = { copiedText: false, sourceIdentity: evidence.hasIdentity(file.relative), referenced: false };
  if (!TEXT.test(file.relative)) return signals;
  if (file.bytes > MAX_TEXT_BYTES) {
    issues.push({ path: file.path, bytes: file.bytes, reason: 'text-over-inspection-limit' });
    signals.inspectionIncomplete = true;
    return signals;
  }
  try {
    const checked = verifyFile(file.root, file.path);
    if (checked.bytes !== file.bytes || checked.mtimeMs !== file.mtimeMs) throw new Error('FILE_CHANGED');
    const text = fs.readFileSync(checked.path, 'utf8');
    signals.sourceIdentity ||= evidence.hasIdentity(text);
    signals.copiedText = evidence.hasText(text);
    // Only the explicit external output can introduce extra path references.
    if (file.scope === 'external-output' && /\.json$/i.test(file.relative)) {
      try {
        const parsed = JSON.parse(text);
        strings(parsed, (value, property) => {
          if (/path|file|directory|input|output/i.test(property) && path.isAbsolute(value) && !value.includes('\n')) evidence.references.add(value);
        });
      } catch { /* Non-JSON API logs still receive text/identity inspection. */ }
    }
  } catch (error) {
    issues.push({ path: file.path, reason: 'content-inspection-failed', errorCode: error.code ?? error.message });
    signals.inspectionIncomplete = true;
  }
  return signals;
}

export function classify(file, signals, taskEvidence = false) {
  const relative = file.relative;
  if (file.protection) return { action: 'protected', reason: file.protection, contamination: signals.copiedText };
  const own = OWN.some(prefix => underRelative(relative, prefix));
  const code = CODE.test(relative);
  if (signals.copiedText) return { action: 'material', reason: 'exact-corpus-text-copy' };
  if (own) return { action: 'protected', reason: 'own-authored-or-tts-sample', privateIdentityReview: signals.sourceIdentity };
  if (code && signals.inspectionIncomplete) return { action: 'ambiguous', reason: 'code-content-inspection-incomplete' };
  if (code) return { action: 'protected', reason: 'project-code-without-confirmed-copied-text', privateIdentityReview: signals.sourceIdentity };
  if (signals.referenced) return { action: 'material', reason: 'frozen-corpus-or-inventory-file-reference' };
  if (signals.sourceIdentity) return { action: 'material', reason: 'external-corpus-identity-or-record-copy' };
  if (underRelative(relative, 'docs/listening-samples') && /(?:ebs-catalog|public-sources)/i.test(path.basename(relative))) return { action: 'material', reason: 'foreign-source-catalog' };
  if (file.scope === 'external-output' && (TEXT.test(relative) || MEDIA.test(relative))) return { action: 'material', reason: 'external-listening-output-material' };
  if (file.scope === 'external-qa' && (TEXT.test(relative) || MEDIA.test(relative))) return { action: 'material', reason: 'external-listening-verification-material' };
  if (taskEvidence && MEDIA.test(relative)) return { action: 'material', reason: 'corpus-bearing-task-media-copy' };
  if ((file.scope === 'associated-qa' || file.scope === 'associated-root-file') && (TEXT.test(relative) || MEDIA.test(relative))) return { action: 'ambiguous', reason: 'associated-task-without-corpus-proof' };
  if (file.scope === 'scratch' && (AUDIO.test(relative) || TASK_NAME.test(relative))) return { action: 'ambiguous', reason: 'scratch-material-without-corpus-proof' };
  if (signals.inspectionIncomplete) return { action: 'ambiguous', reason: 'content-inspection-incomplete' };
  return { action: 'protected', reason: file.scope === 'scratch' ? 'unrelated-scratch-work' : 'no-confirmed-copied-material' };
}

function aggregate(rows) {
  const categories = {};
  let bytes = 0;
  for (const row of rows) {
    bytes += row.bytes ?? 0;
    const category = categories[row.reason] ??= { count: 0, bytes: 0 };
    category.count++;
    category.bytes += row.bytes ?? 0;
  }
  return { count: rows.length, bytes, categories };
}

/** No source text, IDs, titles, URLs, dates/rounds, paths or hashes in this product. */
export function summarize(plan) {
  return {
    schemaVersion: 1, mode: 'read-only-dry-run',
    inputs: plan.inputCounts, coverage: plan.coverage.aggregate,
    enumerated: plan.enumerated,
    deletionCandidates: aggregate(plan.deletionCandidates),
    trackedSourceReview: aggregate(plan.trackedSourceReview),
    worktreeMaterialReview: aggregate(plan.worktreeMaterialReview),
    protected: aggregate(plan.protectedPaths),
    ambiguous: aggregate(plan.ambiguities),
    sourceIdentityReview: aggregate(plan.sourceIdentityReview),
    references: plan.referenceCoverage,
    limitations: aggregate(plan.limitations),
  };
}

export function inventory({ main, auditRoots = [], corpus, retirement = {}, quarantine = {}, trackedByRoot, validateGit = true }) {
  main = assertNoLinks(path.resolve(main));
  if (main === path.parse(main).root) throw new Error('FILESYSTEM_ROOT_REJECTED');
  const roots = sorted(new Set([main, ...auditRoots.map(root => assertNoLinks(path.resolve(root)))]));
  if (roots.some(root => root === path.parse(root).root)) throw new Error('FILESYSTEM_ROOT_REJECTED');
  if (validateGit) {
    const common = commonGit(main);
    for (const root of roots) if (commonGit(root) !== common) throw new Error('UNRELATED_WORKTREE_REJECTED');
  }
  const evidence = buildEvidence(corpus, retirement);
  const plan = {
    schemaVersion: 1, mode: 'read-only-dry-run', main, explicitRoots: roots,
    inputCounts: { externalSources: corpus.records?.length ?? 0,
      questions: corpus.questionCount ?? (corpus.records ?? []).reduce((n, record) => n + (record.questions?.length ?? 0), 0),
      transcripts: corpus.transcripts?.length ?? 0, externalAssets: retirement.discardAssets?.length ?? 0,
      storageBlobReferences: retirement.storageBlobs?.length ?? 0, retainedOwnSets: retirement.retainedSetIdentities?.length ?? quarantine.retainedSets ?? 0 },
    enumerated: { roots: roots.length, directories: 0, files: 0, bytes: 0, excludedDirectories: 0, skippedLinks: 0 },
    deletionCandidates: [], trackedSourceReview: [], worktreeMaterialReview: [],
    protectedPaths: [], ambiguities: [], sourceIdentityReview: [], limitations: [],
    protectedReferences: [], directoryReferences: [],
    referenceCoverage: { enumeratedFiles: 0, protectedNotEnumerated: 0, directoryReferences: 0, missingOrOutsideScope: 0 },
    scope: [], coverage: { sources: [], aggregate: {} },
    deletionGate: 'Root must seal abstract patterns, review this private plan, and reverify every path/size/mtime/link before any deletion; worktrees and tracked files require a separate scoped choice.',
  };
  const allFiles = [];
  const tracked = new Map();
  for (const root of roots) {
    const entries = trackedByRoot?.get(root) ?? gitTracked(root);
    tracked.set(root, entries);
    const scopes = scopeRoots(root, entries);
    plan.scope.push({ root, worktree: root !== main, scopes });
    const files = enumerate(root, scopes, root !== main, plan.limitations, plan.protectedPaths, plan.enumerated);
    for (const file of files) allFiles.push({ ...file, root, tracked: entries.has(file.relative) });
  }
  const signals = new Map();
  const taskProof = new Set();
  for (const file of allFiles) {
    const found = inspect(file, evidence, plan.limitations);
    signals.set(file.path, found);
    if (!CODE.test(file.relative) && (found.copiedText || found.sourceIdentity) && !OWN.some(prefix => underRelative(file.relative, prefix))) taskProof.add(`${file.root}|${path.dirname(file.path)}`);
  }
  const references = new Set();
  for (const reference of evidence.references) {
    const absolute = path.resolve(reference);
    if (roots.some(root => isWithin(root, absolute))) references.add(key(absolute));
    else plan.limitations.push({ path: reference, reason: 'inventory-reference-outside-explicit-roots' });
  }
  for (const file of allFiles) {
    const found = signals.get(file.path);
    found.referenced = references.has(key(file.path));
    // Inventory references in MAIN have equivalent copies at the same relative worktree path.
    if (file.worktree) found.referenced ||= references.has(key(path.resolve(main, file.relative)));
    const choice = classify(file, found, taskProof.has(`${file.root}|${path.dirname(file.path)}`));
    const row = { path: file.path, bytes: file.bytes, reason: choice.reason,
      root: file.root, relative: file.relative, worktree: file.worktree, tracked: file.tracked,
      mtimeMs: file.mtimeMs, device: file.device, inode: file.inode, hardLinks: file.hardLinks,
      proof: { scope: file.scope, exactCopiedText: found.copiedText, externalIdentity: found.sourceIdentity, frozenReference: found.referenced } };
    if (choice.contamination) plan.ambiguities.push({ ...row, reason: 'protected-pattern-has-corpus-text' });
    if (choice.privateIdentityReview) plan.sourceIdentityReview.push({ ...row, reason: 'retained-code-or-own-sample-has-private-reference' });
    if (file.hardLinks > 1) plan.ambiguities.push({ ...row, reason: 'hardlink-aliases-not-independently-located' });
    if (choice.action === 'material') {
      if (file.worktree) plan.worktreeMaterialReview.push({ ...row, disposition: 'preserve-active-worktree-root-review-only' });
      else if (file.tracked) plan.trackedSourceReview.push({ ...row, disposition: 'tracked-file-scoped-root-choice' });
      else plan.deletionCandidates.push(row);
    } else if (choice.action === 'ambiguous') plan.ambiguities.push(row);
    else plan.protectedPaths.push(row);
  }
  const fileMap = new Map(allFiles.filter(file => !file.worktree).map(file => [key(file.path), file]));
  const fields = ['sourceAudioPath', 'asrPath', 'preparedPath', 'alignmentPath'];
  const coverage = Object.fromEntries(fields.map(field => [field, { expected: 0, verified: 0, missingOrExcluded: 0 }]));
  for (const record of evidence.sourcePaths) {
    const paths = {};
    for (const [field, reference] of Object.entries(record.paths)) {
      const absolute = path.resolve(reference);
      coverage[field].expected++;
      const file = fileMap.get(key(absolute));
      const verified = Boolean(file);
      coverage[field][verified ? 'verified' : 'missingOrExcluded']++;
      paths[field] = { path: absolute, verified, ...(file ? { bytes: file.bytes } : {}) };
      if (!verified) plan.limitations.push({ path: absolute, reason: 'frozen-primary-path-not-enumerated' });
    }
    plan.coverage.sources.push({ sourceRecordId: record.sourceRecordId, paths });
  }
  plan.coverage.aggregate = coverage;
  // References outside the narrow enumeration remain visible, without silently expanding scope.
  const enumeratedPaths = new Set(allFiles.map(file => key(file.path)));
  for (const reference of sorted(references)) {
    if (enumeratedPaths.has(reference)) { plan.referenceCoverage.enumeratedFiles++; continue; }
    const root = roots.find(candidate => isWithin(candidate, reference));
    const relative = slash(path.relative(root, reference));
    const protectedReason = initialProtection(relative, false);
    if (protectedReason && protectedReason !== 'abstract-production-pattern') {
      plan.protectedReferences.push({ path: reference, reason: protectedReason, descendantsEnumerated: false });
      plan.referenceCoverage.protectedNotEnumerated++;
      continue;
    }
    try {
      assertNoLinks(reference);
      if (fs.lstatSync(reference).isDirectory()) {
        plan.directoryReferences.push({ path: reference, reason: 'directory-reference-without-scope-expansion' });
        plan.referenceCoverage.directoryReferences++;
        continue;
      }
    } catch { /* Missing, linked or uninspected references remain explicit. */ }
    plan.limitations.push({ path: reference, reason: 'referenced-path-missing-or-outside-enumerated-scope' });
    plan.referenceCoverage.missingOrOutsideScope++;
  }
  for (const category of ['deletionCandidates', 'trackedSourceReview', 'worktreeMaterialReview', 'protectedPaths', 'ambiguities', 'sourceIdentityReview', 'limitations']) plan[category].sort((a, b) => compare(a.path, b.path) || compare(a.reason, b.reason));
  return { plan, summary: summarize(plan) };
}

export function writeReports(main, plan, summary) {
  const directory = path.join(main, CONTROL);
  assertNoLinks(directory);
  if (!fs.lstatSync(directory).isDirectory()) throw new Error('PRIVATE_REPORT_DIRECTORY_REQUIRED');
  for (const [name, document] of [['local-deletion-plan-private.json', plan], ['summary.json', summary]]) {
    const target = path.join(directory, name);
    if (!isWithin(directory, target)) throw new Error('REPORT_ESCAPE');
    if (fs.existsSync(target) && verifyFile(main, target).hardLinks !== 1) throw new Error('HARDLINK_REPORT_REJECTED');
    // Do not follow a dangling link either.
    try { if (fs.lstatSync(target).isSymbolicLink()) throw new Error('LINK_REPORT'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    const fd = fs.openSync(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW ?? 0), 0o600);
    try { fs.writeFileSync(fd, `${JSON.stringify(document, null, 2)}\n`); }
    finally { fs.closeSync(fd); }
    verifyFile(main, target);
  }
}

export function main(argv) {
  const options = parseArgs(argv);
  const result = inventory({ ...options,
    corpus: readJson(options.main, `${CONTROL}/corpus-private.json`),
    retirement: readJson(options.main, `${CONTROL}/retirement-private.json`),
    quarantine: readJson(options.main, `${CONTROL}/quarantine-summary.json`),
  });
  writeReports(options.main, result.plan, result.summary);
  // Bounded aggregate stdout only. Full path evidence exists solely in the private report.
  console.log(JSON.stringify({ mode: result.summary.mode, enumeratedFiles: result.summary.enumerated.files,
    enumeratedBytes: result.summary.enumerated.bytes, candidates: result.summary.deletionCandidates.count,
    candidateBytes: result.summary.deletionCandidates.bytes, trackedReview: result.summary.trackedSourceReview.count,
    worktreeReview: result.summary.worktreeMaterialReview.count, ambiguities: result.summary.ambiguous.count,
    limitations: result.summary.limitations.count, coverage: result.summary.coverage }));
  return result.summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch { console.error('Read-only inventory failed; no deletion was performed. Check arguments, explicit roots, and private input files.'); process.exitCode = 1; }
}
