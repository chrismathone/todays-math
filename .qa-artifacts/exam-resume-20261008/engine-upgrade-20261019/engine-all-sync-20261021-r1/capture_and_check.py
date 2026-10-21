"""Read-only export capture and owner-specified checker. Never pass --save."""
from pathlib import Path
import datetime,hashlib,json,os,re,subprocess,sys
OUT=Path(__file__).resolve().parent
SOURCE=Path('D:/math-figure-editor/docs/export/todays-math')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
mode=sys.argv[1]
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
if mode=='capture':
 assert not (OUT/'baseline.json').exists()
 patch=SOURCE/'patches/06-engine-all.patch'
 files=re.findall(r'^diff --git a/(.+) b/\1$',patch.read_text(encoding='utf-8'),re.M)
 assert len(files)==52 and len(set(files))==52
 inputs=[SOURCE/'README.md',patch,SOURCE/'engine-check/check_engine.py',*sorted((SOURCE/'engine-check/expected').glob('*.json'))]
 assert len(inputs)==9
 source=[]
 for p in inputs:
  target=OUT/'source-export'/p.relative_to(SOURCE);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())
  source.append(dict(path=str(p.relative_to(SOURCE)),sha256=sha(p),bytes=p.stat().st_size))
 before=[]
 for rel in files:
  p=Path(rel);row=dict(path=rel,existed=p.is_file())
  if p.is_file():
   row['sha256']=sha(p);target=OUT/'before'/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(p.read_bytes())
  before.append(row)
 baseline=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),
  sourceHead=subprocess.check_output(['git','-C','D:/math-figure-editor','rev-parse','HEAD'],text=True).strip(),source=source,targets=before,
  sourceWrites=0,dbWrites=0,newAuthoredOrApprovedQuestions=0)
 (OUT/'baseline.json').write_bytes((json.dumps(baseline,indent=2)+'\n').encode('utf-8'))
 print(json.dumps(dict(capturedInputs=len(inputs),patchFiles=len(files),sourceWrites=0)))
elif mode.startswith('check-'):
 assert (SOURCE/'engine-check/expected').is_dir()
 before={str(p):sha(p) for p in [SOURCE/'engine-check/check_engine.py',*sorted((SOURCE/'engine-check/expected').glob('*.json'))]}
 # The export's only mkdir is exist_ok on this existing directory; no --save.
 r=subprocess.run([sys.executable,'-B',str(SOURCE/'engine-check/check_engine.py'),str(Path.cwd())],capture_output=True,env=env)
 (OUT/(mode+'.stdout')).write_bytes(r.stdout);(OUT/(mode+'.stderr')).write_bytes(r.stderr)
 same=before=={p:sha(p) for p in before}
 (OUT/(mode+'.json')).write_bytes((json.dumps(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),exitcode=r.returncode,
  originalCheckerInvoked=True,saveFlag=False,sourceCheckerAndExpectedUnchanged=same,dbWrites=0),indent=2)+'\n').encode('utf-8'))
 print(r.stdout.decode('utf-8'));print(r.stderr.decode('utf-8'));assert same
 sys.exit(r.returncode)
else:raise SystemExit('unsupported mode')
