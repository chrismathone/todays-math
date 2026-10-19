from pathlib import Path
import json,re,hashlib
import sympy as sp
from sympy.parsing.sympy_parser import parse_expr,standard_transformations,implicit_multiplication_application,convert_xor
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-current6-family-audit-20261019-r1');samples=json.loads((p/'own-engine-samples.json').read_text(encoding='utf-8'))['samples']
x,y,a,k=sp.symbols('x y a k',real=True)
def tex(t):
 t=t.replace('\\left','').replace('\\right','').replace('\\times','*').replace('\\div','/').replace('\\,','')
 def parse_group(i):
  if t[i]=='{':
   depth=1;j=i+1
   while depth:
    if t[j]=='{':depth+=1
    if t[j]=='}':depth-=1
    j+=1
   return convert(t[i+1:j-1]),j
  m=re.match(r'\d+|[a-z]',t[i:]);assert m,(t,i)
  return m.group(),i+len(m.group())
 def convert(z):return tex(z)
 out='';i=0
 while i<len(t):
  if t.startswith('\\sqrt',i):
   v,i=parse_group(i+5);out+='sqrt('+v+')'
  elif t.startswith('\\dfrac',i) or t.startswith('\\frac',i):
   i+=6 if t.startswith('\\dfrac',i) else 5
   u,i=parse_group(i);v,i=parse_group(i);out+='(('+u+')/('+v+'))'
  else:
   out+=('(' if t[i]=='{' else ')' if t[i]=='}' else t[i]);i+=1
 return out
trans=standard_transformations+(implicit_multiplication_application,convert_xor)
def expr(t):
 s=tex(t);assert re.fullmatch(r'[a-zA-Z0-9+\-*/().^ ]+',s),s
 return parse_expr(s,local_dict={'x':x,'y':y,'a':a,'k':k,'sqrt':sp.sqrt},transformations=trans)
rows=[]
for s in samples:
 groups=re.findall(r'\$([^$]+)\$',s['content']);minor=s['rpmMinor'];typ=s['rpmType'];answer=expr(s['answer'].strip('$'));calc=None;method=''
 if minor=='다항식의 곱셈' and typ=='02':
  degree=2 if groups[1]=='x^2' else 1;calc=sp.expand(expr(groups[0])).coeff(x,degree);method='printed product expansion coefficient'
 elif minor=='다항식의 곱셈' and typ=='14':
  given=expr(groups[0].split('=',1)[1]);calc=sp.simplify(expr(groups[1]).subs(x,given));method='printed radical x substitution'
 elif minor=='다항식의 인수분해' and typ=='04':
  poly=expr(groups[0]);unknown=a if a in poly.free_symbols else k;roots=sp.solve(sp.discriminant(poly,x),unknown)
  if unknown==a:roots=[r for r in roots if r>0]
  assert len(roots)==1;calc=roots[0];method='printed quadratic zero discriminant as independent coefficient identity check, not grade-method permission'
 elif minor=='다항식의 인수분해' and typ=='05':
  lo,hi=map(int,re.match(r'(-?\d+)<x<(-?\d+)',groups[0]).groups());points=[sp.Rational(lo)+(hi-lo)*sp.Rational(j,4) for j in [1,2,3]];expected=expr(groups[1]);ok=all(sp.simplify((expected-answer).subs(x,v))==0 for v in points);rows.append({'key':s['key'],'seed':s['seed'],'printedContentSha256':hashlib.sha256(s['content'].encode()).hexdigest(),'method':'interval sign checked at three exact rational points plus code sign-case reading','points':[str(v) for v in points],'passed':ok});assert ok;continue
 elif minor=='다항식의 인수분해' and typ=='13':
  countSquare=expr(groups[1]);countX=expr(groups[3]);countOne=expr(groups[5]);assert countSquare==1;area=x*x+countX*x+countOne;fac=sp.factor_list(area)[1];assert sum(m for f,m in fac)==2;calc=2*sum(f*m for f,m in fac);method='printed tile counts -> area -> exact factors -> perimeter; x positive geometric interpretation'
 elif minor=='다항식의 인수분해' and typ=='14':
  given,area=map(expr,groups);calc,rem=sp.div(area,given,x);assert rem==0;method='printed area/side quotient computed independently; algebra control only, not school division approval'
 elif minor=='다항식의 인수분해' and typ=='20':
  vals={}
  for group in groups[:-1]:
   v,z=group.split('=',1);vals[{'x':x,'y':y}[v]]=expr(z)
  calc=sp.simplify(expr(groups[-1]).subs(vals));method='printed assignments and target direct exact evaluation'
 elif minor=='근호를 포함한 식의 계산' and typ=='13':
  calc=expr(groups[0])+expr(groups[1])-expr(groups[2]);method='printed initial coordinate + right displacement - left displacement'
 else:calc=expr(groups[0]);method='printed expression exact expansion/radical arithmetic'
 diff=sp.simplify(sp.expand(calc-answer));assert diff==0,(s['key'],s['seed'],calc,answer,diff)
 rows.append({'key':s['key'],'seed':s['seed'],'printedContentSha256':hashlib.sha256(s['content'].encode()).hexdigest(),'method':method,'independentlyCalculated':str(sp.simplify(calc)),'printedEngineAnswerComparedAfterCalculation':s['answer'],'difference':str(diff),'passed':True})
with (p/'own-independent-sample-checks.json').open('x',encoding='utf-8') as f:json.dump({'samples':len(rows),'passed':sum(z['passed'] for z in rows),'parameterOracleUsed':False,'inputSource':'generated content strings only; no factory facts/parameters used','boundaries':'sympy exact arithmetic is reviewer verification, not student grade permission. Sparse branch samples are not all-engine certification.','results':rows},f,ensure_ascii=False,indent=2);f.write('\n')
print('independent sample checks',len(rows))
