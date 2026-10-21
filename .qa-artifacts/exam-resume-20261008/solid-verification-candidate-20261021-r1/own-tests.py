from pathlib import Path
import sys,json,importlib.util,unittest,io,hashlib,math
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P/'own-shadow'))
from core import figure_solid as s,figure_svg as f
spec=importlib.util.spec_from_file_location('copied_existing_tests',P/'own-existing-tests.py');m=importlib.util.module_from_spec(spec);sys.modules[spec.name]=m;spec.loader.exec_module(m);stream=io.StringIO();r=unittest.TextTestRunner(stream=stream,verbosity=2).run(unittest.defaultTestLoader.loadTestsFromModule(m));(P/'own-existing-test-output.txt').write_text(stream.getvalue(),encoding='utf-8')
rows=[];O=(0,0,0);X=(1,0,0);Z=(0,0,1);xy=s.Plane.xy();bad=s.Plane(O,(0,0,2));badfoot=s.foot(Z,bad)
def check(name,fn):
 try:ok=fn();rows.append(dict(name=name,passed=bool(ok)))
 except Exception as e:rows.append(dict(name=name,passed=False,error=str(e)))
def rejects(**kw):
 try:s.verify_solid('extra',**kw);return False
 except s.SolidGeometryError:return True
check('nonunit-plane-foot-self-consistency-held',lambda:badfoot==(0,0,-3) and rejects(feet=[(badfoot,Z,bad)]))
check('nonunit-plane-angle-held',lambda:rejects(angles=[(0,'dihedral',xy,bad)]))
check('nonunit-plane-onplane-held',lambda:rejects(on_plane=[(X,bad)]))
check('nonunit-plane-equation-held',lambda:rejects(equations=[((0,0,1,0),bad)]))
check('nonunit-plane-area-held',lambda:rejects(areas=[(None,[O,X,(0,1,0)],bad)]))
check('nonunit-near-normal-held',lambda:rejects(on_plane=[(X,s.Plane(O,(0,0,1.001)))]))
check('finite-overflow-length-held',lambda:rejects(lengths=[(1,(1e308,0,0),(-1e308,0,0))]))
check('negative-small-angle-held',lambda:rejects(angles=[(-.01,'dihedral',xy,xy)]))
check('angle-above90-held',lambda:rejects(angles=[(90.01,'dihedral',xy,s.Plane(O,X))]))
check('nonfinite-view-held',lambda:rejects(on_plane=[(O,xy)],view=s.View(scale=float('nan'))))
def valid(name,**kw):s.verify_solid(name,**kw);return f._VERIFIED.get((__file__,name),0)>0
check('angle0-positive',lambda:valid('zeroangle',angles=[(0,'dihedral',xy,xy)]))
check('projected-zero-area-positive',lambda:valid('zeroarea',areas=[(0,[O,X,(0,1,0)],s.Plane(O,X))]))
check('scaled-equation-positive',lambda:valid('scaledeq',equations=[((0,0,-7,14),s.Plane((0,0,2),(0,0,1)))]))
check('input-not-mutated',lambda:bad.normal==(0,0,2))
check('empty-not-positive-registration',lambda:(s.verify_solid('empty') is None and f.unverified({'empty':'unused'},scope=__file__,require_checks=True)==['empty']))
# All public AST definitions except verify_solid remain exact modulo formatting.
import ast
base=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/vendor/figure-engine/core/figure_solid.py')
def defs(path):return {n.name:ast.dump(n,include_attributes=False) for n in ast.parse(path.read_text(encoding='utf-8-sig')).body if isinstance(n,(ast.FunctionDef,ast.ClassDef)) and n.name!='verify_solid'}
check('all-public-helper-AST-unchanged',lambda:defs(base)==defs(P/'own-figure_solid.py'))
result={'oldTestsRun':r.testsRun,'oldFailures':len(r.failures),'oldErrors':len(r.errors),'oldSkipped':len(r.skipped),'additionalControls':rows,'additionalCount':len(rows),'additionalPassed':sum(x['passed'] for x in rows),'nonunitCounterexample':{'planeNormal':[0,0,2],'point':[0,0,1],'unchangedPublicFootReturned':list(badfoot),'mathematicallyCorrectFoot':[0,0,0],'candidateVerifyRejects':True},'actualImportPaths':{'solid':s.__file__,'svg':f.__file__}};(P/'own-additional-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'oldTestsRun':r.testsRun,'oldFailures':len(r.failures),'oldErrors':len(r.errors),'additionalCount':len(rows),'additionalPassed':result['additionalPassed']}));assert r.wasSuccessful() and all(x['passed'] for x in rows)
