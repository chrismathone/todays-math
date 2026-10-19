import fs from 'node:fs';
import assert from 'node:assert/strict';
import {renderFigureSpec} from '../../../src/lib/figure/renderFigureSpec';
import {bindCandidate,readJson,sha256,SURFACES} from '../../../scripts/import/exam-twin/candidatePack.mjs';
type Point=[number,number];
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const eq=(a:number,b:number)=>assert(Math.abs(a-b)<1e-9);
const view=(points:Record<string,Point>,scale:number,dx:number,dy:number)=>Object.fromEntries(Object.entries(points).map(([k,[x,y]])=>[k,[dx+scale*x,dy-scale*y]]));
const labels=(names:string[])=>Object.fromEntries(names.map(n=>[n,n]));
async function main(){
 const b='.qa-artifacts/exam-resume-20261008/',out=b+'gyeongsin-authoring-group11-r1/',base=readJson(b+'gyeongsin-authoring-group10-r1/q12.json'),source=readJson(base.sourceReference.sourceManifest.path),snapshotPath=b+'engine-upgrade-20261019/live-family-snapshot-r2.json',snapshot=readJson(snapshotPath);assert.equal(source.nominalYear,2025);
 const sqrt3=Math.sqrt(3),r=3,side=6+6*sqrt3,height=9+3*sqrt3;
 const three={P:[side/2,height],Q:[0,0],R:[side,0],J:[3*sqrt3,3],K:[3*sqrt3+6,3],L:[side/2,3+3*sqrt3],H:[3*sqrt3,0]} as Record<string,Point>;
 for(const [a,z]of [['P','Q'],['Q','R'],['R','P']])eq(distance(three[a],three[z]),side);
 for(const[a,z]of [['J','K'],['K','L'],['L','J']])eq(distance(three[a],three[z]),2*r);
 const lineDistance=(x:Point,a:Point,z:Point)=>Math.abs((z[0]-a[0])*(x[1]-a[1])-(z[1]-a[1])*(x[0]-a[0]))/distance(a,z);
 for(const[c,a,z]of [['J','P','Q'],['J','Q','R'],['K','Q','R'],['K','R','P'],['L','R','P'],['L','P','Q']])eq(lineDistance(three[c],three[a],three[z]),r);
 const spec13={version:2,style:{show_points:true},points:view(three,9,35,160),circles:{j:{center:'J',radius:27},k:{center:'K',radius:27},l:{center:'L',radius:27}},segments:{PQ:['P','Q'],QR:['Q','R'],RP:['R','P'],JH:['J','H']},labels:labels(['P','Q','R','J','K','L','H'])};
 const theta=65*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta),two:Record<string,Point>={O:[0,0],S:[-1/c,0],U:[-c,s],V:[-c,-s],W:[-1,0]};
 eq(distance(two.O,two.U),1);eq(distance(two.O,two.V),1);eq((two.S[0]-two.U[0])*two.U[0]+(two.S[1]-two.U[1])*two.U[1],0);eq((two.S[0]-two.V[0])*two.V[0]+(two.S[1]-two.V[1])*two.V[1],0);
 const spec14={version:2,style:{show_points:true},points:view(two,62,190,105),circles:{c:{center:'O',radius:62}},segments:{SU:['S','U'],SV:['S','V'],UW:['U','W'],VW:['V','W'],OU:['O','U'],OV:['O','V']},angles:{given:{vertex:'W',points:['U','V'],label:'115°',radius:13,label_distance:28},target:{vertex:'S',points:['U','V'],label:'x',radius:20,label_distance:33}},labels:labels(['O','S','U','V','W'])};
 const triangle:Record<string,Point>={O:[0,0],A:[-4,0],B:[2,2*sqrt3],C:[2,-2*sqrt3],T:[-4,6]};
 for(const n of ['A','B','C'])eq(distance(triangle.O,triangle[n]),4);
 for(const[a,z]of [['A','B'],['B','C'],['C','A']])eq(distance(triangle[a],triangle[z]),4*sqrt3);
 const spec15={version:2,style:{show_points:true},points:view(triangle,18,120,140),circles:{c:{center:'O',radius:72}},segments:{AB:['A','B'],BC:['B','C'],CA:['C','A'],AT:['A','T']},angles:{given:{vertex:'A',points:['B','T'],label:'60°',radius:17,label_distance:32}},labels:labels(['O','A','B','C','T'])};
 const rad=Math.sqrt(24),semi:Record<string,Point>={O:[0,0],A:[0,rad],B:[0,-rad],D:[3,rad],C:[8,-rad],F:[48/11,5*rad/11]};eq(distance(semi.D,semi.C),11);eq(distance(semi.D,semi.F),3);eq(distance(semi.C,semi.F),8);eq(distance(semi.O,semi.F),rad);eq((semi.C[0]-semi.D[0])*semi.F[0]+(semi.C[1]-semi.D[1])*semi.F[1],0);
 const spec16={version:2,style:{show_points:true},points:view(semi,12,45,95),circles:{c:{center:'O',radius:12*rad,draw:false}},arcs:{semicircle:{circle:'c',from:'A',to:'B',dir:'cw'}},segments:{AB:['A','B'],AD:['A','D'],DC:['D','C'],CB:['C','B']},labels:labels(['O','A','B','C','D','F'])};
 const cut:Record<string,Point>={P:[0,25],O:[0,0],U:[-12,9],V:[12,9],X:[-7.5,15],Y:[7.5,15],H:[0,15]};
 eq(distance(cut.P,cut.U),20);eq(distance(cut.P,cut.V),20);eq(distance(cut.O,cut.U),15);eq(distance(cut.O,cut.V),15);eq(distance(cut.P,cut.X)+distance(cut.X,cut.Y)+distance(cut.Y,cut.P),40);for(const n of ['U','V'])eq((cut.P[0]-cut[n][0])*cut[n][0]+(cut.P[1]-cut[n][1])*cut[n][1],0);
 const spec17={version:2,style:{show_points:true},points:view(cut,5,115,170),circles:{c:{center:'O',radius:75}},segments:{PU:['P','U'],PV:['P','V'],XY:['X','Y'],OH:['O','H']},labels:labels(['P','O','U','V','X','Y','H'])};
 const tasks=[{
  n:13,score:7,page:4,printed:'서술형3',unitId:'635abab8-4a87-452b-ad6c-d59065822f29',standards:['9수04-19','9수04-16'],spec:spec13,
  content:String.raw`정삼각형 $PQR$ 안에 반지름이 모두 같은 세 원이 있다. 세 원은 서로 외접하며, 각 원은 정삼각형의 서로 다른 꼭짓점에서 만나는 두 변에 접한다. 한 원의 둘레의 길이가 $6\pi\,\mathrm{cm}$일 때, 정삼각형 $PQR$의 둘레의 길이를 구하고 그 과정을 쓰시오.`,
  answer:String.raw`$(18+18\sqrt3)\,\mathrm{cm}$`,
  solution:String.raw`각 원의 반지름을 $r$라 하면 $2\pi r=6\pi$이므로 $r=3$이다. 변 $QR$에 접하는 두 원의 중심을 $J$, $K$, 접점을 각각 $H$, $I$라 하자. 두 원의 반지름이 같고 서로 외접하므로 $JK=2r=6$이다. $JH$, $KI$는 $QR$에 수직이고 길이가 같으므로 $HI=JK=6$이다.

원 $J$가 꼭짓점 $Q$에서 만나는 두 변에 접하므로 $QJ$는 $60^\circ$인 꼭짓각을 이등분한다. 직각삼각형 $QHJ$에서 $\angle HQJ=30^\circ$, $JH=3$이므로 $QJ=6$이다. 피타고라스 정리에 따라 $QH=\sqrt{6^2-3^2}=3\sqrt3$이다. 마찬가지로 $IR=3\sqrt3$이다.

따라서 한 변은 $QR=QH+HI+IR=6+6\sqrt3$이고 정삼각형의 둘레는 $3(6+6\sqrt3)=18+18\sqrt3\,\mathrm{cm}$이다.`,
  before:'정삼각형 전체 둘레를 주고 같은 세 접원의 한 원 둘레를 구한다.',after:'한 원의 둘레를 주고 정삼각형 전체 둘레를 복원한다.',concept:'같은 반지름의 원의 외접, 접선과 반지름의 수직, 정삼각형 꼭짓각과 피타고라스',procedure:'원의 둘레에서 양의 반지름→30° 직각삼각형으로 꼭짓점 부분 길이→가운데 두 반지름과 양 끝 부분을 합함',proof:'r3, 한 변6+6√3, 높이9+3√3. 세 중심 사이 거리는6, 각 원과 대응하는 두 변 사이 거리는3을 별도 좌표 코드로 확인했다. 답은 정수/근호 식과 접선 분할에서 계산하며 픽셀을 쓰지 않는다.',sourceObservation:'OriginalH page4 written3: three mutually tangent equal circles each near a different equilateral-triangle vertex; triangle perimeter15+15sqrt3; ask one circle circumference;7points.',calc:{radius:3,sideIntegerPart:6,sideSqrt3Part:6,perimeterIntegerPart:18,perimeterSqrt3Part:18},prerequisites:['원의 둘레','접선과 반지름의 수직','정삼각형과 각의 이등분','30° 직각삼각형','피타고라스와 제곱근']
 },{
  n:14,score:7,page:4,printed:'서술형4',unitId:'b6d4dc2e-0db8-44fe-a763-7214284d9bea',standards:['9수04-19','9수04-20'],spec:spec14,
  content:String.raw`원 $O$ 밖의 점 $S$에서 그은 두 접선의 접점을 $U$, $V$라 하자. 점 $W$는 작은 호 $UV$ 위에서 $U$, $V$와 다른 점이다. $\angle UWV=115^\circ$일 때, 두 접선이 이루는 $\angle USV$의 크기를 구하고 그 과정을 쓰시오.`,
  answer:String.raw`$50^\circ$`,
  solution:String.raw`점 $W$가 작은 호 $UV$ 위에 있으므로 원주각 $UWV$는 $W$를 포함하지 않는 큰 호 $UV$에 대응한다. 이 큰 호에 대한 중심각은 $2\times115^\circ=230^\circ$이다. 한 바퀴의 각이 $360^\circ$이므로 작은 호 $UV$에 대한 중심각은 $\angle UOV=360^\circ-230^\circ=130^\circ$이다.

접점에서의 반지름은 접선에 수직이므로 $\angle OUS=\angle OVS=90^\circ$이다. 사각형 $OUSV$의 네 내각의 합은 $360^\circ$이므로 $\angle USV=360^\circ-90^\circ-90^\circ-130^\circ=50^\circ$이다.`,
  before:'두 접선의 사이각을 주고 작은 호 위의 점이 보는 원주각을 구한다.',after:'작은 호 위의 점이 보는 원주각을 주고 두 접선의 사이각을 역으로 구한다.',concept:'접점 반지름의 수직, 큰 호/작은 호의 원주각과 중심각, 사각형 내각의 합',procedure:'원주각이 보는 큰호 확인→한 바퀴에서 작은 중심각 복원→두 직각이 있는 사각형의 남은 각',proof:'작은 중심각130°, 큰호230°, 외부접선각50°가 양수다. 원주각115°를 보는 W는 작은호 내부에 존재한다. 좌표는 반지름1과 중심각±65°로 접점 및 외부접선의 수직을 확인할 뿐 각 답은 정수 각의 식으로 구한다. 큰호 표현/학생 방법의 실제 학년 적합성은 독립 검수 전 보류다.',sourceObservation:'OriginalH page4 written4: two tangents outsideP angle44, C on minorarcAB, ask ACB;7points.',calc:{inscribed:115,major:230,minor:130,external:50},prerequisites:['원주각과 중심각','큰호·작은호와 한 바퀴360°','접선과 반지름의 수직','사각형 내각의 합']
 },{
  n:15,score:7,page:4,printed:'서술형5',unitId:'635abab8-4a87-452b-ad6c-d59065822f29',standards:['9수04-19','9수04-16'],spec:spec15,
  content:String.raw`원 $O$ 위의 점 $A$를 지나는 접선 $AT$와 현 $BC$가 평행하다. 그림과 같이 $\angle BAT=60^\circ$이고 삼각형 $ABC$의 넓이는 $12\sqrt3\,\mathrm{cm}^2$이다. 선분 $AC$의 길이를 구하고 그 과정을 쓰시오.`,
  answer:String.raw`$4\sqrt3\,\mathrm{cm}$`,
  solution:String.raw`접선 $AT$는 반지름 $OA$에 수직이고 $BC$와 평행하므로 직선 $OA$는 현 $BC$에 수직이다. 원의 중심을 지나 현에 수직인 직선은 그 현을 이등분하므로 $A$는 $BC$의 수직이등분선 위에 있고 $AB=AC$이다.

평행선의 각 관계에서 $\angle ABC=\angle BAT=60^\circ$이다. 이등변삼각형의 두 밑각이 같으므로 $\angle ACB=60^\circ$이고 나머지 각도 $60^\circ$이다. 따라서 $ABC$는 정삼각형이다.

한 변을 $a>0$이라 하면 높이는 피타고라스 정리에 따라 $\sqrt{a^2-(a/2)^2}=\frac{\sqrt3}{2}a$이다. 넓이가 $\frac{\sqrt3}{4}a^2=12\sqrt3$이므로 $a^2=48$이고, 길이는 양수이므로 $AC=a=4\sqrt3\,\mathrm{cm}$이다.`,
  before:'접선과 평행한 현,60°각과 한 변을 주고 삼각형의 넓이를 구한다.',after:'접선·평행 현의 관계와 삼각형 넓이를 주고 양의 한 변 길이를 복원한다.',concept:'접선 반지름의 수직, 현의 수직이등분, 평행선과 이등변/정삼각형, 피타고라스 넓이',procedure:'수직·평행으로 현의 수직이등분선→정삼각형 증명→넓이 관계를 거꾸로 풀어 양의 변 선택',proof:'반지름4인 원 위의 각180°,60°,300° 점이 정삼각형을 이루고 세 변4√3/넓이12√3이다. AT는 A에서 수직 접선,BC와 평행. 접현각 정리를 학생의 미검증 선수 개념으로 쓰지 않고 반지름/현/평행선으로 직접 증명한다.',sourceObservation:'OriginalH page4 written5: chordBC parallel tangentAT atA, BAT60, AC9; ask areaABC;7points.',calc:{circleRadius:4,sideSquared:48,sideSqrt3Coefficient:4,areaSqrt3Coefficient:12},prerequisites:['접선과 반지름의 수직','중심에서 현에 내린 수선의 이등분','평행선의 각','이등변·정삼각형','피타고라스와 제곱근','삼각형 넓이']
 },{
  n:16,score:8,page:4,printed:'서술형6',unitId:'635abab8-4a87-452b-ad6c-d59065822f29',standards:['9수04-19','9수04-16'],spec:spec16,
  content:String.raw`선분 $AB$를 지름으로 하는 반원 $O$가 있다. 두 끝점 $A$, $B$에서 반원이 있는 쪽으로 그은 접선 위의 점을 각각 $D$, $C$라 하고, 선분 $DC$도 반원에 접한다. $\overline{AD}=3\,\mathrm{cm}$이고 반원의 넓이가 $12\pi\,\mathrm{cm}^2$일 때, $BC$의 길이를 구하고 그 과정을 쓰시오.`,
  answer:String.raw`$8\,\mathrm{cm}$`,
  solution:String.raw`반지름을 $r$라 하면 $\frac12\pi r^2=12\pi$이므로 $r^2=24$이다. 선분 $DC$의 접점을 $F$, $BC=x$라 하자. 한 점에서 원에 그은 접선의 길이는 같으므로 $DF=DA=3$, $CF=CB=x$이고 $DC=x+3$이다.

$AD$, $BC$는 지름 $AB$에 수직이므로 서로 평행하다. 두 평행선 사이의 거리는 $AB=2r$이고, 점 $D$, $C$가 지름에서 떨어진 길이의 차는 $|x-3|$이다. 따라서 두 점 사이의 직각삼각형에서 피타고라스 정리를 쓰면 $(x+3)^2=(x-3)^2+(2r)^2$이다.

전개하여 정리하면 $12x=4r^2=96$이므로 $x=8$이다. 길이가 양수이고 접선의 두 부분 $3$, $8$도 양수이다. 따라서 $BC=8\,\mathrm{cm}$이다.`,
  before:'지름 양 끝의 두 접선 길이를 주고 반원 넓이를 구한다.',after:'반원 넓이와 한쪽 접선 길이를 주고 다른 접선 길이를 역추론한다.',concept:'접선 길이의 대응, 지름에서의 수직·평행, 피타고라스 전개, 원/반원의 넓이',procedure:'넓이에서 반지름 제곱→두 접선 부분의 합과 끝점 거리→피타고라스 식 전개로 길이 복원',proof:'r²24,AD3,BC8,DC11이며 11²=5²+4×24다. 정확한 접점F(48/11,5r/11)의 원 위 위치·접선 수직·양쪽 부분3/8을 별도 코드로 확인했다. 반원을 실제 arc로 새로 그리며 원본 크롭/전체원을 반원으로 오인하지 않는다.',sourceObservation:'OriginalH page4 written6: diameterAB, endpoint tangentsAD3/BC5 andcommon tangentCD; ask semicircle area;8points.',calc:{radiusSquared:24,firstTangent:3,secondTangent:8,commonTangent:11,pythagoreanSquares:[121,25,96]},prerequisites:['접선의 길이','반지름과 접선의 수직','평행선 사이 거리','피타고라스','다항식 전개와 일차방정식','반원의 넓이']
 },{
  n:17,score:8,page:5,printed:'서술형7',unitId:'635abab8-4a87-452b-ad6c-d59065822f29',standards:['9수04-19','9수04-16'],spec:spec17,
  content:String.raw`원 $O$ 밖의 점 $P$에서 그은 두 접선의 접점을 $U$, $V$라 하자. 선분 $PU$, $PV$ 위의 점 $X$, $Y$를 이은 선분 $XY$도 이 원에 접하고, 접점 $H$는 선분 $XY$의 내부에 있다. 원의 반지름이 $15\,\mathrm{cm}$이고 삼각형 $PXY$의 둘레가 $40\,\mathrm{cm}$일 때, $PO$의 길이를 구하고 그 과정을 쓰시오. (점 $X$, $Y$는 각각 선분 $PU$, $PV$의 내부에 있다.)`,
  answer:String.raw`$25\,\mathrm{cm}$`,
  solution:String.raw`$PU=PV=t$라 하자. 같은 점에서 그은 두 접선의 길이는 같으므로 $XH=XU=t-PX$, $YH=YV=t-PY$이다. 점 $H$가 선분 $XY$의 내부에 있으므로 $XY=XH+HY=2t-PX-PY$이다.

따라서 삼각형의 둘레는 $PX+PY+XY=2t=40$이므로 $PU=t=20$이다. 접점에서 반지름과 접선은 수직이므로 직각삼각형 $POU$에서 $PO^2=PU^2+OU^2=20^2+15^2=625$이다. 길이가 양수이므로 $PO=25\,\mathrm{cm}$이다.`,
  before:'원의 네 접선을 가진 사각형의 연장 교점과 중심 거리/반지름을 주고 위쪽 외부 삼각형 둘레를 구한다.',after:'불필요한 아래쪽 사각형을 제거하고 세 접선으로 만든 외부 삼각형의 둘레에서 중심까지 거리를 복원한다.',concept:'동일 외부점의 두 접선 길이 대응, 접선 부분 합의 소거, 직각삼각형 피타고라스',procedure:'세 꼭짓점에서 접선 대응→삼각형 둘레가 원래 접선의 두 배임을 정리→반지름과 접선으로 중심 거리',proof:'O(0,0),r15,P(0,25),접점U/V(±12,9),절단점X/Y(±15/2,15),H(0,15)로 존재한다. 두 원래 접선20,삼각형 두 빗변25/2,밑변15이므로 둘레40. 원은 삼각형 외부에 있고 직선의 연장선에 접한다. 후보를 내접원으로 오기하지 않는다. 위치가 달라도 소거식으로 목표PO는25하나다.',sourceObservation:'OriginalH page5 written7: incircle ofquadrilateralABCD withextensionsAB/CD intersectP, PO17, perpendicularOH8 toAD; ask trianglePAD perimeter;8points.',calc:{radius:15,originalTangent:20,centreDistance:25,cutTriangleSides:[12.5,12.5,15],perimeter:40},prerequisites:['같은 점에서 그은 두 접선 길이','선분의 부분과 전체','접선과 반지름의 수직','피타고라스와 양의 제곱근']
 }];
 fs.mkdirSync(out);
 for(const t of tasks){
  const name=`q${t.n}`,original=b+`next-five-extraction-r1/gyeongsin/evidence/additional-original-H-page-0${t.page}.webp`,sourceQ=source.questions.find((q:{number:number})=>q.number===t.n),unit=snapshot.units.find((q:{id:string})=>q.id===t.unitId);assert(sourceQ&&unit);
  const component=out+name+'-source-component-observation-r1.json';fs.writeFileSync(component,JSON.stringify({utc:new Date().toISOString(),actuallyViewed:{path:original,sha256:sha256(fs.readFileSync(original))},physicalPdfPage:t.page,printed:t.printed,sourceSerial:t.n,observed:t.sourceObservation,wholePairIdentityApproved:false,rightsRestrictionObserved:true,rightsApproved:false,originalAnswerKeyUsed:false,originalCropEmbedded:false},null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(out+name+'.figure.spec.json',JSON.stringify(t.spec,null,2)+'\n',{flag:'wx'});const rendered=await renderFigureSpec(t.spec,{strict:true});if(!rendered.ok){fs.writeFileSync(out+name+'-render-failure-r1.json',JSON.stringify(rendered,null,2)+'\n',{flag:'wx'});throw new Error(rendered.error);}assert.equal(rendered.droppedDimensions?.length??0,0);fs.writeFileSync(out+name+'.figure.svg',rendered.svg,{flag:'wx'});
  const q=structuredClone(base);Object.assign(q,{questionNumber:t.n,twinExternalId:`exam-twin-gyeongsin-2025-2-mid-author-group11-r1-${name}`,questionType:'서술형',score:t.score,content:t.content,choices:[],answer:t.answer,solution:t.solution,figureArtifacts:[{role:'stem',specPath:name+'.figure.spec.json',svgPath:name+'.figure.svg',intendedWidthMm:70}]});
  q.sourceReference={...base.sourceReference,externalId:`2025-gyeongsin-3-2-mid-${t.n}`,newSourceReferenceId:`source-ref-gyeongsin-2025-2-mid-group11-r1-${name}`,sourceContentSha256:sourceQ.sourceContentDigest,componentObservation:{path:component,sha256:sha256(fs.readFileSync(component))},originalQuestionRender:{path:original,sha256:sha256(fs.readFileSync(original)),physicalPdfPage:t.page,printedQuestion:t.printed},actualReference:t.sourceObservation+' Component only; no wholepaper/pair/year/rights certification.'};
  q.variantDelta={modes:['inverse-target','structure','new-vector'],before:t.before,after:t.after,sharedConcept:t.concept,sharedProcedure:t.procedure,actualStructuralChange:t.after+' 입력/질문 대상과 조건 조직을 바꾸고 모든 문장·답·해설·그림을 새로 제작했다. 단순 숫자/학교명/동의어 치환은 완료 근거가 아니다.',domainProof:t.proof,difficultyBasis:'원문 배점과 같은 핵심 관계를 유지하는 심화하 저자 제안이다. 새로 요구되는 관계와 연산이 해당 학년/2015교육과정 안인지 독립 7면 검수를 받아야 한다. 체감 난도 동등성/2022적용은 별도 보류.'};
  q.curriculumReview={...base.curriculumReview,standardCodes:t.standards,officialPrimary:{...base.curriculumReview.officialPrimary,standard:t.standards.join(', '),actualScope:'2015 tangent/chord/inscribed-angle and Pythagoras only as actually required per candidate. No general circle proportionality; exact grade placement and all seven student surfaces independently pending.'},legitimateMethodDraft:t.procedure,sevenSurfaces:Object.fromEntries(SURFACES.map((k:string)=>[k,'author-proposed-independent-review-pending'])),independentReviewPending:true};
  q.metadata={...base.metadata,score:t.score,difficultyProposal:'심화하',problemTypeProposal:t.after,sourceDifficultyLabelObserved:sourceQ.difficultyLabelFromSource||null,assignment:{status:'pending',unitId:unit.id,familyKey:null,currentUnit:unit,snapshot:{path:snapshotPath,sha256:sha256(fs.readFileSync(snapshotPath))},evidence:'실제 Unit UUID를 제안 연결했다. 질문 역전과 새 필수 풀이 목적에 맞는 정확한 live family는 null/보류이며 자동 분류 승인하지 않는다.'},prerequisiteUnits:snapshot.units.filter((u:{id:string})=>[t.unitId,'635abab8-4a87-452b-ad6c-d59065822f29','43b3be19-badc-47cf-8e0d-edf19766e62c'].includes(u.id)),placementConditions:{...base.metadata.placementConditions,requiresLearnedBeforeAssignment:t.prerequisites},figureAuthoring:{method:'existing-FigureSpec-v2-vector-engine-strict',newFigures:1,newTables:0,originalCropEmbedded:false,pixelOracle:false,coordinateConstruction:t.proof,reproductionScript:'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/author-gyeongsin-written13-17-r1.ts',renderingReviewPending:true}};
  fs.writeFileSync(out+name+'.json',JSON.stringify(q,null,2)+'\n',{flag:'wx'});const x=bindCandidate(out+name+'.json');assert.deepEqual(x.validation.studentMathNotationWarnings,[]);assert.equal(x.validation.metadataAnswerFormatMismatch,false);fs.writeFileSync(out+name+'-author-calculations-r1.json',JSON.stringify({...t.calc,utc:new Date().toISOString(),candidateFileSha256:x.candidateFileSha256,studentDigest:x.studentDigest,candidateDigest:x.candidateDigest,assetDigest:x.assetDigest,authorOnly:true,independentReview:false,strictRender:true,newFigures:1,loadable:0,dbWrites:0},null,2)+'\n',{flag:'wx'});
 }
 console.log(JSON.stringify({authored:5,newVectorFigures:5,independentReviewPending:true,currentCanonicalCountsUnchanged:true,loadable:0}));
}
main().catch(err=>{console.error(err);process.exitCode=1;});
