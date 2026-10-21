from pathlib import Path
from fractions import Fraction as F
from math import isqrt
import json,re,hashlib
P=Path(__file__).resolve().parent;read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));data=read(P/'own-actual-outputs.json');rows=[]
def fraction(v):return str(v)
def label(content,word):
 pattern=r'\\overline\{'+word+r'\}=([0-9]+)';m=re.search(pattern,content);assert m,(word,content);return int(m[1])
def scalar_answer(p):
 m=re.fullmatch(r'\$(-?\d+(?:\.\d+)?)\\,\\mathrm\{cm\}(?:\^2)?\$',p['answer']);assert m,p['answer'];return F(m[1])
for raw in data['rows']:
 p=raw['problem'];t=p['content'];finding=raw['finding'];v={'finding':finding,'typeKey':raw['typeKey'],'seed':raw['seed'],'variant':raw['variant'],'matrixIndex':raw['matrixIndex'],'printedContentSHA256':hashlib.sha256(t.encode()).hexdigest()}
 if finding=='M8':
  a=label(t,'AD');AB=label(t,'AB');m=re.search(r'둘레의 길이가 \$(\d+)',t);assert m;per=int(m[1]);k=F(AB,a);exists=a>0 and k>1 and per>2*a;formal=per*k;others=F(per-a,2)
  v.update(printed={'AD':a,'AB':AB,'ADEperimeter':per},own={'necessaryAndSufficient':'P>2AD with AD>0 and AB>AD; AE=DE=(P-AD)/2 provides witness iff strict.','Pminus2AD':per-2*a,'scale':str(k),'equalOtherSidesWitness':str(others),'largerPerimeterConditional':str(formal)},exists=exists,mathematicalDefect=not exists,answerMatchesConditionalAlgebra=scalar_answer(p)==formal)
 elif finding=='M9':
  ab=label(t,'AB');ac=label(t,'AC');bc=label(t,'BC');margins=[ab+ac-bc,ab+bc-ac,ac+bc-ab];exists=min(margins)>0;cd=F(ac*bc,ab-ac) if ab!=ac else None;order=cd is not None and cd>0;u=F(ab*ab+bc*bc-ac*ac,2*bc);h2=ab*ab-u*u
  v.update(printed={'AB':ab,'AC':ac,'BC':bc,'order':'B,C,D'},own={'triangleStrictMargins':margins,'CDconditional':str(cd),'DCoordinateWhenB0Cbc':str(bc+cd) if cd is not None else None,'externalRatioIdentity':cd is not None and F(bc+cd,cd)==F(ab,ac),'altitudeSquared':str(h2),'triangleRange':f'{abs(ab-ac)} < BC < {ab+ac}'},exists=exists,externalPointConsistentConditional=order,mathematicalDefect=not(exists and order),answerMatchesConditionalAlgebra=cd is not None and scalar_answer(p)==cd)
 elif finding=='M19':
  a=label(t,'BC');b=label(t,'CA');c=label(t,'AB');r=int(re.search(r'반지름의 길이가 \$(\d+)',t)[1]);margins=[a+b-c,a+c-b,b+c-a];exists=min(margins)>0;s=F(a+b+c,2);u=F(c*c+a*a-b*b,2*a);h2=c*c-u*u;area2=F(a*a,4)*h2;radius2=area2/(s*s);consistent=exists and radius2==r*r;target2=F(a*a,4)*radius2;rightSides=sorted([a,b,c]);right=exists and rightSides[0]**2+rightSides[1]**2==rightSides[2]**2;student=None
  if right:
   area=F(rightSides[0]*rightSides[1],2);actualr=area/s;target=F(a,2)*actualr;student={'method':'M2: right triangle area=legs product/2; split into3triangles from incenter with common height r so area=r*(a+b+c)/2. No Heron.','area':str(area),'semiperimeter':str(s),'actualRadius':str(actualr),'actualAreaIBC':str(target),'printedFormulaAreaIBC':str(F(a*r,2))}
  v.update(printed={'BC':a,'CA':b,'AB':c,'radius':r},own={'triangleStrictMargins':margins,'semiperimeter':str(s),'altitudeProjection':str(u),'altitudeSquared':str(h2),'areaSquared':str(area2),'actualRadiusSquared':str(radius2),'printedRadiusSquared':r*r,'actualAreaIBCSquared':str(target2),'printedFormulaAreaIBC':str(F(a*r,2)),'generalOracleLimit':'Pythagorean altitude/projection rational algebra for diagnostics only, not a claimed required M2 student procedure for all nonright triples.'},rightTriangle=right,studentRouteForActualRightCase=student,exists=exists,radiusConsistent=consistent,mathematicalDefect=not consistent,answerMatchesPrintedRadiusFormula=scalar_answer(p)==F(a*r,2))
 else:
  if '자연수 $m$' not in t:
   v.update(branch='simplify-expression',mathematicalDefect=False,assessment='Same non-input simplification branch; no collision analysis needed, not full simplification certification.');rows.append(v);continue
  pattern=r'\\left\((-?\d+)([ax])\^\{m\}([by])(?:\^\{(\d+)\})?\\right\)\^\{n\}=(-?\d+)\2\^\{(\d+)\}\3\^\{k\}'
  mat=re.search(pattern,t);assert mat,t;kc,var0,var1,ey,K,X=mat.groups();kc=int(kc);ey=int(ey or 1);K=int(K);X=int(X)
  universal='의 값에 관계없이 항상 성립한다.' in t;disjoint=not ({var0,var1}&{'m','n','k'});assert abs(kc)>=2 and abs(K)>=2
  n=0;power=1
  while abs(power)<abs(K):n+=1;power*=kc
  coefficientOK=power==K and n>0;m=F(X,n) if n else F(0);k=ey*n;natural=coefficientOK and m.denominator==1 and m>0 and k>0
  witnesses=[]
  if natural:
   mm=int(m)
   for base0 in [-2,-1,0,1,2,3]:
    for base1 in [-2,-1,0,1,2,3]:
     lhs=(kc*(base0**mm)*(base1**ey))**n;rhs=K*(base0**X)*(base1**k);assert lhs==rhs;witnesses.append({'base0':base0,'base1':base1,'lhs':str(lhs),'rhs':str(rhs)})
  identity=natural and int(m)*n==X and ey*n==k and kc**n==K
  correctAnswer=natural and int(p['answer'].strip('$'))==int(m)+n+k
  valid=universal and disjoint and identity and correctAnswer
  v.update(branch='natural-exponent-inputs',printed={'coefficientBase':kc,'baseLetters':[var0,var1],'secondBaseExponent':ey,'rightCoefficient':K,'rightFirstExponent':X,'allValuesCondition':universal},own={'uniqueNaturalInputs':[int(m),n,k] if natural else None,'sum':int(m)+n+k if natural else None,'coefficientIdentity':coefficientOK,'exponentIdentities':identity,'independentAnswerMatches':correctAnswer,'uniquenessProof':'All-values identity at independent bases(1,1)forces kc^n=K. abs(kc)>=2 gives strictly increasing positive-integer power magnitudes, so n unique among ALL natural numbers. Firstbase2/secondbase1 forces mn=X and m=X/n; firstbase1/secondbase2 forcesk=ey*n. Positiveinteger checks give existence; elementary exponentlaws give universal sufficiency. 36numeric substitutions corroborate only, not proof of uniqueness.','numericChecksSupplementary':witnesses},letterBaseExponentCollision=not disjoint,mathematicalDefect=not valid,assessment='Universal condition and distinct m/n/k remove numeric-base collision; exact coefficient/degree relations prove unique natural inputs, not just sample substitutions.')
 rows.append(v)
summary={}
for key in ['M8','M9','M19','M20']:
 group=[x for x in rows if x['finding']==key and x['matrixIndex'] is not None];assert len(group)==30;summary[key]={'matrixCount':30,'mathematicalDefects':sum(x['mathematicalDefect'] for x in group)}
 if key=='M19':summary[key].update(rightTriangles=sum(x['rightTriangle'] for x in group),triangleNonexistence=sum(not x['exists'] for x in group),radiusMismatchForExistingTriangles=sum(x['exists'] and not x['radiusConsistent'] for x in group))
 if key=='M20':summary[key].update(naturalInputBranch=sum(x['branch']=='natural-exponent-inputs' for x in group),collisionCount=sum(x.get('letterBaseExponentCollision',False) for x in group),simplifyBranch=sum(x['branch']=='simplify-expression' for x in group))
(P/'own-independent-calculations.json').write_text(json.dumps({'summary':summary,'cases':rows,'oracle':'All math parsed from printed content; generator facts not used, generator answers compared only after independent derivation. Exact Fraction and integers; no pixels/renderer.','inputSHA256':hashlib.sha256((P/'own-actual-outputs.json').read_bytes()).hexdigest()},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))
