"""Keep each delivered expectation version intact and compare actual raw stdout."""
from pathlib import Path
import datetime,hashlib,importlib.util,json,os,subprocess,sys
OUT=Path(__file__).resolve().parent;SOURCE=Path('D:/math-figure-editor');REV='4ccb0cb'
folder=OUT/('source-export-'+REV)
paths=['README.md','patches/07-engine-all.patch','patches/08-editor-all.patch','engine-check/check_engine.py']
paths+=['engine-check/expected/'+n+'.json' for n in ['grid','assets','assets-3d','assets-only','perspective','units','right-refused','solid-object-refused']]
bindings={}
for name in paths:
    data=subprocess.check_output(['git','-C',str(SOURCE),'show',REV+':docs/export/todays-math/'+name])
    target=folder/name;target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():assert target.read_bytes()==data
    else:target.write_bytes(data)
    bindings[name]=hashlib.sha256(data).hexdigest()
checker=folder/'engine-check/check_engine.py'
spec=importlib.util.spec_from_file_location('pinned_checker',checker);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
rows=[]
assert len(module.CASES)==8
for name,case in module.CASES.items():
    r=subprocess.run([sys.executable,'-B','scripts/figure/render_spec.py'],input=json.dumps(case).encode('utf-8'),capture_output=True,
        env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},timeout=30)
    (OUT/(name+'-actual.json')).write_bytes(r.stdout);(OUT/(name+'-stderr.txt')).write_bytes(r.stderr)
    want=(folder/'engine-check/expected'/(name+'.json')).read_bytes()
    rows.append(dict(name=name,exitcode=r.returncode,rawBytesMatch=r.stdout==want,actualSHA256=hashlib.sha256(r.stdout).hexdigest(),expectedSHA256=hashlib.sha256(want).hexdigest(),actualBytes=len(r.stdout)))
code=list(Path('scripts/figure').glob('*.py'))+list(Path('scripts/figure/assets').glob('*'))+list(Path('vendor/figure-engine/core').glob('*.py'))
receipt=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceRevision=REV,immutableCapturedExpectations=bindings,
    cases=rows,codeSHA256={str(p).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in code if p.is_file()},
    old06ExpectationsUnchanged=True,sourceWrites=0,dbWrites=0)
(OUT/'eight-raw-results.json').write_bytes((json.dumps(receipt,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(cases=len(rows),rawMatches=sum(r['rawBytesMatch'] for r in rows))))
assert all(row['rawBytesMatch'] for row in rows)
