from pathlib import Path
import hashlib,json,difflib,math,re,itertools
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');src=R/'src/lib/middle/m2Quad.ts';old=R/'.qa-artifacts/exam-resume-20261008/m28-m31-source-prechange-20261021-r1/own-report.json';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();baseline=src.read_text(encoding='utf-8-sig');assert sha(src)=='baa7eb6130d5a6aeb540a3b803ec219d4ea436aade22346cab49812b5baa168e';(P/'own-before.json').write_text(json.dumps({str(src):sha(src),str(old):sha(old)},indent=2),encoding='utf-8');q=P/'own-utf8-probe.txt';q.write_text('조건→좌표: ∠A=∠C, ∠B=∠D\n',encoding='utf-8');assert '∠B' in q.read_text(encoding='utf-8')
start=baseline.index('function figCondAngles(');end=baseline.index('\n/**',start);original=baseline[start:end]
header='''function figCondAngles(w: number, h: number, slant: number, angleBDeg?: number): Fig {
  // Engine-only coordinates; no evaluated angle/answer is added to student labels.
  if (angleBDeg !== undefined && (!Number.isFinite(angleBDeg) || angleBDeg <= 0 || angleBDeg >= 180)) {
    throw new Error("조건 각은 0도와 180도 사이여야 합니다");
  }
  const theta = angleBDeg === undefined ? undefined : angleBDeg * Math.PI / 180;
  const leg = Math.hypot(h, slant);
  const pts = theta === undefined
    ? quadPts(w, h, slant)
    : quadPts(w, leg * Math.sin(theta), leg * Math.cos(theta));'''
replacement=original.replace('function figCondAngles(w: number, h: number, slant: number): Fig {\n  const pts = quadPts(w, h, slant);',header);assert replacement!=original
candidate=baseline[:start]+replacement+baseline[end:];assert candidate.count('figureSpec: figCondAngles(150, 92, 40),')==2
candidate=candidate[:candidate.rfind('figureSpec: figCondAngles(150, 92, 40),')]+candidate[candidate.rfind('figureSpec: figCondAngles(150, 92, 40),'):].replace('figureSpec: figCondAngles(150, 92, 40),','// Solve the printed B=D relation for its angle, without changing the RNG or task.\n      figureSpec: figCondAngles(150, 92, 40, (p * s - q) / (p - 1)),')
(P/'own-m2Quad.ts').write_text(candidate,encoding='utf-8');(P/'own-candidate.patch').write_text(''.join(difflib.unified_diff(baseline.splitlines(True),candidate.splitlines(True),fromfile='a/src/lib/middle/m2Quad.ts',tofile='b/src/lib/middle/m2Quad.ts')),encoding='utf-8')
# Byte source binding: remove precisely these two changes to recover complete baseline.
recovered=candidate.replace(replacement,original).replace('// Solve the printed B=D relation for its angle, without changing the RNG or task.\n      figureSpec: figCondAngles(150, 92, 40, (p * s - q) / (p - 1)),','figureSpec: figCondAngles(150, 92, 40),');assert recovered==baseline
# Exact source ranges, not seed incidence. Source reads establish all3intBetween calls.
block=baseline[baseline.index('  def("15A",'):baseline.index('  def(\n    "16A"')]
assert re.findall(r'intBetween\(rng, (\d+), (\d+)\)',block)==[('4','15'),('2','4'),('1','12')]
assert re.findall(r'intBetween\(rng, [^)]+\)',candidate[candidate.index('  def("15A",'):candidate.index('  def(\n    "16A"')])==re.findall(r'intBetween\(rng, [^)]+\)',block)

def pts(beta):
 theta=math.radians(beta);L=math.hypot(92,40);h=L*math.sin(theta);t=L*math.cos(theta);return {'A':(t,h),'B':(0.,0.),'C':(150.,0.),'D':(150+t,h)}
def fit(p):
 xs=[v[0] for v in p.values()];ys=[v[1] for v in p.values()];s=min(184/(max(xs)-min(xs)),154/(max(ys)-min(ys)));raw={k:(18+(x-min(xs))*s,172-(y-min(ys))*s) for k,(x,y) in p.items()}
 # JS Math.round for these positive output coordinates, not Python bankers rounding.
 rounded={k:tuple(math.floor(v*100+.5)/100 for v in q) for k,q in raw.items()};return raw,rounded,s

def vec(a,b):return (b[0]-a[0],b[1]-a[1])
def cross(u,v):return u[0]*v[1]-u[1]*v[0]
def angle(p,k):
 keys='ABCD';i=keys.index(k);u=vec(p[k],p[keys[(i-1)%4]]);v=vec(p[k],p[keys[(i+1)%4]]);return math.degrees(math.atan2(abs(cross(u,v)),u[0]*v[0]+u[1]*v[1]))
rows=[]
for x,p,q in itertools.product(range(4,16),range(2,5),range(1,13)):
 s=(p-1)*x+q;beta=(p*s-q)/(p-1);assert beta==p*x+q==x+s and 9<=beta<=72
 geometry=pts(beta);raw,rnd,scale=fit(geometry);expected={'A':180-beta,'B':beta,'C':180-beta,'D':beta};pre={k:angle(geometry,k) for k in geometry};post={k:angle(rnd,k) for k in geometry}
 assert all(abs(pre[k]-expected[k])<1e-10 for k in geometry);assert all(abs(post[k]-expected[k])<.03 for k in geometry)
 edges=[vec(geometry[k],geometry['ABCD'[(i+1)%4]]) for i,k in enumerate('ABCD')];turns=[cross(edges[i],edges[(i+1)%4]) for i in range(4)];assert all(v>0 for v in turns) or all(v<0 for v in turns)
 assert abs(cross(edges[0],edges[2]))<1e-9 and abs(cross(edges[1],edges[3]))<1e-9;assert abs(sum(pre.values())-360)<1e-9
 rows.append({'x':x,'p':p,'q':q,'s':s,'printedBD':beta,'expectedAC':180-beta,'preFitPoints':geometry,'actualFitRoundedPoints':rnd,'fitScale':scale,'roundedAngles':post,'maxRoundingAngleErrorDeg':max(abs(post[k]-expected[k]) for k in geometry),'minimumFittedVerticalSpan':max(v[1] for v in rnd.values())-min(v[1] for v in rnd.values())})
fixed=math.degrees(math.atan2(92,40));assert len(rows)==432
r={'literalDomainTuples':len(rows),'allPassed':True,'distinctBDValues':len({r['printedBD'] for r in rows}),'minBD':min(r['printedBD'] for r in rows),'maxBD':max(r['printedBD'] for r in rows),'oldFixedBD':fixed,'oldMinMismatchDeg':min(abs(r['printedBD']-fixed) for r in rows),'oldMaxMismatchDeg':max(abs(r['printedBD']-fixed) for r in rows),'newMaxRoundedAngleErrorDeg':max(r['maxRoundingAngleErrorDeg'] for r in rows),'smallestFittedVerticalSpan':min(r['minimumFittedVerticalSpan'] for r in rows),'rows':rows,'sourceReconstructionExact':True,'rng3CallsAndRangesUnchanged':True,'remainingFigureObjectExact':original[original.index('  return {'):]==replacement[replacement.index('  return {'):],'candidateSHA256':sha(P/'own-m2Quad.ts')};assert r['remainingFigureObjectExact'];(P/'own-calculations.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in r.items() if k!='rows'},ensure_ascii=True))
