from pathlib import Path
import sys,json,importlib.util,io,contextlib,os,hashlib
sys.dont_write_bytecode=True;sys.stdout.reconfigure(encoding='utf-8');P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');S=json.loads((P/'provided-scope.json').read_text(encoding='utf-8-sig'));sys.path.insert(0,str(R/'scripts/import/exam-twin'));spec=importlib.util.spec_from_file_location('own_actual_preflight',R/'scripts/import/exam-twin/preflight-unpaired-pdfs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);case=sys.argv[1];own=P/'own-cli-fixtures';own.mkdir(exist_ok=True);fixture=False
f={'path':'N:/개인/기출/2025/원본.pdf','ext':'pdf','role':'원본','conflict':False,'school':'새학교','year':2025,'grade':3,'semester':1,'exam':'기말'};job={'examId':'own-new-id','school':'새학교','selectedPair':None,'existingExamIds':[],'existingQuestionCount':0,'level':'중','grade':3,'year':2025,'semester':1,'round':'기말','status':'readyForExtraction','files':[f]};args=['--job-ids',job['examId'],'--level','middle','--grade','3','--out','unpaired-pdf-preflight-own-negative'];prior=False
if case in ['help','grade0','invalid-level','bad-output-prefix','traversal-output','absolute-output','four-ids','duplicate-ids','actual-paired','actual-protected','actual-prior']:
 if case.startswith('actual-'):
  inventory=json.loads(Path(S['historicalInventoryMetadataOnly']).read_text(encoding='utf-8-sig'))['jobs']
  if case=='actual-paired':args[1]=next(j['examId']for j in inventory if j.get('selectedPair')and j.get('level')=='\uC911'and j.get('grade')==3)
  if case=='actual-protected':args[1]=next(j['examId']for j in inventory if j.get('school')in m.eligible_unpaired_job.__globals__['PROTECTED_SCHOOLS'])
  if case=='actual-prior':args[1]=json.loads((R/next(x['path'] for x in S['allowedMetadataOnly'] if x['path'].endswith('/aggregate-receipt.json'))).read_text(encoding='utf-8-sig'))['entries'][0]['examId']
 if case=='help':args=['--help']
 if case=='grade0':args[args.index('--grade')+1]='0'
 if case=='invalid-level':args[args.index('--level')+1]='primary'
 if case=='bad-output-prefix':args[-1]='own-bad'
 if case=='traversal-output':args[-1]='../unpaired-pdf-preflight-escape'
 if case=='absolute-output':args[-1]=str(P/'own-forbidden-output')
 if case=='four-ids':args=['--job-ids','a','b','c','d',*args[2:]]
 if case=='duplicate-ids':args=['--job-ids','a','a',*args[2:]]
else:
 fixture=True;m.BASE=own/('own-base-'+case);m.BASE.mkdir(exist_ok=True)
 mods={'selectedPair':('selectedPair',{}),'existing-count':('existingQuestionCount',1),'unknown-count':('existingQuestionCount',None),'bool-count':('existingQuestionCount',False),'unknown-ids':('existingExamIds',None),'protected':('school','동도중'),'padded-protected':('school','동도중 '),'wrong-grade':('grade',2),'wrong-level':('level','고'),'old-year':('year',2024),'bool-year':('year',True),'bad-semester':('semester',True),'unready':('status','holdMetadata'),'files-empty':('files',[]),'unsafe-parent':('examId','../own-escape'),'unsafe-backslash':('examId','..\\own-escape'),'unsafe-absolute':('examId','C:/own-escape')}
 if case in mods:k,v=mods[case];job[k]=v
 extra=json.loads((P/'own-extra-cli-cases.json').read_text(encoding='utf-8-sig'))
 if case in extra:
  k,v=extra[case]
  if k=='examId':job[k]=v
  else:job['files']=[{**f,'path':str(Path(f['path']).parent/(v+'.pdf'))}]
 if case=='missing-count':del job['existingQuestionCount']
 if case=='answer-only':job['files']=[{**f,'path':'N:/개인/기출/2025/(답).pdf'}]
 if case=='answer-short':job['files']=[{**f,'path':'N:/개인/기출/2025/답.pdf'}]
 if case=='no-consistent-file':job['files']=[{**f,'grade':1}]
 if case=='prior':
  prior=True;q=m.BASE/'unpaired-pdf-preflight-prior';q.mkdir(exist_ok=True);(q/'aggregate-receipt.json').write_text(json.dumps({'entries':[{'examId':job['examId']}]}),encoding='utf-8')
 m.INVENTORY=own/('own-inventory-'+case+'.json');m.INVENTORY.write_text(json.dumps({'jobs':[job]},ensure_ascii=False),encoding='utf-8');args[1]=job['examId']
allowed={Path(m.INVENTORY).resolve(),*[ (R/x['path']).resolve()for x in S['allowedMetadataOnly']]}
if prior:allowed.add((m.BASE/'unpaired-pdf-preflight-prior/aggregate-receipt.json').resolve())
inputHashes={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in allowed if p.exists()};events=[]
def hook(event,values):
 if event=='open':
  raw,mode,flags=values
  if isinstance(raw,(str,bytes,os.PathLike)):
   p=Path(raw).resolve();row={'event':event,'path':str(p),'mode':str(mode),'flags':flags};events.append(row)
   if flags&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND):row['denied']='write';raise RuntimeError('OWN_FENCE_WRITE')
   if p not in allowed and not p.is_relative_to(Path(sys.base_prefix)/'Lib'):row['denied']='unsupplied-read';raise RuntimeError('OWN_FENCE_UNSUPPLIED_READ')
 elif event in ['os.mkdir','os.remove','os.rename','os.rmdir']:events.append({'event':event,'denied':'filesystem-mutation'});raise RuntimeError('OWN_FENCE_MUTATION')
sys.addaudithook(hook);sys.argv=['actual-preflight',*args];stdout=io.StringIO();stderr=io.StringIO();error=None
try:
 with contextlib.redirect_stdout(stdout),contextlib.redirect_stderr(stderr):m.main()
 exit=0
except SystemExit as e:exit=e.code
except Exception as e:exit=-1;error=type(e).__name__+':'+str(e)
after={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in allowed if str(p)in inputHashes};print(json.dumps({'case':case,'fixtureInventoryAndBase':fixture,'exit':exit,'error':error,'stdout':stdout.getvalue(),'stderr':stderr.getvalue(),'events':events,'inputHashesBefore':inputHashes,'inputHashesAfter':after,'outputExists':(m.BASE/args[-1]).exists()if case!='help'else False},ensure_ascii=False))
