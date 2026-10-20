from pathlib import Path
import sys,json,importlib.util,contextlib,io,os
sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent;S=json.loads((P/'provided-scope.json').read_text());runtime=P/'provided-code-runtime-local';path=runtime/'extract-fresh-sources-20261019.py'
spec=importlib.util.spec_from_file_location('own_actual_cli',path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
mode=sys.argv[1];pilot=S['pilotAggregateReceiptBindings'];a=pilot[0]['jobs'][0]['examId'];b=pilot[1]['jobs'][0]['examId'];c=pilot[2]['jobs'][0]['examId']
common=['--out','own-u58-negative-never-created']
args={'mixed-grade':['--job-ids',a,b,*common,'--level','middle','--grade','1'],'mixed-level':['--job-ids',a,c,*common,'--level','middle','--grade','1'],'default-m3-reject-m1':['--job-ids',a,pilot[0]['jobs'][1]['examId'],*common],'grade-zero':['--job-ids',a,b,*common,'--grade','0'],'level-invalid':['--job-ids',a,b,*common,'--level','elementary'],'duplicates':['--job-ids',a,a,*common],'one-id':['--job-ids',a,*common],'seven-ids':['--job-ids',*[f'own-{i}'for i in range(7)],*common],'traversal':['--job-ids',a,b,'--out','../own-u58-outside'],'absolute-output':['--job-ids',a,b,'--out',str(P/'own-never-created-output')],'help':['--help']}[mode]
# Only valid reads during actual main are the exact authorized inventory metadata.
# Production validation unmodified. OS audit fence prohibits source reads and ALL writes.
allowed=Path(S['additionalMetadataOnlyAuthorizedRead']['path']).resolve();events=[]
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
print(json.dumps({'mode':mode,'args':args,'exit':code,'stdout':out.getvalue(),'stderr':err.getvalue(),'exception':exception,'events':events,'runtimeBASE':str(m.BASE),'wouldBeOutputExists':(m.BASE/'own-u58-negative-never-created').exists()},ensure_ascii=False))
