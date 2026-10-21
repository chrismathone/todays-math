from pathlib import Path
import sys,json,math,hashlib,copy,subprocess,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · 현재 엔진 독립 검수\n',encoding='utf8');assert '현재' in (P/'own-probe.txt').read_text(encoding='utf8')
files=list((R/'scripts/figure').glob('*.py'))+list((R/'vendor/figure-engine/core').glob('*.py'))+list((R/'scripts/figure/assets').glob('*'))
before={str(f):sha(f.read_bytes()) for f in files if f.is_file()};dump('own-before.json',before)
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import scene_assets as sa,figure_assets as fa,render_spec as rs
from core.figure_quality import sanitize_svg
assert Path(sa.__file__).resolve()==(R/'scripts/figure/scene_assets.py').resolve()
results=[];inputs=[]
def test(name,fn,inp=None):
 inputs.append({'id':name,'input':inp})
 try:results.append({'id':name,'passed':True,'observed':fn()})
 except Exception as e:results.append({'id':name,'passed':False,'error':repr(e)})
def require(v):
 assert v
def rendered(spec,ok):
 old=copy.deepcopy(spec);out=rs.render_json(json.dumps(spec,ensure_ascii=False));assert spec==old
 assert ('svg' in out)==ok, out
 if ok:assert isinstance(out['svg'],str);ET.fromstring(out['svg']);return {'svgSHA256':sha(out['svg'].encode()),'viewBox':ET.fromstring(out['svg']).get('viewBox')}
 assert 'error'in out;return out
rows=fa.list_assets();assert len(rows)==41
for row in rows:
 def load(row=row):
  w,h,body=fa._asset_body(row['slug']);out=sanitize_svg(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">{body}</svg>');return {'viewBox':[w,h],'sanitizedSHA':sha(out.encode())}
 test('load-sanitize:'+row['slug'],load,{'slug':row['slug']})
anchors=json.loads((R/'scripts/figure/assets/anchors.json').read_text(encoding='utf8'))
def apply(p,xy):
 x=(xy[0]-p.anchor[0])*p.scale*(-1 if p.flip else 1);y=(xy[1]-p.anchor[1])*p.scale;t=math.radians(p.angle)
 return (p.at[0]+x*math.cos(t)-y*math.sin(t),p.at[1]+x*math.sin(t)+y*math.cos(t))
for slug in ['building','building-3d']:
 for flip in [False,True]:
  for label,end in [('front',[100,80]),('inclined',[160,80]),('shallow-upright',[110,80])]:
   item={'asset':slug,'from':[100,200],'to':end,'flip':flip}
   def align(item=item,label=label,slug=slug,end=end):
    p=sa.plan_assets([item],lambda xy:tuple(xy),lambda x:x)[0]
    base,top=anchors[slug]['edgeBase'],anchors[slug]['edgeTop']
    a,b=apply(p,base),apply(p,top);assert math.dist(a,(100,200))<1e-9
    if label!='shallow-upright':assert math.dist(b,end)<1e-9
    else:assert abs(b[1]-end[1])<1e-9 and p.angle==0
    assert p.anchor==tuple(base);assert all(math.isfinite(x)for x in p.box)
    return {'baseMapped':a,'topMapped':b,'requestedTop':end,'angle':p.angle,'scale':p.scale,'serializedTransform':p.transform(),'exactAlignmentBeforeSerialization':label!='shallow-upright','uprightPolicyNote':'within12deg keeps artwork upright and height; endpoint x need not coincide' if label=='shallow-upright'else None}
   test('edge:'+slug+':'+str(flip)+':'+label,align,item)
def tracked(spec,ok,shrink):
 calls=[];original=sa.plan_assets
 def probe(items,point,length,factor=1.0):
  out=original(items,point,length,factor);calls.append({'factor':factor,'scales':[p.scale for p in out]});return out
 sa.plan_assets=probe
 try:out=rendered(spec,ok)
 finally:sa.plan_assets=original
 assert (len(calls)>1)==shrink, calls
 return {'render':out,'actualPlanCalls':calls}
base={'version':2,'points':{},'assets':[{'asset':'house','at':[100,100],'anchor':'center','width':40}]}
test('asset-only-empty-points',lambda:tracked(base,True,False),base)
free=copy.deepcopy(base);free['assets'][0]['width']=900
test('asset-only-free-shrink',lambda:tracked(free,True,True),free)
fixed={'version':2,'points':{'A':[0,0],'B':[0,700]},'segments':{'AB':['A','B']},'assets':[{'asset':'building-3d','from':'A','to':'B'},{'asset':'house','at':[10,10],'width':30}]}
test('fixed-oversize-no-useless-shrink',lambda:tracked(fixed,False,False),fixed)
for name,value in [('null',None),('empty',[]),('object',{}),('string','house'),('number',3),('listnull',[None])]:
 spec={'version':2,'points':{},'assets':value}
 test('malformed-assets:'+name,lambda spec=spec:rendered(spec,False),spec)
for slug in ['can','dice','bowl','unknown','../house','__proto__']:
 spec=copy.deepcopy(base);spec['assets'][0]['asset']=slug
 test('solid-or-unknown:'+slug,lambda spec=spec:rendered(spec,False),spec)
for name,patch in [('widthzero',{'width':0}),('widthnegative',{'width':-1}),('widthbool',{'width':True}),('widthnan',{'width':float('nan')}),('widthinf',{'width':float('inf')}),('flipstring',{'flip':'true'}),('badanchor',{'anchor':'edgeTop'}),('unknownfield',{'extra':1}),('mixedfrom',{'from':[0,0]}),('badcoords',{'at':[1,float('inf')]})]:
 spec=copy.deepcopy(base);spec['assets'][0].update(patch)
 # NaN defeats ordinary deep-equality; immutable JSON raw string is the checked API input.
 def negative(spec=spec):
  raw=json.dumps(spec);out=rs.render_json(raw);assert 'error'in out and 'svg'not in out;return out
 test('invalid-item:'+name,negative,str(spec))
same={'version':2,'points':{},'assets':[{'asset':'building-3d','from':[0,0],'to':[0,0]}]}
test('degenerate-from-to',lambda:rendered(same,False),same)
for slug in ['building-3d','house-3d']:
 spec=copy.deepcopy(base);spec['assets'][0]['asset']=slug
 test('current-render-new-picture:'+slug,lambda spec=spec:rendered(spec,True),spec)
after={f:sha(Path(f).read_bytes())for f in before};assert before==after
closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__).read_bytes())for m in sys.modules.copy().values()if getattr(m,'__file__',None)and str(Path(m.__file__).resolve()).startswith(str(R.resolve()))}
dump('own-after.json',after);dump('own-inputs.json',inputs);dump('own-results.json',{'unique':len(results),'passed':sum(r['passed']for r in results),'failed':[r for r in results if not r['passed']],'results':results,'currentRootImports':closure,'rootSourceUnchanged':True,'actualRootHEAD':subprocess.check_output(['git','-C',str(R),'rev-parse','HEAD']).decode().strip()})
print(json.dumps({'unique':len(results),'passed':sum(r['passed']for r in results),'failed':[r for r in results if not r['passed']]}))
