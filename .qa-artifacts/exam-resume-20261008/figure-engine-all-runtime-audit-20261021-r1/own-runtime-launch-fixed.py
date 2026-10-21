from pathlib import Path
import sys,os,json,hashlib,copy,ast,subprocess,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent/'own-run2';P.mkdir(exist_ok=True);R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');D=Path('D:/math-figure-editor/docs/export/todays-math');OLD=Path(__file__).resolve().parent.parent/'figure-engine-all-audit-20261021-r1';sha=lambda b:hashlib.sha256(b).hexdigest();sys.dont_write_bytecode=True;os.environ['PYTHONDONTWRITEBYTECODE']='1';os.environ['FIGURE_ENGINE_PATH']=str(R/'vendor/figure-engine')
files=sorted(set([*list((R/'vendor/figure-engine').rglob('*.py')),*list((R/'scripts/figure').glob('*.py')),*list((R/'scripts/figure/assets').glob('*.json')),*list((R/'scripts/figure/assets').glob('*.svg'))]));before={str(f):sha(f.read_bytes()) for f in files};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');(P/'own-write-probe.txt').write_text('실제 Python 런타임·실패 관측 보존\n',encoding='utf-8');assert '실패' in (P/'own-write-probe.txt').read_text(encoding='utf-8')
# Prevent this process from running Node/network or writing anywhere except owned QA.
def audit(event,args):
 if event=='socket.connect':raise RuntimeError('network forbidden in audit')
 if event=='subprocess.Popen':
  exe=str(args[0]).lower()
  if Path(exe).name not in ['python','python.exe','python3','python3.exe','python3.11','python3.12','python3.13','python3.14']:raise RuntimeError('only sequential Python child allowed: '+exe)
 if event=='open' and isinstance(args[0],(str,bytes,os.PathLike)):
  mode=args[1] or '';flags=args[2] if len(args)>2 else 0
  if any(c in mode for c in 'wax+') or flags&(os.O_WRONLY|os.O_RDWR|os.O_CREAT|os.O_TRUNC|os.O_APPEND):
   if not Path(args[0]).resolve().is_relative_to(P):raise RuntimeError('outside owned write forbidden: '+str(args[0]))
sys.addaudithook(audit)
from importlib.machinery import SourceFileLoader
read=SourceFileLoader.get_data;first={}
def capture(self,path):
 data=read(self,path)
 if str(path).replace('\\','/').startswith(str(R).replace('\\','/')) and str(path).endswith('.py'):first[str(Path(path))]=sha(data)
 return data
SourceFileLoader.get_data=capture
sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
from render_spec import render_json
from core.figure_quality import sanitize_svg,SvgSecurityError
from core.label_markup import parse_label
import figure_assets,engine_path
assert Path(engine_path.engine_root()).resolve()==(R/'vendor/figure-engine').resolve()
rows=[];inputs=[];outputs=[]
def record(id,kind,input,expected,fn,test):
 try:out=fn();ok=bool(test(out));error=None
 except Exception as e:out={'exception':type(e).__name__,'message':str(e)};ok=False;error=str(e)
 inp=json.dumps(input,sort_keys=True,ensure_ascii=False,allow_nan=True);encoded=json.dumps(out,sort_keys=True,ensure_ascii=False,allow_nan=True);row={'id':id,'kind':kind,'expected':expected,'pass':ok,'inputSHA256':sha(inp.encode()),'outputSHA256':sha(encoded.encode()),'observation':out if 'svg' not in out else {'svgSHA256':sha(out['svg'].encode()),'svgBytes':len(out['svg'].encode())}}
 rows.append(row);inputs.append({'id':id,'input':input});outputs.append({'id':id,'output':out});(P/'own-progress.jsonl').open('a',encoding='utf-8').write(json.dumps(row,ensure_ascii=False)+'\n')
def run(id,spec,want):record(id,'actual render_json',spec,want,lambda:render_json(json.dumps(spec,ensure_ascii=False,allow_nan=True)),lambda o:('svg' in o) if want=='render' else ('error' in o))
def san(id,svg,want):
 def action():
  try:return {'svg':sanitize_svg(svg)}
  except SvgSecurityError as e:return {'error':str(e)}
 record(id,'actual sanitize_svg',svg,want,action,lambda o:('svg' in o) if want=='accept syntax only' else 'error' in o)
# Replay all R7 proposed render/label/sanitizer cases, with explicit semantic limits.
prepared=json.loads((OLD/'own-pending-counterexamples.json').read_text(encoding='utf-8'))
for c in prepared['cases']:
 if 'input' in c:run('r7-'+c['id'],c['input'],'render' if c['requiredRenderer'].startswith('render') else 'reject')
 elif 'label' in c:
  label=c['label'];s={'version':2,'points':{'A':[0,0],'B':[180,0],'v':[90,30]},'segments':{'AB':['A','B']},'labels':{'v':{'text':label,'dx':0,'dy':0}},'background':'transparent'};run('r7-'+c['id'],s,'render')
 elif 'svg' in c:san('r7-'+c['id'],c['svg'],'reject' if c['id'].endswith(('script','badslug')) else 'accept syntax only')
base={'version':2,'points':{'V':[100,100],'P':[200,100],'Q':[150,150]},'segments':{'VP':['V','P'],'VQ':['V','Q']},'background':'transparent'}
valid={'asset':'house','at':'V','anchor':'base','width':30}
run('positive-house',{**base,'assets':[valid]},'render')
# Explicit invalid arrays/null/mixed fields; do not alter expectations after observing result.
variants=[('null',None),('empty',[]),('object',{}),('string','house'),('boolean',False),('entry-null',[None]),('entry-int',[1]),('entry-string',['house']),('too-many',[valid]*13)]
for id,value in variants:run('assets-container-'+id,{**base,'assets':value},'reject')
for id,changes in [('unknown',{'asset':'no-such-asset'}),('path',{'asset':'../house'}),('absolute',{'asset':'C:/house'}),('slash',{'asset':'house.svg'}),('width-zero',{'width':0}),('width-neg',{'width':-1}),('width-nan',{'width':float('nan')}),('width-inf',{'width':float('inf')}),('width-bool',{'width':True}),('width-string',{'width':'30'}),('width-huge',{'width':1e9}),('width-missing',{'width':None}),('bad-anchor',{'anchor':'feet'}),('flip-int',{'flip':1}),('coords-nan',{'at':[float('nan'),0]}),('coords-inf',{'at':[0,float('inf')]}),('unknown-field',{'other':1}),('mixed-from',{'from':'V','to':'P'}),('missing-to',{'from':'V'}),('anchor-null',{'anchor':None})]:
 item={**valid,**changes};run('asset-item-'+id,{**base,'assets':[item]},'reject')
for reserved in ['assetFrameLo','assetFrameHi']:
 s=copy.deepcopy(base);s['points'][reserved]=[20,20];s['assets']=[valid];run('reserved-point-'+reserved,s,'reject')
s=copy.deepcopy(base);s['segments']['assetFrameLo']=['V','P'];s['assets']=[valid];run('reserved-segment',s,'reject')
# NaN/Inf geometry must fail even if projected-mark exception is set.
for n in [float('nan'),float('inf')]:
 s=copy.deepcopy(base);s['points']['P']=[n,100];s['angles']={'r':{'vertex':'V','points':['P','Q'],'right':True,'perspective':True}};run('projected-nonfinite-'+str(n),s,'reject')
wrap=lambda x:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">'+x+'</svg>'
for id,body in [('event','<g data-asset="house" onload="alert(1)"><path d="M0 0L20 20"/></g>'),('external-use','<g data-asset="house"><use href="https://example.invalid/a.svg"/></g>'),('external-fill','<g data-asset="house"><path d="M0 0L20 20" fill="url(https://example.invalid/a)"/></g>'),('badslug-space','<g data-asset="house other"><path d="M0 0L20 20"/></g>')]:san('asset-security-'+id,wrap(body),'reject')
for id,value in [('zero-width','0 0 0 10 2 2'),('zero-height','0 0 10 0 2 2'),('zero-count','0 0 10 10 0 2'),('61','0 0 10 10 61 2'),('999','0 0 10 10 999 2'),('nonsquare','0 0 10 20 2 2'),('nan','0 0 NaN 10 2 2'),('fraction','0 0 10 10 1.001 2')]:san('grid-number-'+id,wrap(f'<g data-grid="{value}"><path d="M0 0V20"/></g>'),'reject')
g='<g data-grid="0 0 10 10 2 2"><path d="M0 0V20"/></g>'
for id,body in [('nested','<g>'+g+'</g>'),('transform',g.replace('<g ','<g transform="translate(1 1)" ')),('duplicate',g+g),('late','<path d="M0 0L5 5"/>'+g),('empty','<g data-grid="0 0 10 10 2 2"/>')]:san('grid-placement-'+id,wrap(body),'reject')
# Explicit variable/unit contrast: representation observations are not semantic unit proofs.
for label in ['30 m','5 g','2m','g/h','$30 m$','2 L','3 mL']:
 def pieces(label=label):return {'pieces':[{'text':p.text,'italic':p.italic,'shift':p.shift} for p in parse_label(label)]}
 record('pieces-'+label,'actual parse_label',label,'parse, preserve visible character payload',pieces,lambda o:'pieces' in o and ''.join(p['text'] for p in o['pieces'])==label.strip('$'))
manifest=figure_assets.list_assets();record('manifest39','actual manifest loader',{'manifestRoot':str(R/'scripts/figure/assets')},'39 unique registered assets',lambda:{'slugs':[x['slug'] for x in manifest]},lambda o:len(o['slugs'])==39 and len(set(o['slugs']))==39)
for row in manifest:
 slug=row['slug']
 def asset(slug=slug):
  w,h,body=figure_assets._asset_body(slug);svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:g} {h:g}">{body}</svg>';return {'svg':sanitize_svg(svg)}
 record('manifest-sanitize-'+slug,'actual registered body load and sanitize',{'slug':slug},'accepted actual registered body',asset,lambda o:'svg' in o)
# Own six raw-stdout replay. AST reads data only; checker is never executed on SourceD.
env={}
def literal(n):
 if isinstance(n,ast.Name):return env[n.id]
 if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='dict':v=dict(literal(n.args[0]));v.update({k.arg:literal(k.value) for k in n.keywords});return v
 if isinstance(n,ast.Dict):return {literal(k):literal(v) for k,v in zip(n.keys,n.values)}
 if isinstance(n,ast.List):return [literal(x) for x in n.elts]
 return ast.literal_eval(n)
for n in ast.parse((D/'engine-check/check_engine.py').read_text(encoding='utf-8-sig')).body:
 if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id in ['SCENE','CASES']:env[n.targets[0].id]=literal(n.value)
rawsix=[]
for name,spec in env['CASES'].items():
 raw=json.dumps(spec,ensure_ascii=False).encode();expected=(D/'engine-check/expected'/(name+'.json')).read_bytes();child=subprocess.run([sys.executable,'-B','-S',str(R/'scripts/figure/render_spec.py')],input=raw,executable=sys.executable,capture_output=True,timeout=25,cwd=P,env=os.environ.copy());(P/('own-six-'+name+'.stdout.json')).write_bytes(child.stdout);record('six-raw-'+name,'actual sequential Python CLI stdout byte comparison',spec,'exact expected raw stdout,exit0,no stderr',lambda child=child,expected=expected:{'stdoutSHA256':sha(child.stdout),'expectedSHA256':sha(expected),'sameRawBytes':child.stdout==expected,'returncode':child.returncode,'stderr':child.stderr.decode('utf-8',errors='replace')},lambda o:o['sameRawBytes'] and o['returncode']==0 and not o['stderr'])
 aftersix={str(f):sha(f.read_bytes()) for f in files};rawsix.append(name)
after={str(f):sha(f.read_bytes()) for f in files};(P/'own-after.json').write_text(json.dumps(after,indent=2),encoding='utf-8');(P/'own-inputs.json').write_text(json.dumps(inputs,ensure_ascii=False,indent=2,allow_nan=True),encoding='utf-8');(P/'own-outputs.json').write_text(json.dumps(outputs,ensure_ascii=False,indent=2,allow_nan=True),encoding='utf-8');modules={n:str(m.__file__) for n,m in list(sys.modules.items()) if getattr(m,'__file__',None) and str(m.__file__).replace('\\','/').startswith(str(R).replace('\\','/'))};result={'uniqueControls':len(rows),'passed':sum(x['pass'] for x in rows),'failed':[x for x in rows if not x['pass']],'rows':rows,'modulePaths':modules,'firstReadCodeSHA256':first,'firstReadAfterSHA256':{f:sha(Path(f).read_bytes()) for f in first},'sourceChanges':[f for f in before if before[f]!=after[f]],'dontWriteBytecode':sys.dont_write_bytecode,'sixCLIActuallyExecuted':rawsix,'R7PreparedCount':prepared['caseCount'],'semanticLimitations':['Projected mark render is not2D/world right-angle proof','Unit typography does not prove unit vs variable meaning','Syntactic data-asset acceptance does not certify body provenance or editor opacity'],'NodeBrowserDBModelCalls':0};(P/'own-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({'unique':result['uniqueControls'],'passed':result['passed'],'failed':result['failed'],'sourceChanges':result['sourceChanges']},ensure_ascii=True))
