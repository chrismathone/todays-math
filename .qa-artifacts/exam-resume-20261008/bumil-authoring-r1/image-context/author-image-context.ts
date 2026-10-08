import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { renderFigureSpec } from "../../../../src/lib/figure/renderFigureSpec";
const folder = ".qa-artifacts/exam-resume-20261008/bumil-authoring-r1/image-context";
const prep = JSON.parse(fs.readFileSync(".qa-artifacts/exam-resume-20261008/bumil-twin-v2/prepared/preparation.json", "utf8"));
const hash = (file: string) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
delete process.env.FIGURE_ENGINE_URL;
delete process.env.STUDIO_ENGINE_URL;
delete process.env.VERCEL;
process.env.FIGURE_ENGINE_PATH = path.resolve("vendor/figure-engine");
process.env.PYTHONDONTWRITEBYTECODE = "1";
const fresh = (file: string, value: unknown) => fs.writeFileSync(path.join(folder, file), JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
const distance = 8 / 1.6003;
const specs = {
  10: { version: 2, theme: "exam-thin", points: { A: [25,175], B: [25+distance*20,175], C: [25+distance*20,15], G: [25,207], E: [25+distance*20,207] }, segments: { eyeHorizontal: { points: ["A","B"], dash:"5 3" }, sight:["A","C"], wall:["C","E"], ground:["G","E"], eye:["G","A"] }, angles: { elevation:{vertex:"A",points:["B","C"],radius:23,label:"58^\\circ"}, right:{vertex:"B",points:["A","C"],right:true,radius:9} }, labels:{A:"A",B:"B",C:"C",G:"G",E:"E"} },
  19: { version: 2, theme: "exam-thin", points: { A:[20,150], B:[200,150], C:[20+3*(30+10*Math.sqrt(3)),150-3*(30+10*Math.sqrt(3))] }, segments:{AB:["A","B"],BC:["B","C"],CA:["C","A"]}, angles:{a:{vertex:"A",points:["B","C"],radius:22,label:"45^\\circ"},b:{vertex:"B",points:["C","A"],radius:22,label:"75^\\circ"}},labels:{A:"A",B:"B",C:"C"} },
};
async function main() {
for (const n of [10,19] as const) {
  if (process.argv[2] && Number(process.argv[2]) !== n) continue;
  const spec = specs[n]; fresh(`q${n}.engine-spec.json`,spec);
  const rendered = await renderFigureSpec(spec,{strict:true});
  assert(rendered.ok, rendered.ok ? "" : rendered.error);
  assert(!rendered.droppedDimensions?.length);
  fs.writeFileSync(path.join(folder,`q${n}.engine.svg`),rendered.svg,{flag:"wx"});
  const q = prep.questions.find((r:{n:number})=>r.n===n);
  const binding = n===10 ? {
    curriculum:{grade:"중3",edition:"2015",status:"pending"},calculationAuthority:"explicit-math-facts-not-image-pixels", pointRoles:{A:"관측자의 눈",G:"관측자 발밑",B:"눈높이와 벽의 교점",C:"환기창 중심",E:"창 중심 바로 아래 지면"}, facts:{heightM:9.6,eyeHeightM:1.6,elevationDegrees:58,displayedTan:"1.6003",distanceM:distance,roundedM:5.0}, factRelations:["CB=CE-AG=8","tan58=CB/AB","AB=8/1.6003","GE=AB"],constraints:["level ground; vertical wall; eye line horizontal","height>eyeHeight>0","0<angle<90","positive unique distance","use supplied table and stated rounding"], rasterRole:"scene-only; mathematical point roles refer to the separate engine diagram",
  } : {
    curriculum:{grade:"중3",edition:"2015",status:"pending"},calculationAuthority:"explicit-math-facts-not-image-pixels",pointRoles:{A:"첫 번째 측량 표지",B:"두 번째 측량 표지",C:"관개 제어함"},facts:{givenBC:"20*sqrt(6)",angleA:45,angleB:75,angleC:60,targetAB:60},factRelations:["drop perpendicular BH to AC","BH=BC*sin60=30sqrt2","AB=BH/sin45=60"],constraints:["45+75+60=180","positive lengths","H lies inside AC","unique triangle up to reflection/congruence; unique AB","no trig laws or addition relations in student solution"], rasterRole:"park setting only; named point roles and all conditions are in the separate diagram/record",
  };
  fresh(`q${n}.math-binding.json`,binding);
  const content = n===10 ? "체육관 환기창을 관측할 위치를 정하려고 한다. 아래 관계도에서 $\\mathrm{A}$는 민준의 눈, $\\mathrm{G}$는 발밑, $\\mathrm{C}$는 환기창의 중심이며, $\\mathrm{E}$는 창 중심 바로 아래 지면이다. 지면은 수평이고 벽은 수직이다. $\\mathrm{B}$는 눈높이의 수평선과 벽이 만나는 점이다.\n\n| 관측 기록 | 값 |\n| --- | --- |\n| 지면에서 환기창 중심까지의 높이 $\\overline{CE}$ | $9.6\\,\\mathrm{m}$ |\n| 민준의 눈높이 $\\overline{AG}$ | $1.6\\,\\mathrm{m}$ |\n| 환기창 중심을 올려다본 각 $\\angle BAC$ | $58^\\circ$ |\n\n| 각 | $\\sin$ | $\\cos$ | $\\tan$ |\n| --- | --- | --- | --- |\n| $58^\\circ$ | $0.8480$ | $0.5299$ | $1.6003$ |\n\n위 삼각비 표를 이용할 때 민준의 발밑에서 벽까지의 수평거리 $\\overline{GE}$는? (소수점 아래 둘째 자리에서 반올림한다.)" : "공원 측량 기록에서 두 측량 표지 $\\mathrm{A},\\mathrm{B}$ 사이의 거리만 빠져 있다. $\\mathrm{C}$는 관개 제어함의 위치이며, 세 위치를 이은 삼각형에 대한 기록은 다음과 같다.\n\n| 측량 항목 | 기록 |\n| --- | --- |\n| 표지 $\\mathrm{B}$에서 제어함 $\\mathrm{C}$까지의 거리 | $20\\sqrt{6}\\,\\mathrm{m}$ |\n| $\\angle BAC$ | $45^\\circ$ |\n| $\\angle ABC$ | $75^\\circ$ |\n\n빠진 거리 $\\overline{AB}$를 구하고 풀이 과정을 쓰시오.";
  const solution = n===10 ? "눈높이 위의 높이는 $\\overline{CB}=9.6-1.6=8\\,(\\mathrm{m})$이다. 직각삼각형 $\\mathrm{ABC}$에서 $\\tan58^\\circ=\\dfrac{\\overline{CB}}{\\overline{AB}}$이므로 표의 값을 대입하면 $1.6003=\\dfrac{8}{\\overline{AB}}$이다. 따라서 $\\overline{AB}=8\\div1.6003=4.999\\cdots$이다. 지면과 눈높이의 수평선이 평행하므로 $\\overline{GE}=\\overline{AB}$이며, 소수점 아래 둘째 자리에서 반올림하면 $5.0\\,\\mathrm{m}$이다. 정답은 ③이다." : "삼각형의 내각의 합으로 $\\angle ACB=180^\\circ-45^\\circ-75^\\circ=60^\\circ$이다. 점 $\\mathrm{B}$에서 선분 $\\mathrm{AC}$에 내린 수선의 발을 $\\mathrm{H}$라 하자. 직각삼각형 $\\mathrm{BCH}$에서 $\\overline{BH}=\\overline{BC}\\sin60^\\circ=20\\sqrt6\\times\\dfrac{\\sqrt3}{2}=30\\sqrt2\\,(\\mathrm{m})$이다. 직각삼각형 $\\mathrm{ABH}$에서 $\\sin45^\\circ=\\dfrac{\\overline{BH}}{\\overline{AB}}$이므로 $\\overline{AB}=30\\sqrt2\\div\\dfrac{\\sqrt2}{2}=60\\,(\\mathrm{m})$이다. 따라서 두 표지 사이의 거리는 $60\\,\\mathrm{m}$이다.";
  fresh(`q${n}.json`,{schemaVersion:1,questionNumber:n,twinExternalId:`exam-twin-bumil-2025-2-mid-author-r1-q${n}`,authorId:"orca-codex-exam-twin-parent-image-context-20261008",content,choices:n===10?["$4.5\\,\\mathrm{m}$","$4.8\\,\\mathrm{m}$","$5.0\\,\\mathrm{m}$","$5.2\\,\\mathrm{m}$","$8.0\\,\\mathrm{m}$"]:[],answer:n===10?"③":"$60\\,\\mathrm{m}$",solution,score:q.metadata.score,questionType:q.metadata.questionType,facts:binding.facts,figureArtifacts:[{role:"stem",specPath:`q${n}.composition-spec.json`,svgPath:`q${n}.svg`,intendedWidthMm:95,rasterResources:[{path:`q${n}.generated.png`,generationPath:`q${n}.generation.json`}]}],variantDelta:{modes:["context","structure","inverse-target"],before:q.sourceReference.sourceObservation,after:n===10?"석탑 높이를 구하는 직접 계산에서 체육관 환기창의 관측 위치를 정하는 거리 역산으로 바꾸고 두 기록표로 자료를 제시한다.":"캠핑장의 두 텐트 사이 거리에서 시설까지 거리 구하기를, 공원 시설까지 거리로 빠진 표지 사이 거리를 복구하는 기록표로 전환한다.",sharedConcept:q.sourceReference.sharedConceptProcedure,sharedProcedure:n===10?"표에서 필요한 직각삼각형의 삼각비를 선택하고 눈높이 보정과 비의 관계를 사용한다. 미지 대상을 총높이에서 거리로 전환한다.":"내각의 합과 보조 수선으로 45°·60° 직각삼각형을 만들고 삼각비로 선분 길이를 구한다. 미지 선분을 역으로 전환한다."},curriculumReview:{grade:"중3",edition:"2015",status:"author-proposed",standardCodes:q.metadata.achievementStandardRefs.map((r:{code:string})=>r.code),surfaces:Object.fromEntries(["stem","choices","figuresAndTables","notation","answer","studentSolution","prerequisites"].map(s=>[s,"author-proposed"])),evidence:q.metadata.achievementStandardRefs},metadata:q.metadata,sourceReference:q.sourceReference,schoolNamePolicy:q.schoolNamePolicy,independentVerification:null,review:q.review,directUseAllowed:false,assetAuthoring:{tool:"built-in image_gen.imagegen",rasterHash:hash(path.join(folder,`q${n}.generated.png`)),enginePath:"renderFigureSpec(strict)->local vendored engine",rasterMathAuthority:false,productionReady:false}});
}
console.log(JSON.stringify({authored:2,newRaster:2,newEngineDiagrams:2,independentVerification:0,loadable:0}));
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
