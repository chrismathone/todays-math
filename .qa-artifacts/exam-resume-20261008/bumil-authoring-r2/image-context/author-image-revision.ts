import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { renderFigureSpec } from "../../../../src/lib/figure/renderFigureSpec";
const output=".qa-artifacts/exam-resume-20261008/bumil-authoring-r2/image-context";
const prior=".qa-artifacts/exam-resume-20261008/bumil-authoring-r1/image-context";
delete process.env.FIGURE_ENGINE_URL;delete process.env.STUDIO_ENGINE_URL;delete process.env.VERCEL;
process.env.FIGURE_ENGINE_PATH=path.resolve("vendor/figure-engine");process.env.PYTHONDONTWRITEBYTECODE="1";
const sha=(p:string)=>createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const fresh=(name:string,value:unknown)=>fs.writeFileSync(path.join(output,name),JSON.stringify(value,null,2)+"\n",{flag:"wx"});
async function main(){
for(const n of [10,19]){
 const old=JSON.parse(fs.readFileSync(path.join(prior,`q${n}.json`),"utf8"));
 const spec=JSON.parse(fs.readFileSync(path.join(prior,`q${n}.engine-spec.json`),"utf8"));
 const binding=JSON.parse(fs.readFileSync(path.join(prior,`q${n}.math-binding.json`),"utf8"));
 spec.style={font_size:20,angle_font_size:18};
 if(n===10){const distance=11.2/1.6003;spec.points={A:[25,239],B:[25+distance*20,239],C:[25+distance*20,15],G:[25,271],E:[25+distance*20,271]};binding.facts={heightM:12.8,eyeHeightM:1.6,elevationDegrees:58,displayedTan:"1.6003",distanceM:distance,roundedM:7.0};binding.factRelations=["CB=CE-AG=11.2","tan58=CB/AB","AB=11.2/1.6003","GE=AB"];old.content=old.content.replace("아래 관계도에서","두 번째 그림의 관계도에서").replace("$9.6\\,\\mathrm{m}$","$12.8\\,\\mathrm{m}$");old.choices=["$6.5\\,\\mathrm{m}$","$6.8\\,\\mathrm{m}$","$7.0\\,\\mathrm{m}$","$7.2\\,\\mathrm{m}$","$11.2\\,\\mathrm{m}$"];old.solution="눈높이 위의 높이는 $\\overline{CB}=12.8-1.6=11.2\\,(\\mathrm{m})$이다. 직각삼각형 $\\mathrm{ABC}$에서 $\\tan58^\\circ=\\dfrac{\\overline{CB}}{\\overline{AB}}$이므로 표의 값을 대입하면 $1.6003=\\dfrac{11.2}{\\overline{AB}}$이다. 따라서 $\\overline{AB}=11.2\\div1.6003=6.998\\cdots$이다. 지면과 눈높이의 수평선이 평행하므로 $\\overline{GE}=\\overline{AB}$이며, 소수점 아래 둘째 자리에서 반올림하면 $7.0\\,\\mathrm{m}$이다. 정답은 ③이다.";
 }else{binding.facts={givenBC:"30*sqrt(6)",angleA:45,angleB:75,angleC:60,targetAB:90};binding.factRelations=["drop perpendicular BH to AC","BH=BC*sin60=45sqrt2","AB=BH/sin45=90"];old.content=old.content.replace("$20\\sqrt{6}","$30\\sqrt{6}");old.answer="$90\\,\\mathrm{m}$";old.solution="삼각형의 내각의 합으로 $\\angle ACB=180^\\circ-45^\\circ-75^\\circ=60^\\circ$이다. 점 $\\mathrm{B}$에서 선분 $\\mathrm{AC}$에 내린 수선의 발을 $\\mathrm{H}$라 하자. 직각삼각형 $\\mathrm{BCH}$에서 $\\overline{BH}=\\overline{BC}\\sin60^\\circ=30\\sqrt6\\times\\dfrac{\\sqrt3}{2}=45\\sqrt2\\,(\\mathrm{m})$이다. 직각삼각형 $\\mathrm{ABH}$에서 $\\sin45^\\circ=\\dfrac{\\overline{BH}}{\\overline{AB}}$이므로 $\\overline{AB}=45\\sqrt2\\div\\dfrac{\\sqrt2}{2}=90\\,(\\mathrm{m})$이다. 따라서 두 표지 사이의 거리는 $90\\,\\mathrm{m}$이다.";
 }
 fresh(`q${n}.engine-spec.json`,spec);fresh(`q${n}.math-binding.json`,binding);
 const rendered=await renderFigureSpec(spec,{strict:true});assert(rendered.ok,rendered.ok?"":rendered.error);assert(!rendered.droppedDimensions?.length);
 fs.writeFileSync(path.join(output,`q${n}.engine.svg`),rendered.svg,{flag:"wx"});
 for(const suffix of ["generated.png","generation.json"])fs.copyFileSync(path.join(prior,`q${n}.${suffix}`),path.join(output,`q${n}.${suffix}`),fs.constants.COPYFILE_EXCL);
 const png=fs.readFileSync(path.join(output,`q${n}.generated.png`));
 const art=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1536 1024" width="1536" height="1024"><image width="1536" height="1024" href="data:image/png;base64,${png.toString("base64")}"/></svg>\n`;
 fs.writeFileSync(path.join(output,`q${n}.scene.svg`),art,{flag:"wx"});
 fresh(`q${n}.scene-spec.json`,{kind:"immutable-imagegen-scene/v1",rasterSha256:sha(path.join(output,`q${n}.generated.png`)),generationSha256:sha(path.join(output,`q${n}.generation.json`)),mathBindingSha256:sha(path.join(output,`q${n}.math-binding.json`)),rasterRole:"illustration only; separate engine figure provides all mathematical relations",mathematicalBinding:binding,sourceFigureNotReused:true});
 old.twinExternalId=`exam-twin-bumil-2025-2-mid-author-r2-q${n}`;old.facts=binding.facts;
 old.figureArtifacts=[{role:"stem",specPath:`q${n}.scene-spec.json`,svgPath:`q${n}.scene.svg`,intendedWidthMm:70,rasterResources:[{path:`q${n}.generated.png`,generationPath:`q${n}.generation.json`}]},{role:"stem",specPath:`q${n}.engine-spec.json`,svgPath:`q${n}.engine.svg`,intendedWidthMm:70}];
 old.variantDelta.printRevision="Split previously composed95mm scene/diagram into two separate70mm authored assets matching the bank cap; enlarge engine labels; numeric conditions regenerated and new independent solve required. Substantive delta from original exam remains context/structure/inverse target.";
 old.priorCandidate={path:path.join(prior,`q${n}.json`),sha256:sha(path.join(prior,`q${n}.json`)),reviewUse:"historical only; new student/assets/answers/solutions must be re-solved and reviewed"};
 old.independentVerification=null;old.directUseAllowed=false;old.assetAuthoring={tool:"built-in image_gen.imagegen",rasterHash:sha(path.join(output,`q${n}.generated.png`)),generatedRasterReuse:"same NEW authored scene, no original source raster reused",enginePath:"new renderFigureSpec(strict)->local vendor",rasterMathAuthority:false,productionReady:false};
 fresh(`q${n}.json`,old);
}
console.log(JSON.stringify({revisedCandidates:2,figures:4,bankWidthMm:70,newIndependentVerification:0,loadable:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
