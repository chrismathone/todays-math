/** A new candidate/asset version; preserve the frozen r1 and its visual finding. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import { bindCandidate, readJson, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";

const base = ".qa-artifacts/exam-resume-20261008";
const old = path.join(base, "gyeongsin-authoring-r1");
const output = path.join(base, "gyeongsin-authoring-r2");
const write = (p: string, x: unknown) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
const ref = (p: string) => ({ path: p.replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(p)) });
async function main() {
  const candidate = readJson(path.join(old, "q01.json"));
  const spec = readJson(path.join(old, "q01.figure.spec.json"));
  spec.angles.rightM = { vertex: "M", points: ["O", "Q"], right: true, label: "" };
  spec.angles.rightN = { vertex: "N", points: ["O", "R"], right: true, label: "" };
  const rendered = await renderFigureSpec(spec, { strict: true, typeset: true });
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  write(path.join(output, "q01.figure.spec.json"), spec);
  fs.writeFileSync(path.join(output, "q01.figure.svg"), rendered.svg, { flag: "wx", encoding: "utf8" });
  candidate.twinExternalId = "exam-twin-gyeongsin-2025-2-mid-author-r2-q01";
  candidate.metadata.figureAuthoring.visualRevision = "r1의 90도 호/텍스트가 중심 주변에 혼잡해 작은 직각 기호로 새로 렌더했다. 본문·답·해설은 같지만 그림 변경이므로 r1 검수는 재사용하지 않는다.";
  candidate.metadata.previousCandidate = ref(path.join(old, "q01.json"));
  write(path.join(output, "q01.json"), candidate);
  const b = bindCandidate(path.join(output, "q01.json"));
  write(path.join(output, "selection-index.json"), { questions: [{ n: 1, id: candidate.twinExternalId, candidate: path.join(output, "q01.json").replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(path.join(output, "q01.json"))) }] });
  write(path.join(output, "revision-receipt.json"), { previous: ref(path.join(old, "q01.json")), current: ref(path.join(output, "q01.json")),
    reason: candidate.metadata.figureAuthoring.visualRevision, candidateDigest: b.candidateDigest, studentDigest: b.studentDigest, assetDigest: b.assetDigest,
    authorCalculation: ref(path.join(old, "author-calculation.json")), mathPayloadUnchanged: true, assetsChanged: true, newBlindReviewRequired: true,
    renderedStrict: true, typeset: true, originalCropEmbedded: false, independentMathApprovals: 0, gradeApprovals: 0, loadable: 0 });
  console.log(JSON.stringify({ selected: candidate.twinExternalId, newFigureVersion: 1, oldVersionPreserved: true }));
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
