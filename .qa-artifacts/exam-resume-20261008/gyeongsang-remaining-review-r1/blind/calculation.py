"""Fresh GF15 independent mathematics; reads supplied student JSON/SVGs only."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,re,hashlib
import sympy as S
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,rationalize
R=Path(__file__).resolve().parent;inp=R/'student-problems.json';qs=json.loads(inp.read_text(encoding='utf-8'));Q=S.Rational;rt=S.sqrt
assert [q['questionNumber'] for q in qs]==list(range(1,10))+list(range(16,22))
def maths(t):return re.findall(r'\$([^$]+)\$',t)
def tex(s):
 s=s.replace(r'\left','').replace(r'\right','').replace(r'\,','').replace(r'\ ','').replace(' ','').replace(r'^\circ','')
 s=re.sub(r'\\(?:mathrm|text)(?:\{[^}]*\}|[A-Za-z]+)(?:\^\{?\d+\}?)?','',s)
 def atom(t,i):
  if t[i]!='{':return t[i],i+1
  level=1;j=i+1
  while level:
   if t[j]=='{':level+=1
   elif t[j]=='}':level-=1
   j+=1
  return t[i+1:j-1],j
 for cmd in ['\\dfrac','\\frac']:
  while cmd in s:
   i=s.rindex(cmd);a,j=atom(s,i+len(cmd));b,k=atom(s,j);s=s[:i]+f'(({a})/({b}))'+s[k:]
 while '\\sqrt' in s:
  i=s.rindex('\\sqrt');a,j=atom(s,i+5);s=s[:i]+f'sqrt({a})'+s[j:]
 s=s.replace('^','**').replace('{','(').replace('}',')')
 return parse_expr(s,local_dict={'sqrt':rt},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def scalar(c):return tex(maths(c)[0])
def pair(c):v=scalar(c);return tuple(v)
def eq(a,b):
 if isinstance(a,(tuple,list)) or isinstance(b,(tuple,list)):return len(a)==len(b) and all(eq(u,v) for u,v in zip(a,b))
 return S.simplify(a-b)==0
def tables(q):
 rows=[]
 for l in q['content'].splitlines():
  if l.startswith('|') and not re.fullmatch(r'\|[\s:|\-]+\|',l):rows.append([c.strip() for c in l.strip().strip('|').split('|')])
 return rows
def numericCell(c):return tex(maths(c)[0])
def roundedPositive(v,places):return S.floor(v*10**places+Q(1,2))/10**places
def pointLength(p,q):return S.sqrt(sum((u-v)**2 for u,v in zip(p,q)))
def polygonArea(points):return S.simplify(abs(sum(p[0]*q[1]-q[0]*p[1] for p,q in zip(points,points[1:]+points[:1])))/2)
out=[]
for q in qs:
 n=q['questionNumber'];mt=maths(q['content']);tab=tables(q);e={};holds=[];unit=None
 if n==1:
  hyp=numericCell(tab[1][1]);ratio=numericCell(tab[2][1]);assert hyp==25 and ratio==Q(7,25)
  target=hyp*ratio;adj=rt(hyp**2-target**2);assert target>0 and adj>0
  e={'hypotenuseFromTable':hyp,'sinPFromTable':ratio,'oppositeQR':target,'adjacentPR':adj,'rightTriangleExistence':[target,adj,hyp],'definition':'sinP=QR/PQ'};unit='cm'
 elif n==2:
  hyp=numericCell(tab[1][1]);ratio=numericCell(tab[2][1]);assert hyp==20 and ratio==Q(4,5)
  target=hyp*ratio;b=rt(hyp**2-target**2);assert target>0 and b>0
  e={'hypotenuseFromTable':hyp,'cosQPRFromTable':ratio,'a':target,'b':b,'positiveCoordinateExistence':{'R':[0,0],'P':[target,0],'Q':[0,b]},'definition':'cosQPR=PR/PQ=a/20;no inverse trig needed'}
 elif n==3:
  vals=[tex(v.split('=')[1]) for v in mt if v.startswith(r'\overline') and '=' in v];assert vals==[13,10];hyp,adj=vals
  opp=rt(hyp**2-adj**2);target=(opp,opp/adj);assert opp>0
  e={'hypotenuse':hyp,'adjacentPR':adj,'oppositeQRSquared':hyp**2-adj**2,'positiveQR':opp,'tanP':opp/adj,'lengthAndDimensionlessOrderChecked':True};unit=['cm',None]
 elif n==4:
  recorded=[numericCell(c) for c in tab[-1][1:]];assert recorded==[Q('6.4279'),Q('7.6604'),Q('8.3910')]
  radius=tex(mt[0]);assert radius==10;unrounded=(recorded[1]/radius,recorded[2]/radius);target=tuple(roundedPositive(v,4) for v in unrounded)
  trueLengths=[10*S.sin(40*S.pi/180),10*S.cos(40*S.pi/180),10*S.tan(40*S.pi/180)];assert [roundedPositive(S.N(v,35),4) for v in trueLengths]==recorded
  e={'radiusFromStudent':radius,'PH_OH_ADRecorded':recorded,'ratioBeforeOutputRounding':unrounded,'targetFourDecimals':target,'method':'actual triangles OPH/ODA:cos=OH/OP,tan=AD/OA;divide each record by10 then round4','supplementalCalculatorOnly':{'trueLengthN35':[str(S.N(v,35)) for v in trueLengths],'givenLengthRoundingVerified':True},'notRadianStudentMethod':True};unit=[None,None]
 elif n==5:
  angles=[numericCell(c) for c in tab[0][1:]];sins=[numericCell(c) for c in tab[1][1:]];cos=[numericCell(c) for c in tab[2][1:]];assert angles==[31,32,33,34]
  ga=sins[0]+cos[3];na=sins[1]+cos[2];target=ga-na
  e={'givenAngles':angles,'givenSinRecords':sins,'givenCosRecords':cos,'ga':ga,'na':na,'orderedDifferenceGaMinusNa':target,'integerTenThousandths':[int(10000*ga),int(10000*na),int(10000*target)],'tableNotTrueUnroundedValuesIsInput':True}
 elif n==6:
  angles=[numericCell(c) for c in tab[0][1:]];cos=[numericCell(c) for c in tab[1][1:]];tan=[numericCell(c) for c in tab[2][1:]];assert angles==[37,38,39,40]
  matchesX=[a for a,t in zip(angles,tan) if t==Q('0.7813')];matchesY=[a for a,t in zip(angles,cos) if t==Q('0.7771')];assert matchesX==[38] and matchesY==[39];target=matchesY[0]-matchesX[0]
  e={'givenAngles':angles,'givenCosRecords':cos,'givenTanRecords':tan,'uniqueTableX':matchesX,'uniqueTableY':matchesY,'difference':target,'domain':'x,y are numbers in the4 displayed angle columns,not arbitrary angle roots'}
 elif n==7:
  hyp=tex(next(v.split('=')[1] for v in mt if v.startswith(r'\overline{PQ}') and '=' in v));assert hyp==12*rt(2)
  legs=hyp*rt(2)/2;target=S.simplify(2*legs-hyp);assert legs>0 and target>0
  e={'hypotenuse':hyp,'bothLegsBy45DegreeRatios':legs,'sumLegs':2*legs,'sumMinusHypotenuse':target,'positiveDifference':True,'triangleExists':eq(2*legs**2,hyp**2)};unit='cm'
 elif n==8:
  assert all(v in q['content'] for v in [r'\sin60^\circ',r'\tan45^\circ',r'\sin45^\circ',r'\tan30^\circ'])
  ga=rt(3)/2*1;coefficient=rt(2)/2*(rt(3)/3);target=S.simplify(ga/coefficient);assert target>0 and eq(target*coefficient,ga)
  e={'specialAngleIndependentValues':{'sin60':rt(3)/2,'tan45':1,'sin45':rt(2)/2,'tan30':rt(3)/3},'ga':ga,'positiveCoefficientOfK':coefficient,'uniquePositiveK':target,'method':'substitute four specific special-angle values;one linear equation,no ratio identity'}
 elif n==9:
  assert '2배' in q['content'] and r'\angle R=90^\circ' in q['content']
  p=Q(90,3);qq=2*p;target=(qq,rt(3)/2*Q(1,2)*rt(3));assert p>0 and qq<90
  e={'angleP':p,'angleQ':qq,'angleR':90,'finiteValuesForQ':{'sin60':rt(3)/2,'cos60':Q(1,2),'tan60':rt(3)},'directProduct':target[1],'positiveTriangleExistenceWitness':{'PQ':2,'PR':rt(3),'QR':1},'noGeneralSinCosTanIdentity':True};unit=['degree',None]
 elif n==16:
  hyp=numericCell(tab[1][1]);angle=numericCell(tab[2][1]);area=numericCell(tab[3][1]);assert hyp==12 and angle==60 and area==36*rt(3)
  h=hyp*rt(3)/2;qh=hyp*Q(1,2);target=S.simplify(2*area/h);assert 0<qh<target
  e={'PQ':hyp,'angleQ':angle,'area':area,'heightPH':h,'QH':qh,'RH':target-qh,'baseQR':target,'footInsideBase':True,'areaRecheck':S.simplify(target*h/2),'coordinateExistence':{'Q':[0,0],'H':[qh,0],'P':[qh,h],'R':[target,0]},'method':'one dropped perpendicular already given,sin60 height,elementary base-height area'};unit='cm'
 elif n==17:
  vals=[numericCell(c) for c in tab[-1]];assert vals==[15,Q('0.2588'),Q('0.9659'),Q('0.2679')]
  height=tex(next(v for v in mt if v.startswith('2.7')));assert height==Q('2.7');distance=height/vals[3];target=roundedPositive(distance,1);assert distance>0
  e={'heightQH':height,'providedApproxRecords':vals,'exactQuotientOfRecords':distance,'decimalQuotient':str(S.N(distance,30)),'roundedFirstDecimal':target,'positive':True,'distractorHypotenuseApprox':roundedPositive(height/vals[0],1),'method':'tan15=QH/PH,provided record .2679;no sin15 closed-form identity'};unit='m'
 elif n==18:
  cd=tex(next(v.split('=')[1] for v in mt if v.startswith(r'\overline{CD}=')));assert cd==8;cf=cd;eh=S.simplify(cf/(rt(3)+1));ch=eh*rt(3);assert eq(cf,eh+ch) and 0<eh<cf
  area=tex(next(v for v in mt if '16+8' in v));assert eq(area,16+8*rt(3));smallArea=cf*eh/2;bigArea=S.simplify(area+smallArea);baseSquared=S.simplify(2*rt(3)*bigArea);bc=rt(baseSquared);target=bc-cf;ab=bc/rt(3)
  assert target>0 and eq(baseSquared,144);b=S.symbols('b',positive=True);quadrilateralArea=S.simplify((b+cf)**2/(2*rt(3))-smallArea)
  roots=S.solve(S.Eq(quadrilateralArea,area),b);assert roots==[4]
  points={'A':(S.Integer(0),ab),'B':(S.Integer(0),S.Integer(0)),'F':(target,S.Integer(0)),'C':(bc,S.Integer(0)),'D':(bc,cd),'H':(target+eh,S.Integer(0)),'E':(target+eh,eh)}
  assert 0<target<points['H'][0]<bc and 0<eh<cd
  assert eq(polygonArea([points[x] for x in ['A','B','F','E']]),area)
  assert eq((cd)/(cf),1) and eq(bc/ab,rt(3))
  e={'CFFrom45RightDCF':cf,'EHeightEH':eh,'HC':ch,'triangleFCEArea':smallArea,'givenShadedQuadrilateralArea':area,'triangleABCArea':bigArea,'BCSquared':baseSquared,'positiveBC':bc,'BF':target,'areaAsFunctionOfPositiveBF':quadrilateralArea,'allPositiveSolutions':roots,'exactCoordinateExistencePrivateOnly':points,'shadedPolygonAreaRecheck':polygonArea([points[x] for x in ['A','B','F','E']]),'allTextPointOrdersSatisfied':True,'EInteriorACandFD':True,'HInteriorFC':True,'mathUnique':True,'method':'DCF45 determines CF; C angle30 and F45 yield EH using FH=EH,HC=√3EH; subtract triangleFCE from triangleABC; inverse area to positive base'};unit='cm'
  holds=[{'kind':'whole-curriculum-material-complexity','basis':'User explicitly retains author-material-complexity hold. Official2015 physical39/printed35 excludes complex transformed plane area/perimeter problems. This item needs overlapping triangles,auxiliary height,area subtraction and positive square-root inverse. All operators can be middle-school,which does not clear overall complexity.','reopen':'Independent final grade/material-complexity review of complete source/new purpose and actual student sequence after authorized exposure;or separately simplified/rebound new student version. No approval from correct answer/school/confidence.'}]
 elif n==19:
  ratio=tex(next(v.split('=')[1] for v in mt if v.startswith(r'\cos Q=')));areaGiven=tex(next(v for v in mt if v.startswith('24')));assert ratio==Q(3,5) and areaGiven==24
  x=S.symbols('x',positive=True);qr=ratio*x;pr=S.simplify(rt(x**2-qr**2));area=qr*pr/2;roots=S.solve(S.Eq(area,areaGiven),x);assert roots==[10];hyp=roots[0];target=(qr,pr,hyp,qr.subs(x,hyp),pr.subs(x,hyp))
  e={'positiveHypotenuseSymbol':x,'QRExpression':qr,'PRExpressionByPythagorasAndPositiveRoot':pr,'actualTrianglePythagorasIdentity':S.simplify(x**2-qr**2-pr**2),'areaExpression':area,'areaGiven':24,'uniquePositiveHypotenuse':hyp,'QR':target[3],'PR':target[4],'cosQRecheck':Q(target[3],hyp),'areaRecheck':target[3]*target[4]/2,'all3WrittenSubpartsCovered':True,'partScoreAllocation':[2,4,2],'noGeneralCosSinIdentity':True};unit=['cm','cm','cm','cm','cm']
 elif n==20:
  side=tex(next(v for v in mt if v.startswith('10')));assert side==10;half=side/2;height=rt(side**2-half**2);alpha=S.Integer(30);sin=half/side;cos=height/side;tan=S.simplify(half/height);target=(alpha,height,sin,cos,tan)
  e={'equalSides':side,'QH_HR':half,'SSSCongruence':'PQ=PR=10,QH=HR=5,PH common','perpendicularProof':'Corresponding angles PHQ and PHR equal and supplementary;both90','apexAngleBisected':60,'alpha':alpha,'positiveHeightPH':height,'sinAlphaSideRatio':'QH/PQ','cosAlphaSideRatio':'PH/PQ','tanAlphaSideRatio':'QH/PH','actualRatios':[sin,cos,tan],'heightPythagorasRecheck':eq(height**2+half**2,side**2),'all3WrittenSubpartsAndProofAnd3SideRatiosCovered':True,'partScoreAllocation':[2,3,3]};unit=['degree','cm',None,None,None]
 else:
  op=tex(next(v.split('=')[1] for v in mt if v.startswith('OP=')));pq=tex(next(v.split('=')[1] for v in mt if v.startswith('PQ=')));assert op==18 and pq==6*rt(13);oh=op*Q(1,2);ph=op*rt(3)/2;hqSquared=S.simplify(pq**2-ph**2);hq=rt(hqSquared);oq=oh+hq;target=(oh,ph,hq,oq)
  assert all(v>0 for v in target) and oh<oq
  assert eq(pointLength((oh,ph),(oq,0)),pq) and eq(pointLength((0,0),(oh,ph)),op)
  e={'OP':op,'PQ':pq,'OHByCos60':oh,'PHBySin60':ph,'HQSquaredByActualPythagoras':hqSquared,'positiveHQ':hq,'OQ':oq,'pointOrder':'O-H-Q;sum OH+HQ forced by supplied foot condition','alternateDifferenceExcluded':oh-hq,'coordinatesPrivateExistenceOnly':{'O':[0,0],'H':[oh,0],'P':[oh,ph],'Q':[oq,0]},'all3WrittenSubpartsCovered':True,'partScoreAllocation':[3,3,2],'noCosineLawOrGeneralTrigIdentity':True};unit=['m','m','m','m']
 if q['choices']:
  opts=[pair(c) for c in q['choices']] if n in [3,4,9] else [scalar(c) for c in q['choices']]
  duplicate=[]
  for i in range(5):
   for j in range(i+1,5):
    if eq(opts[i],opts[j]):duplicate.append([i+1,j+1])
  matches=[i+1 for i,o in enumerate(opts) if eq(o,target)];assert len(matches)==1 and not duplicate
  e.update({'allFiveDisplayedChoices':opts,'choiceCorrectness':[i+1 in matches for i in range(5)],'correctChoiceNumber':matches[0],'semanticDuplicateChoices':duplicate,'uniqueCorrectChoice':True,'choiceTargetUnits':unit})
 else:assert q['questionType']=='서술형' and n in [19,20,21];e['orderedWrittenTargetComponents']=target;e['orderedTargetUnits']=unit
 for f in q['figures']:assert hashlib.sha256((R/f['svgPath']).read_bytes()).hexdigest()==f['sha256']
 out.append({'questionNumber':n,'target':target,'mathStatus':'independently-derived','solverStatus':'pending' if holds else 'solved','evidence':e,'knownHolds':holds})
payload={'method':'fresh independent exact SymPy computations from supplied student-onlyJSON;no author/private/source inputs','inputRawSha256':hashlib.sha256(inp.read_bytes()).hexdigest(),'codeRawSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'calculationOnlyNotApproval':True,'results':out}
b=(json.dumps(payload,ensure_ascii=False,indent=2,default=str)+'\n').encode('utf-8');dest=R/'calculation-output.json'
if (R/'solve-freeze.json').exists():assert dest.read_bytes()==b,'Frozen independent output drift'
else:dest.write_bytes(b)
print('GF15 exact math;all12MC5choices unique;9writtenparts covered;q18complexity pending;outputSHA256='+hashlib.sha256(b).hexdigest())
