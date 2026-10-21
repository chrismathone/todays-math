from pathlib import Path
from fractions import Fraction as F
import json,math,hashlib,copy,re,sys,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M4 54조합/원본 보존\n',encoding='utf8');assert '보존'in(P/'own-probe.txt').read_text(encoding='utf8')
source=R/'src/lib/middle/m2GeoQuad.ts';handoff=R/'docs/planning/tracks/brief-engine-handoff-display-20261021.md';text=source.read_text(encoding='utf8');card=next(s for s in handoff.read_text(encoding='utf8').splitlines()if s.startswith('| M4 |'))
files=[source,handoff,R/'src/lib/middle/figureDims.ts']+list((R/'scripts/figure').glob('*.py'))+list((R/'vendor/figure-engine/core').glob('*.py'))
before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
assert 'const p = intBetween(rng, 4, 12);'in text and 'const c = 2 * intBetween(rng, 2, 7);'in text
assert 'angB: "60°"'in text
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import render_spec
from core.figure_scene import compile_figure_spec
def sub(a,b):return(a[0]-b[0],a[1]-b[1])
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def angle(a,v,b):
 u,w=sub(a,v),sub(b,v);return math.degrees(math.atan2(abs(cross(u,w)),u[0]*w[0]+u[1]*w[1]))
rnd=lambda n:math.floor(n*100+.5)/100
def fit(pts):
 xs=[p[0]for p in pts.values()];ys=[p[1]for p in pts.values()];s=min(184/(max(xs)-min(xs)),154/(max(ys)-min(ys)))
 return {k:[rnd(18+(x-min(xs))*s),rnd(172-(y-min(ys))*s)]for k,(x,y)in pts.items()}
records=[]
for p in range(4,13):
 for c in range(4,15,2):
  # Independent student result first: angleB60; two right-triangle short legs c/2;
  # rectangle EH equals given top p. No produced answer/facts or pixels read.
  projection=F(c,2);expected=projection+F(p)+projection;assert expected.denominator==1 and expected>p
  top,bottom=p*9,int(expected)*9;height=rnd(c*9*math.sin(math.pi/3));off=(bottom-top)/2
  raw={'A':[off,height],'B':[0,0],'C':[bottom,0],'D':[off+top,height]};assert height>0
  actual={'A':angle(raw['B'],raw['A'],raw['D']),'B':angle(raw['A'],raw['B'],raw['C'])};assert abs(actual['A']-120)<.01 and abs(actual['B']-60)<.01;assert math.dist(raw['A'],raw['B'])==math.dist(raw['D'],raw['C'])
  spec={'version':2,'points':fit(raw),'segments':{'AD':{'points':['A','D'],'parallel':1},'AB':{'points':['A','B'],'ticks':1},'DC':{'points':['D','C'],'ticks':1},'BC':{'points':['B','C'],'parallel':1}},'angles':{'angB':{'vertex':'B','points':['A','C'],'label':'60°'}},'labels':{k:k for k in ['A','B','C','D']},'dimensions':{'d_AD':{'points':['A','D'],'label':f'{p} cm','side':'auto'},'d_AB':{'points':['A','B'],'label':f'{c} cm','side':'auto'}}}
  proposal=copy.deepcopy(spec);proposal['angles']={'angA':{'vertex':'A','points':['B','D'],'label':'120°'}}
  old=render_spec.render_json(json.dumps(spec));new=render_spec.render_json(json.dumps(proposal));assert 'svg'in old,old
  labels=lambda svg:[''.join(n.itertext()).strip()for n in ET.fromstring(svg).iter()if n.tag.endswith('text')]
  oldLabels=labels(old['svg']);assert oldLabels.count('60°')==1 and '120°'not in oldLabels
  rec={'p':p,'c':c,'independentShortLeg':str(projection),'independentExpectedBC':str(expected),'sourceRawHeight':height,'sourceRawAngles':actual,'currentRendered':True,'currentSVG_SHA':sha(old['svg'].encode()),'currentLabels':oldLabels,'candidateRendered':'svg'in new,'candidateError':new.get('error')}
  if 'svg'in new:
   newLabels=labels(new['svg']);assert newLabels.count('120°')==1 and '60°'not in newLabels;assert f'{expected} cm'not in newLabels or expected in [p,c]
   # Role-based no-target check, since a target numeric value may equal another given.
   assert 'd_BC'not in proposal['dimensions'];assert proposal['points']==spec['points']and proposal['segments']==spec['segments']and proposal['labels']==spec['labels']and proposal['dimensions']==spec['dimensions']
   z=compile_figure_spec(proposal).resolve();tx,ty=z.translation;W,H=z.view_box[2:];clip=[k for k,(l,t,r,b)in z.label_boxes.items()if l+tx<0 or t+ty<0 or r+tx>W or b+ty>H]
   box=dict(z.label_boxes);overlap=[(a,b)for i,a in enumerate(box)for b in list(box)[i+1:]if min(box[a][2],box[b][2])>max(box[a][0],box[b][0])and min(box[a][3],box[b][3])>max(box[a][1],box[b][1])]
   rec.update(candidateSVG_SHA=sha(new['svg'].encode()),candidateLabels=newLabels,candidateBoxClip=clip,candidateLabelBoxOverlap=overlap,candidateLeaders=list(z.angle_leaders))
  records.append(rec)
  if (p,c)==(4,4):
   dump('own-minimal-specimens.json',{'basis':'Existing literal domainp4,c4; source port, NOT actual TS/API','sourcePort':spec,'QAOnlyAngAProposal':proposal})
   (P/'own-minimal-current.svg').write_text(old['svg'],encoding='utf8')
   if 'svg'in new:(P/'own-minimal-proposed.svg').write_text(new['svg'],encoding='utf8')
after={f:sha(Path(f).read_bytes())for f in before};assert before==after;dump('own-after.json',after)
dump('own-results.json',{'originalCard':card,'domain54':len(records),'sourcePortCurrentRenders':54,'candidateSourcePortRenders':sum(x['candidateRendered']for x in records),'candidateFailureRows':[x for x in records if not x['candidateRendered']],'records':records,'actualTSorAPI':False,'productionModified':False,'sourceUnchanged':True})
print(json.dumps({'domain':54,'currentPort':54,'candidate':sum(x['candidateRendered']for x in records),'candidateClips':sum(bool(x.get('candidateBoxClip'))for x in records),'candidateBoxOverlapRows':sum(bool(x.get('candidateLabelBoxOverlap'))for x in records)}))
