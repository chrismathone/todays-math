/** Local authored twin. Existing vector engine; no source modification or DB. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { figInscribedIso } from "../../../src/lib/middle/m3Figures";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import { bindCandidate, readJson, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";

const base = ".qa-artifacts/exam-resume-20261008";
const out = path.join(base, "gyeongsin-authoring-r1");
const component = path.join(base, "gyeongsin-source-component-review-20261019-r1");
const oldManifest = path.join(base, "next-five-extraction-r1/gyeongsin/source-manifest.json");
const source = readJson(path.join(component, "input-and-render-receipt.json"));
const prior = readJson(oldManifest);
const oldManifestSha = sha256(fs.readFileSync(oldManifest));
const q = prior.questions.find((q: any) => q.number === 1);
const originalSha = sha256(fs.readFileSync(source.source.path));
assert.equal(originalSha, source.source.sha256);
assert.equal(oldManifestSha, source.sourceManifestSha256);
const write = (file: string, value: unknown) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
const ref = (file: string) => ({ path: file.replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(file)) });

async function main() {
  const reviewed = {
    kind: "source-question-component-observation/v1",
    createdAt: new Date().toISOString(),
    reviewer: "codex-parent-engine-upgrade-20261019",
    sourceOriginal: { ...source.source, observedExamDate: "2025-09-19", observedSchool: "경신중학교", copyrightNoticeObserved: true },
    priorCompletedPairManifest: ref(oldManifest),
    oldWholePairStatus: prior.identity.status,
    observedOriginalPages: [1], originalAnswerKeyRead: false,
    question: { number: 1, priorSourceContentDigest: q.sourceContentDigest, completedCrop: ref(path.join(base, "next-five-extraction-r1/gyeongsin/packet/images/q01-part1.png")),
      conditionRolesMatch: true, askedAngleRoleMatch: true, choiceValuesAndOrderMatch: true,
      circleCenterChordPerpendicularRolesMatch: true, printedScoreMatch: true, printedScore: 4,
      basis: "원본 page1 상단과 완료본 q1을 view_image로 직접 시각 대조했다.",
      evidence: "원본 첫 쪽의 시험일·학년·학기와 완료본 q1의 조건 관계, 질문 대상, 선택지 순서, 원/현/수선의 발 역할 및 배점이 일치함을 시각 대조했다. 픽셀로 길이나 각을 측정하지 않았다.",
      observationStatus: "matches-2025-original-question-component", authoringReference: "2025-original-only" },
    wholePairCertified: false, otherQuestionsCertified: false, oldFilesModified: false,
    sourceIdentityApproved: false, custodyReview: "pending", rightsReview: "pending-copyright-notice-observed",
    similarityReview: "pending-new-authored-candidate", mathematicalApprovals: 0, gradeApprovals: 0, loadable: 0,
    limitations: ["완료본 HWP/PDF 전체의 2024/2025 헤더 충돌은 해결하지 않았다.", "이 관찰은 첫 문항의 2025 원본 대응에 한정된다. 이용 허락이나 저작권 위험 해소를 뜻하지 않는다.", "원본 크롭은 로컬 검토 자료이며 Git에 게시하거나 새 그림으로 세지 않는다."],
  };
  const observationFile = path.join(component, "q01-component-review.json");
  if (fs.existsSync(observationFile)) {
    const existing = readJson(observationFile);
    assert.equal(existing.sourceOriginal.sha256, originalSha);
    assert.equal(existing.priorCompletedPairManifest.sha256, oldManifestSha);
    assert.equal(existing.question.priorSourceContentDigest, q.sourceContentDigest);
    assert.equal(existing.question.observationStatus, reviewed.question.observationStatus);
  } else write(observationFile, reviewed);

  const angleP = 46;
  const angleQ = 67;
  assert.equal(angleP + 2 * angleQ, 180);
  assert(angleP > 0 && angleQ > 0 && angleQ < 90);
  const original = figInscribedIso({ a: angleP }) as any;
  const rename: Record<string, string> = { A: "P", B: "Q", C: "R" };
  const name = (s: string) => rename[s] ?? s;
  const spec = {
    ...original,
    points: Object.fromEntries(Object.entries(original.points).map(([key, value]) => [name(key), value])),
    // Explicit split segments let the native engine validate both right-angle rays.
    segments: { PM: ["P", "M"], MQ: ["M", "Q"], PN: ["P", "N"], NR: ["N", "R"], QR: ["Q", "R"], OM: ["O", "M"], ON: ["O", "N"] },
    labels: Object.fromEntries(Object.keys(original.labels).map((key) => [name(key), name(key)])),
    angles: {
      askedP: { vertex: "P", points: ["M", "N"], label: "x" },
      givenQ: { vertex: "Q", points: ["M", "R"], label: `${angleQ}°` },
      rightM: { vertex: "M", points: ["O", "Q"], label: "90°" },
      rightN: { vertex: "N", points: ["O", "R"], label: "90°" },
    },
  };
  const rendered = await renderFigureSpec(spec, { strict: true, typeset: true });
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  write(path.join(out, "q01.figure.spec.json"), spec);
  fs.writeFileSync(path.join(out, "q01.figure.svg"), rendered.svg, { flag: "wx", encoding: "utf8" });
  const provisions = path.join(base, "gyeongsang-remaining-final14-r1/claude-review-r1/official-provisions.json");
  const snapshot = path.join(base, "engine-upgrade-20261019/live-family-snapshot-r1.json");
  const live = readJson(snapshot);
  const unit = live.units.find((u: any) => u.id === "43b3be19-badc-47cf-8e0d-edf19766e62c");
  assert.equal(unit.section, "원과 현");
  const family = live.liveFamilies.find((f: any) => f.unit_id === unit.id && f.family_key === "mid:3-2|원과 직선|06");
  const candidate = {
    schemaVersion: 1, questionNumber: 1,
    twinExternalId: "exam-twin-gyeongsin-2025-2-mid-author-r1-q01",
    authorId: "codex-parent-engine-upgrade-20261019", questionType: "객관식", score: 4,
    content: "원 $O$ 위의 서로 다른 세 점 $P$, $Q$, $R$을 이어 삼각형을 만들었다. 중심 $O$에서 현 $PQ$, $PR$에 내린 수선의 발을 각각 $M$, $N$이라 하자. 다음 두 조건을 만족시킬 때, $\\angle QPR$의 크기는?\n\n(가) $\\overline{OM}=\\overline{ON}$\n(나) $\\angle PQR=67^\\circ$",
    choices: ["$42^\\circ$", "$44^\\circ$", "$46^\\circ$", "$48^\\circ$", "$50^\\circ$"], answer: "③",
    solution: "한 원에서 중심으로부터 같은 거리에 있는 두 현의 길이는 같으므로 $\\overline{PQ}=\\overline{PR}$이다.\n\n따라서 삼각형 $PQR$은 이등변삼각형이고, $\\angle PRQ=\\angle PQR=67^\\circ$이다.\n\n삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle QPR=180^\\circ-67^\\circ-67^\\circ=46^\\circ$이다.",
    figureArtifacts: [{ role: "stem", specPath: "q01.figure.spec.json", svgPath: "q01.figure.svg", intendedWidthMm: 70 }],
    variantDelta: { modes: ["structure", "inverse-target"],
      before: "중심에서 두 현까지의 거리가 같고 꼭지각이 주어진 내접삼각형에서 밑각을 묻는다.",
      after: "거리의 같음과 한 밑각을 조건 목록으로 제시하고 꼭지각을 역으로 묻는다.",
      sharedConcept: "한 원의 같은 거리인 현의 길이, 이등변삼각형의 두 밑각, 삼각형의 내각의 합",
      sharedProcedure: "같은 거리 → 같은 현 → 같은 두 밑각 → 세 각의 합으로 미지각 계산",
      actualStructuralChange: "원문의 알려진 꼭지각/구하는 밑각을 알려진 밑각/구하는 꼭지각으로 바꾸었다. 새로운 도형은 꼭짓점을 위에 두고 수선의 발을 명시한다. 숫자/점 이름 교체를 변경의 근거로 삼지 않는다.",
      numericalChangeIsNotSufficient: true,
      domainProof: "세 각 46°,67°,67°는 모두 양수이고 합이180°여서 비퇴화 이등변삼각형이 존재한다. 그 외접원에서 같은 두 현까지의 거리는 같다. 두 밑각은67°로 결정되어 꼭지각은 하나뿐이다.",
      difficultyBasis: "동일한 세 성질과 한 번의 각 계산을 사용한다. 삼각비·원과 비례·좌표·상위 학년 정리는 학생 풀이에 필요 없다. 난이도는 독립 검토 대기." },
    sourceReference: { externalId: "2025-gyeongsin-3-2-mid-1", newSourceReferenceId: "source-ref-gyeongsin-2025-2-mid-r1-q01",
      sourceContentSha256: q.sourceContentDigest, sourceSchoolInternal: "경신중학교", sourceExamYear: 2025,
      inventoryExamId: prior.inventoryExamId, sourceManifest: ref(oldManifest),
      sourceFiles: [{ path: source.source.path, sha256: originalSha }],
      actualReference: "observed-2025-original-scan-page1-question1; completed-pair header conflict retained",
      componentObservation: ref(path.join(component, "q01-component-review.json")),
      originalQuestionCrop: ref(path.join(base, "next-five-extraction-r1/gyeongsin/packet/images/q01-part1.png")),
      sourceCropViewed: true, originalAnswerKeyUsed: false, sourceTextCopiedToCandidate: false },
    curriculumReview: { grade: "중3", edition: "2015", status: "author-proposed", standardCodes: ["9수04-19", "9수04-10"],
      officialProvisions: ref(provisions),
      legitimateMethodDraft: "원의 현에 관한 성질과 중2 이등변삼각형의 성질 및 내각의 합만 사용한다. 삼각비나 원과 비례는 사용하지 않는다. 그림 생성의 내부 좌표 계산은 학생 풀이가 아니다.", independentReviewPending: true },
    metadata: { grade: "중3", subject: "수학", curriculum: { sourceExam: "2015", target: "2015", grade: "중3", sourceExamSemester: 2, republicationTo2022: "requires-separate-review" },
      sourceExamYear: 2025, sourceExamSemester: 2, sourceExamRound: "중간", questionType: "객관식", answerFormat: "single-choice", score: 4,
      difficultyProposal: "응용", difficultyStatus: "author-proposed", problemTypeProposal: "계산", problemTypeStatus: "author-proposed",
      assignment: { status: "pending", unitId: unit.id, familyKey: null, currentUnit: unit, familyCandidate: family ?? null,
        evidence: "현재 Unit UUID와 live06 family를 읽었다. 역방향 질문의 실제 풀이 목적/난이도와 family 적합성은 독립 검토 전 자동 확정하지 않는다.", snapshot: ref(snapshot) },
      schoolSubstitution: { visibleSchoolNames: [], replacementRequired: false, reason: "새 문제/보기/그림/해설에 학교명이 없다. 실제 출처는 내부 메타데이터에만 기록한다." },
      figureAuthoring: { method: "existing-native-figInscribedIso+new-role-labels", originalCropEmbedded: false, pixelOracle: false, newVector: true },
      authorOnly: true, independentMathApproval: false, independentGradeApproval: false, sourceIdentityApproved: false,
      rightsApproved: false, similarityApproved: false, nativeProvenanceApproved: false, loadable: false },
  };
  write(path.join(out, "q01.json"), candidate);
  const bound = bindCandidate(path.join(out, "q01.json"));
  const values = [42, 44, 46, 48, 50];
  assert.equal(values.filter((v) => v + 2 * angleQ === 180).length, 1);
  write(path.join(out, "author-calculation.json"), { authorOnly: true, independentMathApproval: false,
    angleP, angleQ, otherBaseAngle: angleQ, angleSum: angleP + 2 * angleQ,
    existence: "positive nondegenerate triangle; equal chords symmetric about PO", uniqueness: "two base angles fixed; vertex uniquely180-2*67",
    options: values.map((v, index) => ({ index: index + 1, value: v, satisfiesAngleSum: v + 2 * angleQ === 180 })),
    candidateDigest: bound.candidateDigest, studentDigest: bound.studentDigest, assetDigest: bound.assetDigest,
    render: { strict: true, typeset: true, unresolvedMath: /__MATH|MATH_LABEL|\uFFFD/.test(rendered.svg), svg: ref(path.join(out, "q01.figure.svg")) },
    originalHashAfter: sha256(fs.readFileSync(source.source.path)), originalUnchanged: true,
    oldManifestUnchanged: sha256(fs.readFileSync(oldManifest)) === oldManifestSha,
    note: "저자 계산은 독립 검산·학년·내용·분류·권리 승인이 아니다. source pixels are not a calculation oracle." });
  assert(!/\uFFFD/.test(fs.readFileSync(path.join(out, "q01.json"), "utf8")));
  write(path.join(out, "selection-index.json"), { questions: [{ n: 1, id: candidate.twinExternalId, candidate: path.join(out, "q01.json").replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(path.join(out, "q01.json"))) }] });
  console.log(JSON.stringify({ authored: 1, newVector: 1, independentReviewed: 0, loadable: 0 }));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
