from pathlib import Path
import ast,sys,json,math,hashlib,copy,subprocess,os,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · actual current inset/기대 독립\n',encoding='utf8');assert '독립'in(P/'own-probe.txt').read_text(encoding='utf8')
old=R/'.qa-artifacts/exam-resume-20261008/m28-current-api-audit-20261021-r1/own-actual-outputs.json'
prior=P.parent/'m28-inset-plan-audit-20261021-r2/own-audit.py'
export=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/assets41-sync-20261021-r1/source-export-4ccb0cb/engine-check'
files=list((R/'vendor/figure-engine/core').glob('*.py'))+list((R/'scripts/figure').glob('*.py'))+list((R/'scripts/figure/assets').glob('*'))+[R/'src/lib/middle/m2Quad.ts',R/'src/lib/examStudy/adapters.ts',old,prior,export/'check_engine.py']+list((export/'expected').glob('*.json'))
before={str(f):sha(f.read_bytes())for f in files if f.is_file()};dump('own-before.json',before)
# Our previous independent equations only. No parent checker or SourceD execution.
tree=ast.parse(prior.read_text(encoding='utf8'));ns={'math':math,'re':__import__('re'),'ET':ET,'sha':sha}
exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name in ['circle','analyze']],type_ignores=[]),'own-independent-circle-halfplanes','exec'),ns)
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import render_spec
from core.figure_scene import compile_figure_spec
from core.figure_svg import inset_angle_interval,inset_angle_arc
rows=json.loads(old.read_text(encoding='utf-8-sig'))['rows'];specs={sha(json.dumps(r['figureSpec'],sort_keys=True,separators=(',',':')).encode()):r['figureSpec']for r in rows};assert len(specs)==64
native=[];samples=[]
for key,original in specs.items():
 spec=copy.deepcopy(original)
 for a in spec['angles'].values():a['serialized_inset']=True
 raw=json.dumps(spec,ensure_ascii=False);out=render_spec.render_json(raw);assert 'svg'in out,out
 analyzed=ns['analyze'](out['svg']);default=render_spec.render_json(json.dumps(original));assert 'svg'in default
 baseline=ns['analyze'](default['svg']);same=analyzed.pop('nonArcMarkup')==baseline['nonArcMarkup']
 native.append({'originalSpecSHA':key,'flaggedInputSHA':sha(raw.encode()),'nonArcSameDefault':same,**analyzed})
 scene=compile_figure_spec(spec);resolved=scene.resolve();tx,ty=resolved.translation
 for a in scene.angles.values():
  v,p,q=(scene.points[k]for k in [a.vertex,a.p1,a.p2]);actual=scene._angle_mark_polylines(a)[0]
  u=complex(p.x-v.x,p.y-v.y);w=complex(q.x-v.x,q.y-v.y);product=u.conjugate()*w;sweep=math.atan2(product.imag,product.real);sign=1 if sweep>0 else -1;start=math.atan2(u.imag,u.real)+sign*.001;delta=sweep-sign*.002
  expected=[(v.x+a.radius*math.cos(start+delta*i/16),v.y+a.radius*math.sin(start+delta*i/16))for i in range(17)]
  error=max(math.dist((z.x,z.y),want)for z,want in zip(actual,expected));assert error<1e-10
  path=inset_angle_arc(v.x,v.y,(p.x,p.y),(q.x,q.y),a.radius,offset=(tx,ty));cc,r,t,d=ns['circle'](path)
  samples.append({'spec':key,'angle':a.name,'sampleVsOwnIntervalMax':error,'sampleVsSerializedCircleRadialMax':max(abs(math.dist((z.x+tx,z.y+ty),cc)-r)for z in actual),'serializedCenterOffsetError':math.dist(cc,(v.x+tx,v.y+ty)),'sourceInterval':inset_angle_interval(v.x,v.y,(p.x,p.y),(q.x,q.y))})
controls=[]
def reject(name,fn):
 try:fn();controls.append({'id':name,'rejected':False})
 except Exception as e:controls.append({'id':name,'rejected':True,'error':str(e)})
seed=next(iter(specs.values()))
def invalidFlag(value,extra=None):
 spec=copy.deepcopy(seed);spec['angles']['angA']['serialized_inset']=value
 if extra:spec['angles']['angA'].update(extra)
 sc=compile_figure_spec(spec);sc.render_svg()
for name,value in [('zero',0),('one',1),('string','true'),('null',None),('list',[]),('object',{})]:reject('strictbool:'+name,lambda value=value:invalidFlag(value))
reject('flag-right',lambda:invalidFlag(True,{'right':True}))
reject('flag-perspective-right',lambda:invalidFlag(True,{'right':True,'perspective':True}))
reject('flag-perspective-alone',lambda:invalidFlag(True,{'perspective':True}))
for name,r in [('zero',0),('negative',-1),('nan',float('nan')),('inf',float('inf')),('endcollapse',1e-8)]:reject('radius:'+name,lambda r=r:inset_angle_arc(0,0,(1,0),(0,1),r))
for name,theta in [('below',.001),('equal',.002),('straight',math.pi)]:reject('angle:'+name,lambda theta=theta:inset_angle_arc(0,0,(1,0),(math.cos(theta),math.sin(theta)),10))
reject('zero-ray',lambda:inset_angle_arc(0,0,(0,0),(0,1),10))
reject('nonfinite-ray',lambda:inset_angle_arc(0,0,(float('inf'),0),(0,1),10))
reject('nonfinite-offset',lambda:inset_angle_arc(0,0,(1,0),(0,1),10,offset=(float('inf'),0)))
reject('radius-auto-enlarge',lambda:inset_angle_arc(0,0,(1,0),(math.cos(3),math.sin(3)),1.6e-6))
reject('inner-effective-radius',lambda:invalidFlag(True,{'arcs':2,'radius':2}))
# Restricted AST data interpreter only: no importing/running delivered checker.
env={}
def literal(n):
 if isinstance(n,ast.Name):return copy.deepcopy(env[n.id])
 if isinstance(n,ast.Call)and isinstance(n.func,ast.Name)and n.func.id=='dict':
  base=literal(n.args[0])if n.args else {};base.update({k.arg:literal(k.value)for k in n.keywords});return base
 if isinstance(n,ast.Dict):return {literal(k):literal(v)for k,v in zip(n.keys,n.values)}
 if isinstance(n,ast.List):return [literal(x)for x in n.elts]
 if isinstance(n,ast.Constant):return n.value
 if isinstance(n,ast.UnaryOp)and isinstance(n.op,ast.USub):return -literal(n.operand)
 raise ValueError('unsupported fixture AST')
for n in ast.parse((export/'check_engine.py').read_text(encoding='utf8')).body:
 if isinstance(n,ast.Assign)and len(n.targets)==1 and isinstance(n.targets[0],ast.Name)and n.targets[0].id in ['SCENE','CASES']:env[n.targets[0].id]=literal(n.value)
defaults=[]
for name,spec in env['CASES'].items():
 raw=json.dumps(spec).encode();run=subprocess.run([sys.executable,'-X','utf8','-B','-S',str(R/'scripts/figure/render_spec.py')],input=raw,capture_output=True,timeout=20,env={**os.environ,'PYTHONDONTWRITEBYTECODE':'1','PYTHONIOENCODING':'utf-8'},cwd=R)
 expected=(export/'expected'/f'{name}.json').read_bytes();(P/f'own-default-{name}.json').write_bytes(run.stdout)
 defaults.append({'name':name,'inputSHA':sha(raw),'stdoutSHA':sha(run.stdout),'expectedSHA':sha(expected),'rawSame':run.stdout==expected,'exit':run.returncode,'stderr':run.stderr.decode('utf8')})
after={f:sha(Path(f).read_bytes())for f in before};assert before==after
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__).read_bytes())for m in sys.modules.copy().values()if getattr(m,'__file__',None)and str(Path(m.__file__).resolve()).startswith(str(R.resolve()))}
dump('own-after.json',after);dump('own-first-import-closure.json',closure)
dump('own-results.json',{'actualFlagged64':native,'strictPassed':sum(x['strict']for x in native),'minimumMargin':min(m for x in native for a in x['arcs']for m in a['margins']),'nonArcSame':sum(x['nonArcSameDefault']for x in native),'sampling128':samples,'negativeControls':controls,'default8ActualCLI':defaults,'noMonkeypatch':True,'productionUnchanged':True})
print(json.dumps({'strict64':sum(x['strict']for x in native),'min':min(m for x in native for a in x['arcs']for m in a['margins']),'negative':len(controls),'negativeRejected':sum(x['rejected']for x in controls),'defaultRaw':sum(x['rawSame']for x in defaults)}))
