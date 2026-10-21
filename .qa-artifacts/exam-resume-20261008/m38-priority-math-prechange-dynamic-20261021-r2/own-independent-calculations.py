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
  if '자연수 $a$' not in t:
   v.update(branch='simplify-expression',mathematicalDefect=False,assessment='No exponent-input collision task in this branch; not a complete simplification correctness certification.');rows.append(v);continue
  pattern=r'\\left\((-?\d+)([ax])\^\{a\}([by])(?:\^\{(\d+)\})?\\right\)\^\{b\}=(-?\d+)\2\^\{(\d+)\}\3\^\{c\}'
  m=re.search(pattern,t);assert m,t;kc,var0,var1,ey,K,X=m.groups();kc=int(kc);ey=int(ey or 1);K=int(K);X=int(X);bs=[b for b in range(1,13) if kc**b==K];assert len(bs)==1;B=bs[0];assert X%B==0;intended=(X//B,B,ey*B);collision=var0=='a' and var1=='b';witness=None;bounded=[]
  if collision:
   for aa in range(1,13):
    for bb in range(1,13):
     lhs=(kc*aa**aa*bb**ey)**bb
     for cc in range(1,13):
      rhs=K*aa**X*bb**cc
      if lhs==rhs:bounded.append({'a':aa,'b':bb,'c':cc,'sum':aa+bb+cc,'lhs':str(lhs),'rhs':str(rhs)})
   witness=next(x for x in bounded if x['a']==1 and x['b']==B and x['c']==ey*B);assert witness['sum']!=sum(intended);assert any((x['a'],x['b'],x['c'])==intended for x in bounded)
  v.update(branch='natural-exponent-inputs',printed={'coefficientBase':kc,'baseLetters':[var0,var1],'secondBaseExponent':ey,'rightCoefficient':K,'rightFirstExponent':X},own={'formalIdentityIntendedInputs':list(intended),'formalIdentityIntendedSum':sum(intended),'numericWitness':witness,'boundedSearchDomain':'a,b,c each1..12, exact Python integers. Existence of2different sums disproves uniqueness; bounded search not completeness proof.','boundedSolutions':bounded,'a1_b2_c2Valid':any((x['a'],x['b'],x['c'])==(1,2,2) for x in bounded)},letterBaseExponentCollision=collision,mathematicalDefect=collision,assessment='Collision a/b used both as numeric bases and exponent inputs creates distinct natural-number solutions.' if collision else 'Baseletters x,y distinct; intended formal monomial-identity reading supports exponent matching. Equality for arbitrary numeric assignments alone would not imply coefficient/exponent equality; require explicit identity/free-variable condition. Not counted as collision.');assert int(p['answer'].strip('$'))==sum(intended)
 rows.append(v)
summary={}
for key in ['M8','M9','M19','M20']:
 group=[x for x in rows if x['finding']==key and x['matrixIndex'] is not None];assert len(group)==30;summary[key]={'matrixCount':30,'mathematicalDefects':sum(x['mathematicalDefect'] for x in group)}
 if key=='M19':summary[key].update(rightTriangles=sum(x['rightTriangle'] for x in group),triangleNonexistence=sum(not x['exists'] for x in group),radiusMismatchForExistingTriangles=sum(x['exists'] and not x['radiusConsistent'] for x in group))
 if key=='M20':summary[key].update(naturalInputBranch=sum(x['branch']=='natural-exponent-inputs' for x in group),collisionCount=sum(x.get('letterBaseExponentCollision',False) for x in group),simplifyBranch=sum(x['branch']=='simplify-expression' for x in group))
(P/'own-independent-calculations.json').write_text(json.dumps({'summary':summary,'cases':rows,'oracle':'All math parsed from printed content; generator facts not used, generator answers compared only after independent derivation. Exact Fraction and integers; no pixels/renderer.','inputSHA256':hashlib.sha256((P/'own-actual-outputs.json').read_bytes()).hexdigest()},ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))
