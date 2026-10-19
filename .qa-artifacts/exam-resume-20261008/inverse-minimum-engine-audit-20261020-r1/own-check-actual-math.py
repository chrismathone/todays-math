from pathlib import Path
from fractions import Fraction as F
import json,re,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-engine-audit-20261020-r1')
old=Path('.qa-artifacts/exam-resume-20261008/inverse-minimum-proposal-20261020-r1')
read=lambda x:json.loads(x.read_text(encoding='utf-8-sig'))
h=lambda x:hashlib.sha256(x.read_bytes()).hexdigest()
sealed=read(old/'own-hash-seal.json')
assert h(old/'own-calculations24.json')==sealed['ownedFiles']['own-calculations24.json']
assert h(old/'student-only24.json')==sealed['inputSha256']
oracle=read(old/'own-calculations24.json');proposal=read(old/'student-only24.json');runtime=read(p/'own-runtime-drafts24.json');packet=read(p/'actual-drafts.json')
assert runtime['drafts']==packet['drafts'];assert packet['proposalSha256']==sealed['inputSha256']
bounds={int(n):(F(b['lower']),F(b['upper'])) for n,b in oracle['rootBounds'].items()}
for n,(a,b) in bounds.items():assert a*a<n<b*b
# Independent exact expression parser for every actual solution math fragment.
def add(a,b,sign=1):
 c=dict(a)
 for k,v in b.items():c[k]=c.get(k,F(0))+sign*v
 return {k:v for k,v in c.items() if v}
def multiply(a,b):
 assert set(a).issubset({0}) or set(b).issubset({0}),'Only constant times radical sum needed'
 if set(a).issubset({0}):return {k:a.get(0,0)*v for k,v in b.items() if a.get(0,0)*v}
 return multiply(b,a)
def parse(text):
 text=re.sub(r'\\sqrt(?:\{(\d+)\}|(\d))',lambda m:'R'+(m[1] or m[2]),text).replace(' ','')
 ts=re.findall(r'R\d+|\d+|[()+*-]',text);assert ''.join(ts)==text,text
 at=0
 def atom():
  nonlocal at
  t=ts[at];at+=1
  if t in ('+','-'):
   a=atom();return a if t=='+' else {k:-v for k,v in a.items()}
  if t=='(':
   a=expr();assert ts[at]==')';at+=1;return a
  if t.startswith('R'):assert int(t[1:]) in bounds;return {int(t[1:]):F(1)}
  assert t.isdigit();return {0:F(int(t))} if int(t) else {}
 def product():
  nonlocal at
  a=atom()
  while at<len(ts) and (ts[at]=='*' or ts[at].startswith('R') or ts[at]=='(' or ts[at].isdigit()):
   if ts[at]=='*':at+=1
   a=multiply(a,atom())
  return a
 def expr():
  nonlocal at
  a=product()
  while at<len(ts) and ts[at] in ('+','-'):
   sign=1 if ts[at]=='+' else -1;at+=1;a=add(a,product(),sign)
  return a
 a=expr();assert at==len(ts),(text,at,ts);return a

def iv(a):
 lo=hi=F(0)
 for k,v in a.items():
  x,y=bounds[k] if k else (F(1),F(1));lo+=v*(x if v>0 else y);hi+=v*(y if v>0 else x)
 return lo,hi

def check_math(block):
 s=block.replace('\\le','≤');parts=re.split(r'(≤|<|>|=)',s)
 if len(parts)==1:return {'fragment':block,'type':'expression','coefficients':{str(k):str(v) for k,v in parse(s).items()}}
 values=[parse(parts[i]) for i in range(0,len(parts),2)]
 for j in range(len(values)-1):
  a,b=values[j:j+2];op=parts[2*j+1]
  if op=='=':assert a==b,block
  elif op=='<':assert iv(add(b,a,-1))[0]>0,block
  elif op=='>':assert iv(add(a,b,-1))[0]>0,block
  else:assert a==b or iv(add(b,a,-1))[0]>0,block
 return {'fragment':block,'type':'exact-relation','true':True}
results=[]
for i,(draft,expected) in enumerate(zip(runtime['drafts'],oracle['rows'])):
 assert draft['content']==proposal['students'][i]['content']==expected['exactStudentPayload']['content']
 assert draft['questionType']==expected['exactStudentPayload']['questionType']=='단답형'
 payload=expected['exactStudentPayload'];sha=hashlib.sha256(json.dumps(payload,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest();assert sha==expected['studentPayloadCanonicalSha256']
 answer=parse(draft['answer']);target={int(k):F(v) for k,v in expected['calculation']['missingCoefficients'].items()};assert answer==target
 solution=draft['solution'];assert solution.count('$')%2==0
 blocks=re.findall(r'\$([^$]+)\$',solution);assert blocks
 math=[check_math(b) for b in blocks]
 for phrase in ['남은 네 수 중 최댓값','지워진 수는 최솟값','최댓값에서 주어진 차이를 빼면 최솟값','복원한 수는 음수','실제로 다른 네 수보다 작다','주어진 값과 같다','복원값은 하나뿐']:
  assert phrase in solution,(i,phrase)
 for forbidden in ['미분','도함수','극값정리','로그','바닥함수','체이론']:assert forbidden not in solution
 b=expected['calculation']['studentBranchValues'];assert draft['parameters']=={'radicand':b['radicandN'],'small':b['answerRadicandR'],'offset':int(b['shiftT']),'visibleOffset':int(b['fourthConstantC'])}
 assert draft['difficulty']=='기본' and draft['figureSpec'] is None
 results.append({'variant':i,'exactProposalPayloadBinding':sha,'actualContentSha256':hashlib.sha256(draft['content'].encode()).hexdigest(),'actualSolutionSha256':hashlib.sha256(solution.encode()).hexdigest(),'actualAnswerMatchesIndependentPrintedOracle':True,'answer':draft['answer'],'solutionMath':math,'solutionLogicComplete':True,'domainAndStrictMinMax':expected['calculation'],'editorialNote':'해설의 0<√3−√2는3>2의 제곱근 순서를 암묵적으로 사용한다. 바로 앞 √3<2,√2>1은 상한만 직접 설명하지만 하한은 동일 학습 범위의 즉각 비교로 보충 가능하며 결론은 참이다.'})
assert len(results)==24
out={'proposalCommit':'8cf329d7ed464b6ca76d0eedded4b64f88a5013c','proposalRawInputSha256':sealed['inputSha256'],'proposalOracleSha256':h(old/'own-calculations24.json'),'actualPacketSha256':h(p/'actual-drafts.json'),'actualRuntimeDraftsSha256':h(p/'own-runtime-drafts24.json'),'oracleMethod':'Exact Fraction coefficients and squared rational bounds from preimplementation printed-only oracle; independent parentheses/implicit constant product expression parser checks every math fragment in actual solutions. No float or factory parameter used as answer oracle.','rows':results,'summary':{'actualSolutionsReviewed':len(results),'mathFragmentsChecked':sum(len(r['solutionMath']) for r in results),'exactRelationsChecked':sum(x['type']=='exact-relation' for r in results for x in r['solutionMath']),'positiveFourth':sum(x['domainAndStrictMinMax']['fourthValueSign']=='positive' for x in results),'negativeFourth':sum(x['domainAndStrictMinMax']['fourthValueSign']=='negative' for x in results),'distinctStatements':len(set(d['content'] for d in runtime['drafts'])),'distinctAnswers':len(set(d['answer'] for d in runtime['drafts']))}}
with (p/'own-actual-math-solutions24.json').open('x',encoding='utf-8',newline='\n') as f:json.dump(out,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps(out['summary']))
