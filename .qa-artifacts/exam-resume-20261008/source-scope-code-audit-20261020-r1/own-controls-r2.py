from pathlib import Path
import sys,json,hashlib,ast,importlib.util,subprocess,copy,collections
sys.dont_write_bytecode=True
P=Path('.qa-artifacts/exam-resume-20261008/source-scope-code-audit-20261020-r1').resolve(); rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();S=rd(P/'provided-scope.json');V=rd(S['parentValidation']); roots={x['path'].replace('\\','/').split('/scripts/',1)[1]:Path(x['path']) for x in V['code']}
paths=[P/'provided-scope.json',Path(S['parentValidation']),Path(S['priorNarrowReaderSnapshot']),Path(S['additionalMetadataOnlyAuthorizedRead']['path'])]+[Path(x['receipt']['path']) for x in S['pilotAggregateReceiptBindings']]
for x in S['files']:
 for p in [roots[x['path'].split('scripts/',1)[1]],P/x['snapshot'],P/x['runtime']]:assert h(p)==x['sha256'];paths.append(p)
assert h(S['additionalMetadataOnlyAuthorizedRead']['path'])==S['additionalMetadataOnlyAuthorizedRead']['sha256']
for x in S['pilotAggregateReceiptBindings']:assert h(x['receipt']['path'])==x['receipt']['sha256']
before=[{'path':str(p),'sha256':h(p)}for p in paths];(P/'own-recheck-before.json').write_text(json.dumps(before,indent=2)+'\n',encoding='utf-8')
probe='U58 독립 범위 검사: 원본 읽기·출력 생성 없음\n';(P/'own-utf8-probe.txt').write_text(probe,encoding='utf-8');assert(P/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe
runtime=P/'provided-code-runtime-local';spec=importlib.util.spec_from_file_location('own_scope_actual',runtime/'source_inventory_scope.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
# Independent specification: only valid typed inventory metadata, never paths opened.
protected={'동도중','강동중','경산여중','정화중'};levels={'middle':'중','high':'고'}
def oracle(j,seen,level='middle',grade=3):
 if not isinstance(j,dict):return False
 pair=j.get('selectedPair');ids=j.get('existingExamIds');count=j.get('existingQuestionCount')
 if not(type(j.get('examId'))is str and j['examId'] and type(j.get('school'))is str and j['school']):return False
 if j['examId']in seen or j['school']in protected:return False
 if j.get('level')!=levels[level] or type(j.get('grade'))is not int or j['grade']!=grade:return False
 if type(j.get('year'))is not int or j['year']<2025 or j.get('status')!='readyForExtraction':return False
 return type(pair)is dict and {'pdf','hwp'}.issubset(pair) and all(type(pair[k])is str and bool(pair[k])for k in ['pdf','hwp']) and type(ids)is list and len(ids)==0 and type(count)is int and count==0
counts=collections.Counter();failures=[]
def check(category,label,expected,call,fixture=None):
 counts[category]+=1
 try:actual=call();ok=actual==expected
 except Exception as e:actual={'exception':type(e).__name__,'message':str(e)};ok=expected=='reject'
 if not ok:failures.append({'category':category,'label':label,'expected':expected,'actual':actual,'fixture':fixture})
base=dict(examId='own-unseen-id',school='독립새학교',level='중',grade=3,year=2025,status='readyForExtraction',selectedPair={'pdf':'own-fixture.pdf','hwp':'own-fixture.hwp'},existingExamIds=[],existingQuestionCount=0)
assert mod.PROTECTED_SCHOOLS==protected and mod.LEVELS==levels
for level,label in levels.items():
 for grade in (1,2,3):
  for year in (2024,2025,2026,2027,2100):
   j=dict(base,level=label,grade=grade,year=year)
   for requested in levels:
    for requestedGrade in (1,2,3):check('scope-matrix',f'{level}/{grade}/{year}->{requested}/{requestedGrade}',oracle(j,set(),requested,requestedGrade),lambda j=j:mod.eligible_source_job(j,set(),level=requested,grade=requestedGrade))
mutations={'school':['',None,False,0,[],{},*sorted(protected)],'examId':['',None,False,0,[],{}],'year':[True,False,2025.0,'2025',None,0,-1,2024],'grade':[True,False,3.0,'3',None,0,4,-1],'level':['초','middle','high','',None,3,[],{}],'status':['holdMetadata','ready','',None,True], 'selectedPair':[False,None,0,'',[],{},True,1,'false',['pair'],{'pdf':'x'},{'hwp':'x'},{'pdf':None,'hwp':None},{'pdf':'x','hwp':'y','extra':True}], 'existingExamIds':[['existing-id'],'existing-id',1,True,{},None,False,0,''], 'existingQuestionCount':[1,2,-1,'1',True,None,False,0.0,'',[],{}]}
for key,values in mutations.items():
 for n,value in enumerate(values):
  j={**base,key:value};check('field-corruption',f'{key}/{n}',oracle(j,set()),lambda j=j:mod.eligible_source_job(j,set()),j)
for key in base:
 j=dict(base);del j[key];check('missing-field',key,oracle(j,set()),lambda j=j:mod.eligible_source_job(j,set()),j)
for seen in [{base['examId']},{'other'}]:check('seen-id',str(seen),oracle(base,seen),lambda:mod.eligible_source_job(base,seen))
for j in [None,[],{},'',3,False]:check('object-shape',str(j),False,lambda j=j:mod.eligible_source_job(j,set()))
for level in ['elementary','middle3',None,[],True]:check('invalid-request-level',repr(level),'reject',lambda level=level:mod.eligible_source_job(base,set(),level=level))
for grade in [True,False,0,4,-1,'3',3.0,None]:check('invalid-request-grade',repr(grade),'reject',lambda grade=grade:mod.eligible_source_job(base,set(),grade=grade))
inv=rd(S['additionalMetadataOnlyAuthorizedRead']['path']);jobs=inv['jobs'];assert len(jobs)==1715
priorText=Path(S['priorNarrowReaderSnapshot']).read_text(encoding='utf-8');oldNode=next(n for n in ast.parse(priorText).body if isinstance(n,ast.FunctionDef)and n.name=='eligible');env={'PROTECTED':protected};exec(compile(ast.Module(body=[oldNode],type_ignores=[]),'authorized-prior-eligible-only','exec'),env)
# No prior main/import execution; only supplied narrow pure predicate.
parity={};routing=collections.Counter()
for mode,seen in [('bumil-only',{'personal-9967cfbb759aa6d369883bac4c986aaa'}),('bounded-extra-seen',{'personal-9967cfbb759aa6d369883bac4c986aaa',*[j['examId']for j in jobs[::11]]})]:
 mismatch=0
 for j in jobs:
  expected=env['eligible'](j,seen);actual=mod.eligible_source_job(j,seen);check('historical-default-parity',mode+'/'+j['examId'],expected,lambda actual=actual:actual);mismatch+=actual!=expected
 parity[mode]={'jobs':len(jobs),'mismatches':mismatch}
for j in jobs:
 for level in levels:
  for grade in (1,2,3):
   expected=oracle(j,set(),level,grade);actual=mod.eligible_source_job(j,set(),level=level,grade=grade);check('inventory-six-scope-oracle',j['examId']+f'/{level}/{grade}',expected,lambda actual=actual:actual)
   if actual:routing[f'{level}/{grade}']+=1
for n in range(12):
 j=copy.deepcopy(base);beforeJ=copy.deepcopy(j);out=mod.eligible_source_job(j,set());check('determinism-no-mutation',str(n),True,lambda:out is True and j==beforeJ and mod.eligible_source_job(j,set())is True)
pilots=[]
for x in S['pilotAggregateReceiptBindings']:
 d=rd(x['receipt']['path']);entries=d['entries'];assert len(entries)==2
 for e in entries:
  for k in ['componentsApproved','twins','gradeApprovals','rightsApprovals']:check('parent-pilot-closure',e['examId']+'/'+k,0,lambda e=e,k=k:e[k])
  for k in ['identityApproved','wholePairCertified']:check('parent-pilot-closure',e['examId']+'/'+k,False,lambda e=e,k=k:e[k])
  check('parent-pilot-closure',e['examId']+'/curriculum',False,lambda e=e:e['extractionScopeAsProvided']['studentCurriculumApproval'])
  check('parent-pilot-metadata',e['examId'],True,lambda e=e,x=x:e['status']=='parsed-quarantined' and e['level']==levels[x['level']]and e['grade']==x['grade']and e['year']>=2025)
 for k in ['componentsApproved','twins','dbWrites','wholePairCertifications','gradeApprovals','rightsApprovals']:check('parent-pilot-closure',x['output']+'/'+k,0,lambda d=d,k=k:d[k])
 check('parent-pilot-closure',x['output']+'/distribution',False,lambda d=d:d['authorDistributionAllowed'])
 check('parent-pilot-preservation-metadata',x['output'],True,lambda d=d:d['preserved']is True and all(a['beforeSha256']==a['afterSha256']for a in d['preservation']))
 pilots.append({'receiptSHA256':h(x['receipt']['path']),'papers':len(entries),'parentReportedNewObservations':d['actualNewParents'],'scope':[x['level'],x['grade']],'policyText':d['selectionPolicy'],'independentOriginalVerification':False})
# AST assertions confirm mixed eligibility loop before output mkdir and parser dependencies later.
current=(runtime/'extract-fresh-sources-20261019.py').read_text(encoding='utf-8');tree=ast.parse(current);main=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='main');guard=next(n for n in main.body if isinstance(n,ast.For)and ast.unparse(n.target)=='job_id');mkdir=next(n for n in main.body if isinstance(n,ast.Expr)and ast.unparse(n.value)=='output.mkdir()');check('static-order','eligibility-before-mkdir',True,lambda:guard.lineno<mkdir.lineno)
result={'counts':dict(counts),'total':sum(counts.values()),'passed':sum(counts.values())-len(failures),'failures':failures,'defaultParity':parity,'sixScopeEligibleCounts':dict(routing),'pilotBindings':pilots,'parentTestsRun':0,'ownSourceExtractions':0,'noInputMutation':True}
(P/'own-controls-results-r2.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'total':result['total'],'passed':result['passed'],'failures':len(failures),'failureLabels':[x['label']for x in failures],'parity':parity,'routing':dict(routing)},ensure_ascii=False))
