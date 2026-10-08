// Edits only this newly authored, uncommitted review evidence. Never touches blind/candidates.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
const auditFile=path.join(__dirname,'input-and-asset-audit.json'),audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));
const cube=audit.questions.find(x=>x.questionNumber===11).assets.find(x=>x.sourceSpecPath.endsWith('figure-1.spec.json'));
const p=JSON.parse(fs.readFileSync(cube.sourceSpecPath,'utf8')).points,approx=(a,b)=>Math.abs(a-b)<1e-7;
const eq=(X,Y,Z,W)=>approx(X[0]-Y[0],Z[0]-W[0])&&approx(X[1]-Y[1],Z[1]-W[1]);
const passed=eq(p.G,p.F,p.C,p.B)&&eq(p.B,p.F,p.C,p.G)&&eq(p.E,p.F,p.A,p.B)&&eq(p.E,p.F,p.H,p.G)&&eq(p.E,p.F,p.D,p.C)&&eq(p.D,p.A,p.H,p.E);
if(!passed)throw Error('Cube projected edge correspondence');
cube.numericRelation={passed,projectedParallelEdgesConsistent:true,metricAnglesOrLengthsInferredFromProjection:false,reason:'The labelled cube is an affine placement projection with consistent parallel edges. The separate exact BFD triangle supplies the mathematical lengths/angle; projected C/FD overlap is not a space collinearity claim.'};
fs.writeFileSync(auditFile,JSON.stringify(audit,null,2)+'\n');
const file=path.join(__dirname,'reports/q18.json'),r=JSON.parse(fs.readFileSync(file,'utf8'));
const rule=r.evidence.unitAndFamilyReview.comparedFullRules.find(x=>x.registryEntry.key==='3-2|삼각비의 활용|01');
if(!rule||r.evidence.unitAndFamilyReview.familyKey!==null)throw Error('Bound unknown family required');
rule.rule.observedRule='실제두갈래는30/45/60특수각과빗변한변에서두직각변을계산한뒤넓이또는둘레를구하는정방향문제이다. 제목의변의길이만으로판정하지않았다. 내부D/등변/22.5도각증명과전체AB역복원서술을함께지원하지않는다.';
fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
const summaryFile=path.join(__dirname,'review-summary.json'),s=JSON.parse(fs.readFileSync(summaryFile,'utf8')),entry=s.questions.find(x=>x.questionNumber===18);
for(const entry of s.questions){const f=path.join(__dirname,entry.path),report=JSON.parse(fs.readFileSync(f,'utf8'));report.evidence.inputAssetAuditSha256=sha(fs.readFileSync(auditFile));if(entry.questionNumber===11)report.evidence.figureReview.exactPublicStudentSvgBindings=audit.questions.find(x=>x.questionNumber===11).assets;fs.writeFileSync(f,JSON.stringify(report,null,2)+'\n');entry.sha256=sha(fs.readFileSync(f));entry.reportDigest=sha(Buffer.from(canonical(report)));}
s.inputAndAssetAuditSha256=sha(fs.readFileSync(auditFile));s.reportCodeSha256=sha(fs.readFileSync(path.join(__dirname,'write-reports.cjs')));
fs.writeFileSync(summaryFile,JSON.stringify(s,null,2)+'\n');
console.log(JSON.stringify({newUncommittedQ18RuleEvidenceCorrected:true,familyRemainsPending:true,rawSolvesOrCandidatesWritten:false}));
