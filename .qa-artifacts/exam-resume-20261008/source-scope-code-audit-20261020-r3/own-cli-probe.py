from pathlib import Path
import sys,json,importlib.util,contextlib,io,os,hashlib
sys.dont_write_bytecode=True
sys.stdout.reconfigure(encoding='utf-8')
P=Path(__file__).resolve().parent;S=json.loads((P/'provided-scope.json').read_text());runtime=P/'provided-code-runtime-local';path=runtime/'extract-fresh-sources-20261019.py'
spec=importlib.util.spec_from_file_location('own_actual_cli',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
mode=sys.argv[1];a='personal-324e5308ec33be22e950f921204b6a5a';b='personal-11c64124bf2ff6eef6749d12cb777e8f';c='personal-8eec901cfcf0f5f6e58dec34775bc19f'
common=['--out','own-u58-negative-never-created'];fixture=None
if mode.startswith('fault-'):
 index=int(mode.split('-')[1]);old=P.with_name('source-scope-code-audit-20261020-r1');fault=json.loads((old/'own-controls-results-r2.json').read_text(encoding='utf-8'))['failures'][index];bad=fault['fixture'];good={'examId':'own-second-id','school':'own-school','level':'?','grade':3,'year':2025,'status':'readyForExtraction','selectedPair':{'pdf':'own.pdf','hwp':'own.hwp'},'existingExamIds':[],'existingQuestionCount':0};fixture=P/f'own-negative-inventory-{index:02}.json';fixture.write_text(json.dumps({'jobs':[bad,good]},ensure_ascii=False)+'\n',encoding='utf-8');m.INVENTORY=fixture;args=['--job-ids',bad['examId'],good['examId'],*common]
else:
 args={'mixed-grade':['--job-ids',a,b,*common,'--level','middle','--grade','1'],'mixed-level':['--job-ids',a,c,*common,'--level','middle','--grade','1'],'default-m3-reject-m1':['--job-ids',a,'personal-57992c45fa81adc2866b0dd6fc4972b1',*common],'grade-zero':['--job-ids',a,b,*common,'--grade','0'],'level-invalid':['--job-ids',a,b,*common,'--level','elementary'],'duplicates':['--job-ids',a,a,*common],'one-id':['--job-ids',a,*common],'seven-ids':['--job-ids',*[f'own-{i}'for i in range(7)],*common],'traversal':['--job-ids',a,b,'--out','../own-u58-outside'],'absolute-output':['--job-ids',a,b,'--out',str(P/'own-never-created-output')],'help':['--help']}[mode]
# Only valid reads during actual main are the exact authorized inventory metadata.
# Production validation unmodified. OS audit fence prohibits source reads and ALL writes.
allowed=Path(m.INVENTORY).resolve();inputHashBefore=hashlib.sha256(allowed.read_bytes()).hexdigest();events=[]
def hook(event,values):
 if event=='open':
  p,modeValue,flags=values
  if isinstance(p,(str,bytes,os.PathLike)):
   q=Path(p).resolve();events.append({'event':event,'path':str(q),'mode':str(modeValue),'flags':flags})
   if flags&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND):raise RuntimeError('Own audit fence denied filesystem write')
   if q!=allowed and not q.is_relative_to(Path(sys.base_prefix)/'Lib'):raise RuntimeError('Own audit fence denied unsupplied read')
 elif event in ['os.mkdir','os.remove','os.rename','os.rmdir']:
  events.append({'event':event,'args':list(map(str,values))});raise RuntimeError('Own audit fence denied filesystem mutation')
sys.addaudithook(hook);sys.argv=[str(path),*args];out=io.StringIO();err=io.StringIO();exception=None
try:
 with contextlib.redirect_stdout(out),contextlib.redirect_stderr(err):m.main()
 code=0
except SystemExit as e:code=e.code
except Exception as e:code=-1;exception=type(e).__name__+':'+str(e)
inputHashAfter=hashlib.sha256(allowed.read_bytes()).hexdigest()
print(json.dumps({'inputSHA256Before':inputHashBefore,'inputSHA256After':inputHashAfter,'mode':mode,'args':args,'exit':code,'stdout':out.getvalue(),'stderr':err.getvalue(),'exception':exception,'events':events,'inventoryFixtureOnly':str(fixture)if fixture else None,'runtimeBASE':str(m.BASE),'wouldBeOutputExists':(m.BASE/'own-u58-negative-never-created').exists()},ensure_ascii=False))
