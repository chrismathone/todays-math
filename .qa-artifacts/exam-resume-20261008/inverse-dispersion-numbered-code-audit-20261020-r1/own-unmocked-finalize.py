from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/inverse-dispersion-numbered-code-audit-20261020-r1');parent=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
r=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
b=r(p/'own-unmocked-before.json');scope=r(p/'provided-scope.json');add=r(p/'provided-scope-addendum-1.json');rows=[]
for x in scope['files']:
 rows.append({'path':x['path'],'expected':x['sha256'],'root':h(parent/x['path']),'snapshot':h(p/x['snapshot']),'runtime':h(p/x['runtime'])})
x=add['additionalData'];rows.append({'path':x['canonicalPath'],'expected':x['sha256'],'root':h(parent/x['canonicalPath']),'snapshot':h(p/x['snapshot']),'runtime':h(p/x['runtime'])})
assert rows==b['files15'];art=[{'path':x['path'],'sha256':h(Path(x['path']))} for x in b['rawReports']];assert art==b['rawReports']
sealed=[]
for x in b['priorSealedFiles']:
 f=Path(x['path']);assert h(f)==x['sha256'];assert f.read_bytes()==subprocess.check_output(['git','show',b['priorOwnCommit']+':'+x['path']]);sealed.append(x)
assert h(p/'provided-scope.json')==b['scopeSha256'] and h(p/'provided-scope-addendum-1.json')==b['addendumSha256']
after={'files15':rows,'rawReports':art,'priorSealedFiles':sealed,'all15BeforeAfterEqual':True,'all6RawReportsBeforeAfterEqual':True,'all15PriorOwnFilesGitBlobEqual':True}
(p/'own-unmocked-after.json').write_text(json.dumps(after,indent=2)+'\n',encoding='utf-8')
controls=r(p/'own-unmocked-control-results.json');assert controls['summary']['failed']==0 and not controls['validationMocked'];c=controls['collector'];assert (c['mathematicalVerified'],c['gradeReviewed'],c['overallVerified'],c['loadable'])==(3,3,0,0)
for x in c['results']:
 for reason in ['review-unitFamilyFit-not-passed','source-identity-held','rights-review-pending','native-exam-twin-provenance-not-implemented']:assert reason in x['reasons']
report={
 'kind':'independent-U54-U55-unmocked-collector-completion/v1','status':'bounded-audit-complete-release-held','priorOwnCommit':b['priorOwnCommit'],'priorReportSha256':h(p/'own-audit-report.json'),
 'scope':{'baseScopeSha256':b['scopeSha256'],'addendumSha256':b['addendumSha256'],'codeFiles':14,'dataFiles':1,'allRootSnapshotRuntimeBeforeAfterHashesMatch':True,'rulesSha256':add['additionalData']['sha256'],'candidatePackSha256':'13da6274441c78cb7c5eb9df1c83cc55dd6a9489aec0ac4205a5764aa3ddafb4'},
 'actualRuns':{'summary':controls['summary'],'validationMocked':False,'collector':c,'explanation':'Fresh execution of own previously sealed controls against actual currentPackage bindings and actual validateCandidate keyword/notation checks. The one added actual full collector assertion increases2171 to2172; these are not2172 newly invented cases. All1734 exact rational cases rerun against actual exported helper; sealed Fraction oracle bytes reused unchanged. No supplied test count used.'},
 'hostileGates':{'actualBindingControls':72,'results':'Missing grade surfaces or passed-status objects lacking basis do not receive gradeReviewed. Wrong named roles/order/value, malformed typed syntax and stale candidate/student/asset/solve digests fail the expected math/grade dimensions. Forged release flags and fabricated grade assertions still cannot produce overallVerified, loadable or productionWrites.','semanticAttestationLimit':'Fabricated but nonempty grade basis can retain gradeReviewed=true; this evaluator trusts review attestations. It does not independently establish student method or rights, and mandatory native hold still prevents release.'},
 'findings':{'productionDefectsObservedInBoundedControls':0,'initialMissingDependencyResolved':True,'missingDependencyWasNotProductionFault':True,'priorDollarFixtureIssue':'Test expectation/fixture construction correction only. Initial seven and intermediate three failed expectations remain in the sealed prior files; no production fault claimed.','legacyNormalizer':'Unchanged legacy paths for non-typed formats remain; the separately tested unknown-format normalization bypass is not claimed fixed by U55.'},
 'preservation':{'rawAndCurrentReports':art,'priorSealedOwnFiles':sealed,'sourceRulesEdits':0,'rawReportEdits':0,'oldAuditEdits':0,'allHashesBeforeAfterIdentical':True,'q17Limitation':'Completed group5 full review and sealed q17 raw E80,40 versus actual30,40 observation limitation preserved unchanged; this code audit neither rewrites it nor claims pristine blind point reading.'},
 'limits':[
  'Actual group4 math3/grade3 reflects collection of existing independently authored/solved/reviewed evidence; helpers do not themselves prove student curriculum or rights. No new manual question/blind/grade approval count.',
  'Exact live family, source identity, rights, similarity, native provenance/loadability remain held. All three reports still pending with unitFamilyFit=false. 2022 scope remains pending.',
  'Bounded exact rational arithmetic and explicit typed grammar only; no generic symbolic equivalence, relationship-truth proof, all-format normalizer repair, positive physical-length certification or generalized release approval.',
  'No DB/API/model calls, no production writes, no source/runtime/snapshot/rules edits, no new workers. Actual collector is offline filesystem validation; no real HTTP/native reader certification.',
  'Prior incomplete report/mocked collector remain historically valid records of the earlier missing dependency; this new addendum resolves only that run limitation without relabeling prior mocks as actual.'
 ],
 'reproduction':['python <prefix>/own-unmocked-prepare.py','node <prefix>/own-unmocked-controls.mjs','python <prefix>/own-unmocked-finalize.py'],
 'evidenceHashes':{f.name:h(f) for f in sorted(p.glob('own-unmocked-*')) if f.is_file() and f.name not in ['own-unmocked-audit-report.json','own-unmocked-file-hashes.json']}
}
with (p/'own-unmocked-audit-report.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
hashes={f.name:h(f) for f in sorted(p.glob('own-unmocked-*')) if f.is_file() and f.name!='own-unmocked-file-hashes.json'}
(p/'own-unmocked-file-hashes.json').write_text(json.dumps(hashes,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reportSHA256':h(p/'own-unmocked-audit-report.json'),'newOwnFiles':len(hashes)+1,'all15SourceDataAnd6RawReportsAnd15OldOwnFilesUnchanged':True},indent=2))
