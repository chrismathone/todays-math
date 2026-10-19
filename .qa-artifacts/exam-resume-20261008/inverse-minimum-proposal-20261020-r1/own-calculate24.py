from pathlib import Path
from fractions import Fraction as Q
from math import isqrt
import json,re,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-proposal-20261020-r1')
source=p/'student-only24.json';raw=source.read_bytes();sha=lambda b:hashlib.sha256(b).hexdigest()
data=json.loads(raw.decode('utf-8-sig'))
probe='독립 검토 UTF-8: 최댓값·최솟값, 제곱근의 대소 관계'
with (p/'own-utf8-probe.txt').open('x',encoding='utf-8',newline='\n') as out:out.write(probe+'\n')
assert (p/'own-utf8-probe.txt').read_text(encoding='utf-8')==probe+'\n'
# Parse printed additive radical expressions directly, not a parameter array or answer list.
def expression(text):
 s=re.sub(r'\\sqrt(?:\{(\d+)\}|(\d))',lambda m:'R'+(m[1] or m[2]),text).replace(' ','')
 terms=re.findall(r'[+-]?(?:\d*R\d+|\d+)',s)
 assert ''.join(terms)==s,(text,s,terms)
 result={}
 for term in terms:
  sign=-1 if term.startswith('-') else 1; term=term.lstrip('+-')
  if 'R' in term:
   coefficient,n=term.split('R'); key=int(n);value=sign*int(coefficient or '1')
  else:key=0;value=sign*int(term)
  result[key]=result.get(key,Q(0))+value
 return {k:Q(v) for k,v in result.items() if v}
def sub(a,b):
 r=dict(a)
 for k,v in b.items():r[k]=r.get(k,Q(0))-v
 return {k:v for k,v in r.items() if v}
def plus(a,b):return sub(a,{k:-v for k,v in b.items()})
D=10000
radicands=sorted({int(a or b) for s in data['students'] for a,b in re.findall(r'\\sqrt(?:\{(\d+)\}|(\d))',s['content'])})
bounds={}
for n in radicands:
 k=isqrt(n*D*D);lo=Q(k,D);hi=Q(k+1,D)
 assert lo*lo<n<hi*hi
 bounds[n]=(lo,hi)
def interval(expr):
 lo=hi=Q(0)
 for n,v in expr.items():
  a,b=bounds[n] if n else (Q(1),Q(1))
  lo+=v*(a if v>=0 else b);hi+=v*(b if v>=0 else a)
 return lo,hi
def coeff(expr):return {str(k):str(v) for k,v in sorted(expr.items())}
def tex(expr):
 # Answers here have the independently derived two radical terms.
 positives=[(k,v) for k,v in sorted(expr.items()) if v>0]; negatives=[(k,v) for k,v in sorted(expr.items()) if v<0]
 def term(k,v):return (str(abs(v)) if abs(v)!=1 or not k else '')+('\\sqrt{'+str(k)+'}' if k else '')
 text=''
 for k,v in positives+negatives:text+=('+' if v>0 and text else '-' if v<0 else '')+term(k,v)
 return text or '0'
rows=[];seen=set()
for student in data['students']:
 assert student['questionType']=='단답형';assert student['variant'] not in seen;seen.add(student['variant'])
 text=student['content'];blocks=re.findall(r'\$([^$]+)\$',text);assert len(blocks)==2
 four=[x.strip() for x in blocks[0].split(',')];assert len(four)==4
 values=[expression(x) for x in four];R=expression(blocks[1]);ivs=[interval(v) for v in values]
 max_index=max(range(4),key=lambda i:ivs[i][0]);M=values[max_index]
 assert all(ivs[max_index][0]>ivs[j][1] for j in range(4) if j!=max_index)
 x=sub(M,R);xiv=interval(x)
 assert all(xiv[1]<v[0] for v in ivs)
 assert interval(R)[0]>0 and sub(M,x)==R
 n=next(k for k in M if k);t=-M.get(0,Q(0));r=next(k for k,v in x.items() if v>0);c=values[3][0]
 assert set(x)=={n,r} and x[n]==-1 and x[r]==1
 # Elementary student inequalities, separately checked for each actual parsed statement.
 assert n in (7,11,14) and t in (0,1) and r in (2,3) and c in (2,3)
 assert n>4 and r<4 and r<n and c>=2
 assert values[1]=={3:Q(1),2:Q(-1)} and values[2]=={0:Q(1)} and values[3]=={0:c,n:Q(-1)}
 assert M=={k:v for k,v in {n:Q(1),0:-t}.items() if v}
 assert R=={k:v for k,v in {n:Q(2),r:Q(-1),0:-t}.items() if v}
 alliv=[xiv]+ivs;order=sorted(range(5),key=lambda i:alliv[i][0])
 for a,b in zip(order,order[1:]):assert alliv[a][1]<alliv[b][0]
 signD='positive' if ivs[3][0]>0 else 'negative' if ivs[3][1]<0 else 'unresolved';assert signD!='unresolved'
 answer=tex(x);Mtext=tex(M);Rtext=tex(R)
 solution=f'지워진 수를 x라 하자. 지워진 수가 최솟값이므로 최댓값은 남은 네 수 중에 있다. √{n}>2이고 {t}=0 또는1이므로 첫 수 {Mtext}는1보다 크다. 0<√3−√2<1이고, {c}−√{n}<1이므로 남은 네 수의 유일한 최댓값은 {Mtext}이다. 따라서 x=({Mtext})−({Rtext})={answer}이다. √{r}<2≤{c}이므로 x=√{r}−√{n}<{c}−√{n}이다. 또한 {r}<{n}이므로 x<0인 반면 첫 수, √3−√2, 1은 모두 양수이다. 그러므로 x는 실제로 남은 모든 수보다 엄격히 작다. 이 값을 넣으면 최댓값−최솟값이 제시된 값과 정확히 같으므로 존재하며, 고정된 최댓값에서 고정된 차이를 빼므로 해는 유일하다. 모든 제곱근은 양수인 실수의 주값이고 분모·물리 단위는 없다.'
 payload={k:student[k] for k in ['variant','questionType','content']};encoded=json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
 rows.append({'variant':student['variant'],'exactStudentPayload':payload,'studentPayloadCanonicalSha256':sha(encoded),'printedExpressionTokens':four,'printedRange':blocks[1],'answer':answer,'solution':solution,'calculation':{'coefficientKey':'0=constant; positive integer key=that square root','remainingCoefficients':[coeff(v) for v in values],'rangeCoefficients':coeff(R),'maximumIndex1based':max_index+1,'maximumCoefficients':coeff(M),'missingCoefficients':coeff(x),'remainingExactRationalBounds':[[str(a),str(b)] for a,b in ivs],'missingExactRationalBounds':[str(a) for a in xiv],'rangeExactRationalBounds':[str(a) for a in interval(R)],'fullFiveStrictOrder':['missing' if i==0 else 'remaining:'+str(i) for i in order],'fourthValueSign':signD,'maxMinusMissingEqualsPrintedRange':True,'missingStrictlyBelowAllFour':True,'rangePositive':True,'domainAllRealAndNoDenominator':True,'existence':True,'unique':True,'studentBranchValues':{'radicandN':n,'shiftT':str(t),'answerRadicandR':r,'fourthConstantC':str(c)}}})
assert len(rows)==24 and seen==set(range(24))
assert source.read_bytes()==raw
result={'kind':'own-exact-preimplementation-student-solutions','inputSha256':sha(raw),'utf8ProbePassed':True,'oracle':'Own additive radical parser + exact Fraction intervals with integer isqrt bounds; no float, pixels, author answer, factory or parameters used. Every lower/upper rational bound squared exactly. Student method is separately written using elementary inequalities.','rootBounds':{str(k):{'lower':str(a),'upper':str(b),'squaredLower':str(a*a),'squaredUpper':str(b*b),'strictSquaredCheck':True} for k,(a,b) in bounds.items()},'rows':rows,'summary':{'solved':24,'existenceUniqueStrictMinimum':24,'firstValueUniqueMaximum':24,'fourthPositive':sum(x['calculation']['fourthValueSign']=='positive' for x in rows),'fourthNegative':sum(x['calculation']['fourthValueSign']=='negative' for x in rows),'distinctAnswerStrings':sorted(set(x['answer'] for x in rows))},'newManualOrBlindCount':0,'actualFutureFactoryAudited':False}
with (p/'own-calculations24.json').open('x',encoding='utf-8',newline='\n') as out:json.dump(result,out,ensure_ascii=False,indent=2);out.write('\n')
print(json.dumps(result['summary'],ensure_ascii=True));print('input SHA256 '+sha(raw));print('calculations SHA256 '+sha((p/'own-calculations24.json').read_bytes()))
