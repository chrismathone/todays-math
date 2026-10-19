const fs=require('fs'),crypto=require('crypto'),path=require('path'),cp=require('child_process'),assert=require('assert/strict');
const root='C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008',out='.qa-artifacts/exam-resume-20261008/m1-student-method-policy-audit-20261019-r1';
const saved=JSON.parse(fs.readFileSync(path.join(out,'source-hashes.json'),'utf8')); const hashes=saved.files??saved;
for(const file of ['src/__tests__/unit/examStudyM1StudentMethods.test.ts','src/__tests__/unit/examStudyCurriculumEligibility.test.ts','src/__tests__/unit/examStudyRoutes.test.ts'])hashes[file]=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
for(const [file,sha] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),sha);
const commit=cp.execFileSync('git',['-C',root,'rev-parse','HEAD'],{encoding:'utf8'}).trim();for(const [file,sha] of Object.entries(hashes)){const baseline=cp.execFileSync('git',['-C',root,'show','defb4d9ae:'+file]);assert.equal(baseline.toString('utf8').replace(/\r\n/g,'\n'),fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),file+' content changed from requested commit');}
fs.writeFileSync(path.join(out,'source-hashes.json'),JSON.stringify({requestedRootCommit:'defb4d9ae65e5115f7d546daac99d77623703e9d',observedFinalRootCommit:commit,allReadFilesMatchRequestedCommitAfterCRLFNormalization:true,algorithm:'SHA256',files:hashes,missingRequestedFile:'src/lib/examStudy/output.ts'},null,2)+'\n');
const rawdir='.qa-artifacts/exam-resume-20261008/nobyeon-sem1-q08q09q10-clean-blind-20261019-r1/solve';
const rawHashes=['57bfe42a2619bc42e894e46332ff0dc0519e429af4f38ce519e0323b55f31ea6','28762ff5c76e9978d06c2fc0bf3b062081f8ef8bc49e8f03539d850f06a0fb37','db8756657fcdba7bbd6c7dd74167109f70bc9c5b0593c17733e68dbb572df9ca'];
for(const [i,n] of [8,9,10].entries())assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(rawdir,`q${String(n).padStart(2,'0')}.json`))).digest('hex'),rawHashes[i]);
console.log('Audited files match requested baseline despite external HEAD advance; prior sealed raws unchanged.');
