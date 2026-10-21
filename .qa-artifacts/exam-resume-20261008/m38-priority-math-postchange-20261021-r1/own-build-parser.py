from pathlib import Path
P=Path(__file__).resolve().parent;old=P.parent/'m38-priority-math-prechange-dynamic-20261021-r2/own-independent-calculations.py';s=old.read_text(encoding='utf-8-sig');start=s.index(" else:\n  if '자연수 $a$'");end=s.index('\n rows.append(v)',start)
new=r''' else:
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
  v.update(branch='natural-exponent-inputs',printed={'coefficientBase':kc,'baseLetters':[var0,var1],'secondBaseExponent':ey,'rightCoefficient':K,'rightFirstExponent':X,'allValuesCondition':universal},own={'uniqueNaturalInputs':[int(m),n,k] if natural else None,'sum':int(m)+n+k if natural else None,'coefficientIdentity':coefficientOK,'exponentIdentities':identity,'independentAnswerMatches':correctAnswer,'uniquenessProof':'All-values identity at independent bases(1,1)forces kc^n=K. abs(kc)>=2 gives strictly increasing positive-integer power magnitudes, so n unique among ALL natural numbers. Firstbase2/secondbase1 forces mn=X and m=X/n; firstbase1/secondbase2 forcesk=ey*n. Positiveinteger checks give existence; elementary exponentlaws give universal sufficiency. 36numeric substitutions corroborate only, not proof of uniqueness.','numericChecksSupplementary':witnesses},letterBaseExponentCollision=not disjoint,mathematicalDefect=not valid,assessment='Universal condition and distinct m/n/k remove numeric-base collision; exact coefficient/degree relations prove unique natural inputs, not just sample substitutions.')'''
s=s[:start]+new+s[end:];(P/'own-independent-calculations.py').write_text(s,encoding='utf-8')
