from pathlib import Path
from fractions import Fraction as F
import re,json,math,sys,hashlib,copy,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v):(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · M14 현재 교점 참조 누락\n',encoding='utf8');assert '교점'in(P/'own-probe.txt').read_text(encoding='utf8')
ledger=R/'.qa-artifacts/exam-resume-20261008/engine-upgrades-progress-r60.json';handoff=R/'docs/planning/tracks/brief-engine-handoff-display-20261021.md';source=R/'src/lib/middle/m2GeoSim.ts';dims=R/'src/lib/middle/figureDims.ts'
files=[ledger,handoff,source,dims]+list((R/'vendor/figure-engine/core').glob('*.py'))+list((R/'scripts/figure').glob('*.py'))
before={str(f):sha(f.read_bytes())for f in files};dump('own-before.json',before)
progress=json.loads(ledger.read_text(encoding='utf8'));text=source.read_text(encoding='utf8');card=next(s for s in handoff.read_text(encoding='utf8').splitlines()if s.startswith('| M14 |'))
assert 'M14'not in progress['pendingM38']['scopedCodeFixes'];assert progress['pendingM38']['otherOriginalCardsRemainOpen']
start=text.index('function figTrapMid09(');end=text.index('\n/**',start);helper=text[start:end]
assert 'const pts: Record<string, XY> = { A, B, C, D, E, F };'in helper
assert 'segments.AC = ["A", "C"]'in helper and 'segments.BD = ["B", "D"]'in helper
assert not re.search(r'\bO\s*:',helper)
const=re.search(r'const HARMONIC_PAIRS = (\[[\s\S]*?\]) as const;',text)[1];pairs=json.loads(re.sub(r',\s*\]',']',const));assert len(pairs)==10
handlerStart=text.index('"10",',text.index('def(\n    MINOR_PAR,',text.index('function figTrapMid09')))
# Exact source excerpts are engine code attribution, no original school question/key.
locations={n:next(i+1 for i,s in enumerate(text.splitlines())if n in s)for n in ['function figTrapMid09','const pts: Record<string, XY> = { A, B, C, D, E, F };','segments.AC =','content: `그림과 같이 $\\\\overline{AD}\\\\parallel\\\\overline{BC}$인 사다리꼴 $ABCD$에서 점 $O$']}
sys.dont_write_bytecode=True;sys.path[:0]=[str(R/'scripts/figure'),str(R/'vendor/figure-engine')]
import render_spec
def sub(a,b):return (a[0]-b[0],a[1]-b[1])
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def intersection(a,c,b,d):
 u,v=sub(c,a),sub(d,b);den=cross(u,v);assert den!=0;s=cross(sub(b,a),v)/den;t=cross(sub(b,a),u)/den;assert 0<s<1 and 0<t<1
 return (a[0]+s*u[0],a[1]+s*u[1])
def fit(points):
 xs=[p[0]for p in points.values()];ys=[p[1]for p in points.values()];m=F(18);scale=min(F(184)/(max(xs)-min(xs)),F(154)/(max(ys)-min(ys)))
 rnd=lambda x:float(F(math.floor(x*100+F(1,2)),100))
 return {k:[rnd(m+(x-min(xs))*scale),rnd(F(172)-(y-min(ys))*scale)]for k,(x,y)in points.items()}
records=[]
for p,q in pairs:
 k=F(150,max(p,q));h=F(108);t=F(p,p+q)
 a=((q-p)*k/2,h);d=((q+p)*k/2,h);b=(F(0),F(0));c=(q*k,F(0));lerp=lambda a,b:(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
 points=dict(A=a,B=b,C=c,D=d,E=lerp(a,b),F=lerp(d,c));o=intersection(a,c,b,d)
 assert cross(sub(points['F'],points['E']),sub(o,points['E']))==0
 assert o[1]==points['E'][1]and (points['E'][0]+points['F'][0])/2==o[0]
 sourceSpec={'version':2,'points':fit(points),'segments':{'AD':{'points':['A','D'],'parallel':1},'EF':['E','F'],'BC':{'points':['B','C'],'parallel':1},'AE':['A','E'],'EB':['E','B'],'DF':['D','F'],'FC':['F','C'],'AC':['A','C'],'BD':['B','D']},'labels':{n:n for n in points},'dimensions':{'d_AD':{'points':['A','D'],'label':f'{p} cm','side':'auto'},'d_BC':{'points':['B','C'],'label':f'{q} cm','side':'auto'}}}
 # Source-directed port of literal helper shape and withDims(mode0), not JS execution.
 out=render_spec.render_json(json.dumps(sourceSpec));assert 'svg'in out,out
 labels=[''.join(e.itertext()).strip()for e in ET.fromstring(out['svg']).iter()if e.tag.endswith('text')]
 assert 'O'not in sourceSpec['points']and 'O'not in sourceSpec['labels']and 'O'not in labels
 proposed=copy.deepcopy(sourceSpec);mapped=fit({**points,'O':o});assert all(mapped[n]==sourceSpec['points'][n]for n in points);proposed['points']['O']=mapped['O'];proposed['labels']['O']='O'
 candidate=render_spec.render_json(json.dumps(proposed));assert 'svg'in candidate,candidate
 newlabels=[''.join(e.itertext()).strip()for e in ET.fromstring(candidate['svg']).iter()if e.tag.endswith('text')];assert 'O'in newlabels
 records.append({'literalAD_BC':[p,q],'t':str(t),'independentExactIntersection':[str(x)for x in o],'pointOnBothDiagonalsAndEF':True,'sourceDerivedSpecSHA':sha(json.dumps(sourceSpec,sort_keys=True).encode()),'actualRootSVG_SHA':sha(out['svg'].encode()),'renderedLabels':labels,'requiredOAbsent':True,'QAOnlyAddO':{'point':mapped['O'],'oldPointsPreserved':True,'newRootSVG_SHA':sha(candidate['svg'].encode()),'renderedO':True}})
 if [p,q]==[6,12]:
  dump('own-minimal-source-specimen.json',{'inputBasis':'existing literal HARMONIC_PAIRS[0], current mode0 helper port; no new authored task','sourceDerivedSpec':sourceSpec,'QAOnlyAddO':proposed,'actualCurrentRendererOriginalLabels':labels,'expectedReference':'Named O at exact AC∩BD∩EF, label O; not merely an unnamed crossing'})
  (P/'own-minimal-current.svg').write_text(out['svg'],encoding='utf8');(P/'own-minimal-proposed.svg').write_text(candidate['svg'],encoding='utf8')
after={f:sha(Path(f).read_bytes())for f in before};assert before==after
dump('own-after.json',after);dump('own-results.json',{'card':card,'sourceLocations':locations,'helperSourceSHA':sha(helper.encode()),'pendingLedgerExcerpt':progress['pendingM38'],'literalPairCount':10,'currentRootSourceDerivedRenders':10,'currentRootQAProposedRenders':10,'missingOReproduced':10,'results':records,'TSOrActualGeneratorExecution':False,'Node':0,'API':0,'DB':0,'productionEdits':0,'sourceUnchanged':True})
print(json.dumps({'sourceDerivedCases':10,'missingO':10,'QAOnlyAddO':10,'sourceUnchanged':True}))
