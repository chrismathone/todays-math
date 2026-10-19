import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import { bindCandidate, readJson, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";

const base = ".qa-artifacts/exam-resume-20261008";
const previous = path.join(base, "gyeongsin-authoring-group3-r2");
const output = path.join(base, "gyeongsin-authoring-group3-r3");
const write = (p: string, x: unknown) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
const ref = (p: string) => ({ path: p.replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(p)) });

async function main() {
  const spec = readJson(path.join(previous, "q04.figure.spec.json"));
  spec.labels.R = { point: "R", text: "R", position: "W", dx: -12, dy: -2 };
  const rendered = await renderFigureSpec(spec, { strict: true, typeset: true });
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  write(path.join(output, "q04.figure.spec.json"), spec);
  fs.writeFileSync(path.join(output, "q04.figure.svg"), rendered.svg, { flag: "wx", encoding: "utf8" });
  const c = readJson(path.join(previous, "q04.json"));
  c.twinExternalId = "exam-twin-gyeongsin-2025-2-mid-author-group3-r3-q04";
  c.content = c.content.replace("이다. 반지름", "이다.\n\n반지름").replace("라 하자. 점의 순서", "라 하자.\n\n점의 순서");
  c.metadata.previousCandidate = ref(path.join(previous, "q04.json"));
  c.metadata.figureAuthoring.visualRevision = "독립 검수에서 R 글자와 PR 사선 사이 여백 보류가 나왔다. 새 r3는 기존 점/선/원 좌표를 유지하고 R 라벨에 왼쪽12·위2 offset을 더했다. 본문 조건은 유지하며 문단을 나누었다. r2 및 그 실패·풀이·검수는 변경하지 않고 새 미노출 풀이와 그림 검수를 받는다.";
  c.metadata.rubric = {
    totalPoints: 5,
    status: "author-proposed-requires-independent-review",
    criteria: [
      { part: 1, points: 1, expected: "접점의 수직과 직사각형/접선 길이 관계를 이용해 QS=QE=6, PT=12 또는 동등한 관계를 세운다." },
      { part: 1, points: 1, expected: "PR+QR=18cm를 옳게 도출한다." },
      { part: 2, points: 1, expected: "PR=x, QR=18-x 및 피타고라스 식을 세운다." },
      { part: 2, points: 1, expected: "전개·정리하여 PR=10cm를 얻는다." },
      { part: 2, points: 1, expected: "QR=8cm와 E의 내부 조건 또는 동등한 길이·순서 조건의 적합성을 확인한다." },
    ],
    alternatives: ["같은 접선·피타고라스 관계를 사용한 올바른 대체 풀이를 인정한다."],
    errors: ["PR+QR를 둘레로 잘못 읽거나 접선의 서로 다른 점에서 출발한 길이를 같다고 두지 않는다.", "길이가 양수이고 접점 E가 변 내부에 있어야 한다."],
    notRequired: "좌표법·특수 원 공식·긴 존재 구성 증명을 학생의 필수 채점 요소로 요구하지 않는다.",
  };
  write(path.join(output, "q04.json"), c);
  const b = bindCandidate(path.join(output, "q04.json"));
  write(path.join(output, "selection-index.json"), { questions: [{ n: 4, id: c.twinExternalId, candidate: path.join(output, "q04.json").replaceAll("\\", "/"), sha256: b.candidateFileSha256 }] });
  write(path.join(output, "revision-receipt.json"), {
    previous: ref(path.join(previous, "q04.json")), current: ref(path.join(output, "q04.json")),
    priorReport: ref(path.join(base, "gyeongsin-group3-review-20261019-r2/verification/reports/q04.json")),
    candidateDigest: b.candidateDigest, studentDigest: b.studentDigest, assetDigest: b.assetDigest,
    geometryUnchanged: JSON.stringify({ ...spec, labels: undefined }) === JSON.stringify({ ...readJson(path.join(previous, "q04.figure.spec.json")), labels: undefined }),
    oldEvidenceModified: false, newBlindReviewRequired: true,
    independentMathApprovals: 0, gradeApprovals: 0, loadable: 0,
  });
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
