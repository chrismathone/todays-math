from pathlib import Path
from fractions import Fraction as F
import json,copy,hashlib,math,re,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');A=R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m14-intersection-20261021-r1'
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M14 actual artifact 독립 검산\n',encoding='utf8');assert '검산'in(P/'own-probe.txt').read_text(encoding='utf8')
raw=A/'actual-current-outputs-r2.json';old=R/'src/__tests__/fixtures/m2Parallel-before-intersection-20261021.json';j=json.loads(raw.read_text(encoding='utf8'));b=json.loads(old.read_text(encoding='utf8'))
files=[raw,old]+[R/n for n in j['sourceSHA256']]+[A/r['mathJaxSvg']for r in j['modes10']]
before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
for name,h in j['sourceSHA256'].items():assert sha((R/name).read_bytes())==h
assert len(j['modes10'])==len(b['modes10'])==20 and len(j['actualAPI'])==100 and len(b['old09'])==32
def stripO(out):
 out=copy.deepcopy(out);out['figureSpec']['points'].pop('O',None);out['figureSpec']['labels'].pop('O',None);return out
canonical=lambda out:json.dumps(out,sort_keys=True,ensure_ascii=False,separators=(',',':'))
oldSet={canonical(r['output'])for r in b['modes10']}
sub=lambda a,b:(a[0]-b[0],a[1]-b[1])
cross=lambda a,b:a[0]*b[1]-a[1]*b[0]
def geometry(out):
 pts={k:tuple(F(str(x))for x in v)for k,v in out['figureSpec']['points'].items()};a,c,bb,d=(pts[k]for k in ['A','C','B','D']);u,v=sub(c,a),sub(d,bb);den=cross(u,v);assert den
 t=cross(sub(bb,a),v)/den;s=cross(sub(bb,a),u)/den;assert 0<t<1 and 0<s<1
 exact=(a[0]+t*u[0],a[1]+t*u[1]);o=pts['O'];deviation=math.dist(tuple(map(float,o)),tuple(map(float,exact)))
 margins={}
 for x,y in [('A','C'),('B','D'),('E','F')]:
  edge=sub(pts[y],pts[x]);margins[x+y]=float(abs(cross(edge,sub(o,pts[x]))))/math.hypot(*map(float,edge))
 assert max(margins.values())<=.01 and deviation<=.01
 # Printed givens first; never use facts or answer to derive expected.
 givens={k:F(value)for k,value in re.findall(r'\\overline\{(AD|BC|EF)\}=(\d+)\\,\\mathrm\{cm\}',out['content'])}
 if set(givens)=={'AD','BC'}:expected=2*givens['AD']*givens['BC']/(givens['AD']+givens['BC']);target='EF'
 else:
  assert set(givens)=={'AD','EF'};denom=2*givens['AD']-givens['EF'];assert denom>0;expected=givens['EF']*givens['AD']/denom;target='BC'
 answer=re.fullmatch(r'\$(\d+)\\,\\mathrm\{cm\}\$',out['answer']);assert answer and F(answer[1])==expected
 dims=out['figureSpec']['dimensions'];assert set(dims)=={'d_'+k for k in givens};assert 'd_'+target not in dims
 return {'exactFittedIntersection':[str(x)for x in exact],'storedO':[str(x)for x in o],'distanceToExactFittedIntersection':deviation,'lineDistances':margins,'geometricRoundingBandOnly':.01,'givens':{k:str(v)for k,v in givens.items()},'target':target,'independentExpectedCm':str(expected),'targetDimensionAbsent':True}
records=[]
for i,(new,prior)in enumerate(zip(j['modes10'],b['modes10'])):
 assert (new['mode'],new['index'])==(prior['mode'],prior['index']);assert stripO(new['output'])==prior['output']
 g=geometry(new['output']);svg=A/new['mathJaxSvg'];rawsvg=svg.read_bytes();assert sha(rawsvg)==new['svgSHA256'];root=ET.fromstring(rawsvg)
 labels=[n for n in root.iter()if n.get('data-label')is not None];o=[n for n in labels if n.get('data-label')=='O'];assert len(o)==1
 codes=[n.get('data-c')for n in o[0].iter()if n.get('data-c')];assert codes==['4F']
 labelValues=[n.get('data-label')for n in labels];expectedGiven={k:f'{v} cm'for k,v in g['givens'].items()}
 missing=[k for k,v in expectedGiven.items()if v not in labelValues]
 dropped=new['droppedDimensions'];assert set(missing)=={k.removeprefix('d_')for k in dropped}
 assert new['strictResult']==new['oldStrict'];assert new['explicitLayoutHold']==(not new['strictResult']['ok'])
 if dropped:assert new['explicitLayoutHold']and dropped==['d_EF']
 # Anchor point tracks the same translation as A; label glyph may be offset for readability.
 labelA=next(n for n in labels if n.get('data-label')=='A');p=new['output']['figureSpec']['points'];tx=float(labelA.get('data-px'))-p['A'][0];ty=float(labelA.get('data-py'))-p['A'][1];anchorErr=math.dist((float(o[0].get('data-px')),float(o[0].get('data-py'))),(p['O'][0]+tx,p['O'][1]+ty));assert anchorErr<1e-9
 records.append({'mode':new['mode'],'index':new['index'],'oldFieldsExceptOIdentical':True,**g,'SVG_SHA256':sha(rawsvg),'ODataMjCount':sum(n.get('data-mj')=='O'for n in root.iter()),'ODataLabelCount':1,'OGlyphCodepoints':codes,'OAnchorTranslationError':anchorErr,'renderedLabels':labelValues,'missingGivenRoles':missing,'droppedDimensions':dropped,'strictCurrentAndOldIdentical':new['strictResult'],'hold':new['explicitLayoutHold']})
api=[]
for row in j['actualAPI']:
 out=row['output'];assert canonical(stripO(out))in oldSet
 api.append({'seed':row['seed'],'outputSHA256':sha(canonical(out).encode()),'matchesExistingBeforeModeExceptO':True,**geometry(out)})
after={f:sha(Path(f).read_bytes())for f in before};assert after==before
dump('own-after.json',after);dump('own-results.json',{'artifactModeRows20':records,'artifactAPI100':api,'all120OnlyOAddedComparedToBefore':True,'strictParentArtifactSuccesses':sum(not r['hold']for r in records),'strictParentArtifactHolds':sum(r['hold']for r in records),'droppedDimensionRows':sum(bool(r['droppedDimensions'])for r in records),'before09Rows32AvailableButNoNew09Artifact':True,'actualNodeOrAPIExecution':False,'sourceHashesEqualArtifactAndAfter':True})
print(json.dumps({'modeArtifactRows':20,'APIArtifactRows':100,'SVGChecked':20,'strictArtifactSuccess':sum(not r['hold']for r in records),'strictHolds':sum(r['hold']for r in records),'maxOIntersectionError':max(r['distanceToExactFittedIntersection']for r in records)}))
