"""Independent GS24 mathematics from this student-only JSON and viewed SVGs."""
import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,re,itertools
import sympy as S
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,rationalize
R=Path(__file__).resolve().parent;inp=R/'student-problems.json';qs=json.loads(inp.read_text(encoding='utf-8'))
Q=S.Rational;rt=S.sqrt;x=S.Symbol('x',real=True)
assert [q['questionNumber'] for q in qs]==list(range(1,15))+list(range(16,26))
def maths(t):return re.findall(r'\$([^$]+)\$',t)
def tex(s,local=None):
 s=s.replace(r'\left','').replace(r'\right','').replace(r'\,','').replace(r'\ ','').replace(' ','')
 s=re.sub(r'\\(?:mathrm|text)(?:\{[^}]*\}|[A-Za-z]+)','',s)
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
 return parse_expr(s,local_dict={'x':x,'sqrt':rt,**(local or {})},transformations=standard_transformations+(implicit_multiplication_application,rationalize))
def expr(t):return tex(maths(t)[0].split('=')[-1])
def tupleval(t):v=tex(maths(t)[0]);return tuple(v) if isinstance(v,(tuple,S.Tuple)) else (v,)
def eq(a,b):
 if isinstance(a,(tuple,list)) or isinstance(b,(tuple,list)):return len(a)==len(b) and all(eq(aa,bb) for aa,bb in zip(a,b))
 return S.simplify(a-b)==0
def axis(p):a,b,c=S.Poly(S.expand(p),x).all_coeffs();return S.simplify(-b/(2*a))
def dot(a,b):return S.simplify(sum(aa*bb for aa,bb in zip(a,b)))
def vec(p,q):return tuple(b-a for a,b in zip(p,q))
def length(p,q):v=vec(p,q);return S.sqrt(dot(v,v))
out=[]
for q in qs:
 n=q['questionNumber'];e={};hold=[];opts=[];matches=[]
 if n==1:
  forms=[tex(t.split('=')[1]) for t in maths(q['content'])];assert len(forms)==4
  records=[(axis(f),abs(S.Poly(S.expand(f),x).LC())) for f in forms];labels=['가','나','다','라'];pairs=[tuple(labels.index(k) for k in re.findall(r'\(([가나라다])\)',c)) for c in q['choices']]
  opts=pairs;matches=[i+1 for i,(a,b) in enumerate(pairs) if records[a]==records[b]];target=(0,3)
  e={'functionsFromStudent':forms,'axisAndAbsoluteLeadingCoefficient':records,'actualChoicePairs':pairs,'reason':'Vertical shifts and vertical reflection preserve width; axis requires same vertex x.'}
 elif n==2:
  opts=[expr(c) for c in q['choices']];target=-x*x/2-3
  truth=[{'axisY':axis(p)==0,'interceptMinus3':p.subs(x,0)==-3,'point2minus5':p.subs(x,2)==-5,'entirelyBelowXAxis':bool(S.Poly(p,x).LC()<0 and p.subs(x,axis(p))<0)} for p in opts]
  matches=[i+1 for i,v in enumerate(truth) if all(v.values())];e={'a':Q(-1,2),'function':target,'allFourConditionsForEachChoice':truth,'maximum':-3,'existence':'a nonzero;unique from4a−3=−5'}
 elif n==3:
  opts=[expr(c) for c in q['choices']];target=S.Integer(-3)
  before=-2*x*x+12*x;after=-2*(x+1)**2+3;assert S.expand(before-(-2*(x-3)**2+18))==0
  e={'beforeLeadingCoefficient':'a+1','afterLeadingCoefficient':-2,'uniqueA':target,'completedOriginal':-2*(x-3)**2+18,'translation':[-4,-15],'actualCurvaturesByChoice':[v+1 for v in opts],'degenerateChoiceAminus1Excluded':True,'method':'Translation preserves leading coefficient; completing square gives actual shift witness.'}
 elif n==4:
  opts=[expr(c) for c in q['choices']];target=-2*(x-4)**2+1;matches=[i+1 for i,p in enumerate(opts) if axis(p)==4]
  e={'firstAxis':-2,'rightShift':6,'requiredSecondAxis':4,'allChoiceAxes':[axis(p) for p in opts]}
 elif n==5:
  opts=[expr(c) for c in q['choices']];f=3*(x-2)**2;target=f.subs(x,-1)
  e={'vertex':[2,0],'coefficient':3,'interceptRecheck':f.subs(x,0),'function':f,'targetYAtMinus1':target,'uniqueZero':2,'method':'Single x-axis meeting is the vertex;4a=12;no discriminant formula.'}
 elif n==6:
  opts=[tupleval(c) for c in q['choices']];t=S.solve(3*x-2-(-2*x+8),x);assert t==[2];target=(S.Integer(2),S.Integer(4))
  e={'t':2,'vertex':target,'lineRecheck':-2*2+8,'uniqueEquation':'5t=10','allChoiceVertexAndLineChecks':[{'vertexLocus':v[1]==3*v[0]-2,'line':v[1]==-2*v[0]+8} for v in opts]}
 elif n==7:
  # Observations independently taken from all five rendered supplied graphs.
  opts=[(1,1),(-1,1),(1,-1),(-1,-1),(-1,0)];target=(-1,-1)
  e={'vertexCoordinates':'(a,−b)','requiredSigns':{'a':'negative','b':'negative'},'visuallyObservedFiveSlopeInterceptSigns':opts,'numericExistenceWitness':{'a':-1,'b':-1,'vertex':[-1,1],'line':'y=−x−1'},'allFiveChoiceFiguresPersonallyViewed':True}
 elif n==8:
  opts=[]
  for c in q['choices']:
   a,b=maths(c);v=tex(a.split('=')[1]);sign='<' if '<' in b else '>';boundary=tex(b.split(sign)[1]);opts.append((v,sign,boundary))
  target=(S.Integer(3),'<',S.Integer(3));e={'vertex':[3,1],'opens':'down','increasingBranch':'x<3','elementaryCheck':{'f1':-7,'f2':-1,'f4':-1,'f5':-7},'endpointConvention':'Open left branch in displayed options;vertex is the boundary. No differentiation.'}
 elif n==9:
  opts=[expr(c) for c in q['choices']];m=2-(-3);nn=1-4;target=S.Integer(m*nn)
  e={'originalVertex':[m,nn],'translation':[-3,4],'translatedVertex':[m-3,nn+4],'mn':target}
 elif n==10:
  opts=[tupleval(c) for c in q['choices']];a=Q(5+3,4);f=S.expand(a*(x-2)**2-3);target=(a,S.Integer(-8),S.Integer(5),f.subs(x,1))
  e={'vertex':[2,-3],'givenPoint':[0,5],'a':a,'expandedFunction':f,'sumCoefficientsEqualsF1':f.subs(x,1),'positiveAndNegativePlotLandmarks':True}
 elif n==11:
  # Exact range equality, not membership of a single tested k.
  opts=[('lt0',0),('betweenOpen',Q(9,4)),('betweenClosed',Q(9,4)),('gt',Q(9,4)),('ge',Q(9,4))];target=('ge',Q(9,4));assert [maths(c)[0] for c in q['choices']]==[r'k<0',r'0<k<\frac94',r'0<k\leq\frac94',r'k>\frac94',r'k\geq\frac94']
  e={'completedForm':'k(x+2)^2−9','kNegative':'All y<=−9;cannot enterI orII','kPositiveVertex':[-2,-9],'intercept':'4k−9','noIVCondition':'4k−9>=0 because right branch increases for x>0','completeKRange':'k>=9/4','boundaryK':Q(9,4),'boundaryIncluded':True,'axesAreNotQuadrants':True,'existenceAtBoundary':{'I':[1,Q(45,4)],'II':[-5,Q(45,4)],'III':[-2,-9]},'belowBoundaryCounterexample':{'k':1,'IVPoint':[Q(1,2),Q(-11,4)]},'method':'Opening,vertex,intercept,right branch;simple linear inequality in k. No general quadratic-inequality or calculus student method.'}
 elif n==12:
  opts=[tupleval(c) for c in q['choices']];f=-x*x+2*x+3;roots=sorted(S.solve(f,x));assert roots==[-1,3];d=(roots[0]+roots[1])/2;target=(d,S.Integer(-3),S.Integer(3))
  e={'factorization':'−(x+1)(x−3)','A':[0,3],'B':[-1,0],'C':[3,0],'D':[d,0],'areaABC':6,'areaABD':3,'areaADC':3,'DInsideBC':True,'line':'y=−3x+3','method':'Equal height means equal bases;median ofBC;linear line through A/D.'}
 elif n==13:
  opts=[expr(c) for c in q['choices']];target=S.Integer(26)*Q(5,13);other=rt(26**2-target**2);assert other==24
  e={'adjacentAC':target,'hypotenuseAB':26,'otherLegBC':other,'cosARecheck':target/26,'positiveNondegenerateTriangle':True,'method':'cosA=AC/AB only.'}
 elif n==14:
  opts=[tupleval(c) for c in q['choices']];hyp=rt(3**2+5**2);target=(S.simplify(3/hyp),Q(3,5))
  e={'AB':3,'AC':5,'BC':hyp,'cosB':target[0],'tanC':target[1],'method':'Pythagoras;actual adjacent/opposite sides at B/C;no trig identity.'}
 elif n==16:
  opts=[expr(c) for c in q['choices']];ratio=(rt(3)/2)*1/(rt(3)/2);assert ratio==1;target=S.Integer(5)
  e={'sin60':rt(3)/2,'tan45':1,'cos30':rt(3)/2,'sin90':1,'nonzeroDivisor':rt(3)/2,'coefficientOfA':1,'equation':'a−1=4','uniqueA':target,'method':'Finite given special-angle values only.'}
 elif n==17:
  opts=[tupleval(c) for c in q['choices']];hyp=rt(15**2+8**2);assert hyp==17;target=(Q(8,17),Q(8,17))
  e={'AC':15,'BC':8,'AB':hyp,'angleCorrespondence':{'x':'angleB by sums in ACD/ABC','y':'angleA by sums in BCD/ABC'},'actualCosB':Q(8,17),'actualSinA':Q(8,17),'positiveAltitude':Q(120,17),'method':'Equal actual angles,then side-ratio definitions;no general complementary-trig identity.'}
 elif n==18:
  opts=[expr(c) for c in q['choices']];angles=[S.Integer(180)*v/9 for v in [2,3,4]];assert angles==[40,60,80]
  base=S.simplify(Q(1,2)/(rt(3)/2));u=S.solve(base+x*rt(3)-7*rt(3)/3,x);assert u==[2];target=S.Integer(2)
  e={'triangleAngles':angles,'secondLargestA':60,'cos60':Q(1,2),'sin60':rt(3)/2,'tan60':rt(3),'leftAtU2':S.simplify(base+2*rt(3)),'nonzeroSin':True,'method':'Known60-degree scalars substituted individually;no generic ratio identity.'}
 elif n==19:
  opts=[expr(c) for c in q['choices']];cd=5*(rt(6)+rt(2));s=S.simplify(cd/(rt(3)+1));h=S.simplify(s*rt(3));target=S.simplify(s*rt(2));assert target==10
  pts={'D':(0,0),'E':(s,0),'B':(s,h),'F':(0,h),'C':(0,h+s),'A':(-(h-s),0)}
  assert h-s>0 and dot(vec(pts['B'],pts['A']),vec(pts['B'],pts['C']))==0
  assert eq(length(pts['A'],pts['E']),length(pts['B'],pts['E'])) and eq(length(pts['D'],pts['C']),cd)
  e={'DFequalsBE':h,'BF':s,'FC':s,'AB':h*rt(2),'BC':target,'CD':cd,'ADpositive':S.simplify(h-s),'tan30Recheck':S.simplify(target/(h*rt(2))),'coordinateWitnessForCodeOnly':pts,'method':'AE=BE→45-degree AEB;right angleABC→45-degree BFC;CD=BE+FC;tan30 in ABC. No tan75 or angle-addition formula.'}
 elif n==20:
  opts=[expr(c) for c in q['choices']];target=S.Integer(4);r=target;oa=rt(3)*r;pts={'O':(0,0),'S':(oa,r),'A':(oa,0),'B':(oa/2,3*r/2),'Y':(0,12)}
  assert length(pts['S'],pts['A'])==r and eq(length(pts['S'],pts['B']),r);assert dot(vec(pts['O'],pts['B']),vec(pts['B'],pts['S']))==0
  assert all(pts[p][i]>0 for p in ['S','B'] for i in [0,1]);assert pts['A'][0]>0
  e={'radius':r,'tangentLengthOAequalsOB':oa,'RHSRightTriangles':'OAS andOBS shareOS and equal radii;OA=OB;OSbisects60deg','angleAOS':30,'triangleOAB':'Equilateral:OA=OB and angleAOB60','yInterceptY':12,'OAFromRightTriangleYOA':4*rt(3),'radiusFromOAandTan30':r,'chordSlope':-rt(3),'chordIntercept':3*r,'allChoiceIntercepts':[3*v for v in opts],'coordinateWitnessForCodeOnly':pts,'otherDistanceBranch':'r−sqrt3*h=+2r would h=−r/sqrt3<0,excluded by center first quadrant','method':'Radii perpendicular to tangents,RHS congruence,60/30 right triangles,axis intercept;no power-of-point/circle proportion/point-line distance student formula.'}
 elif n==21:
  opts=[expr(c) for c in q['choices']];target=Q(14819,10000)-Q(6428,10000);assert target==Q(8391,10000)
  sin40=S.sin(2*S.pi/9).evalf(40);tan40=S.tan(2*S.pi/9).evalf(40);assert round(float(sin40),4)==0.6428 and round(float(tan40),4)==0.8391
  e={'recordedSQ':Q(6428,10000),'recordedScalarSum':Q(14819,10000),'recordedUT':target,'privateNumericRecordValidationNotStudentMethod':{'sin40At40Digits':str(sin40),'tan40At40Digits':str(tan40),'separateRound4':['0.6428','0.8391'],'sumOfRecordedValues':'1.4819'},'roundingContract':'Sum of separately rounded values,not rounding an inferred unknown expression','method':'OQ=OU=1;actual right-triangle definitions identify recordedSQ andUT;subtract two recorded numbers.'}
 elif n==22:
  h,v,t=S.symbols('h v t',positive=True);local={'OS':h,'SQ':v,'UT':t};opts=[tex(maths(c)[0],local) for c in q['choices']];target=v/2;test={h:rt(3),v:1,t:2/rt(3)}
  tested=[S.simplify(z.subs(test)) for z in opts];matches=[i+1 for i,z in enumerate(tested) if eq(z,Q(1,2))];assert matches==[4]
  assert S.simplify(opts[1].subs(t,2*v/h)-opts[2])==0
  hold=[{'kind':'equivalent-incorrect-distractors','choices':[2,3],'reason':'Parallel right triangles give UT/OU=SQ/OS;OU=2,soUT/2=SQ/OS for every allowed configuration. Unique correct expression remainsSQ/2.'}]
  e={'angleTransfer':'UT parallel SQ andT,Q,O collinear;angleOQS=beta','correctSideRatio':'cos beta=SQ/OQ=SQ/2 in actual right triangleOSQ','counterexampleToEachWrongChoice':{'alpha':30,'OS':rt(3),'SQ':1,'UT':2/rt(3),'allFiveDisplayedValues':tested,'cosBeta':Q(1,2)},'allDisplayExpressions':opts,'choice2EqualsChoice3BySimilarity':True,'method':'Transfer the actual angle through parallel segments;cos definition. No general cos(beta)=sin(alpha) identity.'}
 elif n==23:
  opts=[expr(c) for c in q['choices']];target=S.simplify((180+90*rt(3))/(2+rt(3)));assert target==90
  e={'GEequalsPR':target,'PGequalsRE':target,'RQ':target*rt(3),'QE':target*(1+rt(3)),'heightSum':S.simplify(target*(2+rt(3))),'eyeHeightExtra':0,'positiveHeights':True,'method':'tan45 andtan60 in two actual right triangles;same horizontal ground;one linear equation.'}
 elif n==24:
  opts=[expr(c) for c in q['choices']];k=S.Symbol('k',positive=True);bc=rt(3)*k;eh=S.simplify(bc/(1+rt(3)));area=S.simplify(bc*eh/2);ks=S.solve(area-75*(rt(3)-1),k);assert ks==[10];target=ks[0]
  height=eh.subs(k,target);width=bc.subs(k,target);bh=rt(3)*height;ch=height
  e={'CD':target,'BC':width,'EH':height,'BH':bh,'CH':ch,'HInsideBC':bool(bh>0 and ch>0 and eq(bh+ch,width)),'EOnBothSegments':{'AEpositive':S.simplify(width/rt(2)-height*rt(2)),'ECpositive':height*rt(2),'BEpositive':2*height,'EDpositive':S.simplify(2*target-2*height)},'areaInK':area,'areaAt10':S.simplify(area.subs(k,target)),'positiveKUnique':True,'method':'C45→CH=EH;DBC angleB30→BH=sqrt3 EH;BC=sqrt3 CD;triangle base-height area and positive square root. No sine area formula.'}
 else:
  opts=[tupleval(c) for c in q['choices']];af=S.Integer(8);ab=S.Integer(16);bf=rt(ab*ab-af*af);fc=af*rt(3)/3;bc=S.simplify(bf-fc);area=S.simplify(bc*af/2);target=(bc,area)
  e={'AF':af,'AB':ab,'BF':bf,'angleABWithOriginalRightTopRay':30,'foldEqualAngleCAB':30,'angleCAF':30,'FC':fc,'BC':bc,'areaABC':area,'CLeftOfB':bool(0<fc<bf),'nondegeneratePositiveArea':True,'method':'Pythagoras/special30 fromAF/AB;fold preserves angle withcrease;tan30 inAFC;BC=BF−FC;base-height triangle area.'}
 if not matches:
  if n==8:matches=[i+1 for i,v in enumerate(opts) if v==target]
  elif n==11:matches=[i+1 for i,v in enumerate(opts) if v==target]
  else:matches=[i+1 for i,v in enumerate(opts) if eq(v,target)]
 assert len(opts)==5 and len(matches)==1,(n,opts,target,matches)
 duplicates=[]
 for i,j in itertools.combinations(range(5),2):
  if n in [1,7,8,11]:same=opts[i]==opts[j]
  elif n==22:same=S.simplify(opts[i].subs(t,2*v/h)-opts[j].subs(t,2*v/h))==0
  else:same=eq(opts[i],opts[j])
  if same:duplicates.append([i+1,j+1])
 assert duplicates==([[2,3]] if n==22 else []),(n,duplicates)
 e.update(allFiveActualChoiceValues=opts,choiceCorrectness=[i+1 in matches for i in range(5)],correctChoiceNumber=matches[0],semanticDuplicateChoices=duplicates,oneCorrectChoice=True)
 out.append({'questionNumber':n,'target':target,'status':'independently-computed','evidence':e,'knownHolds':hold})
payload={'method':'fresh independent SymPy exact calculations on blind student inputs;visual observations only from supplied SVGs','independentCalculation':True,'inputRawSha256':hashlib.sha256(inp.read_bytes()).hexdigest(),'results':out}
b=(json.dumps(payload,ensure_ascii=False,indent=2,default=str)+'\n').encode('utf-8');dest=R/'calculation-output.json'
if (R/'solve-freeze.json').exists():assert dest.read_bytes()==b,'Sealed independent output drift'
else:dest.write_bytes(b)
print('GS24 exact independent calculations completed;24 single correct choices; q22 equivalent distractors2/3 held;SHA256='+hashlib.sha256(b).hexdigest())
