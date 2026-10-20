from pathlib import Path
import sys,json,hashlib,importlib.util,ast,collections,re,ntpath
sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent;O=P.with_name('unpaired-pdf-code-audit-20261020-r1');R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));s=rd(P/'provided-scope.json');sys.path.insert(0,str(R/'scripts/import/exam-twin'));import unpaired_pdf_scope as m
spec=importlib.util.spec_from_file_location('own_preflight',R/'scripts/import/exam-twin/preflight-unpaired-pdfs.py');pf=importlib.util.module_from_spec(spec);spec.loader.exec_module(pf);rows=[]
def ck(id,expected,actual):rows.append({'id':id,'passed':expected==actual,**({}if expected==actual else {'expected':str(expected),'actual':str(actual)})})
f={'path':'N:/\uac1c\uc778/\uae30\ucd9c/2025/\uc6d0\ubcf8.pdf','ext':'pdf','role':'\uc6d0\ubcf8','conflict':False,'school':'\uc0c8\ud559\uad50','year':2025,'grade':3,'semester':1,'exam':'\uae30\ub9d0'};base={'examId':'own-new-id','school':'\uc0c8\ud559\uad50','selectedPair':None,'existingExamIds':[],'existingQuestionCount':0,'level':'\uc911','grade':3,'year':2025,'semester':1,'round':'\uae30\ub9d0','status':'readyForExtraction','files':[f]}
invalid=['',' ','..','.', '../x','..\\x','C:/x','C:\\x','C:x','/x','\\x','//server/share','\\\\?\\C:\\x','x:y','x::$DATA','x/y','x\\y','x.','x ',' x','a.b','x\x00y','x\ny','x\ty','x|y','x<y','x>y','x?y','x*y','\uac00','a'*129]+[x for n in ['CON','PRN','AUX','NUL']+[f'COM{i}'for i in range(1,10)]+[f'LPT{i}'for i in range(1,10)]for x in [n,n.lower(),n.swapcase(),n+'.txt',n+' ']]
valid=['a','Z','0','a-b_c','a'*128,'COM0','LPT0','CONSOLE','NULx','x-CON','personal-0123456789abcdef']
for i,x in enumerate(invalid+valid):
 expected=i>=len(invalid);ck('safe-component/'+str(i),expected,m.safe_output_id(x));ck('component-eligibility/'+str(i),expected,m.eligible_unpaired_job({**base,'examId':x},set(),level='middle',grade=3))
for i,x in enumerate([None,True,0,1,[],{},b'a']):ck('component-type/'+str(i),False,m.safe_output_id(x))
labels=['\ub2f5','(\ub2f5)','\ub2f5\uc9c0','\ub2f5\ub9cc','\ub2f5\ud3ec\ud568','\ub2f5\uc218\ub85d','\ub2f5\uc788\uc74c','\ub2f5-2','\ub2f5_3','\ub2f51','\uc815\ub2f5','\ub2f5\uc548','\ud574\ub2f5','\ud574\uc124','answer','answers','ANSWER','solution','solutions','answer-key','answer_key','solution key','answer2','(Answer)','[solutions]']
benign=['\ub2f5\ub3d9\uc911','\ub300\ub2f5\uc911','\uc751\ub2f5\ud559\uad50','\ub2f5\uc0ac','answering','unanswered','solutionschool','solutionism','xanswer','answerx','answer2025school','math-original','original-paper','\uc6d0\ubcf8']
for i,(name,expected)in enumerate([(x,True)for x in labels]+[(x,False)for x in benign]):
 ck('answer-label/'+str(i),expected,m.explicitly_answer_labelled(name));ck('answer-file/'+str(i),0 if expected else 1,len(m.original_pdf_candidates({**base,'files':[{**f,'path':str(Path(f['path']).parent/(name+'.pdf'))}]})))
# Execute real containment helper and nested writer with OWN files only.
q=P/'own-fence-fixtures';q.mkdir(exist_ok=True);out=q/'own-quarantine';out.mkdir(exist_ok=True)
for i,parts in enumerate([('job','1'),('job','1','original-first-page.local.png'),('job','1','parser-question-output.local.json'),(str(out/'own-a.json'),),('job','..','own-safe.json')]):
 target=pf.quarantine_target(out,*parts);ck('fence-positive/'+str(i),True,target!=out.resolve()and target.is_relative_to(out.resolve()))
for i,parts in enumerate([(),('..',),('../own-outside',),('..\\own-outside',),(str(q/'own-outside'),),('C:/own-outside',),('job','..','..','own-outside'),('job','..')]):
 try:pf.quarantine_target(out,*parts);rejected=False
 except ValueError:rejected=True
 ck('fence-negative/'+str(i),True,rejected)
source=(R/'scripts/import/exam-twin/preflight-unpaired-pdfs.py').read_text(encoding='utf-8-sig');tree=ast.parse(source);main=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='main');assign={ast.unparse(n.targets[0]):n for n in ast.walk(main)if isinstance(n,ast.Assign)and len(n.targets)==1};write=next(n for n in ast.walk(main)if isinstance(n,ast.FunctionDef)and n.name=='write');ns={'Path':Path,'json':json,'output':out,'quarantine_target':pf.quarantine_target};exec(compile(ast.Module(body=[write],type_ignores=[]),'actual-nested-write','exec'),ns)
a=out/'own-keep.json';ns['write'](a,{'own':1});before=a.read_bytes()
for id,path in [('overwrite',a),('escape',out/'../own-outside.json')]:
 try:ns['write'](path,{'own':2});rejected=False
 except (ValueError,FileExistsError):rejected=True
 ck('actual-json-writer-'+id,True,rejected)
ck('prior-own-file-preserved',before,a.read_bytes())
ck('actual-dir-unified-fence',True,ast.unparse(assign['folder'].value).startswith('quarantine_target(output,'));ck('actual-png-unified-fence',True,ast.unparse(assign['first'].value).startswith('quarantine_target(output,'));ck('actual-json-unified-fence',True,any(isinstance(n,ast.Assign)and ast.unparse(n.value)=='quarantine_target(output, path)'for n in ast.walk(write)))
ck('actual-png-save-fenced-first',True,any(isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and n.func.attr=='save'and ast.unparse(n.args[0])=='first'for n in ast.walk(main)))
guard=next(n for n in main.body if isinstance(n,ast.For)and ast.unparse(n.target)=='job_id');ck('guard-before-import-output',True,guard.lineno<assign['spec'].lineno<next(n.lineno for n in main.body if isinstance(n,ast.Expr)and ast.unparse(n.value)=='output.mkdir()'))
# Exact historical old vs new membership delta: enumerate only METADATA; do not open references.
inv=rd(Path(s['historicalInventoryMetadataOnly']));jobs=inv['jobs'];oldns={};oldcode=(O/'own-controls.py').read_text(encoding='utf-8-sig');start=oldcode.index('def fileOracle');end=oldcode.index("\nfile=",start);exec(oldcode[start:end],{'ntpath':ntpath},oldns);oldOracle=oldns['fileOracle'];changes=[]
for j in jobs:
 old=oldOracle(j);new=m.original_pdf_candidates(j)
 if old==new:continue
 removed=[x for x in old if x not in new];added=[x for x in new if x not in old];eligible=any(m.eligible_unpaired_job(j,set(),level=l,grade=g)for l in ['middle','high']for g in [1,2,3]);details=[]
 for x in removed:
  name=Path(x['path'].replace('\\','/')).stem;details.append({'name':name,'pathSHA256':hashlib.sha256(x['path'].encode()).hexdigest(),'metadataConsistent':True,'explicitAnswerLabel':m.explicitly_answer_labelled(name)})
 ck('membership-delta/'+j['examId'],True,not added and bool(removed)and all(d['explicitAnswerLabel']for d in details));changes.append({'examId':j['examId'],'eligible':eligible,'level':j['level'],'grade':j['grade'],'oldReferences':len(old),'newReferences':len(new),'removed':details})
# Parent executed pilot/replay metadata only. No spool or original reads.
parent=rd(R/s['allowedMetadataOnly'][0]['path']);agg=rd(R/s['allowedMetadataOnly'][1]['path']);refs={(e['examId'],r['index']):r for e in agg['entries']for r in e['references']}
ck('pilot-two-jobs',2,len(agg['entries']));ck('pilot-three-pdfs',3,len(refs));ck('pilot-partial-parser-one',1,sum(x['status']=='parser-output-quarantined-unverified'for x in refs.values()));ck('pilot-scan-hold-two',2,sum(x['status']=='visual-reference-held-parser-unavailable'for x in refs.values()))
byid={j['examId']:j for j in jobs}
for e in agg['entries']:
 ck('selected-pair-none-'+e['examId'],None,byid[e['examId']]['selectedPair']);ck('entry-none-preserved-marker-'+e['examId'],True,e['selectedPairRemainsNone'])
 for k in ['sourceIdentityApproved','curriculumApproved','rightsApproved','contentPairApproved','authorDistributionAllowed']:ck(e['examId']+'/'+k,False,e[k])
 ck(e['examId']+'/question-credit',0,e['actualNewQuestionObservations'])
for k in ['actualNewQuestionObservations','gradeApprovals','rightsApprovals','twins','dbWrites','loadable']:ck('aggregate/'+k,0,agg[k])
ck('metadata-preservation-records',True,agg['preserved']and all(x['beforeSha256']==x['afterSha256']for x in agg['preservation']))
for c in parent['comparisons']:
 r=refs[(c['examId'],c['reference'])];key=c['examId']+'/'+str(c['reference']);ck(key+'/replay-input',r['input']['sha256'],c['inputSha256']);ck(key+'/replay-status',r['status'],c['status'])
 for k in ['pageMetadataEqual','firstPageBytesEqual','quarantinedParserBytesEqual']:ck(key+'/'+k,True,c[k])
 if r['status']=='parser-output-quarantined-unverified':ck('parser-five-partial',True,r['parserQuestionCountUnverified']==5 and r['questionBoundaryApproved']is False)
 else:ck(key+'/scan-no-text',True,all(p['nativeTextCharacters']==0 for p in r['pages']))
for k,v in [('actualReplayedJobs',2),('actualReplayedReferences',3),('allInputPageParserBytesUnchanged',True),('replayQuestionObservationCredit',0),('priorRawReportsNeverRewritten',True),('sourceIdentityGradeRightsApproved',False),('dbWrites',0),('loadable',0)]:ck('parent-replay/'+k,v,parent[k])
# Previously observed page/alias details are rebound to sealed OWN R1 evidence, not reread from no-longer-authorized parent receipts.
prior=rd(O/'own-metadata-fence-results.json');mapnow={r['id']:r for r in rows};rebound=[]
for r in prior['results']:rebound.append({'id':r['id'],'current':mapnow.get(r['id']),'mode':'reexecuted'if r['id']in mapnow else 'prior-sealed-observation-only','priorPassed':r['passed']})
(P/'own-legacy64-rebind.json').write_text(json.dumps({'rows':rebound,'freshlyReexecuted':sum(x['mode']=='reexecuted'for x in rebound),'notFreshlyReexecuted':sum(x['mode']!='reexecuted'for x in rebound),'reason':'R2 authorizes3metadata receipts, not old page observation/alias receipts. Their prior independent metadata checks remain sealed; do not pretend new original/page validation.'},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(P/'own-extra-results.json').write_text(json.dumps({'total':len(rows),'passed':sum(x['passed']for x in rows),'failed':[x for x in rows if not x['passed']],'results':rows,'membershipChanges':changes,'prior64BindingSHA256':hashlib.sha256((P/'own-legacy64-rebind.json').read_bytes()).hexdigest(),'sourceReads':0,'positiveActualParses':0},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'total':len(rows),'passed':sum(x['passed']for x in rows),'failed':[x for x in rows if not x['passed']],'changedJobs':len(changes),'removedReferences':sum(len(x['removed'])for x in changes),'eligibleChanges':[x for x in changes if x['eligible']]},ensure_ascii=False))
