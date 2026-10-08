import json,hashlib,collections,datetime,shutil,sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
p=Path('C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006/docs/planning/tracks/reports/concept-student-clear-20261006/e5e6');t=Path('D:/tmp/concept-student-clear-20261006')
def read(f): return json.loads(f.read_text(encoding='utf-8'))
def dump(n,x): (p/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def sha(f): return hashlib.sha256(f.read_bytes()).hexdigest()
def fingerprint(x): return hashlib.sha256(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')).hexdigest()
a=read(p/'audit.json');src=read(t/'e5e6.json');ledger=read(p/'codex-final-editorial.json');v=read(p/'validation.json');integ=read(p/'evidence/current-validation-ctx-7fc6b4391c84.json');core=read(p/'core-definition-validation.json')
ids=[x['id'] for x in src['entries']]
assert len(ids)==len(set(ids))==2621
assert ids==[x['id'] for x in a['rows']]==[x['id'] for x in ledger['rows']]==a['reviewedIds']
assert sha(t/'e5e6.json')==a['sourceSha256']=='d1b80f375e0a48caa7a295ca09bb27712be69e8d0f0170bbd5320fc7425bd172'
assert (p/'evidence/source.json').read_bytes()==(t/'e5e6.json').read_bytes()+b'\n'
assert read(p/'evidence/source.json')==src
assert read(p/'partial-audit.json')['rows']==a['rows']
assert not a['validationIssues'] and not a['pendingIds'] and not a['finalEditorialPendingIds']
assert not v['structuralFailures'] and not v['contractDraftIssues'] and not integ['failures'] and not integ['editorialFailures'] and not integ['notation'] and not integ['clashes'] and not core['invalidCount']
payloadkeys=['id','bDecision','cDecision','bQuestion','clozeQuestion','coreAfter','learningRole','questionExclusions','requiredDiagramPaths']
cache={};evidence_matches=[]
def contained(obj, id, fp):
 if isinstance(obj,dict):
  if obj.get('id')==id and obj.get('proposalFingerprint')==fp:return True
  return any(contained(x,id,fp) for x in obj.values() if isinstance(x,(dict,list)))
 if isinstance(obj,list):return any(contained(x,id,fp) for x in obj)
 return False
for i,(r,s,l) in enumerate(zip(a['rows'],src['entries'],ledger['rows'])):
 assert r['sourceIndex']==i and r['source']==s and r['sourceFingerprint']==fingerprint(s)
 assert r['proposalFingerprint']==fingerprint({k:r.get(k) for k in payloadkeys})==l['proposalFingerprintReviewed']
 assert l['bVerdict']==l['cVerdict']=='adopt'
 f=p/l['inputEvidence'];assert f.is_file(),str(f)
 if str(f) not in cache:cache[str(f)]=read(f)
 assert contained(cache[str(f)],r['id'],r['proposalFingerprint']),(r['id'],str(f),'captured payload not found')
 evidence_matches.append({'sourceIndex':i,'id':r['id'],'sourceFingerprint':r['sourceFingerprint'],'proposalFingerprint':r['proposalFingerprint'],'inputEvidence':l['inputEvidence'],'inputSha256':sha(f),'reader':l.get('reader','legacy Codex direct-reading record; reader field absent'),'recordedAfterDirectReading':l.get('recordedAfterDirectReading'),'bDecision':r['bDecision'],'cDecision':r['cDecision']})
preserved=[]
for id in ['e6-2-1-1-xc11','e6-2-1-1-xc12']:
 r=next(r for r in a['rows'] if r['id']==id)
 assert r['cDecision']=='keep' and r['cAfter']==r['source']['definition'] and r['cStudentSentence']==r['source']['studentC'] and r['cProposedAnswers']==r['source']['answers']
 preserved.append({'id':id,'sentence':r['cStudentSentence'],'answers':r['cProposedAnswers'],'sourceFingerprint':r['sourceFingerprint']})
summary={'sourceCommit':a['sourceCommit'],'sourceCommitFull':'13bf05dcec8c1781ab86321ecf9c3db65e5f96d7','sourceSha256':a['sourceSha256'],'completedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'planningOnly':True,'releaseReady':False,'totalSourceAndProposedRows':2621,'grades':dict(collections.Counter(r['grade'] for r in a['rows'])),'parts':a['counts']['parts'],'bDecisions':a['counts']['bDecisions'],'cDecisions':a['counts']['cDecisions'],'coreAfterCount':core['proposed'],'examplesFlagged':a['counts']['exampleNeeded'],'currentFingerprintReadingCount':len(evidence_matches),'capturedPayloadEvidenceMatches':len(evidence_matches),'readerCounts':dict(collections.Counter(r['reader'] for r in evidence_matches)),'unfinishedDraftIds':a['pendingIds'],'unfinishedEditorialIds':a['finalEditorialPendingIds'],'sourceOrderAndRawRowEquality':True,'allSourceFingerprintsVerified':True,'allProposalFingerprintsVerified':True,'allCurrentReadingInputsExistAndMatch':True,'compatibilityAliasRowsEqual':True,'ownerApprovedCExactlyPreserved':preserved,'validation':{'sourceOrderProvenanceAndKatexFailures':len(v['structuralFailures']),'katexExpressionsChecked':v['mathExpressions'],'contractDraftIssues':len(v['contractDraftIssues']),'currentIntegrationFailures':len(integ['failures']),'currentEditorialFailures':len(integ['editorialFailures']),'notationFaults':len(integ['notation']),'blankClashes':len(integ['clashes']),'learningDefinitionsChecked':core['checked'],'invalidLearningDefinitions':core['invalidCount']},'remainingCoordinatorWork':['Root/Claude independent review on current fingerprints and plan agreement','Decide any later illustration-supported form; current required-image exclusions stay excluded','Integrate proposals separately from general learning definitions; worksheet/student rendering checks','Deployment and production verification'],'currentArtifactSha256':{n:sha(p/n) for n in ['audit.json','partial-audit.json','codex-final-editorial.json','coverage.json','coverage-ledger.tsv','codex-overrides.json','validation.json','core-definition-validation.json','evidence/current-validation-ctx-7fc6b4391c84.json']}}
summary['archivedSourceSha256']=sha(p/'evidence/source.json')
summary['archivedSourceRelation']='Exact source bytes plus one trailing LF; parsed JSON is identical. sourceSha256 names the original export bytes.'
dump('final-review-summary.json',summary)
dump('evidence/final-provenance-check-ctx-7fc6b4391c84.json',{'note':'Structural trace check only, not a newly assigned human reading or independent approval. Every verdict predates this check and names an actual captured payload.','rows':evidence_matches})
examples=[]
for r in a['rows']:
 if r.get('exampleNeeded'):
  examples.append({k:r.get(k) for k in ['sourceIndex','id','grade','bDecision','cDecision','exampleReason','bReason','cReason','requiredDiagramPaths','proposalFingerprint']})
dump('example-followups.json',{'planningOnly':True,'count':len(examples),'note':'Flags include already embedded numerical examples, optional learning illustrations, and excluded forms requiring diagrams. They are not permission to enable excluded B/C questions or evidence that an image was delivered. Existing diagram-dependent exclusions must stay excluded in the text/math-only contract.','rows':examples})
select=['e5-2-1-6-c3','e5-1-2-2-c1','e6-2-1-1-xc14','e6-2-1-1-xc15','e6-2-4-2-xc12','e6-2-6-4-xc23']
lines=['# 최종 학생 지면 대표 문항 — 초5·초6','', '기준은 `audit.json`의 최종 조립 문항이다. 각 예는 원래 제목·정의·C와 새 B·C를 구분하며, 최종 독해 기록 및 두 fingerprint는 전체 대장에 연결된다. 독립 승인이나 적용 완료를 뜻하지 않는다.','']
for id in select:
 r=next(r for r in a['rows'] if r['id']==id);b=r['bQuestion'];c=r['clozeQuestion'];s=r['source']
 lines += [f'## {r["grade"]} · `{id}`', '', f'원래 B 제목: {s["term"]}', '',f'원래 일반 정의: {s["definition"]}', '',f'원래 C 지면: {s["studentC"]}', '', '원래 C 답: '+', '.join(s['answers']), '',f'학습 목표: {r["bGoal"]}', '',f'**최종 B:** {b["prompt"]}', '',f'**B 답:** {b["answer"]}', '', '**필수 의미:** '+ ' / '.join(' 또는 '.join(x['anyOf']) for x in b['requiredIdeas']), '',f'**최종 C:** {r["cStudentSentence"]}', '', '**C 인정 답:** '+' / '.join(' 또는 '.join(x) for x in c['acceptedAnswers']), '',f'원천 지문: `{r["sourceFingerprint"]}`', '',f'최종 제안 지문: `{r["proposalFingerprint"]}`', '',f'최종 독해 입력: `{r["codexFinalEditorial"]["inputEvidence"]}`', '']
lines += ['## 소유자가 유지하도록 지정한 짧은 비교', '']
for row in preserved: lines += [f'- `{row["id"]}`: {row["sentence"]} 답: {", ".join(row["answers"])}','']
(p/'final-representative-problems.md').write_text('\n'.join(lines).rstrip()+'\n',encoding='utf-8')
toolnames=['e5e6-assemble-ctx-a236a872.py','e5e6_markup_ctx_a236a872.py','e5e6-resume-ctx-7fc6b4391c84.py','e5e6-current-validation-ctx-7fc6b4391c84.ts','e5e6-validate-ctx-a236a872.mjs','e5e6-core-validate-ctx-a236a872.ts','e5e6-handoff-ctx-7fc6b4391c84.py']
(p/'evidence/validation-tools').mkdir(exist_ok=True)
for name in toolnames:shutil.copyfile(t/name,p/'evidence/validation-tools'/name)
print(json.dumps(summary,ensure_ascii=False,indent=2))
