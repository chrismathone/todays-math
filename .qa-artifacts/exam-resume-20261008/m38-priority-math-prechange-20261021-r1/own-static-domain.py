from pathlib import Path
from fractions import Fraction as F
from collections import Counter
import json,itertools,hashlib,subprocess
P=Path(__file__).resolve().parent;read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();out={};failures=[]
# Literal integer domains, not RNG seed frequencies.
m8=[]
for a,k,per in itertools.product(range(2,6),range(2,5),range(3,13)):
 exists=per>2*a;m8.append({'AD':a,'AB':a*k,'ADEperimeter':per,'margin':per-2*a,'exists':exists})
out['M8']={'literalDomain':'a=int2..5,k=int2..4,per=int3..12 independently','domainTuples':len(m8),'valid':sum(x['exists'] for x in m8),'invalid':sum(not x['exists'] for x in m8),'condition':'P>2AD necessary and sufficient for some triangle with known side AD. Construct AE=DE=(P-AD)/2. AB=kAD with k>1 gives a scaled containing triangle and internal D,E. Bigger perimeter is kP only when triangle exists.','invalidTuples': [x for x in m8 if not x['exists']],'handoffExample':{'AD':3,'AB':9,'perimeter':5,'AEplusDE':2,'contradiction':'AE+DE=2<AD=3; no triangle. Algebraic answer15 has no geometric instance.','actualSeedReplay':'pending'}}
m9=[]
for q,delta,unit,scale in itertools.product(range(1,5),range(1,4),range(2,6),range(2,6)):
 p=q+delta;ab=p*unit;ac=q*unit;bc=(p-q)*scale;margins=[ab+ac-bc,ab+bc-ac,ac+bc-ab];exists=min(margins)>0;cd=F(ac*bc,ab-ac);assert cd>0 and F(bc+cd,cd)==F(ab,ac)
 m9.append({'q':q,'pMinusQ':delta,'unit':unit,'baseScale':scale,'AB':ab,'AC':ac,'BC':bc,'margins':margins,'exists':exists,'conditionalCD':str(cd)})
out['M9']={'literalDomain':'q1..4,p=q+delta(delta1..3),unit2..5,baseScale2..5 independently','domainTuples':len(m9),'valid':sum(x['exists'] for x in m9),'invalid':sum(not x['exists'] for x in m9),'degenerate':sum(min(x['margins'])==0 for x in m9),'impossibleStrict':sum(min(x['margins'])<0 for x in m9),'condition':'Require |AB-AC|<BC<AB+AC, equivalently baseScale>unit and (p-q)*baseScale<(p+q)*unit. Since AB>AC, CD=AC*BC/(AB-AC)>0 uniquely puts D beyond C, BD=BC+CD; ratio identity alone does not establish triangle existence.','invalidTuples':[x for x in m9 if not x['exists']],'handoffExample':{'AB':4,'AC':2,'BC':2,'marginACplusBCminusAB':0,'conditionalCD':2,'contradiction':'Degenerate triangle; formal external ratio/CD algebra has no noncollinear triangle realization.','actualSeedReplay':'pending'}}
counts=Counter();consistent=[];rightExamples=[]
for a,r,b,c in itertools.product(range(8,25,2),range(2,8),range(5,16),range(5,16)):
 counts['all']+=1;valid=min(a+b-c,a+c-b,b+c-a)>0
 if not valid:counts['triangleInvalid']+=1;continue
 counts['triangleValid']+=1;s=F(a+b+c,2);u=F(c*c+a*a-b*b,2*a);height2=c*c-u*u;area2=F(a*a,4)*height2;radius2=area2/(s*s);assert radius2>0
 if radius2==r*r:counts['radiusConsistent']+=1;consistent.append({'BC':a,'CA':b,'AB':c,'r':r})
 else:counts['radiusMismatch']+=1
 sides=sorted([a,b,c]);right=sides[0]**2+sides[1]**2==sides[2]**2
 if right:counts['rightTrianglesIncludingR']+=1
 if right and len(rightExamples)<5:
  area=F(sides[0]*sides[1],2);actualR=area/s;rightExamples.append({'BC':a,'CA':b,'AB':c,'printedR':r,'actualR':str(actualR),'area':str(area),'semiperimeter':str(s),'actualIBC':str(F(a,2)*actualR)})
out['M19']={'literalDomain':'a=2*int4..12 (BC8,10,..24),r=int2..7,b=CA=int5..15,c=AB=int5..15 independently','domainTuples':counts['all'],'counts':dict(counts),'invalidOverall':counts['triangleInvalid']+counts['radiusMismatch'],'consistentTuples':consistent,'rightExamples':rightExamples,'oracle':'For diagnostics only: let B=(0,0),C=(a,0), altitude projection u=(c²+a²-b²)/(2a), h²=c²-u² by two Pythagorean relations. Area²=a²h²/4, s=(a+b+c)/2, r²=Area²/s². Exact Fraction equality; no floating tolerance. This algebra is not asserted as every student required method.','handoffRightExample':{'sides':[5,12,13],'BC':12,'printedR':4,'area':30,'semiperimeter':15,'actualR':2,'actualIBC':12,'printedFormulaIBC':24,'studentM2Reason':'Pythagorean right triple verified; area=5*12/2=30. Divide into3triangles from incenter; area=r*(5+12+13)/2=15r. Thus r2, and IBC area=12*2/2=12. No Heron or trigonometry.','actualSeed20403562':'pending; actual current seed sides not yet observed'}}
m20=[]
for pair,kc,b,a,ey in itertools.product(['ab','xy'],[-3,-2,2,3],range(2,4),range(2,4),range(1,3)):
 K=kc**b;X=a*b;c=ey*b;row={'pair':pair,'kc':kc,'printedK':K,'printedX':X,'printedEy':ey,'formalInputs':[a,b,c],'formalSum':a+b+c,'collision':pair=='ab'}
 if pair=='ab':
  def sides(aa,bb,cc):return (kc*aa**aa*bb**ey)**bb,K*aa**X*bb**cc
  l,rhs=sides(1,b,c);li,ri=sides(a,b,c);assert l==rhs and li==ri and 1+b+c!=a+b+c;row.update(counterexample=[1,b,c],counterexampleSum=1+b+c,counterexampleLHS=str(l),counterexampleRHS=str(rhs))
 m20.append(row)
out['M20']={'scope':'Only kind=1 exponent-input branch literal tuples; kind0 simplification branch not enumerated or certified. Branch/variable-pair probabilities and seed frequencies not measured.','literalDomain':'base pair ab or xy;kc in[-3,-2,2,3], b2..3,a2..3,ey1..2;K=kc^b,X=ab,c=ey*b','domainTuples':len(m20),'collisionTuples':sum(x['collision'] for x in m20),'everyCollisionHasDifferentSumWitness':all('counterexample'in x for x in m20 if x['collision']),'tuples':m20,'handoffExample':{'printed':'(-2a^a b)^b =4a^6 b^c','witness1':{'a':1,'b':2,'c':2,'lhs':16,'rhs':16,'sum':5},'witness2':{'a':3,'b':2,'c':2,'lhs':11664,'rhs':11664,'sum':7},'actualSeed20363967':'pending'},'interpretation':'When a,b also serve as numeric bases, equality at assignments is not a formal identity of independent base indeterminates. a=1 erases first-base exponent restriction; every32collision tuple has another natural solution with different sum. xy base pair has no letter collision; intended formal identity reading can give unique exponent inputs, but equality merely at fixed numeric x,y would not justify comparing exponents. Do not label every output of type04 defective.'}
assert len(m8)==120 and len(m9)==192 and counts['all']==6534 and len(m20)==64
(P/'own-static-domain-results.json').write_text(json.dumps({'kind':'Python-only literal parameter-domain analysis, NOT actual seed output incidence','findings':out,'actualNodeExecution':False,'actualMatrixOutputs':0,'matrixReplayStatus':'pending-memory-floor','probabilityLimitation':'Domain tuples are Cartesian combinations of literal ranges. Not empirical30seed incidence, uniform probability or wholebank coverage.','printedOracleBoundary':'Handoff printed counterexamples evaluated exactly and source literal constraints; no generator facts/answers or figurepixels used as oracle.'},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:{name:v[name] for name in ['domainTuples','valid','invalid','invalidOverall','collisionTuples','counts'] if name in v} for k,v in out.items()},ensure_ascii=False))
