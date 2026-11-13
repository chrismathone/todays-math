import json,math,re,collections
rows=json.load(open('/tmp/arithmetic-figure-quality/models.json'));issues=[];numeric_counts=collections.Counter();numeric_skipped=[]
def angle(points,k):
 a,b,c=[points[t] for t in k];u=[a[j]-b[j] for j in (0,1)];v=[c[j]-b[j] for j in (0,1)]
 return math.degrees(math.acos(max(-1,min(1,sum(u[j]*v[j] for j in (0,1))/(math.hypot(*u)*math.hypot(*v))))))
def dist(a,b):return math.dist(a,b)
for r in rows:
 m=r['task']['model'];p=m['points'];errors=[]
 for k,v in p.items():
  if any(not math.isfinite(x) for x in v):errors.append('nonfinite')
 for k in m['edges']:
  if dist(p[k[0]],p[k[1]])<1e-8:errors.append('degenerate:'+k)
 for group in m.get('equal',[]):
  ds=[dist(p[k[0]],p[k[1]]) for k in group]
  if max(ds)-min(ds)>1e-6*max(ds):errors.append('unequal:'+','.join(group))
 for group in m.get('parallel',[]):
  a,b=p[group[0][0]],p[group[0][1]];u=[b[i]-a[i] for i in (0,1)]
  for k in group[1:]:
   a,b=p[k[0]],p[k[1]];v=[b[i]-a[i] for i in (0,1)]
   if abs(u[0]*v[1]-u[1]*v[0])>1e-6*math.hypot(*u)*math.hypot(*v):errors.append('nonparallel:'+k)
 for k in m.get('right',[]):
  a,b,c=[p[x] for x in k];u=[a[i]-b[i] for i in (0,1)];v=[c[i]-b[i] for i in (0,1)]
  if abs(sum(u[i]*v[i] for i in (0,1)))>1e-6*dist(a,b)*dist(b,c):errors.append('nonright:'+k)
 givens=[]
 for match in re.finditer(r'(?<![A-Z+])([A-Z]{2})(?:=([A-Z]{2}))?=(\d+) cm(?!²)',r['task']['text']):
  for k in match.group(1,2):
   if k:givens.append((k,int(match[3]),int(match[3])/dist(p[k[0]],p[k[1]])))
 if givens and max(g[2] for g in givens)-min(g[2] for g in givens)>1e-6*max(g[2] for g in givens):errors.append('given-ratio:'+','.join(g[0] for g in givens))
 for k,value in re.findall(r'∠([A-Z]{3})=(\d+)°',r['task']['text']):
  numeric_counts['publicAngles']+=1
  if abs(angle(p,k)-int(value))>1e-6:errors.append('public-angle:'+k)
 task=r['task'];target=task.get('target','');scalar=task.get('value');checked_target=False
 if scalar:
  value=scalar['n']/scalar.get('d',1)*math.sqrt(scalar.get('root',1))
  if re.fullmatch(r'∠[A-Z]{3}',target):
   numeric_counts['targetAngles']+=1;checked_target=True
   if abs(angle(p,target[1:])-value)>1e-6:errors.append('target-angle:'+target)
  segment=re.fullmatch(r'(?:높이 )?([A-Z]{2})의 길이',target)
  key=segment[1] if segment else 'OB' if target=='외접원 반지름' else None
  if key and givens:
   numeric_counts['targetLengths']+=1;checked_target=True;scale=sum(g[2] for g in givens)/len(givens)
   if abs(dist(p[key[0]],p[key[1]])*scale-value)>1e-6*max(1,abs(value)):errors.append('target-length:'+key)
  area=re.search(r'(?:삼각형 |△)([A-Z]{3})의 넓이',target)
  if area and givens:
   numeric_counts['targetAreas']+=1;checked_target=True;scale=sum(g[2] for g in givens)/len(givens);A,B,C=[p[k] for k in area[1]]
   actual=abs((B[0]-A[0])*(C[1]-A[1])-(B[1]-A[1])*(C[0]-A[0]))*scale*scale/2
   if abs(actual-value)>1e-6*max(1,abs(value)):errors.append('target-area:'+area[1])
 if not checked_target:numeric_skipped.append({'id':r['id'],'target':target,'reason':'no supported direct numeric target/scale in this coordinate check; catalog relation verification and other invariants apply'})
 if errors:issues.append({'id':r['id'],'family':r['family'],'errors':errors})
out='docs/planning/tracks/reports/arithmetic-figure-quality-20261112/triangle-invariants.json'
json.dump({'modelsChecked':len(rows),'failures':issues,'numericChecks':dict(numeric_counts),'numericTargetUnreviewed':numeric_skipped,'checks':['finite points','nonzero edges','equal groups','parallel groups','right angles','uniform public given length ratios']},open(out,'w'),indent=2)
print({'modelsChecked':len(rows),'failures':len(issues)})
raise SystemExit(bool(issues))
