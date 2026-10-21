"""Current Root regression cohorts; no external checkout code execution or mutation."""
from pathlib import Path
import ast,datetime,hashlib,json,os,re,subprocess,sys
out=Path(__file__).resolve().parent
h=out.parent/'hangul-engine-import-20261021-r1'
original=ast.parse((h/'run_python_checks.py').read_text(encoding='utf-8'))
code=next(ast.literal_eval(n.value) for n in original.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='code' for t in n.targets))
env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'}
cohorts=[('vendor-tools',[sys.executable,'-B','scripts/figure/test_vendor_tools.py']),
 ('solid-verification',[sys.executable,'-B','scripts/figure/test_solid_verification.py']),
 ('grid',[sys.executable,'-B','scripts/figure/test_grid.py']),
 ('retained-source-96',[sys.executable,'-B','-c',code,str(h/'source-tests'),
   'test_wangseon_q1_renders_italic_x_run_instead_of_literal_markup']),
 ('retained-background',[sys.executable,'-B','-c',"import runpy,sys;sys.path.insert(0,'vendor/figure-engine');runpy.run_path(sys.argv[1],run_name='__main__')",str(h/'source-tests/test_figure_gate_warnings.py')])]
paths=[r['path'] for r in json.loads((out/'baseline.json').read_text(encoding='utf-8'))['targets'] if Path(r['path']).is_file()]
paths+=['vendor/figure-engine/core/figure_svg.py','vendor/figure-engine/core/figure_solid.py']
before={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}
rows=[]
revision=sys.argv[1]
for label,cmd in cohorts:
 r=subprocess.run(cmd,capture_output=True,env=env,timeout=180)
 log=out/f'{label}-{revision}.log';log.write_bytes(r.stdout+r.stderr)
 counts=re.findall(rb'Ran (\d+) tests?',r.stderr)
 row=dict(name=label,exitcode=r.returncode,unittestCount=int(counts[-1]) if counts else None,log=log.name)
 rows.append(row);print(json.dumps(row),flush=True)
same=before=={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in paths}
report=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),runs=rows,sourceSHA256=before,
 sourcesUnchanged=same,oldCorpusCaseExplicitlyOmitted=True,retainedSourceTestsNotNewExportCopy=True,
 sourceDWrites=0,dbWrites=0,newMathOrGradeApprovals=0)
(out/f'python-regressions-{revision}.json').write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
assert same
raise SystemExit(any(r['exitcode'] for r in rows))
