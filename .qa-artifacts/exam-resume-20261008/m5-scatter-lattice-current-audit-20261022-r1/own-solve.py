from pathlib import Path
from fractions import Fraction as F
import json,re,hashlib,xml.etree.ElementTree as ET,collections
P=Path(__file__).resolve().parent;A=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008/.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/m5-scatter-lattice-20261022-r1')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
dump=lambda n,v:(P/n).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
(P/'own-probe.txt').write_text('UTF8 독립 학생입력 계산\n',encoding='utf8')
inputfile=A/'student-inputs-sealed.json';sealfile=A/'capture-seal.json';j=json.loads(inputfile.read_text(encoding='utf8'));seal=json.loads(sealfile.read_text(encoding='utf8'));assert sha(inputfile)==seal['studentSHA256'];assert len(j['rows'])==144
before={str(inputfile):sha(inputfile),str(sealfile):sha(sealfile)}
solves=[];svgchecks=[]
fmt=lambda f:str(f.numerator)if f.denominator==1 else f'{f.numerator}/{f.denominator}'
for row in j['rows']:
 content=row['content'];s=row['figureSpec'];typ=row['key'].split('|')[-1]
 pts=[list(map(int,p))for p in re.findall(r'\$\((\d+),\s*(\d+)\)\$',content)];assert pts==s['points'];n=int(re.search(r'학생 \$(\d+)\$명',content)[1]);assert n==len(pts)and len(set(map(tuple,pts)))==n
 assert all(0<=x<=100 and 0<=y<=100 for x,y in pts)
 subjects=re.search(r'명의 (.+?) 점수\(\$x\$\)와 (.+?) 점수\(\$y\$\)',content);assert subjects
 assert s['xLabel']==subjects[1]+'(점)'and s['yLabel']==subjects[2]+'(점)'
 question=content.split('\n')[-1];ev={'pointsFromContent':pts,'n':n};status='solved'
 if typ=='06':
  t=int(re.search(r'\$(\d+)\$점 이상',question)[1]);hit=[p for p in pts if p[0]>=t];ans=str(len(hit))+'명';sol=f'x가 {t} 이상인 점 {hit}를 세면 {len(hit)}명이다.';ev.update(threshold=t,selected=hit)
 elif typ=='07':
  hit=[p for p in pts if p[0]>p[1]];ans=str(len(hit))+'명';sol=f'각 점에서 첫째 점수가 둘째 점수보다 큰지 비교한다. 해당 점은 {hit}이므로 {len(hit)}명이다.';ev['selected']=hit
 elif typ=='08':
  ordered=sorted(pts);ys=[p[1]for p in ordered]
  if all(a<b for a,b in zip(ys,ys[1:])):ans='양의 상관관계';sol='가로 값이 커질수록 세로 값도 커지므로 양의 상관관계이다.'
  elif all(a>b for a,b in zip(ys,ys[1:])):ans='음의 상관관계';sol='가로 값이 커질수록 세로 값은 작아지므로 음의 상관관계이다.'
  else:ans='상관관계가 없다';sol='가로 순서대로 세로 값을 보면 큰 값과 작은 값이 번갈아 나타나며, 전체적으로 올라가거나 내려가는 뚜렷한 경향이 없다. 따라서 중학교의 정성적 분류에서는 상관관계가 없다고 본다.'
  ev.update(xOrderedY=ys,limitation='Qualitative trend judgment, not zero numerical correlation or a mathematically forced unique numerical classification. No coefficient used.')
 elif typ=='09':
  t=int(re.search(r'\$(\d+)\$점 이상',question)[1]);sums=[x+y for x,y in pts];hit=[p for p,v in zip(pts,sums)if v>=t];ans=str(len(hit))+'명';sol=f'두 점수의 합은 {sums}이다. {t} 이상인 합이 {len(hit)}개이므로 {ans}이다.';ev.update(threshold=t,sums=sums,selected=hit)
 elif typ=='10':
  total=sum(x for x,y in pts);v=F(total,n);ans=fmt(v)+'점';sol=f'첫째 점수의 합 {total}을 학생 수 {n}으로 나누면 {fmt(v)}점이다.';ev.update(sum=total,denominator=n)
 elif typ=='11':
  top=max(y for x,y in pts);hit=[p for p in pts if p[1]==top];assert len(hit)==1;ans=str(hit[0][0])+'점';sol=f'둘째 점수가 가장 높은 점은 {hit[0]} 하나이다. 이 학생의 첫째 점수는 {ans}이다.';ev.update(maxY=top,selected=hit)
 elif typ=='12':
  t=int(re.search(r'\$(\d+)\$점 이상',question)[1]);hit=[p for p in pts if p[0]>=t and p[1]>=t];v=F(len(hit)*100,n);ans=fmt(v)+'%';sol=f'두 점수가 모두 {t} 이상인 학생은 {len(hit)}명이다. 전체 {n}명에 대한 비율은 {len(hit)}/{n}×100={fmt(v)}%이다.';ev.update(threshold=t,selected=hit,denominator=n)
 elif typ=='14':
  gaps=[abs(x-y)for x,y in pts];v=max(gaps);assert gaps.count(v)==1;ans=str(v)+'점';sol=f'각 학생의 큰 점수에서 작은 점수를 빼면 {gaps}이다. 가장 큰 차는 {v}점이며 해당 학생은 한 명이다.';ev['differences']=gaps
 elif typ=='15':
  t=int(re.search(r'\$(\d+)\$점 이상',question)[1]);hit=[p for p in pts if p[0]>=t];assert hit;total=sum(y for x,y in hit);v=F(total,len(hit));ans=fmt(v)+'점';sol=f'첫째 점수가 {t} 이상인 점은 {hit}이다. 이들의 둘째 점수 합 {total}을 인원 {len(hit)}로 나누면 {fmt(v)}점이다.';ev.update(threshold=t,selected=hit,sum=total,denominator=len(hit))
 else:raise AssertionError(typ)
 solves.append({'id':row['id'],'key':row['key'],'studentRowSHA256':hashlib.sha256(json.dumps(row,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'answer':ans,'solution':sol,'status':status,'evidence':ev})
 if row.get('svg'):
  f=A/row['svg']['file'];before[str(f)]=sha(f);assert sha(f)==row['svg']['sha256'];root=ET.fromstring(f.read_text(encoding='utf8'));g=[n for n in root if n.get('data-grid')is not None];assert len(g)==1 and root[0]is g[0]and len(g[0])==1
  x,y,cx,cy,nx,ny=map(F,g[0].get('data-grid').split());assert cx==cy and nx==F(s['xMax']-s['xMin'],5)and ny==F(s['yMax']-s['yMin'],5)
  path=g[0][0].get('d');commands=re.findall(r'M(-?[\d.]+) (-?[\d.]+)([VH])(-?[\d.]+)',path)
  expected=[(x+i*cx,y,'V',y+ny*cy)for i in range(int(nx)+1)]+[(x,y+i*cy,'H',x+nx*cx)for i in range(int(ny)+1)]
  assert [(F(a),F(b),c,F(d))for a,b,c,d in commands]==expected
  circles=[q for q in root if q.tag.rsplit('}',1)[-1]=='circle'];readback=[(F(s['xMin'])+(F(q.get('cx'))-x)/cx*5,F(s['yMax'])-(F(q.get('cy'))-y)/cy*5)for q in circles];assert readback==list(map(tuple,pts))
  texts=[''.join(q.itertext())for q in root if q.tag.rsplit('}',1)[-1]=='text'];assert s['xLabel']in texts and s['yLabel']in texts
  majors=[q.get('data-label')for q in root if q.get('data-label')is not None];assert majors==[str(v)for v in range(s['xMin'],s['xMax']+1,s['xStep'])]+[str(v)for v in range(s['yMin'],s['yMax']+1,s['yStep'])]
  svgchecks.append({'id':row['id'],'sha256':sha(f),'pointCount':len(circles),'rationalReadbackExact':True,'singlePathSquareGrid':True,'subjectAndMajorLabelsMatch':True})
assert len(svgchecks)==36
exposure={'priorExposure':'Original source/component reviews, prior m3Stat2 source including old answer/facts implementations, public engine and grid/identity audits are known. Not pristine concept/corpus blindness. Current lattice private answers and current m3Stat2 answer/facts code were not read in this scope before sealing.','method':'Own arithmetic from printed content and points; no generator answer/facts oracle, correlation coefficient, trig or 2D-distance method.','limits':'Technical prototype audit, no 144 manual-question/whole-grade/rights/public/native approvals. Qualitative no-correlation is an ordinary trend description, not exact zero-correlation proof. CJK font measurement/visual approval not performed.'}
dump('own-solutions.json',{'inputSHA256':sha(inputfile),'solverId':'retained-independent-python-lattice-r1','exposure':exposure,'rows':solves});dump('own-svg-checks.json',svgchecks)
assert before=={p:sha(Path(p))for p in before};dump('own-bindings.json',{'before':before,'after':before,'ownSolutionSHA256':sha(P/'own-solutions.json'),'countsByType':dict(collections.Counter(r['key']for r in solves)),'solutions':144,'actualSVGReadbacks':36,'privateRead':False,'NodeAPIModelDB':0})
print(json.dumps({'inputSHA256':sha(inputfile),'solutionSHA256':sha(P/'own-solutions.json'),'rows':len(solves),'SVGs':len(svgchecks)}))
