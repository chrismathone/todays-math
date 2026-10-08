const fs=require('node:fs'),path=require('node:path');
const {sha,digest,assert,authorId,project}=require('./author-common.cjs');
const {pathToFileURL}=require('node:url');
(async()=>{
  const name=process.argv[2],questions=process.argv.slice(3).map(Number);
  assert(name&&questions.length,'Freeze group name and questions');
  const {bindCandidate}=await import(pathToFileURL(path.join(project,'scripts/import/exam-twin/candidatePack.mjs')).href);
  const result=[];
  for(const n of questions){
    const nn=String(n).padStart(2,'0'),file=path.join(__dirname,'candidates','q'+nn,'candidate.json');
    const b=bindCandidate(file),c=b.candidate;
    const calculations=fs.readFileSync(path.join(path.dirname(file),'author-calculations.json'));
    const cc=JSON.parse(calculations.toString('utf8'));
    assert(cc.optionChecks.length===5&&cc.optionChecks.filter(x=>x.correct).length===1&&cc.domainChecks.every(x=>x.passed),'Author checks');
    const source=JSON.parse(fs.readFileSync(path.join(__dirname,'source-snapshot/packet/questions.json'),'utf8')).questions.find(q=>q.number===n);
    assert(c.score===source.scoreEvidence.referenceParentScore&&c.independentVerification===null&&c.directUseAllowed===false,'Score and gates');
    assert(!b.validation.surfaceKeywordViolations.length,'Student method keywords');
    const proof=n===7?'preview-q07-r3':'preview-group1';
    const render=JSON.parse(fs.readFileSync(path.join(__dirname,proof,'render-evidence.json'),'utf8'));
    const observation=render.observations.find(o=>o.questionNumber===n);
    assert(observation.studentDigest===b.studentDigest&&observation.assetDigest===b.assetDigest,'Visual proof exact student and asset binding');
    const review={authorId,questionNumber:n,status:'author-self-check-only',independentVerification:null,sourceDigest:source.sourceContentDigest,variantDigest:digest(c.variantDelta),studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,calculationDigest:digest(cc),calculationFileSha256:sha(calculations),metadataDigest:digest(c.metadata),sourceScore:source.scoreEvidence.referenceParentScore,authoredScore:c.score,allOptionsChecked:true,allDomainChecksPassed:true,visualReview:{humanViewed:true,proofPath:proof+'/q'+nn+'.png',proofSha256:sha(fs.readFileSync(path.join(__dirname,proof,'q'+nn+'.png'))),bankCapMm:70,choiceOwnershipVerified:true,rawImageCaptionRemoved:n===7,choiceMarksAboveGraphs:n===7,historicalUnapprovedPreviews:n===7?['preview-group1','preview-group1-r2']:[],productionParity:false,physicalPaperApproval:false},allSevenStudentSurfaces:'author-proposed-independent-review-pending',curriculumEdition:'2015',grade:'중3',rights:'held',sourceFullPairCustody:'held',nativeCompatibility:'held',directUseAllowed:false};
    const reviewPath=path.join(path.dirname(file),'author-review.json');
    assert(!fs.existsSync(reviewPath),'Do not replace author review');
    fs.writeFileSync(reviewPath,JSON.stringify(review,null,2)+'\n');
    result.push({questionNumber:n,twinExternalId:c.twinExternalId,candidatePath:path.relative(__dirname,file).replace(/\\/g,'/'),sourceDigest:source.sourceContentDigest,variantDigest:digest(c.variantDelta),studentDigest:b.studentDigest,candidateDigest:b.candidateDigest,assetDigest:b.assetDigest,calculationDigest:digest(cc),metadataDigest:digest(c.metadata),authorReviewDigest:digest(review),authorReviewPath:path.relative(__dirname,reviewPath).replace(/\\/g,'/'),score:c.score,figures:b.assets.length,taxonomy:c.metadata.assignment.status,independentVerification:null,gradeStatus:'author-proposed',rights:'held',directUseAllowed:false});
  }
  const output=path.join(__dirname,'author-index-'+name+'.json');
  assert(!fs.existsSync(output),'New index required');
  fs.writeFileSync(output,JSON.stringify({schemaVersion:1,authorId,sourceExam:'2025-gyeongsan-3-2-mid',gyeongsanyeo:false,group:name,authored:result.length,questions:result,figures:result.reduce((s,q)=>s+q.figures,0),gradeApprovals:0,independentApprovals:0,rightsApprovals:0,directUseAllowed:false},null,2)+'\n');
  console.log(JSON.stringify({group:name,authored:result.length,figures:result.reduce((s,q)=>s+q.figures,0),scores:result.reduce((s,q)=>s+q.score,0),allDigestsBound:true}));
})().catch(e=>{console.error(e);process.exit(1)});
