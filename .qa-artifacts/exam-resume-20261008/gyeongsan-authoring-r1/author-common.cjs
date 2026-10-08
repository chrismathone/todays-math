const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const katex = require('katex');
const sharp = require('sharp');
require('tsx/cjs');
const project = path.resolve(__dirname, '../../..');
const { renderFigureSpec } = require(path.join(project, 'src/lib/figure/renderFigureSpec.ts'));
process.env.VERCEL = '0';
delete process.env.STUDIO_ENGINE_URL;
delete process.env.FIGURE_ENGINE_PATH;
const parent = 'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008';
const evidenceRoot = path.join(parent, '.qa-artifacts/exam-resume-20261008');
const packetPath = path.join(__dirname, 'source-snapshot/packet/questions.json');
const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
const bankPath = path.join(evidenceRoot, 'bank-read-fresh-r2-20261008.json');
const registryPath = path.join(evidenceRoot, 'registry-read-20261008.json');
const curriculumPath = path.join(evidenceRoot, 'curriculum-evidence.json');
const bank = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const curriculum = JSON.parse(fs.readFileSync(curriculumPath, 'utf8'));
const authorId = 'orca-codex-exam-twin-author-algebra-20261008';
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = v => Array.isArray(v) ? '[' + v.map(canonical).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}' : JSON.stringify(v);
const digest = v => sha(Buffer.from(canonical(v)));
const write = (file, data) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); };
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const assert = (ok, text) => { if (!ok) throw Error(text); };
const marks = ['①', '②', '③', '④', '⑤'];
const graph = (curves, xRange, yRange, labels = [], extra = {}) => ({ version: 'graph-1', width: 260, height: 250, xRange, yRange, curves, labels, ...extra });
const geo = (points, segments, angles = {}, labels = null, extra = {}) => ({ version: 2, theme: 'exam-thin', points, segments, angles, labels: labels || Object.fromEntries(Object.keys(points).map(k => [k, k])), style: { font_size: 20, angle_font_size: 18 }, ...extra });

function unitProposal(definition) {
  const key = definition.familyKey;
  const exact = key && registry.entries.find(x => x.key === key);
  const live = exact && bank.liveFamilies.find(x => x.family_key === 'mid:' + exact.key);
  const unit = live && bank.units.find(x => x.id === live.unit_id);
  if (exact && live && unit && definition.familyRationale && definition.ruleEvidence) {
    assert(unit.grade === '중3', 'Family is not middle3');
    return { status: 'proposed', unitId: unit.id, familyKey: live.family_key, currentUnit: unit, currentRegistryMatch: exact, liveCount: live.live_count, checkedAt: bank.capturedAt, evidence: definition.familyRationale, generatorRuleEvidence: definition.ruleEvidence, approval: 'author-proposal-only' };
  }
  return { status: 'pending', unitId: null, familyKey: null, currentUnit: null, currentRegistryMatch: null, liveCount: null, checkedAt: bank.capturedAt, evidence: definition.familyHold || '새 표현/역산과 현재 live family·생성 규칙의 정확한 의미 대응은 별도 검토가 필요하다. 임의의 가장 가까운 유형을 배정하지 않았다.', candidates: definition.familyCandidates || [] };
}

async function author(definition) {
  const n = definition.n, nn = String(n).padStart(2, '0');
  const source = packet.questions.find(x => x.number === n);
  assert(source && packet.school === '경산중' && packet.originalCorrectChoiceAndSolutionWithheld === true, 'Wrong source packet');
  const out = path.join(__dirname, 'candidates', 'q' + nn);
  assert(!fs.existsSync(path.join(out, 'candidate.json')), 'Refuse to replace a frozen candidate');
  fs.mkdirSync(out, { recursive: true });
  const result = definition.calculate();
  assert(result.optionChecks.length === 5 && result.optionChecks.filter(x => x.correct).length === 1, 'Exactly one answer is required');
  const index = result.optionChecks.findIndex(x => x.correct);
  assert(index === result.answerIndex, 'Answer index disagrees with code option checks');
  assert(result.domainChecks.every(x => x.passed), 'Invalid domain or conditions');
  const artifacts = [];
  for (const asset of definition.figures || []) {
    const specName = asset.name + '.spec.json', svgName = asset.name + '.svg';
    write(path.join(out, specName), asset.spec);
    const rendered = await renderFigureSpec(asset.spec, { strict: true });
    assert(rendered.ok, 'Strict figure failed q' + nn + ': ' + rendered.error);
    assert(!(rendered.droppedDimensions || []).length, 'No silent dimension removal');
    fs.writeFileSync(path.join(out, svgName), rendered.svg);
    const widthMm = asset.widthMm || 70;
    assert(widthMm <= 70 && widthMm > 0, 'Bank70mm cap');
    await sharp(Buffer.from(rendered.svg)).resize({ width: Math.round(widthMm / 25.4 * 96) }).flatten({ background: 'white' }).png().withMetadata({ density: 96 }).toFile(path.join(out, asset.name + '.70mm.png'));
    artifacts.push({ role: asset.role || 'stem', specPath: specName, svgPath: svgName, intendedWidthMm: widthMm });
  }
  const score = source.scoreEvidence.referenceParentScore;
  assert(score === source.scoreEvidence.selectedHwpPdfPrintedParentScore, 'Source points mismatch');
  const standardCodes = definition.codes || ['9수03-09', '9수03-10'];
  for (const code of standardCodes) assert(curriculum.achievement_standards.some(s => s.code === code && s.scope === 'middle_school_grades_1_to_3_band'), 'Missing official middle standard ' + code);
  const candidate = {
    schemaVersion: 1, questionNumber: n, twinExternalId: 'exam-twin-gyeongsan-2025-2-mid-author-r1-q' + nn, authorId,
    content: definition.content, choices: definition.choices, answer: marks[index], solution: definition.solution, score, questionType: '객관식',
    facts: result.facts, figureArtifacts: artifacts,
    variantDelta: { modes: definition.modes, before: definition.before, after: definition.after, sharedConcept: definition.concept, sharedProcedure: definition.procedure, objectiveDifficulty: definition.difficulty, scoreDelta: { source: score, authored: score, changed: false } },
    curriculumReview: { grade: '중3', edition: '2015', standardCodes, allowedProcedure: definition.procedure, forbiddenAvoided: definition.forbiddenAvoided || ['일반 이차함수 최적화', '미분', '근과 계수의 관계', '일반 포물선/직선 교점 이론'], status: 'author-proposed', surfaces: Object.fromEntries(['stem', 'choices', 'figuresAndTables', 'notation', 'answer', 'studentSolution', 'prerequisites'].map(k => [k, { status: 'author-proposed', evidence: definition.surfaceEvidence[k] }])), gradeBasis: definition.gradeBasis, exactGradeApproval: false },
    sourceReference: { externalId: source.sourceQuestionId, examId: packet.inventoryExamId, sourcePacketExamId: packet.examId, school: packet.school, questionNumber: n, sourceContentSha256: source.sourceContentDigest, sourcePacketSha256: sha(fs.readFileSync(packetPath)), sourceQuestionOnlySnapshot: 'source-snapshot/packet/questions.json', sourceQuestionScore: score, sourceQuestionType: '객관식', sourceQuestionParts: source.subQuestions, sourceStatus: source.status, sourceObservation: definition.before, originalAnswersOrSolutionsUsed: false },
    metadata: { grade: '중3', subject: '수학', curriculum: { sourceExam: '2015', target: '2015', grade: '중3', sourceExamSemester: 2, republicationTo2022: 'requires-separate-review' }, sourceExamYear: 2025, sourceExamSemester: 2, sourceExamRound: '중간', questionType: '객관식', score, difficultyProposal: definition.level || '응용', difficultyStatus: 'pending-independent-review', problemTypeProposal: definition.problemType || null, problemTypeStatus: 'pending-independent-review', hasFigure: artifacts.length > 0, assignment: unitProposal(definition), achievementStandardRefs: curriculum.achievement_standards.filter(s => standardCodes.includes(s.code)), achievementStandardStatus: 'official-text-matched-candidate-author-proposed', sourceIdentityReview: { status: 'source-packet-identity-supported-full-custody-held', sourceSchool: '경산중', sourceYear: 2025, sourcePacketDecision: packet.identityDecision, fullPairCertification: 'held', custody: 'held', rights: 'held' }, bankEvidence: { path: bankPath, sha256: sha(fs.readFileSync(bankPath)), capturedAt: bank.capturedAt, registrySha256: sha(fs.readFileSync(registryPath)), curriculumEvidenceSha256: sha(fs.readFileSync(curriculumPath)), databaseAccessByAuthor: false }, authorEvidence: { calculationsPath: 'author-calculations.json', authoringScriptSha256: definition.scriptSha256, visualReview: 'pending-local-view', mathematicalReview: 'author-self-check-only' } },
    schoolNamePolicy: { actual: '경산중', display: '해솔누리중학교', role: 'fictional-display-alias-only', originalOccurrencesInStem: 0, surfaces: ['content', 'choices', 'tables', 'figureLabels', 'solution'], review: 'author-proposed' },
    independentVerification: null,
    review: { status: 'pending', mathematicalCorrectness: 'pending-independent-blind-solve', gradeCurriculum: 'pending-independent-review', equivalentConceptAndMethod: 'pending-independent-review', distinctPresentation: 'pending-independent-review', naturalKorean: 'pending-independent-review', figure: 'pending-independent-review', rights: 'pending', similarity: 'pending', nativeCompatibility: 'pending', physicalPaper: 'not-approved' },
    directUseAllowed: false,
  };
  assert(candidate.choices.length === 5 && new Set(candidate.choices).size === 5, 'Unique five displayed choices');
  for (const text of [candidate.content, ...candidate.choices, candidate.answer, candidate.solution]) {
    assert(!text.includes('경산중') && !text.includes('경산여'), 'Source school leaked to student surface');
    for (const m of text.matchAll(/\$([^$]+)\$/g)) katex.renderToString(m[1], { throwOnError: true, strict: 'error' });
  }
  const calculation = { schemaVersion: 1, authorId, questionNumber: n, sourceQuestionDigest: source.sourceContentDigest, variantDigest: digest(candidate.variantDelta), mathInCode: true, authorSelfCheckOnly: true, independentApproval: false, ...result };
  write(path.join(out, 'author-calculations.json'), calculation);
  write(path.join(out, 'candidate.json'), candidate);
  console.log(JSON.stringify({ authored: nn, score, answer: candidate.answer, figures: artifacts.length, family: candidate.metadata.assignment.familyKey, grade: 'author-proposed' }));
  return candidate;
}

module.exports = { author, graph, geo, approx, assert, marks, sha, digest, write, packet, bank, registry, curriculum, project, authorId };
