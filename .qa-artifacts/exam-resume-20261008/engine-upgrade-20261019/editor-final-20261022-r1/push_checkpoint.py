"""Fast-forward feature backup while preserving explicitly identified unrelated WIP."""
from pathlib import Path
import datetime,hashlib,json,subprocess
out=Path(__file__).resolve().parent
branch='chrismathone/exam-extraction-resume-20261008'
def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
def ancestor(a,b):subprocess.run(['git','merge-base','--is-ancestor',a,b],check=True)
v=json.loads((out/'final-validation-r1.json').read_text(encoding='utf-8'))
assert git('branch','--show-current')==branch
assert not git('diff','--cached','--name-only')
expected={' M '+r['path']for r in v['preservingDirtyPaths']}
status=subprocess.check_output(['git','status','--porcelain','-z']).decode().split('\0')
assert {s for s in status if s}==expected,status
for r in v['preservingDirtyPaths']:assert hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()==r['sha256']
subprocess.run(['git','fetch','origin','main',branch],check=True)
head,main,target=[git('rev-parse',ref)for ref in ['HEAD','origin/main','origin/'+branch]]
ancestor(main,head);ancestor(target,head);ancestor(v['head'],head)
assert main==v['main'],'Integrate new main and repeat related verification before push'
assert v['currentMainRelatedPassed']==517 and v['currentMainRelatedFailed']==0
for r in v['code']:assert hashlib.sha256(Path(r['path']).read_bytes()).hexdigest()==r['sha256'],r['path']
subprocess.run(['git','push','origin','HEAD:refs/heads/'+branch],check=True)
remote=git('ls-remote','origin','refs/heads/'+branch).split()[0];assert remote==head
record={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'head':head,'fetchedMain':main,'fetchedTarget':target,'remoteHead':remote,'validationSHA256':hashlib.sha256((out/'final-validation-r1.json').read_bytes()).hexdigest(),'mainAndTargetAncestorsVerified':True,'fastForwardOnly':True,'forcePush':False,'preservedUncommittedPaths':v['preservingDirtyPaths'],'deployed':False,'mainMergedFromFeature':False,'dbWrites':0,'questionEdits':0}
with(out/'push-receipt-r1.json').open('x',encoding='utf-8',newline='\n')as f:json.dump(record,f,indent=2);f.write('\n')
print(json.dumps(record))
