/** New inverse target from observed original q2. No original or bank writes. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { figTangentPair } from "../../../src/lib/middle/m3Figures";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import { bindCandidate, readJson, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";

const base = ".qa-artifacts/exam-resume-20261008";
const out = path.join(base, "gyeongsin-authoring-group2-r1");
const component = path.join(base, "gyeongsin-source-component-review-20261019-r1");
const manifestFile = path.join(base, "next-five-extraction-r1/gyeongsin/source-manifest.json");
const manifest = readJson(manifestFile);
const q = manifest.questions.find((q: any) => q.number === 2);
const prior = readJson(path.join(component, "q01-component-review.json"));
const ref = (p: string) => ({ path: p.replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(p)) });
const write = (p: string, x: unknown) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
async function main() {
  assert.equal(sha256(fs.readFileSync(prior.sourceOriginal.path)), prior.sourceOriginal.sha256);
  assert.equal(sha256(fs.readFileSync(manifestFile)), prior.priorCompletedPairManifest.sha256);
  const observation = { ...prior, createdAt: new Date().toISOString(), question: {
    number: 2, priorSourceContentDigest: q.sourceContentDigest,
    completedCrop: ref(path.join(base, "next-five-extraction-r1/gyeongsin/packet/images/q02-part1.png")),
    originalLocalObservation: ref(path.join(component, "original-p1-q02.local.png")),
    conditionRolesMatch: true, requestedRadiusRoleMatch: true, choiceValuesAndOrderMatch: true,
    tangentCenterlineNearIntersectionRolesMatch: true, printedScoreMatch: true, printedScore: 4,
    evidence: "2025 원본 첫 쪽 하단의 q2와 완료본 q2를 view_image로 대조했다. 두 접점·중심선 위 가까운 교점·주어진 각과 길이·묻는 반지름·보기와 배점이 일치한다. 답안은 읽지 않았다. 픽셀 측정으로 계산하지 않았다.",
    observationStatus: "matches-2025-original-question-component", authoringReference: "2025-original-only" },
    mathematicalApprovals: 0, gradeApprovals: 0, loadable: 0 };
  write(path.join(component, "q02-component-review.json"), observation);
  const original = figTangentPair({ p: 60 }) as any;
  const spec = { version: 2, style: { show_points: true }, circles: original.circles,
    points: { O: original.points.O, T: original.points.P, U: original.points.A, K: { type: "on_circle", circle: "c", angle: 0 } },
    segments: { TU: ["T", "U"], OU: ["O", "U"], OK: ["O", "K"], KT: ["K", "T"] },
    angles: { tangentRight: { vertex: "U", points: ["O", "T"], right: true, label: "" },
      askedT: { vertex: "T", points: ["U", "K"], label: "x" } },
    labels: { O: "O", T: "T", U: "U", K: "K" } };
  const rendered = await renderFigureSpec(spec, { strict: true, typeset: true });
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  write(path.join(out, "q02.figure.spec.json"), spec);
  fs.writeFileSync(path.join(out, "q02.figure.svg"), rendered.svg, { flag: "wx", encoding: "utf8" });
  const c = readJson(path.join(base, "gyeongsin-authoring-r2/q01.json"));
  const snapshotFile = path.join(base, "engine-upgrade-20261019/live-family-snapshot-r1.json");
  const live = readJson(snapshotFile);
  const unit = live.units.find((u: any) => u.id === "635abab8-4a87-452b-ad6c-d59065822f29");
  assert.equal(unit.section, "원의 접선");
  c.questionNumber = 2; c.twinExternalId = "exam-twin-gyeongsin-2025-2-mid-author-group2-r1-q02";
  c.content = "반지름의 길이가 $8\\,\\mathrm{cm}$인 원 $O$가 있다. 원 밖의 점 $T$에서 원에 그은 접선의 접점을 $U$라 하고, 선분 $OT$와 원이 만나는 점을 $K$라 하자. $\\overline{TK}=8\\,\\mathrm{cm}$일 때, $\\angle UTO$의 크기는?";
  c.choices = ["$10^\\circ$", "$20^\\circ$", "$30^\\circ$", "$40^\\circ$", "$50^\\circ$"]; c.answer = "③";
  c.solution = "$\\overline{OK}$는 원의 반지름이므로 $\\overline{OK}=8\\,\\mathrm{cm}$이다. 점 $K$는 선분 $OT$ 위에 있으므로 $\\overline{OT}=8+8=16\\,(\\mathrm{cm})$이다.\n\n접점에 그은 반지름은 접선과 수직이므로 $\\angle OUT=90^\\circ$이다. 따라서 직각삼각형 $OUT$에서 $\\sin\\angle UTO=\\dfrac{\\overline{OU}}{\\overline{OT}}=\\dfrac{8}{16}=\\dfrac{1}{2}$이다.\n\n$\\angle UTO$는 예각이고 $\\sin30^\\circ=\\dfrac{1}{2}$이므로 $\\angle UTO=30^\\circ$이다.";
  c.figureArtifacts = [{ role: "stem", specPath: "q02.figure.spec.json", svgPath: "q02.figure.svg", intendedWidthMm: 70 }];
  c.variantDelta = { modes: ["structure", "inverse-target"],
    before: "접선과 중심선의 각 및 외부점에서 원까지의 길이로 반지름을 구한다.",
    after: "반지름과 외부점에서 원까지의 길이를 주고 접선과 중심선의 각을 구한다. 필요 없는 두 번째 접선은 제거한다.",
    sharedConcept: "접선과 접점의 반지름의 수직 관계, 선분 길이의 덧셈, 직각삼각형의 삼각비",
    sharedProcedure: "중심까지 거리=반지름+바깥 선분 → 접점의 직각 → 사인비 관계로 미지량 결정",
    actualStructuralChange: "주어졌던 각을 질문 대상으로, 물었던 반지름을 주어진 값으로 전환했다. 두 접선의 대칭 배치 대신 한 접선과 실제 계산에 쓰는 반지름·중심선만 새로 그렸다.",
    numericalChangeIsNotSufficient: true,
    domainProof: "반지름8, 중심과 외부점 거리16은16>8이므로 실제 접선이 존재한다. 가까운 교점까지8이고 삼각형OUT는 비퇴화 직각삼각형이다. 사인비1/2인 예각은30도로 하나뿐이며 위/아래 접선 선택은 그 크기를 바꾸지 않는다.",
    difficultyBasis: "원문과 같은 접선 수직·거리 합·삼각비의 관계를 역방향으로 읽는다. 학생 해설에 역삼각함수, 일반각, 삼각비 항등식이나 사인/코사인법칙을 쓰지 않는다. 난이도·배점은 독립 검토 대기." };
  c.sourceReference = { ...c.sourceReference, externalId: "2025-gyeongsin-3-2-mid-2", newSourceReferenceId: "source-ref-gyeongsin-2025-2-mid-group2-r1-q02",
    sourceContentSha256: q.sourceContentDigest, actualReference: "observed-2025-original-scan-page1-question2; completed-pair header conflict retained",
    componentObservation: ref(path.join(component, "q02-component-review.json")), originalQuestionCrop: observation.question.completedCrop };
  c.curriculumReview.standardCodes = ["9수04-19", "9수04-17", "9수04-18"];
  c.curriculumReview.legitimateMethodDraft = "중3 원의 접선과 반지름의 수직 및 예각의 삼각비/특수각30도만 사용한다. 학생에게 수치 근사, 역삼각함수 표기나 항등식·사인/코사인법칙이 필요하지 않다.";
  delete c.metadata.previousCandidate;
  c.metadata.assignment = { status: "pending", unitId: unit.id, familyKey: null, currentUnit: unit,
    evidence: "현재 원의 접선 Unit UUID를 확인했다. 반지름을 구하는 원본과 달리 주어진 길이에서 각을 구하는 풀이 목적에 맞는 실제 live family는 별도 검토한다.", snapshot: ref(snapshotFile) };
  c.metadata.figureAuthoring = { method: "existing-native-figTangentPair+single-tangent-role-recomposition", originalCropEmbedded: false, pixelOracle: false, newVector: true };
  write(path.join(out, "q02.json"), c);
  const b = bindCandidate(path.join(out, "q02.json"));
  const r = 8, tk = 8, ot = r + tk;
  assert(ot > r); assert.equal(r / ot, 1 / 2);
  const options = [10, 20, 30, 40, 50].map((v, i) => ({ choice: i + 1, degrees: v,
    authorNumericalSineCheck: Math.sin(v * Math.PI / 180), satisfiesExactRequiredAngle: v === 30 }));
  assert.equal(options.filter((o) => o.satisfiesExactRequiredAngle).length, 1);
  write(path.join(out, "author-calculation.json"), { authorOnly: true, radius: r, outerSegment: tk, centerDistance: ot, requiredSineExact: "1/2", requiredAngleDegrees: 30,
    existence: ot > r, uniqueness: "사인비가1/2인 예각은30도; 표시된 외부점의 두 접선은 같은 크기의 예각을 이룬다.", options,
    candidateDigest: b.candidateDigest, studentDigest: b.studentDigest, assetDigest: b.assetDigest,
    strictNativeRender: true, typeset: true, originalUnchanged: sha256(fs.readFileSync(prior.sourceOriginal.path)) === prior.sourceOriginal.sha256,
    independentMathApprovals: 0, gradeApprovals: 0, loadable: 0,
    numericalCheckLimitation: "부동소수 삼각함수는 저자 보조 계산이다. 학생용 정당한 특수각 풀이와 독립 검산을 대신하지 않는다." });
  write(path.join(out, "selection-index.json"), { questions: [{ n: 2, id: c.twinExternalId, candidate: path.join(out, "q02.json").replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(path.join(out, "q02.json"))) }] });
  console.log(JSON.stringify({ newAuthored: 1, newVector: 1, independentReviewed: 0, loadable: 0 }));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
