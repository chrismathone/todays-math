"""Actual current renderer, versioned defaults and analytic serialized halfplanes."""
from pathlib import Path
import ast,copy,datetime,hashlib,importlib.util,json,math,os,subprocess,sys,xml.etree.ElementTree as ET
ROOT=Path.cwd();OUT=Path(__file__).resolve().parent
assert not (OUT/'current-production-results.json').exists()
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
prior=ROOT/'.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1/own-check-v2.py'
ns=dict(math=math,re=__import__('re'),ET=ET,sha=lambda b:hashlib.sha256(b).hexdigest())
tree=ast.parse(prior.read_text(encoding='utf-8-sig'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in {'sub','cross','numeric_arc','arc_margin'}],type_ignores=[]),'preserved-independent-equations','exec'),ns)
ns['ns']=ns
tree=ast.parse((ROOT/'.qa-artifacts/exam-resume-20261008/m28-strict-precision-audit-20261021-r1/own-audit.py').read_text(encoding='utf-8-sig'))
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='analyze'],type_ignores=[]),'preserved-analyzer','exec'),ns)
sys.path.insert(0,str(ROOT/'scripts/figure'))
from render_spec import render_json
rows=json.loads((prior.parent/'own-actual-outputs.json').read_text(encoding='utf-8-sig'))['rows']
specs={hashlib.sha256(json.dumps(r['figureSpec'],sort_keys=True,separators=(',',':')).encode()).hexdigest():r['figureSpec'] for r in rows}
results=[]
for key,old in specs.items():
    spec=copy.deepcopy(old)
    for angle in spec['angles'].values():angle['serialized_inset']=True
    result=render_json(json.dumps(spec));assert 'svg' in result,result
    folder=OUT/'current-native';folder.mkdir(exist_ok=True);(folder/(key+'.svg')).write_bytes(result['svg'].encode('utf-8'))
    analyzed=ns['analyze'](result['svg']);results.append(dict(specSHA256=key,**analyzed))
export=OUT.parent/'assets41-sync-20261021-r1/source-export-4ccb0cb/engine-check'
loader=importlib.util.spec_from_file_location('delivered8',export/'check_engine.py');module=importlib.util.module_from_spec(loader);loader.loader.exec_module(module)
checks=[]
for name,spec in module.CASES.items():
    r=subprocess.run([sys.executable,'-B','scripts/figure/render_spec.py'],input=json.dumps(spec).encode('utf-8'),capture_output=True,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},timeout=30)
    (OUT/(name+'-default-current.json')).write_bytes(r.stdout)
    checks.append(dict(name=name,rawByteMatch=r.stdout==(export/'expected'/(name+'.json')).read_bytes()))
report=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),currentNative64=results,
    strictPassed=sum(r['strict'] for r in results),minSignedMargin=min(m for r in results for a in r['arcs'] for m in a['margins'].values()),
    default8=checks,codeSHA256={str(p).replace('\\','/'):sha(p) for p in list(Path('vendor/figure-engine/core').glob('*.py'))+list(Path('scripts/figure').glob('*.py'))},
    actualProductionNoMonkeypatch=True,independentNewQuestionCredits=0,DBWrites=0)
(OUT/'current-production-results.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
print(json.dumps(dict(current64=len(results),strictPassed=report['strictPassed'],minSignedMargin=report['minSignedMargin'],default8matches=sum(c['rawByteMatch'] for c in checks))))
assert len(results)==64 and report['strictPassed']==64 and all(c['rawByteMatch'] for c in checks)
