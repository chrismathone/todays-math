import fs from 'node:fs';
import assert from 'node:assert/strict';
import { bindCandidate, sha256 } from '../../../scripts/import/exam-twin/candidatePack.mjs';
const base = '.qa-artifacts/exam-resume-20261008/';
const out = base + 'gangbuk-authoring-r1/';
assert(!fs.existsSync(out));
const sourcePath = base + 'fresh-source-extraction-20261019-r2/personal-ae2bb575dbaef34005e65cdeedba6860/source-manifest.local.json';
const source = JSON.parse(fs.readFileSync(sourcePath));
const original = source.questions.find((q) => q.number === 1);
const ev = (path) => ({ path, sha256: sha256(fs.readFileSync(path)) });
const official = ev(base + 'bumil-q07-curriculum-adjudication-r1/official-provisions.json');
const live = ev(base + 'engine-upgrade-20261019/live-family-snapshot-r1.json');
const liveData = JSON.parse(fs.readFileSync(live.path));
const unitId = '1682f01b-5293-4672-91cd-07fc02e305ac';
assert(liveData.units.some((u) => u.id === unitId && u.grade === '중3' && u.semester === 1));
const candidate = {
  schemaVersion: 1, questionNumber: 1,
  twinExternalId: 'exam-twin-gangbuk-2025-1-mid-author-r1-q01',
  authorId: 'codex-parent-engine-upgrade-20261019', questionType: '객관식', score: 3,
  content: '양수 $N$과 두 수 $a$, $b$가 다음 조건을 모두 만족시킨다. $N$의 값은?\n\n(가) $a<0$, $a^2=\\sqrt{81}$\n(나) $b>0$, $b^2=N$\n(다) $a+b=7$',
  choices: ['$16$', '$49$', '$81$', '$100$', '$256$'], answer: '④',
  solution: '$\\sqrt{81}=9$이므로 $a^2=9$이다. $a<0$이므로 $a=-3$이다.\n\n$a+b=7$에 $a=-3$을 대입하면 $-3+b=7$이므로 $b=10$이다.\n\n따라서 $N=b^2=10^2=100$이다. $b=10>0$이고 $N=100>0$이므로 주어진 조건을 모두 만족시킨다.',
  figureArtifacts: [],
  variantDelta: {
    modes: ['structure', 'inverse-target'],
    before: '부호가 지정된 두 제곱근을 순서대로 구한 뒤 두 값의 합을 묻는다.',
    after: '조건을 부호·제곱 관계로 조직하고 합을 조건으로 주어 양의 제곱근의 입력 N을 역으로 구한다.',
    sharedConcept: '제곱근의 정의, 근호의 값, 음/양의 제곱근의 구분',
    sharedProcedure: '안쪽 근호 값을 구함 → 부호 조건으로 제곱근을 선택 → 두 값의 관계를 이용',
    actualStructuralChange: '묻던 합이 주어진 조건이 되고, 원문의 두 번째 고정 입력이 미지수가 된다. 근호·부호를 진술하던 정보를 세 개의 조건식으로 바꾸었다.',
    numericalChangeIsNotSufficient: true,
    domainProof: 'a²=9와 a<0으로 a=-3만 가능하고, 합7로 b=10만 가능하다. N=b²=100은 양수이며 b>0도 만족한다.',
    difficultyBasis: '원문처럼 근호 평가, 부호에 따른 제곱근 선택, 두 수의 관계 계산을 사용한다. 마지막 제곱은 정의의 역방향이며 새로운 선수 개념은 필요 없다. 난이도는 저자 제안으로 독립 검토 대기.',
  },
  sourceReference: {
    externalId: '2025-gangbuk-3-1-mid-1',
    newSourceReferenceId: 'source-ref-gangbuk-2025-1-mid-r1-q01',
    sourceContentSha256: original.sourceContentDigest,
    sourceSchoolInternal: '강북중학교', sourceExamYear: 2025,
    inventoryExamId: source.inventoryExamId,
    sourceManifest: ev(sourcePath), sourceFiles: source.inputs,
    sourceIdentityAsProvided: 'printed2025-grade3-semester1-midterm-observed; whole-pair/custody not certified',
    originalQuestionCrop: ev(base + 'fresh-source-extraction-20261019-r2/personal-ae2bb575dbaef34005e65cdeedba6860/reviewer-only/question-01-part1.png'),
    sourceCropViewed: true, originalAnswerKeyUsed: false,
    sourceTextCopiedToCandidate: false,
  },
  curriculumReview: {
    grade: '중3', edition: '2015', status: 'author-proposed', standardCodes: ['9수01-07'],
    officialProvisions: official,
    legitimateMethodDraft: '제곱근의 정의와 부호, 이미 배운 일차식의 수 대입/정리만 사용한다. 이차방정식의 일반 해법이나 상위 학년 도구가 필요하지 않다.',
    independentReviewPending: true,
  },
  metadata: {
    grade: '중3', subject: '수학', curriculum: { sourceExam: '2015', target: '2015', grade: '중3', sourceExamSemester: 1, republicationTo2022: 'requires-separate-review' },
    sourceExamYear: 2025, sourceExamSemester: 1, sourceExamRound: '중간', questionType: '객관식', answerFormat: 'single-choice', score: 3,
    difficultyProposal: '기본', difficultyStatus: 'author-proposed', sourceDifficultyObserved: '하',
    problemTypeProposal: '계산', problemTypeStatus: 'author-proposed',
    assignment: { status: 'pending', unitId, familyKey: null,
      evidence: '실제 중3 제곱근의 뜻과 성질 UUID/학기와 live family snapshot을 확인했다. 제곱근 구하기04 등 직접 결과를 묻는 기존 family를 입력 역추론 문항에 자동 배정하지 않는다.', snapshot: live },
    schoolSubstitution: { visibleSchoolNames: [], replacementRequired: false, reason: '새 본문/보기/해설/그림에 학교명이 없다. 실제 학교는 내부 출처에만 보존한다.' },
    figureAuthoring: { method: 'not-required-pure-algebra', originalCropEmbedded: false },
    authorOnly: true, independentMathApproval: false, independentGradeApproval: false,
    sourceIdentityApproved: false, rightsApproved: false, similarityApproved: false, nativeProvenanceApproved: false, loadable: false,
  },
};
// Author calculations only. This is not the required independent blind proof.
const possible = [];
for (let a = -20; a < 0; a++) for (let b = 1; b <= 30; b++) {
  if (a * a === Math.sqrt(81) && a + b === 7) possible.push({ a, b, N: b * b });
}
assert.deepEqual(possible, [{ a: -3, b: 10, N: 100 }]);
assert.equal(candidate.choices.filter((v) => Number(v.replaceAll('$', '')) === possible[0].N).length, 1);
fs.mkdirSync(out);
const file = out + 'q01.json';
fs.writeFileSync(file, JSON.stringify(candidate, null, 2) + '\n', { flag: 'wx' });
const binding = bindCandidate(file);
fs.writeFileSync(out + 'author-calculations.json', JSON.stringify({ kind: 'author-calculation-not-independent/v1', possible, answer: '④', choices: candidate.choices, uniquenessProof: candidate.variantDelta.domainProof, candidate: ev(file), studentDigest: binding.studentDigest, assetDigest: binding.assetDigest, candidateDigest: binding.candidateDigest, authorOnly: true, independentReview: false, loadable: false }, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(out + 'candidate-index.json', JSON.stringify({ questions: [{ n: 1, id: candidate.twinExternalId, candidate: file, sha256: binding.candidateFileSha256 }], authored: 1, figures: 0, independentReviews: 0, loadable: 0 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ authored: 1, independentReviews: 0, loadable: 0, studentDigest: binding.studentDigest }));
