import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { renderFigureSpec } from "../../../src/lib/figure/renderFigureSpec";
import { bindCandidate, readJson, sha256 } from "../../../scripts/import/exam-twin/candidatePack.mjs";
const base = ".qa-artifacts/exam-resume-20261008";
const old = path.join(base, "gyeongsin-authoring-group3-r1");
const output = path.join(base, "gyeongsin-authoring-group3-r2");
const write = (p: string, x: unknown) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + "\n", { flag: "wx", encoding: "utf8" });
const ref = (p: string) => ({ path: p.replaceAll("\\", "/"), sha256: sha256(fs.readFileSync(p)) });
async function main() {
  const spec = readJson(path.join(old,"q04.figure.spec.json"));
  spec.labels.R = { point: "R", text: "R", position: "W" };
  spec.labels.T = { point: "T", text: "T", position: "N" };
  const rendered = await renderFigureSpec(spec, { strict: true, typeset: true });
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  write(path.join(output,"q04.figure.spec.json"),spec);
  fs.writeFileSync(path.join(output,"q04.figure.svg"),rendered.svg,{flag:"wx",encoding:"utf8"});
  const c = readJson(path.join(old,"q04.json"));
  c.twinExternalId = "exam-twin-gyeongsin-2025-2-mid-author-group3-r2-q04";
  const part2 = c.solution.slice(c.solution.indexOf("(2)"));
  c.solution = "(1) 접점에 그은 반지름은 접선과 수직이다. 따라서 사각형 $QSOE$의 네 각은 직각이고, $\\overline{OS}=\\overline{OE}=6\\,\\mathrm{cm}$이므로 $\\overline{QS}=\\overline{QE}=6\\,\\mathrm{cm}$이다.\n\n점 $P$에서 그은 두 접선의 길이는 같으므로 $\\overline{PT}=\\overline{PS}=\\overline{PQ}+\\overline{QS}=12\\,\\mathrm{cm}$이다. 또 점 $R$에서 그은 두 접선의 길이는 같으므로 $\\overline{RT}=\\overline{RE}=\\overline{QR}-\\overline{QE}$이다.\n\n$\\overline{PT}=\\overline{PR}+\\overline{RT}$에 대입하면 $\\overline{PR}+\\overline{QR}=\\overline{PT}+\\overline{QE}=12+6=18\\,(\\mathrm{cm})$이다.\n\n" + part2;
  c.metadata.previousCandidate = ref(path.join(old,"q04.json"));
  c.metadata.figureAuthoring.visualRevision = "R과T가 가까운 초안에서 R라벨을 점 왼쪽으로 고정하고 T라벨을 위로 고정했다. 1번 해설은 선분 길이 식과 수치/단위의 대응을 명확히 했다. 기존 초안/동결본은 보존하고 새 학생판을 독립 검수한다.";
  write(path.join(output,"q04.json"),c);
  const b=bindCandidate(path.join(output,"q04.json"));
  write(path.join(output,"selection-index.json"),{questions:[{n:4,id:c.twinExternalId,candidate:path.join(output,"q04.json").replaceAll("\\","/"),sha256:sha256(fs.readFileSync(path.join(output,"q04.json")))}]});
  write(path.join(output,"revision-receipt.json"),{previous:ref(path.join(old,"q04.json")),current:ref(path.join(output,"q04.json")),authorCalculation:ref(path.join(old,"author-calculation.json")),
    candidateDigest:b.candidateDigest,studentDigest:b.studentDigest,assetDigest:b.assetDigest,oldEvidenceModified:false,newBlindReviewRequired:true,independentMathApprovals:0,gradeApprovals:0,loadable:0});
}
main().catch((e)=>{console.error(e.message);process.exitCode=1;});
