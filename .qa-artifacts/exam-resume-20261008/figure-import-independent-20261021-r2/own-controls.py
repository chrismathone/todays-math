from pathlib import Path
import sys,json,hashlib,copy,subprocess,unittest.mock as mock
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');E=R/'vendor/figure-engine';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();old=P.parent/'figure-import-independent-20261021-r1'
paths=[E/'core'/n for n in ['figure_exam.py','figure_svg.py','figure_quality.py','figure_spec_repair.py','figure_solid.py','figure_scene.py']]+[R/'scripts/figure/test_vendor_tools.py',R/'docs/planning/figure-authoring-import-20261021.md',Path('D:/시험지 한글화/docs/export/todays-math/patches/01-figure-engine.patch')]+list(old.glob('own-*.*'))
before={str(p):sha(p) for p in paths};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');(P/'own-command-probe.txt').write_text('Python -B -S 독립 재검토 ∠ 유한·양수\n',encoding='utf-8');assert '유한' in (P/'own-command-probe.txt').read_text(encoding='utf-8')
sys.path.insert(0,str(E))
from core import figure_exam as fe,figure_svg as fs,figure_spec_repair as fr
from core.figure_quality import assess_svg
rows=[]
def test(name,fn):
 try:v=fn();rows.append(dict(name=name,passed=bool(v),observed=v))
 except Exception as e:rows.append(dict(name=name,passed=False,error=type(e).__name__+': '+str(e)))
def rejected(fn):
 try:fn();return False
 except (ValueError,RuntimeError,TypeError):return True
svg=fe.raw_svg(120,70,fs.line((10,40),(110,40)));scope=__file__
def good(k):fs.verify_figure(k,lengths=[(1,(0,0),(10,0))])
def guard(keys,only=()):
 out=P/'own-should-not-write';[good(k) for k in keys]
 with mock.patch.object(fe,'lint_svg') as lint,mock.patch.object(fe,'svg_to_png_bytes') as raster:
  ok=rejected(lambda:fe.build_figures({k:svg for k in keys},str(out),scope=scope,only=only))
  return ok and not out.exists() and lint.call_count==0 and raster.call_count==0
for name,keys,only in [('ascii-case',['Alias','alias'],()),('unicode-casefold',['Straße','STRASSE'],()),('unknown-only',['good'],['typo']),('mixed-known-unknown',['good'],['good','typo'])]:test('FI1-'+name,lambda keys=keys,only=only:guard(keys,only))
def tri(mark):return dict(version=2,points=dict(A=[0,0],B=[160,0],C=[80,120]),segments=dict(AB=['A','B'],BC=['B','C'],CA=['C','A']),angles=dict(a=dict(vertex='A',points=['B','C'],**mark)))
for val in [0,3,4,True,-1,'2']:
 test('FI2-reject-ticks-'+repr(val),lambda val=val:rejected(lambda:fr.compile_with_repair(tri(dict(ticks=val)))))
test('FI2-conflict',lambda:rejected(lambda:fr.compile_with_repair(tri(dict(ticks=2,arcs=1)))))
for val in [1,2]:
 def alias(v=val):
  s=tri(dict(ticks=v));saved=copy.deepcopy(s);scene,_,notes=fr.compile_with_repair(s);return s==saved and scene.angles['a'].arcs==v and bool(notes)
 test('FI2-valid-alias-'+str(val),alias)
test('FI2-matching-explicit-alias',lambda:fr.compile_with_repair(tri(dict(ticks=2,arcs=2)))[0].angles['a'].arcs==2)
N=float('nan');I=float('inf')
invalid=[('old-angle-nan',dict(angles=[(N,(0,0),(1,0),(0,1))])),('old-circle-nan',dict(on_circle=[((1,0),0,0,N)])),('old-negative-mixed',dict(lengths=[(-1,(0,0),(1,0)),(1,(0,0),(1,0))])),('length-zero',dict(lengths=[(0,(0,0),(1,0))])),('length-degenerate',dict(lengths=[(1,(0,0),(0,0))])),('length-nan-coordinate',dict(lengths=[(1,(N,0),(1,0))])),('arc-radius-zero',dict(arcs=[(1,0,0,0,0,90)])),('arc-nan-angle',dict(arcs=[(1,0,0,1,0,N)])),('arc-zero-span',dict(arcs=[(1,0,0,1,0,0)])),('angle-degenerate',dict(angles=[(90,(0,0),(0,0),(1,0))])),('tangent-negative-radius',dict(tangents=[((0,1),(1,1),0,0,-1)])),('tangent-degenerate',dict(tangents=[((0,1),(0,1),0,0,1)])),('on-line-inf-point',dict(on_line=[((I,0),(0,0),(1,0))])),('on-line-degenerate',dict(on_line=[((0,0),(0,0),(0,0))])),('circle-negative-radius',dict(on_circle=[((1,0),0,0,-1)])),('tol-nan',dict(tol=N)),('tol-deg-inf',dict(tol_deg=I)),('tol-px-negative',dict(tol_px=-1))]
for name,kw in invalid:
 def bad(name=name,kw=kw):
  good(name);assert fs.unverified({name:svg},scope=scope,require_checks=True)==[]
  return rejected(lambda:fs.verify_figure(name,**kw)) and fs.unverified({name:svg},scope=scope,require_checks=True)==[name]
 test('FI3-reject-and-invalidate-'+name,bad)
valid=[('length',dict(lengths=[(1,(0,0),(10,0)),(2,(0,0),(20,0))])),('arc',dict(arcs=[(1,0,0,2,0,90)])),('angle',dict(angles=[(90,(0,0),(1,0),(0,1))])),('tangent',dict(tangents=[((-1,1),(1,1),0,0,1)])),('line',dict(on_line=[((.5,0),(0,0),(1,0))])),('circle',dict(on_circle=[((1,0),0,0,1)]))]
for name,kw in valid:
 def positive(name=name,kw=kw):fs.verify_figure(name,**kw);return fs.unverified({name:svg},scope=scope,require_checks=True)==[]
 test('positive-'+name,positive)
for fill in ['none','transparent','white']:
 test('background-'+fill,lambda fill=fill:assess_svg(fe.raw_svg(120,70,f'<rect width="120" height="70" fill="{fill}"/>',fs.line((10,40),(110,40))),run_pixel_lint=False).accepted)
test('import-no-site',lambda:sys.flags.no_site==1 and not any(k in sys.modules for k in ['numpy','PIL','resvg_py','core.figure_solid']))
def builder():
 good('build');out=P/'own-fixture-output'
 with mock.patch.object(fe,'lint_svg',return_value=[]),mock.patch.object(fe,'svg_to_png_bytes',return_value=b'STUB-NOT-PNG'):
  rep=fe.build_figures({'build':svg},str(out),scope=scope)
 return rep['build']['svg_sha256']==hashlib.sha256(svg.encode()).hexdigest() and Path(rep['build']['png']).read_bytes()==b'STUB-NOT-PNG'
test('builder-pure-mocked-output-hash',builder)
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__)) for n,m in list(sys.modules.items()) if n.startswith('core.') and getattr(m,'__file__',None)};after={str(p):sha(p) for p in paths};assert before==after
oldsolid=subprocess.check_output(['git','-C',str(R),'show','437b72713abee0102bdc21ad9a02be39a8242383:vendor/figure-engine/core/figure_solid.py']);solid=E/'core/figure_solid.py';normalize=lambda b:b.replace(b'\r\n',b'\n');solidSame=normalize(oldsolid)==normalize(solid.read_bytes())
r={'controls':rows,'uniqueControls':len(rows),'passed':sum(x['passed'] for x in rows),'failed':sum(not x['passed'] for x in rows),'before':before,'after':after,'importedClosureHashes':closure,'solidUnchangedNormalizedFromR1RootCommit':solidSame,'solidRawSHA256':sha(solid),'solidR1GitNormalizedSHA256':hashlib.sha256(normalize(oldsolid)).hexdigest(),'solidNotExecuted':True,'rootHEADInformational':subprocess.check_output(['git','-C',str(R),'rev-parse','HEAD'],text=True).strip()};(P/'own-results.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:r[k] for k in ['uniqueControls','passed','failed','solidUnchangedNormalizedFromR1RootCommit']}))
