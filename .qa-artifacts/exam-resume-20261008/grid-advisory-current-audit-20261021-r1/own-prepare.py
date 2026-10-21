from pathlib import Path
from fractions import Fraction as F
import hashlib,json,base64
P=Path(__file__).resolve().parent
R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,v): (P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2),encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 · 모눈 추정은 승인 아님\n',encoding='utf8')
assert '모눈' in (P/'own-probe.txt').read_text(encoding='utf8')
files=[R/p for p in ['src/lib/figure/gridMeasure.ts','src/lib/dev-ai/figure-comparison.ts','src/lib/dev-ai/figure-prompt.ts','src/lib/dev-ai/figure-engine.ts','src/lib/dev-ai/cli-process.ts','src/lib/dev-ai/svg.ts','package.json','tsconfig.json']]
before={str(f):sha(f.read_bytes()) for f in files}
dump('own-preparation-before.json',before)
fixtures=[]
def image(name,w,h,xs=(),ys=(),expected='null',role='synthetic',draw=None):
    data=bytearray([255])*(w*h)
    for y in range(h):
        for x in range(w):
            if (x in xs and min(ys,default=0)<=y<=max(ys,default=h-1)) or (y in ys and min(xs,default=0)<=x<=max(xs,default=w-1)) or (draw and draw(x,y)):data[y*w+x]=0
    fixtures.append({'id':name,'width':w,'height':h,'grayBase64':base64.b64encode(data).decode(),'graySHA256':sha(data),'expected':expected,'role':role})
lines=list(range(10,91,10))
image('white',101,101)
image('explicit-square-grid',101,101,lines,lines,'grid')
image('pixel-identical-table',101,101,lines,lines,'grid','semantic ambiguity: identical bytes, NOT semantic graph-paper approval')
image('horizontal-parallels-only',101,101,[],lines)
image('vertical-parallels-only',101,101,lines,[])
image('missing-one-line',101,101,[x for x in lines if x!=50],lines)
image('cropped-left-boundary',101,101,list(range(0,91,10)),lines)
image('unequal-cells',101,101,lines,list(range(10,91,20)))
image('three-lines-insufficient',101,101,[10,50,90],[10,50,90])
image('textlike-diagonals',101,101,draw=lambda x,y:abs(x-y)<1 or abs(x+y-100)<1)
image('box-not-grid',101,101,[10,90],[10,90])
image('sixty-cells-boundary',257,257,list(range(8,249,4)),list(range(8,249,4)),'grid')
image('sixtyone-cells-reject',261,261,list(range(8,253,4)),list(range(8,253,4)))
image('dark-background',101,101,draw=lambda x,y:True)
coords=[]
for nw,nh in [(1200,600),(600,1200),(900,900),(1600,901),(901,1600),(1,1)]:
    scale=min(F(1),F(900,max(nw,nh)))
    # JS Math.round positive tie direction, rather than Python banker's round.
    rnd=lambda v:(v.numerator*2//v.denominator+1)//2
    w,h=max(1,rnd(nw*scale)),max(1,rnd(nh*scale))
    fit=min(F(820,nw),F(820,nh));left=40+(820-nw*fit)/2;top=40+(820-nh*fit)/2
    coords.append({'natural':[nw,nh],'analysis':[w,h],'left':str(left),'top':str(top),'fit':str(fit),'sx':str(F(nw,w)*fit),'sy':str(F(nh,h)*fit),'panelBottomRight':[str(left+nw*fit),str(top+nh*fit)]})
dump('own-fixtures.json',{'gray':fixtures,'containCoordinates':coords,'fixtureMeaning':'Independent synthetic bytes, no original images/questions. Table and graph indistinguishable on purpose.'})
assert fixtures[1]['graySHA256']==fixtures[2]['graySHA256']
assert len(lines)-1==8
assert all(F(c['left'])>=40 and F(c['top'])>=40 for c in coords)
assert all(F(c['panelBottomRight'][0])<=860 and F(c['panelBottomRight'][1])<=860 for c in coords)
after={str(f):sha(f.read_bytes()) for f in files};assert before==after
dump('own-preparation-after.json',after)
dump('own-preparation-receipt.json',{'PythonExecuted':True,'NodeExecuted':False,'browserExecuted':False,'grayFixturesPrepared':len(fixtures),'rationalCoordinateCasesComputed':len(coords),'pixelIdenticalSemanticCounterexample':True,'sourceUnchangedDuringPreparation':True,'go':False})
print(json.dumps({'preparedGray':len(fixtures),'rationalCoordinates':len(coords),'Node':0}))
