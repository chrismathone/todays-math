from pathlib import Path
import sys,json,hashlib,copy,unittest.mock as mock
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');E=R/'vendor/figure-engine';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[E/'core'/n for n in ['figure_svg.py','figure_quality.py','figure_exam.py','figure_spec_repair.py']]+[R/'scripts/figure/test_vendor_tools.py',R/'docs/planning/figure-authoring-import-20261021.md',Path('D:/시험지 한글화/docs/export/todays-math/patches/01-figure-engine.patch')]
before={str(p):sha(p) for p in paths};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');snap=P/'own-local-snapshots';snap.mkdir(exist_ok=True)
for p in paths[:4]:(snap/p.name).write_bytes(p.read_bytes())
probe=P/'own-utf8-probe.txt';probe.write_text('도형 읽기·쓰기 확인 ∠ ⟂ ≠\n',encoding='utf-8');assert probe.read_text(encoding='utf-8')=='도형 읽기·쓰기 확인 ∠ ⟂ ≠\n'
sys.path.insert(0,str(E))
from core import figure_exam as fe,figure_svg as fs,figure_spec_repair as fr
from core.figure_quality import assess_svg,sanitize_svg
rows=[]
def test(name,fn):
 try:result=fn();rows.append(dict(name=name,passed=bool(result),result=result))
 except Exception as e:rows.append(dict(name=name,passed=False,error=type(e).__name__+': '+str(e)))
def rejects(fn):
 try:fn();return False
 except Exception:return True
scope=__file__
def reg(key):fs.verify_figure(key,lengths=[(5,(10,40),(110,40))])
def tri(**kw):
 s=dict(version=2,points=dict(A=[0,0],B=[160,0],C=[80,120]),segments=dict(AB=['A','B'],BC=['B','C'],CA=['C','A']),labels=dict(A='A',B='B',C='C'));s.update(kw);return s
svg=fe.raw_svg(120,70,fs.line((10,40),(110,40)))
test('imports-without-site-packages',lambda:not any(n in sys.modules for n in ['numpy','PIL','resvg_py','core.figure_generator','utils.config']))
for fill in ['none','transparent','white','#fff','#ffffff']:
 test('full-background-'+fill,lambda fill=fill:assess_svg(fe.raw_svg(120,70,f'<rect width="120" height="70" fill="{fill}"/>',fs.line((10,40),(110,40))),run_pixel_lint=False).accepted)
for fill in ['none','transparent']:
 test('partial-invisible-'+fill,lambda fill=fill:not assess_svg(fe.raw_svg(120,70,f'<rect x="10" y="10" width="20" height="20" fill="{fill}"/>',fs.line((10,40),(110,40))),run_pixel_lint=False).accepted)
for body in ['<script>x</script>','<image href="https://example.org/a"/>','<line x1="0" y1="0" x2="5" y2="5" onclick="x"/>']:
 test('unsafe-'+body.split()[0],lambda body=body:rejects(lambda:fe.raw_svg(120,70,body)))
test('missing-rasterizer-none',lambda:fs.svg_to_png_bytes(svg,100) is None)
test('missing-rasterizer-lint-not-clean',lambda:rejects(lambda:fs.lint_svg(svg)))
for key in ['../out','..\\out','C:out','.','..','NUL','CON.png','file.','file ','a/b','COM1','x\x00y']:
 test('unsafe-key-'+repr(key),lambda key=key:rejects(lambda:fe.build_figures({key:svg},str(P/'own-invalid-output'),scope=scope)))
test('unregistered-rejected',lambda:rejects(lambda:fe.build_figures({'missing':svg},str(P/'own-invalid-output'),scope=scope)))
fs.verify_figure('empty');test('empty-call-rejected',lambda:fs.unverified({'empty':svg},scope=scope,require_checks=True)==['empty'])
reg('good');test('wrong-scope-rejected',lambda:fs.unverified({'good':svg},scope='other',require_checks=True)==['good'])
def build_controls():
 out=P/'own-fixture-outputs';out.mkdir(exist_ok=True)
 with mock.patch.object(fe,'lint_svg',return_value=[]),mock.patch.object(fe,'svg_to_png_bytes',return_value=b'FAKE-RASTER'):
  report=fe.build_figures({'good':svg},str(out/'positive'),scope=scope)
  assert report['good']['svg_sha256']==hashlib.sha256(svg.encode()).hexdigest()
  assert Path(report['good']['png']).read_bytes()==b'FAKE-RASTER'
 return True
test('mocked-build-success-hash',build_controls)
reg('later')
def failure(kind):
 out=P/'own-fixture-outputs'/kind
 with mock.patch.object(fe,'lint_svg',side_effect=[[],['fault']] if kind=='lint' else [[],[]]),mock.patch.object(fe,'svg_to_png_bytes',side_effect=[b'FAKE',None]):
  assert rejects(lambda:fe.build_figures({'good':svg,'later':svg},str(out),scope=scope))
 return not out.exists()
test('lint-all-before-write',lambda:failure('lint'));test('raster-all-before-write',lambda:failure('raster'))
def copied_repair():
 s=tri(labels=dict(A=dict(text='A',pos='above'),B='B',C='C'));old=copy.deepcopy(s);_,_,notes=fr.compile_with_repair(s);return s==old and bool(notes)
test('repair-input-copy',copied_repair)
test('mixed-unknown-semantic-held',lambda:rejects(lambda:fr.compile_with_repair(tri(labels=dict(A=dict(text='A',pos='above',value='3'),B='B',C='C')))))
test('missing-dimension-not-deleted',lambda:rejects(lambda:fr.compile_with_repair(tri(dimensions=dict(d=dict(points=['A','D'],label='8'))))))
snap=tri(points=dict(A=[0,0],B=[200,0],C=[100,120],D=[100,.5]),segments=dict(AB=['A','B'],BC=['B','C'],CA=['C','A'],CD=['C','D']),angles=dict(right=dict(vertex='D',points=['B','C'],right=True)))
test('snap-default-held',lambda:rejects(lambda:fr.compile_with_repair(snap)))
test('snap-optin-recorded',lambda:any(x.startswith('snap:') for x in fr.compile_with_repair(snap,allow_geometry_snap=True)[2]))
scene,_,_=fr.compile_with_repair(tri());test('inventory-missing-label',lambda:bool(fr.semantic_inventory_issue(scene,'A B')));test('inventory-empty-is-no-evidence',lambda:fr.semantic_inventory_issue(scene,'') is None)
# Diagnostic observations, not assumptions of semantic approval.
observations={}
for val in [0,2,4]:
 try:
  sc,ss,notes=fr.compile_with_repair(tri(angles=dict(a=dict(vertex='A',points=['B','C'],ticks=val))))
  observations['angle_ticks_'+str(val)]={'notes':notes,'arcs':sc.angles['a'].arcs}
 except Exception as e:observations['angle_ticks_'+str(val)]={'error':str(e)}
# Two legal Windows keys refer to one physical filename; raster callback stub isolates writing.
reg('Alias');reg('alias')
with mock.patch.object(fe,'lint_svg',return_value=[]),mock.patch.object(fe,'svg_to_png_bytes',side_effect=[b'FIRST',b'SECOND']):
 rep=fe.build_figures({'Alias':svg,'alias':svg},str(P/'own-fixture-outputs/alias'),scope=scope)
 observations['case_alias']={'reports':len(rep),'files':len(list((P/'own-fixture-outputs/alias').glob('*.png'))),'firstPathBytes':Path(rep['Alias']['png']).read_bytes().decode()}
with mock.patch.object(fe,'lint_svg',return_value=[]),mock.patch.object(fe,'svg_to_png_bytes',return_value=b'FAKE'):
 observations['unknown_only_selection']=fe.build_figures({'good':svg},str(P/'own-fixture-outputs/unknown'),scope=scope,only=['typo'])
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__)) for n,m in list(sys.modules.items()) if n.startswith('core.') and getattr(m,'__file__',None)}
after={str(p):sha(p) for p in paths};assert before==after
result={'python':sys.version,'sitePackagesDisabled':sys.flags.no_site,'controls':rows,'uniqueControls':len(rows),'passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows),'observations':observations,'before':before,'after':after,'importedClosureHashes':closure,'raster':'Stubbed lint/raster for orchestration and path writes; missing-dependency actual behavior tested; no pixel/native claim'}
(P/'own-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:result[k] for k in ['uniqueControls','passed','failed','observations']},ensure_ascii=True))
