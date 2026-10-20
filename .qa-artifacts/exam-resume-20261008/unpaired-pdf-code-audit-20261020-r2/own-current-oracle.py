from pathlib import Path,PureWindowsPath
import sys,json,hashlib,importlib.util,ntpath,copy,collections,ast
sys.dont_write_bytecode=True
P=Path('.qa-artifacts/exam-resume-20261008/unpaired-pdf-code-audit-20261020-r2').resolve();R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));s=rd(P/'provided-scope.json');sys.path.insert(0,str(R/'scripts/import/exam-twin'));import unpaired_pdf_scope as m
protected={'동도중','강동중','경산여중','정화중'};levels={'middle':'중','high':'고'}
def oracle(j,seen,level,grade):
 if type(j)is not dict:return False
 for key in ['examId','school']:
  if type(j.get(key))is not str or not j[key]or j[key]!=j[key].strip():return False
 return 'selectedPair'in j and j['selectedPair']is None and j['examId']not in seen and j['school']not in protected and type(j.get('existingExamIds'))is list and not j['existingExamIds']and type(j.get('existingQuestionCount'))is int and j['existingQuestionCount']==0 and j.get('level')==levels[level]and type(j.get('grade'))is int and j['grade']==grade and type(j.get('year'))is int and j['year']>=2025 and type(j.get('semester'))is int and j['semester']in[1,2]and j.get('round')in['중간','기말']and j.get('status')=='readyForExtraction'and type(j.get('files'))is list and bool(j['files'])
def labelOracle(name):
 if any(w in name for w in ['\uB2F5\uC548','\uD574\uB2F5','\uC815\uB2F5','\uD574\uC124']):return True
 def ascii_alnum(c):return c.isascii()and c.isalnum()
 def ko_alnum(c):return ascii_alnum(c)or '\uAC00'<=c<='\uD7A3'
 def scan(words,ischar):
  for i in range(len(name)):
   if i and ischar(name[i-1]):continue
   for word in words:
    if name[i:i+len(word)].casefold()!=word.casefold():continue
    j=i+len(word)
    # Permit a numeric label suffix with at most one separator.
    if j<len(name)and name[j]in '-_ ':j+=1
    while j<len(name)and name[j].isascii()and name[j].isdigit():j+=1
    if j==len(name)or not ischar(name[j]):return True
  return False
 return scan(['\uB2F5'+x for x in ['', '\uD3EC\uD568','\uC9C0','\uB9CC','\uC218\uB85D','\uC788\uC74C']],ko_alnum)or scan(['answer','answers','solution','solutions'],ascii_alnum)
def fileOracle(j):
 out=[];seen=set()
 for e in j['files']:
  if type(e)is not dict:continue
  raw=e.get('path')
  if type(raw)is not str or not raw or raw!=raw.strip():continue
  if e.get('ext')!='pdf'or e.get('role')!='원본'or e.get('conflict')is not False:continue
  if e.get('school')!=j['school']or e.get('exam')!=j['round']:continue
  if any(type(e.get(k))is not int or e[k]!=j[k]for k in['year','grade','semester']):continue
  slash=raw.replace('\\','/');drive,tail=ntpath.splitdrive(raw);parts=[p for p in tail.replace('\\','/').split('/')if p and p!='.']
  if drive.lower()!='n:'or not tail.startswith(('/','\\'))or parts[:2]!=['개인','기출']or '..'in parts or any(':'in p for p in parts)or not raw.lower().endswith('.pdf'):continue
  if labelOracle(PureWindowsPath(raw).stem):continue
  identity=ntpath.normpath(raw).casefold()
  if identity not in seen:out.append(e);seen.add(identity)
 return out
file={'path':'N:/개인/기출/2025/원본.pdf','ext':'pdf','role':'원본','conflict':False,'school':'새학교','year':2025,'grade':3,'semester':1,'exam':'기말'};base={'examId':'own-new-id','school':'새학교','selectedPair':None,'existingExamIds':[],'existingQuestionCount':0,'level':'중','grade':3,'year':2025,'semester':1,'round':'기말','status':'readyForExtraction','files':[file]};counts=collections.Counter();failed=[]
def check(cat,id,expected,fn,detail=None):
 counts[cat]+=1
 try:actual=fn();ok=actual==expected
 except Exception as e:actual={'exception':type(e).__name__,'message':str(e)};ok=expected=='reject'
 if not ok:failed.append({'category':cat,'id':id,'expected':str(expected),'actual':str(actual),'detail':detail})
inv=rd(s['historicalInventoryMetadataOnly']);jobs=inv['jobs'];assert len(jobs)==1715;routing=[]
for level in levels:
 for grade in [1,2,3]:
  eligible=refs=0
  for j in jobs:
   expected=oracle(j,set(),level,grade);actual=m.eligible_unpaired_job(j,set(),level=level,grade=grade);check('historical-six-scope',j['examId']+'/'+level+str(grade),expected,lambda actual=actual:actual)
   if actual:eligible+=1;refs+=bool(m.original_pdf_candidates(j))
  routing.append({'level':level,'grade':grade,'eligible':eligible,'withPdfRefs':refs})
for j in jobs:check('historical-file-metadata',j['examId'],fileOracle(j),lambda j=j:m.original_pdf_candidates(j))
for key,values in {'selectedPair':[False,{},[],0,'',{'pdf':'x','hwp':'y'}],'existingExamIds':[None,False,0,'',{},(),['known']],'existingQuestionCount':[None,False,0.0,'0',[],{},-1,1],'year':[True,2025.0,'2025',None,2024],'grade':[True,3.0,'3',None,0,4],'semester':[True,1.0,'1',None,0,3],'round':['',None,'final','중간'],'examId':['',' ',' own-new-id','own-new-id '],'school':['',' ',None,*sorted(protected),*[x+' 'for x in sorted(protected)]],'files':[None,{},[],False],'status':['holdMetadata','',None]}.items():
 for i,value in enumerate(values):
  j={**base,key:value};check('malformed-job',key+str(i),oracle(j,set(),'middle',3),lambda j=j:m.eligible_unpaired_job(j,set(),level='middle',grade=3))
for key in base:
 j=dict(base);del j[key];check('missing-job',key,False,lambda j=j:m.eligible_unpaired_job(j,set(),level='middle',grade=3))
for level in levels:
 for grade in[1,2,3]:
  for year in[2024,2025,2026,2027,2100]:
   j={**base,'level':levels[level],'grade':grade,'year':year};check('synthetic-six-scopes',f'{level}/{grade}/{year}',year>=2025,lambda j=j,level=level,grade=grade:m.eligible_unpaired_job(j,set(),level=level,grade=grade))
for level,grade in [('primary',3),('middle',True),('middle',4),('middle','3'),('high',None)]:check('invalid-scope',str((level,grade)),'reject',lambda:m.eligible_unpaired_job(base,set(),level=level,grade=grade))
check('seen','own-prior-id',False,lambda:m.eligible_unpaired_job(base,{base['examId']},level='middle',grade=3))
for key,values in {'conflict':[None,0,True],'ext':['PDF','hwp',None],'role':['완료본',None],'school':['other',None],'year':[2024,True,'2025'],'grade':[2,'3',True],'semester':[2,'1',True],'exam':['중간',None],'path':['C:/개인/기출/a.pdf','N:/다른곳/a.pdf','N:/개인/기출/../a.pdf','N:/개인/기출/x:stream.pdf','N:/개인/기출/a.pdf:stream.pdf','N:개인/기출/a.pdf','//server/share/a.pdf','\\\\?\\N:\\개인\\기출\\a.pdf','../a.pdf','N:/개인/기출/a.hwp','N:/개인/기출/a.pdf ','N:/개인/기출/정답.pdf','N:/개인/기출/답안.pdf','N:/개인/기출/해설.pdf','N:/개인/기출/해답.pdf']}.items():
 for i,value in enumerate(values):check('file-negative',key+str(i),[],lambda key=key,value=value:m.original_pdf_candidates({**base,'files':[{**file,key:value}]}))
for p in ['n:/개인/기출/2025/원본.pdf','N:\\개인\\기출\\2025\\.\\원본.pdf']:
 check('dedup','case-slash-dot',1,lambda p=p:len(m.original_pdf_candidates({**base,'files':[file,{**file,'path':p}]})))
old=copy.deepcopy(base);m.eligible_unpaired_job(base,set(),level='middle',grade=3);m.original_pdf_candidates(base);check('no-mutation','plain-record',old,lambda:base)
# Independent safety demands beyond baseline predicate parity. Keep all counterexamples.
unsafe=[]
for jobId in ['../own-output-escape','..\\own-output-escape','C:/own-output-escape','own:stream']:
 j={**base,'examId':jobId};check('unsafe-output-id',jobId,False,lambda j=j:m.eligible_unpaired_job(j,set(),level='middle',grade=3),{'basis':'ID is later joined as output subdirectory and PNG save is outside nested write() fence; no actual N extraction performed.'});output=P/'own-quarantine';target=(output/jobId/'1'/'original-first-page.local.png').resolve();unsafe.append({'jobId':jobId,'acceptedByActualEligibility':m.eligible_unpaired_job(j,set(),level='middle',grade=3),'computedPngPath':str(target),'insideQuarantine':target.is_relative_to(output.resolve()),'actualFilesystemWrite':False})
for label in ['(답)','답','정답','해설']:
 path='N:/개인/기출/2025/'+label+'.pdf';check('explicit-answer-marker',label,[],lambda path=path:m.original_pdf_candidates({**base,'files':[{**file,'path':path}]}),{'basis':'CLI claims answer-unlabelled refs. Standalone 답/(답) explicitly labels an answer file in this corpus; quarantine remains no approval even if routed.'})
(P/'own-current-oracle-results.json').write_text(json.dumps({'total':sum(counts.values()),'passed':sum(counts.values())-len(failed),'counts':dict(counts),'failed':failed,'routing':routing,'unsafeOutputPathCalculations':unsafe,'parentTestsRun':0,'originalSourceReads':0},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'total':sum(counts.values()),'passed':sum(counts.values())-len(failed),'failCount':len(failed),'routing':routing},ensure_ascii=False))
