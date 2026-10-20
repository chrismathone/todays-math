from pathlib import Path
import sys,json,hashlib,importlib.util,ast,subprocess,copy,collections
sys.dont_write_bytecode=True
P=Path('.qa-artifacts/exam-resume-20261008/source-scope-code-audit-20261020-r2');R1=P.with_name('source-scope-code-audit-20261020-r1');ROOT=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));h=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();s=rd(P/'provided-scope.json');v=rd(s['parentValidation']);paths=[P/'provided-scope.json',Path(s['parentValidation']),Path(s['actual505Plan']),Path(s['additionalInventoryMetadataRead']['path'])];sourceRows=[]
def local(path):
 text=path.replace('\\','/');assert '/.qa-artifacts/' in text;tail=text.split('/.qa-artifacts/',1)[1];assert '..'not in Path(tail).parts;return Path('.qa-artifacts')/tail
for x in s['files']:
 row={'path':x['path'],'expected':x['sha256']}
 for k,p in [('root',ROOT/x['path']),('snapshot',P/x['snapshot']),('runtime',P/x['runtime'])]:row[k]=h(p);assert row[k]==x['sha256'];paths.append(p)
 sourceRows.append(row)
assert h(s['additionalInventoryMetadataRead']['path'])==s['additionalInventoryMetadataRead']['sha256'];assert h(s['actual505Plan'])==v['activePlan']['sha256'];overlays=[]
for ref in v['closedReceiptPolicyOverlays']:
 p=local(ref['path']);assert h(p)==ref['sha256'];o=rd(p);receipt=local(o['originalReceipt']['path']);assert h(receipt)==o['originalReceipt']['sha256'];paths.extend([p,receipt]);overlays.append((p,o,receipt,rd(receipt)))
assert len(overlays)==113
for name in ['own-audit-report.json','own-controls-results-r2.json','own-controls-r2.py']:
 p=R1/name;assert p.read_bytes()==subprocess.check_output(['git','show','c4896c7b39a3c842106b64f6b744f4af524af9df:'+p.as_posix()]);paths.append(p)
oldscope=rd(R1/'provided-scope.json');oldReader=Path(oldscope['priorNarrowReaderSnapshot']);paths.append(oldReader)
before=[{'path':str(p),'sha256':h(p)}for p in paths];(P/'own-before.json').write_text(json.dumps({'sources':sourceRows,'bindings':before},indent=2)+'\n',encoding='utf-8')
probe='U58 R2 독립 strict helper 및 append-only 정책 검사\n';(P/'own-utf8-probe.txt').write_text(probe,encoding='utf-8');assert(P/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe
spec=importlib.util.spec_from_file_location('own_actual_future_scope',P/'provided-code-runtime-local/source_inventory_scope_v2.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
protected={'동도중','강동중','경산여중','정화중'};levels={'middle':'중','high':'고'}
# Reuse our sealed independent oracle body, not parent tests or helper implementation.
ownAst=ast.parse((R1/'own-controls-r2.py').read_text(encoding='utf-8-sig'));node=next(n for n in ownAst.body if isinstance(n,ast.FunctionDef)and n.name=='oracle');env={'protected':protected,'levels':levels};exec(compile(ast.Module(body=[node],type_ignores=[]),'sealed-own-oracle-only','exec'),env);oldOracle=env['oracle']
def oracle(j,seen,level='middle',grade=3):
 if not oldOracle(j,seen,level,grade):return False
 return type(j)is dict and all(j[k].strip()for k in ['examId','school'])and all(j['selectedPair'][k].strip()for k in ['pdf','hwp'])
counts=collections.Counter();failures=[]
def check(cat,label,expected,fn,detail=None):
 counts[cat]+=1
 try:actual=fn();ok=actual==expected
 except Exception as e:actual={'exception':type(e).__name__,'message':str(e)};ok=expected=='reject'
 if not ok:failures.append({'category':cat,'label':label,'expected':expected,'actual':actual,'detail':detail})
base=dict(examId='own-new-source',school='독립새학교',level='중',grade=3,year=2025,status='readyForExtraction',selectedPair={'pdf':'own.pdf','hwp':'own.hwp'},existingExamIds=[],existingQuestionCount=0)
priorFaults=rd(R1/'own-controls-results-r2.json')['failures'];assert len(priorFaults)==20
for x in priorFaults:check('prior20-counterexamples',x['label'],False,lambda x=x:m.eligible_source_job(x['fixture'],set()))
for level,label in levels.items():
 for grade in [1,2,3]:
  policy=m.selection_policy(level,grade);check('per-grade-policy',f'{level}/{grade}',True,lambda policy=policy,level=level,grade=grade:f'{level} grade{grade} selected HWP/PDF pair' in policy and 'middle3'not in policy and 'pending' in policy and 'quarantined'in policy)
  for year in [0,2024,2025,2026,2027,2100]:
   j={**base,'level':label,'grade':grade,'year':year}
   for target in levels:
    for targetGrade in [1,2,3]:check('scope-matrix',f'{level}/{grade}/{year}->{target}/{targetGrade}',oracle(j,set(),target,targetGrade),lambda j=j,target=target,targetGrade=targetGrade:m.eligible_source_job(j,set(),level=target,grade=targetGrade))
inv=rd(s['additionalInventoryMetadataRead']['path']);jobs=inv['jobs'];byId={j['examId']:j for j in jobs};assert len(jobs)==len(byId)==1715
oldNode=next(n for n in ast.parse(oldReader.read_text(encoding='utf-8')).body if isinstance(n,ast.FunctionDef)and n.name=='eligible');oldEnv={'PROTECTED':protected};exec(compile(ast.Module(body=[oldNode],type_ignores=[]),'authorized-prior-narrow-predicate-only','exec'),oldEnv);routing=collections.Counter()
for j in jobs:
 check('historical-default-parity',j['examId'],oldEnv['eligible'](j,{'personal-9967cfbb759aa6d369883bac4c986aaa'}),lambda j=j:m.eligible_source_job(j,{'personal-9967cfbb759aa6d369883bac4c986aaa'}))
 for level in levels:
  for grade in (1,2,3):
   actual=m.eligible_source_job(j,set(),level=level,grade=grade);check('1715-six-scope-oracle',f'{j["examId"]}/{level}/{grade}',oracle(j,set(),level,grade),lambda actual=actual:actual)
   if actual:routing[f'{level}/{grade}']+=1
# Stronger data boundaries beyond the sealed20 failures.
fields={'examId':['',' ','\t',None,True,3,[]], 'school':['',' ','\n',None,True,3,[],*protected], 'selectedPair':[None,True,1,'false',['pair'],{}, {'pdf':'x'},{'hwp':'x'},{'pdf':None,'hwp':None},{'pdf':'','hwp':'x'},{'pdf':'x','hwp':' '},{'pdf':1,'hwp':'x'},{'pdf':'x','hwp':[]},{'pdf':'x','hwp':'y','extra':True}], 'existingExamIds':[None,False,0,'',{},(),['existing']], 'existingQuestionCount':[None,False,0.0,'',{},[],'0',-1,1], 'year':[True,False,2025.0,'2025',None,2024], 'grade':[True,False,3.0,'3',None,0,4], 'status':[None,True,'holdMetadata','ready'], 'level':[None,'초','middle','high',False]}
for key,values in fields.items():
 for n,value in enumerate(values):
  j={**base,key:value};check('new-field-boundaries',f'{key}/{n}',oracle(j,set()),lambda j=j:m.eligible_source_job(j,set()))
for key in base:
 j=dict(base);del j[key];check('missing-fields',key,False,lambda j=j:m.eligible_source_job(j,set()))
for level in ['elementary','middle3','',None,[],True]:
 for fn in [m.selection_policy,lambda l,g:m.eligible_source_job(base,set(),level=l,grade=g)]:check('invalid-scope',str(level),'reject',lambda fn=fn,level=level:fn(level,3))
for grade in [True,False,0,4,-1,'3',3.0,None]:
 for fn in [m.selection_policy,lambda l,g:m.eligible_source_job(base,set(),level=l,grade=g)]:check('invalid-scope',str(grade),'reject',lambda fn=fn,grade=grade:fn('middle',grade))
for seen in [{base['examId']},frozenset({base['examId']})]:check('seen-exclusion',str(type(seen)),False,lambda seen=seen:m.eligible_source_job(base,seen))
class Derived(dict):
 def get(self,*a):raise RuntimeError('caller dict subclass invoked')
check('subclass-boundary','job',False,lambda:m.eligible_source_job(Derived(base),set()));check('subclass-boundary','pair',False,lambda:m.eligible_source_job({**base,'selectedPair':Derived(base['selectedPair'])},set()))
for n in range(12):
 j=copy.deepcopy(base);old=copy.deepcopy(j);check('determinism-no-mutation',str(n),True,lambda:m.eligible_source_job(j,set())is True and m.eligible_source_job(j,set())is True and j==old)
plan=rd(s['actual505Plan']);flat=[(batch,row)for batch in plan['batches']for row in batch['jobs']];ids=[row['examId']for _,row in flat];check('plan-structure','505-unique',True,lambda:len(ids)==len(set(ids))==plan['plannedPapers']==505);scopeCounts=collections.Counter();outNames=[b['output']for b in plan['batches']];check('plan-structure','unique-batch-outputs',True,lambda:len(outNames)==len(set(outNames)))
for batch,row in flat:
 j=byId[row['examId']];level,grade=batch['level'],batch['grade'];check('505-plan-current-helper',row['examId'],True,lambda j=j,level=level,grade=grade:m.eligible_source_job(j,set(),level=level,grade=grade));check('505-plan-own-oracle',row['examId'],True,lambda j=j,level=level,grade=grade:oracle(j,set(),level,grade));check('505-plan-row-binding',row['examId'],True,lambda row=row,j=j:all(row[k]==j[k]for k in row));scopeCounts[level+str(grade)]+=1
check('plan-structure','scopeCounts',plan['scopeCounts'],lambda:dict(scopeCounts))
overlaySummary=[];entryCount=0;statusCounts=collections.Counter()
for p,o,rp,d in overlays:
 scopes={(e['extractionScopeAsProvided']['level'],e['grade'])for e in d['entries']};scope=o['actualMetadataScope'];level,grade=scope['level'],scope['grade'];check('overlay-unique-scope',p.name,{(level,grade)},lambda scopes=scopes:scopes);check('overlay-policy',p.name,m.selection_policy(level,grade),lambda o=o:o['correctedSelectionPolicy']);check('overlay-original-policy',p.name,d['selectionPolicy'],lambda o=o:o['originalSelectionPolicy']);check('overlay-entry-unique-ids',p.name,True,lambda d=d:len({e['examId']for e in d['entries']})==len(d['entries']))
 for key,expected in [('rawReceiptBytesPreserved',True),('studentGradeRightsSourceIdentityApproved',False),('activeReaderCodeChanged',False),('dbWrites',0),('loadable',0)]:check('overlay-closure',p.name+'/'+key,expected,lambda o=o,key=key:o[key])
 for e in d['entries']:
  entryCount+=1;statusCounts[e['status']]+=1;provided=e['extractionScopeAsProvided'];j=byId[e['examId']];check('receipt-entry-scope',e['examId'],True,lambda e=e,provided=provided,level=level,grade=grade,j=j:e['level']==levels[level] and e['grade']==grade and provided['grade']==grade and provided['level']==level and provided['examYear']==e['year']==j['year'] and j['level']==e['level'] and j['grade']==grade)
  for key in ['componentsApproved','twins','gradeApprovals','rightsApprovals']:check('receipt-entry-closure',e['examId']+'/'+key,0,lambda e=e,key=key:e[key])
  for key in ['identityApproved','wholePairCertified']:check('receipt-entry-closure',e['examId']+'/'+key,False,lambda e=e,key=key:e[key])
  check('receipt-entry-closure',e['examId']+'/studentCurriculumApproval',False,lambda provided=provided:provided['studentCurriculumApproval'])
 for key in ['componentsApproved','twins','dbWrites','wholePairCertifications','gradeApprovals','rightsApprovals']:check('receipt-aggregate-closure',p.name+'/'+key,0,lambda d=d,key=key:d[key])
 check('receipt-aggregate-closure',p.name+'/distribution',False,lambda d=d:d['authorDistributionAllowed'])
 overlaySummary.append({'overlay':p.as_posix(),'sha256':h(p),'originalReceipt':rp.as_posix(),'originalSHA256':h(rp),'scope':scope,'entries':len(d['entries'])})
# Deliberate observations, not an invented normalization requirement for a metadata-only helper.
normalizationObservations=[]
for school in sorted(protected):normalizationObservations.append({'kind':'space-padded-protected-school','value':school+' ','eligible':m.eligible_source_job({**base,'school':school+' '},set())})
normalizationObservations.append({'kind':'space-padded-seen-id','eligible':m.eligible_source_job({**base,'examId':base['examId']+' '},{base['examId']})})
result={'total':sum(counts.values()),'passed':sum(counts.values())-len(failures),'counts':dict(counts),'failures':failures,'prior20Resolved':all(not m.eligible_source_job(x['fixture'],set())for x in priorFaults),'inventoryJobs':1715,'routingCounts':dict(routing),'plannedJobs':505,'planScopeCounts':dict(scopeCounts),'overlayCount':len(overlays),'receiptEntries':entryCount,'receiptStatuses':dict(statusCounts),'overlayBindings':overlaySummary,'normalizationObservations':normalizationObservations,'parentTestsRun':0,'overlayBuilderExecuted':False,'originalSourceReads':0,'activeReaderImportedOrChanged':False}
(P/'own-controls-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({k:result[k]for k in ['total','passed','failures','prior20Resolved','plannedJobs','overlayCount','receiptEntries','receiptStatuses']},ensure_ascii=False))
