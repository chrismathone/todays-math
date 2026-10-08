const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {sha,digest,assert,authorId,project}=require('./author-common.cjs');
(async()=>{
  const group=process.argv[2],preview=process.argv[3],ns=process.argv.slice(4).map(Number);
  assert(group&&preview&&ns.length,'group preview questions');
  const {bindCandidate}=await import(pathToFileURL(path.join(project,'scripts/import/exam-twin/candidatePack.mjs')).href);
  const rows=[];
  for(const n of ns){
    const nn=String(n).padStart(2,'0'),file=path.join(__dirname,'candidates','q'+nn,'candidate.json'),b=bindCandidate(file),c=b.candidate;
    const calc=JSON.parse(fs.readFileSync(path.join(path.dirname(file),'author-calculations.json'),'utf8'));
    const proof=group==='group2'?(n===12?'preview-q12-r4':([10,17].includes(n)?'preview-group2-r2':'preview-group2')):preview;
    const rendering=JSON.parse(fs.readFileSync(path.join(__dirname,proof,'render-evidence.json'),'utf8')).observations.find(x=>x.questionNumber===n);
    assert(rendering.studentDigest===b.studentDigest&&rendering.assetDigest===b.assetDigest,'Exact student/asset visual proof');
    assert(calc.optionChecks.length===5&&calc.optionChecks.filter(x=>x.correct).length===1&&calc.domainChecks.every(x=>x.passed),'Author arithmetic/conditions');
    assert(c.independentVerification===null&&c.directUseAllowed===false&&!b.validation.surfaceKeywordViolations.length,'Pending gates/methods');
    assert(c.metadata.authorEvidence.authoringScriptSha256===sha(fs.readFileSync(path.join(__dirname,'author-'+group+'.cjs'))),'Current immutable author code');
    const record={schemaVersion:1,authorId,questionNumber:n,status:'author-self-check-only',sourceDigest:c.sourceReference.sourceContentSha256,variantDigest:digest(c.variantDelta),studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,calculationDigest:digest(calc),metadataDigest:digest(c.metadata),independentVerification:null,allOptionsChecked:true,allDomainChecksPassed:true,visualReview:{humanViewed:true,proofPath:proof+'/q'+nn+'.png',proofSha256:sha(fs.readFileSync(path.join(__dirname,proof,'q'+nn+'.png'))),renderedCandidateDigest:rendering.candidateDigest,exactStudentAndAssetDigestsMatched:true,metadataOnlyAuthorScriptHashRefresh:rendering.candidateDigest!==b.candidateDigest,bankCapMm:70,productionParity:false,physicalPaperApproval:false},allSevenSurfaces:'author-proposed-independent-review-pending',sourceScore:c.score,authoredScore:c.score,rights:'held',sourceFullPairCustody:'held',nativeCompatibility:'held',directUseAllowed:false};
    const reviewPath=path.join(path.dirname(file),'author-review.json');assert(!fs.existsSync(reviewPath),'New review only');fs.writeFileSync(reviewPath,JSON.stringify(record,null,2)+'\n');
    rows.push({questionNumber:n,twinExternalId:c.twinExternalId,candidatePath:path.relative(__dirname,file).replace(/\\/g,'/'),sourceDigest:record.sourceDigest,variantDigest:record.variantDigest,studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,calculationDigest:record.calculationDigest,metadataDigest:record.metadataDigest,authorReviewDigest:digest(record),score:c.score,figures:b.assets.length,taxonomy:c.metadata.assignment.status,independentVerification:null,gradeStatus:'author-proposed',directUseAllowed:false});
  }
  const out=path.join(__dirname,'author-index-'+group+'.json');assert(!fs.existsSync(out),'New group only');fs.writeFileSync(out,JSON.stringify({schemaVersion:1,authorId,sourceExam:'2025-gyeongsan-3-2-mid',group,authored:rows.length,questions:rows,figures:rows.reduce((s,q)=>s+q.figures,0),gradeApprovals:0,independentApprovals:0,rightsApprovals:0,directUseAllowed:false},null,2)+'\n');
  console.log(JSON.stringify({group,authored:rows.length,figures:rows.reduce((s,q)=>s+q.figures,0),scores:rows.reduce((s,q)=>s+q.score,0),fourDigestsAndAuthorDimensionsBound:true}));
})().catch(e=>{console.error(e);process.exit(1)});
