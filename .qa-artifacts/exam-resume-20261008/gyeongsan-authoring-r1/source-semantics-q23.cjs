const fs=require('node:fs'),path=require('node:path');
const {packet,digest,sha,assert,authorId}=require('./author-common.cjs');
const q=packet.questions.find(x=>x.number===23);
const radians=d=>d*Math.PI/180;
const horizontalDistance=100,upAngle=60,downAngle=45;
// The source observation point is the rooftop of A. No additional eye-height
// measurement is stated; do not invent one from the reference pixels.
const eyeAboveRoofA=0;
const observationElevation=horizontalDistance*Math.tan(radians(downAngle));
const heightA=observationElevation-eyeAboveRoofA;
const heightB=observationElevation+horizontalDistance*Math.tan(radians(upAngle));
const heightSum=heightA+heightB;
assert(Math.abs(heightSum-100*(2+Math.sqrt(3)))<1e-8,'Both observation-height contributions');
const record={schemaVersion:1,authorId,sourceQuestionId:q.sourceQuestionId,sourceContentDigest:q.sourceContentDigest,referenceImageSha256:q.images[0].sha256,sourceSemanticsOnly:true,originalKeyOrSolutionRead:false,input:{horizontalDistance,upAngle,downAngle,eyeAboveRoofA},roles:{observationPoint:'A의 옥상 관측 지점',lookDownEndpoint:'B의 지면 밑점',lookUpEndpoint:'B의 꼭대기',requested:'A와 B 건물 높이의 합'},generalRelation:'hA=d*tan(down)-e; hB=d*tan(down)+d*tan(up); hA+hB=2*d*tan(down)+d*tan(up)-e',sourceObservationModel:'관측 지점은 A 옥상의 높이이다. 별도 눈높이 길이는 주어지지 않아 픽셀에서 추가하지 않았다.',results:{observationElevation,heightA,heightB,heightSum,exactHeightSum:'100*(2+sqrt(3))'},checks:{positiveLengths:true,observationElevationContributesToBothHeights:true,notJustHeightDifference:true,anglesWithin0To90:true},historicalKeyConflict:'still separate held; this is a new code derivation of source roles, not original-key approval',authoringBoundary:'새 twin은 관측 지점의 높이 역할·공통 수평 지면·내려본 끝점을 명시하고 별도 새 수치로 다시 계산한다.',independentApproval:false,directUseAllowed:false};
fs.writeFileSync(path.join(__dirname,'source-semantics-q23.json'),JSON.stringify({...record,semanticsDigest:digest(record),calculationScriptSha256:sha(fs.readFileSync(__filename))},null,2)+'\n');
console.log(JSON.stringify({sourceSemanticsDerived:true,heightA,heightB,heightSum,requestedSum:true,independentApproval:false}));
