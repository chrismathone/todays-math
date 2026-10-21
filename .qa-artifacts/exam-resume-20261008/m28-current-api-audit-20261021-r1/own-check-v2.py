from pathlib import Path
from fractions import Fraction as F
import sys,json,re,math,hashlib,xml.etree.ElementTree as ET
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');sys.path.insert(0,str(R/'vendor/figure-engine'))
from core.figure_scene import compile_figure_spec
from core.figure_quality import sanitize_svg
sha=lambda b:hashlib.sha256(b).hexdigest()
def sub(a,b):return(a[0]-b[0],a[1]-b[1])
def cross(a,b):return a[0]*b[1]-a[1]*b[0]
def angle(p,k):
 i='ABCD'.index(k);u=sub(p['ABCD'[(i-1)%4]],p[k]);v=sub(p['ABCD'[(i+1)%4]],p[k]);return math.degrees(math.atan2(abs(cross(u,v)),sum(a*b for a,b in zip(u,v))))
def numeric_arc(d):
 tok=re.findall(r'[MA]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',d);assert len(tok)==11 and tok[0]=='M' and tok[3]=='A',tok
 sx,sy,rx,ry,phi,large,sweep,ex,ey=map(float,tok[1:3]+tok[4:]);assert rx>0 and rx==ry and phi==0 and large==0 and sweep in [0,1]
 dx=(sx-ex)/2;dy=(sy-ey)/2;den=dx*dx+dy*dy;r=max(rx,math.sqrt(den));coef=(-1 if large==sweep else 1)*math.sqrt(max(0,(r*r-den)/den));cx=(sx+ex)/2+coef*dy;cy=(sy+ey)/2-coef*dx;t0=math.atan2(sy-cy,sx-cx);t1=math.atan2(ey-cy,ex-cx);delta=(t1-t0)%(2*math.pi) if sweep else -((t0-t1)%(2*math.pi));assert 0<abs(delta)<=math.pi+1e-9
 return(cx,cy,r,t0,delta)
def arc_margin(arc,p,a,b):
 cx,cy,r,t0,delta=arc;poly=[p[k] for k in 'ABCD'];orient=1 if sum(cross(poly[i],poly[(i+1)%4]) for i in range(4))>0 else -1;e=sub(b,a);L=math.hypot(*e)
 # signed distance = K + Ucos(t)+Vsin(t); endpoints and all derivative roots suffice.
 U=orient*(-e[1])*r/L;V=orient*e[0]*r/L;tstar=math.atan2(V,U);ts=[t0,t0+delta]
 for t in [tstar,tstar+math.pi]:
  travel=(t-t0)%(2*math.pi) if delta>0 else (t0-t)%(2*math.pi)
  if travel<=abs(delta)+1e-12:ts.append(t0+(travel if delta>0 else -travel))
 return min(orient*cross(e,(cx+r*math.cos(t)-a[0],cy+r*math.sin(t)-a[1]))/L for t in ts)
def svg_check(spec):
 scene=compile_figure_spec(spec);svg=sanitize_svg(scene.render_svg());root=ET.fromstring(svg);trans=scene.resolve().translation;expect={k:(v[0]+trans[0],v[1]+trans[1]) for k,v in spec['points'].items()};vertices={};lines=[e for e in root.iter() if e.tag.split('}')[-1]=='line'];assert len(lines)==4
 for e in lines:
  for x,y in [('x1','y1'),('x2','y2')]:
   pt=(float(e.attrib[x]),float(e.attrib[y]));k=min(expect,key=lambda k:math.dist(pt,expect[k]));assert math.dist(pt,expect[k])<.002
   if k in vertices:assert vertices[k]==pt
   vertices[k]=pt
 paths=[e.attrib['d'] for e in root.iter() if e.tag.split('}')[-1]=='path' and ' A ' in e.attrib.get('d','')];assert len(paths)==2
 labels=[''.join(e.itertext()) for e in root.iter() if e.tag.split('}')[-1]=='text'];assert sorted(labels)==list('ABCD')
 arcs=[]
 for path in paths:
  arc=numeric_arc(path);k=min(['A','C'],key=lambda k:math.dist(arc[:2],vertices[k]));centerError=math.dist(arc[:2],vertices[k]);values=list(map(float,re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',path)));expectedRadius=spec['angles']['ang'+k]['radius'];assert abs(values[2]-expectedRadius)<1e-10;assert abs(math.dist((values[0],values[1]),vertices[k])-expectedRadius)<.08;assert abs(math.dist((values[7],values[8]),vertices[k])-expectedRadius)<.08
  margins={a+b:arc_margin(arc,vertices,vertices[a],vertices[b]) for a,b in zip('ABCD','BCDA')};nonincident={e:v for e,v in margins.items() if k not in e};incident={e:v for e,v in margins.items() if k in e};assert min(nonincident.values())>0
  arcs.append({'vertex':k,'actualSVGPath':path,'actualSVGCircleCenter':arc[:2],'centerErrorFromVertex':centerError,'sweepAngleDeg':math.degrees(abs(arc[4])),'halfplaneMinDistances':margins,'nonincidentMinMargin':min(nonincident.values()),'incidentMinMargin':min(incident.values()),'strictCenterlineContainment':min(margins.values())>=-1e-9})
 assert {a['vertex'] for a in arcs}=={'A','C'}
 return svg,{'svgSHA256':sha(svg.encode()),'arcs':arcs,'allNonincidentSidesContained':True,'strictWholeArcCenterlineContainment':all(a['strictCenterlineContainment'] for a in arcs),'roundedSVGPrecision':'Boundary lines serialized3decimals; arc endpoints1decimal; endpoint-to-center SVG algorithm reconstructed independently, stationary halfplane distances checked analytically, not sampled pixels.'}
def math_check(row):
 text=row['content'];m=re.search(r'\\angle B=\((\d+)x\+(\d+)\)\^\\circ',text);n=re.search(r'\\angle D=\(x\+(\d+)\)\^\\circ',text);assert m and n and r'\angle A=\angle C' in text and r'\angle B=\angle D' in text;p,q,s=int(m[1]),int(m[2]),int(n[1]);assert p!=1;x=F(s-q,p-1);beta=p*x+q;assert beta==x+s and 0<beta<180 and 0<180-beta<180 and x>0
 # Only after solving use produced answer.
 ans=row['answer'];a=re.fullmatch(r'\$(\d+)\$',ans);assert a and F(int(a[1]))==x
 spec=row['figureSpec'];pts=spec['points'];assert set(pts)==set('ABCD');edges=[sub(pts[b],pts[a]) for a,b in zip('ABCD','BCDA')];turns=[cross(edges[i],edges[(i+1)%4]) for i in range(4)];assert all(t<0 for t in turns) or all(t>0 for t in turns);assert all(math.hypot(*e)>0 for e in edges)
 parallelErrors=[]
 for i in [0,1]:
  err=abs(cross(edges[i],edges[i+2]))/(math.hypot(*edges[i])*math.hypot(*edges[i+2]));assert err<.0002;parallelErrors.append(err)
 actual={k:angle(pts,k) for k in 'ABCD'};want={'B':float(beta),'D':float(beta),'A':180-float(beta),'C':180-float(beta)};error=max(abs(actual[k]-want[k]) for k in pts);assert error<.03
 assert spec['segments']=={'AB':['A','B'],'DC':['D','C'],'AD':['A','D'],'BC':['B','C']};assert spec['labels']=={k:k for k in 'ABCD'};assert not spec.get('dimensions');assert set(spec['angles'])=={'angA','angC'}
 for name,k in [('angA','A'),('angC','C')]:
  a=spec['angles'][name];assert a['vertex']==k and a['points']==['B','D'] and a['arcs']==1 and a['radius']>0;assert set(a)=={'vertex','points','arcs','radius'}
 assert spec['angles']['angA']['radius']==spec['angles']['angC']['radius'];return {'independentlySolvedX':str(x),'printedCoefficients':{'p':p,'q':q,'s':s},'printedBD':str(beta),'actualAngles':actual,'angleErrorDeg':error,'parallelCrossErrors':parallelErrors,'convexExists':True,'uniqueExplanation':'p-1 nonzero gives unique linear solution; opposite positive angles sum360 and actual strictly convex vector witness exists. No student trigonometry required.'}
if __name__=='__main__':
 j=json.loads((P/'own-actual-outputs.json').read_text(encoding='utf-8-sig'));cache={};mathrows=[]
 svgdir=P/'own-native-svg';svgdir.mkdir(exist_ok=True)
 for i,row in enumerate(j['rows']):
  assert sha(row['serializedOutput'].encode())==row['outputSHA256'];own=math_check(row);specHash=sha(json.dumps(row['figureSpec'],sort_keys=True,separators=(',',':')).encode())
  if specHash not in cache:
   svg,check=svg_check(row['figureSpec']);(svgdir/f'{specHash}.svg').write_text(svg,encoding='utf-8');cache[specHash]=check
  mathrows.append({'index':i,'cohort':row['cohort'],'seed':row['seed'],'outputSHA256':row['outputSHA256'],'specSHA256':specHash,**own})
 assert len(mathrows)==532;forced=[r for r in mathrows if r['cohort']=='forced432ViaActualAPI'];tuples={(r['independentlySolvedX'],r['printedCoefficients']['p'],r['printedCoefficients']['q']) for r in forced};assert len(tuples)==432
 before=json.loads((P/'own-before.json').read_text(encoding='utf-8'));after={p:sha(Path(p).read_bytes()) for p in before};assert before==after;moduleAfter={p:sha(Path(p).read_bytes()) for p in j['moduleHashesAtFirstImport']};assert moduleAfter==j['moduleHashesAtFirstImport']
 closure={str(Path(m.__file__).resolve()):sha(Path(m.__file__).read_bytes()) for name,m in sys.modules.copy().items() if name.startswith('core.') and getattr(m,'__file__',None)}
 result={'actualAPIRowsChecked':len(mathrows),'allMathPassed':True,'uniqueForcedInputTuples':len(tuples),'distinctPrintedTasks':len({r['content'] for r in j['rows']}),'actualDistinctSVGCompilations':len(cache),'specToNativeSVG':cache,'calculations':mathrows,'hashesAfter':after,'nodeModulesAfter':moduleAfter,'pythonImportedClosure':closure,'nonincidentContainmentAllPassed':all(x['allNonincidentSidesContained'] for x in cache.values()),'strictWholeArcContainmentCount':sum(x['strictWholeArcCenterlineContainment'] for x in cache.values()),'minimumIncidentSignedMargin':min(a['incidentMinMargin'] for x in cache.values() for a in x['arcs']),'minimumNonincidentSignedMargin':min(a['nonincidentMinMargin'] for x in cache.values() for a in x['arcs'])};(P/'own-calculations.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:result[k] for k in ['actualAPIRowsChecked','allMathPassed','actualDistinctSVGCompilations','strictWholeArcContainmentCount','minimumIncidentSignedMargin','minimumNonincidentSignedMargin']}))
