/** Reverse a three-tangent radius task into a two-part length task. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import { bindCandidate, readJson, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";
const base = ".qa-artifacts/exam-resume-20261008";
const out = path.join(base, "gyeongsin-authoring-group3-r1");
const component = path.join(base, "gyeongsin-source-component-review-20261019-r1");
const write = (p: string, x: unknown) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
const ref = (p: string) => ({ path: p.replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(p)) });
async function main() {
  const prior = readJson(path.join(component, "q01-component-review.json"));
  const manifest = readJson(prior.priorCompletedPairManifest.path);
  assert.equal(sha256(fs.readFileSync(prior.sourceOriginal.path)), prior.sourceOriginal.sha256);
  const q = manifest.questions.find((q: any) => q.number === 4);
  const observation = { ...prior, createdAt: new Date().toISOString(), question: { number: 4,
    priorSourceContentDigest: q.sourceContentDigest,
    completedCrop: ref(path.join(base, "next-five-extraction-r1/gyeongsin/packet/images/q04-part1.png")),
    originalLocalObservation: ref(path.join(component, "original-p1-q04.local.png")),
    conditionRolesMatch: true, requestedRadiusRoleMatch: true, choiceValuesAndOrderMatch: true,
    threeTangentRightTrianglePointOrderMatch: true, printedScoreMatch: true, printedScore: 5,
    evidence: "2025 원본 첫 쪽 하단 q4와 완료본 q4를 view_image로 대조했다. 세 접선, 직각삼각형, 변/연장선 위의 점 순서, 주어진 길이, 묻는 반지름, 보기와 배점이 대응한다. 답안은 읽지 않았고 그림 픽셀을 계산에 쓰지 않았다.",
    observationStatus: "matches-2025-original-question-component", authoringReference: "2025-original-only" } };
  write(path.join(component, "q04-component-review.json"), observation);
  const spec = { version: 2, style: { show_points: true },
    points: { P: [30,155], Q: [90,155], R: [90,75], O: [150,95], S: [150,155], E: [90,95], T: [102,59] },
    circles: { c: { center: "O", radius: 60 } },
    segments: { PQ: ["P","Q"], QS: ["Q","S"], PR: ["P","R"], RT: ["R","T"], QE: ["Q","E"], ER: ["E","R"], SO: ["S","O"], EO: ["E","O"], TO: ["T","O"] },
    angles: { rightQ: { vertex: "Q", points: ["P","E"], right: true, label: "" }, rightS: { vertex: "S", points: ["Q","O"], right: true, label: "" },
      rightE: { vertex: "E", points: ["Q","O"], right: true, label: "" }, rightT: { vertex: "T", points: ["R","O"], right: true, label: "" } },
    labels: { P: "P", Q: "Q", R: "R", O: "O", S: "S", E: "E", T: "T" } };
  const rendered = await renderFigureSpec(spec, { strict: true, typeset: true });
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  write(path.join(out, "q04.figure.spec.json"), spec);
  fs.writeFileSync(path.join(out, "q04.figure.svg"), rendered.svg, { flag: "wx", encoding: "utf8" });
  const c = readJson(path.join(base, "gyeongsin-authoring-group2-r1/q02.json"));
  c.questionNumber = 4; c.twinExternalId = "exam-twin-gyeongsin-2025-2-mid-author-group3-r1-q04";
  c.questionType = "서술형"; c.score = 5; c.choices = [];
  c.content = "직각삼각형 $PQR$에서 $\\angle PQR=90^\\circ$, $\\overline{PQ}=6\\,\\mathrm{cm}$이다. 반지름의 길이가 $6\\,\\mathrm{cm}$인 원 $O$가 삼각형의 바깥쪽에서 반직선 $PQ$, $PR$과 변 $QR$에 접하고, 그 접점을 각각 $S$, $T$, $E$라 하자. 점의 순서는 $P$, $Q$, $S$와 $P$, $R$, $T$이고, $E$는 변 $QR$의 내부에 있다.\n\n풀이 과정을 쓰시오.\n\n(1) $\\overline{PR}+\\overline{QR}$의 값을 구하시오. [2점]\n\n(2) $\\overline{PR}$의 길이를 구하시오. [3점]";
  c.answer = "(1) $18\\,\\mathrm{cm}$ (2) $10\\,\\mathrm{cm}$";
  c.solution = "(1) 접점에 그은 반지름은 접선과 수직이다. 따라서 사각형 $QSOE$의 네 각은 직각이고, $\\overline{OS}=\\overline{OE}=6\\,\\mathrm{cm}$이므로 $\\overline{QS}=\\overline{QE}=6\\,\\mathrm{cm}$이다.\n\n점 $P$에서 그은 두 접선의 길이가 같으므로 $\\overline{PT}=\\overline{PS}=6+6=12\\,(\\mathrm{cm})$이다. 또 점 $R$에서 그은 두 접선의 길이가 같으므로 $\\overline{RT}=\\overline{RE}=\\overline{QR}-6\\,\\mathrm{cm}$이다.\n\n$\\overline{PT}=\\overline{PR}+\\overline{RT}$에 대입하면 $12=\\overline{PR}+\\overline{QR}-6$이므로 $\\overline{PR}+\\overline{QR}=18\\,\\mathrm{cm}$이다.\n\n(2) $\\overline{PR}=x\\,\\mathrm{cm}$라 하면 $\\overline{QR}=(18-x)\\,\\mathrm{cm}$이다. 직각삼각형 $PQR$에서 피타고라스 정리에 따라 $x^2=6^2+(18-x)^2$이다.\n\n식을 정리하면 $x^2=36+324-36x+x^2$이므로 $36x=360$, $x=10$이다. 따라서 $\\overline{PR}=10\\,\\mathrm{cm}$이다. 이때 $\\overline{QR}=8\\,\\mathrm{cm}>6\\,\\mathrm{cm}$이므로 $E$가 변 $QR$ 내부에 있다는 조건도 만족한다.";
  c.figureArtifacts = [{ role: "stem", specPath: "q04.figure.spec.json", svgPath: "q04.figure.svg", intendedWidthMm: 70 }];
  c.variantDelta = { modes: ["structure","inverse-target"], before: "직각삼각형의 빗변과 한 직각변을 주고 세 접선에 닿는 원의 반지름을 묻는다.",
    after: "원 반지름과 한 직각변을 주고, 접선으로 얻는 두 변의 합을 먼저 정리한 뒤 빗변을 구하는 두 소문항으로 바꾸었다.",
    sharedConcept: "한 점에서 그은 접선의 길이, 접선과 반지름의 수직, 직각삼각형의 피타고라스 정리",
    sharedProcedure: "접선 길이 같음을 통해 원 반지름과 삼각형 변들의 관계를 세우고 피타고라스 관계와 함께 미지량을 결정한다.",
    actualStructuralChange: "반지름과 빗변의 조건/질문 역할을 역전하고, 원문에서 뒤에 쓰던 접선 관계를 먼저 도출하도록 풀이 단계와 답 형식을 바꾸었다. 숫자/점 이름 교체만으로 완료시키지 않는다.", numericalChangeIsNotSufficient: true,
    domainProof: "PQ6,QR8,PR10인 직각삼각형이 존재한다. 좌표는 검증용으로만 P(0,0),Q(6,0),R(6,8),O(12,6),S(12,0),E(6,6),T(36/5,48/5)로 잡을 수 있고 반지름6의 원이 세 지정 선에 실제로 접한다. E는QR내부, R은PT내부이다. 접선 관계로PR+QR18이 강제되고 피타고라스 식에서PR10만 나온다.",
    difficultyBasis: "같은 접선/피타고라스 관계를 역방향으로 푼다. 두 단계와2/3점으로 안내하여 식의 제곱 전개를 돕는다. 별도 방접원 공식·좌표 계산·원과 비례·상위 학년 도구는 학생에게 요구하지 않는다. 추가 읽기/전개 부담과 난이도는 독립 검토 전 보류한다." };
  c.sourceReference = { ...c.sourceReference, externalId: "2025-gyeongsin-3-2-mid-4", newSourceReferenceId: "source-ref-gyeongsin-2025-2-mid-group3-r1-q04",
    sourceContentSha256: q.sourceContentDigest, actualReference: "observed-2025-original-scan-page1-question4; whole-pair header conflict retained",
    componentObservation: ref(path.join(component, "q04-component-review.json")), originalQuestionCrop: observation.question.completedCrop };
  c.curriculumReview.standardCodes = ["9수04-19", "9수04-16", "9수04-12", "9수02-12"];
  c.curriculumReview.legitimateMethodDraft = "접선의 길이/수직, 직사각형의 마주 보는 변, 피타고라스, 중3에서 배운 다항식 제곱 전개와 일차식 정리만 사용한다. 좌표는 저자 존재 검산이며 학생 필수 방법이 아니다. 방접원 용어나 공식을 도입하지 않는다.";
  c.metadata.questionType = "서술형"; c.metadata.score = 5; c.metadata.answerFormat = "numbered-multipart-length";
  c.metadata.assignment = { ...c.metadata.assignment, familyKey: null, evidence: "원의 접선 실제 Unit UUID는 연결했다. 기존 현/접선 family의 풀이 목적, 두 소문항과 역방향 피타고라스 전개를 함께 검토해야 하므로 live family는 확정하지 않았다." };
  c.metadata.figureAuthoring = { method: "existing-native-FigureSpec-v2-three-tangents; fresh-coordinate-construction", originalCropEmbedded: false, pixelOracle: false, newVector: true };
  c.metadata.subQuestions = [{ n: 1, score: 2, asked: "PR+QR", format: "length-with-proof" }, { n: 2, score: 3, asked: "PR", format: "length-with-proof" }];
  write(path.join(out, "q04.json"), c);
  const b = bindCandidate(path.join(out, "q04.json"));
  const pq=6,qr=8,pr=10,r=6;
  assert.equal(pr*pr,pq*pq+qr*qr); assert.equal(pr+qr,pq+2*r); assert(qr>r);
  write(path.join(out, "author-calculation.json"), { authorOnly: true, pq,qr,pr,radius:r,part1:pr+qr,part2:pr, pythagoras:true,
    tangentLengths:{PS:12,PT:12,QS:6,QE:6,RT:2,RE:2}, eInterior:qr>r, rInteriorToPT:pr<12,
    answerUniqueness: "PR+QR18; PR²-QR²=36 gives (PR-QR)*18=36, hence PR-QR2 and PR10,QR8. Student solution instead expands the square.",
    candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,strictNativeRender:true,
    originalUnchanged:sha256(fs.readFileSync(prior.sourceOriginal.path))===prior.sourceOriginal.sha256,independentMathApprovals:0,gradeApprovals:0,loadable:0 });
  write(path.join(out, "selection-index.json"), { questions:[{n:4,id:c.twinExternalId,candidate:path.join(out,"q04.json").replaceAll("\\","/"),sha256:sha256(fs.readFileSync(path.join(out,"q04.json")))}] });
  console.log(JSON.stringify({newAuthored:1,newVector:1,independentReviewed:0,loadable:0}));
}
main().catch((e)=>{console.error(e.message);process.exitCode=1;});
