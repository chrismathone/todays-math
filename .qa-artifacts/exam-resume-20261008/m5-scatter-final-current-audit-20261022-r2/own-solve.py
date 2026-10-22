from pathlib import Path
from fractions import Fraction as F
import json,re,hashlib,xml.etree.ElementTree as ET,collections
P=Path(__file__).resolve().parent;A=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-final-20261022-r2')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
dump=lambda n,v:(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
inputfile=A/'student-inputs-sealed.json';sealfile=A/'capture-seal.json';j=json.loads(inputfile.read_text(encoding='utf8'));seal=json.loads(sealfile.read_text(encoding='utf8'));assert sha(inputfile)==seal['studentSHA256']and len(j['rows'])==144
# Reuse only our arithmetic source code, never any previous answer output.
oldcode=P.parent/'m5-scatter-lattice-current-audit-20261022-r1/own-solve.py';source=oldcode.read_text(encoding='utf8');arithmetic=source[source.index(" if typ=='06':"):source.index(" solves.append(")];arithmetic='\n'.join(line[1:]if line.startswith(' ')else line for line in arithmetic.splitlines());compiled=compile(arithmetic,'own-reused-arithmetic','exec')
before={str(p):sha(p)for p in [inputfile,sealfile,oldcode]};solves=[];readbacks=[]
fmt=lambda f:str(f.numerator)if f.denominator==1 else f'{f.numerator}/{f.denominator}'
for row in j['rows']:
 assert not any(k in row for k in ['seed','figureSpec','points','answer','facts'])
 content=row['content'];typ=row['key'].split('|')[-1];f=A/row['svg']['file'];assert sha(f)==row['svg']['sha256'];before[str(f)]=sha(f);root=ET.fromstring(f.read_text(encoding='utf8'))
 ticks=[q for q in root if q.get('data-label')is not None and re.fullmatch(r'-?\d+',q.get('data-label'))]
 xt=sorted([(F(q.get('data-x')),F(q.get('data-label')))for q in ticks if q.get('data-anchor')=='middle']);yt=sorted([(F(q.get('data-y')),F(q.get('data-label')))for q in ticks if q.get('data-anchor')=='end'])
 assert len(xt)>=2 and len(yt)>=2
 def mapping(t):
  (p0,v0),(p1,v1)=t[:2];slope=(v1-v0)/(p1-p0);assert slope
  assert all(v==v0+(p-p0)*slope for p,v in t)
  return lambda p:v0+(p-p0)*slope
 mx,my=mapping(xt),mapping(yt)
 circles=[q for q in root if q.tag.rsplit('}',1)[-1]=='circle'];raw=[(mx(F(q.get('cx'))),my(F(q.get('cy'))))for q in circles]
 assert all(x.denominator==y.denominator==1 for x,y in raw);pts=[[int(x),int(y)]for x,y in raw];n=int(re.search(r'학생 \$(\d+)\$명',content)[1]);assert n==len(pts)==len(set(map(tuple,pts)))and all(0<=x<=100 and 0<=y<=100 for x,y in pts)
 # Grid metadata is a cross-check, not the source of data values.
 gs=[q for q in root if q.get('data-grid')is not None];assert len(gs)==1 and root[0]is gs[0]and len(gs[0])==1
 gx,gy,cx,cy,nx,ny=map(F,gs[0].get('data-grid').split());assert cx==cy>0 and nx.denominator==ny.denominator==1
 assert mx(gx)==min(v for p,v in xt)and mx(gx+nx*cx)==max(v for p,v in xt)and my(gy)==max(v for p,v in yt)and my(gy+ny*cy)==min(v for p,v in yt)
 commands=re.findall(r'M(-?[\d.]+) (-?[\d.]+)([VH])(-?[\d.]+)',gs[0][0].get('d'));expected=[(gx+i*cx,gy,'V',gy+ny*cy)for i in range(int(nx)+1)]+[(gx,gy+i*cy,'H',gx+nx*cx)for i in range(int(ny)+1)];assert [(F(a),F(b),c,F(d))for a,b,c,d in commands]==expected
 subjects=re.search(r'명의 (.+?) 점수\(\$x\$\)와 (.+?) 점수\(\$y\$\)',content);assert subjects
 texts=[''.join(q.itertext())for q in root if q.tag.rsplit('}',1)[-1]=='text'];assert subjects[1]+'(점)'in texts and subjects[2]+'(점)'in texts
 question=content.split('\n')[-1];ev={'recoveredPoints':pts,'n':n};status='solved';exec(compiled)
 solves.append({'id':row['id'],'key':row['key'],'answer':ans,'solution':sol,'status':status,'evidence':ev})
 readbacks.append({'id':row['id'],'SVG_SHA256':sha(f),'xTicks':[[str(p),str(v)]for p,v in xt],'yTicks':[[str(p),str(v)]for p,v in yt],'recoveredPoints':pts,'gridCrossCheck':True,'subjectsMatch':True,'qualitativeYOrder':sorted(pts)if typ=='08'else None})
exposure='Previously reviewed original components, old m3Stat2 answer/facts source, engine identity/grid code and old lattice cohort. Current r2 is student SVG-only; no current private answers or current m3Stat2 code read. No pristine corpus/concept claim.'
dump('own-solutions.json',{'inputSHA256':sha(inputfile),'solverId':'retained-independent-svg-rational-r2','exposure':exposure,'rows':solves});dump('own-readback.json',readbacks)
after={p:sha(Path(p))for p in before};assert before==after
dump('own-report.json',{'inputSHA256':sha(inputfile),'captureSealSHA256':sha(sealfile),'ownSolutionSHA256':sha(P/'own-solutions.json'),'before':before,'after':after,'counts':dict(collections.Counter(r['key']for r in solves)),'solutions':len(solves),'actualSVGReadbacks':len(readbacks),'exposure':exposure,'arithmeticCodeReuseSHA256':sha(oldcode),'limits':['Coordinate recovery uses numeric tick values/data-x/data-y/anchor and circle centers with exact rational affine mapping, not raw spec/points/pixels. Grid path metadata checked independently after recovery.','Qualitative correlation answers describe ordinary rising/falling/no-clear-trend patterns, not Pearson coefficient or exact zero-correlation proofs.','Parent no-prior-overlap claim is recorded in seal, not independently reread against old answer outputs.','No seed/spec/answer/facts supplied; no private read, production change, Node/API/model/DB, new manual-question or whole-grade/rights/native/public approval.']})
print(json.dumps({'solutions':len(solves),'SVGs':len(readbacks),'inputSHA256':sha(inputfile),'solutionSHA256':sha(P/'own-solutions.json'),'reportSHA256':sha(P/'own-report.json')}))
