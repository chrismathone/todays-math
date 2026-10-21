from pathlib import Path
import json,hashlib,math
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');D=Path('D:/math-figure-editor/docs/export/todays-math/reference');sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
paths=[R/'src/lib/dev-ai/figure-comparison.ts',R/'src/lib/dev-ai/figure-engine.ts',R/'package.json',R/'src/lib/dev-ai/figure-prompt.ts',D/'gridMeasure.ts',D/'comparison.ts',Path('.agents/skills/typesafe-ai/SKILL.md')];before={str(x):sha(x) for x in paths};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');probe=P/'own-write-probe.txt';probe.write_text('순수 회색 배열 측정 제안·불명은 승인 아님\n',encoding='utf-8');assert '불명' in probe.read_text(encoding='utf-8')
F=P/'own-fixtures';F.mkdir(exist_ok=True);cases=[]
def lines(name,segments,expected,details):
 w=h=100;data=bytearray([255])*(w*h)
 for x1,y1,x2,y2 in segments:
  steps=max(abs(x2-x1),abs(y2-y1),1)
  for k in range(steps+1):
   x=round(x1+(x2-x1)*k/steps);y=round(y1+(y2-y1)*k/steps)
   if 0<=x<w and 0<=y<h:data[y*w+x]=80
 path=F/(name+'.gray');path.write_bytes(data);cases.append({'id':name,'width':w,'height':h,'grayFile':'own-fixtures/'+path.name,'graySHA256':sha(path),'expected':expected,'details':details})
grid=[(x,10,x,90) for x in range(10,91,10)]+[(10,y,90,y) for y in range(10,91,10)]
lines('white',[],'null','No evidence')
lines('explicit-grid',grid,'advisory-grid','Known drawn9lines each way =>8cells; no mathematical answer')
lines('table-identical',grid,'advisory-grid','Identical bytes to grid; semantics cannot be inferred from pixels')
lines('parallel-lines',grid[:9],'null','Only one direction')
lines('missing-line',[s for s in grid if s!=(50,10,50,90)],'null','Conservative no inferred missing line')
lines('half-cropped',[(x-10,y1,x2-10,y2) for x,y1,x2,y2 in grid],'null','First line on analysis crop edge')
lines('cuboid',[(20,30,60,30),(60,30,60,70),(60,70,20,70),(20,70,20,30),(20,30,40,10),(40,10,80,10),(80,10,60,30),(80,10,80,50),(80,50,60,70)],'null','Simple cuboid projection, not grid')
lines('letter-H',[(30,20,30,80),(70,20,70,80),(30,50,70,50)],'null','Text-like strokes insufficient lattice')
for id,field,value in [('width-zero','width',0),('width-neg','width',-1),('width-float','width',1.5),('width-nan','width','NaN'),('width-inf','width','Infinity'),('width-bool','width',True),('width-oversize','width',1401),('height-zero','height',0),('height-oversize','height',1401)]:cases.append({'id':id,'width':100,'height':100,field:value,'grayMode':'empty','expected':'null'})
for mode in ['short','long','sparse','oversize-sparse','fake-arraylike','undefined','string'] :cases.append({'id':'gray-'+mode,'width':100,'height':100,'grayMode':mode,'expected':'null'})
for value in [-1,256,1.5,'NaN','Infinity',None,True,'7']:cases.append({'id':'gray-value-'+str(value),'width':100,'height':100,'grayMode':'override','value':value,'expected':'null'})
# Independent fixture identity/domain checks, NOT execution of candidate TS.
assert (F/'explicit-grid.gray').read_bytes()==(F/'table-identical.gray').read_bytes()
assert len((F/'explicit-grid.gray').read_bytes())==10000
assert all(v==255 for v in (F/'white.gray').read_bytes())
assert len(range(10,91,10))-1==8
manifest={'fixtureCount':len(cases),'coordinateSpace':'analysis pixels x-right,y-down; raw bytes row-major unsigned8','cases':cases,'specialNumberEncoding':['NaN','Infinity'],'candidateRuntimeExecuted':False};(P/'own-fixture-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
receipt={'stdlibFixtureChecks':4,'passed':4,'notTSControls':True,'fixtureCount':len(cases),'candidateSHA256':sha(P/'own-gridMeasure.ts'),'originalAndTableSameHash':sha(F/'explicit-grid.gray'),'before':before,'after':{str(x):sha(x) for x in paths},'candidateNodeTypecheckOrExecution':False,'RootSourceWrites':False};(P/'own-fixture-receipt.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8');print(json.dumps({'fixtures':len(cases),'stdlibChecks':4,'candidateRuntime':'NOT_RUN'}))
